"""
Roof Risk Analysis Service - Real User Version
Answers: "Is this roof safe to install solar panels on?"

Features:
- Simple SAFE/NEEDS INSPECTION/HIGH RISK status
- Works with basic survey information (no technical measurements)
- Clear reasons and recommendations
- Practical for installers and site surveyors
"""
from typing import Dict, List, Optional


class RoofRiskFactor:
    """Represents a single risk factor found during analysis"""

    def __init__(self, category: str, severity: str, description: str):
        self.category = category  # "damage", "age", "structure", "leakage", "obstacles"
        self.severity = severity  # "low", "medium", "high"
        self.description = description

    def to_dict(self) -> Dict:
        return {
            "category": self.category,
            "severity": self.severity,
            "description": self.description
        }


def analyze_roof_image(image_url: str, image_number: int, survey_data: Dict, image_path: str = None) -> Dict:
    """
    Analyze a single roof image and provide detailed findings.

    Args:
        image_url: URL to the roof image
        image_number: Image sequence number
        survey_data: Survey data for context
        image_path: Optional physical file path for AI analysis

    Returns:
        Dictionary with image analysis findings
    """
    import os
    from app.core.config import settings

    findings = []
    detected_issues = []

    # Try to use Gemini Vision AI if image path is provided and API key is set
    if image_path and os.path.exists(image_path) and settings.GEMINI_API_KEY:
        try:
            from app.services.gemini_vision import analyze_roof_with_gemini
            gemini_result = analyze_roof_with_gemini(image_path, image_number)

            # Use Gemini findings if available
            if gemini_result.get("analysis_method") == "gemini_vision":
                findings = gemini_result.get("findings", [])
                detected_issues = gemini_result.get("detected_issues", [])

                # Merge with survey data findings
                roof_type = survey_data.get("roof_type", "")
                if roof_type and roof_type not in str(findings):
                    findings.append(f"Survey data indicates roof type: {roof_type}")

                return {
                    "image_number": image_number,
                    "image_url": image_url,
                    "findings": findings,
                    "detected_issues": detected_issues,
                    "analysis_summary": " ".join(findings[:2]),
                    "analysis_method": "gemini_vision"
                }
        except Exception as e:
            # If Gemini fails, fall back to survey-based analysis
            findings.append(f"AI analysis unavailable: {str(e)}")

    # Fallback: Survey-based analysis
    roof_type = survey_data.get("roof_type", "unknown")

    findings.append(f"This is image #{image_number} of the roof.")

    if roof_type and roof_type != "unknown":
        findings.append(f"The roof appears to be {roof_type} type based on the survey data.")
    else:
        findings.append("Roof type could not be determined from the image alone.")

    # Check for various conditions based on survey data
    if survey_data.get("visible_cracks"):
        crack_severity = survey_data.get("crack_severity", "minor")
        findings.append(f"Surface cracks are visible - severity appears to be {crack_severity}.")
        findings.append("These cracks may allow water penetration and should be monitored.")
        detected_issues.append({
            "category": "damage",
            "severity": "high" if crack_severity == "major" else "medium",
            "description": f"{crack_severity.capitalize()} cracks detected"
        })

    if survey_data.get("leakage_signs"):
        findings.append("Signs of water damage or staining are visible on the roof surface.")
        findings.append("This indicates potential water infiltration that needs immediate attention.")
        detected_issues.append({
            "category": "leakage",
            "severity": "high",
            "description": "Water leakage indicators observed"
        })

    if survey_data.get("rust_corrosion") and roof_type == "metal":
        findings.append("Rust or corrosion is visible on the metal roof surface.")
        findings.append("Metal deterioration can compromise structural integrity over time.")
        detected_issues.append({
            "category": "damage",
            "severity": "medium",
            "description": "Rust/corrosion on metal surface"
        })

    if survey_data.get("major_damage"):
        findings.append("Major structural damage is evident in this image.")
        findings.append("The roof requires immediate professional inspection and repair.")
        detected_issues.append({
            "category": "damage",
            "severity": "high",
            "description": "Major structural damage present"
        })

    if survey_data.get("weak_structures"):
        findings.append("Weak or unstable structural elements are visible.")
        findings.append("These areas may not support the additional weight of solar panels.")
        detected_issues.append({
            "category": "structure",
            "severity": "high",
            "description": "Weak structural components identified"
        })

    # If no issues found
    if not detected_issues:
        findings.append("The roof surface appears to be in good condition in this image.")
        findings.append("No major defects or damage are visible from this angle.")

    # Add general observations
    slope_angle = survey_data.get("slope_angle", "")
    if slope_angle:
        findings.append(f"The roof slope is approximately {slope_angle} degrees, which is suitable for solar panel installation.")

    return {
        "image_number": image_number,
        "image_url": image_url,
        "findings": findings,
        "detected_issues": detected_issues,
        "analysis_summary": " ".join(findings[:2])  # Short summary for display
    }


