# Multi-Sprint Allocation - Phase 1 Implementation Summary

## ✅ Completed Steps:

### 1. TypeScript Types Updated
- ✅ Added `allocationGroupId`, `isGroupStart`, `groupStartSprint`, `groupTotalSprints`, `groupCurrentIndex` to `SprintAllocation` interface

### 2. Database Migration Created
- ✅ Created `add-multi-sprint-fields.sql` with all necessary columns
- ✅ Added indexes for performance
- ✅ Added documentation comments

### 3. API Transformations Updated
- ✅ Updated `transformAllocation()` to handle new fields
- ✅ Updated `transformAllocationToSupabase()` to handle new fields

### 4. State Variables Added
- ✅ Added `numberOfSprints` state (default: 1)
- ✅ Added `showMultiSprintPreview` state

## 🚧 Remaining Implementation Steps:

### Step 5: Add Multi-Sprint Helper Function
Create a function to generate multiple sprint allocations:

```typescript
const createMultiSprintAllocations = (
  member: TeamMember,
  project: Project,
  startYear: number,
  startMonth: number,
  startSprint: number,
  percentage: number,
  numSprints: number
): Omit<SprintAllocation, 'id' | 'createdAt' | 'createdBy'>[] => {
  const groupId = crypto.randomUUID();
  const allocations = [];
  
  let year = startYear;
  let month = startMonth;
  let sprint = startSprint;
  
  for (let i = 0; i < numSprints; i++) {
    allocations.push({
      projectId: project.id,
      productManagerId: member.id,
      year,
      month,
      sprint,
      allocationPercentage: percentage,
      allocationDays: Math.round((percentage / 100) * 10),
      isPlanned: true,
      allocationGroupId: groupId,
      isGroupStart: i === 0,
      groupStartSprint: `${startYear}-${startMonth}-${startSprint}`,
      groupTotalSprints: numSprints,
      groupCurrentIndex: i + 1
    });
    
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
  
  return allocations;
};
```

### Step 6: Update handleAddMember Function
Modify to create multiple allocations when numberOfSprints > 1:

```typescript
const handleAddMember = () => {
  // ... existing validation ...
  
  if (numberOfSprints > 1) {
    // Create multi-sprint allocations
    const multiAllocations = createMultiSprintAllocations(
      selectedMember,
      selectedProject,
      selectedSprint.year,
      selectedSprint.month,
      selectedSprint.sprint,
      percentage,
      numberOfSprints
    );
    
    // Add each allocation
    multiAllocations.forEach(alloc => {
      addAllocation(alloc, currentUser.email);
    });
    
    alert(`Created ${numberOfSprints} sprint allocations for ${selectedMember.fullName}`);
  } else {
    // Single sprint allocation (existing code)
    addAllocation({
      projectId: selectedProject.id,
      productManagerId: selectedMember.id,
      year: selectedSprint.year,
      month: selectedSprint.month,
      sprint: selectedSprint.sprint,
      allocationPercentage: percentage,
      allocationDays: (percentage / 100) * 10,
      isPlanned: true
    }, currentUser.email);
  }
  
  // Reset form
  setShowAddMemberModal(false);
  setSelectedMember(null);
  setAllocationPercentage('');
  setNumberOfSprints(1);
};
```

### Step 7: Update Add Allocation Modal UI
Add number of sprints field and preview:

```tsx
{selectedProject && (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Allocation %
      </label>
      <input
        ref={percentageInputRef}
        type="number"
        min="0"
        max="100"
        value={allocationPercentage}
        onChange={(e) => setAllocationPercentage(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="Enter percentage (0-100)"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Number of Sprints
      </label>
      <input
        type="number"
        min="1"
        max="12"
        value={numberOfSprints}
        onChange={(e) => {
          const num = parseInt(e.target.value) || 1;
          setNumberOfSprints(Math.max(1, Math.min(12, num)));
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Create allocations for multiple consecutive sprints (1-12)
      </p>
    </div>
    
    {numberOfSprints > 1 && selectedSprint && allocationPercentage && (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Preview: {numberOfSprints} sprints will be created
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          {generateSprintPreview(selectedSprint, numberOfSprints).map((sprint, idx) => (
            <div key={idx}>
              • {getMonthName(sprint.month)} {sprint.year} Sprint {sprint.sprint} - {allocationPercentage}%
            </div>
          ))}
        </div>
      </div>
    )}
  </>
)}
```

### Step 8: Add Sprint Preview Helper
```typescript
const generateSprintPreview = (startSprint: SprintInfo, count: number): SprintInfo[] => {
  const sprints: SprintInfo[] = [];
  let year = startSprint.year;
  let month = startSprint.month;
  let sprint = startSprint.sprint;
  
  for (let i = 0; i < count; i++) {
    sprints.push({ year, month, sprint });
    
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
  
  return sprints;
};
```

## 📋 Testing Checklist:

After implementation, test:
- [ ] Create single sprint allocation (numberOfSprints = 1)
- [ ] Create 3-sprint allocation
- [ ] Verify all 3 allocations are created with correct data
- [ ] Verify allocationGroupId is the same for all 3
- [ ] Verify isGroupStart is true only for first
- [ ] Verify groupCurrentIndex is 1, 2, 3
- [ ] Verify sprint progression (Jan S1 → Jan S2 → Feb S1)
- [ ] Verify year rollover (Dec S2 → Jan S1 next year)
- [ ] Check database has all new fields populated

## 🎯 Next Phase Preview:

Phase 2 will add:
- Visual badges (🎬 Start, progress indicators)
- Edit multi-sprint allocations
- Delete options (current/future/all)
- Extend/shorten duration

## 📝 Database Migration Required:

Before using this feature, run:
```sql
\i add-multi-sprint-fields.sql
```

This adds the necessary columns to the allocations table.