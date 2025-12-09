import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getCurrentSprint, getMonthName, getSprintDateRange } from '../utils/dateUtils';
import { saveSprintProjects } from '../services/api';
import Card from '../components/Card';

interface SprintInfo {
  year: number;
  month: number;
  sprint: number;
}

export default function Dashboard() {
  const { teamMembers, projects, allocations, sprintProjects, sprintRoleRequirements, refreshData } = useData();
  const navigate = useNavigate();
  const currentSprint = getCurrentSprint();
  const [sprintCount] = useState(3);
  const [expandedSprints, setExpandedSprints] = useState<Record<string, { projects: boolean; members: boolean }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnallocatedProjectsPanel, setShowUnallocatedProjectsPanel] = useState(false);
  const [showUnallocatedMembersPanel, setShowUnallocatedMembersPanel] = useState(false);

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
    const activeProjects = projects.filter(p => !p.isArchived);
    const activeMembers = teamMembers.filter(m => m.isActive);
    
    const currentSprintAllocs = allocations.filter(
      a => a.year === currentSprint.year && 
           a.month === currentSprint.month && 
           a.sprint === currentSprint.sprint
    );
    
    const totalCapacity = currentSprintAllocs.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
    const avgUtilization = activeMembers.length > 0 ? Math.round(totalCapacity / activeMembers.length) : 0;
    
    // Calculate projects without sprint allocation (not in current or future sprints)
    const projectsInAnySprint = new Set<string>();
    sprints.forEach(sprint => {
      const sprintAllocs = allocations.filter(
        a => a.year === sprint.year && a.month === sprint.month && a.sprint === sprint.sprint
      );
      sprintAllocs.forEach(a => projectsInAnySprint.add(a.projectId));
      
      // Also check sprintProjects
      const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
      const sprintProjectIds = sprintProjects[sprintKey] || [];
      sprintProjectIds.forEach(id => projectsInAnySprint.add(id));
    });
    
    const projectsWithoutSprint = activeProjects.filter(p => !projectsInAnySprint.has(p.id));
    
    // Calculate members without sprint allocation (not in current or future sprints)
    const membersInAnySprint = new Set<string>();
    sprints.forEach(sprint => {
      const sprintAllocs = allocations.filter(
        a => a.year === sprint.year && a.month === sprint.month && a.sprint === sprint.sprint
      );
      sprintAllocs.forEach(a => membersInAnySprint.add(a.productManagerId));
    });
    
    const membersWithoutSprint = activeMembers.filter(m => !membersInAnySprint.has(m.id));
    
    return {
      totalProjects: activeProjects.length,
      totalMembers: activeMembers.length,
      avgUtilization,
      projectsWithoutSprint: projectsWithoutSprint.length,
      unallocatedProjects: projectsWithoutSprint,
      membersWithoutSprint: membersWithoutSprint.length,
      unallocatedMembers: membersWithoutSprint,
    };
  }, [projects, teamMembers, allocations, currentSprint, sprints, sprintProjects]);

  // Calculate KPIs for each sprint
  const sprintKPIs = useMemo(() => {
    return sprints.map(sprint => {
      const activeProjects = projects.filter(p => !p.isArchived);
      const activeMembers = teamMembers.filter(m => m.isActive);
      
      const sprintAllocations = allocations.filter(
        a => a.year === sprint.year && 
             a.month === sprint.month && 
             a.sprint === sprint.sprint
      );

      const allocatedProjectIds = new Set(sprintAllocations.map(a => a.projectId));
      
      // Get projects assigned to this sprint (either via allocations or sprintProjects)
      const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
      const sprintProjectIds = sprintProjects[sprintKey] || [];
      const allSprintProjectIds = new Set([...allocatedProjectIds, ...sprintProjectIds]);
      const projectsInSprint = activeProjects.filter(p => allSprintProjectIds.has(p.id));

      // PROJECT KPIs
      // Missing Resources: Projects that are in this sprint but need member allocation
      // A project is "missing resources" if:
      // 1. Total allocation = 0% (project in sprint but no members assigned), OR
      // 2. At least one role requirement is not met (allocated < required)
      const projectsMissingCapacity = projectsInSprint.filter(project => {
        const projectAllocs = sprintAllocations.filter(a => a.projectId === project.id);
        
        // Calculate total allocation (sum of all member allocations)
        const totalAllocation = projectAllocs.reduce((sum, a) => {
          const percentage = a.allocationPercentage ?? 0;
          return sum + percentage;
        }, 0);
        
        // Check if total allocation = 0% (includes: no members, or all members at 0%)
        if (totalAllocation === 0) return true;
        
        // Check role requirements if they exist
        const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
        const roleReqs = sprintRoleRequirements[requirementKey];
        
        if (roleReqs && Object.keys(roleReqs).length > 0) {
          // Calculate allocation by role
          const allocationByRole: Record<string, number> = {};
          projectAllocs.forEach(alloc => {
            const member = teamMembers.find(m => m.id === alloc.productManagerId);
            if (member && member.role) {
              allocationByRole[member.role] = (allocationByRole[member.role] || 0) + (alloc.allocationPercentage || 0);
            }
          });
          
          // Check if any required role has insufficient allocation
          for (const [role, required] of Object.entries(roleReqs)) {
            const allocated = allocationByRole[role] || 0;
            if (allocated < required) {
              return true; // Missing resources for this role
            }
          }
        }
        
        return false;
      }).length;
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const newOrStaleProjects = projectsInSprint.filter(project => {
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
      // Only consider members who have allocations in this sprint
      const memberAllocations = activeMembers
        .map(member => {
          const memberAllocs = sprintAllocations.filter(a => a.productManagerId === member.id);
          const total = memberAllocs.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
          const projectCount = new Set(memberAllocs.map(a => a.projectId)).size;
          
          const memberCapacity = member.capacity ?? 100;
          const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
          const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
          
          return {
            member,
            total,
            projectCount,
            isUnder: total > 0 && total < underThreshold, // Only count if allocated but under
            isOver: total > overThreshold,
            isGood: total >= underThreshold && total <= overThreshold,
            hasAllocation: total > 0,
          };
        })
        .filter(m => m.hasAllocation); // Only include members with allocations for sprint KPIs
      
      const membersUnderCapacity = memberAllocations.filter(m => m.isUnder).length;
      const membersOverCapacity = memberAllocations.filter(m => m.isOver).length;
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      alert('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Refresh data from server"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            onClick={() => setShowUnallocatedProjectsPanel(true)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              overallSummary.projectsWithoutSprint > 0
                ? 'border-orange-400 bg-orange-50 hover:bg-orange-100'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="text-sm font-semibold text-gray-700 mb-1">⚠️ Projects Without Sprint</div>
            <div className={`text-3xl font-bold ${
              overallSummary.projectsWithoutSprint > 0 ? 'text-orange-600' : 'text-gray-400'
            }`}>
              {overallSummary.projectsWithoutSprint}
            </div>
            <div className="text-xs text-gray-600 mt-1">Not allocated to any sprint</div>
          </button>

          <button
            onClick={() => setShowUnallocatedMembersPanel(true)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              overallSummary.membersWithoutSprint > 0
                ? 'border-red-400 bg-red-50 hover:bg-red-100'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="text-sm font-semibold text-gray-700 mb-1">👤 Unallocated Members</div>
            <div className={`text-3xl font-bold ${
              overallSummary.membersWithoutSprint > 0 ? 'text-red-600' : 'text-gray-400'
            }`}>
              {overallSummary.membersWithoutSprint}
            </div>
            <div className="text-xs text-gray-600 mt-1">Not allocated to any sprint</div>
          </button>

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

              {/* KPIs - Compact View */}
              <div className="space-y-2">
                {/* Missing Resources */}
                <button
                  onClick={() => navigate(`/capacity-planning?view=projects&kpi=missing-resources&sprint=${index}`)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                    kpi.projectsMissingCapacity > 0 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title="Projects with 0% allocation or unmet role requirements"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">❗ Missing Resources</span>
                      <span className="text-gray-400 text-xs cursor-help" title="Projects with 0% allocation or unmet role requirements">ℹ️</span>
                    </div>
                    <div className={`text-2xl font-bold ${kpi.projectsMissingCapacity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {kpi.projectsMissingCapacity}
                    </div>
                  </div>
                </button>

                {/* New/Reactivated */}
                <button
                  onClick={() => navigate(`/capacity-planning?view=projects&kpi=new-reactivated&sprint=${index}`)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                    kpi.newOrStaleProjects > 0 
                      ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title="Projects new or not worked on for 6+ months"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">🆕 New/Reactivated</span>
                      <span className="text-gray-400 text-xs cursor-help" title="Projects new or not worked on for 6+ months">ℹ️</span>
                    </div>
                    <div className={`text-2xl font-bold ${kpi.newOrStaleProjects > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {kpi.newOrStaleProjects}
                    </div>
                  </div>
                </button>

                {/* Over Capacity */}
                <button
                  onClick={() => navigate(`/capacity-planning?view=team&kpi=over-capacity&sprint=${index}`)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                    kpi.membersOverCapacity > 0 
                      ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title={`Members allocated >${overCapacityThreshold}%`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">🔴 Over Capacity</span>
                      <span className="text-gray-400 text-xs cursor-help" title={`Members allocated >${overCapacityThreshold}%`}>ℹ️</span>
                    </div>
                    <div className={`text-2xl font-bold ${kpi.membersOverCapacity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {kpi.membersOverCapacity}
                    </div>
                  </div>
                </button>

                {/* Under Capacity */}
                <button
                  onClick={() => navigate(`/capacity-planning?view=team&kpi=under-capacity&sprint=${index}`)}
                  className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                    kpi.membersUnderCapacity > 0 
                      ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title={`Members allocated <${underCapacityThreshold}%`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">⚠️ Under Capacity</span>
                      <span className="text-gray-400 text-xs cursor-help" title={`Members allocated <${underCapacityThreshold}%`}>ℹ️</span>
                    </div>
                    <div className={`text-2xl font-bold ${kpi.membersUnderCapacity > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {kpi.membersUnderCapacity}
                    </div>
                  </div>
                </button>

                {/* Multi-Project */}
                <button
                  onClick={() => navigate(`/capacity-planning?view=team&kpi=multi-project&sprint=${index}`)}
                  className="w-full p-3 rounded-lg border border-gray-200 bg-white text-left hover:shadow-md transition-all"
                  title="Members working on 3+ projects"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">🔀 Multi-Project</span>
                      <span className="text-gray-400 text-xs cursor-help" title="Members working on 3+ projects">ℹ️</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">{kpi.membersMultipleProjects}</div>
                  </div>
                </button>
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
            <div className="text-sm text-gray-600">View all projects</div>
          </button>

          <button
            onClick={() => navigate('/teams')}
            className="p-4 rounded-lg border-2 border-purple-400 bg-purple-50 hover:bg-purple-100 text-left transition-all hover:shadow-md"
          >
            <div className="text-lg font-semibold text-purple-900 mb-2">👥 Team</div>
            <div className="text-sm text-gray-600">View members' teams</div>
          </button>

          <button
            onClick={() => navigate('/roles')}
            className="p-4 rounded-lg border-2 border-orange-400 bg-orange-50 hover:bg-orange-100 text-left transition-all hover:shadow-md"
          >
            <div className="text-lg font-semibold text-orange-900 mb-2">👔 Resource Type</div>
            <div className="text-sm text-gray-600">View resource types</div>
          </button>
        </div>
      </Card>

      {/* Unallocated Members Floating Panel */}
      {showUnallocatedMembersPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">👤 Unallocated Team Members</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {overallSummary.membersWithoutSprint} member{overallSummary.membersWithoutSprint !== 1 ? 's' : ''} not allocated to any sprint
                  </p>
                </div>
                <button
                  onClick={() => setShowUnallocatedMembersPanel(false)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {overallSummary.unallocatedMembers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <div className="text-xl font-semibold text-gray-700">All members are allocated!</div>
                  <div className="text-sm text-gray-500 mt-2">Every active team member has been assigned to a sprint.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {overallSummary.unallocatedMembers.map(member => (
                    <div key={member.id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{member.fullName}</h3>
                          <div className="flex gap-3 mt-2 text-sm">
                            <span className="text-gray-600">
                              <span className="font-medium">Email:</span> {member.email}
                            </span>
                            {member.role && (
                              <span className="text-gray-600">
                                <span className="font-medium">Role:</span> {member.role}
                              </span>
                            )}
                            {member.capacity && (
                              <span className="text-gray-600">
                                <span className="font-medium">Capacity:</span> {member.capacity}%
                              </span>
                            )}
                          </div>
                          {member.teams && member.teams.length > 0 && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {member.teams.map(team => (
                                <span key={team} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {team}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sprint Allocation Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-red-200">
                        <div className="text-sm font-medium text-gray-700 mr-2">Add to:</div>
                        {sprints.slice(0, 3).map((sprint, index) => {
                          const sprintLabel = index === 0 ? 'Current Sprint' : index === 1 ? 'Next Sprint' : '2 Sprints Ahead';
                          return (
                            <button
                              key={`${sprint.year}-${sprint.month}-${sprint.sprint}`}
                              onClick={() => {
                                // Navigate to capacity planning with sprint and view mode
                                navigate(`/capacity-planning?view=team&sprint=${index}`);
                                setShowUnallocatedMembersPanel(false);
                              }}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                index === 0
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : index === 1
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              {sprintLabel}
                              <div className="text-xs opacity-90">
                                {getMonthName(sprint.month)} {sprint.year} S{sprint.sprint}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Click on a sprint button to add the member to that sprint
                </div>
                <button
                  onClick={() => setShowUnallocatedMembersPanel(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unallocated Projects Floating Panel */}
      {showUnallocatedProjectsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">⚠️ Projects Without Sprint Allocation</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {overallSummary.projectsWithoutSprint} project{overallSummary.projectsWithoutSprint !== 1 ? 's' : ''} not allocated to any sprint
                  </p>
                </div>
                <button
                  onClick={() => setShowUnallocatedProjectsPanel(false)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  title="Close"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {overallSummary.unallocatedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <div className="text-xl font-semibold text-gray-700">All projects are allocated!</div>
                  <div className="text-sm text-gray-500 mt-2">Every active project has been assigned to a sprint.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {overallSummary.unallocatedProjects.map(project => (
                    <div key={project.id} className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{project.customerName}</h3>
                          <p className="text-gray-700 font-semibold">{project.projectName}</p>
                          <div className="flex gap-3 mt-2 text-sm">
                            <span className="text-gray-600">
                              <span className="font-medium">Type:</span> {project.projectType}
                            </span>
                            <span className="text-gray-600">
                              <span className="font-medium">Status:</span> {project.status}
                            </span>
                            {project.pmoContact && (
                              <span className="text-gray-600">
                                <span className="font-medium">PMO:</span> {teamMembers.find(m => m.id === project.pmoContact)?.fullName || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sprint Allocation Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-orange-200">
                        <div className="text-sm font-medium text-gray-700 mr-2">Allocate to:</div>
                        {sprints.slice(0, 3).map((sprint, index) => {
                          const sprintLabel = index === 0 ? 'Current Sprint' : index === 1 ? 'Next Sprint' : '2 Sprints Ahead';
                          return (
                            <button
                              key={`${sprint.year}-${sprint.month}-${sprint.sprint}`}
                              onClick={async () => {
                                const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
                                const currentProjects = sprintProjects[sprintKey] || [];
                                if (!currentProjects.includes(project.id)) {
                                  // Add project to sprint
                                  const updatedSprintProjects = {
                                    ...sprintProjects,
                                    [sprintKey]: [...currentProjects, project.id]
                                  };
                                  
                                  try {
                                    await saveSprintProjects(updatedSprintProjects);
                                    // Refresh data to show the update
                                    await refreshData();
                                    setShowUnallocatedProjectsPanel(false);
                                  } catch (error) {
                                    console.error('Failed to allocate project to sprint:', error);
                                    alert('Failed to allocate project. Please try again.');
                                  }
                                }
                              }}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                index === 0
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : index === 1
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              {sprintLabel}
                              <div className="text-xs opacity-90">
                                {getMonthName(sprint.month)} {sprint.year} S{sprint.sprint}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Click on a sprint button to allocate the project to that sprint
                </div>
                <button
                  onClick={() => setShowUnallocatedProjectsPanel(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
