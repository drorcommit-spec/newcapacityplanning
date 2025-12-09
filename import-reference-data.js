// Import reference data from JSON to Supabase Dev
// Run with: node import-reference-data.js

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Your Puzzle-Dev Supabase credentials
const SUPABASE_URL = 'https://nkonqfrhikxrxhorsosk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rb25xZnJoaWt4cnhob3Jzb3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjkxNDAsImV4cCI6MjA4MDYwNTE0MH0.Y_TPx7kihU9EbftkkUQfpDQFm5R3_uC0fZzS92viGsk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importReferenceData() {
  console.log('📥 Reading JSON database...');
  
  // Read JSON file
  const jsonData = JSON.parse(fs.readFileSync('./server/database.json', 'utf-8'));
  
  console.log(`Found ${jsonData.teamMembers?.length || 0} team members`);
  console.log(`Found ${jsonData.resourceRoles?.length || 0} resource types`);
  console.log(`Found ${jsonData.teams?.length || 0} teams`);
  
  // Transform and import team members
  if (jsonData.teamMembers && jsonData.teamMembers.length > 0) {
    console.log('\n👥 Importing team members...');
    const members = jsonData.teamMembers.map(m => ({
      id: m.id,
      full_name: m.fullName,
      email: m.email,
      role: m.role,
      is_active: m.isActive !== false,
      created_at: m.createdAt || new Date().toISOString(),
      manager_id: m.managerId || null,
      capacity: m.capacity || 100,
      teams: m.teams || []
    }));
    
    const { data, error } = await supabase
      .from('team_members')
      .upsert(members, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error importing team members:', error.message);
    } else {
      console.log(`✅ Imported ${members.length} team members`);
    }
  }
  
  // Transform and import resource types
  if (jsonData.resourceRoles && jsonData.resourceRoles.length > 0) {
    console.log('\n🏷️  Importing resource types...');
    const resourceTypes = jsonData.resourceRoles.map(r => ({
      id: r.id,
      name: r.name,
      is_archived: r.isArchived || false,
      created_at: r.createdAt || new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('resource_types')
      .upsert(resourceTypes, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error importing resource types:', error.message);
    } else {
      console.log(`✅ Imported ${resourceTypes.length} resource types`);
    }
  }
  
  // Transform and import teams
  if (jsonData.teams && jsonData.teams.length > 0) {
    console.log('\n👨‍👩‍👧‍👦 Importing teams...');
    const teams = jsonData.teams.map(t => ({
      id: t.id,
      name: t.name,
      is_archived: t.isArchived || false,
      created_at: t.createdAt || new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('teams')
      .upsert(teams, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error importing teams:', error.message);
    } else {
      console.log(`✅ Imported ${teams.length} teams`);
    }
  }
  
  console.log('\n🎉 Reference data import complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Refresh your dev app');
  console.log('2. Verify team members are visible');
  console.log('3. Start creating test projects and allocations');
}

// Run the import
importReferenceData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Import failed:', err);
    process.exit(1);
  });
