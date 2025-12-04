-- Create teams table and populate with existing team data from team_members
-- Run this in your Supabase SQL Editor

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for team name lookups
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_archived ON teams(is_archived);

-- Add updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_teams_updated_at 
    BEFORE UPDATE ON teams
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'teams' AND policyname = 'Allow all for authenticated users'
    ) THEN
        CREATE POLICY "Allow all for authenticated users" ON teams
            FOR ALL USING (true);
    END IF;
END $$;

-- Extract unique teams from team_members.teams JSONB array and insert into teams table
INSERT INTO teams (id, name, is_archived, created_at)
SELECT 
    gen_random_uuid()::text as id,
    team_name as name,
    false as is_archived,
    NOW() as created_at
FROM (
    SELECT DISTINCT jsonb_array_elements_text(teams) as team_name
    FROM team_members
    WHERE teams IS NOT NULL 
      AND jsonb_array_length(teams) > 0
) unique_teams
WHERE team_name IS NOT NULL 
  AND team_name != ''
ON CONFLICT (name) DO NOTHING;

-- Show the teams that were created
SELECT 
    id,
    name,
    is_archived,
    created_at
FROM teams
ORDER BY name;
