-- RLS helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Organizations policies
-- ============================================================

-- super_admin can see all organizations
CREATE POLICY "super_admin can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- org_admin can see their own organization
CREATE POLICY "org_admin can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = get_user_org_id());

-- super_admin can create organizations
CREATE POLICY "super_admin can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

-- super_admin can update any organization
CREATE POLICY "super_admin can update any organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- org_admin can update their own organization
CREATE POLICY "org_admin can update own organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (id = get_user_org_id())
  WITH CHECK (id = get_user_org_id());

-- ============================================================
-- Profiles policies
-- ============================================================

-- Users can view their own profile
CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- super_admin can view all profiles
CREATE POLICY "super_admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- org_admin can view profiles in their organization
CREATE POLICY "org_admin can view org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id() AND get_user_role() = 'org_admin');

-- Users can update their own profile (limited fields handled at app level)
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- super_admin can update any profile
CREATE POLICY "super_admin can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- ============================================================
-- Instruments policies (read-only for most, super_admin can edit)
-- ============================================================

-- All authenticated users can view active instruments
CREATE POLICY "authenticated can view active instruments"
  ON instruments FOR SELECT
  TO authenticated
  USING (is_active = true);

-- super_admin can view all instruments (including inactive)
CREATE POLICY "super_admin can view all instruments"
  ON instruments FOR SELECT
  TO authenticated
  USING (get_user_role() = 'super_admin');

-- super_admin can create instruments
CREATE POLICY "super_admin can create instruments"
  ON instruments FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

-- super_admin can update instruments
CREATE POLICY "super_admin can update instruments"
  ON instruments FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- ============================================================
-- Dimensions policies
-- ============================================================

-- All authenticated users can view dimensions of visible instruments
CREATE POLICY "authenticated can view dimensions"
  ON dimensions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM instruments
      WHERE instruments.id = dimensions.instrument_id
      AND (instruments.is_active = true OR get_user_role() = 'super_admin')
    )
  );

-- super_admin can manage dimensions
CREATE POLICY "super_admin can create dimensions"
  ON dimensions FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "super_admin can update dimensions"
  ON dimensions FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- ============================================================
-- Items policies
-- ============================================================

-- All authenticated users can view items of visible instruments
CREATE POLICY "authenticated can view items"
  ON items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dimensions
      JOIN instruments ON instruments.id = dimensions.instrument_id
      WHERE dimensions.id = items.dimension_id
      AND (instruments.is_active = true OR get_user_role() = 'super_admin')
    )
  );

-- super_admin can manage items
CREATE POLICY "super_admin can create items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "super_admin can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');
