# Excel to SQL Migration Guide

## Overview
This guide helps you convert Excel allocation data directly into SQL migration scripts that will create missing members, projects, and allocations in your database.

## Prerequisites

### 1. Install Dependencies
```bash
npm install xlsx
```

### 2. Prepare Your Excel File
Place your Excel file in the project root and update the path in the script.

**Expected Excel Format:**
| Team Member | Customer | Project | Jan Sprint 1 | Jan Sprint 2 | Feb Sprint 1 | Feb Sprint 2 |
|-------------|----------|---------|--------------|--------------|--------------|--------------|
| John Doe | Customer A | Project Alpha | 50 | 30 | 40 | 60 |
| Jane Smith | Customer B | Project Beta | 75 | 80 | 70 | 65 |

**Alternative Column Names Supported:**
- **Team Member**: "Member", "Name", "Full Name"
- **Customer**: "Customer Name" (optional - defaults to "Default Customer")
- **Project**: "Project Name"
- **Sprint Columns**: "January Sprint 1", "February Sprint 1", etc.

## Usage

### Step 1: Configure the Script
Edit `excel-to-sql-migration.js`:
```javascript
const EXCEL_FILE_PATH = './your-excel-file.xlsx'; // Update this path
const OUTPUT_SQL_FILE = './migration-from-excel.sql';
```

### Step 2: Generate SQL
```bash
node excel-to-sql-migration.js
```

### Step 3: Review Generated SQL
The script creates `migration-from-excel.sql` with:
- Member creation statements
- Project creation statements  
- Allocation creation statements
- Verification queries

### Step 4: Execute SQL
Run the generated SQL file in your Supabase dashboard or database client.

## What the Script Does

### ✅ Smart Data Processing
- **Reads Excel file** with flexible column naming
- **Extracts unique members and projects** for creation
- **Processes allocations** for all non-zero percentages
- **Generates proper SQL** with UUID generation

### ✅ Handles Missing Data
- **Creates members** if they don't exist (with generated email addresses)
- **Creates projects** if they don't exist (with default settings)
- **Skips duplicate allocations** to prevent conflicts

### ✅ Safe Migration
- **Uses transactions** for rollback capability
- **Checks for existing records** before creating
- **Provides verification queries** to confirm results
- **Includes detailed comments** in generated SQL

## Generated SQL Structure

### Member Creation
```sql
INSERT INTO team_members (id, full_name, email, role, is_active, created_at)
SELECT gen_random_uuid(), 'John Doe', 'john.doe@company.com', 'Product Manager', true, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM team_members WHERE LOWER(full_name) = LOWER('John Doe')
);
```

### Project Creation
```sql
INSERT INTO projects (id, customer_id, customer_name, project_name, project_type, status, is_archived, created_at)
SELECT gen_random_uuid(), gen_random_uuid(), 'Customer A', 'Project Alpha', 'Software', 'Active', false, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE LOWER(customer_name) = LOWER('Customer A') 
    AND LOWER(project_name) = LOWER('Project Alpha')
);
```

### Allocation Creation
```sql
INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, is_planned, created_at, created_by)
SELECT 
    gen_random_uuid(),
    p.id,
    tm.id,
    2025,
    1,
    1,
    50,
    5,
    true,
    NOW(),
    'excel-migration'
FROM projects p
CROSS JOIN team_members tm
WHERE LOWER(p.customer_name) = LOWER('Customer A')
  AND LOWER(p.project_name) = LOWER('Project Alpha')
  AND LOWER(tm.full_name) = LOWER('John Doe')
  AND NOT EXISTS (
    SELECT 1 FROM allocations a
    WHERE a.project_id = p.id
      AND a.product_manager_id = tm.id
      AND a.year = 2025
      AND a.month = 1
      AND a.sprint = 1
  );
```

## Customization Options

### Adjust Default Values
Edit the script to change:
- **Default year**: Change `year: 2025`
- **Default role**: Change `'Product Manager'`
- **Default project type**: Change `'Software'`
- **Default project status**: Change `'Active'`
- **Email domain**: Change `'@company.com'`

### Add More Months
Extend the `allocData` object:
```javascript
const allocData = {
  'Jan Sprint 1': parseFloat(row['Jan Sprint 1'] || 0),
  'Jan Sprint 2': parseFloat(row['Jan Sprint 2'] || 0),
  'Feb Sprint 1': parseFloat(row['Feb Sprint 1'] || 0),
  'Feb Sprint 2': parseFloat(row['Feb Sprint 2'] || 0),
  'Mar Sprint 1': parseFloat(row['Mar Sprint 1'] || 0),
  'Mar Sprint 2': parseFloat(row['Mar Sprint 2'] || 0),
  // Add more months as needed
};
```

## Verification

After running the SQL, use these queries to verify:

```sql
-- Check total counts
SELECT COUNT(*) as total_members FROM team_members;
SELECT COUNT(*) as total_projects FROM projects;
SELECT COUNT(*) as total_allocations FROM allocations;

-- Check Excel-imported data specifically
SELECT COUNT(*) as excel_allocations FROM allocations WHERE created_by = 'excel-migration';

-- View imported allocations
SELECT 
    tm.full_name,
    p.customer_name,
    p.project_name,
    a.year,
    a.month,
    a.sprint,
    a.allocation_percentage
FROM allocations a
JOIN team_members tm ON a.product_manager_id = tm.id
JOIN projects p ON a.project_id = p.id
WHERE a.created_by = 'excel-migration'
ORDER BY tm.full_name, p.customer_name, a.year, a.month, a.sprint;
```

## Troubleshooting

### Common Issues

1. **"Excel file not found"**
   - Check the file path in `EXCEL_FILE_PATH`
   - Ensure the Excel file exists in the specified location

2. **"Missing member name or project name"**
   - Check your Excel column names match expected format
   - Ensure no empty rows in your Excel data

3. **SQL execution errors**
   - Review the generated SQL for any syntax issues
   - Check that your database schema matches expected table names

4. **Duplicate data**
   - The script includes duplicate prevention
   - If you need to re-run, the existing records won't be duplicated

### Custom Column Names
If your Excel has different column names, update the script:
```javascript
const memberName = row['Your Member Column'] || row['Alternative Name'];
const projectName = row['Your Project Column'];
```

## Output Example

```
📊 Reading Excel file...
📋 Found 25 rows in Excel file
✅ SQL migration file generated successfully!
📄 Output file: ./migration-from-excel.sql
👥 Unique members: 8
📁 Unique projects: 12
📊 Total allocations: 45

📋 Summary:
Members to create: John Doe, Jane Smith, Mike Johnson, Sarah Wilson
Projects to create: Customer A - Project Alpha, Customer B - Project Beta, Customer C - Project Gamma
```

The generated SQL file will be ready to execute in your database, creating all necessary members, projects, and allocations from your Excel data!