# Copy Member to Next Sprint Feature - IMPLEMENTED

## Status: ✅ COMPLETE

This feature has been fully implemented in the Capacity Planning Teams view.

## Overview
Add ability to copy a member's entire allocation card (all projects and capacities) to the next sprint in the Team view of Capacity Planning.

## Feature Requirements

### User Story
As a capacity planner, I want to copy all of a team member's project allocations from one sprint to the next sprint, so I can quickly plan recurring work without manually re-entering each allocation.

### Functionality
- **Location**: Capacity Planning > Team View > Member Cards
- **Action**: Add a "Copy to Next Sprint" button on each member card
- **Behavior**: Copies ALL allocations for that member in the current sprint to the next sprint

### What Gets Copied
1. **All project allocations** for the member in the current sprint
2. **Allocation percentages** for each project
3. **Projects are automatically added** to the next sprint if not already there

### Implementation Steps

#### 1. Add Handler Function
```typescript
const handleCopyMemberToNextSprint = (member: TeamMember, currentSprint: SprintInfo) => {
  // Find next sprint
  const currentIndex = sprints.findIndex(
    s => s.year === currentSprint.year && 
         s.month === currentSprint.month && 
         s.sprint === currentSprint.sprint
  );
  
  if (currentIndex === -1 || currentIndex >= sprints.length - 1) {
    alert('No next sprint available');
    return;
  }
  
  const nextSprint = sprints[currentIndex + 1];
  
  // Get all allocations for this member in current sprint
  const memberAllocs = getSprintAllocations(currentSprint).filter(
    a => a.productManagerId === member.id
  );
  
  if (memberAllocs.length === 0) {
    alert('No allocations to copy');
    return;
  }
  
  // Copy each allocation to next sprint
  memberAllocs.forEach(alloc => {
    const project = projects.find(p => p.id === alloc.projectId);
    if (!project) return;
    
    // Add project to next sprint if not already there
    const nextSprintKey = `${nextSprint.year}-${nextSprint.month}-${nextSprint.sprint}`;
    const updatedSprintProjects = new Map(sprintProjects);
    if (!updatedSprintProjects.has(nextSprintKey)) {
      updatedSprintProjects.set(nextSprintKey, new Set());
    }
    updatedSprintProjects.get(nextSprintKey)!.add(project.id);
    setSprintProjects(updatedSprintProjects);
    
    // Create new allocation
    addAllocation(
      {
        projectId: alloc.projectId,
        productManagerId: member.id,
        year: nextSprint.year,
        month: nextSprint.month,
        sprint: nextSprint.sprint,
        allocationPercentage: alloc.allocationPercentage,
        allocationDays: alloc.allocationDays,
        comment: alloc.comment ? `Copied from previous sprint: ${alloc.comment}` : undefined,
      },
      currentUser.fullName
    );
  });
  
  alert(`Copied ${memberAllocs.length} allocation(s) to next sprint`);
};
```

#### 2. Add Button to Member Card Header
Find where member cards are rendered in Team view and add button:

```typescript
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
    <h4 className="font-semibold text-sm">{member.fullName}</h4>
    <span className="text-xs text-gray-500">{member.role}</span>
  </div>
  <div className="flex items-center gap-1">
    {/* Existing buttons */}
    
    {/* NEW: Copy to Next Sprint button */}
    <button
      onClick={() => handleCopyMemberToNextSprint(member, sprint)}
      className="p-1 rounded hover:bg-green-100 text-green-600"
      title="Copy all allocations to next sprint"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  </div>
</div>
```

#### 3. Icon Design
- **Icon**: Copy/duplicate icon (two overlapping rectangles)
- **Color**: Green (to indicate creation/addition)
- **Hover**: Light green background
- **Tooltip**: "Copy all allocations to next sprint"

### User Experience

#### Before Copy:
**Sprint 1 - Member: John Doe**
- Project A: 30%
- Project B: 20%
- Project C: 15%

**Sprint 2 - Member: John Doe**
- (empty)

#### After Copy:
**Sprint 1 - Member: John Doe**
- Project A: 30%
- Project B: 20%
- Project C: 15%

**Sprint 2 - Member: John Doe**
- Project A: 30% ✨ (copied)
- Project B: 20% ✨ (copied)
- Project C: 15% ✨ (copied)

### Edge Cases
1. **No next sprint**: Show alert "No next sprint available"
2. **No allocations**: Show alert "No allocations to copy"
3. **Duplicate allocations**: If member already has allocation for a project in next sprint, skip that project
4. **Project not in next sprint**: Automatically add project to next sprint's sprintProjects

