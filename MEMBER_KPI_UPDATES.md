# Member KPI Updates

## Overview
Updated the Dashboard member KPIs to improve accuracy and moved the "Unallocated Members" KPI from sprint sections to the Overall Summary with a floating panel for quick allocation.

## Changes Made

### 1. Fixed "Under Capacity" KPI
**Previous Behavior**: Counted ALL active members who were under capacity threshold, including those not allocated to the sprint.

**New Behavior**: Only counts members who:
- Have allocations in the sprint (total > 0)
- AND their total allocation is less than their capacity threshold

**Logic**:
```typescript
isUnder: total > 0 && total < underThreshold
```

This ensures the KPI accurately reflects members who are working but underutilized, not members who simply aren't allocated to that sprint.

### 2. Moved "Unallocated Members" to Overall Summary
**Previous Location**: Displayed in each sprint's MEMBER KPIs section

**New Location**: Overall Summary section (6th tile)

**Rationale**: 
- Unallocated members are not sprint-specific
- Should show members not in ANY current or future sprint
- More actionable at the overall level

### 3. Added Unallocated Members Floating Panel
Similar to the Projects Without Sprint panel, clicking the "Unallocated Members" tile opens a panel showing:

**Member Information Displayed**:
- Full Name (bold)
- Email
- Role
- Capacity percentage
- Team badges (if assigned)

**Quick Actions**:
Three sprint allocation buttons per member:
1. **Current Sprint** (Blue)
2. **Next Sprint** (Green)
3. **2 Sprints Ahead** (Purple)

**Navigation**: Clicking a sprint button navigates to Capacity Planning in Team view with the sprint pre-selected.

## Implementation Details

### Under Capacity Calculation
```typescript
const memberAllocations = activeMembers
  .map(member => {
    const memberAllocs = sprintAllocations.filter(a => a.productManagerId === member.id);
    const total = memberAllocs.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
    
    return {
      member,
      total,
      isUnder: total > 0 && total < underThreshold, // Only if allocated but under
      hasAllocation: total > 0,
    };
  })
  .filter(m => m.hasAllocation); // Only include members with allocations
```

### Unallocated Members Calculation
```typescript
// Find members not in any current or future sprint
const membersInAnySprint = new Set<string>();
sprints.forEach(sprint => {
  const sprintAllocs = allocations.filter(...);
  sprintAllocs.forEach(a => membersInAnySprint.add(a.productManagerId));
});

const membersWithoutSprint = activeMembers.filter(
  m => !membersInAnySprint.has(m.id)
);
```

### Overall Summary Updates
- Grid changed from 5 to 6 columns (responsive: 3 on md, 6 on lg)
- Added new tile with red theme for unallocated members
- Shows count with visual indicator (red when > 0, gray when 0)

## UI/UX Improvements

### Visual Hierarchy
- **Red theme**: Indicates critical attention needed for unallocated members
- **Orange theme**: Projects without sprint (warning level)
- **Clear separation**: Overall vs sprint-specific metrics

### User Flow
1. User views Dashboard
2. Sees "Unallocated Members" tile in Overall Summary
3. Clicks tile to open panel
4. Reviews list of unallocated members with details
5. Clicks sprint button for desired member
6. Navigates to Capacity Planning (Team view) with sprint pre-selected
7. Can add member to projects in that sprint

### Empty States
Both panels show positive reinforcement when empty:
- ✅ Success icon
- "All [projects/members] are allocated!" message
- Encouraging feedback

## Benefits

1. **Accuracy**: "Under Capacity" now correctly reflects sprint-specific utilization
2. **Visibility**: Unallocated members are more prominent in Overall Summary
3. **Action**: Quick allocation workflow reduces navigation
4. **Planning**: Helps ensure all team members are utilized
5. **Oversight**: Management can track resource utilization at a glance

## Files Modified
- `product-capacity-platform/src/pages/Dashboard.tsx`
  - Updated member KPI calculation logic
  - Removed `unallocatedMembers` from sprint KPIs
  - Added `membersWithoutSprint` to Overall Summary
  - Added `showUnallocatedMembersPanel` state
  - Changed grid from 5 to 6 columns
  - Added unallocated members tile
  - Added unallocated members floating panel
  - Removed unallocated members button from sprint sections

## Testing Scenarios

### Test 1: Under Capacity Accuracy
1. Create a member with 100% capacity
2. Allocate them 50% in current sprint
3. Verify they appear in "Under Capacity" KPI
4. Remove allocation
5. Verify they NO LONGER appear in "Under Capacity" KPI

### Test 2: Unallocated Members
1. Create a new active member
2. Don't allocate them to any sprint
3. Verify they appear in "Unallocated Members" tile (count = 1)
4. Click tile to open panel
5. Verify member details are displayed
6. Click "Current Sprint" button
7. Verify navigation to Capacity Planning Team view

### Test 3: Sprint KPIs
1. Navigate to Dashboard
2. Expand MEMBER KPIs for any sprint
3. Verify "Unallocated" button is NOT present
4. Verify only relevant KPIs are shown (Under/Over Capacity, Single/Multiple Projects)
