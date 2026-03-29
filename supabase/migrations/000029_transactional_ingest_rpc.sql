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
  p_payload_hash text DEFAULT NULL
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
    status
  )
  VALUES (
    p_source,
    p_external_event_id,
    p_campaign_id,
    p_payload_hash,
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

REVOKE ALL ON FUNCTION process_normalized_ingest(text, text, uuid, timestamptz, timestamptz, jsonb, jsonb, jsonb, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_normalized_ingest(text, text, uuid, timestamptz, timestamptz, jsonb, jsonb, jsonb, integer, text) TO postgres, service_role;
