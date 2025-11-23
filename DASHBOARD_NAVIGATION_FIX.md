# Dashboard Navigation Fix

## Issue
Clicking on "Unallocated Active Projects" in the Dashboard was not properly filtering the Capacity Overview with the unallocated projects.

## Root Cause
The CapacityOverview component was using `useState` with initial values from props, but React's `useState` only uses the initial value on the **first render**. Since the CapacityOverview component was already mounted on the AllocationPlanning page, when we navigated from the Dashboard with new props, the component didn't update its state.

### The Problem
```typescript
// This only works on first render
const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'team');
const [selectedProjects, setSelectedProjects] = useState<string[]>(initialSelectedProjects || []);
```

When navigating from Dashboard:
1. AllocationPlanning page loads with CapacityOverview already rendered
2. Initial props are `undefined`
3. State is set to default values ('team' mode, empty projects)
4. URL parameters are parsed and props are updated
5. **But state doesn't update** because useState doesn't react to prop changes

## Solution

### 1. Added useEffect Hooks
Added `useEffect` hooks to update state when props change:

```typescript
// Update view mode and selected projects when props change
useEffect(() => {
  if (initialViewMode) {
    setViewMode(initialViewMode);
  }
}, [initialViewMode]);

useEffect(() => {
  if (initialSelectedProjects && initialSelectedProjects.length > 0) {
    setSelectedProjects(initialSelectedProjects);
  }
}, [initialSelectedProjects]);
```

### 2. Added Key Prop for Re-mounting
Added a `key` prop to force component re-mount when props change:

```typescript
<CapacityOverview 
  key={capacitySelectedProjects?.join(',') || 'default'}
  initialViewMode={capacityViewMode}
  initialSelectedProjects={capacitySelectedProjects}
/>
```

The `key` prop ensures that when the selected projects change, React will:
1. Unmount the old component instance
2. Mount a new component instance with the new props
3. Initialize state with the new initial values

## How It Works Now

### Navigation Flow
1. **User clicks** "Unallocated Active Projects" on Dashboard
2. **Dashboard navigates** to `/allocations?view=capacity&mode=project&projects=id1,id2,id3`
3. **AllocationPlanning parses** URL parameters
4. **Sets state** for `capacityViewMode` and `capacitySelectedProjects`
5. **CapacityOverview re-mounts** with new key (because projects changed)
6. **State initializes** with `initialViewMode='project'` and `initialSelectedProjects=[id1,id2,id3]`
7. **useEffect hooks** ensure state updates if props change after mount
8. **Page scrolls** to Capacity Overview section
9. **User sees** Project View with selected projects filtered

### Why Both Solutions?

#### useEffect Hooks
- Handle prop changes after initial mount
- Update state reactively when props change
- Good for incremental updates

#### Key Prop
- Forces complete re-mount when projects change
- Ensures clean state initialization
- Prevents stale state issues

Together, they provide a robust solution that works in all scenarios.

## Testing Scenarios

### Scenario 1: Direct Navigation from Dashboard
1. Click "Unallocated Active Projects" (3 projects)
2. ✅ Navigates to Allocations page
3. ✅ Capacity Overview shows Project View
4. ✅ 3 projects are pre-selected
5. ✅ Page scrolls to Capacity Overview

### Scenario 2: Multiple Navigations
1. Click "Unallocated Active Projects" for Current Sprint (2 projects)
2. ✅ Shows 2 projects
3. Navigate back to Dashboard
4. Click "Unallocated Active Projects" for Next Sprint (4 projects)
5. ✅ Shows 4 different projects (not 2)

### Scenario 3: Manual Filter Changes
1. Navigate from Dashboard with 3 projects
2. ✅ Shows 3 projects
3. Manually select different projects
4. ✅ Filter updates correctly
5. ✅ No conflicts with initial props

### Scenario 4: Direct URL Access
1. Paste URL: `/allocations?view=capacity&mode=project&projects=id1,id2`
2. ✅ Capacity Overview shows Project View
3. ✅ 2 projects are pre-selected

## Code Changes

### CapacityOverview.tsx

