# Push current main branch to master branch on vercel-repo
$gitPath = "C:\Program Files\Git\bin\git.exe"

Write-Host "Pushing main to master branch..." -ForegroundColor Cyan

try {
    & $gitPath push vercel-repo main:master --force
    Write-Host "✅ Successfully pushed to master branch" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
