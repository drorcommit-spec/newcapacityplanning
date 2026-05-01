const XLSX = require('xlsx');
const wb = XLSX.readFile('abcd.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});
const fs = require('fs');

const periodRow = data[0];
const employeeRow = data[1];

// Parse periods
const periods = [];
let currentPeriod = null;
for (let c = 2; c < periodRow.length; c++) {
  if (periodRow[c]) currentPeriod = periodRow[c].toString().trim();
  if (employeeRow[c]) {
    periods.push({ col: c, period: currentPeriod, employee: employeeRow[c].toString().trim() });
  }
}

// Parse period string to year/month/sprint
function parsePeriod(p) {
  // "May  26 Sprint 1" or "June  26 Sprint 1 - TBD"
  const match = p.match(/(\w+)\s+(\d+)\s+Sprint\s+(\d)/i);
  if (!match) return null;
  const monthNames = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, june:6, jul:7, july:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  const month = monthNames[match[1].toLowerCase()];
  const year = 2000 + parseInt(match[2]);
  const sprint = parseInt(match[3]);
  return { year, month, sprint };
}

// Collect allocations
const allocs = [];
for (let r = 3; r < data.length; r++) {
  const row = data[r];
  if (!row || !row[0]) continue;
  const activity = row[0].toString().trim();
  for (const p of periods) {
    const val = row[p.col];
    if (val && typeof val === 'number' && val > 0) {
      const parsed = parsePeriod(p.period);
      if (parsed) {
        allocs.push({
          activity,
          employee: p.employee,
          year: parsed.year,
          month: parsed.month,
          sprint: parsed.sprint,
          percentage: Math.round(val * 100)
        });
      }
    }
  }
}

// Generate SQL
let sql = `-- Auto-generated from abcd.xlsx
-- ${allocs.length} allocations to insert
-- Run this AFTER ensuring all projects and team members exist in the database

-- Step 1: Insert allocations using project name matching and employee name matching
`;

for (const a of allocs) {
  const escapedActivity = a.activity.replace(/'/g, "''");
  const escapedEmployee = a.employee.replace(/'/g, "''");
  
  sql += `
INSERT INTO allocations (id, project_id, product_manager_id, year, month, sprint, allocation_percentage, allocation_days, created_at, created_by)
SELECT 
  gen_random_uuid(),
  p.id,
  tm.id,
  ${a.year}, ${a.month}, ${a.sprint},
  ${a.percentage},
  ${(a.percentage / 100 * 10).toFixed(1)},
  NOW(),
  'excel-import'
FROM projects p, team_members tm
WHERE p.project_name ILIKE '%${escapedActivity.substring(0, 30)}%'
  AND tm.full_name ILIKE '%${escapedEmployee}%'
  AND tm.is_active = true
LIMIT 1;
`;
}

sql += `
-- Verify
SELECT COUNT(*) as imported_allocations FROM allocations WHERE created_by = 'excel-import';
`;

fs.writeFileSync('import-allocations-from-excel.sql', sql);
console.log(`Generated SQL with ${allocs.length} INSERT statements -> import-allocations-from-excel.sql`);
