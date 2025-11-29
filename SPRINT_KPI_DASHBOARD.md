# Sprint KPI Dashboard

## Overview
Added clickable KPI badges to each sprint swimlane header, providing at-a-glance insights into project and member allocation status.

## Implemented KPIs

### Project KPIs

#### 1. Projects Missing Capacity ❗
**What it shows**: Number of projects with missing or under-allocated resources

**Calculation**:
- Projects with no role requirements set AND no members allocated
- Projects with role requirements set BUT under-allocated for those roles

**Click action**: Switches to Project View with "Missing Any Allocation" filter applied

**Visual**:
- Red border and text when count > 0
- Gray when count = 0

**Use case**: Quickly identify projects that need resource allocation

---

#### 2. New/Reactivated Projects 🆕
**What it shows**: Number of projects in their first sprint OR reactivated after 6+ months

**Calculation**:
- Projects with allocations in current sprint but no previous allocations (first sprint)
- Projects with allocations in current sprint but last allocation was 6+ months ago (reactivated)

**Click action**: Switches to Project View (user can identify them visually)

**Visual**:
- Blue border and text when count > 0
- Gray when count = 0

**Use case**: Track new project onboarding and project reactivations

---

### Member KPIs

#### 3. Under Capacity Members ⚠️
**What it shows**: Number of team members allocated below their capacity threshold

**Calculation**:
- Members with total allocation < 70% of their individual capacity
- Example: Member with 50% capacity is under if allocated < 35%

**Click action**: Switches to Team View with "Under Capacity" filter applied

**Visual**:
- Yellow border and text when count > 0
- Gray when count = 0

**Use case**: Identify team members who can take on more work

---

#### 4. Over Capacity Members ❗
**What it shows**: Number of team members allocated above their capacity

**Calculation**:
- Members with total allocation > 100% of their individual capacity
- Example: Member with 80% capacity is over if allocated > 80%

**Click action**: Switches to Team View with "Over Capacity" filter applied

**Visual**:
- Red border and text when count > 0
- Gray when count = 0

**Use case**: Identify overloaded team members who need workload adjustment

---

## UI Layout

### Sprint Header with KPIs
```
┌─────────────────────────────────────────────┐
│ Nov 2025                    [+ Add Project] │
│ Sprint #2                                   │
├─────────────────────────────────────────────┤
│ ┌──────────────┬──────────────┐            │
│ │ Projects     │ New/         │            │
│ │ Missing      │ Reactivated  │            │
│ │    3         │    1         │            │
│ └──────────────┴──────────────┘            │
│ ┌──────────────┬──────────────┐            │
│ │ Under        │ Over         │            │
│ │ Capacity     │ Capacity     │            │
│ │    2         │    1         │            │
│ └──────────────┴──────────────┘            │
└─────────────────────────────────────────────┘
```

### Color Coding
- **Red**: Critical issues (missing projects, over capacity)
- **Yellow**: Warnings (under capacity)
- **Blue**: Informational (new/reactivated projects)
- **Gray**: No issues (count = 0)

## Interactive Features

### Click Actions
All KPI badges are clickable buttons that:
1. Switch to the appropriate view mode (Projects or Team)
2. Apply relevant filters automatically
3. Provide immediate drill-down into the issue

### Hover States
- Badges have hover effects (darker border)
- Tooltips explain what clicking will do

## Additional KPI Suggestions

Here are some other KPIs you might consider:

### Project-Related

1. **Projects at Risk** 🔴
   - Projects with capacity > 90% of max capacity percentage
   - Indicates projects nearing their resource limits

2. **Projects with No PMO Contact** 📋
   - Projects missing PMO assignment
   - Helps ensure proper project oversight

3. **Blocked Projects** 🚫
   - Projects with status "Pending" or "On Hold"
   - Quick visibility into stalled projects

4. **High-Priority Projects** ⭐
   - Projects marked as high priority or critical
   - Focus attention on important initiatives

### Member-Related

5. **Unallocated Members** 👤
   - Active members with 0% allocation
   - Identify available resources

6. **Members at Good Capacity** ✅
   - Members within 70-100% of capacity
   - Show healthy allocation status

7. **Members with Single Project** 🎯
   - Members allocated to only one project
   - May indicate specialization or risk

8. **Members Across Multiple Projects** 🔀
   - Members allocated to 3+ projects
   - May indicate context switching overhead

### Sprint-Level

9. **Total Sprint Capacity** 📊
   - Sum of all member allocations
   - Overall sprint workload indicator

10. **Average Member Utilization** 📈
    - Average allocation percentage across all members
    - Sprint efficiency metric

11. **Role Distribution** 👥
    - Breakdown by role (PM, PMO, etc.)
    - Resource mix visibility

12. **Sprint Velocity** 🚀
    - Comparison to previous sprints
    - Trend analysis

## Benefits

✅ **At-a-Glance Status**: Quickly understand sprint health
✅ **Proactive Management**: Identify issues before they escalate
✅ **One-Click Drill-Down**: Instant access to detailed views
✅ **Visual Hierarchy**: Color coding highlights priorities
✅ **Consistent Across Sprints**: Easy comparison between sprints
✅ **Actionable Insights**: Each KPI leads to specific actions

## Technical Implementation

### KPI Calculation Function
```typescript
const calculateSprintKPIs = (sprint: SprintInfo) => {
  const projectsData = getProjectsForSprint(sprint);
  const membersData = getMembersForSprint(sprint);
  
  // Calculate each KPI...
  
  return {
    projectsMissingCapacity,
    newOrStaleProjects,
    membersUnderCapacity,
    membersOverCapacity,
    totalProjects,
    totalMembers,
  };
};
```

### Click Handler
```typescript
const handleKPIClick = (type: string) => {
  // Switch view and apply filters
  if (type === 'projectsMissing') {
    setViewMode('projects');
    setMissingAllocationRoles(['ANY']);
  }
  // ... other cases
};
```

### Rendering
```typescript
{(() => {
  const kpis = calculateSprintKPIs(sprint);
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* KPI badges */}
    </div>
  );
})()}
```

## Use Cases

### Sprint Planning Meeting
- Quickly review all sprints
- Identify resource gaps
- Spot overloaded team members
- Track new project starts

### Daily Standup
- Check current sprint status
- Identify blockers (over-capacity members)
- Find available resources (under-capacity)

### Resource Allocation
- See which projects need attention
- Balance workload across team
- Optimize capacity utilization

### Executive Dashboard
- High-level sprint health overview
- Trend analysis across multiple sprints
- Resource utilization metrics

## Files Modified

- `src/pages/CapacityPlanning.tsx`
  - Added `calculateSprintKPIs` function
  - Added `handleKPIClick` function
  - Updated sprint header to display KPI badges
  - Added interactive click handlers

## Future Enhancements

- Historical KPI tracking
- KPI trend charts
- Customizable KPI thresholds
- Export KPI reports
- Email alerts for critical KPIs
- KPI comparison across sprints
