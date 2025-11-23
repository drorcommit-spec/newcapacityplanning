# Allocation Menu Split Feature

## Overview
The Allocations menu item has been split into two separate options accessible via a dropdown menu, providing users with focused views for different allocation management tasks.

## Menu Structure

### Main Navigation
When hovering over the "Allocations" menu item, a dropdown appears with two options:

1. **Allocation Rawdata** (`/allocations/rawdata`)
   - Displays the Sprint Allocation Planning table only
   - Focused on data entry and management
   - Includes all filtering, grouping, and CRUD operations for allocations

2. **Allocation Canvas** (`/allocations/canvas`)
   - Displays the Capacity Overview section only
   - Visual representation of team and project capacity
   - Includes capacity filters, threshold controls, and sprint visualization

### Legacy Route
The original `/allocations` route still exists and shows the full AllocationPlanning page (both table and capacity overview) for backward compatibility.

## Features

### Allocation Rawdata Page
**Purpose**: Data-focused view for managing sprint allocations

**Features**:
- Add, edit, and delete allocations
- Filter by year, month, sprint, and project
- View modes: Flat list, Group by Member, Group by Project
- Expand/collapse groups
- Duplicate detection
- Capacity warning for projects exceeding max capacity
- Quick "Add & Add Another" functionality
- Inline project creation

**Use Cases**:
- Bulk allocation entry
- Reviewing allocation data in table format
- Editing specific allocations
- Analyzing allocations by member or project

### Allocation Canvas Page
**Purpose**: Visual capacity planning and analysis

**Features**:
- Team View and Project View modes
- Capacity filters (All, Under, Over, Good)
- Adjustable capacity thresholds (saved to localStorage)
- Visual indicators for capacity status
- Past sprint shading and disabling
- Copy sprint functionality
- Quick add allocations from canvas
- Inline edit and delete

**Use Cases**:
- Visual capacity planning
- Identifying under/over capacity members
- Sprint-to-sprint planning
- Team capacity balancing
- Project capacity monitoring

## Navigation Behavior

### Dropdown Menu
- **Trigger**: Hover over "Allocations" in the main navigation
- **Display**: Dropdown appears immediately below the menu item
- **Options**: Two clickable links with hover effects
- **Close**: Dropdown closes when mouse leaves the menu area or when an option is clicked

### Visual Design
- Dropdown has white background with border and shadow
- Hover state: Blue background with blue text
- Smooth transition on hover
- Chevron icon indicates dropdown availability

## Technical Implementation

### New Components
1. **AllocationRawdata.tsx**
   - Standalone page with allocation table
   - All CRUD operations
   - Filtering and grouping logic
   - Modal forms for add/edit

2. **AllocationCanvas.tsx**
   - Minimal wrapper around CapacityOverview component
   - Clean, focused interface

### Modified Components
1. **Layout.tsx**
   - Added dropdown state management
   - Hover event handlers for dropdown
   - Conditional rendering of dropdown menu
   - Chevron icon for visual indication

2. **App.tsx**
   - Added routes for `/allocations/rawdata` and `/allocations/canvas`
   - Imported new page components
   - Maintained existing `/allocations` route

### Routes
```
/allocations          → AllocationPlanning (full page - legacy)
/allocations/rawdata  → AllocationRawdata (table only)
/allocations/canvas   → AllocationCanvas (capacity overview only)
```

## User Benefits

1. **Focused Workflows**: Users can access the specific tool they need without distraction
2. **Faster Navigation**: Direct access to either data entry or visual planning
3. **Cleaner Interface**: Each page has a single, clear purpose
4. **Improved Performance**: Lighter pages load faster (especially Canvas without the large table)
5. **Better Organization**: Logical separation of data management vs. visual planning

## Dashboard Integration

The Dashboard has been updated to redirect to the new Allocation Canvas page:

### Updated Navigation Functions

1. **handleUnallocatedClick** (Unallocated Projects card)
   - Old: `navigate('/allocations?view=capacity&mode=project&projects=...')`
   - New: `navigate('/allocations/canvas?view=capacity&mode=project&projects=...')`
   - Opens Allocation Canvas in Project View with selected projects

2. **handleCapacityClick** (Under/Over Capacity cards)
   - Old: `navigate('/allocations?view=capacity&mode=team&filter=...')`
   - New: `navigate('/allocations/canvas?view=capacity&mode=team&filter=...')`
   - Opens Allocation Canvas in Team View with capacity filter applied

### URL Parameters Support

The AllocationCanvas page now supports the same URL parameters as AllocationPlanning:
- `view=capacity` - Indicates capacity overview mode
- `mode=team|project` - Sets the view mode
- `projects=id1,id2,...` - Pre-selects projects (project mode)
- `filter=under|over|good` - Applies capacity filter (team mode)
- `underThreshold=85` - Sets under capacity threshold
- `overThreshold=120` - Sets over capacity threshold

## Migration Notes

- Existing links to `/allocations` continue to work
- Dashboard now redirects to `/allocations/canvas` for capacity-related navigation
- Bookmarks and external links remain functional
- No data migration required

## Future Enhancements

Potential improvements:
- Add breadcrumb navigation showing current sub-page
- Add quick-switch button between Rawdata and Canvas views
- Remember user's last visited sub-page
- Add keyboard shortcuts for switching views
- Mobile-responsive dropdown menu
