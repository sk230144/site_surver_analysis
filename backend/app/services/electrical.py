"""
Electrical Analysis Service for Solar Panel Installation
Determines if electrical panel can safely support planned solar system
Uses NEC 120% backfeed rule and comprehensive safety checks
"""
from typing import Dict, List, Optional
import math


def round_up_to_standard_breaker(amps: float) -> int:
    """Round up to nearest standard breaker size"""
    standard_sizes = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 200]
    for size in standard_sizes:
        if amps <= size:
            return size
    return 200  # Maximum standard size


def calculate_solar_breaker_size(system_size_kw: float, voltage: float, phase_type: str = "single") -> Dict:
    """
    Calculate required solar breaker size from system capacity.

    Args:
        system_size_kw: Solar system size in kilowatts
        voltage: System voltage (230V or 400V typically)
        phase_type: "single" or "three" phase

    Returns:
        Dictionary with current calculations and breaker size
    """
    system_watts = system_size_kw * 1000

    # Calculate current based on phase type
    if phase_type == "three":
        # Three-phase: I = P / (V * √3)
        current_amps = system_watts / (voltage * math.sqrt(3))
    else:
        # Single-phase: I = P / V
        current_amps = system_watts / voltage

    # Apply NEC 1.25x safety factor (continuous load)
    required_amps = current_amps * 1.25

    # Round up to standard breaker size
    solar_breaker_a = round_up_to_standard_breaker(required_amps)

    return {
        "system_watts": system_watts,
        "calculated_current_a": round(current_amps, 2),
        "required_current_with_safety_a": round(required_amps, 2),
        "solar_breaker_a": solar_breaker_a
    }


