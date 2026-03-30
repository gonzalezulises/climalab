CREATE TABLE IF NOT EXISTS analysis_statistical_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  comparison_scope text NOT NULL DEFAULT 'latest',
  baseline_version text NOT NULL,
  robustness_score numeric NOT NULL DEFAULT 0,
  drift_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation_status text NOT NULL DEFAULT 'attention_needed',
  interpretation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_statistical_baselines_campaign
  ON analysis_statistical_baselines(campaign_id, created_at DESC);

ALTER TABLE analysis_statistical_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read analysis_statistical_baselines" ON analysis_statistical_baselines;
DROP POLICY IF EXISTS "system can manage analysis_statistical_baselines" ON analysis_statistical_baselines;

CREATE POLICY "super_admin can read analysis_statistical_baselines"
  ON analysis_statistical_baselines FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin' OR campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "system can manage analysis_statistical_baselines"
  ON analysis_statistical_baselines FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE TABLE IF NOT EXISTS campaign_ai_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES analysis_runs(id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  claim_key text NOT NULL,
  claim_text text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metric_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  dimension_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_label text NOT NULL DEFAULT 'medium',
  policy_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_ai_evidence_campaign
  ON campaign_ai_evidence(campaign_id, insight_type, created_at DESC);

ALTER TABLE campaign_ai_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read campaign_ai_evidence" ON campaign_ai_evidence;
DROP POLICY IF EXISTS "system can manage campaign_ai_evidence" ON campaign_ai_evidence;

CREATE POLICY "super_admin can read campaign_ai_evidence"
  ON campaign_ai_evidence FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin' OR campaign_id IN (
    SELECT id FROM campaigns WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "system can manage campaign_ai_evidence"
  ON campaign_ai_evidence FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE TABLE IF NOT EXISTS pipeline_slo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT current_date,
  domain text NOT NULL,
  slo_target numeric NOT NULL DEFAULT 99,
  observed_success_rate numeric NOT NULL DEFAULT 0,
  observed_latency_ms numeric NOT NULL DEFAULT 0,
  error_budget_remaining numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'watch',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_slo_snapshots_date
  ON pipeline_slo_snapshots(snapshot_date DESC, domain);

ALTER TABLE pipeline_slo_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read pipeline_slo_snapshots" ON pipeline_slo_snapshots;
DROP POLICY IF EXISTS "system can manage pipeline_slo_snapshots" ON pipeline_slo_snapshots;

CREATE POLICY "super_admin can read pipeline_slo_snapshots"
  ON pipeline_slo_snapshots FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "system can manage pipeline_slo_snapshots"
  ON pipeline_slo_snapshots FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE TABLE IF NOT EXISTS performance_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  metric_key text NOT NULL,
  baseline_version text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_baselines_scope
  ON performance_baselines(scope, metric_key, observed_at DESC);

ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin can read performance_baselines" ON performance_baselines;
DROP POLICY IF EXISTS "system can manage performance_baselines" ON performance_baselines;

CREATE POLICY "super_admin can read performance_baselines"
  ON performance_baselines FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

CREATE POLICY "system can manage performance_baselines"
  ON performance_baselines FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
