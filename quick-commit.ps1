$env:GIT_PAGER = 'cat'
git add -A
git commit -m "Fix: Dashboard Missing Resources KPI and sprint allocation"
git push origin main
Write-Host "Done!" -ForegroundColor Green
