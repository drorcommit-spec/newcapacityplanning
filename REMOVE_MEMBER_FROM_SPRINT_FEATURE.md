# Remove Member from Sprint Feature

## Overview
Add ability to remove a team member from a sprint (all their allocations) with options to remove from current sprint only or from current and all future sprints.

## Feature Requirements

### User Story
As a capacity planner, I want to remove a team member from a sprint when they're no longer available, with the option to also remove them from future sprints if they're leaving the team or project.

### Functionality
- **Location**: Capacity Planning > Team View > Member Cards
- **Action**: Add a "Remove from Sprint" button on each member card
- **Behavior**: Opens confirmation modal with two options

### Confirmation Modal

#### Modal Title
"Remove [Member Name] from Sprint?"

#### Modal Content
```
Are you sure you want to remove [Member Name] from [Month Year Sprint #]?

This will delete all [X] allocation(s) for this member in the selected sprint.

○ Remove from this sprint only
○ Remove from this sprint and all future sprints
```

#### Buttons
- **Cancel** (secondary button) - Close modal without action
- **Yes, Remove** (danger/red button) - Proceed with removal

### Implementation

#### 1. Add State for Modal
```typescript
const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
const [memberToRemove, setMemberToRemove] = useState<{
  member: TeamMember;
  sprint: SprintInfo;
} | null>(null);
const [removeFutureSprintsOption, setRemoveFutureSprintsOption] = useState<'current' | 'future'>('current');
```

#### 2. Add Handler to Open Modal
```typescript
const handleOpenRemoveMemberModal = (member: TeamMember, sprint: SprintInfo) => {
  setMemberToRemove({ member, sprint });
  setRemoveFutureSprintsOption('current');
  setShowRemoveMemberModal(true);
};
```

#### 3. Add Handler to Remove Member
```typescript
const handleRemoveMemberFromSprint = () => {
  if (!memberToRemove) return;
  
  const { member, sprint } = memberToRemove;
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  
  // Get sprints to remove from
  const sprintsToRemove = removeFutureSprintsOption === 'future'
    ? sprints.filter(s => {
        const sprintDate = new Date(s.year, s.month - 1, s.sprint === 1 ? 1 : 16);
        const currentSprintDate = new Date(sprint.year, sprint.month - 1, sprint.sprint === 1 ? 1 : 16);
        return sprintDate >= currentSprintDate;
      })
    : [sprint];
  
  let totalRemoved = 0;
  
  // Remove allocations from selected sprints
  sprintsToRemove.forEach(s => {
    const allocsToRemove = allocations.filter(
      a => a.productManagerId === member.id &&
           a.year === s.year &&
           a.month === s.month &&
           a.sprint === s.sprint
    );
    
    allocsToRemove.forEach(alloc => {
      deleteAllocation(alloc.id, currentUser.fullName);
      totalRemoved++;
    });
  });
  
  // Close modal
  setShowRemoveMemberModal(false);
  setMemberToRemove(null);
  
  // Show confirmation
  const sprintText = removeFutureSprintsOption === 'future' 
    ? `${sprintsToRemove.length} sprint(s)` 
    : 'this sprint';
  alert(`Removed ${totalRemoved} allocation(s) for ${member.fullName} from ${sprintText}`);
};
```

#### 4. Add Button to Member Card
```typescript
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
    <h4 className="font-semibold text-sm">{member.fullName}</h4>
    <span className="text-xs text-gray-500">{member.role}</span>
  </div>
  <div className="flex items-center gap-1">
    {/* Existing buttons */}
    
    {/* NEW: Remove from Sprint button */}
    <button
      onClick={() => handleOpenRemoveMemberModal(member, sprint)}
      className="p-1 rounded hover:bg-red-100 text-red-600"
      title="Remove member from sprint"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</div>
```

