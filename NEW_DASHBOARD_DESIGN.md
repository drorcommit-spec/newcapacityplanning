# New Dashboard Design

## Overview
Complete redesign of the Dashboard with a timeline-based view and configurable capacity thresholds.

## Key Changes

### 1. Active Projects Count
- **Displays**: Current number of active projects
- **Simple metric** at the top of the dashboard

### 2. Timeline View (New Feature)
Three-column layout showing:
- **Current Sprint**
- **Next Sprint**
- **2 Sprints Ahead**

Each timeline section displays:

#### Sprint Information
- Month name and year
- Sprint number (1 or 2)
- Date range (from/to dates)
  - Sprint 1: 1st to 15th
  - Sprint 2: 16th to end of month

#### Unallocated Active Projects
- **Count**: Number of active projects without any member allocation for that sprint
- **Color**: Orange background if count > 0, white if 0
- **Clickable**: Redirects to Capacity Overview (Allocations page)
- **Visual**: Large number display with label

#### Under Capacity Members
- **Count**: Number of Product Managers/Product Operations Managers with total capacity < threshold
- **Default Threshold**: 90%
- **Configurable**: User can adjust threshold
- **Color**: Yellow background if count > 0, white if 0
- **Shows**: Current threshold value below count

#### Over Capacity Members
- **Count**: Number of Product Managers/Product Operations Managers with total capacity > threshold
- **Default Threshold**: 110%
- **Configurable**: User can adjust threshold
- **Color**: Red background if count > 0, white if 0
- **Shows**: Current threshold value below count

### 3. Configurable Thresholds
Two input fields in the header:
- **Under Capacity Threshold**: Default 90%, adjustable 0-100%
- **Over Capacity Threshold**: Default 110%, adjustable 100-200%
- **Real-time Update**: Changes immediately affect timeline calculations

### 4. Current Sprint Capacity (Retained)
- Shows all Product Managers and Product Operations Managers
- Displays current utilization percentage
- Color-coded by utilization level
- Shows team assignment

### 5. Removed Features
- Product Managers count card
- Unallocated Projects card (moved to timeline)
- Under-Allocated card (moved to timeline)
- Over-Allocated card (moved to timeline)
- Over-Allocation Alerts section
- Unallocated Projects modal

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                    [Under: 90%] [Over: 110%]      │
│ Current Sprint: 2025 - November - Sprint 2                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Active Projects                                              │
│ 9                                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Timeline View                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │Current Sprint│ │  Next Sprint │ │2 Sprints Ahead│        │
│ │Nov 2025 - S2 │ │Dec 2025 - S1 │ │Dec 2025 - S2  │        │
│ │11/16 - 11/30 │ │12/1 - 12/15  │ │12/16 - 12/31  │        │
│ │              │ │              │ │               │        │
│ │Unallocated   │ │Unallocated   │ │Unallocated    │        │
│ │Projects: 2   │ │Projects: 3   │ │Projects: 5    │        │
│ │              │ │              │ │               │        │
│ │Under Cap: 1  │ │Under Cap: 2  │ │Under Cap: 3   │        │
│ │< 90%         │ │< 90%         │ │< 90%          │        │
│ │              │ │              │ │               │        │
│ │Over Cap: 0   │ │Over Cap: 1   │ │Over Cap: 2    │        │
│ │> 110%        │ │> 110%        │ │> 110%         │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Current Sprint Capacity                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Miri Izhaki                              [65%]          │ │
│ │ Team: Dror                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Maor Avital                              [110%]         │ │
│ │ Team: Dror                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Color Coding

### Timeline Cards
- **Border**: Blue (all cards)
- **Background**: Light blue

### Metrics
- **Unallocated Projects**:
  - 0: Green text, white background
  - >0: Orange text, orange background, clickable
- **Under Capacity**:
  - 0: Green text, white background
  - >0: Yellow text, yellow background
- **Over Capacity**:
  - 0: Green text, white background
  - >0: Red text, red background

### Current Sprint Capacity
- Uses existing color coding from `getUtilizationColor` utility

## User Interactions

