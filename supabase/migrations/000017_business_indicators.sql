-- ============================================================
-- v4.1: Business indicators table for objective metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS business_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  indicator_name text NOT NULL CHECK (char_length(indicator_name) BETWEEN 2 AND 100),
  indicator_value numeric NOT NULL,
  indicator_unit text CHECK (indicator_unit IS NULL OR char_length(indicator_unit) <= 20),
  indicator_type text NOT NULL DEFAULT 'custom'
    CHECK (indicator_type IN (
      'turnover_rate', 'absenteeism_rate', 'customer_nps',
      'customer_satisfaction', 'productivity_index', 'incident_count', 'custom'
    )),
  period_start date,
  period_end date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_indicators_campaign ON business_indicators(campaign_id);

-- RLS
ALTER TABLE business_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can view business_indicators"
  ON business_indicators FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "admin can manage business_indicators"
  ON business_indicators FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id()
    ) OR get_user_role() = 'super_admin'
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id()
    ) OR get_user_role() = 'super_admin'
  );
