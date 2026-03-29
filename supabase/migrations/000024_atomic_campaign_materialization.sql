CREATE OR REPLACE FUNCTION replace_campaign_materialization(
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
      result_type,
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
      x.result_type,
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
      result_type text,
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
      analysis_type,
      data
    )
    SELECT
      x.campaign_id,
      x.analysis_type,
      COALESCE(x.data, '{}'::jsonb)
    FROM jsonb_to_recordset(p_analytics) AS x(
      campaign_id uuid,
      analysis_type text,
      data jsonb
    );
  END IF;
END;
$$;
