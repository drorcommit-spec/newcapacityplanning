# Manager Filter Feature

## Overview
Added a hierarchical Manager filter to the Capacity Planning page that allows filtering allocations by team member's manager (including all descendants in the hierarchy) in both Project and Teams view modes.

## Implementation Details

### Filter Behavior
- **Manager Dropdown**: Lists all active members who act as managers (have at least one team member reporting to them)
- **"All Managers" Option**: Shows all projects and members without filtering
- **Hierarchical Filtering**: When a specific manager is selected, the filter includes:
  - ALL descendants (direct and indirect reports) in the management hierarchy
  - Projects with NO allocations (to allow planning)
  - Members who have NO manager assigned (unassigned members)
  - Example: If Nogah is selected, it shows allocations for all team members who report to Nogah directly OR indirectly through other managers, PLUS any unassigned members
- **Project View Mode**: When a manager is selected, displays:
  - Projects with allocations where ALL team members are either descendants of the selected manager OR have no manager assigned
  - Projects with no allocations at all
  - Excludes projects that have ANY member who reports to a different manager
- **Teams View Mode**: When a manager is selected, displays:
  - Team members who are descendants of the selected manager
  - Team members who have no manager assigned

### Technical Changes

#### State Management
- Added `managerFilter` state to track the selected manager (default: 'all')

#### Helper Functions
- Added `getManagerMembers` memoized function that:
  - Identifies all members who are managers (have at least one direct report)
  - Returns sorted list of active manager members

- Added `getManagerDescendants` memoized function that:
  - Recursively finds all descendants (direct and indirect reports) of a given manager
  - Returns a Set of member IDs representing the entire hierarchy under the manager
  - Uses recursive traversal to build the complete descendant tree

#### Filter Logic

**Project View:**
```typescript
// Apply Manager filter (hierarchical - includes all descendants)
if (managerFilter !== 'all') {
  const descendants = getManagerDescendants(managerFilter);
  result = result.filter(({ members }) => {
    // Include projects with no allocations (empty members array)
    if (members.length === 0) return true;
    
    // Include projects where ALL members are either descendants of the selected manager
    // OR have no manager assigned
    return members.every(member => {
      const teamMember = teamMembers.find(tm => tm.id === member.id);
      // Include if member is a descendant OR if member has no manager
      return descendants.has(member.id) || !teamMember?.managerId;
    });
  });
}
```

**Teams View:**
```typescript
// Apply Manager filter (hierarchical - includes all descendants)
if (managerFilter !== 'all') {
  const descendants = getManagerDescendants(managerFilter);
  result = result.filter(({ member }) => {
    // Include members who are descendants of the selected manager
    // OR members who have no manager assigned
    return descendants.has(member.id) || !member.managerId;
  });
}
```

**Hierarchical Descendant Lookup:**
```typescript
const getManagerDescendants = useMemo(() => {
  return (managerId: string): Set<string> => {
    const descendants = new Set<string>();
    
    // Helper function to recursively find all reports
    const findReports = (currentManagerId: string) => {
      teamMembers.forEach(member => {
        if (member.isActive && member.managerId === currentManagerId && !descendants.has(member.id)) {
          descendants.add(member.id);
          // Recursively find this member's reports
          findReports(member.id);
        }
      });
    };
    
    findReports(managerId);
    return descendants;
  };
}, [teamMembers]);
```

### UI Components

#### Project View Filter
- Located in the filters section after PMO Contact filter
- Label: "Manager:"
- Dropdown with "All Managers" default option
- Lists all active managers sorted alphabetically

#### Teams View Filter
- Located in the filters section after Capacity filter, before Resource Type filter
- Label: "Manager:"
- Dropdown with "All Managers" default option
- Lists all active managers sorted alphabetically

## Usage

### Project View Mode
1. Navigate to Capacity Planning
2. Ensure "Projects" view mode is selected
3. Click the filter toggle if filters are hidden
4. Select a manager from the "Manager:" dropdown (e.g., "Nogah")
5. Only projects with allocations where team members are descendants of the selected manager (direct or indirect reports) will be displayed

### Teams View Mode
1. Navigate to Capacity Planning
2. Select "Team" view mode
3. Click the filter toggle if filters are hidden
4. Select a manager from the "Manager:" dropdown (e.g., "Nogah")
5. Only team members who are descendants of the selected manager (direct or indirect reports) will be displayed

### Example Hierarchy
If the management structure is:
- Nogah (Manager)
  - Alice (Direct Report)
    - Bob (Indirect Report - reports to Alice)
    - Carol (Indirect Report - reports to Alice)
  - David (Direct Report)
- Sarah (Different Manager)
  - Tom (Reports to Sarah)
- Eve (No Manager Assigned)

When "Nogah" is selected, the filter will show:
- **Project A**: Alice (50%) + Bob (30%) → ✅ Shown (all members are Nogah's descendants)
- **Project B**: Alice (40%) + Eve (20%) → ✅ Shown (Alice is descendant, Eve has no manager)
- **Project C**: Alice (30%) + Tom (40%) → ❌ Hidden (Tom reports to Sarah, not Nogah)
- **Project D**: No allocations → ✅ Shown (empty projects for planning)
- **Project E**: Eve (50%) → ✅ Shown (Eve has no manager)

**Team View** shows: Alice, Bob, Carol, David, and Eve (all descendants + unassigned)

## Benefits
- Enables managers to quickly view their entire team's allocations across projects (including indirect reports)
- Provides complete visibility into the entire management hierarchy
- Helps identify capacity and workload for all team members under a manager
- Includes unassigned members (no manager) to ensure nothing is missed
- Shows projects with no allocations to facilitate planning
- Supports multi-level organizational structures
- Works seamlessly with other existing filters (capacity, resource type, search, etc.)
- Automatically adapts to changes in the organizational hierarchy

## Files Modified
- `product-capacity-platform/src/pages/CapacityPlanning.tsx`
  - Added manager filter state
  - Added getManagerMembers helper function to identify all managers
  - Added getManagerDescendants helper function for hierarchical traversal
  - Added hierarchical filter logic for both view modes
  - Added UI components for manager filter dropdown

## Technical Notes
- The hierarchical lookup uses recursive traversal to build the complete descendant tree
- The function is memoized for performance optimization
- Only active members are included in the hierarchy
- The filter automatically updates when team member relationships change
- Projects with no allocations are always included when a manager is selected (to allow planning)
- Members without a manager assignment are always included when a manager is selected (to avoid hiding unassigned resources)
- When "All Managers" is selected, no filtering is applied (shows everything)
