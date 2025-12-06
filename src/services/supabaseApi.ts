import { supabase, isSupabaseEnabled } from './supabase';
import { DatabaseData } from './api';

// Supabase API functions - only used when Supabase is enabled

export async function fetchAllDataFromSupabase(): Promise<DatabaseData> {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase is not configured');
  }

  console.log('📥 Fetching data from Supabase...');

  // Fetch all data in parallel
  const [teamMembersRes, projectsRes, allocationsRes, historyRes, resourceTypesRes, teamsRes] = await Promise.all([
    supabase.from('team_members').select('*').order('created_at', { ascending: false }),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').order('created_at', { ascending: false }),
    supabase.from('allocation_history').select('*').order('changed_at', { ascending: false }),
    supabase.from('resource_types').select('*').order('created_at', { ascending: false }),
    supabase.from('teams').select('*').order('created_at', { ascending: false }),
  ]);

  // Check for errors (teams table is optional for backward compatibility)
  if (teamMembersRes.error) throw teamMembersRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (allocationsRes.error) throw allocationsRes.error;
  if (historyRes.error) throw historyRes.error;
  if (resourceTypesRes.error) throw resourceTypesRes.error;
  // Teams table might not exist yet - log warning but don't fail
  if (teamsRes.error) {
    console.warn('⚠️ Teams table not found - using empty array. Run migration to create it.');
  }

  // Transform Supabase data to match our format
  let resourceRoles = (resourceTypesRes.data || []).map(transformResourceType);
  
  // If no resource types exist, extract unique roles from team members
  if (resourceRoles.length === 0 && teamMembersRes.data && teamMembersRes.data.length > 0) {
    console.warn('⚠️ No resource types found - extracting from team members');
    const uniqueRoles = new Set<string>();
    teamMembersRes.data.forEach((member: any) => {
      if (member.role) uniqueRoles.add(member.role);
    });
    
    resourceRoles = Array.from(uniqueRoles).map(roleName => ({
      id: crypto.randomUUID(),
      name: roleName,
      isArchived: false,
      createdAt: new Date().toISOString(),
    }));
    
    console.log('✅ Extracted resource types from members:', resourceRoles.length);
  }
  
  const data: DatabaseData = {
    teamMembers: (teamMembersRes.data || []).map(transformTeamMember),
    projects: (projectsRes.data || []).map(transformProject),
    allocations: (allocationsRes.data || []).map(transformAllocation),
    history: (historyRes.data || []).map(transformHistory),
    resourceRoles: resourceRoles,
    teams: teamsRes.error ? [] : (teamsRes.data || []).map(transformTeam),
  };

  console.log('✅ Data loaded from Supabase:', {
    teamMembers: data.teamMembers.length,
    projects: data.projects.length,
    allocations: data.allocations.length,
    history: data.history.length,
    resourceTypes: data.resourceRoles?.length || 0,
    teams: data.teams?.length || 0,
  });

  return data;
}

