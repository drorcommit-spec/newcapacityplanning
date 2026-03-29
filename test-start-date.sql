-- Quick test to verify start_date column exists

-- Step 1: Check if column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name = 'start_date';

-- If you see 1 row with "start_date | date", the column exists ✅
-- If you see 0 rows, run the command below:

-- Step 2: Add the column (only if Step 1 returned 0 rows)
ALTER TABLE allocations 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Step 3: Verify it was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name = 'start_date';

-- Should now show: start_date | date

-- Step 4: Check current allocations
SELECT 
    COUNT(*) as total_allocations,
    COUNT(start_date) as allocations_with_date
FROM allocations;

-- This shows how many allocations exist and how many have dates set