def run_electrical_analysis(electrical_data: Dict, image_paths: Optional[List[str]] = None) -> Dict:
    """
    Run comprehensive electrical analysis for solar installation.

    Performs 5 critical checks:
    1. Panel Capacity (120% backfeed rule)
    2. Panel Age and Condition
    3. Panel Physical Condition
    4. Wiring Condition
    5. System Size vs Panel Rating

    Args:
        electrical_data: Dictionary with panel info and system specs
        image_paths: Optional list of panel image file paths

    Returns:
        Complete analysis result with status, score, checks, and recommendations
    """

    # =====================
    # 1. EXTRACT INPUTS
    # =====================

    system_size_kw = float(electrical_data.get("system_size_kw", 0))
    main_panel_a = float(electrical_data.get("main_panel_rating_a", 0))
    main_breaker_a = float(electrical_data.get("main_breaker_rating_a", 0)) if electrical_data.get("main_breaker_rating_a") else main_panel_a
    phase_type = electrical_data.get("phase_type", "single")
    panel_age = electrical_data.get("panel_age", "unknown")
    voltage = float(electrical_data.get("voltage", 230))
    panel_condition = electrical_data.get("panel_condition", "good")
    wiring_condition = electrical_data.get("wiring_condition", "good")

    # =====================
    # 2. CALCULATE SOLAR BREAKER SIZE
    # =====================

    solar_calc = calculate_solar_breaker_size(system_size_kw, voltage, phase_type)
    solar_breaker_a = solar_calc["solar_breaker_a"]
    calculated_current = solar_calc["calculated_current_a"]

    # =====================
    # 3. APPLY 120% BACKFEED RULE (NEC 705.12(D)(2))
    # =====================

    # Maximum safe capacity is 120% of panel rating
    backfeed_limit_a = main_panel_a * 1.20

    # Required capacity is main breaker + solar breaker
    required_capacity_a = main_breaker_a + solar_breaker_a

    # Calculate margin (positive = OK, negative = FAIL)
    capacity_margin = backfeed_limit_a - required_capacity_a
    capacity_utilization = (required_capacity_a / backfeed_limit_a) * 100

    # =====================
    # 4. RUN 5 COMPREHENSIVE CHECKS
    # =====================

    checks = []
    total_score = 0
    max_score = 500  # 5 checks * 100 points each

    # CHECK 1: Panel Capacity (120% Rule) - CRITICAL
    capacity_pass = capacity_margin >= 0
    capacity_status = "pass" if capacity_pass else "fail"
    capacity_points = 100 if capacity_pass else 0

    if capacity_utilization < 80:
        capacity_severity = "low"
        capacity_message = f"✓ Panel has excellent capacity margin ({capacity_margin:.0f}A available)"
    elif capacity_utilization < 100:
        capacity_severity = "medium"
        capacity_message = f"⚠ Panel capacity is tight but acceptable ({capacity_margin:.0f}A margin)"
    else:
        capacity_severity = "high"
        capacity_message = f"✗ Panel capacity exceeded by {abs(capacity_margin):.0f}A - UNSAFE"

    checks.append({
        "name": "Panel Capacity (120% Rule)",
        "status": capacity_status,
        "severity": capacity_severity,
        "message": capacity_message,
        "details": {
            "main_panel_rating": f"{main_panel_a:.0f}A",
            "backfeed_limit": f"{backfeed_limit_a:.0f}A (120% of panel)",
            "main_breaker": f"{main_breaker_a:.0f}A",
            "solar_breaker": f"{solar_breaker_a}A",
            "total_required": f"{required_capacity_a}A",
            "margin": f"{capacity_margin:.0f}A",
            "utilization": f"{capacity_utilization:.1f}%"
        }
    })
    total_score += capacity_points

    # CHECK 2: Panel Age and Condition
    age_pass = True
    age_status = "pass"
    age_severity = "low"
    age_points = 100

    if panel_age == "over_30_years":
        age_pass = False
        age_status = "fail"
        age_severity = "high"
        age_message = "✗ Panel is over 30 years old - replacement recommended before solar installation"
        age_points = 0
    elif panel_age == "20_30_years":
        age_status = "warning"
        age_severity = "medium"
        age_message = "⚠ Panel is 20-30 years old - inspection by electrician recommended"
        age_points = 60
    elif panel_age == "10_20_years":
        age_message = "✓ Panel age is acceptable (10-20 years)"
        age_points = 80
    elif panel_age == "under_10_years":
        age_message = "✓ Panel is relatively new (under 10 years)"
        age_points = 100
    else:
        age_status = "warning"
        age_severity = "medium"
        age_message = "⚠ Panel age unknown - inspection recommended"
        age_points = 70

    checks.append({
        "name": "Panel Age Assessment",
        "status": age_status,
        "severity": age_severity,
        "message": age_message,
        "details": {
            "panel_age": panel_age.replace("_", " ").title()
        }
    })
    total_score += age_points

    # CHECK 3: Panel Physical Condition
    condition_pass = True
    condition_status = "pass"
    condition_severity = "low"
    condition_points = 100

    if panel_condition == "poor":
        condition_pass = False
        condition_status = "fail"
        condition_severity = "high"
        condition_message = "✗ Panel in poor condition - repair/replacement required before solar"
        condition_points = 0
    elif panel_condition == "fair":
        condition_status = "warning"
        condition_severity = "medium"
        condition_message = "⚠ Panel condition is fair - electrician inspection recommended"
        condition_points = 60
    else:  # good or excellent
        condition_message = "✓ Panel physical condition is good"
        condition_points = 100

    checks.append({
        "name": "Panel Physical Condition",
        "status": condition_status,
        "severity": condition_severity,
        "message": condition_message,
        "details": {
            "condition": panel_condition.title()
        }
    })
    total_score += condition_points

    # CHECK 4: Wiring Condition
    wiring_pass = True
    wiring_status = "pass"
    wiring_severity = "low"
    wiring_points = 100

    if wiring_condition == "poor":
        wiring_pass = False
        wiring_status = "fail"
        wiring_severity = "high"
        wiring_message = "✗ Wiring in poor condition - rewiring required before solar installation"
        wiring_points = 0
    elif wiring_condition == "fair":
        wiring_status = "warning"
        wiring_severity = "medium"
        wiring_message = "⚠ Wiring condition is fair - inspection and possible upgrades recommended"
        wiring_points = 60
    else:  # good or excellent
        wiring_message = "✓ Wiring condition is acceptable for solar installation"
        wiring_points = 100

    checks.append({
        "name": "Wiring Condition",
        "status": wiring_status,
        "severity": wiring_severity,
        "message": wiring_message,
        "details": {
            "condition": wiring_condition.title()
        }
    })
    total_score += wiring_points

    # CHECK 5: System Size vs Panel Rating (proportionality check)
    # Large systems on small panels can be problematic
    size_ratio = (solar_breaker_a / main_panel_a) * 100
    size_pass = True
    size_status = "pass"
    size_severity = "low"
    size_points = 100

    if size_ratio > 50:
        size_status = "warning"
        size_severity = "medium"
        size_message = f"⚠ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - consider panel upgrade"
        size_points = 70
    elif size_ratio > 30:
        size_message = f"✓ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - acceptable"
        size_points = 90
    else:
        size_message = f"✓ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - well proportioned"
        size_points = 100

    checks.append({
        "name": "System Size Proportionality",
        "status": size_status,
        "severity": size_severity,
        "message": size_message,
        "details": {
            "solar_breaker": f"{solar_breaker_a}A",
            "panel_rating": f"{main_panel_a:.0f}A",
            "ratio": f"{size_ratio:.1f}%"
        }
    })
    total_score += size_points

    # =====================
    # 5. CALCULATE FINAL SCORE (0-100)
    # =====================

    final_score = int((total_score / max_score) * 100)

    # =====================
    # 6. DETERMINE OVERALL STATUS
    # =====================

    # Check for any FAIL status in critical checks
    has_critical_failure = not capacity_pass or not condition_pass or not wiring_pass or not age_pass
    has_warnings = any(c["status"] == "warning" for c in checks)

    if has_critical_failure:
        overall_status = "fail"
    elif has_warnings or final_score < 80:
        overall_status = "warning"
    else:
        overall_status = "ok"

    # =====================
    # 7. GENERATE ACTION-ORIENTED RECOMMENDATIONS
    # =====================

    recommendations = []

    if overall_status == "ok":
        recommendations.append({
            "priority": "low",
            "action": "Action: Proceed with solar installation",
            "reason": "Reason: Panel meets all safety requirements and has adequate capacity",
            "next_step": f"Next step: Install {solar_breaker_a}A solar breaker and proceed with interconnection"
        })

    elif overall_status == "warning":
        if not capacity_pass:
            recommendations.append({
                "priority": "high",
                "action": f"Action: STOP - Panel capacity insufficient ({abs(capacity_margin):.0f}A over limit)",
                "reason": "Reason: Exceeds NEC 120% backfeed rule - fire and safety hazard",
                "next_step": "Next step: Upgrade to larger panel OR reduce system size"
            })
        elif capacity_utilization > 90:
            recommendations.append({
                "priority": "medium",
                "action": f"Action: Consider panel upgrade (only {capacity_margin:.0f}A margin remaining)",
                "reason": "Reason: Tight capacity leaves no room for future expansion",
                "next_step": "Next step: Evaluate cost of panel upgrade vs system size reduction"
            })

        if age_status == "warning":
            recommendations.append({
                "priority": "medium",
                "action": "Action: Schedule electrical inspection before installation",
                "reason": f"Reason: Panel age ({panel_age.replace('_', ' ')}) requires verification",
                "next_step": "Next step: Hire licensed electrician to inspect panel and wiring"
            })

        if wiring_status == "warning":
            recommendations.append({
                "priority": "medium",
                "action": "Action: Inspect and possibly upgrade wiring",
                "reason": "Reason: Fair wiring condition may not handle additional solar load safely",
                "next_step": "Next step: Have electrician assess wire gauge and connection quality"
            })

        if size_ratio > 50:
            recommendations.append({
                "priority": "medium",
                "action": f"Action: Consider panel upgrade for {system_size_kw}kW system",
                "reason": f"Reason: Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel capacity",
                "next_step": "Next step: Evaluate upgrading to 200A or larger panel"
            })

    else:  # fail
        if not capacity_pass:
            recommendations.append({
                "priority": "critical",
                "action": f"Action: CRITICAL - Panel capacity exceeded by {abs(capacity_margin):.0f}A",
                "reason": "Reason: Violates NEC 120% rule - installation would be unsafe and illegal",
                "next_step": f"Next step: Upgrade panel to {int(required_capacity_a / 1.2) + 50}A+ OR reduce system to {int((backfeed_limit_a - main_breaker_a) / 1.25 * voltage / 1000)}kW"
            })

        if panel_condition == "poor":
            recommendations.append({
                "priority": "critical",
                "action": "Action: CRITICAL - Replace electrical panel before solar installation",
                "reason": "Reason: Poor panel condition poses immediate safety risk",
                "next_step": "Next step: Hire licensed electrician to replace panel, then re-evaluate solar"
            })

        if wiring_condition == "poor":
            recommendations.append({
                "priority": "critical",
                "action": "Action: CRITICAL - Rewire electrical system before solar installation",
                "reason": "Reason: Poor wiring cannot safely handle solar backfeed current",
                "next_step": "Next step: Complete electrical rewiring, obtain inspection approval"
            })

        if panel_age == "over_30_years":
            recommendations.append({
                "priority": "high",
                "action": "Action: Replace aging electrical panel (30+ years old)",
                "reason": "Reason: Old panels may have degraded components and safety issues",
                "next_step": "Next step: Budget for panel replacement as part of solar project"
            })

    # Add general recommendation if none generated
    if not recommendations:
        recommendations.append({
            "priority": "low",
            "action": "Action: Proceed with standard solar installation process",
            "reason": "Reason: All electrical checks passed successfully",
            "next_step": "Next step: Begin permitting and installation"
        })

    # =====================
    # 8. COMPILE FINAL RESULT
    # =====================

    # Generate user-friendly summary
    if overall_status == "ok":
        summary = (
            f"✅ Electrical Status: OK — "
            f"Panel capacity is sufficient for this solar size. "
            f"Estimated solar breaker: {solar_breaker_a}A, Main breaker: {main_breaker_a:.0f}A, Panel: {main_panel_a:.0f}A. "
            f"Recommendation: Proceed with installation and verify panel label on-site."
        )
    elif overall_status == "warning":
        summary = (
            f"⚠ Electrical Status: WARNING — "
            f"Panel capacity is tight or other concerns exist. "
            f"Estimated solar breaker: {solar_breaker_a}A, Main breaker: {main_breaker_a:.0f}A, Panel: {main_panel_a:.0f}A. "
            f"Recommendation: Review checks below before proceeding."
        )
    else:  # fail
        summary = (
            f"✗ Electrical Status: FAILED — "
            f"Panel cannot safely support this solar system. "
            f"Required: {solar_breaker_a}A solar breaker + {main_breaker_a:.0f}A main = {required_capacity_a:.0f}A total, "
            f"but 120% limit is {backfeed_limit_a:.0f}A. "
            f"Recommendation: Upgrade panel or reduce system size."
        )

    result = {
        "analysis_type": "electrical",
        "status": overall_status,
        "score": final_score,
        "summary": summary,
        "checks": checks,
        "recommendations": recommendations,
        "calculations": {
            "system_size_kw": system_size_kw,
            "voltage": voltage,
            "phase_type": phase_type,
            "calculated_current_a": calculated_current,
            "solar_breaker_a": solar_breaker_a,
            "main_panel_rating_a": main_panel_a,
            "main_breaker_a": main_breaker_a,
            "backfeed_limit_a": backfeed_limit_a,
            "required_capacity_a": required_capacity_a,
            "capacity_margin_a": capacity_margin,
            "capacity_utilization_percent": round(capacity_utilization, 1)
        },
        "raw_data": electrical_data
    }

    return result
