# Version Tracking System

## Overview
The application now displays the version number + git commit hash in the UI footer, making it easy to verify if dev and production are running the same code.

## How It Works

### Version Display
The version is shown in the bottom-right corner of every page:
```
v1.2.2 (c103a3b) | 🟢 Dev
```
or
```
v1.2.2 (c103a3b) | 🔵 Prod
```

### Components

1. **package.json** - Contains the semantic version (e.g., "1.2.2")
2. **scripts/generate-version.js** - Generates version info at build time
3. **src/version.ts** - Auto-generated file with version + git hash
4. **Layout.tsx** - Displays the version in the footer

### Build Process

When you run `npm run build`:
1. **prebuild** script runs `generate-version.js`
2. Script reads:
   - Version from package.json
   - Git commit hash (short)
   - Git branch name
   - Build timestamp
3. Generates `src/version.ts` with all info
4. Build includes this file
5. UI displays: `v1.2.2 (c103a3b)`

## Comparing Dev vs Production

### Quick Check
1. **Development:** Open http://localhost:5174
   - Look at bottom-right corner
   - Should show: `v1.2.2 (c103a3b) | 🟢 Dev`

2. **Production:** Open https://newcapacityplanning.vercel.app
   - Look at bottom-right corner
   - Should show: `v1.2.2 (c103a3b) | 🔵 Prod`

3. **Compare:**
   - ✅ **Same version + hash** = Running identical code
   - ❌ **Different version or hash** = Out of sync!

### Example Scenarios

**Scenario 1: In Sync** ✅
```
Dev:  v1.2.2 (c103a3b) | 🟢 Dev
Prod: v1.2.2 (c103a3b) | 🔵 Prod
```
→ Both running the same code

**Scenario 2: Out of Sync** ❌
```
Dev:  v1.2.2 (c103a3b) | 🟢 Dev
Prod: v1.2.1 (e569fa2) | 🔵 Prod
```
→ Production is behind, needs deployment

**Scenario 3: Different Commits** ❌
```
Dev:  v1.2.2 (a1b2c3d) | 🟢 Dev
Prod: v1.2.2 (c103a3b) | 🔵 Prod
```
→ Same version but different code, deploy needed

## Version Format

### Full Version String
`v1.2.2 (c103a3b)`

- **1.2.2** - Semantic version from package.json
- **c103a3b** - Short git commit hash (7 characters)

### Semantic Versioning
We follow [SemVer](https://semver.org/):
- **Major.Minor.Patch** (e.g., 1.2.2)
- **Major** (1.x.x) - Breaking changes
- **Minor** (x.2.x) - New features, backwards compatible
- **Patch** (x.x.2) - Bug fixes

### Git Commit Hash
- Short hash (7 chars) from `git rev-parse --short HEAD`
- Uniquely identifies the exact code version
- Can be used to find the commit in git history

## Updating the Version

### When to Update

**Patch Version (x.x.X)** - Bug fixes only
```bash
# Example: 1.2.2 → 1.2.3
npm version patch
```

**Minor Version (x.X.x)** - New features
```bash
# Example: 1.2.3 → 1.3.0
npm version minor
```

**Major Version (X.x.x)** - Breaking changes
```bash
# Example: 1.3.0 → 2.0.0
npm version major
```

### Manual Update
Edit `package.json`:
```json
{
  "version": "1.2.3"
}
```

### Automatic Commit Hash
The git hash is automatically included during build - no manual update needed!

## Deployment Workflow

### Step 1: Update Version (if needed)
```bash
npm version patch  # or minor/major
```

### Step 2: Commit Changes
```bash
git add .
git commit -m "v1.2.3 - Bug fixes"
```

### Step 3: Push to Main
```bash
git push origin main
```

### Step 4: Verify Deployment
1. Wait 2-3 minutes for Vercel to deploy
2. Open production URL
3. Check version in footer
4. Should match your local version + commit hash

### Step 5: Confirm Sync
```bash
# Get current commit hash
git rev-parse --short HEAD

# Should match what's shown in production footer
```

## Troubleshooting

### Version Shows "dev" or "unknown"
**Problem:** Git hash shows as "dev" or "unknown"

**Solution:**
1. Ensure you're in a git repository
2. Ensure git is installed and in PATH
3. Run `npm run build` to regenerate version.ts

### Production Shows Old Version
**Problem:** Production footer shows older version than dev

**Solution:**
1. Check if latest code is pushed to main
2. Check Vercel deployment status
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito/private mode

### Version File Not Generated
**Problem:** Build fails or version.ts not created

**Solution:**
1. Check if scripts/generate-version.js exists
2. Ensure prebuild script is in package.json
3. Check build logs for errors
4. Fallback version will be used if generation fails

## Files

### Auto-Generated (Don't Edit)
- `src/version.ts` - Generated at build time, in .gitignore

### Configuration
- `package.json` - Contains version number and prebuild script
- `scripts/generate-version.js` - Version generation script

### Display
- `src/components/Layout.tsx` - Shows version in footer

## Benefits

1. **Easy Verification** - Instantly see if dev and prod match
2. **Debugging** - Know exactly which code version is running
3. **Deployment Confidence** - Confirm deployments succeeded
4. **Issue Tracking** - Link bug reports to specific commits
5. **Rollback Support** - Know which version to rollback to

## Example Usage

### Before Deployment
```bash
# Check current version
cat package.json | grep version

# Check current commit
git rev-parse --short HEAD

# Build and check
npm run build
# Version file generated with commit hash
```

### After Deployment
```
1. Open production URL
2. Look at footer: v1.2.2 (c103a3b) | 🔵 Prod
3. Compare with local: v1.2.2 (c103a3b) | 🟢 Dev
4. ✅ Match = Deployment successful!
```

### Reporting Issues
When reporting bugs, include the version:
```
Issue: Debug alerts showing in production
Version: v1.2.1 (e569fa2)
Environment: Production
```

## Best Practices

1. **Always update version** before major releases
2. **Check footer** after every deployment
3. **Document changes** in commit messages
4. **Use semantic versioning** consistently
5. **Keep dev and prod in sync** - deploy regularly

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm version patch` | Bump patch version (bug fixes) |
| `npm version minor` | Bump minor version (features) |
| `npm version major` | Bump major version (breaking) |
| `npm run build` | Generate version.ts and build |
| `git rev-parse --short HEAD` | Get current commit hash |

## Support

If version tracking isn't working:
1. Check scripts/generate-version.js exists
2. Verify prebuild script in package.json
3. Ensure git is installed
4. Check build logs for errors
5. Fallback version will be used if needed
