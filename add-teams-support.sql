-- Add Teams table and update team_members for multi-select
-- Run this in Supabase SQL Editor

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update team_members table to support multiple teams
ALTER TABLE team_members DROP COLUMN IF EXISTS team;
ALTER TABLE team_members ADD COLUMN teams TEXT[] DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_team_members_teams ON team_members USING GIN(teams);

-- Add trigger for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all for authenticated users" ON teams
    FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE teams IS 'Stores team names for multi-select assignment';
