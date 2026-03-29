-- Check the Coca Cola allocation for Dror to see if multi-sprint fields are populated

-- First, find Dror's ID
SELECT id, full_name, email 
FROM team_members 
WHERE full_name LIKE '%Dror%'
LIMIT 5;

-- Find Coca Cola project ID
SELECT id, project_name, customer_name
FROM projects
WHERE project_name LIKE '%Coca%' OR customer_name LIKE '%Coca%'
LIMIT 5;

-- Check recent allocations for Dror on Coca Cola
-- Replace the IDs below with the actual IDs from the queries above
SELECT 
    a.id,
    a.year,
    a.month,
    a.sprint,
    a.allocation_percentage,
    a.allocation_group_id,
    a.is_group_start,
    a.group_start_sprint,
    a.group_total_sprints,
    a.group_current_index,
    a.created_at,
    tm.full_name as member_name,
    p.project_name,
    p.customer_name
FROM allocations a
JOIN team_members tm ON a.product_manager_id = tm.id
JOIN projects p ON a.project_id = p.id
WHERE tm.full_name LIKE '%Dror%'
  AND (p.project_name LIKE '%Coca%' OR p.customer_name LIKE '%Coca%')
ORDER BY a.created_at DESC
LIMIT 10;

-- Check if ANY allocations have multi-sprint data
SELECT 
    COUNT(*) as total_allocations,
    COUNT(allocation_group_id) as with_group_id,
    COUNT(CASE WHEN is_group_start = true THEN 1 END) as group_starts,
    COUNT(CASE WHEN group_total_sprints > 1 THEN 1 END) as multi_sprint_count
FROM allocations;
