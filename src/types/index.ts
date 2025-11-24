export type UserRole = 'VP Product' | 'Product Director' | 'Product Manager' | 'Product Operations Manager' | 'PMO';

export type ProjectType = 'AI' | 'Software' | 'Hybrid';

export type ProjectStatus = 'Pending' | 'Active' | 'Inactive' | 'Completed';

export type ProjectRegion = 'UK' | 'US' | 'Canada' | 'Israel';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  team?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  customerId: string;
  customerName: string;
  projectName: string;
  projectType: ProjectType;
  status: ProjectStatus;
  maxCapacityDays?: number;
  maxCapacityPercentage?: number;
  pmoContact?: string;
  latestStatus?: string;
  activityCloseDate?: string;
  region?: ProjectRegion;
  createdAt: string;
  isArchived: boolean;
  comment?: string;
}

export interface SprintAllocation {
  id: string;
  projectId: string;
  productManagerId: string;
  year: number;
  month: number;
  sprint: number;
  allocationPercentage: number;
  allocationDays: number;
  createdAt: string;
  createdBy: string;
  comment?: string;
}

export interface AllocationHistory {
  id: string;
  allocationId: string;
  changedBy: string;
  changedAt: string;
  changeType: 'created' | 'updated' | 'deleted';
  oldValue?: Partial<SprintAllocation>;
  newValue?: Partial<SprintAllocation>;
}

export interface CapacityAlert {
  id: string;
  productManagerId: string;
  year: number;
  month: number;
  sprint: number;
  utilizationPercentage: number;
  alertType: 'under' | 'full' | 'over';
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export type Permission = 'read' | 'write';

export function getUserPermissions(role: UserRole): Permission[] {
  if (role === 'Product Manager') {
    return ['read'];
  }
  return ['read', 'write'];
}
