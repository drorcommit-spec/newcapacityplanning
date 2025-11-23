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
