-- Fix: allow authenticated users to insert/update responses and open_responses
-- When an admin tests the survey while logged in, the browser client uses
-- their authenticated session instead of anon, causing RLS violations.

CREATE POLICY "authenticated can insert responses"
  ON responses FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update responses"
  ON responses FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated can insert open_responses"
  ON open_responses FOR INSERT TO authenticated
  WITH CHECK (true);
