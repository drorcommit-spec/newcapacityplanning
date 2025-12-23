-- Fix RLS policy for sprint_tasks table
-- Drop the existing policy and create a more permissive one

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON sprint_tasks;

-- Create a simple policy that allows all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON sprint_tasks
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Alternative: If you want to disable RLS temporarily for testing
-- ALTER TABLE sprint_tasks DISABLE ROW LEVEL SECURITY;