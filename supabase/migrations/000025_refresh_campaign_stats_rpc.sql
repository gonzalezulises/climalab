CREATE OR REPLACE FUNCTION refresh_campaign_stats(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  DELETE FROM campaign_stats
  WHERE campaign_id = p_campaign_id;

  WITH campaign_instruments AS (
    SELECT instrument_id
    FROM campaigns
    WHERE id = p_campaign_id
    UNION
    SELECT unnest(module_instrument_ids)
    FROM campaigns
    WHERE id = p_campaign_id
  ),
  dimension_items AS (
    SELECT
      d.code AS dimension_code,
      i.id AS item_id,
      i.text,
      i.is_reverse,
      i.is_attention_check
    FROM dimensions d
    JOIN items i ON i.dimension_id = d.id
    WHERE d.instrument_id IN (SELECT instrument_id FROM campaign_instruments)
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
      campaign_id,
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
      p_campaign_id,
      dimension_code,
      'global',
      'global',
      COUNT(DISTINCT respondent_id)::integer,
      COUNT(*)::integer,
      ROUND(AVG(adjusted_score), 2),
      ROUND(AVG(CASE WHEN adjusted_score >= 4 THEN 100 ELSE 0 END), 1),
      MAX(answered_at)
    FROM scored_responses
    GROUP BY dimension_code
    RETURNING 1
  )
  SELECT COUNT(*)
  INTO inserted_count
  FROM inserted_rows;

  RETURN inserted_count;
END;
$$;
