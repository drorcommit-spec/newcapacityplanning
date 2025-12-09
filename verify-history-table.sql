-- Verify and create allocation_history table if missing
-- Safe to run on both DEV and PROD

-- Check if allocation_history table exists and create if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'allocation_history'
    ) THEN
        -- Create allocation_history table
        CREATE TABLE allocation_history (
            id UUID PRIMARY KEY,
            allocation_id UUID,
            changed_by TEXT,
            changed_at TIMESTAMPTZ DEFAULT NOW(),
            change_type TEXT,
            old_value JSONB,
            new_value JSONB
        );

        -- Create index for faster queries
        CREATE INDEX idx_allocation_history_allocation_id ON allocation_history(allocation_id);
        CREATE INDEX idx_allocation_history_changed_at ON allocation_history(changed_at DESC);

        -- Enable RLS
        ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;

        -- Create policy
        CREATE POLICY "Allow all on allocation_history" ON allocation_history 
            FOR ALL USING (true) WITH CHECK (true);

        RAISE NOTICE '✓ Created allocation_history table';
    ELSE
        RAISE NOTICE '✓ allocation_history table already exists';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    'allocation_history table columns:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'allocation_history'
ORDER BY ordinal_position;

-- Show row count
SELECT 
    'allocation_history' as table_name,
    COUNT(*) as row_count
FROM allocation_history;
