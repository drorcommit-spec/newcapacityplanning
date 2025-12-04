-- PREVIEW: What will change when syncing teams from DEV to PROD
-- Run this FIRST to see what will be affected
-- This is READ-ONLY and makes NO changes

-- Show current teams in production
SELECT '=== CURRENT TEAMS IN PRODUCTION ===' as info;
SELECT name, is_archived, created_at 
FROM teams 
ORDER BY name;

-- Show the official teams from DEV that will be created
SELECT '=== OFFICIAL TEAMS FROM DEV ===' as info;
SELECT * FROM (
    VALUES 
        ('Admin'),
        ('Management'),
        ('Member')
) AS official_teams(team_name);

-- Show members with teams that will be REMOVED (not in official list)
SELECT '=== MEMBERS WITH UNKNOWN TEAMS (WILL BE CLEANED) ===' as info;
SELECT 
    full_name,
    email,
    teams as current_teams,
    (
        SELECT jsonb_agg(team)
        FROM jsonb_array_elements_text(teams) as team
        WHERE team IN ('Admin', 'Management', 'Member')
    ) as teams_after_cleanup,
    (
        SELECT jsonb_agg(team)
        FROM jsonb_array_elements_text(teams) as team
        WHERE team NOT IN ('Admin', 'Management', 'Member')
    ) as teams_to_be_removed
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN ('Admin', 'Management', 'Member')
  )
ORDER BY full_name;

-- Show members with valid teams (will NOT be changed)
SELECT '=== MEMBERS WITH VALID TEAMS (NO CHANGES) ===' as info;
SELECT 
    full_name,
    email,
    teams
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN ('Admin', 'Management', 'Member')
  )
ORDER BY full_name;

-- Show members with no teams (will NOT be changed)
SELECT '=== MEMBERS WITH NO TEAMS (NO CHANGES) ===' as info;
SELECT 
    full_name,
    email,
    teams
FROM team_members
WHERE teams IS NULL 
   OR jsonb_array_length(teams) = 0
ORDER BY full_name;

-- Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (
        WHERE teams IS NOT NULL 
          AND jsonb_array_length(teams) > 0
          AND EXISTS (
            SELECT 1 
            FROM jsonb_array_elements_text(teams) as team
            WHERE team NOT IN ('Admin', 'Management', 'Member')
          )
    ) as members_to_be_cleaned,
    COUNT(*) FILTER (
        WHERE teams IS NOT NULL 
          AND jsonb_array_length(teams) > 0
          AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements_text(teams) as team
            WHERE team NOT IN ('Admin', 'Management', 'Member')
          )
    ) as members_with_valid_teams,
    COUNT(*) FILTER (
        WHERE teams IS NULL OR jsonb_array_length(teams) = 0
    ) as members_with_no_teams
FROM team_members;
