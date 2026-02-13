-- Add 'large' to size_category enum
ALTER TYPE size_category ADD VALUE 'large';

-- Update the trigger function to classify 201-500 as 'large'
CREATE OR REPLACE FUNCTION classify_size_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.employee_count <= 10 THEN
    NEW.size_category := 'micro';
  ELSIF NEW.employee_count <= 50 THEN
    NEW.size_category := 'small';
  ELSIF NEW.employee_count <= 200 THEN
    NEW.size_category := 'medium';
  ELSE
    NEW.size_category := 'large';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
