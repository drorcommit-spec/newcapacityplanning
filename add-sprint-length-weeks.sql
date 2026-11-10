-- Variable Sprint Length feature — schema additions
-- See .kiro/specs/variable-sprint-length

-- 1) Per-project sprint length (1, 2, or 3 weeks). Default 2.
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sprint_length_weeks INTEGER NOT NULL DEFAULT 2;

COMMENT ON COLUMN projects.sprint_length_weeks IS
  'Sprint length in weeks (1, 2, or 3). Default allocation span in the allocation dialog. Does not affect stored weekly allocations.';

-- Guard the allowed range.
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_sprint_length_weeks_chk;
ALTER TABLE projects
ADD CONSTRAINT projects_sprint_length_weeks_chk
  CHECK (sprint_length_weeks IN (1, 2, 3));

-- 2) Weekly allocation identity (ISO week). Allocations become week-based.
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS iso_year INTEGER;
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS iso_week INTEGER;
ALTER TABLE allocations
ADD COLUMN IF NOT EXISTS week_start_date DATE;

COMMENT ON COLUMN allocations.iso_year IS 'ISO week-numbering year for the allocation week';
COMMENT ON COLUMN allocations.iso_week IS 'ISO week number (1..53) for the allocation week';
COMMENT ON COLUMN allocations.week_start_date IS 'Monday of the allocation week (display/derived)';

CREATE INDEX IF NOT EXISTS idx_allocations_iso_week
  ON allocations(iso_year, iso_week);

-- Verification
SELECT
  COUNT(*) AS total_projects,
  COUNT(*) FILTER (WHERE sprint_length_weeks = 2) AS default_length_projects
FROM projects;
