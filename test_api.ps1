# Stage 1 Backend API Test Script

Write-Host "=== STAGE 1 BACKEND API TESTS ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Create Project
Write-Host "1. Creating project..." -ForegroundColor Yellow
$projectBody = @{
    name = "Full Test Project"
    address = "456 Solar Ave"
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri 'http://localhost:8000/projects' -Method POST -Headers @{'Content-Type'='application/json'} -Body $projectBody
Write-Host "   Created project ID: $($project.id)" -ForegroundColor Green
$projectId = $project.id

# Test 2: Get Project
Write-Host "2. Getting project details..." -ForegroundColor Yellow
$projectDetails = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId" -Method GET
Write-Host "   Project name: $($projectDetails.name)" -ForegroundColor Green

# Test 3: Create Asset
Write-Host "3. Creating asset..." -ForegroundColor Yellow
$assetBody = @{
    kind = "photo"
    filename = "test_roof.jpg"
    storage_url = "https://example.com/test_roof.jpg"
    content_type = "image/jpeg"
    meta = @{
        camera = "iPhone 13"
        location = "rooftop"
    }
} | ConvertTo-Json

$asset = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/assets" -Method POST -Headers @{'Content-Type'='application/json'} -Body $assetBody
Write-Host "   Created asset ID: $($asset.id)" -ForegroundColor Green

# Test 4: List Assets
Write-Host "4. Listing assets..." -ForegroundColor Yellow
$assets = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/assets" -Method GET
Write-Host "   Found $($assets.Count) asset(s)" -ForegroundColor Green

# Test 5: Run Shading Analysis
Write-Host "5. Running shading analysis..." -ForegroundColor Yellow
$shadingAnalysis = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/analysis/shading/run" -Method POST
Write-Host "   Analysis ID: $($shadingAnalysis.id), Status: $($shadingAnalysis.status)" -ForegroundColor Green

# Test 6: Run Compliance Analysis
Write-Host "6. Running compliance analysis..." -ForegroundColor Yellow
$complianceAnalysis = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/analysis/compliance/run" -Method POST
Write-Host "   Analysis ID: $($complianceAnalysis.id), Status: $($complianceAnalysis.status)" -ForegroundColor Green

# Test 7: Run Roof Risk Analysis
Write-Host "7. Running roof_risk analysis..." -ForegroundColor Yellow
$roofRiskAnalysis = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/analysis/roof_risk/run" -Method POST
Write-Host "   Analysis ID: $($roofRiskAnalysis.id), Status: $($roofRiskAnalysis.status)" -ForegroundColor Green

# Test 8: Run Electrical Analysis
Write-Host "8. Running electrical analysis..." -ForegroundColor Yellow
$electricalAnalysis = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/analysis/electrical/run" -Method POST
Write-Host "   Analysis ID: $($electricalAnalysis.id), Status: $($electricalAnalysis.status)" -ForegroundColor Green

# Test 9: List Analysis Results
Write-Host "9. Listing all analysis results..." -ForegroundColor Yellow
$analysisResults = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/analysis" -Method GET
Write-Host "   Found $($analysisResults.Count) analysis result(s)" -ForegroundColor Green

# Test 10: Generate Report
Write-Host "10. Generating report..." -ForegroundColor Yellow
$report = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/reports/generate" -Method POST
Write-Host "   Report ID: $($report.id), Status: $($report.status)" -ForegroundColor Green

# Test 11: List Reports
Write-Host "11. Listing all reports..." -ForegroundColor Yellow
$reports = Invoke-RestMethod -Uri "http://localhost:8000/projects/$projectId/reports" -Method GET
Write-Host "   Found $($reports.Count) report(s)" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL TESTS COMPLETED SUCCESSFULLY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project ID: $projectId" -ForegroundColor White
Write-Host "View in frontend: http://localhost:3000/projects/$projectId" -ForegroundColor White
Write-Host "View API docs: http://localhost:8000/docs" -ForegroundColor White
