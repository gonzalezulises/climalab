-- Migration 000042: Circuit breaker helpers for the Statistical API.
-- Reuses rate_limit_log (already exists) with dedicated keys.
-- record_circuit_failure() — appends a failure timestamp.
-- is_circuit_open()        — checks if threshold failures occurred in window.

CREATE OR REPLACE FUNCTION record_circuit_failure(
  p_key      text,
  p_window_ms bigint DEFAULT 300000  -- 5 min default
)
RETURNS integer  -- returns current failure count in window
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_stored       timestamptz[];
  v_recent       timestamptz[];
BEGIN
  v_window_start := now() - (p_window_ms || ' milliseconds')::interval;

  SELECT timestamps INTO v_stored
  FROM rate_limit_log
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    v_stored := '{}';
  END IF;

  SELECT COALESCE(array_agg(ts ORDER BY ts), '{}')
  INTO v_recent
  FROM unnest(v_stored) AS ts
  WHERE ts > v_window_start;

  v_recent := v_recent || now();

  INSERT INTO rate_limit_log (key, timestamps, updated_at)
  VALUES (p_key, v_recent, now())
  ON CONFLICT (key) DO UPDATE
    SET timestamps = v_recent,
        updated_at = now();

  RETURN COALESCE(array_length(v_recent, 1), 0);
END;
$$;

CREATE OR REPLACE FUNCTION is_circuit_open(
  p_key       text,
  p_threshold integer DEFAULT 3,
  p_window_ms bigint  DEFAULT 300000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_stored       timestamptz[];
  v_count        integer;
BEGIN
  v_window_start := now() - (p_window_ms || ' milliseconds')::interval;

  SELECT timestamps INTO v_stored
  FROM rate_limit_log
  WHERE key = p_key;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM unnest(v_stored) AS ts
  WHERE ts > v_window_start;

  RETURN v_count >= p_threshold;
END;
$$;

REVOKE ALL ON FUNCTION record_circuit_failure(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION is_circuit_open(text, integer, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_circuit_failure(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION is_circuit_open(text, integer, bigint) TO service_role;
