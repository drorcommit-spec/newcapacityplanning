import { describe, it, expect } from 'vitest';
import {
  buildWeek,
  getWeeksInRange,
  groupWeeksIntoSprints,
  firstWeekOfCurrentSprint,
  getSprintLabel,
  getSprintTitleLabel,
  getSprintDayRangeLabel,
  weekKey,
  getWeekLabel,
  formatDDMM,
  getWeekDateRangeLabel,
  aggregateWeeklyValues,
  workingDaysInRange,
  workingDaysInWeek,
} from './weekUtils';

// Helper: build a UTC date.
function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}

// August 2026 reference: Aug 1 is a Saturday, so Sundays are 2, 9, 16, 23, 30 (5 weeks -> W5 case).

describe('buildWeek', () => {
  it('snaps any weekday to the Sunday-Saturday span', () => {
    // 2026-08-05 is a Wednesday; its week runs Sun Aug 2 - Sat Aug 8.
    const w = buildWeek(d(2026, 8, 5));
    expect(w.startDate).toBe('2026-08-02');
    expect(w.endDate).toBe('2026-08-08');
  });

  it('computes week-numbering year and weekKey from the week\'s Sunday', () => {
    // 2026-01-01 is a Thursday; its week's Sunday is 2025-12-28, so the week belongs to 2025.
    const w = buildWeek(d(2026, 1, 1));
    expect(w.startDate).toBe('2025-12-28');
    expect(w.isoYear).toBe(2025);
    expect(weekKey(w)).toBe(`2025-W${String(w.isoWeek).padStart(2, '0')}`);
  });
});

describe('getWeeksInRange', () => {
  it('returns consecutive Sundays across a month', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 30));
    expect(weeks.map(w => w.startDate)).toEqual([
      '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30',
    ]);
  });

  it('snaps a mid-week start back to its Sunday', () => {
    // Aug 5 2026 is a Wednesday; its week starts Sun Aug 2.
    const weeks = getWeeksInRange(d(2026, 8, 5), d(2026, 8, 8));
    expect(weeks[0].startDate).toBe('2026-08-02');
  });

  it('assigns weekOfMonth ordinals including a 5th week', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 30));
    expect(weeks.map(getWeekLabel)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5']);
  });
});

describe('date formatting', () => {
  it('formats an ISO date as DD/MM', () => {
    expect(formatDDMM('2026-08-02')).toBe('02/08');
    expect(formatDDMM('2026-01-31')).toBe('31/01');
  });

  it('builds a DD/MM - DD/MM week range label', () => {
    const w = buildWeek(d(2026, 8, 5));
    expect(getWeekDateRangeLabel(w)).toBe('02/08 - 08/08');
  });
});

describe('groupWeeksIntoSprints — 1 week', () => {
  it('splits each month into exactly 4 month-clamped blocks (1-7, 8-14, 15-21, 22-end)', () => {
    // Aug 2026 Sundays: 2, 9, 16, 23, 30. By Sunday day-of-month:
    //   2 -> block1, 9 -> block2, 16 -> block3, 23 & 30 -> block4 (day >= 22).
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 30));
    const sprints = groupWeeksIntoSprints(weeks, 1);
    expect(sprints.map(s => s.label)).toEqual(['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4']);
    // Block 4 absorbs the month-end remainder (weeks starting 23 and 30).
    expect(sprints[3].weeks.map(w => w.startDate)).toEqual(['2026-08-23', '2026-08-30']);
  });

  it('clamps sprint display dates to the calendar block edges; Sprint 4 ends on month-end', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 30));
    const sprints = groupWeeksIntoSprints(weeks, 1);
    expect([sprints[0].startDate, sprints[0].endDate]).toEqual(['2026-08-01', '2026-08-07']);
    expect([sprints[1].startDate, sprints[1].endDate]).toEqual(['2026-08-08', '2026-08-14']);
    expect([sprints[2].startDate, sprints[2].endDate]).toEqual(['2026-08-15', '2026-08-21']);
    expect([sprints[3].startDate, sprints[3].endDate]).toEqual(['2026-08-22', '2026-08-31']);
  });

  it('Sprint 4 ends on the last day of a short month (Feb non-leap = 28, leap = 29)', () => {
    // Feb 2026 (non-leap): last day 28. Feb 2028 (leap): last day 29.
    const feb2026 = groupWeeksIntoSprints(getWeeksInRange(d(2026, 2, 1), d(2026, 2, 28)), 1);
    expect(feb2026[feb2026.length - 1].endDate).toBe('2026-02-28');
    const feb2028 = groupWeeksIntoSprints(getWeeksInRange(d(2028, 2, 1), d(2028, 2, 29)), 1);
    expect(feb2028[feb2028.length - 1].endDate).toBe('2028-02-29');
  });

  it('never crosses a month and resets to Sprint 1 in the next month', () => {
    const weeks = getWeeksInRange(d(2026, 8, 23), d(2026, 9, 13));
    const sprints = groupWeeksIntoSprints(weeks, 1);
    // First visible block is August's block 4 (Aug 23 has day 23 >= 22).
    expect(sprints[0].label).toBe('Sprint 4');
    // September's first week resets to Sprint 1.
    const firstSeptemberIdx = sprints.findIndex(s => s.weeks[0].month === 9);
    expect(sprints[firstSeptemberIdx].label).toBe('Sprint 1');
    // No sprint mixes two months.
    expect(sprints.every(s => new Set(s.weeks.map(w => w.month)).size === 1)).toBe(true);
  });
});

