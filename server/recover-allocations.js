import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

async function recoverAllocations() {
  console.log('🔍 Checking for missing allocations...\n');
  
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));
  const existingAllocationIds = new Set(data.allocations.map(a => a.id));
  const missingAllocations = [];
  
  // Find allocations in history that don't exist in allocations array
  for (const historyEntry of data.history) {
    if (historyEntry.changeType === 'created' && 
        historyEntry.newValue && 
        !existingAllocationIds.has(historyEntry.allocationId)) {
      missingAllocations.push(historyEntry.newValue);
    }
  }
  
  if (missingAllocations.length === 0) {
    console.log('✅ No missing allocations found. All data is consistent!');
    return;
  }
  
  console.log(`Found ${missingAllocations.length} missing allocations:\n`);
  
  for (const alloc of missingAllocations) {
    const project = data.projects.find(p => p.id === alloc.projectId);
    const pm = data.teamMembers.find(m => m.id === alloc.productManagerId);
    console.log(`- ${pm?.fullName || 'Unknown'} → ${project?.customerName || 'Unknown'} - ${project?.projectName || 'Unknown'}`);
    console.log(`  Sprint: ${alloc.year}-${alloc.month}-S${alloc.sprint}, ${alloc.allocationPercentage}%`);
    console.log(`  ID: ${alloc.id}\n`);
  }
  
  console.log('Do you want to recover these allocations? (yes/no)');
  
  // For automated recovery, uncomment the following:
  console.log('\n🔧 Recovering allocations...');
  data.allocations.push(...missingAllocations);
  
  // Create backup
  const backupFile = DB_FILE.replace('.json', `.before-recovery.${Date.now()}.json`);
  await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
  console.log(`✅ Backup created: ${backupFile}`);
  
  // Save recovered data
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
  console.log(`✅ Recovered ${missingAllocations.length} allocations!`);
  console.log('\n📊 Summary:');
  console.log(`- Total allocations now: ${data.allocations.length}`);
  console.log(`- Total history entries: ${data.history.length}`);
}

recoverAllocations().catch(console.error);
