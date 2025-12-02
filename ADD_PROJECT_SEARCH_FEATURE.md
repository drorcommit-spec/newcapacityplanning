# Add Project to Sprint - Search Feature

## Overview
Added search functionality to the "Add Project to Sprint" modal in Capacity Planning, making it easy to find projects by customer or project name.

## Feature Details

### Search Field
- **Location**: Top of the "Add Project to Sprint" modal
- **Placeholder**: "Search by customer or project name..."
- **Icon**: Magnifying glass icon on the left
- **Real-time filtering**: Results update as you type

### Search Behavior
- **Case-insensitive**: Searches work regardless of capitalization
- **Searches both**:
  - Customer name
  - Project name
- **Partial matching**: Finds projects containing the search term anywhere in the name

### User Experience
1. Click the **+** icon in a sprint swimlane
2. Modal opens with all available projects
3. Type in the search field to filter projects
4. Click on a project to add it to the sprint
5. Search clears when modal closes

### Empty State
- **No search**: Shows standard "No available projects" message
- **With search, no results**: Shows "No projects found matching '[search term]'" with a "Clear search" button

## Examples

### Search: "jar"
**Results:**
- JarTracking - Phase 1
- JarTracking - Phase 2

### Search: "super"
**Results:**
- Super-Pharm - SPRIT
- Super-Pharm - SPARK

### Search: "mvp"
**Results:**
- DanciFire - MVP
- Goomi - MVP Delivery
- GRIP - MVP

## Technical Implementation

### State Management
```typescript
const [projectSearchText, setProjectSearchText] = useState('');
```

### Filtering Logic
```typescript
.filter((project: Project) => {
  if (!projectSearchText) return true;
  const searchLower = projectSearchText.toLowerCase();
  return project.customerName.toLowerCase().includes(searchLower) ||
         project.projectName.toLowerCase().includes(searchLower);
})
```

### Modal Cleanup
Search text is cleared when the modal closes to ensure a fresh start next time.

## Benefits
1. **Faster project selection** - No need to scroll through long lists
2. **Easy to find** - Search by either customer or project name
3. **Better UX** - Especially helpful with many projects
4. **Intuitive** - Standard search pattern users expect

## Files Modified
- `src/pages/CapacityPlanning.tsx`
  - Added `projectSearchText` state
  - Added search input field in modal
  - Added filter logic to project list
  - Updated empty state to handle search results
  - Clear search on modal close
