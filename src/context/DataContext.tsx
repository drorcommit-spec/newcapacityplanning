import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { TeamMember, Project, SprintAllocation, AllocationHistory } from '../types';
import { fetchAllData, saveTeamMembers, saveProjects, saveAllocation, deleteAllocationById, saveHistoryEntry } from '../services/api';

interface DataContextType {
  teamMembers: TeamMember[];
  projects: Project[];
  allocations: SprintAllocation[];
  history: AllocationHistory[];
  sprintProjects: Record<string, string[]>;
  sprintRoleRequirements: Record<string, Record<string, number>>;
  isSaving: boolean;
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
  const [isSaving, setIsSaving] = useState(false);
  // Retained for cancellation guards in legacy member/project flows; allocation persistence
  // no longer uses a bulk debounced save.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs mirroring allocations/history, mutated synchronously on every add/update/delete.
  // This avoids a stale-closure bug: several flows (multi-week allocation spans) call
  // addAllocation multiple times in a synchronous loop. If those calls read `allocations`
  // from React state (captured at render time), each call overwrites the previous one's
  // optimistic update instead of building on it — only the last item in the loop would show
  // up locally until a manual refresh, even though every item was saved to the server.
  // Reading/writing via a ref instead means each call in the loop sees the previous call's
  // result immediately, regardless of when React re-renders.
  const allocationsRef = useRef<SprintAllocation[]>([]);
  const historyRef = useRef<AllocationHistory[]>([]);

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
        allocationsRef.current = data.allocations;
        historyRef.current = data.history;
        setSprintProjects(data.sprintProjects || {});
        setSprintRoleRequirements(data.sprintRoleRequirements || {});
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load data from server:', error);
        alert(`Failed to connect to server: ${error.message}. Make sure the backend is running on http://localhost:3002`);
        setIsLoading(false);
      });
  }, []);

  const addTeamMember = (member: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...teamMembers, newMember];
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save for team member addition');
    }
    
    // IMMEDIATE SAVE for team member additions
    console.log('💾 Saving new team member immediately...');
    setIsSaving(true);
    
    saveTeamMembers(updated)
      .then(() => {
        console.log('✅ Team members saved successfully');
        setIsSaving(false);
      })
      .catch(err => {
        console.error('❌ Failed to save team members:', err);
        alert(`Failed to save new team member: ${err.message}`);
        setIsSaving(false);
      });
    
    // Update state after initiating save
    setTeamMembers(updated);
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    const updated = teamMembers.map(m => m.id === id ? { ...m, ...updates } : m);
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save for team member update');
    }
    
    // IMMEDIATE SAVE for team member updates
    console.log('💾 Saving team member update immediately...');
    setIsSaving(true);
    
    saveTeamMembers(updated)
      .then(() => {
        console.log('✅ Team members saved successfully');
        setIsSaving(false);
      })
      .catch(err => {
        console.error('❌ Failed to save team members:', err);
        alert(`Failed to save team member update: ${err.message}`);
        setIsSaving(false);
      });
    
    // Update state after initiating save
    setTeamMembers(updated);
  };

  const addProject = (project: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...projects, newProject];
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save for project addition');
    }
    
    // IMMEDIATE SAVE for project additions
    console.log('💾 Saving new project immediately...');
    setIsSaving(true);
    
    saveProjects(updated)
      .then(() => {
        console.log('✅ Projects saved successfully');
        setIsSaving(false);
      })
      .catch(err => {
        console.error('❌ Failed to save projects:', err);
        alert(`Failed to save new project: ${err.message}`);
        setIsSaving(false);
      });
    
    // Update state after initiating save
    setProjects(updated);
    return newProject.id;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save for project update');
    }
    
    // IMMEDIATE SAVE for project updates
    console.log('💾 Saving project update immediately...');
    setIsSaving(true);
    
    saveProjects(updated)
      .then(() => {
        console.log('✅ Projects saved successfully');
        setIsSaving(false);
      })
      .catch(err => {
        console.error('❌ Failed to save projects:', err);
        alert(`Failed to save project update: ${err.message}`);
        setIsSaving(false);
      });
    
    // Update state after initiating save
    setProjects(updated);
  };

  const addAllocation = (allocation: Omit<SprintAllocation, 'id' | 'createdAt' | 'createdBy'>, createdBy: string) => {
    console.log('🎯 addAllocation CALLED with:', allocation, 'by:', createdBy);
    
    const newAllocation: SprintAllocation = {
      ...allocation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy,
    };
    
    console.log('🎯 Created new allocation:', newAllocation);
    
    const historyEntry: AllocationHistory = {
      id: crypto.randomUUID(),
      allocationId: newAllocation.id,
      changedBy: createdBy,
      changedAt: new Date().toISOString(),
      changeType: 'created',
      newValue: newAllocation,
    };
    
    // Read/write via the ref so consecutive calls within the same synchronous loop
    // (multi-week allocation spans) build on each other instead of racing.
    const updated = [...allocationsRef.current, newAllocation];
    const updatedHistory = [...historyRef.current, historyEntry];
    allocationsRef.current = updated;
    historyRef.current = updatedHistory;
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save');
    }
    
    // Persist only the new rows, not the complete allocation/history tables.
    console.log('💾 Saving new allocation immediately...');
    setIsSaving(true);
    saveAllocation(newAllocation, updated)
      .then(() => saveHistoryEntry(historyEntry, updatedHistory))
      .then(() => setIsSaving(false))
      .catch(err => {
        console.error('❌ Failed to save:', err);
        alert(`Failed to save allocation: ${err.message}`);
        setIsSaving(false);
      });
    
    // Reflect the ref's current value in React state so the UI re-renders immediately.
    setAllocations(updated);
    setHistory(updatedHistory);
  };

  const updateAllocation = (id: string, updates: Partial<SprintAllocation>, changedBy: string) => {
    const oldAllocation = allocationsRef.current.find(a => a.id === id);
    if (!oldAllocation) return;
    const changedAllocation = { ...oldAllocation, ...updates };
    const updated = allocationsRef.current.map(a => a.id === id ? changedAllocation : a);
    allocationsRef.current = updated;
    setAllocations(updated);

    const historyEntry: AllocationHistory = {
      id: crypto.randomUUID(),
      allocationId: id,
      changedBy,
      changedAt: new Date().toISOString(),
      changeType: 'updated',
      oldValue: oldAllocation,
      newValue: changedAllocation,
    };
    const updatedHistory = [...historyRef.current, historyEntry];
    historyRef.current = updatedHistory;
    setHistory(updatedHistory);

    setIsSaving(true);
    Promise.all([
      saveAllocation(changedAllocation, updated),
      saveHistoryEntry(historyEntry, updatedHistory),
    ]).then(() => setIsSaving(false)).catch(err => {
      console.error('❌ Failed to update allocation:', err);
      alert(`Failed to update allocation: ${err.message}`);
      setIsSaving(false);
    });
  };

  const deleteAllocation = (id: string, deletedBy: string) => {
    const oldAllocation = allocationsRef.current.find(a => a.id === id);
    if (!oldAllocation) {
      console.warn(`⚠️ Allocation ${id} not found for deletion`);
      return;
    }
    
    console.log(`🗑️ Deleting allocation ${id}:`, oldAllocation);
    
    const historyEntry: AllocationHistory = {
      id: crypto.randomUUID(),
      allocationId: id,
      changedBy: deletedBy,
      changedAt: new Date().toISOString(),
      changeType: 'deleted',
      oldValue: oldAllocation,
    };
    
    const previousAllocations = allocationsRef.current;
    const previousHistory = historyRef.current;
    const updatedHistory = [...previousHistory, historyEntry];
    const filtered = previousAllocations.filter(a => a.id !== id);
    allocationsRef.current = filtered;
    historyRef.current = updatedHistory;
    
    console.log(`📊 Allocations after delete: ${filtered.length} (was ${previousAllocations.length})`);
    
    // Cancel any pending debounced save to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      console.log('🚫 Cancelled pending debounced save');
    }
    
    // IMMEDIATE SAVE for deletions
    console.log('💾 Deleting allocation from database immediately...');
    setIsSaving(true);
    
    // Delete the allocation, then persist only this audit entry.
    deleteAllocationById(id, filtered)
      .then(() => saveHistoryEntry(historyEntry, updatedHistory))
      .then(() => {
        console.log('✅ Allocation deleted from database');
        setIsSaving(false);
      })
      .catch(err => {
        console.error('❌ Failed to delete:', err);
        // Show error and revert state
        alert(`Failed to delete allocation: ${err.message}`);
        setIsSaving(false);
        // Revert the deletion
        allocationsRef.current = previousAllocations;
        historyRef.current = previousHistory;
        setAllocations(previousAllocations);
        setHistory(previousHistory);
      });
    
    // Update state optimistically
    setAllocations(filtered);
    setHistory(updatedHistory);
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
      allocationsRef.current = data.allocations;
      historyRef.current = data.history;
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
      isSaving,
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
