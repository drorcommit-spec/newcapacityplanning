# Move localStorage Data to Server Database

## Summary
Moving `sprintProjects`, `sprintRoleRequirements`, and `resourceRoles` from localStorage to server database to prevent data loss when cache is cleared.

## Changes Completed

### 1. Updated server/server.js
- Added `sprintProjects: {}` to initial database structure
- Added `sprintRoleRequirements: {}` to initial database structure  
- Added `resourceRoles: []` with default roles to initial database structure

## Next Steps (To Complete)

### 2. Add API Endpoints in server.js
Add these endpoints after the existing ones:

```javascript
// Get all settings data
app.get('/api/settings', async (req, res) => {
  const db = await readDB();
  res.json({
    sprintProjects: db.sprintProjects || {},
    sprintRoleRequirements: db.sprintRoleRequirements || {},
    resourceRoles: db.resourceRoles || []
  });
});

// Save sprint projects
app.post('/api/settings/sprint-projects', async (req, res) => {
  const db = await readDB();
  db.sprintProjects = req.body;
  await writeDB(db);
  res.json({ success: true });
});

// Save sprint role requirements
app.post('/api/settings/role-requirements', async (req, res) => {
  const db = await readDB();
  db.sprintRoleRequirements = req.body;
  await writeDB(db);
  res.json({ success: true });
});

// Save resource roles
app.post('/api/settings/resource-roles', async (req, res) => {
  const db = await readDB();
  db.resourceRoles = req.body;
  await writeDB(db);
  res.json({ success: true });
});
```

### 3. Update src/services/api.ts
Add these functions:

```typescript
export async function fetchSettings() {
  const response = await fetch(`${API_URL}/settings`);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function saveSprintProjects(data: Record<string, string[]>) {
  const response = await fetch(`${API_URL}/settings/sprint-projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save sprint projects');
  return response.json();
}

export async function saveRoleRequirements(data: Record<string, Record<string, number>>) {
  const response = await fetch(`${API_URL}/settings/role-requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save role requirements');
  return response.json();
}

export async function saveResourceRoles(data: any[]) {
  const response = await fetch(`${API_URL}/settings/resource-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save resource roles');
  return response.json();
}
```

### 4. Update CapacityPlanning.tsx
Replace localStorage with API calls - load from server on mount, save on change with debouncing.

### 5. Update RoleManagement.tsx  
Replace localStorage with API calls.

### 6. Migration Script
Create a one-time script to migrate existing localStorage data to server.

## Status
✅ Database structure updated
⏳ API endpoints - TODO
⏳ Frontend integration - TODO
⏳ Migration script - TODO
