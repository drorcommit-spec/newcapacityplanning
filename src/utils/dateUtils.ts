export const DAYS_PER_SPRINT = 10;
export const SPRINTS_PER_MONTH = 2;
export const SPRINTS_PER_YEAR = 24;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || `Month ${month}`;
}

export function getSprintLabel(year: number, month: number, sprint: number): string {
  return `${year} - ${getMonthName(month)} - S${sprint}`;
}

export function calculateDaysFromPercentage(percentage: number): number {
  return Math.round((percentage / 100) * DAYS_PER_SPRINT * 10) / 10;
}

export function calculatePercentageFromDays(days: number): number {
  return Math.round((days / DAYS_PER_SPRINT) * 100 * 10) / 10;
}

export function getMonthsInYear(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function getSprintsInMonth(): number[] {
  return [1, 2];
}

export function getCurrentSprint(): { year: number; month: number; sprint: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const sprint = day <= 15 ? 1 : 2;
  
  return { year, month, sprint };
}

export function getSprintDateRange(year: number, month: number, sprint: number): { startDate: string; endDate: string } {
  // Sprint 1: 1st-15th, Sprint 2: 16th-end of month
  const startDay = sprint === 1 ? 1 : 16;
  const endDay = sprint === 1 ? 15 : new Date(year, month, 0).getDate(); // 0 gets last day of previous month (which is current month)
  
  const startDate = `${month}/${startDay}`;
  const endDate = `${month}/${endDay}`;
  
  return { startDate, endDate };
}
