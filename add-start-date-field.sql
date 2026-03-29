-- Add start_date field to allocations table
-- This allows tracking when an allocation actually starts

ALTER TABLE allocations 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add comment to document the field
COMMENT ON COLUMN allocations.start_date IS 'The date when this allocation starts';

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name = 'start_date';

-- Check existing allocations
SELECT 
    COUNT(*) as total_allocations,
    COUNT(start_date) as with_start_date
FROM allocations;
