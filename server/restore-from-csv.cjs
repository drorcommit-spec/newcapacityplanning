const fs = require('fs');
const path = require('path');

// Read the CSV backup
const csvPath = path.join(__dirname, 'csv-backups', 'team-members-2025-11-23T22-20-12-930Z.csv');
const projectsCsvPath = path.join(__dirname, 'csv-backups', 'projects-2025-11-23T22-20-12-902Z.csv');
const databasePath = path.join(__dirname, 'database.json');

// Parse CSV
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
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
        if (value === 'false') value = false;
        
        // Map CSV headers to object keys
        const key = header.toLowerCase().replace(/ /g, '');
        if (key === 'id') obj.id = value;
        else if (key === 'fullname') obj.fullName = value;
        else if (key === 'email') obj.email = value;
        else if (key === 'role') obj.role = value;
        else if (key === 'team') obj.team = value;
        else if (key === 'active') obj.isActive = value;
        else if (key === 'createdat') obj.createdAt = value;
      });
      data.push(obj);
    }
  }
  
  return data;
}

// Read current database
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

// Read and parse team members CSV
const teamMembersCSV = fs.readFileSync(csvPath, 'utf8');
const teamMembers = parseCSV(teamMembersCSV);

console.log(`Found ${teamMembers.length} team members in CSV backup`);

// Update database
database.teamMembers = teamMembers;

// Write back to database
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

console.log('✅ Database restored successfully!');
console.log(`Team members: ${database.teamMembers.length}`);
console.log(`Projects: ${database.projects.length}`);
console.log(`Allocations: ${database.allocations.length}`);
