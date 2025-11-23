# Planning Period Filter Feature

## Overview
Added a "Planning Period" filter to the Team View in Capacity Overview, allowing users to focus on different time horizons for capacity planning.

## Feature Description

### Planning Period Filter
**Location**: Capacity Overview → Team View mode

**Options**:
1. **Current Sprint** - Shows only the current sprint
2. **Two Sprints** - Shows the current sprint and the next sprint (2 sprints total)
3. **Three Sprints** - Shows the current sprint and the next two sprints (3 sprints total - default)

### Behavior

#### Display Impact
- The filter dynamically adjusts which months/sprints are displayed in the capacity cards
- Months are automatically grouped based on the sprints included
- For example:
  - Current Sprint (mid-December): Shows only December
  - Two Sprints (mid-December): Shows December and January
  - Three Sprints (mid-December): Shows December, January, and February

#### Capacity Filter Integration
The Planning Period filter works in conjunction with the Capacity Filter (All/Under/Over/Good):
- When filtering by capacity status, only sprints within the selected planning period are considered
- This allows users to focus on immediate capacity issues (Current Sprint) or plan ahead (Three Sprints)
- Past sprints are always excluded from capacity calculations

### Use Cases

#### Current Sprint Focus
**Use Case**: Immediate capacity management
- **Scenario**: It's mid-sprint and you need to address urgent capacity issues
- **Action**: Select "Current Sprint"
- **Result**: See only the current sprint's allocations and capacity status
- **Benefit**: Eliminates noise from future planning, focuses on immediate actions

#### Two Sprints Planning
**Use Case**: Short-term capacity planning
- **Scenario**: Planning for the current and next sprint
- **Action**: Select "Two Sprints"
- **Result**: See current sprint and next sprint side-by-side
- **Benefit**: Balance immediate needs with near-term planning

#### Three Sprints Planning (Default)
**Use Case**: Medium-term capacity planning
- **Scenario**: Standard capacity planning horizon
- **Action**: Select "Three Sprints" (default)
- **Result**: See current sprint plus two future sprints
- **Benefit**: Comprehensive view for proactive capacity management

## Technical Implementation

### State Management
```typescript
const [planningPeriod, setPlanningPeriod] = useState<'current' | 'two' | 'three'>('three');
```

### Sprint Calculation
The feature uses a sprint-based calculation instead of month-based:
1. Determines current sprint based on date (1-15 = Sprint 1, 16-end = Sprint 2)
2. Calculates next N sprints based on planning period
3. Groups sprints by month for display
4. Handles month and year rollovers correctly

### Dynamic Month Display
```typescript
const displayMonths = useMemo(() => {
  const sprintCount = planningPeriod === 'current' ? 1 : planningPeriod === 'two' ? 2 : 3;
  const nextSprints = getNextSprints(sprintCount);
  return getMonthsFromSprints(nextSprints);
}, [planningPeriod]);
```

### Capacity Filter Integration
The capacity filter logic only considers sprints within the selected planning period:
- Filters out past sprints (always)
- Filters out future sprints beyond the planning period
- Calculates capacity status only for relevant sprints

## UI/UX Design

### Filter Placement
- Located in the Team View filter row
- Positioned between "Team" filter and "Capacity Filter"
- Uses standard Select component for consistency

### Grid Layout
Updated from 3-column to 4-column responsive grid:
- Mobile (< md): 1 column
- Tablet (md): 2 columns
- Desktop (lg+): 4 columns

### Visual Feedback
- Selected planning period is highlighted in the dropdown
- Capacity cards immediately update when period changes
- Smooth transition between different planning periods

## Benefits

1. **Focused Planning**: Users can concentrate on relevant time horizons
2. **Reduced Cognitive Load**: Less information to process when focusing on immediate needs
3. **Flexible Workflows**: Supports both tactical (current sprint) and strategic (three sprints) planning
4. **Better Performance**: Fewer months to render means faster page load
5. **Cleaner Interface**: Only shows relevant data based on planning context

## Examples

### Example 1: Current Date = December 10, 2025 (Sprint 1)
- **Current Sprint**: Shows December Sprint 1 only
- **Two Sprints**: Shows December Sprint 1 & Sprint 2
- **Three Sprints**: Shows December Sprint 1 & Sprint 2, January Sprint 1

### Example 2: Current Date = December 20, 2025 (Sprint 2)
- **Current Sprint**: Shows December Sprint 2 only
- **Two Sprints**: Shows December Sprint 2, January Sprint 1
- **Three Sprints**: Shows December Sprint 2, January Sprint 1 & Sprint 2

### Example 3: Current Date = December 31, 2025 (Sprint 2)
- **Current Sprint**: Shows December Sprint 2 only
- **Two Sprints**: Shows December Sprint 2, January Sprint 1
- **Three Sprints**: Shows December Sprint 2, January Sprint 1 & Sprint 2

## Future Enhancements

Potential improvements:
- Add "Six Sprints" option for longer-term planning
- Remember user's last selected planning period (localStorage)
- Add visual indicator showing which sprint is current
- Add quick toggle buttons instead of dropdown
- Show sprint count in the filter label (e.g., "Planning Period (3 sprints)")
