// Week-based capacity engine for variable sprint length (1/2/3 weeks per sprint).
// Pure functions only — no UI, no data access. See .kiro/specs/variable-sprint-length.
//
// Model:
// - The atomic unit is a week running Sunday-Saturday (not strict ISO-8601, which is Mon-Sun).
//   This matches the product's display requirement (weeks start on Sunday).
// - A week is identified by { isoYear, isoWeek } — a custom, unique, sortable week-numbering
//   scheme anchored to Sunday. It is NOT the ISO-8601 standard; the field names are kept for
//   minimal churn since nothing outside this module depends on strict ISO semantics.
// - Sprints are a display grouping over consecutive weeks, sized by a project's sprint length.

export type SprintLengthWeeks = 1 | 2 | 3;

export interface WeekInfo {
  isoYear: number;      // week-numbering year (year of the week's Sunday)
  isoWeek: number;      // week number within that year (1..53), Sunday-anchored
  startDate: string;    // ISO date (YYYY-MM-DD), Sunday
  endDate: string;      // ISO date (YYYY-MM-DD), Saturday
  month: number;        // calendar month of the week's Sunday (1..12)
  year: number;         // calendar year of the week's Sunday
  weekOfMonth: number;  // 1..5, ordinal of this week within its calendar month (by Sunday)
}

export interface Sprint {
  label: string;        // e.g. "Sprint 1" or "Sprint 2"
  rangeLabel: string;   // e.g. "Aug 04 - 24"
  weeks: WeekInfo[];    // the weeks this sprint covers
  startDate: string;
  endDate: string;
}

