# Member Management Enhancements

## Overview
Enhanced the Team Members page with improved search, filtering, reactivation capabilities, and member capacity management.

## Features Implemented

### 1. ✅ Reactivate Deactivated Members
**Feature**: Users can now reactivate previously deactivated members.

**How it works**:
- Inactive members show an "Activate" button instead of "Deactivate"
- Clicking "Activate" restores the member to active status
- Member appears in all active member lists again

**UI Changes**:
- Added "Activate" button (green) for inactive members
- "Deactivate" button (red) for active members

### 2. ✅ Search by Name/Email/Team
**Feature**: Added search field to find members by name, email, or team.

**How it works**:
- Search box filters members in real-time
- Searches across: Full Name, Email, Team
- Case-insensitive search
- Works in combination with other filters

**UI Changes**:
- Added "Search by Name/Email/Team" input field
- Positioned in filter section at top of page

### 3. ✅ Search by Role
**Feature**: Added dedicated search field to find members by role.

**How it works**:
- Separate search box specifically for role filtering
- Case-insensitive search
- Works in combination with other filters
- Different from role dropdown (allows partial matches)

**UI Changes**:
- Added "Search by Role" input field
- Positioned next to name search field

### 4. ✅ Member Capacity Field
**Feature**: Added capacity percentage field (0-100%) for each member.

**How it works**:
- Default capacity: 100%
- Range: 0-100%
- Editable in member form (new/edit)
- Displayed in member list table
- All existing members automatically set to 100%

**UI Changes**:
- Added "Capacity" column in members table
- Added "Capacity (%)" field in member form
- Number input with min/max validation
- Helper text: "Member's available capacity (0-100%). Default is 100%."

**Use Cases**:
- Part-time employees (e.g., 50% capacity)
- Members with reduced availability
- Contractors with limited hours
- Capacity planning calculations

### 5. ✅ Show Inactive Members Toggle
**Feature**: Added checkbox to show/hide inactive members.

**How it works**:
- By default, only active members are shown
- Check "Show inactive members" to include deactivated members
- Inactive members clearly marked with gray badge
- Allows reactivation of inactive members

**UI Changes**:
- Added checkbox: "Show inactive members"
- Positioned below search/filter fields

## UI Layout

### Filter Section (Top of Page)
```
┌─────────────────────────────────────────────────────────┐
│ Search by Name/Email/Team | Search by Role | Filter by Role │
├─────────────────────────────────────────────────────────┤
│ ☐ Show inactive members                                 │
└─────────────────────────────────────────────────────────┘
```

### Members Table
```
┌──────────┬────────┬──────┬─────────┬──────┬──────────┬────────┬─────────┐
│ Name     │ Email  │ Role │ Manager │ Team │ Capacity │ Status │ Actions │
├──────────┼────────┼──────┼─────────┼──────┼──────────┼────────┼─────────┤
│ John Doe │ j@...  │ PM   │ Jane    │ A    │ 100%     │ Active │ Edit... │
│ Jane S.  │ jane@..│ Dir  │ -       │ A    │ 80%      │ Active │ Edit... │
│ Bob M.   │ bob@.. │ PMO  │ Jane    │ B    │ 50%      │Inactive│ Activate│
└──────────┴────────┴──────┴─────────┴──────┴──────────┴────────┴─────────┘
```

### Member Form (New/Edit)
```
┌─────────────────────────────────────┐
│ Full Name: [________________]       │
│ Email: [____________________]       │
│ Role: [▼ Product Manager    ]       │
│ Manager: [▼ Select Manager  ]       │
│ Capacity (%): [100]                 │
│   Member's available capacity...    │
│ Team: [▼ Select Team        ]       │
│                                     │
│         [Cancel]  [Save]            │
└─────────────────────────────────────┘
```

## Technical Implementation

### Type Changes
```typescript
// src/types/index.ts
export interface TeamMember {
  // ... existing fields
  capacity?: number; // Member capacity percentage (0-100), default 100
}
```

### State Management
```typescript
// TeamManagement.tsx
const [searchTerm, setSearchTerm] = useState('');
const [searchRole, setSearchRole] = useState('');
const [showInactive, setShowInactive] = useState(false);
const [formData, setFormData] = useState({
  // ... existing fields
  capacity: 100,
});
```

### Filter Logic
```typescript
const filteredMembers = teamMembers.filter(member => {
  // Active/Inactive filter
  if (!showInactive && !member.isActive) return false;
  
  // Role filter
  if (roleFilter !== 'all' && member.role !== roleFilter) return false;
  
  // Search by name/email/team
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const matches = member.fullName.toLowerCase().includes(searchLower) ||
                   member.email.toLowerCase().includes(searchLower) ||
                   member.team?.toLowerCase().includes(searchLower);
    if (!matches) return false;
  }
  
  // Search by role
  if (searchRole) {
    if (!member.role.toLowerCase().includes(searchRole.toLowerCase())) {
      return false;
    }
  }
  
  return true;
});
```

### Migration Script
Created `server/set-default-capacity.js` to set capacity=100 for all existing members.

## Benefits

✅ **Better Member Discovery**: Multiple search options make finding members easy
✅ **Flexible Filtering**: Combine multiple filters for precise results
✅ **Member Lifecycle**: Can deactivate and reactivate members as needed
✅ **Capacity Planning**: Track part-time and reduced capacity members
✅ **Data Integrity**: All existing members automatically get 100% capacity
✅ **User-Friendly**: Intuitive UI with clear labels and helper text

## Files Modified

1. **src/types/index.ts**
   - Added `capacity?: number` to TeamMember interface

2. **src/pages/TeamManagement.tsx**
   - Added search by name/email/team
   - Added search by role
   - Added show inactive toggle
   - Added capacity field to form
   - Added activate button for inactive members
   - Updated filter logic
   - Added capacity column to table

3. **server/set-default-capacity.js** (new)
   - Migration script to set capacity=100 for existing members

## Usage Examples

### Find all Product Managers
1. Type "Product Manager" in "Search by Role" field
2. Or select "Product Manager" from "Filter by Role" dropdown

### Find part-time members
1. Look at Capacity column
2. Members with <100% are part-time

### Reactivate a former employee
1. Check "Show inactive members"
2. Find the member in the list
3. Click "Activate" button

### Add a part-time contractor
1. Click "Add Member"
2. Fill in details
3. Set Capacity to 50 (for 50%)
4. Save

## Future Enhancements (Optional)

- Filter by capacity range (e.g., show only <100%)
- Bulk activate/deactivate
- Export member list with capacity
- Capacity history tracking
- Capacity-based allocation warnings
