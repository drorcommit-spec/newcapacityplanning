import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export function usePermissions() {
  const { user } = useAuth();
  const { teamMembers } = useData();

  // Find the current user's full member data
  const currentMember = teamMembers.find(m => m.id === user?.id);

  // Debug logging
  console.log('🔐 Permission Check:', {
    userId: user?.id,
    userEmail: user?.email,
    currentMember: currentMember,
    currentMemberId: currentMember?.id,
    currentMemberEmail: currentMember?.email,
    teams: currentMember?.teams,
    teamMembersCount: teamMembers.length,
  });

  // Check if user has any teams assigned
  const hasNoTeams = !currentMember?.teams || currentMember.teams.length === 0;

  // Check if user belongs to "Member" team (case-insensitive)
  const isMemberTeam = currentMember?.teams?.some(
    team => team.toLowerCase() === 'member'
  ) ?? false;

  // Check if user belongs to "Management" team (case-insensitive)
  const isManagementTeam = currentMember?.teams?.some(
    team => team.toLowerCase() === 'management'
  ) ?? false;

  // Check if user belongs to "Operations" team (case-insensitive)
  const isOperationsTeam = currentMember?.teams?.some(
    team => team.toLowerCase() === 'operations'
  ) ?? false;

  console.log('🔐 Teams:', { hasNoTeams, isMemberTeam, isManagementTeam, isOperationsTeam });

  // Permission rules:
  // - Users with NO teams = read-only access to everything
  // - Users in "Member" team = read-only access to everything
  // - Users in "Operations" team = can manage Projects but NOT Allocations, NOT Members/Teams/Resource Types
  // - Users in "Management" team = can manage Projects and Allocations but not Members/Teams/Resource Types
  // - All other users = full access (Admin)
  const canManageMembers = !hasNoTeams && !isMemberTeam && !isManagementTeam && !isOperationsTeam;
  const canManageTeams = !hasNoTeams && !isMemberTeam && !isManagementTeam && !isOperationsTeam;
  const canManageResourceTypes = !hasNoTeams && !isMemberTeam && !isManagementTeam && !isOperationsTeam;
  const canManageProjects = !hasNoTeams && !isMemberTeam; // Management and Operations CAN manage projects
  const canManageAllocations = !hasNoTeams && !isMemberTeam && !isOperationsTeam; // Operations CANNOT manage allocations

  console.log('🔐 Final Permissions:', {
    canWrite: canManageAllocations,
    canManageMembers,
    canManageTeams,
    canManageResourceTypes,
    canManageProjects,
    canManageAllocations,
    isReadOnly: hasNoTeams || isMemberTeam,
  });

  return {
    canWrite: canManageAllocations, // For backward compatibility - used for allocations
    canEdit: canManageAllocations, // For backward compatibility
    isReadOnly: hasNoTeams || isMemberTeam,
    hasNoTeams,
    isMemberTeam,
    isManagementTeam,
    isOperationsTeam,
    canManageMembers,
    canManageTeams,
    canManageResourceTypes,
    canManageProjects,
    canManageAllocations,
  };
}
