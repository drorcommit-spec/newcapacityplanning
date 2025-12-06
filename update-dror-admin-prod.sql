-- ============================================
-- UPDATE DROR TO ADMIN TEAM - PRODUCTION DB
-- ============================================
-- Run this on: PostgreSQL Production Database
-- Purpose: Give drors@comm-it.com full admin access
-- Date: 2024-12-06
-- ============================================

-- Step 1: Verify current state
SELECT id, full_name, email, role, teams, is_active
FROM team_members
WHERE email = 'drors@comm-it.com';

-- Step 2: Update to Admin team
UPDATE team_members 
SET teams = '["Admin"]'::jsonb
WHERE email = 'drors@comm-it.com';

-- Step 3: Verify the update was successful
SELECT id, full_name, email, role, teams, is_active
FROM team_members
WHERE email = 'drors@comm-it.com';

-- Expected result:
-- teams should show: ["Admin"]
-- This gives full admin access (can manage Members, Teams, Projects, Allocations, Resource Types)
