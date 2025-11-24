const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'database.json');
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

// Get current sprint info
const now = new Date();
let year = now.getFullYear();
let month = now.getMonth() + 1;
let sprint = now.getDate() <= 15 ? 1 : 2;

console.log('🔍 Checking Alert Column Logic');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Current Date: ${now.toISOString().split('T')[0]}`);
console.log(`Current Sprint: ${year}-${month.toString().padStart(2, '0')} Sprint ${sprint}\n`);

// Calculate next 3 sprints (current + 2 future)
const sprintsToCheck = [];
for (let i = 0; i < 3; i++) {
  sprintsToCheck.push({ year, month, sprint });
  sprint++;
  if (sprint > 2) {
    sprint = 1;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
}

console.log('Checking these sprints:');
sprintsToCheck.forEach(s => console.log(`  - ${s.year}-${s.month.toString().padStart(2, '0')} Sprint ${s.sprint}`));
console.log('');

// Check each active project
const activeProjects = database.projects.filter(p => p.status === 'Active');

console.log(`Found ${activeProjects.length} Active projects\n`);
console.log('Alert Status for Active Projects:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let alertCount = 0;

activeProjects.forEach(project => {
  const hasAllocations = sprintsToCheck.some(({ year, month, sprint }) => {
    return database.allocations.some(
      a => a.projectId === project.id && 
           a.year === year && 
           a.month === month && 
           a.sprint === sprint
    );
  });
  
  const shouldShowAlert = !hasAllocations;
  
  if (shouldShowAlert) {
    alertCount++;
    console.log(`❗ ${project.customerName} - ${project.projectName}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Alert: YES - No allocations in next 3 sprints`);
    console.log('');
  } else {
    console.log(`✓  ${project.customerName} - ${project.projectName}`);
    console.log(`   Status: ${project.status}`);
    console.log(`   Alert: NO - Has allocations`);
    
    // Show which sprints have allocations
    const allocatedSprints = sprintsToCheck.filter(({ year, month, sprint }) => {
      return database.allocations.some(
        a => a.projectId === project.id && 
             a.year === year && 
             a.month === month && 
             a.sprint === sprint
      );
    });
    console.log(`   Allocated in: ${allocatedSprints.map(s => `${s.year}-${s.month} S${s.sprint}`).join(', ')}`);
    console.log('');
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\nSummary: ${alertCount} of ${activeProjects.length} active projects should show alerts`);
