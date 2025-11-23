const API_URL = 'http://localhost:3002/api';

export interface DatabaseData {
  teamMembers: any[];
  projects: any[];
  allocations: any[];
  history: any[];
}

export async function fetchAllData(): Promise<DatabaseData> {
  const response = await fetch(`${API_URL}/data`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

export async function saveTeamMembers(teamMembers: any[]): Promise<void> {
  const response = await fetch(`${API_URL}/teamMembers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teamMembers),
  });
  if (!response.ok) throw new Error('Failed to save team members');
}

export async function saveProjects(projects: any[]): Promise<void> {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projects),
  });
  if (!response.ok) throw new Error('Failed to save projects');
}

export async function saveAllocations(allocations: any[]): Promise<void> {
  const response = await fetch(`${API_URL}/allocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allocations),
  });
  if (!response.ok) throw new Error('Failed to save allocations');
}

export async function saveHistory(history: any[]): Promise<void> {
  const response = await fetch(`${API_URL}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history),
  });
  if (!response.ok) throw new Error('Failed to save history');
}
