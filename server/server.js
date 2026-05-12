import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import email parser (will be converted to ES module)
import { parseHubSpotEmail, convertToProject } from './emailParser.js';

const app = express();
const PORT = process.env.PORT || 3002;
const DB_FILE = path.join(__dirname, 'database.json');
let isWriting = false;
const writeQueue = [];

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
// Increase body size limit to 50MB to handle large history arrays
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      sprintProjects: {},
      sprintRoleRequirements: {},
      resourceRoles: [
        { id: '1', name: 'VP Product', isArchived: false, createdAt: new Date().toISOString() },
        { id: '2', name: 'Product Director', isArchived: false, createdAt: new Date().toISOString() },
        { id: '3', name: 'Product Manager', isArchived: false, createdAt: new Date().toISOString() },
        { id: '4', name: 'Product Operations Manager', isArchived: false, createdAt: new Date().toISOString() },
        { id: '5', name: 'PMO', isArchived: false, createdAt: new Date().toISOString() },
      ],
      teams: [],
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
    
    // On Windows, fs.rename fails if target exists, so delete first
    try {
      await fs.unlink(DB_FILE);
    } catch (err) {
      // File doesn't exist, that's fine
    }
    
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
    // Strip password hashes from response (security)
    const safeData = { ...data };
    safeData.teamMembers = data.teamMembers.map(m => {
      const { passwordHash, ...rest } = m;
      return rest;
    });
    console.log('✅ Data loaded, sending response');
    res.json(safeData);
  } catch (error) {
    console.error('❌ Error loading data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login with email + password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const data = await readDB();
    const member = data.teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase() && m.isActive);
    if (!member) {
      return res.status(401).json({ error: 'Email not found or account is inactive' });
    }
    // If member has no password hash yet, set default
    if (!member.passwordHash) {
      member.passwordHash = await bcrypt.hash('12345678', 10);
      await writeDB(data);
    }
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const { passwordHash, ...safeUser } = member;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change own password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const data = await readDB();
    const member = data.teamMembers.find(m => m.id === userId);
    if (!member) {
      return res.status(404).json({ error: 'User not found' });
    }
    // If no hash yet, treat default as current
    if (!member.passwordHash) {
      member.passwordHash = await bcrypt.hash('12345678', 10);
    }
    const valid = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    member.passwordHash = await bcrypt.hash(newPassword, 10);
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: get member password (returns plain indicator, not actual hash)
app.get('/api/auth/admin/member-password/:memberId', async (req, res) => {
  try {
    const data = await readDB();
    const member = data.teamMembers.find(m => m.id === req.params.memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    // Admin can see if password is default or custom
    const isDefault = !member.passwordHash || await bcrypt.compare('12345678', member.passwordHash);
    res.json({ isDefault, hasPassword: !!member.passwordHash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: reset/set member password
app.post('/api/auth/admin/set-password', async (req, res) => {
  try {
    const { memberId, newPassword } = req.body;
    if (!memberId || !newPassword) {
      return res.status(400).json({ error: 'Member ID and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const data = await readDB();
    const member = data.teamMembers.find(m => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    member.passwordHash = await bcrypt.hash(newPassword, 10);
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize passwords for all members that don't have one
app.post('/api/auth/init-passwords', async (req, res) => {
  try {
    const data = await readDB();
    const defaultHash = await bcrypt.hash('12345678', 10);
    let count = 0;
    for (const member of data.teamMembers) {
      if (!member.passwordHash) {
        member.passwordHash = defaultHash;
        count++;
      }
    }
    if (count > 0) {
      await writeDB(data);
    }
    res.json({ success: true, initialized: count });
  } catch (error) {
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

// Get teams
app.get('/api/teams', async (req, res) => {
  try {
    const data = await readDB();
    const teams = (data.teams || [])
      .filter(t => !t.isArchived)
      .map(t => t.name)
      .sort();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update teams
app.post('/api/teams', async (req, res) => {
  try {
    const data = await readDB();
    data.teams = req.body;
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

// Update sprint projects
app.post('/api/sprintProjects', async (req, res) => {
  try {
    const data = await readDB();
    data.sprintProjects = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sprint role requirements
app.post('/api/sprintRoleRequirements', async (req, res) => {
  try {
    const data = await readDB();
    data.sprintRoleRequirements = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update resource roles
app.post('/api/resourceRoles', async (req, res) => {
  try {
    const data = await readDB();
    data.resourceRoles = req.body;
    await writeDB(data);
    res.json({ success: true });
  } catch (error) {
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
