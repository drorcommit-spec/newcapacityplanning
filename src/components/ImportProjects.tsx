import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import * as XLSX from 'xlsx';

interface ImportProjectsProps {
  onComplete?: () => void;
}

interface ImportRow {
  customerName: string;
  projectName: string;
}

export default function ImportProjects({ onComplete }: ImportProjectsProps) {
  const { projects, addProject } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          alert('No data found in the file. Make sure the first row contains column headers.');
          return;
        }

        // Show detected columns for debugging
        const sampleKeys = Object.keys(rows[0]);
        console.log('Detected columns:', sampleKeys);

        // Normalize column names (case-insensitive, trim)
        const parsed: ImportRow[] = rows.map((row) => {
          const keys = Object.keys(row);
          const findCol = (names: string[]) => {
            const key = keys.find(k => names.some(n => k.trim().toLowerCase().includes(n)));
            return key ? String(row[key]).trim() : '';
          };
          return {
            customerName: findCol(['customer', 'client', 'company', 'לקוח']),
            projectName: findCol(['project', 'name', 'פרויקט']),
          };
        }).filter(r => r.customerName && r.projectName);

        if (parsed.length === 0) {
          alert(
            `Could not find matching columns.\n\n` +
            `Detected columns: ${sampleKeys.join(', ')}\n\n` +
            `Expected: A column containing "Customer" and a column containing "Project".\n\n` +
            `Please rename your columns and try again.`
          );
          return;
        }

        setPreview(parsed);
      } catch (err: any) {
        alert(`Error reading file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    setImporting(true);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of preview) {
      // Check if project already exists (case-insensitive)
      const exists = projects.find(
        p => p.customerName.toLowerCase() === row.customerName.toLowerCase() &&
             p.projectName.toLowerCase() === row.projectName.toLowerCase()
      );

      if (exists) {
        skipped++;
        continue;
      }

      try {
        addProject({
          customerId: crypto.randomUUID(),
          customerName: row.customerName,
          projectName: row.projectName,
          projectType: 'Software',
          status: 'Active',
          isArchived: false,
        } as any);
        created++;
      } catch (err: any) {
        errors.push(`${row.customerName} - ${row.projectName}: ${err.message}`);
      }
    }

    setResult({ created, skipped, errors });
    setImporting(false);
    setPreview([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Upload an Excel file (.xlsx, .xls) with columns: <span className="font-semibold">Customer Name</span> and <span className="font-semibold">Project Name</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {preview.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Preview: {preview.length} project(s) found
          </div>
          <div className="max-h-60 overflow-y-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600">#</th>
                  <th className="text-left px-3 py-2 text-gray-600">Customer Name</th>
                  <th className="text-left px-3 py-2 text-gray-600">Project Name</th>
                  <th className="text-left px-3 py-2 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => {
                  const exists = projects.find(
                    p => p.customerName.toLowerCase() === row.customerName.toLowerCase() &&
                         p.projectName.toLowerCase() === row.projectName.toLowerCase()
                  );
                  return (
                    <tr key={idx} className={exists ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-1.5 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-1.5">{row.customerName}</td>
                      <td className="px-3 py-1.5">{row.projectName}</td>
                      <td className="px-3 py-1.5">
                        {exists ? (
                          <span className="text-yellow-600 text-xs">Already exists - will skip</span>
                        ) : (
                          <span className="text-green-600 text-xs">New - will create</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.filter(r => !projects.find(p => p.customerName.toLowerCase() === r.customerName.toLowerCase() && p.projectName.toLowerCase() === r.projectName.toLowerCase())).length} Project(s)`}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`p-3 rounded text-sm ${result.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="font-medium">
            ✅ Import complete: {result.created} created, {result.skipped} skipped (already exist)
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              Errors: {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
          <button onClick={() => { handleReset(); onComplete?.(); }} className="mt-2 text-blue-600 text-xs hover:underline">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
