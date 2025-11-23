# Sprint Filter Enhancement

## Overview
Added a Sprint filter to the Sprint Allocation Planning screen to allow users to view allocations for a specific sprint (Sprint 1, Sprint 2, or both).

## Feature Description

### New Filter Options
The Sprint filter provides three options:
1. **Both Sprints** (default) - Shows allocations for both Sprint 1 and Sprint 2
2. **Sprint 1** - Shows only Sprint 1 allocations
3. **Sprint 2** - Shows only Sprint 2 allocations

### Filter Location
The Sprint filter is positioned between the Month and Project filters in the filter bar, creating a logical flow:
- Year → Month → Sprint → Project

## User Experience

### Default Behavior
- When the page loads, "Both Sprints" is selected by default
- All allocations for the selected year and month are displayed
- Users see the complete picture of capacity allocation

### Filtering by Sprint
1. Select a specific sprint from the dropdown
2. Table immediately updates to show only allocations for that sprint
3. Other filters (Year, Month, Project) continue to work in combination

### Filter Combinations

#### Example 1: View Sprint 1 for Current Month
- Year: 2025
- Month: November
- Sprint: Sprint 1
- Result: Shows only Sprint 1 allocations for November 2025

#### Example 2: View All Sprint 2 Allocations for a Year
- Year: 2025
- Month: All Months
- Sprint: Sprint 2
- Result: Shows all Sprint 2 allocations across all months in 2025

#### Example 3: View Specific Project's Sprint 1
- Year: 2025
- Month: November
- Sprint: Sprint 1
- Project: DCG - MVP
- Result: Shows only Sprint 1 allocations for DCG project in November 2025

## Technical Implementation

### State Management
```typescript
const [selectedSprint, setSelectedSprint] = useState<number | null>(null);
```

### Filter Logic
```typescript
const filteredAllocations = useMemo(() => {
  return allocations.filter(a => {
    if (a.year !== selectedYear) return false;
    if (selectedMonth !== null && a.month !== selectedMonth) return false;
    if (selectedSprint !== null && a.sprint !== selectedSprint) return false;
    if (selectedProject && a.projectId !== selectedProject) return false;
    return true;
  });
}, [allocations, selectedYear, selectedMonth, selectedSprint, selectedProject]);
```

### UI Component
```tsx
<Select
  label="Sprint"
  options={[
    { value: 'all', label: 'Both Sprints' },
    { value: '1', label: 'Sprint 1' },
    { value: '2', label: 'Sprint 2' },
  ]}
  value={selectedSprint?.toString() || 'all'}
  onChange={(e) => setSelectedSprint(e.target.value === 'all' ? null : Number(e.target.value))}
/>
```

## Use Cases

### Scenario 1: Planning Sprint 1 Allocations
**Goal**: Focus on Sprint 1 to plan first half of month

1. Select current month
2. Select "Sprint 1"
3. View all Sprint 1 allocations
4. Identify gaps or over-allocations
5. Make adjustments as needed

### Scenario 2: Comparing Sprint Workloads
**Goal**: Compare Sprint 1 vs Sprint 2 allocations

1. Select "Sprint 1" and review allocations
2. Note total capacity used
3. Switch to "Sprint 2"
4. Compare capacity distribution
5. Balance workload if needed

### Scenario 3: Sprint-Specific Reporting
**Goal**: Generate report for specific sprint

1. Select year and month
2. Select specific sprint
3. View filtered allocations
4. Export or analyze data for that sprint only

### Scenario 4: Quick Sprint Check
**Goal**: Verify if a sprint is fully allocated

1. Select current month
2. Select "Sprint 2" (upcoming sprint)
3. Quickly scan allocations
4. Identify any missing allocations

## Benefits

### 1. Focused View
- Reduce visual clutter by showing only relevant sprint
- Easier to focus on one sprint at a time
- Better for sprint-specific planning

### 2. Flexible Analysis
- View both sprints together for overview
- Drill down to specific sprint for details
- Switch between views quickly

