import { supabase, isSupabaseEnabled } from './supabase';
import { DatabaseData } from './api';

// Supabase API functions - only used when Supabase is enabled

export async function fetchAllDataFromSupabase(): Promise<DatabaseData> {
  if (!isSupabaseEnabled() || !supabase) {
    throw new Error('Supabase is not configured');
  }

  console.log('📥 Fetching data from Supabase...');

  // Fetch all data in parallel
  const [teamMembersRes, projectsRes, allocationsRes, historyRes] = await Promise.all([
    supabase.from('team_members').select('*').order('created_at', { ascending: false }),
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').order('created_at', { ascending: false }),
    supabase.from('allocation_history').select('*').order('changed_at', { ascending: false }),
  ]);

  // Check for errors
  if (teamMembersRes.error) throw teamMembersRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (allocationsRes.error) throw allocationsRes.error;
  if (historyRes.error) throw historyRes.error;

  // Transform Supabase data to match our format
  const data: DatabaseData = {
    teamMembers: (teamMembersRes.data || []).map(transformTeamMember),
    projects: (projectsRes.data || []).map(transformProject),
    allocations: (allocationsRes.data || []).map(transformAllocation),
    history: (historyRes.data || []).map(transformHistory),
  };

  console.log('✅ Data loaded from Supabase:', {
    teamMembers: data.teamMembers.length,
    projects: data.projects.length,
    allocations: data.allocations.length,
    history: data.history.length,
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

export async function saveHistoryToSupabase(history: any[]): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) return;

  console.log('💾 Saving history to Supabase...');

  const { error } = await supabase
    .from('allocation_history')
    .upsert(history.map(transformHistoryToSupabase), { onConflict: 'id' });

  if (error) throw error;
  console.log('✅ History saved');
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
    team: data.team,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

function transformTeamMemberToSupabase(data: any): any {
  return {
    id: data.id,
    full_name: data.fullName,
    email: data.email,
    role: data.role,
    team: data.team,
    is_active: data.isActive,
    created_at: data.createdAt,
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
    old_value: data.oldValue,
    new_value: data.newValue,
  };
}
