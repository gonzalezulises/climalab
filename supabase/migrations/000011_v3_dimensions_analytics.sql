-- ============================================================
-- v3.0: Extend dimensions with category and theoretical_basis
-- ============================================================
ALTER TABLE dimensions ADD COLUMN category text;
ALTER TABLE dimensions ADD COLUMN theoretical_basis text;

-- ============================================================
-- v3.0: Campaign analytics table for advanced results
-- ============================================================
CREATE TABLE campaign_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX idx_analytics_type ON campaign_analytics(analysis_type);

-- RLS
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can view analytics"
  ON campaign_analytics FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage analytics"
  ON campaign_analytics FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
