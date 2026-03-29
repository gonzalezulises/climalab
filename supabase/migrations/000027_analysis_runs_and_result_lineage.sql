CREATE TABLE IF NOT EXISTS analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  trigger_source text NOT NULL CHECK (
    trigger_source IN ('cron', 'manual', 'batch', 'seed', 'incremental_refresh', 'response_hook')
  ),
  logic_version text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_campaign_started
  ON analysis_runs(campaign_id, started_at DESC);

CREATE TABLE IF NOT EXISTS analysis_run_respondent_quality (
  analysis_run_id uuid NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  quality_status text NOT NULL CHECK (quality_status IN ('valid', 'disqualified')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (analysis_run_id, respondent_id)
);

ALTER TABLE campaign_results
  ALTER COLUMN avg_score TYPE numeric(6,2),
  ALTER COLUMN std_score TYPE numeric(6,2);

ALTER TABLE campaign_results
  ADD COLUMN IF NOT EXISTS analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instrument_id uuid REFERENCES instruments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instrument_type instrument_type,
  ADD COLUMN IF NOT EXISTS dimension_id uuid REFERENCES dimensions(id) ON DELETE SET NULL;

ALTER TABLE campaign_stats
  ADD COLUMN IF NOT EXISTS analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instrument_id uuid REFERENCES instruments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instrument_type instrument_type,
  ADD COLUMN IF NOT EXISTS dimension_id uuid REFERENCES dimensions(id) ON DELETE SET NULL;

ALTER TABLE campaign_analytics
  ADD COLUMN IF NOT EXISTS analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_results_analysis_run
  ON campaign_results(campaign_id, analysis_run_id);

CREATE INDEX IF NOT EXISTS idx_campaign_results_lineage
  ON campaign_results(campaign_id, instrument_id, dimension_id);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_analysis_run
  ON campaign_stats(campaign_id, analysis_run_id);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_lineage
  ON campaign_stats(campaign_id, instrument_id, dimension_id);

CREATE INDEX IF NOT EXISTS idx_campaign_analytics_analysis_run
  ON campaign_analytics(campaign_id, analysis_run_id);

UPDATE campaign_results AS result
SET
  dimension_id = dimension_data.dimension_id,
  instrument_id = dimension_data.instrument_id,
  instrument_type = dimension_data.instrument_type
FROM (
  SELECT DISTINCT ON (d.code)
    d.code,
    d.id AS dimension_id,
    d.instrument_id,
    i.instrument_type
  FROM dimensions d
  JOIN instruments i ON i.id = d.instrument_id
  ORDER BY d.code, d.sort_order, d.id
) AS dimension_data
WHERE result.dimension_code = dimension_data.code
  AND result.dimension_code IS NOT NULL
  AND (result.dimension_id IS NULL OR result.instrument_id IS NULL OR result.instrument_type IS NULL);

UPDATE campaign_stats AS stats
SET
  dimension_id = dimension_data.dimension_id,
  instrument_id = dimension_data.instrument_id,
  instrument_type = dimension_data.instrument_type
FROM (
  SELECT DISTINCT ON (d.code)
    d.code,
    d.id AS dimension_id,
    d.instrument_id,
    i.instrument_type
  FROM dimensions d
  JOIN instruments i ON i.id = d.instrument_id
  ORDER BY d.code, d.sort_order, d.id
) AS dimension_data
WHERE stats.dimension_code = dimension_data.code
  AND (stats.dimension_id IS NULL OR stats.instrument_id IS NULL OR stats.instrument_type IS NULL);

CREATE OR REPLACE FUNCTION finalize_analysis_run(
  p_analysis_run_id uuid,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE analysis_runs
  SET
    status = p_status,
    error_message = p_error_message,
    completed_at = now()
  WHERE id = p_analysis_run_id;
END;
$$;

REVOKE ALL ON FUNCTION finalize_analysis_run(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_analysis_run(uuid, text, text) TO postgres, service_role;

CREATE OR REPLACE FUNCTION replace_campaign_materialization(
  p_analysis_run_id uuid,
  p_campaign_id uuid,
  p_population_n integer,
  p_sample_n integer,
  p_response_rate numeric,
  p_margin_of_error numeric,
  p_results jsonb,
  p_analytics jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE campaigns
  SET
    population_n = p_population_n,
    sample_n = p_sample_n,
    response_rate = p_response_rate,
    margin_of_error = p_margin_of_error
  WHERE id = p_campaign_id;

  DELETE FROM campaign_results
  WHERE campaign_id = p_campaign_id;

  IF jsonb_typeof(p_results) = 'array' AND jsonb_array_length(p_results) > 0 THEN
    INSERT INTO campaign_results (
      campaign_id,
      analysis_run_id,
      result_type,
      instrument_id,
      instrument_type,
      dimension_id,
      dimension_code,
      segment_key,
      segment_type,
      avg_score,
      std_score,
      favorability_pct,
      response_count,
      respondent_count,
      metadata
    )
    SELECT
      x.campaign_id,
      COALESCE(x.analysis_run_id, p_analysis_run_id),
      x.result_type,
      x.instrument_id,
      x.instrument_type,
      x.dimension_id,
      x.dimension_code,
      x.segment_key,
      x.segment_type,
      x.avg_score,
      x.std_score,
      x.favorability_pct,
      x.response_count,
      x.respondent_count,
      COALESCE(x.metadata, '{}'::jsonb)
    FROM jsonb_to_recordset(p_results) AS x(
      campaign_id uuid,
      analysis_run_id uuid,
      result_type text,
      instrument_id uuid,
      instrument_type instrument_type,
      dimension_id uuid,
      dimension_code text,
      segment_key text,
      segment_type text,
      avg_score numeric,
      std_score numeric,
      favorability_pct numeric,
      response_count integer,
      respondent_count integer,
      metadata jsonb
    );
  END IF;

  DELETE FROM campaign_analytics
  WHERE campaign_id = p_campaign_id;

  IF jsonb_typeof(p_analytics) = 'array' AND jsonb_array_length(p_analytics) > 0 THEN
    INSERT INTO campaign_analytics (
      campaign_id,
      analysis_run_id,
      analysis_type,
      data
    )
    SELECT
      x.campaign_id,
      COALESCE(x.analysis_run_id, p_analysis_run_id),
      x.analysis_type,
      COALESCE(x.data, '{}'::jsonb)
    FROM jsonb_to_recordset(p_analytics) AS x(
      campaign_id uuid,
      analysis_run_id uuid,
      analysis_type text,
      data jsonb
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_campaign_stats(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  v_analysis_run_id uuid;
BEGIN
  INSERT INTO analysis_runs (
    campaign_id,
    trigger_source,
    logic_version,
    status,
    input_snapshot,
    started_at
  )
  VALUES (
    p_campaign_id,
    'incremental_refresh',
    '2026-03-29-lineage-v1',
    'running',
    jsonb_build_object('campaign_id', p_campaign_id, 'mode', 'campaign_stats'),
    now()
  )
  RETURNING id INTO v_analysis_run_id;

  DELETE FROM campaign_stats
  WHERE campaign_id = p_campaign_id;

  WITH linked_campaign_instruments AS (
    SELECT DISTINCT instrument_id, instrument_type
    FROM (
      SELECT instrument_id, instrument_type
      FROM campaign_instruments
      WHERE campaign_id = p_campaign_id
      UNION ALL
      SELECT instrument_id, 'base'::instrument_type
      FROM campaigns
      WHERE id = p_campaign_id
      UNION ALL
      SELECT unnest(module_instrument_ids), 'module'::instrument_type
      FROM campaigns
      WHERE id = p_campaign_id
    ) AS refs
  ),
  dimension_items AS (
    SELECT
      d.id AS dimension_id,
      d.instrument_id,
      ci.instrument_type,
      d.code AS dimension_code,
      i.id AS item_id,
      i.text,
      i.is_reverse,
      i.is_attention_check
    FROM dimensions d
    JOIN items i ON i.dimension_id = d.id
    JOIN linked_campaign_instruments ci ON ci.instrument_id = d.instrument_id
  ),
  attention_checks AS (
    SELECT
      item_id,
      CASE
        WHEN lower(text) LIKE '%de acuerdo%' AND lower(text) NOT LIKE '%en desacuerdo%' THEN 4
        WHEN lower(text) LIKE '%en desacuerdo%' THEN 2
        ELSE NULL
      END AS expected_score
    FROM dimension_items
    WHERE is_attention_check = true
  ),
  valid_respondents AS (
    SELECT r.id
    FROM respondents r
    WHERE r.campaign_id = p_campaign_id
      AND r.status = 'completed'
      AND EXISTS (
        SELECT 1
        FROM responses response_exists
        WHERE response_exists.respondent_id = r.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM attention_checks ac
        LEFT JOIN responses resp
          ON resp.respondent_id = r.id
         AND resp.item_id = ac.item_id
        WHERE ac.expected_score IS NOT NULL
          AND resp.score IS DISTINCT FROM ac.expected_score
      )
  ),
  scored_responses AS (
    SELECT
      di.dimension_id,
      di.instrument_id,
      di.instrument_type,
      di.dimension_code,
      resp.respondent_id,
      CASE
        WHEN di.is_reverse THEN 6 - resp.score
        ELSE resp.score
      END::numeric AS adjusted_score,
      resp.answered_at
    FROM responses resp
    JOIN valid_respondents vr ON vr.id = resp.respondent_id
    JOIN dimension_items di ON di.item_id = resp.item_id
    WHERE di.is_attention_check = false
  ),
  inserted_rows AS (
    INSERT INTO campaign_stats (
      analysis_run_id,
      campaign_id,
      instrument_id,
      instrument_type,
      dimension_id,
      dimension_code,
      segment_type,
      segment_key,
      respondent_count,
      response_count,
      avg_score,
      favorability_pct,
      last_response_at
    )
    SELECT
      v_analysis_run_id,
      p_campaign_id,
      instrument_id,
      instrument_type,
      dimension_id,
      dimension_code,
      'global',
      'global',
      COUNT(DISTINCT respondent_id)::integer,
      COUNT(*)::integer,
      ROUND(AVG(adjusted_score), 2),
      ROUND(AVG(CASE WHEN adjusted_score >= 4 THEN 100 ELSE 0 END), 1),
      MAX(answered_at)
    FROM scored_responses
    GROUP BY instrument_id, instrument_type, dimension_id, dimension_code
    RETURNING 1
  )
  SELECT COUNT(*)
  INTO inserted_count
  FROM inserted_rows;

  PERFORM finalize_analysis_run(v_analysis_run_id, 'completed', NULL);

  RETURN inserted_count;
END;
$$;
