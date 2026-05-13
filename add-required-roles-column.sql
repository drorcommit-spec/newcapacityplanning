-- Add required_roles column to projects table
-- This stores which resource types are required for each project
-- Default: ['PMO', 'Product Manager', 'AI Architect']

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS required_roles text[] DEFAULT ARRAY['PMO', 'Product Manager', 'AI Architect'];

-- Update existing projects that have NULL to use the default
UPDATE projects 
SET required_roles = ARRAY['PMO', 'Product Manager', 'AI Architect'] 
WHERE required_roles IS NULL;
