# Start Date Feature - Where to See and Edit It

## Current Status
The start date feature IS implemented in the code! You should see it next to each allocation.

## Where to See Start Date

### In Projects View (Your Screenshot)
Under each member name, you should see:
```
Dror Shem-Tov (Product Director)  25%  💬  📅 Apr 2  [✏️] [🗑️]
```

The 📅 icon with the date appears after the percentage and comment icon.

### If You See "📅 Set date"
This means the allocation doesn't have a start date yet. Click it to set one!

### If You Don't See Anything
The database column might not exist. Follow the setup steps below.

## Setup Required (One-Time)

### Step 1: Add Database Column
Run this SQL in your Supabase SQL Editor:

```sql
-- Add start_date column to allocations table
ALTER TABLE allocations 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Verify it was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name = 'start_date';
```

### Step 2: Refresh Your Browser
After running the SQL, refresh your browser at http://localhost:5175/

### Step 3: Look for the Date Icon
You should now see either:
- **📅 Apr 2** (if allocation has a date)
- **📅 Set date** (if no date set yet)

## How to Use

### Set Start Date on New Allocation
1. Click the "+" button to add allocation
2. Fill in member, project, percentage
3. **Set Start Date** field - pick a date
4. Click "Add Allocation"
5. The date will appear as 📅 next to the allocation

### Edit Start Date on Existing Allocation
1. Find the allocation (e.g., "Super-Pharm - SPARK 25%")
2. Look for the 📅 icon (should be after the percentage)
3. **Click on the date** or "Set date" button
4. Date picker appears
5. Select new date
6. Press Enter or click away to save

### Remove Start Date
1. Click on the date to edit
2. Clear the date field
3. Press Enter
4. Date is removed, shows "📅 Set date" again

## Visual Location

```
┌─────────────────────────────────────────────────────┐
│ Dror Shem-Tov                                    ↑  │
│ Product Director                                    │
│ ⚠️ Total: 25% / 100%                                │
│                                                     │
│ [+] [📋] [🗑️]                                       │
│ ─────────────────────────────────────────────────  │
│ Super-Pharm - SPARK  25%  💬  📅 Apr 2  [✏️] [🗑️]  │
│                              ↑                      │
│                         HERE! Click to edit        │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### I Don't See the 📅 Icon At All

**Cause:** Database column doesn't exist

**Solution:**
1. Go to Supabase (https://supabase.com)
2. Open your project
3. Go to SQL Editor
4. Run the SQL from Step 1 above
5. Refresh browser

### I See "📅 Set date" But Can't Click It

**Cause:** You might not have write permissions

**Solution:** Check that you're logged in as Admin or have write permissions

### Date Picker Doesn't Appear When I Click

**Cause:** Browser issue or JavaScript error

**Solution:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Try refreshing the page
4. Try a different browser

### Date Doesn't Save When I Select It

**Cause:** Database connection issue

**Solution:**
1. Check browser Console for errors
2. Verify Supabase connection
3. Check that start_date column exists in database

## Testing the Feature

### Test 1: Set Date on New Allocation
1. Create new allocation with start date
2. Verify 📅 icon appears with the date
3. Hover over it - should show full date in tooltip

### Test 2: Edit Existing Date
1. Click on existing date
2. Change to different date
3. Press Enter
4. Verify date updates immediately

### Test 3: Remove Date
1. Click on date
2. Clear the field
3. Press Enter
4. Verify shows "📅 Set date"

### Test 4: Multi-Sprint with Date
1. Create 3-sprint allocation with start date
2. Verify all 3 sprints show the same date
3. Edit date on one sprint
4. Verify it updates for that sprint only

## Expected Behavior

### With Start Date Set
```
Super-Pharm - SPARK  25%  💬  📅 Apr 2
```
- Green text
- Shows month abbreviation + day
- Clickable to edit
- Tooltip shows full date

### Without Start Date
```
Super-Pharm - SPARK  25%  📅 Set date
```
- Green text
- Shows "Set date" text
- Clickable to set date
- Tooltip says "Click to set start date"

## Database Check

To verify start dates are being saved, run this in Supabase:

```sql
-- Check if any allocations have start dates
SELECT 
    a.id,
    tm.full_name as member_name,
    p.project_name,
    a.allocation_percentage,
    a.start_date,
    a.year,
    a.month,
    a.sprint
FROM allocations a
JOIN team_members tm ON a.product_manager_id = tm.id
JOIN projects p ON a.project_id = p.id
WHERE a.start_date IS NOT NULL
ORDER BY a.start_date DESC
LIMIT 10;
```

If this returns 0 rows, no allocations have start dates yet.

## Summary

The start date feature is fully implemented! You should see:
- 📅 icon next to every allocation
- Click to edit inline
- Date picker for easy selection
- Saves immediately to database

If you don't see it, run the SQL migration first!
