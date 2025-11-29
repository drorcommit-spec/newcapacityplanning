import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

async function addCollections() {
  try {
    // Read current database
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);

    // Add new collections if they don't exist
    if (!db.sprintProjects) {
      db.sprintProjects = {};
      console.log('✅ Added sprintProjects collection');
    }

    if (!db.sprintRoleRequirements) {
      db.sprintRoleRequirements = {};
      console.log('✅ Added sprintRoleRequirements collection');
    }

    if (!db.resourceRoles) {
      db.resourceRoles = [
        { id: '1', name: 'VP Product', isArchived: false, createdAt: new Date().toISOString() },
        { id: '2', name: 'Product Director', isArchived: false, createdAt: new Date().toISOString() },
        { id: '3', name: 'Product Manager', isArchived: false, createdAt: new Date().toISOString() },
        { id: '4', name: 'Product Operations Manager', isArchived: false, createdAt: new Date().toISOString() },
        { id: '5', name: 'PMO', isArchived: false, createdAt: new Date().toISOString() },
      ];
      console.log('✅ Added resourceRoles collection with default roles');
    }

    // Create backup
    const backupFile = DB_FILE.replace('.json', `.backup-before-collections.${Date.now()}.json`);
    await fs.writeFile(backupFile, data);
    console.log(`📦 Backup created: ${backupFile}`);

    // Write updated database
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log('✅ Database updated successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCollections();
