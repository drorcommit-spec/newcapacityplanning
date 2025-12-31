const XLSX = require('xlsx');
const fs = require('fs');

// Configuration - Update these paths
const EXCEL_FILE_PATH = './team-allocations.xlsx'; // Your Excel file path
const OUTPUT_SQL_FILE = './migration-from-excel.sql';

function generateMigrationSQL() {
  try {
    console.log('📊 Reading Excel file...');
    
    // Check if Excel file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`❌ Excel file not found: ${EXCEL_FILE_PATH}`);
      console.log('📝 Please place your Excel file at the specified path');
      return;
    }

    // Read Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Found ${data.length} rows in Excel file`);
    console.log('📝 Sample row structure:', Object.keys(data[0] || {}));

    // Generate SQL
    let sql = `-- Migration SQL generated from Excel file: ${EXCEL_FILE_PATH}
-- Generated on: ${new Date().toISOString()}
-- Total rows processed: ${data.length}

-- Start transaction
BEGIN;

`;

    // Track unique members and projects for creation
    const uniqueMembers = new Set();
    const uniqueProjects = new Set();
    const allocations = [];

    // Process each row
    data.forEach((row, index) => {
      try {
        // Extract data - adjust these column names based on your Excel structure
        const memberName = row['Team Member'] || row['Member'] || row['Name'] || row['Full Name'];
        const projectName = row['Project'] || row['Project Name'];
        const customerName = row['Customer'] || row['Customer Name'] || 'Default Customer';
        
        // Extract allocation data for different sprints
        const allocData = {
          'Jan Sprint 1': parseFloat(row['Jan Sprint 1'] || row['January Sprint 1'] || 0),
          'Jan Sprint 2': parseFloat(row['Jan Sprint 2'] || row['January Sprint 2'] || 0),
          'Feb Sprint 1': parseFloat(row['Feb Sprint 1'] || row['February Sprint 1'] || 0),
          'Feb Sprint 2': parseFloat(row['Feb Sprint 2'] || row['February Sprint 2'] || 0),
          'Mar Sprint 1': parseFloat(row['Mar Sprint 1'] || row['March Sprint 1'] || 0),
          'Mar Sprint 2': parseFloat(row['Mar Sprint 2'] || row['March Sprint 2'] || 0),
        };

        if (!memberName || !projectName) {
          console.warn(`⚠️  Row ${index + 1}: Missing member name or project name, skipping`);
          return;
        }

        // Track unique members and projects
        uniqueMembers.add(memberName);
        uniqueProjects.add(`${customerName}|||${projectName}`); // Use ||| as separator

        // Create allocation records for non-zero percentages
        Object.entries(allocData).forEach(([sprintLabel, percentage]) => {
          if (percentage > 0) {
            const [monthName, sprintNum] = sprintLabel.split(' Sprint ');
            const month = monthName === 'Jan' ? 1 : monthName === 'Feb' ? 2 : monthName === 'Mar' ? 3 : 1;
            const sprint = parseInt(sprintNum);
            
            allocations.push({
              memberName,
              customerName,
              projectName,
              year: 2025, // Adjust as needed
              month,
              sprint,
              percentage,
              days: Math.round((percentage / 100) * 10) // Assuming 10 working days per sprint
            });
          }
        });

      } catch (error) {
        console.error(`❌ Error processing row ${index + 1}:`, error.message);
      }
    });

    // Generate SQL for creating members
    sql += `-- Create missing team members
-- Note: Adjust roles and other fields as needed

`;
    
    Array.from(uniqueMembers).forEach(memberName => {
      const memberEmail = memberName.toLowerCase().replace(/\s+/g, '.') + '@company.com';
      sql += `INSERT INTO team_members (id, full_name, email, role, is_active, full_time_schedule, created_at)
SELECT gen_random_uuid(), '${memberName.replace(/'/g, "''")}', '${memberEmail}', 'Product Manager', true, 100, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM team_members WHERE LOWER(full_name) = LOWER('${memberName.replace(/'/g, "''")}')
);

`;
    });

    // Generate SQL for creating projects
    sql += `-- Create missing projects
-- Note: Adjust project types and statuses as needed

`;
    
    Array.from(uniqueProjects).forEach(projectKey => {
      const [customerName, projectName] = projectKey.split('|||');
      sql += `INSERT INTO projects (id, customer_id, customer_name, project_name, project_type, status, is_archived, created_at)
SELECT gen_random_uuid(), gen_random_uuid(), '${customerName.replace(/'/g, "''")}', '${projectName.replace(/'/g, "''")}', 'Software', 'Active', false, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE LOWER(customer_name) = LOWER('${customerName.replace(/'/g, "''")}') 
    AND LOWER(project_name) = LOWER('${projectName.replace(/'/g, "''")}')
);

`;
    });

    // Generate SQL for creating allocations
    sql += `-- Create allocations
-- This will create allocation records for all non-zero percentages

`;

    allocations.forEach(alloc => {
      sql += `INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, is_planned, created_at, created_by)
SELECT 
    gen_random_uuid(),
    p.id,
    tm.id,
    ${alloc.year},
    ${alloc.month},
    ${alloc.sprint},
    ${alloc.percentage},
    ${alloc.days},
    true,
    NOW(),
    'excel-migration'
FROM projects p
CROSS JOIN team_members tm
WHERE LOWER(p.customer_name) = LOWER('${alloc.customerName.replace(/'/g, "''")}')
  AND LOWER(p.project_name) = LOWER('${alloc.projectName.replace(/'/g, "''")}')
  AND LOWER(tm.full_name) = LOWER('${alloc.memberName.replace(/'/g, "''")}')
  AND NOT EXISTS (
    SELECT 1 FROM allocations a
    WHERE a.project_id = p.id
      AND a.product_manager_id = tm.id
      AND a.year = ${alloc.year}
      AND a.month = ${alloc.month}
      AND a.sprint = ${alloc.sprint}
  );

`;
    });

    sql += `-- Commit transaction
COMMIT;

-- Summary:
-- Members to create: ${uniqueMembers.size}
-- Projects to create: ${uniqueProjects.size}
-- Allocations to create: ${allocations.length}

-- Verification queries (run these after migration):
-- SELECT COUNT(*) as total_members FROM team_members;
-- SELECT COUNT(*) as total_projects FROM projects;
-- SELECT COUNT(*) as total_allocations FROM allocations;
-- SELECT COUNT(*) as excel_allocations FROM allocations WHERE created_by = 'excel-migration';
`;

    // Write SQL to file
    fs.writeFileSync(OUTPUT_SQL_FILE, sql);
    
    console.log('✅ SQL migration file generated successfully!');
    console.log(`📄 Output file: ${OUTPUT_SQL_FILE}`);
    console.log(`👥 Unique members: ${uniqueMembers.size}`);
    console.log(`📁 Unique projects: ${uniqueProjects.size}`);
    console.log(`📊 Total allocations: ${allocations.length}`);
    
    console.log('\n📋 Summary:');
    console.log('Members to create:', Array.from(uniqueMembers).join(', '));
    console.log('Projects to create:', Array.from(uniqueProjects).map(p => p.replace('|||', ' - ')).join(', '));

  } catch (error) {
    console.error('❌ Error generating SQL:', error);
  }
}

// Run the generator
if (require.main === module) {
  generateMigrationSQL();
}

module.exports = { generateMigrationSQL };