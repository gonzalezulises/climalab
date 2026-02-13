-- Fix: allow anon to read respondent by token (needed for survey page load)
CREATE POLICY "anon can select respondent by token"
  ON respondents FOR SELECT TO anon
  USING (true);

-- Fix: allow anon to read their own responses (needed for auto-save recovery)
CREATE POLICY "anon can select own responses"
  ON responses FOR SELECT TO anon
  USING (true);

-- Fix: allow anon to read campaigns (needed to validate campaign status)
CREATE POLICY "anon can read active campaigns"
  ON campaigns FOR SELECT TO anon
  USING (status = 'active');

-- Fix: allow anon to read instrument structure (dimensions + items for survey)
CREATE POLICY "anon can read dimensions"
  ON dimensions FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon can read items"
  ON items FOR SELECT TO anon
  USING (true);

-- Fix: allow anon to read organization name/departments (for survey welcome screen)
CREATE POLICY "anon can read org basics"
  ON organizations FOR SELECT TO anon
  USING (true);
