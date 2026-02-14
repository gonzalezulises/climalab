-- Enable pgcrypto for gen_random_bytes() used in respondent tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Ensure extensions schema is in search path for gen_random_bytes()
SET search_path TO public, extensions;

-- ============================================================
-- Campaigns: una "ola" de medición por organización
-- ============================================================
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES instruments(id),
  name text NOT NULL, -- ej: "Clima Q1 2026"
  status campaign_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  anonymous boolean NOT NULL DEFAULT true,
  allow_comments boolean NOT NULL DEFAULT true,
  -- Ficha técnica (se calcula al cerrar)
  population_n integer, -- total empleados al momento
  sample_n integer, -- total respuestas
  response_rate numeric(5,2),
  margin_of_error numeric(5,2),
  confidence_level numeric(5,2) DEFAULT 95.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Respondents: token anónimo por participante
-- ============================================================
CREATE TABLE IF NOT EXISTS respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  department text, -- se llena al responder
  tenure text, -- rango: <1, 1-3, 3-5, 5-10, 10+
  gender text, -- opcional
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disqualified')),
  started_at timestamptz,
  completed_at timestamptz,
  ip_hash text, -- hash para detectar duplicados, no PII
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Responses: una respuesta por ítem por respondente
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  score smallint CHECK (score BETWEEN 1 AND 5), -- Likert 1-5
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (respondent_id, item_id)
);

-- ============================================================
-- Open comments: respuestas abiertas
-- ============================================================
CREATE TABLE IF NOT EXISTS open_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
  dimension_id uuid REFERENCES dimensions(id),
  question_type text NOT NULL DEFAULT 'general' CHECK (question_type IN ('strength', 'improvement', 'general')),
  text text NOT NULL CHECK (char_length(text) BETWEEN 3 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Campaign results: scores calculados (materialized)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  result_type text NOT NULL, -- 'dimension', 'item', 'engagement', 'demographic'
  dimension_code text,
  segment_key text, -- 'global', department name, tenure range, etc.
  segment_type text DEFAULT 'global', -- 'global', 'department', 'tenure', 'gender'
  avg_score numeric(4,2),
  std_score numeric(4,2),
  favorability_pct numeric(5,1), -- % respuestas >= 4
  response_count integer,
  respondent_count integer,
  metadata jsonb DEFAULT '{}', -- flexible: items detail, profiles, etc.
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, result_type, dimension_code, segment_key, segment_type)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_respondents_campaign ON respondents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_respondents_token ON respondents(token);
CREATE INDEX IF NOT EXISTS idx_responses_respondent ON responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_responses_item ON responses(item_id);
CREATE INDEX IF NOT EXISTS idx_campaign_results_campaign ON campaign_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_results_type ON campaign_results(campaign_id, result_type);

-- Triggers
DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_results ENABLE ROW LEVEL SECURITY;

-- Campaigns: org_admin ve las de su org, super_admin todas
DROP POLICY IF EXISTS "org_admin can view own campaigns" ON campaigns;
CREATE POLICY "org_admin can view own campaigns"
  ON campaigns FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id() OR get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "super_admin can manage campaigns" ON campaigns;
CREATE POLICY "super_admin can manage campaigns"
  ON campaigns FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "org_admin can manage own campaigns" ON campaigns;
CREATE POLICY "org_admin can manage own campaigns"
  ON campaigns FOR ALL TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() = 'org_admin')
  WITH CHECK (organization_id = get_user_org_id() AND get_user_role() = 'org_admin');

-- Respondents: acceso público para responder (via token), admin para leer
DROP POLICY IF EXISTS "public can insert respondents" ON respondents;
CREATE POLICY "public can insert respondents"
  ON respondents FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "public can update own respondent" ON respondents;
CREATE POLICY "public can update own respondent"
  ON respondents FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin can view respondents" ON respondents;
CREATE POLICY "admin can view respondents"
  ON respondents FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

-- Responses: acceso público para insertar, admin para leer
DROP POLICY IF EXISTS "public can insert responses" ON responses;
CREATE POLICY "public can insert responses"
  ON responses FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin can view responses" ON responses;
CREATE POLICY "admin can view responses"
  ON responses FOR SELECT TO authenticated
  USING (
    respondent_id IN (
      SELECT r.id FROM respondents r
      JOIN campaigns c ON c.id = r.campaign_id
      WHERE c.organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

-- Open responses: mismo patrón
DROP POLICY IF EXISTS "public can insert open_responses" ON open_responses;
CREATE POLICY "public can insert open_responses"
  ON open_responses FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin can view open_responses" ON open_responses;
CREATE POLICY "admin can view open_responses"
  ON open_responses FOR SELECT TO authenticated
  USING (
    respondent_id IN (
      SELECT r.id FROM respondents r
      JOIN campaigns c ON c.id = r.campaign_id
      WHERE c.organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

-- Campaign results: admin de la org o super_admin
DROP POLICY IF EXISTS "admin can view results" ON campaign_results;
CREATE POLICY "admin can view results"
  ON campaign_results FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = get_user_org_id() OR get_user_role() = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "system can manage results" ON campaign_results;
CREATE POLICY "system can manage results"
  ON campaign_results FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
