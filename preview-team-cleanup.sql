-- PREVIEW: What will change when syncing teams from DEV to PROD
-- Run this FIRST to see what will be affected
-- This is READ-ONLY and makes NO changes

-- Check if teams table exists
SELECT '=== TEAMS TABLE STATUS ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') 
        THEN 'Teams table EXISTS'
        ELSE 'Teams table DOES NOT EXIST (will be created)'
    END as status;

-- Show the official teams from DEV that will be created
SELECT '=== OFFICIAL TEAMS FROM DEV ===' as info;
SELECT * FROM (
    VALUES 
        ('Admin'),
        ('Management'),
        ('Member')
) AS official_teams(team_name);

-- Show all unique teams currently assigned to members
SELECT '=== CURRENT TEAMS ASSIGNED TO MEMBERS ===' as info;
SELECT DISTINCT 
    jsonb_array_elements_text(teams) as team_name,
    COUNT(*) as member_count
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
GROUP BY team_name
ORDER BY team_name;

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
    COALESCE(teams::text, 'null') as teams
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

-- Show what will happen
SELECT '=== ACTIONS THAT WILL BE TAKEN ===' as info;
SELECT 
    '1. Create teams table (if not exists)' as action
UNION ALL
SELECT '2. Add 3 official teams: Admin, Management, Member'
UNION ALL
SELECT '3. Remove unknown teams from ' || COUNT(*)::text || ' member(s)'
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN ('Admin', 'Management', 'Member')
  )
UNION ALL
SELECT '4. Keep valid team assignments for ' || COUNT(*)::text || ' member(s)'
FROM team_members
WHERE teams IS NOT NULL 
  AND jsonb_array_length(teams) > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements_text(teams) as team
    WHERE team NOT IN ('Admin', 'Management', 'Member')
  );
