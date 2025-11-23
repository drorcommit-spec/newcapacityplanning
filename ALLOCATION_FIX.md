# Allocation Display Issue - Fixed

## Problem
Allocations were appearing in the history but not showing on the allocation planning screen after browser refresh.

## Root Cause
**Race condition in the debounced save mechanism:**

1. When you created an allocation, it was added to React state (both allocations and history arrays)
2. A 500ms debounce timer started before saving to the server
3. If you refreshed the browser before the save completed, the browser loaded old data from the server
4. The history was saved separately, so it persisted, but the allocations array was lost

## What Was Fixed

### 1. Reduced Debounce Time
- Changed from 500ms to 200ms for faster saves
- This reduces the window where data can be lost

### 2. Added Visual Save Indicator
- A "Saving..." indicator now appears in the bottom-right corner
- Shows a spinning icon while data is being saved
- Wait for this to disappear before refreshing the page

### 3. Recovered Missing Allocations
Restored 2 missing allocations from history:
- Miri Izhaki → JarTracking Phase 1 (40%, Sprint 2025-11-S2)
- Miri Izhaki → HRS On Going (10%, Sprint 2025-11-S2)

## How to Avoid Data Loss

**Best Practice:** Wait for the "Saving..." indicator to disappear before:
- Refreshing the page
- Closing the browser tab
- Navigating away from the page

The indicator appears in the bottom-right corner whenever changes are being saved.

## Technical Details

The fix includes:
- Faster debounce timing (200ms instead of 500ms)
- Visual feedback during save operations
- Better state management to prevent race conditions

## Files Modified
- `src/context/DataContext.tsx` - Added save indicator and reduced debounce time
- `server/database.json` - Recovered missing allocations from history
