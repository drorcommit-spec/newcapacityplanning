/**
 * Anonymize/Revert Projects Tool
 * 
 * Usage:
 *   node anonymize-projects-tool.cjs anonymize   - generates anonymize SQL + saves mapping locally
 *   node anonymize-projects-tool.cjs revert      - generates revert SQL from local mapping
 * 
 * The mapping file (project-name-mapping.json) stays on your local PC only.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const MAPPING_FILE = path.join(__dirname, 'project-name-mapping.json');

// Determine which env file to use
const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.production' : '.env.local';
const envPath = path.join(__dirname, envFile);

if (!fs.existsSync(envPath)) {
  console.error(`Environment file not found: ${envPath}`);
  console.error(isProd ? 'Create .env.production with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' : 'Create .env.local');
  process.exit(1);
}

console.log(`Using environment: ${envFile} ${isProd ? '(PRODUCTION)' : '(development)'}`);

const envContent = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(`Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in ${envFile}`);
  console.error('Found keys:', Object.keys(env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function anonymize() {
  console.log('Fetching projects from database...');
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, customer_name, project_name')
    .order('customer_name', { ascending: true })
    .order('project_name', { ascending: true });

  if (error) { console.error('Error:', error.message); process.exit(1); }
  
  console.log(`Found ${projects.length} projects.`);

  // Build mapping
  const mapping = projects.map((p, i) => ({
    id: p.id,
    original_customer: p.customer_name,
    original_project: p.project_name,
    anon_customer: `Customer ${i + 1}`,
    anon_project: `Project ${i + 1}`,
  }));

  // Save mapping locally
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping saved to: ${MAPPING_FILE}`);
  console.log('⚠️  Keep this file safe - you need it to revert!\n');

  // Generate anonymize SQL
  const sqlLines = mapping.map(m => 
    `UPDATE projects SET customer_name = '${m.anon_customer}', project_name = '${m.anon_project}' WHERE id = '${m.id}';`
  );
  
  const anonymizeSql = `-- Anonymize all projects (generated ${new Date().toISOString()})\n-- Run this on Supabase SQL editor\n\n${sqlLines.join('\n')}\n`;
  
  const sqlFile = path.join(__dirname, 'anonymize-projects-RUN.sql');
  fs.writeFileSync(sqlFile, anonymizeSql);
  console.log(`Anonymize SQL written to: ${sqlFile}`);
  console.log(`Run it in Supabase SQL editor to anonymize ${projects.length} projects.`);
}

async function revert() {
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error('No mapping file found! Cannot revert without project-name-mapping.json');
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  console.log(`Loaded mapping for ${mapping.length} projects.`);

  // Generate revert SQL
  const sqlLines = mapping.map(m => {
    const customer = m.original_customer.replace(/'/g, "''");
    const project = m.original_project.replace(/'/g, "''");
    return `UPDATE projects SET customer_name = '${customer}', project_name = '${project}' WHERE id = '${m.id}';`;
  });

  const revertSql = `-- Revert projects to original names (generated ${new Date().toISOString()})\n-- Run this on Supabase SQL editor\n\n${sqlLines.join('\n')}\n`;

  const sqlFile = path.join(__dirname, 'revert-projects-RUN.sql');
  fs.writeFileSync(sqlFile, revertSql);
  console.log(`\nRevert SQL written to: ${sqlFile}`);
  console.log('Run it in Supabase SQL editor to restore original names.');
}

const command = process.argv[2];
if (command === 'anonymize') {
  anonymize().catch(console.error);
} else if (command === 'revert') {
  revert();
} else {
  console.log('Usage:');
  console.log('  node anonymize-projects-tool.cjs anonymize          - anonymize DEV project names');
  console.log('  node anonymize-projects-tool.cjs anonymize --prod   - anonymize PROD project names');
  console.log('  node anonymize-projects-tool.cjs revert             - generate revert SQL from local mapping');
  console.log('  node anonymize-projects-tool.cjs revert --prod      - (same, just reads local mapping)');
}
