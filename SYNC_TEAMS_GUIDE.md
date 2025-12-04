# Sync Teams from DEV to PROD

## Official Teams from DEV
- **Admin**
- **Management**
- **Member**

## Step-by-Step Process

### Step 1: Preview Changes (SAFE - No Changes Made)
Run this first to see what will be affected:

1. Go to Supabase Dashboard → SQL Editor
2. Open file: `preview-team-cleanup.sql`
3. Copy and paste the SQL
4. Click "Run"

**This will show you:**
- Current teams in production
- Members with unknown teams that will be cleaned
- Members with valid teams (no changes)
- Members with no teams (no changes)
- Summary statistics

### Step 2: Review the Preview
Look at the results from Step 1:
- Check the "MEMBERS WITH UNKNOWN TEAMS" section
- Verify which teams will be removed
- Make sure you're okay with the changes

### Step 3: Apply Changes
If you're happy with the preview, run the actual sync:

1. Go to Supabase Dashboard → SQL Editor
2. Open file: `sync-teams-from-dev.sql`
3. Copy and paste the SQL
4. Click "Run"

**This will:**
- Create the teams table (if needed)
- Add the 3 official teams (Admin, Management, Member)
- Remove any unknown team assignments from members
- Set empty arrays for members with no valid teams
- Show you the final results

## What Happens to Members with Unknown Teams?

**Example:**
- Member has teams: `["Admin", "OldTeam", "Management"]`
- After cleanup: `["Admin", "Management"]`
- "OldTeam" is removed because it's not in the official list

**If all teams are unknown:**
- Member has teams: `["OldTeam1", "OldTeam2"]`
- After cleanup: `[]` (empty array = no teams)

## Safety Notes

✅ **Safe Operations:**
- Preview script is 100% read-only
- Sync script only affects the `teams` field
- No members are deleted
- No other data is changed

⚠️ **What Gets Changed:**
- Teams table is populated with official teams
- Unknown teams are removed from members
- Members keep all valid team assignments

## Rollback

If you need to undo the changes, you can manually reassign teams through the UI or run:

```sql
-- Example: Add a team back to a specific member
UPDATE team_members
SET teams = teams || '["TeamName"]'::jsonb
WHERE email = 'member@example.com';
```

## After Running

1. Refresh your production app
2. Go to Members page
3. Edit a member
4. Teams dropdown should show: Admin, Management, Member
5. Existing valid team assignments should be preserved
