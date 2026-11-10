import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Project, TeamMember, SprintAllocation, COMPANY_GROUPS } from '../types';
import { getMemberCompanyGroup } from '../utils/memberUtils';
import Modal from '../components/Modal';
import ProjectForm from '../components/ProjectForm';
import DailyTaskView from '../components/DailyTaskView';
import ImportProjects from '../components/ImportProjects';
import ProjectMatrixView from '../components/ProjectMatrixView';
import TimelineView from '../components/TimelineView';
import WeekSpanEditor from '../components/WeekSpanEditor';
import { fetchAllData, saveSprintProjects, saveSprintRoleRequirements } from '../services/api';
import { getWeeksInRange, buildWeek, WeekInfo, groupWeeksIntoSprints, firstWeekOfCurrentSprint, getSprintTitleLabel, getSprintDayRangeLabel, getSprintDateLabel, getSprintYearLabel, getWeekLabel, getWeekDayRangeLabel, SprintLengthWeeks, formatDDMM, aggregateWeeklyValues, workingDaysInWeek } from '../utils/weekUtils';

// Week/Sprint toggle is temporarily disabled — Sprint view is the only mode for now.
// Flip back to true to re-expose the toggle once ready.
const VIEW_LEVEL_TOGGLE_ENABLED = false;

const CP_MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Fixed pixel width/gap shared by the Staff View header bands (Month/Week/Sprint) and the
// week-tile row below, so both always line up regardless of how many weeks are visible.
const STAFF_COL_WIDTH = 300;
const STAFF_COL_GAP = 24;

// Build a Staff-view period (SprintInfo) from a week.
function weekToPeriod(w: WeekInfo) {
  return {
    year: w.isoYear,
    month: w.month,
    sprint: w.isoWeek,
    isoYear: w.isoYear,
    isoWeek: w.isoWeek,
    weekStartDate: w.startDate,
    weekLabel: `W${w.weekOfMonth}`,
    monthLabel: `${CP_MONTH_ABBR[w.month - 1]} ${w.year}`,
  };
}

type ViewMode = 'projects' | 'team' | 'matrix' | 'timeline';
type CapacityFilter = 'all' | 'under' | 'over' | 'good';

// A "period" in the Staff view is now an ISO week. To keep the existing
// `${year}-${month}-${sprint}`-keyed features (role requirements, comments, copy-forward,
// removed/added members) working per-week without churn, `sprint` carries the ISO week number
// and `year` carries the ISO year, so every key is unique per week. Allocation lookups use
// isoYear/isoWeek directly.
interface SprintInfo {
  year: number;        // ISO year (for unique keys)
  month: number;       // calendar month of the week's Monday
  sprint: number;      // ISO week number (for unique keys)
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekLabel: string;   // e.g. "W3"
  monthLabel: string;  // e.g. "Aug 2026"
}

