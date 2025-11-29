# Push code to GitHub
Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host "`nAdding all changes..." -ForegroundColor Cyan
git add .

Write-Host "`nCommitting changes..." -ForegroundColor Cyan
git commit -m "Add chatbot assistant, improve filters, add uniqueness validations, and UI enhancements

- Added AI chatbot assistant with rule-based natural language processing
- Created comprehensive chatbot user guide
- Improved filter labels and tooltips for better UX
- Made capacity thresholds editable in Dashboard and Capacity Planning
- Added 'Show my Managed Projects' filter
- Removed Max Capacity field from project forms
- Updated PMO Contact dropdown to show all active members (PMO first, then others)
- Minimized filter area for more swimlane space
- Added uniqueness validations for emails, projects, resource types, and teams
- Fixed resource type sync between RoleManagement and TeamManagement
- Updated terminology from 'Role' to 'Resource' throughout
- Added Select All/Deselect All to resource filter dropdown"

Write-Host "`nChecking remote..." -ForegroundColor Cyan
$remotes = git remote -v
if ($remotes -notmatch "origin") {
    Write-Host "Adding remote origin..." -ForegroundColor Yellow
    git remote add origin https://github.com/drorcommit-spec/newcapacityplanning.git
}

Write-Host "`nSetting branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host "`nDone! Code pushed to GitHub." -ForegroundColor Green
