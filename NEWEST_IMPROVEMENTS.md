# Newest Improvements - Implemented

## ✅ PMO Role Added
- New role type: **PMO** (Project Management Office)
- PMO contacts can now be team members
- Available in team management dropdown

## ✅ Project Management - Unallocated Alert
- **Red exclamation mark (❗)** appears next to projects with no allocations
- Checks current sprint + next 2 sprints (1 month ahead)
- Only shows for Active projects
- Hover tooltip explains the alert

### Example
```
Alert | Customer | Project | ...
  ❗  | Acme     | MVP     | ...  ← No allocations for next month
      | TechCo   | Phase 1 | ...  ← Has allocations
```

## ✅ Team Management - Role Filter
- New dropdown filter: "Filter by Role"
- Options:
  - All Roles (default)
  - VP Product
  - Product Director
  - Product Manager
  - Product Operations Manager
  - PMO
- Filters table to show only selected role
- Shows count message when filtered

## ✅ Allocation Form - Dual Save Buttons

### Two Save Options:

1. **Add & Close** (default)
   - Saves allocation
   - Closes the form
   - Returns to allocation list

2. **Add & Add Another** (new)
   - Saves allocation
   - Keeps form open
   - Retains: Product Manager, Year, Month, Sprint
   - Clears: Project, Allocation Percentage
   - Perfect for adding multiple allocations to same PM

### Workflow Example
```
1. Select PM: John Doe
2. Select Project: Project A
3. Set Allocation: 50%
4. Click "Add & Add Another"
   → Allocation saved
   → Form stays open
   → PM still selected: John Doe
   → Ready to add next project
5. Select Project: Project B
6. Set Allocation: 30%
7. Click "Add & Close"
   → Done!
```

## Benefits

### PMO Role
- Better organization of PMO contacts
- Can track PMO member allocations
- Clearer team structure

### Unallocated Alert
- Quick visual identification of projects needing attention
- Proactive capacity planning
- Prevents projects from being forgotten

### Role Filter
- Easy to find specific role members
- Better team overview
- Useful for large teams

### Dual Save Buttons
- Faster data entry for multiple allocations
- Reduces repetitive form filling
- Maintains context (PM, date) while changing project
- More efficient workflow

## Usage Tips

### Adding Multiple Allocations to Same PM
1. Open "Add Allocation"
2. Select the Product Manager
3. Select first project and percentage
4. Click "Add & Add Another"
5. Select next project and percentage
6. Repeat as needed
7. Click "Add & Close" on last one

### Finding Unallocated Projects
1. Go to Project Management
2. Look for red ❗ in Alert column
3. Click on project to see details
4. Go to Allocations to assign members

### Filtering Team by Role
1. Go to Team Management
2. Use "Filter by Role" dropdown
3. Select specific role (e.g., "Product Manager")
4. View only members with that role
