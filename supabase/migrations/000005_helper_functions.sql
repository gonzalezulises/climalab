-- Generate URL-friendly slug from text
CREATE OR REPLACE FUNCTION generate_slug(input text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(input, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get department counts for an organization (placeholder for future use)
CREATE OR REPLACE FUNCTION get_org_department_counts(org_id uuid)
RETURNS jsonb AS $$
  SELECT COALESCE(
    jsonb_object_agg(dept, 0),
    '{}'::jsonb
  )
  FROM organizations, unnest(departments) AS dept
  WHERE id = org_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
