@echo off
echo Pushing fixes to GitHub...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "Fix: Remove unused variables for Vercel build"
"C:\Program Files\Git\bin\git.exe" push vercel-repo main
echo.
echo Done! Check Vercel for new deployment.
pause
