import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateUtilization, getUtilizationColor } from '../utils/capacityUtils';
import { getCurrentSprint, getMonthName } from '../utils/dateUtils';
import Card from '../components/Card';
import Input from '../components/Input';

const UNDER_CAPACITY_THRESHOLD_KEY = 'capacityThreshold_under';
const OVER_CAPACITY_THRESHOLD_KEY = 'capacityThreshold_over';
const DEFAULT_UNDER_THRESHOLD = 85;
const DEFAULT_OVER_THRESHOLD = 120;

export default function Dashboard() {
  const { teamMembers, projects, allocations } = useData();
  const navigate = useNavigate();
  const currentSprint = getCurrentSprint();
  
  // Load thresholds from localStorage or use defaults
  const [underCapacityThreshold, setUnderCapacityThreshold] = useState(() => {
    const saved = localStorage.getItem(UNDER_CAPACITY_THRESHOLD_KEY);
    return saved ? Number(saved) : DEFAULT_UNDER_THRESHOLD;
  });
  
  const [overCapacityThreshold, setOverCapacityThreshold] = useState(() => {
    const saved = localStorage.getItem(OVER_CAPACITY_THRESHOLD_KEY);
    return saved ? Number(saved) : DEFAULT_OVER_THRESHOLD;
  });

  const [sortBy, setSortBy] = useState<'name' | 'capacity'>('name');

  // Save thresholds to localStorage when they change
  useEffect(() => {
    localStorage.setItem(UNDER_CAPACITY_THRESHOLD_KEY, underCapacityThreshold.toString());
  }, [underCapacityThreshold]);

  useEffect(() => {
    localStorage.setItem(OVER_CAPACITY_THRESHOLD_KEY, overCapacityThreshold.toString());
  }, [overCapacityThreshold]);

  const activeProjects = projects
    .filter(p => p.status === 'Active' && !p.isArchived)
    .sort((a, b) => a.projectName.localeCompare(b.projectName));
  const activeManagers = teamMembers
    .filter(m => (m.role === 'Product Manager' || m.role === 'Product Operations Manager') && m.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const getNextSprints = (count: number) => {
    const sprints = [];
    let { year, month, sprint } = currentSprint;
    
    for (let i = 0; i < count; i++) {
      sprints.push({ year, month, sprint });
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
    return sprints;
  };

  const getSprintDates = (year: number, month: number, sprint: number) => {
    const startDay = sprint === 1 ? 1 : 16;
    const endDay = sprint === 1 ? 15 : new Date(year, month, 0).getDate();
    return {
      from: `${month}/${startDay}/${year}`,
      to: `${month}/${endDay}/${year}`,
    };
  };

  const timelineData = useMemo(() => {
    const sprints = getNextSprints(3);
    
    return sprints.map(({ year, month, sprint }) => {
      const dates = getSprintDates(year, month, sprint);
      
      // Unallocated projects for this sprint
      const unallocatedProjects = activeProjects.filter(project => {
        const hasAllocation = allocations.some(
          a => a.projectId === project.id && 
               a.year === year && 
               a.month === month && 
               a.sprint === sprint
        );
        return !hasAllocation;
      });

      // Under capacity members for this sprint
      const underCapacityMembers = activeManagers.filter(pm => {
        const pmAllocations = allocations.filter(
          a => a.productManagerId === pm.id &&
               a.year === year &&
               a.month === month &&
               a.sprint === sprint
        );
        const utilization = calculateUtilization(pmAllocations);
        return utilization < underCapacityThreshold;
      });

      // Over capacity members for this sprint
      const overCapacityMembers = activeManagers.filter(pm => {
        const pmAllocations = allocations.filter(
          a => a.productManagerId === pm.id &&
               a.year === year &&
               a.month === month &&
               a.sprint === sprint
        );
        const utilization = calculateUtilization(pmAllocations);
        return utilization > overCapacityThreshold;
      });

      return {
        year,
        month,
        sprint,
        dates,
        unallocatedProjects,
        underCapacityMembers,
        overCapacityMembers,
      };
    });
  }, [activeProjects, activeManagers, allocations, currentSprint, underCapacityThreshold, overCapacityThreshold]);

  const currentSprintUtilization = useMemo(() => {
    const data = activeManagers.map(pm => {
      const pmAllocations = allocations.filter(
        a => a.productManagerId === pm.id &&
        a.year === currentSprint.year &&
        a.month === currentSprint.month &&
        a.sprint === currentSprint.sprint
      );
      const utilization = calculateUtilization(pmAllocations);
      return { pm, utilization };
    });

    // Sort based on selected option
    if (sortBy === 'capacity') {
      return data.sort((a, b) => b.utilization - a.utilization);
    } else {
      return data.sort((a, b) => a.pm.fullName.localeCompare(b.pm.fullName));
    }
  }, [activeManagers, allocations, currentSprint, sortBy]);

  const handleUnallocatedClick = (projectIds: string[]) => {
    // Navigate to allocation board with project filter
    const projectIdsParam = projectIds.join(',');
    navigate(`/allocations/canvas?view=capacity&mode=project&projects=${projectIdsParam}`);
  };

  const handleCapacityClick = (year: number, month: number, sprint: number, filter: 'under' | 'over') => {
    // Navigate to allocation board with team filter
    navigate(`/allocations/canvas?view=capacity&mode=team&filter=${filter}&year=${year}&month=${month}&sprint=${sprint}&underThreshold=${underCapacityThreshold}&overThreshold=${overCapacityThreshold}`);
  };

  const handleMemberClick = (pmId: string) => {
    // Navigate to allocation board with member highlighted
    navigate(`/allocations/canvas?view=capacity&mode=team&highlightMember=${pmId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Current Sprint: {currentSprint.year} - {getMonthName(currentSprint.month)} - Sprint {currentSprint.sprint}
          </p>
        </div>
        <div className="flex gap-4 items-end">
          <Input
            label="Under Capacity Threshold (%)"
            type="number"
            min="0"
            max="100"
            value={underCapacityThreshold.toString()}
            onChange={(e) => setUnderCapacityThreshold(Number(e.target.value))}
            className="w-32"
          />
          <Input
            label="Over Capacity Threshold (%)"
            type="number"
            min="100"
            max="200"
            value={overCapacityThreshold.toString()}
            onChange={(e) => setOverCapacityThreshold(Number(e.target.value))}
            className="w-32"
          />
        </div>
      </div>

      {/* Active Projects Count */}
      <Card>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Active Projects</div>
            <div 
              className="text-3xl font-bold text-blue-600 mt-2 cursor-pointer hover:text-blue-700"
              onClick={() => navigate('/projects?status=Active')}
              title="Click to view active projects"
            >
              {activeProjects.length}
            </div>
          </div>
          <button
            onClick={() => navigate('/projects?addNew=true')}
            className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1"
            title="Add new project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </button>
        </div>
      </Card>

      {/* Timeline View */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Timeline View</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timelineData.map((data, index) => {
            const title = index === 0 ? 'Current Sprint' : index === 1 ? 'Next Sprint' : '2 Sprints Ahead';
            return (
              <div key={`${data.year}-${data.month}-${data.sprint}`} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <h3 className="text-lg font-bold text-blue-900 mb-2">{title}</h3>
                <div className="text-sm text-gray-700 mb-1">
                  {getMonthName(data.month)} {data.year} - Sprint {data.sprint}
                </div>
                <div className="text-xs text-gray-600 mb-4">
                  {data.dates.from} to {data.dates.to}
                </div>

                <div className="space-y-3">
                  {/* Unallocated Projects */}
                  <div 
                    className={`p-3 rounded-lg ${data.unallocatedProjects.length > 0 ? 'bg-orange-100 cursor-pointer hover:bg-orange-200' : 'bg-white'}`}
                    onClick={() => data.unallocatedProjects.length > 0 && handleUnallocatedClick(data.unallocatedProjects.map(p => p.id))}
                  >
                    <div className="text-xs text-gray-600 mb-1">Unallocated Active Projects</div>
                    <div className={`text-2xl font-bold ${data.unallocatedProjects.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {data.unallocatedProjects.length}
                    </div>
                  </div>

                  {/* Under Capacity Members */}
                  <div 
                    className={`p-3 rounded-lg ${data.underCapacityMembers.length > 0 ? 'bg-yellow-100 cursor-pointer hover:bg-yellow-200' : 'bg-white'}`}
                    onClick={() => data.underCapacityMembers.length > 0 && handleCapacityClick(data.year, data.month, data.sprint, 'under')}
                  >
                    <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Under Capacity Members
                    </div>
                    <div className={`text-2xl font-bold ${data.underCapacityMembers.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {data.underCapacityMembers.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">&lt; {underCapacityThreshold}%</div>
                  </div>

                  {/* Over Capacity Members */}
                  <div 
                    className={`p-3 rounded-lg ${data.overCapacityMembers.length > 0 ? 'bg-red-100 cursor-pointer hover:bg-red-200' : 'bg-white'}`}
                    onClick={() => data.overCapacityMembers.length > 0 && handleCapacityClick(data.year, data.month, data.sprint, 'over')}
                  >
                    <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      Over Capacity Members
                    </div>
                    <div className={`text-2xl font-bold ${data.overCapacityMembers.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {data.overCapacityMembers.length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">&gt; {overCapacityThreshold}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Current Sprint Capacity */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Current Sprint Capacity</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Name
            </button>
            <button
              onClick={() => setSortBy('capacity')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortBy === 'capacity'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sort by Capacity
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {currentSprintUtilization.length === 0 ? (
            <p className="text-gray-500">No Product Managers found</p>
          ) : (
            currentSprintUtilization.map(({ pm, utilization }) => (
              <div key={pm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div 
                    className="font-medium text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
                    onClick={() => handleMemberClick(pm.id)}
                    title="Click to view in Allocation Board"
                  >
                    {pm.fullName}
                  </div>
                  {pm.team && <div className="text-sm text-gray-600">Team: {pm.team}</div>}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getUtilizationColor(utilization)}`}>
                  {utilization}%
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
