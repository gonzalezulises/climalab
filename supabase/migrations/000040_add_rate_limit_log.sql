-- Migration 000040: Persistent rate limit log for Vercel serverless
-- Replaces the in-memory Map that resets on every cold start.
-- Accessed exclusively via the check_rate_limit() SECURITY DEFINER RPC
-- from the service-role admin client.

CREATE TABLE IF NOT EXISTS rate_limit_log (
  key        text        PRIMARY KEY,
  timestamps timestamptz[] NOT NULL DEFAULT '{}',
  updated_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- No direct client access; all reads/writes go through check_rate_limit().
CREATE POLICY "deny all direct access"
  ON rate_limit_log
  FOR ALL
  USING (false);

-- ---------------------------------------------------------------------------
-- check_rate_limit(p_key, p_limit, p_window_ms)
-- Atomic sliding-window rate limiter.
-- Returns: { "success": bool, "remaining": int }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key       text,
  p_limit     integer,
  p_window_ms bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start  timestamptz;
  v_stored        timestamptz[];
  v_recent        timestamptz[];
  v_count         integer;
BEGIN
  v_window_start := now() - (p_window_ms || ' milliseconds')::interval;

  -- Lock the row so concurrent requests don't double-count.
  SELECT timestamps
  INTO v_stored
  FROM rate_limit_log
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    v_stored := '{}';
  END IF;

  -- Keep only timestamps inside the sliding window.
  SELECT COALESCE(array_agg(ts ORDER BY ts), '{}')
  INTO v_recent
  FROM unnest(v_stored) AS ts
  WHERE ts > v_window_start;

  v_count := COALESCE(array_length(v_recent, 1), 0);

  IF v_count >= p_limit THEN
    -- Persist cleaned array (no new entry) and reject.
    INSERT INTO rate_limit_log (key, timestamps, updated_at)
    VALUES (p_key, v_recent, now())
    ON CONFLICT (key) DO UPDATE
      SET timestamps = v_recent,
          updated_at = now();

    RETURN jsonb_build_object('success', false, 'remaining', 0);
  END IF;

  -- Allow: append current timestamp and persist.
  v_recent := v_recent || now();

  INSERT INTO rate_limit_log (key, timestamps, updated_at)
  VALUES (p_key, v_recent, now())
  ON CONFLICT (key) DO UPDATE
    SET timestamps = v_recent,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'remaining', p_limit - v_count - 1);
END;
$$;

-- Optional manual cleanup (call from a cron job or admin script).
-- Removes entries idle for more than 10 minutes.
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE updated_at < now() - interval '10 minutes';
END;
$$;