export async function saveTeamMembersToSupabase(teamMembers: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving team members to Supabase...');

  // Delete all existing and insert new (upsert)
  const { error } = await supabase
    .from('team_members')
    .upsert(teamMembers.map(transformTeamMemberToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ Team members saved');
}

export async function saveProjectsToSupabase(projects: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving projects to Supabase...');

  const { error } = await supabase
    .from('projects')
    .upsert(projects.map(transformProjectToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ Projects saved');
}

export async function saveAllocationsToSupabase(allocations: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving allocations to Supabase...');

  const { error } = await supabase
    .from('allocations')
    .upsert(allocations.map(transformAllocationToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ Allocations saved');
}

export async function deleteAllocationFromSupabase(allocationId: string): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('🗑️ Deleting allocation from Supabase:', allocationId);

  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('id', allocationId);

  if (error) {
    console.error('❌ Failed to delete allocation:', error);
    throw new Error(`Failed to delete allocation: ${error.message}`);
  }
  console.log('✅ Allocation deleted from Supabase');
}

export async function saveHistoryToSupabase(history: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving history to Supabase...', history.length, 'entries');

  const transformedHistory = history.map(transformHistoryToSupabase);
  console.log('📝 Transformed history sample:', transformedHistory[transformedHistory.length - 1]);

  const { error } = await supabase
    .from('allocation_history')
    .upsert(transformedHistory, { onConflict: 'id' });

  if (error) {
    console.error('❌ History save error:', error);
    throw new Error(`Failed to save history: ${error.message}`);
  }
  console.log('✅ History saved');
}

export async function saveResourceTypesToSupabase(resourceTypes: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving resource types to Supabase...');

  const { error } = await supabase
    .from('resource_types')
    .upsert(resourceTypes.map(transformResourceTypeToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ Resource types saved');
}

export async function getTeamsFromSupabase(): Promise<string[]> {
  if (!isSupabaseEnabled() || !supabase) return [];

  console.log('📥 Fetching teams from Supabase...');

  const { data, error } = await supabase
    .from('teams')
    .select('name')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (error) {
    console.warn('⚠️ Teams table not found or error loading teams:', error.message);
    // Fallback: extract unique teams from team_members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('teams');
    
    if (membersError) {
      console.error('Failed to load teams from members:', membersError);
      return [];
    }
    
    // Extract unique team names from all members
    const uniqueTeams = new Set<string>();
    (members || []).forEach((member: any) => {
      if (Array.isArray(member.teams)) {
        member.teams.forEach((team: string) => {
          if (team) uniqueTeams.add(team);
        });
      }
    });
    
    const teamNames = Array.from(uniqueTeams).sort();
    console.log('✅ Teams loaded from members:', teamNames.length);
    return teamNames;
  }
  
  const teamNames = (data || []).map(t => t.name);
  console.log('✅ Teams loaded:', teamNames.length);
  return teamNames;
}

export async function saveTeamsToSupabase(teams: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving teams to Supabase...');

  const { error } = await supabase
    .from('teams')
    .upsert(teams.map(transformTeamToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ Teams saved');
}

// Create automatic backup in Supabase
export async function createSupabaseBackup(): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('📦 Creating Supabase backup...');

  const { error } = await supabase.rpc('create_automatic_backup');

  if (error) {
    console.warn('⚠️ Backup creation failed:', error.message);
  } else {
    console.log('✅ Backup created successfully');
  }
}

// Transform functions: Supabase (snake_case) <-> App (camelCase)

function transformTeamMember(data: any): any {
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    teams: Array.isArray(data.teams) ? data.teams : (data.teams || []),
    managerId: data.manager_id || null,
    isActive: data.is_active ?? true,
    createdAt: data.created_at,
  };
}

function transformTeamMemberToSupabase(data: any): any {
  return {
    id: data.id,
    full_name: data.fullName,
    email: data.email,
    role: data.role,
    teams: Array.isArray(data.teams) ? data.teams : (data.teams || []),
    manager_id: data.managerId || null,
    is_active: data.isActive ?? true,
    created_at: data.createdAt || new Date().toISOString(),
  };
}

function transformProject(data: any): any {
  return {
    id: data.id,
    customerName: data.customer_name,
    projectName: data.project_name,
    projectType: data.project_type,
    status: data.status,
    maxCapacityPercentage: data.max_capacity_percentage,
    pmoContact: data.pmo_contact,
    isArchived: data.is_archived,
    comment: data.comment,
    createdAt: data.created_at,
  };
}

function transformProjectToSupabase(data: any): any {
  return {
    id: data.id,
    customer_name: data.customerName,
    project_name: data.projectName,
    project_type: data.projectType,
    status: data.status,
    max_capacity_percentage: data.maxCapacityPercentage,
    pmo_contact: data.pmoContact,
    is_archived: data.isArchived,
    comment: data.comment,
    created_at: data.createdAt,
  };
}

function transformAllocation(data: any): any {
  return {
    id: data.id,
    projectId: data.project_id,
    productManagerId: data.product_manager_id,
    year: data.year,
    month: data.month,
    sprint: data.sprint,
    allocationPercentage: data.allocation_percentage,
    allocationDays: data.allocation_days,
    comment: data.comment,
    createdAt: data.created_at,
    createdBy: data.created_by,
  };
}

function transformAllocationToSupabase(data: any): any {
  return {
    id: data.id,
    project_id: data.projectId,
    product_manager_id: data.productManagerId,
    year: data.year,
    month: data.month,
    sprint: data.sprint,
    allocation_percentage: data.allocationPercentage,
    allocation_days: data.allocationDays,
    comment: data.comment,
    created_at: data.createdAt,
    created_by: data.createdBy,
  };
}

function transformHistory(data: any): any {
  return {
    id: data.id,
    allocationId: data.allocation_id,
    changedBy: data.changed_by,
    changedAt: data.changed_at,
    changeType: data.change_type,
    oldValue: data.old_value,
    newValue: data.new_value,
  };
}

function transformHistoryToSupabase(data: any): any {
  return {
    id: data.id,
    allocation_id: data.allocationId,
    changed_by: data.changedBy,
    changed_at: data.changedAt,
    change_type: data.changeType,
    old_value: data.oldValue || null,
    new_value: data.newValue || null,
  };
}

function transformResourceType(data: any): any {
  return {
    id: data.id,
    name: data.name,
    isArchived: data.is_archived,
    createdAt: data.created_at,
  };
}

function transformResourceTypeToSupabase(data: any): any {
  return {
    id: data.id,
    name: data.name,
    is_archived: data.isArchived,
    created_at: data.createdAt,
  };
}

function transformTeam(data: any): any {
  return {
    id: data.id,
    name: data.name,
    isArchived: data.is_archived,
    createdAt: data.created_at,
  };
}

function transformTeamToSupabase(data: any): any {
  return {
    id: data.id,
    name: data.name,
    is_archived: data.isArchived,
    created_at: data.createdAt,
  };
}
