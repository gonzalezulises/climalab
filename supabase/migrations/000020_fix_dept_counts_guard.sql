-- Fix: Add org ownership guard to get_org_department_counts
-- Closes Medium-risk finding from RLS audit: any authenticated user could
-- query department counts for another organization by calling the function directly.
-- Also fixes unnest(jsonb) → jsonb_array_elements since departments is now JSONB
-- (changed in migration 000012).

CREATE OR REPLACE FUNCTION get_org_department_counts(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: org_id must match the authenticated user's organization
  IF org_id IS DISTINCT FROM get_user_org_id() THEN
    RAISE EXCEPTION 'access_denied'
      USING HINT = 'Cannot query department counts for another organization';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_object_agg(elem->>'name', 0),
      '{}'::jsonb
    )
    FROM organizations, jsonb_array_elements(departments) AS elem
    WHERE id = org_id
  );
END;
$$;