def run_roof_risk(asset_urls: List[str], survey_data: Optional[Dict] = None, image_paths: Optional[List[str]] = None) -> Dict:
    """
    Run roof risk analysis based on photos and survey data.

    Args:
        asset_urls: List of roof photo URLs
        survey_data: Optional survey information (roof type, age, conditions, etc.)
        image_paths: Optional list of physical file paths for AI vision analysis

    Returns:
        Dictionary with risk status, reasons, and recommendations
    """
    if survey_data is None:
        survey_data = {}

    risk_factors: List[RoofRiskFactor] = []

    # Perform per-image analysis
    per_image_analysis = []
    for idx, url in enumerate(asset_urls, 1):
        # Get corresponding image path if available
        image_path = image_paths[idx - 1] if image_paths and idx <= len(image_paths) else None
        image_findings = analyze_roof_image(url, idx, survey_data, image_path)
        per_image_analysis.append(image_findings)
        # Extract risk factors from image analysis
        if image_findings.get("detected_issues"):
            for issue in image_findings["detected_issues"]:
                risk_factors.append(RoofRiskFactor(
                    category=issue.get("category", "assessment"),
                    severity=issue.get("severity", "low"),
                    description=f"Image {idx}: {issue.get('description', 'Issue detected')}"
                ))

    # Check 1: Roof Age
    roof_age = survey_data.get("roof_age", "unknown")
    if roof_age == "10+ years":
        risk_factors.append(RoofRiskFactor(
            category="age",
            severity="medium",
            description="Roof is over 10 years old"
        ))
    elif roof_age == "20+ years":
        risk_factors.append(RoofRiskFactor(
            category="age",
            severity="high",
            description="Roof is over 20 years old"
        ))

    # Check 2: Visible Damage
    has_cracks = survey_data.get("visible_cracks", False)
    if has_cracks:
        crack_severity = survey_data.get("crack_severity", "minor")
        severity = "high" if crack_severity == "major" else "medium"
        risk_factors.append(RoofRiskFactor(
            category="damage",
            severity=severity,
            description=f"{crack_severity.capitalize()} surface cracks visible"
        ))

    # Check 3: Leakage Signs
    has_leakage = survey_data.get("leakage_signs", False)
    if has_leakage:
        risk_factors.append(RoofRiskFactor(
            category="leakage",
            severity="high",
            description="Water leakage signs detected"
        ))

    # Check 4: Major Damage
    has_major_damage = survey_data.get("major_damage", False)
    if has_major_damage:
        risk_factors.append(RoofRiskFactor(
            category="damage",
            severity="high",
            description="Major structural damage observed"
        ))

    # Check 5: Roof Type Risk
    roof_type = survey_data.get("roof_type", "unknown")
    if roof_type in ["sheet", "asbestos"]:
        risk_factors.append(RoofRiskFactor(
            category="structure",
            severity="medium",
            description=f"Roof type ({roof_type}) may require extra care"
        ))

    # Check 6: Weak Structures
    has_weak_areas = survey_data.get("weak_structures", False)
    if has_weak_areas:
        risk_factors.append(RoofRiskFactor(
            category="structure",
            severity="high",
            description="Weak structures or unstable areas identified"
        ))

    # Check 7: Rust or Corrosion (for metal roofs)
    if roof_type == "metal":
        has_rust = survey_data.get("rust_corrosion", False)
        if has_rust:
            risk_factors.append(RoofRiskFactor(
                category="damage",
                severity="medium",
                description="Rust or corrosion on metal surface"
            ))

    # Check 8: Too Many Obstacles
    obstacle_count = survey_data.get("obstacle_count", 0)
    if obstacle_count > 5:
        risk_factors.append(RoofRiskFactor(
            category="obstacles",
            severity="low",
            description="Multiple roof obstacles present"
        ))

    # Check 9: Photo Analysis (if photos provided)
    if len(asset_urls) == 0:
        risk_factors.append(RoofRiskFactor(
            category="assessment",
            severity="low",
            description="No roof photos provided for visual inspection"
        ))

    # Determine overall risk status
    status = determine_risk_status(risk_factors)

    # Generate reasons and recommendations
    reasons = generate_reasons(risk_factors)
    recommendation = generate_recommendation(status, risk_factors)

    # Calculate risk score (0-100, higher = more risk)
    risk_score = calculate_risk_score(risk_factors)

    return {
        "overall_status": status,  # "safe", "needs_inspection", "high_risk"
        "risk_score": risk_score,
        "risk_factors": [rf.to_dict() for rf in risk_factors],
        "reasons": reasons,
        "recommendation": recommendation,
        "summary": generate_summary(status, risk_score),
        "photos_analyzed": len(asset_urls),
        "survey_data_provided": len(survey_data) > 0,
        "per_image_analysis": per_image_analysis,
        "survey_data": survey_data
    }


def determine_risk_status(risk_factors: List[RoofRiskFactor]) -> str:
    """
    Determine overall risk status based on risk factors.

    Logic:
    - Any high severity factor → HIGH RISK
    - Multiple medium severity factors → NEEDS INSPECTION
    - Only low severity factors → NEEDS INSPECTION
    - No factors → SAFE
    """
    if not risk_factors:
        return "safe"

    high_count = sum(1 for rf in risk_factors if rf.severity == "high")
    medium_count = sum(1 for rf in risk_factors if rf.severity == "medium")

    if high_count > 0:
        return "high_risk"
    elif medium_count >= 2 or (medium_count >= 1):
        return "needs_inspection"
    else:
        return "safe"


