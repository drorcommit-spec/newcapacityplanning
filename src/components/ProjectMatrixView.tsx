import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import Modal from './Modal';
import ProjectForm from './ProjectForm';
import PuzzleMe, { Suggestion } from './PuzzleMe';

type TimeMode = 'sprint' | 'month';
type StatusFilter = 'active' | 'all' | 'inactive';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const UNASSIGNED_MANAGER_ID = '__unassigned__';

interface PeriodCol {
  key: string;
  label: string;
  sublabel: string;
  year: number;
  month: number;
  sprint: number;
}

export default function ProjectMatrixView() {
  const { projects, allocations, teamMembers, addAllocation, updateAllocation, deleteAllocation, addProject, updateProject } = useData();
  const { user } = useAuth();
  const { canWrite, canManageProjects, isMemberTeam } = usePermissions();
  const currentUser = user || { email: 'unknown' };

  const [timeMode, setTimeMode] = useState<TimeMode>('sprint');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [lightFilter, setLightFilter] = useState<Set<string>>(new Set(['green', 'yellow', 'red']));
  const [onlyAllocated, setOnlyAllocated] = useState(true);

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
  const [selectedManagerIds, setSelectedManagerIds] = useState<Set<string>>(new Set());
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  // All active members (no role filter)
  const allActiveMembers = useMemo(() =>
    teamMembers
      .filter(m => m.isActive)
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers]
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

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllMembers = () => setSelectedMemberIds(new Set());
  const selectNoMembers = () => setSelectedMemberIds(new Set(['__none__'])); // special: shows 0 columns

  // Generate visible periods - dynamic based on employee filter and screen space
  const periods: PeriodCol[] = useMemo(() => {
    const cols: PeriodCol[] = [];
    const today = new Date();
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth() + 1;
    const nowSprint = today.getDate() <= 15 ? 1 : 2;
    const nowVal = nowYear * 24 + (nowMonth - 1) * 2 + nowSprint;

    const hasEmployeeFilter = selectedMemberIds.size > 0 && !selectedMemberIds.has('__none__');
    const memberCount = displayedMembers.length || 1;

    // Calculate how many periods fit on screen based on member count
    // Use window width dynamically, fallback to 1920 for wide screens
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const availableWidth = screenWidth - 200; // subtract project column + padding
    const periodWidth = memberCount * 58;
    const fitOnScreen = Math.max(3, Math.floor(availableWidth / periodWidth));

    let startVal = nowVal + periodOffset;
    // Default: 1 year ahead (24 sprints or 12 months)
    let periodCount = timeMode === 'sprint' ? 24 : 12;

    if (hasEmployeeFilter) {
      const memberIds = displayedMembers.map(m => m.id);
      const memberAllocs = allocations.filter(a => memberIds.includes(a.productManagerId));

      if (memberAllocs.length > 0) {
        let minVal = Infinity;
        let maxVal = 0;
        for (const a of memberAllocs) {
          const val = a.year * 24 + (a.month - 1) * 2 + a.sprint;
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }

        if (periodOffset === 0) {
          // Auto-range: from earliest allocation to latest, minimum 1 year
          startVal = Math.min(minVal, nowVal);
          const endVal = Math.max(maxVal, nowVal + (timeMode === 'sprint' ? 24 : 24));
          const needed = timeMode === 'sprint'
            ? endVal - startVal + 1
            : Math.ceil((endVal - startVal + 1) / 2);
          periodCount = Math.max(periodCount, Math.min(needed, 30));
        }
        // When navigating with offset, use fitOnScreen count
      }
    }

    // Convert startVal back to year/month/sprint
    let year = Math.floor((startVal - 1) / 24);
    let rem = startVal - (year * 24);
    let month = Math.floor((rem - 1) / 2) + 1;
    let sprint = ((rem - 1) % 2) + 1;

    if (timeMode === 'sprint') {
      for (let i = 0; i < periodCount; i++) {
        cols.push({
          key: `${year}-${month}-${sprint}`,
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          sublabel: `S${sprint} (${sprint === 1 ? '1-15' : '16-31'})`,
          year, month, sprint,
        });
        sprint++;
        if (sprint > 2) { sprint = 1; month++; }
        if (month > 12) { month = 1; year++; }
      }
    } else {
      // For month mode with offset
      if (!hasEmployeeFilter || periodOffset !== 0) {
        month += periodOffset;
        while (month > 12) { month -= 12; year++; }
        while (month < 1) { month += 12; year--; }
      }
      for (let i = 0; i < periodCount; i++) {
        cols.push({
          key: `${year}-${month}`,
          label: `${MONTH_NAMES[month - 1]} ${year}`,
          sublabel: '',
          year, month, sprint: 0,
        });
        month++;
        if (month > 12) { month = 1; year++; }
      }
    }
    return cols;
  }, [timeMode, periodOffset, selectedMemberIds, displayedMembers, allocations]);

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

  // Get allocation(s) for a cell - returns both sprints info for month view
  const getCellData = (projectId: string, memberId: string, period: PeriodCol) => {
    if (period.sprint === 0) {
      // Month view: get both sprints
      const s1 = allocations.find(a => a.projectId === projectId && a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === 1);
      const s2 = allocations.find(a => a.projectId === projectId && a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === 2);
      const p1 = s1?.allocationPercentage || 0;
      const p2 = s2?.allocationPercentage || 0;
      const hasAny = !!s1 || !!s2;
      let display = '';
      if (p1 === p2 && hasAny) display = `${p1}%`;
      else if (p1 > 0 && p2 === 0) display = `${p1}% ½`;
      else if (p1 === 0 && p2 > 0) display = `${p2}% ½`;
      else if (p1 > 0 && p2 > 0) display = `${p1}/${p2}%`;
      return { hasAny, display, pct: Math.max(p1, p2), s1, s2, editPct: p1 || p2 };
    }
    const alloc = allocations.find(a => a.projectId === projectId && a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === period.sprint);
    const pct = alloc?.allocationPercentage || 0;
    return { hasAny: !!alloc, display: pct > 0 ? `${pct}%` : '', pct, s1: alloc, s2: null, editPct: pct };
  };

  // Member total for a period
  const getMemberTotal = (memberId: string, period: PeriodCol) => {
    if (period.sprint === 0) {
      // Month view: average of both sprints
      const s1Total = allocations.filter(a => a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === 1).reduce((s, a) => s + (a.allocationPercentage || 0), 0);
      const s2Total = allocations.filter(a => a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === 2).reduce((s, a) => s + (a.allocationPercentage || 0), 0);
      return Math.round((s1Total + s2Total) / 2);
    }
    return allocations.filter(a => a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === period.sprint).reduce((s, a) => s + (a.allocationPercentage || 0), 0);
  };

  const openCell = (projectId: string, memberId: string, period: PeriodCol) => {
    if (!canWrite) return;
    const data = getCellData(projectId, memberId, period);
    setEditCell({ projectId, memberId, periodKey: period.key });
    if (data.hasAny) {
      // For month view, use s1 id if available, else s2
      setEditAllocId(data.s1?.id || data.s2?.id || null);
      setEditPercentage(data.editPct.toString());
    } else {
      setEditAllocId(null);
      setEditPercentage('');
    }
  };

  const handleSave = () => {
    if (!editCell || !editPercentage) return;
    const pct = parseInt(editPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) { alert('Enter 0-100'); return; }
    const period = periods.find(p => p.key === editCell.periodKey);
    if (!period) return;

    if (period.sprint === 0) {
      // Month view: write to BOTH sprints
      for (const s of [1, 2]) {
        const existing = allocations.find(a =>
          a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
          a.year === period.year && a.month === period.month && a.sprint === s
        );
        if (existing) {
          updateAllocation(existing.id, { allocationPercentage: pct, allocationDays: (pct / 100) * 10 }, currentUser.email);
        } else {
          addAllocation({
            projectId: editCell.projectId, productManagerId: editCell.memberId,
            year: period.year, month: period.month, sprint: s,
            allocationPercentage: pct, allocationDays: (pct / 100) * 10, isPlanned: true,
          }, currentUser.email);
        }
      }
    } else {
      // Sprint view: write to single sprint
      if (editAllocId) {
        updateAllocation(editAllocId, { allocationPercentage: pct, allocationDays: (pct / 100) * 10 }, currentUser.email);
      } else {
        addAllocation({
          projectId: editCell.projectId, productManagerId: editCell.memberId,
          year: period.year, month: period.month, sprint: period.sprint,
          allocationPercentage: pct, allocationDays: (pct / 100) * 10, isPlanned: true,
        }, currentUser.email);
      }
    }
    closeEdit();
  };

  const handleDelete = () => {
    if (!editCell) return;
    const period = periods.find(p => p.key === editCell.periodKey);
    if (!period) return;

    if (!confirm('Remove this allocation?')) return;

    if (period.sprint === 0) {
      // Month view: delete BOTH sprints
      for (const s of [1, 2]) {
        const existing = allocations.find(a =>
          a.projectId === editCell.projectId && a.productManagerId === editCell.memberId &&
          a.year === period.year && a.month === period.month && a.sprint === s
        );
        if (existing) deleteAllocation(existing.id, currentUser.email);
      }
    } else {
      if (editAllocId) deleteAllocation(editAllocId, currentUser.email);
    }
    closeEdit();
  };

  const closeEdit = () => { setEditCell(null); setEditAllocId(null); setEditPercentage(''); };

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
  const memberCount = displayedMembers.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b flex-wrap">
        {/* Sprint/Month toggle - hidden, always sprint for now */}
        {false && (
        <div className="flex bg-gray-100 rounded p-0.5">
          <button onClick={() => { setTimeMode('sprint'); setPeriodOffset(0); }}
            className={`px-3 py-1 rounded text-xs font-medium ${timeMode === 'sprint' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Sprint</button>
          <button onClick={() => { setTimeMode('month'); setPeriodOffset(0); }}
            className={`px-3 py-1 rounded text-xs font-medium ${timeMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Month</button>
        </div>
        )}

        {/* Filters - hidden for member users */}
        {!isMemberTeam && (
        <div className="flex items-center gap-2">
          {/* Traffic light filter - multi-select toggles */}
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-gray-50">
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
                  <button onClick={() => setSelectedManagerIds(new Set(availableManagers.managers.map(m => m.id)))} className="text-[10px] text-blue-600 hover:underline font-medium">Select All</button>
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
        <span className="text-xs text-gray-500">{filteredProjects.length} projects · {displayedMembers.length} members</span>
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
                addAllocation({
                  projectId: s.projectId, productManagerId: s.memberId,
                  year: s.year, month: s.month, sprint: s.sprint,
                  allocationPercentage: s.percentage, allocationDays: (s.percentage / 100) * 10, isPlanned: true,
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
        <button onClick={() => setPeriodOffset(o => o - 3)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Previous periods">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Previous">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(0)} className="px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-200" title="Go to current">Today</button>
        <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Next">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={() => setPeriodOffset(o => o + 3)} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Next periods">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <table className="border-collapse" style={{ minWidth: projW + (periods.length * memberCount * colW) }}>
          <thead className="sticky top-0 z-10">
            {displayedMembers.length === 1 ? (
              <>
                {/* Single employee: clean header */}
                <tr className="bg-blue-50">
                  <th rowSpan={4} className="border-b border-r bg-gray-100 text-left px-2 py-1 sticky left-0 z-20 align-top"
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
                  <th colSpan={periods.length} className="border-b px-3 py-1.5 text-left">
                    <span className="text-xs font-bold text-blue-700">{displayedMembers[0].fullName}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{displayedMembers[0].role}</span>
                    {!isMemberTeam && <button onClick={() => setSelectedMemberIds(new Set())} className="ml-3 text-[9px] text-blue-500 hover:underline">[Show all]</button>}
                  </th>
                </tr>
                {/* Month row: group periods by month */}
                <tr className="bg-gray-50">
                  {(() => {
                    const monthGroups: { label: string; count: number }[] = [];
                    let prev = '';
                    for (const p of periods) {
                      const key = `${p.label}`;
                      if (key === prev) {
                        monthGroups[monthGroups.length - 1].count++;
                      } else {
                        monthGroups.push({ label: key, count: 1 });
                        prev = key;
                      }
                    }
                    return monthGroups.map((g, i) => (
                      <th key={i} colSpan={g.count} className={`border-b border-r text-center py-1 text-[10px] font-bold text-gray-800 ${i > 0 ? 'border-l' : ''}`}>
                        {g.label}
                      </th>
                    ));
                  })()}
                </tr>
                {/* Sprint row */}
                <tr className="bg-gray-50">
                  {periods.map((period, pIdx) => (
                    <th key={period.key} className={`border-b border-r text-center py-0.5 text-[9px] text-gray-500 ${pIdx > 0 ? '' : ''}`}
                      style={{ width: colW, minWidth: colW }}>
                      {period.sublabel || `S${period.sprint}`}
                    </th>
                  ))}
                </tr>
                {/* Capacity row */}
                <tr className="bg-gray-50">
                  {periods.map((period, pIdx) => {
                    const total = getMemberTotal(displayedMembers[0].id, period);
                    const cap = displayedMembers[0].capacity ?? 100;
                    const color = total > cap ? 'text-red-600 bg-red-50' : total >= cap * 0.8 ? 'text-green-700 bg-green-50' : total > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                    return (
                      <th key={`${period.key}-tot`} className={`border-b border-r text-center px-0.5 py-0.5 ${color}`}
                        style={{ width: colW, minWidth: colW }}>
                        <span className="text-[9px] font-bold">{total}%</span>
                      </th>
                    );
                  })}
                </tr>
              </>
            ) : (
              <>
            {/* Row 1: Period headers spanning all members */}
            <tr className="bg-gray-100">
              <th rowSpan={3} className="border-b border-r bg-gray-100 text-left px-2 py-1 sticky left-0 z-20 align-top"
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
              {periods.map((period, pIdx) => (
                <th key={period.key} colSpan={memberCount} className={`border-b text-center py-1.5 bg-gray-100 ${pIdx > 0 ? 'border-l-2 border-l-gray-400' : ''} border-r`}>
                  <span className="text-[10px] font-bold text-gray-800">{period.label}</span>
                  {period.sublabel && <span className="text-[9px] text-gray-500 ml-1">{period.sublabel}</span>}
                </th>
              ))}
            </tr>
            {/* Row 2: Employee names under each period */}
            <tr className="bg-gray-50">
              {periods.map((period, pIdx) =>
                displayedMembers.map((member, mIdx) => (
                  <th key={`${period.key}-${member.id}`} className={`border-b border-r text-center px-0.5 py-1 cursor-pointer hover:bg-blue-50 ${pIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${selectedMemberIds.size === 1 && selectedMemberIds.has(member.id) ? 'bg-blue-100' : ''}`}
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
            {/* Row 3: Capacity totals */}
            <tr className="bg-gray-50">
              {periods.map((period, pIdx) =>
                displayedMembers.map((member, mIdx) => {
                  const total = getMemberTotal(member.id, period);
                  const cap = member.capacity ?? 100;
                  const color = total > cap ? 'text-red-600 bg-red-50' : total >= cap * 0.8 ? 'text-green-700 bg-green-50' : total > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-gray-400 bg-gray-50';
                  return (
                    <th key={`${period.key}-${member.id}-tot`} className={`border-b border-r text-center px-0.5 py-0.5 ${color} ${pIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''}`}
                      style={{ width: colW, minWidth: colW }}>
                      <span className="text-[9px] font-bold">{total}%</span>
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
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getProjectLight(project.id, project.status, project.activityCloseDate).color}`}
                          title={getProjectLight(project.id, project.status, project.activityCloseDate).label} />
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
                {periods.map((period, pIdx) =>
                  displayedMembers.map((member, mIdx) => {
                    const data = getCellData(project.id, member.id, period);
                    const isYellowProject = getProjectLightKey(project.id, project.status, project.activityCloseDate) === 'yellow';
                    // Check for suggestion
                    const suggestion = suggestions.find(s =>
                      s.projectId === project.id && s.memberId === member.id &&
                      s.year === period.year && s.month === period.month &&
                      (period.sprint === 0 || s.sprint === period.sprint)
                    );
                    return (
                      <td key={`${period.key}-${member.id}`}
                        className={`border-b border-r text-center ${isMemberTeam ? '' : 'cursor-pointer'} transition-colors ${pIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${
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
                            addAllocation({
                              projectId: suggestion.projectId, productManagerId: suggestion.memberId,
                              year: suggestion.year, month: suggestion.month, sprint: suggestion.sprint,
                              allocationPercentage: suggestion.percentage, allocationDays: (suggestion.percentage / 100) * 10, isPlanned: true,
                            }, currentUser.email);
                            setSuggestions(prev => prev.filter(s => s !== suggestion));
                          } else {
                            openCell(project.id, member.id, period);
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
                )}
              </tr>
            ))}
            {filteredProjects.length === 0 && (
              <tr><td colSpan={1 + periods.length * memberCount} className="text-center py-8 text-gray-400 text-sm">No projects found</td></tr>
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
                const per = periods.find(pp => pp.key === editCell.periodKey);
                return `${p?.customerName} - ${p?.projectName} → ${m?.fullName} | ${per?.label} ${per?.sublabel}`;
              })()}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Allocation %</label>
              <input type="number" min="0" max="100" value={editPercentage} onChange={e => setEditPercentage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeEdit(); }}
                className="w-full px-3 py-2 border rounded text-sm" placeholder="0-100" autoFocus />
            </div>
            <div className="flex justify-between">
              <div>{editAllocId && <button onClick={handleDelete} className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">Delete</button>}</div>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs">Cancel</button>
                <button onClick={handleSave} disabled={!editPercentage} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">{editAllocId ? 'Save' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
