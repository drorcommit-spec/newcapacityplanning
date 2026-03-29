# Multi-Sprint Allocation Feature - Specification

## Overview
Allow users to create allocations that span multiple consecutive sprints with a single action, making it easier to plan long-term project assignments.

---

## 🎯 User Story

**As a** capacity planner  
**I want to** allocate a team member to a project for multiple sprints at once  
**So that** I don't have to manually create the same allocation for each sprint

---

## 📋 Feature Requirements

### 1. Create Multi-Sprint Allocation

**Form Fields:**
```
┌─────────────────────────────────────────┐
│ Add Allocation                          │
├─────────────────────────────────────────┤
│ Member:     [John Doe ▼]                │
│ Project:    [Project Alpha ▼]           │
│                                         │
│ Starting Sprint:                        │
│   Month:  [January 2025 ▼]             │
│   Sprint: [○ Sprint 1  ○ Sprint 2]     │
│                                         │
│ Capacity:   [50] %                      │
│ Duration:   [3] sprints                 │
│                                         │
│ Preview:                                │
│ • Jan 2025 Sprint 1 - 50%              │
│ • Jan 2025 Sprint 2 - 50%              │
│ • Feb 2025 Sprint 1 - 50%              │
│                                         │
│ [Cancel] [Create Allocation]            │
└─────────────────────────────────────────┘
```

**Behavior:**
- User selects starting month and sprint (1 or 2)
- User enters capacity percentage (1-100%)
- User enters number of sprints (1-12)
- System shows preview of all sprints that will be created
- On save, system creates individual allocations for each sprint

### 2. Visual Indicator - "Starting Sprint" Badge

**In Sprint Cards:**
```
┌──────────────────────────────────┐
│ Project Alpha                    │
│ Jan 2025 Sprint 1                │
├──────────────────────────────────┤
│ 🎬 John Doe - 50%                │ ← Badge indicates start
│    [3 sprints remaining]         │
│                                  │
│ Jane Smith - 30%                 │
└──────────────────────────────────┘

Next Sprint:
┌──────────────────────────────────┐
│ Project Alpha                    │
│ Jan 2025 Sprint 2                │
├──────────────────────────────────┤
│ John Doe - 50%                   │ ← No badge, continuation
│ [2 sprints remaining]            │
└──────────────────────────────────┘
```

**Badge Types:**
- 🎬 **Start Badge**: Shows on the first sprint of a multi-sprint allocation
- 📊 **Progress Indicator**: Shows remaining sprints (e.g., "2 of 3 sprints")
- 🏁 **End Badge**: Shows on the last sprint (optional)

### 3. Edit Multi-Sprint Allocation

**Edit Options:**

**Option A - Edit Starting Sprint:**
```
┌─────────────────────────────────────────┐
│ Edit Multi-Sprint Allocation            │
├─────────────────────────────────────────┤
│ Member:     John Doe                    │
│ Project:    Project Alpha               │
│                                         │
│ Current Start: Jan 2025 Sprint 1        │
│ New Start:     [Feb 2025 ▼] [Sprint 1] │
│                                         │
│ Capacity:      [50] %                   │
│ Duration:      [3] sprints              │
│                                         │
│ ⚠️ This will affect:                    │
│ • Delete: Jan 2025 Sprint 1 allocation │
│ • Delete: Jan 2025 Sprint 2 allocation │
│ • Delete: Feb 2025 Sprint 1 allocation │
│ • Create: Feb 2025 Sprint 1 allocation │
│ • Create: Feb 2025 Sprint 2 allocation │
│ • Create: Mar 2025 Sprint 1 allocation │
│                                         │
│ [Cancel] [Update Allocation]            │
└─────────────────────────────────────────┘
```

**Option B - Edit Capacity:**
```
┌─────────────────────────────────────────┐
│ Edit Multi-Sprint Allocation            │
├─────────────────────────────────────────┤
│ Starting: Jan 2025 Sprint 1             │
│ Duration: 3 sprints                     │
│                                         │
│ New Capacity: [60] % (was 50%)         │
│                                         │
│ Apply to:                               │
│ ○ All sprints (Jan S1, Jan S2, Feb S1) │
│ ○ This sprint only (Jan S1)            │
│ ○ This and future sprints (Jan S1+)    │
│                                         │
│ [Cancel] [Update]                       │
└─────────────────────────────────────────┘
```

**Option C - Edit Duration:**
```
┌─────────────────────────────────────────┐
│ Edit Multi-Sprint Allocation            │
├─────────────────────────────────────────┤
│ Starting: Jan 2025 Sprint 1             │
│ Current:  3 sprints                     │
│ New:      [5] sprints                   │
│                                         │
│ Changes:                                │
│ • Keep: Jan 2025 Sprint 1 - 50%        │
│ • Keep: Jan 2025 Sprint 2 - 50%        │
│ • Keep: Feb 2025 Sprint 1 - 50%        │
│ • Add:  Feb 2025 Sprint 2 - 50%        │
│ • Add:  Mar 2025 Sprint 1 - 50%        │
│                                         │
│ [Cancel] [Extend Allocation]            │
└─────────────────────────────────────────┘
```

