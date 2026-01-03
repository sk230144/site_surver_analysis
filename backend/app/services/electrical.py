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


def calculate_solar_breaker_size(system_size_kw: float, voltage: float, phase_type: str = "single", inverter_efficiency: float = 0.96) -> Dict:
    """
    Calculate required solar breaker size from inverter AC output (CORRECTED NEC COMPLIANT).

    CRITICAL FIX: Uses inverter AC output current, NOT DC array power.
    The solar breaker protects AC conductors from inverter to panel.

    Args:
        system_size_kw: Solar system DC array size in kilowatts
        voltage: System voltage (240V split-phase residential, 208V/480V commercial)
        phase_type: "single" or "three" phase
        inverter_efficiency: Inverter efficiency (typically 0.95-0.97)

    Returns:
        Dictionary with current calculations and breaker size
    """
    system_dc_watts = system_size_kw * 1000

    # CORRECTED: Calculate inverter AC output (what actually flows through breaker)
    inverter_ac_output_watts = system_dc_watts * inverter_efficiency

    # Calculate AC current based on phase type
    if phase_type == "three":
        # Three-phase: I = P / (V * √3 * PF)
        # Assuming unity power factor (PF=1.0) for modern inverters
        ac_current_amps = inverter_ac_output_watts / (voltage * math.sqrt(3))
    else:
        # Single-phase split-phase (L1-L2): I = P / V
        # For 240V: uses both 120V legs
        ac_current_amps = inverter_ac_output_watts / voltage

    # Apply NEC 125% continuous load factor (NEC 690.8(B))
    # Solar is a continuous load (>3 hours), breaker must handle 125% of continuous current
    required_amps = ac_current_amps * 1.25

    # Round up to standard breaker size
    solar_breaker_a = round_up_to_standard_breaker(required_amps)

    return {
        "system_dc_watts": system_dc_watts,
        "inverter_ac_output_watts": round(inverter_ac_output_watts, 2),
        "inverter_efficiency_percent": round(inverter_efficiency * 100, 1),
        "ac_current_amps": round(ac_current_amps, 2),
        "required_current_with_125_percent_factor_a": round(required_amps, 2),
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

    # CORRECTED: Default to 240V for US residential split-phase
    # 240V is standard for residential (two 120V legs)
    # 208V for commercial three-phase wye
    # 480V for large commercial three-phase
    voltage = float(electrical_data.get("voltage", 240))

    panel_condition = electrical_data.get("panel_condition", "good")
    wiring_condition = electrical_data.get("wiring_condition", "good")

    # NEC 2023+ Compliance Flags
    has_rapid_shutdown = electrical_data.get("has_rapid_shutdown", False)
    has_arc_fault_protection = electrical_data.get("has_arc_fault_protection", False)
    inverter_efficiency = float(electrical_data.get("inverter_efficiency", 0.96))

    # =====================
    # AI-POWERED PANEL CONDITION ASSESSMENT (if images provided)
    # =====================

    ai_panel_assessment = None
    if image_paths and len(image_paths) > 0:
        try:
            from app.services.gemini_vision import analyze_electrical_panel_with_ai
            from app.core.config import settings

            if settings.GEMINI_API_KEY:
                # Use first image for AI analysis
                panel_specs = {
                    "panel_rating_a": main_panel_a,
                    "main_breaker_a": main_breaker_a,
                    "panel_age": panel_age
                }

                ai_panel_assessment = analyze_electrical_panel_with_ai(image_paths[0], panel_specs)

                # Override user inputs with AI detections if available and confident
                if "error" not in ai_panel_assessment:
                    # Override condition assessments if AI has high confidence
                    if ai_panel_assessment.get("ai_confidence") in ["high", "medium"]:
                        phys_cond = ai_panel_assessment.get("physical_condition", {})
                        wire_qual = ai_panel_assessment.get("wiring_quality", {})

                        # Map AI ratings to our condition values
                        ai_overall = phys_cond.get("overall_rating", "good")
                        if ai_overall in ["poor", "fair", "good", "excellent"]:
                            panel_condition = ai_overall

                        ai_wiring = wire_qual.get("organization", "good")
                        if ai_wiring in ["poor", "fair", "good", "excellent"]:
                            wiring_condition = ai_wiring

                        # Detect panel age if visible
                        panel_id = ai_panel_assessment.get("panel_identification", {})
                        if panel_id.get("estimated_age_years"):
                            age_years = panel_id["estimated_age_years"]
                            if age_years > 30:
                                panel_age = "over_30_years"
                            elif age_years > 20:
                                panel_age = "20_30_years"
                            elif age_years > 10:
                                panel_age = "10_20_years"
                            else:
                                panel_age = "under_10_years"

        except Exception as e:
            # AI analysis failed, continue with user-provided values
            ai_panel_assessment = {"error": f"AI analysis failed: {str(e)}"}

    # =====================
    # 2. CALCULATE SOLAR BREAKER SIZE (CORRECTED)
    # =====================

    solar_calc = calculate_solar_breaker_size(system_size_kw, voltage, phase_type, inverter_efficiency)
    solar_breaker_a = solar_calc["solar_breaker_a"]
    ac_current_amps = solar_calc["ac_current_amps"]

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
    # 4. RUN COMPREHENSIVE CHECKS (BLOCKING + SCORING)
    # =====================

    checks = []
    blocking_failures = []  # Track critical failures that block installation

    # ============================================
    # BLOCKING CHECK 1: Panel Capacity (NEC 705.12) - CRITICAL BLOCKING
    # ============================================
    capacity_pass = capacity_margin >= 0
    capacity_status = "pass" if capacity_pass else "fail"

    if capacity_utilization < 80:
        capacity_severity = "low"
        capacity_message = f"✓ Panel has excellent capacity margin ({capacity_margin:.0f}A available)"
    elif capacity_utilization < 100:
        capacity_severity = "medium"
        capacity_message = f"⚠ Panel capacity is tight but acceptable ({capacity_margin:.0f}A margin)"
    else:
        capacity_severity = "critical"
        capacity_message = f"✗ BLOCKING FAILURE: Panel capacity exceeded by {abs(capacity_margin):.0f}A - INSTALLATION PROHIBITED"
        blocking_failures.append("Panel capacity exceeded (NEC 705.12 violation)")

    checks.append({
        "name": "Panel Capacity (NEC 705.12 - 120% Rule)",
        "status": capacity_status,
        "severity": capacity_severity,
        "blocking": not capacity_pass,  # This is a blocking check
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

    # ============================================
    # BLOCKING CHECK 2: Rapid Shutdown (NEC 690.12) - MANDATORY 2023+
    # ============================================
    rapid_shutdown_status = "pass" if has_rapid_shutdown else "fail"
    rapid_shutdown_severity = "critical" if not has_rapid_shutdown else "low"

    if has_rapid_shutdown:
        rapid_shutdown_message = "✓ Rapid shutdown system included (NEC 690.12 compliant)"
    else:
        rapid_shutdown_message = "✗ BLOCKING FAILURE: Rapid shutdown required by NEC 690.12 (2017+) - INSTALLATION PROHIBITED"
        blocking_failures.append("Missing rapid shutdown system (NEC 690.12 violation)")

    checks.append({
        "name": "Rapid Shutdown (NEC 690.12)",
        "status": rapid_shutdown_status,
        "severity": rapid_shutdown_severity,
        "blocking": not has_rapid_shutdown,
        "message": rapid_shutdown_message,
        "details": {
            "requirement": "Conductors >1ft from array must de-energize to ≤80V within 30 seconds",
            "typical_solution": "Module-level power electronics (MLPE) or inverter-integrated shutdown",
            "code_reference": "NEC 2017+ Article 690.12"
        }
    })

    # ============================================
    # BLOCKING CHECK 3: Arc-Fault Protection (NEC 690.11) - MANDATORY 2023+
    # ============================================
    afci_status = "pass" if has_arc_fault_protection else "fail"
    afci_severity = "critical" if not has_arc_fault_protection else "low"

    if has_arc_fault_protection:
        afci_message = "✓ Arc-fault circuit protection included (NEC 690.11 compliant)"
    else:
        afci_message = "✗ BLOCKING FAILURE: Arc-fault protection required by NEC 690.11 (2011+) - INSTALLATION PROHIBITED"
        blocking_failures.append("Missing arc-fault protection (NEC 690.11 violation)")

    checks.append({
        "name": "Arc-Fault Protection (NEC 690.11)",
        "status": afci_status,
        "severity": afci_severity,
        "blocking": not has_arc_fault_protection,
        "message": afci_message,
        "details": {
            "requirement": "PV systems on buildings must detect and interrupt arc faults",
            "typical_solution": "Inverter with built-in AFCI (most modern inverters include this)",
            "code_reference": "NEC 2011+ Article 690.11"
        }
    })

    # ============================================
    # CHECK 4: Panel Age and Condition
    # ============================================
    age_pass = True
    age_status = "pass"
    age_severity = "low"

    if panel_age == "over_30_years":
        age_pass = False
        age_status = "fail"
        age_severity = "high"
        age_message = "✗ Panel is over 30 years old - replacement strongly recommended before solar installation"
        blocking_failures.append("Electrical panel over 30 years old (safety concern)")
    elif panel_age == "20_30_years":
        age_status = "warning"
        age_severity = "medium"
        age_message = "⚠ Panel is 20-30 years old - professional inspection by licensed electrician required"
    elif panel_age == "10_20_years":
        age_message = "✓ Panel age is acceptable (10-20 years)"
    elif panel_age == "under_10_years":
        age_message = "✓ Panel is relatively new (under 10 years)"
    else:
        age_status = "warning"
        age_severity = "medium"
        age_message = "⚠ Panel age unknown - professional inspection required before installation"

    checks.append({
        "name": "Panel Age Assessment",
        "status": age_status,
        "severity": age_severity,
        "blocking": not age_pass,
        "message": age_message,
        "details": {
            "panel_age": panel_age.replace("_", " ").title()
        }
    })

    # ============================================
    # CHECK 5: Panel Physical Condition
    # ============================================
    condition_pass = True
    condition_status = "pass"
    condition_severity = "low"

    if panel_condition == "poor":
        condition_pass = False
        condition_status = "fail"
        condition_severity = "critical"
        condition_message = "✗ BLOCKING FAILURE: Panel in poor condition - repair/replacement required before solar"
        blocking_failures.append("Electrical panel in poor physical condition (safety hazard)")
    elif panel_condition == "fair":
        condition_status = "warning"
        condition_severity = "medium"
        condition_message = "⚠ Panel condition is fair - professional electrician inspection required"
    else:  # good or excellent
        condition_message = "✓ Panel physical condition is acceptable"

    checks.append({
        "name": "Panel Physical Condition",
        "status": condition_status,
        "severity": condition_severity,
        "blocking": not condition_pass,
        "message": condition_message,
        "details": {
            "condition": panel_condition.title(),
            "inspection_recommended": condition_status == "warning"
        }
    })

    # ============================================
    # CHECK 6: Wiring Condition
    # ============================================
    wiring_pass = True
    wiring_status = "pass"
    wiring_severity = "low"

    if wiring_condition == "poor":
        wiring_pass = False
        wiring_status = "fail"
        wiring_severity = "critical"
        wiring_message = "✗ BLOCKING FAILURE: Wiring in poor condition - rewiring required before solar installation"
        blocking_failures.append("Wiring in poor condition (cannot safely handle solar backfeed)")
    elif wiring_condition == "fair":
        wiring_status = "warning"
        wiring_severity = "medium"
        wiring_message = "⚠ Wiring condition is fair - professional inspection and possible upgrades required"
    else:  # good or excellent
        wiring_message = "✓ Wiring condition is acceptable for solar installation"

    checks.append({
        "name": "Wiring Condition",
        "status": wiring_status,
        "severity": wiring_severity,
        "blocking": not wiring_pass,
        "message": wiring_message,
        "details": {
            "condition": wiring_condition.title(),
            "inspection_recommended": wiring_status == "warning"
        }
    })

    # ============================================
    # CHECK 7: System Size vs Panel Rating (proportionality check)
    # ============================================
    # Large systems on small panels can be problematic
    size_ratio = (solar_breaker_a / main_panel_a) * 100
    size_status = "pass"
    size_severity = "low"

    if size_ratio > 50:
        size_status = "warning"
        size_severity = "medium"
        size_message = f"⚠ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - panel upgrade strongly recommended"
    elif size_ratio > 30:
        size_message = f"✓ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - acceptable proportion"
    else:
        size_message = f"✓ Solar breaker ({solar_breaker_a}A) is {size_ratio:.0f}% of panel rating - well proportioned"

    checks.append({
        "name": "System Size Proportionality",
        "status": size_status,
        "severity": size_severity,
        "blocking": False,
        "message": size_message,
        "details": {
            "solar_breaker": f"{solar_breaker_a}A",
            "panel_rating": f"{main_panel_a:.0f}A",
            "ratio": f"{size_ratio:.1f}%"
        }
    })

    # =====================
    # 5. DETERMINE OVERALL STATUS (BLOCKING CRITERIA APPROACH)
    # =====================

    # CRITICAL: If ANY blocking failure exists, installation is PROHIBITED
    if blocking_failures:
        overall_status = "blocked"
        overall_severity = "critical"
    else:
        # No blocking failures - check for warnings
        has_warnings = any(c["status"] == "warning" for c in checks)

        if has_warnings:
            overall_status = "warning"
            overall_severity = "medium"
        else:
            overall_status = "approved"
            overall_severity = "low"

    # =====================
    # 6. BUILD AUTOMATED SOLUTIONS ENGINE
    # =====================

    automated_solutions = []

    # Solution 1: Main Breaker Derating (if capacity exceeded)
    if not capacity_pass and capacity_margin < 0:
        # Calculate what main breaker size would work
        max_main_breaker_for_current_panel = backfeed_limit_a - solar_breaker_a
        if max_main_breaker_for_current_panel > 0:
            automated_solutions.append({
                "solution_type": "main_breaker_derate",
                "title": f"Option 1: Derate Main Breaker to {int(max_main_breaker_for_current_panel)}A",
                "description": f"Replace {main_breaker_a:.0f}A main breaker with {int(max_main_breaker_for_current_panel)}A breaker",
                "pros": [
                    "Least expensive option (~$200-500)",
                    "No panel replacement needed",
                    "Quick installation (1-2 hours)"
                ],
                "cons": [
                    "Reduces available house power",
                    f"May not support high loads (AC + dryer + oven simultaneously)",
                    "Not viable if current usage exceeds new rating"
                ],
                "feasibility": "high" if max_main_breaker_for_current_panel >= 100 else "low",
                "estimated_cost_usd": "200-500",
                "nec_reference": "NEC 705.12(D)(2)"
            })

    # Solution 2: Supply-Side (Line-Side) Tap
    if not capacity_pass:
        automated_solutions.append({
            "solution_type": "supply_side_tap",
            "title": "Option 2: Supply-Side (Line-Side) Tap",
            "description": "Connect solar breaker on utility side of main breaker (before it)",
            "pros": [
                "Bypasses 120% rule entirely",
                "No panel rating limitations",
                "Works for any system size"
            ],
            "cons": [
                "More expensive installation (~$1,500-3,000)",
                "Requires utility approval in some jurisdictions",
                "More complex wiring (must be done by licensed electrician)",
                "May require outdoor-rated disconnect"
            ],
            "feasibility": "high",
            "estimated_cost_usd": "1500-3000",
            "nec_reference": "NEC 705.12(A) - Supply-side connection"
        })

    # Solution 3: Panel Upgrade
    if not capacity_pass or size_ratio > 50:
        # Calculate recommended panel size
        recommended_panel_size = int((required_capacity_a / 1.2) / 25) * 25 + 25  # Round up to nearest 25A increment
        recommended_panel_size = max(recommended_panel_size, 200)  # Minimum 200A for modern homes

        automated_solutions.append({
            "solution_type": "panel_upgrade",
            "title": f"Option 3: Upgrade to {recommended_panel_size}A Panel",
            "description": f"Replace {main_panel_a:.0f}A panel with new {recommended_panel_size}A panel",
            "pros": [
                "Supports current AND future electrical needs",
                "Increases home value",
                "Room for system expansion later",
                "Modernizes electrical system"
            ],
            "cons": [
                "Most expensive option (~$2,000-4,000)",
                "Longer installation time (4-8 hours)",
                "May require utility service upgrade if main from utility is undersized"
            ],
            "feasibility": "high",
            "estimated_cost_usd": "2000-4000",
            "recommended_panel_size": f"{recommended_panel_size}A",
            "nec_reference": "NEC 705.12(D)(2)"
        })

    # Solution 4: Reduce System Size (last resort)
    if not capacity_pass:
        # Calculate maximum system size that would fit
        max_solar_breaker = backfeed_limit_a - main_breaker_a
        if max_solar_breaker > 0:
            # Back-calculate system size from max breaker
            # solar_breaker = (system_kw * 1000 * efficiency / voltage) * 1.25
            max_system_kw = (max_solar_breaker / 1.25) * voltage / (1000 * inverter_efficiency)

            automated_solutions.append({
                "solution_type": "reduce_system_size",
                "title": f"Option 4: Reduce System to {max_system_kw:.1f}kW (Not Recommended)",
                "description": f"Reduce system from {system_size_kw}kW to {max_system_kw:.1f}kW to fit current panel",
                "pros": [
                    "No electrical work needed",
                    "Lowest upfront cost"
                ],
                "cons": [
                    "Reduces solar production and savings",
                    "Poor return on investment",
                    "Still requires panel work eventually for other upgrades",
                    "Wastes available roof space"
                ],
                "feasibility": "high" if max_system_kw >= 3.0 else "low",
                "estimated_cost_usd": "0",
                "max_system_size_kw": round(max_system_kw, 1),
                "production_loss_percent": round((1 - max_system_kw / system_size_kw) * 100, 1)
            })

    # =====================
    # 7. GENERATE ACTION-ORIENTED RECOMMENDATIONS
    # =====================

    recommendations = []

    if overall_status == "approved":
        recommendations.append({
            "priority": "low",
            "action": "✅ APPROVED: Proceed with solar installation",
            "reason": "All NEC requirements met and panel has adequate capacity",
            "next_step": f"Install {solar_breaker_a}A solar breaker and proceed with interconnection",
            "installer_notes": "Verify all specs on-site before final installation"
        })

    elif overall_status == "blocked":
        # Generate specific recommendations for each blocking failure
        for failure in blocking_failures:
            if "capacity exceeded" in failure.lower():
                recommendations.append({
                    "priority": "critical",
                    "action": f"🚫 INSTALLATION BLOCKED: {failure}",
                    "reason": "NEC 705.12 violation - fire and safety hazard",
                    "next_step": "Review automated solutions below and select best option",
                    "blocking": True
                })
            elif "rapid shutdown" in failure.lower():
                recommendations.append({
                    "priority": "critical",
                    "action": f"🚫 INSTALLATION BLOCKED: {failure}",
                    "reason": "Mandatory safety requirement since NEC 2017",
                    "next_step": "Specify inverter/optimizer with integrated rapid shutdown (most modern inverters include this)",
                    "blocking": True
                })
            elif "arc-fault" in failure.lower():
                recommendations.append({
                    "priority": "critical",
                    "action": f"🚫 INSTALLATION BLOCKED: {failure}",
                    "reason": "Mandatory fire prevention requirement since NEC 2011",
                    "next_step": "Specify inverter with built-in AFCI protection (standard in modern inverters)",
                    "blocking": True
                })
            elif "panel" in failure.lower() and "condition" in failure.lower():
                recommendations.append({
                    "priority": "critical",
                    "action": f"🚫 INSTALLATION BLOCKED: {failure}",
                    "reason": "Cannot safely add solar load to deteriorated panel",
                    "next_step": "Replace electrical panel before proceeding with solar installation",
                    "blocking": True
                })
            elif "wiring" in failure.lower():
                recommendations.append({
                    "priority": "critical",
                    "action": f"🚫 INSTALLATION BLOCKED: {failure}",
                    "reason": "Poor wiring cannot handle solar backfeed current",
                    "next_step": "Rewire electrical system and obtain inspection approval",
                    "blocking": True
                })
            elif "30 years" in failure.lower():
                recommendations.append({
                    "priority": "high",
                    "action": f"⚠️ SAFETY CONCERN: {failure}",
                    "reason": "Old panels have degraded components and fire risk",
                    "next_step": "Budget for panel replacement as part of solar project",
                    "blocking": True
                })

    elif overall_status == "warning":
        # Generate warnings for non-blocking issues
        warning_checks = [c for c in checks if c["status"] == "warning"]
        for check in warning_checks:
            recommendations.append({
                "priority": "medium",
                "action": f"⚠️ WARNING: {check['name']}",
                "reason": check['message'],
                "next_step": "Professional inspection recommended before installation",
                "blocking": False
            })

    # =====================
    # 8. COMPILE FINAL RESULT
    # =====================

    # Generate user-friendly summary based on BLOCKING CRITERIA
    if overall_status == "approved":
        summary = (
            f"✅ APPROVED — All NEC requirements met. "
            f"System: {system_size_kw}kW ({solar_calc['inverter_ac_output_watts']:.0f}W AC @ {solar_calc['inverter_efficiency_percent']}% efficiency). "
            f"Breakers: {solar_breaker_a}A solar + {main_breaker_a:.0f}A main = {required_capacity_a:.0f}A total. "
            f"Panel: {main_panel_a:.0f}A ({backfeed_limit_a:.0f}A @ 120% limit). "
            f"Margin: {capacity_margin:.0f}A remaining ({100 - capacity_utilization:.1f}% available)."
        )
    elif overall_status == "warning":
        summary = (
            f"⚠️ CONDITIONAL APPROVAL — No blocking failures, but warnings exist. "
            f"System: {system_size_kw}kW. Breakers: {solar_breaker_a}A solar + {main_breaker_a:.0f}A main. "
            f"Panel: {main_panel_a:.0f}A. Professional inspection recommended before installation."
        )
    else:  # blocked
        summary = (
            f"🚫 INSTALLATION BLOCKED — {len(blocking_failures)} critical failure(s) prevent installation. "
            f"System: {system_size_kw}kW requires {solar_breaker_a}A solar breaker. "
            f"Panel: {main_panel_a:.0f}A (120% limit: {backfeed_limit_a:.0f}A). "
            f"Total required: {required_capacity_a:.0f}A. "
            f"Shortage: {abs(capacity_margin):.0f}A. "
            f"MUST resolve blocking issues before installation."
        )

    result = {
        "analysis_type": "electrical",
        "status": overall_status,
        "severity": overall_severity,
        "summary": summary,
        "blocking_failures": blocking_failures,  # NEW: List of critical blocking issues
        "automated_solutions": automated_solutions,  # NEW: Calculated fix options
        "ai_panel_assessment": ai_panel_assessment,  # NEW: AI vision analysis of panel photos
        "checks": checks,
        "recommendations": recommendations,
        "calculations": {
            "system_size_kw": system_size_kw,
            "system_dc_watts": solar_calc["system_dc_watts"],
            "inverter_ac_output_watts": solar_calc["inverter_ac_output_watts"],
            "inverter_efficiency_percent": solar_calc["inverter_efficiency_percent"],
            "voltage": voltage,
            "phase_type": phase_type,
            "ac_current_amps": ac_current_amps,
            "solar_breaker_a": solar_breaker_a,
            "main_panel_rating_a": main_panel_a,
            "main_breaker_a": main_breaker_a,
            "backfeed_limit_a": backfeed_limit_a,
            "required_capacity_a": required_capacity_a,
            "capacity_margin_a": capacity_margin,
            "capacity_utilization_percent": round(capacity_utilization, 1)
        },
        "nec_compliance": {
            "rapid_shutdown_690_12": has_rapid_shutdown,
            "arc_fault_protection_690_11": has_arc_fault_protection,
            "backfeed_rule_705_12": capacity_pass,
            "nec_version": "2023"
        },
        "raw_data": electrical_data
    }

    return result
