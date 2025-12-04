-- Fix Production Database Schema
-- This script ensures your production schema matches DEV
-- Safe to run multiple times (idempotent)

-- ============================================
-- STEP 1: Fix team_members table
-- ============================================

-- Add manager_id if missing
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
        RAISE NOTICE '✓ Added manager_id column to team_members';
    ELSE
        RAISE NOTICE '✓ manager_id column already exists';
    END IF;
END $$;

-- Migrate team (TEXT) to teams (JSONB array)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'teams' AND data_type = 'jsonb'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' AND column_name = 'team'
        ) THEN
            -- Migrate from old team column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            UPDATE team_members 
            SET teams = CASE 
                WHEN team IS NOT NULL AND team != '' THEN jsonb_build_array(team)
                ELSE '[]'::jsonb
            END;
            ALTER TABLE team_members DROP COLUMN team;
            RAISE NOTICE '✓ Migrated team to teams (JSONB array)';
        ELSE
            -- Just add teams column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE '✓ Added teams column';
        END IF;
        CREATE INDEX IF NOT EXISTS idx_team_members_teams ON team_members USING GIN (teams);
    ELSE
        RAISE NOTICE '✓ teams column already exists';
    END IF;
END $$;

-- ============================================
-- STEP 2: Create/Fix teams table
-- ============================================

-- Drop and recreate teams table with correct schema
DROP TABLE IF EXISTS teams CASCADE;

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_archived ON teams(is_archived);

-- Create updated_at trigger
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON teams;
CREATE POLICY "Allow all for authenticated users" ON teams
    FOR ALL USING (true);

RAISE NOTICE '✓ Teams table created with correct schema';

-- ============================================
-- STEP 3: Verify all tables have correct columns
-- ============================================

-- Show team_members columns
SELECT 'team_members table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;

-- Show teams table columns
SELECT 'teams table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'teams'
ORDER BY ordinal_position;

-- Show resource_types columns
SELECT 'resource_types table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'resource_types'
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Summary
-- ============================================

SELECT '=== SCHEMA FIX COMPLETE ===' as info;
SELECT 
    'team_members' as table_name,
    COUNT(*) FILTER (WHERE column_name = 'manager_id') as has_manager_id,
    COUNT(*) FILTER (WHERE column_name = 'teams') as has_teams_jsonb
FROM information_schema.columns 
WHERE table_name = 'team_members'
UNION ALL
SELECT 
    'teams' as table_name,
    COUNT(*) FILTER (WHERE column_name = 'is_archived') as has_is_archived,
    COUNT(*) FILTER (WHERE column_name = 'updated_at') as has_updated_at
FROM information_schema.columns 
WHERE table_name = 'teams';
