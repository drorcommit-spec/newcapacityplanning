import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');

async function clearAllAllocations() {
  try {
    console.log('📖 Reading database...');
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);

    // Create backup before clearing
    const backupFile = DB_FILE.replace('.json', `.backup-before-clear-allocations.${Date.now()}.json`);
    await fs.writeFile(backupFile, data);
    console.log(`✅ Backup created: ${backupFile}`);

    // Count current allocations
    const allocationCount = db.allocations?.length || 0;
    const historyCount = db.history?.length || 0;

    console.log(`\n📊 Current Data:`);
    console.log(`   - Allocations: ${allocationCount}`);
    console.log(`   - History entries: ${historyCount}`);

    // Clear allocations and history
    db.allocations = [];
    db.history = [];

    // Save updated database
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log(`\n✅ All allocations cleared!`);
    console.log(`   - Removed ${allocationCount} allocations`);
    console.log(`   - Removed ${historyCount} history entries`);
    console.log(`\n💾 Database saved successfully`);
    console.log(`\n⚠️  To restore, use the backup file: ${path.basename(backupFile)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
clearAllAllocations();
