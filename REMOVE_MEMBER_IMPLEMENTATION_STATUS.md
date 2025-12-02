# Remove Member from Sprint - Implementation Status

## Completed Steps

### 1. ✅ Added State Variables
Added to CapacityPlanning.tsx around line 75:
```typescript
const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
const [memberToRemove, setMemberToRemove] = useState<{
  member: TeamMember;
  sprint: SprintInfo;
} | null>(null);
const [removeFutureSprintsOption, setRemoveFutureSprintsOption] = useState<'current' | 'future'>('current');
```

### 2. ✅ Added Handler Functions
Added after `handleCopyToNextSprint` function around line 770:
```typescript
const handleOpenRemoveMemberModal = (member: TeamMember, sprint: SprintInfo) => {
  setMemberToRemove({ member, sprint });
  setRemoveFutureSprintsOption('current');
  setShowRemoveMemberModal(true);
};

const handleRemoveMemberFromSprint = () => {
  if (!memberToRemove) return;
  
  const { member, sprint } = memberToRemove;
  
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

## Remaining Steps

### 3. ⏳ Add Remove Button to Member Card Header
Need to find where member cards are rendered in Team view (around line 1800-2000) and add:

```typescript
{/* In the member card header, add this button alongside existing buttons */}
<button
  onClick={() => handleOpenRemoveMemberModal(member, sprint)}
  className="p-1 rounded hover:bg-red-100 text-red-600"
  title="Remove member from sprint"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
```

### 4. ⏳ Add Confirmation Modal
Need to add this modal at the end of the component (around line 2400+), after the other modals:

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

## Summary
- ✅ State and handlers are implemented
- ⏳ Need to add remove button to member card header in Team view
- ⏳ Need to add confirmation modal at end of component

The core logic is complete. The remaining work is adding the UI elements (button and modal) to the existing component structure.

## Next Steps for Developer
1. Search for where member cards are rendered in Team view (look for member.fullName in a card/div structure)
2. Add the remove button to the card header
3. Add the modal component before the closing return statement
4. Test the feature with various scenarios
