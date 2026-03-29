CREATE TABLE IF NOT EXISTS pipeline_dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id bigint UNIQUE,
  hook_name text NOT NULL,
  event_type text NOT NULL DEFAULT 'response_insert',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  respondent_id uuid REFERENCES respondents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'delivered', 'failed', 'skipped')),
  reason text,
  response_status integer,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (hook_name, event_type, respondent_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_dispatch_events_status
  ON pipeline_dispatch_events(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_dispatch_events_campaign
  ON pipeline_dispatch_events(campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS batch_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source text NOT NULL CHECK (trigger_source IN ('cron', 'manual', 'response_hook')),
  hours_window integer NOT NULL DEFAULT 24,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  processed integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  campaign_ids uuid[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE pipeline_dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read pipeline_dispatch_events" ON pipeline_dispatch_events;
DROP POLICY IF EXISTS "system can manage pipeline_dispatch_events" ON pipeline_dispatch_events;
DROP POLICY IF EXISTS "super_admin can read batch_job_runs" ON batch_job_runs;
DROP POLICY IF EXISTS "system can manage batch_job_runs" ON batch_job_runs;

CREATE POLICY "authenticated can read pipeline_dispatch_events"
  ON pipeline_dispatch_events FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage pipeline_dispatch_events"
  ON pipeline_dispatch_events FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "super_admin can read batch_job_runs"
  ON batch_job_runs FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "system can manage batch_job_runs"
  ON batch_job_runs FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE OR REPLACE FUNCTION get_pipeline_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_pipeline_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pipeline_secret(text) TO postgres, service_role;

CREATE OR REPLACE FUNCTION refresh_pipeline_dispatch_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_updated integer := 0;
  v_timed_out integer := 0;
BEGIN
  UPDATE pipeline_dispatch_events AS event
  SET
    status = CASE
      WHEN response.timed_out THEN 'failed'
      WHEN response.status_code BETWEEN 200 AND 299 THEN 'delivered'
      ELSE 'failed'
    END,
    reason = CASE
      WHEN response.timed_out THEN COALESCE(event.reason, 'request_timed_out')
      WHEN response.status_code BETWEEN 200 AND 299 THEN event.reason
      ELSE COALESCE(response.error_msg, event.reason, 'unexpected_status_code')
    END,
    response_status = response.status_code,
    response_body = COALESCE(response.content, response.error_msg),
    delivered_at = COALESCE(event.delivered_at, now())
  FROM net._http_response AS response
  WHERE event.request_id = response.id
    AND event.status = 'queued';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE pipeline_dispatch_events
  SET
    status = 'failed',
    reason = COALESCE(reason, 'response_timeout'),
    delivered_at = COALESCE(delivered_at, now())
  WHERE status = 'queued'
    AND created_at < now() - interval '15 minutes';

  GET DIAGNOSTICS v_timed_out = ROW_COUNT;
  v_updated := v_updated + v_timed_out;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION refresh_pipeline_dispatch_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_pipeline_dispatch_events() TO postgres, service_role;

CREATE OR REPLACE FUNCTION dispatch_process_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_request_id bigint;
  v_campaign_id uuid;
  v_respondent_status text;
  v_completed_at timestamptz;
  v_url text;
  v_hook_secret text;
  v_function_jwt text;
BEGIN
  IF NEW.source = 'web' THEN
    RETURN NEW;
  END IF;

  SELECT campaign_id, status, completed_at
  INTO v_campaign_id, v_respondent_status, v_completed_at
  FROM respondents
  WHERE id = NEW.respondent_id;

  IF v_campaign_id IS NULL OR v_respondent_status <> 'completed' OR v_completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pipeline_dispatch_events
    WHERE hook_name = 'process_response'
      AND event_type = 'response_insert'
      AND respondent_id = NEW.respondent_id
  ) THEN
    RETURN NEW;
  END IF;

  v_url := get_pipeline_secret('process_response_function_url');
  v_hook_secret := get_pipeline_secret('process_response_hook_secret');
  v_function_jwt := COALESCE(
    get_pipeline_secret('process_response_function_jwt'),
    get_pipeline_secret('supabase_service_role_key')
  );

  IF coalesce(v_url, '') = '' OR coalesce(v_hook_secret, '') = '' OR coalesce(v_function_jwt, '') = '' THEN
    INSERT INTO pipeline_dispatch_events (
      hook_name,
      event_type,
      campaign_id,
      respondent_id,
      status,
      reason
    )
    VALUES (
      'process_response',
      'response_insert',
      v_campaign_id,
      NEW.respondent_id,
      'skipped',
      'missing_pipeline_secret'
    )
    ON CONFLICT (hook_name, event_type, respondent_id) DO NOTHING;

    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'old_record', NULL,
      'record', to_jsonb(NEW),
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_function_jwt,
      'apikey', v_function_jwt,
      'x-hook-secret', v_hook_secret
    ),
    timeout_milliseconds := 5000
  )
  INTO v_request_id;

  INSERT INTO pipeline_dispatch_events (
    request_id,
    hook_name,
    event_type,
    campaign_id,
    respondent_id,
    status
  )
  VALUES (
    v_request_id,
    'process_response',
    'response_insert',
    v_campaign_id,
    NEW.respondent_id,
    CASE WHEN v_request_id IS NULL THEN 'failed' ELSE 'queued' END
  )
  ON CONFLICT (hook_name, event_type, respondent_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_process_response ON responses;

CREATE TRIGGER trg_dispatch_process_response
AFTER INSERT ON responses
FOR EACH ROW
EXECUTE FUNCTION dispatch_process_response();
