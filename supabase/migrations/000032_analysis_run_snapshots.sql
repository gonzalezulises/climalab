CREATE TABLE IF NOT EXISTS analysis_run_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL UNIQUE REFERENCES analysis_runs(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  logic_version text NOT NULL,
  snapshot_type text NOT NULL DEFAULT 'campaign_overview',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_run_snapshots_campaign_created
  ON analysis_run_snapshots(campaign_id, created_at DESC);

ALTER TABLE analysis_run_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read analysis_run_snapshots" ON analysis_run_snapshots;
DROP POLICY IF EXISTS "system can manage analysis_run_snapshots" ON analysis_run_snapshots;

CREATE POLICY "authenticated can read analysis_run_snapshots"
  ON analysis_run_snapshots FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage analysis_run_snapshots"
  ON analysis_run_snapshots FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
