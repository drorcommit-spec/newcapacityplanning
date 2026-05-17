import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PeriodCol {
  key: string;
  label: string;
  sublabel: string;
  year: number;
  month: number;
  sprint: number;
}

export default function TimelineView() {
  const { teamMembers, projects, allocations } = useData();
  const { canWrite } = usePermissions();
  const { user } = useAuth();

  const [periodOffset, setPeriodOffset] = useState(0);
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'under' | 'good' | 'over'>('all');
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleMember = (id: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedMembers(new Set());
      setAllExpanded(false);
    } else {
      setExpandedMembers(new Set(filteredMembers.map(m => m.id)));
      setAllExpanded(true);
    }
  };

  // Thresholds from localStorage
  const [underThreshold, setUnderThreshold] = useState(() => parseInt(localStorage.getItem('underCapacityThreshold') || '70'));
  const [overThreshold, setOverThreshold] = useState(() => parseInt(localStorage.getItem('overCapacityThreshold') || '100'));

  useEffect(() => {
    const handler = () => {
      setUnderThreshold(parseInt(localStorage.getItem('underCapacityThreshold') || '70'));
      setOverThreshold(parseInt(localStorage.getItem('overCapacityThreshold') || '100'));
    };
    window.addEventListener('thresholdChanged', handler);
    return () => window.removeEventListener('thresholdChanged', handler);
  }, []);

  // Active members
  const activeMembers = useMemo(() =>
    teamMembers.filter(m => m.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers]
  );

  // Managers
  const managers = useMemo(() => {
    const ids = new Set(activeMembers.map(m => m.managerId).filter(Boolean));
    return activeMembers.filter(m => ids.has(m.id)).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [activeMembers]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    let members = activeMembers;
    if (managerFilter !== 'all') {
      members = members.filter(m => m.managerId === managerFilter || m.id === managerFilter);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      members = members.filter(m => m.fullName.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q));
    }
    if (capacityFilter !== 'all') {
      // Filter based on current sprint (first period) total
      const today = new Date();
      const curYear = today.getFullYear();
      const curMonth = today.getMonth() + 1;
      const curSprint = today.getDate() <= 15 ? 1 : 2;
      members = members.filter(m => {
        const cap = m.capacity ?? 100;
        const total = allocations
          .filter(a => a.productManagerId === m.id && a.year === curYear && a.month === curMonth && a.sprint === curSprint)
          .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
        const underLimit = cap * underThreshold / 100;
        const overLimit = cap * overThreshold / 100;
        if (capacityFilter === 'under') return total < underLimit;
        if (capacityFilter === 'over') return total > overLimit;
        if (capacityFilter === 'good') return total >= underLimit && total <= overLimit;
        return true;
      });
    }
    return members;
  }, [activeMembers, managerFilter, searchText, capacityFilter, allocations, underThreshold, overThreshold]);

  // Generate sprint columns (8 sprints from current + offset)
  const periods: PeriodCol[] = useMemo(() => {
    const cols: PeriodCol[] = [];
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let sprint = today.getDate() <= 15 ? 1 : 2;

    // Apply offset
    let totalSprints = (year * 24) + ((month - 1) * 2) + sprint + periodOffset;
    year = Math.floor((totalSprints - 1) / 24);
    const rem = totalSprints - (year * 24);
    month = Math.floor((rem - 1) / 2) + 1;
    sprint = ((rem - 1) % 2) + 1;

    for (let i = 0; i < 8; i++) {
      cols.push({
        key: `${year}-${month}-${sprint}`,
        label: `${MONTH_NAMES[month - 1]} ${year}`,
        sublabel: `S${sprint}`,
        year, month, sprint,
      });
      sprint++;
      if (sprint > 2) { sprint = 1; month++; }
      if (month > 12) { month = 1; year++; }
    }
    return cols;
  }, [periodOffset]);

  // Get allocations for a member in a period
  const getCellAllocations = (memberId: string, period: PeriodCol) => {
    return allocations
      .filter(a => a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === period.sprint)
      .map(a => {
        const project = projects.find(p => p.id === a.projectId);
        return { ...a, customerName: project?.customerName || '', projectName: project?.projectName || '' };
      })
      .sort((a, b) => (b.allocationPercentage || 0) - (a.allocationPercentage || 0));
  };

  const getMemberTotal = (memberId: string, period: PeriodCol) => {
    return allocations
      .filter(a => a.productManagerId === memberId && a.year === period.year && a.month === period.month && a.sprint === period.sprint)
      .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
  };

  const getTotalColor = (total: number, capacity: number) => {
    if (total === 0) return 'text-gray-300';
    if (total > (capacity * overThreshold / 100)) return 'text-amber-500';
    if (total < (capacity * underThreshold / 100)) return 'text-red-500';
    return 'text-green-600';
  };

  const getTotalBgColor = (total: number, capacity: number) => {
    if (total === 0) return '';
    if (total > (capacity * overThreshold / 100)) return 'bg-amber-50';
    if (total < (capacity * underThreshold / 100)) return 'bg-red-50';
    return 'bg-green-50';
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search member..." value={searchText} onChange={e => setSearchText(e.target.value)}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded-md w-40 focus:outline-none focus:border-blue-300" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">Manager</span>
            <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md">
              <option value="all">All</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-400">{filteredMembers.length} members</span>
          <button onClick={toggleAll} className="px-2 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 text-gray-600">
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
          {/* Staff Capacity Traffic Light */}
          <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-gray-50">
            <span className="text-[10px] text-gray-500 font-medium mr-1">Staff Capacity</span>
            <button onClick={() => setCapacityFilter('all')}
              className={`text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'all' ? 'bg-white shadow font-bold text-gray-800' : 'text-gray-500 hover:bg-white'}`}>All</button>
            <button onClick={() => setCapacityFilter(capacityFilter === 'under' ? 'all' : 'under')}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'under' ? 'bg-red-100 font-bold text-red-800 shadow' : 'text-gray-400 hover:bg-red-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Under
            </button>
            <button onClick={() => setCapacityFilter(capacityFilter === 'good' ? 'all' : 'good')}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'good' ? 'bg-green-100 font-bold text-green-800 shadow' : 'text-gray-400 hover:bg-green-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Good
            </button>
            <button onClick={() => setCapacityFilter(capacityFilter === 'over' ? 'all' : 'over')}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'over' ? 'bg-amber-100 font-bold text-amber-800 shadow' : 'text-gray-400 hover:bg-amber-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Over
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPeriodOffset(o => o - 3)} className="p-1 rounded hover:bg-gray-50 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
          </button>
          <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1 rounded hover:bg-gray-50 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={() => setPeriodOffset(0)} className="px-2 py-0.5 text-[11px] text-gray-600 rounded hover:bg-gray-50">Today</button>
          <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1 rounded hover:bg-gray-50 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
          <button onClick={() => setPeriodOffset(o => o + 3)} className="p-1 rounded hover:bg-gray-50 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-white w-[180px] min-w-[180px] text-left px-3 py-2 border-r border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Member</span>
              </th>
              {periods.map(p => (
                <th key={p.key} className="text-center px-1 py-2 border-r border-gray-100 min-w-[140px]">
                  <div className="text-[11px] font-semibold text-gray-800">{p.label}</div>
                  <div className="text-[9px] text-gray-400">{p.sublabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(member => {
              const cap = member.capacity ?? 100;
              const isExpanded = expandedMembers.has(member.id);
              return (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/30 cursor-pointer" onClick={() => toggleMember(member.id)}>
                  <td className="sticky left-0 z-10 bg-white w-[180px] min-w-[180px] px-3 py-2 border-r border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <svg className={`w-3 h-3 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      <div>
                        <div className="text-xs font-semibold text-gray-900">{member.fullName}</div>
                        <div className="text-[10px] text-gray-400">{member.role || ''}</div>
                      </div>
                    </div>
                  </td>
                  {periods.map(period => {
                    const cellAllocs = getCellAllocations(member.id, period);
                    const total = getMemberTotal(member.id, period);
                    const bgColor = getTotalBgColor(total, cap);
                    return (
                      <td key={period.key} className={`px-1.5 py-1.5 border-r border-gray-100 align-top ${bgColor}`} onClick={e => e.stopPropagation()}>
                        {isExpanded && cellAllocs.length > 0 ? (
                          <div className="space-y-0.5">
                            {cellAllocs.map(a => (
                              <div key={a.id} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white/70 text-[10px]">
                                <span className="text-gray-600 truncate mr-1">{a.customerName}</span>
                                <span className="font-semibold text-gray-800 flex-shrink-0">{a.allocationPercentage}%</span>
                              </div>
                            ))}
                            <div className={`text-[10px] font-bold text-right mt-0.5 ${getTotalColor(total, cap)}`}>
                              {total}%
                            </div>
                          </div>
                        ) : (
                          <div className={`text-[11px] font-bold text-center ${getTotalColor(total, cap)}`}>
                            {total > 0 ? `${total}%` : <span className="text-gray-200">-</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
