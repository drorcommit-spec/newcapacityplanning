import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');

async function clearSprintProjects() {
  try {
    console.log('📖 Reading database...');
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);

    // Create backup before clearing
    const backupFile = DB_FILE.replace('.json', `.backup-before-clear-sprint-projects.${Date.now()}.json`);
    await fs.writeFile(backupFile, data);
    console.log(`✅ Backup created: ${backupFile}`);

    // Count current sprint projects
    const sprintProjectsCount = Object.keys(db.sprintProjects || {}).length;
    const sprintRoleReqCount = Object.keys(db.sprintRoleRequirements || {}).length;

    console.log(`\n📊 Current Data:`);
    console.log(`   - Sprint project entries: ${sprintProjectsCount}`);
    console.log(`   - Sprint role requirements: ${sprintRoleReqCount}`);

    if (db.sprintProjects) {
      // Show some examples of what's being cleared
      const sprintKeys = Object.keys(db.sprintProjects).slice(0, 5);
      if (sprintKeys.length > 0) {
        console.log(`\n📋 Example sprint entries being cleared:`);
        sprintKeys.forEach(key => {
          const projectCount = db.sprintProjects[key]?.length || 0;
          console.log(`   - ${key}: ${projectCount} projects`);
        });
        if (sprintProjectsCount > 5) {
          console.log(`   ... and ${sprintProjectsCount - 5} more sprint entries`);
        }
      }
    }

    // Clear sprint projects and role requirements
    db.sprintProjects = {};
    db.sprintRoleRequirements = {};

    // Save updated database
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`\n✅ Sprint project links cleared!`);
    console.log(`   - Cleared ${sprintProjectsCount} sprint project entries`);
    console.log(`   - Cleared ${sprintRoleReqCount} sprint role requirements`);
    console.log(`\n💾 Database saved successfully`);
    console.log(`\n📝 Note: Projects still exist, but won't appear in sprint swimlanes`);
    console.log(`   Projects will only appear in sprints when you add allocations to them`);
    console.log(`\n⚠️  To restore, use the backup file: ${path.basename(backupFile)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
clearSprintProjects();
