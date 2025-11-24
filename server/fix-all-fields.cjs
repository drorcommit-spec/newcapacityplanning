const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'database.json');
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));

console.log('🔧 Fixing all field names to match TypeScript interfaces...\n');

// Fix Projects
let projectsFixed = 0;
database.projects = database.projects.map(project => {
  const fixed = { ...project };
  let changed = false;
  
  // Fix field names to match Project interface
  if (fixed.customer !== undefined) {
    fixed.customerName = fixed.customer;
    delete fixed.customer;
    changed = true;
  }
  
  if (fixed.type !== undefined) {
    fixed.projectType = fixed.type;
    delete fixed.type;
    changed = true;
  }
  
  if (fixed['maxcapacity%'] !== undefined) {
    fixed.maxCapacityPercentage = fixed['maxcapacity%'];
    delete fixed['maxcapacity%'];
    changed = true;
  }
  
  if (fixed.maxcapacity !== undefined) {
    fixed.maxCapacityPercentage = fixed.maxcapacity;
    delete fixed.maxcapacity;
    changed = true;
  }
  
  if (fixed.maxCapacity !== undefined && fixed.maxCapacityPercentage === undefined) {
    fixed.maxCapacityPercentage = fixed.maxCapacity;
    delete fixed.maxCapacity;
    changed = true;
  }
  
  if (fixed.pmocontact !== undefined) {
    fixed.pmoContact = fixed.pmocontact;
    delete fixed.pmocontact;
    changed = true;
  }
  
  if (fixed.archived !== undefined) {
    fixed.isArchived = fixed.archived;
    delete fixed.archived;
    changed = true;
  }
  
  // Ensure customerId exists
  if (!fixed.customerId) {
    fixed.customerId = crypto.randomUUID();
    changed = true;
  }
  
  if (changed) projectsFixed++;
  return fixed;
});

console.log(`✅ Fixed ${projectsFixed} projects`);

// Fix Allocations
let allocationsFixed = 0;
database.allocations = database.allocations.map(allocation => {
  const fixed = { ...allocation };
  let changed = false;
  
  // Fix field names to match SprintAllocation interface
  if (fixed.memberid !== undefined) {
    fixed.productManagerId = fixed.memberid;
    delete fixed.memberid;
    changed = true;
  }
  
  if (fixed.percentage !== undefined) {
    fixed.allocationPercentage = fixed.percentage;
    delete fixed.percentage;
    changed = true;
  }
  
  if (fixed.days !== undefined) {
    fixed.allocationDays = fixed.days;
    delete fixed.days;
    changed = true;
  }
  
  if (changed) allocationsFixed++;
  return fixed;
});

console.log(`✅ Fixed ${allocationsFixed} allocations`);

// Write back to database
fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

console.log('\n🎉 All field names fixed and match TypeScript interfaces!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Refresh your browser - everything should work now.');
