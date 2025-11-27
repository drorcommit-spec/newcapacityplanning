# Capacity Planning Feature - Implementation Progress

## ✅ Phase 1: Foundation (COMPLETE)
- [x] Add ResourceType to types
- [x] Add resourceType and employeeNumber fields to TeamMember
- [x] Add maxCapacityPerResourceType to Project
- [x] Add isPlanned flag to SprintAllocation
- [x] Create CapacityPlanning.tsx page with basic structure
- [x] Add route to App.tsx
- [x] Add navigation link to Layout
- [x] Create backup before changes
- [x] Sprint timeline generation (3-12 sprints)
- [x] View mode toggle (Projects/Team)
- [x] Filter panel with show/hide
- [x] Sprint add/remove controls

## 🚧 Phase 2: Projects View (IN PROGRESS)
- [ ] Sprint header with 3-dot menu
  - [ ] Add Project action
  - [ ] Create New Project inline
- [ ] Project cards in sprint columns
  - [ ] Display customer name and project name
  - [ ] Sort by customer then project name
  - [ ] Hover to show capacity breakdown
  - [ ] Click to edit project
- [ ] Project card actions
  - [ ] ➕ Add Member
  - [ ] 🗑 Remove from sprint
  - [ ] 💬 Add comment
  - [ ] ⚙ Capacity Planning popup
  - [ ] 📄 Copy to next sprint
- [ ] Member list within project card
  - [ ] Show full name, resource type, allocation %
  - [ ] Sort by capacity DESC
  - [ ] ✏ Edit capacity inline
  - [ ] 🗑 Remove from project
  - [ ] 💬 Add comment
  - [ ] Click name to edit member

## 📋 Phase 3: Team View
- [ ] Sprint header with 3-dot menu
  - [ ] Add Member action
- [ ] Member cards in sprint columns
  - [ ] Display full name, resource type
  - [ ] Show total allocated capacity
  - [ ] Sort by member name A-Z
- [ ] Member card actions (3-dot menu)
  - [ ] Add Project
  - [ ] 🗑 Remove from sprint
  - [ ] 💬 Add comment
- [ ] Project list within member card
  - [ ] Show customer + project name
  - [ ] Show allocation % for this sprint
  - [ ] Sort by capacity DESC
  - [ ] Click project to edit
  - [ ] ✏ Edit capacity inline
  - [ ] 🗑 Remove project

## 🔍 Phase 4: Filters & Search
- [ ] Search by customer and project name
- [ ] Search by member name
- [ ] Multi-select resource type filter
- [ ] Capacity filter (All, Under, Over, Good)
- [ ] Unallocated projects only (Projects view)
- [ ] Apply filters to both views

## 🎨 Phase 5: Modals & Popups
- [ ] Add Project modal
  - [ ] List active projects
  - [ ] Create new project inline
  - [ ] Add to sprint
- [ ] Add Member modal
  - [ ] List existing members
  - [ ] Create new member inline
  - [ ] Set capacity
- [ ] Capacity Planning modal
  - [ ] Set max capacity per resource type
  - [ ] Add new resource type
- [ ] Edit Member form
  - [ ] Add resource type field
  - [ ] Add employee number field
  - [ ] Resource type dropdown with custom option
- [ ] Comment modals
  - [ ] Project comment per sprint
  - [ ] Allocation comment

## 🔧 Phase 6: Data Management
- [ ] Context functions for planned allocations
  - [ ] addPlannedAllocation
  - [ ] updatePlannedAllocation
  - [ ] deletePlannedAllocation
  - [ ] copyProjectToNextSprint
- [ ] Resource type management
  - [ ] Store custom resource types
  - [ ] Validate uniqueness
  - [ ] Persist to database
- [ ] Capacity calculations
  - [ ] Calculate total per member per sprint
  - [ ] Calculate total per project per sprint
  - [ ] Apply capacity thresholds
  - [ ] Filter by capacity status

## 🧪 Phase 7: Testing & Polish
- [ ] Test all CRUD operations
- [ ] Test filters
- [ ] Test sprint add/remove
- [ ] Test view switching
- [ ] Test data persistence
- [ ] Verify no data loss
- [ ] Verify backward compatibility
- [ ] Polish UI/UX
- [ ] Add loading states
- [ ] Add error handling

## 📊 Current Status
- **Progress**: 15% complete
- **Phase**: 1 of 7
- **Next**: Implement Projects View sprint columns with project cards

## 🛡️ Data Safety
- ✅ Backup created: `database.backup.capacity-planning-feature.json`
- ✅ All new fields are optional
- ✅ Existing data untouched
- ✅ Backward compatible
- ✅ Can rollback anytime

## 📝 Notes
- Using existing allocations data with `isPlanned` flag to distinguish planning vs actual
- Resource types stored as strings to allow custom types
- Max capacity per resource type stored as JSON object in project
- All changes are additive, no destructive modifications
