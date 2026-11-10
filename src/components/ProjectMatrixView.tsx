import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import Modal from './Modal';
import ProjectForm from './ProjectForm';
import PuzzleMe, { Suggestion } from './PuzzleMe';
import WeekSpanEditor from './WeekSpanEditor';
import {
  getWeeksInRange,
  buildWeek,
  groupWeeksIntoSprints,
  firstWeekOfCurrentSprint,
  getSprintTitleLabel,
  getSprintDayRangeLabel,
  getSprintDateLabel,
  getSprintYearLabel,
  getMonthWeekLabel,
  getWeekDayRangeLabel,
  formatDDMM,
  weekKey,
  weekFromLegacySprint,
  aggregateWeeklyValues,
  workingDaysInWeek,
  WeekInfo,
  Sprint,
  SprintLengthWeeks,
} from '../utils/weekUtils';
import { getMemberCompanyGroup } from '../utils/memberUtils';

interface ProjectMatrixViewProps {
  companyGroupFilter?: string;
}

type StatusFilter = 'active' | 'all' | 'inactive';
type ViewLevel = 'week' | 'sprint';
// Week/Sprint toggle is temporarily disabled — Sprint view is the only mode for now.
// Flip back to true to re-expose the toggle once ready.
const VIEW_LEVEL_TOGGLE_ENABLED = false;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const UNASSIGNED_MANAGER_ID = '__unassigned__';
// Sprint view always spans one year (52 weeks) forward from the current sprint.
const WEEKS_VISIBLE = 52;

