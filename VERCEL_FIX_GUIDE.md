# Vercel Deployment Fix Guide

## Problem
Vercel is deploying commit `0aff139` (old code with TypeScript errors) instead of the latest commit `223e78a` (with fixes).

## Solution Options

### Option 1: Check Vercel Branch Settings (Recommended)
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `capacityplanning` project
3. Go to **Settings** → **Git**
4. Check the **Production Branch** setting
5. If it says `master`, change it to `main`
6. Save and trigger a new deployment

### Option 2: Push to Master Branch
If Vercel is configured to deploy from `master` branch, we need to push our code there:

```powershell
# In PowerShell
cd product-capacity-platform
& "C:\Program Files\Git\bin\git.exe" checkout -b master
& "C:\Program Files\Git\bin\git.exe" push vercel-repo master --force
```

Or use the GitHub web interface:
1. Go to https://github.com/drorcommit-spec/capacityplanning
2. Click on "main" branch dropdown
3. Create a new branch called "master" from main
4. Set "master" as the default branch in Settings

### Option 3: Manual Redeploy
1. Go to Vercel dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click the three dots (...) on the latest deployment
5. Click **Redeploy**
6. Make sure "Use existing Build Cache" is **UNCHECKED**
7. Click **Redeploy**

### Option 4: Check GitHub Default Branch
1. Go to https://github.com/drorcommit-spec/capacityplanning
2. Click **Settings** (repository settings)
3. Look at **Default branch** section
4. If it's not `main`, click the switch icon and change it to `main`
5. Confirm the change

## Verify the Fix

After making changes, check the next Vercel build log. It should show:
```
Cloning github.com/drorcommit-spec/capacityplanning (Branch: main, Commit: 223e78a)
```

Instead of:
```
Cloning github.com/drorcommit-spec/capacityplanning (Branch: main, Commit: 0aff139)
```

## Current Commit Status

- ❌ `0aff139` - Old commit (has TypeScript errors)
- ✅ `140a89d` - Fixed TypeScript errors  
- ✅ `223e78a` - Latest commit (trigger rebuild)

## Files That Were Fixed

1. `src/components/CapacityOverview.tsx` - Removed unused `label` variable
2. `src/pages/TeamManagement.tsx` - Removed unused `setSearchTerm`, `viewMode`, `setViewMode`

## If Still Failing

Contact Vercel support or check:
- Webhook configuration in GitHub
- Vercel integration permissions
- Repository access tokens

The code is correct and ready - it's just a deployment configuration issue!
