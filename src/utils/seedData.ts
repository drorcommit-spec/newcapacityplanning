import { TeamMember } from '../types';

export const initialTeamMembers: Omit<TeamMember, 'id' | 'createdAt'>[] = [
  {
    fullName: 'Dror',
    email: 'drors@comm-it.com',
    role: 'Product Operations Manager',
    isActive: true,
  },
];

export function seedInitialData() {
  const existingMembers = localStorage.getItem('teamMembers');
  
  // Only seed if no data exists
  if (!existingMembers || JSON.parse(existingMembers).length === 0) {
    const members = initialTeamMembers.map(member => ({
      ...member,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    
    localStorage.setItem('teamMembers', JSON.stringify(members));
    console.log('✅ Initial data seeded successfully');
    return true;
  }
  
  return false;
}
