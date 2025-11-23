# Navigation and Editing Improvements

## Overview
Three major improvements have been added to enhance user experience and workflow efficiency.

## 1. Project Filter on Sprint Allocation Planning

### Feature
Added a project filter dropdown on the Sprint Allocation Planning page alongside the existing Year and Month filters.

### Benefits
- Quickly view allocations for a specific project
- Filter by "All Projects" or select individual projects
- Projects are sorted alphabetically by customer name, then project name

### Usage
1. Navigate to Sprint Allocation Planning
2. Use the "Project" dropdown to filter allocations
3. Combine with Year and Month filters for precise filtering

## 2. Click-to-Navigate from Project Management

### Feature
Project names in the Project Management table are now clickable and navigate to the Allocations page with automatic filtering.

### Benefits
- Quick navigation from project to its allocations
- Automatically filters to current month and selected project
- Saves time when reviewing project capacity

### Usage
1. Navigate to Project Management
2. Click on any project name (shown in blue with hover effect)
3. Automatically redirected to Allocations page filtered by:
   - Selected project
   - Current year
   - Current month

### Visual Indicators
- Project names are displayed in blue
- Hover shows underline effect
- Tooltip: "Click to view allocations"

## 3. Inline Capacity Editing in Capacity Overview

### Feature
Capacity percentages in both Team View and Project View are now directly editable with a small edit icon.

### Benefits
- Quick updates without navigating to allocation planning
- Edit allocations directly from capacity overview
- Maintains all validation rules (duplicates, capacity warnings)
- Respects role permissions (read-only for Product Managers)

### Usage
1. Navigate to Capacity Overview (shown at bottom of Allocation Planning page)
2. Switch between Team View or Project View
3. Click on any percentage value with the edit icon (✏️)
4. Modal opens showing:
   - Product Manager name
   - Project name
   - Sprint details (Year, Month, Sprint number)
   - Current allocation percentage
5. Enter new percentage
6. Click "Update" to save

### Validations
- Prevents duplicate allocations
- Checks project max capacity
- Shows warning if capacity exceeded (with option to continue)
- Validates percentage is between 0-100
- Automatically calculates days from percentage

### Visual Indicators
- Edit icon (✏️) appears next to each percentage
- Percentages are shown in blue when editable
- Hover effect on clickable values
- Tooltip: "Edit allocation"

### Permissions
- Only users with write permissions see edit icons
- Product Managers (read-only) see plain text without edit capability

## Technical Implementation

### Files Modified
1. **src/pages/AllocationPlanning.tsx**
   - Added project filter dropdown
   - Added URL parameter handling for navigation
   - Updated filtering logic to include project filter

2. **src/pages/ProjectManagement.tsx**
   - Added click handler for project names
   - Integrated React Router navigation
   - Made project names clickable with visual feedback

3. **src/components/CapacityOverview.tsx**
   - Added inline editing modal
   - Integrated edit icons for each allocation
   - Added validation and capacity checking
   - Implemented permission-based display

### Dependencies
- React Router (useNavigate, useSearchParams)
- Existing validation logic from AllocationPlanning
- Permission system integration

## User Experience Flow

### Scenario 1: Review Project Allocations
1. Go to Project Management
2. Click on "Super-Pharm - SPIRIT" project
3. Automatically see all allocations for that project in current month
4. Adjust filters if needed to see other months

### Scenario 2: Quick Capacity Adjustment
1. View Capacity Overview in Team View
2. Notice Miri has 40% on JarTracking in Sprint 1
3. Click the "40%" value with edit icon
4. Change to 35%
5. Click Update
6. Capacity immediately reflects the change

### Scenario 3: Project Capacity Planning
1. Switch to Project View in Capacity Overview
2. Select "DCG - MVP" project
3. See all team members allocated to this project
4. Click on any allocation percentage to adjust
5. System warns if total exceeds project max capacity

## 4. Quick Add Allocations from Capacity Overview

### Feature
"+" icons appear at the sprint level in both Team View and Project View, allowing quick allocation creation with pre-populated context.

### Benefits
- Create allocations directly from capacity overview
- Context is automatically filled based on view mode
- Reduces clicks and navigation
- Streamlines allocation workflow

### Usage - Team View
1. Navigate to Capacity Overview (Team View)
2. Find the team member and sprint you want to allocate
3. Click the "+" icon next to the sprint total
4. Modal opens with pre-populated:
   - Product Manager (already selected)
   - Year, Month, Sprint (already set)
5. Select a project from dropdown
6. Enter allocation percentage
7. Click "Add Allocation"
8. Capacity Overview automatically refreshes

### Usage - Project View
1. Navigate to Capacity Overview (Project View)
2. Find the project and sprint you want to allocate
3. Click the "+" icon next to the sprint total
4. Modal opens with pre-populated:
   - Project (already selected)
   - Year, Month, Sprint (already set)
5. Select a product manager from dropdown
6. Enter allocation percentage
7. Click "Add Allocation"
8. Capacity Overview automatically refreshes

### Validations
- Prevents duplicate allocations
- Checks project max capacity
- Shows warning if capacity exceeded (with option to continue)
- Validates percentage is between 0-100
- Automatically calculates days from percentage

### Visual Indicators
- Green "+" icon appears next to sprint totals
- Hover effect on "+" button
- Tooltip: "Add allocation"
- Only visible to users with write permissions

## 5. Multi-Select Project Filter in Capacity Overview

### Feature
The project filter in Project View mode now supports selecting multiple projects simultaneously.

### Benefits
- View capacity for multiple projects at once
- Compare allocations across different projects
- More flexible filtering options
- Shows count of selected projects

### Usage
1. Navigate to Capacity Overview (Project View)
2. Click on the "Projects" filter dropdown
3. Select multiple projects by checking their checkboxes
4. Select "All Projects" to clear all selections
5. View shows only the selected projects

### Visual Indicators
- Scrollable list with checkboxes
- "All Projects" option at the top
- Counter showing "X projects selected"
- Max height with scroll for long lists

## 6. Project Name Tooltips

### Feature
Hovering over project names in Project View displays a tooltip with customer name and max capacity.

### Benefits
- Quick access to project details without navigation
- See max capacity at a glance
- Better context when viewing multiple projects

### Usage
1. Navigate to Capacity Overview (Project View)
2. Hover over any project name
3. Tooltip appears showing:
   - Customer name
   - Max capacity percentage (if set)

### Visual Indicators
- Cursor changes to help cursor (question mark)
- Tooltip appears on hover
- Multi-line tooltip for better readability

## Benefits Summary

✅ **Faster Navigation** - One click from project to allocations
✅ **Efficient Editing** - Update allocations without leaving capacity view
✅ **Quick Creation** - Add allocations directly from capacity overview
✅ **Better Filtering** - Multi-select projects for flexible viewing
✅ **Quick Info Access** - Tooltips show project details on hover
✅ **Maintained Validations** - All business rules still enforced
✅ **Permission Aware** - Respects user roles and permissions
✅ **Improved UX** - Intuitive workflows with visual feedback
✅ **Context Awareness** - Forms pre-populate based on current view
