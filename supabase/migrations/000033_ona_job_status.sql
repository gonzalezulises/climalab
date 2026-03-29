CREATE TABLE IF NOT EXISTS campaign_ona_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'deferred', 'failed')),
  backend text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_ona_runs_campaign_created
  ON campaign_ona_runs(campaign_id, created_at DESC);

ALTER TABLE campaign_ona_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read campaign_ona_runs" ON campaign_ona_runs;
DROP POLICY IF EXISTS "system can manage campaign_ona_runs" ON campaign_ona_runs;

CREATE POLICY "authenticated can read campaign_ona_runs"
  ON campaign_ona_runs FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage campaign_ona_runs"
  ON campaign_ona_runs FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
