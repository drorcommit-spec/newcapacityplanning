# Variable Sprint Length — Design

## Current state (verified)
- `src/utils/dateUtils.ts`: hardcoded `DAYS_PER_SPRINT=10`, `SPRINTS_PER_MONTH=2`,
  `SPRINTS_PER_YEAR=24`. Sprint 1 = days 1–15, Sprint 2 = 16–end. `getCurrentSprint`,
  `getSprintDateRange`, `getSprintLabel`, `getSprintsInMonth` all assume this.
- `src/types/index.ts`: `SprintAllocation` keyed by `{year, month, sprint}` plus multi-sprint
  group fields. `Project` has planning fields with `plannedStartSprint` (1|2). No sprint-length field.
- Keys using `year-month-sprint` across the app:
  - `sprintProjects`: `${year}-${month}-${sprint}` → string[]
  - `sprintRoleRequirements`: `${projectId}-${year}-${month}-${sprint}` → Record<role, number>
  - `SprintTask.sprintId`, `CapacityAlert`, `AllocationHistory`
- `DataContext.tsx` saves the whole `allocations` array via debounced `saveAllocations`.
- `Dashboard.tsx` generates sprints with `sprintCount=3` assuming 2 sprints/month.

## Target model

### Week identity
Introduce a canonical week key: `weekKey = `${isoYear}-W${isoWeek}`` with a helper returning
`{ isoYear, isoWeek, startDate, endDate, month, weekOfMonth }`. All allocation records reference
a week, not a sprint.

### Data model changes
- `Project.sprintLengthWeeks?: 1 | 2 | 3` (default 2).
- New `WeeklyAllocation` shape (evolve `SprintAllocation`):
  - Replace `{year, month, sprint}` with `{ isoYear, isoWeek }` (keep `weekStartDate` for display).
  - Retain `projectId, productManagerId, allocationPercentage, allocationDays, comment, ...`.
  - Drop the multi-sprint group fields (grouping is now implicit via consecutive weeks) OR keep
    `allocationGroupId` to link a multi-week allocation created together. Decision: keep
    `allocationGroupId` for "created as one span" grouping; remove sprint-index fields.
- `sprintProjects` / `sprintRoleRequirements`: re-key from sprint to week
  (`${isoYear}-W${isoWeek}` / `${projectId}-${isoYear}-W${isoWeek}`).

### Date engine (`dateUtils.ts` rewrite)
New pure functions (unit-tested):
- `getWeeksInRange(start, end): WeekInfo[]`
- `getWeekOfMonth(date): number` (W1..W4/W5 per OQ1)
- `groupWeeksIntoSprints(weeks, sprintLengthWeeks): Sprint[]` implementing R4 numbering
- `getSprintLabel(sprint, sprintLengthWeeks)` (S# vs date-range per length)
- `getCurrentWeek()`, `getDefaultSpanWeeks(project)`
- Keep thin back-compat shims during migration where practical.

### Migration — clean reset (user-authorized)
No backfill/split. Existing allocation data is erased; the new weekly model starts empty.
1. `add-sprint-length-weeks.sql`: add `sprint_length_weeks int default 2` to projects.
2. Clear allocations and the sprint-keyed collections (`sprintProjects`,
   `sprintRoleRequirements`), plus sprint tasks/alerts that reference the old key.
3. Deploy the weekly schema; users re-enter allocations on the new model.
4. Projects, members, teams, roles are preserved — only allocation/sprint-keyed data is cleared.
Note: a backup is still taken before the wipe for operational safety, but no data is transformed.

### Shared header component
Extract a `PeriodHeader` used by all four screens: renders Month band (colspan/width by weeks),
Week columns, optional Sprint row (grouping via `groupWeeksIntoSprints`). Tables use colspan;
Staff/Dashboard (flex) compute widths = colWidth×span + gap×(span−1), as prototyped in the mockups.

### Screen updates
- `TimelineView.tsx`, `ProjectMatrixView.tsx` (Puzzle), Staff view, `Dashboard.tsx`: consume
  the week model + `PeriodHeader`. Dashboard sprint generation derives from sprint length and
  `getCurrentWeek()` instead of `sprintCount`/2-per-month.
- `capacityUtils.ts`: recompute per week.
- Allocation dialog: default span = `getDefaultSpanWeeks(project)`, editable.

### Types/API/context
- Add `sprintLengthWeeks` through `types`, `supabaseApi.ts`/`api.ts`, `DataContext`.
- Weekly allocation save path mirrors current debounced array save (low change to save logic).

## Risks
- Clean reset erases existing allocations (user-authorized), so migration risk is low. Take a
  backup before the wipe for operational safety only.
- Wide grids for 1-week sprints over long ranges — handled by horizontal scroll (N3).

## Verification
- Unit tests for the date engine (numbering rules, month boundaries, 5th-week case).
- Migration dry-run: assert sum/coverage of weekly records matches source sprint allocations.
- Build + manual check of all four screens at 1w/2w/3w and a mixed-project cross view.
