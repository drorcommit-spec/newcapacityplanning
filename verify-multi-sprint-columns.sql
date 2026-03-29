-- Verify that multi-sprint columns exist in the allocations table

-- Check if columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name IN (
    'allocation_group_id',
    'is_group_start',
    'group_start_sprint',
    'group_total_sprints',
    'group_current_index'
)
ORDER BY column_name;

-- Check if any allocations have multi-sprint data
SELECT 
    COUNT(*) as total_allocations,
    COUNT(allocation_group_id) as with_group_id,
    COUNT(CASE WHEN is_group_start = true THEN 1 END) as group_starts,
    COUNT(CASE WHEN group_total_sprints > 1 THEN 1 END) as multi_sprint_allocations
FROM allocations;

-- Show sample multi-sprint allocations if any exist
SELECT 
    id,
    year,
    month,
    sprint,
    allocation_group_id,
    is_group_start,
    group_start_sprint,
    group_total_sprints,
    group_current_index
FROM allocations
WHERE allocation_group_id IS NOT NULL
ORDER BY allocation_group_id, group_current_index
LIMIT 10;
