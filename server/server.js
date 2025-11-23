import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import email parser (will be converted to ES module)
import { parseHubSpotEmail, convertToProject } from './emailParser.js';

const app = express();
const PORT = 3002;
const DB_FILE = path.join(__dirname, 'database.json');
let isWriting = false;
const writeQueue = [];

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Initialize database file if it doesn't exist
async function initDB() {
  try {
    await fs.access(DB_FILE);
  } catch {
    const initialData = {
      teamMembers: [{
        id: crypto.randomUUID(),
        fullName: 'Dror',
        email: 'drors@comm-it.com',
        role: 'Product Operations Manager',
        isActive: true,
        createdAt: new Date().toISOString(),
      }],
      projects: [],
      allocations: [],
      history: [],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
    console.log('✅ Database initialized with default data');
  }
}

// Read database
async function readDB() {
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write database with backup and locking
async function writeDB(data) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ data, resolve, reject });
    processWriteQueue();
  });
}

async function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;
  
  isWriting = true;
  const { data, resolve, reject } = writeQueue.shift();
  
  try {
    // Validate JSON before writing
    const jsonString = JSON.stringify(data, null, 2);
    JSON.parse(jsonString); // Validate it's valid JSON
    
    // Create backup before writing
    const backupFile = DB_FILE.replace('.json', `.backup.${Date.now()}.json`);
    try {
      const existingData = await fs.readFile(DB_FILE, 'utf-8');
      await fs.writeFile(backupFile, existingData);
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (err) {
      // File doesn't exist yet, skip backup
    }
    
    // Write new data atomically
    const tempFile = DB_FILE + '.tmp';
    await fs.writeFile(tempFile, jsonString);
    await fs.rename(tempFile, DB_FILE);
    console.log('✅ Database saved successfully');
    
    // Create CSV backups
    await createCSVBackups(data);
    
    // Clean old backups (keep last 10)
    await cleanOldBackups();
    
    resolve();
  } catch (error) {
    console.error('❌ Error writing database:', error);
    reject(error);
  } finally {
    isWriting = false;
    // Process next item in queue
    if (writeQueue.length > 0) {
      processWriteQueue();
    }
  }
}

// Create CSV backups
async function createCSVBackups(data) {
  try {
    const backupDir = path.join(__dirname, 'csv-backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Team Members CSV
    if (data.teamMembers && data.teamMembers.length > 0) {
      const teamCSV = [
        'ID,Full Name,Email,Role,Team,Active,Created At',
        ...data.teamMembers.map(m => 
          `"${m.id}","${m.fullName}","${m.email}","${m.role}","${m.team || ''}","${m.isActive}","${m.createdAt}"`
        )
      ].join('\n');
      await fs.writeFile(path.join(backupDir, `team-members-${timestamp}.csv`), teamCSV);
    }
    
    // Projects CSV
    if (data.projects && data.projects.length > 0) {
      const projectsCSV = [
        'ID,Customer,Project Name,Type,Status,Max Capacity %,PMO Contact,Archived,Created At',
        ...data.projects.map(p => 
          `"${p.id}","${p.customerName}","${p.projectName}","${p.projectType}","${p.status}","${p.maxCapacityPercentage || ''}","${p.pmoContact || ''}","${p.isArchived}","${p.createdAt}"`
        )
      ].join('\n');
      await fs.writeFile(path.join(backupDir, `projects-${timestamp}.csv`), projectsCSV);
    }
    
    // Allocations CSV
    if (data.allocations && data.allocations.length > 0) {
      const allocationsCSV = [
        'ID,Project ID,Member ID,Year,Month,Sprint,Percentage,Days,Created At,Created By',
        ...data.allocations.map(a => 
          `"${a.id}","${a.projectId}","${a.productManagerId}","${a.year}","${a.month}","${a.sprint}","${a.allocationPercentage}","${a.allocationDays}","${a.createdAt}","${a.createdBy}"`
        )
      ].join('\n');
      await fs.writeFile(path.join(backupDir, `allocations-${timestamp}.csv`), allocationsCSV);
    }
    
    console.log(`📊 CSV backups created in csv-backups/`);
  } catch (err) {
    console.error('Warning: Could not create CSV backups:', err.message);
  }
}

// Clean old backup files
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(__dirname);
    const backupFiles = files
      .filter(f => f.startsWith('database.backup.') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    // Keep only last 10 backups
    for (let i = 10; i < backupFiles.length; i++) {
      await fs.unlink(path.join(__dirname, backupFiles[i]));
    }
  } catch (err) {
    // Ignore errors in cleanup
  }
}

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    console.log('📥 GET /api/data - Request received');
    const data = await readDB();
    console.log('✅ Data loaded, sending response');
    res.json(data);
  } catch (error) {
    console.error('❌ Error loading data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update team members
app.post('/api/teamMembers', async (req, res) => {
  try {
    const data = await readDB();
    data.teamMembers = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update projects
app.post('/api/projects', async (req, res) => {
  try {
    const data = await readDB();
    data.projects = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update allocations
app.post('/api/allocations', async (req, res) => {
  try {
    const data = await readDB();
    data.allocations = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update history
app.post('/api/history', async (req, res) => {
  try {
    const data = await readDB();
    data.history = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of backups
app.get('/api/backups', async (req, res) => {
  try {
    const files = await fs.readdir(__dirname);
    const backupFiles = files
      .filter(f => f.startsWith('database.backup.') && f.endsWith('.json'))
      .sort()
      .reverse();
    res.json({ backups: backupFiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore from backup
app.post('/api/restore/:filename', async (req, res) => {
  try {
    const backupPath = path.join(__dirname, req.params.filename);
    const backupData = await fs.readFile(backupPath, 'utf-8');
    await fs.writeFile(DB_FILE, backupData);
    res.json({ success: true, message: 'Database restored from backup' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import project from HubSpot email
app.post('/api/import/hubspot-email', async (req, res) => {
  try {
    const { emailContent } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    console.log('📧 Processing HubSpot email import...');
    
    // Parse email content
    const parsedData = parseHubSpotEmail(emailContent);
    
    // Validate required fields
    if (!parsedData.customer || !parsedData.projectName) {
      return res.status(400).json({ 
        error: 'Could not extract required fields (Customer and Project Name) from email',
        parsedData 
      });
    }

    // Convert to project format
    const newProject = convertToProject(parsedData);
    newProject.id = crypto.randomUUID();
    newProject.createdAt = new Date().toISOString();

    // Add to database
    const data = await readDB();
    data.projects = data.projects || [];
    data.projects.push(newProject);
    await writeDB(data);

    console.log('✅ Project created from HubSpot email:', newProject.projectName);
    
    res.json({ 
      success: true, 
      project: newProject,
      parsedData 
    });
  } catch (error) {
    console.error('❌ Error importing from HubSpot email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
await initDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Database file: ${DB_FILE}`);
  console.log(`🌐 Accepting connections from all interfaces`);
  console.log(`💾 Automatic backups enabled`);
});
