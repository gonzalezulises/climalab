-- Update employee_count constraint to allow up to 500 employees
ALTER TABLE organizations DROP CONSTRAINT organizations_employee_count_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_employee_count_check CHECK (employee_count BETWEEN 1 AND 500);
