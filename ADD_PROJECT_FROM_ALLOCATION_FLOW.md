# Add Project from Allocation Flow

## Feature Description
When adding a member allocation, if the desired project doesn't exist, the user can create it inline without losing context.

## User Flow
1. User clicks + on sprint swimlane
2. Selects a member
3. In project dropdown, sees "Create New Project" option
4. Clicks "Create New Project"
5. Project creation modal opens
6. User creates the project
7. Returns to Add Member modal with:
   - Member still selected
   - New project pre-selected
   - Ready to enter allocation %

## Implementation
- Add "Create New Project" option to project dropdown
- Store context (member, sprint) before opening project modal
- After project creation, restore context and pre-select new project
- Auto-focus on allocation % input

## Benefits
- Streamlined workflow
- No context switching
- Faster data entry
- Better UX
