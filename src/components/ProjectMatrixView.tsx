import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import Modal from './Modal';
import ProjectForm from './ProjectForm';
import PuzzleMe, { Suggestion } from './PuzzleMe';

type TimeMode = 'sprint' | 'month';
type StatusFilter = 'active' | 'all' | 'inactive';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALLOWED_ROLES = ['Product Manager', 'Product Director'];

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
  const { canWrite } = usePermissions();
  const currentUser = user || { email: 'unknown' };

  const [timeMode, setTimeMode] = useState<TimeMode>('sprint');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [lightFilter, setLightFilter] = useState<string>('all');
  const [onlyAllocated, setOnlyAllocated] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [editCell, setEditCell] = useState<{ projectId: string; memberId: string; periodKey: string } | null>(null);
  const [editPercentage, setEditPercentage] = useState('');
  const [editAllocId, setEditAllocId] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [infoProjectId, setInfoProjectId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [showPuzzleMe, setShowPuzzleMe] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Eligible members
  const eligibleMembers = useMemo(() =>
    teamMembers
      .filter(m => m.isActive && m.role && ALLOWED_ROLES.some(r => m.role.toLowerCase().includes(r.toLowerCase())))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers]
  );

  const displayedMembers = useMemo(() =>
    selectedMemberIds.size === 0
      ? eligibleMembers
      : eligibleMembers.filter(m => selectedMemberIds.has(m.id)),
    [eligibleMembers, selectedMemberIds]
  );

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

  // Traffic light logic (defined before filteredProjects so it can be used for filtering)
  const getProjectLightKey = (projectId: string, status: string, activityCloseDate?: string): string => {
    if (status === 'Inactive' || status === 'Completed') return 'gray';
    const isActive = status === 'Active' || status === 'Pending' || status === 'New Signed Off';
    if (!isActive) return 'gray';

    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curSprint = today.getDate() <= 15 ? 1 : 2;
    const hasFutureAllocs = allocations.some(a => {
      if (a.projectId !== projectId) return false;
      if (a.year > curYear) return true;
      if (a.year === curYear && a.month > curMonth) return true;
      if (a.year === curYear && a.month === curMonth && a.sprint >= curSprint) return true;
      return false;
    });

    if (hasFutureAllocs && activityCloseDate) return 'green';  // signed + has resources = healthy
    if (hasFutureAllocs && !activityCloseDate) return 'yellow'; // has resources but not signed = needs attention
    if (!hasFutureAllocs && activityCloseDate) return 'red';    // signed but no resources = urgent
    return 'yellow'; // no allocations, no sign-off = needs attention
  };

  const LIGHT_MAP: Record<string, { color: string; label: string }> = {
    green: { color: 'bg-green-500', label: 'Signed project with resources assigned' },
    yellow: { color: 'bg-yellow-400', label: 'Pending sign-off — allocations may need to be removed' },
    red: { color: 'bg-red-500', label: 'Signed project with no resources assigned' },
    gray: { color: 'bg-gray-400', label: 'Inactive/Completed' },
  };

  const getProjectLight = (projectId: string, status: string, activityCloseDate?: string) =>
    LIGHT_MAP[getProjectLightKey(projectId, status, activityCloseDate)] || LIGHT_MAP.gray;

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => !p.isArchived);
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.status === 'Active' || p.status === 'Pending' || p.status === 'New Signed Off');
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(p => p.status === 'Inactive' || p.status === 'Completed');
    }
    if (projectFilter) {
      const q = projectFilter.toLowerCase();
      filtered = filtered.filter(p => p.projectName.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q));
    }
    if (lightFilter !== 'all') {
      filtered = filtered.filter(p => getProjectLightKey(p.id, p.status, p.activityCloseDate) === lightFilter);
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
    return filtered.sort((a, b) => {
      const cmp = a.customerName.localeCompare(b.customerName);
      return cmp !== 0 ? cmp : a.projectName.localeCompare(b.projectName);
    });
  }, [projects, projectFilter, statusFilter, lightFilter, onlyAllocated, allocations, selectedMemberIds, displayedMembers]);

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

  const colW = 58;
  const projW = 160;
  const memberCount = displayedMembers.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b flex-wrap">
        <div className="flex bg-gray-100 rounded p-0.5">
          <button onClick={() => { setTimeMode('sprint'); setPeriodOffset(0); }}
            className={`px-3 py-1 rounded text-xs font-medium ${timeMode === 'sprint' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Sprint</button>
          <button onClick={() => { setTimeMode('month'); setPeriodOffset(0); }}
            className={`px-3 py-1 rounded text-xs font-medium ${timeMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Month</button>
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-1 border-l pl-3">
          <button onClick={() => setPeriodOffset(o => o - 3)} className="p-1 rounded hover:bg-gray-100 text-gray-600" title="Previous periods">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-600" title="Previous">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setPeriodOffset(0)} className="px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-100" title="Go to current">Today</button>
          <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1 rounded hover:bg-gray-100 text-gray-600" title="Next">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => setPeriodOffset(o => o + 3)} className="p-1 rounded hover:bg-gray-100 text-gray-600" title="Next periods">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-l pl-3">
          {/* Traffic light filter with descriptions */}
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-gray-50">
            <button onClick={() => setLightFilter('all')}
              className={`text-[10px] px-2 py-0.5 rounded ${lightFilter === 'all' ? 'bg-white shadow font-bold text-gray-800' : 'text-gray-500 hover:bg-white'}`}>All</button>
            <button onClick={() => setLightFilter(lightFilter === 'green' ? 'all' : 'green')}
              title="Active Project + has sign-off date + has future allocations (healthy)"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter === 'green' ? 'bg-green-100 font-bold text-green-800 shadow' : 'text-gray-600 hover:bg-green-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Active Projects with Resources
            </button>
            <button onClick={() => setLightFilter(lightFilter === 'yellow' ? 'all' : 'yellow')}
              title="Active Project + has future allocations + NO sign-off date yet !! (needs attention - might not get signed)"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter === 'yellow' ? 'bg-yellow-100 font-bold text-yellow-800 shadow' : 'text-gray-600 hover:bg-yellow-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Pending signoff date
            </button>
            <button onClick={() => setLightFilter(lightFilter === 'red' ? 'all' : 'red')}
              title="Active Project + has sign-off date + NO future allocations (signed but nobody assigned)"
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${lightFilter === 'red' ? 'bg-red-100 font-bold text-red-800 shadow' : 'text-gray-600 hover:bg-red-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Signoffed Unassigned Projects !!
            </button>
          </div>
          {/* Hide unallocated projects toggle */}
          <button
            onClick={() => setOnlyAllocated(!onlyAllocated)}
            className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
              onlyAllocated
                ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
            title="When ON: hides projects with no future allocations. When combined with employee filter: shows only projects where selected employee(s) are allocated."
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {onlyAllocated
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              }
            </svg>
            {onlyAllocated ? 'Showing allocated only' : 'Show all projects'}
          </button>
          {/* Employee multi-select with search */}
          <div className="relative">
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
                                // Currently "all selected" - user wants ONLY this one
                                setSelectedMemberIds(new Set([m.id]));
                              } else if (selectedMemberIds.has(m.id)) {
                                // Uncheck this member
                                const next = new Set(selectedMemberIds);
                                next.delete(m.id);
                                // If none left, go back to "all"
                                if (next.size === 0 || next.has('__none__')) setSelectedMemberIds(new Set());
                                else setSelectedMemberIds(next);
                              } else {
                                // Check this member
                                const next = new Set(selectedMemberIds);
                                next.delete('__none__');
                                next.add(m.id);
                                // If all are now selected, reset to empty (= all)
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
        <span className="text-xs text-gray-500">{filteredProjects.length} projects · {displayedMembers.length} members</span>
        {(projectFilter || statusFilter !== 'active' || lightFilter !== 'all' || onlyAllocated || selectedMemberIds.size > 0) && (
          <button onClick={() => {
            setProjectFilter('');
            setStatusFilter('active');
            setLightFilter('all');
            setOnlyAllocated(false);
            setSelectedMemberIds(new Set());
            setPeriodOffset(0);
          }} className="text-xs text-red-500 hover:text-red-700 hover:underline whitespace-nowrap">
            ✕ Reset filters
          </button>
        )}
        {/* Puzzle Me button */}
        {canWrite && (
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

      {/* Matrix */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <table className="border-collapse" style={{ minWidth: projW + (periods.length * memberCount * colW) }}>
          <thead className="sticky top-0 z-10">
            {/* Row 1: Period headers spanning all members */}
            <tr className="bg-gray-100">
              <th rowSpan={3} className="border-b border-r bg-gray-100 text-left px-2 py-1 sticky left-0 z-20 align-top"
                style={{ width: projW, minWidth: projW }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Active Projects</span>
                  {canWrite && (
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
                  <th key={`${period.key}-${member.id}`} className={`border-b border-r text-center px-0.5 py-1 ${pIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''}`}
                    style={{ width: colW, minWidth: colW }} title={`${member.fullName} (${member.role})`}>
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
                        <button onClick={() => setEditProjectId(project.id)} className="text-[10px] font-semibold text-gray-900 truncate hover:text-blue-600 hover:underline" title="Click to edit project">
                          {project.customerName}
                        </button>
                      </div>
                      <button onClick={() => setEditProjectId(project.id)} className="text-[10px] text-gray-500 truncate pl-3 hover:text-blue-600 hover:underline" title="Click to edit project">
                        {project.projectName}
                      </button>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => setInfoProjectId(project.id)}
                        className="p-0.5 rounded hover:bg-blue-100 text-blue-500" title="Project info">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {canWrite && (
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
                    </div>
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
                        className={`border-b border-r text-center cursor-pointer transition-colors ${pIdx > 0 && mIdx === 0 ? 'border-l-2 border-l-gray-400' : ''} ${
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
                          if (suggestion) {
                            // Accept this suggestion
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
      <Modal isOpen={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} title="Create New Project">
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
              <EditProjectForm project={p} onSave={(updates) => { updateProject(p.id, updates); setEditProjectId(null); }} onCancel={() => setEditProjectId(null)} teamMembers={teamMembers} />
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
                <button onClick={() => setInfoProjectId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded text-xs ${p.status === 'Active' ? 'bg-green-100 text-green-800' : p.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{p.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{p.projectType || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Region</span><span>{p.region || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">PMO Contact</span><span>{pmo?.fullName || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Allocations</span><span>{projectAllocs.length} across {uniqueMembers.length} member(s)</span></div>
                {p.latestStatus && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-gray-500 text-xs mb-1">Latest Status</div>
                    <div className="text-xs text-gray-700">{p.latestStatus}</div>
                  </div>
                )}
                {p.activityCloseDate && (
                  <div className="flex justify-between"><span className="text-gray-500">Close Date</span><span>{p.activityCloseDate}</span></div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Inline Edit Project Form
function EditProjectForm({ project, onSave, onCancel, teamMembers }: {
  project: any;
  onSave: (updates: any) => void;
  onCancel: () => void;
  teamMembers: any[];
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
  });

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
    });
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pmoMembers = teamMembers.filter(m => m.role === 'PMO' && m.isActive).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
  const otherMembers = teamMembers.filter(m => m.role !== 'PMO' && m.isActive).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
        <input type="text" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm" required />
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
            <option value="Active">Active</option><option value="Pending">Pending</option><option value="New Signed Off">New Signed Off</option>
            <option value="Completed">Completed</option><option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Sign-off / Activity Close Date</label>
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
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Required Capacity %</label>
            <input type="number" min="0" max="100" step="5" value={form.requiredCapacity}
              onChange={e => setForm({ ...form, requiredCapacity: e.target.value })}
              className="w-full px-2 py-1.5 border rounded text-xs" placeholder="0-100" />
          </div>
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
