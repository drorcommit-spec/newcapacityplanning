import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get git commit hash (short version)
  const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  
  // Get git branch
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  
  // Get build timestamp
  const buildTime = new Date().toISOString();
  
  // Read package.json version
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;
  
  // Create version info object
  const versionInfo = {
    version,
    gitHash,
    gitBranch,
    buildTime,
    fullVersion: `${version} (${gitHash})`
  };
  
  // Write to src/version.ts
  const versionFilePath = join(__dirname, '..', 'src', 'version.ts');
  const content = `// Auto-generated file - do not edit manually
// Generated at build time

export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)} as const;

export const APP_VERSION = VERSION_INFO.fullVersion;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
`;
  
  writeFileSync(versionFilePath, content, 'utf-8');
  
  console.log('✅ Version info generated successfully:');
  console.log(`   Version: ${versionInfo.fullVersion}`);
  console.log(`   Branch: ${gitBranch}`);
  console.log(`   Build time: ${buildTime}`);
  
} catch (error) {
  console.error('❌ Error generating version info:', error.message);
  
  // Fallback: create a basic version file
  const fallbackContent = `// Auto-generated file - fallback version

export const VERSION_INFO = {
  version: "1.2.2",
  gitHash: "unknown",
  gitBranch: "unknown",
  buildTime: "${new Date().toISOString()}",
  fullVersion: "1.2.2 (unknown)"
} as const;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
`;
  
  const versionFilePath = join(__dirname, '..', 'src', 'version.ts');
  writeFileSync(versionFilePath, fallbackContent, 'utf-8');
  
  console.log('⚠️  Using fallback version info');
}
