// Export reference data from JSON to SQL format
// Run with: node export-reference-data.cjs > import-reference-data.sql

const fs = require('fs');
const crypto = require('crypto');

console.log('-- Import Reference Data to Supabase Dev');
console.log('-- Generated from JSON database');
console.log('-- Run this in Supabase SQL Editor\n');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('./server/database.json', 'utf-8'));

// Helper to escape SQL strings
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Helper to check if string is valid UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper to generate UUID from string (deterministic)
function generateUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

// Map old IDs to new UUIDs
const idMap = {};
jsonData.teamMembers?.forEach(m => {
  if (!isValidUUID(m.id)) {
    idMap[m.id] = generateUUID(m.id);
  }
});
jsonData.resourceRoles?.forEach(r => {
  if (!isValidUUID(r.id)) {
    idMap[r.id] = generateUUID(r.id);
  }
});
jsonData.teams?.forEach(t => {
  if (!isValidUUID(t.id)) {
    idMap[t.id] = generateUUID(t.id);
  }
});

// Helper to convert ID (use mapped UUID if needed)
function convertId(id) {
  if (!id) return 'NULL';
  if (idMap[id]) return escapeSql(idMap[id]);
  return escapeSql(id);
}

// Export team members
if (jsonData.teamMembers && jsonData.teamMembers.length > 0) {
  console.log('-- Import Team Members');
  console.log('INSERT INTO team_members (id, full_name, email, role, is_active, created_at, manager_id, capacity, teams) VALUES');
  
  const values = jsonData.teamMembers.map((m, i) => {
    const teams = JSON.stringify(m.teams || []).replace(/'/g, "''");
    const id = idMap[m.id] || m.id;
    const managerId = m.managerId ? (idMap[m.managerId] || m.managerId) : null;
    return `  (${escapeSql(id)}, ${escapeSql(m.fullName)}, ${escapeSql(m.email)}, ${escapeSql(m.role)}, ${m.isActive !== false}, ${escapeSql(m.createdAt || new Date().toISOString())}, ${managerId ? escapeSql(managerId) : 'NULL'}, ${m.capacity || 100}, '${teams}'::jsonb)`;
  });
  
  console.log(values.join(',\n'));
  console.log('ON CONFLICT (id) DO UPDATE SET');
  console.log('  full_name = EXCLUDED.full_name,');
  console.log('  email = EXCLUDED.email,');
  console.log('  role = EXCLUDED.role,');
  console.log('  is_active = EXCLUDED.is_active,');
  console.log('  manager_id = EXCLUDED.manager_id,');
  console.log('  capacity = EXCLUDED.capacity,');
  console.log('  teams = EXCLUDED.teams;');
  console.log('');
}

// Export resource types
if (jsonData.resourceRoles && jsonData.resourceRoles.length > 0) {
  console.log('-- Import Resource Types');
  console.log('INSERT INTO resource_types (id, name, is_archived, created_at) VALUES');
  
  const values = jsonData.resourceRoles.map((r, i) => {
    const id = idMap[r.id] || r.id;
    return `  (${escapeSql(id)}, ${escapeSql(r.name)}, ${r.isArchived || false}, ${escapeSql(r.createdAt || new Date().toISOString())})`;
  });
  
  console.log(values.join(',\n'));
  console.log('ON CONFLICT (id) DO UPDATE SET');
  console.log('  name = EXCLUDED.name,');
  console.log('  is_archived = EXCLUDED.is_archived;');
  console.log('');
}

// Export teams
if (jsonData.teams && jsonData.teams.length > 0) {
  console.log('-- Import Teams');
  console.log('INSERT INTO teams (id, name, is_archived, created_at) VALUES');
  
  const values = jsonData.teams.map((t, i) => {
    const id = idMap[t.id] || t.id;
    return `  (${escapeSql(id)}, ${escapeSql(t.name)}, ${t.isArchived || false}, ${escapeSql(t.createdAt || new Date().toISOString())})`;
  });
  
  console.log(values.join(',\n'));
  console.log('ON CONFLICT (id) DO UPDATE SET');
  console.log('  name = EXCLUDED.name,');
  console.log('  is_archived = EXCLUDED.is_archived;');
  console.log('');
}

console.log('-- Done! Reference data imported.');
