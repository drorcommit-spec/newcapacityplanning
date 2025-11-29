-- Add Resource Types table to existing Supabase database
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS resource_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_types_name ON resource_types(name);

CREATE TRIGGER update_resource_types_updated_at BEFORE UPDATE ON resource_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON resource_types
    FOR ALL USING (true);

COMMENT ON TABLE resource_types IS 'Stores resource/role types for team members';