### 4. Delete Multi-Sprint Allocation

**Delete Options:**
```
┌─────────────────────────────────────────┐
│ Delete Allocation                       │
├─────────────────────────────────────────┤
│ John Doe - Project Alpha                │
│ Starting: Jan 2025 Sprint 1             │
│ Duration: 3 sprints                     │
│                                         │
│ Delete:                                 │
│ ○ This sprint only                      │
│ ○ This and future sprints (3 sprints)  │
│ ○ All related sprints (3 sprints)      │
│                                         │
│ [Cancel] [Delete]                       │
└─────────────────────────────────────────┘
```

---

## 🗄️ Data Model

### Option A: Add Metadata Fields (Recommended)
```typescript
interface SprintAllocation {
  id: string;
  projectId: string;
  productManagerId: string;
  year: number;
  month: number;
  sprint: number;
  allocationPercentage: number;
  allocationDays: number;
  
  // NEW FIELDS
  allocationGroupId?: string;  // Links related allocations
  isGroupStart?: boolean;      // True for the first sprint
  groupStartSprint?: string;   // Reference to start sprint
  groupTotalSprints?: number;  // Total sprints in group
  groupCurrentIndex?: number;  // Position in group (1, 2, 3...)
  
  createdAt: string;
  createdBy: string;
}
```

### Option B: Separate Allocation Groups Table
```typescript
interface AllocationGroup {
  id: string;
  projectId: string;
  productManagerId: string;
  startYear: number;
  startMonth: number;
  startSprint: number;
  allocationPercentage: number;
  totalSprints: number;
  createdAt: string;
  createdBy: string;
}

// Individual allocations reference the group
interface SprintAllocation {
  // ... existing fields
  allocationGroupId?: string;
}
```

**Recommendation**: Use Option A (metadata fields) for simplicity.

---

## 🎨 UI Components

### 1. Multi-Sprint Form Component
```typescript
interface MultiSprintFormProps {
  member?: TeamMember;
  project?: Project;
  startSprint?: SprintInfo;
  onSubmit: (allocation: MultiSprintAllocation) => void;
  onCancel: () => void;
}

interface MultiSprintAllocation {
  memberId: string;
  projectId: string;
  startYear: number;
  startMonth: number;
  startSprint: number;
  percentage: number;
  numberOfSprints: number;
}
```

### 2. Sprint Badge Component
```typescript
interface SprintBadgeProps {
  isStart: boolean;
  currentIndex: number;
  totalSprints: number;
}

const SprintBadge = ({ isStart, currentIndex, totalSprints }: SprintBadgeProps) => {
  if (!isStart && totalSprints <= 1) return null;
  
  return (
    <div className="flex items-center gap-2">
      {isStart && <span className="text-xs">🎬 Start</span>}
      <span className="text-xs text-gray-600">
        {currentIndex} of {totalSprints} sprints
      </span>
    </div>
  );
};
```

### 3. Edit Multi-Sprint Modal
```typescript
interface EditMultiSprintProps {
  allocation: SprintAllocation;
  groupAllocations: SprintAllocation[];
  onUpdate: (updates: Partial<MultiSprintAllocation>) => void;
  onDelete: (deleteOption: 'current' | 'future' | 'all') => void;
}
```

---

## 🔄 Business Logic

### Creating Multi-Sprint Allocations
```typescript
function createMultiSprintAllocation(
  member: TeamMember,
  project: Project,
  startYear: number,
  startMonth: number,
  startSprint: number,
  percentage: number,
  numberOfSprints: number
): SprintAllocation[] {
  const groupId = crypto.randomUUID();
  const allocations: SprintAllocation[] = [];
  
  let year = startYear;
  let month = startMonth;
  let sprint = startSprint;
  
  for (let i = 0; i < numberOfSprints; i++) {
    allocations.push({
      id: crypto.randomUUID(),
      projectId: project.id,
      productManagerId: member.id,
      year,
      month,
      sprint,
      allocationPercentage: percentage,
      allocationDays: Math.round((percentage / 100) * 10),
      allocationGroupId: groupId,
      isGroupStart: i === 0,
      groupStartSprint: `${startYear}-${startMonth}-${startSprint}`,
      groupTotalSprints: numberOfSprints,
      groupCurrentIndex: i + 1,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.email
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
}
```

### Updating Start Sprint
```typescript
function updateMultiSprintStart(
  groupId: string,
  newStartYear: number,
  newStartMonth: number,
  newStartSprint: number
): { toDelete: string[], toCreate: SprintAllocation[] } {
  // Get all allocations in the group
  const groupAllocations = allocations.filter(a => a.allocationGroupId === groupId);
  
  // Get the original parameters
  const firstAlloc = groupAllocations.find(a => a.isGroupStart);
  const percentage = firstAlloc.allocationPercentage;
  const numberOfSprints = firstAlloc.groupTotalSprints;
  
  // Create new allocations with new start
  const newAllocations = createMultiSprintAllocation(
    member,
    project,
    newStartYear,
    newStartMonth,
    newStartSprint,
    percentage,
    numberOfSprints
  );
  
  return {
    toDelete: groupAllocations.map(a => a.id),
    toCreate: newAllocations
  };
}
```

