#!/usr/bin/env python3
"""
Test script for Stage 1 backend endpoints
"""
import json

def test_endpoints():
    """
    Manual test commands using curl (run these in PowerShell or Git Bash)
    """

    print("=" * 80)
    print("STAGE 1 BACKEND API - TEST COMMANDS")
    print("=" * 80)
    print()

    print("1. CREATE A PROJECT")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"name\":\"Test Solar Project\",\"address\":\"123 Main St\"}'"
""")

    print("2. LIST ALL PROJECTS")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects' -Method GET"
""")

    print("3. GET PROJECT BY ID (replace {id} with actual project ID)")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1' -Method GET"
""")

    print("4. CREATE AN ASSET (replace {project_id} with actual ID)")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/assets' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"kind\":\"photo\",\"filename\":\"roof_photo.jpg\",\"storage_url\":\"https://example.com/photo.jpg\",\"content_type\":\"image/jpeg\",\"meta\":{\"camera\":\"iPhone 13\"}}'"
""")

    print("5. LIST ASSETS FOR PROJECT")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/assets' -Method GET"
""")

    print("6. DELETE AN ASSET (replace {asset_id} with actual ID)")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/assets/1' -Method DELETE"
""")

    print("7. RUN SHADING ANALYSIS")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/analysis/shading/run' -Method POST"
""")

    print("8. RUN COMPLIANCE ANALYSIS")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/analysis/compliance/run' -Method POST"
""")

    print("9. LIST ALL ANALYSIS RESULTS")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/analysis' -Method GET"
""")

    print("10. GENERATE REPORT")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/reports/generate' -Method POST"
""")

    print("11. LIST ALL REPORTS")
    print("-" * 80)
    print("""
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:8000/projects/1/reports' -Method GET"
""")

    print("12. VIEW API DOCUMENTATION")
    print("-" * 80)
    print("""
Open in browser: http://localhost:8000/docs
""")

    print()
    print("=" * 80)
    print("AUTOMATED TEST SEQUENCE")
    print("=" * 80)
    print("""
# Complete test flow:
# 1. Create project
# 2. Add assets
# 3. Run all 4 types of analysis
# 4. Generate report
# 5. Verify all data

# Copy and run this entire block in PowerShell:

$project = Invoke-RestMethod -Uri 'http://localhost:8000/projects' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"name\":\"Full Test Project\",\"address\":\"456 Solar Ave\"}'
Write-Host "Created project ID: $($project.id)"

$asset1 = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/assets\" -Method POST -Headers @{'Content-Type'='application/json'} -Body '{\"kind\":\"photo\",\"filename\":\"test.jpg\",\"storage_url\":\"https://example.com/test.jpg\",\"meta\":{}}'
Write-Host "Created asset ID: $($asset1.id)"

$shading = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/analysis/shading/run\" -Method POST
Write-Host "Started shading analysis ID: $($shading.id)"

$compliance = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/analysis/compliance/run\" -Method POST
Write-Host "Started compliance analysis ID: $($compliance.id)"

$roof_risk = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/analysis/roof_risk/run\" -Method POST
Write-Host "Started roof_risk analysis ID: $($roof_risk.id)"

$electrical = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/analysis/electrical/run\" -Method POST
Write-Host "Started electrical analysis ID: $($electrical.id)"

$report = Invoke-RestMethod -Uri \"http://localhost:8000/projects/$($project.id)/reports/generate\" -Method POST
Write-Host "Generated report ID: $($report.id)"

Write-Host \"\\nAll tests completed successfully!\"
Write-Host \"Project ID: $($project.id)\"
Write-Host \"View at: http://localhost:3000/projects/$($project.id)\"
""")

if __name__ == "__main__":
    test_endpoints()
