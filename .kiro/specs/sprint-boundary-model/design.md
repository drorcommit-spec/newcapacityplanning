# Sprint Boundary Model — Design

## Context

All sprint grouping logic lives in `src/utils/weekUtils.ts`, a pure module (no UI, no data
access). The atomic unit is a Sunday–Saturday `WeekInfo`. Sprints are a display grouping
produced by `groupWeeksIntoSprints(weeks, sprintLengthWeeks)`. Consumers (Puzzle
`ProjectMatrixView`, Staff `CapacityPlanning`, `TimelineView`, `Dashboard`) call this and
render the resulting `Sprint[]`.

This design changes the grouping rules for 1-week and 3-week lengths, keeps 2-week as-is,
and adds a working-day calculation used for `allocationDays`.

## Current Behaviour (to be replaced)

| Length | Current rule |
|--------|-------------|
| 1 week | One sprint per week, numbered by `weekOfMonth`, resets per month. |
| 2 week | Half-month split (1–15 / 16–end), exactly 2 per month. **(keep)** |
| 3 week | Rolling chunks of 3 from the window start; number resets when a chunk *starts* in a new month. |

## Target Behaviour

| Length | New rule |
|--------|----------|
| 1 week | Month-clamped 7-day blocks: 1–7, 8–14, 15–21, 22–end. Exactly 4 per month. |
| 2 week | Half-month split (1–15 / 16–end). Exactly 2 per month. **(unchanged)** |
| 3 week | Year-anchored: Sprint 1 starts the first Sunday of the year; 3 whole Sun–Sat weeks each; consecutive numbering; last sprint of year absorbs the remainder; pre-first-Sunday days belong to previous year's last sprint. |

## Data Model Impact

- `WeekInfo` stays Sunday-anchored and unchanged. Allocations remain stored per week.
- 1-week and 2-week sprints are **date-range** groupings that may contain a partial first/last
  week (clamped to the 1st / 8th / 15th / 16th / 22nd / month-end). Because allocations are
  stored per underlying week, a month-clamped sprint references the weeks whose Sunday falls in
  its range, but the sprint's `startDate`/`endDate` are clamped to the calendar block.
- 3-week sprints always consist of whole weeks, so no clamping is needed there.

### Decision: how 1-week/2-week map weeks → date blocks

Two representations are possible for month-clamped blocks:

1. **Assign each week to a block by its Sunday's day-of-month.** Simple, matches current
   2-week code. But a week whose Sunday is the 5th (block 1–7) actually runs 5th–11th, spilling
   into block 2's range (8–14). The block's `startDate`/`endDate` would then not equal the
   union of its weeks.
2. **Clamp block boundaries to calendar dates (1/8/15/22 and 16/month-end) and attach the weeks
   that overlap the block.** The block's label/range is the calendar block; the weeks shown in
   the breakdown are the overlapping Sun–Sat weeks.

**Chosen:** Option 2 for `startDate`/`endDate` (the sprint's displayed range = the calendar
block), while the `weeks[]` attached to the sprint are the Sun–Sat weeks whose Sunday falls
within the block — consistent with today's 2-week grouping which already assigns weeks by the
Sunday's day-of-month. This keeps the existing 2-week tests green (they assert weeks by Sunday
start date) and makes 1-week symmetric with 2-week.

> Note: a week can only belong to one block because block boundaries (7/14/21) and week starts
> (Sundays) are compared by the Sunday's day-of-month. A Sunday on the 8th goes to block 2, a
> Sunday on the 7th goes to block 1. This is the same mechanism as the 2-week 1–15 / 16 rule.

## API Changes

### `groupWeeksIntoSprints(weeks, sprintLengthWeeks)` — rewritten branches

```ts
// 1-week: month-clamped 7-day blocks (1-7, 8-14, 15-21, 22-end).
// Assign each week to a block by its Sunday's day-of-month:
//   day 1-7  -> Sprint 1
//   day 8-14 -> Sprint 2
//   day 15-21-> Sprint 3
//   day 22.. -> Sprint 4
// Group consecutive weeks sharing (year, month, block); label "Sprint {block}".
```

```ts
// 2-week: UNCHANGED. Keep existing 1-15 / 16-end split.
```

```ts
// 3-week: year-anchored whole-week blocks.
// - Determine each week's Sunday.
// - Compute the "first Sunday of the week's year" as the anchor.
// - blockIndex = floor(weeksSinceAnchor / 3); sprintNumber = blockIndex + 1.
// - Group consecutive weeks sharing (anchorYear, blockIndex); label "Sprint {sprintNumber}".
// - A week whose Sunday is in Dec but that belongs (by weeksSinceAnchor of that year) to the
//   final block stays with that year; the next year's first Sunday starts Sprint 1.
```

For 3-week, "weeks since anchor" is computed from the week's own Sunday and the first Sunday of
that Sunday's calendar year, so numbering is independent of the visible window (satisfies R4.2).

### New helper: `workingDaysInRange(startISO, endISO): number`

