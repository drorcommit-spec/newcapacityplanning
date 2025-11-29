import { isSupabaseEnabled } from './supabase';
import {
  fetchAllDataFromSupabase,
  saveTeamMembersToSupabase,
  saveProjectsToSupabase,
  saveAllocationsToSupabase,
  saveHistoryToSupabase,
  createSupabaseBackup,
} from './supabaseApi';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3002/api';

export interface DatabaseData {
  teamMembers: any[];
  projects: any[];
  allocations: any[];
  history: any[];
  sprintProjects?: Record<string, string[]>;
  sprintRoleRequirements?: Record<string, Record<string, number>>;
  resourceRoles?: any[];
  teams?: any[];
}

export async function fetchAllData(): Promise<DatabaseData> {
  // Use Supabase if enabled (production), otherwise use JSON file (local)
  if (isSupabaseEnabled()) {
    console.log('🌐 Using Supabase for data storage');
    return fetchAllDataFromSupabase();
  }

  // Local development: use JSON file via backend
  console.log('📁 Using JSON file for data storage');
  
  // If no API URL, return empty data (localStorage mode)
  if (!API_URL) {
    return {
      teamMembers: [],
      projects: [],
      allocations: [],
      history: [],
    };
  }
  
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

export async function saveTeamMembers(teamMembers: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    await saveTeamMembersToSupabase(teamMembers);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/teamMembers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teamMembers),
  });
  if (!response.ok) throw new Error('Failed to save team members');
}

export async function saveProjects(projects: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    await saveProjectsToSupabase(projects);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projects),
  });
  if (!response.ok) throw new Error('Failed to save projects');
}

export async function saveAllocations(allocations: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    await saveAllocationsToSupabase(allocations);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allocations),
  });
  if (!response.ok) throw new Error('Failed to save allocations');
}

export async function saveHistory(history: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    await saveHistoryToSupabase(history);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history),
  });
  if (!response.ok) throw new Error('Failed to save history');
}

// Create backup (works for both Supabase and JSON)
export async function createBackup(): Promise<void> {
  if (isSupabaseEnabled()) {
    await createSupabaseBackup();
  }
  // JSON backups are automatic in the backend
}

// Save sprint projects
export async function saveSprintProjects(sprintProjects: Record<string, string[]>): Promise<void> {
  // Supabase support can be added later if needed
  if (isSupabaseEnabled()) {
    console.warn('Sprint projects not yet supported in Supabase');
    return;
  }

  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/sprintProjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sprintProjects),
  });
  if (!response.ok) throw new Error('Failed to save sprint projects');
}

// Save sprint role requirements
export async function saveSprintRoleRequirements(sprintRoleRequirements: Record<string, Record<string, number>>): Promise<void> {
  // Supabase support can be added later if needed
  if (isSupabaseEnabled()) {
    console.warn('Sprint role requirements not yet supported in Supabase');
    return;
  }

  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/sprintRoleRequirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sprintRoleRequirements),
  });
  if (!response.ok) throw new Error('Failed to save sprint role requirements');
}

// Save resource roles
export async function saveResourceRoles(resourceRoles: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    const { saveResourceTypesToSupabase } = await import('./supabaseApi');
    await saveResourceTypesToSupabase(resourceRoles);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/resourceRoles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resourceRoles),
  });
  if (!response.ok) throw new Error('Failed to save resource roles');
}

// Save teams
export async function saveTeams(teams: any[]): Promise<void> {
  // Use Supabase if enabled (production)
  if (isSupabaseEnabled()) {
    const { saveTeamsToSupabase } = await import('./supabaseApi');
    await saveTeamsToSupabase(teams);
    return;
  }

  // Local development: use JSON file via backend
  if (!API_URL) return;
  
  const response = await fetch(`${API_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teams),
  });
  if (!response.ok) throw new Error('Failed to save teams');
}
