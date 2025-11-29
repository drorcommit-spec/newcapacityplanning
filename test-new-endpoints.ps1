# Test script for new API endpoints

$API_URL = "http://localhost:3002/api"

Write-Host "🧪 Testing New API Endpoints" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get current data
Write-Host "1️⃣ Testing GET /api/data..." -ForegroundColor Yellow
try {
    $data = Invoke-RestMethod -Uri "$API_URL/data" -Method Get
    Write-Host "✅ GET /api/data successful" -ForegroundColor Green
    Write-Host "   - Sprint Projects: $($data.sprintProjects.PSObject.Properties.Count) entries" -ForegroundColor Gray
    Write-Host "   - Sprint Role Requirements: $($data.sprintRoleRequirements.PSObject.Properties.Count) entries" -ForegroundColor Gray
    Write-Host "   - Resource Roles: $($data.resourceRoles.Count) roles" -ForegroundColor Gray
} catch {
    Write-Host "❌ GET /api/data failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Save sprint projects
Write-Host "2️⃣ Testing POST /api/sprintProjects..." -ForegroundColor Yellow
try {
    $testSprintProjects = @{
        "test-2025-12-1" = @("project-1", "project-2")
    }
    $body = $testSprintProjects | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$API_URL/sprintProjects" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ POST /api/sprintProjects successful" -ForegroundColor Green
} catch {
    Write-Host "❌ POST /api/sprintProjects failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Save sprint role requirements
Write-Host "3️⃣ Testing POST /api/sprintRoleRequirements..." -ForegroundColor Yellow
try {
    $testRoleRequirements = @{
        "project-1-2025-12-1" = @{
            "Product Manager" = 50
            "PMO" = 30
        }
    }
    $body = $testRoleRequirements | ConvertTo-Json -Depth 3
    $result = Invoke-RestMethod -Uri "$API_URL/sprintRoleRequirements" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ POST /api/sprintRoleRequirements successful" -ForegroundColor Green
} catch {
    Write-Host "❌ POST /api/sprintRoleRequirements failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 4: Save resource roles
Write-Host "4️⃣ Testing POST /api/resourceRoles..." -ForegroundColor Yellow
try {
    $testRoles = @(
        @{
            id = "test-1"
            name = "Test Role"
            isArchived = $false
            createdAt = (Get-Date).ToString("o")
        }
    )
    $body = $testRoles | ConvertTo-Json -Depth 2
    $result = Invoke-RestMethod -Uri "$API_URL/resourceRoles" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ POST /api/resourceRoles successful" -ForegroundColor Green
} catch {
    Write-Host "❌ POST /api/resourceRoles failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 5: Verify data was saved
Write-Host "5️⃣ Verifying data was saved..." -ForegroundColor Yellow
try {
    $data = Invoke-RestMethod -Uri "$API_URL/data" -Method Get
    
    $sprintProjectsCount = $data.sprintProjects.PSObject.Properties.Count
    $roleRequirementsCount = $data.sprintRoleRequirements.PSObject.Properties.Count
    $resourceRolesCount = $data.resourceRoles.Count
    
    Write-Host "✅ Data verification successful" -ForegroundColor Green
    Write-Host "   - Sprint Projects: $sprintProjectsCount entries" -ForegroundColor Gray
    Write-Host "   - Sprint Role Requirements: $roleRequirementsCount entries" -ForegroundColor Gray
    Write-Host "   - Resource Roles: $resourceRolesCount roles" -ForegroundColor Gray
} catch {
    Write-Host "❌ Data verification failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 All tests completed!" -ForegroundColor Cyan