```ts
// Count Sun-Thu days (getUTCDay() in {0,1,2,3,4}) inclusive between two ISO dates.
export function workingDaysInRange(startDate: string, endDate: string): number
```

Used to derive `allocationDays` when writing allocations, and available for capacity reports.

### New helper (1-week/2-week clamping): `clampSprintDates`

The `makeSprint` for month-clamped lengths sets `startDate`/`endDate` to the calendar block
edges (e.g. `YYYY-MM-01`..`YYYY-MM-07`) rather than the first/last week's Sun/Sat. A small
helper computes the block edges from (year, month, block, sprintLength).

## Allocation Write Path (R5)

Today (in `CapacityPlanning.tsx` and `createMultiSprintAllocations`):

```ts
allocationDays: Math.round((percentage / 100) * 10)  // flat: assumes 10-day fortnight
```

New:

```ts
// Per week: 100% of a single Sun-Thu week = 5 working days.
allocationDays: Math.round((percentage / 100) * workingDaysInWeek(week))
```

Where a full Sun–Sat week has 5 working days, but a month-clamped partial week has fewer.
Because allocations are stored per week, the per-week working-day count is what matters; the
sprint-level figure is the sum of its weeks' working days.

> This changes the `* 10` constant. Every call site that computes `allocationDays` must be
> updated. Grep for `allocationDays` and `* 10` in `CapacityPlanning.tsx` and `DataContext.tsx`.

## Affected Files

- `src/utils/weekUtils.ts` — rewrite 1-week and 3-week branches of `groupWeeksIntoSprints`;
  add `workingDaysInRange`, `workingDaysInWeek`; block-clamp `startDate`/`endDate` for
  1-week/2-week.
- `src/utils/weekUtils.test.ts` — update 1-week and 3-week expectations; add working-day tests;
  add year-boundary (3-week) and month-end (1-week) edge cases; keep 2-week tests green.
- `src/pages/CapacityPlanning.tsx` — `allocationDays` derivation in `handleAddMember`,
  `createMultiSprintAllocations`, and any staff-group write paths.
- `src/context/DataContext.tsx` — any `allocationDays` defaulting on add/update.
- Consumers reading `sprint.label` / `getSprintTitleLabel` need no change (labels still
  "Sprint N"), but visual review of Timeline/Dashboard/Puzzle/Staff is required.

## Labeling

- 1-week: "Sprint 1".."Sprint 4"; `getSprintTitleLabel` → e.g. "Aug. Sprint 3".
- 2-week: unchanged ("Sprint 1"/"Sprint 2").
- 3-week: "Sprint 1".."Sprint ~18"; `getSprintTitleLabel` uses the first week's month. Because
  a 3-week sprint can cross months, `getSprintDayRangeLabel` already falls back to
  `DD/MM - DD/MM` for cross-month sprints (keep).

## Edge Cases & Tests

1. **1-week, 31-day month (e.g. Aug 2026):** 4 sprints; Sprint 4 = 22–31 (10 days). Verify only
   4 sprints and Sprint 4 endDate = month end.
2. **1-week, February non-leap (28 days):** Sprint 4 = 22–28. Leap (29): Sprint 4 = 22–29.
3. **1-week never crosses month:** a week straddling month-end still assigned by its Sunday;
   assert no sprint contains weeks from two months in its clamped range. (Because assignment is
   by Sunday day-of-month, the final week whose Sunday is ≤ month end belongs to that month.)
4. **2-week regression:** existing tests must pass unchanged.
5. **3-week, first Sunday of year:** for a known year, assert Sprint 1 starts on the first
   Sunday and each sprint is 3 weeks until the last.
6. **3-week, year boundary:** the last sprint of year N absorbs the remainder; the first Sunday
   of year N+1 starts Sprint 1; days before that first Sunday belong to year N's last sprint.
7. **3-week, leap vs non-leap final sprint length** derived correctly (1–2 weeks).
8. **workingDaysInRange:** a full Sun–Sat week = 5; a 3-day block Wed–Fri = 3 (Wed, Thu working;
   Fri not) = 2; assert Fri/Sat excluded.
9. **allocationDays:** 100% on a full week = 5; 50% = round(2.5) = 3 (document rounding); 100%
   on a 2-working-day partial = 2.

## Rollout / Risk

- Pure-function change first (weekUtils + tests), verified via `npm run test`.
- Then update `allocationDays` write paths; verify via tests + manual smoke in the running dev
  server (Puzzle add, Staff add, weekly breakdown save).
- **Data note:** existing allocations already stored keep their historical `allocationDays`;
  this change affects newly written allocations. If a backfill is desired, that is a separate
  task (out of scope here). Flag to user before any bulk update.
- No destructive operations. No schema change.

## Sequencing (implementation tasks — to be expanded into tasks.md)

1. Add `workingDaysInRange` / `workingDaysInWeek` + unit tests.
2. Rewrite 1-week grouping + tests.
3. Rewrite 3-week grouping + tests.
4. Clamp 1-week/2-week sprint `startDate`/`endDate` to calendar blocks + tests.
5. Update `allocationDays` write paths.
6. Manual smoke test across all four views at each sprint length.
