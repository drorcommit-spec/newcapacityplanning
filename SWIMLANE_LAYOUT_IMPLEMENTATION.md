# Swimlane Layout Implementation Guide

## Overview
This document outlines the implementation of the vertical swimlane layout for the Allocation Canvas, replacing the current horizontal month-based cards with 3 vertical columns representing Current Sprint, Next Sprint, and 2 Sprints Ahead.

## Changes Made

### 1. Data Structure
Added `swimlaneData` useMemo that organizes data by sprint columns instead of by months:

```typescript
const swimlaneData = useMemo(() => {
  return nextThreeSprints.map(sprintInfo => {
    const { year, month, sprint, label } = sprintInfo;
    const isPast = isSprintPast(year, month, sprint);
    
    if (viewMode === 'team') {
      // Returns: { ...sprintInfo, isPast, teams: [...] }
      // Each team contains members with their allocations for THIS sprint
    } else {
      // Returns: { ...sprintInfo, isPast, projects: [...] }
      // Each project contains members with their allocations for THIS sprint
    }
  });
}, [dependencies]);
```

### 2. Removed Planning Period Filter
- Removed the "Planning Period" dropdown
- Always show 3 sprints (fixed layout)
- Simplified the UI

### 3. New Rendering Structure

The new rendering should follow this pattern:

```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {swimlaneData.map((swimlane, index) => (
    <div key={`${swimlane.year}-${swimlane.month}-${swimlane.sprint}`} 
         className={`border-2 rounded-lg p-4 ${
           index === 0 ? 'border-blue-500 bg-blue-50' : 
           index === 1 ? 'border-green-500 bg-green-50' : 
           'border-gray-400 bg-gray-50'
         } ${swimlane.isPast ? 'opacity-50' : ''}`}>
      
      {/* Sprint Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold">{swimlane.label}</h3>
        <div className="text-sm text-gray-600">
          {getMonthName(swimlane.month)} {swimlane.year} - Sprint {swimlane.sprint}
        </div>
        {swimlane.isPast && <span className="text-xs text-gray-500">(Past)</span>}
      </div>

      {/* Team View Content */}
      {viewMode === 'team' && swimlane.teams?.map(team => (
        <div key={team.teamName} className="mb-4">
          <h4 className="font-semibold text-sm mb-2">{team.teamName}</h4>
          {team.members.map(member => (
            <div key={member.pm.id} className="mb-3 p-2 bg-white rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{member.pm.fullName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${
                    member.total < underCapacityThreshold ? 'text-yellow-600' :
                    member.total > overCapacityThreshold ? 'text-red-600' :
                    'text-green-600'
                  }`}>
                    {member.total}%
                  </span>
                  {!swimlane.isPast && canWrite && (
                    <button
                      onClick={() => handleAddClick({
                        pmId: member.pm.id,
                        pmName: member.pm.fullName,
                        year: swimlane.year,
                        month: swimlane.month,
                        sprint: swimlane.sprint,
                      })}
                      className="text-green-600 hover:text-green-800"
                      title="Add allocation"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {member.projects.map((proj, i) => (
                <div key={i} className="text-xs text-gray-600 ml-2 flex items-center justify-between">
                  <span>• {proj.project}: {proj.percentage}%</span>
                  {!swimlane.isPast && canWrite && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(
                          proj.allocationId,
                          member.pm.id,
                          member.pm.fullName,
                          proj.projectId,
                          proj.project,
                          swimlane.year,
                          swimlane.month,
                          swimlane.sprint,
                          proj.percentage
                        )}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAllocation(proj.allocationId, proj.project, member.pm.fullName)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Project View Content */}
      {viewMode === 'project' && swimlane.projects?.map(projectData => (
        <div key={projectData.project.id} className="mb-3 p-2 bg-white rounded border">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">{projectData.project.projectName}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">{projectData.total}%</span>
              {!swimlane.isPast && canWrite && (
                <button
                  onClick={() => handleAddClick({
                    projectId: projectData.project.id,
                    projectName: projectData.project.projectName,
                    year: swimlane.year,
                    month: swimlane.month,
                    sprint: swimlane.sprint,
                  })}
                  className="text-green-600 hover:text-green-800"
                  title="Add allocation"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {projectData.members.map((mem, i) => (
            <div key={i} className="text-xs text-gray-600 ml-2 flex items-center justify-between">
              <span>• {mem.member}: {mem.percentage}%</span>
              {!swimlane.isPast && canWrite && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditClick(
                      mem.allocationId,
                      mem.pmId,
                      mem.member,
                      projectData.project.id,
                      projectData.project.projectName,
                      swimlane.year,
                      swimlane.month,
                      swimlane.sprint,
                      mem.percentage
                    )}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteAllocation(mem.allocationId, projectData.project.projectName, mem.member)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  ))}
</div>
```

## Implementation Steps

1. ✅ Created `nextThreeSprints` to generate 3 sprint objects
2. ✅ Created `swimlaneData` useMemo for organizing data by sprint columns
3. ✅ Removed Planning Period filter from UI
4. ⏳ Replace the old rendering section (lines ~850-1300) with new swimlane rendering
5. ⏳ Test Team View with all capacity filters
6. ⏳ Test Project View with project selection
7. ⏳ Test past sprint handling (graying out)
8. ⏳ Test all CRUD operations (Add, Edit, Delete, Copy)

## Benefits

1. **Visual Clarity**: Clear temporal progression left-to-right
2. **Consistency**: Matches Dashboard layout
3. **Scannability**: Easy to compare across time periods
4. **Compact**: Better use of screen space
5. **Intuitive**: Natural planning workflow

## Responsive Design

- Desktop (lg+): 3 columns side-by-side
- Tablet (md): 2 columns, third wraps below
- Mobile: 1 column, stacked vertically

## Color Coding

- Current Sprint: Blue border/background
- Next Sprint: Green border/background
- 2 Sprints Ahead: Gray border/background
- Past Sprints: 50% opacity overlay

## Next Steps

The main task remaining is to replace the old rendering code (the massive section with teamViewData.map and projectViewData.map) with the new swimlane rendering structure shown above.

This involves:
1. Finding the start of `<div className="mt-6 space-y-6">` 
2. Finding the end (just before the Modal components)
3. Replacing everything in between with the new swimlane grid structure
4. Testing thoroughly

Due to the file size (~1300 lines), this replacement should be done carefully, possibly in a new branch, with thorough testing of all features.
