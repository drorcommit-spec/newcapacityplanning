-- ============================================
-- SETUP DEVELOPMENT DATABASE (Puzzle-Dev)
-- ============================================
-- Run this in Supabase SQL Editor for Puzzle-Dev project
-- Run each section separately if you encounter errors
-- ============================================

-- SECTION 1: Create Tables
-- ============================================

-- Drop existing tables if you need to start fresh (CAREFUL!)
-- DROP TABLE IF EXISTS allocation_history CASCADE;
-- DROP TABLE IF EXISTS allocations CASCADE;
-- DROP TABLE IF EXISTS projects CASCADE;
-- DROP TABLE IF EXISTS team_members CASCADE;
-- DROP TABLE IF EXISTS resource_types CASCADE;
-- DROP TABLE IF EXISTS teams CASCADE;

-- Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    manager_id UUID,
    capacity INTEGER DEFAULT 100,
    teams JSONB DEFAULT '[]'::jsonb
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    customer_id UUID,
    customer_name TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_type TEXT,
    status TEXT,
    pmo_contact UUID,
    latest_status TEXT,
    activity_close_date DATE,
    region TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    max_capacity_percentage INTEGER
);

-- Create allocations table
CREATE TABLE allocations (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    product_manager_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    sprint INTEGER NOT NULL,
    allocation_percentage NUMERIC(5,2),
    allocation_days NUMERIC(5,2),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

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

-- Create resource_types table
CREATE TABLE resource_types (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 2: Create Indexes
-- ============================================

CREATE INDEX idx_allocations_sprint ON allocations(year, month, sprint);
CREATE INDEX idx_allocations_pm ON allocations(product_manager_id);
CREATE INDEX idx_allocations_project ON allocations(project_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_projects_status ON projects(status);

-- SECTION 3: Enable RLS and Create Policies
-- ============================================

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all on team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on allocations" ON allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on allocation_history" ON allocation_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on resource_types" ON resource_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DONE! Your development database is ready.
-- ============================================
