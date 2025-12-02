# Manager Field Persistence Fix

## Issue
When editing the manager field on the member form or member grid, the update appeared to succeed in the UI but was not persisted to the database. After refreshing the page, the changes were lost.

## Root Cause
The issue was caused by using `undefined` for empty manager values. When JavaScript objects are serialized to JSON:
- `undefined` values are **stripped out** completely
- `null` values are **preserved** in JSON

Example:
```javascript
JSON.stringify({ managerId: undefined })  // Result: "{}"
JSON.stringify({ managerId: null })       // Result: '{"managerId":null}'
```

## Solution

### 1. Updated TypeScript Type Definition
Changed `managerId` type to allow `null`:

**Before:**
```typescript
managerId?: string;
```

**After:**
```typescript
managerId?: string | null;
```

### 2. Updated Inline Editing
Changed the inline manager select to use `null` instead of `undefined`:

**Before:**
```typescript
onChange={(e) => updateTeamMember(member.id, { managerId: e.target.value || undefined })}
```

**After:**
```typescript
onChange={(e) => updateTeamMember(member.id, { managerId: e.target.value || null })}
```

### 3. Updated Form Submission
Added conversion of empty string to `null` in form submission:

```typescript
// Convert empty managerId to null for proper JSON serialization
const memberData = {
  ...formData,
  managerId: formData.managerId || null,
};
```

## Files Modified
- `product-capacity-platform/src/types/index.ts`
  - Updated `TeamMember` interface to allow `managerId?: string | null`
  
- `product-capacity-platform/src/pages/TeamManagement.tsx`
  - Changed inline editing to use `null` instead of `undefined`
  - Added conversion in form submission handler

## Testing
1. Edit a member's manager field using inline editing in the table
2. Refresh the page
3. Verify the manager assignment is preserved

4. Edit a member using the form modal
5. Set or change the manager
6. Refresh the page
7. Verify the manager assignment is preserved

8. Set manager to "No Manager"
9. Refresh the page
10. Verify the manager field shows "No Manager" (not a previous value)

## Technical Notes
- The filter logic in CapacityPlanning already handles both `null` and `undefined` correctly using `!member.managerId`
- This fix ensures data persistence across page refreshes and server restarts
- The change is backward compatible - existing `undefined` values will be treated the same as `null`
