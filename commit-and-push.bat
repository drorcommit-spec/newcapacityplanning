@echo off
echo === Checking Git Status ===
git status
echo.
echo === Adding all changes ===
git add .
echo.
echo === Creating commit ===
git commit -m "Add manager filter to members page - shows only actual managers"
echo.
echo === Pushing to GitHub ===
git push origin main
echo.
echo Done!
pause