describe('groupWeeksIntoSprints — 2 weeks', () => {
  it('always produces exactly 2 sprints per month, split 1st-15th / 16th-end', () => {
    // August 2026 has 5 Sundays (2,9,16,23,30) — a naive "2 weeks per chunk" grouping would
    // produce 3 sprints. The fixed business rule must still yield exactly 2.
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 30));
    const sprints = groupWeeksIntoSprints(weeks, 2);
    expect(sprints.map(s => s.label)).toEqual(['Sprint 1', 'Sprint 2']);
    // Sprint 1 = weeks starting on/before the 15th (Aug 2, Aug 9).
    expect(sprints[0].weeks.map(w => w.startDate)).toEqual(['2026-08-02', '2026-08-09']);
    // Sprint 2 = weeks starting on/after the 16th (Aug 16, 23, 30) — 3 weeks this month.
    expect(sprints[1].weeks.map(w => w.startDate)).toEqual(['2026-08-16', '2026-08-23', '2026-08-30']);
  });

  it('resets to Sprint 1 at the start of the next month', () => {
    const weeks = getWeeksInRange(d(2026, 8, 16), d(2026, 9, 13));
    const sprints = groupWeeksIntoSprints(weeks, 2);
    const firstSeptemberIdx = sprints.findIndex(s => s.weeks[0].month === 9);
    expect(sprints[firstSeptemberIdx].label).toBe('Sprint 1');
  });

  it('numbers correctly even when the visible window starts mid-month', () => {
    // Window starts Aug 16 (already in the 2nd half), so the first visible sprint must be
    // labeled "Sprint 2", not "Sprint 1" just because it's first in the slice.
    const weeks = getWeeksInRange(d(2026, 8, 16), d(2026, 8, 30));
    const sprints = groupWeeksIntoSprints(weeks, 2);
    expect(sprints[0].label).toBe('Sprint 2');
  });
});

describe('groupWeeksIntoSprints — 3 weeks', () => {
  it('starts Sprint 1 on the first Sunday of the year and runs 3 whole weeks per sprint', () => {
    // 2026: Jan 1 is a Thursday, so the first Sunday is Jan 4.
    const fullYear = groupWeeksIntoSprints(getWeeksInRange(d(2026, 1, 4), d(2026, 12, 26)), 3);
    expect(fullYear[0].label).toBe('Sprint 1');
    expect(fullYear[0].weeks[0].startDate).toBe('2026-01-04');
    // Every sprint except the last consists of exactly 3 whole weeks.
    for (let i = 0; i < fullYear.length - 1; i++) {
      expect(fullYear[i].weeks.length).toBe(3);
    }
  });

  it('numbers consecutively across months (a 3-week sprint may cross a month boundary)', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 9, 6));
    const sprints = groupWeeksIntoSprints(weeks, 3);
    // Consecutive labels, no per-month reset.
    const nums = sprints.map(s => parseInt(s.label.replace('Sprint ', ''), 10));
    expect(nums[1]).toBe(nums[0] + 1);
    // At least one sprint spans two calendar months.
    expect(sprints.some(s => new Set(s.weeks.map(w => w.month)).size > 1)).toBe(true);
  });

  it('is independent of the visible window (same week -> same sprint number)', () => {
    const wide = groupWeeksIntoSprints(getWeeksInRange(d(2026, 1, 4), d(2026, 9, 6)), 3);
    const narrow = groupWeeksIntoSprints(getWeeksInRange(d(2026, 8, 2), d(2026, 9, 6)), 3);
    const wideAug2 = wide.find(s => s.weeks.some(w => w.startDate === '2026-08-02'));
    const narrowAug2 = narrow.find(s => s.weeks.some(w => w.startDate === '2026-08-02'));
    expect(narrowAug2?.label).toBe(wideAug2?.label);
  });

  it('resets to Sprint 1 at the first Sunday of the next year', () => {
    // 2027: Jan 1 is a Friday, first Sunday is Jan 3.
    const crossYear = groupWeeksIntoSprints(getWeeksInRange(d(2026, 12, 6), d(2027, 1, 24)), 3);
    const firstOf2027 = crossYear.find(s => s.weeks[0].startDate === '2027-01-03');
    expect(firstOf2027?.label).toBe('Sprint 1');
  });
});

