# Allocation Deletion Not Persisting After Refresh

## Problem
When you delete an allocation in Team View (Capacity Planning screen), it disappears immediately but comes back after refreshing the page.

## Root Cause
The deletion works in memory but isn't being saved to the database (Supabase in production, JSON file in local dev).

## Diagnosis Steps

### Step 1: Check Browser Console
1. Open your app (production or local)
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Delete an allocation
5. Look for these messages:
   - 🗑️ "Deleting allocation..."
   - 📊 "Allocations after delete: X (was Y)"
   - 💾 "Saving all data to server..."
   - ✅ "All data saved successfully" OR ❌ Error message

### Step 2: Check Network Tab
1. Stay in Developer Tools
2. Go to Network tab
3. Delete an allocation
4. Look for API calls:
   - Local: `POST http://localhost:3002/api/allocations`
   - Production: Supabase API calls
5. Check if the request:
   - ✅ Succeeds (status 200)
   - ❌ Fails (status 4xx or 5xx)
   - ⏱️ Never happens (no request sent)

## Possible Issues & Solutions

### Issue 1: Refreshing Too Quickly
**Symptom:** Deletion works but refresh brings it back  
**Cause:** The save has a 200ms debounce. If you refresh before 200ms, the save doesn't happen.

**Solution:**
Wait at least 1 second after deleting before refreshing.

**Better Solution:**
Add a visual indicator that save is in progress.

---

### Issue 2: Supabase Save Failing Silently
**Symptom:** Console shows "Saving..." but no success/error message  
**Cause:** Supabase API error not being caught or displayed.

**Solution:**
Check the updated code - it now shows an alert if save fails.

---

### Issue 3: Backend Server Not Running (Local Dev Only)
**Symptom:** No network requests in Network tab  
**Cause:** Backend server at localhost:3002 is down.

**Solution:**
```bash
cd product-capacity-platform/server
node server.js
```

---

### Issue 4: Wrong Environment
**Symptom:** Deleting in production but checking in local dev (or vice versa)  
**Cause:** Testing in the wrong environment.

**Solution:**
- Local dev: http://localhost:5173
- Production: Your Vercel URL

Make sure you're testing in the same environment where you made the deletion.

---

## Temporary Workaround

Until the root cause is fixed, you can:

1. Delete the allocation
2. **Wait 2-3 seconds** (don't refresh immediately)
3. Navigate to another page (e.g., Dashboard)
4. Come back to Capacity Planning
5. Check if deletion persisted

If it persisted after navigation but not after refresh, it's a save timing issue.

---

## Permanent Fix (To Be Implemented)

### Option 1: Immediate Save for Deletions
Instead of debounced save, save immediately when deleting:

```typescript
const deleteAllocation = (id: string, deletedBy: string) => {
  // ... existing code ...
  
  // Immediate save for deletions
  saveAllocations(allocations.filter(a => a.id !== id))
    .then(() => console.log('✅ Deletion saved'))
    .catch(err => alert(`Failed to save deletion: ${err.message}`));
};
```

### Option 2: Show Save Indicator
Add a visual indicator showing when data is being saved:

```tsx
{isSaving && (
  <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
    💾 Saving...
  </div>
)}
```

### Option 3: Optimistic UI with Rollback
Keep the deletion in UI but rollback if save fails.

---

## Testing After Fix

1. Delete an allocation
2. Check console for save confirmation
3. Wait for "✅ All data saved successfully"
4. Refresh the page
5. ✅ Allocation should stay deleted

---

## Current Status

✅ Added comprehensive logging  
✅ Added error alerts for failed saves  
⏳ Waiting for user to test and report console logs  
❌ Root cause not yet identified  

---

## Next Steps

1. Test deletion with console open
2. Report what you see in console
3. Check if error alert appears
4. Share any error messages

This will help identify the exact issue!
