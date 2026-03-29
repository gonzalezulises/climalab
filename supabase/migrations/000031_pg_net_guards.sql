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
  IF to_regclass('net._http_response') IS NULL THEN
    RETURN 0;
  END IF;

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
      'skipped',
      'missing_pg_net'
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
