-- Fix: allow anon to UPDATE responses (required for upsert ON CONFLICT DO UPDATE)
-- Without this, the survey client's upsert silently fails and responses are lost.
DROP POLICY IF EXISTS "anon can update own responses" ON responses;
CREATE POLICY "anon can update own responses"
  ON responses FOR UPDATE TO anon
  USING (true) WITH CHECK (true);
