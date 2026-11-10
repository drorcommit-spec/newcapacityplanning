-- Adds a first-class company_group column to team_members so a member's company group
-- (separate P&L) is persisted independently of the teams array.
--
-- Safe/idempotent: only adds the column if missing. Does not drop or modify teams.
-- Run in the Supabase SQL editor (or psql).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'team_members' AND column_name = 'company_group'
    ) THEN
        ALTER TABLE team_members ADD COLUMN company_group TEXT;
        RAISE NOTICE 'Added company_group column to team_members';
    ELSE
        RAISE NOTICE 'company_group column already exists';
    END IF;
END $$;

-- One-time backfill: for members where company_group is not set yet, copy a known
-- company-group value out of the teams array if one is present there (handles data that
-- was previously seeded with the group stored in teams). Leaves others NULL.
UPDATE team_members
SET company_group = sub.grp
FROM (
    SELECT tm.id,
           (
               SELECT elem
               FROM jsonb_array_elements_text(tm.teams) AS elem
               WHERE elem IN ('Administration','Cloud','Quickode','Security&Cyber','Software','Valinor')
               LIMIT 1
           ) AS grp
    FROM team_members tm
    WHERE tm.company_group IS NULL
      AND jsonb_typeof(tm.teams) = 'array'
) sub
WHERE team_members.id = sub.id
  AND sub.grp IS NOT NULL;

-- Verification: distribution of company_group values.
SELECT COALESCE(company_group, '(none)') AS company_group, COUNT(*) AS members
FROM team_members
GROUP BY company_group
ORDER BY company_group;
