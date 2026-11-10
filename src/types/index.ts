export type UserRole = 'VP Product' | 'Product Director' | 'Product Manager' | 'Product Operations Manager' | 'PMO' | string;

export type ProjectType = 'AI' | 'Software' | 'Hybrid';

export type ProjectStatus = 'Pending' | 'New Signed Off' | 'Active' | 'Inactive' | 'Completed' | 'Blocked' | 'On Hold';

export type ProjectRegion = 'UK' | 'US' | 'Canada' | 'Israel';

// Company group (separate P&L) a member belongs to. One per member.
export type CompanyGroup = 'Administration' | 'Cloud' | 'Quickode' | 'Security&Cyber' | 'Software' | 'Valinor';

// Default/available company groups, in display order.
export const COMPANY_GROUPS: CompanyGroup[] = [
  'Administration',
  'Cloud',
  'Quickode',
  'Security&Cyber',
  'Software',
  'Valinor',
];

export const DEFAULT_COMPANY_GROUP: CompanyGroup = 'Software';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  teams?: string[]; // Array of team names - members can belong to multiple teams
  companyGroup?: CompanyGroup; // Company group / separate P&L the member belongs to
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
  // Sprint length in weeks (1, 2, or 3). Default 2. Used as the default allocation span
  // in the allocation dialog. Does not affect stored weekly allocations.
  sprintLengthWeeks?: 1 | 2 | 3;
  // Planning fields
  plannedStartMonth?: number;      // 1-12
  plannedStartYear?: number;
  plannedStartSprint?: number;     // 1 or 2
  requiredCapacity?: number;       // 0-100, step 5
  plannedSprintCount?: number;     // number of sprints
  // ETA fields
  etaMonth?: number;               // 1-12
  etaYear?: number;
  etaSprint?: number;              // 1 or 2
  // Comment
  projectComment?: string;
  // Required resource roles for this project
  requiredRoles?: string[];
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
  // Weekly model (target): the atomic unit is an ISO week.
  isoYear?: number;                // ISO week-numbering year
  isoWeek?: number;                // ISO week number (1..53)
  weekStartDate?: string;          // Monday of the week (YYYY-MM-DD), for display
  // Legacy half-month sprint key — kept only during the phased transition; removed in Phase 4.
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
  // Groups weeks created together as one multi-week allocation span.
  allocationGroupId?: string;
  // Legacy multi-sprint fields — removed in Phase 4.
  isGroupStart?: boolean;
  groupStartSprint?: string;
  groupTotalSprints?: number;
  groupCurrentIndex?: number;
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
