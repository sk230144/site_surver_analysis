"""
Compliance Check Service - Formula-Based Rules Engine
Real-user ready compliance analysis for solar installations.

Features:
- Edge setback validation
- Roof coverage limits
- Fire pathway requirements
- Physical sanity checks
- Clear pass/warning/fail status
- Actionable fix suggestions
"""
from typing import Dict, List, Optional, Tuple
from shapely import wkt
from shapely.geometry import Polygon
import math


# Default panel dimensions (in meters)
DEFAULT_PANEL_WIDTH = 1.0  # meters
DEFAULT_PANEL_HEIGHT = 1.7  # meters
DEFAULT_PANEL_AREA = DEFAULT_PANEL_WIDTH * DEFAULT_PANEL_HEIGHT  # 1.7 m²

# Packing factor for physical panel fit calculation
PACKING_FACTOR = 0.75  # 75% efficient packing


class ComplianceRuleset:
    """Default compliance ruleset with configurable thresholds"""

    def __init__(self):
        # Edge setback requirements
        self.edge_setback_m = 0.9  # meters from roof edge

        # Roof coverage limits
        self.max_roof_coverage_ratio = 0.75  # 75% max coverage

        # Fire pathway requirements
        self.fire_pathway_min_width_m = 0.9  # meters
        self.fire_pathway_max_coverage_ratio = 0.80  # 80% triggers fire pathway warning

        # Panel specifications
        self.panel_width_m = DEFAULT_PANEL_WIDTH
        self.panel_height_m = DEFAULT_PANEL_HEIGHT
        self.panel_area_m2 = DEFAULT_PANEL_AREA


class ComplianceViolation:
    """Represents a single compliance rule violation"""

    def __init__(self, rule_id: str, rule_name: str, severity: str,
                 message: str, fix_suggestion: str, affected_plane: Optional[str] = None):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.severity = severity  # "high", "medium", "low"
        self.message = message
        self.fix_suggestion = fix_suggestion
        self.affected_plane = affected_plane

    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "severity": self.severity,
            "message": self.message,
            "fix_suggestion": self.fix_suggestion,
            "affected_plane": self.affected_plane
        }


def run_compliance_analysis(roof_planes: List[Dict], layouts: List[Dict],
                           ruleset: Optional[ComplianceRuleset] = None) -> Dict:
    """
    Run comprehensive compliance check on solar installation design.

    Args:
        roof_planes: List of roof plane dictionaries
        layouts: List of panel layout dictionaries
        ruleset: Optional custom ruleset (uses default if not provided)

    Returns:
        Dictionary with compliance results including status, score, and violations
    """
    if ruleset is None:
        ruleset = ComplianceRuleset()

    violations: List[ComplianceViolation] = []

    # Create mapping of roof planes to layouts
    plane_layouts = {}
    for layout in layouts:
        plane_id = layout.get("roof_plane_id")
        if plane_id not in plane_layouts:
            plane_layouts[plane_id] = []
        plane_layouts[plane_id].append(layout)

    # Check each roof plane with its layouts
    for plane in roof_planes:
        plane_id = plane.get("id")
        plane_name = plane.get("name", f"Roof Plane {plane_id}")
        plane_polygon_wkt = plane.get("polygon_wkt")

        if not plane_polygon_wkt:
            continue

        # Get layouts for this plane
        plane_layout_list = plane_layouts.get(plane_id, [])

        if not plane_layout_list:
            # No layout on this plane - skip
            continue

        # Parse roof geometry
        try:
            roof_geom = wkt.loads(plane_polygon_wkt)
            roof_area = roof_geom.area
        except Exception:
            continue

        # Analyze each layout on this plane
        for layout in plane_layout_list:
            layout_violations = check_layout_compliance(
                plane, layout, roof_area, ruleset, plane_name
            )
            violations.extend(layout_violations)

    # Calculate compliance score
    score = calculate_compliance_score(violations)

    # Determine overall status
    status = determine_compliance_status(violations)

    # Check if we actually checked any layouts
    checked_planes = len([p for p in roof_planes if p.get("id") in plane_layouts])

    # Build result
    result = {
        "overall_status": status,  # "pass", "warning", "fail"
        "compliance_score": score,  # 0-100
        "total_violations": len(violations),
        "violations": [v.to_dict() for v in violations],
        "summary": generate_summary(status, score, violations, checked_planes),
        "checked_planes": checked_planes,
        "total_planes": len(roof_planes)
    }

    return result


