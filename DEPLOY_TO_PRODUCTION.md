# Deploy to Production Guide

## Current Version
**v1.2.2** - Latest stable release with all bug fixes and features

## Recent Changes (v1.2.2)
- ✅ Removed all debug alert messages
- ✅ Fixed inline project creation to use proper ProjectForm component
- ✅ Fixed copy member allocations UI update issue
- ✅ Fixed member dropdown autoFocus behavior
- ✅ Updated Dashboard KPI subtitle
- ✅ All features tested and working in development

## Production Deployment Process

### Option 1: Automatic Deployment (Recommended)
Vercel is configured to automatically deploy from the `main` branch.

1. **Ensure all changes are committed and pushed to main:**
   ```bash
   git add .
   git commit -m "v1.2.2 - Production release"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Detect the push to main
   - Build the application
   - Deploy to production
   - Usually takes 2-3 minutes

3. **Verify deployment:**
   - Go to https://vercel.com/dashboard
   - Check the deployment status
   - Once complete, visit: https://newcapacityplanning.vercel.app
   - Test the features (especially adding allocations - should have NO debug alerts)

### Option 2: Manual Deployment via Vercel CLI
If automatic deployment doesn't trigger:

1. **Install Vercel CLI (if not already installed):**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Option 3: Trigger Deployment from Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your project: "product-capacity-platform"
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Select "Use existing Build Cache" = NO (to ensure fresh build)
6. Click "Redeploy"

## Verification Checklist

After deployment, verify these features work correctly:

### Critical Features
- [ ] No debug alerts when adding member allocations
- [ ] Inline project creation works (both flows)
- [ ] Copy member to next sprint shows all allocations immediately
- [ ] Member dropdown doesn't auto-select on typing
- [ ] Dashboard shows correct KPI subtitle: "Projects without / missing allocations"

### General Features
- [ ] Login works
- [ ] Dashboard loads correctly
- [ ] Capacity Planning loads in Team view
- [ ] Can add/edit/delete allocations
- [ ] Can create projects
- [ ] Data persists to Supabase

## Troubleshooting

### If debug alerts still appear:
1. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Or use Incognito mode to test

2. **Check deployment logs:**
   - Go to Vercel dashboard
   - Click on the deployment
   - Check "Build Logs" for any errors

3. **Verify correct branch:**
   - Ensure Vercel is deploying from `main` branch
   - Check vercel.json configuration

### If deployment fails:
1. Check build logs for errors
2. Ensure all dependencies are in package.json
3. Verify TypeScript compiles: `npm run build`
4. Check for any console errors

## Environment Variables

Ensure these are set in Vercel:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Rollback Procedure

If issues occur in production:

1. Go to Vercel dashboard
2. Find a previous working deployment
3. Click "..." menu → "Promote to Production"
4. Fix issues in development
5. Redeploy when ready

## Version History

- **v1.2.2** (Current) - Bug fixes and UI improvements
- **v1.2.1** - Team-based permissions hotfix
- **v1.2.0** - Team-based permissions system
- **v1.1.4** - Various bug fixes
- **v1.1.0** - Initial stable release

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify Supabase connection
4. Review recent git commits for changes

## Notes

- Production URL: https://newcapacityplanning.vercel.app
- Development uses local Supabase instance
- Production uses production Supabase instance
- Always test in development before deploying to production
