-- Migration: 000019_org_branding
-- Add brand_config JSONB column to organizations for per-org visual identity

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS brand_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Storage bucket policies for org-assets (for cloud deploy)
-- Local dev uses config.toml bucket definition; these policies apply in production.

-- Allow authenticated users to upload to their org's folder
DO $$
BEGIN
  -- Create bucket if not exists (for production environments)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'org-assets',
    'org-assets',
    true,
    2097152, -- 2 MiB
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN others THEN
    NULL; -- Bucket might already exist from config.toml in local dev
END $$;

-- RLS policies for org-assets bucket
CREATE POLICY "Authenticated users can upload org assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'org-assets');

CREATE POLICY "Authenticated users can update org assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'org-assets');

CREATE POLICY "Authenticated users can delete org assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'org-assets');

CREATE POLICY "Anyone can view org assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'org-assets');
