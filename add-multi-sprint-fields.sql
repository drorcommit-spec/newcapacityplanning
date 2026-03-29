-- Add multi-sprint allocation fields to allocations table
-- These fields allow grouping related allocations across multiple sprints

-- Add allocation_group_id to link related allocations
ALTER TABLE allocations 
ADD COLUMN allocation_group_id UUID;

-- Add flag to indicate if this is the start of a group
ALTER TABLE allocations 
ADD COLUMN is_group_start BOOLEAN DEFAULT false;

-- Add reference to the starting sprint
ALTER TABLE allocations 
ADD COLUMN group_start_sprint TEXT;

-- Add total number of sprints in the group
ALTER TABLE allocations 
ADD COLUMN group_total_sprints INTEGER;

-- Add current position in the group
ALTER TABLE allocations 
ADD COLUMN group_current_index INTEGER;

-- Add index for better performance when querying grouped allocations
CREATE INDEX IF NOT EXISTS idx_allocations_group_id ON allocations(allocation_group_id);

-- Add comments to document the fields
COMMENT ON COLUMN allocations.allocation_group_id IS 'UUID linking related allocations across multiple sprints';
COMMENT ON COLUMN allocations.is_group_start IS 'True if this is the first sprint in a multi-sprint allocation';
COMMENT ON COLUMN allocations.group_start_sprint IS 'Reference to starting sprint in format: year-month-sprint';
COMMENT ON COLUMN allocations.group_total_sprints IS 'Total number of sprints in this allocation group';
COMMENT ON COLUMN allocations.group_current_index IS 'Position in the group (1, 2, 3, etc.)';

-- Verification query
SELECT 
    COUNT(*) as total_allocations,
    COUNT(allocation_group_id) as grouped_allocations,
    COUNT(CASE WHEN is_group_start = true THEN 1 END) as group_starts
FROM allocations;