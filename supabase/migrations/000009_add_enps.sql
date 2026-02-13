-- Add eNPS score column to respondents
ALTER TABLE respondents ADD COLUMN enps_score smallint CHECK (enps_score BETWEEN 0 AND 10);
