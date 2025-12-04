# 🚨 IMPORTANT: Run This SQL in Supabase

## Quick Steps

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Click "SQL Editor" in the left sidebar**
4. **Click "New Query"**
5. **Copy and paste the SQL below**
6. **Click "Run" or press Ctrl+Enter**

---

## SQL Migration Script

```sql
-- Migration to update team_members table with missing fields
-- This script is safe to run multiple times (idempotent)

-- Add manager_id field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'manager_id'
    ) THEN
        ALTER TABLE team_members ADD COLUMN manager_id TEXT;
        ALTER TABLE team_members ADD CONSTRAINT fk_manager 
            FOREIGN KEY (manager_id) REFERENCES team_members(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_team_members_manager ON team_members(manager_id);
        RAISE NOTICE 'Added manager_id column';
    ELSE
        RAISE NOTICE 'manager_id column already exists';
    END IF;
END $$;

-- Change team from TEXT to JSONB array for multiple teams
DO $$ 
BEGIN
    -- Check if teams column exists as JSONB
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'teams' AND data_type = 'jsonb'
    ) THEN
        -- If old 'team' column exists, migrate data
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' AND column_name = 'team'
        ) THEN
            -- Add new teams column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            
            -- Migrate existing team data to teams array
            UPDATE team_members 
            SET teams = CASE 
                WHEN team IS NOT NULL AND team != '' THEN jsonb_build_array(team)
                ELSE '[]'::jsonb
            END;
            
            -- Drop old team column
            ALTER TABLE team_members DROP COLUMN team;
            RAISE NOTICE 'Migrated team to teams column';
        ELSE
            -- Just add teams column
            ALTER TABLE team_members ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE 'Added teams column';
        END IF;
    ELSE
        RAISE NOTICE 'teams column already exists';
    END IF;
END $$;

-- Add index for teams
CREATE INDEX IF NOT EXISTS idx_team_members_teams ON team_members USING GIN (teams);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;
```

---

## Expected Output

After running the script, you should see:
- ✅ "Added manager_id column" or "manager_id column already exists"
- ✅ "Added teams column" or "teams column already exists"
- ✅ A table showing all columns in team_members including:
  - `manager_id` (text, nullable)
  - `teams` (jsonb)

---

## What This Does

1. **Adds `manager_id` column**: Allows members to have a manager assigned
2. **Migrates `team` to `teams`**: Changes from single team to multiple teams support
3. **Preserves existing data**: All your current data is safe
4. **Creates indexes**: Improves query performance

---

## After Running This

1. Wait for Vercel to finish deploying (check https://vercel.com/dashboard)
2. Go to your production app
3. Test:
   - Edit a member and change their manager → Should save
   - Refresh the page → Manager should persist
   - Resource types should show in dropdown
   - Teams should work correctly

---

## Troubleshooting

**If you see errors:**
- Make sure you're in the correct Supabase project
- Check that you have admin permissions
- Try running each DO block separately

**If manager still doesn't save:**
- Check browser console for errors (F12)
- Verify the column was added: `SELECT * FROM team_members LIMIT 1;`
- Check that Vercel deployment completed successfully

---

## Need Help?

If you encounter any issues, check:
1. Supabase logs (Logs & Analytics in dashboard)
2. Vercel deployment logs
3. Browser console (F12 → Console tab)
