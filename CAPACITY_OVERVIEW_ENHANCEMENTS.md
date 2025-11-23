# Capacity Overview Enhancements

## Overview
Two key improvements to the Capacity Overview component for better filtering and information display.

## 1. Multi-Select Project Filter

### What Changed
The project filter in Project View mode has been upgraded from a single-select dropdown to a multi-select checkbox list.

### Before
- Single dropdown with "All Projects" or one project at a time
- Could only view one project's capacity at a time
- Required multiple filter changes to compare projects

### After
- Checkbox list with multiple selections
- Can select any combination of projects
- "All Projects" option to clear all selections
- Shows count of selected projects
- Scrollable list for many projects

### Implementation Details

#### State Change
```typescript
// Before
const [selectedProject, setSelectedProject] = useState<string>('');

// After
const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
```

#### Filter Logic
```typescript
// Before
if (selectedProject) {
  projectList = projectList.filter(p => p.id === selectedProject);
}

// After
if (selectedProjects.length > 0) {
  projectList = projectList.filter(p => selectedProjects.includes(p.id));
}
```

#### UI Component
- Border box with max height and scroll
- Individual checkboxes for each project
- "All Projects" checkbox at top
- Selection counter below
- Hover effects on each option

### User Experience

#### Selecting Projects
1. Click on project checkboxes to select
2. Multiple projects can be selected
3. Uncheck to deselect
4. Click "All Projects" to clear all selections

#### Visual Feedback
- Checked boxes show selected projects
- Counter: "3 projects selected"
- Scrollbar appears when list is long
- Hover highlights each option

### Use Cases

#### Compare Multiple Projects
**Scenario**: Compare capacity allocation across 3 related projects
1. Open Project View
2. Select "Project A", "Project B", "Project C"
3. View all three projects' capacity side by side
4. Quickly identify resource conflicts

#### Focus on Specific Projects
**Scenario**: Review only high-priority projects
1. Select 2-3 critical projects
2. Hide all other projects from view
3. Focus on capacity planning for these projects

#### Quick Overview
**Scenario**: Check if any projects need attention
1. Select "All Projects" (default)
2. Scan through all project cards
3. Select specific projects for detailed review

## 2. Project Name Tooltips

### What Changed
Project names in Project View now display tooltips on hover showing customer name and max capacity.

### Before
- Project name visible
- Customer name shown below (but takes space)
- Max capacity not visible in overview
- Need to navigate to project management to see details

### After
- Hover over project name shows tooltip
- Tooltip displays:
  - Customer name
  - Max capacity percentage (if set)
- Cursor changes to help cursor
- No extra space needed

### Implementation Details

#### Tooltip Content
```typescript
title={`Customer: ${project.customerName}${project.maxCapacityPercentage ? `\nMax Capacity: ${project.maxCapacityPercentage}%` : ''}`}
```

#### Visual Styling
- `cursor-help` class (question mark cursor)
- Multi-line tooltip with `\n` separator
- Native browser tooltip (no extra libraries)

### User Experience

#### Viewing Tooltip
1. Hover mouse over project name
2. Wait ~1 second for tooltip to appear
3. Tooltip shows customer and max capacity
4. Move mouse away to hide tooltip

#### Information Displayed
- **Customer Name**: Full customer name
- **Max Capacity**: Percentage if set (e.g., "Max Capacity: 50%")
- **Format**: Clean, readable multi-line display

### Use Cases

#### Quick Reference
**Scenario**: Need to know project's max capacity while planning
1. Hover over project name
2. See max capacity in tooltip
3. Make allocation decisions based on capacity limit
4. No need to navigate away

#### Customer Context
**Scenario**: Multiple projects with similar names
1. Hover over project name
2. See customer name in tooltip
3. Confirm correct project
4. Proceed with allocation

#### Capacity Planning
**Scenario**: Checking if project is near capacity
1. View project card showing current allocations
2. Hover over project name to see max capacity
3. Compare current vs max
4. Decide if more allocation is possible

## Technical Implementation

### Files Modified
1. **src/components/CapacityOverview.tsx**
   - Changed `selectedProject` to `selectedProjects` (array)
   - Updated filter logic for multiple selections
   - Replaced Select component with custom checkbox list
   - Added tooltip to project name header
   - Updated dependency arrays

### Key Changes

#### Multi-Select Filter UI
```tsx
<div>
  <label className="text-sm font-medium text-gray-700 block mb-1">Projects</label>
  <div className="border border-gray-300 rounded-lg p-2 bg-white max-h-40 overflow-y-auto">
    <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
      <input
        type="checkbox"
        checked={selectedProjects.length === 0}
        onChange={() => setSelectedProjects([])}
      />
      <span className="text-sm">All Projects</span>
    </label>
    {activeProjects.map(p => (
      <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
        <input
          type="checkbox"
          checked={selectedProjects.includes(p.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProjects([...selectedProjects, p.id]);
            } else {
              setSelectedProjects(selectedProjects.filter(id => id !== p.id));
            }
          }}
        />
        <span className="text-sm">{p.customerName} - {p.projectName}</span>
      </label>
    ))}
  </div>
  {selectedProjects.length > 0 && (
    <div className="text-xs text-gray-600 mt-1">
      {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
    </div>
  )}
</div>
```

#### Tooltip Implementation
```tsx
<h3 
  className="text-xl font-bold text-green-900 mb-2 cursor-help" 
  title={`Customer: ${project.customerName}${project.maxCapacityPercentage ? `\nMax Capacity: ${project.maxCapacityPercentage}%` : ''}`}
>
  {project.projectName}
</h3>
```

## Benefits

### Multi-Select Filter
✅ **Flexible Viewing** - View any combination of projects
✅ **Better Comparison** - Compare multiple projects side by side
✅ **Reduced Clicks** - No need to change filter repeatedly
✅ **Clear Feedback** - Selection counter shows what's selected
✅ **Scalable** - Scrollable list handles many projects

### Tooltips
✅ **Quick Info** - See details without navigation
✅ **Space Efficient** - No extra UI elements needed
✅ **Context Aware** - Shows relevant project information
✅ **Non-Intrusive** - Only appears on hover
✅ **Standard UX** - Uses familiar tooltip pattern

## Future Enhancements (Potential)

1. **Save Filter Presets**: Save commonly used project combinations
2. **Search in Filter**: Add search box to quickly find projects
3. **Group by Customer**: Organize projects by customer in filter
4. **Enhanced Tooltips**: Add more project details (status, PMO contact)
5. **Filter Persistence**: Remember last selected projects across sessions
6. **Bulk Actions**: Select multiple projects for bulk operations
7. **Export Selected**: Export data for only selected projects

## Testing Checklist

### Multi-Select Filter
- [ ] Can select multiple projects
- [ ] "All Projects" clears all selections
- [ ] Selection counter shows correct count
- [ ] Scrollbar appears when list is long
- [ ] Hover effect works on each option
- [ ] Selected projects display correctly
- [ ] Unselecting projects works
- [ ] Filter persists when switching views and back

### Tooltips
- [ ] Tooltip appears on hover
- [ ] Shows customer name correctly
- [ ] Shows max capacity when set
- [ ] Doesn't show max capacity line when not set
- [ ] Cursor changes to help cursor
- [ ] Tooltip disappears when mouse moves away
- [ ] Works on all project cards
- [ ] Multi-line format is readable
