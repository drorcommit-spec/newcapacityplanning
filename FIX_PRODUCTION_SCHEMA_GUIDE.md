# Fix Production Database Schema

## Problem
Your production database schema is outdated and missing some columns/tables that exist in DEV.

## Missing/Incorrect Schema Elements

### team_members table:
- ❌ Missing `manager_id` column
- ❌ Has old `team` (TEXT) instead of `teams` (JSONB array)

### teams table:
- ❌ Missing `is_archived` column
- ❌ Missing `updated_at` column
- ❌ Possibly has wrong structure

## Solution: Run Scripts in Order

### Step 1: Fix Schema (REQUIRED - Run First!)
**File:** `fix-production-schema.sql`

This script will:
- ✅ Add `manager_id` column to team_members
- ✅ Migrate `team` to `teams` (JSONB array)
- ✅ Drop and recreate teams table with correct schema
- ✅ Add all missing indexes and triggers
- ✅ Show verification of all changes

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy ALL the SQL from `fix-production-schema.sql`
3. Paste and click "Run"
4. Check the output - should show "✓" for each fix

**This is SAFE:**
- Preserves all team_members data
- Migrates old team assignments to new format
- Only recreates empty teams table

---

### Step 2: Sync Teams from DEV
**File:** `sync-teams-from-dev.sql`

After Step 1 is complete, run this to:
- ✅ Add official teams: Admin, Management, Member
- ✅ Clean up unknown team assignments
- ✅ Show final results

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy ALL the SQL from `sync-teams-from-dev.sql`
3. Paste and click "Run"
4. Review the output

---

## What Gets Fixed

### Before:
```
team_members:
  - team: "Admin" (single TEXT value)
  - No manager_id

teams table:
  - Missing or wrong structure
```

### After:
```
team_members:
  - teams: ["Admin", "Management"] (JSONB array)
  - manager_id: "uuid-of-manager"

teams table:
  - Proper structure with is_archived, updated_at
  - Contains: Admin, Management, Member
```

---

## Verification

After running both scripts, verify:

1. **Check team_members table:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'team_members'
ORDER BY ordinal_position;
```

Should show:
- ✅ manager_id (text)
- ✅ teams (jsonb)

2. **Check teams table:**
```sql
SELECT * FROM teams ORDER BY name;
```

Should show:
- ✅ Admin
- ✅ Management
- ✅ Member

3. **Check member assignments:**
```sql
SELECT full_name, teams, manager_id 
FROM team_members 
LIMIT 5;
```

Should show proper JSONB arrays for teams.

---

## Rollback (If Needed)

If something goes wrong, you can restore from Supabase automatic backups:
1. Go to Supabase Dashboard → Database → Backups
2. Select a backup from before running the scripts
3. Restore it

---

## After Running

1. Wait for Vercel to finish deploying (if not already done)
2. Refresh your production app
3. Test:
   - ✅ Edit member → Manager dropdown works
   - ✅ Edit member → Teams checkboxes show Admin, Management, Member
   - ✅ Edit member → Resource types show in dropdown
   - ✅ All changes save and persist

---

## Need Help?

If you see any errors:
1. Copy the full error message
2. Check which step failed
3. Don't run the next step until the error is resolved
