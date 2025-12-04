-- Migration to update team_members table with missing fields
-- Run this in your Supabase SQL Editor

-- Add manager_id field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE team_members ADD COLUMN manager_id TEXT;
        ALTER TABLE team_members ADD CONSTRAINT fk_manager 
            FOREIGN KEY (manager_id) REFERENCES team_members(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_team_members_manager ON team_members(manager_id);
        RAISE NOTICE 'Added manager_id column';
    ELSE
        RAISE NOTICE 'manager_id column already exists';
    END IF;
END $$;

-- Change team from TEXT to JSONB array for multiple teams
DO $$ 
BEGIN
    -- Check if teams column exists as JSONB
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'teams' AND data_type = 'jsonb'
    ) THEN
        -- If old 'team' column exists, migrate data
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' AND column_name = 'team'
        ) THEN
            -- Add new teams column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            
            -- Migrate existing team data to teams array
            UPDATE team_members 
            SET teams = CASE 
                WHEN team IS NOT NULL AND team != '' THEN jsonb_build_array(team)
                ELSE '[]'::jsonb
            END;
            
            -- Drop old team column
            ALTER TABLE team_members DROP COLUMN team;
            RAISE NOTICE 'Migrated team to teams column';
        ELSE
            -- Just add teams column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE 'Added teams column';
        END IF;
    ELSE
        RAISE NOTICE 'teams column already exists';
    END IF;
END $$;

-- Add index for teams
CREATE INDEX IF NOT EXISTS idx_team_members_teams ON team_members USING GIN (teams);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;
