-- Update all projects with status 'Pending' or 'New Signed Off' to 'Active'
-- Run this on production database

UPDATE projects 
SET status = 'Active', 
    updated_at = NOW()
WHERE status IN ('Pending', 'New Signed Off');

-- Verify
SELECT id, customer_name, project_name, status 
FROM projects 
WHERE status IN ('Pending', 'New Signed Off');
