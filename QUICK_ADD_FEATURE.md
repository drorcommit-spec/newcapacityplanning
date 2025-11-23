# Quick Add Allocation Feature

## Overview
Added "+" icons to Capacity Overview that allow users to quickly create new allocations with context-aware pre-population.

## Feature Details

### Team View Mode
- **Location**: "+" icon appears next to each sprint total (Sprint 1 and Sprint 2)
- **Pre-populated Fields**:
  - Product Manager (from the current team member)
  - Year (from the sprint card)
  - Month (from the sprint card)
  - Sprint (1 or 2)
- **User Selects**:
  - Project (dropdown of all active projects)
  - Allocation Percentage

### Project View Mode
- **Location**: "+" icon appears next to each sprint total (Sprint 1 and Sprint 2)
- **Pre-populated Fields**:
  - Project (from the current project)
  - Year (from the sprint card)
  - Month (from the sprint card)
  - Sprint (1 or 2)
- **User Selects**:
  - Product Manager (dropdown of all active team members)
  - Allocation Percentage

## User Flow Examples

### Example 1: Allocate Team Member to Project
**Scenario**: You're viewing Miri's capacity and want to add her to a new project

1. Open Capacity Overview in Team View
2. Find Miri's section
3. Navigate to the month/sprint you want to allocate
4. Click the "+" icon next to "Sprint 1: 60%"
5. Modal opens with:
   - Product Manager: Miri Izhaki (pre-filled)
   - Sprint: 2025 - November - Sprint 1 (pre-filled)
6. Select "DCG - MVP" from Project dropdown
7. Enter "20" for allocation percentage
8. Click "Add Allocation"
9. New allocation appears immediately in the capacity view

### Example 2: Add Team Member to Project
**Scenario**: You're viewing DCG project and want to add another team member

1. Open Capacity Overview in Project View
2. Select "DCG - MVP" project
3. Navigate to the month/sprint you want to allocate
4. Click the "+" icon next to "Sprint 2: 40%"
5. Modal opens with:
   - Project: DCG - MVP (pre-filled)
   - Sprint: 2025 - November - Sprint 2 (pre-filled)
6. Select "Maor Avital" from Product Manager dropdown
7. Enter "30" for allocation percentage
8. Click "Add Allocation"
9. New allocation appears immediately in the capacity view

## Technical Implementation

### Files Modified
1. **src/components/CapacityOverview.tsx**
   - Added `NewAllocationData` interface
   - Added state for new allocation form
   - Added `handleAddClick` function
   - Added `handleSaveNewAllocation` function
   - Added "+" buttons to sprint sections
   - Added new allocation modal

2. **src/context/DataContext.tsx**
   - Updated `addAllocation` type signature to exclude `createdBy` from the allocation object
   - Fixed type consistency

### Key Functions

#### handleAddClick
```typescript
const handleAddClick = (data: NewAllocationData) => {
  setNewAllocationData(data);
  setNewAllocationForm({
    projectId: data.projectId || '',
    productManagerId: data.pmId || '',
    allocationPercentage: '',
  });
};
```

#### handleSaveNewAllocation
- Validates percentage (0-100)
- Checks for duplicate allocations
- Validates project max capacity
- Creates new allocation with pre-populated context
- Refreshes capacity overview automatically

## Validation Rules

### Duplicate Prevention
- Checks if allocation already exists for same PM, Project, Year, Month, Sprint
- Shows error message if duplicate found

### Capacity Warnings
- Calculates total allocation for project in sprint
- Compares against project's max capacity percentage
- Shows warning if exceeded with option to continue

### Input Validation
- Percentage must be between 0-100
- Both project and PM must be selected
- Automatically calculates days from percentage

## UI/UX Details

### Visual Design
- **Icon**: Green "+" symbol (indicates creation action)
- **Position**: Right side of sprint total line
- **Size**: 16x16px (w-4 h-4)
- **Color**: Green-600 (hover: Green-800)
- **Tooltip**: "Add allocation"

### Permissions
- Only visible to users with write permissions
- Product Managers (read-only) do not see the "+" icons
- Respects same permission system as edit functionality

### Modal Layout
1. **Pre-filled Context** (gray background boxes)
   - Shows what's already determined
   - Not editable
2. **Selection Fields** (dropdowns)
   - Only shows what needs to be selected
   - Sorted alphabetically
3. **Percentage Input**
   - Number input with 5% step
   - Shows calculated days below
4. **Action Buttons**
   - Cancel (gray)
   - Add Allocation (blue)

## Benefits

### Time Savings
- **Before**: Navigate to Allocation Planning → Fill all 6 fields → Save
- **After**: Click "+" → Select 1-2 fields → Save
- **Reduction**: ~70% fewer clicks and fields to fill

### Context Preservation
- No need to remember which PM/Project you were viewing
- No need to manually select year/month/sprint
- Reduces errors from selecting wrong context

### Workflow Efficiency
- Stay in capacity overview while planning
- See immediate impact of new allocations
- Quick iteration on capacity planning

## Future Enhancements (Potential)

1. **Bulk Add**: Add multiple allocations at once
2. **Copy Sprint**: Copy all allocations from one sprint to another
3. **Templates**: Save common allocation patterns
4. **Drag & Drop**: Drag projects to team members to create allocations
5. **Keyboard Shortcuts**: Quick add with keyboard (e.g., Ctrl+N)

## Testing Checklist

- [ ] "+" icon appears in Team View for each sprint
- [ ] "+" icon appears in Project View for each sprint
- [ ] "+" icon only visible to users with write permissions
- [ ] Team View pre-populates PM correctly
- [ ] Project View pre-populates project correctly
- [ ] Year, month, sprint always pre-populated correctly
- [ ] Dropdown shows correct options (active projects/PMs)
- [ ] Duplicate validation works
- [ ] Capacity warning works
- [ ] Percentage validation works (0-100)
- [ ] Days calculation is correct
- [ ] New allocation appears immediately after save
- [ ] Modal closes after successful save
- [ ] Cancel button works without saving
