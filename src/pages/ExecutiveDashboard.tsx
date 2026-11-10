import { useMemo, useRef, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  getWeeksInRange,
  groupWeeksIntoSprints,
  firstWeekOfCurrentSprint,
  getSprintDateLabel,
  getSprintYearLabel,
  aggregateWeeklyValues,
  Sprint,
  SprintLengthWeeks,
} from '../utils/weekUtils';
import { COMPANY_GROUPS, DEFAULT_COMPANY_GROUP } from '../types';

// How many sprints are visible at once, and how many of them are historical (before the
// current sprint). 3 back + current + 4 ahead = 8.
const SPRINTS_VISIBLE = 8;
const SPRINTS_BEHIND = 3;

// Thresholds (shared with the rest of the app via localStorage).
function readThreshold(key: string, fallback: number) {
  const v = localStorage.getItem(key);
  return v ? parseInt(v) : fallback;
}

// Distinct colors for multi-series lines (company groups / managers).
const SERIES_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#a855f7', // purple
];

type BreakdownMode = 'average' | 'group' | 'manager';

interface Series {
  key: string;
  label: string;
  color: string;
  values: number[]; // one per visible sprint
}

export default function ExecutiveDashboard() {
  const { teamMembers, allocations } = useData();
  const { canManageMembers } = usePermissions();
  const isAdmin = canManageMembers;

  // Sprint length comes from the shared Settings control.
  const [sprintLength, setSprintLength] = useState<SprintLengthWeeks>(
    () => (parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks)
  );
  useEffect(() => {
    const sync = () => setSprintLength(parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks);
    window.addEventListener('capacitySprintLengthChanged', sync);
    return () => window.removeEventListener('capacitySprintLengthChanged', sync);
  }, []);

  const underThreshold = readThreshold('underCapacityThreshold', 70);
  const overThreshold = readThreshold('overCapacityThreshold', 100);

  // Period navigation: offset in sprints from the default window.
  const [sprintOffset, setSprintOffset] = useState(0);

  // Filters.
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set()); // empty = all
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Breakdown mode for the trend chart.
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('average');
  // Company groups selected to break down into separate lines (empty = all groups).
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  // Managers selected to break down into separate lines (within the active company group).
  const [selectedManagerIds, setSelectedManagerIds] = useState<Set<string>>(new Set());
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const managerDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedSprintIdx, setSelectedSprintIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(e.target as Node)) {
        setShowManagerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Members in scope = active members filtered by company group.
  const scopedMembers = useMemo(() => {
    return teamMembers
      .filter(m => m.isActive)
      .filter(m => groupFilter === 'all' || (m.companyGroup || DEFAULT_COMPANY_GROUP) === groupFilter)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [teamMembers, groupFilter]);

  // Members actually used for the metric: scoped, then narrowed by the explicit member
  // selection (empty selection = all scoped members).
  const metricMembers = useMemo(() => {
    if (selectedMemberIds.size === 0) return scopedMembers;
    return scopedMembers.filter(m => selectedMemberIds.has(m.id));
  }, [scopedMembers, selectedMemberIds]);

  // Visible sprints: anchor on the current sprint, go SPRINTS_BEHIND back, SPRINTS_VISIBLE total,
  // shifted by sprintOffset (in sprints). Each sprint = sprintLength weeks.
  const visibleSprints: Sprint[] = useMemo(() => {
    const anchor = firstWeekOfCurrentSprint(sprintLength);
    const start = new Date(anchor.startDate + 'T00:00:00Z');
    // Shift back by (SPRINTS_BEHIND - sprintOffset) sprints worth of weeks.
    start.setUTCDate(start.getUTCDate() - (SPRINTS_BEHIND - sprintOffset) * sprintLength * 7);
    const totalWeeks = SPRINTS_VISIBLE * sprintLength + sprintLength; // a little buffer for grouping
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (totalWeeks - 1) * 7);
    const weeks = getWeeksInRange(start, end);
    return groupWeeksIntoSprints(weeks, sprintLength).slice(0, SPRINTS_VISIBLE);
  }, [sprintLength, sprintOffset]);

  // The current sprint's first-week key, to mark "now" in the header.
  const currentSprintStart = useMemo(() => firstWeekOfCurrentSprint(sprintLength).startDate, [sprintLength]);

  // Pre-aggregate once: member|isoYear|isoWeek -> total allocation across projects.
  // Dashboard metrics then use O(1) lookups instead of repeatedly scanning all allocations.
  const memberWeekTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const allocation of allocations) {
      const key = `${allocation.productManagerId}|${allocation.isoYear}|${allocation.isoWeek}`;
      totals.set(key, (totals.get(key) || 0) + (allocation.allocationPercentage || 0));
    }
    return totals;
  }, [allocations]);

  const getMemberWeekTotal = (memberId: string, isoYear: number, isoWeek: number) =>
    memberWeekTotals.get(`${memberId}|${isoYear}|${isoWeek}`) || 0;

  // Average sprint allocation across an arbitrary member list (members with 0% included).
  // A member's sprint value = average of their weekly total allocations over the sprint's weeks.
  const sprintAverageFor = (sprint: Sprint, members: typeof teamMembers) => {
    if (members.length === 0) return 0;
    let sum = 0;
    members.forEach(member => {
      const weekly = sprint.weeks.map(w => getMemberWeekTotal(member.id, w.isoYear, w.isoWeek));
      sum += aggregateWeeklyValues(weekly).average;
    });
    return Math.round(sum / members.length);
  };

  // Per-sprint average allocation across metricMembers (the single "Average" line).
  const sprintAverages = useMemo(() => {
    return visibleSprints.map(sprint => sprintAverageFor(sprint, metricMembers));
  }, [visibleSprints, metricMembers, memberWeekTotals]);

  // Active members only, for building org relationships and group breakdowns.
  const activeMembers = useMemo(() => teamMembers.filter(m => m.isActive), [teamMembers]);

  // For each member, the full recursive set of descendant employees INCLUDING themselves.
  // Used so a manager's line reflects the avg capacity across their whole reporting tree.
  const descendantsIncludingSelf = useMemo(() => {
    const childrenByManager = new Map<string, string[]>();
    activeMembers.forEach(m => {
      if (m.managerId) {
        const arr = childrenByManager.get(m.managerId) || [];
        arr.push(m.id);
        childrenByManager.set(m.managerId, arr);
      }
    });
    const memberById = new Map(activeMembers.map(m => [m.id, m] as const));
    const cache = new Map<string, typeof teamMembers>();
    const resolve = (id: string, seen: Set<string>): typeof teamMembers => {
      if (cache.has(id)) return cache.get(id)!;
      if (seen.has(id)) return []; // guard against cycles
      seen.add(id);
      const self = memberById.get(id);
      const result: typeof teamMembers = self ? [self] : [];
      (childrenByManager.get(id) || []).forEach(childId => {
        resolve(childId, seen).forEach(d => result.push(d));
      });
      cache.set(id, result);
      return result;
    };
    const map = new Map<string, typeof teamMembers>();
    activeMembers.forEach(m => map.set(m.id, resolve(m.id, new Set())));
    return map;
  }, [activeMembers]);

  // Managers available for the manager breakdown: active members who have at least one direct
  // report, scoped to the selected company group (group breakdown only makes sense within a group).
  const availableManagers = useMemo(() => {
    const managerIds = new Set(activeMembers.map(m => m.managerId).filter(Boolean) as string[]);
    return activeMembers
      .filter(m => managerIds.has(m.id))
      .filter(m => groupFilter === 'all' || (m.companyGroup || DEFAULT_COMPANY_GROUP) === groupFilter)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [activeMembers, groupFilter]);

  // Series rendered on the trend chart depending on the breakdown mode.
  const series: Series[] = useMemo(() => {
    if (breakdownMode === 'group') {
      // One line per selected company group (empty selection = all groups).
      const groups = selectedGroups.size === 0 ? COMPANY_GROUPS : COMPANY_GROUPS.filter(g => selectedGroups.has(g));
      return groups.map((g, i) => {
        const groupMembers = metricMembers.filter(m => (m.companyGroup || DEFAULT_COMPANY_GROUP) === g);
        return {
          key: g,
          label: g,
          color: SERIES_COLORS[i % SERIES_COLORS.length],
          values: visibleSprints.map(sprint => sprintAverageFor(sprint, groupMembers)),
        };
      }).filter(s => metricMembers.some(m => (m.companyGroup || DEFAULT_COMPANY_GROUP) === s.key));
    }
    if (breakdownMode === 'manager') {
      // One line per selected manager; a manager's value averages across their whole reporting
      // tree (recursive descendants including the manager), scoped to the selected company group.
      const managers = availableManagers.filter(m => selectedManagerIds.has(m.id));
      return managers.map((mgr, i) => {
        let tree = descendantsIncludingSelf.get(mgr.id) || [];
        if (groupFilter !== 'all') {
          tree = tree.filter(m => (m.companyGroup || DEFAULT_COMPANY_GROUP) === groupFilter);
        }
        return {
          key: mgr.id,
          label: mgr.fullName,
          color: SERIES_COLORS[i % SERIES_COLORS.length],
          values: visibleSprints.map(sprint => sprintAverageFor(sprint, tree)),
        };
      });
    }
    // Default: single average line.
    return [{ key: 'average', label: 'Avg allocation', color: '#3b82f6', values: sprintAverages }];
  }, [breakdownMode, selectedGroups, selectedManagerIds, availableManagers, descendantsIncludingSelf, groupFilter, visibleSprints, metricMembers, sprintAverages, memberWeekTotals]);

  // Breakdown for the selected sprint: each metric member + their sprint allocation %.
  const selectedBreakdown = useMemo(() => {
    if (selectedSprintIdx === null) return null;
    const sprint = visibleSprints[selectedSprintIdx];
    if (!sprint) return null;
    const rows = metricMembers.map(member => {
      const weekly = sprint.weeks.map(w => getMemberWeekTotal(member.id, w.isoYear, w.isoWeek));
      return {
        member,
        percentage: aggregateWeeklyValues(weekly).average,
      };
    }).sort((a, b) => b.percentage - a.percentage);
    return { sprint, rows, average: sprintAverages[selectedSprintIdx] };
  }, [selectedSprintIdx, visibleSprints, metricMembers, memberWeekTotals, sprintAverages]);

  const filteredMemberOptions = useMemo(() => {
    const q = memberSearch.toLowerCase();
    return scopedMembers.filter(m => m.fullName.toLowerCase().includes(q));
  }, [scopedMembers, memberSearch]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredManagerOptions = useMemo(() => {
    const q = managerSearch.toLowerCase();
    return availableManagers.filter(m => m.fullName.toLowerCase().includes(q));
  }, [availableManagers, managerSearch]);

  const toggleGroup = (g: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  const toggleManager = (id: string) => {
    setSelectedManagerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setGroupFilter('all');
    setSelectedMemberIds(new Set());
    setMemberSearch('');
    setSprintOffset(0);
    setBreakdownMode('average');
    setSelectedGroups(new Set());
    setSelectedManagerIds(new Set());
    setManagerSearch('');
  };

  const barColor = (pct: number) =>
    pct === 0 ? 'bg-gray-300'
      : pct > overThreshold ? 'bg-red-500'
      : pct < underThreshold ? 'bg-amber-400'
      : 'bg-green-500';

  const textColor = (pct: number) =>
    pct === 0 ? 'text-gray-400'
      : pct > overThreshold ? 'text-red-600'
      : pct < underThreshold ? 'text-amber-600'
      : 'text-green-600';

  return (
    <div className="relative">
      {!isAdmin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
          <div className="text-center p-8">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-1">Coming Soon</h2>
            <p className="text-sm text-gray-500">Executive analytics are available for administrators only.</p>
          </div>
        </div>
      )}

      <div className={`space-y-5 ${!isAdmin ? 'pointer-events-none select-none' : ''}`}>
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Workforce allocation trends and planning signals</p>
        </div>

        {/* Global Filters */}
        <div className="sticky top-16 z-20 bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center">Filters</span>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">Company Group</label>
              <select
                value={groupFilter}
                onChange={e => { setGroupFilter(e.target.value); setSelectedMemberIds(new Set()); setSelectedManagerIds(new Set()); }}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white min-w-[160px]"
              >
                <option value="all">All Groups</option>
                {COMPANY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 relative" ref={memberDropdownRef}>
              <label className="text-[11px] text-gray-500 font-medium">Employees</label>
              <button
                onClick={() => setShowMemberDropdown(v => !v)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white min-w-[180px] text-left flex items-center justify-between gap-2"
              >
                <span>{selectedMemberIds.size === 0 ? `All employees (${scopedMembers.length})` : `${selectedMemberIds.size} selected`}</span>
                <span className="text-gray-400">▾</span>
              </button>
              {showMemberDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-30">
                  <div className="p-2 border-b">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search member..."
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </div>
                  <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                    <button onClick={() => setSelectedMemberIds(new Set())} className="text-[11px] text-blue-600 hover:underline">All</button>
                    <button onClick={() => setSelectedMemberIds(new Set(scopedMembers.map(m => m.id)))} className="text-[11px] text-blue-600 hover:underline">Select all</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredMemberOptions.map(m => (
                      <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedMemberIds.has(m.id)} onChange={() => toggleMember(m.id)} />
                        <span className="truncate">{m.fullName}</span>
                      </label>
                    ))}
                    {filteredMemberOptions.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">No members</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Sprint period: {sprintLength}-week · from Settings</span>
              <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline">Reset filters</button>
            </div>
          </div>
        </div>

        {/* Graph 1: Workforce Allocation Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">⭐ Workforce Allocation Trend</h2>
              <p className="text-sm text-gray-500">Average allocation % per sprint across {metricMembers.length} member{metricMembers.length !== 1 ? 's' : ''}. Click a sprint column for the breakdown.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 inline-block" style={{ borderTop: '2px dashed #f87171' }} /> Over ({overThreshold}%)</span>
              <span className="flex items-center gap-1"><span className="w-3 inline-block" style={{ borderTop: '2px dashed #fbbf24' }} /> Under ({underThreshold}%)</span>
            </div>
          </div>

          {/* Breakdown controls */}
          <div className="flex flex-wrap items-end gap-4 mb-3 pb-3 border-b border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">Breakdown</label>
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
                {([
                  ['average', 'Average'],
                  ['group', 'By Company Group'],
                  ['manager', 'By Manager'],
                ] as [BreakdownMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setBreakdownMode(mode)}
                    className={`px-3 py-1.5 ${breakdownMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} ${mode !== 'average' ? 'border-l border-gray-300' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {breakdownMode === 'group' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500 font-medium">Company Groups (one line each)</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPANY_GROUPS.map(g => {
                    const on = selectedGroups.size === 0 || selectedGroups.has(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggleGroup(g)}
                        className={`px-2.5 py-1 rounded-full text-xs border ${on ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                  {selectedGroups.size > 0 && (
                    <button onClick={() => setSelectedGroups(new Set())} className="text-[11px] text-blue-600 hover:underline self-center ml-1">All</button>
                  )}
                </div>
              </div>
            )}

            {breakdownMode === 'manager' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-500 font-medium">Company Group context</label>
                  <select
                    value={groupFilter}
                    onChange={e => { setGroupFilter(e.target.value); setSelectedManagerIds(new Set()); setSelectedMemberIds(new Set()); }}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white min-w-[160px]"
                  >
                    <option value="all">All Groups</option>
                    {COMPANY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 relative" ref={managerDropdownRef}>
                  <label className="text-[11px] text-gray-500 font-medium">Managers (one line each)</label>
                  <button
                    onClick={() => setShowManagerDropdown(v => !v)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white min-w-[200px] text-left flex items-center justify-between gap-2"
                  >
                    <span>{selectedManagerIds.size === 0 ? `Select managers (${availableManagers.length})` : `${selectedManagerIds.size} selected`}</span>
                    <span className="text-gray-400">▾</span>
                  </button>
                  {showManagerDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-30">
                      <div className="p-2 border-b">
                        <input
                          type="text"
                          value={managerSearch}
                          onChange={e => setManagerSearch(e.target.value)}
                          placeholder="Search manager..."
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      </div>
                      <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                        <button onClick={() => setSelectedManagerIds(new Set())} className="text-[11px] text-blue-600 hover:underline">Deselect all</button>
                        <button onClick={() => setSelectedManagerIds(new Set(availableManagers.map(m => m.id)))} className="text-[11px] text-blue-600 hover:underline">Select all</button>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredManagerOptions.map(m => {
                          const treeSize = (descendantsIncludingSelf.get(m.id)?.length || 1);
                          return (
                            <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                              <input type="checkbox" checked={selectedManagerIds.has(m.id)} onChange={() => toggleManager(m.id)} />
                              <span className="truncate flex-1">{m.fullName}</span>
                              <span className="text-[10px] text-gray-400">{treeSize} ppl</span>
                            </label>
                          );
                        })}
                        {filteredManagerOptions.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-400">No managers in this group</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Series legend */}
          {series.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-gray-600">
              {series.map(s => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {/* Period navigation */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setSprintOffset(o => o - 4)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Back 4 sprints">«</button>
              <button onClick={() => setSprintOffset(o => o - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Back 1 sprint">‹</button>
              <button onClick={() => setSprintOffset(0)} className="px-2 py-0.5 text-xs rounded hover:bg-gray-100 text-gray-700 font-medium">Today</button>
              <button onClick={() => setSprintOffset(o => o + 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Forward 1 sprint">›</button>
              <button onClick={() => setSprintOffset(o => o + 4)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Forward 4 sprints">»</button>
            </div>
            <div className="text-xs text-gray-400">{SPRINTS_VISIBLE} sprints shown · {sprintLength}-week period</div>
          </div>

          <TrendChart
            sprints={visibleSprints}
            series={series}
            currentSprintStart={currentSprintStart}
            underThreshold={underThreshold}
            overThreshold={overThreshold}
            selectedIdx={selectedSprintIdx}
            onSelect={setSelectedSprintIdx}
          />
        </div>

        {/* Drill-down */}
        {selectedBreakdown && (
          <div className="bg-white border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-blue-900">
                  Breakdown — {getSprintDateLabel(selectedBreakdown.sprint)} {getSprintYearLabel(selectedBreakdown.sprint)} · {selectedBreakdown.sprint.label}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedBreakdown.rows.length} member{selectedBreakdown.rows.length !== 1 ? 's' : ''} · avg {selectedBreakdown.average}%
                </p>
              </div>
              <button onClick={() => setSelectedSprintIdx(null)} className="text-sm text-gray-400 hover:text-gray-600">✕ Close</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">Employee</th>
                    <th className="py-2 pr-4 font-medium">Resource Type</th>
                    <th className="py-2 pr-4 font-medium">Company Group</th>
                    <th className="py-2 pr-4 font-medium w-[40%]">Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedBreakdown.rows.map(({ member, percentage }) => (
                    <tr key={member.id}>
                      <td className="py-2 pr-4 font-medium">{member.fullName}</td>
                      <td className="py-2 pr-4 text-gray-600">{member.role}</td>
                      <td className="py-2 pr-4">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{member.companyGroup || DEFAULT_COMPANY_GROUP}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor(percentage)}`} style={{ width: `${Math.min(100, percentage)}%` }} />
                          </div>
                          <span className={`w-12 text-right font-semibold ${textColor(percentage)}`}>{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {selectedBreakdown.rows.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-400">No members in scope</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Trend chart (dependency-free SVG) ---

interface TrendChartProps {
  sprints: Sprint[];
  series: Series[]; // one or more lines; each values[] aligns with sprints
  currentSprintStart: string;
  underThreshold: number;
  overThreshold: number;
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}

function TrendChart({ sprints, series, currentSprintStart, underThreshold, overThreshold, selectedIdx, onSelect }: TrendChartProps) {
  const n = sprints.length;
  // Only label individual points when a single series is shown; multi-series would clutter.
  const singleSeries = series.length === 1;
  const allValues = series.flatMap(s => s.values);
  // Y scale: 0..max with headroom so the highest point and its value label never touch the
  // ceiling. Round the ceiling up to the next 20 above the data/over-threshold, then add one
  // more 20 of padding for the label that sits above the point.
  const dataMax = Math.max(overThreshold, ...allValues, 0);
  const maxVal = Math.ceil((dataMax + 1) / 20) * 20 + 20;

  // Measure the plot width so everything renders in ONE non-distorting SVG (round dots,
  // aligned gridlines/threshold lines). Height is fixed; width tracks the container.
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotW, setPlotW] = useState(800);
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setPlotW(w);
    });
    ro.observe(el);
    setPlotW(el.clientWidth || 800);
    return () => ro.disconnect();
  }, []);

  // Measure the sprint header band height so the Y-axis gutter can be pushed down to align
  // exactly with the SVG plot (otherwise top ticks float up over the sprint strip).
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h && h >= 0) setHeaderH(h);
    });
    ro.observe(el);
    setHeaderH(el.clientHeight || 0);
    return () => ro.disconnect();
  }, [n]);

  const PLOT_W = plotW;
  const PLOT_H = 300;
  const PLOT_TOP = 12;
  const PLOT_BOTTOM = 260;
  const plotH = PLOT_BOTTOM - PLOT_TOP;
  const colW = n > 0 ? PLOT_W / n : PLOT_W;
  const xOf = (i: number) => colW * (i + 0.5);
  const yOf = (v: number) => PLOT_BOTTOM - (v / maxVal) * plotH;

  // Y ticks every 20 up to the scale max.
  const yTicks: number[] = [];
  for (let t = 0; t <= maxVal; t += 20) yTicks.push(t);
  const curIdx = sprints.findIndex(s => s.weeks[0]?.startDate === currentSprintStart);

  // For a single "Average" line we color-code points by threshold; multi-series uses the
  // series' own color for both line and dots.
  const singleDotColor = (v: number) =>
    v > overThreshold ? '#ef4444' : v < underThreshold ? '#f59e0b' : '#3b82f6';

  return (
    <div className="flex">
      {/* Y-axis gutter pinned left */}
      <div className="w-11 shrink-0">
        {/* Spacer matching the sprint header band so Y ticks align with the SVG below it */}
        <div style={{ height: headerH }} />
        <div className="relative" style={{ height: PLOT_H }}>
          {yTicks.map(t => (
            <div
              key={t}
              className="absolute right-1 text-[11px] text-gray-400"
              style={{ top: yOf(t) - 7 }}
            >
              {t}
            </div>
          ))}
          {/* Threshold labels (may not be on a tick), drawn in color */}
          <div className="absolute right-1 text-[11px] text-red-500 font-medium" style={{ top: yOf(overThreshold) - 7 }}>{overThreshold}</div>
          <div className="absolute right-1 text-[11px] text-amber-600 font-medium" style={{ top: yOf(underThreshold) - 7 }}>{underThreshold}</div>
        </div>
      </div>

      {/* Plot column */}
      <div className="flex-1 min-w-0">
        {/* Sprint header band */}
        <div ref={headerRef} className="grid border-y-2 border-blue-200 bg-blue-50/60 rounded-t-md" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {sprints.map((s, i) => {
            const isCurrent = i === curIdx;
            return (
              <button
                key={i}
                onClick={() => onSelect(selectedIdx === i ? null : i)}
                className={`py-1.5 text-center ${i > 0 ? 'border-l border-blue-100' : ''} ${isCurrent ? 'bg-blue-100' : ''} ${selectedIdx === i ? 'ring-2 ring-inset ring-blue-400' : 'hover:bg-blue-100/60'}`}
                title="Click to see the breakdown"
              >
                <div className={`text-[11px] font-bold ${isCurrent ? 'text-blue-900' : 'text-blue-800'}`}>
                  {getSprintDateLabel(s)} <span className={`text-[9px] font-semibold ${isCurrent ? 'text-blue-600' : 'text-blue-500'}`}>{getSprintYearLabel(s)}</span>
                </div>
                <div className={`text-[11px] font-bold ${isCurrent ? 'text-blue-900' : 'text-blue-800'}`}>
                  {s.label}{isCurrent ? ' ◂ now' : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Single measured SVG: width = container width (1:1 px), so dots stay round and
            gridlines/threshold lines/points share one coordinate system. */}
        <div ref={plotRef} className="w-full">
        <svg width="100%" height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}>
          {curIdx >= 0 && (
            <rect x={colW * curIdx} y={PLOT_TOP} width={colW} height={plotH} fill="#dbeafe" fillOpacity={0.4} />
          )}
          {selectedIdx !== null && (
            <rect x={colW * selectedIdx} y={PLOT_TOP} width={colW} height={plotH} fill="#93c5fd" fillOpacity={0.2} />
          )}
          {/* column separators */}
          <g stroke="#eef2ff" strokeWidth={1}>
            {sprints.slice(1).map((_, i) => (
              <line key={i} x1={colW * (i + 1)} y1={PLOT_TOP} x2={colW * (i + 1)} y2={PLOT_BOTTOM} />
            ))}
          </g>
          {/* Y gridlines */}
          {yTicks.map(t => (
            <line
              key={t}
              x1={0} y1={yOf(t)} x2={PLOT_W} y2={yOf(t)}
              stroke={t === 0 ? '#e5e7eb' : '#f1f5f9'}
              strokeWidth={1}
            />
          ))}
          {/* Threshold reference lines (independent of the tick grid) */}
          <line x1={0} y1={yOf(overThreshold)} x2={PLOT_W} y2={yOf(overThreshold)} stroke="#f87171" strokeDasharray="5 4" strokeWidth={1.5} />
          <line x1={0} y1={yOf(underThreshold)} x2={PLOT_W} y2={yOf(underThreshold)} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
          {/* Area fill only for the single-series "Average" view */}
          {singleSeries && n > 1 && (
            <polygon
              fill="#3b82f6" fillOpacity={0.08}
              points={`${series[0].values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} ${xOf(n - 1)},${PLOT_BOTTOM} ${xOf(0)},${PLOT_BOTTOM}`}
            />
          )}
          {/* One polyline per series */}
          {n > 1 && series.map(s => (
            <polyline
              key={s.key}
              fill="none" stroke={s.color} strokeWidth={2.5}
              points={s.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')}
            />
          ))}

          {/* clickable column hit areas */}
          {sprints.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={colW * i} y={PLOT_TOP} width={colW} height={plotH}
              fill="transparent" style={{ cursor: 'pointer' }}
              onClick={() => onSelect(selectedIdx === i ? null : i)}
            />
          ))}
          {/* dots (+ value labels for the single-series view) */}
          {series.map(s =>
            s.values.map((v, i) => {
              const isCurrent = i === curIdx;
              const color = singleSeries ? singleDotColor(v) : s.color;
              return (
                <g key={`${s.key}-${i}`}>
                  {singleSeries && isCurrent && (
                    <circle cx={xOf(i)} cy={yOf(v)} r={9} fill="none" stroke="#3b82f6" strokeOpacity={0.3} strokeWidth={3} />
                  )}
                  <circle
                    cx={xOf(i)} cy={yOf(v)} r={singleSeries && isCurrent ? 6 : 4.5}
                    fill={singleSeries && isCurrent ? '#2563eb' : color}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(selectedIdx === i ? null : i)}
                  >
                    {!singleSeries && <title>{`${s.label}: ${v}%`}</title>}
                  </circle>
                  {singleSeries && (
                    <text x={xOf(i)} y={yOf(v) - 10} fontSize={11} fontWeight={700} textAnchor="middle" fill={color}>{v}%</text>
                  )}
                </g>
              );
            })
          )}
        </svg>
        </div>
      </div>
    </div>
  );
}
