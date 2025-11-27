import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getUserPermissions } from '../types';

type ViewMode = 'projects' | 'team';
type CapacityFilter = 'all' | 'under' | 'over' | 'good';

export default function CapacityPlanning() {
  const { teamMembers, projects, allocations } = useData();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const permissions = getUserPermissions(currentUser.role);
  const canWrite = permissions.includes('write');

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [showFilters, setShowFilters] = useState(true);
  const [sprintCount, setSprintCount] = useState(3); // Default 3 sprints

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('all');
  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);

  // Generate sprint timeline
  const sprints = useMemo(() => {
    const result = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    // Calculate current sprint (assuming 2 sprints per month)
    const currentSprint = Math.ceil((today.getDate() / 30) * 2);
    
    let year = currentYear;
    let month = currentMonth;
    let sprint = currentSprint;

    for (let i = 0; i < sprintCount; i++) {
      result.push({ year, month, sprint });
      
      // Move to next sprint
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

  const addSprint = () => {
    if (sprintCount < 12) {
      setSprintCount(sprintCount + 1);
    }
  };

  const removeSprint = () => {
    if (sprintCount > 3) {
      setSprintCount(sprintCount - 1);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Capacity Planning</h1>
          
          <div className="flex gap-3 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('projects')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'projects'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Projects View
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team View
              </button>
            </div>

            {/* Sprint Controls */}
            <div className="flex items-center gap-2 border-l pl-3">
              <button
                onClick={removeSprint}
                disabled={sprintCount <= 3}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove sprint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm text-gray-600">{sprintCount} Sprints</span>
              <button
                onClick={addSprint}
                disabled={sprintCount >= 12}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add sprint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded hover:bg-gray-100"
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder={viewMode === 'projects' ? 'Search projects...' : 'Search members...'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />

              {/* Capacity Filter */}
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value as CapacityFilter)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Capacity</option>
                <option value="under">Under Capacity</option>
                <option value="good">Good Capacity</option>
                <option value="over">Over Capacity</option>
              </select>

              {/* Resource Type Filter */}
              <div className="text-sm text-gray-600">
                Resource Type Filter (Coming soon)
              </div>

              {/* Unallocated Only */}
              {viewMode === 'projects' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showUnallocatedOnly}
                    onChange={(e) => setShowUnallocatedOnly(e.target.checked)}
                    className="rounded"
                  />
                  Unallocated projects only
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sprint Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full flex gap-4 p-4" style={{ minWidth: `${sprintCount * 400}px` }}>
          {sprints.map((sprint, index) => (
            <div
              key={`${sprint.year}-${sprint.month}-${sprint.sprint}`}
              className="flex-shrink-0 w-96 bg-white rounded-lg border-2 border-gray-300 flex flex-col"
            >
              {/* Sprint Header */}
              <div className="px-4 py-3 border-b-2 border-gray-300 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {getMonthName(sprint.month)} {sprint.year}
                    </h3>
                    <p className="text-sm text-gray-600">Sprint #{sprint.sprint}</p>
                  </div>
                  
                  {canWrite && (
                    <button className="p-1.5 rounded hover:bg-white/50" title="Sprint actions">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Sprint Content */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-center text-gray-400 py-8">
                  {viewMode === 'projects' ? 'No projects planned' : 'No team members allocated'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
