-- Harden public survey access and add foundational pipeline tables

ALTER TABLE responses
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web'
CHECK (source IN ('web', 'webhook', 'csv', 'api'));

CREATE TABLE IF NOT EXISTS ingest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('webhook', 'csv', 'api')),
  external_event_id text NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  respondent_id uuid REFERENCES respondents(id) ON DELETE SET NULL,
  payload_hash text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (source, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_ingest_events_campaign ON ingest_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ingest_events_status ON ingest_events(status);

CREATE TABLE IF NOT EXISTS campaign_stats (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  dimension_code text NOT NULL,
  segment_type text NOT NULL DEFAULT 'global',
  segment_key text NOT NULL DEFAULT 'global',
  respondent_count integer NOT NULL DEFAULT 0,
  response_count integer NOT NULL DEFAULT 0,
  avg_score numeric(6,3),
  favorability_pct numeric(5,2),
  last_response_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, dimension_code, segment_type, segment_key)
);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_campaign ON campaign_stats(campaign_id);

ALTER TABLE ingest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can select respondent by token" ON respondents;
DROP POLICY IF EXISTS "public can insert respondents" ON respondents;
DROP POLICY IF EXISTS "public can update own respondent" ON respondents;

DROP POLICY IF EXISTS "anon can select own responses" ON responses;
DROP POLICY IF EXISTS "public can insert responses" ON responses;
DROP POLICY IF EXISTS "anon can update own responses" ON responses;
DROP POLICY IF EXISTS "authenticated can insert responses" ON responses;
DROP POLICY IF EXISTS "authenticated can update responses" ON responses;

DROP POLICY IF EXISTS "public can insert open_responses" ON open_responses;
DROP POLICY IF EXISTS "authenticated can insert open_responses" ON open_responses;

DROP POLICY IF EXISTS "anon can read active campaigns" ON campaigns;
DROP POLICY IF EXISTS "anon can read dimensions" ON dimensions;
DROP POLICY IF EXISTS "anon can read items" ON items;
DROP POLICY IF EXISTS "anon can read org basics" ON organizations;

DROP POLICY IF EXISTS "anon can read tally mappings" ON tally_form_mappings;
DROP POLICY IF EXISTS "authenticated can read tally mappings" ON tally_form_mappings;
DROP POLICY IF EXISTS "authenticated can manage tally mappings" ON tally_form_mappings;

CREATE POLICY "authenticated can read own tally mappings"
  ON tally_form_mappings FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "authenticated can manage own tally mappings"
  ON tally_form_mappings FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "authenticated can read campaign_stats"
  ON campaign_stats FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage campaign_stats"
  ON campaign_stats FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "authenticated can read ingest_events"
  ON ingest_events FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "system can manage ingest_events"
  ON ingest_events FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
