@echo off
echo ========================================
echo Fix Build Error and Deploy
echo ========================================
echo.
echo This will:
echo 1. Remove version.ts from .gitignore
echo 2. Commit version.ts to repo
echo 3. Push to GitHub
echo 4. Trigger successful Vercel deployment
echo.
pause

echo.
echo Step 1: Adding all files including version.ts...
git add .

echo.
echo Step 2: Committing changes...
git commit -m "v1.2.2 - Fix build: Include version.ts in repo"

echo.
echo Step 3: Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Deployment Initiated!
echo ========================================
echo.
echo Vercel will now build successfully.
echo The version.ts file is now in the repo.
echo.
echo Wait 2-3 minutes, then check:
echo https://newcapacityplanning.vercel.app
echo.
echo Bottom-left corner should show:
echo v1.2.2 (0fb2a23) ^| 🔵 Prod
echo.
echo ========================================
echo IMPORTANT: Clear browser cache!
echo ========================================
echo Press Ctrl+Shift+Delete
echo Or use Incognito/Private mode
echo.
pause
