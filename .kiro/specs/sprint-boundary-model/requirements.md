# Sprint Boundary Model — Requirements

## Overview

Redefine how weeks are grouped into sprints for the three supported sprint lengths
(1 week, 2 weeks, 3 weeks) so the boundaries are predictable, consistent, and aligned to
the organisation's Sunday–Thursday work week. This replaces the current mix of anchoring
rules (`weekOfMonth`-based for 1-week, half-month for 2-week, rolling-chunk for 3-week) in
`src/utils/weekUtils.ts`.

## Work Week Definition

- **Working days:** Sunday, Monday, Tuesday, Wednesday, Thursday (5 days max per week).
- **Non-working days:** Friday, Saturday.
- Capacity is measured in working days. A sprint's capacity depends on the number of
  Sun–Thu days that fall within its date range.

## Glossary

- **Week:** a Sunday–Saturday span (unchanged from today).
- **Sprint:** a display grouping over one or more consecutive weeks, sized by the selected
  sprint length.
- **Sprint length:** user-selectable, one of 1 / 2 / 3 weeks (shared across Puzzle, Staff,
  and Timeline views via `localStorage` key `capacitySprintLength`).
- **Working days in a sprint:** count of Sun–Thu calendar days within the sprint's start/end
  date range.

## Requirements

### R1 — 1-week sprints are fixed 7-day, month-clamped blocks

**User Story:** As a planner, I want 1-week sprints to divide each month into four fixed
blocks so that sprint boundaries are predictable and never cross a month.

#### Acceptance Criteria

1. WHEN sprint length is 1 week THEN each month SHALL be split into exactly 4 sprints.
2. Sprint boundaries within a month SHALL be:
   - Sprint 1: 1st – 7th
   - Sprint 2: 8th – 14th
   - Sprint 3: 15th – 21st
   - Sprint 4: 22nd – last day of month (28/29/30/31)
3. WHEN a month has 29, 30, or 31 days THEN Sprint 4 SHALL absorb the remainder (8–10 calendar
   days) rather than creating a 5th sprint.
4. A 1-week sprint SHALL NEVER cross a month boundary.
5. Sprint numbering SHALL reset to 1 on the 1st of each month.
6. A sprint's working-day count SHALL be the number of Sun–Thu days within its date range and
   MAY differ between sprints (e.g. Sprint 4 in a 31-day month can have more working days than
   Sprint 1).

### R2 — 2-week sprints are half-month, month-clamped blocks

**User Story:** As a planner, I want 2-week sprints to split each month into two halves so
that behaviour matches the existing (and expected) half-month convention.

#### Acceptance Criteria

1. WHEN sprint length is 2 weeks THEN each month SHALL be split into exactly 2 sprints.
2. Sprint boundaries within a month SHALL be:
   - Sprint 1: 1st – 15th
   - Sprint 2: 16th – last day of month
3. A 2-week sprint SHALL NEVER cross a month boundary.
4. Sprint numbering SHALL reset to 1 on the 1st of each month.
5. This preserves current behaviour; existing 2-week tests SHALL continue to pass.

### R3 — 3-week sprints are year-anchored, whole-week blocks

**User Story:** As a planner, I want 3-week sprints to run in consecutive 3-week cycles across
the year so that longer iterations are supported without partial weeks inside a sprint.

#### Acceptance Criteria

1. WHEN sprint length is 3 weeks THEN Sprint 1 of a year SHALL start on the first Sunday of
   that year.
2. Each 3-week sprint SHALL consist of exactly 3 whole Sunday–Saturday weeks (21 days), except
   the last sprint of the year.
3. Sprint numbering SHALL be consecutive from the first Sunday of the year (Sprint 1, 2, 3, …)
   and SHALL reset to 1 at the first Sunday of the next year.
4. A 3-week sprint MAY cross month boundaries.
5. The final sprint of a year SHALL absorb any leftover weeks (typically 1–2 whole weeks), so
   it can be shorter than 3 weeks.
6. Days at the start of a calendar year that fall before the year's first Sunday SHALL belong
   to the previous year's final sprint (they are the tail of a Sun–Sat week that started in
   December). No day SHALL be orphaned.
7. Every 3-week sprint SHALL start on a Sunday (invariant required by the weekly breakdown
   editor).

### R4 — Consistent invariants across all lengths

#### Acceptance Criteria

1. Every sprint SHALL start on a boundary the weekly breakdown editor can render:
   - 1-week & 2-week: the sprint's first week may be a month-clamped partial week (starts on
     the 1st / 16th / 8th / 15th / 22nd) — see R6.
   - 3-week: always starts on a Sunday.
2. Sprint numbering SHALL be derived from the sprint's own start date, not from its position
   in a rolling/visible window (regression protection — see existing mid-window tests).
3. No allocation day SHALL fall outside exactly one sprint.

### R5 — Capacity scaling by working days

**User Story:** As a planner, I want a sprint's capacity to reflect its actual working days so
that partial or longer sprints report honest person-day numbers.

#### Acceptance Criteria

1. The user SHALL continue to enter allocation as a flat percentage (0–100), unchanged in the UI.
2. WHEN an allocation is saved THEN `allocationDays` SHALL be derived from the sprint's actual
   Sun–Thu working-day count, not a fixed constant.
3. WHEN a sprint has fewer working days (e.g. a short month-end block) THEN its 100% allocation
   SHALL represent proportionally fewer person-days.
4. Aggregation and reporting SHALL sum working days per calendar month based on the per-week
   records (allocations remain stored per week).

### R6 — Weekly breakdown compatibility

**User Story:** As a planner, I want the weekly breakdown editor to keep working for every
sprint length so I can set per-week percentages.

#### Acceptance Criteria

1. WHEN a sprint spans more than one week THEN the weekly breakdown checkbox SHALL be available
   (Puzzle View `WeekSpanEditor` and Staff View Add Member modal), unchanged in trigger logic.
2. WHEN a 1-week or 2-week sprint's first or last week is a month-clamped partial week THEN the
   editor SHALL display that partial week with its actual date range.
3. Per-week values entered in the editor SHALL be stored on the underlying week records
   unchanged.

## Non-Goals

- Changing the underlying storage model (allocations remain keyed per Sunday-anchored week).
- Changing the 2-week behaviour (kept as-is).
- Adding a "1 month" sprint length (decided against in favour of the 3-week year-anchored model).
- Changing the UI controls or labels beyond what the new boundaries require.

## Open Edge Cases (resolved)

- **Leap years:** the 3-week year's final sprint length is derived (not hard-coded); it varies
  with the number of Sundays in the year (52 vs 53 weeks).
- **Month-end short blocks (1-week):** absorbed into Sprint 4, never a 5th sprint.
- **Pre-first-Sunday days (3-week):** belong to the previous year's final sprint.
