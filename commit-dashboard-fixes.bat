@echo off
echo Committing Dashboard fixes...
git add -A
git commit -m "Fix: Dashboard Missing Resources KPI and sprint allocation"
git push origin main
echo Done!
pause
