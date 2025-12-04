# Fix Teams Not Showing in Production

## Problem
Teams dropdown is empty when editing members in production.

## Root Cause
The `teams` table doesn't exist in Supabase yet.

## Solution

### Option 1: Create Teams Table (Recommended)
This creates a proper teams table and populates it with existing team data.

1. Go to Supabase Dashboard → SQL Editor
2. Open the file `create-teams-table.sql`
3. Copy ALL the SQL code
4. Paste in Supabase SQL Editor
5. Click "Run"

**Expected Result:**
- ✅ Teams table created
- ✅ Existing teams extracted from members and added to table
- ✅ List of teams displayed

### Option 2: Use Automatic Fallback (Already Deployed)
The code now has a fallback that extracts teams from existing members if the teams table doesn't exist.

**This is already live!** Just wait for Vercel to finish deploying (1-2 minutes).

The app will:
1. Try to load from teams table
2. If that fails, extract unique teams from all members' teams field
3. Show those teams in the dropdown

## Test It

After running the SQL OR waiting for deployment:

1. Go to your production app
2. Click "Add Member" or edit existing member
3. Scroll to "Teams" section
4. ✅ You should see checkboxes for all your teams

## Which Option Should I Use?

**Use Option 1 (create teams table)** if:
- You want proper team management
- You plan to add/edit teams in the future
- You want better performance

**Use Option 2 (fallback only)** if:
- You want a quick fix without SQL
- You don't need to manage teams separately
- Teams are only defined by what members have

## Troubleshooting

**Still no teams showing?**
1. Open browser console (F12)
2. Look for messages like "Teams loaded: X"
3. Check if there are any errors
4. Verify members actually have teams assigned

**To manually check teams in Supabase:**
```sql
SELECT DISTINCT jsonb_array_elements_text(teams) as team_name
FROM team_members
WHERE teams IS NOT NULL;
```

This will show all unique teams currently assigned to members.