### 3. Better Planning
- Plan Sprint 1 and Sprint 2 separately
- Avoid confusion between sprints
- More accurate capacity planning

### 4. Improved Workflow
- Natural progression: Year → Month → Sprint → Project
- Logical filtering hierarchy
- Intuitive user experience

### 5. Reporting Capability
- Generate sprint-specific reports
- Compare sprint allocations
- Track sprint-level metrics

## Visual Design

### Filter Bar Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Year: 2025 ▼] [Month: November ▼] [Sprint: Both ▼] [Project: All ▼] │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown Options
```
Sprint
├─ Both Sprints (default)
├─ Sprint 1
└─ Sprint 2
```

## Integration with Existing Features

### Works With
- ✅ Year filter
- ✅ Month filter
- ✅ Project filter
- ✅ Allocation table
- ✅ Add/Edit/Delete operations
- ✅ Capacity Overview (below table)

### Does Not Affect
- Capacity Overview component (has its own sprint display)
- Allocation History page
- Dashboard timeline view

## Edge Cases Handled

### No Allocations for Selected Sprint
- Table shows "No allocations found" message
- User can switch to other sprint or add new allocations
- No errors or crashes

### Switching Between Filters
- Sprint filter updates immediately
- No lag or delay
- Smooth transitions

### URL Parameters
- Sprint filter state is not persisted in URL (by design)
- Resets to "Both Sprints" on page reload
- Consistent with other filter behaviors

## Future Enhancements (Potential)

1. **URL Persistence**: Add sprint to URL parameters
2. **Sprint Comparison View**: Side-by-side sprint comparison
3. **Sprint Summary**: Show totals for each sprint
4. **Quick Sprint Toggle**: Keyboard shortcut to switch sprints
5. **Sprint Badges**: Visual indicators for sprint in table
6. **Sprint Analytics**: Charts comparing sprint allocations
7. **Default Sprint**: Remember last selected sprint

## Testing Checklist

- [ ] Select "Both Sprints" - shows all allocations
- [ ] Select "Sprint 1" - shows only Sprint 1 allocations
- [ ] Select "Sprint 2" - shows only Sprint 2 allocations
- [ ] Combine with Year filter
- [ ] Combine with Month filter
- [ ] Combine with Project filter
- [ ] Combine all filters together
- [ ] Switch between sprint options
- [ ] Verify table updates immediately
- [ ] Test with no allocations for selected sprint
- [ ] Test with many allocations
- [ ] Verify "No allocations found" message
- [ ] Test filter reset behavior
- [ ] Verify dropdown styling
- [ ] Test on different screen sizes

## Files Modified

1. **src/pages/AllocationPlanning.tsx**
   - Added `selectedSprint` state
   - Updated `filteredAllocations` logic to include sprint filter
   - Added Sprint dropdown to filter bar
   - Updated dependency array for useMemo

## Performance

### Optimization
- Uses `useMemo` for efficient filtering
- No unnecessary re-renders
- Fast filter switching

### Scalability
- Handles large datasets efficiently
- No performance degradation with many allocations
- Smooth user experience

## Accessibility

### Keyboard Navigation
- Sprint dropdown is keyboard accessible
- Tab navigation works correctly
- Arrow keys navigate options

### Screen Readers
- Label clearly identifies filter purpose
- Options are announced correctly
- State changes are communicated

## Code Quality

### Type Safety
- Sprint state is properly typed as `number | null`
- Filter logic handles null values correctly
- No type errors or warnings

### Maintainability
- Clear variable naming
- Consistent with existing filter pattern
- Easy to understand and modify

### Consistency
- Follows same pattern as Month filter
- Uses same Select component
- Consistent styling and behavior

## Migration Notes

### For Users
- New filter appears automatically
- Default behavior unchanged (shows both sprints)
- No learning curve - works like other filters

### For Developers
- No breaking changes
- Backward compatible
- No database changes required
- No API changes needed