export default function CapacityPlanning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { teamMembers, projects, allocations, addAllocation, updateAllocation, deleteAllocation, addProject, updateProject, refreshData } = useData();
  const { user } = useAuth();
  const { canWrite, isMemberTeam } = usePermissions();
  const currentUser = user || { email: 'unknown', fullName: 'Unknown User' };

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [showFilters, setShowFilters] = useState(true);
  // Company group filter (applies to the member-driven views). 'all' = no filtering.
  const [companyGroupFilter, setCompanyGroupFilter] = useState<string>('all');
  // Staff View always displays a fixed one-year (52-week) future period starting from the
  // current week. Add/remove sprint controls were removed, so this stays constant.
  const [sprintCount] = useState(52);
  // Offset for Staff View navigation. Shared with Puzzle View and Timeline View (same
  // localStorage keys + change events) so the visible week/sprint period stays in sync no
  // matter which of the 3 Capacity Planning views the user navigates to.
  const [teamSprintOffset, setTeamSprintOffset] = useState(
    () => parseInt(localStorage.getItem('capacityPeriodOffset') || '0', 10)
  );
  // Sprint row is always shown for the Staff View (no visibility toggle).
  const [staffOverlaySprintLength, setStaffOverlaySprintLength] = useState<SprintLengthWeeks>(
    () => (parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks)
  );
  // Week vs Sprint display level for the Staff View. Sprint level shows averaged, read-only
  // tiles grouping several weeks; clicking one switches back to Week level to edit.
  // Toggle is temporarily disabled (VIEW_LEVEL_TOGGLE_ENABLED) — Sprint is always shown.
  const [staffViewLevel, setStaffViewLevel] = useState<'week' | 'sprint'>(
    () => (VIEW_LEVEL_TOGGLE_ENABLED ? (localStorage.getItem('staffViewLevel') as 'week' | 'sprint') || 'week' : 'sprint')
  );
  useEffect(() => {
    if (VIEW_LEVEL_TOGGLE_ENABLED) localStorage.setItem('staffViewLevel', staffViewLevel);
  }, [staffViewLevel]);
  const [teamExpandedMode, setTeamExpandedMode] = useState(false); // track if user wants expanded view
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [showDailyView, setShowDailyView] = useState(false);
  const [dailyViewSprint, setDailyViewSprint] = useState<SprintInfo | null>(null);

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

  // Staff View manager/employee filter state (mirrors Projects View logic)
  const [staffSelectedManagerIds, setStaffSelectedManagerIds] = useState<Set<string>>(new Set());
  const [staffSelectedMemberIds, setStaffSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showStaffManagerDropdown, setShowStaffManagerDropdown] = useState(false);
  const [showStaffMemberDropdown, setShowStaffMemberDropdown] = useState(false);
  const [staffManagerSearch, setStaffManagerSearch] = useState('');
  const [staffMemberSearch, setStaffMemberSearch] = useState('');
  const staffManagerDropdownRef = useRef<HTMLDivElement>(null);
  const staffMemberDropdownRef = useRef<HTMLDivElement>(null);

  // Project collapse/expand state
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [allProjectsCollapsed, setAllProjectsCollapsed] = useState(true);

  // Member collapse/expand state
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(new Set());
  const [allMembersCollapsed, setAllMembersCollapsed] = useState(true);

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
    window.dispatchEvent(new Event('thresholdChanged'));
  }, [underCapacityThreshold]);

  useEffect(() => {
    localStorage.setItem('overCapacityThreshold', overCapacityThreshold.toString());
    window.dispatchEvent(new Event('thresholdChanged'));
  }, [overCapacityThreshold]);

  useEffect(() => {
    localStorage.setItem('capacitySprintLength', String(staffOverlaySprintLength));
    window.dispatchEvent(new Event('capacitySprintLengthChanged'));
  }, [staffOverlaySprintLength]);

  useEffect(() => {
    localStorage.setItem('capacityPeriodOffset', String(teamSprintOffset));
    window.dispatchEvent(new Event('capacityPeriodOffsetChanged'));
  }, [teamSprintOffset]);

  // Stay in sync with the Puzzle View / Timeline View when they change the shared period or
  // sprint length (all 3 Capacity Planning views read/write the same localStorage keys).
  useEffect(() => {
    const syncPeriod = () => setTeamSprintOffset(parseInt(localStorage.getItem('capacityPeriodOffset') || '0', 10));
    const syncLength = () => setStaffOverlaySprintLength(parseInt(localStorage.getItem('capacitySprintLength') || '2') as SprintLengthWeeks);
    window.addEventListener('capacityPeriodOffsetChanged', syncPeriod);
    window.addEventListener('capacitySprintLengthChanged', syncLength);
    return () => {
      window.removeEventListener('capacityPeriodOffsetChanged', syncPeriod);
      window.removeEventListener('capacitySprintLengthChanged', syncLength);
    };
  }, []);

  // Modal state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showRoleRequirementsModal, setShowRoleRequirementsModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [roleRequirements, setRoleRequirements] = useState<Record<string, number>>({});
  const [selectedSprint, setSelectedSprint] = useState<SprintInfo | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<SprintAllocation | null>(null);
  // When adding a project via a Staff View sprint-level card (2-3 week tile), holds the
  // underlying weeks so the new allocation is written to all of them at once.
  const [staffGroupWeeks, setStaffGroupWeeks] = useState<WeekInfo[] | null>(null);
  // Staff View sprint-level per-week sub-editor (mirrors Puzzle View's WeekSpanEditor use).
  const [staffSpanEditor, setStaffSpanEditor] = useState<{ memberId: string; projectId: string; weeks: WeekInfo[]; title: string } | null>(null);
  // When set, the Comment Modal applies to every week in this sprint group instead of a
  // single allocation (used by the Staff View sprint-level cards).
  const [staffCommentContext, setStaffCommentContext] = useState<{ memberId: string; projectId: string; weeks: WeekInfo[] } | null>(null);
  // Which sprint-level card (by index) is expanded to full width, mirroring the Week-level
  // "Expand sprint view" behavior.
  const [expandedStaffGroup, setExpandedStaffGroup] = useState<number | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);
  const [projectSearchText, setProjectSearchText] = useState('');
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    member: TeamMember;
    sprint: SprintInfo;
    groupWeeks?: WeekInfo[]; // when removing from a Staff View sprint-level card (2-3 week group)
  } | null>(null);
  const [removeFutureSprintsOption, setRemoveFutureSprintsOption] = useState<'current' | 'future'>('current');

  // Confirmation modal for removing a project allocation. Lets the user choose whether to
  // remove just this allocation or this and all future allocations for the same
  // member+project. `weeks` are the specific week(s) targeted (a single week, or every
  // week of a Staff View sprint-level card group).
  const [showRemoveAllocationModal, setShowRemoveAllocationModal] = useState(false);
  const [allocationToRemove, setAllocationToRemove] = useState<{
    memberId: string;
    projectId: string;
    weeks: WeekInfo[];
    memberName: string;
    projectName: string;
    weekLabel: string;
  } | null>(null);
  const [removeFutureAllocationsOption, setRemoveFutureAllocationsOption] = useState<'current' | 'future'>('current');

  // Track members explicitly removed from sprints
  // Key format: "memberId-year-month-sprint"
  const [removedMembers, setRemovedMembers] = useState<Set<string>>(new Set());
  
  // Track members explicitly added to sprints (even if they have no allocations)
  // Key format: "memberId-year-month-sprint"
  const [explicitlyAddedMembers, setExplicitlyAddedMembers] = useState<Set<string>>(new Set());
  
  // State for inline project creation flow
  const [returnToAddMember, setReturnToAddMember] = useState(false);
  const [pendingMember, setPendingMember] = useState<TeamMember | null>(null);
  const [pendingSprint, setPendingSprint] = useState<SprintInfo | null>(null);
  
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
  // Scope prompt for inline % edits when the same member+project has later allocations:
  // apply to this week only, or this and all future weeks. Mirrors the Puzzle View UX.
  const [editScopeModal, setEditScopeModal] = useState<{
    allocationId: string;
    percentage: number;
    memberName: string;
    projectName: string;
    futureCount: number;
  } | null>(null);
  const [editScopeOption, setEditScopeOption] = useState<'current' | 'future'>('current');
  
  // Ref for role selector dropdown
  const roleSelectorRef = useRef<HTMLDivElement>(null);
  const teamRoleSelectorRef = useRef<HTMLDivElement>(null);
  
  // Refs for Add Member modal focus management
  const projectSelectRef = useRef<HTMLSelectElement>(null);
  const percentageInputRef = useRef<HTMLInputElement>(null);

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

    // Staff View shows a fixed 52-week (one year) window, so deep-linked sprint indexes
    // within the year are always visible without adjusting the visible count.
  }, [searchParams]);
  
  // Comment state
  const [showProjectCommentModal, setShowProjectCommentModal] = useState(false);
  const [projectComment, setProjectComment] = useState('');
  const [commentText, setCommentText] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState('');
  // Weekly breakdown for the Add Member modal, mirroring the Puzzle View's WeekSpanEditor:
  // unchecked (default) applies allocationPercentage uniformly to every week being created;
  // checked shows one field per week so each can be set individually. Only relevant when the
  // allocation spans more than 1 week (2-3 week sprint length, and/or multiple sprints).
  const [allocationBreakdown, setAllocationBreakdown] = useState(false);
  const [allocationWeeklyValues, setAllocationWeeklyValues] = useState<string[]>([]);
  const [allocationStartDate, setAllocationStartDate] = useState('');
  const [editingStartDateAllocationId, setEditingStartDateAllocationId] = useState<string | null>(null);
  const [editingStartDateValue, setEditingStartDateValue] = useState('');
  const [isCreatingAllocations, setIsCreatingAllocations] = useState(false);
  const [showImportProjectsModal, setShowImportProjectsModal] = useState(false);
  
  // Multi-sprint allocation state
  const [numberOfSprints, setNumberOfSprints] = useState(1);
  // How the Add Member allocation spans forward: a number of sprints, or up to an end date.
  const [allocationSpanMode, setAllocationSpanMode] = useState<'sprints' | 'endDate'>('sprints');
  const [allocationEndDate, setAllocationEndDate] = useState('');
  const [showMultiSprintPreview, setShowMultiSprintPreview] = useState(false);
  
  // Highlighted project for animation
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

  // Generate weekly timeline (each period is an ISO week). `sprintCount` now = number of weeks.
  const sprints = useMemo(() => {
    const offset = viewMode === 'team' ? teamSprintOffset : 0;
    // Anchor to the first week of the current sprint so the leading column is the current
    // sprint (not a partially-elapsed previous one), consistent across all capacity views.
    const anchor = firstWeekOfCurrentSprint(staffOverlaySprintLength);
    const start = new Date(anchor.startDate + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + offset * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (sprintCount - 1) * 7);
    return getWeeksInRange(start, end).slice(0, sprintCount).map(weekToPeriod);
  }, [sprintCount, teamSprintOffset, viewMode, staffOverlaySprintLength]);

  // Sprint band groups over the same weeks, using the week engine's numbering rules.
  // (Month is combined into the Week band label above to save a header row.)
  const staffSprintGroups = useMemo(() => {
    const weekInfos: WeekInfo[] = sprints.map(s => buildWeek(new Date(s.weekStartDate + 'T00:00:00Z')));
    return groupWeeksIntoSprints(weekInfos, staffOverlaySprintLength);
  }, [sprints, staffOverlaySprintLength]);

  // Maps each Sprint group (WeekInfo[]) back to its original SprintInfo periods (matched by
  // isoYear/isoWeek) so getMembersForSprintGroup can reuse getMembersForSprint per week.
  const staffSprintPeriodGroups = useMemo(() => {
    return staffSprintGroups.map(sg => ({
      sprint: sg,
      periods: sg.weeks
        .map(w => sprints.find(s => s.isoYear === w.isoYear && s.isoWeek === w.isoWeek))
        .filter(Boolean) as SprintInfo[],
    }));
  }, [staffSprintGroups, sprints]);

  // Set of weekStartDates that begin a new sprint, used to draw a boundary divider
  // between the week-tiles so they visually cluster under their sprint band.
  const staffSprintStartDates = useMemo(() => {
    const set = new Set<string>();
    staffSprintGroups.forEach(s => set.add(s.weeks[0].startDate));
    return set;
  }, [staffSprintGroups]);

  // Auto-expand first sprint when in expanded mode and sprints change
  useEffect(() => {
    if (teamExpandedMode && sprints.length > 0) {
      const firstKey = `${sprints[0].year}-${sprints[0].month}-${sprints[0].sprint}`;
      setExpandedSprint(firstKey);
    }
  }, [teamExpandedMode, sprints]);

  // Get allocations for a specific week (period).
  const getSprintAllocations = (sprint: SprintInfo) => {
    return allocations.filter(
      a => a.isoYear === sprint.isoYear && a.isoWeek === sprint.isoWeek
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

  // Staff View: available managers and eligible members (same logic as Projects View)
  const UNASSIGNED_MANAGER_ID = '__unassigned__';
  const staffAllActiveMembers = useMemo(() =>
    teamMembers
      .filter(m => m.isActive)
      .filter(m => companyGroupFilter === 'all' || getMemberCompanyGroup(m) === companyGroupFilter)
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teamMembers, companyGroupFilter]
  );

  const staffAvailableManagers = useMemo(() => {
    const managerIdSet = new Set<string>();
    staffAllActiveMembers.forEach(m => { if (m.managerId) managerIdSet.add(m.managerId); });
    const hasUnassigned = staffAllActiveMembers.some(m => !m.managerId);
    const managers = staffAllActiveMembers.filter(m => managerIdSet.has(m.id));
    return { managers, hasUnassigned };
  }, [staffAllActiveMembers]);

  // Drop any selected managers that are no longer valid for the current company group
  // (e.g. after switching groups), so eligible members don't collapse to an empty set.
  // Clearing the selection lets the default-selection effect below re-pick a valid manager.
  useEffect(() => {
    if (staffSelectedManagerIds.size === 0) return;
    const validIds = new Set(staffAvailableManagers.managers.map(m => m.id));
    if (staffAvailableManagers.hasUnassigned) validIds.add(UNASSIGNED_MANAGER_ID);
    const pruned = new Set([...staffSelectedManagerIds].filter(id => validIds.has(id)));
    if (pruned.size !== staffSelectedManagerIds.size) {
      setStaffSelectedManagerIds(pruned);
      setStaffSelectedMemberIds(new Set());
    }
  }, [staffAvailableManagers, staffSelectedManagerIds]);

  // Default staff manager selection
  useEffect(() => {
    if (staffSelectedManagerIds.size > 0) return;
    if (staffAvailableManagers.managers.length === 0) return;
    const userIsManager = staffAvailableManagers.managers.some(m => m.id === user?.id);
    if (userIsManager && user?.id) {
      setStaffSelectedManagerIds(new Set([user.id]));
    } else {
      setStaffSelectedManagerIds(new Set([staffAvailableManagers.managers[0].id]));
    }
  }, [staffAvailableManagers.managers, user?.id]);

  // Staff eligible members based on selected managers
  const staffEligibleMembers = useMemo(() => {
    if (staffSelectedManagerIds.size === 0) return staffAllActiveMembers;
    const result = new Set<string>();
    staffSelectedManagerIds.forEach(managerId => {
      if (managerId === UNASSIGNED_MANAGER_ID) {
        staffAllActiveMembers.forEach(m => { if (!m.managerId) result.add(m.id); });
      } else {
        result.add(managerId);
        staffAllActiveMembers.forEach(m => { if (m.managerId === managerId) result.add(m.id); });
      }
    });
    return staffAllActiveMembers.filter(m => result.has(m.id));
  }, [staffAllActiveMembers, staffSelectedManagerIds]);

  // Staff displayed members (filtered by employee dropdown)
  const staffDisplayedMembers = useMemo(() =>
    staffSelectedMemberIds.size === 0
      ? staffEligibleMembers
      : staffEligibleMembers.filter(m => staffSelectedMemberIds.has(m.id)),
    [staffEligibleMembers, staffSelectedMemberIds]
  );

  // Close staff dropdowns when clicking outside
  useEffect(() => {
    if (!showStaffManagerDropdown && !showStaffMemberDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (showStaffManagerDropdown && staffManagerDropdownRef.current && !staffManagerDropdownRef.current.contains(e.target as Node)) {
        setShowStaffManagerDropdown(false);
      }
      if (showStaffMemberDropdown && staffMemberDropdownRef.current && !staffMemberDropdownRef.current.contains(e.target as Node)) {
        setShowStaffMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStaffManagerDropdown, showStaffMemberDropdown]);

  // Get projects with allocations for a sprint
  const getProjectsForSprint = (sprint: SprintInfo) => {
    const sprintAllocs = getSprintAllocations(sprint);
    const projectMap = new Map<string, { project: Project; members: any[]; total: number }>();
    const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;

    // First, add all projects with allocations
    sprintAllocs.forEach(alloc => {
      const project = projects.find(p => p.id === alloc.projectId);
      const member = teamMembers.find(m => m.id === alloc.productManagerId);
      
      if (project && member && (project.status === 'Active' || project.status === 'Pending' || project.status === 'New Signed Off')) {
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
          if (project && (project.status === 'Active' || project.status === 'Pending' || project.status === 'New Signed Off')) {
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
      result = result.filter(({ project, members, total }) => {
        const requirementKey = `${project.id}-${sprint.year}-${sprint.month}-${sprint.sprint}`;
        const requirements = sprintRoleRequirements[requirementKey];
        
        // If "Any Resource" is selected, show projects with any missing allocations
        if (missingAllocationRoles.includes('ANY')) {
          // Check if total allocation = 0% (project in sprint but no members)
          if (total === 0) return true;
          
          // Check role requirements if they exist
          if (!requirements || Object.keys(requirements).length === 0) {
            return false; // No requirements and has allocations, not missing
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

  // Sprint-level aggregation: average each member's total % across the weeks in a sprint
  // group, flagging when the weekly totals disagree. Each project row is aggregated the same
  // way (its own average % + varies flag), so the card can show/edit allocations directly —
  // editing a row opens the per-week breakdown editor (WeekSpanEditor) instead of forcing a
  // switch to Week level.
  const getMembersForSprintGroup = (weekPeriods: SprintInfo[]) => {
    const perWeek = weekPeriods.map(getMembersForSprint);
    const memberIds = new Set<string>();
    perWeek.forEach(list => list.forEach(({ member }) => memberIds.add(member.id)));

    const result = Array.from(memberIds).map(id => {
      const weeklyTotals = perWeek.map(list => list.find(m => m.member.id === id)?.total ?? 0);
      const { average, varies } = aggregateWeeklyValues(weeklyTotals);
      const member = perWeek.find(list => list.some(m => m.member.id === id))!.find(m => m.member.id === id)!.member;

      // Union of projects the member touches across the sprint's weeks, each aggregated to
      // its own average % + varies flag (based on that single project's weekly percentages).
      const projectIds = new Set<string>();
      perWeek.forEach(list => {
        const entry = list.find(m => m.member.id === id);
        entry?.projects.forEach((p: any) => projectIds.add(p.id));
      });
      const projectList = Array.from(projectIds).map(projectId => {
        const weeklyPcts = perWeek.map(list =>
          list.find(m => m.member.id === id)?.projects.find((p: any) => p.id === projectId)?.percentage ?? 0
        );
        const { average: projAvg, varies: projVaries } = aggregateWeeklyValues(weeklyPcts);
        const sample = perWeek
          .map(list => list.find(m => m.member.id === id)?.projects.find((p: any) => p.id === projectId))
          .find(Boolean);
        return {
          id: projectId,
          customerName: sample?.customerName,
          projectName: sample?.projectName,
          comment: sample?.comment,
          percentage: projAvg,
          varies: projVaries,
        };
      });

      return { member, projects: projectList, total: average, varies };
    });

    return result.sort((a, b) => a.member.fullName.localeCompare(b.member.fullName));
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

    // Apply team role filter - hidden, replaced by manager/employee dropdowns
    // if (teamRoleFilter.length > 0) {
    //   result = result.filter(({ member }) => 
    //     member.role && teamRoleFilter.includes(member.role)
    //   );
    // }

    // Apply Staff View manager/employee filter (same as Projects View)
    if (staffSelectedManagerIds.size > 0 || staffSelectedMemberIds.size > 0) {
      const displayedIds = new Set(staffDisplayedMembers.map(m => m.id));
      result = result.filter(({ member }) => displayedIds.has(member.id));
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


  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const getSprintDatePeriod = (sprint: SprintInfo) => {
    const start = formatDDMM(sprint.weekStartDate);
    const end = new Date(sprint.weekStartDate + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + 6);
    const endStr = `${String(end.getUTCDate()).padStart(2, '0')}/${String(end.getUTCMonth() + 1).padStart(2, '0')}`;
    return `${start} → ${endStr}`;
  };

  const handleAddMemberToProject = (project: Project, sprint: SprintInfo, filterRole?: string) => {
    setSelectedProject(project);
    setNumberOfSprints(1); // default = 1 week
    setSelectedSprint(sprint);
    setSelectedRoleFilter(filterRole || null);
    // Clear any leftover sprint-group span so allocationSpanWeeks is computed from the
    // clicked sprint × current sprint length, not a stale group from a prior group-add flow.
    setStaffGroupWeeks(null);
    setAllocationBreakdown(false);
    setAllocationWeeklyValues([]);
    setShowAddMemberModal(true);
  };

  const handleAddProjectToSprint = (sprint: SprintInfo) => {
    setSelectedSprint(sprint);
    setShowAddProjectModal(true);
  };

  // Helper function to generate a week-by-week preview for multi-week allocations.
  const generateSprintPreview = (startSprint: SprintInfo, count: number): SprintInfo[] => {
    const result: SprintInfo[] = [];
    const start = new Date(startSprint.weekStartDate + 'T00:00:00Z');
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i * 7);
      result.push(weekToPeriod(buildWeek(d)));
    }
    return result;
  };

  // Helper function to create multi-week allocations (advances week by week).
  const createMultiSprintAllocations = (
    member: TeamMember,
    project: Project,
    startPeriod: SprintInfo,
    percentage: number,
    numSprints: number
  ) => {
    const groupId = crypto.randomUUID();
    const allocations = [];
    const start = new Date(startPeriod.weekStartDate + 'T00:00:00Z');

    for (let i = 0; i < numSprints; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i * 7);
      const wk = buildWeek(d);
      allocations.push({
        projectId: project.id,
        productManagerId: member.id,
        isoYear: wk.isoYear,
        isoWeek: wk.isoWeek,
        weekStartDate: wk.startDate,
        year: wk.isoYear,
        month: wk.month,
        sprint: wk.isoWeek,
        allocationPercentage: percentage,
        allocationDays: Math.round((percentage / 100) * workingDaysInWeek(wk)),
        isPlanned: true,
        allocationGroupId: groupId,
        isGroupStart: i === 0,
        groupStartSprint: `${startPeriod.isoYear}-W${startPeriod.isoWeek}`,
        groupTotalSprints: numSprints,
        groupCurrentIndex: i + 1,
      });
    }

    return allocations;
  };

  const handleAddMemberToSprint = (sprint: SprintInfo) => {
    setSelectedSprint(sprint);
    setSelectedMember(null);
    setSelectedProject(null);
    setAllocationPercentage('');
    setAllocationBreakdown(false);
    setAllocationWeeklyValues([]);
    // Clear any leftover sprint-group span from a prior group-add flow so this entry
    // computes its own span from the clicked sprint × current sprint length.
    setStaffGroupWeeks(null);
    setShowAddMemberModal(true);
  };

  // Add a project to a member across an entire sprint group (2-3 week Staff View sprint tile).
  // Sets staffGroupWeeks so handleAddMember writes the same percentage to every week in the
  // group instead of just one, mirroring the Puzzle View's sprint-level editing.
  const handleAddProjectToMemberGroup = (member: TeamMember | null, periods: SprintInfo[], weeks: WeekInfo[]) => {
    setSelectedMember(member);
    setSelectedSprint(periods[0] || null);
    setSelectedProject(null);
    setAllocationPercentage('');
    setAllocationBreakdown(false);
    setAllocationWeeklyValues([]);
    setStaffGroupWeeks(weeks);
    setShowAddMemberModal(true);
  };

  // Per-week allocation % for a member+project across a set of weeks (used by the Staff View
  // sprint-level cards to show/edit each underlying week's value).
  const getMemberProjectWeeklyPcts = (memberId: string, projectId: string, weeks: WeekInfo[]) =>
    weeks.map(w => allocations.find(a =>
      a.productManagerId === memberId && a.projectId === projectId &&
      a.isoYear === w.isoYear && a.isoWeek === w.isoWeek
    )?.allocationPercentage || 0);

  // Save per-week values from the Staff View sprint-level sub-editor.
  const saveStaffSpanEditor = (memberId: string, projectId: string, weeks: WeekInfo[], valuesPerWeek: number[], scope: 'current' | 'future' = 'current') => {
    weeks.forEach((week, i) => {
      const pct = valuesPerWeek[i];
      const existing = allocations.find(a =>
        a.productManagerId === memberId && a.projectId === projectId &&
        a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
      );
      const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
      if (pct > 0) {
        if (existing) {
          updateAllocation(existing.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)) }, currentUser.email);
        } else {
          addAllocation({
            projectId, productManagerId: memberId,
            isoYear: week.isoYear, isoWeek: week.isoWeek, weekStartDate: week.startDate,
            year: legacy.year, month: legacy.month, sprint: legacy.sprint,
            allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)), isPlanned: true,
          }, currentUser.email);
        }
      } else if (existing) {
        deleteAllocation(existing.id, currentUser.email);
      }
    });

    // "Future" scope: apply this sprint's uniform % to every later existing allocation for
    // the same member+project (weeks strictly after this sprint's last week).
    if (scope === 'future' && weeks.length > 0) {
      const pct = valuesPerWeek[0] || 0;
      const afterDate = weeks[weeks.length - 1].startDate;
      allocations
        .filter(a =>
          a.productManagerId === memberId && a.projectId === projectId &&
          (a.weekStartDate || '') > afterDate
        )
        .forEach(a => {
          const wk = buildWeek(new Date((a.weekStartDate || '') + 'T00:00:00Z'));
          if (pct > 0) {
            updateAllocation(a.id, { allocationPercentage: pct, allocationDays: Math.round((pct / 100) * workingDaysInWeek(wk)) }, currentUser.email);
          } else {
            deleteAllocation(a.id, currentUser.email);
          }
        });
    }
    setStaffSpanEditor(null);
  };

  // Remove a member+project's allocations across every week in a sprint group (the "X" button
  // on a Staff View sprint-level card row).
  const handleRemoveAllocationGroup = (memberId: string, projectId: string, weeks: WeekInfo[]) => {
    openRemoveAllocationModal(memberId, projectId, weeks);
  };

  // Open the "remove allocation" confirmation modal (this only vs this + future).
  const openRemoveAllocationModal = (memberId: string, projectId: string, weeks: WeekInfo[]) => {
    if (weeks.length === 0) return;
    const member = teamMembers.find(m => m.id === memberId);
    const project = projects.find(p => p.id === projectId);
    const sorted = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const weekLabel = weeks.length > 1
      ? `${weeks.length} weeks starting ${sorted[0].startDate}`
      : `the week of ${sorted[0].startDate}`;
    setAllocationToRemove({
      memberId,
      projectId,
      weeks: sorted,
      memberName: member?.fullName || 'this member',
      projectName: project?.projectName || 'this project',
      weekLabel,
    });
    setRemoveFutureAllocationsOption('current');
    setShowRemoveAllocationModal(true);
  };

  // Execute the allocation removal based on the chosen scope.
  const confirmRemoveAllocation = async () => {
    if (!allocationToRemove) return;
    const { memberId, projectId, weeks } = allocationToRemove;
    setShowRemoveAllocationModal(false);
    setIsCreatingAllocations(true);

    let toDelete: SprintAllocation[] = [];
    if (removeFutureAllocationsOption === 'future') {
      // Every allocation for this member+project from the earliest targeted week onward.
      const fromDate = weeks[0].startDate;
      toDelete = allocations.filter(a =>
        a.productManagerId === memberId && a.projectId === projectId &&
        (a.weekStartDate || '') >= fromDate
      );
    } else {
      toDelete = weeks
        .map(week => allocations.find(a =>
          a.productManagerId === memberId && a.projectId === projectId &&
          a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
        ))
        .filter((a): a is SprintAllocation => !!a);
    }

    toDelete.forEach(a => deleteAllocation(a.id, currentUser.email));

    setTimeout(async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Failed to refresh data:', error);
        alert('⚠️ Allocation removed but failed to refresh view. Please refresh the page.');
      } finally {
        setIsCreatingAllocations(false);
        setAllocationToRemove(null);
      }
    }, 500);
  };

  const clearStaffSpanEditor = (memberId: string, projectId: string, weeks: WeekInfo[], scope: 'current' | 'future' = 'current') => {
    if (scope === 'future' && weeks.length > 0) {
      // Remove this sprint's allocations plus every later one for this member+project.
      const fromDate = weeks[0].startDate;
      const toDelete = allocations.filter(a =>
        a.productManagerId === memberId && a.projectId === projectId &&
        (a.weekStartDate || '') >= fromDate
      );
      if (!confirm(`Remove ${toDelete.length} allocation${toDelete.length !== 1 ? 's' : ''} for this member on this project, from this sprint onward?`)) return;
      toDelete.forEach(a => deleteAllocation(a.id, currentUser.email));
      setStaffSpanEditor(null);
      return;
    }
    if (!confirm(`Clear all allocations for this sprint (${weeks.length} week${weeks.length > 1 ? 's' : ''})?`)) return;
    weeks.forEach(week => {
      const existing = allocations.find(a =>
        a.productManagerId === memberId && a.projectId === projectId &&
        a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
      );
      if (existing) deleteAllocation(existing.id, currentUser.email);
    });
    setStaffSpanEditor(null);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    
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
    
    // If adding project for a specific member, open Add Member modal
    // Otherwise, just close and show the project in the sprint
    if (selectedMember) {
      setShowAddProjectModal(false);
      setShowAddMemberModal(true);
    } else {
      setShowAddProjectModal(false);
      setSelectedProject(null);
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
      .filter(p => (p.status === 'Active' || p.status === 'Pending' || p.status === 'New Signed Off') && !p.isArchived && !projectIdsInSprint.has(p.id))
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
      .filter(p => (p.status === 'Active' || p.status === 'Pending' || p.status === 'New Signed Off') && !p.isArchived && !memberProjectIds.has(p.id))
      .sort((a, b) => {
        const customerCompare = a.customerName.localeCompare(b.customerName);
        if (customerCompare !== 0) return customerCompare;
        return a.projectName.localeCompare(b.projectName);
      });
  };

  // Helper function to derive the week (period) containing a date.
  const getSprintFromDate = (dateString: string): SprintInfo => {
    const date = new Date(dateString);
    return weekToPeriod(buildWeek(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))));
  };

  // The actual weeks the Add Member modal's allocation will be written to. When opened from a
  // Staff View sprint-level card (staffGroupWeeks set), that group's weeks are canonical.
  // Otherwise it's Number of Sprints × the screen's current sprint length (staffOverlaySprintLength,
  // the same "Sprint length" control shown next to the navigation arrows) — no longer a
  // per-project property. Starts at the start date (or the clicked sprint). Drives both the
  // "Weekly breakdown" UI and, when checked, the actual per-week allocation values on save.
  const allocationSpanWeeks: WeekInfo[] = useMemo(() => {
    // Determine the start week: explicit start date > sprint-card group's first week >
    // the clicked sprint. The span controls (sprints / end date) then extend forward from
    // there, so choosing an end date is honored even when opened from a sprint-level card.
    let startWeekDate: string | undefined;
    if (allocationStartDate) startWeekDate = getSprintFromDate(allocationStartDate).weekStartDate;
    else if (staffGroupWeeks && staffGroupWeeks.length > 0) startWeekDate = staffGroupWeeks[0].startDate;
    else if (selectedSprint) startWeekDate = selectedSprint.weekStartDate;

    if (!startWeekDate) return [];
    const start = new Date(startWeekDate + 'T00:00:00Z');

    // End-date mode: span every week from the start week through the chosen end date.
    if (allocationSpanMode === 'endDate') {
      if (!allocationEndDate || allocationEndDate < startWeekDate) return getWeeksInRange(start, start);
      return getWeeksInRange(start, new Date(allocationEndDate + 'T00:00:00Z'));
    }

    // Number-of-sprints mode. When opened from a sprint-level card and the user hasn't
    // changed the count (still 1) nor set a start date, keep the group's exact weeks.
    if (staffGroupWeeks && staffGroupWeeks.length > 0 && numberOfSprints === 1 && !allocationStartDate) {
      return staffGroupWeeks;
    }
    const totalWeeks = numberOfSprints * staffOverlaySprintLength;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (totalWeeks - 1) * 7);
    return getWeeksInRange(start, end).slice(0, totalWeeks);
  }, [staffGroupWeeks, selectedProject, selectedSprint, allocationStartDate, allocationSpanMode, allocationEndDate, numberOfSprints, staffOverlaySprintLength]);

  const allocationIsMultiWeek = allocationSpanWeeks.length > 1;
  const allocationUseBreakdown = allocationIsMultiWeek && allocationBreakdown;

  // Keep the per-week values array in sync with the number of weeks currently being created,
  // preserving already-entered values where possible.
  useEffect(() => {
    setAllocationWeeklyValues(prev => allocationSpanWeeks.map((_, i) => prev[i] ?? ''));
  }, [allocationSpanWeeks.length]);

  const handleAddMember = () => {
    if (!selectedMember || !selectedSprint) {
      return;
    }
    
    // If no project selected, member must select a project first
    if (!selectedProject) {
      alert('Please select a project for this member. Adding a member without a project is not supported.');
      return;
    }

    // Check if this member is already allocated to this project in the starting sprint
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

    // Weekly breakdown mode: each week in allocationSpanWeeks gets its own percentage from
    // allocationWeeklyValues, mirroring the Puzzle View's WeekSpanEditor. Skips weeks left at 0.
    if (allocationUseBreakdown) {
      const parsed = allocationWeeklyValues.map(v => {
        const n = parseInt(v, 10);
        return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
      });
      if (!parsed.some(v => v > 0)) {
        alert('Please enter a percentage for at least one week');
        return;
      }
      allocationSpanWeeks.forEach((week, i) => {
        const pct = parsed[i];
        if (pct <= 0) return;
        const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
        addAllocation(
          {
            projectId: selectedProject.id,
            productManagerId: selectedMember.id,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
            weekStartDate: week.startDate,
            year: legacy.year,
            month: legacy.month,
            sprint: legacy.sprint,
            allocationPercentage: pct,
            allocationDays: Math.round((pct / 100) * workingDaysInWeek(week)),
            isPlanned: true,
            startDate: allocationStartDate || undefined
          },
          currentUser.email
        );
      });

      setShowAddMemberModal(false);
      setSelectedMember(null);
      setAllocationPercentage('');
      setAllocationBreakdown(false);
      setAllocationWeeklyValues([]);
      setAllocationStartDate('');
      setNumberOfSprints(1);
      setAllocationSpanMode('sprints');
      setAllocationEndDate('');
      setStaffGroupWeeks(null);
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
    
    // Determine the actual starting sprint based on start date
    let actualStartSprint = selectedSprint;
    if (allocationStartDate) {
      actualStartSprint = getSprintFromDate(allocationStartDate);
    }
    
    // Total consecutive weeks to create: either Number of Sprints × sprint length, or the
    // number of weeks from the start through the chosen end date (end-date span mode).
    const totalWeeks = allocationSpanMode === 'endDate'
      ? allocationSpanWeeks.length
      : numberOfSprints * staffOverlaySprintLength;

    if (totalWeeks > 1) {
      // Close modal and show loading state
      setShowAddMemberModal(false);
      setIsCreatingAllocations(true);

      // Write to the exact weeks the modal computed (allocationSpanWeeks) so the saved data
      // matches the preview for both "number of sprints" and "until end date" modes.
      allocationSpanWeeks.forEach(week => {
        const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
        addAllocation({
          projectId: selectedProject.id,
          productManagerId: selectedMember.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          weekStartDate: week.startDate,
          year: legacy.year,
          month: legacy.month,
          sprint: legacy.sprint,
          allocationPercentage: percentage,
          allocationDays: Math.round((percentage / 100) * workingDaysInWeek(week)),
          isPlanned: true,
          startDate: allocationStartDate || undefined
        }, currentUser.email);
      });
      
      // Wait for saves to complete, then refresh and show success
      setTimeout(async () => {
        try {
          await refreshData();
          setIsCreatingAllocations(false);
          alert(`✅ Created ${totalWeeks} week${totalWeeks > 1 ? 's' : ''} of allocations for ${selectedMember.fullName} starting from ${actualStartSprint.monthLabel} ${actualStartSprint.weekLabel}`);
        } catch (error) {
          console.error('Failed to refresh data:', error);
          setIsCreatingAllocations(false);
          alert(`⚠️ Allocations created but failed to refresh view. Please refresh the page.`);
        }
      }, 1000); // Wait 1 second for saves to complete
      
      // Reset form state
      setSelectedMember(null);
      setAllocationPercentage('');
      setAllocationBreakdown(false);
      setAllocationWeeklyValues([]);
      setAllocationStartDate('');
      setNumberOfSprints(1);
      setAllocationSpanMode('sprints');
      setAllocationEndDate('');
      return; // Exit early for multi-sprint
    } else if (staffGroupWeeks && staffGroupWeeks.length > 0) {
      // Added from a Staff View sprint-level card (2-3 week tile) — write the same
      // percentage to every underlying week in the group.
      staffGroupWeeks.forEach(week => {
        const legacy = { year: week.year, month: week.month, sprint: parseInt(week.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
        addAllocation(
          {
            projectId: selectedProject.id,
            productManagerId: selectedMember.id,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
            weekStartDate: week.startDate,
            year: legacy.year,
            month: legacy.month,
            sprint: legacy.sprint,
            allocationPercentage: percentage,
            allocationDays: Math.round((percentage / 100) * workingDaysInWeek(week)),
            isPlanned: true,
            startDate: allocationStartDate || undefined
          },
          currentUser.email
        );
      });
    } else {
      // Single week allocation
      addAllocation(
        {
          projectId: selectedProject.id,
          productManagerId: selectedMember.id,
          isoYear: actualStartSprint.isoYear,
          isoWeek: actualStartSprint.isoWeek,
          weekStartDate: actualStartSprint.weekStartDate,
          year: actualStartSprint.year,
          month: actualStartSprint.month,
          sprint: actualStartSprint.sprint,
          allocationPercentage: percentage,
          allocationDays: Math.round((percentage / 100) * workingDaysInWeek(buildWeek(new Date(actualStartSprint.weekStartDate + 'T00:00:00Z')))),
          isPlanned: true,
          startDate: allocationStartDate || undefined
        },
        currentUser.email
      );
    }

    setShowAddMemberModal(false);
    setSelectedMember(null);
    setAllocationPercentage('');
    setAllocationBreakdown(false);
    setAllocationWeeklyValues([]);
    setAllocationStartDate('');
    setNumberOfSprints(1);
    setAllocationSpanMode('sprints');
    setAllocationEndDate('');
    setStaffGroupWeeks(null);
  };

  const handleNewProjectCreated = (projectId: string) => {
    setShowNewProjectModal(false);

    // If returning to add member flow, restore context
    if (returnToAddMember && pendingMember && pendingSprint) {
      // Store the project ID and let the component re-render handle the rest
      // This avoids closure issues with the projects array
      setTimeout(() => {
        // Force a re-render by updating state, then check for the project
        setSelectedMember(pendingMember);
        setSelectedSprint(pendingSprint);
        setReturnToAddMember(false);
        setPendingMember(null);
        setPendingSprint(null);
        
        // Store the project ID to be selected when modal opens
        setSelectedProjectId(projectId);
        
        // Open Add Member modal
        setShowAddMemberModal(true);
      }, 100);
    }
  };

  const handleRemoveAllocation = (allocationId: string) => {
    const allocation = allocations.find(a => a.id === allocationId);
    if (!allocation) return;
    const week = buildWeek(new Date((allocation.weekStartDate || allocation.startDate || '') + 'T00:00:00Z'));
    openRemoveAllocationModal(allocation.productManagerId, allocation.projectId, [week]);
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
          isoYear: nextSprint.isoYear,
          isoWeek: nextSprint.isoWeek,
          weekStartDate: nextSprint.weekStartDate,
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

    // Copy project-sprint comments
    const currentCommentKey = `${project.id}-${currentSprint.year}-${currentSprint.month}-${currentSprint.sprint}`;
    const currentComment = projectSprintComments[currentCommentKey];
    
    if (currentComment && currentComment.trim() !== '') {
      const nextCommentKey = `${project.id}-${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
      setProjectSprintComments(prev => ({
        ...prev,
        [nextCommentKey]: currentComment
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

    alert('Project copied to next sprint (including allocations, capacity planning, and comments)!');
  };

  const handleCopyMemberToNextSprint = async (member: TeamMember, currentSprint: SprintInfo) => {
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

    // Copy all member allocations to next week sequentially to avoid race conditions
    for (const alloc of currentAllocs) {
      addAllocation(
        {
          projectId: alloc.projectId,
          productManagerId: alloc.productManagerId,
          isoYear: nextSprint.isoYear,
          isoWeek: nextSprint.isoWeek,
          weekStartDate: nextSprint.weekStartDate,
          year: nextSprint.year,
          month: nextSprint.month,
          sprint: nextSprint.sprint,
          allocationPercentage: alloc.allocationPercentage || 0,
          allocationDays: alloc.allocationDays || 0,
          isPlanned: true
        },
        currentUser.email
      );
      
      // Delay to prevent race conditions and ensure save completes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Refresh data from server to ensure UI shows all copied allocations
    await refreshData();

    // Mark member as explicitly added to next sprint - this will trigger a re-render
    const memberKey = `${member.id}-${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
    setExplicitlyAddedMembers(prev => {
      const newSet = new Set(prev);
      newSet.add(memberKey);
      return newSet;
    });

    alert(`${member.fullName}'s ${currentAllocs.length} allocation(s) copied to next sprint!`);
  };

  // Group-aware version: copies a member's allocations from every week in the current sprint
  // group to the same number of weeks immediately following it (Staff View sprint-level card).
  const handleCopyMemberToNextSprintGroup = async (member: TeamMember, groupWeeks: WeekInfo[]) => {
    const lastWeek = groupWeeks[groupWeeks.length - 1];
    const start = new Date(lastWeek.startDate + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (groupWeeks.length - 1) * 7);
    const nextWeeks = getWeeksInRange(start, end).slice(0, groupWeeks.length);

    let totalCopied = 0;
    for (let i = 0; i < groupWeeks.length; i++) {
      const srcWeek = groupWeeks[i];
      const destWeek = nextWeeks[i];
      if (!destWeek) continue;
      const srcAllocs = allocations.filter(a =>
        a.productManagerId === member.id && a.isoYear === srcWeek.isoYear && a.isoWeek === srcWeek.isoWeek
      );
      for (const alloc of srcAllocs) {
        const legacy = { year: destWeek.year, month: destWeek.month, sprint: parseInt(destWeek.startDate.slice(8, 10), 10) <= 15 ? 1 : 2 };
        addAllocation(
          {
            projectId: alloc.projectId,
            productManagerId: alloc.productManagerId,
            isoYear: destWeek.isoYear,
            isoWeek: destWeek.isoWeek,
            weekStartDate: destWeek.startDate,
            year: legacy.year,
            month: legacy.month,
            sprint: legacy.sprint,
            allocationPercentage: alloc.allocationPercentage || 0,
            allocationDays: alloc.allocationDays || 0,
            isPlanned: true
          },
          currentUser.email
        );
        totalCopied++;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (totalCopied === 0) {
      alert('No allocations to copy for this member');
      return;
    }

    await refreshData();
    alert(`${member.fullName}'s ${totalCopied} allocation(s) copied to the next sprint!`);
  };

  // Remove member from sprint handlers
  const handleOpenRemoveMemberModal = (member: TeamMember, sprint: SprintInfo, groupWeeks?: WeekInfo[]) => {
    setMemberToRemove({ member, sprint, groupWeeks });
    setRemoveFutureSprintsOption('current');
    setShowRemoveMemberModal(true);
  };

  const handleRemoveMemberFromSprint = async () => {
    if (!memberToRemove) return;
    
    const { member, sprint, groupWeeks } = memberToRemove;
    
    // Close modal and show loading
    setShowRemoveMemberModal(false);
    setIsCreatingAllocations(true);
    
    // Get sprints to remove from. When removing from a Staff View sprint-level card
    // (groupWeeks set), "current" means every week in that sprint group, not just one.
    const sprintsToRemove = removeFutureSprintsOption === 'future'
      ? sprints.filter(s => s.weekStartDate >= sprint.weekStartDate)
      : groupWeeks && groupWeeks.length > 0
        ? groupWeeks.map(weekToPeriod)
        : [sprint];
    
    let totalRemoved = 0;
    
    // Remove allocations from selected weeks
    for (const s of sprintsToRemove) {
      const allocsToRemove = allocations.filter(
        a => a.productManagerId === member.id &&
             a.isoYear === s.isoYear &&
             a.isoWeek === s.isoWeek
      );
      
      for (const alloc of allocsToRemove) {
        try {
          await deleteAllocation(alloc.id, currentUser.email);
          totalRemoved++;
        } catch (error) {
          console.error('Failed to delete allocation:', alloc.id, error);
        }
      }
    }
    
    // Mark member as removed from these sprints
    const newRemovedMembers = new Set(removedMembers);
    sprintsToRemove.forEach(s => {
      const removedKey = `${member.id}-${s.year}-${s.month}-${s.sprint}`;
      newRemovedMembers.add(removedKey);
    });
    setRemovedMembers(newRemovedMembers);
    
    // Reset state
    setMemberToRemove(null);
    
    // Wait for deletes to complete, then refresh and show success
    setTimeout(async () => {
      try {
        await refreshData();
        setIsCreatingAllocations(false);
        
        const sprintText = removeFutureSprintsOption === 'future' 
          ? `${sprintsToRemove.length} sprint(s)` 
          : 'this sprint';
        alert(`✅ Removed ${member.fullName} from ${sprintText} (${totalRemoved} allocation${totalRemoved !== 1 ? 's' : ''})`);
      } catch (error) {
        console.error('Failed to refresh data:', error);
        setIsCreatingAllocations(false);
        alert(`⚠️ Member removed but failed to refresh view. Please refresh the page.`);
      }
    }, 800); // Wait a bit longer for multiple deletes
  };

  // Inline editing handlers
  const startEditingAllocation = (allocationId: string, currentPercentage: number) => {
    setEditingAllocationId(allocationId);
    setEditingPercentage(currentPercentage.toString());
  };

  // Apply a percentage to a single allocation (person-days derived from its own week).
  const applyPercentageToAllocation = (allocationId: string, percentage: number) => {
    const existing = allocations.find(a => a.id === allocationId);
    const weekDays = existing?.weekStartDate
      ? workingDaysInWeek(buildWeek(new Date(existing.weekStartDate + 'T00:00:00Z')))
      : 5;
    updateAllocation(
      allocationId,
      {
        allocationPercentage: percentage,
        allocationDays: Math.round((percentage / 100) * weekDays)
      },
      currentUser.email
    );
  };

  const saveAllocationEdit = (allocationId: string) => {
    const percentage = parseInt(editingPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Please enter a valid percentage (0-100)');
      return;
    }

    // If the same member+project has later allocations, ask whether to apply this change to
    // just this week or this and all future weeks (mirrors the Puzzle View scope UX).
    const existing = allocations.find(a => a.id === allocationId);
    const futureAllocs = existing
      ? allocations.filter(a =>
          a.id !== allocationId &&
          a.projectId === existing.projectId && a.productManagerId === existing.productManagerId &&
          (a.weekStartDate || '') > (existing.weekStartDate || '')
        )
      : [];

    if (existing && futureAllocs.length > 0) {
      const member = teamMembers.find(m => m.id === existing.productManagerId);
      const project = projects.find(p => p.id === existing.projectId);
      setEditScopeOption('current');
      setEditScopeModal({
        allocationId,
        percentage,
        memberName: member?.fullName || 'this member',
        projectName: project?.projectName || 'this project',
        futureCount: futureAllocs.length,
      });
      setEditingAllocationId(null);
      setEditingPercentage('');
      return;
    }

    applyPercentageToAllocation(allocationId, percentage);
    setEditingAllocationId(null);
    setEditingPercentage('');
  };

  // Confirm the inline edit scope chosen in the modal.
  const confirmEditScope = () => {
    if (!editScopeModal) return;
    const { allocationId, percentage } = editScopeModal;
    const existing = allocations.find(a => a.id === allocationId);
    applyPercentageToAllocation(allocationId, percentage);
    if (editScopeOption === 'future' && existing) {
      allocations
        .filter(a =>
          a.id !== allocationId &&
          a.projectId === existing.projectId && a.productManagerId === existing.productManagerId &&
          (a.weekStartDate || '') > (existing.weekStartDate || '')
        )
        .forEach(a => applyPercentageToAllocation(a.id, percentage));
    }
    setEditScopeModal(null);
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

  // Group-aware comment modal for the Staff View sprint-level cards: applies the same comment
  // text to every underlying week's allocation for this member+project in the sprint group.
  const openStaffGroupCommentModal = (memberId: string, projectId: string, weeks: WeekInfo[], existingComment?: string) => {
    setStaffCommentContext({ memberId, projectId, weeks });
    setCommentText(existingComment || '');
    setShowCommentModal(true);
  };

  // Project edit handler
  const openEditProjectModal = (project: Project) => {
    setSelectedProject(project);
    setShowEditProjectModal(true);
  };

  // Remove project from sprint (removes all allocations for that project in that sprint)
  const handleRemoveProjectFromSprint = async (project: Project, sprint: SprintInfo) => {
    const allocsToRemove = allocations.filter(
      a => a.projectId === project.id && 
           a.year === sprint.year && 
           a.month === sprint.month && 
           a.sprint === sprint.sprint
    );

    const message = allocsToRemove.length > 0
      ? `Remove "${project.projectName}" and all its ${allocsToRemove.length} allocation(s) from this sprint?`
      : `Remove "${project.projectName}" from this sprint?`;

    if (!confirm(message)) {
      return;
    }
    
    // Show loading
    setIsCreatingAllocations(true);
    
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
    
    // Wait for deletes to complete, then refresh
    setTimeout(async () => {
      try {
        await refreshData();
        setIsCreatingAllocations(false);
      } catch (error) {
        console.error('Failed to refresh data:', error);
        setIsCreatingAllocations(false);
        alert('⚠️ Project removed but failed to refresh view. Please refresh the page.');
      }
    }, 500);
  };

  // Handle new project creation success
  const handleProjectCreated = (projectId: string) => {
    setShowCreateProjectModal(false);
    
    if (!selectedSprint) return;

    // Track this project as being in the sprint immediately
    const sprintKey = `${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
    const updatedSprintProjects = new Map(sprintProjects);
    if (!updatedSprintProjects.has(sprintKey)) {
      updatedSprintProjects.set(sprintKey, new Set());
    }
    updatedSprintProjects.get(sprintKey)!.add(projectId);
    setSprintProjects(updatedSprintProjects);

    // If a member is selected, we need to ask for allocation percentage
    if (selectedMember) {
      // Wait a bit for the project to be added to the projects array
      setTimeout(() => {
        const newProject = projects.find(p => p.id === projectId);
        if (newProject) {
          setSelectedProject(newProject);
          // Close Add Project modal and open Add Member modal
          setShowAddProjectModal(false);
          setShowAddMemberModal(true);
          // Focus on percentage input
          setTimeout(() => percentageInputRef.current?.focus(), 100);
        } else {
          // Fallback: close modals if project not found
          setShowAddProjectModal(false);
        }
      }, 100);
    } else {
      // No member selected, just close the modal
      setShowAddProjectModal(false);
      // Set pending project ID to trigger useEffect when project appears
      setPendingProjectId(projectId);
    }
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

  // Handle selectedProjectId for new project creation flow
  useEffect(() => {
    if (selectedProjectId && showAddMemberModal) {
      console.log('Looking for project:', selectedProjectId, 'in', projects.length, 'projects');
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        console.log('Found project:', project.customerName, '-', project.projectName);
        setSelectedProject(project);
        setNumberOfSprints(1);
        setSelectedProjectId(null);
        // Focus on percentage input
        setTimeout(() => percentageInputRef.current?.focus(), 100);
      } else {
        console.warn('Project not found:', selectedProjectId);
      }
    }
  }, [selectedProjectId, projects, showAddMemberModal]);

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
    if (staffCommentContext) {
      const { memberId, projectId, weeks } = staffCommentContext;
      weeks.forEach(week => {
        const alloc = allocations.find(a =>
          a.productManagerId === memberId && a.projectId === projectId &&
          a.isoYear === week.isoYear && a.isoWeek === week.isoWeek
        );
        if (alloc) updateAllocation(alloc.id, { comment: commentText || undefined }, currentUser.email);
      });
      setShowCommentModal(false);
      setStaffCommentContext(null);
      setCommentText('');
      return;
    }

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
    
    // Calculate total allocation
    const totalAllocation = members.reduce((sum, m) => sum + (m.percentage || 0), 0);
    
    // If no requirements set, check total allocation
    if (!requirements || Object.keys(requirements).length === 0) {
      // Red if no members OR all members at 0%
      if (members.length === 0 || totalAllocation === 0) {
        return 'bg-red-200';
      }
      return 'bg-green-50';
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

  // Toggle individual project collapse/expand
  const toggleProjectCollapse = (projectId: string) => {
    const newCollapsed = new Set(collapsedProjects);
    if (newCollapsed.has(projectId)) {
      newCollapsed.delete(projectId);
    } else {
      newCollapsed.add(projectId);
    }
    setCollapsedProjects(newCollapsed);
    
    // Update the all collapsed state
    const totalProjects = projects.filter(p => !p.isArchived).length;
    setAllProjectsCollapsed(newCollapsed.size === totalProjects);
  };

  // Toggle individual member collapse/expand
  const toggleMemberCollapse = (memberId: string) => {
    const newCollapsed = new Set(collapsedMembers);
    if (newCollapsed.has(memberId)) {
      newCollapsed.delete(memberId);
    } else {
      newCollapsed.add(memberId);
    }
    setCollapsedMembers(newCollapsed);
    
    // Update the all collapsed state
    const totalMembers = teamMembers.filter(m => m.isActive).length;
    setAllMembersCollapsed(newCollapsed.size === totalMembers);
  };

  // Initialize collapsed state when switching to projects view
  useEffect(() => {
    if (viewMode === 'projects' && allProjectsCollapsed) {
      const allProjectIds = new Set(projects.filter(p => !p.isArchived).map(p => p.id));
      setCollapsedProjects(allProjectIds);
    }
  }, [viewMode, projects, allProjectsCollapsed]);

  // Initialize collapsed state when switching to team view
  useEffect(() => {
    if (viewMode === 'team' && allMembersCollapsed) {
      const allMemberIds = new Set(teamMembers.filter(m => m.isActive).map(m => m.id));
      setCollapsedMembers(allMemberIds);
    }
  }, [viewMode, teamMembers, allMembersCollapsed]);

  // Export capacity matrix to CSV
  const exportCapacityMatrix = () => {
    // Use the same filtered data that's currently visible
    // For Puzzle View, we use the ProjectMatrixView's filtered projects
    // For other views, we use the staff view's filtered members
    const activeProjects = projects.filter(p => !p.isArchived && (p.status === 'Active' || p.status === 'Pending' || p.status === 'New Signed Off'));
    const activeMembers = teamMembers.filter(m => m.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    // Get weeks to export (current + next 7 = 8 total)
    const exportStart = new Date();
    const exportEnd = new Date(exportStart);
    exportEnd.setDate(exportEnd.getDate() + 7 * 7);
    const exportSprints = getWeeksInRange(exportStart, exportEnd).slice(0, 8).map(w => ({
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      label: `${CP_MONTH_ABBR[w.month - 1]} ${String(w.year).slice(2)} W${w.weekOfMonth}`,
    }));
    
    // Row 1: Sprint headers (merged across employee columns)
    const row1 = [''];
    exportSprints.forEach(s => {
      row1.push(s.label);
      for (let i = 1; i < activeMembers.length; i++) row1.push('');
    });
    
    // Row 2: Employee names repeated under each sprint
    const row2 = ['Activity'];
    exportSprints.forEach(() => {
      activeMembers.forEach(m => row2.push(m.fullName));
    });
    
    // Row 3: Total capacity per employee per sprint
    const row3 = ['TOTAL EMPLOYEE CAPACITY PER SPRINT'];
    exportSprints.forEach(s => {
      activeMembers.forEach(m => {
        const total = allocations
          .filter(a => a.productManagerId === m.id && a.isoYear === s.isoYear && a.isoWeek === s.isoWeek)
          .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
        row3.push(total > 0 ? `${total}%` : '');
      });
    });
    
    // Activity rows: one per project
    const activityRows: string[][] = [];
    activeProjects
      .sort((a, b) => `${a.customerName} - ${a.projectName}`.localeCompare(`${b.customerName} - ${b.projectName}`))
      .forEach(project => {
        const row = [`${project.customerName} - ${project.projectName}`];
        let hasAnyAllocation = false;
        
        exportSprints.forEach(s => {
          activeMembers.forEach(m => {
            const alloc = allocations.find(a => 
              a.projectId === project.id && 
              a.productManagerId === m.id && 
              a.isoYear === s.isoYear && a.isoWeek === s.isoWeek
            );
            const pct = alloc?.allocationPercentage || 0;
            row.push(pct > 0 ? `${pct}%` : '');
            if (pct > 0) hasAnyAllocation = true;
          });
        });
        
        // Only include projects that have at least one allocation in the exported sprints
        if (hasAnyAllocation) {
          activityRows.push(row);
        }
      });
    
    // Combine all rows
    const rows = [row1, row2, row3, ...activityRows];
    
    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Download CSV
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `capacity-matrix-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Member users see only the matrix view (which handles its own filtering)
  if (isMemberTeam) {
    return <ProjectMatrixView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Loading Overlay for Operations */}
      {isCreatingAllocations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <div className="text-lg font-semibold text-gray-900">Processing...</div>
            <div className="text-sm text-gray-600">Please wait while we save your changes</div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">Capacity Planning</h1>
            
            {/* Export Button */}
            <button
              onClick={exportCapacityMatrix}
              className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center gap-2"
              title="Export capacity matrix to Excel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Matrix
            </button>

            {/* Import Projects Button - hidden for now */}
            {false && canWrite && (
              <button
                onClick={() => setShowImportProjectsModal(true)}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
                title="Import projects from Excel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Projects
              </button>
            )}

            {/* Collapse/Expand All Button - Show in both Projects and Team view */}
            {viewMode === 'projects' && (
              <button
                onClick={() => {
                  if (allProjectsCollapsed) {
                    // Expand all
                    setCollapsedProjects(new Set());
                    setAllProjectsCollapsed(false);
                  } else {
                    // Collapse all
                    const allProjectIds = new Set(projects.filter(p => !p.isArchived).map(p => p.id));
                    setCollapsedProjects(allProjectIds);
                    setAllProjectsCollapsed(true);
                  }
                }}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
                title={allProjectsCollapsed ? "Expand all projects" : "Collapse all projects"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {allProjectsCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  )}
                </svg>
                {allProjectsCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}

            {viewMode === 'team' && (
              <button
                onClick={() => {
                  if (allMembersCollapsed) {
                    // Expand all
                    setCollapsedMembers(new Set());
                    setAllMembersCollapsed(false);
                  } else {
                    // Collapse all
                    const allMemberIds = new Set(teamMembers.filter(m => m.isActive).map(m => m.id));
                    setCollapsedMembers(allMemberIds);
                    setAllMembersCollapsed(true);
                  }
                }}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
                title={allMembersCollapsed ? "Expand all members" : "Collapse all members"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {allMembersCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  )}
                </svg>
                {allMembersCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}
            
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
            {/* Company Group Filter - applies across all views */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Group:</label>
              <select
                value={companyGroupFilter}
                onChange={(e) => setCompanyGroupFilter(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
                title="Filter members by company group"
              >
                <option value="all">All Groups</option>
                {COMPANY_GROUPS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded p-0.5">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Puzzle View
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Staff View
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timeline View
              </button>
            </div>

            {/* Filter Toggle - hidden in matrix/timeline view */}
            {viewMode !== 'matrix' && viewMode !== 'timeline' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1.5 rounded hover:bg-gray-100"
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            )}
          </div>
        </div>

        {/* Filters - hidden in matrix/timeline view (they have their own filters) */}
        {showFilters && viewMode !== 'matrix' && viewMode !== 'timeline' && (
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
                  {/* Capacity Traffic Light Filter */}
                  <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1 bg-gray-50">
                    <span className="text-[10px] text-gray-500 font-medium mr-1">Staff Capacity</span>
                    <button onClick={() => setCapacityFilter('all')}
                      className={`text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'all' ? 'bg-white shadow font-bold text-gray-800' : 'text-gray-500 hover:bg-white'}`}>All</button>
                    <button onClick={() => setCapacityFilter(capacityFilter === 'under' ? 'all' : 'under')}
                      title={`Under capacity (<${underCapacityThreshold}%)`}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'under' ? 'bg-red-100 font-bold text-red-800 shadow' : 'text-gray-400 hover:bg-red-50'}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Under
                    </button>
                    <button onClick={() => setCapacityFilter(capacityFilter === 'good' ? 'all' : 'good')}
                      title={`Good capacity (${underCapacityThreshold}-${overCapacityThreshold}%)`}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'good' ? 'bg-green-100 font-bold text-green-800 shadow' : 'text-gray-400 hover:bg-green-50'}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Good
                    </button>
                    <button onClick={() => setCapacityFilter(capacityFilter === 'over' ? 'all' : 'over')}
                      title={`Over capacity (>${overCapacityThreshold}%)`}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${capacityFilter === 'over' ? 'bg-amber-100 font-bold text-amber-800 shadow' : 'text-gray-400 hover:bg-amber-50'}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Over
                    </button>
                  </div>
                  
                  {/* Manager multi-select dropdown */}
                  <div className="relative flex items-center gap-1.5" ref={staffManagerDropdownRef}>
                    <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Manager:</span>
                    <button onClick={() => { setShowStaffManagerDropdown(!showStaffManagerDropdown); setStaffManagerSearch(''); }}
                      className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 flex items-center gap-1 min-w-[120px]">
                      <span className="truncate">
                        {staffSelectedManagerIds.size === 0
                          ? 'All Managers'
                          : staffSelectedManagerIds.size === 1
                            ? (staffSelectedManagerIds.has(UNASSIGNED_MANAGER_ID) ? 'Unassigned' : staffAvailableManagers.managers.find(m => staffSelectedManagerIds.has(m.id))?.fullName || 'Manager')
                            : `${staffSelectedManagerIds.size} managers`}
                      </span>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showStaffManagerDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-30 w-64">
                        <div className="p-2 border-b">
                          <input type="text" placeholder="Search managers..." value={staffManagerSearch}
                            onChange={e => setStaffManagerSearch(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs" autoFocus />
                        </div>
                        <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                          <button onClick={() => setStaffSelectedManagerIds(new Set(staffAvailableManagers.managers.map(m => m.id)))} className="text-[10px] text-blue-600 hover:underline font-medium">Select All</button>
                          <button onClick={() => setShowStaffManagerDropdown(false)} className="text-[10px] text-gray-500 hover:underline ml-auto">Close</button>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {staffAvailableManagers.managers
                            .filter(m => !staffManagerSearch || m.fullName.toLowerCase().includes(staffManagerSearch.toLowerCase()))
                            .map(m => {
                              const isChecked = staffSelectedManagerIds.has(m.id);
                              const directReportCount = staffAllActiveMembers.filter(member => member.managerId === m.id).length;
                              return (
                                <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs">
                                  <input type="checkbox" checked={isChecked}
                                    onChange={() => {
                                      const next = new Set(staffSelectedManagerIds);
                                      if (next.has(m.id)) { next.delete(m.id); if (next.size === 0) return; }
                                      else { next.add(m.id); }
                                      setStaffSelectedManagerIds(next);
                                      setStaffSelectedMemberIds(new Set());
                                    }}
                                    className="rounded text-blue-600" />
                                  <span className="truncate flex-1">{m.fullName}</span>
                                  <span className="text-[9px] text-gray-400 flex-shrink-0">{directReportCount} reports</span>
                                </label>
                              );
                            })}
                          {staffAvailableManagers.hasUnassigned && (
                            <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-yellow-50 cursor-pointer text-xs border-t">
                              <input type="checkbox" checked={staffSelectedManagerIds.has(UNASSIGNED_MANAGER_ID)}
                                onChange={() => {
                                  const next = new Set(staffSelectedManagerIds);
                                  if (next.has(UNASSIGNED_MANAGER_ID)) { next.delete(UNASSIGNED_MANAGER_ID); if (next.size === 0) return; }
                                  else { next.add(UNASSIGNED_MANAGER_ID); }
                                  setStaffSelectedManagerIds(next);
                                  setStaffSelectedMemberIds(new Set());
                                }}
                                className="rounded text-yellow-600" />
                              <span className="truncate flex-1 text-yellow-700">Unassigned (no manager)</span>
                              <span className="text-[9px] text-gray-400 flex-shrink-0">{staffAllActiveMembers.filter(m => !m.managerId).length}</span>
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Employee multi-select dropdown */}
                  <div className="relative flex items-center gap-1.5" ref={staffMemberDropdownRef}>
                    <button onClick={() => { setShowStaffMemberDropdown(!showStaffMemberDropdown); setStaffMemberSearch(''); }}
                      className="px-2 py-1 border rounded text-xs bg-white hover:bg-gray-50 flex items-center gap-1 min-w-[130px]">
                      <span className="truncate">
                        {staffSelectedMemberIds.size === 0
                          ? `All Employees (${staffEligibleMembers.length})`
                          : `${staffDisplayedMembers.length} of ${staffEligibleMembers.length} selected`}
                      </span>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showStaffMemberDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-30 w-64">
                        <div className="p-2 border-b">
                          <input type="text" placeholder="Search employees..." value={staffMemberSearch}
                            onChange={e => setStaffMemberSearch(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-xs" autoFocus />
                        </div>
                        <div className="px-2 py-1 border-b flex gap-2 bg-gray-50">
                          <button onClick={() => setStaffSelectedMemberIds(new Set())} className="text-[10px] text-blue-600 hover:underline font-medium">Select All</button>
                          <button onClick={() => setStaffSelectedMemberIds(new Set(['__none__']))} className="text-[10px] text-blue-600 hover:underline font-medium">Deselect All</button>
                          <button onClick={() => setShowStaffMemberDropdown(false)} className="text-[10px] text-gray-500 hover:underline ml-auto">Close</button>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {staffEligibleMembers
                            .filter(m => !staffMemberSearch || m.fullName.toLowerCase().includes(staffMemberSearch.toLowerCase()))
                            .map(m => {
                              const isChecked = staffSelectedMemberIds.size === 0 || staffSelectedMemberIds.has(m.id);
                              return (
                                <label key={m.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs">
                                  <input type="checkbox" checked={isChecked}
                                    onChange={() => {
                                      if (staffSelectedMemberIds.size === 0) {
                                        setStaffSelectedMemberIds(new Set([m.id]));
                                      } else if (staffSelectedMemberIds.has(m.id)) {
                                        const next = new Set(staffSelectedMemberIds);
                                        next.delete(m.id);
                                        if (next.size === 0 || next.has('__none__')) setStaffSelectedMemberIds(new Set());
                                        else setStaffSelectedMemberIds(next);
                                      } else {
                                        const next = new Set(staffSelectedMemberIds);
                                        next.delete('__none__');
                                        next.add(m.id);
                                        if (next.size === staffEligibleMembers.length) setStaffSelectedMemberIds(new Set());
                                        else setStaffSelectedMemberIds(next);
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

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="flex-1">
          <ProjectMatrixView companyGroupFilter={companyGroupFilter} />
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="flex-1">
          <TimelineView companyGroupFilter={companyGroupFilter} />
        </div>
      )}

      {/* Sprint Columns */}
      {viewMode !== 'matrix' && viewMode !== 'timeline' && (
      <div className="flex-1">
        {/* Sprint navigation for Staff View */}
        {viewMode === 'team' && (
          <div className="flex items-center gap-1 px-6 pt-4 pb-2">
            <button onClick={() => { setTeamSprintOffset(o => o - 4); if (expandedSprint) setTeamExpandedMode(true); }} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Back 4 weeks">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => { setTeamSprintOffset(o => o - 1); if (expandedSprint) setTeamExpandedMode(true); }} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Back 1 week">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => { setTeamSprintOffset(0); if (expandedSprint) setTeamExpandedMode(true); }} className="px-2 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-200" title="Go to current week">Today</button>
            <button onClick={() => { setTeamSprintOffset(o => o + 1); if (expandedSprint) setTeamExpandedMode(true); }} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Forward 1 week">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => { setTeamSprintOffset(o => o + 4); if (expandedSprint) setTeamExpandedMode(true); }} className="p-1 rounded hover:bg-gray-200 text-gray-600" title="Forward 4 weeks">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
            {teamSprintOffset !== 0 && (
              <span className="text-[10px] text-gray-400 ml-2">{teamSprintOffset > 0 ? `+${teamSprintOffset}` : teamSprintOffset} weeks from today</span>
            )}
            {/* Week / Sprint display level — toggle temporarily disabled, Sprint is always shown */}
            {VIEW_LEVEL_TOGGLE_ENABLED && (
              <div className="flex items-center border rounded-lg overflow-hidden ml-3">
                <button onClick={() => setStaffViewLevel('week')}
                  className={`px-2.5 py-1 text-[11px] font-medium ${staffViewLevel === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Week
                </button>
                <button onClick={() => setStaffViewLevel('sprint')}
                  className={`px-2.5 py-1 text-[11px] font-medium ${staffViewLevel === 'sprint' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Sprint
                </button>
              </div>
            )}
          </div>
        )}
        {/* Leveled header + week-tiles share one horizontal-scroll container with fixed pixel
            column widths, so the Month/Week/Sprint bands always line up with the tiles below. */}
        <div className={expandedSprint ? "p-6" : "overflow-x-auto"}>
        <div className={expandedSprint ? "" : "px-6 pt-1"} style={expandedSprint ? undefined : { minWidth: 'fit-content' }}>
        {viewMode === 'team' && staffViewLevel === 'sprint' && !expandedSprint ? (
          <div className="flex pb-6" style={{ gap: STAFF_COL_GAP }}>
            {staffSprintPeriodGroups.map(({ sprint, periods }, sIdx) => {
              const aggMembers = getMembersForSprintGroup(periods);
              const isGroupExpanded = expandedStaffGroup === sIdx;
              const isGroupHidden = expandedStaffGroup !== null && !isGroupExpanded;
              if (isGroupHidden) return null;
              return (
                <div key={sIdx} className={`bg-white rounded-xl border border-gray-100 ${isGroupExpanded ? 'w-full' : 'flex-shrink-0'}`}
                  style={!isGroupExpanded ? { width: STAFF_COL_WIDTH } : undefined}>
                  <div className="px-4 py-2.5 border-b-2 border-blue-300 bg-blue-100 flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-blue-800">
                        {getSprintDateLabel(sprint)} <span className="text-xs font-semibold text-blue-600">{getSprintYearLabel(sprint)}</span>
                      </h3>
                      <p className="text-sm font-bold text-blue-800 mt-0.5">{getSprintDayRangeLabel(sprint)} <span className="text-[10px] font-normal text-blue-500">· {aggMembers.length} Member{aggMembers.length !== 1 ? 's' : ''}</span></p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="p-1 rounded hover:bg-blue-200"
                        title={isGroupExpanded ? "Restore to normal view" : "Expand sprint view"}
                        onClick={() => setExpandedStaffGroup(isGroupExpanded ? null : sIdx)}
                      >
                        {isGroupExpanded ? (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>
                      {canWrite && (
                        <button
                          className="p-1 rounded hover:bg-blue-200"
                          title="Add member to sprint"
                          onClick={() => handleAddProjectToMemberGroup(null, periods, sprint.weeks)}
                        >
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={isGroupExpanded ? "p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "p-3 space-y-2.5"}>
                    {aggMembers.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm col-span-full">No team members allocated</div>
                    ) : (
                      aggMembers.map(({ member, projects: memberProjects, total, varies }) => (
                        <div key={member.id} className={`group border border-gray-100 rounded-xl bg-white hover:border-gray-200 hover:shadow-sm transition-all ${collapsedMembers.has(member.id) ? 'px-3 py-2' : 'p-3'}`}>
                          {/* Member Header */}
                          <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; toggleMemberCollapse(member.id); }}>
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-gray-900">{member.fullName}</div>
                              {member.role && <div className="text-[10px] text-gray-400">{member.role}</div>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-right flex items-center gap-1">
                                <div>
                                  <div className={`text-xs font-bold ${total > ((member.capacity ?? 100) * overCapacityThreshold / 100) ? 'text-amber-500' : total < ((member.capacity ?? 100) * underCapacityThreshold / 100) ? 'text-red-500' : total === 0 ? 'text-gray-300' : 'text-green-600'}`}>{total}%</div>
                                  <div className="text-[9px] text-gray-400">of {member.capacity ?? 100}%</div>
                                </div>
                                {varies && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Total varies by week within this sprint" />}
                              </div>
                              <button
                                onClick={() => toggleMemberCollapse(member.id)}
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-300"
                                title={collapsedMembers.has(member.id) ? "Expand member" : "Collapse member"}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {collapsedMembers.has(member.id) ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  )}
                                </svg>
                              </button>
                            </div>
                          </div>

                          {!collapsedMembers.has(member.id) && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-100 rounded-full h-1 mb-2.5">
                                <div className={`h-1 rounded-full ${total > ((member.capacity ?? 100) * overCapacityThreshold / 100) ? 'bg-amber-400' : total < ((member.capacity ?? 100) * underCapacityThreshold / 100) ? 'bg-red-400' : total === 0 ? 'bg-gray-200' : 'bg-green-400'}`} style={{ width: `${Math.min(total, member.capacity ?? 100) / (member.capacity ?? 100) * 100}%` }}></div>
                              </div>
                              {canWrite && (
                                <div className="flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleAddProjectToMemberGroup(member, periods, sprint.weeks)}
                                    className="p-0.5 rounded hover:bg-green-50 text-green-500"
                                    title="Add project to member"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleCopyMemberToNextSprintGroup(member, sprint.weeks)}
                                    className="p-0.5 rounded hover:bg-blue-50 text-blue-500"
                                    title="Copy member allocations to next sprint"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleOpenRemoveMemberModal(member, periods[0], sprint.weeks)}
                                    className="p-0.5 rounded hover:bg-red-50 text-red-400"
                                    title="Remove member from sprint"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              {/* Projects List */}
                              <div className="space-y-1">
                                {memberProjects.sort((a: any, b: any) => b.percentage - a.percentage).map((p: any) => {
                                  const projectObj = projects.find(pr => pr.id === p.id);
                                  return (
                                    <div key={p.id} className="flex justify-between items-center text-xs py-1 px-2 gap-2 rounded-lg bg-gray-50 hover:bg-gray-100/60 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <button
                                          onClick={() => projectObj && openEditProjectModal(projectObj)}
                                          className="text-[11px] font-medium text-gray-700 hover:text-blue-600 hover:underline"
                                        >
                                          {p.customerName}
                                        </button>
                                        <span className="text-[11px] text-gray-300 mx-1">-</span>
                                        <button
                                          onClick={() => projectObj && openEditProjectModal(projectObj)}
                                          className="text-[11px] text-gray-500 hover:text-blue-600 hover:underline"
                                        >
                                          {p.projectName}
                                        </button>
                                        <span className="ml-2 text-[11px] text-blue-600 font-semibold">{p.percentage}%</span>
                                        {p.varies && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Varies by week — click to view/edit each week" />}
                                        {p.comment && <span className="ml-1 text-blue-500" title={p.comment}>💬</span>}
                                      </div>
                                      {canWrite && (
                                        <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => openStaffGroupCommentModal(member.id, p.id, sprint.weeks, p.comment)}
                                            className="p-0.5 rounded hover:bg-blue-100 text-blue-600"
                                            title="Comment"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => setStaffSpanEditor({
                                              memberId: member.id,
                                              projectId: p.id,
                                              weeks: sprint.weeks,
                                              title: `${p.customerName} - ${p.projectName} → ${member.fullName} | ${getSprintTitleLabel(sprint)}`,
                                            })}
                                            className="p-0.5 rounded hover:bg-yellow-100 text-yellow-600"
                                            title="Edit (per-week breakdown)"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleRemoveAllocationGroup(member.id, p.id, sprint.weeks)}
                                            className="p-0.5 rounded hover:bg-red-100 text-red-600"
                                            title="Remove"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <div className="flex pb-6" style={{ gap: STAFF_COL_GAP }}>
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
                className={`bg-white rounded-xl border border-gray-100 ${
                  isExpanded 
                    ? 'w-full' 
                    : 'flex-shrink-0'
                }`}
                style={!isExpanded ? { width: STAFF_COL_WIDTH } : undefined}
              >
                {/* Sprint Header */}
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">
                        {getSprintDatePeriod(sprint)}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {viewMode === 'projects' 
                          ? `${projectsData.length} Project${projectsData.length !== 1 ? 's' : ''}`
                          : `${membersData.length} Member${membersData.length !== 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {/* Daily Task View - hidden */}
                      {false && (
                      <button 
                        className="p-1.5 rounded hover:bg-gray-50" 
                        title="Daily Task View"
                        onClick={() => {
                          setDailyViewSprint(sprint);
                          setShowDailyView(true);
                        }}
                      >
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      )}
                      <button 
                        className="p-1 rounded hover:bg-gray-50" 
                        title={isExpanded ? "Restore to normal view" : "Expand sprint view"}
                        onClick={() => { setExpandedSprint(isExpanded ? null : sprintKey); setTeamExpandedMode(!isExpanded); }}
                      >
                        {isExpanded ? (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>
                      {canWrite && (
                        <button 
                          className="p-1 rounded hover:bg-gray-50" 
                          title={viewMode === 'projects' ? "Add project to sprint" : "Add member to sprint"}
                          onClick={() => viewMode === 'projects' ? handleAddProjectToSprint(sprint) : handleAddMemberToSprint(sprint)}
                        >
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sprint Content - Projects View */}
                {viewMode === 'projects' && (
                  <div className={isExpanded ? "p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "p-3 space-y-2.5"}>
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
                          className={`border rounded-xl hover:border-gray-200 hover:shadow-sm transition-all bg-white ${
                            highlightedProjectId === project.id 
                              ? 'border-blue-500 border-4 shadow-lg animate-pulse' 
                              : 'border-gray-100'
                          } ${collapsedProjects.has(project.id) ? 'px-3 py-2' : 'p-3'}`}
                        >
                          {/* Project Header - Always Visible */}
                          <div className="flex justify-between items-center">
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
                            
                            {/* Collapse/Expand Toggle */}
                            <button
                              onClick={() => toggleProjectCollapse(project.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 ml-2"
                              title={collapsedProjects.has(project.id) ? "Expand project" : "Collapse project"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {collapsedProjects.has(project.id) ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                )}
                              </svg>
                            </button>
                          </div>

                          {/* Expandable Content */}
                          {!collapsedProjects.has(project.id) && (
                            <div className="mt-2">
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
                              
                              {/* Members List */}
                              <div className="space-y-1 mt-2">
                            {members.sort((a, b) => b.percentage - a.percentage).map((member) => {
                              const alloc = allocations.find(a => a.id === member.allocationId);
                              const isEditing = editingAllocationId === member.allocationId;
                              
                              // Multi-sprint badge logic
                              const isMultiSprint = alloc?.groupTotalSprints && alloc.groupTotalSprints > 1;
                              const isGroupStart = alloc?.isGroupStart;
                              const currentIndex = alloc?.groupCurrentIndex || 1;
                              const totalSprints = alloc?.groupTotalSprints || 1;
                              
                              // Debug logging for multi-sprint allocations
                              if (alloc && (alloc.allocationGroupId || alloc.groupTotalSprints)) {
                                console.log('Multi-sprint allocation found:', {
                                  memberId: member.id,
                                  memberName: member.fullName,
                                  allocationId: alloc.id,
                                  allocationGroupId: alloc.allocationGroupId,
                                  isGroupStart: alloc.isGroupStart,
                                  groupStartSprint: alloc.groupStartSprint,
                                  groupTotalSprints: alloc.groupTotalSprints,
                                  groupCurrentIndex: alloc.groupCurrentIndex,
                                  isMultiSprint,
                                  willShowBadge: isMultiSprint && isGroupStart
                                });
                              }
                              
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
                                <div key={member.allocationId} className="flex justify-between items-center text-xs py-1 px-2 gap-2 rounded-lg bg-gray-50 hover:bg-gray-100/60 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      {isOverAllocated && (
                                        <span 
                                          className="text-red-600 font-bold" 
                                          title={`${teamMember?.role} capacity exceeds planning`}
                                        >
                                          ❗
                                        </span>
                                      )}
                                      {isMultiSprint && isGroupStart && (
                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-medium" title="Multi-sprint allocation start">
                                          🎬
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
                                      {(() => {
                                        console.log('START DATE DEBUG:', {
                                          memberName: member.fullName,
                                          allocationId: member.allocationId,
                                          hasAlloc: !!alloc,
                                          startDate: alloc?.startDate,
                                          editingId: editingStartDateAllocationId
                                        });
                                        return null;
                                      })()}
                                      {/* Set date - hidden */}
                                      {false && (editingStartDateAllocationId === member.allocationId ? (
                                        <input
                                          type="date"
                                          value={editingStartDateValue}
                                          onChange={(e) => setEditingStartDateValue(e.target.value)}
                                          onBlur={() => {
                                            if (alloc) {
                                              updateAllocation(alloc.id, { startDate: editingStartDateValue || undefined }, currentUser.email);
                                            }
                                            setEditingStartDateAllocationId(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              if (alloc) {
                                                updateAllocation(alloc.id, { startDate: editingStartDateValue || undefined }, currentUser.email);
                                              }
                                              setEditingStartDateAllocationId(null);
                                            } else if (e.key === 'Escape') {
                                              setEditingStartDateAllocationId(null);
                                            }
                                          }}
                                          className="ml-1 text-[10px] px-1 py-0.5 border rounded"
                                          autoFocus
                                        />
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingStartDateAllocationId(member.allocationId);
                                            setEditingStartDateValue(alloc?.startDate || '');
                                          }}
                                          className="ml-2 text-green-600 text-xs font-semibold hover:bg-green-50 px-1.5 py-0.5 rounded border border-green-300"
                                          title={alloc?.startDate ? `Start: ${new Date(alloc!.startDate as string).toLocaleDateString()} (click to edit)` : 'Click to set start date'}
                                        >
                                          📅 {alloc?.startDate ? new Date(alloc!.startDate as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set date'}
                                        </button>
                                      ))}
                                    </div>
                                    {isMultiSprint && (
                                      <div className="text-[10px] text-gray-600 mt-0.5">
                                        Sprint {currentIndex} of {totalSprints}
                                        {alloc?.groupStartSprint && (
                                          <span className="ml-1 text-gray-500">
                                            • Started {alloc.groupStartSprint}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {canWrite && (
                                    <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          )}
                        </div>
                      );
                      })
                    )}
                  </div>
                )}

                {/* Sprint Content - Team View */}
                {viewMode === 'team' && (
                  <div className={isExpanded ? "p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "p-3 space-y-2.5"}>
                    {membersData.length === 0 ? (
                      <div className="text-center text-gray-400 py-8 text-sm col-span-full">
                        No team members allocated
                      </div>
                    ) : (
                      membersData.map(({ member, projects: memberProjects, total }) => (
                        <div key={member.id} className={`group border border-gray-100 rounded-xl bg-white hover:border-gray-200 hover:shadow-sm transition-all ${collapsedMembers.has(member.id) ? 'px-3 py-2' : 'p-3'}`}>
                          {/* Member Header - Always Visible */}
                          <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; toggleMemberCollapse(member.id); }}>
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-gray-900">{member.fullName}</div>
                              {member.role && (
                                <div className="text-[10px] text-gray-400">{member.role}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-right">
                                <div className={`text-xs font-bold ${total > ((member.capacity ?? 100) * overCapacityThreshold / 100) ? 'text-amber-500' : total < ((member.capacity ?? 100) * underCapacityThreshold / 100) ? 'text-red-500' : total === 0 ? 'text-gray-300' : 'text-green-600'}`}>{total}%</div>
                                <div className="text-[9px] text-gray-400">of {member.capacity ?? 100}%</div>
                              </div>
                              {/* Collapse/Expand Toggle */}
                              <button
                                onClick={() => toggleMemberCollapse(member.id)}
                                className="p-0.5 rounded hover:bg-gray-100 text-gray-300"
                                title={collapsedMembers.has(member.id) ? "Expand member" : "Collapse member"}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {collapsedMembers.has(member.id) ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  )}
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Expandable Content */}
                          {!collapsedMembers.has(member.id) && (
                            <div className="mt-2">
                              {/* Capacity Progress Bar */}
                              <div className="w-full bg-gray-100 rounded-full h-1 mb-2.5">
                                <div className={`h-1 rounded-full ${total > ((member.capacity ?? 100) * overCapacityThreshold / 100) ? 'bg-amber-400' : total < ((member.capacity ?? 100) * underCapacityThreshold / 100) ? 'bg-red-400' : total === 0 ? 'bg-gray-200' : 'bg-green-400'}`} style={{width: `${Math.min(total, member.capacity ?? 100) / (member.capacity ?? 100) * 100}%`}}></div>
                              </div>
                                {canWrite && (
                                  <div className="flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setSelectedSprint(sprint);
                                        setShowAddProjectModal(true);
                                      }}
                                      className="p-0.5 rounded hover:bg-green-50 text-green-500"
                                      title="Add project to member"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleCopyMemberToNextSprint(member, sprint)}
                                      className="p-0.5 rounded hover:bg-blue-50 text-blue-500"
                                      title="Copy member allocations to next sprint"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleOpenRemoveMemberModal(member, sprint)}
                                      className="p-0.5 rounded hover:bg-red-50 text-red-400"
                                      title="Remove member from sprint"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              
                              {/* Projects List */}
                              <div className="space-y-1">
                            {memberProjects.sort((a, b) => b.percentage - a.percentage).map((proj) => {
                              const projectObj = projects.find(p => p.id === proj.id);
                              const alloc = allocations.find(a => a.id === proj.allocationId);
                              const isEditing = editingAllocationId === proj.allocationId;
                              
                              return (
                                <div key={proj.allocationId} className="flex justify-between items-center text-xs py-1 px-2 gap-2 rounded-lg bg-gray-50 hover:bg-gray-100/60 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <button
                                      onClick={() => projectObj && openEditProjectModal(projectObj)}
                                      className="text-[11px] font-medium text-gray-700 hover:text-blue-600 hover:underline"
                                    >
                                      {proj.customerName}
                                    </button>
                                    <span className="text-[11px] text-gray-300 mx-1">-</span>
                                    <button
                                      onClick={() => projectObj && openEditProjectModal(projectObj)}
                                      className="text-[11px] text-gray-500 hover:text-blue-600 hover:underline"
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
                                      <span className="ml-2 text-[11px] text-blue-600 font-semibold">{proj.percentage}%</span>
                                    )}
                                    {alloc?.comment && (
                                      <span className="ml-1 text-blue-500" title={alloc.comment}>💬</span>
                                    )}
                                    {/* Start Date - hidden */}
                                    {false && (editingStartDateAllocationId === proj.allocationId ? (
                                      <input
                                        type="date"
                                        value={editingStartDateValue}
                                        onChange={(e) => setEditingStartDateValue(e.target.value)}
                                        onBlur={() => {
                                          if (alloc) {
                                            updateAllocation(alloc.id, { startDate: editingStartDateValue || undefined }, currentUser.email);
                                          }
                                          setEditingStartDateAllocationId(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            if (alloc) {
                                              updateAllocation(alloc.id, { startDate: editingStartDateValue || undefined }, currentUser.email);
                                            }
                                            setEditingStartDateAllocationId(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingStartDateAllocationId(null);
                                          }
                                        }}
                                        className="ml-1 text-[10px] px-1 py-0.5 border rounded"
                                        autoFocus
                                      />
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingStartDateAllocationId(proj.allocationId);
                                          setEditingStartDateValue(alloc?.startDate || '');
                                        }}
                                        className="ml-2 text-green-600 text-xs font-semibold hover:bg-green-50 px-1.5 py-0.5 rounded border border-green-300"
                                        title={alloc?.startDate ? `Start: ${new Date(alloc!.startDate as string).toLocaleDateString()} (click to edit)` : 'Click to set start date'}
                                      >
                                        📅 {alloc?.startDate ? new Date(alloc!.startDate as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set date'}
                                      </button>
                                    ))}
                                  </div>
                                  {canWrite && (
                                    <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        </div>
        </div>
      </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setSelectedMember(null);
          setSelectedProject(null);
          setSelectedRoleFilter(null);
          setAllocationPercentage('');
          setAllocationBreakdown(false);
          setAllocationWeeklyValues([]);
          setAllocationSpanMode('sprints');
          setAllocationEndDate('');
          setNumberOfSprints(1);
          setStaffGroupWeeks(null);
        }}
        title={selectedProject && selectedMember 
          ? `Add ${selectedMember.fullName} to ${selectedProject.customerName} - ${selectedProject.projectName}`
          : selectedProject && selectedRoleFilter
            ? `Add ${selectedRoleFilter} to ${selectedProject.customerName} - ${selectedProject.projectName}`
            : selectedProject 
            ? `Add Member to ${selectedProject.customerName} - ${selectedProject.projectName}`
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
                const filteredMembers = teamMembers
                  .filter(m => m.isActive && (!selectedRoleFilter || m.role === selectedRoleFilter))
                  .sort((a, b) => a.fullName.localeCompare(b.fullName));
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
                      // Focus project dropdown after member is selected
                      setTimeout(() => projectSelectRef.current?.focus(), 100);
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
                  ref={projectSelectRef}
                  value={''}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      // Save context
                      setPendingMember(selectedMember);
                      setPendingSprint(selectedSprint);
                      setReturnToAddMember(true);
                      // Close add member modal
                      setShowAddMemberModal(false);
                      // Open project creation modal
                      setShowNewProjectModal(true);
                    } else {
                      const project = projects.find(p => p.id === e.target.value);
                      setSelectedProject(project || null);
                      // Focus percentage input after project is selected
                      setTimeout(() => percentageInputRef.current?.focus(), 100);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a project...</option>
                  <option value="__CREATE_NEW__" className="font-semibold text-green-600">+ Create New Project</option>
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
            <>
              {allocationIsMultiWeek && (
                <label className="flex items-center gap-2 -mb-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allocationBreakdown}
                    onChange={(e) => setAllocationBreakdown(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs font-medium text-gray-700">Weekly breakdown</span>
                  <span className="text-[10px] text-gray-400">(set each week individually)</span>
                </label>
              )}
              {allocationUseBreakdown ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation % per week
                  </label>
                  <div className="space-y-2">
                    {allocationSpanWeeks.map((w, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-700">
                          <div className="font-medium">{getWeekLabel(w)}</div>
                          <div className="text-[10px] text-gray-400">{getWeekDayRangeLabel(w)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="100"
                            value={allocationWeeklyValues[i] ?? ''}
                            onChange={(e) => setAllocationWeeklyValues(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                            className="w-20 px-2 py-1.5 border rounded text-sm text-right"
                            placeholder="0"
                            autoFocus={i === 0}
                          />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation %
                    {selectedRoleFilter && selectedProject && selectedSprint && (() => {
                      const requirementKey = `${selectedProject.id}-${selectedSprint.year}-${selectedSprint.month}-${selectedSprint.sprint}`;
                      const requirements = sprintRoleRequirements[requirementKey];
                      const plannedCapacity = requirements?.[selectedRoleFilter];
                      return plannedCapacity ? <span className="text-purple-600 ml-1">(Planned: {plannedCapacity}%)</span> : null;
                    })()}
                    {allocationIsMultiWeek && (
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">(applies to all {allocationSpanWeeks.length} weeks)</span>
                    )}
                  </label>
                  <input
                    ref={percentageInputRef}
                    type="number"
                    min="0"
                    max="100"
                    value={allocationPercentage}
                    onChange={(e) => setAllocationPercentage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedMember && selectedProject && allocationPercentage && allocationSpanWeeks.length <= 1) {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter percentage (0-100)"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={allocationStartDate}
                  onChange={(e) => setAllocationStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When does this allocation start?
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                  <span className="ml-1.5 text-[11px] font-normal text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                    {staffOverlaySprintLength}-week sprint
                  </span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationSpanMode"
                      value="sprints"
                      checked={allocationSpanMode === 'sprints'}
                      onChange={() => setAllocationSpanMode('sprints')}
                    />
                    <span className="text-sm text-gray-700">Number of sprints</span>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={numberOfSprints}
                      disabled={allocationSpanMode !== 'sprints'}
                      onChange={(e) => {
                        const num = parseInt(e.target.value) || 1;
                        setNumberOfSprints(Math.max(1, Math.min(52, num)));
                      }}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                      placeholder="1"
                    />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="allocationSpanMode"
                      value="endDate"
                      checked={allocationSpanMode === 'endDate'}
                      onChange={() => setAllocationSpanMode('endDate')}
                    />
                    <span className="text-sm text-gray-700">Until end date</span>
                    <input
                      type="date"
                      value={allocationEndDate}
                      disabled={allocationSpanMode !== 'endDate'}
                      min={(allocationStartDate || selectedSprint?.weekStartDate) || undefined}
                      onChange={(e) => setAllocationEndDate(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {allocationSpanMode === 'endDate'
                    ? `Creates ${allocationSpanWeeks.length} week${allocationSpanWeeks.length !== 1 ? 's' : ''} of consecutive weekly allocations through the end date.`
                    : `Creates ${numberOfSprints} sprint${numberOfSprints > 1 ? 's' : ''} = ${numberOfSprints * staffOverlaySprintLength} week${numberOfSprints * staffOverlaySprintLength > 1 ? 's' : ''} of consecutive weekly allocations.`}
                </p>
              </div>
              
            </>
          )}
          <div className="flex justify-between gap-2">
            <p className="text-xs text-gray-500 self-center">
              {!selectedProject
                ? 'Project and allocation percentage are required'
                : allocationUseBreakdown
                  ? 'Enter a percentage for at least one week'
                  : 'Allocation percentage is required'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedMember(null);
                  setSelectedProject(null);
                  setAllocationPercentage('');
                  setAllocationBreakdown(false);
                  setAllocationWeeklyValues([]);
                  setAllocationSpanMode('sprints');
                  setAllocationEndDate('');
                  setNumberOfSprints(1);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedMember || !selectedProject || (allocationUseBreakdown ? !allocationWeeklyValues.some(v => parseInt(v, 10) > 0) : !allocationPercentage)}
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
                ? `Select a project for ${selectedMember.fullName} in ${selectedSprint && `${selectedSprint.monthLabel} ${selectedSprint.weekLabel} (${formatDDMM(selectedSprint.weekStartDate)})`}`
                : `Select a project to add to ${selectedSprint && `${selectedSprint.monthLabel} ${selectedSprint.weekLabel} (${formatDDMM(selectedSprint.weekStartDate)})`}`}
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
          
          {/* Info message when adding project without member */}
          {!selectedMember && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-gray-500 text-center">
                Click a project above to add it to the sprint without assigning members
              </p>
            </div>
          )}
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
        title={`Project Comment - ${selectedProject?.projectName || ''} (${selectedSprint ? `${selectedSprint.monthLabel} ${selectedSprint.weekLabel}` : ''})`}
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
          setStaffCommentContext(null);
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
                setStaffCommentContext(null);
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
        title={`Required Capacity Planning - ${selectedProject?.projectName || ''} (${selectedSprint ? `${selectedSprint.monthLabel} ${selectedSprint.weekLabel}` : ''})`}
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
                      {memberToRemove.groupWeeks && memberToRemove.groupWeeks.length > 1
                        ? `${memberToRemove.sprint.monthLabel} (${memberToRemove.groupWeeks.length} weeks)`
                        : `${memberToRemove.sprint.monthLabel} ${memberToRemove.sprint.weekLabel}`}
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
                      {memberToRemove.groupWeeks && memberToRemove.groupWeeks.length > 1
                        ? `Remove member only from this sprint's ${memberToRemove.groupWeeks.length} weeks`
                        : `Remove member only from ${memberToRemove.sprint.monthLabel} ${memberToRemove.sprint.weekLabel}`}
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

      {/* Edit Allocation Scope Modal (inline % edit: this week only vs this + future) */}
      <Modal
        isOpen={!!editScopeModal}
        onClose={() => setEditScopeModal(null)}
        title="Edit Allocation"
      >
        {editScopeModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Set <span className="font-semibold">{editScopeModal.memberName}</span>'s allocation to{' '}
                <span className="font-semibold">{editScopeModal.projectName}</span> to{' '}
                <span className="font-semibold">{editScopeModal.percentage}%</span>.
              </p>
              <p className="text-xs text-gray-600 mt-1">
                There {editScopeModal.futureCount === 1 ? 'is' : 'are'} {editScopeModal.futureCount} later
                allocation{editScopeModal.futureCount !== 1 ? 's' : ''} for this member on this project.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Apply to</label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="editScopeOption" value="current"
                  checked={editScopeOption === 'current'}
                  onChange={() => setEditScopeOption('current')} className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm text-gray-900">This allocation only</div>
                  <div className="text-xs text-gray-600">Update just this week</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="editScopeOption" value="future"
                  checked={editScopeOption === 'future'}
                  onChange={() => setEditScopeOption('future')} className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm text-gray-900">This and all future allocations</div>
                  <div className="text-xs text-gray-600">
                    Update this and every later week for this member on this project
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button onClick={() => setEditScopeModal(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={confirmEditScope}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove Allocation Modal */}
      <Modal
        isOpen={showRemoveAllocationModal}
        onClose={() => {
          setShowRemoveAllocationModal(false);
          setAllocationToRemove(null);
        }}
        title="Remove Allocation"
      >
        {allocationToRemove && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Are you sure?</h4>
                  <p className="text-sm text-gray-700">
                    You are about to remove <span className="font-semibold">{allocationToRemove.memberName}</span>'s
                    allocation to <span className="font-semibold">{allocationToRemove.projectName}</span> for{' '}
                    <span className="font-semibold">{allocationToRemove.weekLabel}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Remove:</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="removeAllocationOption"
                    value="current"
                    checked={removeFutureAllocationsOption === 'current'}
                    onChange={(e) => setRemoveFutureAllocationsOption(e.target.value as 'current' | 'future')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">This allocation only</div>
                    <div className="text-xs text-gray-600">
                      Remove only the selected allocation for {allocationToRemove.weekLabel}
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="removeAllocationOption"
                    value="future"
                    checked={removeFutureAllocationsOption === 'future'}
                    onChange={(e) => setRemoveFutureAllocationsOption(e.target.value as 'current' | 'future')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">This and all future allocations</div>
                    <div className="text-xs text-gray-600">
                      Remove this allocation and every later allocation of {allocationToRemove.memberName} to {allocationToRemove.projectName}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => {
                  setShowRemoveAllocationModal(false);
                  setAllocationToRemove(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveAllocation}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove Allocation
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

      {/* New Project Modal - from Add Member dropdown */}
      <Modal
        isOpen={showNewProjectModal}
        onClose={() => {
          setShowNewProjectModal(false);
          if (returnToAddMember) {
            // User cancelled, restore add member modal
            setShowAddMemberModal(true);
            setReturnToAddMember(false);
          }
        }}
        title="Create New Project"
      >
        <ProjectForm
          onSuccess={handleNewProjectCreated}
          onCancel={() => {
            setShowNewProjectModal(false);
            if (returnToAddMember) {
              // User cancelled, restore add member modal
              setShowAddMemberModal(true);
              setReturnToAddMember(false);
            }
          }}
        />
      </Modal>

      {/* Daily Task View Modal */}
      {showDailyView && dailyViewSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => {
            setShowDailyView(false);
            setDailyViewSprint(null);
          }} />
          <div className="relative bg-white rounded-lg shadow-xl w-full h-full m-2 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Daily Tasks - {dailyViewSprint.monthLabel} {dailyViewSprint.weekLabel}
              </h2>
              <button 
                onClick={() => {
                  setShowDailyView(false);
                  setDailyViewSprint(null);
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
          <DailyTaskView
            sprint={dailyViewSprint}
            onClose={() => {
              setShowDailyView(false);
              setDailyViewSprint(null);
            }}
          />
            </div>
          </div>
        </div>
      )}

      {/* Import Projects Modal */}
      <Modal isOpen={showImportProjectsModal} onClose={() => setShowImportProjectsModal(false)} title="Import Projects from Excel">
        <ImportProjects onComplete={() => setShowImportProjectsModal(false)} />
      </Modal>

      {/* Staff View sprint-level per-week sub-editor (mirrors Puzzle View's WeekSpanEditor) */}
      {staffSpanEditor && (
        <WeekSpanEditor
          title={staffSpanEditor.title}
          weeks={staffSpanEditor.weeks}
          initialValues={getMemberProjectWeeklyPcts(staffSpanEditor.memberId, staffSpanEditor.projectId, staffSpanEditor.weeks)}
          onSave={(values, scope) => saveStaffSpanEditor(staffSpanEditor.memberId, staffSpanEditor.projectId, staffSpanEditor.weeks, values, scope)}
          onDelete={(scope) => clearStaffSpanEditor(staffSpanEditor.memberId, staffSpanEditor.projectId, staffSpanEditor.weeks, scope)}
          onClose={() => setStaffSpanEditor(null)}
        />
      )}
    </div>
  );
}
