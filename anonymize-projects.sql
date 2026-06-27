-- Anonymize all project and customer names with sequential numbering
-- WARNING: This is destructive and irreversible. Back up your data first.

UPDATE projects
SET 
  customer_name = 'Customer ' || seq.rn,
  project_name = 'Project ' || seq.rn,
  updated_at = NOW()
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY customer_name, project_name) AS rn
  FROM projects
) seq
WHERE projects.id = seq.id;

-- Verify
SELECT id, customer_name, project_name FROM projects ORDER BY customer_name, project_name;
