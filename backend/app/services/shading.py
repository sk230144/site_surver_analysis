"""
Shading Analysis v1 - Heuristic MVP
Estimates shading impact without ray tracing.
Uses proximity and obstruction height to estimate annual loss.
"""
from shapely import wkt
from shapely.geometry import Point
import math


def run_shading_analysis(roof_planes, obstructions):
    """
    Analyze shading impact on roof planes from obstructions.

    Args:
        roof_planes: List of dicts with {id, polygon_wkt, name?, tilt_deg?, azimuth_deg?}
        obstructions: List of dicts with {id, type, polygon_wkt, height_m?}

    Returns:
        Dict with summary and per-plane results
    """
    results = {
        "summary": "Shading analysis v1 (heuristic)",
        "total_roof_planes": len(roof_planes),
        "total_obstructions": len(obstructions),
        "planes": []
    }

    if not roof_planes:
        results["summary"] += " - No roof planes found"
        return results

    for plane in roof_planes:
        plane_result = analyze_plane_shading(plane, obstructions)
        results["planes"].append(plane_result)

    # Calculate overall shading risk
    if results["planes"]:
        avg_risk = sum(p["shade_risk_score"] for p in results["planes"]) / len(results["planes"])
        results["average_shade_risk"] = round(avg_risk, 2)

    return results


def analyze_plane_shading(roof_plane, obstructions):
    """
    Analyze shading for a single roof plane.

    Returns:
        Dict with plane_id, shade_risk_score, estimated_annual_loss_percent, etc.
    """
    try:
        # Parse roof plane geometry
        roof_geom = wkt.loads(roof_plane["polygon_wkt"])
        roof_centroid = roof_geom.centroid
        roof_area = roof_geom.area  # in square meters (assuming projected coordinate system)

        # Initialize result
        result = {
            "plane_id": roof_plane["id"],
            "plane_name": roof_plane.get("name", f"Plane {roof_plane['id']}"),
            "shade_risk_score": 0.0,  # 0-100 scale
            "estimated_annual_loss_percent": 0.0,  # 0-25% typical range
            "dominant_obstruction": None,
            "obstruction_impacts": [],
            "notes": []
        }

        if not obstructions:
            result["notes"].append("No obstructions found - minimal shading expected")
            return result

        # Analyze each obstruction's impact
        total_impact_score = 0.0
        max_impact = 0.0
        dominant_obs = None

        for obs in obstructions:
            try:
                obs_geom = wkt.loads(obs["polygon_wkt"])
                obs_centroid = obs_geom.centroid
                obs_height = obs.get("height_m", 3.0)  # Default 3m if not specified

                # Calculate distance between centroids
                distance = roof_centroid.distance(obs_centroid)

                # Calculate relative distance based on roof size
                # Use 10x roof diagonal as threshold (handles both real-world meters and pixel coordinates)
                roof_bounds = roof_geom.bounds  # (minx, miny, maxx, maxy)
                roof_diagonal = ((roof_bounds[2] - roof_bounds[0])**2 + (roof_bounds[3] - roof_bounds[1])**2)**0.5
                distance_threshold = max(50, roof_diagonal * 10)  # At least 50m, or 10x roof size

                # Skip if obstruction is very far
                if distance > distance_threshold:
                    continue

                # Calculate shading impact score
                # Formula: higher obstructions closer to roof = more impact
                # Impact decreases with distance (inverse square-ish)
                if distance < 0.1:  # Avoid division by zero
                    distance = 0.1

                # Height factor: taller obstructions block more sun
                height_factor = min(obs_height / 10.0, 1.0)  # Cap at 10m reference

                # Distance factor: closer = more impact
                distance_factor = 1.0 / (1.0 + distance / 10.0)

                # Combined impact (0-100 scale)
                impact_score = height_factor * distance_factor * 100.0

                # Check if obstruction overlaps or is very close to roof
                if roof_geom.intersects(obs_geom) or distance < 2.0:
                    impact_score *= 1.5  # Heavy penalty for very close/overlapping
                    result["notes"].append(f"⚠️  {obs['type']} very close or overlapping roof plane")

                total_impact_score += impact_score

                # Track dominant obstruction
                if impact_score > max_impact:
                    max_impact = impact_score
                    dominant_obs = {
                        "id": obs["id"],
                        "type": obs["type"],
                        "height_m": obs_height,
                        "distance_m": round(distance, 2),
                        "impact_score": round(impact_score, 2)
                    }

                # Record individual impact
                result["obstruction_impacts"].append({
                    "obstruction_id": obs["id"],
                    "type": obs["type"],
                    "distance_m": round(distance, 2),
                    "height_m": obs_height,
                    "impact_score": round(impact_score, 2)
                })

            except Exception as e:
                result["notes"].append(f"Error processing obstruction {obs.get('id')}: {str(e)}")

        # Calculate final shade risk score (0-100)
        # Cap at 100
        result["shade_risk_score"] = min(total_impact_score, 100.0)
        result["shade_risk_score"] = round(result["shade_risk_score"], 2)

        # Convert to estimated annual energy loss percentage
        # Heuristic: 0 risk = 0% loss, 100 risk = ~25% loss (severe shading)
        result["estimated_annual_loss_percent"] = round(result["shade_risk_score"] * 0.25, 2)

        # Set dominant obstruction
        if dominant_obs:
            result["dominant_obstruction"] = dominant_obs

        # Add risk assessment note
        if result["shade_risk_score"] < 20:
            result["notes"].append("✓ Low shading risk - good solar exposure")
        elif result["shade_risk_score"] < 50:
            result["notes"].append("⚠️  Moderate shading risk - consider obstruction mitigation")
        else:
            result["notes"].append("❌ High shading risk - significant energy loss expected")

        return result

    except Exception as e:
        return {
            "plane_id": roof_plane.get("id"),
            "plane_name": roof_plane.get("name", "Unknown"),
            "shade_risk_score": 0.0,
            "estimated_annual_loss_percent": 0.0,
            "dominant_obstruction": None,
            "obstruction_impacts": [],
            "notes": [f"Error analyzing plane: {str(e)}"]
        }
