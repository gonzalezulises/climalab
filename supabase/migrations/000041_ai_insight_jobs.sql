-- Migration 000041: Background job system for AI insight generation.
-- Each "Generar insights IA" click inserts 6 rows (one per insight type).
-- A pg_net trigger dispatches one independent Vercel invocation per row,
-- so each insight has its own 300s timeout and fails independently.

CREATE TABLE IF NOT EXISTS ai_insight_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id        uuid        NOT NULL,
  insight_type    text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt_count   integer     NOT NULL DEFAULT 0,
  max_attempts    integer     NOT NULL DEFAULT 3,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (batch_id, insight_type)
);

CREATE INDEX idx_ai_insight_jobs_batch
  ON ai_insight_jobs(batch_id);

CREATE INDEX idx_ai_insight_jobs_campaign
  ON ai_insight_jobs(campaign_id, created_at DESC);

CREATE INDEX idx_ai_insight_jobs_pending
  ON ai_insight_jobs(status, created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE ai_insight_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read own ai_insight_jobs"
  ON ai_insight_jobs FOR SELECT TO authenticated
  USING (
    get_user_role() = 'super_admin'
    OR organization_id = get_user_org_id()
  );

-- All writes go through the service role (API route uses admin client).
CREATE POLICY "system can manage ai_insight_jobs"
  ON ai_insight_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- claim_ai_insight_job — atomic lock with attempt counter increment.
-- Returns true when the job was successfully claimed, false if already taken
-- or max_attempts exceeded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_ai_insight_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_threshold timestamptz := now() - interval '5 minutes';
  v_rows_updated    integer;
BEGIN
  UPDATE ai_insight_jobs
  SET
    status        = 'processing',
    started_at    = now(),
    attempt_count = attempt_count + 1,
    error_message = NULL
  WHERE
    id            = p_job_id
    AND attempt_count < max_attempts
    AND (
      status = 'pending'
      OR (status = 'processing' AND started_at < v_stale_threshold)
    );

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  RETURN v_rows_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION claim_ai_insight_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_ai_insight_job(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- dispatch_ai_insight_job — pg_net trigger: fires one HTTP POST per INSERT.
-- Gracefully skips if secrets are not configured or pg_net is unavailable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dispatch_ai_insight_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_request_id bigint;
  v_url        text;
  v_secret     text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  v_url    := get_pipeline_secret('ai_insight_processor_url');
  v_secret := get_pipeline_secret('ai_insight_hook_secret');

  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RETURN NEW;
  END IF;

  IF to_regproc('net.http_post') IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
      'job_id',          NEW.id,
      'campaign_id',     NEW.campaign_id,
      'organization_id', NEW.organization_id,
      'insight_type',    NEW.insight_type,
      'batch_id',        NEW.batch_id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  )
  INTO v_request_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispatch_ai_insight_job
  AFTER INSERT ON ai_insight_jobs
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_ai_insight_job();
