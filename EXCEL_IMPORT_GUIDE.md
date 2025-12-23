# Excel Allocation Import Guide

## Overview
This guide explains how to import team member allocations from an Excel file into the capacity planning database.

## Prerequisites

### 1. Install Required Dependencies
```bash
npm install xlsx @supabase/supabase-js dotenv
```

### 2. Excel File Format
Create an Excel file named `team-allocations.xlsx` in the project root with the following columns:

| Team Member | Project | Jan Sprint 1 | Jan Sprint 2 | Feb Sprint 1 | Feb Sprint 2 |
|-------------|---------|--------------|--------------|--------------|--------------|
| John Doe | Project Alpha | 50 | 30 | 40 | 60 |
| Jane Smith | Project Beta | 75 | 80 | 70 | 65 |
| John Doe | Project Gamma | 25 | 40 | 35 | 20 |

**Column Requirements:**
- **Team Member**: Must match exactly with full names in the database
- **Project**: Can be either:
  - Full format: "Customer Name - Project Name"
  - Short format: "Project Name" (will try to match)
- **Sprint Columns**: Percentage values (0-100)
  - Empty cells or 0 values will be skipped
  - Values will be converted to allocation days (assuming 10 working days per sprint)

### 3. Alternative Column Names
The script supports these alternative column names:
- **Team Member**: "Member", "Name"
- **Project**: "Project Name"
- **Sprint Columns**: "January Sprint 1", "February Sprint 1", etc.

## Usage Instructions

### Step 1: Prepare Your Excel File
1. Create `team-allocations.xlsx` in the project root
2. Use the format shown above
3. Ensure team member names match database entries exactly
4. Ensure project names match database entries

### Step 2: Configure the Script
Edit `import-allocations-from-excel.js` if needed:
```javascript
const EXCEL_FILE_PATH = './team-allocations.xlsx'; // Update path if different
const CREATED_BY_EMAIL = 'admin@company.com'; // Update to your email
```

### Step 3: Run the Import
```bash
node import-allocations-from-excel.js
```

## Script Features

### ✅ Data Validation
- Validates team member names against database
- Validates project names against database
- Skips rows with missing required data
- Reports all errors with row numbers

### ✅ Flexible Matching
- Case-insensitive matching for names
- Supports multiple project name formats
- Handles alternative column names

### ✅ Smart Processing
- Only creates allocations for non-zero percentages
- Calculates allocation days automatically
- Generates unique IDs for each allocation
- Batch processing for large datasets

### ✅ Safety Features
- Shows detailed summary before importing
- Processes in batches to avoid database overload
- Comprehensive error reporting
- No duplicate checking (will create new allocations)

## Output Example

```
📊 Starting allocation import from Excel...
📖 Reading Excel file...
📋 Found 15 rows in Excel file
🔍 Fetching existing data from database...
👥 Found 25 team members in database
📁 Found 12 projects in database
✅ Processed 45 allocations from Excel

📊 Summary:
   - Total allocations to import: 45
   - Errors encountered: 2

⚠️  Errors found:
   Row 8: Team member "Bob Johnson" not found in database
   Row 12: Project "Unknown Project" not found in database

📋 Allocation Summary:
   John Doe → Customer A - Project Alpha: 1/1: 50%, 1/2: 30%, 2/1: 40%, 2/2: 60%
   Jane Smith → Customer B - Project Beta: 1/1: 75%, 1/2: 80%, 2/1: 70%, 2/2: 65%

💾 Importing allocations to database...
   Imported 45/45 allocations...

🎉 Import completed successfully!
✅ Imported 45 allocations
⚠️  2 rows had errors and were skipped
```

## Troubleshooting

### Common Issues

1. **"Team member not found"**
   - Check spelling and capitalization in Excel
   - Verify the team member exists in the database
   - Try using email address instead of full name

2. **"Project not found"**
   - Check project name format in Excel
   - Try "Customer Name - Project Name" format
   - Verify the project exists and isn't archived

3. **"Missing Supabase configuration"**
   - Ensure `.env.local` file exists
   - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

4. **"Excel file not found"**
   - Ensure file is named `team-allocations.xlsx`
   - Check file is in the project root directory
   - Update `EXCEL_FILE_PATH` in script if using different location

### Database Schema
The script creates allocations with this structure:
```sql
{
  id: UUID,
  project_id: UUID,
  product_manager_id: UUID,
  year: 2025,
  month: 1-2,
  sprint: 1-2,
  allocation_percentage: 0-100,
  allocation_days: calculated,
  created_at: timestamp,
  created_by: email,
  is_planned: true
}
```

## Advanced Usage

### Custom Year/Month
To import for different months, modify the script:
```javascript
const sprintData = [
  { year: 2025, month: 3, sprint: 1, percentage: marSprint1 },
  { year: 2025, month: 3, sprint: 2, percentage: marSprint2 },
  // Add more months as needed
];
```

### Batch Processing
For large files (1000+ rows), the script automatically processes in batches of 50 allocations to avoid database timeouts.

### Dry Run Mode
To test without importing, comment out the database insert section and run the script to see the summary and validation results.

## Next Steps
After successful import:
1. Verify allocations in the Capacity Planning interface
2. Check team member capacity percentages
3. Review any over-allocation warnings
4. Adjust allocations as needed through the UI

The imported allocations will appear immediately in the capacity planning system and can be edited or deleted through the normal interface.