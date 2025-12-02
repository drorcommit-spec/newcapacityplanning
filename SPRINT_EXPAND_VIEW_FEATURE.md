# Sprint Expand View Feature

## Overview
Added the ability to expand a single sprint to full-screen view in Capacity Planning, displaying projects or members in a responsive grid layout for better visibility when dealing with many items.

## Features

### Expand/Collapse Button
- **Location**: Sprint header, next to the "Add" button
- **Icon**: 
  - Expand: Four arrows pointing outward (⛶)
  - Collapse: X icon
- **Behavior**: Click to toggle between normal and expanded view
- **Restriction**: Only one sprint can be expanded at a time

### Normal View
- Multiple sprint columns displayed side-by-side
- Vertical list layout for projects/members
- Fixed column width (450px)
- Horizontal scrolling for many sprints

### Expanded View
- Single sprint takes full width
- Responsive grid layout:
  - 1 column on mobile
  - 2 columns on medium screens (md)
  - 3 columns on large screens (lg)
  - 4 columns on extra-large screens (xl)
- Other sprints are hidden
- More space for viewing many items

## Implementation Details

### State Management
```typescript
const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
```

Tracks which sprint is currently expanded using sprint key format: `${year}-${month}-${sprint}`

### Layout Logic
```typescript
const sprintKey = `${sprint.year}-${sprint.month}-${sprint.sprint}`;
const isExpanded = expandedSprint === sprintKey;
const isHidden = expandedSprint && !isExpanded;

if (isHidden) return null; // Hide non-expanded sprints
```

### Container Classes
**Normal View**:
```typescript
<div className="flex gap-6 p-6 max-w-[1920px] mx-auto">
```

**Expanded View**:
```typescript
<div className="p-6">
```

### Content Classes
**Projects View - Normal**:
```typescript
<div className="p-3 space-y-3">
```

**Projects View - Expanded**:
```typescript
<div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

**Teams View - Normal**:
```typescript
<div className="p-3 space-y-3">
```

**Teams View - Expanded**:
```typescript
<div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
```

## User Experience

### Workflow
1. User views Capacity Planning with multiple sprints
2. Clicks expand button on a sprint header
3. Sprint expands to full width with grid layout
4. Other sprints disappear
5. User can scroll through grid of projects/members
6. Clicks collapse button (X) to restore normal view
7. All sprints reappear in column layout

### Visual Feedback
- Expand icon changes to X when expanded
- Smooth transition between layouts
- Grid automatically adjusts to screen size
- Maintains all functionality (edit, delete, add, etc.)

### Responsive Breakpoints
- **Mobile (< 768px)**: 1 column
- **Tablet (768px - 1024px)**: 2 columns
- **Desktop (1024px - 1280px)**: 3 columns
- **Large Desktop (> 1280px)**: 4 columns

## Benefits

1. **Better Visibility**: See more items at once in grid layout
2. **Reduced Scrolling**: Grid layout reduces vertical scrolling
3. **Focus**: Hide other sprints to focus on one
4. **Responsive**: Adapts to screen size automatically
5. **Maintains Functionality**: All actions still available in expanded view
6. **Easy Toggle**: One click to expand/collapse

## Use Cases

### High Project Count
- Sprint with 20+ projects
- Expand to see all in grid
- Easier to scan and compare

### Team View with Many Members
- Large team (30+ members)
- Grid layout shows more at once
- Better overview of capacity

### Detailed Planning
- Focus on single sprint
- Remove distractions from other sprints
- Deep dive into allocations

## Technical Notes

- Only one sprint can be expanded at a time
- Expanding a sprint automatically collapses any previously expanded sprint
- Grid uses Tailwind CSS responsive classes
- All existing functionality preserved (inline editing, modals, etc.)
- No data changes, purely UI enhancement
- State is not persisted (resets on page refresh)

## Files Modified
- `product-capacity-platform/src/pages/CapacityPlanning.tsx`
  - Added `expandedSprint` state
  - Added expand/collapse button to sprint header
  - Updated container layout logic
  - Added grid classes for expanded view
  - Added visibility logic to hide non-expanded sprints

## Future Enhancements
- Remember expanded state in localStorage
- Keyboard shortcuts (e.g., Escape to collapse)
- Animation transitions between views
- Print-friendly expanded view
- Export expanded view as PDF/image