export default function ProjectMatrixView({ companyGroupFilter = 'all' }: ProjectMatrixViewProps) {
  const { projects, allocations, teamMembers, addAllocation, updateAllocation, deleteAllocation, addProject, updateProject } = useData();
  const { user } = useAuth();
  const { canWrite, canManageProjects, isMemberTeam } = usePermissions();
  const currentUser = user || { email: 'unknown' };

  // Shared with Staff View and Timeline View (same localStorage keys) so the visible
  // week/sprint period stays in sync no matter which of the 3 Capacity Planning views the
  // user navigates to, instead of each view tracking its own independent position.
  const [periodOffset, setPeriodOffset] = useState(
    () => parseInt(localStorage.getItem('capacityPeriodOffset') || '0', 10)
  );
  const [showSprintRow, setShowSprintRow] = useState(() => localStorage.getItem('puzzleShowSprintRow') !== 'false');
  const [overlaySprintLength, setOverlaySprintLength] = useState<SprintLengthWeeks>(
    () => (parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks)
  );
  // Week vs Sprint display level. Sprint level shows one averaged column per sprint;
  // editing a sprint cell opens a per-week sub-editor instead of overwriting uniformly.
  // Toggle is temporarily disabled (VIEW_LEVEL_TOGGLE_ENABLED) — Sprint is always shown.
  const [viewLevel, setViewLevel] = useState<ViewLevel>(
    () => (VIEW_LEVEL_TOGGLE_ENABLED ? (localStorage.getItem('puzzleViewLevel') as ViewLevel) || 'week' : 'sprint')
  );
  const [spanEditor, setSpanEditor] = useState<{ projectId: string; memberId: string; sprintIndex: number } | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [lightFilter, setLightFilter] = useState<Set<string>>(new Set(['green', 'yellow', 'red']));
  const [onlyAllocated, setOnlyAllocated] = useState(false);

  // Reactive capacity thresholds (re-render when changed in CapacityPlanning toolbar)
  const [underCapacityThreshold, setUnderCapacityThreshold] = useState(() => parseInt(localStorage.getItem('underCapacityThreshold') || '70'));
  const [overCapacityThreshold, setOverCapacityThreshold] = useState(() => parseInt(localStorage.getItem('overCapacityThreshold') || '100'));

  useEffect(() => {
    const handleThresholdChange = () => {
      setUnderCapacityThreshold(parseInt(localStorage.getItem('underCapacityThreshold') || '70'));
      setOverCapacityThreshold(parseInt(localStorage.getItem('overCapacityThreshold') || '100'));
    };
    window.addEventListener('thresholdChanged', handleThresholdChange);
    window.addEventListener('storage', handleThresholdChange);
    return () => {
      window.removeEventListener('thresholdChanged', handleThresholdChange);
      window.removeEventListener('storage', handleThresholdChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('capacityPeriodOffset', String(periodOffset));
    window.dispatchEvent(new Event('capacityPeriodOffsetChanged'));
  }, [periodOffset]);
  useEffect(() => {
    localStorage.setItem('puzzleShowSprintRow', String(showSprintRow));
  }, [showSprintRow]);
  useEffect(() => {
    localStorage.setItem('capacitySprintLength', String(overlaySprintLength));
    window.dispatchEvent(new Event('capacitySprintLengthChanged'));
  }, [overlaySprintLength]);
  useEffect(() => {
    if (VIEW_LEVEL_TOGGLE_ENABLED) localStorage.setItem('puzzleViewLevel', viewLevel);
  }, [viewLevel]);

  // Stay in sync with the Staff View / Timeline View when they change the shared period or
  // sprint length (all 3 Capacity Planning views read/write the same localStorage keys).
  useEffect(() => {
    const syncPeriod = () => setPeriodOffset(parseInt(localStorage.getItem('capacityPeriodOffset') || '0', 10));
    const syncLength = () => setOverlaySprintLength(parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks);
    window.addEventListener('capacityPeriodOffsetChanged', syncPeriod);
    window.addEventListener('capacitySprintLengthChanged', syncLength);
    return () => {
      window.removeEventListener('capacityPeriodOffsetChanged', syncPeriod);
      window.removeEventListener('capacitySprintLengthChanged', syncLength);
    };
  }, []);

  const toggleLight = (key: string) => {
    setLightFilter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  // Member (column) pagination — bounds how many members render at once so a large team
  // doesn't blow up the matrix width (members x sprints columns). One shared page applies
  // across every sprint so each project row shows the same members left-to-right.
  const MEMBERS_PER_PAGE = 15;
  const [memberPage, setMemberPage] = useState(0);
  const [selectedManagerIds, setSelectedManagerIds] = useState<Set<string>>(new Set());
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  // All active members (no role filter), optionally scoped to a company group
  const allActiveMembers = useMemo(() =>
    teamMembers
      .filter(m => m.isActive)
      .filter(m => companyGroupFilter === 'all' || getMemberCompanyGroup(m) === companyGroupFilter)
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers, companyGroupFilter]
  );

  // Managers: active members who are defined as managerId of at least one other active member
  const availableManagers = useMemo(() => {
    const managerIdSet = new Set<string>();
    allActiveMembers.forEach(m => {
      if (m.managerId) managerIdSet.add(m.managerId);
    });
    // Also check if there are members with no manager (for "Unassigned" option)
    const hasUnassigned = allActiveMembers.some(m => !m.managerId);
    const managers = allActiveMembers
      .filter(m => managerIdSet.has(m.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { managers, hasUnassigned };
  }, [allActiveMembers]);

  // Default manager selection: logged-in user if they're a manager, otherwise first alphabetically
  useEffect(() => {
    if (isMemberTeam) return; // member team users get auto-filtered differently
    if (selectedManagerIds.size > 0) return; // already selected
    if (availableManagers.managers.length === 0) return;

    const userIsManager = availableManagers.managers.some(m => m.id === user?.id);
    if (userIsManager && user?.id) {
      setSelectedManagerIds(new Set([user.id]));
    } else {
      setSelectedManagerIds(new Set([availableManagers.managers[0].id]));
    }
  }, [availableManagers.managers, user?.id, isMemberTeam]);

  // Eligible members based on selected manager(s): manager + their direct reports
  const eligibleMembers = useMemo(() => {
    if (selectedManagerIds.size === 0) return allActiveMembers;

    const result = new Set<string>();
    selectedManagerIds.forEach(managerId => {
      if (managerId === UNASSIGNED_MANAGER_ID) {
        // Add all members with no manager
        allActiveMembers.forEach(m => {
          if (!m.managerId) result.add(m.id);
        });
      } else {
        // Add the manager themselves
        result.add(managerId);
        // Add their direct reports
        allActiveMembers.forEach(m => {
          if (m.managerId === managerId) result.add(m.id);
        });
      }
    });

    return allActiveMembers.filter(m => result.has(m.id));
  }, [allActiveMembers, selectedManagerIds]);

  // Auto-filter to own user for member team users
  useEffect(() => {
    if (isMemberTeam && user?.id) {
      setSelectedMemberIds(new Set([user.id]));
      setOnlyAllocated(true);
    }
  }, [isMemberTeam, user?.id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showMemberDropdown && !showManagerDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (showMemberDropdown && memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
      if (showManagerDropdown && managerDropdownRef.current && !managerDropdownRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMemberDropdown, showManagerDropdown]);
  const [editCell, setEditCell] = useState<{ projectId: string; memberId: string; periodKey: string } | null>(null);
  const [editPercentage, setEditPercentage] = useState('');
  const [editAllocId, setEditAllocId] = useState<string | null>(null);
  const [editSprintCount, setEditSprintCount] = useState(1); // number of sprints to span, starting at this week
  // How a new allocation spans forward: a count of sprints, or up to a chosen end date.
  const [spanMode, setSpanMode] = useState<'sprints' | 'endDate'>('sprints');
  const [spanEndDate, setSpanEndDate] = useState(''); // YYYY-MM-DD, inclusive, used when spanMode==='endDate'
  // For editing/removing an existing allocation: apply to this week only, or this + all
  // future weeks for the same member+project.
  const [editScope, setEditScope] = useState<'current' | 'future'>('current');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [infoProjectId, setInfoProjectId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [showPuzzleMe, setShowPuzzleMe] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [startEtaProjectId, setStartEtaProjectId] = useState<string | null>(null);
  const [etaMode, setEtaMode] = useState<'date' | 'sprints'>('date');
  const [commentProjectId, setCommentProjectId] = useState<string | null>(null);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [missingRoleFilter, setMissingRoleFilter] = useState<string>('none');
  const [commentText, setCommentText] = useState('');

  // Displayed members: filtered by employee dropdown within the manager's team
  // When a project is focused, override to show only members allocated to that project
  const displayedMembers = useMemo(() => {
    if (focusedProjectId) {
      // Show only members who have allocations on the focused project
      const focusedMemberIds = new Set<string>();
      allocations.forEach(a => {
        if (a.projectId === focusedProjectId) focusedMemberIds.add(a.productManagerId);
      });
      return allActiveMembers.filter(m => focusedMemberIds.has(m.id));
    }
    return selectedMemberIds.size === 0
      ? eligibleMembers
      : eligibleMembers.filter(m => selectedMemberIds.has(m.id));
  }, [eligibleMembers, selectedMemberIds, focusedProjectId, allocations, allActiveMembers]);

  // Paginate the members that actually render as columns. The full `displayedMembers` list
  // still drives filtering/counly; only the rendered slice is bounded for performance.
  const memberPageCount = Math.max(1, Math.ceil(displayedMembers.length / MEMBERS_PER_PAGE));
  const safeMemberPage = Math.min(memberPage, memberPageCount - 1);
  const pagedMembers = useMemo(
    () => displayedMembers.slice(safeMemberPage * MEMBERS_PER_PAGE, safeMemberPage * MEMBERS_PER_PAGE + MEMBERS_PER_PAGE),
    [displayedMembers, safeMemberPage]
  );
  // Reset to the first page whenever the underlying member set changes size.
  useEffect(() => { setMemberPage(0); }, [displayedMembers.length]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllMembers = () => setSelectedMemberIds(new Set());
  const selectNoMembers = () => setSelectedMemberIds(new Set(['__none__'])); // special: shows 0 columns

  // Generate visible week columns. Anchor the window to the first week of the *current
  // sprint* (not the current calendar week) so the leading column is always the current
  // sprint rather than a partially-elapsed previous one. periodOffset then shifts by weeks.
  const weeks: WeekInfo[] = useMemo(() => {
    const anchor = firstWeekOfCurrentSprint(overlaySprintLength);
    const start = new Date(anchor.startDate + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + periodOffset * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (WEEKS_VISIBLE - 1) * 7);
    return getWeeksInRange(start, end).slice(0, WEEKS_VISIBLE);
  }, [periodOffset, overlaySprintLength]);

  // When a single project is focused, use its sprint length for the overlay; else the view default.
  const effectiveSprintLength: SprintLengthWeeks = useMemo(() => {
    if (focusedProjectId) {
      const p = projects.find(pr => pr.id === focusedProjectId);
      if (p?.sprintLengthWeeks) return p.sprintLengthWeeks;
    }
    return overlaySprintLength;
  }, [focusedProjectId, projects, overlaySprintLength]);

  // Sprint groups for the header band (Month is combined into the Week label to save a row).
  const sprintGroups = useMemo(
    () => groupWeeksIntoSprints(weeks, effectiveSprintLength),
    [weeks, effectiveSprintLength]
  );

  // Key roles for traffic light evaluation (only these determine red/green)
  const KEY_ROLES = ['Product Manager', 'PMO'];
  const isArchitectRole = (role: string) => role.toLowerCase().includes('architect');

  // Check if a project is missing a specific key role
  const isProjectMissingRole = (projectId: string, project: any, roleToCheck: string): boolean => {
    const requiredRoles = project.requiredRoles || [];
    
    // Check if this role is required by the project
    if (roleToCheck === 'architect') {
      if (!requiredRoles.some((r: string) => isArchitectRole(r))) return false;
    } else {
      if (!requiredRoles.includes(roleToCheck)) return false;
    }

    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curSprint = today.getDate() <= 15 ? 1 : 2;

    // Get future allocations for this project
    const futureAllocs = allocations.filter(a => {
      if (a.projectId !== projectId) return false;
      if (a.year > curYear) return true;
      if (a.year === curYear && a.month > curMonth) return true;
      if (a.year === curYear && a.month === curMonth && a.sprint >= curSprint) return true;
      return false;
    });

    // Check if any allocated member has the required role
    const allocatedMemberIds = [...new Set(futureAllocs.map(a => a.productManagerId))];
    const allocatedMembers = teamMembers.filter(m => allocatedMemberIds.includes(m.id));

    if (roleToCheck === 'architect') {
      return !allocatedMembers.some(m => isArchitectRole(m.role));
    }
    return !allocatedMembers.some(m => m.role === roleToCheck);
  };

  // Check if project is missing ANY key role
  const isProjectMissingAnyKeyRole = (projectId: string, project: any): boolean => {
    return KEY_ROLES.some(role => isProjectMissingRole(projectId, project, role)) ||
           isProjectMissingRole(projectId, project, 'architect');
  };

  // Traffic light logic - new 3-color model for active projects
  const getProjectLightKey = (projectId: string, status: string, activityCloseDate?: string): string => {
    if (status === 'Inactive' || status === 'Completed') return 'gray';
    const isActive = status === 'Active' || status === 'Pending' || status === 'New Signed Off';
    if (!isActive) return 'gray';

    // Yellow = not signed (pending sign-off)
    if (!activityCloseDate) return 'yellow';

    // Signed project: check if all key roles are covered
    const project = projects.find(p => p.id === projectId);
    if (!project) return 'gray';

    if (isProjectMissingAnyKeyRole(projectId, project)) return 'red';
    return 'green';
  };

  const LIGHT_MAP: Record<string, { color: string; label: string }> = {
    green: { color: 'bg-green-500', label: 'Fully staffed — all required key roles (PM, PMO, Architect) are allocated' },
    yellow: { color: 'bg-yellow-400', label: 'Pending sign-off — project not yet signed' },
    red: { color: 'bg-red-500', label: 'Missing staff — signed project missing PM, PMO, or Architect' },
    gray: { color: 'bg-gray-400', label: 'Inactive/Completed' },
  };

  const getProjectLight = (projectId: string, status: string, activityCloseDate?: string) =>
    LIGHT_MAP[getProjectLightKey(projectId, status, activityCloseDate)] || LIGHT_MAP.gray;

  // Filter projects
  const filteredProjects = useMemo(() => {
    // When a project is focused, show only that project
    if (focusedProjectId) {
      const focused = projects.find(p => p.id === focusedProjectId);
      return focused ? [focused] : [];
    }

    let filtered = projects.filter(p => !p.isArchived);
    // Filter by traffic light (multi-select toggle)
    if (lightFilter.size > 0) {
      filtered = filtered.filter(p => {
        const key = getProjectLightKey(p.id, p.status, p.activityCloseDate);
        return lightFilter.has(key);
      });
    }
    if (projectFilter) {
      const q = projectFilter.toLowerCase();
      filtered = filtered.filter(p => p.projectName.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q));
    }
    if (onlyAllocated) {
      const today = new Date();
      const curYear = today.getFullYear();
      const curMonth = today.getMonth() + 1;
      const curSprint = today.getDate() <= 15 ? 1 : 2;
      const hasEmployeeFilter = selectedMemberIds.size > 0 && !selectedMemberIds.has('__none__');
      const memberIdSet = hasEmployeeFilter ? new Set(displayedMembers.map(m => m.id)) : null;

      const beforeCount = filtered.length;
      filtered = filtered.filter(p => {
        const projectAllocs = allocations.filter(a => a.projectId === p.id);
        const futureAllocs = projectAllocs.filter(a => {
          if (a.year > curYear) return true;
          if (a.year === curYear && a.month > curMonth) return true;
          if (a.year === curYear && a.month === curMonth && a.sprint >= curSprint) return true;
          return false;
        });
        if (memberIdSet) {
          return futureAllocs.some(a => memberIdSet.has(a.productManagerId));
        }
        return futureAllocs.length > 0;
      });
      console.log('Allocated only filter:', beforeCount, '->', filtered.length, 'curPeriod:', curYear, curMonth, curSprint, 'employeeFilter:', hasEmployeeFilter, 'memberIds:', memberIdSet ? [...memberIdSet] : 'all');
    }
    // Apply missing role filter
    if (missingRoleFilter !== 'none') {
      filtered = filtered.filter(p => {
        if (missingRoleFilter === 'any') {
          return isProjectMissingAnyKeyRole(p.id, p);
        }
        return isProjectMissingRole(p.id, p, missingRoleFilter);
      });
    }
    return filtered.sort((a, b) => {
      const cmp = a.customerName.localeCompare(b.customerName);
      return cmp !== 0 ? cmp : a.projectName.localeCompare(b.projectName);
    });
  }, [projects, projectFilter, statusFilter, lightFilter, onlyAllocated, allocations, selectedMemberIds, displayedMembers, focusedProjectId, missingRoleFilter]);

  // Performance: index allocations once so per-cell lookups are O(1) instead of scanning
  // the whole array for every project × member × week cell (52 weeks * many members).
  const allocByCell = useMemo(() => {
    const m = new Map<string, typeof allocations[number]>();
    for (const a of allocations) {
      m.set(`${a.projectId}|${a.productManagerId}|${a.isoYear}|${a.isoWeek}`, a);
    }
    return m;
  }, [allocations]);

  // getProjectLightKey scans ALL allocations per call. It was previously called once per
  // cell (projects × members × sprints), which is the main cause of the multi-second freeze
  // on sprint navigation. Compute each project's light key ONCE per render instead.
  const projectLightById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      m.set(p.id, getProjectLightKey(p.id, p.status, p.activityCloseDate));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, allocations, teamMembers]);

  // Suggestions were looked up with Array.find per cell. Index them for O(1) lookups.
  const suggestionByCell = useMemo(() => {
    const m = new Map<string, Suggestion>();
    for (const s of suggestions) {
      const sw = weekFromLegacySprint(s.year, s.month, s.sprint);
      m.set(`${s.projectId}|${s.memberId}|${sw.isoYear}|${sw.isoWeek}`, s);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions]);

  // member|isoYear|isoWeek -> summed allocation percentage across all projects.
  const memberWeekTotal = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of allocations) {
      const key = `${a.productManagerId}|${a.isoYear}|${a.isoWeek}`;
      m.set(key, (m.get(key) || 0) + (a.allocationPercentage || 0));
    }
    return m;
  }, [allocations]);

  // Get allocation for a cell (project × member × week) — O(1) map lookup.
  const getCellData = (projectId: string, memberId: string, week: WeekInfo) => {
    const alloc = allocByCell.get(`${projectId}|${memberId}|${week.isoYear}|${week.isoWeek}`);
    const pct = alloc?.allocationPercentage || 0;
    return { hasAny: !!alloc, display: pct > 0 ? `${pct}%` : '', pct, alloc, editPct: pct };
  };

  // Sprint-level aggregation for a cell (project × member × sprint): average across its weeks
  // plus a "varies" flag when the weeks don't all share the same percentage.
  const getSprintCellData = (projectId: string, memberId: string, sprint: Sprint) => {
    const weeklyPcts = sprint.weeks.map(w => getCellData(projectId, memberId, w).pct);
    const { average, varies } = aggregateWeeklyValues(weeklyPcts);
    const hasAny = weeklyPcts.some(p => p > 0);
    return { hasAny, average, varies, weeklyPcts };
  };

  // Save per-week values from the sprint sub-editor (creates/updates/removes each week
  // independently so unedited weeks with existing data are preserved as-is).
  const saveSpanEditor = (projectId: string, memberId: string, sprint: Sprint, valuesPerWeek: number[], scope: 'current' | 'future' = 'current') => {
    sprint.weeks.forEach((week, i) => {
      const pct = valuesPerWeek[i];
      const existing = allocations.find(a =>
        a.projectId === projectId && a.productManagerId === memberId &&
        a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
      );
      if (pct > 0) {
        if (existing) {
          updateAllocation(existing.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)) }, currentUser.email);
        } else {
          const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
          addAllocation({
            projectId, productManagerId: memberId,
            isoYear: week.isoYear, isoWeek: week.isoWeek, weekStartDate: week.startDate,
            year: legacy.year, month: legacy.month, sprint: legacy.sprint,
            allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)), isPlanned: true,
          }, currentUser.email);
        }
      } else if (existing) {
        deleteAllocation(existing.id, currentUser.email);
      }
    });

    // "Future" scope: also apply this sprint's uniform % to every later existing allocation
    // for the same member+project (weeks strictly after this sprint's last week).
    if (scope === 'future' && sprint.weeks.length > 0) {
      const pct = valuesPerWeek[0] || 0;
      const afterDate = sprint.weeks[sprint.weeks.length - 1].startDate;
      allocations
        .filter(a =>
          a.projectId === projectId && a.productManagerId === memberId &&
          (a.weekStartDate || '') > afterDate
        )
        .forEach(a => {
          const wk = buildWeek(new Date((a.weekStartDate || '') + 'T00:00:00Z'));
          if (pct > 0) {
            updateAllocation(a.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(wk)) }, currentUser.email);
          } else {
            deleteAllocation(a.id, currentUser.email);
          }
        });
    }
    setSpanEditor(null);
  };

  // Save this sprint's per-week values, then also fill the spanned future weeks with a
  // uniform % (used when adding a new allocation and the user opts to span forward).
  const saveSpanEditorWithSpan = (
    projectId: string,
    memberId: string,
    sprint: Sprint,
    valuesPerWeek: number[],
    extraWeeks: WeekInfo[],
    pct: number
  ) => {
    saveSpanEditor(projectId, memberId, sprint, valuesPerWeek);
    if (pct > 0) {
      extraWeeks.forEach(week => {
        const existing = allocations.find(a =>
          a.projectId === projectId && a.productManagerId === memberId &&
          a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
        );
        const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
        if (existing) {
          updateAllocation(existing.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)) }, currentUser.email);
        } else {
          addAllocation({
            projectId, productManagerId: memberId,
            isoYear: week.isoYear, isoWeek: week.isoWeek, weekStartDate: week.startDate,
            year: legacy.year, month: legacy.month, sprint: legacy.sprint,
            allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)), isPlanned: true,
          }, currentUser.email);
        }
      });
    }
    setSpanEditor(null);
  };

  const clearSpanEditor = (projectId: string, memberId: string, sprint: Sprint, scope: 'current' | 'future' = 'current') => {
    if (scope === 'future' && sprint.weeks.length > 0) {
      // Remove this sprint's allocations plus every later one for this member+project.
      const fromDate = sprint.weeks[0].startDate;
      const toDelete = allocations.filter(a =>
        a.projectId === projectId && a.productManagerId === memberId &&
        (a.weekStartDate || '') >= fromDate
      );
      if (!confirm(`Remove ${toDelete.length} allocation${toDelete.length !== 1 ? 's' : ''} for this member on this project, from this sprint onward?`)) return;
      toDelete.forEach(a => deleteAllocation(a.id, currentUser.email));
      setSpanEditor(null);
      return;
    }
    if (!confirm(`Clear all allocations for this sprint (${sprint.weeks.length} week${sprint.weeks.length > 1 ? 's' : ''})?`)) return;
    sprint.weeks.forEach(week => {
      const existing = allocations.find(a =>
        a.projectId === projectId && a.productManagerId === memberId &&
        a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
      );
      if (existing) deleteAllocation(existing.id, currentUser.email);
    });
    setSpanEditor(null);
  };

  // Member total for a week — O(1) map lookup.
  const getMemberTotal = (memberId: string, week: WeekInfo) => {
    return memberWeekTotal.get(`${memberId}|${week.isoYear}|${week.isoWeek}`) || 0;
  };

  const openCell = (projectId: string, memberId: string, week: WeekInfo) => {
    if (!canWrite) return;
    const data = getCellData(projectId, memberId, week);
    setEditCell({ projectId, memberId, periodKey: weekKey(week) });
    setEditSprintCount(1);
    setSpanMode('sprints');
    setSpanEndDate('');
    setEditScope('current');
    if (data.hasAny) {
      setEditAllocId(data.alloc?.id || null);
      setEditPercentage(data.editPct.toString());
    } else {
      setEditAllocId(null);
      setEditPercentage('');
    }
  };

  // Weeks covered by the current edit, starting at the clicked week, spanning
  // editSprintCount sprints (each sprint = the project's sprintLengthWeeks in actual weeks).
  const editSpanWeeks = useMemo((): WeekInfo[] => {
    if (!editCell) return [];
    const startWeek = weeks.find(w => weekKey(w) === editCell.periodKey);
    if (!startWeek) return [];
    const start = new Date(startWeek.startDate + 'T00:00:00Z');

    // Editing an existing allocation: scope drives the span, not the sprint count.
    if (editAllocId) {
      if (editScope === 'future') {
        // Every week for this member+project from this week onward that already has an
        // allocation (edit = change what exists, don't create new future weeks).
        return allocations
          .filter(a =>
            a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
            (a.weekStartDate || '') >= startWeek.startDate
          )
          .map(a => buildWeek(new Date((a.weekStartDate || '') + 'T00:00:00Z')))
          .sort((x, y) => x.startDate.localeCompare(y.startDate));
      }
      return [startWeek];
    }

    // Adding: span by end date or by a number of sprints.
    if (spanMode === 'endDate') {
      if (!spanEndDate || spanEndDate < startWeek.startDate) return [startWeek];
      const end = new Date(spanEndDate + 'T00:00:00Z');
      return getWeeksInRange(start, end);
    }
    const project = projects.find(p => p.id === editCell.projectId);
    const sprintLengthWeeks = project?.sprintLengthWeeks ?? 2;
    const totalWeeks = editSprintCount * sprintLengthWeeks;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (totalWeeks - 1) * 7);
    return getWeeksInRange(start, end).slice(0, totalWeeks);
  }, [editCell, editAllocId, editScope, spanMode, spanEndDate, editSprintCount, weeks, projects, allocations]);

  // How many of the spanned weeks already have an allocation for this member+project
  // (used to warn about overwriting existing data).
  const editOverlapCount = useMemo(() => {
    if (!editCell) return 0;
    return editSpanWeeks.filter(w =>
      allocations.some(a =>
        a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
        a.isoYear === w.isoYear && a.isoWeek === w.isoWeek
      )
    ).length;
  }, [editCell, editSpanWeeks, allocations]);

  const handleSave = () => {
    if (!editCell || !editPercentage) return;
    const pct = parseInt(editPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) { alert('Enter 0-100'); return; }
    if (editSpanWeeks.length === 0) return;

    // When editing an existing allocation the scope radio already communicates intent, so
    // skip the "overwrite" prompt. Only warn when adding a new span over existing weeks.
    if (!editAllocId && editOverlapCount > 0 && !confirm(
      `${editOverlapCount} of the ${editSpanWeeks.length} week(s) in this span already ${editOverlapCount === 1 ? 'has' : 'have'} an allocation for this member on this project. ` +
      `Continuing will overwrite ${editOverlapCount === 1 ? 'it' : 'them'} with ${pct}%. Continue?`
    )) {
      return;
    }

    editSpanWeeks.forEach(week => {
      const existing = allocations.find(a =>
        a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
        a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
      );
      const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
      if (existing) {
        updateAllocation(existing.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)) }, currentUser.email);
      } else {
        addAllocation({
          projectId: editCell.projectId, productManagerId: editCell.memberId,
          isoYear: week.isoYear, isoWeek: week.isoWeek, weekStartDate: week.startDate,
          year: legacy.year, month: legacy.month, sprint: legacy.sprint,
          allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)), isPlanned: true,
        }, currentUser.email);
      }
    });
    closeEdit();
  };

  const handleDelete = () => {
    if (!editCell || !editAllocId) return;
    const startWeek = weeks.find(w => weekKey(w) === editCell.periodKey);
    if (editScope === 'future' && startWeek) {
      // Remove this and every later allocation for the same member+project.
      const toDelete = allocations.filter(a =>
        a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
        (a.weekStartDate || '') >= startWeek.startDate
      );
      toDelete.forEach(a => deleteAllocation(a.id, currentUser.email));
    } else {
      deleteAllocation(editAllocId, currentUser.email);
    }
    closeEdit();
  };

  const closeEdit = () => {
    setEditCell(null); setEditAllocId(null); setEditPercentage(''); setEditSprintCount(1);
    setSpanMode('sprints'); setSpanEndDate(''); setEditScope('current');
  };

  // Focus on a project: show only that project's allocated members
  const handleFocusProject = (projectId: string) => {
    if (focusedProjectId === projectId) {
      // Unfocus
      setFocusedProjectId(null);
      return;
    }

    // Check project has allocations
    const hasAllocs = allocations.some(a => a.projectId === projectId);
    if (!hasAllocs) return;

    setFocusedProjectId(projectId);
  };

  const colW = 58;
  const projW = 160;
  const memberCount = pagedMembers.length;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b flex-wrap">
        {/* Filters - hidden for member users */}
        {!isMemberTeam && (
        <div className="flex items-center gap-2">
          {/* Traffic light filter - multi-select toggles */}
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-gray-50">
            <span className="text-[10px] text-gray-500 font-medium mr-1">Project Staffing</span>
            <button onClick={() => setLightFilter(new Set(['green', 'yellow', 'red']))}
              className={`text-[10px] px-2 py-0.5 rounded ${lightFilter.size === 3 && !lightFilter.has('gray') ? 'bg-white shadow font-bold text-gray-800' : 'text-gray-500 hover:bg-white'}`}>Active</button>
            <button onClick={() => toggleLight('green')}
              title="Signed + all key roles (PM, PMO, Architect) allocated"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter.has('green') ? 'bg-green-100 font-bold text-green-800 shadow' : 'text-gray-400 hover:bg-green-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Fully Staffed
            </button>
            <button onClick={() => toggleLight('yellow')}
              title="Active project not yet signed off"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter.has('yellow') ? 'bg-yellow-100 font-bold text-yellow-800 shadow' : 'text-gray-400 hover:bg-yellow-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Pending Signoff
            </button>
            <button onClick={() => toggleLight('red')}
              title="Signed project missing at least one key role (PM, PMO, or Architect)"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter.has('red') ? 'bg-red-100 font-bold text-red-800 shadow' : 'text-gray-400 hover:bg-red-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Missing Staff
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => toggleLight('gray')}
              title="Inactive projects — view past allocations"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter.has('gray') ? 'bg-gray-200 font-bold text-gray-800 shadow' : 'text-gray-400 hover:bg-gray-100'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span> Inactive
            </button>
          </div>
          {/* Missing Role filter dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">Missing Required Staff:</span>
            <select
              value={missingRoleFilter}
              onChange={e => setMissingRoleFilter(e.target.value)}
              className={`px-2 py-1 border rounded text-[10px] ${missingRoleFilter !== 'none' ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-white text-gray-600'}`}
              title="Filter projects missing a specific key role"
            >
              <option value="none">None</option>
              <option value="any">Any (PM, PMO, Architect)</option>
              <option value="Product Manager">Product Manager</option>
              <option value="PMO">PMO</option>
              <option value="architect">Architect (SW/AI)</option>
            </select>
          </div>
          {/* Hide unallocated projects toggle */}
          {/* Only Allocated toggle switch */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Only Allocated Projects</span>
            <button
              onClick={() => setOnlyAllocated(!onlyAllocated)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${onlyAllocated ? 'bg-blue-500' : 'bg-gray-300'}`}
              title="When ON: hides projects with no future allocations. When combined with employee filter: shows only projects where selected employee(s) are allocated."
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${onlyAllocated ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>
          {/* Manager multi-select dropdown */}
          <div className="relative flex items-center gap-1.5" ref={managerDropdownRef}>
            <span className="text-[10px] text-gray-500 font-medium">Manager:</span>
            <button onClick={() => { setShowManagerDropdown(!showManagerDropdown); setManagerSearch(''); }}
              className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 flex items-center gap-1 min-w-[120px]">
              <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="truncate">
                {selectedManagerIds.size === 0
                  ? 'All Managers'
                  : selectedManagerIds.size === 1
                    ? (selectedManagerIds.has(UNASSIGNED_MANAGER_ID) ? 'Unassigned' : availableManagers.managers.find(m => selectedManagerIds.has(m.id))?.fullName || 'Manager')
                    : `${selectedManagerIds.size} managers`}
              </span>
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showManagerDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-30 w-64">
                <div className="p-2 border-b">
                  <input type="text" placeholder="Search managers..." value={managerSearch}
                    onChange={e => setManagerSearch(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-xs" autoFocus />
                </div>
                <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                  <button onClick={() => { setSelectedManagerIds(new Set(availableManagers.managers.map(m => m.id))); setSelectedMemberIds(new Set()); }} className="text-[10px] text-blue-600 hover:underline font-medium">Select All</button>
                  <button onClick={() => { setSelectedManagerIds(new Set()); setSelectedMemberIds(new Set()); }} className="text-[10px] text-blue-600 hover:underline font-medium">Deselect All</button>
                  <button onClick={() => setShowManagerDropdown(false)} className="text-[10px] text-gray-500 hover:underline ml-auto">Close</button>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {availableManagers.managers
                    .filter(m => !managerSearch || m.fullName.toLowerCase().includes(managerSearch.toLowerCase()))
                    .map(m => {
                      const isChecked = selectedManagerIds.has(m.id);
                      const directReportCount = allActiveMembers.filter(member => member.managerId === m.id).length;
                      return (
                        <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs">
                          <input type="checkbox" checked={isChecked}
                            onChange={() => {
                              const next = new Set(selectedManagerIds);
                              if (next.has(m.id)) {
                                next.delete(m.id);
                                // Must have at least one selected
                                if (next.size === 0) return;
                              } else {
                                next.add(m.id);
                              }
                              setSelectedManagerIds(next);
                              setSelectedMemberIds(new Set()); // reset employee filter when manager changes
                            }}
                            className="rounded text-blue-600" />
                          <span className="truncate flex-1">{m.fullName}</span>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">{directReportCount} reports</span>
                        </label>
                      );
                    })}
                  {/* Unassigned option */}
                  {availableManagers.hasUnassigned && (
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-yellow-50 cursor-pointer text-xs border-t">
                      <input type="checkbox" checked={selectedManagerIds.has(UNASSIGNED_MANAGER_ID)}
                        onChange={() => {
                          const next = new Set(selectedManagerIds);
                          if (next.has(UNASSIGNED_MANAGER_ID)) {
                            next.delete(UNASSIGNED_MANAGER_ID);
                            if (next.size === 0) return;
                          } else {
                            next.add(UNASSIGNED_MANAGER_ID);
                          }
                          setSelectedManagerIds(next);
                          setSelectedMemberIds(new Set());
                        }}
                        className="rounded text-yellow-600" />
                      <span className="truncate flex-1 text-yellow-700">Unassigned (no manager)</span>
                      <span className="text-[9px] text-gray-400 flex-shrink-0">{allActiveMembers.filter(m => !m.managerId).length}</span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Employee multi-select with search (contextual to selected managers) */}
          <div className="relative" ref={memberDropdownRef}>
            <button onClick={() => { setShowMemberDropdown(!showMemberDropdown); setMemberSearch(''); }}
              className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 flex items-center gap-1 min-w-[140px]">
              <span className="truncate">
                {selectedMemberIds.size === 0
                  ? `All Employees (${eligibleMembers.length})`
                  : `${displayedMembers.length} of ${eligibleMembers.length} selected`}
              </span>
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showMemberDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-30 w-64">
                {/* Search */}
                <div className="p-2 border-b">
                  <input type="text" placeholder="Search employees..." value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-xs" autoFocus />
                </div>
                {/* Quick actions */}
                <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                  <button onClick={selectAllMembers} className="text-[10px] text-blue-600 hover:underline font-medium">Select All</button>
                  <button onClick={selectNoMembers} className="text-[10px] text-blue-600 hover:underline font-medium">Deselect All</button>
                  <button onClick={() => setShowMemberDropdown(false)} className="text-[10px] text-gray-500 hover:underline ml-auto">Close</button>
                </div>
                {/* Member list */}
                <div className="max-h-52 overflow-y-auto">
                  {eligibleMembers
                    .filter(m => !memberSearch || m.fullName.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(m => {
                      const isChecked = selectedMemberIds.size === 0 || selectedMemberIds.has(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs">
                          <input type="checkbox" checked={isChecked}
                            onChange={() => {
                              if (selectedMemberIds.size === 0) {
                                setSelectedMemberIds(new Set([m.id]));
                              } else if (selectedMemberIds.has(m.id)) {
                                const next = new Set(selectedMemberIds);
                                next.delete(m.id);
                                if (next.size === 0 || next.has('__none__')) setSelectedMemberIds(new Set());
                                else setSelectedMemberIds(next);
                              } else {
                                const next = new Set(selectedMemberIds);
                                next.delete('__none__');
                                next.add(m.id);
                                if (next.size === eligibleMembers.length) setSelectedMemberIds(new Set());
                                else setSelectedMemberIds(next);
                              }
                            }}
                            className="rounded text-blue-600" />
                          <span className="truncate flex-1">{m.fullName}</span>
                          <span className="text-[9px] text-gray-400 flex-shrink-0">{m.role}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
        {!isMemberTeam && (
        <span className="text-xs text-gray-500 flex items-center gap-2">
          <span>{filteredProjects.length} projects · {displayedMembers.length} members</span>
        </span>
        )}
        {!isMemberTeam && (projectFilter || lightFilter.has('gray') || lightFilter.size !== 3 || onlyAllocated || selectedMemberIds.size > 0 || focusedProjectId || missingRoleFilter !== 'none') && (
          <button onClick={() => {
            setProjectFilter('');
            setLightFilter(new Set(['green', 'yellow', 'red']));
            setOnlyAllocated(false);
            setSelectedMemberIds(new Set());
            setPeriodOffset(0);
            setFocusedProjectId(null);
            setMissingRoleFilter('none');
            // Reset manager to default (logged-in user or first)
            const userIsManager = availableManagers.managers.some(m => m.id === user?.id);
            if (userIsManager && user?.id) {
              setSelectedManagerIds(new Set([user.id]));
            } else if (availableManagers.managers.length > 0) {
              setSelectedManagerIds(new Set([availableManagers.managers[0].id]));
            }
          }} className="text-xs text-red-500 hover:text-red-700 hover:underline whitespace-nowrap">
            ✕ Reset filters
          </button>
        )}
        {/* Puzzle Me button */}
        {canWrite && !isMemberTeam && (
          <button onClick={() => setShowPuzzleMe(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200 border border-purple-200 ml-auto">
            🧩 Puzzle Me
          </button>
        )}
        {suggestions.length > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-purple-600 font-medium animate-pulse">✨ {suggestions.length} suggestions</span>
            <button onClick={() => {
              suggestions.forEach(s => {
                const sw = weekFromLegacySprint(s.year, s.month, s.sprint);
                addAllocation({
                  projectId: s.projectId, productManagerId: s.memberId,
                  year: s.year, month: s.month, sprint: s.sprint,
                  allocationPercentage: s.percentage, allocationDays: Math.round((s.percentage / 100) * workingDaysInWeek(sw)), isPlanned: true,
                }, currentUser.email);
              });
              setSuggestions([]);
            }} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
              ✓ Accept All
            </button>
            <button onClick={() => setSuggestions([])} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
              ✕ Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Period navigation - above the matrix */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-gray-50 border-b">
        <button onClick={() => setPeriodOffset(o => o - 4)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Back 4 weeks">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Back 1 week">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(0)} className="px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-200" title="Go to current">Today</button>
        <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Forward 1 week">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(o => o + 4)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Forward 4 weeks">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>

        {/* Employee pager — shown in-context next to the time navigation when there are more
            members than fit one page. One shared page applies to all sprints so each project
            row stays consistent. */}
        {!isMemberTeam && memberPageCount > 1 && (
          <div className="flex items-center gap-1 ml-3 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-[10px] font-semibold text-blue-700 mr-1">Employees</span>
            <button onClick={() => setMemberPage(0)} disabled={safeMemberPage === 0}
              className="px-1 text-blue-600 disabled:opacity-30 hover:bg-blue-100 rounded" title="First">«</button>
            <button onClick={() => setMemberPage(p => Math.max(0, p - 1))} disabled={safeMemberPage === 0}
              className="px-1 text-blue-600 disabled:opacity-30 hover:bg-blue-100 rounded" title="Previous employees">‹</button>
            <span className="text-[11px] font-medium text-blue-800 whitespace-nowrap">
              {safeMemberPage * MEMBERS_PER_PAGE + 1}–{Math.min((safeMemberPage + 1) * MEMBERS_PER_PAGE, displayedMembers.length)} of {displayedMembers.length}
            </span>
            <button onClick={() => setMemberPage(p => Math.min(memberPageCount - 1, p + 1))} disabled={safeMemberPage >= memberPageCount - 1}
              className="px-1 text-blue-600 disabled:opacity-30 hover:bg-blue-100 rounded" title="Next employees">›</button>
            <button onClick={() => setMemberPage(memberPageCount - 1)} disabled={safeMemberPage >= memberPageCount - 1}
              className="px-1 text-blue-600 disabled:opacity-30 hover:bg-blue-100 rounded" title="Last">»</button>
          </div>
        )}
        {/* Week / Sprint display level — toggle temporarily disabled, Sprint is always shown */}
        {VIEW_LEVEL_TOGGLE_ENABLED && (
          <div className="flex items-center border rounded-lg overflow-hidden ml-3">
            <button onClick={() => setViewLevel('week')}
              className={`px-2.5 py-1 text-[11px] font-medium ${viewLevel === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Week
            </button>
            <button onClick={() => setViewLevel('sprint')}
              className={`px-2.5 py-1 text-[11px] font-medium ${viewLevel === 'sprint' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Sprint
            </button>
          </div>
        )}
        {/* Sprint overlay controls — only rendered when there's something to show (the
            Week-level "Sprint row" toggle, or a focused project's sprint length). Otherwise
            the container would render as an empty white pill next to the nav arrows. */}
        {(viewLevel === 'week' || ((viewLevel === 'sprint' || showSprintRow) && focusedProjectId)) && (
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-white">
            {viewLevel === 'week' && (
              <label className="flex items-center gap-1 text-[10px] text-gray-600 font-medium cursor-pointer select-none">
                <input type="checkbox" checked={showSprintRow} onChange={e => setShowSprintRow(e.target.checked)} className="accent-blue-600" />
                Sprint row
              </label>
            )}
            {(viewLevel === 'sprint' || showSprintRow) && focusedProjectId && (
              <span className="text-[9px] text-blue-500">project: {effectiveSprintLength}w</span>
            )}
          </div>
        )}
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-x-scroll overflow-y-auto">
        <table className="border-collapse" style={{ minWidth: projW + ((viewLevel === 'week' ? weeks.length : sprintGroups.length) * memberCount * colW) }}>
          <thead className="sticky top-0 z-10">
            {pagedMembers.length === 1 ? (
              <>
                {/* Single employee: clean header */}
                <tr className="bg-blue-50">
                  <th rowSpan={showSprintRow ? 4 : 3} className="border-b border-r bg-gray-100 text-left px-2 py-1 sticky left-0 z-20 align-top"
                    style={{ width: projW, minWidth: projW }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">Active Projects</span>
                      {canManageProjects && (
                        <button onClick={() => setShowNewProjectModal(true)}
                          className="p-0.5 rounded hover:bg-green-100 text-green-600" title="Add new project">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <input type="text" placeholder="🔍 Search..." value={projectFilter}
                      onChange={e => setProjectFilter(e.target.value)}
                      className="w-full px-1.5 py-1 border rounded text-[10px] bg-white" />
                  </th>
                  <th colSpan={viewLevel === 'week' ? weeks.length : sprintGroups.length} className="border-b px-3 py-1.5 text-left">
                    <span className="text-xs font-bold text-blue-700">{pagedMembers[0].fullName}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{pagedMembers[0].role}</span>
                    {!isMemberTeam && <button onClick={() => setSelectedMemberIds(new Set())} className="ml-3 text-[9px] text-blue-500 hover:underline">[Show all]</button>}
                  </th>
                </tr>
                {viewLevel === 'week' ? (
                  <>
                    {/* Month + Week row (combined: "Aug 2026 · W2" / "09-13") */}
                    <tr className="bg-gray-50">
                      {weeks.map(w => (
                        <th key={weekKey(w)} className="border-b border-r border-l-2 border-l-gray-300 text-center py-1 text-[9px] text-gray-600" style={{ width: colW, minWidth: colW }}>
                          <div className="font-semibold">{getMonthWeekLabel(w)}</div>
                          <div className="text-[8px] text-gray-400">{getWeekDayRangeLabel(w)}</div>
                        </th>
                      ))}
                    </tr>
                    {/* Sprint row (optional) */}
                    {showSprintRow && (
                      <tr className="bg-blue-100 border-b-2 border-blue-300">
                        {sprintGroups.map((s, i) => (
                          <th key={i} colSpan={s.weeks.length} className="border-b border-r border-l-2 border-l-blue-300 text-center py-1 text-[10px] font-bold text-blue-800">
                            <div>{getSprintDateLabel(s)} <span className="text-[8px] font-semibold text-blue-600">{getSprintYearLabel(s)}</span></div>
                            <div>{getSprintDayRangeLabel(s)}</div>
                          </th>
                        ))}
                      </tr>
                    )}
                    {/* Capacity row */}
                    <tr className="bg-gray-50">
                      {weeks.map(w => {
                        const total = getMemberTotal(pagedMembers[0].id, w);
                        const cap = pagedMembers[0].capacity ?? 100;
                        const color = total > (cap * overCapacityThreshold / 100) ? 'text-red-600 bg-red-50' : total >= (cap * underCapacityThreshold / 100) ? 'text-green-700 bg-green-50' : total > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                        return (
                          <th key={`${weekKey(w)}-tot`} className={`border-b border-r text-center px-0.5 py-0.5 ${color}`} style={{ width: colW, minWidth: colW }}>
                            <span className="text-[9px] font-bold">{total}%</span>
                          </th>
                        );
                      })}
                    </tr>
                  </>
                ) : (
                  <>
                    {/* Sprint row (one column per sprint), dominant styling */}
                    <tr className="bg-blue-100 border-b-2 border-blue-300">
                      {sprintGroups.map((s, i) => (
                        <th key={i} className="border-b border-r border-l-2 border-l-blue-300 text-center py-1.5 text-[11px] font-bold text-blue-800" style={{ width: colW, minWidth: colW }}>
                          <div>{getSprintDateLabel(s)} <span className="text-[9px] font-semibold text-blue-600">{getSprintYearLabel(s)}</span></div>
                          <div>{getSprintDayRangeLabel(s)}</div>
                        </th>
                      ))}
                    </tr>
                    {/* Capacity row */}
                    <tr className="bg-gray-50">
                      {sprintGroups.map((s, i) => {
                        const weeklyTotals = s.weeks.map(w => getMemberTotal(pagedMembers[0].id, w));
                        const { average } = aggregateWeeklyValues(weeklyTotals);
                        const cap = pagedMembers[0].capacity ?? 100;
                        const color = average > (cap * overCapacityThreshold / 100) ? 'text-red-600 bg-red-50' : average >= (cap * underCapacityThreshold / 100) ? 'text-green-700 bg-green-50' : average > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                        return (
                          <th key={i} className={`border-b border-r text-center px-0.5 py-0.5 ${color}`} style={{ width: colW, minWidth: colW }}>
                            <span className="text-[9px] font-bold">{average}%</span>
                          </th>
                        );
                      })}
                    </tr>
                  </>
                )}
              </>
            ) : (
              <>
            {/* Row 1: Month+Week (or Sprint) band spanning all members */}
            <tr className="bg-gray-100">
              <th rowSpan={viewLevel === 'week' ? (showSprintRow ? 4 : 3) : 3} className="border-b border-r bg-gray-100 text-left px-2 py-1 sticky left-0 z-20 align-bottom"
                style={{ width: projW, minWidth: projW }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Active Projects</span>
                  {canManageProjects && (
                    <button onClick={() => setShowNewProjectModal(true)}
                      className="p-0.5 rounded hover:bg-green-100 text-green-600" title="Add new project">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
                <input type="text" placeholder="🔍 Search..." value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="w-full px-1.5 py-1 border rounded text-[10px] bg-white" />
              </th>
              {viewLevel === 'week' ? weeks.map(w => (
                <th key={weekKey(w)} colSpan={memberCount} className="border-b border-r border-l-2 border-l-gray-400 text-center py-1 bg-gray-100 text-[10px] font-bold text-gray-800">
                  <div>{getMonthWeekLabel(w)}</div>
                  <div className="text-[9px] font-normal text-gray-500">{getWeekDayRangeLabel(w)}</div>
                </th>
              )) : sprintGroups.map((s, i) => (
                <th key={i} colSpan={memberCount} className="border-b border-r border-l-2 border-l-blue-300 text-center py-1.5 bg-blue-100 text-[11px] font-bold text-blue-800">
                  <div>{getSprintDateLabel(s)} <span className="text-[9px] font-semibold text-blue-600">{getSprintYearLabel(s)}</span></div>
                  <div>{getSprintDayRangeLabel(s)}</div>
                </th>
              ))}
            </tr>
            {/* Row 2: Sprint band (week mode only, optional) */}
            {viewLevel === 'week' && showSprintRow && (
              <tr className="bg-blue-100 border-b-2 border-blue-300">
                {sprintGroups.map((s, i) => (
                  <th key={i} colSpan={s.weeks.length * memberCount} className="border-b border-r border-l-2 border-l-blue-300 text-center py-1 text-[10px] font-bold text-blue-800">
                    <div>{getSprintDateLabel(s)} <span className="text-[8px] font-semibold text-blue-600">{getSprintYearLabel(s)}</span></div>
                    <div>{getSprintDayRangeLabel(s)}</div>
                  </th>
                ))}
              </tr>
            )}
            {/* Member names */}
            <tr className="bg-gray-50">
              {(viewLevel === 'week' ? weeks : sprintGroups).map((period, wIdx) =>
                pagedMembers.map((member, mIdx) => (
                  <th key={`${viewLevel === 'week' ? weekKey(period as WeekInfo) : wIdx}-${member.id}`} className={`border-b border-r text-center px-0.5 py-1 cursor-pointer hover:bg-blue-50 ${wIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${selectedMemberIds.size === 1 && selectedMemberIds.has(member.id) ? 'bg-blue-100' : ''}`}
                    style={{ width: colW, minWidth: colW }} title={`${member.fullName} (${member.role}) — Click to filter`}
                    onClick={() => {
                      if (selectedMemberIds.size === 1 && selectedMemberIds.has(member.id)) {
                        setSelectedMemberIds(new Set());
                      } else {
                        setSelectedMemberIds(new Set([member.id]));
                        setOnlyAllocated(true);
                      }
                    }}>
                    <div className="text-[9px] font-semibold text-gray-700 truncate">{member.fullName.split(' ')[0]}</div>
                  </th>
                ))
              )}
            </tr>
            {/* Capacity totals per member per period (leaf row above data) */}
            <tr className="bg-gray-50">
              {viewLevel === 'week' ? weeks.map((w, wIdx) =>
                pagedMembers.map((member, mIdx) => {
                  const total = getMemberTotal(member.id, w);
                  const cap = member.capacity ?? 100;
                  const color = total > (cap * overCapacityThreshold / 100) ? 'text-red-600 bg-red-50' : total >= (cap * underCapacityThreshold / 100) ? 'text-green-700 bg-green-50' : total > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                  return (
                    <th key={`${weekKey(w)}-${member.id}-tot`} className={`border-b border-r text-center px-0.5 py-0.5 ${color} ${wIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''}`}
                      style={{ width: colW, minWidth: colW }} title={`${member.fullName} total this week`}>
                      <span className="text-[9px] font-bold">{total}%</span>
                    </th>
                  );
                })
              ) : sprintGroups.map((s, sIdx) =>
                pagedMembers.map((member, mIdx) => {
                  const weeklyTotals = s.weeks.map(w => getMemberTotal(member.id, w));
                  const { average } = aggregateWeeklyValues(weeklyTotals);
                  const cap = member.capacity ?? 100;
                  const color = average > (cap * overCapacityThreshold / 100) ? 'text-red-600 bg-red-50' : average >= (cap * underCapacityThreshold / 100) ? 'text-green-700 bg-green-50' : average > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                  return (
                    <th key={`${sIdx}-${member.id}-tot`} className={`border-b border-r text-center px-0.5 py-0.5 ${color} ${sIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''}`}
                      style={{ width: colW, minWidth: colW }} title={`${member.fullName} average this sprint`}>
                      <span className="text-[9px] font-bold">{average}%</span>
                    </th>
                  );
                })
              )}
            </tr>
              </>
            )}
          </thead>
          <tbody>
            {filteredProjects.map(project => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="border-b border-r px-2 py-1 sticky left-0 bg-white z-5"
                  style={{ width: projW, minWidth: projW }} title={`${project.customerName} - ${project.projectName}`}>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {(() => { const lk = projectLightById.get(project.id) || 'gray'; const light = LIGHT_MAP[lk] || LIGHT_MAP.gray; return (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${light.color}`} title={light.label} />
                        ); })()}
                        {isMemberTeam ? (
                          <span className="text-[10px] font-semibold text-gray-900 truncate">{project.customerName}</span>
                        ) : (
                        <button onClick={() => setEditProjectId(project.id)} className="text-[10px] font-semibold text-gray-900 truncate hover:text-blue-600 hover:underline" title="Click to edit project">
                          {project.customerName}
                        </button>
                        )}
                      </div>
                      {isMemberTeam ? (
                        <span className="text-[10px] text-gray-500 truncate pl-3">{project.projectName}</span>
                      ) : (
                      <button onClick={() => setEditProjectId(project.id)} className="text-[10px] text-gray-500 truncate pl-3 hover:text-blue-600 hover:underline" title="Click to edit project">
                        {project.projectName}
                      </button>
                      )}
                    </div>
                    {!isMemberTeam && (
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => setInfoProjectId(project.id)}
                        className="p-0.5 rounded hover:bg-blue-100 text-blue-500" title="Project info">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {canManageProjects && (
                        <button onClick={() => {
                          if (confirm(`Set "${project.projectName}" as Inactive?`)) {
                            updateProject(project.id, { status: 'Inactive' });
                          }
                        }}
                          className="p-0.5 rounded hover:bg-red-100 text-red-400" title="Set as Inactive">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      {/* Start/ETA icon */}
                      <button onClick={() => setStartEtaProjectId(startEtaProjectId === project.id ? null : project.id)}
                        className={`p-0.5 rounded hover:bg-purple-100 ${project.plannedStartMonth || project.etaMonth ? 'text-purple-500' : 'text-gray-300'}`}
                        title={project.plannedStartMonth ? `Start: ${MONTH_NAMES[(project.plannedStartMonth || 1) - 1]} S${project.plannedStartSprint || 1}${project.etaMonth ? ` \u2192 ETA: ${MONTH_NAMES[(project.etaMonth || 1) - 1]} S${project.etaSprint || 1}` : ''}` : 'Set Start/ETA'}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {/* Comment icon */}
                      <button onClick={() => setCommentProjectId(commentProjectId === project.id ? null : project.id)}
                        className={`p-0.5 rounded hover:bg-blue-100 ${project.projectComment ? 'text-blue-500' : 'text-gray-300'}`}
                        title={project.projectComment || 'Add comment'}>
                        <svg className="w-3 h-3" fill={project.projectComment ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>
                      {/* Focus on project members icon - only show if project has allocations */}
                      {allocations.some(a => a.projectId === project.id) && (
                      <button onClick={() => handleFocusProject(project.id)}
                        className={`p-0.5 rounded hover:bg-green-100 ${focusedProjectId === project.id ? 'text-green-600 bg-green-100' : 'text-gray-300'}`}
                        title={focusedProjectId === project.id ? 'Unfocus (show all)' : 'Show only members allocated to this project'}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                      )}
                    </div>
                    )}
                  </div>
                </td>
                {viewLevel === 'week' ? weeks.map((week, wIdx) =>
                  pagedMembers.map((member, mIdx) => {
                    const data = getCellData(project.id, member.id, week);
                    const isYellowProject = projectLightById.get(project.id) === 'yellow';
                    // Suggestions are sprint-keyed; match to the week that represents that sprint.
                    const suggestion = suggestionByCell.get(`${project.id}|${member.id}|${week.isoYear}|${week.isoWeek}`);
                    return (
                      <td key={`${weekKey(week)}-${member.id}`}
                        className={`border-b border-r text-center ${isMemberTeam ? '' : 'cursor-pointer'} transition-colors ${wIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${
                          suggestion
                            ? 'bg-purple-100 animate-pulse border-2 border-purple-400'
                            : data.hasAny
                              ? isYellowProject
                                ? (data.pct >= 80 ? 'bg-yellow-200 hover:bg-yellow-300' : data.pct >= 40 ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-yellow-50 hover:bg-yellow-100')
                                : (data.pct >= 80 ? 'bg-blue-200 hover:bg-blue-300' : data.pct >= 40 ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100')
                              : 'hover:bg-gray-100'
                        }`}
                        style={{ width: colW, minWidth: colW, height: 32 }}
                        onClick={() => {
                          if (isMemberTeam) return;
                          if (suggestion) {
                            const sw = weekFromLegacySprint(suggestion.year, suggestion.month, suggestion.sprint);
                            addAllocation({
                              projectId: suggestion.projectId, productManagerId: suggestion.memberId,
                              isoYear: sw.isoYear, isoWeek: sw.isoWeek, weekStartDate: sw.startDate,
                              year: suggestion.year, month: suggestion.month, sprint: suggestion.sprint,
                              allocationPercentage: suggestion.percentage, allocationDays: Math.round((suggestion.percentage / 100) * workingDaysInWeek(sw)), isPlanned: true,
                            }, currentUser.email);
                            setSuggestions(prev => prev.filter(s => s !== suggestion));
                          } else {
                            openCell(project.id, member.id, week);
                          }
                        }}
                        title={suggestion
                          ? `✨ Suggested: ${member.fullName} ${suggestion.percentage}% — Click to accept`
                          : data.hasAny ? `${member.fullName} ${data.display}${isYellowProject ? ' ⚠️ Not signed off' : ''} (click to edit)` : `Assign ${member.fullName}`}>
                        {suggestion && <span className="text-[10px] font-bold text-purple-700">✨{suggestion.percentage}%</span>}
                        {!suggestion && data.hasAny && <span className={`text-[10px] font-semibold ${isYellowProject ? 'text-yellow-800' : 'text-blue-800'}`}>{data.display}</span>}
                      </td>
                    );
                  })
                ) : sprintGroups.map((sprint, sIdx) =>
                  pagedMembers.map((member, mIdx) => {
                    const data = getSprintCellData(project.id, member.id, sprint);
                    const isYellowProject = projectLightById.get(project.id) === 'yellow';
                    return (
                      <td key={`${sIdx}-${member.id}`}
                        className={`border-b border-r text-center ${isMemberTeam ? '' : 'cursor-pointer'} transition-colors ${sIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${
                          data.hasAny
                            ? isYellowProject
                              ? (data.average >= 80 ? 'bg-yellow-200 hover:bg-yellow-300' : data.average >= 40 ? 'bg-yellow-100 hover:bg-yellow-200' : 'bg-yellow-50 hover:bg-yellow-100')
                              : (data.average >= 80 ? 'bg-blue-200 hover:bg-blue-300' : data.average >= 40 ? 'bg-blue-100 hover:bg-blue-200' : 'bg-blue-50 hover:bg-blue-100')
                            : 'hover:bg-gray-100'
                        }`}
                        style={{ width: colW, minWidth: colW, height: 32 }}
                        onClick={() => {
                          if (isMemberTeam) return;
                          setSpanEditor({ projectId: project.id, memberId: member.id, sprintIndex: sIdx });
                        }}
                        title={data.hasAny
                          ? `${member.fullName} avg ${data.average}%${data.varies ? ' (varies by week — click to edit per week)' : ''}${isYellowProject ? ' ⚠️ Not signed off' : ''} (click to edit)`
                          : `Assign ${member.fullName}`}>
                        {data.hasAny && (
                          <span className={`text-[10px] font-semibold inline-flex items-center gap-1 ${isYellowProject ? 'text-yellow-800' : 'text-blue-800'}`}>
                            {data.average}%
                            {data.varies && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Varies by week" />}
                          </span>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
            {filteredProjects.length === 0 && (
              <tr><td colSpan={1 + (viewLevel === 'week' ? weeks.length : sprintGroups.length) * memberCount} className="text-center py-8 text-gray-400 text-sm">No projects found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editCell && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={closeEdit}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-900 mb-1">{editAllocId ? 'Edit' : 'Add'} Allocation</div>
            <div className="text-xs text-gray-600 mb-4">
              {(() => {
                const p = projects.find(pr => pr.id === editCell.projectId);
                const m = displayedMembers.find(mm => mm.id === editCell.memberId);
                const w = weeks.find(ww => weekKey(ww) === editCell.periodKey);
                return `${p?.customerName} - ${p?.projectName} → ${m?.fullName} | ${w ? `${getMonthWeekLabel(w)} (${getWeekDayRangeLabel(w)})` : ''}`;
              })()}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Allocation %</label>
              <input type="number" min="0" max="100" value={editPercentage} onChange={e => setEditPercentage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && editSprintCount === 1 && editScope === 'current' && spanMode === 'sprints') handleSave(); if (e.key === 'Escape') closeEdit(); }}
                className="w-full px-3 py-2 border rounded text-sm" placeholder="0-100" autoFocus />
            </div>

            {editAllocId ? (
              /* Editing an existing allocation: choose scope (this only vs this + future). */
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Apply changes to</label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="editScope" value="current" checked={editScope === 'current'}
                      onChange={() => setEditScope('current')} className="mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-gray-900">This allocation only</div>
                      <div className="text-[11px] text-gray-500">Update just this week</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="editScope" value="future" checked={editScope === 'future'}
                      onChange={() => setEditScope('future')} className="mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-gray-900">This and all future allocations</div>
                      <div className="text-[11px] text-gray-500">
                        Update this and every later week for this member on this project
                        {editScope === 'future' && ` (${editSpanWeeks.length} week${editSpanWeeks.length !== 1 ? 's' : ''})`}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              /* Adding a new allocation: span by number of sprints or up to an end date. */
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Span
                  {(() => {
                    const project = projects.find(p => p.id === editCell.projectId);
                    const len = project?.sprintLengthWeeks ?? 2;
                    return (
                      <span className="ml-1.5 text-[11px] font-normal text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        {len}-week sprint
                      </span>
                    );
                  })()}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="spanMode" value="sprints" checked={spanMode === 'sprints'}
                      onChange={() => setSpanMode('sprints')} />
                    <span className="text-xs text-gray-700">Number of sprints</span>
                    <input type="number" min="1" max="52" value={editSprintCount}
                      disabled={spanMode !== 'sprints'}
                      onChange={e => setEditSprintCount(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                      className="w-16 px-2 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="spanMode" value="endDate" checked={spanMode === 'endDate'}
                      onChange={() => setSpanMode('endDate')} />
                    <span className="text-xs text-gray-700">Until end date</span>
                    <input type="date" value={spanEndDate}
                      disabled={spanMode !== 'endDate'}
                      min={(weeks.find(w => weekKey(w) === editCell.periodKey)?.startDate) || undefined}
                      onChange={e => setSpanEndDate(e.target.value)}
                      className="px-2 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Spans {editSpanWeeks.length} week{editSpanWeeks.length !== 1 ? 's' : ''} starting this week
                  {editSpanWeeks.length > 0 && ` (through ${formatDDMM(editSpanWeeks[editSpanWeeks.length - 1].startDate)})`}.
                </p>
                {editOverlapCount > 0 && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5">
                    ⚠️ {editOverlapCount} of {editSpanWeeks.length} week(s) already {editOverlapCount === 1 ? 'has' : 'have'} an allocation for this member — saving will overwrite {editOverlapCount === 1 ? 'it' : 'them'}.
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <div>{editAllocId && <button onClick={handleDelete} className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">{editScope === 'future' ? 'Delete + future' : 'Delete'}</button>}</div>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs">Cancel</button>
                <button onClick={handleSave} disabled={!editPercentage} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">{editAllocId ? 'Save' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sprint-level cell sub-editor (per-week breakdown) */}
      {spanEditor && (() => {
        const project = projects.find(p => p.id === spanEditor.projectId);
        const member = displayedMembers.find(m => m.id === spanEditor.memberId);
        const sprint = sprintGroups[spanEditor.sprintIndex];
        if (!project || !member || !sprint) return null;
        const initialValues = sprint.weeks.map(w => getCellData(spanEditor.projectId, spanEditor.memberId, w).pct);
        const isNew = initialValues.every(v => !v || v <= 0);
        return (
          <WeekSpanEditor
            title={`${project.customerName} - ${project.projectName} → ${member.fullName} | ${getSprintTitleLabel(sprint)}`}
            weeks={sprint.weeks}
            initialValues={initialValues}
            isNew={isNew}
            sprintLengthWeeks={project.sprintLengthWeeks ?? effectiveSprintLength}
            onSave={(values, scope) => saveSpanEditor(spanEditor.projectId, spanEditor.memberId, sprint, values, scope)}
            onSaveWithSpan={(values, extraWeeks, pct) => saveSpanEditorWithSpan(spanEditor.projectId, spanEditor.memberId, sprint, values, extraWeeks, pct)}
            onDelete={(scope) => clearSpanEditor(spanEditor.projectId, spanEditor.memberId, sprint, scope)}
            onClose={() => setSpanEditor(null)}
          />
        );
      })()}

      {/* Puzzle Me */}
      {showPuzzleMe && (
        <PuzzleMe
          onSuggestionsReady={(s) => { setSuggestions(s); setShowPuzzleMe(false); }}
          onClose={() => setShowPuzzleMe(false)}
        />
      )}

      {/* New Project Modal */}
      <Modal isOpen={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} title="Create New Customer Project">
        <ProjectForm
          onSuccess={() => setShowNewProjectModal(false)}
          onCancel={() => setShowNewProjectModal(false)}
        />
      </Modal>

      {/* Edit Project Modal */}
      {editProjectId && (() => {
        const p = projects.find(pr => pr.id === editProjectId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setEditProjectId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-5 w-[450px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Edit Project</h3>
                <button onClick={() => setEditProjectId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <EditProjectForm project={p} onSave={(updates) => { updateProject(p.id, updates); setEditProjectId(null); }} onCancel={() => setEditProjectId(null)} teamMembers={teamMembers} allProjects={projects} />
            </div>
          </div>
        );
      })()}

      {/* Project Info Modal */}
      {infoProjectId && (() => {
        const p = projects.find(pr => pr.id === infoProjectId);
        if (!p) return null;
        const pmo = p.pmoContact ? teamMembers.find(m => m.id === p.pmoContact) : null;
        const projectAllocs = allocations.filter(a => a.projectId === p.id);
        const uniqueMembers = [...new Set(projectAllocs.map(a => a.productManagerId))];
        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setInfoProjectId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-5 w-96 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">{p.customerName}</div>
                  <div className="text-lg font-bold text-gray-900">{p.projectName}</div>
                </div>
                <button onClick={() => setInfoProjectId(null)} className="text-gray-400 hover:text-gray-600">{'\u2715'}</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded text-xs ${p.status === 'Active' ? 'bg-green-100 text-green-800' : p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{p.projectType || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Region</span><span>{p.region || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">PMO Contact</span><span>{pmo?.fullName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Allocations</span><span>{projectAllocs.length} across {uniqueMembers.length} member(s)</span></div>
                {p.requiredRoles && p.requiredRoles.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-gray-500 text-xs mb-1">Required Resources</div>
                    <div className="flex flex-wrap gap-1">
                      {p.requiredRoles.map(role => (
                        <span key={role} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{role}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.latestStatus && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-gray-500 text-xs mb-1">Latest Status</div>
                    <div className="text-xs text-gray-700">{p.latestStatus}</div>
                  </div>
                )}
                {p.activityCloseDate && (
                  <div className="flex justify-between"><span className="text-gray-500">Activity Sign Off Date</span><span>{p.activityCloseDate}</span></div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Start/ETA Popover */}
      {startEtaProjectId && (() => {
        const p = projects.find(pr => pr.id === startEtaProjectId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setStartEtaProjectId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-4 w-[340px]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-900">Start / ETA</h4>
                <button onClick={() => setStartEtaProjectId(null)} className="text-gray-400 hover:text-gray-600 text-sm">{'\u2715'}</button>
              </div>
              <div className="text-xs text-gray-500 mb-3">{p.customerName} - {p.projectName}</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Start</label>
                  <div className="flex gap-1">
                    <select value={p.plannedStartMonth || ''} onChange={e => updateProject(p.id, { plannedStartMonth: Number(e.target.value) || undefined })}
                      className="px-2 py-1.5 border rounded text-xs bg-white flex-1">
                      <option value="">Month</option>
                      {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={p.plannedStartSprint || ''} onChange={e => updateProject(p.id, { plannedStartSprint: Number(e.target.value) || undefined })}
                      className="px-2 py-1.5 border rounded text-xs bg-white">
                      <option value="">Sprint</option>
                      <option value={1}>S1</option>
                      <option value={2}>S2</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500 font-medium">ETA</label>
                    <div className="flex bg-gray-100 rounded p-0.5">
                      <button onClick={() => setEtaMode('date')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${etaMode === 'date' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                        Date
                      </button>
                      <button onClick={() => setEtaMode('sprints')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${etaMode === 'sprints' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
                        Sprints
                      </button>
                    </div>
                  </div>
                  {etaMode === 'date' ? (
                    <div className="flex gap-1">
                      <select value={p.etaMonth || ''} onChange={e => {
                        const newMonth = Number(e.target.value) || undefined;
                        const updates: any = { etaMonth: newMonth };
                        // Auto-calc sprint count if start is set
                        if (newMonth && p.etaSprint && p.plannedStartMonth && p.plannedStartSprint) {
                          const startVal = ((p.plannedStartYear || new Date().getFullYear()) * 24) + ((p.plannedStartMonth - 1) * 2) + (p.plannedStartSprint);
                          const etaVal = ((p.plannedStartYear || new Date().getFullYear()) * 24) + ((newMonth - 1) * 2) + (p.etaSprint);
                          updates.plannedSprintCount = Math.max(1, etaVal - startVal + 1);
                        }
                        updateProject(p.id, updates);
                      }}
                        className="px-2 py-1.5 border rounded text-xs bg-white flex-1">
                        <option value="">Month</option>
                        {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={p.etaSprint || ''} onChange={e => {
                        const newSprint = Number(e.target.value) || undefined;
                        const updates: any = { etaSprint: newSprint };
                        // Auto-calc sprint count if start is set
                        if (p.etaMonth && newSprint && p.plannedStartMonth && p.plannedStartSprint) {
                          const startVal = ((p.plannedStartYear || new Date().getFullYear()) * 24) + ((p.plannedStartMonth - 1) * 2) + (p.plannedStartSprint);
                          const etaVal = ((p.plannedStartYear || new Date().getFullYear()) * 24) + ((p.etaMonth - 1) * 2) + (newSprint);
                          updates.plannedSprintCount = Math.max(1, etaVal - startVal + 1);
                        }
                        updateProject(p.id, updates);
                      }}
                        className="px-2 py-1.5 border rounded text-xs bg-white">
                        <option value="">Sprint</option>
                        <option value={1}>S1</option>
                        <option value={2}>S2</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="24"
                        value={p.plannedSprintCount || ''}
                        onChange={e => {
                          const count = Number(e.target.value) || undefined;
                          const updates: any = { plannedSprintCount: count };
                          // Auto-calc ETA date from start + sprints
                          if (count && p.plannedStartMonth && p.plannedStartSprint) {
                            let y = p.plannedStartYear || new Date().getFullYear();
                            let m = p.plannedStartMonth;
                            let s = p.plannedStartSprint;
                            // Advance by (count - 1) sprints to get the last sprint
                            for (let i = 1; i < count; i++) {
                              s++;
                              if (s > 2) { s = 1; m++; }
                              if (m > 12) { m = 1; y++; }
                            }
                            updates.etaMonth = m;
                            updates.etaSprint = s;
                            updates.etaYear = y;
                          }
                          updateProject(p.id, updates);
                        }}
                        className="w-16 px-2 py-1.5 border rounded text-xs text-center" placeholder="-" />
                      <span className="text-xs text-gray-500">sprints from start</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Comment Popover */}
      {commentProjectId && (() => {
        const p = projects.find(pr => pr.id === commentProjectId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setCommentProjectId(null)}>
            <div className="bg-white rounded-lg shadow-xl p-4 w-[320px]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-900">Comment</h4>
                <button onClick={() => setCommentProjectId(null)} className="text-gray-400 hover:text-gray-600 text-sm">{'\u2715'}</button>
              </div>
              <div className="text-xs text-gray-500 mb-2">{p.customerName} - {p.projectName}</div>
              <textarea
                defaultValue={p.projectComment || ''}
                onBlur={e => updateProject(p.id, { projectComment: e.target.value.trim() || undefined })}
                className="w-full px-2 py-1.5 border rounded text-xs bg-white resize-none"
                rows={3} placeholder="Add a comment..." autoFocus />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Inline Edit Project Form
function EditProjectForm({ project, onSave, onCancel, teamMembers, allProjects }: {
  project: any;
  onSave: (updates: any) => void;
  onCancel: () => void;
  teamMembers: any[];
  allProjects: any[];
}) {
  const now = new Date();
  const [form, setForm] = useState({
    customerName: project.customerName || '',
    projectName: project.projectName || '',
    projectType: project.projectType || 'Software',
    status: project.status || 'Active',
    pmoContact: project.pmoContact || '',
    activityCloseDate: project.activityCloseDate || '',
    latestStatus: project.latestStatus || '',
    region: project.region || '',
    sprintLengthWeeks: (project.sprintLengthWeeks ?? 2) as 1 | 2 | 3,
    plannedStartMonth: project.plannedStartMonth || (now.getMonth() + 1),
    plannedStartYear: project.plannedStartYear || now.getFullYear(),
    plannedStartSprint: project.plannedStartSprint || 1,
    requiredCapacity: project.requiredCapacity ?? '',
    plannedSprintCount: project.plannedSprintCount ?? '',
    requiredRoles: project.requiredRoles || ['PMO', 'Product Manager', 'AI Architect'],
  });

  // Get unique roles from active team members
  const availableRoles = Array.from(new Set(teamMembers.filter((m: any) => m.isActive && m.role).map((m: any) => m.role))).sort() as string[];
  const DEFAULT_REQUIRED_ROLES = ['PMO', 'Product Manager', 'AI Architect'];
  const allRoles = [...new Set([...DEFAULT_REQUIRED_ROLES, ...availableRoles])].sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      customerName: form.customerName.trim(),
      projectName: form.projectName.trim(),
      projectType: form.projectType,
      status: form.status,
      pmoContact: form.pmoContact || undefined,
      activityCloseDate: form.activityCloseDate || undefined,
      latestStatus: form.latestStatus || undefined,
      region: form.region || undefined,
      sprintLengthWeeks: form.sprintLengthWeeks,
      plannedStartMonth: form.plannedStartMonth || undefined,
      plannedStartYear: form.plannedStartYear || undefined,
      plannedStartSprint: form.plannedStartSprint || undefined,
      requiredCapacity: form.requiredCapacity !== '' ? Number(form.requiredCapacity) : undefined,
      plannedSprintCount: form.plannedSprintCount !== '' ? Number(form.plannedSprintCount) : undefined,
      requiredRoles: form.requiredRoles,
    });
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pmoMembers = teamMembers.filter(m => m.role === 'PMO' && m.isActive).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
  const otherMembers = teamMembers.filter(m => m.role !== 'PMO' && m.isActive).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
        <input type="text" list="customer-list-edit" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm" required placeholder="Select existing or type new" />
        <datalist id="customer-list-edit">
          {[...new Set(allProjects.map((p: any) => p.customerName))].sort().map((name: string) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
        <input type="text" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm">
            <option value="Software">Software</option><option value="AI">AI</option><option value="Hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm">
            <option value="Active">Active</option>
            <option value="Completed">Completed</option><option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Activity Sign Off Date</label>
        <input type="date" value={form.activityCloseDate} onChange={e => setForm({ ...form, activityCloseDate: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Sprint Length</label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map(len => (
            <button
              key={len}
              type="button"
              onClick={() => {
                if (len !== form.sprintLengthWeeks) {
                  const ok = confirm(
                    `Change sprint length to ${len} ${len === 1 ? 'week' : 'weeks'}?\n\n` +
                    `This only changes the default allocation span for new assignments. ` +
                    `Existing weekly allocations are not affected.`
                  );
                  if (!ok) return;
                }
                setForm({ ...form, sprintLengthWeeks: len });
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                form.sprintLengthWeeks === len
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {len} {len === 1 ? 'week' : 'weeks'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Default span pre-selected when allocating. Existing allocations are unaffected.</p>
      </div>

      {/* Planning fields */}
      <div className="border-t pt-3 mt-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">📋 Planning</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Start Month</label>
            <select value={form.plannedStartMonth} onChange={e => setForm({ ...form, plannedStartMonth: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border rounded text-xs">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Year</label>
            <select value={form.plannedStartYear} onChange={e => setForm({ ...form, plannedStartYear: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border rounded text-xs">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map(y =>
                <option key={y} value={y}>{y}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Sprint</label>
            <select value={form.plannedStartSprint} onChange={e => setForm({ ...form, plannedStartSprint: Number(e.target.value) })}
              className="w-full px-2 py-1.5 border rounded text-xs">
              <option value={1}>S1 (1-15)</option>
              <option value={2}>S2 (16-31)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Number of Sprints</label>
            <input type="number" min="1" max="24" value={form.plannedSprintCount}
              onChange={e => setForm({ ...form, plannedSprintCount: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-xs" placeholder="1-24" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">PMO Contact</label>
        <select value={form.pmoContact} onChange={e => setForm({ ...form, pmoContact: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm">
          <option value="">Select PMO Contact</option>
          {pmoMembers.length > 0 && <optgroup label="PMO Resources">
            {pmoMembers.map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </optgroup>}
          {otherMembers.length > 0 && <optgroup label="Other Resources">
            {otherMembers.map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </optgroup>}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Required Resources</label>
        <div className="border rounded p-2 space-y-1 max-h-32 overflow-y-auto bg-gray-50">
          {allRoles.map(role => (
            <label key={role} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-0.5 rounded text-xs">
              <input
                type="checkbox"
                checked={form.requiredRoles.includes(role)}
                onChange={() => {
                  setForm(prev => ({
                    ...prev,
                    requiredRoles: prev.requiredRoles.includes(role)
                      ? prev.requiredRoles.filter((r: string) => r !== role)
                      : [...prev.requiredRoles, role]
                  }));
                }}
                className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>{role}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Latest Status / Notes</label>
        <textarea value={form.latestStatus} onChange={e => setForm({ ...form, latestStatus: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm" rows={2} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded text-sm">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
      </div>
    </form>
  );
}