### Adjusting Thresholds
1. Click on threshold input field
2. Enter new value
3. Timeline updates immediately
4. Counts recalculate based on new thresholds

### Viewing Unallocated Projects
1. Click on "Unallocated Active Projects" count (if > 0)
2. Redirects to Allocations page
3. Automatically switches to Capacity Overview
4. Sets view mode to "Project View"
5. Pre-selects the unallocated projects in the filter
6. Scrolls to Capacity Overview section
7. Can immediately view and create allocations for those projects

### Viewing Sprint Details
- Hover over any metric to see details
- Each sprint card is self-contained
- Easy to compare across sprints

## Technical Implementation

### Sprint Date Calculation
```typescript
const getSprintDates = (year: number, month: number, sprint: number) => {
  const startDay = sprint === 1 ? 1 : 16;
  const endDay = sprint === 1 ? 15 : new Date(year, month, 0).getDate();
  return {
    from: `${month}/${startDay}/${year}`,
    to: `${month}/${endDay}/${year}`,
  };
};
```

### Timeline Data Structure
```typescript
{
  year: number,
  month: number,
  sprint: number,
  dates: { from: string, to: string },
  unallocatedProjects: Project[],
  underCapacityMembers: TeamMember[],
  overCapacityMembers: TeamMember[],
}
```

### Threshold State
```typescript
const [underCapacityThreshold, setUnderCapacityThreshold] = useState(90);
const [overCapacityThreshold, setOverCapacityThreshold] = useState(110);
```

### Member Filtering
Includes both:
- Product Manager
- Product Operations Manager

## Benefits

### At-a-Glance View
- See 3 sprints of data simultaneously
- Quickly identify capacity issues
- Spot unallocated projects early

### Configurable Alerts
- Adjust thresholds based on team needs
- Different teams may have different capacity expectations
- Real-time feedback on threshold changes

### Proactive Planning
- See future capacity issues before they happen
- Plan allocations 2 sprints ahead
- Identify trends in capacity utilization

### Simplified Interface
- Removed redundant information
- Focused on actionable metrics
- Clear visual hierarchy

### Better Decision Making
- Compare current vs future sprints
- Identify patterns in under/over capacity
- Prioritize allocation efforts

## Use Cases

### Scenario 1: Weekly Planning Meeting
**Goal**: Review capacity for next 3 sprints

1. Open Dashboard
2. Scan timeline view
3. Note any red/orange/yellow indicators
4. Click unallocated projects to assign
5. Adjust allocations for under/over capacity members

### Scenario 2: Adjusting Team Capacity Expectations
**Goal**: Set realistic capacity thresholds

1. Review current sprint capacity
2. Adjust under capacity threshold to 85%
3. Adjust over capacity threshold to 115%
4. See updated counts in timeline
5. Determine if thresholds are appropriate

### Scenario 3: Identifying Capacity Trends
**Goal**: Spot patterns in capacity utilization

1. Compare counts across 3 sprints
2. Notice increasing under capacity members
3. Investigate why (new projects, team changes)
4. Take corrective action

### Scenario 4: Project Allocation Priority
**Goal**: Ensure all active projects have resources

1. Check unallocated projects count
2. Click to view which projects
3. Prioritize based on project importance
4. Allocate team members accordingly

## Future Enhancements (Potential)

1. **Drill-Down Details**: Click counts to see member/project lists
2. **Historical Trends**: Chart showing capacity over time
3. **Threshold Presets**: Save common threshold configurations
4. **Email Alerts**: Notify when thresholds are exceeded
5. **Export Reports**: Generate capacity reports
6. **Team Comparison**: Compare capacity across teams
7. **Forecast View**: Predict future capacity needs
8. **Capacity Recommendations**: AI-suggested allocations

## Migration Notes

### For Users
- Dashboard layout has changed significantly
- Thresholds are now configurable (previously fixed at 100%)
- Timeline view replaces individual metric cards
- Unallocated projects modal removed (click count instead)

### For Developers
- Removed Modal component import
- Added Input component for thresholds
- Changed member filtering to include Product Operations Manager
- Simplified state management (removed modal state)
- Added sprint date calculation utility