#### 5. Add Confirmation Modal
```typescript
{/* Remove Member from Sprint Modal */}
<Modal
  isOpen={showRemoveMemberModal}
  onClose={() => {
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
    setRemoveFutureSprintsOption('current');
  }}
  title={memberToRemove ? `Remove ${memberToRemove.member.fullName} from Sprint?` : 'Remove Member'}
>
  {memberToRemove && (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-gray-700">
          Are you sure you want to remove <strong>{memberToRemove.member.fullName}</strong> from{' '}
          <strong>
            {getMonthName(memberToRemove.sprint.month)} {memberToRemove.sprint.year} Sprint #{memberToRemove.sprint.sprint}
          </strong>?
        </p>
        <p className="text-sm text-gray-600 mt-2">
          This will delete all{' '}
          <strong>
            {allocations.filter(
              a => a.productManagerId === memberToRemove.member.id &&
                   a.year === memberToRemove.sprint.year &&
                   a.month === memberToRemove.sprint.month &&
                   a.sprint === memberToRemove.sprint.sprint
            ).length}
          </strong>{' '}
          allocation(s) for this member in the selected sprint.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
          <input
            type="radio"
            name="removeOption"
            value="current"
            checked={removeFutureSprintsOption === 'current'}
            onChange={(e) => setRemoveFutureSprintsOption(e.target.value as 'current' | 'future')}
            className="mt-0.5"
          />
          <div>
            <div className="font-medium text-sm">Remove from this sprint only</div>
            <div className="text-xs text-gray-600">
              Keep allocations in future sprints unchanged
            </div>
          </div>
        </label>

        <label className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
          <input
            type="radio"
            name="removeOption"
            value="future"
            checked={removeFutureSprintsOption === 'future'}
            onChange={(e) => setRemoveFutureSprintsOption(e.target.value as 'current' | 'future')}
            className="mt-0.5"
          />
          <div>
            <div className="font-medium text-sm">Remove from this sprint and all future sprints</div>
            <div className="text-xs text-gray-600">
              Remove all allocations from {getMonthName(memberToRemove.sprint.month)} {memberToRemove.sprint.year} Sprint #{memberToRemove.sprint.sprint} onwards
            </div>
          </div>
        </label>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={() => {
            setShowRemoveMemberModal(false);
            setMemberToRemove(null);
            setRemoveFutureSprintsOption('current');
          }}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md border border-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleRemoveMemberFromSprint}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Yes, Remove
        </button>
      </div>
    </div>
  )}
</Modal>
```

### User Experience Flow

#### Step 1: Click Remove Button
User clicks the trash/remove icon on a member card

#### Step 2: Modal Opens
Modal shows:
- Member name and sprint details
- Count of allocations that will be deleted
- Two radio button options
- Cancel and "Yes, Remove" buttons

#### Step 3: Select Option
User selects one of:
- **Option 1**: Remove from this sprint only (default)
- **Option 2**: Remove from this sprint and all future sprints

#### Step 4: Confirm or Cancel
- **Cancel**: Close modal, no changes
- **Yes, Remove**: Delete allocations and show confirmation message

### Example Scenarios

#### Scenario 1: Remove from Current Sprint Only
**Before:**
- Sprint 1: Member has 3 allocations
- Sprint 2: Member has 3 allocations
- Sprint 3: Member has 3 allocations

**User Action:** Remove from Sprint 1 only

**After:**
- Sprint 1: Member has 0 allocations ✅
- Sprint 2: Member has 3 allocations (unchanged)
- Sprint 3: Member has 3 allocations (unchanged)

#### Scenario 2: Remove from Current and Future Sprints
**Before:**
- Sprint 1: Member has 3 allocations
- Sprint 2: Member has 3 allocations
- Sprint 3: Member has 3 allocations

**User Action:** Remove from Sprint 1 and future

**After:**
- Sprint 1: Member has 0 allocations ✅
- Sprint 2: Member has 0 allocations ✅
- Sprint 3: Member has 0 allocations ✅

### UI Design

#### Button
- **Icon**: Trash/delete icon
- **Color**: Red
- **Hover**: Light red background
- **Position**: Member card header, right side
- **Tooltip**: "Remove member from sprint"

#### Modal
- **Width**: Medium (500px)
- **Warning color**: Yellow background for warning message
- **Radio buttons**: Clear visual distinction
- **Buttons**: 
  - Cancel: Gray border, white background
  - Yes, Remove: Red background, white text

### Benefits
1. **Bulk removal**: Remove all allocations for a member at once
2. **Flexibility**: Choose to affect current sprint only or future sprints too
3. **Safety**: Confirmation modal prevents accidental deletions
4. **Clarity**: Shows exactly how many allocations will be deleted
5. **Use cases**:
   - Member leaving team
   - Member reassigned to different projects
   - Member on leave/vacation
   - Reorganization/restructuring

### Edge Cases
1. **No allocations**: If member has no allocations, show message "No allocations to remove"
2. **Last sprint**: If removing from last sprint, "future sprints" option is same as "current only"
3. **Past sprints**: Button should only appear for current and future sprints

## Files to Modify
- `src/pages/CapacityPlanning.tsx`
  - Add state for modal and removal options
  - Add `handleOpenRemoveMemberModal` function
  - Add `handleRemoveMemberFromSprint` function
  - Add remove button to member card header
  - Add confirmation modal component

## Testing
1. Create allocations for a member across multiple sprints
2. Click "Remove from Sprint" button
3. Verify modal opens with correct information
4. Test "Remove from this sprint only" option
5. Test "Remove from this sprint and all future sprints" option
6. Verify allocations are deleted correctly
7. Test Cancel button (no changes)
8. Test with member who has no allocations
