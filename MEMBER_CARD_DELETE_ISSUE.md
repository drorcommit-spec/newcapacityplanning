# Member Card Deletion Issue - Production

## Problem
When removing Sarah Ben Shalom's card from a sprint in PRODUCTION:
- The card disappears immediately (looks successful)
- After page refresh, the card reappears with all allocations
- This indicates the deletions are not being persisted to the database

## Root Cause Analysis

### Current Flow
1. User clicks trash icon on Sarah's card
2. `handleRemoveMemberFromSprint` is called
3. Function loops through allocations and calls `deleteAllocation(alloc.id, currentUser.fullName)`
4. Each `deleteAllocation` triggers an immediate save to backend
5. Local state is updated (card disappears)
6. On refresh, data is reloaded from database - allocations are still there

### Possible Issues

1. **Backend Save Failure**
   - The DELETE requests might be failing silently
   - Check browser Network tab for failed requests
   - Check backend logs for errors

2. **Race Condition**
   - Multiple rapid `deleteAllocation` calls might be conflicting
   - Some deletions might be overwritten by others

3. **Wrong Parameter**
   - Using `currentUser.fullName` instead of `currentUser.email`
   - Backend might expect email for the deletedBy field

## Debugging Steps

### 1. Check Browser Console
Open browser DevTools (F12) and look for:
- Error messages when deleting
- Failed network requests (red in Network tab)
- Console logs showing "💾 Saving deletion immediately..."

### 2. Check Network Tab
When deleting Sarah's card:
- Look for POST/DELETE requests to `/api/allocations`
- Check if they return 200 OK or error codes
- Verify the request payload contains the correct allocation IDs

### 3. Check Backend Logs
On the production server:
- Check for errors when saving allocations
- Verify the database connection is working
- Check if the allocations table is being updated

## Immediate Fix

The issue is likely in the backend not properly handling the deletion saves. 

### Option 1: Fix the Parameter
Change line 973 in CapacityPlanning.tsx:
```typescript
// FROM:
await deleteAllocation(alloc.id, currentUser.fullName);

// TO:
await deleteAllocation(alloc.id, currentUser.email);
```

### Option 2: Add Error Handling
Wrap the deletion in try-catch to see errors:
```typescript
try {
  await deleteAllocation(alloc.id, currentUser.email);
  totalRemoved++;
} catch (error) {
  console.error('Failed to delete allocation:', alloc.id, error);
  alert(`Failed to delete allocation: ${error.message}`);
}
```

### Option 3: Batch Delete
Instead of deleting one by one, collect all IDs and delete in a single operation.

## Recommended Solution

1. Fix the parameter to use `currentUser.email`
2. Add error handling to catch and display failures
3. Add a loading indicator during bulk deletions
4. Verify backend is properly saving the deletions

## Testing
After applying fix:
1. Delete Sarah's card
2. Check browser console for errors
3. Check Network tab for successful requests
4. Refresh page
5. Verify Sarah's card is gone
