import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getUserPermissions, Project, TeamMember, SprintAllocation } from '../types';
import Modal from '../components/Modal';

type ViewMode = 'projects' | 'team';
type CapacityFilter = 'all' | 'under' | 'over' | 'good';

interface SprintInfo {
  year: number;
  month: number;
  sprint: number;
}

export default function CapacityPlanning() {
  const { teamMembers, projects, allocations, addAllocation, updateAllocation, deleteAllocation } = useData();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const permissions = getUserPermissions(currentUser.role);
  const canWrite = permissions.includes('write');

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [showFilters, setShowFilters] = useState(true);
  const [sprintCount, setSprintCount] = useState(3);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('all');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);

  // Capacity thresholds
  const underCapacityThreshold = 70;
  const overCapacityThreshold = 100;

  // Get all unique resource types
  const allResourceTypes = useMemo(() => {
    const types = new Set<string>();
    teamMembers.forEach(m => {
      if (m.resourceType) types.add(m.resourceType);
    });
    return Array.from(types).sort();
  }, [teamMembers]);

  // Modal state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<SprintInfo | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [allocationPercentage, setAllocationPercentage] = useState('');

  // Generate sprint timeline
  const sprints = useMemo(() => {
    const result = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentSprint = Math.ceil((today.getDate() / 30) * 2);
    
    let year = currentYear;
    let month = currentMonth;
    let sprint = currentSprint;

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
  }, [sprintCount]);

  // Get allocations for a specific sprint
  const getSprintAllocations = (sprint: SprintInfo) => {
    return allocations.filter(
      a => a.year === sprint.year && a.month === sprint.month && a.sprint === sprint.sprint
    );
  };

  // Get projects with allocations for a sprint
  const getProjectsForSprint = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const projectMap = new Map<string, { project: Project; members: any[]; total: number }>();

    sprintAllocs.forEach(alloc => {
      const project = projects.find(p => p.id === alloc.projectId);
      const member = teamMembers.find(m => m.id === alloc.productManagerId);
      
      if (project && member && project.status === 'Active') {
        // Apply resource type filter
        if (selectedResourceTypes.length > 0 && member.resourceType && !selectedResourceTypes.includes(member.resourceType)) {
          return;
        }

        if (!projectMap.has(project.id)) {
          projectMap.set(project.id, { project, members: [], total: 0 });
        }
        const projectData = projectMap.get(project.id)!;
        projectData.members.push({
          ...member,
          allocationId: alloc.id,
          percentage: alloc.allocationPercentage,
          comment: alloc.comment
        });
        projectData.total += alloc.allocationPercentage;
      }
    });

    let result = Array.from(projectMap.values());

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(({ project }) =>
        project.customerName.toLowerCase().includes(search) ||
        project.projectName.toLowerCase().includes(search)
      );
    }

    // Apply capacity filter
    if (capacityFilter !== 'all') {
      result = result.filter(({ total }) => {
        if (capacityFilter === 'under') return total < underCapacityThreshold;
        if (capacityFilter === 'over') return total > overCapacityThreshold;
        if (capacityFilter === 'good') return total >= underCapacityThreshold && total <= overCapacityThreshold;
        return true;
      });
    }

    // Apply unallocated filter
    if (showUnallocatedOnly) {
      result = result.filter(({ members }) => members.length === 0);
    }

    // Sort projects by customer name, then project name
    return result.sort((a, b) => {
      const customerCompare = a.project.customerName.localeCompare(b.project.customerName);
      if (customerCompare !== 0) return customerCompare;
      return a.project.projectName.localeCompare(b.project.projectName);
    });
  };

  // Get members with allocations for a sprint
  const getMembersForSprint = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const memberMap = new Map<string, { member: TeamMember; projects: any[]; total: number }>();

    sprintAllocs.forEach(alloc => {
      const member = teamMembers.find(m => m.id === alloc.productManagerId);
      const project = projects.find(p => p.id === alloc.projectId);
      
      if (member && project && member.isActive) {
        // Apply resource type filter
        if (selectedResourceTypes.length > 0 && member.resourceType && !selectedResourceTypes.includes(member.resourceType)) {
          return;
        }

        if (!memberMap.has(member.id)) {
          memberMap.set(member.id, { member, projects: [], total: 0 });
        }
        const memberData = memberMap.get(member.id)!;
        memberData.projects.push({
          ...project,
          allocationId: alloc.id,
          percentage: alloc.allocationPercentage,
          comment: alloc.comment
        });
        memberData.total += alloc.allocationPercentage;
      }
    });

    let result = Array.from(memberMap.values());

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(({ member }) =>
        member.fullName.toLowerCase().includes(search)
      );
    }

    // Apply capacity filter
    if (capacityFilter !== 'all') {
      result = result.filter(({ total }) => {
        if (capacityFilter === 'under') return total < underCapacityThreshold;
        if (capacityFilter === 'over') return total > overCapacityThreshold;
        if (capacityFilter === 'good') return total >= underCapacityThreshold && total <= overCapacityThreshold;
        return true;
      });
    }

    // Sort members by name
    return result.sort((a, b) => 
      a.member.fullName.localeCompare(b.member.fullName)
    );
  };

  const addSprint = () => {
    if (sprintCount < 12) setSprintCount(sprintCount + 1);
  };

  const removeSprint = () => {
    if (sprintCount > 3) setSprintCount(sprintCount - 1);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const handleAddMemberToProject = (project: Project, sprint: SprintInfo) => {
    setSelectedProject(project);
    setSelectedSprint(sprint);
    setShowAddMemberModal(true);
  };

  const handleAddProjectToSprint = (sprint: SprintInfo) => {
    setSelectedSprint(sprint);
    setShowAddProjectModal(true);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowAddProjectModal(false);
    setShowAddMemberModal(true);
  };

  // Get projects not in current sprint
  const getAvailableProjects = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const projectIdsInSprint = new Set(sprintAllocs.map(a => a.projectId));
    
    return projects
      .filter(p => p.status === 'Active' && !p.isArchived && !projectIdsInSprint.has(p.id))
      .sort((a, b) => {
        const customerCompare = a.customerName.localeCompare(b.customerName);
        if (customerCompare !== 0) return customerCompare;
        return a.projectName.localeCompare(b.projectName);
      });
  };

  const handleAddMember = () => {
    if (!selectedMember || !selectedProject || !selectedSprint || !allocationPercentage) return;
    
    const percentage = parseInt(allocationPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage (0-100)');
      return;
    }

    addAllocation(
      {
        projectId: selectedProject.id,
        productManagerId: selectedMember.id,
        year: selectedSprint.year,
        month: selectedSprint.month,
        sprint: selectedSprint.sprint,
        allocationPercentage: percentage,
        allocationDays: (percentage / 100) * 10,
        isPlanned: true
      },
      currentUser.email
    );

    setShowAddMemberModal(false);
    setSelectedMember(null);
    setAllocationPercentage('');
  };

  const handleRemoveAllocation = (allocationId: string) => {
    if (confirm('Remove this allocation?')) {
      deleteAllocation(allocationId, currentUser.email);
    }
  };

  const handleCopyToNextSprint = (project: Project, currentSprint: SprintInfo) => {
    const currentIndex = sprints.findIndex(
      s => s.year === currentSprint.year && s.month === currentSprint.month && s.sprint === currentSprint.sprint
    );
    
    if (currentIndex >= sprints.length - 1) {
      alert('No next sprint available');
      return;
    }

    const nextSprint = sprints[currentIndex + 1];
    const currentAllocs = getSprintAllocations(currentSprint).filter(a => a.projectId === project.id);

    currentAllocs.forEach(alloc => {
      addAllocation(
        {
          projectId: alloc.projectId,
          productManagerId: alloc.productManagerId,
          year: nextSprint.year,
          month: nextSprint.month,
          sprint: nextSprint.sprint,
          allocationPercentage: alloc.allocationPercentage,
          allocationDays: alloc.allocationDays,
          isPlanned: true
        },
        currentUser.email
      );
    });

    alert('Project copied to next sprint!');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Capacity Planning</h1>
          
          <div className="flex gap-3 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('projects')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'projects'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects View
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team View
              </button>
            </div>

            {/* Sprint Controls */}
            <div className="flex items-center gap-2 border-l pl-3">
              <button
                onClick={removeSprint}
                disabled={sprintCount <= 3}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove sprint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm text-gray-600">{sprintCount} Sprints</span>
              <button
                onClick={addSprint}
                disabled={sprintCount >= 12}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add sprint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded hover:bg-gray-100"
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                placeholder={viewMode === 'projects' ? 'Search projects...' : 'Search members...'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value as CapacityFilter)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Capacity</option>
                <option value="under">Under Capacity</option>
                <option value="good">Good Capacity</option>
                <option value="over">Over Capacity</option>
              </select>
              <div className="relative">
                <button
                  onClick={() => {
                    const newTypes = allResourceTypes.filter(t => !selectedResourceTypes.includes(t));
                    if (newTypes.length > 0) {
                      setSelectedResourceTypes([...selectedResourceTypes, newTypes[0]]);
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-left hover:bg-gray-50"
                >
                  {selectedResourceTypes.length === 0 
                    ? 'Filter by Resource Type...' 
                    : `${selectedResourceTypes.length} type(s) selected`}
                </button>
                {selectedResourceTypes.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded shadow-lg z-10 p-2">
                    {selectedResourceTypes.map(type => (
                      <div key={type} className="flex items-center justify-between py-1">
                        <span className="text-xs">{type}</span>
                        <button
                          onClick={() => setSelectedResourceTypes(selectedResourceTypes.filter(t => t !== type))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <select
                      onChange={(e) => {
                        if (e.target.value && !selectedResourceTypes.includes(e.target.value)) {
                          setSelectedResourceTypes([...selectedResourceTypes, e.target.value]);
                        }
                        e.target.value = '';
                      }}
                      className="w-full mt-2 px-2 py-1 border rounded text-xs"
                    >
                      <option value="">Add type...</option>
                      {allResourceTypes.filter(t => !selectedResourceTypes.includes(t)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {viewMode === 'projects' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showUnallocatedOnly}
                    onChange={(e) => setShowUnallocatedOnly(e.target.checked)}
                    className="rounded"
                  />
                  Unallocated projects only
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sprint Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-4 p-4" style={{ minWidth: `${sprintCount * 400}px` }}>
          {sprints.map((sprint) => {
            const projectsData = viewMode === 'projects' ? getProjectsForSprint(sprint) : [];
            const membersData = viewMode === 'team' ? getMembersForSprint(sprint) : [];

            return (
              <div
                key={`${sprint.year}-${sprint.month}-${sprint.sprint}`}
                className="flex-shrink-0 w-96 bg-white rounded-lg border-2 border-gray-300 flex flex-col"
              >
                {/* Sprint Header */}
                <div className="px-4 py-3 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {getMonthName(sprint.month)} {sprint.year}
                      </h3>
                      <p className="text-sm text-gray-600">Sprint #{sprint.sprint}</p>
                    </div>
                    {canWrite && (
                      <button 
                        className="p-1.5 rounded hover:bg-white/50" 
                        title="Add project to sprint"
                        onClick={() => handleAddProjectToSprint(sprint)}
                      >
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sprint Content - Projects View */}
                {viewMode === 'projects' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {projectsData.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm">
                        No projects planned
                      </div>
                    ) : (
                      projectsData.map(({ project, members, total }) => (
                        <div key={project.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow">
                          {/* Project Header */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-gray-900">{project.customerName}</div>
                              <div className="text-sm text-gray-700">{project.projectName}</div>
                              <div className="text-xs text-gray-500 mt-1">Total: {total}%</div>
                            </div>
                            {canWrite && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAddMemberToProject(project, sprint)}
                                  className="p-1 rounded hover:bg-green-100 text-green-600"
                                  title="Add member"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleCopyToNextSprint(project, sprint)}
                                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                  title="Copy to next sprint"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Members List */}
                          <div className="space-y-1 mt-2 border-t pt-2">
                            {members.sort((a, b) => b.percentage - a.percentage).map((member) => (
                              <div key={member.allocationId} className="flex justify-between items-center text-xs py-1">
                                <div className="flex-1">
                                  <span className="font-medium">{member.fullName}</span>
                                  {member.resourceType && (
                                    <span className="ml-2 text-gray-500">({member.resourceType})</span>
                                  )}
                                  <span className="ml-2 text-blue-600 font-semibold">{member.percentage}%</span>
                                </div>
                                {canWrite && (
                                  <button
                                    onClick={() => handleRemoveAllocation(member.allocationId)}
                                    className="p-1 rounded hover:bg-red-100 text-red-600"
                                    title="Remove"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sprint Content - Team View */}
                {viewMode === 'team' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {membersData.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm">
                        No team members allocated
                      </div>
                    ) : (
                      membersData.map(({ member, projects: memberProjects, total }) => (
                        <div key={member.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-gray-900">{member.fullName}</div>
                              {member.resourceType && (
                                <div className="text-xs text-gray-600">{member.resourceType}</div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">Total: {total}%</div>
                            </div>
                          </div>
                          <div className="space-y-1 mt-2 border-t pt-2">
                            {memberProjects.sort((a, b) => b.percentage - a.percentage).map((proj) => (
                              <div key={proj.allocationId} className="flex justify-between items-center text-xs py-1">
                                <div className="flex-1">
                                  <span className="font-medium">{proj.customerName}</span>
                                  <span className="mx-1">-</span>
                                  <span>{proj.projectName}</span>
                                  <span className="ml-2 text-blue-600 font-semibold">{proj.percentage}%</span>
                                </div>
                                {canWrite && (
                                  <button
                                    onClick={() => handleRemoveAllocation(proj.allocationId)}
                                    className="p-1 rounded hover:bg-red-100 text-red-600"
                                    title="Remove"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setSelectedMember(null);
          setAllocationPercentage('');
        }}
        title={`Add Member to ${selectedProject?.projectName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => {
                const member = teamMembers.find(m => m.id === e.target.value);
                setSelectedMember(member || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Choose a member...</option>
              {teamMembers.filter(m => m.isActive).map(member => (
                <option key={member.id} value={member.id}>
                  {member.fullName} {member.resourceType ? `(${member.resourceType})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allocation %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={allocationPercentage}
              onChange={(e) => setAllocationPercentage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter percentage (0-100)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddMemberModal(false);
                setSelectedMember(null);
                setAllocationPercentage('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              disabled={!selectedMember || !allocationPercentage}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Member
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddProjectModal}
        onClose={() => {
          setShowAddProjectModal(false);
          setSelectedProject(null);
        }}
        title="Add Project to Sprint"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Select a project to add to {selectedSprint && `${getMonthName(selectedSprint.month)} ${selectedSprint.year} Sprint #${selectedSprint.sprint}`}
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {selectedSprint && getAvailableProjects(selectedSprint).map((project: Project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-semibold text-sm text-gray-900">{project.customerName}</div>
                <div className="text-sm text-gray-700">{project.projectName}</div>
                <div className="text-xs text-gray-500 mt-1">{project.projectType} • {project.status}</div>
              </button>
            ))}
            {selectedSprint && getAvailableProjects(selectedSprint).length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No available projects to add
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
