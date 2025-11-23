import { SprintAllocation } from '../types';

export function calculateUtilization(allocations: SprintAllocation[]): number {
  return allocations.reduce((sum, alloc) => sum + alloc.allocationPercentage, 0);
}

export function getUtilizationColor(utilization: number): string {
  if (utilization < 100) return 'text-yellow-600 bg-yellow-50';
  if (utilization === 100) return 'text-green-600 bg-green-50';
  return 'text-red-600 bg-red-50';
}

export function getUtilizationStatus(utilization: number): 'under' | 'full' | 'over' {
  if (utilization < 100) return 'under';
  if (utilization === 100) return 'full';
  return 'over';
}
