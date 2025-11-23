# Dashboard Navigation Enhancement

## Overview
Enhanced the Dashboard's "Unallocated Active Projects" click functionality to provide deep-linked navigation to the Capacity Overview with pre-filtered projects.

## Feature Description

### What Happens When You Click
When clicking on the "Unallocated Active Projects" count in any timeline sprint:

1. **Navigates to Allocations Page** (`/allocations`)
2. **Passes URL Parameters**:
   - `view=capacity` - Indicates to show capacity overview
   - `mode=project` - Sets capacity overview to project view mode
   - `projects=id1,id2,id3` - Comma-separated list of unallocated project IDs
3. **Automatically Configures Capacity Overview**:
   - Switches to "Project View" mode
   - Pre-selects the unallocated projects in the multi-select filter
   - Shows only those projects in the capacity cards
4. **Scrolls to Capacity Overview**:
   - Automatically scrolls the page to the Capacity Overview section
   - Smooth scroll animation for better UX

## Technical Implementation

### Dashboard Changes

#### URL Construction
```typescript
const handleUnallocatedClick = (projectIds: string[]) => {
  const projectIdsParam = projectIds.join(',');
  navigate(`/allocations?view=capacity&mode=project&projects=${projectIdsParam}`);
};
```

#### Click Handler
```typescript
onClick={() => 
  data.unallocatedProjects.length > 0 && 
  handleUnallocatedClick(data.unallocatedProjects.map(p => p.id))
}
```

### AllocationPlanning Changes

#### URL Parameter Handling
```typescript
useEffect(() => {
  const view = searchParams.get('view');
  const mode = searchParams.get('mode');
  const projectsParam = searchParams.get('projects');
  
  if (view === 'capacity' && mode === 'project' && projectsParam) {
    const projectIds = projectsParam.split(',');
    setCapacityViewMode('project');
    setCapacitySelectedProjects(projectIds);
    setScrollToCapacity(true);
  }
}, [searchParams]);
```

#### Auto-Scroll Implementation
```typescript
useEffect(() => {
  if (scrollToCapacity) {
    setTimeout(() => {
      const capacityElement = document.getElementById('capacity-overview');
      if (capacityElement) {
        capacityElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setScrollToCapacity(false);
    }, 100);
  }
}, [scrollToCapacity]);
```

#### Passing Props to CapacityOverview
```tsx
<div id="capacity-overview">
  <CapacityOverview 
    initialViewMode={capacityViewMode}
    initialSelectedProjects={capacitySelectedProjects}
  />
</div>
```

### CapacityOverview Changes

#### New Props Interface
```typescript
interface CapacityOverviewProps {
  initialViewMode?: ViewMode;
  initialSelectedProjects?: string[];
}
```

#### Using Initial Values
```typescript
const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'team');
const [selectedProjects, setSelectedProjects] = useState<string[]>(initialSelectedProjects || []);
```

## User Experience Flow

### Example Scenario
**Situation**: Dashboard shows 3 unallocated projects for "Next Sprint"

1. **User sees**: Orange card with "3" in the "Unallocated Active Projects" section
2. **User clicks**: On the orange card
3. **Page navigates**: To `/allocations?view=capacity&mode=project&projects=proj1,proj2,proj3`
4. **Page loads**: Allocations page
5. **Capacity Overview**:
   - Automatically switches to "Project View" tab
   - Multi-select filter shows 3 projects selected
   - Only those 3 projects are displayed in the capacity cards
6. **Page scrolls**: Smoothly to the Capacity Overview section
7. **User can**:
   - See capacity for those 3 projects
   - Click "+" to add allocations
   - Edit existing allocations
   - Switch to other projects if needed

## Benefits

### 1. Context Preservation
- User doesn't lose track of which projects need attention
- Pre-filtered view focuses on the problem projects
- No manual searching or filtering required

### 2. Reduced Clicks
- **Before**: Click → Navigate → Switch to Project View → Select projects manually
- **After**: Click → Done (everything configured automatically)
- Saves 3-4 manual steps

### 3. Better Workflow
- Seamless transition from problem identification to solution
- Natural flow from dashboard to action
- Encourages proactive capacity planning

### 4. Time Savings
- Immediate focus on unallocated projects
- No need to remember which projects were unallocated
- Faster allocation creation

## URL Parameter Format

### Structure
```
/allocations?view=capacity&mode=project&projects=id1,id2,id3
```

### Parameters
- **view**: `capacity` - Indicates to show and scroll to capacity overview
- **mode**: `project` - Sets capacity overview to project view mode
- **projects**: Comma-separated project IDs - Projects to pre-select

### Example
```
/allocations?view=capacity&mode=project&projects=9b6c9fa4-b4f3-4023-b087-7d83968e5cc4,9900b811-7241-4fc4-a3ce-6de1d6387403
```

## Edge Cases Handled

### No Projects Selected
- If `projects` parameter is empty or invalid, shows all projects
- Gracefully falls back to default behavior

### Invalid Project IDs
- Invalid IDs are ignored
- Only valid project IDs are selected
- Component doesn't crash

### Multiple Navigations
- Scroll only happens once per navigation
- State is reset after scroll completes
- Prevents infinite scroll loops

### Manual Filter Changes
- User can still manually change filters after arrival
- Initial selection doesn't lock the filter
- Full control remains with the user

## Future Enhancements (Potential)

1. **Highlight Unallocated Projects**: Add visual indicator on project cards
2. **Sprint Context**: Pass sprint information to show relevant sprint in capacity view
3. **Direct Allocation**: Open allocation modal automatically for first project
4. **Breadcrumb Navigation**: Show "From Dashboard" breadcrumb
5. **Back Button**: Quick return to dashboard with same sprint
6. **Notification**: Toast message "Showing 3 unallocated projects"
7. **Analytics**: Track how often this navigation is used

## Testing Checklist

- [ ] Click unallocated projects from Current Sprint
- [ ] Click unallocated projects from Next Sprint
- [ ] Click unallocated projects from 2 Sprints Ahead
- [ ] Verify correct projects are selected
- [ ] Verify view mode is set to "Project"
- [ ] Verify page scrolls to capacity overview
- [ ] Verify smooth scroll animation works
- [ ] Test with 1 project
- [ ] Test with multiple projects
- [ ] Test with 0 projects (should not be clickable)
- [ ] Verify user can change filters after arrival
- [ ] Verify user can switch view modes
- [ ] Test browser back button behavior
- [ ] Test direct URL access with parameters
- [ ] Test invalid project IDs in URL

## Files Modified

1. **src/pages/Dashboard.tsx**
   - Updated `handleUnallocatedClick` to pass project IDs
   - Changed navigation to include URL parameters
   - Updated onClick handler to pass project IDs array

2. **src/pages/AllocationPlanning.tsx**
   - Added state for capacity view mode and selected projects
   - Added URL parameter parsing for capacity view
   - Added auto-scroll functionality
   - Added ID to capacity overview wrapper
   - Passed props to CapacityOverview component

3. **src/components/CapacityOverview.tsx**
   - Added props interface for initial values
   - Updated component to accept optional props
   - Used initial values for view mode and selected projects
   - Made component controllable from parent

## Code Quality

### Type Safety
- All props are properly typed
- URL parameters are validated
- Project IDs are type-checked

### Performance
- Scroll happens only once per navigation
- No unnecessary re-renders
- Efficient state management

### Maintainability
- Clear separation of concerns
- Well-documented code
- Easy to extend with more parameters

### User Experience
- Smooth animations
- No jarring transitions
- Intuitive behavior
- Predictable results
