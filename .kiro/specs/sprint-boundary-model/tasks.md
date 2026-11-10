# Implementation Plan

- [-] 1. Add working-day helpers to weekUtils

  - Add `workingDaysInRange(startISO, endISO)` counting Sun–Thu days inclusive
  - Add `workingDaysInWeek(week)` deriving from the week's own date range
  - _Requirements: R5.2, R5.3_

- [ ] 1.1 Add unit tests for working-day helpers*
  - Full Sun–Sat week = 5; Fri/Sat excluded; partial ranges counted correctly
  - _Requirements: R5.2, R5.3_



- [ ] 2. Rewrite 1-week grouping to month-clamped 7-day blocks
  - Assign each week to a block by its Sunday's day-of-month (1–7, 8–14, 15–21, 22–end)
  - Group consecutive weeks sharing (year, month, block); label "Sprint {block}"
  - Clamp sprint `startDate`/`endDate` to the calendar block edges
  - _Requirements: R1.1, R1.2, R1.3, R1.4, R1.5, R4.2_


- [x] 2.1 Update/add 1-week tests

  - 31-day month = 4 sprints, Sprint 4 = 22–end; Feb non-leap/leap; mid-window numbering
  - _Requirements: R1.1, R1.2, R1.3, R1.4_


- [ ] 3. Rewrite 3-week grouping to year-anchored whole-week blocks
  - Anchor Sprint 1 to the first Sunday of the week's year; blockIndex = floor(weeksSinceAnchor/3)

  - Consecutive numbering; last sprint of year absorbs remainder; pre-first-Sunday days join prior year's last sprint


  - _Requirements: R3.1, R3.2, R3.3, R3.4, R3.5, R3.6, R3.7, R4.2_

- [ ] 3.1 Update/add 3-week tests
  - First-Sunday start; 3 whole weeks each; year-boundary absorption; leap vs non-leap final sprint

  - _Requirements: R3.1, R3.2, R3.5, R3.6_

- [ ] 4. Clamp 2-week sprint display dates to calendar blocks
  - Keep existing 1–15 / 16–end assignment; set `startDate`/`endDate` to block edges for label consistency


  - Confirm existing 2-week tests still pass
  - _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5_


- [ ] 5. Derive allocationDays from working days in write paths
  - Replace flat `%/100 * 10` with `%/100 * workingDaysInWeek(week)` in `CapacityPlanning.tsx`
  - Update `createMultiSprintAllocations` and staff-group write paths; check `DataContext.tsx` defaults
  - _Requirements: R5.1, R5.2, R5.3, R5.4_

- [ ] 6. Verify and smoke test
  - Run `npm run test`; fix regressions; confirm no diagnostics
  - Manual smoke: Puzzle add, Staff add, weekly breakdown save at each sprint length
  - _Requirements: R4.1, R4.3, R6.1, R6.2, R6.3_
