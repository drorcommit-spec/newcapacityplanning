# Debug Multi-Sprint Badges Not Showing

## Issue
The 🎬 Start badge and progress indicators are not displaying for multi-sprint allocations.

## Possible Causes

### 1. Database Columns Not Added
The multi-sprint columns might not exist in your database yet.

**Solution:** Run the migration script in Supabase SQL Editor:
```sql
-- Copy and paste the contents of: add-multi-sprint-fields.sql
```

**Verify:** Run this query to check if columns exist:
```sql
-- Copy and paste the contents of: verify-multi-sprint-columns.sql
```

Expected output should show 5 columns:
- allocation_group_id
- is_group_start
- group_start_sprint
- group_total_sprints
- group_current_index

### 2. No Multi-Sprint Allocations Created Yet
You might not have created any multi-sprint allocations yet.

**Solution:** Create a test multi-sprint allocation:
1. Go to Capacity Planning page
2. Click "Add Allocation" button
3. Select a member and project
4. Set "Number of Sprints" to 3 (or more)
5. Click "Add Allocation"
6. Navigate to the first sprint where the allocation starts
7. You should see the 🎬 badge

### 3. Check Browser Console
I've added debug logging to help identify the issue.

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Refresh the page
4. Look for messages like: "Multi-sprint allocation found:"
5. Check if the data shows:
   - `isMultiSprint: true`
   - `isGroupStart: true`
   - `willShowBadge: true`

**If you see NO console messages:**
- The allocations don't have multi-sprint data
- Run the migration script first
- Create a new multi-sprint allocation

**If you see messages but `willShowBadge: false`:**
- Check if `isGroupStart` is true (should be true for first sprint)
- Check if `groupTotalSprints` > 1

**If you see messages with `willShowBadge: true` but no badge:**
- This would be a rendering issue (unlikely)
- Check browser console for React errors

## Step-by-Step Debugging

### Step 1: Verify Database Schema
```sql
-- Run in Supabase SQL Editor
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'allocations'
AND column_name LIKE '%group%'
ORDER BY column_name;
```

Expected: 5 rows showing the multi-sprint columns

### Step 2: Check Existing Data
```sql
-- Run in Supabase SQL Editor
SELECT 
    id,
    year,
    month,
    sprint,
    allocation_group_id,
    is_group_start,
    group_total_sprints,
    group_current_index
FROM allocations
WHERE allocation_group_id IS NOT NULL
LIMIT 5;
```

If this returns 0 rows, you need to create multi-sprint allocations.

### Step 3: Create Test Allocation
1. Refresh browser at http://localhost:5174/
2. Click "Add Allocation"
3. Fill in:
   - Member: Any member
   - Project: Any project
   - Percentage: 50%
   - Number of Sprints: 3
4. Click "Add Allocation"
5. Check console for debug messages
6. Look for 🎬 badge on the first sprint

### Step 4: Verify in Database
After creating the allocation, run:
```sql
SELECT 
    id,
    year,
    month,
    sprint,
    allocation_group_id,
    is_group_start,
    group_start_sprint,
    group_total_sprints,
    group_current_index
FROM allocations
WHERE allocation_group_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

You should see 3 rows with:
- Same `allocation_group_id`
- First row: `is_group_start = true`, `group_current_index = 1`
- Second row: `is_group_start = false`, `group_current_index = 2`
- Third row: `is_group_start = false`, `group_current_index = 3`

## Expected Behavior

### First Sprint (Start)
```
🎬 John Doe (Product Manager)  50%  [💬] [✏️] [🗑️]
Sprint 1 of 3 • Started Jan 2025 S1
```

### Second Sprint (Continuation)
```
John Doe (Product Manager)  50%  [💬] [✏️] [🗑️]
Sprint 2 of 3 • Started Jan 2025 S1
```

### Third Sprint (Final)
```
John Doe (Product Manager)  50%  [💬] [✏️] [🗑️]
Sprint 3 of 3 • Started Jan 2025 S1
```

## Quick Fix Checklist

- [ ] Run `add-multi-sprint-fields.sql` in Supabase
- [ ] Verify columns exist with `verify-multi-sprint-columns.sql`
- [ ] Refresh browser
- [ ] Create a new 3-sprint allocation
- [ ] Check browser console for debug messages
- [ ] Look for 🎬 badge on first sprint
- [ ] Verify progress indicators on all 3 sprints

## If Still Not Working

Share the output of:
1. The verification SQL query results
2. Browser console messages (screenshot or copy/paste)
3. Any error messages in the console

This will help identify exactly where the issue is!
