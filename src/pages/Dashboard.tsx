import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getCurrentSprint, getMonthName, getSprintDateRange } from '../utils/dateUtils';
import Card from '../components/Card';

interface SprintInfo {
  year: number;
  month: number;
  sprint: number;
}

export default function Dashboard() {
  const { teamMembers, projects, allocations } = useData();
  const navigate = useNavigate();
  const currentSprint = getCurrentSprint();
  const [sprintCount] = useState(3);
  const [expandedSprints, setExpandedSprints] = useState<Record<string, { projects: boolean; members: boolean }>>({});

  // Capacity thresholds - editable and synced with localStorage
  const [underCapacityThreshold, setUnderCapacityThreshold] = useState(() => {
    const saved = localStorage.getItem('underCapacityThreshold');
    return saved ? parseInt(saved) : 70;
  });
  const [overCapacityThreshold, setOverCapacityThreshold] = useState(() => {
    const saved = localStorage.getItem('overCapacityThreshold');
    return saved ? parseInt(saved) : 100;
  });
  const [editingThreshold, setEditingThreshold] = useState<'under' | 'over' | null>(null);
  const [thresholdInputValue, setThresholdInputValue] = useState('');

  // Save thresholds to localStorage when they change
  useEffect(() => {
    localStorage.setItem('underCapacityThreshold', underCapacityThreshold.toString());
  }, [underCapacityThreshold]);

  useEffect(() => {
    localStorage.setItem('overCapacityThreshold', overCapacityThreshold.toString());
  }, [overCapacityThreshold]);

  // Generate sprint list
  const sprints = useMemo(() => {
    const result: SprintInfo[] = [];
    let { year, month, sprint } = currentSprint;
    
    for (let i = 0; i < sprintCount; i++) {
      result.push({ year, month, sprint });
      sprint++;
      if (sprint > 2) {
        sprint = 1;
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    }
    return result;
  }, [currentSprint, sprintCount]);

  // Calculate overall summary
  const overallSummary = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Active' && !p.isArchived);
    const activeMembers = teamMembers.filter(m => m.isActive);
    
    const currentSprintAllocs = allocations.filter(
      a => a.year === currentSprint.year && 
           a.month === currentSprint.month && 
           a.sprint === currentSprint.sprint
    );
    
    const totalCapacity = currentSprintAllocs.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
    const avgUtilization = activeMembers.length > 0 ? Math.round(totalCapacity / activeMembers.length) : 0;
    
    return {
      totalProjects: activeProjects.length,
      totalMembers: activeMembers.length,
      avgUtilization,
    };
  }, [projects, teamMembers, allocations, currentSprint]);

  // Calculate KPIs for each sprint
  const sprintKPIs = useMemo(() => {
    return sprints.map(sprint => {
      const activeProjects = projects.filter(p => p.status === 'Active' && !p.isArchived);
      const activeMembers = teamMembers.filter(m => m.isActive);
      
      const sprintAllocations = allocations.filter(
        a => a.year === sprint.year && 
             a.month === sprint.month && 
             a.sprint === sprint.sprint
      );

      const allocatedProjectIds = new Set(sprintAllocations.map(a => a.projectId));
      const projectsWithAllocations = activeProjects.filter(p => allocatedProjectIds.has(p.id));

      // PROJECT KPIs
      const projectsMissingCapacity = activeProjects.filter(p => !allocatedProjectIds.has(p.id)).length;
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const newOrStaleProjects = projectsWithAllocations.filter(project => {
        const previousAllocations = allocations.filter(a => {
          if (a.projectId !== project.id) return false;
          const allocDate = new Date(a.year, a.month - 1);
          const currentDate = new Date(sprint.year, sprint.month - 1);
          return allocDate < currentDate;
        });
        
        if (previousAllocations.length === 0) return true;
        
        const lastAllocation = previousAllocations.sort((a, b) => {
          const dateA = new Date(a.year, a.month - 1);
          const dateB = new Date(b.year, b.month - 1);
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        const lastAllocDate = new Date(lastAllocation.year, lastAllocation.month - 1);
        return lastAllocDate < sixMonthsAgo;
      }).length;
      
      // Projects with no PMO contact OR no PMO resource type allocation
      const projectsNoPMO = activeProjects.filter(project => {
        // Check if project has no PMO contact field
        if (!project.pmoContact || project.pmoContact.trim() === '') return true;
        
        // Check if project has 0% PMO resource type allocation
        const projectAllocs = sprintAllocations.filter(a => a.projectId === project.id);
        const pmoAllocation = projectAllocs.reduce((sum, alloc) => {
          const member = teamMembers.find(m => m.id === alloc.productManagerId);
          if (member && member.role && member.role.toLowerCase().includes('pmo')) {
            return sum + alloc.allocationPercentage;
          }
          return sum;
        }, 0);
        
        return pmoAllocation === 0;
      }).length;
      
      // Pending projects (status is Pending) that are in this sprint
      const pendingProjectIds = new Set(
        sprintAllocations
          .map(a => a.projectId)
          .filter(projectId => {
            const project = projects.find(p => p.id === projectId);
            return project && project.status === 'Pending' && !project.isArchived;
          })
      );
      const pendingProjects = pendingProjectIds.size;

      // MEMBER KPIs
      const memberAllocations = activeMembers.map(member => {
        const memberAllocs = sprintAllocations.filter(a => a.productManagerId === member.id);
        const total = memberAllocs.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
        const projectCount = new Set(memberAllocs.map(a => a.projectId)).size;
        
        const memberCapacity = member.capacity ?? 100;
        const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
        const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
        
        return {
          total,
          projectCount,
          isUnder: total < underThreshold,
          isOver: total > overThreshold,
          isGood: total >= underThreshold && total <= overThreshold,
          isUnallocated: total === 0,
        };
      });
      
      const membersUnderCapacity = memberAllocations.filter(m => m.isUnder).length;
      const membersOverCapacity = memberAllocations.filter(m => m.isOver).length;
      const unallocatedMembers = memberAllocations.filter(m => m.isUnallocated).length;
      const membersGoodCapacity = memberAllocations.filter(m => m.isGood).length;
      const membersSingleProject = memberAllocations.filter(m => m.projectCount === 1).length;
      const membersMultipleProjects = memberAllocations.filter(m => m.projectCount >= 3).length;

      const totalSprintCapacity = memberAllocations.reduce((sum, m) => sum + m.total, 0);
      const avgMemberUtilization = activeMembers.length > 0 
        ? Math.round(totalSprintCapacity / activeMembers.length) 
        : 0;

      return {
        sprint,
        projectsMissingCapacity,
        newOrStaleProjects,
        projectsNoPMO,
        pendingProjects,
        membersUnderCapacity,
        membersOverCapacity,
        unallocatedMembers,
        membersSingleProject,
        membersMultipleProjects,
        totalSprintCapacity,
        avgMemberUtilization,
        totalActiveProjects: activeProjects.length,
        totalActiveMembers: activeMembers.length,
      };
    });
  }, [sprints, teamMembers, projects, allocations, underCapacityThreshold, overCapacityThreshold]);

  const toggleExpanded = (sprintKey: string, section: 'projects' | 'members') => {
    setExpandedSprints(prev => ({
      ...prev,
      [sprintKey]: {
        ...prev[sprintKey],
        [section]: !prev[sprintKey]?.[section],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Current Sprint: {currentSprint.year} {getMonthName(currentSprint.month)} Sprint {currentSprint.sprint}
            </p>
          </div>
          
          {/* Capacity Thresholds Legend - Editable */}
          <div className="flex items-center gap-3 text-sm border-l pl-6">
            <span className="text-sm font-semibold text-gray-700">Capacity Thresholds:</span>
            <div className="flex items-center gap-1">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-gray-600">&lt;</span>
              {editingThreshold === 'under' ? (
                <input
                  type="number"
                  value={thresholdInputValue}
                  onChange={(e) => setThresholdInputValue(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(thresholdInputValue);
                    if (!isNaN(val) && val > 0 && val < overCapacityThreshold) {
                      setUnderCapacityThreshold(val);
                    }
                    setEditingThreshold(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(thresholdInputValue);
                      if (!isNaN(val) && val > 0 && val < overCapacityThreshold) {
                        setUnderCapacityThreshold(val);
                      }
                      setEditingThreshold(null);
                    } else if (e.key === 'Escape') {
                      setEditingThreshold(null);
                    }
                  }}
                  autoFocus
                  className="w-12 px-1 border border-blue-300 rounded text-center"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingThreshold('under');
                    setThresholdInputValue(underCapacityThreshold.toString());
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                  title="Click to edit"
                >
                  {underCapacityThreshold}
                </button>
              )}
              <span className="text-gray-600">%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              <span className="text-gray-600">{underCapacityThreshold}-{overCapacityThreshold}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600">❗</span>
              <span className="text-gray-600">&gt;</span>
              {editingThreshold === 'over' ? (
                <input
                  type="number"
                  value={thresholdInputValue}
                  onChange={(e) => setThresholdInputValue(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(thresholdInputValue);
                    if (!isNaN(val) && val > underCapacityThreshold) {
                      setOverCapacityThreshold(val);
                    }
                    setEditingThreshold(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(thresholdInputValue);
                      if (!isNaN(val) && val > underCapacityThreshold) {
                        setOverCapacityThreshold(val);
                      }
                      setEditingThreshold(null);
                    } else if (e.key === 'Escape') {
                      setEditingThreshold(null);
                    }
                  }}
                  autoFocus
                  className="w-12 px-1 border border-blue-300 rounded text-center"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingThreshold('over');
                    setThresholdInputValue(overCapacityThreshold.toString());
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                  title="Click to edit"
                >
                  {overCapacityThreshold}
                </button>
              )}
              <span className="text-gray-600">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">📊 Overall Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="text-sm font-semibold text-gray-700 mb-1">📁 Total Active Projects</div>
            <div className="text-3xl font-bold text-blue-600">{overallSummary.totalProjects}</div>
            <div className="text-xs text-gray-600 mt-1">All active projects</div>
          </div>

          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
            <div className="text-sm font-semibold text-gray-700 mb-1">👥 Total Active Members</div>
            <div className="text-3xl font-bold text-green-600">{overallSummary.totalMembers}</div>
            <div className="text-xs text-gray-600 mt-1">Team size</div>
          </div>

          <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
            <div className="text-sm font-semibold text-gray-700 mb-1">📈 Avg Utilization</div>
            <div className="text-3xl font-bold text-purple-600">{overallSummary.avgUtilization}%</div>
            <div className="text-xs text-gray-600 mt-1">Current sprint average</div>
          </div>

          <button
            onClick={() => navigate('/capacity-planning')}
            className="p-4 rounded-lg border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 text-left transition-all"
          >
            <div className="text-sm font-semibold text-blue-900 mb-1">⚡ Capacity Planning</div>
            <div className="text-3xl font-bold text-blue-600">→</div>
            <div className="text-xs text-gray-600 mt-1">Manage allocations</div>
          </button>
        </div>
      </Card>

      {/* Sprint Swimlanes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sprintKPIs.map((kpi, index) => {
          const sprintLabel = index === 0 ? 'Current Sprint' : index === 1 ? 'Next Sprint' : '2 Sprints Ahead';
          const sprintKey = `${kpi.sprint.year}-${kpi.sprint.month}-${kpi.sprint.sprint}`;
          const projectsExpanded = expandedSprints[sprintKey]?.projects || false;
          const membersExpanded = expandedSprints[sprintKey]?.members || false;
          const { startDate, endDate } = getSprintDateRange(kpi.sprint.year, kpi.sprint.month, kpi.sprint.sprint);
          
          return (
            <Card key={sprintKey}>
              {/* Sprint Header */}
              <div className="mb-4 pb-3 border-b-2 border-blue-200">
                <h2 className="text-lg font-bold text-blue-900">{sprintLabel}</h2>
                <p className="text-sm text-gray-600">
                  {getMonthName(kpi.sprint.month)} {kpi.sprint.year} - Sprint {kpi.sprint.sprint}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {startDate} - {endDate}
                </p>
              </div>

              {/* PROJECT KPIs Section */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span>📊 PROJECT KPIs</span>
                </h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/capacity-planning?view=projects&kpi=missing-resources&sprint=${index}`)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      kpi.projectsMissingCapacity > 0 
                        ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700">❗ Missing Resources</div>
                        <div className="text-xs text-gray-600 mt-1">Projects with no allocations</div>
                      </div>
                      <div className={`text-2xl font-bold ${kpi.projectsMissingCapacity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {kpi.projectsMissingCapacity}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate(`/capacity-planning?view=projects&kpi=new-reactivated&sprint=${index}`)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      kpi.newOrStaleProjects > 0 
                        ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700">🆕 New/Reactivated</div>
                        <div className="text-xs text-gray-600 mt-1">First sprint or 6+ month gap</div>
                      </div>
                      <div className={`text-2xl font-bold ${kpi.newOrStaleProjects > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {kpi.newOrStaleProjects}
                      </div>
                    </div>
                  </button>

                  {/* Expandable Project KPIs */}
                  <button
                    onClick={() => toggleExpanded(sprintKey, 'projects')}
                    className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{projectsExpanded ? '▼' : '▶'}</span>
                    <span>{projectsExpanded ? 'Hide' : 'Show'} More Project KPIs</span>
                  </button>

                  {projectsExpanded && (
                    <div className="space-y-2 pt-2 border-t">
                      <button
                        onClick={() => navigate(`/capacity-planning?view=projects&kpi=no-pmo&sprint=${index}`)}
                        className={`w-full p-2 rounded border text-left hover:shadow ${
                          kpi.projectsNoPMO > 0 ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs font-semibold">📋 No PMO Contact</div>
                            <div className="text-[10px] text-gray-600">No PMO contact or 0% PMO allocation</div>
                          </div>
                          <span className={`text-lg font-bold ${kpi.projectsNoPMO > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                            {kpi.projectsNoPMO}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate(`/capacity-planning?view=projects&kpi=pending&sprint=${index}`)}
                        className={`w-full p-2 rounded border text-left hover:shadow ${
                          kpi.pendingProjects > 0 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs font-semibold">⏳ Pending Projects</div>
                            <div className="text-[10px] text-gray-600">Projects with Pending status</div>
                          </div>
                          <span className={`text-lg font-bold ${kpi.pendingProjects > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                            {kpi.pendingProjects}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* MEMBER KPIs Section */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <span>👥 MEMBER KPIs</span>
                </h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/capacity-planning?view=team&kpi=over-capacity&sprint=${index}`)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      kpi.membersOverCapacity > 0 
                        ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700">❗ Over Capacity</div>
                        <div className="text-xs text-gray-600 mt-1">Members allocated &gt;{overCapacityThreshold}%</div>
                      </div>
                      <div className={`text-2xl font-bold ${kpi.membersOverCapacity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {kpi.membersOverCapacity}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate(`/capacity-planning?view=team&kpi=under-capacity&sprint=${index}`)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                      kpi.membersUnderCapacity > 0 
                        ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700">⚠️ Under Capacity</div>
                        <div className="text-xs text-gray-600 mt-1">Members allocated &lt;{underCapacityThreshold}%</div>
                      </div>
                      <div className={`text-2xl font-bold ${kpi.membersUnderCapacity > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {kpi.membersUnderCapacity}
                      </div>
                    </div>
                  </button>

                  {/* Expandable Member KPIs */}
                  <button
                    onClick={() => toggleExpanded(sprintKey, 'members')}
                    className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{membersExpanded ? '▼' : '▶'}</span>
                    <span>{membersExpanded ? 'Hide' : 'Show'} More Member KPIs</span>
                  </button>

                  {membersExpanded && (
                    <div className="space-y-2 pt-2 border-t">
                      <button
                        onClick={() => navigate(`/capacity-planning?view=team&kpi=unallocated&sprint=${index}`)}
                        className={`w-full p-2 rounded border text-left hover:shadow ${
                          kpi.unallocatedMembers > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs font-semibold">👤 Unallocated</div>
                            <div className="text-[10px] text-gray-600">Members with 0% allocation</div>
                          </div>
                          <span className={`text-lg font-bold ${kpi.unallocatedMembers > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                            {kpi.unallocatedMembers}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate(`/capacity-planning?view=team&kpi=single-project&sprint=${index}`)}
                        className="w-full p-2 rounded border border-gray-200 bg-white text-left hover:shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs font-semibold">🎯 Single Project</div>
                            <div className="text-[10px] text-gray-600">Members focused on 1 project</div>
                          </div>
                          <span className="text-lg font-bold text-blue-600">{kpi.membersSingleProject}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate(`/capacity-planning?view=team&kpi=multi-project&sprint=${index}`)}
                        className="w-full p-2 rounded border border-gray-200 bg-white text-left hover:shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-xs font-semibold">🔀 Multi-Project</div>
                            <div className="text-[10px] text-gray-600">Members working on 3+ projects</div>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">{kpi.membersMultipleProjects}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sprint Summary */}
              <div className="pt-3 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">📈 SPRINT SUMMARY</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-purple-50 rounded text-center">
                    <div className="text-gray-600">Total Capacity</div>
                    <div className="text-lg font-bold text-purple-600">{kpi.totalSprintCapacity}%</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded text-center">
                    <div className="text-gray-600">Avg Utilization</div>
                    <div className="text-lg font-bold text-purple-600">{kpi.avgMemberUtilization}%</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded text-center">
                    <div className="text-gray-600">Projects</div>
                    <div className="text-lg font-bold text-blue-600">{kpi.totalActiveProjects}</div>
                  </div>
                  <div className="p-2 bg-green-50 rounded text-center">
                    <div className="text-gray-600">Members</div>
                    <div className="text-lg font-bold text-green-600">{kpi.totalActiveMembers}</div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-4 rounded-lg border-2 border-green-400 bg-green-50 hover:bg-green-100 text-left transition-all hover:shadow-md"
          >
            <div className="text-lg font-semibold text-green-900 mb-2">📁 Projects</div>
            <div className="text-sm text-gray-600">Manage all projects</div>
          </button>

          <button
            onClick={() => navigate('/team')}
            className="p-4 rounded-lg border-2 border-purple-400 bg-purple-50 hover:bg-purple-100 text-left transition-all hover:shadow-md"
          >
            <div className="text-lg font-semibold text-purple-900 mb-2">👥 Team</div>
            <div className="text-sm text-gray-600">Manage team members</div>
          </button>

          <button
            onClick={() => navigate('/roles')}
            className="p-4 rounded-lg border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 text-left transition-all hover:shadow-md"
          >
            <div className="text-lg font-semibold text-orange-900 mb-2">👔 Roles</div>
            <div className="text-sm text-gray-600">Manage resource roles</div>
          </button>
        </div>
      </Card>
    </div>
  );
}
