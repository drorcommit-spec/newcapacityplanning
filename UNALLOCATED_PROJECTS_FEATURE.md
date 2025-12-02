# Projects Without Sprint Allocation Feature

## Overview
Added a new tile to the Dashboard's Overall Summary section that displays the number of active projects not allocated to any current or future sprint. Clicking the tile opens a floating panel where users can quickly allocate these projects to sprints.

## Features

### New Summary Tile
- **Location**: Dashboard > Overall Summary (5th tile)
- **Display**: Shows count of active projects without sprint allocation
- **Visual**: Orange theme when projects exist, gray when all allocated
- **Icon**: ⚠️ warning icon
- **Interactive**: Click to open allocation panel

### Floating Allocation Panel
- **Trigger**: Click on "Projects Without Sprint" tile
- **Layout**: Full-screen overlay with centered modal
- **Content**: Lists all unallocated projects with key details
- **Actions**: Quick allocation buttons for 3 sprints

### Project Information Displayed
For each unallocated project:
- Customer Name (bold)
- Project Name (semibold)
- Project Type
- Status
- PMO Contact (if assigned)

### Sprint Allocation Options
Three quick-action buttons per project:
1. **Current Sprint** (Blue) - Allocate to current sprint
2. **Next Sprint** (Green) - Allocate to next sprint  
3. **2 Sprints Ahead** (Purple) - Allocate to sprint after next

Each button shows:
- Sprint label
- Month, Year, and Sprint number

## Implementation Details

### Calculation Logic
```typescript
// Find all projects in any sprint (current or future)
const projectsInAnySprint = new Set<string>();
sprints.forEach(sprint => {
  // Check allocations
  const sprintAllocs = allocations.filter(...);
  sprintAllocs.forEach(a => projectsInAnySprint.add(a.projectId));
  
  // Check sprintProjects tracking
  const sprintProjectIds = sprintProjects[sprintKey] || [];
  sprintProjectIds.forEach(id => projectsInAnySprint.add(id));
});

// Filter active projects not in any sprint
const projectsWithoutSprint = activeProjects.filter(
  p => !projectsInAnySprint.has(p.id)
);
```

### State Management
- `showUnallocatedProjectsPanel`: Controls panel visibility
- `overallSummary.projectsWithoutSprint`: Count of unallocated projects
- `overallSummary.unallocatedProjects`: Array of project objects

### User Flow
1. User views Dashboard
2. Sees "Projects Without Sprint" tile with count
3. Clicks tile to open panel
4. Reviews list of unallocated projects
5. Clicks sprint button for desired project
6. Navigates to Capacity Planning with sprint pre-selected
7. Can add members and complete allocation

## UI/UX Features

### Visual Indicators
- **Orange theme**: Indicates attention needed
- **Count badge**: Shows number prominently
- **Hover effects**: Interactive feedback
- **Smooth transitions**: Professional feel

### Panel Design
- **Full-screen overlay**: Focuses attention
- **Scrollable content**: Handles many projects
- **Responsive layout**: Works on all screen sizes
- **Clear actions**: Obvious next steps

### Empty State
When all projects are allocated:
- ✅ Success icon
- "All projects are allocated!" message
- Positive reinforcement

## Benefits

1. **Visibility**: Immediately see projects needing attention
2. **Quick Action**: Allocate projects without navigating multiple screens
3. **Planning**: Helps ensure no projects are forgotten
4. **Efficiency**: Batch allocation workflow
5. **Oversight**: Management can track unallocated work

## Technical Notes

- Grid updated from 4 to 5 columns to accommodate new tile
- Panel uses fixed positioning with z-index 50
- Integrates with existing sprint calculation logic
- Navigates to Capacity Planning for actual allocation
- Respects existing sprintProjects tracking

## Files Modified
- `product-capacity-platform/src/pages/Dashboard.tsx`
  - Added `showUnallocatedProjectsPanel` state
  - Updated `overallSummary` calculation to include unallocated projects
  - Changed grid from 4 to 5 columns
  - Added new summary tile
  - Added floating panel component

## Future Enhancements
- Direct allocation from panel (without navigation)
- Bulk allocation (select multiple projects)
- Filtering/sorting in panel
- Export unallocated projects list
- Email notifications for unallocated projects
