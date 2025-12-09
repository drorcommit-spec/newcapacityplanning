# Context for Next Session - Add Project from Allocation Flow

## Task
Implement inline project creation when adding member allocations in Capacity Planning.

## Current State
- Development environment now uses Supabase (Puzzle-Dev) instead of JSON
- All reference data (team members, resource types, teams) imported successfully
- Debug messages removed from code
- Latest commit: c103a3b "Remove debug alert messages"

## Feature to Implement

### User Story
When adding a member allocation from Capacity Planning > Team View:
1. User clicks + on sprint swimlane
2. Selects a member
3. In project dropdown, if project doesn't exist, user can select "Create New Project"
4. Project creation modal opens
5. After creating project, user returns to Add Member modal with:
   - Member still selected
   - Sprint still selected
   - New project pre-selected
   - Ready to enter allocation %

### Implementation Plan

#### 1. Add State Variables (around line 74)
```typescript
const [returnToAddMember, setReturnToAddMember] = useState(false);
const [pendingMember, setPendingMember] = useState<TeamMember | null>(null);
const [pendingSprint, setPendingSprint] = useState<SprintInfo | null>(null);
```

#### 2. Update Project Dropdown (around line 2465)
Add "Create New Project" option:
```typescript
<select
  ref={projectSelectRef}
  value={''}
  onChange={(e) => {
    if (e.target.value === '__CREATE_NEW__') {
      // Save context
      setPendingMember(selectedMember);
      setPendingSprint(selectedSprint);
      setReturnToAddMember(true);
      // Close add member modal
      setShowAddMemberModal(false);
      // Open project creation modal
      setShowProjectModal(true);
    } else {
      const project = projects.find(p => p.id === e.target.value);
      setSelectedProject(project || null);
      setTimeout(() => percentageInputRef.current?.focus(), 100);
    }
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
>
  <option value="">Select a project...</option>
  <option value="__CREATE_NEW__" className="font-semibold text-green-600">+ Create New Project</option>
  {selectedSprint && getAvailableProjectsForMember(selectedSprint, selectedMember.id).map(project => (
    <option key={project.id} value={project.id}>
      {project.customerName} - {project.projectName}
    </option>
  ))}
</select>
```

#### 3. Update Project Creation Success Handler
Find where `addProject` is called and add logic to restore context:
```typescript
const projectId = addProject(projectData);

// If returning to add member flow, restore context
if (returnToAddMember && pendingMember && pendingSprint) {
  const newProject = projects.find(p => p.id === projectId);
  setSelectedMember(pendingMember);
  setSelectedSprint(pendingSprint);
  setSelectedProject(newProject || null);
  setReturnToAddMember(false);
  setPendingMember(null);
  setPendingSprint(null);
  setShowProjectModal(false);
  setShowAddMemberModal(true);
  // Focus on percentage input
  setTimeout(() => percentageInputRef.current?.focus(), 200);
} else {
  // Normal flow - just close modal
  setShowProjectModal(false);
}
```

#### 4. Update Modal Close Handlers
Ensure that closing the project modal clears the pending state if user cancels:
```typescript
onClose={() => {
  setShowProjectModal(false);
  if (returnToAddMember) {
    // User cancelled, restore add member modal
    setShowAddMemberModal(true);
    setReturnToAddMember(false);
  }
}}
```

### Files to Modify
- `src/pages/CapacityPlanning.tsx` - Main implementation

### Testing Checklist
- [ ] Click + on sprint swimlane
- [ ] Select a member
- [ ] Select "Create New Project" from dropdown
- [ ] Project modal opens
- [ ] Create a project successfully
- [ ] Returns to Add Member modal with member and project selected
- [ ] Can enter allocation % and save
- [ ] Test cancelling project creation (should return to Add Member modal)
- [ ] Test normal flow (selecting existing project) still works

### Related Documentation
- `ADD_PROJECT_FROM_ALLOCATION_FLOW.md` - Feature description
- `DEV_DATABASE_SETUP.md` - Development environment setup

## Environment Info
- Development: Supabase (Puzzle-Dev) - https://nkonqfrhikxrxhorsosk.supabase.co
- Production: Supabase (different instance)
- Local dev server: http://localhost:5174
- Backend: Not needed (using Supabase directly)

## Recent Changes
- v1.2.1 - Team-based permissions system
- Fixed member card deletion with proper DELETE API
- Fixed copy member allocations (sequential with delays)
- Removed debug alert messages
- Set up Supabase for development environment

## Notes
- All team members imported from JSON
- Clean slate for projects and allocations in dev
- No more JSON file permission issues
- Copy/delete features now work reliably with Supabase