### Extending Duration
```typescript
function extendMultiSprintDuration(
  groupId: string,
  newTotalSprints: number
): SprintAllocation[] {
  const groupAllocations = allocations.filter(a => a.allocationGroupId === groupId);
  const currentCount = groupAllocations.length;
  
  if (newTotalSprints <= currentCount) {
    throw new Error('New duration must be greater than current');
  }
  
  // Get last allocation to continue from
  const lastAlloc = groupAllocations.sort((a, b) => 
    b.groupCurrentIndex - a.groupCurrentIndex
  )[0];
  
  // Calculate next sprint
  let year = lastAlloc.year;
  let month = lastAlloc.month;
  let sprint = lastAlloc.sprint + 1;
  
  if (sprint > 2) {
    sprint = 1;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  
  // Create additional allocations
  const additionalAllocations: SprintAllocation[] = [];
  const sprintsToAdd = newTotalSprints - currentCount;
  
  for (let i = 0; i < sprintsToAdd; i++) {
    additionalAllocations.push({
      ...lastAlloc,
      id: crypto.randomUUID(),
      year,
      month,
      sprint,
      groupCurrentIndex: currentCount + i + 1,
      groupTotalSprints: newTotalSprints,
      isGroupStart: false
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
  
  // Update existing allocations' groupTotalSprints
  groupAllocations.forEach(alloc => {
    alloc.groupTotalSprints = newTotalSprints;
  });
  
  return additionalAllocations;
}
```

---

## 📊 Visual Examples

### Sprint Card with Multi-Sprint Badge
```
┌────────────────────────────────────────┐
│ Project Alpha                          │
│ January 2025 Sprint 1                  │
│ Total: 80% / 100%                      │
├────────────────────────────────────────┤
│                                        │
│ 🎬 John Doe - 50%                      │
│    Sprint 1 of 3 • Started Jan S1     │
│    [Edit] [Delete]                     │
│                                        │
│ Jane Smith - 30%                       │
│    [Edit] [Delete]                     │
│                                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Project Alpha                          │
│ January 2025 Sprint 2                  │
│ Total: 80% / 100%                      │
├────────────────────────────────────────┤
│                                        │
│ John Doe - 50%                         │
│ Sprint 2 of 3 • Started Jan S1        │
│ [Edit] [Delete]                        │
│                                        │
│ Jane Smith - 30%                       │
│ [Edit] [Delete]                        │
│                                        │
└────────────────────────────────────────┘
```

### Compact Badge Design
```
🎬 1/3  ← Start badge with progress
2/3     ← Progress only
3/3 🏁  ← End badge
```

---

## ✅ Validation Rules

1. **Start Sprint**: Must be current or future sprint
2. **Number of Sprints**: Must be between 1 and 12
3. **Capacity**: Must be between 1% and 100%
4. **Conflicts**: Warn if total capacity exceeds 100% in any sprint
5. **Overlaps**: Warn if member already allocated to same project in any sprint

---

## 🚀 Implementation Phases

### Phase 1: Basic Multi-Sprint Creation
- Add form fields for start sprint and number of sprints
- Create multiple allocations in one action
- Show preview before creating
- Add allocationGroupId to link related allocations

### Phase 2: Visual Indicators
- Add start badge (🎬) to first sprint
- Show progress indicator (1 of 3)
- Add tooltip with full allocation details
- Color-code grouped allocations

### Phase 3: Edit Functionality
- Edit start sprint (recreate allocations)
- Edit capacity (update all or specific sprints)
- Extend/shorten duration
- Delete options (current/future/all)

### Phase 4: Advanced Features
- Copy multi-sprint allocation to another member
- Template multi-sprint allocations
- Bulk edit multiple groups
- Export/import multi-sprint plans

---

## 🎯 Success Criteria

After implementation, users should be able to:
1. ✅ Create 3-sprint allocation in one action (vs 3 separate actions)
2. ✅ See which allocations are part of a multi-sprint plan
3. ✅ Edit the start sprint and have future sprints adjust
4. ✅ Extend or shorten allocation duration easily
5. ✅ Delete specific sprints or entire allocation groups

---

## 💡 User Benefits

- **Time Savings**: Create 3-month allocation in seconds vs minutes
- **Consistency**: All related sprints have same percentage
- **Visibility**: Clear indication of long-term commitments
- **Flexibility**: Easy to adjust start date or duration
- **Accuracy**: Reduces errors from manual sprint-by-sprint entry

---

Ready to implement? This approach is clean, practical, and solves your exact use case!