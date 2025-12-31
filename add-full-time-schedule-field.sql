-- Add full_time_schedule field to team_members table
-- This field represents the percentage of full-time work (100% = full-time, 50% = half-time, etc.)

-- Add the column with default value of 100
ALTER TABLE team_members 
ADD COLUMN full_time_schedule INTEGER DEFAULT 100 CHECK (full_time_schedule > 0 AND full_time_schedule <= 100);

-- Update existing members to have 100% full-time schedule
UPDATE team_members 
SET full_time_schedule = 100 
WHERE full_time_schedule IS NULL;

-- Add comment to document the field
COMMENT ON COLUMN team_members.full_time_schedule IS 'Percentage of full-time work schedule (100 = full-time, 50 = half-time, etc.)';

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_team_members_full_time_schedule ON team_members(full_time_schedule);

-- Verification query
SELECT 
    full_name,
    role,
    full_time_schedule,
    is_active
FROM team_members 
ORDER BY full_name;