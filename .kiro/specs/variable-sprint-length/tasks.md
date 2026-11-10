# Variable Sprint Length — Tasks

## Phase 0 — Decisions & safety
- [x] 0.1 OQ1 resolved: 5th partial week = own `W5` column. OQ2 resolved: no backfill, erase
      existing allocation data (user-authorized).
- [ ] 0.2 Take a full DB backup (Supabase + JSON) before the clean reset (operational safety).

## Phase 1 — Date engine (no UI impact yet)
- [ ] 1.1 Add `WeekInfo`/`Sprint` types and week-key helpers to `dateUtils.ts`.
- [ ] 1.2 Implement `getWeeksInRange`, `getWeekOfMonth`, `getCurrentWeek`.
- [ ] 1.3 Implement `groupWeeksIntoSprints` + `getSprintLabel` per R4 numbering rules.
- [ ] 1.4 Unit tests for numbering, month boundaries, 5th-week, 3-week cross-month.

## Phase 2 — Data model & types
- [x] 2.1 Add `sprintLengthWeeks` to `Project` type + project form UI (1/2/3, default 2).
- [x] 2.2 Introduce weekly allocation shape (`isoYear`, `isoWeek`, `weekStartDate`).
- [x] 2.3 Thread `sprintLengthWeeks` and weekly fields through `supabaseApi.ts` mappers
      (api.ts/DataContext pass objects through generically — no change needed).

## Phase 3 — Clean reset (no backfill)
- [x] 3.1 `add-sprint-length-weeks.sql` (projects column + weekly allocation columns).
- [ ] 3.2 Clear allocations + sprint-keyed collections (`sprintProjects`,
      `sprintRoleRequirements`, sprint tasks/alerts). Preserve projects/members/teams/roles.
- [ ] 3.3 Verify weekly model starts clean; app loads with empty allocations.

## Phase 4 — Shared header + screens
- [x] 4.1 Build `PeriodHeader` (Month › Week › Sprint, toggleable sprint row; table + flex modes).
- [x] 4.2 Timeline View → weekly grid + PeriodHeader (week-based columns, ISO-week lookup,
      sprint overlay toggle + length selector, week-based navigation).
- [x] 4.3 Puzzle View (ProjectMatrixView) → weekly grid with member sub-columns; Month/Week/
      Sprint header bands; ISO-week cell edit/save/delete; dropped dead month-mode; PuzzleMe
      suggestions bridged to weeks; focused-project uses its own sprint length for the overlay.
- [x] 4.4 Staff View (CapacityPlanning) → weekly periods (scoped conversion). Each period is an
      ISO week; allocations keyed by isoYear/isoWeek; multi-week create/preview, copy-forward,
      remove-future, add-member all advance by weeks; labels show Month · Week. Sprint-keyed
      ancillary collections (role requirements, comments, sprintProjects) bridged via per-week
      unique keys — deferred full re-key to a follow-up.
- [ ] 4.3 Puzzle View (ProjectMatrixView) → weekly grid + member sub-columns.
- [ ] 4.4 Staff View → weekly card columns + leveled header.
- [x] 4.5 Dashboard → weekly horizon (Current/Next/2-weeks-ahead), ISO-week allocation lookups,
      week labels; sprint-keyed collections bridged via per-week-unique keys (scoped, like Staff).
- [x] 4.6 `capacityUtils.ts` → no change needed (period-agnostic; sums percentages only).
- [x] 4.7 Allocation dialog → default span (`numberOfSprints`) initialized from the project's
      `sprintLengthWeeks` in the add-member flow; still user-editable.
- [x] 4.8 Sprint-length change confirmation (R6) added to the project edit form + selector in
      both create and edit project forms.
- [x] 4.9 CSV export converted to weekly columns.

## Phase 5 — Verify
- [ ] 5.1 Build passes; run test suite.
- [ ] 5.2 Manual check: all four screens at 1w/2w/3w + mixed-project cross view.
- [ ] 5.3 Confirm sprint-row toggle persists per user.
