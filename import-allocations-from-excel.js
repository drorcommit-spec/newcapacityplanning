const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const EXCEL_FILE_PATH = './team-allocations.xlsx'; // Update this path
const CREATED_BY_EMAIL = 'admin@company.com'; // Update this email

async function importAllocationsFromExcel() {
  try {
    console.log('📊 Starting allocation import from Excel...');

    // Check if Excel file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`❌ Excel file not found: ${EXCEL_FILE_PATH}`);
      console.log('📝 Please create an Excel file with the following format:');
      console.log('   Columns: Team Member | Project | Jan Sprint 1 | Jan Sprint 2 | Feb Sprint 1 | Feb Sprint 2');
      console.log('   Example: John Doe | Project Alpha | 50 | 30 | 40 | 60');
      return;
    }

    // Read Excel file
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📋 Found ${data.length} rows in Excel file`);

    // Fetch existing data from database
    console.log('🔍 Fetching existing data from database...');
    const [membersRes, projectsRes] = await Promise.all([
      supabase.from('team_members').select('id, full_name, email'),
      supabase.from('projects').select('id, customer_name, project_name')
    ]);

    if (membersRes.error) throw membersRes.error;
    if (projectsRes.error) throw projectsRes.error;

    const members = membersRes.data || [];
    const projects = projectsRes.data || [];

    console.log(`👥 Found ${members.length} team members in database`);
    console.log(`📁 Found ${projects.length} projects in database`);

    // Create lookup maps
    const memberMap = new Map();
    members.forEach(member => {
      memberMap.set(member.full_name.toLowerCase(), member.id);
      if (member.email) {
        memberMap.set(member.email.toLowerCase(), member.id);
      }
    });

    const projectMap = new Map();
    projects.forEach(project => {
      const projectKey = `${project.customer_name} - ${project.project_name}`.toLowerCase();
      projectMap.set(projectKey, project.id);
      projectMap.set(project.project_name.toLowerCase(), project.id);
    });

    // Process Excel data
    const allocations = [];
    const errors = [];
    let rowIndex = 0;

    for (const row of data) {
      rowIndex++;
      
      try {
        // Extract data from row (adjust column names based on your Excel format)
        const teamMember = row['Team Member'] || row['Member'] || row['Name'];
        const project = row['Project'] || row['Project Name'];
        const janSprint1 = parseFloat(row['Jan Sprint 1'] || row['January Sprint 1'] || 0);
        const janSprint2 = parseFloat(row['Jan Sprint 2'] || row['January Sprint 2'] || 0);
        const febSprint1 = parseFloat(row['Feb Sprint 1'] || row['February Sprint 1'] || 0);
        const febSprint2 = parseFloat(row['Feb Sprint 2'] || row['February Sprint 2'] || 0);

        if (!teamMember || !project) {
          errors.push(`Row ${rowIndex}: Missing team member or project name`);
          continue;
        }

        // Find member ID
        const memberId = memberMap.get(teamMember.toLowerCase());
        if (!memberId) {
          errors.push(`Row ${rowIndex}: Team member "${teamMember}" not found in database`);
          continue;
        }

        // Find project ID
        const projectId = projectMap.get(project.toLowerCase());
        if (!projectId) {
          errors.push(`Row ${rowIndex}: Project "${project}" not found in database`);
          continue;
        }

        // Create allocations for each sprint with non-zero percentages
        const sprintData = [
          { year: 2025, month: 1, sprint: 1, percentage: janSprint1 },
          { year: 2025, month: 1, sprint: 2, percentage: janSprint2 },
          { year: 2025, month: 2, sprint: 1, percentage: febSprint1 },
          { year: 2025, month: 2, sprint: 2, percentage: febSprint2 }
        ];

        for (const sprint of sprintData) {
          if (sprint.percentage > 0) {
            allocations.push({
              id: generateUUID(),
              project_id: projectId,
              product_manager_id: memberId,
              year: sprint.year,
              month: sprint.month,
              sprint: sprint.sprint,
              allocation_percentage: sprint.percentage,
              allocation_days: Math.round((sprint.percentage / 100) * 10), // Assuming 10 working days per sprint
              created_at: new Date().toISOString(),
              created_by: CREATED_BY_EMAIL,
              is_planned: true
            });
          }
        }

      } catch (error) {
        errors.push(`Row ${rowIndex}: Error processing row - ${error.message}`);
      }
    }

    // Display errors if any
    if (errors.length > 0) {
      console.log('\n⚠️  Errors found:');
      errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    }

    console.log(`✅ Processed ${allocations.length} allocations from Excel`);

    if (allocations.length === 0) {
      console.log('❌ No valid allocations to import');
      return;
    }

    // Ask for confirmation
    console.log('\n📊 Summary:');
    console.log(`   - Total allocations to import: ${allocations.length}`);
    console.log(`   - Errors encountered: ${errors.length}`);
    
    // Group by member and project for summary
    const summary = {};
    allocations.forEach(alloc => {
      const member = members.find(m => m.id === alloc.product_manager_id);
      const project = projects.find(p => p.id === alloc.project_id);
      const key = `${member?.full_name} → ${project?.customer_name} - ${project?.project_name}`;
      if (!summary[key]) summary[key] = [];
      summary[key].push(`${alloc.month}/${alloc.sprint}: ${alloc.allocation_percentage}%`);
    });

    console.log('\n📋 Allocation Summary:');
    Object.entries(summary).forEach(([key, sprints]) => {
      console.log(`   ${key}: ${sprints.join(', ')}`);
    });

    // Import to database
    console.log('\n💾 Importing allocations to database...');
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < allocations.length; i += batchSize) {
      const batch = allocations.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('allocations')
        .insert(batch);

      if (error) {
        console.error(`❌ Error importing batch ${Math.floor(i/batchSize) + 1}:`, error);
        throw error;
      }

      imported += batch.length;
      console.log(`   Imported ${imported}/${allocations.length} allocations...`);
    }

    console.log('\n🎉 Import completed successfully!');
    console.log(`✅ Imported ${imported} allocations`);
    console.log(`⚠️  ${errors.length} rows had errors and were skipped`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the import
if (require.main === module) {
  importAllocationsFromExcel();
}

module.exports = { importAllocationsFromExcel };