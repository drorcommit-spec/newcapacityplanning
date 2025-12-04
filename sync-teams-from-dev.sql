-- Sync Teams from DEV to PROD
-- This script:
-- 1. Creates the official teams from DEV environment
-- 2. Removes any unknown team assignments from members
-- Run this in your Supabase SQL Editor

-- Step 1: Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Clear existing teams (optional - remove this if you want to keep existing teams)
TRUNCATE TABLE teams;

-- Step 3: Insert the official teams from DEV
INSERT INTO teams (id, name, is_archived, created_at)
VALUES 
    (gen_random_uuid()::text, 'Admin', false, NOW()),
    (gen_random_uuid()::text, 'Management', false, NOW()),
    (gen_random_uuid()::text, 'Member', false, NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 4: Show the official teams
SELECT 'Official Teams:' as info;
SELECT id, name, is_archived FROM teams ORDER BY name;

-- Step 5: Show members with unknown teams (before cleanup)
SELECT 'Members with unknown teams (before cleanup):' as info;
SELECT 
    id,
    full_name,
    teams,
    jsonb_array_elements_text(teams) as team_name
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN (SELECT name FROM teams WHERE is_archived = false)
  );

-- Step 6: Clean up unknown teams from members
-- This removes any team that's not in the official teams list
UPDATE team_members
SET teams = (
    SELECT jsonb_agg(team)
    FROM jsonb_array_elements_text(teams) as team
    WHERE team IN (SELECT name FROM teams WHERE is_archived = false)
)
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN (SELECT name FROM teams WHERE is_archived = false)
  );

-- Step 7: Set empty arrays for members with no valid teams
UPDATE team_members
SET teams = '[]'::jsonb
WHERE teams IS NULL OR teams = 'null'::jsonb;

-- Step 8: Show final results
SELECT 'Cleanup complete! Final team assignments:' as info;
SELECT 
    full_name,
    teams,
    CASE 
        WHEN teams IS NULL OR jsonb_array_length(teams) = 0 THEN 'No teams'
        ELSE jsonb_array_length(teams)::text || ' team(s)'
    END as team_count
FROM team_members
ORDER BY full_name;

-- Step 9: Summary statistics
SELECT 'Summary:' as info;
SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE teams IS NOT NULL AND jsonb_array_length(teams) > 0) as members_with_teams,
    COUNT(*) FILTER (WHERE teams IS NULL OR jsonb_array_length(teams) = 0) as members_without_teams
FROM team_members;
