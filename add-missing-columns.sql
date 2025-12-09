-- Add missing columns to Supabase Dev database
-- Run this in Supabase SQL Editor

-- Add comment column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add is_planned column to allocations table (if missing)
ALTER TABLE allocations ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT true;

-- Verify projects columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- Verify allocations columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'allocations' 
ORDER BY ordinal_position;

-- Check if the project exists
SELECT id, project_name, customer_name 
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;
