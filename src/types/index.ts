export type UserRole = 'VP Product' | 'Product Director' | 'Product Manager' | 'Product Operations Manager' | 'PMO' | string;

export type ProjectType = 'AI' | 'Software' | 'Hybrid';

export type ProjectStatus = 'Pending' | 'New Signed Off' | 'Active' | 'Inactive' | 'Completed' | 'Blocked' | 'On Hold';

export type ProjectRegion = 'UK' | 'US' | 'Canada' | 'Israel';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  teams?: string[]; // Array of team names - members can belong to multiple teams
  isActive: boolean;
  createdAt: string;
  employeeNumber?: string;
  managerId?: string | null; // ID of the manager (another team member), null if no manager
  capacity?: number; // Member capacity percentage (0-100), default 100
  fullTimeSchedule?: number; // Full-time schedule percentage (100 = full-time, 50 = half-time, etc.), default 100
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
  // Planning fields
  plannedStartMonth?: number;      // 1-12
  plannedStartYear?: number;
  plannedStartSprint?: number;     // 1 or 2
  requiredCapacity?: number;       // 0-100, step 5
  plannedSprintCount?: number;     // number of sprints
}

// Sprint-specific role requirements for capacity planning
export interface SprintRoleRequirement {
  id: string;
  projectId: string;
  year: number;
  month: number;
  sprint: number;
  roleRequirements: Record<string, number>; // { "Product Manager": 50, "VP Product": 30 } - percentages
  createdAt: string;
  updatedAt: string;
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
  startDate?: string;              // Start date for the allocation (ISO date string)
  // New field for Capacity Planning - indicates if this is a planned allocation
  isPlanned?: boolean;
  // Multi-sprint allocation fields
  allocationGroupId?: string;     // Links related allocations together
  isGroupStart?: boolean;          // True for the first sprint in a group
  groupStartSprint?: string;       // Reference to start sprint (format: "year-month-sprint")
  groupTotalSprints?: number;      // Total number of sprints in the group
  groupCurrentIndex?: number;      // Position in group (1, 2, 3...)
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

export interface SprintTask {
  id: string;
  memberId: string;
  projectId: string;
  sprintId: string; // format: "year-month-sprint"
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Planned' | 'In Progress' | 'Completed' | 'Blocked';
  estimatedHours?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
