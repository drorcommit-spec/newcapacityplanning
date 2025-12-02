import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

async function clearMemberTeams() {
  console.log('🧹 Clearing old team values from all members...');
  
  // Read database
  const data = JSON.parse(await fs.readFile(DB_FILE, 'utf-8'));
  
  // Create backup
  const backupFile = `database.backup-before-team-clear.${Date.now()}.json`;
  await fs.writeFile(path.join(__dirname, backupFile), JSON.stringify(data, null, 2));
  console.log(`💾 Backup created: ${backupFile}`);
  
  // Clear team field from all members and add empty teams array
  let clearedCount = 0;
  data.teamMembers = data.teamMembers.map(member => {
    if (member.team) {
      clearedCount++;
      const { team, ...rest } = member;
      return { ...rest, teams: [] };
    }
    return { ...member, teams: member.teams || [] };
  });
  
  // Save updated data
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
  
  console.log(`✅ Cleared team values from ${clearedCount} members`);
  console.log(`✅ All members now have empty teams array`);
  console.log('\n📝 Next: Refresh your browser to see the changes');
}

clearMemberTeams().catch(console.error);
