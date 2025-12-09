-- Add sprint_projects table to store project-sprint assignments
CREATE TABLE IF NOT EXISTS sprint_projects (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sprint_role_requirements table to store role requirements per project per sprint
CREATE TABLE IF NOT EXISTS sprint_role_requirements (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for sprint_projects
CREATE OR REPLACE FUNCTION update_sprint_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sprint_projects_updated_at
BEFORE UPDATE ON sprint_projects
FOR EACH ROW
EXECUTE FUNCTION update_sprint_projects_updated_at();

-- Add updated_at trigger for sprint_role_requirements
CREATE OR REPLACE FUNCTION update_sprint_role_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sprint_role_requirements_updated_at
BEFORE UPDATE ON sprint_role_requirements
FOR EACH ROW
EXECUTE FUNCTION update_sprint_role_requirements_updated_at();

-- Insert default empty records
INSERT INTO sprint_projects (id, data) VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sprint_role_requirements (id, data) VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust role name as needed)
GRANT ALL ON sprint_projects TO authenticated;
GRANT ALL ON sprint_role_requirements TO authenticated;
