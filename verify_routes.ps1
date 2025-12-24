# Verify all Stage 1 routes are available

Write-Host "=== VERIFYING STAGE 1 API ROUTES ===" -ForegroundColor Cyan
Write-Host ""

$spec = Invoke-RestMethod -Uri 'http://localhost:8000/openapi.json'

$requiredRoutes = @(
    "GET /projects",
    "POST /projects",
    "GET /projects/{project_id}",
    "GET /projects/{project_id}/assets",
    "POST /projects/{project_id}/assets",
    "DELETE /assets/{asset_id}",
    "GET /projects/{project_id}/analysis",
    "POST /projects/{project_id}/analysis/{kind}/run",
    "GET /projects/{project_id}/reports",
    "POST /projects/{project_id}/reports/generate"
)

Write-Host "Required routes for Stage 1:" -ForegroundColor Yellow
Write-Host ""

$allFound = $true
foreach ($route in $requiredRoutes) {
    $parts = $route -split ' '
    $method = $parts[0].ToLower()
    $path = $parts[1]

    if ($spec.paths.$path -and $spec.paths.$path.$method) {
        Write-Host "[OK] $route" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $route" -ForegroundColor Red
        $allFound = $false
    }
}

Write-Host ""
if ($allFound) {
    Write-Host "=== ALL REQUIRED ROUTES PRESENT ===" -ForegroundColor Cyan
    Write-Host "View API documentation at: http://localhost:8000/docs" -ForegroundColor White
} else {
    Write-Host "=== SOME ROUTES ARE MISSING ===" -ForegroundColor Red
}