describe('getSprintLabel', () => {
  it('returns the plain "Sprint N" label regardless of length', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 15));
    const s1 = groupWeeksIntoSprints(weeks, 2)[0];
    expect(getSprintLabel(s1, 2)).toBe('Sprint 1');
  });
});

describe('getSprintTitleLabel', () => {
  it('uses "[Month name] [from]-[to] [year]", e.g. "August 01-15 2026"', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 15));
    const s1 = groupWeeksIntoSprints(weeks, 2)[0];
    // 2-week model clamps Sprint 1 to the 1st–15th.
    expect(getSprintTitleLabel(s1)).toBe('August 01-15 2026');
  });

  it('shows both months (with year) when a sprint crosses a calendar month', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 9, 6));
    const crossing = groupWeeksIntoSprints(weeks, 3)[1];
    expect(getSprintTitleLabel(crossing)).toMatch(/^[A-Z][a-z]+ \d{2} - [A-Z][a-z]+ \d{2} \d{4}$/);
  });
});

describe('getSprintDayRangeLabel', () => {
  it('returns the plain sprint number label, e.g. "Sprint 1"', () => {
    const weeks = getWeeksInRange(d(2026, 8, 2), d(2026, 8, 15));
    const sprints = groupWeeksIntoSprints(weeks, 2);
    expect(getSprintDayRangeLabel(sprints[0])).toBe('Sprint 1');
  });
});

describe('aggregateWeeklyValues', () => {
  it('returns the average and varies=false when all weeks match', () => {
    const result = aggregateWeeklyValues([50, 50]);
    expect(result.average).toBe(50);
    expect(result.varies).toBe(false);
  });

  it('returns the rounded average and varies=true when weeks differ', () => {
    const result = aggregateWeeklyValues([80, 50]);
    expect(result.average).toBe(65);
    expect(result.varies).toBe(true);
  });

  it('handles an empty list', () => {
    const result = aggregateWeeklyValues([]);
    expect(result.average).toBe(0);
    expect(result.varies).toBe(false);
  });
});

describe('workingDaysInRange / workingDaysInWeek', () => {
  it('counts a full Sun-Sat week as 5 working days (Fri/Sat excluded)', () => {
    // Aug 2-8 2026 is Sun..Sat.
    expect(workingDaysInRange('2026-08-02', '2026-08-08')).toBe(5);
    const w = buildWeek(d(2026, 8, 5));
    expect(workingDaysInWeek(w)).toBe(5);
  });

  it('excludes Friday and Saturday from a partial range', () => {
    // Aug 7 (Fri) - Aug 8 (Sat): zero working days.
    expect(workingDaysInRange('2026-08-07', '2026-08-08')).toBe(0);
    // Aug 5 (Wed) - Aug 6 (Thu): two working days.
    expect(workingDaysInRange('2026-08-05', '2026-08-06')).toBe(2);
  });

  it('returns 0 when end precedes start', () => {
    expect(workingDaysInRange('2026-08-08', '2026-08-02')).toBe(0);
  });
});

describe('firstWeekOfCurrentSprint', () => {
  // Helper: the sprint (display range) that a given first-week belongs to, for the 2w model.
  function sprintDisplayRange(firstWeek: ReturnType<typeof buildWeek>) {
    const [g] = groupWeeksIntoSprints(getWeeksInRange(
      new Date(firstWeek.startDate + 'T00:00:00Z'),
      new Date(firstWeek.startDate + 'T00:00:00Z')
    ), 2);
    return g;
  }

  it('2w model: for a date past the 15th, returns the first week of the 16-end sprint', () => {
    // 2026-09-19 is past the 15th, so the current sprint is Sep 16-30 (Sprint 2), whose
    // first week's Sunday is Sep 20. The week of Sep 13 (Sunday <=15) belongs to Sprint 1
    // and must NOT lead the view.
    const w = firstWeekOfCurrentSprint(2, d(2026, 9, 19));
    const range = sprintDisplayRange(w);
    expect(range.startDate).toBe('2026-09-16');
    expect(range.endDate).toBe('2026-09-30');
  });

  it('2w model: for a date on/before the 15th, returns a week in the 1-15 sprint', () => {
    // 2026-09-07 -> current sprint is Sep 1-15 (Sprint 1).
    const w = firstWeekOfCurrentSprint(2, d(2026, 9, 7));
    const range = sprintDisplayRange(w);
    expect(range.startDate).toBe('2026-09-01');
    expect(range.endDate).toBe('2026-09-15');
  });

  it('today falls within the returned sprint display range', () => {
    const now = d(2026, 9, 19);
    const first = firstWeekOfCurrentSprint(2, now);
    const range = sprintDisplayRange(first);
    expect(range.startDate <= '2026-09-19' && '2026-09-19' <= range.endDate).toBe(true);
  });
});
