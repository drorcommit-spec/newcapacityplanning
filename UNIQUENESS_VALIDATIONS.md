# Uniqueness Validations Summary

## Overview
All critical data fields have uniqueness validation to prevent duplicates and maintain data integrity.

---

## ✅ Implemented Validations

### 1. **Member Email** (TeamManagement)
- **Field**: `email`
- **Validation**: Case-insensitive uniqueness check
- **Scope**: Across all team members
- **Error Message**: "This email is already registered"
- **Applied**: On create and edit operations
- **Location**: `src/pages/TeamManagement.tsx` (lines 87-93)

```typescript
const duplicateEmail = teamMembers.find(
  m => m.email.toLowerCase() === formData.email.toLowerCase() && m.id !== editingId
);
```

---

### 2. **Customer + Project Name** (ProjectManagement & ProjectForm)
- **Fields**: `customerName` + `projectName` (combination)
- **Validation**: Case-insensitive uniqueness check for the combination
- **Scope**: Across all projects
- **Error Message**: `Project "[name]" already exists for customer "[customer]"`
- **Applied**: On create and edit operations
- **Locations**: 
  - `src/pages/ProjectManagement.tsx` (lines 110-125)
  - `src/components/ProjectForm.tsx` (lines 42-57)

```typescript
const duplicateProject = projects.find(
  p => p.id !== editingId &&
       p.customerName.toLowerCase() === trimmedCustomer.toLowerCase() &&
       p.projectName.toLowerCase() === trimmedProject.toLowerCase()
);
```

**Note**: This allows:
- Same project name for different customers (e.g., "Portal" for Customer A and Customer B)
- Different project names for the same customer (e.g., "Portal" and "Dashboard" for Customer A)

**Prevents**:
- Duplicate project name for the same customer (e.g., two "Portal" projects for Customer A)

---

### 3. **Resource Type Name** (RoleManagement)
- **Field**: `name`
- **Validation**: Case-insensitive uniqueness check
- **Scope**: Across all resource types (including archived)
- **Error Message**: "A resource type with this name already exists"
- **Applied**: On create and edit operations
- **Location**: `src/pages/RoleManagement.tsx` (lines 72-78)

```typescript
const duplicate = roles.find(
  r => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== editingId
);
```

---

### 4. **Team Name** (TeamManagement)
- **Field**: `team`
- **Validation**: Case-insensitive uniqueness check
- **Scope**: Across all existing team names
- **Error Message**: "This team already exists"
- **Applied**: When creating a new team name
- **Location**: `src/pages/TeamManagement.tsx` (lines 139-148)

```typescript
const teamExists = existingTeams.some(
  t => t.toLowerCase() === trimmedTeam.toLowerCase()
);
```

---

## Validation Features

### Common Characteristics:
1. **Case-Insensitive**: "Product Manager" = "product manager" = "PRODUCT MANAGER"
2. **Trimmed Values**: Leading and trailing spaces are removed before validation
3. **Real-Time Feedback**: Error messages appear immediately on submit
4. **Error Clearing**: Errors disappear when user starts typing
5. **Edit Protection**: When editing, allows keeping the same value (except for project combination)

### User Experience:
- Clear, specific error messages
- Red text with background highlighting
- Validation happens on form submit (not while typing)
- Prevents data submission until validation passes

---

## Data Integrity Benefits

1. **No Duplicate Emails**: Ensures each team member has a unique email address
2. **No Duplicate Projects**: Prevents confusion with duplicate customer/project combinations
3. **No Duplicate Resource Types**: Maintains clean resource type list
4. **No Duplicate Teams**: Keeps team organization clear and unambiguous

---

## Testing Scenarios

### Member Email:
- ✅ Cannot create two members with "john@example.com"
- ✅ Can edit member without changing email
- ✅ "John@Example.com" = "john@example.com"

### Customer + Project:
- ✅ Cannot create "Tadiran - Portal" twice
- ✅ Can create "Tadiran - Portal" and "Tadiran - Dashboard"
- ✅ Can create "Tadiran - Portal" and "Microsoft - Portal"
- ✅ "Tadiran" = "tadiran" = "TADIRAN"

### Resource Type:
- ✅ Cannot create two "Product Manager" resource types
- ✅ Can edit resource type without changing name
- ✅ "Product Manager" = "product manager"

### Team:
- ✅ Cannot create two "Engineering" teams
- ✅ "Engineering" = "engineering" = "ENGINEERING"

---

## Future Considerations

If additional uniqueness constraints are needed:
- Project ID (already unique via UUID)
- Member ID (already unique via UUID)
- Allocation combinations (member + project + sprint)
- Customer name alone (currently allows duplicates across different projects)

---

**Last Updated**: November 29, 2025
