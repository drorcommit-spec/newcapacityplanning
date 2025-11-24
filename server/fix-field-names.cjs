const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'database.json');
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

console.log('🔧 Fixing field names...\n');

// Fix Projects
let projectsFixed = 0;
database.projects = database.projects.map(project => {
  const fixed = { ...project };
  
  // Fix field names
  if (fixed.customer !== undefined) {
    fixed.customerName = fixed.customer;
    delete fixed.customer;
    projectsFixed++;
  }
  
  if (fixed['maxcapacity%'] !== undefined) {
    fixed.maxCapacity = fixed['maxcapacity%'];
    delete fixed['maxcapacity%'];
  }
  
  if (fixed.pmocontact !== undefined) {
    fixed.pmoContact = fixed.pmocontact;
    delete fixed.pmocontact;
  }
  
  if (fixed.archived !== undefined) {
    fixed.isArchived = fixed.archived;
    delete fixed.archived;
  }
  
  return fixed;
});

console.log(`✅ Fixed ${projectsFixed} projects`);

// Fix Allocations
let allocationsFixed = 0;
database.allocations = database.allocations.map(allocation => {
  const fixed = { ...allocation };
  
  // Fix field names
  if (fixed.memberid !== undefined) {
    fixed.productManagerId = fixed.memberid;
    delete fixed.memberid;
    allocationsFixed++;
  }
  
  if (fixed.percentage !== undefined) {
    fixed.allocationPercentage = fixed.percentage;
    delete fixed.percentage;
  }
  
  if (fixed.days !== undefined) {
    fixed.allocationDays = fixed.days;
    delete fixed.days;
  }
  
  return fixed;
});

console.log(`✅ Fixed ${allocationsFixed} allocations`);

// Write back to database
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

console.log('\n🎉 All field names fixed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('You can now refresh your browser and the allocation board should work.');
