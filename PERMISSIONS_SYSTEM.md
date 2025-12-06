# Permissions System

## Overview
The platform implements a team-based permission system with four permission levels:

1. **Admin** (users with Admin team or other teams) - Full access to all features
2. **Management Team** - Can create/edit Projects, but read-only access to Members, Teams, and Resource Types
3. **Member Team** - Read-only access to all Settings pages
4. **No Team** (users not assigned to any team) - Read-only access to everything

## How It Works

### Team-Based Permissions
- Users can be assigned to multiple teams (stored in `TeamMember.teams` array)
- **No teams assigned** - Read-only access to everything (displayed as "No Team (Read-Only)" in top bar)
- **"Member" team** (case-insensitive) - Read-only access to all Settings pages
- **"Management" team** (case-insensitive) - Can create/edit Projects, but cannot create/edit Members, Teams, or Resource Types
- **"Admin" team or other teams** - Full access to all features

### Affected Pages

#### Members Page (`/members`) - TeamManagement.tsx
- **Member Team**: Read-only (cannot add/edit/deactivate members)
- **Management Team**: Read-only (cannot add/edit/deactivate members)
- **Admin**: Full access

#### Resource Types Page (`/roles`) - RoleManagement.tsx
- **Member Team**: Read-only (cannot create/edit/archive resource types)
- **Management Team**: Read-only (cannot create/edit/archive resource types)
- **Admin**: Full access

#### Teams Page (`/teams`) - TeamsManagement.tsx
- **Member Team**: Read-only (cannot add/edit/archive teams)
- **Management Team**: Read-only (cannot add/edit/archive teams)
- **Admin**: Full access

#### Projects Page (`/projects`) - ProjectManagement.tsx
- **No Team**: Read-only (cannot add/edit/archive projects)
- **Member Team**: Read-only (cannot add/edit/archive projects)
- **Management Team**: Full access (can create/edit/archive projects)
- **Admin**: Full access

### Implementation

#### usePermissions Hook
Located in `src/hooks/usePermissions.ts`

```typescript
const { 
  canManageMembers,
  canManageTeams,
  canManageResourceTypes,
  canManageProjects,
  isReadOnly,
  isMemberTeam,
  isManagementTeam
} = usePermissions();
```

Returns:
- `canManageMembers`: `false` if user is in "Member" or "Management" team
- `canManageTeams`: `false` if user is in "Member" or "Management" team
- `canManageResourceTypes`: `false` if user is in "Member" or "Management" team
- `canManageProjects`: `false` only if user is in "Member" team (Management can manage projects)
- `isReadOnly`: `true` if user is in "Member" team
- `isMemberTeam`: `true` if user belongs to "Member" team
- `isManagementTeam`: `true` if user belongs to "Management" team
- `canWrite`: (deprecated) Same as `canManageMembers` for backward compatibility
- `canEdit`: (deprecated) Same as `canManageMembers` for backward compatibility

#### Usage in Pages
```typescript
import { usePermissions } from '../hooks/usePermissions';

export default function MyPage() {
  const { canWrite } = usePermissions();
  
  return (
    <div>
      {!canWrite && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p>You have read-only access to this page.</p>
        </div>
      )}
      
      {canWrite && <Button onClick={handleAdd}>Add Item</Button>}
    </div>
  );
}
```

## Setting Up Permission Teams

### Step 1: Create Permission Teams
1. Go to **Teams** page (`/teams`)
2. Create the following teams:
   - **"Member"** - For read-only users
   - **"Management"** - For project managers who can manage projects but not team settings
   - **"Admin"** - (Optional) For clarity, though any user not in Member/Management has admin access

### Step 2: Assign Users to Teams

#### For Read-Only Users (Member Team):
1. Go to **Members** page (`/members`)
2. Edit a user
3. In the "Teams" section, check the **"Member"** team
4. Save
5. This user now has read-only access to all Settings pages

#### For Project Managers (Management Team):
1. Go to **Members** page (`/members`)
2. Edit a user
3. In the "Teams" section, check the **"Management"** team
4. Save
5. This user can now manage Projects but cannot edit Members, Teams, or Resource Types

#### For Administrators:
1. Don't assign "Member" or "Management" teams
2. Or assign to "Admin" team for clarity
3. These users have full access to all features

### Step 3: Test Permissions

#### Test Member Team (Read-Only):
1. Logout
2. Login as a user assigned to "Member" team
3. Navigate to any Settings page
4. Verify:
   - Yellow banner: "You have read-only access..."
   - No Add/Edit buttons visible
   - Action columns show "View Only"

#### Test Management Team (Project Manager):
1. Logout
2. Login as a user assigned to "Management" team
3. Navigate to Members/Teams/Resource Types pages
4. Verify:
   - Yellow banner: "You have read-only access..."
   - Cannot add/edit members, teams, or resource types
5. Navigate to Projects page
6. Verify:
   - Can add/edit/archive projects normally
   - No restrictions

## User Information Display
The top navigation bar displays:
- User's full name
- User's email address
- User's assigned teams (as colored badges)
- If no teams assigned: "No Team (Read-Only)" badge in orange

This makes it clear to users what their permission level is.

## Future Enhancements
Potential improvements to the permission system:

1. **Granular Permissions**
   - Different permission levels (Admin, Editor, Viewer)
   - Per-page permissions
   - Per-action permissions

2. **Team-Based Data Access**
   - Users can only see data for their assigned teams
   - Team-specific project visibility

3. **Role-Based Permissions**
   - Use the user's Role field (VP Product, Product Manager, etc.)
   - Different permissions per role

4. **Permission Management UI**
   - Admin page to manage permissions
   - Visual permission matrix

## Troubleshooting

### User Still Has Edit Access
- Check if user is assigned to "Member" team (case-insensitive)
- Verify team name is exactly "Member" (not "Members" or "member team")
- Logout and login again to refresh permissions

### All Users Have Read-Only Access
- Check if "Member" team was accidentally assigned to all users
- Verify the `usePermissions` hook is working correctly

### Permission Not Working on Custom Pages
- Import and use `usePermissions` hook
- Apply `canWrite` checks to buttons and actions
- Add read-only banner for better UX

---

**Version:** 1.0  
**Last Updated:** December 6, 2024
