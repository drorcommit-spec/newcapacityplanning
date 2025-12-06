-- Update Dror Shem-Tov to have Admin team
-- This gives full admin access to the system

UPDATE team_members 
SET teams = '["Admin"]'
WHERE email = 'drors@comm-it.com';

-- Verify the update
SELECT id, full_name, email, role, teams, is_active
FROM team_members
WHERE email = 'drors@comm-it.com';
