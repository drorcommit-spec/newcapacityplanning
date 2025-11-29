# Team Multi-Select Implementation

## Overview
Convert member team field from single select to multi-select and add Team Management screen.

## Changes Required

### 1. Database Schema Changes
- Change `team` field from TEXT to TEXT[] (array) in Supabase
- Update migration scripts to handle conversion

### 2. New Team Management Screen
- Create `src/pages/TeamManagement.tsx`
- Similar to RoleManagement
- CRUD operations for teams
- Store in database (JSON file locally, Supabase in prod)

### 3. Update Member Forms
- Change team dropdown to multi-select
- Allow selecting multiple teams
- Display teams as badges/chips

### 4. Update Navigation
- Add "Teams" under Settings menu
- Route: `/settings/teams`

### 5. API Changes
- Add `saveTeams()` function
- Add teams to DatabaseData interface
- Support teams in Supabase API

### 6. Display Updates
- Show multiple teams in member lists
- Update filters to support multi-team selection
- Update capacity planning views

## Implementation Steps
1. Create teams table in Supabase
2. Create Team Management page
3. Update API to support teams
4. Update member forms to multi-select
5. Update all displays to show multiple teams
6. Add navigation menu item
7. Test and deploy
