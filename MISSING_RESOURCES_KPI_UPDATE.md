# Missing Resources KPI - Updated Logic

## Overview
Updated the "Missing Resources" KPI on the Dashboard to be more accurate and meaningful.

## Previous Logic (Incorrect)
- Counted **all Active projects** that had no allocations in the sprint
- This included projects that weren't even supposed to be in that sprint
- Result: Inflated numbers showing projects that weren't relevant to the sprint

## New Logic (Correct)
The KPI now only counts projects that are:
1. **Assigned to the sprint** (via allocations OR sprintProjects)
2. **Under-resourced** in one of these ways:
   - Total allocation < 20%, OR
   - Has role requirements but at least one role has insufficient allocation

### Calculation Steps:
1. Get all allocations for the sprint
2. Get projects explicitly assigned to the sprint (from sprintProjects)
3. Combine both lists to get all projects in the sprint
4. For each project in the sprint:
   - Sum up all member allocations
   - If total < 20%, flag as "Missing Resources"
   - If project has role requirements (capacity planning):
     - Calculate allocation by resource type/role
     - If any role has less allocation than required, flag as "Missing Resources"

### Important Notes:
- **Projects with 0% allocation ARE counted** - if a project is assigned to the sprint but has no member allocations, it's flagged
- **Projects assigned via sprintProjects ARE counted** - even if they have no allocations yet
- **Projects not in the sprint are NOT counted** - only projects that appear in the sprint swimlane are checked
- **Threshold is 20%** for projects without role requirements
- **Role requirements are checked** - if a project needs 50% PM but only has 30% PM allocated, it's flagged

### Example:
**Sprint: Dec 2025, Sprint 1**

**Project A:**
- Member 1 (PM): 10%
- Member 2 (PM): 5%
- **Total: 15%** → ❗ Missing Resources (< 20%)

**Project B:**
- Member 1 (PM): 30%
- Member 2 (Designer): 25%
- **Total: 55%** → ✅ Adequate Resources

**Project C:**
- In sprint but no member allocations yet
- **Total: 0%** → ❗ Missing Resources (< 20%)

**Project D:**
- Not in this sprint at all
- **Not counted** (not in sprint swimlane)

**Project E (with role requirements):**
- **Required**: PM 50%, Designer 30%
- **Allocated**: PM 30%, Designer 35%
- **Total: 65%** (> 20%)
- → ❗ Missing Resources (PM has 30% but needs 50%)

**Project F (with role requirements):**
- **Required**: PM 40%, Designer 20%
- **Allocated**: PM 45%, Designer 25%
- **Total: 70%**
- → ✅ Adequate Resources (all roles meet requirements)

## Benefits
1. **More accurate**: Only counts projects actually in the sprint
2. **Actionable**: Shows projects that need more resources
3. **Cleaner**: Doesn't show irrelevant projects
4. **Threshold-based**: 20% minimum ensures projects have meaningful allocation

## Threshold
- **Current threshold**: 20%
- **Rationale**: A project with less than 20% total allocation likely needs more resources
- **Future enhancement**: Make this threshold configurable

## Future Enhancements
When sprint role requirements are implemented:
- Compare actual allocations by resource type vs. required allocations
- Flag projects where specific resource types are under-allocated
- Example: Project needs 50% PM but only has 20% PM allocated

## Related Files
- `src/pages/Dashboard.tsx` - Updated calculation logic
- `src/types/index.ts` - SprintRoleRequirement interface (for future use)

## Testing
After this change:
1. Projects without allocations won't appear in "Missing Resources"
2. Only allocated projects with < 20% total capacity will be flagged
3. The KPI number should be much lower and more accurate
