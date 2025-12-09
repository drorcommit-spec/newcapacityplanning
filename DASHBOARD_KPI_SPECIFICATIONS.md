# Dashboard KPI Specifications

## Overview
The Dashboard displays Key Performance Indicators (KPIs) for both Projects and Team Members across multiple sprints. Each KPI has specific calculation logic and thresholds.

---

## Project KPIs

### 1. ❗ Missing Resources
**Subtitle:** "Projects without / missing allocations"

**Definition:** Projects assigned to the sprint that need member allocation (regardless of project status).

**Purpose:** Alert managers that there are projects in the sprint that need attention for resource allocation.

**A project is flagged if ANY of these conditions are true:**

1. **Total allocation = 0%**
   - Project is assigned to the sprint (via sprintProjects or allocations)
   - Sum of all member capacity allocations equals zero
   - This includes:
     - Projects with no members assigned yet
     - Projects where members are assigned but all have 0% allocation
   - Applies to ALL project statuses (Active, Pending, etc.)

2. **Role requirements not met**
   - Project has defined role requirements (Resource Capacity Planning)
   - At least one required role has insufficient allocation
   - Example: Project needs 50% Developer but only has 30% allocated

**Calculation Logic:**
```javascript
// Check if project has zero allocation
if (totalAllocation === 0) return true;

// Check role requirements if they exist
if (roleRequirements exist) {
  for each required role:
    if (allocated < required) return true;
}
```

**Examples:**

**Example 1: Project with no members (any status)**
- Project "Website Redesign" added to sprint
- Status: Active or Pending
- No members assigned yet
- Sum of allocations: 0%
- Result: ❗ Flagged as Missing Resources

**Example 2: Project with members but zero allocation**
- Project "Marketing Campaign" in sprint
- Status: Active
- Members assigned: John (0%), Sarah (0%)
- Sum of allocations: 0%
- Result: ❗ Flagged as Missing Resources

**Example 3: Role requirement not met**
- Project "Mobile App" in sprint
- Status: Active
- Requires: 50% Developer, 25% Designer
- Allocated: 30% Developer, 25% Designer
- Sum of allocations: 55%
- Result: ❗ Flagged (Developer role under-allocated)

**Example 4: No issues**
- Project "API Integration" in sprint
- Status: Active or Pending
- Requires: 40% Developer
- Allocated: 50% Developer
- Sum of allocations: 50%
- Result: ✅ Not flagged

**Color:** Red when count > 0

**Click Action:** Navigate to Capacity Planning filtered by missing resources

---

### 2. 🆕 New / Reactivated
**Subtitle:** "Projects with no allocations in last 6 months"

**Definition:** Projects that are either new or haven't been worked on recently.

**A project is flagged if:**
- **New Project:** No previous allocations before current sprint
- **Reactivated Project:** Last allocation was more than 6 months ago

**Calculation Logic:**
```javascript
// Check if project has previous allocations
if (no previous allocations) return true;

// Check if last allocation was > 6 months ago
if (lastAllocationDate < 6 months ago) return true;
```

**Color:** Blue when count > 0

**Click Action:** Navigate to Capacity Planning filtered by new/reactivated projects

---

### 3. 📋 No PMO
**Subtitle:** "Projects without PMO contact or allocation"

**Definition:** Projects missing PMO oversight.

**A project is flagged if EITHER:**
1. **No PMO Contact:** Project has no PMO contact assigned in project details
2. **No PMO Allocation:** Project has 0% allocation from members with "PMO" role

**Calculation Logic:**
```javascript
// Check PMO contact field
if (!project.pmoContact || project.pmoContact === '') return true;

// Check PMO role allocation
pmoAllocation = sum of allocations from members with role containing "PMO"
if (pmoAllocation === 0) return true;
```

**Color:** Orange when count > 0

**Click Action:** Navigate to Capacity Planning filtered by no-PMO projects

---

### 4. ⏳ Pending
**Subtitle:** "Projects with Pending status"

**Definition:** Projects in the sprint with status = "Pending"

**A project is flagged if:**
- Project status is "Pending"
- Project is not archived
- Project has allocations in this sprint

**Calculation Logic:**
```javascript
if (project.status === 'Pending' && !project.isArchived) return true;
```

**Color:** Yellow when count > 0

**Click Action:** Navigate to Capacity Planning filtered by pending projects

---

## Member KPIs

### 5. ⚠️ Under Capacity
**Subtitle:** "Members allocated below threshold"

**Definition:** Members with allocations below their capacity threshold.

**A member is flagged if:**
- Has at least one allocation in the sprint (total > 0%)
- Total allocation < (Member Capacity × Under Threshold %)
- Default threshold: 70%

**Calculation Logic:**
```javascript
memberCapacity = member.capacity ?? 100; // Default 100%
underThreshold = (memberCapacity × 70) / 100; // Default 70%

if (totalAllocation > 0 && totalAllocation < underThreshold) return true;
```

**Example:**
- Member capacity: 100%
- Under threshold: 70%
- Member allocated: 50%
- Result: Flagged as under capacity

**Color:** Yellow when count > 0

**Click Action:** Navigate to Capacity Planning (Team view) filtered by under capacity

---

### 6. 🔴 Over Capacity
**Subtitle:** "Members allocated above threshold"

**Definition:** Members with allocations exceeding their capacity threshold.

**A member is flagged if:**
- Total allocation > (Member Capacity × Over Threshold %)
- Default threshold: 100%

