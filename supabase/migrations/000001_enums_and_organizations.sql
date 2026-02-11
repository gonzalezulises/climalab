-- Enums
CREATE TYPE size_category AS ENUM ('micro', 'small', 'medium');
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'member');
CREATE TYPE instrument_mode AS ENUM ('full', 'pulse');
CREATE TYPE target_size AS ENUM ('all', 'small', 'medium');

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  industry text,
  country text NOT NULL DEFAULT 'MX',
  employee_count integer NOT NULL CHECK (employee_count BETWEEN 1 AND 200),
  size_category size_category NOT NULL DEFAULT 'micro',
  departments text[] NOT NULL DEFAULT '{}',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-classify size_category from employee_count
CREATE OR REPLACE FUNCTION classify_size_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.employee_count <= 10 THEN
    NEW.size_category := 'micro';
  ELSIF NEW.employee_count <= 50 THEN
    NEW.size_category := 'small';
  ELSE
    NEW.size_category := 'medium';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_classify_size_category
  BEFORE INSERT OR UPDATE OF employee_count ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION classify_size_category();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