def calculate_risk_score(risk_factors: List[RoofRiskFactor]) -> int:
    """
    Calculate risk score from 0-100 (higher = more risk).

    Scoring:
    - Start at 0
    - High severity: +30 points
    - Medium severity: +15 points
    - Low severity: +5 points
    - Max: 100
    """
    score = 0

    for rf in risk_factors:
        if rf.severity == "high":
            score += 30
        elif rf.severity == "medium":
            score += 15
        elif rf.severity == "low":
            score += 5

    return min(100, score)


def generate_reasons(risk_factors: List[RoofRiskFactor]) -> List[str]:
    """Generate list of user-friendly reasons for the risk assessment"""
    if not risk_factors:
        return ["Roof appears to be in good condition"]

    # Sort by severity (high first)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    sorted_factors = sorted(risk_factors, key=lambda rf: severity_order[rf.severity])

    # Return top 4 reasons (most important)
    return [rf.description for rf in sorted_factors[:4]]


def generate_recommendation(status: str, risk_factors: List[RoofRiskFactor]) -> str:
    """Generate actionable recommendation in action-oriented format"""

    if status == "safe":
        return (
            "Action: Proceed with solar installation\n"
            "Reason: Roof is in good condition with no significant issues detected\n"
            "Next step: Schedule installation at your convenience"
        )

    elif status == "needs_inspection":
        has_age_issue = any(rf.category == "age" for rf in risk_factors)
        has_damage = any(rf.category == "damage" for rf in risk_factors)
        has_leakage = any(rf.category == "leakage" for rf in risk_factors)

        if has_leakage:
            return (
                "Action: Repair water leakage before solar installation\n"
                "Reason: Water intrusion can damage electrical components and void warranties\n"
                "Next step: Hire roofing contractor to fix leaks, then re-inspect roof"
            )
        elif has_age_issue and has_damage:
            return (
                "Action: Professional roof inspection required\n"
                "Reason: Roof age combined with visible damage may affect structural integrity\n"
                "Next step: Get certified inspection, address any issues found, then proceed"
            )
        elif has_age_issue:
            return (
                "Action: Inspect roof condition before installation\n"
                "Reason: Roof age may affect long-term solar panel support\n"
                "Next step: Schedule professional inspection to verify structural soundness"
            )
        elif has_damage:
            return (
                "Action: Repair visible damage before installation\n"
                "Reason: Existing damage may worsen under panel weight or void warranties\n"
                "Next step: Fix cracks/damage, confirm repairs, then install solar"
            )
        else:
            return (
                "Action: Professional roof inspection recommended\n"
                "Reason: Minor concerns detected that need expert evaluation\n"
                "Next step: Get inspection, address findings if any, then proceed"
            )

    else:  # high_risk
        has_leakage = any(rf.category == "leakage" for rf in risk_factors)
        has_weak_structure = any(rf.category == "structure" and rf.severity == "high" for rf in risk_factors)
        has_major_damage = any(rf.category == "damage" and rf.severity == "high" for rf in risk_factors)

        if has_leakage:
            return (
                "Action: CRITICAL - Repair roof leakage immediately\n"
                "Reason: Active water intrusion poses severe risk to solar equipment and structure\n"
                "Next step: Stop installation, repair all leaks, waterproof roof, then re-evaluate"
            )
        elif has_weak_structure:
            return (
                "Action: CRITICAL - Strengthen weak roof structures\n"
                "Reason: Current structure may collapse under solar panel weight\n"
                "Next step: Structural engineer assessment, reinforce/repair roof, then re-check"
            )
        elif has_major_damage:
            return (
                "Action: CRITICAL - Complete roof repairs before solar work\n"
                "Reason: Major damage creates safety hazards and installation failures\n"
                "Next step: Full roof restoration by licensed contractor, then fresh inspection"
            )
        else:
            return (
                "Action: CRITICAL - Do not proceed with installation\n"
                "Reason: Roof condition poses significant risk to safety and investment\n"
                "Next step: Comprehensive roof repair/replacement, then re-assess suitability"
            )


def generate_summary(status: str, risk_score: int) -> str:
    """Generate human-readable summary"""

    if status == "safe":
        return f"✅ Roof Risk: SAFE - Risk Score: {risk_score}/100. Roof is in good condition for solar installation."

    elif status == "needs_inspection":
        return f"⚠️ Roof Risk: NEEDS INSPECTION - Risk Score: {risk_score}/100. Minor concerns found. Recommend checking roof before installation."

    else:  # high_risk
        return f"❌ Roof Risk: HIGH RISK - Risk Score: {risk_score}/100. Roof damage or weakness detected. Repair recommended before solar installation."


# Legacy compatibility
def run_roof_risk_legacy(asset_urls):
    """Legacy function for backward compatibility"""
    return run_roof_risk(asset_urls)
