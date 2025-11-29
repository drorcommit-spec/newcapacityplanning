import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateToSupabase() {
  console.log('🚀 Supabase Migration Tool');
  console.log('==========================\n');

  // Get Supabase credentials
  console.log('Please provide your Supabase credentials:');
  console.log('(You can find these in your Supabase project settings → API)\n');

  const supabaseUrl = await question('Supabase URL: ');
  const supabaseKey = await question('Supabase Anon Key: ');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase URL and Key are required');
    rl.close();
    return;
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read local database.json
  const dbFile = path.join(__dirname, 'database.json');
  console.log(`\n📖 Reading local database from: ${dbFile}`);

  let localData;
  try {
    const fileContent = await fs.readFile(dbFile, 'utf-8');
    localData = JSON.parse(fileContent);
    console.log('✅ Local database loaded successfully');
  } catch (error) {
    console.error('❌ Error reading database.json:', error.message);
    rl.close();
    return;
  }

  // Show data summary
  console.log('\n📊 Data Summary:');
  console.log(`   Team Members: ${localData.teamMembers?.length || 0}`);
  console.log(`   Projects: ${localData.projects?.length || 0}`);
  console.log(`   Allocations: ${localData.allocations?.length || 0}`);
  console.log(`   History: ${localData.history?.length || 0}`);
  console.log(`   Resource Types: ${localData.resourceRoles?.length || 0}`);

  // Create backup before migration
  const backupFile = path.join(__dirname, `database.pre-migration.${Date.now()}.json`);
  await fs.writeFile(backupFile, JSON.stringify(localData, null, 2));
  console.log(`\n💾 Backup created: ${backupFile}`);

  // Confirm migration
  const confirm = await question('\n⚠️  This will upload all data to Supabase. Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Migration cancelled');
    rl.close();
    return;
  }

  console.log('\n🔄 Starting migration...\n');

  try {
    // Migrate Team Members
    if (localData.teamMembers && localData.teamMembers.length > 0) {
      console.log('📤 Migrating team members...');
      const teamMembers = localData.teamMembers.map(tm => ({
        id: tm.id,
        full_name: tm.fullName,
        email: tm.email,
        role: tm.role,
        team: tm.team,
        is_active: tm.isActive,
        created_at: tm.createdAt,
      }));

      const { error } = await supabase
        .from('team_members')
        .upsert(teamMembers, { onConflict: 'id' });

      if (error) throw new Error(`Team members migration failed: ${error.message}`);
      console.log(`✅ Migrated ${teamMembers.length} team members`);
    }

    // Migrate Projects
    if (localData.projects && localData.projects.length > 0) {
      console.log('📤 Migrating projects...');
      const projects = localData.projects.map(p => ({
        id: p.id,
        customer_name: p.customerName,
        project_name: p.projectName,
        project_type: p.projectType,
        status: p.status,
        max_capacity_percentage: p.maxCapacityPercentage && p.maxCapacityPercentage !== '' ? parseInt(p.maxCapacityPercentage) : null,
        pmo_contact: p.pmoContact || null,
        is_archived: p.isArchived,
        comment: p.comment || null,
        created_at: p.createdAt,
      }));

      const { error } = await supabase
        .from('projects')
        .upsert(projects, { onConflict: 'id' });

      if (error) throw new Error(`Projects migration failed: ${error.message}`);
      console.log(`✅ Migrated ${projects.length} projects`);
    }

    // Migrate Allocations
    if (localData.allocations && localData.allocations.length > 0) {
      console.log('📤 Migrating allocations...');
      const allocations = localData.allocations.map(a => ({
        id: a.id,
        project_id: a.projectId,
        product_manager_id: a.productManagerId,
        year: parseInt(a.year),
        month: parseInt(a.month),
        sprint: parseInt(a.sprint),
        allocation_percentage: parseInt(a.allocationPercentage),
        allocation_days: a.allocationDays ? parseFloat(a.allocationDays) : null,
        comment: a.comment || null,
        created_at: a.createdAt,
        created_by: a.createdBy || 'system',
      }));

      const { error } = await supabase
        .from('allocations')
        .upsert(allocations, { onConflict: 'id' });

      if (error) throw new Error(`Allocations migration failed: ${error.message}`);
      console.log(`✅ Migrated ${allocations.length} allocations`);
    }

    // Migrate History
    if (localData.history && localData.history.length > 0) {
      console.log('📤 Migrating history...');
      const history = localData.history.map(h => ({
        id: h.id,
        allocation_id: h.allocationId,
        changed_by: h.changedBy || 'system',
        changed_at: h.changedAt,
        change_type: h.changeType,
        old_value: h.oldValue,
        new_value: h.newValue,
      }));

      const { error } = await supabase
        .from('allocation_history')
        .upsert(history, { onConflict: 'id' });

      if (error) throw new Error(`History migration failed: ${error.message}`);
      console.log(`✅ Migrated ${history.length} history records`);
    }

    // Migrate Resource Types
    if (localData.resourceRoles && localData.resourceRoles.length > 0) {
      console.log('📤 Migrating resource types...');
      const resourceTypes = localData.resourceRoles.map(r => ({
        id: r.id,
        name: r.name,
        is_archived: r.isArchived || false,
        created_at: r.createdAt,
      }));

      const { error } = await supabase
        .from('resource_types')
        .upsert(resourceTypes, { onConflict: 'id' });

      if (error) throw new Error(`Resource types migration failed: ${error.message}`);
      console.log(`✅ Migrated ${resourceTypes.length} resource types`);
    }

    // Create automatic backup in Supabase
    console.log('\n📦 Creating Supabase backup...');
    const { error: backupError } = await supabase.rpc('create_automatic_backup');
    if (backupError) {
      console.warn('⚠️  Backup creation failed:', backupError.message);
    } else {
      console.log('✅ Supabase backup created');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set environment variables in your production environment:');
    console.log('   VITE_USE_SUPABASE=true');
    console.log(`   VITE_SUPABASE_URL=${supabaseUrl}`);
    console.log(`   VITE_SUPABASE_ANON_KEY=${supabaseKey}`);
    console.log('2. Deploy your application');
    console.log('3. Your local database.json will continue to work for local development');
    console.log(`\n💾 Pre-migration backup saved at: ${backupFile}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log(`\n💾 Your data is safe in the backup: ${backupFile}`);
    console.log('You can restore it by copying it back to database.json');
  }

  rl.close();
}

// Run migration
migrateToSupabase().catch(console.error);
