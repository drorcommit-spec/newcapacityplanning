@echo off
echo.
echo ========================================
echo Committing and Pushing Changes
echo ========================================
echo.

"C:\Program Files\Git\bin\git.exe" add .
echo Files staged...

"C:\Program Files\Git\bin\git.exe" commit -m "Add capacity warnings and allocation sorting features"
echo Committed...

"C:\Program Files\Git\bin\git.exe" push vercel-repo main
echo Pushed to vercel-repo...

"C:\Program Files\Git\bin\git.exe" push origin main
echo Pushed to origin...

echo.
echo ========================================
echo Done! Changes pushed to GitHub
echo ========================================
echo.
pause
