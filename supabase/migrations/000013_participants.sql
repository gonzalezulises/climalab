-- ============================================================
-- Fix: respondents INSERT/UPDATE/DELETE for authenticated users
-- Currently only anon can insert respondents, but admin needs to
-- create them when adding participants.
-- ============================================================

-- Admin can insert respondents (for participant management)
DROP POLICY IF EXISTS "admin can insert respondents" ON respondents;
CREATE POLICY "admin can insert respondents"
  ON respondents FOR INSERT TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

-- Admin can update respondents (status changes, etc.)
DROP POLICY IF EXISTS "admin can update respondents" ON respondents;
CREATE POLICY "admin can update respondents"
  ON respondents FOR UPDATE TO authenticated
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

-- Admin can delete respondents (remove participant)
DROP POLICY IF EXISTS "admin can delete respondents" ON respondents;
CREATE POLICY "admin can delete respondents"
  ON respondents FOR DELETE TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

-- ============================================================
-- Participants: PII table (name, email) linked to respondents
-- Separated from respondents to keep survey page PII-free
-- ============================================================

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  respondent_id uuid UNIQUE REFERENCES respondents(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  department text,
  invitation_status text NOT NULL DEFAULT 'pending'
    CHECK (invitation_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  invited_at timestamptz,
  reminded_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_participants_campaign ON participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_participants_respondent ON participants(respondent_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(campaign_id, email);

-- ============================================================
-- RLS: authenticated-only access scoped to org campaigns
-- ============================================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin can view participants" ON participants;
CREATE POLICY "admin can view participants"
  ON participants FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "admin can insert participants" ON participants;
CREATE POLICY "admin can insert participants"
  ON participants FOR INSERT TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "admin can update participants" ON participants;
CREATE POLICY "admin can update participants"
  ON participants FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "admin can delete participants" ON participants;
CREATE POLICY "admin can delete participants"
  ON participants FOR DELETE TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );
