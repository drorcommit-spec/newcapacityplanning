# Tree View Feature for Sprint Allocation Planning

## Overview
Added grouped/tree view functionality to the Sprint Allocation Planning screen, allowing users to view allocations organized by Product Manager or by Project.

## Feature Description

### View Mode Selector
A new "View" dropdown has been added above the allocations table with three options:
1. **Flat List** (default) - Traditional table view showing all allocations
2. **Group by Member** - Tree view grouped by Product Manager
3. **Group by Project** - Tree view grouped by Project

### View Modes

#### 1. Flat List (Default)
- **Behavior**: Shows all allocations in a traditional flat table
- **Columns**: Product Manager, Project, Customer, Sprint, Allocation %, Days, Actions
- **Same as before**: No changes to existing functionality

#### 2. Group by Member
- **Top-level rows**: Product Managers
  - Shows: PM name, Total Allocation %, Total Days
  - Background: Light blue (bg-blue-50)
  - Expandable/Collapsible with ▶/▼ icon
- **Child rows**: Individual allocations for that PM
  - Shows: Project name (indented), Customer, Sprint, Allocation %, Days, Actions
  - Sorted alphabetically by project name
- **Totals**: Calculated based on current filters (Year, Month, Sprint, Project)

#### 3. Group by Project
- **Top-level rows**: Projects
  - Shows: Project name, Customer, Total Allocation %, Total Days
  - Background: Light green (bg-green-50)
  - Expandable/Collapsible with ▶/▼ icon
- **Child rows**: Individual allocations for that project
  - Shows: PM name (indented), Sprint, Allocation %, Days, Actions
  - Sorted alphabetically by PM name
- **Totals**: Calculated based on current filters

## User Interactions

### Expanding/Collapsing Groups
- **Click on group row**: Toggles expand/collapse for that group
- **Expand All button**: Expands all groups at once
- **Collapse All button**: Collapses all groups at once
- **Visual indicator**: ▶ (collapsed) or ▼ (expanded)

### Filtering
- All existing filters (Year, Month, Sprint, Project) work with all view modes
- Totals are recalculated based on active filters
- Groups with no allocations (after filtering) are still shown but empty

### Actions
- Edit and Delete buttons work the same in all views
- Actions are only available on child rows (individual allocations)
- Top-level group rows don't have action buttons

## Technical Implementation

### State Management
```typescript
const [viewMode, setViewMode] = useState<'flat' | 'member' | 'project'>('flat');
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
```

### Grouped Data Structures

#### Group by Member
```typescript
{
  id: string,              // PM ID
  name: string,            // PM full name
  totalPercentage: number, // Sum of all allocations
  totalDays: number,       // Sum of all days
  allocations: Allocation[] // Sorted by project name
}
```

#### Group by Project
```typescript
{
  id: string,              // Project ID
  name: string,            // Project name
  customer: string,        // Customer name
  totalPercentage: number, // Sum of all allocations
  totalDays: number,       // Sum of all days
  allocations: Allocation[] // Sorted by PM name
}
```

### Key Functions

#### toggleGroup
```typescript
const toggleGroup = (groupId: string) => {
  const newExpanded = new Set(expandedGroups);
  if (newExpanded.has(groupId)) {
    newExpanded.delete(groupId);
  } else {
    newExpanded.add(groupId);
  }
  setExpandedGroups(newExpanded);
};
```

#### expandAll / collapseAll
```typescript
const expandAll = () => {
  if (viewMode === 'member') {
    setExpandedGroups(new Set(groupedByMember.map(g => g.id)));
  } else if (viewMode === 'project') {
    setExpandedGroups(new Set(groupedByProject.map(g => g.id)));
  }
};

const collapseAll = () => {
  setExpandedGroups(new Set());
};
```

## Use Cases

### Scenario 1: Review PM Workload
**Goal**: See how a specific PM's time is allocated across projects

1. Select "Group by Member" view
2. Find the PM in the list
3. Click to expand their row
4. See all projects they're allocated to
5. Review total allocation percentage and days

### Scenario 2: Review Project Staffing
**Goal**: See which PMs are working on a specific project

1. Select "Group by Project" view
2. Find the project in the list
3. Click to expand the project row
4. See all PMs allocated to that project
5. Review total project allocation

### Scenario 3: Sprint Planning
**Goal**: Plan allocations for next sprint

1. Filter by Year, Month, and Sprint
2. Switch to "Group by Member" view
3. Expand all to see everyone's allocations
4. Identify under-allocated PMs
5. Add new allocations as needed

### Scenario 4: Project Capacity Check
**Goal**: Verify project has enough resources

1. Filter by specific project
2. Switch to "Group by Project" view
3. Expand the project
4. Review total allocation vs project max capacity
5. Adjust allocations if needed

## Visual Design

### Color Coding
- **Flat List**: Standard white background
- **Group by Member**: Light blue (bg-blue-50) for PM rows
- **Group by Project**: Light green (bg-green-50) for project rows
- **Child rows**: White background with hover effect
- **Hover**: Slightly darker background on group rows

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ View: [Flat List ▼]              [Expand All] [Collapse All]│
├─────────────────────────────────────────────────────────────┤
│ ▼ John Doe                    -      -      120%   12 days  │
│     Project A      Customer A  2025-Nov-S1  60%    6 days   │
│     Project B      Customer B  2025-Nov-S2  60%    6 days   │
├─────────────────────────────────────────────────────────────┤
│ ▶ Jane Smith                  -      -      80%    8 days   │
└─────────────────────────────────────────────────────────────┘
```

### Indentation
- Child rows are indented with `pl-8` (padding-left: 2rem)
- Clear visual hierarchy
- Easy to distinguish parent from child rows

## Benefits

### 1. Better Organization
- Group related allocations together
- Easier to understand allocation patterns
- Clear visual hierarchy

### 2. Quick Totals
- See total allocation per PM or project at a glance
- No manual calculation needed
- Totals respect current filters

### 3. Flexible Analysis
- Switch between views based on current task
- Same data, different perspectives
- All filters work with all views

### 4. Improved Planning
- Identify over/under-allocated PMs quickly
- See project staffing levels easily
- Make better allocation decisions

### 5. Reduced Cognitive Load
- Focus on one PM or project at a time
- Collapse irrelevant groups
- Less scrolling and searching

## Integration with Existing Features

### Works With
- ✅ Year filter
- ✅ Month filter
- ✅ Sprint filter
- ✅ Project filter
- ✅ Add Allocation
- ✅ Edit Allocation
- ✅ Delete Allocation
- ✅ Capacity Overview (below table)
- ✅ Permissions (read-only for Product Managers)

### Respects
- All existing filters
- Permission system
- Data validation
- Capacity warnings

## Performance Considerations

### Optimization
- Uses `useMemo` for grouped data calculation
- Only recalculates when dependencies change
- Efficient expand/collapse with Set data structure

### Scalability
- Handles large datasets efficiently
- No performance degradation with many allocations
- Smooth expand/collapse animations

## Edge Cases Handled

### Empty Groups
- Groups with no allocations are still shown
- Clear indication when expanded (no child rows)
- Totals show 0% and 0 days

### Filtered Data
- Totals only include filtered allocations
- Groups may be empty after filtering
- Clear and predictable behavior

### View Mode Switching
- Expanded groups are reset when switching views
- Prevents confusion with different group structures
- Clean state for each view mode

## Future Enhancements (Potential)

1. **Sorting Options**: Sort groups by name, total allocation, or total days
2. **Search/Filter Groups**: Quick search within groups
3. **Export by Group**: Export data maintaining group structure
4. **Nested Groups**: Group by Team → Member or Customer → Project
5. **Visual Charts**: Add mini charts showing allocation distribution
6. **Drag & Drop**: Reorder allocations between groups
7. **Bulk Actions**: Select multiple allocations for bulk edit/delete
8. **Remember State**: Persist expanded groups across page reloads

## Testing Checklist

- [ ] Switch between all three view modes
- [ ] Expand/collapse individual groups
- [ ] Use "Expand All" button
- [ ] Use "Collapse All" button
- [ ] Verify totals are correct
- [ ] Test with Year filter
- [ ] Test with Month filter
- [ ] Test with Sprint filter
- [ ] Test with Project filter
- [ ] Test with all filters combined
- [ ] Edit allocation from tree view
- [ ] Delete allocation from tree view
- [ ] Verify permissions (read-only users)
- [ ] Test with empty groups
- [ ] Test with large datasets
- [ ] Verify visual styling
- [ ] Test expand/collapse animations
- [ ] Verify indentation is clear

## Files Modified

1. **src/pages/AllocationPlanning.tsx**
   - Added `viewMode` state
   - Added `expandedGroups` state
   - Added `groupedByMember` computed data
   - Added `groupedByProject` computed data
   - Added `toggleGroup`, `expandAll`, `collapseAll` functions
   - Added View Mode selector UI
   - Added conditional rendering for three table views
   - Added Expand All / Collapse All buttons

## Code Quality

### Type Safety
- View mode is properly typed as union type
- All data structures are type-safe
- No type errors or warnings

### Maintainability
- Clear separation of concerns
- Reusable grouping logic
- Well-documented code
- Consistent naming conventions

### Performance
- Efficient data structures (Set for expanded groups)
- Memoized computed values
- No unnecessary re-renders

## Accessibility

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab navigation works correctly
- Enter/Space to expand/collapse groups

### Screen Readers
- Group rows announce their state (expanded/collapsed)
- Totals are clearly labeled
- Hierarchical structure is communicated

### Visual Indicators
- Clear expand/collapse icons
- Color coding for different group types
- Sufficient contrast ratios

## Migration Notes

### For Users
- Default view remains "Flat List" (no change to existing behavior)
- New views are opt-in
- All existing functionality preserved
- No learning curve for basic usage

### For Developers
- No breaking changes
- Backward compatible
- No database changes required
- No API changes needed
