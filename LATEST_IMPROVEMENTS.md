# Latest Improvements - Implemented

## ✅ Capacity Limits
- Max capacity on projects: 0 to 10,000%
- Allocation percentage: 0 to 10,000%
- Supports multiple PMs on same project

## ✅ Allocation Form Enhancements
- **Default values**: Year, month, sprint default to current date
- **Last selected PM**: Cached and pre-filled in new allocations
- **Capacity warning**: Alert when allocation exceeds project max capacity
  - Shows warning modal with option to continue or cancel
  - Calculates total allocation for project in that sprint

## ✅ New Project from Allocation
- "New Project" option in project dropdown
- Opens project creation in new tab
- User can create project and return to continue allocation

## ✅ Sprint Allocation Planning Filters
- **Default filter**: Current year and month
- Easy to change to view other periods

## ✅ Capacity Overview - Two View Modes

### Team View
- Displays per team member and month
- Shows total allocations per sprint
- Breakdown by project with percentages
- **Filters:**
  - Team dropdown (all teams or specific)
  - Default: Current month + next 2 months

### Project View
- Displays per project and month
- Shows total allocations per sprint
- Breakdown by allocated member with percentages
- **Filters:**
  - Project dropdown (active projects only)
  - Default: Current month + next 2 months

## ✅ UI Improvements
- Removed debug info from login screen
- Cleaner, more professional interface
- Better user experience

## Database Features
- All data persists in `server/database.json`
- No data loss on browser refresh
- Easy backup by copying database file

## How to Use

### Start the Application
```bash
# Backend (Terminal 1)
cd server
npm start

# Frontend (Terminal 2)
npm run dev
```

Or use: `start-all.bat`

### Access
- Frontend: http://localhost:5175
- Backend: http://localhost:3002
- Login: drors@comm-it.com

### Capacity Warning Example
1. Set project max capacity to 200%
2. Allocate PM1: 150%
3. Try to allocate PM2: 100%
4. Warning appears: "Total 250% exceeds max 200%"
5. Choose to continue or cancel

### Team View Example
- Filter by "Team Alpha"
- See all PMs in that team
- View their allocations for current + next 2 months
- Each card shows sprint breakdown by project

### Project View Example
- Filter by specific project
- See all allocations for that project
- View which PMs are allocated and their percentages
- Organized by month and sprint
