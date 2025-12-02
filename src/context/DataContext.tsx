import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { TeamMember, Project, SprintAllocation, AllocationHistory } from '../types';
import { fetchAllData, saveTeamMembers, saveProjects, saveAllocations, saveHistory } from '../services/api';

interface DataContextType {
  teamMembers: TeamMember[];
  projects: Project[];
  allocations: SprintAllocation[];
  history: AllocationHistory[];
  sprintProjects: Record<string, string[]>;
  sprintRoleRequirements: Record<string, Record<string, number>>;
  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addAllocation: (allocation: Omit<SprintAllocation, 'id' | 'createdAt' | 'createdBy'>, createdBy: string) => void;
  updateAllocation: (id: string, updates: Partial<SprintAllocation>, changedBy: string) => void;
  deleteAllocation: (id: string, deletedBy: string) => void;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<SprintAllocation[]>([]);
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [sprintProjects, setSprintProjects] = useState<Record<string, string[]>>({});
  const [sprintRoleRequirements, setSprintRoleRequirements] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load data from server on mount
  useEffect(() => {
    console.log('Fetching data from server...');
    fetchAllData()
      .then(data => {
        console.log('Data loaded successfully:', data);
        setTeamMembers(data.teamMembers);
        setProjects(data.projects);
        setAllocations(data.allocations);
        setHistory(data.history);
        setSprintProjects(data.sprintProjects || {});
        setSprintRoleRequirements(data.sprintRoleRequirements || {});
        setIsLoading(false);
        // Set hasLoaded after a small delay to ensure all state is set
        setTimeout(() => setHasLoaded(true), 100);
      })
      .catch(error => {
        console.error('Failed to load data from server:', error);
        alert(`Failed to connect to server: ${error.message}. Make sure the backend is running on http://localhost:3002`);
        setIsLoading(false);
      });
  }, []);

  // Debounced save - saves all data together to prevent partial saves
  useEffect(() => {
    if (!hasLoaded) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Reduced debounce to 200ms for faster saves
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Saving all data to server...');
      Promise.all([
        saveTeamMembers(teamMembers),
        saveProjects(projects),
        saveAllocations(allocations),
        saveHistory(history),
      ])
        .then(() => {
          console.log('✅ All data saved successfully');
          setIsSaving(false);
        })
        .catch(err => {
          console.error('❌ Error saving data:', err);
          setIsSaving(false);
        });
    }, 200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [teamMembers, projects, allocations, history, hasLoaded]);

  const addTeamMember = (member: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTeamMembers(prev => [...prev, newMember]);
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    return newProject.id;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addAllocation = (allocation: Omit<SprintAllocation, 'id' | 'createdAt' | 'createdBy'>, createdBy: string) => {
    const newAllocation: SprintAllocation = {
      ...allocation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy,
    };
    setAllocations(prev => [...prev, newAllocation]);
    
    const historyEntry: AllocationHistory = {
      id: crypto.randomUUID(),
      allocationId: newAllocation.id,
      changedBy: createdBy,
      changedAt: new Date().toISOString(),
      changeType: 'created',
      newValue: newAllocation,
    };
    setHistory(prev => [...prev, historyEntry]);
  };

  const updateAllocation = (id: string, updates: Partial<SprintAllocation>, changedBy: string) => {
    const oldAllocation = allocations.find(a => a.id === id);
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    
    if (oldAllocation) {
      const historyEntry: AllocationHistory = {
        id: crypto.randomUUID(),
        allocationId: id,
        changedBy,
        changedAt: new Date().toISOString(),
        changeType: 'updated',
        oldValue: oldAllocation,
        newValue: { ...oldAllocation, ...updates },
      };
      setHistory(prev => [...prev, historyEntry]);
    }
  };

  const deleteAllocation = (id: string, deletedBy: string) => {
    const oldAllocation = allocations.find(a => a.id === id);
    setAllocations(prev => prev.filter(a => a.id !== id));
    
    if (oldAllocation) {
      const historyEntry: AllocationHistory = {
        id: crypto.randomUUID(),
        allocationId: id,
        changedBy: deletedBy,
        changedAt: new Date().toISOString(),
        changeType: 'deleted',
        oldValue: oldAllocation,
      };
      setHistory(prev => [...prev, historyEntry]);
    }
  };

  const refreshData = async () => {
    console.log('🔄 Refreshing data from server...');
    try {
      const data = await fetchAllData();
      console.log('✅ Data refreshed successfully');
      setTeamMembers(data.teamMembers);
      setProjects(data.projects);
      setAllocations(data.allocations);
      setHistory(data.history);
      setSprintProjects(data.sprintProjects || {});
      setSprintRoleRequirements(data.sprintRoleRequirements || {});
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading...</div>
          <div className="text-gray-600 mt-2">Connecting to database</div>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{
      teamMembers,
      projects,
      allocations,
      history,
      sprintProjects,
      sprintRoleRequirements,
      addTeamMember,
      updateTeamMember,
      addProject,
      updateProject,
      addAllocation,
      updateAllocation,
      deleteAllocation,
      refreshData,
    }}>
      {children}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </div>
      )}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
