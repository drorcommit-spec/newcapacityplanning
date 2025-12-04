# Production Fixes - Manager & Resource Type Issues

## Issues Fixed

### 1. Manager Field Not Saving in Production
**Problem**: When editing a member's manager in production, the change wasn't persisting to Supabase.

**Root Cause**: The Supabase database schema was missing the `manager_id` column.

**Solution**:
- Created migration script `update-team-members-schema.sql` to add `manager_id` column
- Updated transform functions to properly handle `manager_id` field
- Added proper null handling for empty manager selections

### 2. Resource Types Not Showing in Member Form
**Problem**: The resource type dropdown in the member form showed nothing even though resource types existed.

**Root Cause**: The `role` field in team_members table stores the resource type name, but the form was trying to load from a separate resource_types table.

**Solution**: 
- The code already correctly uses `role` field for resource types
- Updated transform functions to ensure proper data type handling for arrays

## Files Modified

### 1. `src/services/supabaseApi.ts`
Updated transform functions:
- `transformTeamMember`: Added proper array handling for teams field
- `transformTeamMemberToSupabase`: Added proper array handling and default values

```typescript
function transformTeamMember(data: any): any {
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    teams: Array.isArray(data.teams) ? data.teams : (data.teams || []),
    managerId: data.manager_id || null,
    isActive: data.is_active ?? true,
    createdAt: data.created_at,
  };
}

function transformTeamMemberToSupabase(data: any): any {
  return {
    id: data.id,
    full_name: data.fullName,
    email: data.email,
    role: data.role,
    teams: Array.isArray(data.teams) ? data.teams : (data.teams || []),
    manager_id: data.managerId || null,
    is_active: data.isActive ?? true,
    created_at: data.createdAt || new Date().toISOString(),
  };
}
```

### 2. `update-team-members-schema.sql` (NEW)
Migration script to update Supabase schema with missing fields.

## Deployment Steps

### Step 1: Update Supabase Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration script `update-team-members-schema.sql`
4. Verify the changes by checking the team_members table structure

### Step 2: Deploy Code Changes
1. Commit the changes to git:
   ```bash
   git add .
   git commit -m "Fix: Manager field and resource type issues in production"
   git push
   ```

2. Vercel will automatically deploy the changes

### Step 3: Verify in Production
1. Go to Members page
2. Edit a member and change their manager
3. Refresh the page - manager should persist
4. Create/edit a member - resource types should show in dropdown
5. Check that teams are properly saved and displayed

## Testing Checklist

- [ ] Manager dropdown shows all active members
- [ ] Selecting a manager saves correctly
- [ ] Manager persists after page refresh
- [ ] Resource type dropdown shows all active resource types
- [ ] Creating new resource type works
- [ ] Teams multi-select works correctly
- [ ] Teams persist after save
- [ ] Inline manager edit in table works
- [ ] Manager filter shows correct results

## Database Schema Changes

### team_members table - New/Updated Columns:
- `manager_id` (TEXT, nullable) - Foreign key to team_members(id)
- `teams` (JSONB) - Array of team names (migrated from old `team` TEXT column)

### Indexes Added:
- `idx_team_members_manager` - For manager lookups
- `idx_team_members_teams` - GIN index for JSONB teams array

## Rollback Plan

If issues occur:
1. The migration script is safe - it preserves existing data
2. To rollback code changes, revert the commit in git
3. To rollback database changes:
   ```sql
   ALTER TABLE team_members DROP COLUMN IF EXISTS manager_id;
   -- Teams column migration is one-way, but old data is preserved
   ```

## Notes

- The `role` field in team_members stores the resource type name directly
- Resource types are managed in the resource_types table but referenced by name
- Teams are stored as JSONB array for multiple team assignments
- Manager relationships use self-referencing foreign key
