@echo off
echo ========================================
echo Final Fix and Deploy
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Adding version.ts to git...
git add src/version.ts

echo.
echo Step 2: Checking if there are changes to commit...
git diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo No changes to commit. version.ts is already in the repo.
    echo Creating a trigger file to force a new deployment...
    echo // Trigger > .trigger
    git add .trigger
    git commit -m "Trigger deployment - version.ts should be included"
    del .trigger
) else (
    echo Changes found. Committing version.ts...
    git commit -m "Add version.ts with APP_VERSION export"
)

echo.
echo Step 3: Pushing to GitHub...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Push failed!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Success!
echo ========================================
echo.
echo Pushed to GitHub successfully.
echo Vercel will deploy the latest commit.
echo.
echo Wait 2-3 minutes, then:
echo 1. Check https://vercel.com/dashboard
echo 2. Look for the NEW deployment
echo 3. It should build successfully this time
echo 4. Open https://newcapacityplanning.vercel.app
echo 5. Clear cache (Ctrl+Shift+Delete)
echo 6. Check bottom-left for version
echo.
pause
