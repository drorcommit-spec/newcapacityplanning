import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { getMonthName, calculateDaysFromPercentage } from '../utils/dateUtils';
import Card from './Card';
import Select from './Select';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const UNDER_CAPACITY_THRESHOLD_KEY = 'capacityThreshold_under';
const OVER_CAPACITY_THRESHOLD_KEY = 'capacityThreshold_over';
const DEFAULT_UNDER_THRESHOLD = 85;
const DEFAULT_OVER_THRESHOLD = 120;

type ViewMode = 'team' | 'project';

interface EditAllocationData {
  allocationId: string;
  pmId: string;
  pmName: string;
  projectId: string;
  projectName: string;
  year: number;
  month: number;
  sprint: number;
  currentPercentage: number;
}

interface NewAllocationData {
  pmId?: string;
  pmName?: string;
  projectId?: string;
  projectName?: string;
  year: number;
  month: number;
  sprint: number;
}

type CapacityFilter = 'all' | 'under' | 'over' | 'good';

interface CapacityOverviewProps {
  initialViewMode?: ViewMode;
  initialSelectedProjects?: string[];
  initialCapacityFilter?: CapacityFilter;
  initialUnderThreshold?: number;
  initialOverThreshold?: number;
  highlightMemberId?: string;
}

export default function CapacityOverview({ 
  initialViewMode, 
  initialSelectedProjects,
  initialCapacityFilter,
  initialUnderThreshold,
  initialOverThreshold,
  highlightMemberId
}: CapacityOverviewProps = {}) {
  const { teamMembers, projects, allocations, updateAllocation, addAllocation, deleteAllocation, updateProject } = useData();
  const { user } = useAuth();
  const { canWrite } = usePermissions();
  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const [editingAllocation, setEditingAllocation] = useState<EditAllocationData | null>(null);
  const [newPercentage, setNewPercentage] = useState('');
  const [newAllocationData, setNewAllocationData] = useState<NewAllocationData | null>(null);
  const [newAllocationForm, setNewAllocationForm] = useState({
    projectId: '',
    productManagerId: '',
    allocationPercentage: '',
  });
  
  const [commentingAllocation, setCommentingAllocation] = useState<{ allocationId: string; currentComment: string; projectName: string; memberName: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const [commentingProject, setCommentingProject] = useState<{ projectId: string; projectName: string; currentComment: string } | null>(null);
  const [projectCommentText, setProjectCommentText] = useState('');
  
  const [underCapacityThreshold, setUnderCapacityThreshold] = useState(() => {
    if (initialUnderThreshold !== undefined) return initialUnderThreshold;
    const saved = localStorage.getItem(UNDER_CAPACITY_THRESHOLD_KEY);
    return saved ? Number(saved) : DEFAULT_UNDER_THRESHOLD;
  });
  
  const [overCapacityThreshold, setOverCapacityThreshold] = useState(() => {
    if (initialOverThreshold !== undefined) return initialOverThreshold;
    const saved = localStorage.getItem(OVER_CAPACITY_THRESHOLD_KEY);
    return saved ? Number(saved) : DEFAULT_OVER_THRESHOLD;
  });
  
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>(initialCapacityFilter || 'all');
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  useEffect(() => {
    if (viewMode === 'team') {
      localStorage.setItem(UNDER_CAPACITY_THRESHOLD_KEY, underCapacityThreshold.toString());
    }
  }, [underCapacityThreshold, viewMode]);

  useEffect(() => {
    if (viewMode === 'team') {
      localStorage.setItem(OVER_CAPACITY_THRESHOLD_KEY, overCapacityThreshold.toString());
    }
  }, [overCapacityThreshold, viewMode]);

  
  const isSprintPast = (year: number, month: number, sprint: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentSprint = currentDay <= 15 ? 1 : 2;
    
    if (year < currentYear) return true;
    if (year > currentYear) return false;
    if (month < currentMonth) return true;
    if (month > currentMonth) return false;
    return sprint < currentSprint;
  };
  
  const nextThreeSprints = useMemo(() => {
    const sprints: Array<{ year: number; month: number; sprint: number; label: string }> = [];
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let sprint = now.getDate() <= 15 ? 1 : 2;
    
    const labels = ['Current Sprint', 'Next Sprint', '2 Sprints Ahead'];
    
    for (let i = 0; i < 3; i++) {
      sprints.push({ year, month, sprint, label: labels[i] });
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
  }, []);
  
  const activeManagers = teamMembers
    .filter(m => m.isActive && m.role !== 'PMO')
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const activeProjects = projects
    .filter(p => !p.isArchived && (!showOnlyActive || p.status === 'Active'))
    .sort((a, b) => {
      const customerCompare = a.customerName.localeCompare(b.customerName);
      if (customerCompare !== 0) return customerCompare;
      return a.projectName.localeCompare(b.projectName);
    });
  const teams = Array.from(new Set(activeManagers.flatMap(m => m.teams || []).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string));
  
  // Multi-select team filter - default to all teams selected except "No Team"
  const [selectedTeams, setSelectedTeams] = useState<string[]>(teams as string[]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');


  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (initialSelectedProjects && initialSelectedProjects.length > 0) {
      setSelectedProjects(initialSelectedProjects);
    }
  }, [initialSelectedProjects]);

  const handleEditClick = (
    allocationId: string,
    pmId: string,
    pmName: string,
    projectId: string,
    projectName: string,
    year: number,
    month: number,
    sprint: number,
    currentPercentage: number
  ) => {
    setEditingAllocation({
      allocationId,
      pmId,
      pmName,
      projectId,
      projectName,
      year,
      month,
      sprint,
      currentPercentage,
    });
    setNewPercentage(currentPercentage.toString());
  };

  const handleSaveEdit = () => {
    if (!editingAllocation || !user) return;

    const percentage = Number(newPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage between 0 and 100');
      return;
    }

    const duplicate = allocations.find(
      a => a.projectId === editingAllocation.projectId &&
           a.productManagerId === editingAllocation.pmId &&
           a.year === editingAllocation.year &&
           a.month === editingAllocation.month &&
           a.sprint === editingAllocation.sprint &&
           a.id !== editingAllocation.allocationId
    );


    if (duplicate) {
      alert('Error: An allocation already exists for this member, project, and sprint.');
      return;
    }

    const project = projects.find(p => p.id === editingAllocation.projectId);
    if (project && project.maxCapacityPercentage) {
      const existingAllocations = allocations.filter(
        a => a.projectId === editingAllocation.projectId &&
             a.year === editingAllocation.year &&
             a.month === editingAllocation.month &&
             a.sprint === editingAllocation.sprint &&
             a.id !== editingAllocation.allocationId
      );

      const totalAllocation = existingAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0) + percentage;

      if (totalAllocation > project.maxCapacityPercentage) {
        if (!confirm(`Warning: Total allocation (${totalAllocation}%) exceeds project max capacity (${project.maxCapacityPercentage}%). Continue?`)) {
          return;
        }
      }
    }

    updateAllocation(
      editingAllocation.allocationId,
      {
        allocationPercentage: percentage,
        allocationDays: calculateDaysFromPercentage(percentage),
      },
      user.id
    );

    setEditingAllocation(null);
    setNewPercentage('');
  };

  const handleAddClick = (data: NewAllocationData) => {
    setNewAllocationData(data);
    setNewAllocationForm({
      projectId: data.projectId || '',
      productManagerId: data.pmId || '',
      allocationPercentage: '',
    });
  };


  const handleSaveNewAllocation = () => {
    if (!newAllocationData || !user) return;

    const percentage = Number(newAllocationForm.allocationPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage between 0 and 100');
      return;
    }

    const projectId = newAllocationForm.projectId;
    const pmId = newAllocationForm.productManagerId;

    if (!projectId || !pmId) {
      alert('Please select both project and product manager');
      return;
    }

    const duplicate = allocations.find(
      a => a.projectId === projectId &&
           a.productManagerId === pmId &&
           a.year === newAllocationData.year &&
           a.month === newAllocationData.month &&
           a.sprint === newAllocationData.sprint
    );

    if (duplicate) {
      alert('Error: An allocation already exists for this member, project, and sprint.');
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (project && project.maxCapacityPercentage) {
      const existingAllocations = allocations.filter(
        a => a.projectId === projectId &&
             a.year === newAllocationData.year &&
             a.month === newAllocationData.month &&
             a.sprint === newAllocationData.sprint
      );

      const totalAllocation = existingAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0) + percentage;

      if (totalAllocation > project.maxCapacityPercentage) {
        if (!confirm(`Warning: Total allocation (${totalAllocation}%) exceeds project max capacity (${project.maxCapacityPercentage}%). Continue?`)) {
          return;
        }
      }
    }


    addAllocation(
      {
        projectId,
        productManagerId: pmId,
        year: newAllocationData.year,
        month: newAllocationData.month,
        sprint: newAllocationData.sprint,
        allocationPercentage: percentage,
        allocationDays: calculateDaysFromPercentage(percentage),
      },
      user.id
    );

    setNewAllocationData(null);
    setNewAllocationForm({
      projectId: '',
      productManagerId: '',
      allocationPercentage: '',
    });
  };

  const handleDeleteAllocation = (allocationId: string, projectName: string, pmName: string) => {
    if (!user) return;
    if (confirm(`Are you sure you want to delete the allocation for ${pmName} on ${projectName}?`)) {
      deleteAllocation(allocationId, user.id);
    }
  };

  const handleExportCSV = () => {
    if (viewMode !== 'project') return;

    // Get all unique team members across all sprints
    const allMemberIds = new Set<string>();
    swimlaneData.forEach(swimlane => {
      if ('projects' in swimlane) {
        swimlane.projects?.forEach((projectData: any) => {
          projectData.members.forEach((mem: any) => {
            allMemberIds.add(mem.pmId);
          });
        });
      }
    });

    const membersList = Array.from(allMemberIds)
      .map(id => teamMembers.find(m => m.id === id))
      .filter(m => m)
      .sort((a, b) => a!.fullName.localeCompare(b!.fullName));

    // Build CSV header - First row with sprint labels
    const headerRow1 = ['Customer', 'Project', 'Max Capacity (%)'];
    swimlaneData.forEach(swimlane => {
      // Add sprint header spanning multiple columns (one per member + total)
      headerRow1.push(`${swimlane.label} (${getMonthName(swimlane.month)} ${swimlane.year} S${swimlane.sprint})`);
      // Add empty cells for member columns under this sprint
      for (let i = 0; i < membersList.length; i++) {
        headerRow1.push('');
      }
    });

    // Build CSV header - Second row with member names under each sprint
    const headerRow2 = ['', '', ''];
    swimlaneData.forEach(() => {
      headerRow2.push('Total');
      membersList.forEach(member => {
        headerRow2.push(member!.fullName);
      });
    });

    // Build CSV rows
    const rows: string[][] = [headerRow1, headerRow2];
    
    // Get all unique projects
    const projectsSet = new Set<string>();
    swimlaneData.forEach(swimlane => {
      if ('projects' in swimlane) {
        swimlane.projects?.forEach((projectData: any) => {
          projectsSet.add(projectData.project.id);
        });
      }
    });

    const uniqueProjects = Array.from(projectsSet)
      .map(id => projects.find(p => p.id === id))
      .filter(p => p)
      .sort((a, b) => {
        const customerCompare = a!.customerName.localeCompare(b!.customerName);
        if (customerCompare !== 0) return customerCompare;
        return a!.projectName.localeCompare(b!.projectName);
      });

    uniqueProjects.forEach(project => {
      const row: string[] = [
        project!.customerName,
        project!.projectName,
        project!.maxCapacityPercentage?.toString() || '-'
      ];

      // For each sprint, add total and then each member's allocation
      swimlaneData.forEach(swimlane => {
        if ('projects' in swimlane) {
          const projectData = swimlane.projects?.find((p: any) => p.project.id === project!.id);
          
          // Add total for this sprint
          row.push(projectData ? `${projectData.total}%` : '-');
          
          // Add each member's allocation for this sprint
          membersList.forEach(member => {
            if (projectData) {
              const memberAlloc = projectData.members.find((m: any) => m.pmId === member!.id);
              row.push(memberAlloc ? `${memberAlloc.percentage}%` : '-');
            } else {
              row.push('-');
            }
          });
        }
      });

      rows.push(row);
    });

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = cell.replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    ).join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `project-allocations-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToNextSprint = (pmId: string, pmName: string, year: number, month: number, sprint: number) => {
    if (!user) return;
    
    // Calculate next sprint
    let nextYear = year;
    let nextMonth = month;
    let nextSprint = sprint + 1;
    
    if (nextSprint > 2) {
      nextSprint = 1;
      nextMonth++;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
    }
    
    // Find allocations for current sprint
    const sprintAllocations = allocations.filter(
      a => a.productManagerId === pmId &&
           a.year === year &&
           a.month === month &&
           a.sprint === sprint
    );
    
    if (sprintAllocations.length === 0) {
      alert('No allocations to copy for this sprint.');
      return;
    }
    
    if (!confirm(`Copy ${sprintAllocations.length} allocation(s) from ${pmName}'s sprint to next sprint?`)) {
      return;
    }
    
    // Copy each allocation to next sprint
    let copiedCount = 0;
    sprintAllocations.forEach(alloc => {
      // Check if allocation already exists
      const duplicate = allocations.find(
        a => a.projectId === alloc.projectId &&
             a.productManagerId === pmId &&
             a.year === nextYear &&
             a.month === nextMonth &&
             a.sprint === nextSprint
      );
      
      if (!duplicate) {
        addAllocation(
          {
            projectId: alloc.projectId,
            productManagerId: pmId,
            year: nextYear,
            month: nextMonth,
            sprint: nextSprint,
            allocationPercentage: alloc.allocationPercentage,
            allocationDays: alloc.allocationDays,
          },
          user.id
        );
        copiedCount++;
      }
    });
    
    alert(`Copied ${copiedCount} allocation(s) to next sprint!`);
  };

  const handleCopyProjectToNextSprint = (projectId: string, projectName: string, year: number, month: number, sprint: number) => {
    if (!user) return;
    
    // Calculate next sprint
    let nextYear = year;
    let nextMonth = month;
    let nextSprint = sprint + 1;
    
    if (nextSprint > 2) {
      nextSprint = 1;
      nextMonth++;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
    }
    
    // Find allocations for current sprint
    const sprintAllocations = allocations.filter(
      a => a.projectId === projectId &&
           a.year === year &&
           a.month === month &&
           a.sprint === sprint
    );
    
    if (sprintAllocations.length === 0) {
      alert('No allocations to copy for this sprint.');
      return;
    }
    
    if (!confirm(`Copy ${sprintAllocations.length} allocation(s) from ${projectName}'s sprint to next sprint?`)) {
      return;
    }
    
    // Copy each allocation to next sprint
    let copiedCount = 0;
    sprintAllocations.forEach(alloc => {
      // Check if allocation already exists
      const duplicate = allocations.find(
        a => a.projectId === projectId &&
             a.productManagerId === alloc.productManagerId &&
             a.year === nextYear &&
             a.month === nextMonth &&
             a.sprint === nextSprint
      );
      
      if (!duplicate) {
        addAllocation(
          {
            projectId: projectId,
            productManagerId: alloc.productManagerId,
            year: nextYear,
            month: nextMonth,
            sprint: nextSprint,
            allocationPercentage: alloc.allocationPercentage,
            allocationDays: alloc.allocationDays,
          },
          user.id
        );
        copiedCount++;
      }
    });
    
    alert(`Copied ${copiedCount} allocation(s) to next sprint!`);
  };

  const swimlaneData = useMemo(() => {
    return nextThreeSprints.map(sprintInfo => {
      const { year, month, sprint } = sprintInfo;
      const isPast = isSprintPast(year, month, sprint);
      
      if (viewMode === 'team') {
        let managers = activeManagers;
        // Filter by selected teams (multi-select)
        if (selectedTeams.length > 0) {
          managers = managers.filter(m => {
            // Handle "No Team" option
            if (selectedTeams.includes('No Team') && (!m.teams || m.teams.length === 0)) return true;
            // Handle regular teams - member matches if they're in any of the selected teams
            return m.teams && m.teams.some(team => selectedTeams.includes(team));
          });
        }

        // Member search filter
        if (memberSearchTerm) {
          const searchLower = memberSearchTerm.toLowerCase();
          managers = managers.filter(m => 
            m.fullName.toLowerCase().includes(searchLower) ||
            m.email.toLowerCase().includes(searchLower)
          );
        }

        if (capacityFilter !== 'all') {
          managers = managers.filter(pm => {
            const pmAllocations = allocations.filter(
              a => a.productManagerId === pm.id && a.year === year && a.month === month && a.sprint === sprint
            );
            const total = pmAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
            
            if (capacityFilter === 'under') {
              return total < underCapacityThreshold;
            } else if (capacityFilter === 'over') {
              return total > overCapacityThreshold;
            } else if (capacityFilter === 'good') {
              return total >= underCapacityThreshold && total <= overCapacityThreshold;
            }
            return true;
          });
        }


        const teamGroups = new Map<string, typeof managers>();
        managers.forEach(pm => {
          const pmTeams = pm.teams && pm.teams.length > 0 ? pm.teams : ['No Team'];
          pmTeams.forEach(teamName => {
            if (!teamGroups.has(teamName)) {
              teamGroups.set(teamName, []);
            }
            teamGroups.get(teamName)!.push(pm);
          });
        });

        const teams = Array.from(teamGroups.entries()).map(([teamName, teamMembers]) => {
          const members = teamMembers.map(pm => {
            const pmAllocations = allocations.filter(
              a => a.productManagerId === pm.id && a.year === year && a.month === month && a.sprint === sprint
            );
            const total = pmAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
            const projectsList = pmAllocations.map(a => {
              const project = projects.find(p => p.id === a.projectId);
              return { 
                allocationId: a.id,
                projectId: a.projectId,
                project: project?.projectName || 'Unknown', 
                percentage: a.allocationPercentage 
              };
            });

            return { pm, total, projects: projectsList };
          });

          return { teamName, members };
        });

        return { ...sprintInfo, isPast, teams };
      } else {
        let projectList = activeProjects;
        if (selectedProjects.length > 0) {
          projectList = projectList.filter(p => selectedProjects.includes(p.id));
        }

        const projectsData = projectList.map(project => {
          const projectAllocations = allocations.filter(
            a => a.projectId === project.id && a.year === year && a.month === month && a.sprint === sprint
          );
          const total = projectAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
          const membersList = projectAllocations.map(a => {
            const pm = teamMembers.find(m => m.id === a.productManagerId);
            return { 
              allocationId: a.id,
              pmId: a.productManagerId,
              member: pm?.fullName || 'Unknown', 
              percentage: a.allocationPercentage 
            };
          });

          return { project, total, members: membersList };
        });

        // Filter for unallocated projects if checkbox is checked
        const filteredProjects = showUnallocatedOnly 
          ? projectsData.filter(pd => pd.members.length === 0)
          : projectsData;

        return { ...sprintInfo, isPast, projects: filteredProjects };
      }
    });
  }, [nextThreeSprints, viewMode, activeManagers, selectedTeams, capacityFilter, underCapacityThreshold, overCapacityThreshold, allocations, projects, activeProjects, selectedProjects, teamMembers, isSprintPast, showUnallocatedOnly]);


  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Capacity Overview</h2>
          <div className="flex gap-2 items-center">
            {viewMode === 'project' && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5"
                title="Export to CSV"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            )}
            <div className="flex gap-1 bg-gray-100 rounded p-1">
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${viewMode === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'}`}
              >
                Team
              </button>
              <button
                onClick={() => setViewMode('project')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${viewMode === 'project' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'}`}
              >
                Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar - Compact and Horizontal */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
        <div className="flex gap-4 items-center flex-wrap">
          {viewMode === 'team' && (
            <>
              {/* Team Filter - Compact Dropdown */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-600 block mb-1">Team Filter</label>
                <div className="bg-white border border-gray-300 rounded p-2 max-h-32 overflow-y-auto w-48">
                  {/* No Team option */}
                  <label className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes('No Team')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeams([...selectedTeams, 'No Team']);
                        } else {
                          setSelectedTeams(selectedTeams.filter(t => t !== 'No Team'));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">No Team</span>
                  </label>
                  
                  {/* Regular teams */}
                  {teams.map(team => (
                    <label key={team} className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(team as string)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams([...selectedTeams, team as string]);
                          } else {
                            setSelectedTeams(selectedTeams.filter(t => t !== team));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{team}</span>
                    </label>
                  ))}
                  
                  {/* Select All / Deselect All buttons */}
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setSelectedTeams([...teams as string[], 'No Team'])}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTeams([])}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Capacity Filter</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCapacityFilter('all')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      capacityFilter === 'all'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapacityFilter('under')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      capacityFilter === 'under'
                        ? 'bg-yellow-600 text-white border-yellow-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${capacityFilter === 'under' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Under
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapacityFilter('over')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      capacityFilter === 'over'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${capacityFilter === 'over' ? 'text-white' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    Over
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapacityFilter('good')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      capacityFilter === 'good'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`w-4 h-4 ${capacityFilter === 'good' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Good
                  </button>
                </div>
              </div>

              <Input
                label="Search Members"
                type="text"
                placeholder="Search by name or email..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
              />
            </>
          )}

          {viewMode === 'project' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Projects</label>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="border border-gray-300 rounded-lg p-2 bg-white max-h-40 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedProjects.length === 0}
                      onChange={() => setSelectedProjects([])}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">All Projects</span>
                  </label>
                  {activeProjects
                    .filter(p => {
                      const searchLower = projectSearchTerm.toLowerCase();
                      return p.projectName.toLowerCase().includes(searchLower) || 
                             p.customerName.toLowerCase().includes(searchLower);
                    })
                    .map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects([...selectedProjects, p.id]);
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== p.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{p.customerName} - {p.projectName}</span>
                      </label>
                    ))}
                </div>
                {selectedProjects.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyActive}
                    onChange={(e) => setShowOnlyActive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Active projects only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnallocatedOnly}
                    onChange={(e) => setShowUnallocatedOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Show unallocated projects only</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sprint Panes - No Scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {swimlaneData.map((swimlane, index) => (
            <div 
              key={`${swimlane.year}-${swimlane.month}-${swimlane.sprint}`}
              className={`border-2 rounded-lg ${
                index === 0 ? 'border-blue-500 bg-blue-50' : 
                index === 1 ? 'border-green-500 bg-green-50' : 
                'border-gray-400 bg-gray-50'
              } ${swimlane.isPast ? 'opacity-50' : ''}`}
            >
              {/* Sprint Header - Compact */}
              <div className="px-3 py-2 border-b-2 bg-white bg-opacity-60">
                <h3 className="text-base font-bold text-gray-900">{swimlane.label}</h3>
                <div className="text-xs text-gray-600">
                  {getMonthName(swimlane.month)} {swimlane.year} - Sprint {swimlane.sprint}
                  {swimlane.isPast && <span className="ml-2 text-gray-500 font-semibold">(Past)</span>}
                </div>
              </div>
              
              {/* Sprint Content - No Individual Scroll */}
              <div className="p-3">

                {viewMode === 'team' && 'teams' in swimlane && swimlane.teams?.map((team: any) => (
                  <div key={team.teamName} className="mb-4">
                    <h4 className="font-semibold text-sm mb-2 text-gray-700 bg-white px-2 py-1 rounded">{team.teamName}</h4>
                    {team.members.length === 0 && (
                      <div className="text-xs text-gray-500 italic p-2">No members match filter</div>
                    )}
                    {team.members.map((member: any) => (
                      <div 
                        key={member.pm.id} 
                        id={`member-${member.pm.id}`}
                        className={`mb-3 p-2 bg-white rounded border shadow-sm transition-all duration-300 ${
                          highlightMemberId === member.pm.id ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{member.pm.fullName}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              member.total < underCapacityThreshold ? 'text-yellow-600' :
                              member.total > overCapacityThreshold ? 'text-red-600' :
                              'text-green-600'
                            }`}>
                              {member.total}%
                            </span>
                            {!swimlane.isPast && member.total < underCapacityThreshold && member.total > 0 && (
                              <span className="text-yellow-600" title="Under capacity">⚠️</span>
                            )}
                            {!swimlane.isPast && member.total > overCapacityThreshold && (
                              <span className="text-red-600" title="Over capacity">⚠️</span>
                            )}
                            {!swimlane.isPast && canWrite && (
                              <>
                                {member.projects.length > 0 && index < 2 && (
                                  <button
                                    onClick={() => handleCopyToNextSprint(
                                      member.pm.id,
                                      member.pm.fullName,
                                      swimlane.year,
                                      swimlane.month,
                                      swimlane.sprint
                                    )}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Copy to next sprint"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAddClick({
                                    pmId: member.pm.id,
                                    pmName: member.pm.fullName,
                                    year: swimlane.year,
                                    month: swimlane.month,
                                    sprint: swimlane.sprint,
                                  })}
                                  className="text-green-600 hover:text-green-800"
                                  title="Add allocation"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {member.projects.length === 0 && (
                          <div className="text-xs text-gray-400 italic ml-2">No allocations</div>
                        )}
                        {[...member.projects].sort((a, b) => b.percentage - a.percentage).map((proj: any, i: number) => (
                          <div key={i} className="text-xs text-gray-600 ml-2 flex items-center justify-between mt-1">
                            <span>• {proj.project}: {proj.percentage}%</span>
                            {!swimlane.isPast && canWrite && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditClick(
                                    proj.allocationId,
                                    member.pm.id,
                                    member.pm.fullName,
                                    proj.projectId,
                                    proj.project,
                                    swimlane.year,
                                    swimlane.month,
                                    swimlane.sprint,
                                    proj.percentage
                                  )}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteAllocation(proj.allocationId, proj.project, member.pm.fullName)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}


                {viewMode === 'project' && 'projects' in swimlane && swimlane.projects?.map((projectData: any) => {
                  // Check if total exceeds max capacity
                  const maxCapacity = projectData.project.maxCapacityPercentage;
                  const exceedsCapacity = maxCapacity && projectData.total > maxCapacity;
                  
                  // Sort members by allocation percentage descending
                  const sortedMembers = [...projectData.members].sort((a, b) => b.percentage - a.percentage);
                  
                  return (
                  <div key={projectData.project.id} className="mb-3 p-2 bg-white rounded border shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{projectData.project.projectName}</div>
                        {projectData.project.comment && (
                          <span className="text-blue-500 text-xs" title={projectData.project.comment}>💬</span>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => {
                              setCommentingProject({
                                projectId: projectData.project.id,
                                projectName: projectData.project.projectName,
                                currentComment: projectData.project.comment || ''
                              });
                              setProjectCommentText(projectData.project.comment || '');
                            }}
                            className={`${projectData.project.comment ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-800`}
                            title={projectData.project.comment ? 'Edit project comment' : 'Add project comment'}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                          </button>
                        )}
                        <div className="text-xs text-gray-500">{projectData.project.customerName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{projectData.total}%</span>
                        {exceedsCapacity && (
                          <span 
                            className="text-red-600 cursor-help" 
                            title={`Exceeds project max capacity of ${maxCapacity}%`}
                          >
                            ❗
                          </span>
                        )}
                        {!swimlane.isPast && canWrite && (
                          <>
                            {projectData.members.length > 0 && index < 2 && (
                              <button
                                onClick={() => handleCopyProjectToNextSprint(
                                  projectData.project.id,
                                  projectData.project.projectName,
                                  swimlane.year,
                                  swimlane.month,
                                  swimlane.sprint
                                )}
                                className="text-blue-600 hover:text-blue-800"
                                title="Copy to next sprint"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleAddClick({
                                projectId: projectData.project.id,
                                projectName: projectData.project.projectName,
                                year: swimlane.year,
                                month: swimlane.month,
                                sprint: swimlane.sprint,
                              })}
                              className="text-green-600 hover:text-green-800"
                              title="Add allocation"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {sortedMembers.length === 0 && (
                      <div className="text-xs text-gray-400 italic ml-2">No allocations</div>
                    )}
                    {sortedMembers.map((mem: any, i: number) => {
                      const allocation = allocations.find(a => a.id === mem.allocationId);
                      const hasComment = allocation?.comment;
                      
                      return (
                        <div key={i} className="text-xs text-gray-600 ml-2 flex items-center justify-between mt-1">
                          <span className="flex items-center gap-1">
                            • {mem.member}: {mem.percentage}%
                            {hasComment && (
                              <span className="text-blue-500" title={allocation?.comment}>💬</span>
                            )}
                          </span>
                          {!swimlane.isPast && canWrite && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const alloc = allocations.find(a => a.id === mem.allocationId);
                                setCommentingAllocation({
                                  allocationId: mem.allocationId,
                                  currentComment: alloc?.comment || '',
                                  projectName: projectData.project.projectName,
                                  memberName: mem.member
                                });
                                setCommentText(alloc?.comment || '');
                              }}
                              className={`${hasComment ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-800`}
                              title={hasComment ? 'Edit comment' : 'Add comment'}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={() => handleEditClick(
                                mem.allocationId,
                                mem.pmId,
                                mem.member,
                                projectData.project.id,
                                projectData.project.projectName,
                                swimlane.year,
                                swimlane.month,
                                swimlane.sprint,
                                mem.percentage
                              )}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDeleteAllocation(mem.allocationId, projectData.project.projectName, mem.member)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal 
        isOpen={editingAllocation !== null} 
        onClose={() => {
          setEditingAllocation(null);
          setNewPercentage('');
        }} 
        title="Edit Allocation"
      >
        {editingAllocation && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Product Manager</div>
              <div className="font-medium">{editingAllocation.pmName}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Project</div>
              <div className="font-medium">{editingAllocation.projectName}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Sprint</div>
              <div className="font-medium">
                {editingAllocation.year} - {getMonthName(editingAllocation.month)} - Sprint {editingAllocation.sprint}
              </div>
            </div>
            <Input
              label="Allocation Percentage"
              type="number"
              min="0"
              max="100"
              step="5"
              value={newPercentage}
              onChange={(e) => setNewPercentage(e.target.value)}
              required
            />
            {newPercentage && (
              <div className="text-sm text-gray-600">
                = {calculateDaysFromPercentage(Number(newPercentage))} days
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setEditingAllocation(null);
                  setNewPercentage('');
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveEdit}>
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>


      <Modal 
        isOpen={newAllocationData !== null} 
        onClose={() => {
          setNewAllocationData(null);
          setNewAllocationForm({
            projectId: '',
            productManagerId: '',
            allocationPercentage: '',
          });
        }} 
        title="Add New Allocation"
      >
        {newAllocationData && (
          <div className="space-y-4">
            {newAllocationData.pmName && (
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Product Manager</div>
                <div className="font-medium">{newAllocationData.pmName}</div>
              </div>
            )}
            {newAllocationData.projectName && (
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Project</div>
                <div className="font-medium">{newAllocationData.projectName}</div>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Sprint</div>
              <div className="font-medium">
                {newAllocationData.year} - {getMonthName(newAllocationData.month)} - Sprint {newAllocationData.sprint}
              </div>
            </div>
            
            {!newAllocationData.projectName && (
              <Select
                label="Project"
                options={[
                  { value: '', label: 'Select Project' },
                  ...activeProjects.map(p => ({ value: p.id, label: `${p.customerName} - ${p.projectName}` })),
                ]}
                value={newAllocationForm.projectId}
                onChange={(e) => setNewAllocationForm({ ...newAllocationForm, projectId: e.target.value })}
                required
              />
            )}
            
            {!newAllocationData.pmName && (
              <Select
                label="Product Manager"
                options={[
                  { value: '', label: 'Select PM' },
                  ...activeManagers.map(m => ({ value: m.id, label: m.fullName })),
                ]}
                value={newAllocationForm.productManagerId}
                onChange={(e) => setNewAllocationForm({ ...newAllocationForm, productManagerId: e.target.value })}
                required
              />
            )}

            
            <Input
              label="Allocation Percentage"
              type="number"
              min="0"
              max="100"
              step="5"
              value={newAllocationForm.allocationPercentage}
              onChange={(e) => setNewAllocationForm({ ...newAllocationForm, allocationPercentage: e.target.value })}
              required
            />
            {newAllocationForm.allocationPercentage && (
              <div className="text-sm text-gray-600">
                = {calculateDaysFromPercentage(Number(newAllocationForm.allocationPercentage))} days
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setNewAllocationData(null);
                  setNewAllocationForm({
                    projectId: '',
                    productManagerId: '',
                    allocationPercentage: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveNewAllocation}>
                Add Allocation
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Allocation Comment Modal */}
      <Modal 
        isOpen={commentingAllocation !== null} 
        onClose={() => {
          setCommentingAllocation(null);
          setCommentText('');
        }} 
        title="Allocation Comment"
      >
        {commentingAllocation && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Project</div>
              <div className="font-medium">{commentingAllocation.projectName}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Product Manager</div>
              <div className="font-medium">{commentingAllocation.memberName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment about this allocation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setCommentingAllocation(null);
                  setCommentText('');
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  if (commentingAllocation && user) {
                    updateAllocation(commentingAllocation.allocationId, { comment: commentText || undefined }, user.id);
                    setCommentingAllocation(null);
                    setCommentText('');
                  }
                }}
              >
                Save Comment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Project Comment Modal */}
      <Modal 
        isOpen={commentingProject !== null} 
        onClose={() => {
          setCommentingProject(null);
          setProjectCommentText('');
        }} 
        title="Project Comment"
      >
        {commentingProject && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Project</div>
              <div className="font-medium">{commentingProject.projectName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment
              </label>
              <textarea
                value={projectCommentText}
                onChange={(e) => setProjectCommentText(e.target.value)}
                placeholder="Add a comment about this project..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => {
                  setCommentingProject(null);
                  setProjectCommentText('');
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  if (commentingProject) {
                    updateProject(commentingProject.projectId, { comment: projectCommentText || undefined });
                    setCommentingProject(null);
                    setProjectCommentText('');
                  }
                }}
              >
                Save Comment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
