-- Supabase Database Schema for Product Capacity Platform
-- This creates all tables with proper constraints and indexes
-- Uses TEXT for IDs to support both UUID and custom string formats

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    team TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_type TEXT NOT NULL,
    status TEXT NOT NULL,
    max_capacity_percentage INTEGER,
    pmo_contact TEXT,
    is_archived BOOLEAN DEFAULT false,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_manager_id TEXT NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    sprint INTEGER NOT NULL,
    allocation_percentage INTEGER NOT NULL,
    allocation_days DECIMAL(4,2),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- History Table (Audit Trail)
CREATE TABLE IF NOT EXISTS allocation_history (
    id TEXT PRIMARY KEY,
    allocation_id TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
    old_value JSONB,
    new_value JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_allocations_project ON allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_allocations_pm ON allocations(product_manager_id);
CREATE INDEX IF NOT EXISTS idx_allocations_sprint ON allocations(year, month, sprint);
CREATE INDEX IF NOT EXISTS idx_history_allocation ON allocation_history(allocation_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON allocation_history(changed_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for authenticated users)
-- You can make these more restrictive based on your needs
CREATE POLICY "Allow all for authenticated users" ON team_members
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON projects
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON allocations
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON allocation_history
    FOR ALL USING (true);

-- Create a backup table for safety
CREATE TABLE IF NOT EXISTS data_backups (
    id SERIAL PRIMARY KEY,
    backup_date TIMESTAMPTZ DEFAULT NOW(),
    team_members_count INTEGER,
    projects_count INTEGER,
    allocations_count INTEGER,
    history_count INTEGER,
    full_backup JSONB NOT NULL
);

-- Function to create automatic backup
CREATE OR REPLACE FUNCTION create_automatic_backup()
RETURNS void AS $$
BEGIN
    INSERT INTO data_backups (
        team_members_count,
        projects_count,
        allocations_count,
        history_count,
        full_backup
    )
    SELECT
        (SELECT COUNT(*) FROM team_members),
        (SELECT COUNT(*) FROM projects),
        (SELECT COUNT(*) FROM allocations),
        (SELECT COUNT(*) FROM allocation_history),
        jsonb_build_object(
            'team_members', (SELECT jsonb_agg(to_jsonb(team_members.*)) FROM team_members),
            'projects', (SELECT jsonb_agg(to_jsonb(projects.*)) FROM projects),
            'allocations', (SELECT jsonb_agg(to_jsonb(allocations.*)) FROM allocations),
            'history', (SELECT jsonb_agg(to_jsonb(allocation_history.*)) FROM allocation_history)
        );
END;
$$ LANGUAGE plpgsql;

-- Create initial backup
SELECT create_automatic_backup();

COMMENT ON TABLE team_members IS 'Stores all team members and their information';
COMMENT ON TABLE projects IS 'Stores all projects with customer and capacity information';
COMMENT ON TABLE allocations IS 'Stores sprint allocations for team members to projects';
COMMENT ON TABLE allocation_history IS 'Audit trail for all allocation changes';
COMMENT ON TABLE data_backups IS 'Automatic backups of all data for disaster recovery';
