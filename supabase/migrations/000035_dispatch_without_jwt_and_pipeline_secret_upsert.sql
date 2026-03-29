CREATE OR REPLACE FUNCTION upsert_pipeline_secret(
  secret_name text,
  secret_value text,
  secret_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  IF coalesce(secret_name, '') = '' THEN
    RAISE EXCEPTION 'secret_name is required';
  END IF;

  IF coalesce(secret_value, '') = '' THEN
    RAISE EXCEPTION 'secret_value is required';
  END IF;

  v_secret_id := vault.create_secret(
    secret_value,
    secret_name,
    coalesce(secret_description, 'Pipeline secret managed by ClimaLab')
  );

  RETURN v_secret_id;
END;
$$;

REVOKE ALL ON FUNCTION upsert_pipeline_secret(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_pipeline_secret(text, text, text) TO postgres, service_role;

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

  IF coalesce(v_url, '') = '' OR coalesce(v_hook_secret, '') = '' THEN
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

  IF to_regproc('net.http_post') IS NULL THEN
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
      'failed',
      'pg_net_unavailable'
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