def check_layout_compliance(plane: Dict, layout: Dict, roof_area: float,
                            ruleset: ComplianceRuleset, plane_name: str) -> List[ComplianceViolation]:
    """Check a single layout for compliance violations"""
    violations = []

    # Extract layout parameters
    panel_count = layout.get("panel_count", 0)
    offset_from_edge = layout.get("offset_from_edge_m", 0.0)

    # RULE 1: Edge Setback Check
    if offset_from_edge < ruleset.edge_setback_m:
        violations.append(ComplianceViolation(
            rule_id="EDGE_SETBACK",
            rule_name="Edge Setback Requirement",
            severity="high",
            message=f"Panels are {offset_from_edge}m from edge (minimum: {ruleset.edge_setback_m}m)",
            fix_suggestion=f"Increase offset_from_edge to {ruleset.edge_setback_m}m or greater",
            affected_plane=plane_name
        ))

    # RULE 2: Roof Coverage Limit
    panel_total_area = panel_count * ruleset.panel_area_m2
    coverage_ratio = panel_total_area / roof_area if roof_area > 0 else 0

    if coverage_ratio > ruleset.max_roof_coverage_ratio:
        violations.append(ComplianceViolation(
            rule_id="ROOF_COVERAGE",
            rule_name="Maximum Roof Coverage",
            severity="high",
            message=f"Roof coverage is {coverage_ratio*100:.1f}% (maximum: {ruleset.max_roof_coverage_ratio*100:.0f}%)",
            fix_suggestion=f"Reduce panel count to {int(roof_area * ruleset.max_roof_coverage_ratio / ruleset.panel_area_m2)} or fewer panels",
            affected_plane=plane_name
        ))

    # RULE 3: Fire Pathway Check (Heuristic)
    if coverage_ratio > ruleset.fire_pathway_max_coverage_ratio:
        violations.append(ComplianceViolation(
            rule_id="FIRE_PATHWAY_COVERAGE",
            rule_name="Fire Pathway Clearance",
            severity="medium",
            message=f"High roof coverage ({coverage_ratio*100:.1f}%) may restrict fire access pathways",
            fix_suggestion="Reduce panel coverage or ensure clear pathways for emergency access",
            affected_plane=plane_name
        ))

    if offset_from_edge < ruleset.fire_pathway_min_width_m:
        violations.append(ComplianceViolation(
            rule_id="FIRE_PATHWAY_WIDTH",
            rule_name="Fire Pathway Width",
            severity="medium",
            message=f"Edge clearance ({offset_from_edge}m) may not provide adequate fire pathway",
            fix_suggestion=f"Increase edge offset to {ruleset.fire_pathway_min_width_m}m for fire safety",
            affected_plane=plane_name
        ))

    # RULE 4: Impossible Panel Count (Sanity Check)
    max_possible_panels = math.floor((roof_area / ruleset.panel_area_m2) * PACKING_FACTOR)

    if panel_count > max_possible_panels:
        violations.append(ComplianceViolation(
            rule_id="PANEL_FIT",
            rule_name="Physical Panel Fit",
            severity="high",
            message=f"{panel_count} panels cannot physically fit on {roof_area:.1f}m² roof (max ~{max_possible_panels} panels)",
            fix_suggestion=f"Reduce panel count to {max_possible_panels} or fewer, or use a larger roof plane",
            affected_plane=plane_name
        ))

    return violations


def calculate_compliance_score(violations: List[ComplianceViolation]) -> int:
    """
    Calculate compliance score from 0-100 based on violations.

    Scoring:
    - Start at 100
    - High severity: -25 points
    - Medium severity: -10 points
    - Low severity: -5 points
    - Minimum score: 0
    """
    score = 100

    for violation in violations:
        if violation.severity == "high":
            score -= 25
        elif violation.severity == "medium":
            score -= 10
        elif violation.severity == "low":
            score -= 5

    return max(0, score)


def determine_compliance_status(violations: List[ComplianceViolation]) -> str:
    """
    Determine overall compliance status.

    Logic:
    - Any high severity violation → FAIL
    - Any medium severity violation → WARNING
    - No violations → PASS
    """
    has_high = any(v.severity == "high" for v in violations)
    has_medium = any(v.severity == "medium" for v in violations)

    if has_high:
        return "fail"
    elif has_medium:
        return "warning"
    else:
        return "pass"


def generate_summary(status: str, score: int, violations: List[ComplianceViolation], checked_planes: int = 0) -> str:
    """Generate human-readable summary of compliance check"""

    # No layouts case
    if checked_planes == 0:
        return "ℹ️ No panel layouts found. Please create panel layouts first, then run compliance check to verify your design is safe and allowed."

    if status == "pass":
        return f"✅ Compliance Check PASSED - Score: {score}/100. Design meets all requirements and is ready for permitting."

    elif status == "warning":
        warning_count = len([v for v in violations if v.severity == "medium"])
        return f"⚠️ Compliance Check WARNING - Score: {score}/100. Design has {warning_count} warning(s) that should be addressed before permitting."

    else:  # fail
        high_count = len([v for v in violations if v.severity == "high"])
        return f"❌ Compliance Check FAILED - Score: {score}/100. Design has {high_count} critical violation(s) that must be fixed before permitting."


# Legacy compatibility function
def run_compliance_check(layout_data, ruleset):
    """Legacy function for backward compatibility"""
    return []