**Calculation Logic:**
```javascript
memberCapacity = member.capacity ?? 100; // Default 100%
overThreshold = (memberCapacity × 100) / 100; // Default 100%

if (totalAllocation > overThreshold) return true;
```

**Example:**
- Member capacity: 100%
- Over threshold: 100%
- Member allocated: 120%
- Result: Flagged as over capacity

**Color:** Red when count > 0

**Click Action:** Navigate to Capacity Planning (Team view) filtered by over capacity

---

### 7. 📌 Single Project
**Subtitle:** "Members on only one project"

**Definition:** Members allocated to exactly one project in the sprint.

**A member is flagged if:**
- Has allocations in the sprint
- Number of unique projects = 1

**Calculation Logic:**
```javascript
uniqueProjects = new Set(member allocations).size;
if (uniqueProjects === 1) return true;
```

**Color:** Blue when count > 0

**Click Action:** Navigate to Capacity Planning (Team view) filtered by single project

---

### 8. 🔀 Multi-Project
**Subtitle:** "Members on 3+ projects"

**Definition:** Members spread across multiple projects.

**A member is flagged if:**
- Has allocations in the sprint
- Number of unique projects ≥ 3

**Calculation Logic:**
```javascript
uniqueProjects = new Set(member allocations).size;
if (uniqueProjects >= 3) return true;
```

**Color:** Purple when count > 0

**Click Action:** Navigate to Capacity Planning (Team view) filtered by multi-project

---

## Overall Summary KPIs

### Total Projects
**Definition:** Count of all active (non-archived) projects with status "Active" or "Pending"

### Total Members
**Definition:** Count of all active team members (isActive = true)

### Average Utilization
**Definition:** Average allocation percentage across all active members

**Calculation:**
```javascript
totalSprintCapacity = sum of all member allocations in sprint
avgUtilization = totalSprintCapacity / totalActiveMembers
```

### Projects Without Sprint
**Definition:** Active projects not assigned to any current or future sprint

**Calculation:**
- Check all sprints (current + future)
- Count projects with no allocations and not in sprintProjects

### Members Without Sprint
**Definition:** Active members not assigned to any current or future sprint

**Calculation:**
- Check all sprints (current + future)
- Count members with no allocations in any sprint

---

## Capacity Thresholds

### Configurable Thresholds
Users can edit capacity thresholds from the Dashboard:

**Under Capacity Threshold:**
- Default: 70%
- Editable: Click on the threshold value
- Stored in: localStorage
- Used for: Under capacity KPI calculation

**Over Capacity Threshold:**
- Default: 100%
- Editable: Click on the threshold value
- Stored in: localStorage
- Used for: Over capacity KPI calculation

**Good Capacity Range:**
- Between under and over thresholds
- Default: 70% - 100%
- Members in this range are considered optimally allocated

---

## Sprint-Specific KPIs

Each sprint shows its own KPIs calculated independently:

**Sprint Information:**
- Sprint name: "Month Year Sprint #N"
- Date range: Displayed below sprint name
- Total active projects in sprint
- Total active members in sprint

**KPI Cards:**
- Each KPI is clickable
- Navigates to Capacity Planning with appropriate filters
- Color-coded based on severity
- Shows count of items matching criteria

---

## Color Coding

| Color | Severity | Used For |
|-------|----------|----------|
| Red | Critical | Missing Resources, Over Capacity |
| Yellow | Warning | Pending, Under Capacity |
| Orange | Attention | No PMO |
| Blue | Info | New/Reactivated, Single Project |
| Purple | Info | Multi-Project |
| Gray | Neutral | Zero count |

---

## Data Sources

**Projects:**
- Source: `projects` array from DataContext
- Filters: Active (not archived), status = Active or Pending

**Members:**
- Source: `teamMembers` array from DataContext
- Filters: Active (isActive = true)

**Allocations:**
- Source: `allocations` array from DataContext
- Filtered by: year, month, sprint

**Sprint Projects:**
- Source: `sprintProjects` from DataContext
- Tracks projects explicitly added to sprints

**Role Requirements:**
- Source: `sprintRoleRequirements` from DataContext
- Defines required capacity per role per project per sprint

---

## Refresh Functionality

**Refresh Button:**
- Located in top-right corner
- Reloads all data from Supabase
- Updates all KPIs
- Shows loading indicator during refresh

---

## Navigation

**Clicking a KPI:**
- Navigates to: `/capacity-planning`
- Sets view mode: Projects or Team (depending on KPI)
- Applies filter: Specific KPI filter
- Sets sprint: Clicked sprint index

**Example URLs:**
```
/capacity-planning?view=projects&kpi=missing-resources&sprint=0
/capacity-planning?view=team&kpi=over-capacity&sprint=1
/capacity-planning?view=projects&kpi=pending&sprint=2
```

---

## Notes

1. **Only allocated members count:** Member KPIs only include members with at least one allocation in the sprint
2. **Role-based filtering:** Missing Resources KPI considers role requirements if defined
3. **6-month window:** New/Reactivated uses 6-month lookback period
4. **PMO detection:** Case-insensitive check for "PMO" in member role
5. **Capacity defaults:** Members without defined capacity default to 100%

---

## Future Enhancements

Potential improvements:
- Configurable 6-month window for New/Reactivated
- Custom KPI thresholds per team
- Historical KPI trends
- Export KPI data
- Email alerts for critical KPIs
