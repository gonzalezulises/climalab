-- ============================================================
-- 000012: Onboarding Evolution
-- Structured departments, contact info, campaign targeting
-- ============================================================

-- ============================================================
-- 1. Organizations — new columns
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN commercial_name text,
  ADD COLUMN contact_name text,
  ADD COLUMN contact_email text,
  ADD COLUMN contact_role text;

-- ============================================================
-- 2. Organizations — convert departments text[] → jsonb
-- ============================================================
ALTER TABLE organizations ADD COLUMN departments_v2 jsonb NOT NULL DEFAULT '[]';

-- Migrate existing data: each text entry becomes {name: text, headcount: null}
UPDATE organizations
SET departments_v2 = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('name', dept, 'headcount', null)),
    '[]'::jsonb
  )
  FROM unnest(departments) AS dept
);

ALTER TABLE organizations DROP COLUMN departments;
ALTER TABLE organizations RENAME COLUMN departments_v2 TO departments;

-- Ensure departments is always a JSON array
ALTER TABLE organizations
  ADD CONSTRAINT chk_departments_is_array
  CHECK (jsonb_typeof(departments) = 'array');

-- ============================================================
-- 3. Campaigns — new columns
-- ============================================================
ALTER TABLE campaigns
  ADD COLUMN measurement_objective text
    CHECK (measurement_objective IN (
      'initial_diagnosis', 'periodic_followup', 'post_intervention',
      'specific_assessment', 'other'
    )),
  ADD COLUMN objective_description text,
  ADD COLUMN context_notes text,
  ADD COLUMN target_departments text[],
  ADD COLUMN target_population integer;

-- ============================================================
-- 4. Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION get_org_total_headcount(p_org_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(
    (SELECT SUM((elem->>'headcount')::int)
     FROM organizations o, jsonb_array_elements(o.departments) AS elem
     WHERE o.id = p_org_id AND elem->>'headcount' IS NOT NULL),
    0
  )::integer;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_department_headcount(p_org_id uuid, p_dept_name text)
RETURNS integer AS $$
  SELECT COALESCE(
    (SELECT (elem->>'headcount')::int
     FROM organizations o, jsonb_array_elements(o.departments) AS elem
     WHERE o.id = p_org_id AND elem->>'name' = p_dept_name
     LIMIT 1),
    0
  )::integer;
$$ LANGUAGE sql STABLE;
