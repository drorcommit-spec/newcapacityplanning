# Resource Role Multi-Select Filter Enhancement

## Overview
Enhanced Capacity Planning with resource role multi-select filters for both Project and Team view modes:
- **Project View**: Filter projects by missing specific resource roles
- **Team View**: Filter team members by their assigned roles

## Changes Made

### 1. Added State Management
- Added `showRoleSelector` state to control dropdown visibility
- Added `roleSelectorRef` for click-outside detection

### 2. Improved Filter Dropdown
**Before:**
- Selecting "Missing Specific Resources..." did nothing
- Dropdown only appeared after roles were already selected
- No way to initially see available roles

**After:**
- Selecting "Missing Specific Resources..." immediately opens the role selector
- Shows all available resource roles from active team members
- Multi-select checkboxes for each role
- Shows count of selected roles
- "Clear all" button to reset selection
- Close button (✕) to dismiss dropdown
- Click outside to close dropdown

### 3. Enhanced UX Features
- **Auto-open**: Dropdown opens immediately when "Missing Specific Resources..." is selected
- **Visual feedback**: Shows count of selected roles
- **Easy reset**: "Clear all" button and close button
- **Click-outside**: Dropdown closes when clicking anywhere outside
- **Persistent selection**: Selected roles remain when reopening dropdown
- **Smart reset**: If no roles selected when closing, filter resets to "All Projects"

## How to Use

1. **Navigate to Capacity Planning** → Project View
2. **Open the filter dropdown** (third dropdown in filters section)
3. **Select "Missing Specific Resources..."**
4. **Multi-select roles** from the dropdown that appears:
   - Check/uncheck roles to filter by
   - See count of selected roles at bottom
   - Click "Clear all" to deselect all
   - Click ✕ or outside to close
5. **View filtered projects** that are missing allocations for selected roles

## Filter Logic

The filter shows projects where:
- Role requirements are set for the sprint
- Allocated percentage for selected role(s) is less than required
- Any of the selected roles are under-allocated

Example:
- Project requires: Product Manager (50%), PMO (30%)
- Currently allocated: Product Manager (30%), PMO (30%)
- If "Product Manager" is selected in filter → Project shows (missing 20%)
- If "PMO" is selected in filter → Project doesn't show (fully allocated)

## Technical Details

### State Variables
```typescript
const [showRoleSelector, setShowRoleSelector] = useState(false);
const roleSelectorRef = useRef<HTMLDivElement>(null);
```

### Click-Outside Handler
```typescript
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (roleSelectorRef.current && !roleSelectorRef.current.contains(event.target as Node)) {
      setShowRoleSelector(false);
    }
  }
  if (showRoleSelector) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [showRoleSelector]);
```

### Role Selection
- Roles are extracted from active team members
- Sorted alphabetically
- Duplicates removed using Set
- Stored in `missingAllocationRoles` array

## Benefits

✅ **Better Visibility**: Users can see all available resource types
✅ **Flexible Filtering**: Multi-select allows filtering by multiple roles at once
✅ **Intuitive UX**: Dropdown opens immediately when needed
✅ **Easy Management**: Clear all and close buttons for quick actions
✅ **Smart Behavior**: Auto-closes on outside click, resets when appropriate

## Team View Role Filter

### New Feature
Added a multi-select role filter for Team view mode to filter team members by their assigned roles.

### How to Use

1. **Navigate to Capacity Planning** → Team View
2. **Click the role filter button** (third filter, shows "All Roles" by default)
3. **Multi-select roles** from the dropdown:
   - Check/uncheck roles to filter by
   - See count of selected roles in button text
   - Click "Clear all" to deselect all
   - Click ✕ or outside to close
4. **View filtered members** - only members with selected roles are shown

### Filter Logic

- Shows only team members whose role matches one of the selected roles
- If no roles selected, shows all team members
- Works in combination with other filters (search, capacity)

### Benefits

✅ **Focus on specific roles**: Quickly see only Product Managers, PMOs, etc.
✅ **Multi-role view**: Select multiple roles to see combined view
✅ **Easy management**: Clear all and close buttons for quick actions
✅ **Consistent UX**: Same interaction pattern as Project view filter

## Files Modified

- `src/pages/CapacityPlanning.tsx`
  - **Project View Filter:**
    - Added `showRoleSelector` state
    - Added `roleSelectorRef` for click-outside detection
    - Enhanced dropdown UI with close button and clear all
    - Added click-outside handler
    - Improved role selection logic
  - **Team View Filter:**
    - Added `teamRoleFilter` state for selected roles
    - Added `showTeamRoleSelector` state for dropdown visibility
    - Added `teamRoleSelectorRef` for click-outside detection
    - Added role filter logic to `getMembersForSprint` function
    - Added multi-select role filter UI
