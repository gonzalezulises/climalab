ALTER TABLE ingest_events
  ADD COLUMN IF NOT EXISTS contract_version text NOT NULL DEFAULT '2026-03-29',
  ADD COLUMN IF NOT EXISTS external_subject_id text,
  ADD COLUMN IF NOT EXISTS mapping_version text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS pipeline_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  batch_job_run_id uuid REFERENCES batch_job_runs(id) ON DELETE SET NULL,
  alert_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  channel text NOT NULL CHECK (channel IN ('webhook', 'email', 'log')),
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  recipient text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pipeline_notifications_campaign_created
  ON pipeline_notifications(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_notifications_status
  ON pipeline_notifications(status, created_at DESC);

ALTER TABLE pipeline_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read pipeline_notifications" ON pipeline_notifications;
DROP POLICY IF EXISTS "system can manage pipeline_notifications" ON pipeline_notifications;

CREATE POLICY "authenticated can read pipeline_notifications"
  ON pipeline_notifications FOR SELECT TO authenticated
  USING (
    get_user_role() = 'super_admin'
    OR campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id()
    )
  );

CREATE POLICY "system can manage pipeline_notifications"
  ON pipeline_notifications FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

DROP FUNCTION IF EXISTS process_normalized_ingest(text, text, uuid, timestamptz, timestamptz, jsonb, jsonb, jsonb, integer, text);

CREATE OR REPLACE FUNCTION process_normalized_ingest(
  p_source text,
  p_external_event_id text,
  p_campaign_id uuid,
  p_started_at timestamptz DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL,
  p_demographics jsonb DEFAULT '{}'::jsonb,
  p_responses jsonb DEFAULT '[]'::jsonb,
  p_open_responses jsonb DEFAULT '[]'::jsonb,
  p_enps_score integer DEFAULT NULL,
  p_payload_hash text DEFAULT NULL,
  p_contract_version text DEFAULT '2026-03-29',
  p_external_subject_id text DEFAULT NULL,
  p_mapping_version text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  duplicate boolean,
  ok boolean,
  respondent_id uuid,
  ingest_event_id uuid,
  campaign_id uuid,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ingest_event_id uuid;
  v_respondent_id uuid;
  v_invalid_item_id uuid;
  v_error_message text;
BEGIN
  INSERT INTO ingest_events (
    source,
    external_event_id,
    campaign_id,
    payload_hash,
    contract_version,
    external_subject_id,
    mapping_version,
    metadata,
    status
  )
  VALUES (
    p_source,
    p_external_event_id,
    p_campaign_id,
    p_payload_hash,
    COALESCE(NULLIF(trim(p_contract_version), ''), '2026-03-29'),
    NULLIF(trim(COALESCE(p_external_subject_id, '')), ''),
    NULLIF(trim(COALESCE(p_mapping_version, '')), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    'processing'
  )
  ON CONFLICT (source, external_event_id) DO NOTHING
  RETURNING id INTO v_ingest_event_id;

  IF v_ingest_event_id IS NULL THEN
    RETURN QUERY SELECT true, true, NULL::uuid, NULL::uuid, p_campaign_id, NULL::text;
    RETURN;
  END IF;

  BEGIN
    IF jsonb_typeof(p_responses) <> 'array' OR jsonb_array_length(p_responses) = 0 THEN
      RAISE EXCEPTION 'Debe incluir al menos una respuesta';
    END IF;

    PERFORM 1
    FROM campaigns
    WHERE id = p_campaign_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Campaña no encontrada';
    END IF;

    SELECT candidate.item_id
    INTO v_invalid_item_id
    FROM (
      SELECT (entry.item_id)::uuid AS item_id
      FROM jsonb_to_recordset(p_responses) AS entry(item_id text, score integer)
    ) AS candidate
    LEFT JOIN items i ON i.id = candidate.item_id
    LEFT JOIN dimensions d ON d.id = i.dimension_id
    WHERE i.id IS NULL
       OR d.instrument_id NOT IN (
         SELECT instrument_id
         FROM campaign_instruments ci
         WHERE ci.campaign_id = p_campaign_id
         UNION
         SELECT c.instrument_id
         FROM campaigns c
         WHERE c.id = p_campaign_id
         UNION
         SELECT unnest(c.module_instrument_ids)
         FROM campaigns c
         WHERE c.id = p_campaign_id
       )
    LIMIT 1;

    IF v_invalid_item_id IS NOT NULL THEN
      RAISE EXCEPTION 'El ítem % no pertenece a la campaña', v_invalid_item_id;
    END IF;

    INSERT INTO respondents (
      campaign_id,
      department,
      tenure,
      gender,
      status,
      enps_score,
      started_at,
      completed_at
    )
    VALUES (
      p_campaign_id,
      NULLIF(trim(COALESCE(p_demographics->>'department', '')), ''),
      NULLIF(trim(COALESCE(p_demographics->>'tenure', '')), ''),
      NULLIF(trim(COALESCE(p_demographics->>'gender', '')), ''),
      'completed',
      p_enps_score,
      COALESCE(p_started_at, p_completed_at, now()),
      COALESCE(p_completed_at, now())
    )
    RETURNING id INTO v_respondent_id;

    INSERT INTO responses (
      respondent_id,
      item_id,
      score,
      source
    )
    SELECT
      v_respondent_id,
      (entry.item_id)::uuid,
      entry.score,
      p_source
    FROM jsonb_to_recordset(p_responses) AS entry(item_id text, score integer);

    IF jsonb_typeof(p_open_responses) = 'array' AND jsonb_array_length(p_open_responses) > 0 THEN
      INSERT INTO open_responses (
        respondent_id,
        question_type,
        text
      )
      SELECT
        v_respondent_id,
        entry.question_type,
        entry.text
      FROM jsonb_to_recordset(p_open_responses) AS entry(question_type text, text text);
    END IF;

    UPDATE ingest_events
    SET
      respondent_id = v_respondent_id,
      status = 'completed',
      processed_at = now()
    WHERE id = v_ingest_event_id;

    RETURN QUERY SELECT false, true, v_respondent_id, v_ingest_event_id, p_campaign_id, NULL::text;
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    v_error_message := SQLERRM;

    IF v_respondent_id IS NOT NULL THEN
      DELETE FROM respondents
      WHERE id = v_respondent_id;
    END IF;

    UPDATE ingest_events
    SET
      status = 'failed',
      error_message = v_error_message,
      processed_at = now()
    WHERE id = v_ingest_event_id;

    RETURN QUERY SELECT false, false, NULL::uuid, v_ingest_event_id, p_campaign_id, v_error_message;
    RETURN;
  END;
END;
$$;

REVOKE ALL ON FUNCTION process_normalized_ingest(text, text, uuid, timestamptz, timestamptz, jsonb, jsonb, jsonb, integer, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_normalized_ingest(text, text, uuid, timestamptz, timestamptz, jsonb, jsonb, jsonb, integer, text, text, text, text, jsonb) TO postgres, service_role;
