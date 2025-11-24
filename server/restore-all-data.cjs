const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'database.json');
const csvBackupsDir = path.join(__dirname, 'csv-backups');

// Parse CSV function
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        let value = values[index].replace(/^"|"$/g, '');
        
        // Convert boolean strings
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        // Convert numbers
        else if (!isNaN(value) && value !== '' && !header.toLowerCase().includes('id')) {
          value = parseFloat(value);
        }
        
        // Map CSV headers to object keys (camelCase)
        const key = header.toLowerCase().replace(/ /g, '');
        
        // Team Members mapping
        if (key === 'fullname') obj.fullName = value;
        else if (key === 'active') obj.isActive = value;
        else if (key === 'createdat') obj.createdAt = value;
        
        // Projects mapping
        else if (key === 'projectname') obj.projectName = value;
        else if (key === 'customer') obj.customer = value;
        else if (key === 'maxcapacity') obj.maxCapacity = value;
        else if (key === 'activityclosedate') obj.activityCloseDate = value;
        
        // Allocations mapping
        else if (key === 'projectid') obj.projectId = value;
        else if (key === 'productmanagerid') obj.productManagerId = value;
        else if (key === 'allocationpercentage') obj.allocationPercentage = value;
        else if (key === 'allocationdays') obj.allocationDays = value;
        else if (key === 'createdby') obj.createdBy = value;
        
        // Common fields
        else obj[key] = value;
      });
      data.push(obj);
    }
  }
  
  return data;
}

// Find most recent CSV files
function findMostRecentCSV(prefix) {
  const files = fs.readdirSync(csvBackupsDir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.csv'))
    .sort()
    .reverse();
  
  return files.length > 0 ? path.join(csvBackupsDir, files[0]) : null;
}

console.log('🔍 Finding most recent backup files...\n');

// Find most recent backups
const teamMembersFile = findMostRecentCSV('team-members-');
const projectsFile = findMostRecentCSV('projects-');
const allocationsFile = findMostRecentCSV('allocations-');

console.log('Team Members:', teamMembersFile ? path.basename(teamMembersFile) : 'NOT FOUND');
console.log('Projects:', projectsFile ? path.basename(projectsFile) : 'NOT FOUND');
console.log('Allocations:', allocationsFile ? path.basename(allocationsFile) : 'NOT FOUND');
console.log('');

// Read current database
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

// Restore team members
if (teamMembersFile) {
  const csv = fs.readFileSync(teamMembersFile, 'utf8');
  database.teamMembers = parseCSV(csv);
  console.log(`✅ Restored ${database.teamMembers.length} team members`);
}

// Restore projects
if (projectsFile) {
  const csv = fs.readFileSync(projectsFile, 'utf8');
  database.projects = parseCSV(csv);
  console.log(`✅ Restored ${database.projects.length} projects`);
}

// Restore allocations
if (allocationsFile) {
  const csv = fs.readFileSync(allocationsFile, 'utf8');
  database.allocations = parseCSV(csv);
  console.log(`✅ Restored ${database.allocations.length} allocations`);
}

// Keep existing history
console.log(`ℹ️  Keeping ${database.history.length} history records`);

// Write back to database
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

console.log('\n🎉 Database fully restored!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Final counts:`);
console.log(`   Team Members: ${database.teamMembers.length}`);
console.log(`   Projects: ${database.projects.length}`);
console.log(`   Allocations: ${database.allocations.length}`);
console.log(`   History: ${database.history.length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
