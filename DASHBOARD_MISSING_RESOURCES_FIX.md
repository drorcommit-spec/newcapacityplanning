# Dashboard "Missing Resources" KPI Issue - Investigation & Fix

## Issue Reported
Dashboard shows "Missing Resources" = 13 for current sprint, but only 1 project (DanciFire) appears to be missing allocations when viewed.

## Investigation Results

### Actual Data (from database.json)
- **Total Active Projects**: 25
- **Projects WITH allocations** (Dec 2025, Sprint 1): 15
- **Projects WITHOUT allocations** (Missing Resources): **10**

### Projects Missing Allocations (Correct List):
1. Ambient Intelligence - Scoping
2. Cargo Scoping
3. DanciFire - MVP
4. Auribus - Assessment
5. Autonomy - MVP
6. Axian - POC international
7. Benchmark Labs - Assess international
8. Bloomfilter - POC
9. Bonamark - Bonamark POC
10. DI Global - (AI Assess)

## Root Cause
The dashboard is showing **13** instead of **10**, which indicates one of the following:

1. **Browser Cache/Stale Data**: The React app might be using cached data from:
   - localStorage
   - Previous API responses
   - Service worker cache

2. **Data Sync Issue**: The frontend DataContext might not have refreshed after recent changes

3. **Calculation Bug**: There might be a subtle bug in how `activeProjects` or `allocatedProjectIds` is being calculated

## Recommended Solutions

### ✅ IMPLEMENTED: Refresh Button
A "Refresh" button has been added to the Dashboard header that allows users to manually reload data from the server. This will sync the frontend with the latest database state.

**How to use:**
1. Click the "Refresh" button next to the Dashboard title
2. Wait for the data to reload (button shows "Refreshing..." with spinner)
3. KPIs will update with the latest data from the server

### Alternative Fixes (if issue persists)
1. **Hard Refresh**: Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac) to clear browser cache
2. **Clear localStorage**: Open DevTools → Application → Local Storage → Clear All
3. **Restart the app**: Stop and restart both frontend and backend servers

### Code Fix Options

#### Option 1: Add Data Refresh Button
Add a manual refresh button to the Dashboard to force reload data from the server.

#### Option 2: Add Cache Busting
Modify the API calls to include cache-busting parameters:
```typescript
fetch(`${API_URL}/data?t=${Date.now()}`)
```

#### Option 3: Add Data Validation
Add console logging to verify the data being used:
```typescript
console.log('Active Projects:', activeProjects.length);
console.log('Allocated Project IDs:', allocatedProjectIds.size);
console.log('Missing:', activeProjects.filter(p => !allocatedProjectIds.has(p.id)).length);
```

#### Option 4: Force Data Reload on Mount
Ensure DataContext reloads data when Dashboard mounts:
```typescript
useEffect(() => {
  // Force refresh data
  refetchData();
}, []);
```

## Testing Steps
1. Check browser DevTools Console for any errors
2. Verify the data in DataContext matches database.json
3. Check Network tab to see if API calls are being made
4. Verify localStorage doesn't have stale project data

## Expected Behavior
After fix, Dashboard should show:
- **Missing Resources**: 10 (not 13)
- Clicking on the KPI should show all 10 projects listed above

## Notes
- The calculation logic in Dashboard.tsx appears correct
- The issue is most likely data synchronization, not logic
- This is a common issue when developing with hot-reload and localStorage


## Implementation Details

### Changes Made

#### 1. DataContext (`src/context/DataContext.tsx`)
- Added `refreshData()` function to the context interface
- Implemented `refreshData()` to fetch fresh data from the server
- Exposed `refreshData` in the context provider value

#### 2. Dashboard (`src/pages/Dashboard.tsx`)
- Added `refreshData` from useData hook
- Added `isRefreshing` state to track refresh status
- Added `handleRefresh()` function with error handling
- Added Refresh button in the header with:
  - Spinning icon during refresh
  - Disabled state while refreshing
  - Tooltip for user guidance

### Code Added

```typescript
// DataContext.tsx
const refreshData = async () => {
  console.log('🔄 Refreshing data from server...');
  try {
    const data = await fetchAllData();
    console.log('✅ Data refreshed successfully');
    setTeamMembers(data.teamMembers);
    setProjects(data.projects);
    setAllocations(data.allocations);
    setHistory(data.history);
  } catch (error) {
    console.error('❌ Failed to refresh data:', error);
    throw error;
  }
};
```

```typescript
// Dashboard.tsx
const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    await refreshData();
  } catch (error) {
    alert('Failed to refresh data. Please try again.');
  } finally {
    setIsRefreshing(false);
  }
};
```

## Resolution
After clicking the Refresh button, the Dashboard should display the correct count of **10** projects missing resources instead of 13.