### Benefits
1. **Time-saving**: Copy 5-10 allocations with one click instead of manually
2. **Consistency**: Ensures same allocation percentages carry forward
3. **Efficiency**: Especially useful for recurring/ongoing projects
4. **Flexibility**: Users can still edit copied allocations afterward

### Similar Feature
This is similar to the existing "Copy to Next Sprint" for projects, but operates at the member level instead of project level.

## Files to Modify
- `src/pages/CapacityPlanning.tsx`
  - Add `handleCopyMemberToNextSprint` function
  - Add copy button to member card header in Team view
  - Update sprintProjects when copying

## Testing
1. Create allocations for a member in Sprint 1
2. Click "Copy to Next Sprint" button
3. Verify all allocations appear in Sprint 2
4. Verify projects are added to Sprint 2's sprintProjects
5. Test edge cases (no next sprint, no allocations, etc.)


## Implementation Details

### Location
- **Screen**: Capacity Planning
- **View Mode**: Teams View
- **Position**: Member card header, between "Add Project" and "Remove Member" buttons

### Functionality
The "Copy to Next Sprint" button copies all of a member's project allocations from the current sprint to the next sprint.

### Handler Function
```typescript
const handleCopyMemberToNextSprint = (member: TeamMember, currentSprint: SprintInfo) => {
  // Find next sprint
  const currentIndex = sprints.findIndex(...);
  const nextSprint = sprints[currentIndex + 1];
  
  // Get all member allocations in current sprint
  const currentAllocs = getSprintAllocations(currentSprint)
    .filter(a => a.productManagerId === member.id);
  
  // Copy each allocation to next sprint
  currentAllocs.forEach(alloc => {
    addAllocation({
      projectId: alloc.projectId,
      productManagerId: alloc.productManagerId,
      year: nextSprint.year,
      month: nextSprint.month,
      sprint: nextSprint.sprint,
      allocationPercentage: alloc.allocationPercentage,
      allocationDays: alloc.allocationDays,
      isPlanned: true
    }, currentUser.email);
  });
  
  // Mark member as explicitly added to next sprint
  // Show success message
};
```

### What Gets Copied
- ✅ All project allocations for the member
- ✅ Allocation percentages
- ✅ Allocation days
- ✅ Member is marked as explicitly added to next sprint

### What Doesn't Get Copied
- ❌ Comments on allocations (intentional - comments are sprint-specific)
- ❌ Project role requirements (those are project-specific, not member-specific)

### User Experience

#### Button Appearance
- **Icon**: Copy/duplicate icon (two overlapping squares)
- **Color**: Blue theme
- **Hover**: Light blue background
- **Tooltip**: "Copy member allocations to next sprint"

#### Validation
- Checks if next sprint exists
- Checks if member has any allocations to copy
- Shows appropriate error messages if validation fails

#### Feedback
- Success message: "[Member Name]'s allocations copied to next sprint!"
- Error message: "No next sprint available" or "No allocations to copy for this member"

### Use Cases

#### Scenario 1: Ongoing Projects
Member is working on multiple projects that continue into next sprint:
1. View member card in current sprint
2. Click copy button
3. All project allocations copied to next sprint
4. Adjust percentages in next sprint if needed

#### Scenario 2: Stable Team Allocation
Team member has consistent project assignments:
1. Plan current sprint allocations
2. Copy to next sprint as baseline
3. Make incremental changes for next sprint

#### Scenario 3: Quick Planning
Rapidly plan multiple sprints:
1. Set up current sprint
2. Copy members to next sprint
3. Copy again to sprint after that
4. Adjust as needed for each sprint

### Benefits
1. **Time Saving**: No need to manually recreate allocations
2. **Consistency**: Maintains allocation patterns across sprints
3. **Accuracy**: Reduces data entry errors
4. **Efficiency**: Speeds up sprint planning process
5. **Flexibility**: Can still edit copied allocations

### Technical Notes
- Uses existing `addAllocation` function
- Maintains allocation history
- Tracks member as explicitly added to sprint
- Works with sprint tracking system
- Compatible with all other member management features

## Files Modified
- `product-capacity-platform/src/pages/CapacityPlanning.tsx`
  - Added `handleCopyMemberToNextSprint` function
  - Added copy button to member card in Teams view
  - Button positioned between Add and Remove buttons

## Testing
1. Create member with allocations in current sprint
2. Click copy button
3. Verify allocations appear in next sprint
4. Verify success message displays
5. Test with member having no allocations (should show error)
6. Test in last sprint (should show "no next sprint" error)
7. Verify copied allocations can be edited independently
