CREATE TABLE IF NOT EXISTS backfill_run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source text NOT NULL CHECK (trigger_source IN ('manual', 'cron')),
  target_logic_version text NOT NULL,
  batch_size integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  selected integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE backfill_run_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read backfill_run_metrics" ON backfill_run_metrics;
DROP POLICY IF EXISTS "system can manage backfill_run_metrics" ON backfill_run_metrics;

CREATE POLICY "super_admin can read backfill_run_metrics"
  ON backfill_run_metrics FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "system can manage backfill_run_metrics"
  ON backfill_run_metrics FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
