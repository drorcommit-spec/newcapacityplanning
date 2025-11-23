# Capacity Filter Improvements

## Overview
Enhanced the Capacity Overview section with advanced filtering capabilities and improved navigation from the Dashboard.

## Features Implemented

### 1. Capacity Filter in Team View Mode
- **Location**: Capacity Overview section (Team View mode only)
- **Filter Options** (displayed as button group with icons):
  - **All Members**: Shows all team members (default) - Blue button
  - **Under Capacity**: Shows only members with at least one sprint below the under capacity threshold - Yellow button with green down arrow icon ↓
  - **Over Capacity**: Shows only members with at least one sprint above the over capacity threshold - Red button with red up arrow icon ↑
  - **Good Capacity**: Shows only members with at least one sprint within the good capacity range - Green button with checkmark icon ✓

### 2. Threshold Controls in Capacity Overview
- **Location**: Capacity Overview section (Team View mode only)
- **Controls**:
  - **Under Capacity Threshold**: Adjustable percentage (default: 85%)
  - **Over Capacity Threshold**: Adjustable percentage (default: 120%)
- **Behavior**: 
  - Thresholds can be updated directly in the Capacity Overview or Dashboard
  - Changes immediately affect the capacity indicators and filters
  - Visual indicators (⚠️) appear on sprints that fall outside the thresholds
  - **Persistent Storage**: Values are saved to browser localStorage and persist across sessions
  - Both Dashboard and Capacity Overview share the same threshold values

### 3. Dashboard Navigation Enhancement
- **Clickable Cards with Visual Indicators**: 
  - "Under Capacity Members" card is now clickable (when count > 0) with green down arrow icon ↓
  - "Over Capacity Members" card is now clickable (when count > 0) with red up arrow icon ↑
  - Hover effect indicates clickability
  - Icons provide visual consistency with the filter buttons
  
- **Navigation Behavior**:
  - Clicking redirects to the Allocation Planning page
  - Automatically scrolls to the Capacity Overview section
  - Sets Team View mode
  - Applies the appropriate capacity filter (under/over)
  - Passes the threshold values from the Dashboard
  - Filters to show the specific sprint that was clicked

### 4. URL Parameters
The following URL parameters are supported for deep linking:

**Team View with Capacity Filter**:
```
/allocations?view=capacity&mode=team&filter=under&year=2024&month=11&sprint=1&underThreshold=90&overThreshold=110
```

**Project View with Project Filter**:
```
/allocations?view=capacity&mode=project&projects=proj1,proj2,proj3
```

**Parameters**:
- `view`: Set to "capacity" to show capacity overview
- `mode`: "team" or "project"
- `filter`: "under", "over", "good", or "all" (team mode only)
- `year`, `month`, `sprint`: Filter allocation table to specific sprint
- `underThreshold`: Under capacity threshold percentage
- `overThreshold`: Over capacity threshold percentage
- `projects`: Comma-separated list of project IDs (project mode only)

## User Workflow

### Scenario 1: Addressing Under Capacity Members
1. User views Dashboard and sees "3" under capacity members for current sprint
2. User clicks on the yellow "Under Capacity Members" card
3. System navigates to Allocation Planning page
4. Page automatically scrolls to Capacity Overview
5. Capacity Overview shows:
   - Team View mode
   - Only members with under capacity sprints
   - Thresholds set from Dashboard
   - Allocation table filtered to the clicked sprint
6. User can now quickly add allocations to under-capacity members

### Scenario 2: Managing Over Capacity Members
1. User views Dashboard and sees "2" over capacity members for next sprint
2. User clicks on the red "Over Capacity Members" card
3. System navigates to Allocation Planning page
4. Page automatically scrolls to Capacity Overview
5. Capacity Overview shows:
   - Team View mode
   - Only members with over capacity sprints
   - Thresholds set from Dashboard
   - Allocation table filtered to the clicked sprint
6. User can adjust or remove allocations from over-capacity members

### Scenario 3: Custom Threshold Analysis
1. User navigates to Allocation Planning page
2. Scrolls to Capacity Overview section
3. Adjusts thresholds (e.g., Under: 85%, Over: 115%)
4. Selects "Under Capacity" filter
5. Reviews only members below 85% capacity
6. Makes allocation adjustments as needed

## Technical Implementation

### Components Modified
1. **CapacityOverview.tsx**:
   - Added `capacityFilter` state
   - Added `underCapacityThreshold` and `overCapacityThreshold` as editable state with localStorage persistence
   - Added filter logic in `teamViewData` useMemo
   - Added UI controls for thresholds and capacity filter
   - Added props for initial values from URL parameters
   - Thresholds load from localStorage on mount (defaults: 85% under, 120% over)
   - Thresholds save to localStorage on change

2. **Dashboard.tsx**:
   - Added `handleCapacityClick` function
   - Made capacity cards clickable with hover effects
   - Pass threshold values in navigation URL
   - Thresholds load from localStorage on mount (defaults: 85% under, 120% over)
   - Thresholds save to localStorage on change
   - Uses same localStorage keys as CapacityOverview for consistency

3. **AllocationPlanning.tsx**:
   - Added state for capacity filter parameters
   - Enhanced URL parameter handling
   - Pass filter parameters to CapacityOverview component
   - Added auto-scroll functionality

### LocalStorage Keys
- `capacityThreshold_under`: Stores the under capacity threshold percentage
- `capacityThreshold_over`: Stores the over capacity threshold percentage
- Default values: 85% (under) and 120% (over) as per database configuration

### 5. Past Sprint Handling
- **Visual Indication**: Past sprints are displayed with reduced opacity (50%) and gray background
- **Disabled Actions**: All action buttons (copy, add, edit, delete) are hidden for past sprints
- **Past Label**: A "(Past)" label appears next to the sprint name
- **Filter Exclusion**: Capacity filters only consider current and future sprints, not past ones
- **Warning Suppression**: Capacity warning indicators (⚠️) are not shown for past sprints

**Sprint Classification**:
- A sprint is considered "past" if it has already ended based on the current date
- Sprint 1: Days 1-15 of the month
- Sprint 2: Days 16-end of the month
- Current sprint and future sprints remain fully interactive

## Benefits
- **Faster Problem Resolution**: Quickly identify and address capacity issues
- **Flexible Analysis**: Adjust thresholds on-the-fly for different scenarios
- **Improved Navigation**: Direct links from Dashboard to specific capacity issues
- **Better Visibility**: Filter out noise to focus on problematic allocations
- **Consistent Thresholds**: Dashboard thresholds carry over to detailed view
- **Historical Context**: Past sprints remain visible for reference but cannot be modified
- **Focus on Future**: Filters and warnings only apply to actionable (current/future) sprints