export function weekKey(w: { isoYear: number; isoWeek: number }): string {
  return `${w.isoYear}-W${String(w.isoWeek).padStart(2, '0')}`;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Format an ISO date (YYYY-MM-DD) as DD/MM for display.
export function formatDDMM(isoDate: string): string {
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}`;
}

// Sunday of the week containing the given date (UTC-based to avoid TZ drift).
function sundayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  d.setUTCDate(d.getUTCDate() - day); // shift back to Sunday
  return d;
}

// Custom Sunday-anchored week-numbering year/number for a date.
// Week 1 of a year is the Sunday-Saturday week whose Sunday is on/before Jan 1 of that year.
function weekYearParts(sunday: Date): { isoYear: number; isoWeek: number } {
  const isoYear = sunday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const week1Start = sundayOf(jan1);
  const diffDays = Math.round((sunday.getTime() - week1Start.getTime()) / 86400000);
  const isoWeek = Math.floor(diffDays / 7) + 1;
  return { isoYear, isoWeek };
}

// Ordinal of a week within its calendar month, counting Sundays.
function weekOfMonthFor(sunday: Date): number {
  const month = sunday.getUTCMonth();
  const year = sunday.getUTCFullYear();
  let count = 0;
  // Walk from the first Sunday on/after the 1st of the month up to this Sunday.
  const first = new Date(Date.UTC(year, month, 1));
  let s = sundayOf(first);
  if (s.getUTCMonth() !== month) {
    // First Sunday is in the previous month; advance to the first Sunday inside this month.
    s.setUTCDate(s.getUTCDate() + 7);
  }
  while (s.getTime() <= sunday.getTime() && s.getUTCMonth() === month) {
    count++;
    s.setUTCDate(s.getUTCDate() + 7);
  }
  return count === 0 ? 1 : count;
}

export function buildWeek(anyDayInWeek: Date): WeekInfo {
  const start = sundayOf(anyDayInWeek);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const { isoYear, isoWeek } = weekYearParts(start);
  return {
    isoYear,
    isoWeek,
    startDate: toISODate(start),
    endDate: toISODate(end),
    month: start.getUTCMonth() + 1,
    year: start.getUTCFullYear(),
    weekOfMonth: weekOfMonthFor(start),
  };
}

// All weeks whose Sunday falls within [start, end] inclusive.
export function getWeeksInRange(start: Date, end: Date): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  let cur = sundayOf(start);
  const endSunday = sundayOf(end);
  while (cur.getTime() <= endSunday.getTime()) {
    weeks.push(buildWeek(cur));
    const next = new Date(cur);
    next.setUTCDate(next.getUTCDate() + 7);
    cur = next;
  }
  return weeks;
}

export function getCurrentWeek(now: Date = new Date()): WeekInfo {
  return buildWeek(now);
}

// First week of the sprint that currently contains `now`, honoring the same sprint-boundary
// rules as groupWeeksIntoSprints. Capacity views start their visible window here so the
// leading column is always the *current* sprint (not a partially-elapsed previous sprint,
// which happens if you naively start from the current week's Sunday).
export function firstWeekOfCurrentSprint(
  sprintLengthWeeks: SprintLengthWeeks,
  now: Date = new Date()
): WeekInfo {
  const todayISO = toISODate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  // Look back/forward enough to fully contain the sprint that today's calendar date falls in
  // (max sprint span is ~5-6 weeks for the month-anchored 3-week model), then pick the group
  // whose displayed date range (which is clamped to the sprint boundary, e.g. 1-15 / 16-end
  // for the 2-week model) contains today's calendar date. This matches the sprint a user
  // considers "current" by the day of the month, rather than the week's Sunday — so a week
  // that straddles the boundary is not pulled into the earlier, mostly-elapsed sprint.
  const lookbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 7 * 6);
  const lookaheadEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  lookaheadEnd.setUTCDate(lookaheadEnd.getUTCDate() + 7 * 6);

  const weeks = getWeeksInRange(lookbackStart, lookaheadEnd);
  const groups = groupWeeksIntoSprints(weeks, sprintLengthWeeks);
  // Prefer the sprint whose clamped display range contains today's date.
  const byDisplayRange = groups.find(g => g.startDate <= todayISO && todayISO <= g.endDate);
  if (byDisplayRange && byDisplayRange.weeks.length > 0) return byDisplayRange.weeks[0];
  // Fallback: the first sprint that starts on/after today (if today sits in a display gap).
  const upcoming = groups.find(g => g.startDate >= todayISO);
  if (upcoming && upcoming.weeks.length > 0) return upcoming.weeks[0];
  return buildWeek(now);
}

// Number of working days (Sun–Thu) between two ISO dates (YYYY-MM-DD), inclusive.
// Friday (getUTCDay()===5) and Saturday (6) are non-working and excluded.
export function workingDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  if (end.getTime() < start.getTime()) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    const day = cur.getUTCDay(); // 0=Sun..6=Sat
    if (day >= 0 && day <= 4) count++; // Sun..Thu
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// Working days (Sun–Thu) within a single week's date range. A full Sun–Sat week = 5.
export function workingDaysInWeek(w: WeekInfo): number {
  return workingDaysInRange(w.startDate, w.endDate);
}

// Week label as shown in the Week band, e.g. "W3".
export function getWeekLabel(w: WeekInfo): string {
  return `W${w.weekOfMonth}`;
}

// DD/MM date range for a week, e.g. "02/08 - 08/08".
export function getWeekDateRangeLabel(w: WeekInfo): string {
  return `${formatDDMM(w.startDate)} - ${formatDDMM(w.endDate)}`;
}

// Combined Month + Week label for the space-saving header variant, e.g. "Aug 2026 · W2".
// DD-DD is shown separately as the date range (both days of month, no repeated month).
export function getMonthWeekLabel(w: WeekInfo): string {
  return `${MONTH_ABBR[w.month - 1]} ${w.year} · ${getWeekLabel(w)}`;
}

// Day-only DD range for a week within the same month, e.g. "09-13" (falls back to
// DD/MM - DD/MM if the week spans two months).
export function getWeekDayRangeLabel(w: WeekInfo): string {
  const startMonth = w.startDate.slice(5, 7);
  const endMonth = w.endDate.slice(5, 7);
  const startDay = w.startDate.slice(8, 10);
  const endDay = w.endDate.slice(8, 10);
  return startMonth === endMonth ? `${startDay}-${endDay}` : getWeekDateRangeLabel(w);
}

function rangeLabel(weeks: WeekInfo[]): string {
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const startM = MONTH_ABBR[(first.month - 1)];
  const startD = first.startDate.slice(8, 10);
  const endM = MONTH_ABBR[(last.month - 1)];
  const endD = last.endDate.slice(8, 10);
  return startM === endM ? `${startM} ${startD} - ${endD}` : `${startM} ${startD} - ${endM} ${endD}`;
}

// Group consecutive weeks into sprints and apply numbering rules (R4):
// - 1w: Sprint 1..4/5 resetting each month, one sprint per week (by absolute weekOfMonth).
// - 2w: fixed business rule — every month has EXACTLY 2 sprints: Sprint 1 covers the 1st
//   through the 15th, Sprint 2 covers the 16th through the end of the month. A week is
//   assigned to whichever half contains its Sunday (start date). This is NOT a generic
//   "2 weeks per chunk" grouping — a calendar month can have 4 or 5 Sundays, and chunking
//   by count would sometimes produce 3 sprints in a month. The fixed 1-15 / 16-end split
//   guarantees exactly 2, matching the legacy half-month sprint definition.
// - 3w: numbered Sprint 1, 2, 3... within a month, resetting to 1 for the first sprint whose
//   *start* date falls in a new calendar month — even if the previous sprint's 3 weeks ran
//   past the month boundary. E.g. if a sprint starts Sep 21 and spans into October, and the
//   next sprint starts Oct 12 (still no other Sprint 1 started in October yet), that next
//   sprint resets to "Sprint 1" because it's the first one to *start* in October.
export function groupWeeksIntoSprints(weeks: WeekInfo[], sprintLengthWeeks: SprintLengthWeeks): Sprint[] {
  const sprints: Sprint[] = [];
  if (weeks.length === 0) return sprints;

  if (sprintLengthWeeks === 3) {
    // Year-anchored whole-week blocks. Sprint 1 of a year starts on the FIRST SUNDAY of that
    // year; each sprint is 3 whole Sun–Sat weeks. Numbering is consecutive from that anchor and
    // resets to 1 at the next year's first Sunday. A sprint may cross months. The final sprint
    // of a year absorbs any leftover weeks (so it can be 1–2 weeks). Numbering is derived from
    // each week's own Sunday relative to its year's first Sunday, so it is independent of the
    // visible window.
    //
    // Group by (anchorYear, blockIndex) where blockIndex = floor(weeksSinceFirstSunday / 3).
    let i = 0;
    while (i < weeks.length) {
      const anchorYear = weeks[i].isoYear;
      const block = threeWeekBlockIndex(weeks[i]);
      const chunk: WeekInfo[] = [];
      while (
        i < weeks.length &&
        weeks[i].isoYear === anchorYear &&
        threeWeekBlockIndex(weeks[i]) === block
      ) {
        chunk.push(weeks[i]);
        i++;
      }
      sprints.push(makeSprint(`Sprint ${block + 1}`, chunk));
    }
    return sprints;
  }

  if (sprintLengthWeeks === 2) {
    let i = 0;
    while (i < weeks.length) {
      const month = weeks[i].month;
      const year = weeks[i].year;
      const half = parseInt(weeks[i].startDate.slice(8, 10), 10) <= 15 ? 1 : 2;
      const chunk: WeekInfo[] = [];
      while (
        i < weeks.length &&
        weeks[i].month === month &&
        weeks[i].year === year &&
        (parseInt(weeks[i].startDate.slice(8, 10), 10) <= 15 ? 1 : 2) === half
      ) {
        chunk.push(weeks[i]);
        i++;
      }
      // Clamp display dates to the half-month block edges: Sprint 1 = 1st–15th, Sprint 2 =
      // 16th–month-end. Weeks are still assigned by their Sunday's day-of-month (unchanged).
      const startDate = `${year}-${pad(month)}-${half === 1 ? '01' : '16'}`;
      const endDate = `${year}-${pad(month)}-${half === 1 ? '15' : pad(lastDayOfMonth(year, month))}`;
      sprints.push(makeSprint(`Sprint ${half}`, chunk, startDate, endDate));
    }
    return sprints;
  }

  // 1w: month-clamped 7-day blocks. Every month is split into EXACTLY 4 sprints by the
  // day-of-month of each week's Sunday (start date):
  //   day 1–7   -> Sprint 1
  //   day 8–14  -> Sprint 2
  //   day 15–21 -> Sprint 3
  //   day 22..  -> Sprint 4 (absorbs the month-end remainder, 8–10 days)
  // A 1-week sprint never crosses a month (weeks are assigned by their Sunday's month), and
  // numbering resets to 1 each month. The sprint's displayed date range is clamped to the
  // calendar block edges (1/8/15/22 .. 7/14/21/month-end), independent of the visible window.
  let i = 0;
  while (i < weeks.length) {
    const month = weeks[i].month;
    const year = weeks[i].year;
    const block = oneWeekBlock(parseInt(weeks[i].startDate.slice(8, 10), 10));
    const chunk: WeekInfo[] = [];
    while (
      i < weeks.length &&
      weeks[i].month === month &&
      weeks[i].year === year &&
      oneWeekBlock(parseInt(weeks[i].startDate.slice(8, 10), 10)) === block
    ) {
      chunk.push(weeks[i]);
      i++;
    }
    const { startDate, endDate } = oneWeekBlockDates(year, month, block);
    sprints.push(makeSprint(`Sprint ${block}`, chunk, startDate, endDate));
  }
  return sprints;
}

// 3-week block index (0-based) for a week: how many whole 3-week groups its Sunday is past the
// first Sunday of its year. The "first Sunday of the year" is the first Sunday on/after Jan 1.
// Weeks whose Sunday is in late December (before that first Sunday, i.e. the tail week of the
// prior year) get a negative offset that floors into the previous group — but because such a
// week's isoYear is the prior calendar year (its Sunday is in December), it is grouped with the
// prior year's final sprint, satisfying R3.6. Within a year the offset is always >= 0.
function firstSundayOfYear(year: number): Date {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const day = jan1.getUTCDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? 0 : 7 - day;
  jan1.setUTCDate(jan1.getUTCDate() + offset);
  return jan1;
}

function threeWeekBlockIndex(w: WeekInfo): number {
  const sunday = new Date(w.startDate + 'T00:00:00Z');
  const anchor = firstSundayOfYear(w.isoYear);
  const diffWeeks = Math.round((sunday.getTime() - anchor.getTime()) / (7 * 86400000));
  return Math.floor(diffWeeks / 3);
}

// Map a day-of-month to its 1-week sprint block (1–4). Block 4 absorbs days 22..end.
function oneWeekBlock(day: number): number {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

// Calendar-block start/end dates for a 1-week sprint block within a month.
// Block 4 always ends on the last day of the month.
function oneWeekBlockDates(year: number, month: number, block: number): { startDate: string; endDate: string } {
  const startDay = [1, 8, 15, 22][block - 1];
  const endDay = block < 4 ? startDay + 6 : lastDayOfMonth(year, month);
  return {
    startDate: `${year}-${pad(month)}-${pad(startDay)}`,
    endDate: `${year}-${pad(month)}-${pad(endDay)}`,
  };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Build a Sprint. For month-clamped lengths (1-week, 2-week) the caller passes explicit
// startDate/endDate = the calendar block edges; otherwise the span defaults to the first
// week's Sunday .. last week's Saturday.
function makeSprint(label: string, weeks: WeekInfo[], startDate?: string, endDate?: string): Sprint {
  return {
    label,
    rangeLabel: rangeLabel(weeks),
    weeks,
    startDate: startDate ?? weeks[0].startDate,
    endDate: endDate ?? weeks[weeks.length - 1].endDate,
  };
}

// Plain sprint label, e.g. "Sprint 1". The sprintLengthWeeks parameter is kept for call-site
// compatibility but no longer changes the output — date context is shown separately via
// getSprintTitleLabel/getSprintDayRangeLabel so every sprint length renders consistently.
export function getSprintLabel(sprint: Sprint, _sprintLengthWeeks?: SprintLengthWeeks): string {
  return sprint.label;
}

// Dominant sprint title using the convention "[Month name] [from]-[to] [year]",
// e.g. "September 16-30 2026". When a sprint crosses a calendar month (possible for the
// 3-week model), both months are shown, e.g. "September 21 - October 11 2026".
export function getSprintTitleLabel(sprint: Sprint): string {
  const startMonthIdx = parseInt(sprint.startDate.slice(5, 7), 10) - 1;
  const endMonthIdx = parseInt(sprint.endDate.slice(5, 7), 10) - 1;
  const startDay = sprint.startDate.slice(8, 10);
  const endDay = sprint.endDate.slice(8, 10);
  const year = sprint.startDate.slice(0, 4);
  if (startMonthIdx === endMonthIdx) {
    return `${MONTH_FULL[startMonthIdx]} ${startDay}-${endDay} ${year}`;
  }
  return `${MONTH_FULL[startMonthIdx]} ${startDay} - ${MONTH_FULL[endMonthIdx]} ${endDay} ${year}`;
}

// Secondary line for a sprint header: the sprint number, e.g. "Sprint 1".
export function getSprintDayRangeLabel(sprint: Sprint): string {
  return sprint.label;
}

// Sprint date without the year, e.g. "September 16-30" (or "September 21 - October 11" when
// it crosses a calendar month). Pairs with getSprintYearLabel so the year can render smaller.
export function getSprintDateLabel(sprint: Sprint): string {
  const startMonthIdx = parseInt(sprint.startDate.slice(5, 7), 10) - 1;
  const endMonthIdx = parseInt(sprint.endDate.slice(5, 7), 10) - 1;
  const startDay = sprint.startDate.slice(8, 10);
  const endDay = sprint.endDate.slice(8, 10);
  if (startMonthIdx === endMonthIdx) {
    return `${MONTH_FULL[startMonthIdx]} ${startDay}-${endDay}`;
  }
  return `${MONTH_FULL[startMonthIdx]} ${startDay} - ${MONTH_FULL[endMonthIdx]} ${endDay}`;
}

// The sprint's year, e.g. "2026" (taken from the sprint's start date).
export function getSprintYearLabel(sprint: Sprint): string {
  return sprint.startDate.slice(0, 4);
}

// Default number of weeks pre-selected in the allocation dialog for a project.
export function getDefaultSpanWeeks(sprintLengthWeeks: SprintLengthWeeks = 2): number {
  return sprintLengthWeeks;
}

// --- Sprint-level display aggregation (week/sprint view toggle) ---

export interface WeeklyAggregate {
  average: number;   // rounded average of the values (0 for missing weeks)
  varies: boolean;    // true if not all weeks share the same value
}

// Aggregate per-week values (e.g. allocation %) into a single sprint-level summary.
// Missing/absent weeks should be passed as 0 by the caller (no allocation = 0%).
export function aggregateWeeklyValues(values: number[]): WeeklyAggregate {
  if (values.length === 0) return { average: 0, varies: false };
  const sum = values.reduce((a, b) => a + b, 0);
  const average = Math.round(sum / values.length);
  const varies = values.some(v => v !== values[0]);
  return { average, varies };
}

// --- Transition helpers (bridge weekly model with legacy year/month/sprint consumers) ---

// Derive the legacy half-month sprint key from a week, based on the week's Sunday.
// Used only to keep not-yet-converted screens (Dashboard, CapacityPlanning) roughly working
// while the migration completes.
export function legacySprintFromWeek(w: WeekInfo): { year: number; month: number; sprint: number } {
  const day = parseInt(w.startDate.slice(8, 10), 10);
  return { year: w.year, month: w.month, sprint: day <= 15 ? 1 : 2 };
}

// Map a legacy half-month sprint to a representative week (its first week).
// Sprint 1 -> week containing the 1st; Sprint 2 -> week containing the 16th.
export function weekFromLegacySprint(year: number, month: number, sprint: number): WeekInfo {
  const day = sprint === 1 ? 1 : 16;
  return buildWeek(new Date(Date.UTC(year, month - 1, day)));
}