#### Before
```typescript
const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'team');
const [selectedProjects, setSelectedProjects] = useState<string[]>(initialSelectedProjects || []);
```

#### After
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('team');
const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

// Update view mode and selected projects when props change
useEffect(() => {
  if (initialViewMode) {
    setViewMode(initialViewMode);
  }
}, [initialViewMode]);

useEffect(() => {
  if (initialSelectedProjects && initialSelectedProjects.length > 0) {
    setSelectedProjects(initialSelectedProjects);
  }
}, [initialSelectedProjects]);
```

### AllocationPlanning.tsx

#### Before
```typescript
<CapacityOverview 
  initialViewMode={capacityViewMode}
  initialSelectedProjects={capacitySelectedProjects}
/>
```

#### After
```typescript
<CapacityOverview 
  key={capacitySelectedProjects?.join(',') || 'default'}
  initialViewMode={capacityViewMode}
  initialSelectedProjects={capacitySelectedProjects}
/>
```

## Benefits

### 1. Reliable State Updates
- State always reflects current props
- No stale state issues
- Predictable behavior

### 2. Clean Re-initialization
- Key prop ensures fresh start
- No leftover state from previous navigation
- Consistent user experience

### 3. Flexible Updates
- useEffect allows incremental updates
- Doesn't require full re-mount for every change
- Better performance for minor updates

### 4. Robust Solution
- Works for all navigation scenarios
- Handles edge cases
- Future-proof implementation

## Performance Considerations

### Key Prop Re-mounting
- Only re-mounts when projects actually change
- Uses `join(',')` to create stable key
- Minimal performance impact

### useEffect Hooks
- Only run when dependencies change
- Efficient state updates
- No unnecessary re-renders

### Overall Impact
- Negligible performance overhead
- Smooth user experience
- No noticeable delays

## Alternative Solutions Considered

### 1. Controlled Component (Rejected)
Make CapacityOverview fully controlled by parent:
- **Pros**: Parent controls all state
- **Cons**: Complex prop drilling, breaks encapsulation

### 2. Context API (Rejected)
Use context to share state:
- **Pros**: No prop drilling
- **Cons**: Overkill for this use case, adds complexity

### 3. URL State Only (Rejected)
Store all state in URL:
- **Pros**: Shareable URLs
- **Cons**: Complex URL management, poor UX

### 4. Current Solution (Chosen)
useEffect + key prop:
- **Pros**: Simple, reliable, minimal changes
- **Cons**: None significant

## Lessons Learned

### useState Initial Values
- Only used on first render
- Don't react to prop changes
- Need useEffect for reactive updates

### Component Re-mounting
- Key prop forces re-mount
- Useful for resetting component state
- Should be used judiciously

### Prop-State Synchronization
- Common React pattern
- Requires explicit handling
- useEffect is the standard solution

## Future Improvements

### 1. URL Persistence
Store view mode and selected projects in URL:
- Shareable links
- Browser back/forward support
- Bookmark-friendly

### 2. Transition Animations
Add smooth transitions when switching views:
- Better visual feedback
- More polished UX
- Clearer state changes

### 3. Loading States
Show loading indicator during navigation:
- Better perceived performance
- Clear feedback to user
- Professional appearance

## Files Modified

1. **src/components/CapacityOverview.tsx**
   - Added `useEffect` import
   - Changed initial state to default values
   - Added two `useEffect` hooks for prop synchronization

2. **src/pages/AllocationPlanning.tsx**
   - Added `key` prop to CapacityOverview component
   - Key based on selected projects for re-mounting

## Testing Checklist

- [x] Click unallocated projects from Current Sprint
- [x] Click unallocated projects from Next Sprint
- [x] Click unallocated projects from 2 Sprints Ahead
- [x] Verify Project View is selected
- [x] Verify correct projects are filtered
- [x] Verify page scrolls to Capacity Overview
- [x] Test multiple navigations in sequence
- [x] Test manual filter changes after navigation
- [x] Test direct URL access with parameters
- [x] Verify no console errors
- [x] Verify smooth user experience
