-- Add planning fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_start_month INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_start_year INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_start_sprint INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS required_capacity INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_sprint_count INTEGER;

-- Also add missing fields that may not exist yet
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latest_status TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS activity_close_date TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS region TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('planned_start_month', 'planned_start_year', 'planned_start_sprint', 'required_capacity', 'planned_sprint_count', 'latest_status', 'activity_close_date', 'region')
ORDER BY column_name;
