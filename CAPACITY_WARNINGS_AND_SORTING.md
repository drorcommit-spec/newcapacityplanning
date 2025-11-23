# Capacity Warnings and Allocation Sorting

## Features Added

### 1. Project Max Capacity Warning (Project View)
**Location:** Allocation Canvas - Project View

**Feature:**
- Red exclamation mark (❗) appears when total member allocations exceed the project's max capacity
- Hover over the icon to see the project's max capacity value
- Only shows when project has a max capacity defined and total exceeds it

**Example:**
```
Project: IoT Assessment
Total: 350%  ❗  (hover shows: "Exceeds project max capacity of 300%")
```

**Visual Indicator:**
- Icon: ❗ (red exclamation mark)
- Color: Red (#DC2626)
- Position: Next to the total percentage
- Tooltip: "Exceeds project max capacity of {maxCapacity}%"

### 2. Allocation Sorting (Both Views)
**Location:** Allocation Canvas - Both Project View and Team View

**Feature:**
- All allocated members/projects within each card are now sorted by allocation percentage in descending order
- Highest allocations appear first
- Makes it easy to identify major allocations at a glance

**Project View:**
```
Project: IoT Assessment (350%)
  • John Doe: 150%      ← Highest first
  • Jane Smith: 100%
  • Bob Wilson: 50%
  • Alice Brown: 50%    ← Lowest last
```

**Team View:**
```
Team Member: John Doe (200%)
  • Project Alpha: 100%  ← Highest first
  • Project Beta: 50%
  • Project Gamma: 30%
  • Project Delta: 20%   ← Lowest last
```

## Implementation Details

### Code Changes

**File:** `src/components/CapacityOverview.tsx`

#### 1. Project View - Max Capacity Warning
```typescript
// Check if total exceeds max capacity
const maxCapacity = projectData.project.maxCapacityPercentage;
const exceedsCapacity = maxCapacity && projectData.total > maxCapacity;

// Display warning icon
{exceedsCapacity && (
  <span 
    className="text-red-600 cursor-help" 
    title={`Exceeds project max capacity of ${maxCapacity}%`}
  >
    ❗
  </span>
)}
```

#### 2. Project View - Member Sorting
```typescript
// Sort members by allocation percentage descending
const sortedMembers = [...projectData.members].sort((a, b) => 
  b.percentage - a.percentage
);

// Render sorted members
{sortedMembers.map((mem: any, i: number) => (
  // ... member rendering
))}
```

#### 3. Team View - Project Sorting
```typescript
// Sort projects by allocation percentage descending
{[...member.projects].sort((a, b) => 
  b.percentage - a.percentage
).map((proj: any, i: number) => (
  // ... project rendering
))}
```

## User Benefits

### 1. Capacity Warning
- **Quick Identification:** Instantly see which projects are over-allocated
- **Proactive Management:** Catch capacity issues before they become problems
- **Clear Communication:** Tooltip provides exact max capacity value
- **Visual Clarity:** Red color and exclamation mark are universally understood warning indicators

### 2. Allocation Sorting
- **Better Readability:** Most important allocations are always at the top
- **Faster Analysis:** No need to scan through all allocations to find the largest ones
- **Consistent Experience:** Same sorting logic in both views
- **Improved Decision Making:** Easier to identify where time is being spent

## Use Cases

### Scenario 1: Over-Capacity Project
```
Project: Mobile App Development
Max Capacity: 200%
Current Total: 250%  ❗

Sorted Allocations:
  • Senior Dev A: 100%
  • Senior Dev B: 80%
  • Junior Dev C: 70%

Action: Manager sees warning, realizes need to reduce allocations or increase max capacity
```

### Scenario 2: Resource Distribution Analysis
```
Team Member: Sarah Johnson (180%)

Sorted Projects:
  • Critical Project: 80%    ← Main focus
  • Important Project: 50%
  • Support Project: 30%
  • Admin Tasks: 20%

Insight: Sarah is primarily focused on Critical Project, with smaller commitments elsewhere
```

## Technical Notes

### Performance
- Sorting is done in-place during render
- Uses JavaScript's native `.sort()` method
- Minimal performance impact (O(n log n) for small arrays)
- No additional API calls or data fetching required

### Data Integrity
- Original data is not mutated (uses spread operator `[...]`)
- Sorting is purely presentational
- No changes to database or stored allocations

### Compatibility
- Works with existing allocation data structure
- No database schema changes required
- Backward compatible with all existing features

## Testing Checklist

- [x] ✅ Project view shows warning when total > max capacity
- [x] ✅ Warning tooltip displays correct max capacity value
- [x] ✅ Warning only shows when max capacity is defined
- [x] ✅ Members sorted by allocation in project view
- [x] ✅ Projects sorted by allocation in team view
- [x] ✅ Sorting works with empty allocations
- [x] ✅ Sorting works with equal percentages
- [x] ✅ Build completes successfully
- [x] ✅ No TypeScript errors

## Future Enhancements

### Potential Additions:
1. **Warning Threshold:** Allow custom threshold (e.g., warn at 90% of max)
2. **Color Coding:** Yellow warning at 80%, red at 100%
3. **Aggregate View:** Show total over-capacity across all projects
4. **Export Warnings:** Include warnings in CSV export
5. **Notification System:** Email alerts for over-capacity projects
6. **Historical Tracking:** Track how often projects exceed capacity
7. **Sorting Options:** Allow user to choose sort order (ascending/descending)
8. **Multi-Sort:** Sort by percentage, then by name

## Related Features

- Project Max Capacity field (Project Management)
- Capacity thresholds (Team View)
- Allocation editing and management
- CSV export functionality

---

**Status:** ✅ Implemented and tested
**Version:** Added in latest update
**Build:** Successful
