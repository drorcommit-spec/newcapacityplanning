-- Create sprint_tasks table for daily task management
CREATE TABLE IF NOT EXISTS sprint_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    project_id UUID NOT NULL,
    sprint_id TEXT NOT NULL, -- format: "year-month-sprint"
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Blocked')),
    estimated_hours INTEGER DEFAULT 8,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint_id ON sprint_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_member_id ON sprint_tasks(member_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_project_id ON sprint_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_dates ON sprint_tasks(start_date, end_date);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE sprint_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON sprint_tasks;
CREATE POLICY "Allow all operations for authenticated users" ON sprint_tasks
    FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sprint_tasks_updated_at ON sprint_tasks;
CREATE TRIGGER update_sprint_tasks_updated_at 
    BEFORE UPDATE ON sprint_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();