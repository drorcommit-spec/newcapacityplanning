import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getUserPermissions, Project, TeamMember, SprintAllocation } from '../types';
import Modal from '../components/Modal';
import ProjectForm from '../components/ProjectForm';
import { fetchAllData, saveSprintProjects, saveSprintRoleRequirements } from '../services/api';

type ViewMode = 'projects' | 'team';
type CapacityFilter = 'all' | 'under' | 'over' | 'good';

interface SprintInfo {
  year: number;
  month: number;
  sprint: number;
}

export default function CapacityPlanning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { teamMembers, projects, allocations, addAllocation, updateAllocation, deleteAllocation, updateProject } = useData();
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const permissions = getUserPermissions(currentUser.role);
  const canWrite = permissions.includes('write');

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [showFilters, setShowFilters] = useState(true);
  const [sprintCount, setSprintCount] = useState(3);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('all');
  const [missingAllocationRoles, setMissingAllocationRoles] = useState<string[]>([]);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [teamRoleFilter, setTeamRoleFilter] = useState<string[]>([]);
  const [showTeamRoleSelector, setShowTeamRoleSelector] = useState(false);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [pmoContactFilter, setPmoContactFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');

  // Capacity thresholds - editable
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

  // Modal state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showRoleRequirementsModal, setShowRoleRequirementsModal] = useState(false);
  const [roleRequirements, setRoleRequirements] = useState<Record<string, number>>({});
  const [selectedSprint, setSelectedSprint] = useState<SprintInfo | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<SprintAllocation | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    member: TeamMember;
    sprint: SprintInfo;
  } | null>(null);
  const [removeFutureSprintsOption, setRemoveFutureSprintsOption] = useState<'current' | 'future'>('current');
  
  // Track members explicitly removed from sprints
  // Key format: "memberId-year-month-sprint"
  const [removedMembers, setRemovedMembers] = useState<Set<string>>(new Set());
  
  // Track members explicitly added to sprints (even if they have no allocations)
  // Key format: "memberId-year-month-sprint"
  const [explicitlyAddedMembers, setExplicitlyAddedMembers] = useState<Set<string>>(new Set());
  
  // Track projects explicitly added to sprints (even if they have no allocations)
  const [sprintProjects, setSprintProjects] = useState<Map<string, Set<string>>>(new Map());
  const [sprintProjectsLoaded, setSprintProjectsLoaded] = useState(false);

  // Sprint role requirements - stored per project per sprint
  // Key format: "projectId-year-month-sprint"
  const [sprintRoleRequirements, setSprintRoleRequirements] = useState<Record<string, Record<string, number>>>({});
  const [sprintRoleRequirementsLoaded, setSprintRoleRequirementsLoaded] = useState(false);

  // Load sprint projects and role requirements from server on mount
  useEffect(() => {
    fetchAllData()
      .then(data => {
        // Load sprint projects
        if (data.sprintProjects) {
          const map = new Map<string, Set<string>>();
          Object.entries(data.sprintProjects).forEach(([key, value]) => {
            map.set(key, new Set(value as string[]));
          });
          setSprintProjects(map);
        }
        setSprintProjectsLoaded(true);

        // Load sprint role requirements
        if (data.sprintRoleRequirements) {
          setSprintRoleRequirements(data.sprintRoleRequirements);
        }
        setSprintRoleRequirementsLoaded(true);
      })
      .catch(error => {
        console.error('Failed to load sprint data:', error);
        setSprintProjectsLoaded(true);
        setSprintRoleRequirementsLoaded(true);
      });
  }, []);

  // Save sprint projects to server whenever they change
  useEffect(() => {
    if (!sprintProjectsLoaded) return;
    
    const obj: Record<string, string[]> = {};
    sprintProjects.forEach((value, key) => {
      obj[key] = Array.from(value);
    });
    
    saveSprintProjects(obj).catch(error => {
      console.error('Failed to save sprint projects:', error);
    });
  }, [sprintProjects, sprintProjectsLoaded]);

  // Save sprint role requirements to server whenever they change
  useEffect(() => {
    if (!sprintRoleRequirementsLoaded) return;
    
    saveSprintRoleRequirements(sprintRoleRequirements).catch(error => {
      console.error('Failed to save sprint role requirements:', error);
    });
  }, [sprintRoleRequirements, sprintRoleRequirementsLoaded]);

  // Project-sprint comments - stored per project per sprint
  // Key format: "projectId-year-month-sprint"
  const [projectSprintComments, setProjectSprintComments] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('projectSprintComments');
    return saved ? JSON.parse(saved) : {};
  });

  // Save project-sprint comments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('projectSprintComments', JSON.stringify(projectSprintComments));
  }, [projectSprintComments]);
  
  // Inline editing state
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [editingPercentage, setEditingPercentage] = useState('');
  
  // Ref for role selector dropdown
  const roleSelectorRef = useRef<HTMLDivElement>(null);
  const teamRoleSelectorRef = useRef<HTMLDivElement>(null);

  // Close role selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleSelectorRef.current && !roleSelectorRef.current.contains(event.target as Node)) {
        setShowRoleSelector(false);
      }
    }

    if (showRoleSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showRoleSelector]);

  // Close team role selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (teamRoleSelectorRef.current && !teamRoleSelectorRef.current.contains(event.target as Node)) {
        setShowTeamRoleSelector(false);
      }
    }

    if (showTeamRoleSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTeamRoleSelector]);

  // Handle URL parameters for KPI filtering
  useEffect(() => {
    const view = searchParams.get('view');
    const filter = searchParams.get('filter');
    const sprint = searchParams.get('sprint');
    const kpi = searchParams.get('kpi');

    if (view) {
      setViewMode(view as ViewMode);
    }

    if (filter) {
      setCapacityFilter(filter as CapacityFilter);
    }

    if (kpi) {
      setKpiFilter(kpi);
      // Apply specific KPI filters
      switch (kpi) {
        case 'missing-resources':
          setViewMode('projects');
          setMissingAllocationRoles(['ANY']);
          break;
        case 'new-reactivated':
          setViewMode('projects');
          setKpiFilter('new-reactivated');
          break;
        case 'no-pmo':
          setViewMode('projects');
          setKpiFilter('no-pmo');
          break;
        case 'pending':
          setViewMode('projects');
          setKpiFilter('pending');
          break;
        case 'over-capacity':
          setViewMode('team');
          setCapacityFilter('over');
          break;
        case 'under-capacity':
          setViewMode('team');
          setCapacityFilter('under');
          break;
        case 'unallocated':
          setViewMode('team');
          setKpiFilter('unallocated');
          break;
        case 'single-project':
          setViewMode('team');
          setKpiFilter('single-project');
          break;
        case 'multi-project':
          setViewMode('team');
          setKpiFilter('multi-project');
          break;
      }
    }

    if (sprint) {
      const sprintIndex = parseInt(sprint);
      if (!isNaN(sprintIndex) && sprintIndex >= 0) {
        setSprintCount(Math.max(3, sprintIndex + 1));
      }
    }
  }, [searchParams]);
  
  // Comment state
  const [showProjectCommentModal, setShowProjectCommentModal] = useState(false);
  const [projectComment, setProjectComment] = useState('');
  const [commentText, setCommentText] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState('');
  
  // Highlighted project for animation
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

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

  // Check if a project has missing role allocations for a specific sprint
  const hasMissingRoleAllocations = (project: Project, members: any[], sprint: SprintInfo) => {
    const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
    const requirements = sprintRoleRequirements[requirementKey];
    
    if (!requirements || Object.keys(requirements).length === 0) {
      // No requirements set - consider it missing if no members at all
      return members.length === 0;
    }

    // Calculate allocated percentages per role
    const allocatedRoles: Record<string, number> = {};
    members.forEach(member => {
      // Find the actual team member to get their role
      const teamMember = teamMembers.find(tm => tm.id === member.id);
      if (teamMember && teamMember.role) {
        allocatedRoles[teamMember.role] = (allocatedRoles[teamMember.role] || 0) + (member.percentage || 0);
      }
    });

    // Check if any required role is missing or under-allocated
    for (const [role, requiredPercentage] of Object.entries(requirements)) {
      const allocated = allocatedRoles[role] || 0;
      if (allocated < requiredPercentage) {
        return true; // Missing or under-allocated
      }
    }

    return false;
  };

  // Get all members who are managers (have at least one team member reporting to them)
  const getManagerMembers = useMemo(() => {
    const managerIds = new Set<string>();
    teamMembers.forEach(member => {
      if (member.isActive && member.managerId) {
        managerIds.add(member.managerId);
      }
    });
    return teamMembers
      .filter(m => m.isActive && managerIds.has(m.id))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [teamMembers]);

  // Get all descendants (direct and indirect reports) of a manager
  const getManagerDescendants = useMemo(() => {
    return (managerId: string): Set<string> => {
      const descendants = new Set<string>();
      
      // Helper function to recursively find all reports
      const findReports = (currentManagerId: string) => {
        teamMembers.forEach(member => {
          if (member.isActive && member.managerId === currentManagerId && !descendants.has(member.id)) {
            descendants.add(member.id);
            // Recursively find this member's reports
            findReports(member.id);
          }
        });
      };
      
      findReports(managerId);
      return descendants;
    };
  }, [teamMembers]);

  // Get projects with allocations for a sprint
  const getProjectsForSprint = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const projectMap = new Map<string, { project: Project; members: any[]; total: number }>();
    const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;

    // First, add all projects with allocations
    sprintAllocs.forEach(alloc => {
      const project = projects.find(p => p.id === alloc.projectId);
      const member = teamMembers.find(m => m.id === alloc.productManagerId);
      
      if (project && member && (project.status === 'Active' || project.status === 'Pending')) {
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

    // Then, add explicitly tracked projects that might have no allocations
    const trackedProjectIds = sprintProjects.get(sprintKey);
    if (trackedProjectIds) {
      trackedProjectIds.forEach(projectId => {
        if (!projectMap.has(projectId)) {
          const project = projects.find(p => p.id === projectId);
          if (project && (project.status === 'Active' || project.status === 'Pending')) {
            projectMap.set(project.id, { project, members: [], total: 0 });
          }
        }
      });
    }

    let result = Array.from(projectMap.values());

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(({ project }) =>
        project.customerName.toLowerCase().includes(search) ||
        project.projectName.toLowerCase().includes(search)
      );
    }

    // Apply PMO Contact filter
    if (pmoContactFilter !== 'all') {
      result = result.filter(({ project }) => {
        return project.pmoContact === pmoContactFilter;
      });
    }

    // Apply Manager filter (hierarchical - includes all descendants)
    if (managerFilter !== 'all') {
      const descendants = getManagerDescendants(managerFilter);
      result = result.filter(({ members }) => {
        // Include projects with no allocations (empty members array)
        if (members.length === 0) return true;
        
        // Include projects where ALL members are either descendants of the selected manager
        // OR have no manager assigned
        return members.every(member => {
          const teamMember = teamMembers.find(tm => tm.id === member.id);
          // Include if member is a descendant OR if member has no manager
          return descendants.has(member.id) || !teamMember?.managerId;
        });
      });
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

    // Apply missing allocations filter by role
    if (missingAllocationRoles.length > 0) {
      result = result.filter(({ project, members }) => {
        const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
        const requirements = sprintRoleRequirements[requirementKey];
        
        // If "Any Resource" is selected, show projects with any missing allocations
        if (missingAllocationRoles.includes('ANY')) {
          if (!requirements || Object.keys(requirements).length === 0) {
            return members.length === 0; // No requirements, show if no members
          }
          return hasMissingRoleAllocations(project, members, sprint);
        }
        
        // Check if project has missing allocations for selected roles
        if (!requirements) return false;
        
        // Calculate allocated percentages per role
        const allocatedRoles: Record<string, number> = {};
        members.forEach(member => {
          const teamMember = teamMembers.find(tm => tm.id === member.id);
          if (teamMember && teamMember.role) {
            allocatedRoles[teamMember.role] = (allocatedRoles[teamMember.role] || 0) + (member.percentage || 0);
          }
        });
        
        // Check if any of the selected roles are missing or under-allocated
        return missingAllocationRoles.some(role => {
          const required = requirements[role];
          if (!required) return false;
          const allocated = allocatedRoles[role] || 0;
          return allocated < required;
        });
      });
    }

    // Apply KPI-specific filters
    if (kpiFilter === 'new-reactivated') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      result = result.filter(({ project }) => {
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
      });
    }

    if (kpiFilter === 'no-pmo') {
      result = result.filter(({ project, members }) => {
        // Check if project has no PMO contact field
        if (!project.pmoContact || project.pmoContact.trim() === '') return true;
        
        // Check if project has 0% PMO resource type allocation
        const pmoAllocation = members.reduce((sum, member) => {
          if (member.role && member.role.toLowerCase().includes('pmo')) {
            return sum + (member.percentage || 0);
          }
          return sum;
        }, 0);
        
        return pmoAllocation === 0;
      });
    }

    if (kpiFilter === 'pending') {
      result = result.filter(({ project }) => {
        return project.status === 'Pending';
      });
    }

    // Sort projects by customer name, then project name
    return result.sort((a, b) => {
      const customerCompare = a.project.customerName.localeCompare(b.project.customerName);
      if (customerCompare !== 0) return customerCompare;
      return a.project.projectName.localeCompare(b.project.projectName);
    });
  };

  // Get members with allocations for a sprint (includes all active members)
  const getMembersForSprint = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const memberMap = new Map<string, { member: TeamMember; projects: any[]; total: number }>();

    // Add members who have allocations in this sprint
    sprintAllocs.forEach(alloc => {
      const member = teamMembers.find(m => m.id === alloc.productManagerId);
      const project = projects.find(p => p.id === alloc.projectId);
      
      if (member && project && member.isActive) {
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

    // Members only show if they have allocations
    let result = Array.from(memberMap.values());

    // Filter out members explicitly removed from this sprint
    result = result.filter(({ member }) => {
      const removedKey = `${member.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
      return !removedMembers.has(removedKey);
    });

    // Apply search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(({ member }) =>
        member.fullName.toLowerCase().includes(search)
      );
    }

    // Apply capacity filter (based on member's individual capacity)
    if (capacityFilter !== 'all') {
      result = result.filter(({ member, total }) => {
        const memberCapacity = member.capacity ?? 100;
        const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
        const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
        
        if (capacityFilter === 'under') return total < underThreshold;
        if (capacityFilter === 'over') return total > overThreshold;
        if (capacityFilter === 'good') return total >= underThreshold && total <= overThreshold;
        return true;
      });
    }

    // Apply team role filter
    if (teamRoleFilter.length > 0) {
      result = result.filter(({ member }) => 
        member.role && teamRoleFilter.includes(member.role)
      );
    }

    // Apply Manager filter (hierarchical - includes all descendants)
    if (managerFilter !== 'all') {
      const descendants = getManagerDescendants(managerFilter);
      result = result.filter(({ member }) => {
        // Include members who are descendants of the selected manager
        // OR members who have no manager assigned
        return descendants.has(member.id) || !member.managerId;
      });
    }

    // Apply KPI-specific filters for members
    if (kpiFilter === 'unallocated') {
      result = result.filter(({ total }) => total === 0);
    }

    if (kpiFilter === 'single-project') {
      result = result.filter(({ projects }) => projects.length === 1);
    }

    if (kpiFilter === 'multi-project') {
      result = result.filter(({ projects }) => projects.length >= 3);
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

  const getSprintDatePeriod = (sprint: SprintInfo) => {
    const startDay = sprint.sprint === 1 ? 1 : 16;
    const endDay = sprint.sprint === 1 ? 15 : new Date(sprint.year, sprint.month, 0).getDate();
    return `${startDay}-${endDay}`;
  };

  const handleAddMemberToProject = (project: Project, sprint: SprintInfo, filterRole?: string) => {
    setSelectedProject(project);
    setSelectedSprint(sprint);
    setSelectedRoleFilter(filterRole || null);
    setShowAddMemberModal(true);
  };

  const handleAddProjectToSprint = (sprint: SprintInfo) => {
    setSelectedSprint(sprint);
    setShowAddProjectModal(true);
  };

  const handleAddMemberToSprint = (sprint: SprintInfo) => {
    setSelectedSprint(sprint);
    setSelectedMember(null);
    setSelectedProject(null);
    setAllocationPercentage('');
    setShowAddMemberModal(true);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowAddProjectModal(false);
    setShowAddMemberModal(true);
    
    // Track this project as being in the sprint
    if (selectedSprint) {
      const sprintKey = `${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
      const updatedSprintProjects = new Map(sprintProjects);
      if (!updatedSprintProjects.has(sprintKey)) {
        updatedSprintProjects.set(sprintKey, new Set());
      }
      updatedSprintProjects.get(sprintKey)!.add(project.id);
      setSprintProjects(updatedSprintProjects);
    }
  };

  // Get projects not in current sprint
  const getAvailableProjects = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const projectIdsInSprint = new Set(sprintAllocs.map(a => a.projectId));
    
    // Also check tracked projects in sprintProjects Map
    const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
    const trackedProjectIds = sprintProjects.get(sprintKey);
    if (trackedProjectIds) {
      trackedProjectIds.forEach(id => projectIdsInSprint.add(id));
    }
    
    return projects
      .filter(p => (p.status === 'Active' || p.status === 'Pending') && !p.isArchived && !projectIdsInSprint.has(p.id))
      .sort((a, b) => {
        const customerCompare = a.customerName.localeCompare(b.customerName);
        if (customerCompare !== 0) return customerCompare;
        return a.projectName.localeCompare(b.projectName);
      });
  };

  // Get projects not assigned to a specific member in a sprint
  const getAvailableProjectsForMember = (sprint: SprintInfo, memberId: string) => {
    const sprintAllocs = getSprintAllocations(sprint);
    // Get project IDs that this member is already assigned to in this sprint
    const memberProjectIds = new Set(
      sprintAllocs
        .filter(a => a.productManagerId === memberId)
        .map(a => a.projectId)
    );
    
    return projects
      .filter(p => (p.status === 'Active' || p.status === 'Pending') && !p.isArchived && !memberProjectIds.has(p.id))
      .sort((a, b) => {
        const customerCompare = a.customerName.localeCompare(b.customerName);
        if (customerCompare !== 0) return customerCompare;
        return a.projectName.localeCompare(b.projectName);
      });
  };

  const handleAddMember = () => {
    alert('🚨 handleAddMember STARTED!');
    if (!selectedMember || !selectedSprint) {
      alert('🚨 EARLY RETURN: No member or sprint selected');
      return;
    }
    
    // If no project selected, member must select a project first
    if (!selectedProject) {
      alert('Please select a project for this member. Adding a member without a project is not supported.');
      return;
    }
    
    // If project is selected, allocation percentage is required
    if (!allocationPercentage) {
      alert('Please enter an allocation percentage when a project is selected');
      return;
    }
    
    const percentage = parseInt(allocationPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage (0-100)');
      return;
    }

    // Check if this member is already allocated to this project in this sprint
    const existingAllocation = allocations.find(
      a => a.projectId === selectedProject.id &&
           a.productManagerId === selectedMember.id &&
           a.year === selectedSprint.year &&
           a.month === selectedSprint.month &&
           a.sprint === selectedSprint.sprint
    );

    if (existingAllocation) {
      alert(`${selectedMember.fullName} is already allocated to this project in this sprint. Please edit the existing allocation instead.`);
      return;
    }

    alert('🔥 ABOUT TO CALL addAllocation!');
    console.log('🔥 Calling addAllocation with:', {
      projectId: selectedProject.id,
      productManagerId: selectedMember.id,
      year: selectedSprint.year,
      month: selectedSprint.month,
      sprint: selectedSprint.sprint,
      allocationPercentage: percentage,
    });
    
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
    
    alert('🔥 addAllocation CALLED!');

    setShowAddMemberModal(false);
    setSelectedMember(null);
    setAllocationPercentage('');
  };

  const handleRemoveAllocation = (allocationId: string) => {
    if (confirm('Remove this allocation?')) {
      // Find the allocation to get project and sprint info
      const allocation = allocations.find(a => a.id === allocationId);
      
      if (allocation) {
        // Track the project in the sprint so it remains visible even with no allocations
        const sprintKey = `${allocation.year}-${allocation.month}-${allocation.sprint}`;
        const updatedSprintProjects = new Map(sprintProjects);
        if (!updatedSprintProjects.has(sprintKey)) {
          updatedSprintProjects.set(sprintKey, new Set());
        }
        updatedSprintProjects.get(sprintKey)!.add(allocation.projectId);
        setSprintProjects(updatedSprintProjects);
      }
      
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

    // Copy allocations
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

    // Copy role requirements (resource capacity planning)
    const currentRequirementKey = `${project.id}-${currentSprint.year}-${currentSprint.month}-${currentSprint.sprint}`;
    const currentRequirements = sprintRoleRequirements[currentRequirementKey];
    
    if (currentRequirements && Object.keys(currentRequirements).length > 0) {
      const nextRequirementKey = `${project.id}-${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
      setSprintRoleRequirements(prev => ({
        ...prev,
        [nextRequirementKey]: { ...currentRequirements }
      }));
    }

    // Track project in next sprint
    const nextSprintKey = `${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
    setSprintProjects(prev => {
      const updated = new Map(prev);
      if (!updated.has(nextSprintKey)) {
        updated.set(nextSprintKey, new Set());
      }
      updated.get(nextSprintKey)!.add(project.id);
      return updated;
    });

    alert('Project copied to next sprint (including allocations and capacity planning)!');
  };

  const handleCopyMemberToNextSprint = (member: TeamMember, currentSprint: SprintInfo) => {
    const currentIndex = sprints.findIndex(
      s => s.year === currentSprint.year && s.month === currentSprint.month && s.sprint === currentSprint.sprint
    );
    
    if (currentIndex >= sprints.length - 1) {
      alert('No next sprint available');
      return;
    }

    const nextSprint = sprints[currentIndex + 1];
    const currentAllocs = getSprintAllocations(currentSprint).filter(a => a.productManagerId === member.id);

    if (currentAllocs.length === 0) {
      alert('No allocations to copy for this member');
      return;
    }

    // Copy all member allocations to next sprint
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

    // Mark member as explicitly added to next sprint
    const memberKey = `${member.id}-${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
    const newExplicitlyAddedMembers = new Set(explicitlyAddedMembers);
    newExplicitlyAddedMembers.add(memberKey);
    setExplicitlyAddedMembers(newExplicitlyAddedMembers);

    alert(`${member.fullName}'s allocations copied to next sprint!`);
  };

  // Remove member from sprint handlers
  const handleOpenRemoveMemberModal = (member: TeamMember, sprint: SprintInfo) => {
    setMemberToRemove({ member, sprint });
    setRemoveFutureSprintsOption('current');
    setShowRemoveMemberModal(true);
  };

  const handleRemoveMemberFromSprint = async () => {
    if (!memberToRemove) return;
    
    const { member, sprint } = memberToRemove;
    
    // Get sprints to remove from
    const sprintsToRemove = removeFutureSprintsOption === 'future'
      ? sprints.filter(s => {
          const sprintDate = new Date(s.year, s.month - 1, s.sprint === 1 ? 1 : 16);
          const currentSprintDate = new Date(sprint.year, sprint.month - 1, sprint.sprint === 1 ? 1 : 16);
          return sprintDate >= currentSprintDate;
        })
      : [sprint];
    
    let totalRemoved = 0;
    
    // Remove allocations from selected sprints
    for (const s of sprintsToRemove) {
      const allocsToRemove = allocations.filter(
        a => a.productManagerId === member.id &&
             a.year === s.year &&
             a.month === s.month &&
             a.sprint === s.sprint
      );
      
      for (const alloc of allocsToRemove) {
        await deleteAllocation(alloc.id, currentUser.fullName);
        totalRemoved++;
      }
    }
    
    // Mark member as removed from these sprints
    const newRemovedMembers = new Set(removedMembers);
    sprintsToRemove.forEach(s => {
      const removedKey = `${member.id}-${s.year}-${s.month}-${s.sprint}`;
      newRemovedMembers.add(removedKey);
    });
    setRemovedMembers(newRemovedMembers);
    
    // Close modal
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
    
    // Show confirmation
    const sprintText = removeFutureSprintsOption === 'future' 
      ? `${sprintsToRemove.length} sprint(s)` 
      : 'this sprint';
    alert(`Removed ${member.fullName} from ${sprintText}`);
  };

  // Inline editing handlers
  const startEditingAllocation = (allocationId: string, currentPercentage: number) => {
    setEditingAllocationId(allocationId);
    setEditingPercentage(currentPercentage.toString());
  };

  const saveAllocationEdit = (allocationId: string) => {
    const percentage = parseInt(editingPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage (0-100)');
      return;
    }

    updateAllocation(
      allocationId,
      {
        allocationPercentage: percentage,
        allocationDays: (percentage / 100) * 10
      },
      currentUser.email
    );

    setEditingAllocationId(null);
    setEditingPercentage('');
  };

  const cancelEdit = () => {
    setEditingAllocationId(null);
    setEditingPercentage('');
  };

  // Comment handlers
  const openCommentModal = (allocation: SprintAllocation) => {
    setSelectedAllocation(allocation);
    setCommentText(allocation.comment || '');
    setShowCommentModal(true);
  };

  // Project edit handler
  const openEditProjectModal = (project: Project) => {
    setSelectedProject(project);
    setShowEditProjectModal(true);
  };

  // Remove project from sprint (removes all allocations for that project in that sprint)
  const handleRemoveProjectFromSprint = (project: Project, sprint: SprintInfo) => {
    const allocsToRemove = allocations.filter(
      a => a.projectId === project.id && 
           a.year === sprint.year && 
           a.month === sprint.month && 
           a.sprint === sprint.sprint
    );

    const message = allocsToRemove.length > 0
      ? `Remove "${project.projectName}" and all its ${allocsToRemove.length} allocation(s) from this sprint?`
      : `Remove "${project.projectName}" from this sprint?`;

    if (confirm(message)) {
      // Remove all allocations
      allocsToRemove.forEach(alloc => {
        deleteAllocation(alloc.id, currentUser.email);
      });
      
      // Remove from tracked projects
      const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
      const updatedSprintProjects = new Map(sprintProjects);
      if (updatedSprintProjects.has(sprintKey)) {
        updatedSprintProjects.get(sprintKey)!.delete(project.id);
        setSprintProjects(updatedSprintProjects);
      }
    }
  };

  // Handle new project creation success
  const handleProjectCreated = (projectId: string) => {
    setShowCreateProjectModal(false);
    setShowAddProjectModal(false);
    
    if (!selectedSprint) return;

    // Track this project as being in the sprint immediately
    const sprintKey = `${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
    const updatedSprintProjects = new Map(sprintProjects);
    if (!updatedSprintProjects.has(sprintKey)) {
      updatedSprintProjects.set(sprintKey, new Set());
    }
    updatedSprintProjects.get(sprintKey)!.add(projectId);
    setSprintProjects(updatedSprintProjects);

    // Set pending project ID to trigger useEffect when project appears
    setPendingProjectId(projectId);
  };

  // Watch for when the pending project appears in the projects array
  useEffect(() => {
    if (!pendingProjectId || !selectedSprint) return;

    const newProject = projects.find(p => p.id === pendingProjectId);
    if (!newProject) return; // Project not yet in array, wait for next render

    // Force a re-render by updating sprintProjects again
    const sprintKey = `${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
    setSprintProjects(prev => {
      const updated = new Map(prev);
      if (!updated.has(sprintKey)) {
        updated.set(sprintKey, new Set());
      }
      updated.get(sprintKey)!.add(pendingProjectId);
      return updated;
    });

    // Small delay to ensure DOM has updated with the new project
    const timeoutId = setTimeout(() => {
      const projectElement = projectRefs.current[pendingProjectId];
      
      if (projectElement) {
        // Scroll to the project
        projectElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the project
        setHighlightedProjectId(pendingProjectId);
        setTimeout(() => setHighlightedProjectId(null), 3000);
        
        // Set selected project and open modal
        setSelectedProject(newProject);
        setTimeout(() => {
          setShowAddMemberModal(true);
        }, 500);
        
        // Clear pending project
        setPendingProjectId(null);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [projects, pendingProjectId, selectedSprint]);

  // Project comment handlers
  const openProjectCommentModal = (project: Project, sprint: SprintInfo) => {
    setSelectedProject(project);
    setSelectedSprint(sprint);
    const commentKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
    setProjectComment(projectSprintComments[commentKey] || '');
    setShowProjectCommentModal(true);
  };

  const saveProjectComment = () => {
    if (!selectedProject || !selectedSprint) return;

    const commentKey = `${selectedProject.id}-${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
    const updated = { ...projectSprintComments };
    
    if (projectComment.trim()) {
      updated[commentKey] = projectComment.trim();
    } else {
      delete updated[commentKey];
    }
    
    setProjectSprintComments(updated);
    setShowProjectCommentModal(false);
    setSelectedProject(null);
    setSelectedSprint(null);
    setProjectComment('');
  };

  const saveComment = () => {
    if (!selectedAllocation) return;

    updateAllocation(
      selectedAllocation.id,
      { comment: commentText || undefined },
      currentUser.email
    );

    setShowCommentModal(false);
    setSelectedAllocation(null);
    setCommentText('');
  };

  // Save role requirements for a project in a specific sprint
  const saveRoleRequirements = () => {
    if (!selectedProject || !selectedSprint) return;

    const requirementKey = `${selectedProject.id}-${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
    
    // Update sprint role requirements
    const updated = { ...sprintRoleRequirements };
    if (Object.keys(roleRequirements).length === 0) {
      // Remove if empty
      delete updated[requirementKey];
    } else {
      updated[requirementKey] = roleRequirements;
    }
    setSprintRoleRequirements(updated);

    setShowRoleRequirementsModal(false);
    setSelectedProject(null);
    setSelectedSprint(null);
    setRoleRequirements({});
  };

  // Get capacity color (based on member's individual capacity)
  const getCapacityColor = (total: number, memberCapacity: number = 100) => {
    const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
    const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
    
    if (total < underThreshold) return 'text-yellow-600 bg-yellow-50';
    if (total > overThreshold) return 'text-red-600 bg-red-50';
    return 'text-green-600 bg-green-50';
  };

  const getCapacityBadge = (total: number, memberCapacity: number = 100) => {
    const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
    const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
    
    if (total < underThreshold) return '⚠️';
    if (total > overThreshold) return '❗';
    return '✓';
  };

  // Calculate sprint KPIs (simplified for capacity planning)
  const calculateSprintKPIs = (sprint: SprintInfo) => {
    const projectsData = getProjectsForSprint(sprint);
    const membersData = getMembersForSprint(sprint);
    
    // Projects with missing or under capacity allocations
    const projectsMissingCapacity = projectsData.filter(({ project, members }) => {
      const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
      const requirements = sprintRoleRequirements[requirementKey];
      
      // No requirements set - consider as missing if no members
      if (!requirements || Object.keys(requirements).length === 0) {
        return members.length === 0;
      }
      
      // Has requirements - check if under-allocated
      return hasMissingRoleAllocations(project, members, sprint);
    }).length;
    
    // Projects that are new or haven't had allocations in 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const newOrStaleProjects = projectsData.filter(({ project, members }) => {
      // Check if this is the first sprint with allocations
      const hasCurrentAllocations = members.length > 0;
      
      // Check all previous sprints for this project
      const previousAllocations = allocations.filter(a => {
        if (a.projectId !== project.id) return false;
        const allocDate = new Date(a.year, a.month - 1);
        const currentDate = new Date(sprint.year, sprint.month - 1);
        return allocDate < currentDate;
      });
      
      if (previousAllocations.length === 0 && hasCurrentAllocations) {
        return true; // First sprint
      }
      
      // Check if last allocation was more than 6 months ago
      if (previousAllocations.length > 0) {
        const lastAllocation = previousAllocations.sort((a, b) => {
          const dateA = new Date(a.year, a.month - 1);
          const dateB = new Date(b.year, b.month - 1);
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        const lastAllocDate = new Date(lastAllocation.year, lastAllocation.month - 1);
        if (lastAllocDate < sixMonthsAgo && hasCurrentAllocations) {
          return true; // Stale project
        }
      }
      
      return false;
    }).length;
    
    // Members under capacity
    const membersUnderCapacity = membersData.filter(({ member, total }) => {
      const memberCapacity = member.capacity ?? 100;
      const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
      return total < underThreshold;
    }).length;
    
    // Members over capacity
    const membersOverCapacity = membersData.filter(({ member, total }) => {
      const memberCapacity = member.capacity ?? 100;
      const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
      return total > overThreshold;
    }).length;
    
    // Additional KPIs
    
    // Projects at risk (>90% of max capacity)
    const projectsAtRisk = projectsData.filter(({ project, total }) => {
      const maxCapacity = project.maxCapacityPercentage || 100;
      return total > (maxCapacity * 0.9);
    }).length;
    
    // Projects with no PMO contact
    const projectsNoPMO = projectsData.filter(({ project }) => 
      !project.pmoContact || project.pmoContact.trim() === ''
    ).length;
    
    // Unallocated members (0% allocation)
    const unallocatedMembers = membersData.filter(({ total }) => total === 0).length;
    
    // Members at good capacity (70-100% of their capacity)
    const membersGoodCapacity = membersData.filter(({ member, total }) => {
      const memberCapacity = member.capacity ?? 100;
      const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
      const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
      return total >= underThreshold && total <= overThreshold;
    }).length;
    
    // Members with single project
    const membersSingleProject = membersData.filter(({ projects: memberProjects }) => 
      memberProjects.length === 1
    ).length;
    
    // Members across multiple projects (3+)
    const membersMultipleProjects = membersData.filter(({ projects: memberProjects }) => 
      memberProjects.length >= 3
    ).length;
    
    // Total sprint capacity
    const totalSprintCapacity = membersData.reduce((sum, { total }) => sum + total, 0);
    
    // Average member utilization
    const avgMemberUtilization = membersData.length > 0 
      ? Math.round(totalSprintCapacity / membersData.length) 
      : 0;
    
    // Role distribution
    const roleDistribution: Record<string, number> = {};
    membersData.forEach(({ member }) => {
      if (member.role) {
        roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
      }
    });
    
    return {
      // Original KPIs
      projectsMissingCapacity,
      newOrStaleProjects,
      membersUnderCapacity,
      membersOverCapacity,
      totalProjects: projectsData.length,
      totalMembers: membersData.length,
      // Additional KPIs
      projectsAtRisk,
      projectsNoPMO,
      unallocatedMembers,
      membersGoodCapacity,
      membersSingleProject,
      membersMultipleProjects,
      totalSprintCapacity,
      avgMemberUtilization,
      roleDistribution,
    };
  };

  // Handle KPI click - switch view and apply filter
  const handleKPIClick = (type: 'projectsMissing' | 'projectsNew' | 'membersUnder' | 'membersOver') => {
    if (type === 'projectsMissing') {
      setViewMode('projects');
      setMissingAllocationRoles(['ANY']);
      setShowRoleSelector(false);
    } else if (type === 'projectsNew') {
      setViewMode('projects');
      // For new/stale projects, we'll just switch to projects view
      // User can identify them by the visual indicators
    } else if (type === 'membersUnder') {
      setViewMode('team');
      setCapacityFilter('under');
    } else if (type === 'membersOver') {
      setViewMode('team');
      setCapacityFilter('over');
    }
  };

  // Get unallocated role requirements (roles that need members)
  const getUnallocatedRoleRequirements = (project: Project, members: any[], sprint: SprintInfo) => {
    const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
    const requirements = sprintRoleRequirements[requirementKey];
    
    if (!requirements || Object.keys(requirements).length === 0) {
      return [];
    }

    // Calculate allocated percentages per role
    const allocatedRoles: Record<string, number> = {};
    members.forEach(member => {
      const teamMember = teamMembers.find(tm => tm.id === member.id);
      if (teamMember && teamMember.role) {
        allocatedRoles[teamMember.role] = (allocatedRoles[teamMember.role] || 0) + (member.percentage || 0);
      }
    });

    // Find roles that are not fully allocated
    const unallocated: Array<{ role: string; required: number; allocated: number }> = [];
    for (const [role, requiredPercentage] of Object.entries(requirements)) {
      const allocated = allocatedRoles[role] || 0;
      if (allocated < requiredPercentage) {
        unallocated.push({ role, required: requiredPercentage, allocated });
      }
    }

    return unallocated;
  };

  // Get project allocation status background color
  const getProjectAllocationBackground = (project: Project, members: any[], sprint: SprintInfo) => {
    const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
    const requirements = sprintRoleRequirements[requirementKey];
    
    // If no requirements set, simple red/green based on member count
    if (!requirements || Object.keys(requirements).length === 0) {
      return members.length === 0 ? 'bg-red-200' : 'bg-green-50';
    }

    // Calculate allocated percentages per role
    const allocatedRoles: Record<string, number> = {};
    members.forEach(member => {
      const teamMember = teamMembers.find(tm => tm.id === member.id);
      if (teamMember && teamMember.role) {
        allocatedRoles[teamMember.role] = (allocatedRoles[teamMember.role] || 0) + (member.percentage || 0);
      }
    });

    // Check allocation status against requirements
    let hasAnyAllocation = false;
    let allRequirementsMet = true;
    
    for (const [role, requiredPercentage] of Object.entries(requirements)) {
      const allocated = allocatedRoles[role] || 0;
      if (allocated > 0) {
        hasAnyAllocation = true;
      }
      if (allocated < requiredPercentage) {
        allRequirementsMet = false;
      }
    }

    if (!hasAnyAllocation) {
      return 'bg-red-200'; // No allocations at all
    }
    if (!allRequirementsMet) {
      return 'bg-orange-50'; // Partially allocated
    }
    return 'bg-green-50'; // Fully allocated
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">Capacity Planning</h1>
            
            {/* Capacity Thresholds Legend - Editable */}
            <div className="flex items-center gap-3 text-xs border-l pl-4">
              <span className="text-xs font-semibold text-gray-700">Capacity Thresholds:</span>
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
                    className="w-10 px-1 border border-blue-300 rounded text-center"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingThreshold('under');
                      setThresholdInputValue(underCapacityThreshold.toString());
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
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
                    className="w-10 px-1 border border-blue-300 rounded text-center"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingThreshold('over');
                      setThresholdInputValue(overCapacityThreshold.toString());
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                    title="Click to edit"
                  >
                    {overCapacityThreshold}
                  </button>
                )}
                <span className="text-gray-600">%</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setViewMode('projects')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'projects'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team
              </button>
            </div>

            {/* Sprint Controls */}
            <div className="flex items-center gap-1 border-l pl-2">
              <button
                onClick={removeSprint}
                disabled={sprintCount <= 3}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove sprint"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xs text-gray-600">{sprintCount}</span>
              <button
                onClick={addSprint}
                disabled={sprintCount >= 12}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add sprint"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1.5 rounded hover:bg-gray-100"
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-200">
            <div className="flex items-center gap-3">
              {/* Search Filter */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Search:</label>
                <input
                  type="text"
                  placeholder={viewMode === 'projects' ? 'Project name...' : 'Member name...'}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-36 px-2 py-1 border border-gray-300 rounded text-xs"
                  title={viewMode === 'projects' ? 'Filter projects by name' : 'Filter members by name'}
                />
              </div>
              
              {viewMode === 'projects' && (
                <>
                  {/* PMO Contact Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">PMO Contact:</label>
                    <select
                      value={pmoContactFilter}
                      onChange={(e) => setPmoContactFilter(e.target.value)}
                      className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                      title="Filter projects by PMO Contact"
                    >
                      <option value="all">All Members</option>
                      {teamMembers
                        .filter(m => m.isActive)
                        .sort((a, b) => a.fullName.localeCompare(b.fullName))
                        .map(member => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Manager Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Manager:</label>
                    <select
                      value={managerFilter}
                      onChange={(e) => setManagerFilter(e.target.value)}
                      className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                      title="Filter projects by team member's manager"
                    >
                      <option value="all">All Managers</option>
                      {getManagerMembers.map(manager => (
                        <option key={manager.id} value={manager.id}>
                          {manager.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              {viewMode === 'team' ? (
                <>
                  {/* Capacity Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Capacity:</label>
                    <select
                      value={capacityFilter}
                      onChange={(e) => setCapacityFilter(e.target.value as CapacityFilter)}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                      title="Filter members by capacity utilization"
                    >
                      <option value="all">All</option>
                      <option value="under">Under ({`<${underCapacityThreshold}%`})</option>
                      <option value="good">Good ({underCapacityThreshold}-{overCapacityThreshold}%)</option>
                      <option value="over">Over ({`>${overCapacityThreshold}%`})</option>
                    </select>
                  </div>
                  
                  {/* Manager Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Manager:</label>
                    <select
                      value={managerFilter}
                      onChange={(e) => setManagerFilter(e.target.value)}
                      className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
                      title="Filter members by their manager"
                    >
                      <option value="all">All Managers</option>
                      {getManagerMembers.map(manager => (
                        <option key={manager.id} value={manager.id}>
                          {manager.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Resource Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Resource:</label>
                    <div className="relative" ref={teamRoleSelectorRef}>
                      <button
                        onClick={() => setShowTeamRoleSelector(!showTeamRoleSelector)}
                        className="w-48 px-2 py-1 border border-gray-300 rounded text-xs text-left flex items-center justify-between hover:bg-gray-50"
                        title="Filter members by resource type/role"
                    >
                      <span className={teamRoleFilter.length === 0 ? 'text-gray-500' : ''}>
                        {teamRoleFilter.length === 0 
                          ? 'All Resources' 
                          : `${teamRoleFilter.length} selected`}
                      </span>
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showTeamRoleSelector && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded shadow-lg z-10 p-3 max-h-64 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-700">Filter by resource:</div>
                          <button
                            onClick={() => setShowTeamRoleSelector(false)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Close"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-1">
                          {(() => {
                            const allRoles = Array.from(new Set(teamMembers.filter(m => m.isActive && m.role).map(m => m.role))).sort();
                            const allSelected = allRoles.length > 0 && allRoles.every(role => teamRoleFilter.includes(role!));
                            
                            return (
                              <>
                                <label className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer border-b border-gray-200 pb-2 mb-1">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTeamRoleFilter(allRoles as string[]);
                                      } else {
                                        setTeamRoleFilter([]);
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="text-sm font-medium">Select All / Deselect All</span>
                                </label>
                                {allRoles.map(role => (
                                  <label key={role} className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={teamRoleFilter.includes(role!)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTeamRoleFilter([...teamRoleFilter, role!]);
                                        } else {
                                          setTeamRoleFilter(teamRoleFilter.filter(r => r !== role));
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{role}</span>
                                  </label>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                        {teamRoleFilter.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <button
                              onClick={() => setTeamRoleFilter([])}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Clear all
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Missing Allocations Filter */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Allocations:</label>
                    <div className="relative flex-1" ref={roleSelectorRef}>
                      <select
                        value={missingAllocationRoles.length === 0 ? '' : missingAllocationRoles.includes('ANY') ? 'ANY' : 'SPECIFIC'}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            setMissingAllocationRoles([]);
                            setShowRoleSelector(false);
                          } else if (e.target.value === 'ANY') {
                            setMissingAllocationRoles(['ANY']);
                            setShowRoleSelector(false);
                          } else if (e.target.value === 'SPECIFIC') {
                            setShowRoleSelector(true);
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        title="Filter projects by missing resource allocations"
                      >
                        <option value="">All Projects</option>
                        <option value="ANY">Missing Any Resource</option>
                        <option value="SPECIFIC">Missing Specific Resources...</option>
                  </select>
                  {showRoleSelector && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded shadow-lg z-10 p-3 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-700">Select resource types:</div>
                        <button
                          onClick={() => {
                            setShowRoleSelector(false);
                            if (missingAllocationRoles.length === 0) {
                              // Reset to "All Projects" if no roles selected
                              setMissingAllocationRoles([]);
                            }
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1">
                        {Array.from(new Set(teamMembers.filter(m => m.isActive && m.role).map(m => m.role))).sort().map(role => (
                          <label key={role} className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={missingAllocationRoles.includes(role!)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMissingAllocationRoles([...missingAllocationRoles.filter(r => r !== 'ANY'), role!]);
                                } else {
                                  const updated = missingAllocationRoles.filter(r => r !== role);
                                  setMissingAllocationRoles(updated);
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{role}</span>
                          </label>
                        ))}
                      </div>
                      {missingAllocationRoles.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-xs text-gray-600 mb-2">
                            {missingAllocationRoles.length} role(s) selected
                          </div>
                          <button
                            onClick={() => {
                              setMissingAllocationRoles([]);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                      </div>
                    )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sprint Columns */}
      <div className="flex-1">
        <div className={expandedSprint ? "p-6" : "flex gap-6 p-6 max-w-[1920px] mx-auto"}>
          {sprints.map((sprint) => {
            const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
            const isExpanded = expandedSprint === sprintKey;
            const isHidden = expandedSprint && !isExpanded;
            
            if (isHidden) return null;
            
            const projectsData = viewMode === 'projects' ? getProjectsForSprint(sprint) : [];
            const membersData = viewMode === 'team' ? getMembersForSprint(sprint) : [];

            return (
              <div
                key={sprintKey}
                className={`bg-white rounded-lg border-2 border-gray-300 ${
                  isExpanded 
                    ? 'w-full' 
                    : 'flex-shrink-0 w-[450px] min-w-[400px]'
                }`}
                style={!isExpanded ? { flexBasis: `${100 / Math.min(sprintCount, 4)}%` } : undefined}
              >
                {/* Sprint Header */}
                <div className="px-4 py-3 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">
                        {getMonthName(sprint.month)} {sprint.year}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Sprint #{sprint.sprint} ({getSprintDatePeriod(sprint)})
                      </p>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        {viewMode === 'projects' 
                          ? `${projectsData.length} Project${projectsData.length !== 1 ? 's' : ''}`
                          : `${membersData.length} Member${membersData.length !== 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        className="p-1.5 rounded hover:bg-white/50" 
                        title={isExpanded ? "Restore to normal view" : "Expand sprint view"}
                        onClick={() => setExpandedSprint(isExpanded ? null : sprintKey)}
                      >
                        {isExpanded ? (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>
                      {canWrite && (
                        <button 
                          className="p-1.5 rounded hover:bg-white/50" 
                          title={viewMode === 'projects' ? "Add project to sprint" : "Add member to sprint"}
                          onClick={() => viewMode === 'projects' ? handleAddProjectToSprint(sprint) : handleAddMemberToSprint(sprint)}
                        >
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sprint Content - Projects View */}
                {viewMode === 'projects' && (
                  <div className={isExpanded ? "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "p-3 space-y-3"}>
                    {projectsData.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm col-span-full">
                        No projects planned
                      </div>
                    ) : (
                      projectsData.map(({ project, members, total }) => {
                        const bgColor = getProjectAllocationBackground(project, members, sprint);
                        return (
                        <div 
                          key={project.id} 
                          ref={(el) => { projectRefs.current[project.id] = el; }}
                          className={`border rounded-lg p-3 hover:shadow-md transition-all ${bgColor} ${
                            highlightedProjectId === project.id 
                              ? 'border-blue-500 border-4 shadow-lg animate-pulse' 
                              : 'border-gray-200'
                          }`}
                        >
                          {/* Project Header */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <button
                                onClick={() => openEditProjectModal(project)}
                                className="font-semibold text-sm text-gray-900 hover:text-blue-600 hover:underline text-left"
                              >
                                {project.customerName}
                              </button>
                              <button
                                onClick={() => openEditProjectModal(project)}
                                className="text-sm text-gray-900 font-bold hover:text-blue-600 hover:underline block text-left"
                              >
                                {project.projectName}
                              </button>
                              <div className="text-xs text-gray-500 mt-1">
                                Total: {total}%
                              </div>
                            </div>
                            {canWrite && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openProjectCommentModal(project, sprint)}
                                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                  title="Add/view project comment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  {projectSprintComments[`${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`] && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setSelectedSprint(sprint);
                                    const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
                                    setRoleRequirements(sprintRoleRequirements[requirementKey] || {});
                                    setShowRoleRequirementsModal(true);
                                  }}
                                  className="p-1 rounded hover:bg-purple-100 text-purple-600 relative group"
                                  title={(() => {
                                    const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
                                    const requirements = sprintRoleRequirements[requirementKey];
                                    if (!requirements || Object.keys(requirements).length === 0) {
                                      return 'Required capacity planning - No requirements set';
                                    }
                                    const reqText = Object.entries(requirements)
                                      .map(([role, pct]) => `${role}: ${pct}%`)
                                      .join(', ');
                                    return `Required capacity planning - ${reqText}`;
                                  })()}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                  </svg>
                                </button>
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
                                <button
                                  onClick={() => handleRemoveProjectFromSprint(project, sprint)}
                                  className="p-1 rounded hover:bg-red-100 text-red-600"
                                  title="Remove project from sprint"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Members List */}
                          <div className="space-y-1 mt-2 border-t pt-2">
                            {members.sort((a, b) => b.percentage - a.percentage).map((member) => {
                              const alloc = allocations.find(a => a.id === member.allocationId);
                              const isEditing = editingAllocationId === member.allocationId;
                              
                              // Check if this member's role allocation exceeds planned capacity
                              const teamMember = teamMembers.find(tm => tm.id === member.id);
                              const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
                              const requirements = sprintRoleRequirements[requirementKey];
                              let isOverAllocated = false;
                              
                              if (teamMember && teamMember.role && requirements && requirements[teamMember.role]) {
                                // Calculate total allocated for this role
                                const roleAllocated = members
                                  .filter(m => {
                                    const tm = teamMembers.find(t => t.id === m.id);
                                    return tm && tm.role === teamMember.role;
                                  })
                                  .reduce((sum, m) => sum + (m.percentage || 0), 0);
                                
                                isOverAllocated = roleAllocated > requirements[teamMember.role];
                              }
                              
                              return (
                                <div key={member.allocationId} className="flex justify-between items-center text-xs py-1 gap-2">
                                  <div className="flex-1 min-w-0 flex items-center gap-1">
                                    {isOverAllocated && (
                                      <span 
                                        className="text-red-600 font-bold" 
                                        title={`${teamMember?.role} capacity exceeds planning`}
                                      >
                                        ❗
                                      </span>
                                    )}
                                    <span className="font-medium">{member.fullName}</span>
                                    {member.resourceType && (
                                      <span className="ml-1 text-gray-500 text-[10px]">({member.resourceType})</span>
                                    )}
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editingPercentage}
                                        onChange={(e) => setEditingPercentage(e.target.value)}
                                        className="ml-2 w-12 px-1 py-0.5 border rounded text-xs"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveAllocationEdit(member.allocationId);
                                          if (e.key === 'Escape') cancelEdit();
                                        }}
                                      />
                                    ) : (
                                      <span className="ml-2 text-blue-600 font-semibold">{member.percentage}%</span>
                                    )}
                                    {alloc?.comment && (
                                      <span className="ml-1 text-blue-500" title={alloc.comment}>💬</span>
                                    )}
                                  </div>
                                  {canWrite && (
                                    <div className="flex gap-0.5 flex-shrink-0">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => saveAllocationEdit(member.allocationId)}
                                            className="p-0.5 rounded hover:bg-green-100 text-green-600"
                                            title="Save"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                                            title="Cancel"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => alloc && openCommentModal(alloc)}
                                            className="p-0.5 rounded hover:bg-blue-100 text-blue-600"
                                            title="Comment"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => startEditingAllocation(member.allocationId, member.percentage)}
                                            className="p-0.5 rounded hover:bg-yellow-100 text-yellow-600"
                                            title="Edit"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleRemoveAllocation(member.allocationId)}
                                            className="p-0.5 rounded hover:bg-red-100 text-red-600"
                                            title="Remove"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Role Requirement Placeholders */}
                            {getUnallocatedRoleRequirements(project, members, sprint).map(({ role, required, allocated }) => (
                              <button
                                key={`placeholder-${role}`}
                                onClick={() => handleAddMemberToProject(project, sprint, role)}
                                className="flex justify-between items-center text-xs py-1 gap-2 w-full hover:bg-blue-50 rounded px-1 transition-colors"
                              >
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="font-medium text-gray-500 italic">Set {role}</span>
                                  <span className="ml-2 text-purple-600 font-semibold">({required}% needed)</span>
                                  {allocated > 0 && (
                                    <span className="ml-1 text-orange-600 text-[10px]">({allocated}% allocated)</span>
                                  )}
                                </div>
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}

                {/* Sprint Content - Team View */}
                {viewMode === 'team' && (
                  <div className={isExpanded ? "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "p-3 space-y-3"}>
                    {membersData.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm col-span-full">
                        No team members allocated
                      </div>
                    ) : (
                      membersData.map(({ member, projects: memberProjects, total }) => (
                        <div key={member.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-bold text-sm text-gray-900">{member.fullName}</div>
                              {member.role && (
                                <div className="text-xs text-gray-600">{member.role}</div>
                              )}
                              <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-flex items-center gap-1 ${getCapacityColor(total, member.capacity ?? 100)}`}>
                                <span>{getCapacityBadge(total, member.capacity ?? 100)}</span>
                                <span className="font-semibold">Total: {total}% / {member.capacity ?? 100}%</span>
                              </div>
                            </div>
                            {canWrite && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setSelectedSprint(sprint);
                                    setShowAddProjectModal(true);
                                  }}
                                  className="p-1 rounded hover:bg-green-100 text-green-600"
                                  title="Add project to member"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleCopyMemberToNextSprint(member, sprint)}
                                  className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                  title="Copy member allocations to next sprint"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleOpenRemoveMemberModal(member, sprint)}
                                  className="p-1 rounded hover:bg-red-100 text-red-600"
                                  title="Remove member from sprint"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 mt-2 border-t pt-2">
                            {memberProjects.sort((a, b) => b.percentage - a.percentage).map((proj) => {
                              const projectObj = projects.find(p => p.id === proj.id);
                              const alloc = allocations.find(a => a.id === proj.allocationId);
                              const isEditing = editingAllocationId === proj.allocationId;
                              
                              return (
                                <div key={proj.allocationId} className="flex justify-between items-center text-xs py-1 gap-2">
                                  <div className="flex-1 min-w-0">
                                    <button
                                      onClick={() => projectObj && openEditProjectModal(projectObj)}
                                      className="font-medium hover:text-blue-600 hover:underline"
                                    >
                                      {proj.customerName}
                                    </button>
                                    <span className="mx-1">-</span>
                                    <button
                                      onClick={() => projectObj && openEditProjectModal(projectObj)}
                                      className="hover:text-blue-600 hover:underline"
                                    >
                                      {proj.projectName}
                                    </button>
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editingPercentage}
                                        onChange={(e) => setEditingPercentage(e.target.value)}
                                        className="ml-2 w-12 px-1 py-0.5 border rounded text-xs"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveAllocationEdit(proj.allocationId);
                                          if (e.key === 'Escape') cancelEdit();
                                        }}
                                      />
                                    ) : (
                                      <span className="ml-2 text-blue-600 font-semibold">{proj.percentage}%</span>
                                    )}
                                    {alloc?.comment && (
                                      <span className="ml-1 text-blue-500" title={alloc.comment}>💬</span>
                                    )}
                                  </div>
                                  {canWrite && (
                                    <div className="flex gap-0.5 flex-shrink-0">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => saveAllocationEdit(proj.allocationId)}
                                            className="p-0.5 rounded hover:bg-green-100 text-green-600"
                                            title="Save"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={cancelEdit}
                                            className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                                            title="Cancel"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => alloc && openCommentModal(alloc)}
                                            className="p-0.5 rounded hover:bg-blue-100 text-blue-600"
                                            title="Comment"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => startEditingAllocation(proj.allocationId, proj.percentage)}
                                            className="p-0.5 rounded hover:bg-yellow-100 text-yellow-600"
                                            title="Edit"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleRemoveAllocation(proj.allocationId)}
                                            className="p-0.5 rounded hover:bg-red-100 text-red-600"
                                            title="Remove"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
          setSelectedProject(null);
          setSelectedRoleFilter(null);
          setAllocationPercentage('');
        }}
        title={selectedProject && selectedMember 
          ? `Add ${selectedMember.fullName} to ${selectedProject.projectName}`
          : selectedProject && selectedRoleFilter
            ? `Add ${selectedRoleFilter} to ${selectedProject.projectName}`
            : selectedProject 
            ? `Add Member to ${selectedProject.projectName}`
            : 'Add Allocation'}
      >
        <div className="space-y-4">
          {!selectedMember ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Member
                {selectedRoleFilter && <span className="text-purple-600 ml-1">(Role: {selectedRoleFilter})</span>}
              </label>
              {(() => {
                const filteredMembers = teamMembers.filter(m => m.isActive && (!selectedRoleFilter || m.role === selectedRoleFilter));
                if (filteredMembers.length === 0 && selectedRoleFilter) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                      <p className="text-yellow-800 font-medium">No members found with role "{selectedRoleFilter}"</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Please add team members with this role in Team Management, or update the role requirements.
                      </p>
                    </div>
                  );
                }
                return (
                  <select
                    value={''}
                    onChange={(e) => {
                      const member = teamMembers.find(m => m.id === e.target.value);
                      if (member && selectedRoleFilter && selectedProject && selectedSprint) {
                        // Auto-fill the planned capacity for this role
                        const requirementKey = `${selectedProject.id}-${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
                        const requirements = sprintRoleRequirements[requirementKey];
                        const plannedCapacity = requirements?.[selectedRoleFilter];
                        if (plannedCapacity) {
                          setAllocationPercentage(plannedCapacity.toString());
                        }
                      }
                      setSelectedMember(member || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Choose a member...</option>
                    {filteredMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} {member.role ? `(${member.role})` : ''}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          ) : null}
          {selectedMember && !selectedProject && (
            <div>
              <div className="bg-blue-50 p-3 rounded-md mb-3">
                <div className="text-sm font-medium text-gray-700">Member:</div>
                <div className="text-sm text-gray-900">{selectedMember.fullName} {selectedMember.role ? `(${selectedMember.role})` : ''}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project *
                </label>
                <select
                  value={''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                    setSelectedProject(project || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a project...</option>
                  {selectedSprint && getAvailableProjectsForMember(selectedSprint, selectedMember.id).map(project => (
                    <option key={project.id} value={project.id}>
                      {project.customerName} - {project.projectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {selectedProject && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocation %
                {selectedRoleFilter && selectedProject && selectedSprint && (() => {
                  const requirementKey = `${selectedProject.id}-${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
                  const requirements = sprintRoleRequirements[requirementKey];
                  const plannedCapacity = requirements?.[selectedRoleFilter];
                  return plannedCapacity ? <span className="text-purple-600 ml-1">(Planned: {plannedCapacity}%)</span> : null;
                })()}
              </label>
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
          )}
          <div className="flex justify-between gap-2">
            <p className="text-xs text-gray-500 self-center">
              {!selectedProject ? 'Project and allocation percentage are required' : 'Allocation percentage is required'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedMember(null);
                  setSelectedProject(null);
                  setAllocationPercentage('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedMember || !selectedProject || !allocationPercentage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddProjectModal}
        onClose={() => {
          setShowAddProjectModal(false);
          setSelectedProject(null);
          setSelectedMember(null);
          setProjectSearchText('');
        }}
        title={selectedMember 
          ? `Add Project to ${selectedMember.fullName}`
          : "Add Project to Sprint"}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {selectedMember 
                ? `Select a project for ${selectedMember.fullName} in ${selectedSprint && `${getMonthName(selectedSprint.month)} ${selectedSprint.year} Sprint #${selectedSprint.sprint}`}`
                : `Select a project to add to ${selectedSprint && `${getMonthName(selectedSprint.month)} ${selectedSprint.year} Sprint #${selectedSprint.sprint}`}`}
            </p>
            <button
              onClick={() => {
                setShowAddProjectModal(false);
                setShowCreateProjectModal(true);
              }}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New
            </button>
          </div>
          
          {/* Search Field */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer or project name..."
              value={projectSearchText}
              onChange={(e) => setProjectSearchText(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg 
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {selectedSprint && (selectedMember 
              ? getAvailableProjectsForMember(selectedSprint, selectedMember.id)
              : getAvailableProjects(selectedSprint)
            ).filter((project: Project) => {
              if (!projectSearchText) return true;
              const searchLower = projectSearchText.toLowerCase();
              return project.customerName.toLowerCase().includes(searchLower) ||
                     project.projectName.toLowerCase().includes(searchLower);
            }).map((project: Project) => (
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
            {selectedSprint && (selectedMember 
              ? getAvailableProjectsForMember(selectedSprint, selectedMember.id)
              : getAvailableProjects(selectedSprint)
            ).filter((project: Project) => {
              if (!projectSearchText) return true;
              const searchLower = projectSearchText.toLowerCase();
              return project.customerName.toLowerCase().includes(searchLower) ||
                     project.projectName.toLowerCase().includes(searchLower);
            }).length === 0 && (
              <div className="text-center text-gray-400 py-8">
                {projectSearchText ? (
                  <>
                    No projects found matching "{projectSearchText}"
                    <button
                      onClick={() => setProjectSearchText('')}
                      className="block mx-auto mt-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  selectedMember 
                    ? `${selectedMember.fullName} is already assigned to all active projects in this sprint.`
                    : 'No available projects. Click "Create New" to add one.'
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Project Comment Modal */}
      <Modal
        isOpen={showProjectCommentModal}
        onClose={() => {
          setShowProjectCommentModal(false);
          setSelectedProject(null);
          setSelectedSprint(null);
          setProjectComment('');
        }}
        title={`Project Comment - ${selectedProject?.projectName || ''} (${selectedSprint ? `${getMonthName(selectedSprint.month)} ${selectedSprint.year} Sprint #${selectedSprint.sprint}` : ''})`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={projectComment}
              onChange={(e) => setProjectComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Enter project comment for this sprint..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowProjectCommentModal(false);
                setSelectedProject(null);
                setSelectedSprint(null);
                setProjectComment('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={saveProjectComment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Comment
            </button>
          </div>
        </div>
      </Modal>

      {/* Comment Modal */}
      <Modal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setSelectedAllocation(null);
          setCommentText('');
        }}
        title="Add/Edit Comment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Enter your comment..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCommentModal(false);
                setSelectedAllocation(null);
                setCommentText('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={saveComment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Comment
            </button>
          </div>
        </div>
      </Modal>

      {/* Create New Project Modal */}
      <Modal
        isOpen={showCreateProjectModal}
        onClose={() => {
          setShowCreateProjectModal(false);
          setShowAddProjectModal(true);
        }}
        title="Create New Project"
      >
        <ProjectForm
          onSuccess={handleProjectCreated}
          onCancel={() => {
            setShowCreateProjectModal(false);
            setShowAddProjectModal(true);
          }}
        />
      </Modal>

      {/* Role Requirements Modal */}
      <Modal
        isOpen={showRoleRequirementsModal}
        onClose={() => {
          setShowRoleRequirementsModal(false);
          setSelectedProject(null);
          setRoleRequirements({});
        }}
        title={`Required Capacity Planning - ${selectedProject?.projectName || ''} (${selectedSprint ? `${getMonthName(selectedSprint.month)} ${selectedSprint.year} Sprint #${selectedSprint.sprint}` : ''})`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Define the required capacity percentage for each role in this sprint. Only roles with values will be tracked.
          </p>
          
          {/* Add role from existing roles only - SHOWN FIRST */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Role Requirement</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !roleRequirements[e.target.value]) {
                  setRoleRequirements({ ...roleRequirements, [e.target.value]: 50 });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select a role to add...</option>
              {(() => {
                const roles = new Set<string>();
                teamMembers.forEach(m => {
                  if (m.role) roles.add(m.role);
                });
                const availableRoles = Array.from(roles).sort().filter(r => !roleRequirements[r]);
                if (availableRoles.length === 0) {
                  return <option value="" disabled>All roles have been added</option>;
                }
                return availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ));
              })()}
            </select>
          </div>

          {/* List of added roles with capacity inputs */}
          <div className="space-y-3 max-h-96 overflow-y-auto pt-3 border-t">
            {Object.keys(roleRequirements).length > 0 ? (
              <>
                <label className="block text-sm font-medium text-gray-700">Role Requirements</label>
                {Object.keys(roleRequirements).map(role => (
                  <div key={role} className="flex items-center gap-3">
                    <label className="w-40 text-sm font-medium text-gray-700">{role}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={roleRequirements[role] || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (value === 0 || e.target.value === '') {
                          const { [role]: _, ...rest } = roleRequirements;
                          setRoleRequirements(rest);
                        } else {
                          setRoleRequirements({ ...roleRequirements, [role]: value });
                        }
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    <button
                      onClick={() => {
                        const { [role]: _, ...rest } = roleRequirements;
                        setRoleRequirements(rest);
                      }}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-gray-400 py-4 text-sm">
                No role requirements set. Select a role above to add.
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => {
                setShowRoleRequirementsModal(false);
                setSelectedProject(null);
                setRoleRequirements({});
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={saveRoleRequirements}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Requirements
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={showRemoveMemberModal}
        onClose={() => {
          setShowRemoveMemberModal(false);
          setMemberToRemove(null);
        }}
        title="Remove Member from Sprint"
      >
        {memberToRemove && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Are you sure?</h4>
                  <p className="text-sm text-gray-700">
                    You are about to remove <span className="font-semibold">{memberToRemove.member.fullName}</span> from{' '}
                    <span className="font-semibold">
                      {getMonthName(memberToRemove.sprint.month)} {memberToRemove.sprint.year} Sprint #{memberToRemove.sprint.sprint}
                    </span>.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    This will delete all project allocations for this member in the selected sprint(s).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Remove from:
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="removeOption"
                    value="current"
                    checked={removeFutureSprintsOption === 'current'}
                    onChange={(e) => setRemoveFutureSprintsOption(e.target.value as 'current' | 'future')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">This sprint only</div>
                    <div className="text-xs text-gray-600">
                      Remove member only from {getMonthName(memberToRemove.sprint.month)} {memberToRemove.sprint.year} Sprint #{memberToRemove.sprint.sprint}
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="removeOption"
                    value="future"
                    checked={removeFutureSprintsOption === 'future'}
                    onChange={(e) => setRemoveFutureSprintsOption(e.target.value as 'current' | 'future')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">This sprint and all future sprints</div>
                    <div className="text-xs text-gray-600">
                      Remove member from this sprint and all sprints that come after it
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setMemberToRemove(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMemberFromSprint}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Member
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Project Modal */}
      <Modal
        isOpen={showEditProjectModal}
        onClose={() => {
          setShowEditProjectModal(false);
          setSelectedProject(null);
        }}
        title="Project Details"
      >
        {selectedProject && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <div className="text-sm text-gray-900">{selectedProject.customerName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <div className="text-sm text-gray-900">{selectedProject.projectName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="text-sm text-gray-900">{selectedProject.projectType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="text-sm text-gray-900">{selectedProject.status}</div>
              </div>
              {selectedProject.maxCapacityPercentage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                  <div className="text-sm text-gray-900">{selectedProject.maxCapacityPercentage}%</div>
                </div>
              )}
              {selectedProject.pmoContact && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PMO Contact</label>
                  <div className="text-sm text-gray-900">{selectedProject.pmoContact}</div>
                </div>
              )}
            </div>
            {selectedProject.comment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedProject.comment}</div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditProjectModal(false);
                  setSelectedProject(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Close
              </button>
              <a
                href="/projects"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
              >
                Edit in Project Management
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
