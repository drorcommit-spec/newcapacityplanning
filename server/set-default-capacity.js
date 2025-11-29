import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

async function setDefaultCapacity() {
  try {
    // Read current database
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);

    // Create backup
    const backupFile = DB_FILE.replace('.json', `.backup-before-capacity.${Date.now()}.json`);
    await fs.writeFile(backupFile, data);
    console.log(`📦 Backup created: ${backupFile}`);

    // Update all team members to have capacity = 100 if not set
    let updatedCount = 0;
    if (db.teamMembers && Array.isArray(db.teamMembers)) {
      db.teamMembers = db.teamMembers.map(member => {
        if (member.capacity === undefined || member.capacity === null) {
          updatedCount++;
          return { ...member, capacity: 100 };
        }
        return member;
      });
    }

    // Write updated database
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`✅ Updated ${updatedCount} team members with default capacity of 100%`);
    console.log(`✅ Database updated successfully`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setDefaultCapacity();
