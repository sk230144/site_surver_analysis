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
                roof_bounds = roof_geom.bounds  # (minx, miny, maxx, maxy)
                roof_diagonal = ((roof_bounds[2] - roof_bounds[0])**2 + (roof_bounds[3] - roof_bounds[1])**2)**0.5

                # Normalize distance relative to roof size to handle pixel coordinates
                # This makes distance meaningful regardless of coordinate system scale
                normalized_distance = distance / roof_diagonal if roof_diagonal > 0 else distance

                # Skip if obstruction is very far (>10x roof diagonal)
                if normalized_distance > 10:
                    continue

                # Check if obstruction overlaps or intersects roof
                is_overlapping = roof_geom.intersects(obs_geom)

                # Calculate shading impact score using NORMALIZED distance
                # This works for both real-world meters and pixel coordinates

                if is_overlapping:
                    # Direct overlap = MAXIMUM impact
                    # Height factor determines severity
                    height_factor = min(obs_height / 10.0, 1.0)  # 12m tree = 1.0 factor
                    impact_score = 80.0 + (height_factor * 20.0)  # 80-100 range for overlaps
                    result["notes"].append(f"⚠️  {obs['type']} directly overlaps roof plane - HIGH SHADING RISK")
                elif normalized_distance < 0.5:
                    # Very close (within 0.5x roof diagonal)
                    height_factor = min(obs_height / 10.0, 1.0)
                    distance_penalty = (0.5 - normalized_distance) / 0.5  # 1.0 at distance 0, 0.0 at 0.5
                    impact_score = (40.0 + height_factor * 40.0) * distance_penalty
                    result["notes"].append(f"⚠️  {obs['type']} very close to roof plane")
                elif normalized_distance < 2.0:
                    # Moderate distance (0.5x to 2x roof diagonal)
                    height_factor = min(obs_height / 10.0, 1.0)
                    distance_penalty = (2.0 - normalized_distance) / 1.5
                    impact_score = (20.0 + height_factor * 30.0) * distance_penalty
                else:
                    # Far but within threshold (2x to 10x roof diagonal)
                    height_factor = min(obs_height / 10.0, 1.0)
                    distance_penalty = (10.0 - normalized_distance) / 8.0
                    impact_score = (10.0 + height_factor * 20.0) * distance_penalty

                total_impact_score += impact_score

                # Track dominant obstruction
                if impact_score > max_impact:
                    max_impact = impact_score
                    dominant_obs = {
                        "id": obs["id"],
                        "type": obs["type"],
                        "height_m": obs_height,
                        "normalized_distance": round(normalized_distance, 2),
                        "distance_description": "overlapping" if is_overlapping else f"{normalized_distance:.1f}x roof diagonal",
                        "impact_score": round(impact_score, 2)
                    }

                # Record individual impact
                result["obstruction_impacts"].append({
                    "obstruction_id": obs["id"],
                    "type": obs["type"],
                    "normalized_distance": round(normalized_distance, 2),
                    "distance_description": "overlapping" if is_overlapping else f"{normalized_distance:.1f}x roof diagonal",
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
