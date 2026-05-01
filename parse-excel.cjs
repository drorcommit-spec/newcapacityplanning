const XLSX = require('xlsx');
const wb = XLSX.readFile('abcd.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

const periodRow = data[0];
const employeeRow = data[1];

const periods = [];
let currentPeriod = null;
for (let c = 2; c < periodRow.length; c++) {
  if (periodRow[c]) currentPeriod = periodRow[c].toString().trim();
  if (employeeRow[c]) {
    periods.push({ col: c, period: currentPeriod, employee: employeeRow[c].toString().trim() });
  }
}

console.log('Periods:', [...new Set(periods.map(p => p.period))]);
console.log('Employees:', [...new Set(periods.map(p => p.employee))]);

const allocs = [];
for (let r = 3; r < data.length; r++) {
  const row = data[r];
  if (!row || !row[0]) continue;
  const activity = row[0].toString().trim();
  for (const p of periods) {
    const val = row[p.col];
    if (val && typeof val === 'number' && val > 0) {
      allocs.push({ activity, employee: p.employee, period: p.period, percentage: Math.round(val * 100) });
    }
  }
}

console.log('Total allocations:', allocs.length);
allocs.forEach(a => console.log(JSON.stringify(a)));
