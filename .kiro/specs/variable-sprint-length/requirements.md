# Variable Sprint Length — Requirements

## Summary
Allow each project to define its sprint length (1, 2, or 3 weeks, default 2). Move the
capacity model from a fixed half-month sprint (`year-month-sprint`, 2 sprints/month) to a
**week-based** model where allocations are stored per ISO week. Sprints become a display
grouping and the default span in the allocation dialog.

## Decision (locked)
- Storage model **B**: allocation percentage is stored per week. This matches the approved
  mockups where a value can vary week-to-week within a sprint.

## Functional Requirements

### R1 — Per-project sprint length
- Each project has `sprintLengthWeeks` ∈ {1, 2, 3}, default 2.
- Editable in the project form/settings.
- Used as the default number of weeks pre-selected in the allocation dialog. User may override.

### R2 — Week is the atomic unit
- Allocations are stored and rendered per week.
- A week is identified by ISO year + ISO week number (and a derived start date).
- Capacity math (%, days) is per week.

### R3 — Three-level display (Month › Week › Sprint)
- All capacity screens (Puzzle, Timeline, Staff, Dashboard) render the shared header:
  Month band, Week columns, optional Sprint row.
- The Sprint row is toggleable per view (default on), remembered per user.

### R4 — Sprint numbering rules
- 1-week sprint: `S1..S4`, resets each month.
- 2-week sprint: `S1..S2`, resets each month.
- 3-week sprint: consecutive `S1..N` across months, labeled with a date range.

### R5 — Week numbering within a month
- Weeks labeled `W1..W4`, with a 5th partial week getting its own `W5` column.

### R6 — Changing sprint length
- Changing a project's sprint length affects only future allocation defaults.
- Existing weekly allocations are unaffected (a length change never rewrites stored week values).
- Show a brief confirmation stating this.

### R7 — Mixed sprint lengths across projects
- Because storage is weekly, cross-project views (Staff, Dashboard) work without conflict.
- The Sprint row follows each project's own length; the week grid is universal.

## Non-Functional Requirements
- N1 — Existing allocation data must be migrated without loss (see design: backfill).
- N2 — A reversible backup is taken before migration.
- N3 — Views must handle a full quarter of 1-week sprints (~13 columns) via horizontal scroll.

## Out of Scope
- Per-user or org-level sprint length (per-project only).
- Changing capacity threshold logic or KPI definitions.

## Resolved Decisions
- OQ1 — A month's 5th partial week gets its own `W5` column (no data loss, simplest).
- OQ2 — No data migration/backfill. Existing production allocation data will be **erased** and
  re-entered on the new weekly model (user-authorized). This removes the split-mapping problem.
