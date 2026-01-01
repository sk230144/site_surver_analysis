"""
Shading Analysis v2 - Advanced Solar Position Modeling
Implements comprehensive sun path analysis with hourly shadow calculations.

Features:
- Solar position calculation (azimuth, elevation) for any time/location
- Shadow projection using obstruction geometry
- Hourly energy loss estimation throughout the year
- Seasonal variation analysis
- Time-of-day peak production impact
"""
from shapely import wkt, affinity
from shapely.geometry import Polygon, Point, LineString, MultiPolygon
from shapely.ops import unary_union
import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import numpy as np


class SolarPosition:
    """Calculate sun position (azimuth, elevation) for any time and location"""

    @staticmethod
    def julian_day(dt: datetime) -> float:
        """Calculate Julian day number"""
        a = (14 - dt.month) // 12
        y = dt.year + 4800 - a
        m = dt.month + 12 * a - 3
        jdn = dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
        jd = jdn + (dt.hour - 12) / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0
        return jd

    @staticmethod
    def calculate_sun_position(latitude: float, longitude: float, dt: datetime) -> Tuple[float, float]:
        """
        Calculate solar azimuth and elevation angles.

        Args:
            latitude: Site latitude in degrees (-90 to 90)
            longitude: Site longitude in degrees (-180 to 180)
            dt: Datetime for calculation (UTC or local with timezone)

        Returns:
            Tuple of (azimuth, elevation) in degrees
            - Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
            - Elevation: 0° = horizon, 90° = directly overhead
        """
        # Convert to radians
        lat_rad = math.radians(latitude)
        lon_rad = math.radians(longitude)

        # Calculate Julian day and century
        jd = SolarPosition.julian_day(dt)
        jc = (jd - 2451545.0) / 36525.0

        # Calculate geometric mean longitude of sun
        geom_mean_long = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360

        # Calculate geometric mean anomaly of sun
        geom_mean_anom = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
        geom_mean_anom_rad = math.radians(geom_mean_anom)

        # Calculate sun equation of center
        sun_eq_ctr = (math.sin(geom_mean_anom_rad) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
                      math.sin(2 * geom_mean_anom_rad) * (0.019993 - 0.000101 * jc) +
                      math.sin(3 * geom_mean_anom_rad) * 0.000289)

        # Calculate sun true longitude
        sun_true_long = geom_mean_long + sun_eq_ctr

        # Calculate sun apparent longitude
        sun_app_long = sun_true_long - 0.00569 - 0.00478 * math.sin(math.radians(125.04 - 1934.136 * jc))
        sun_app_long_rad = math.radians(sun_app_long)

        # Calculate mean obliquity of ecliptic
        mean_obliq = 23 + (26 + ((21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813)))) / 60) / 60

        # Calculate obliquity correction
        obliq_corr = mean_obliq + 0.00256 * math.cos(math.radians(125.04 - 1934.136 * jc))
        obliq_corr_rad = math.radians(obliq_corr)

        # Calculate sun declination
        sun_decl = math.asin(math.sin(obliq_corr_rad) * math.sin(sun_app_long_rad))

        # Calculate equation of time (minutes)
        var_y = math.tan(obliq_corr_rad / 2) ** 2
        eq_time = 4 * math.degrees(
            var_y * math.sin(2 * math.radians(geom_mean_long)) -
            2 * math.radians(geom_mean_anom_rad / 57.2958) * math.sin(math.radians(geom_mean_long)) +
            4 * math.radians(geom_mean_anom_rad / 57.2958) * var_y * math.sin(math.radians(geom_mean_long)) -
            0.5 * var_y ** 2 * math.sin(4 * math.radians(geom_mean_long)) -
            1.25 * (math.radians(geom_mean_anom_rad / 57.2958)) ** 2 * math.sin(2 * geom_mean_anom_rad)
        )

        # Calculate hour angle
        true_solar_time = (dt.hour * 60 + dt.minute + dt.second / 60 + eq_time + 4 * math.degrees(lon_rad)) % 1440
        hour_angle = (true_solar_time / 4 - 180) if true_solar_time < 0 else (true_solar_time / 4 - 180)
        hour_angle_rad = math.radians(hour_angle)

        # Calculate solar zenith angle
        zenith = math.acos(
            math.sin(lat_rad) * math.sin(sun_decl) +
            math.cos(lat_rad) * math.cos(sun_decl) * math.cos(hour_angle_rad)
        )

        # Calculate solar elevation
        elevation = 90 - math.degrees(zenith)

        # Calculate solar azimuth
        if hour_angle > 0:
            azimuth = (math.degrees(math.acos(
                ((math.sin(lat_rad) * math.cos(zenith)) - math.sin(sun_decl)) /
                (math.cos(lat_rad) * math.sin(zenith))
            )) + 180) % 360
        else:
            azimuth = (540 - math.degrees(math.acos(
                ((math.sin(lat_rad) * math.cos(zenith)) - math.sin(sun_decl)) /
                (math.cos(lat_rad) * math.sin(zenith))
            ))) % 360

        return azimuth, elevation


class ShadowProjector:
    """Project shadows from obstructions based on sun position"""

    @staticmethod
    def project_shadow(obstruction_polygon: Polygon, obstruction_height: float,
                       sun_azimuth: float, sun_elevation: float) -> Optional[Polygon]:
        """
        Project shadow from an obstruction onto ground plane.

        Args:
            obstruction_polygon: Base polygon of obstruction
            obstruction_height: Height in meters
            sun_azimuth: Sun azimuth angle in degrees
            sun_elevation: Sun elevation angle in degrees

        Returns:
            Shadow polygon or None if sun is below horizon
        """
        if sun_elevation <= 0:
            return None  # Sun below horizon, no shadow

        # Calculate shadow length
        # shadow_length = height / tan(elevation)
        shadow_length = obstruction_height / math.tan(math.radians(sun_elevation))

        # Calculate shadow direction (opposite of sun azimuth)
        shadow_direction = (sun_azimuth + 180) % 360

        # Convert to x, y offset
        # Azimuth: 0° = North (+Y), 90° = East (+X), 180° = South (-Y), 270° = West (-X)
        dx = shadow_length * math.sin(math.radians(shadow_direction))
        dy = shadow_length * math.cos(math.radians(shadow_direction))

        # Create shadow by translating obstruction polygon
        shadow = affinity.translate(obstruction_polygon, xoff=dx, yoff=dy)

        # Union of obstruction and shadow represents total shaded area
        # Convert to list for unary_union compatibility
        try:
            total_shadow = unary_union([obstruction_polygon, shadow])
        except Exception:
            # Fallback: just return the shadow if union fails
            total_shadow = shadow

        return total_shadow

    @staticmethod
    def calculate_shaded_area(roof_polygon: Polygon, shadow_polygons: List[Polygon]) -> float:
        """
        Calculate percentage of roof area that is shaded.

        Args:
            roof_polygon: Roof plane polygon
            shadow_polygons: List of shadow polygons

        Returns:
            Percentage of roof area shaded (0-100)
        """
        if not shadow_polygons:
            return 0.0

        # Combine all shadows
        try:
            # Filter out None values and ensure all are valid geometries
            valid_shadows = [s for s in shadow_polygons if s is not None and s.is_valid]
            if not valid_shadows:
                return 0.0

            combined_shadows = unary_union(valid_shadows)
        except Exception:
            # Fallback: use first shadow if union fails
            combined_shadows = shadow_polygons[0] if shadow_polygons else None
            if combined_shadows is None:
                return 0.0

        # Calculate intersection with roof
        try:
            shaded_area = roof_polygon.intersection(combined_shadows)
        except Exception:
            return 0.0

        # Calculate percentage
        roof_area = roof_polygon.area
        if roof_area == 0:
            return 0.0

        shaded_pct = (shaded_area.area / roof_area) * 100.0
        return min(shaded_pct, 100.0)


class EnergyCalculator:
    """Calculate energy production and losses"""

    @staticmethod
    def clear_sky_irradiance(elevation: float, air_mass_factor: float = 1.0) -> float:
        """
        Estimate clear-sky solar irradiance in W/m².

        Args:
            elevation: Sun elevation angle in degrees
            air_mass_factor: Atmospheric clarity factor (0.7-1.0, default 1.0)

        Returns:
            Irradiance in W/m²
        """
        if elevation <= 0:
            return 0.0

        # Solar constant
        solar_constant = 1367.0  # W/m²

        # Air mass approximation
        air_mass = 1.0 / (math.sin(math.radians(elevation)) + 0.50572 * (elevation + 6.07995) ** -1.6364)

        # Clear sky model (simplified)
        irradiance = solar_constant * (0.7 ** (air_mass ** 0.678)) * air_mass_factor

        return irradiance

    @staticmethod
    def panel_efficiency(tilt: float, azimuth: float, sun_azimuth: float,
                        sun_elevation: float, temperature_c: float = 25.0) -> float:
        """
        Calculate solar panel efficiency based on angle of incidence.

        Args:
            tilt: Panel tilt angle in degrees (0 = flat, 90 = vertical)
            azimuth: Panel azimuth in degrees
            sun_azimuth: Sun azimuth in degrees
            sun_elevation: Sun elevation in degrees
            temperature_c: Panel temperature in Celsius

        Returns:
            Efficiency factor (0-1.0)
        """
        if sun_elevation <= 0:
            return 0.0

        # Calculate angle of incidence
        # Convert to radians
        panel_tilt_rad = math.radians(tilt)
        panel_az_rad = math.radians(azimuth)
        sun_el_rad = math.radians(sun_elevation)
        sun_az_rad = math.radians(sun_azimuth)

        # Cosine of angle of incidence
        cos_aoi = (math.sin(sun_el_rad) * math.cos(panel_tilt_rad) +
                   math.cos(sun_el_rad) * math.sin(panel_tilt_rad) *
                   math.cos(sun_az_rad - panel_az_rad))

        cos_aoi = max(0, cos_aoi)  # Ensure non-negative

        # Temperature derating (typical: -0.4% per °C above 25°C)
        temp_factor = 1.0 - 0.004 * (temperature_c - 25.0)
        temp_factor = max(0.7, min(1.0, temp_factor))

        return cos_aoi * temp_factor


def run_advanced_shading_analysis(roof_planes: List[Dict], obstructions: List[Dict],
                                   latitude: float = 37.7749, longitude: float = -122.4194,
                                   analysis_year: int = 2024) -> Dict:
    """
    Comprehensive shading analysis with solar position modeling.

    Args:
        roof_planes: List of roof plane dicts with polygon_wkt, name, tilt_deg, azimuth_deg
        obstructions: List of obstruction dicts with polygon_wkt, type, height_m
        latitude: Site latitude in degrees (default: San Francisco)
        longitude: Site longitude in degrees (default: San Francisco)
        analysis_year: Year for analysis (default: 2024)

    Returns:
        Comprehensive analysis results with hourly/seasonal data
    """
    results = {
        "summary": "Advanced shading analysis v2 (solar position modeling)",
        "location": {"latitude": latitude, "longitude": longitude},
        "analysis_year": analysis_year,
        "total_roof_planes": len(roof_planes),
        "total_obstructions": len(obstructions),
        "planes": []
    }

    if not roof_planes:
        results["summary"] += " - No roof planes found"
        return results

    # Representative days for seasonal analysis (15th of each month)
    representative_days = [
        datetime(analysis_year, month, 15) for month in range(1, 13)
    ]

    # Analysis hours (6 AM to 6 PM, hourly)
    analysis_hours = range(6, 19)

    for plane in roof_planes:
        plane_result = analyze_plane_advanced(
            plane, obstructions, latitude, longitude,
            representative_days, analysis_hours
        )
        results["planes"].append(plane_result)

    # Calculate overall metrics
    if results["planes"]:
        avg_annual_loss = sum(p["annual_energy_loss_percent"] for p in results["planes"]) / len(results["planes"])
        results["average_annual_energy_loss"] = round(avg_annual_loss, 2)

        avg_peak_hour_loss = sum(p["peak_hours_loss_percent"] for p in results["planes"]) / len(results["planes"])
        results["average_peak_hours_loss"] = round(avg_peak_hour_loss, 2)

    return results


def analyze_plane_advanced(roof_plane: Dict, obstructions: List[Dict],
                           latitude: float, longitude: float,
                           representative_days: List[datetime],
                           analysis_hours: range) -> Dict:
    """
    Perform advanced analysis on a single roof plane.

    Returns detailed hourly and seasonal shading data.
    """
    try:
        # Parse roof geometry
        roof_geom = wkt.loads(roof_plane["polygon_wkt"])
        roof_tilt = roof_plane.get("tilt_deg", 20.0)
        roof_azimuth = roof_plane.get("azimuth_deg", 180.0)

        # Parse obstructions
        obs_data = []
        for obs in obstructions:
            try:
                obs_geom = wkt.loads(obs["polygon_wkt"])
                obs_height = obs.get("height_m", 3.0)
                obs_data.append({
                    "id": obs["id"],
                    "type": obs["type"],
                    "geometry": obs_geom,
                    "height": obs_height
                })
            except Exception:
                continue

        # Initialize tracking variables
        total_potential_energy = 0.0
        total_actual_energy = 0.0
        peak_hours_potential = 0.0
        peak_hours_actual = 0.0

        worst_shadow_time = None
        worst_shadow_percent = 0.0

        best_time = None
        best_production = 0.0

        monthly_data = []
        hourly_patterns = {hour: [] for hour in analysis_hours}

        # Analyze each representative day
        for day in representative_days:
            daily_potential = 0.0
            daily_actual = 0.0
            daily_peak_potential = 0.0
            daily_peak_actual = 0.0

            hourly_data = []

            for hour in analysis_hours:
                dt = day.replace(hour=hour, minute=0, second=0)

                # Calculate sun position
                sun_az, sun_el = SolarPosition.calculate_sun_position(latitude, longitude, dt)

                if sun_el <= 0:
                    continue  # Sun below horizon

                # Calculate irradiance
                irradiance = EnergyCalculator.clear_sky_irradiance(sun_el)

                # Calculate panel efficiency
                efficiency = EnergyCalculator.panel_efficiency(
                    roof_tilt, roof_azimuth, sun_az, sun_el
                )

                # Calculate potential production (W/m²)
                potential_production = irradiance * efficiency

                # Project shadows - only from nearby obstructions
                shadow_polygons = []
                for obs in obs_data:
                    # Check distance between obstruction and roof
                    distance = roof_geom.distance(obs["geometry"])

                    # Calculate maximum shadow casting distance
                    # A 10m tall tree at 10° elevation can cast ~57m shadow
                    # Formula: max_shadow = height / tan(min_elevation)
                    # Use 5° as minimum useful sun elevation
                    max_shadow_distance = obs["height"] / math.tan(math.radians(5))

                    # Only consider obstructions within shadow-casting range
                    # Add 20% buffer for safety
                    if distance <= max_shadow_distance * 1.2:
                        shadow = ShadowProjector.project_shadow(
                            obs["geometry"], obs["height"], sun_az, sun_el
                        )
                        if shadow:
                            shadow_polygons.append(shadow)

                # Calculate shaded percentage
                shaded_pct = ShadowProjector.calculate_shaded_area(roof_geom, shadow_polygons)

                # Calculate actual production accounting for shading
                actual_production = potential_production * (1.0 - shaded_pct / 100.0)

                # Track data
                total_potential_energy += potential_production
                total_actual_energy += actual_production

                # Peak hours (10 AM - 4 PM)
                if 10 <= hour <= 16:
                    peak_hours_potential += potential_production
                    peak_hours_actual += actual_production
                    daily_peak_potential += potential_production
                    daily_peak_actual += actual_production

                daily_potential += potential_production
                daily_actual += actual_production

                # Track worst shading
                if shaded_pct > worst_shadow_percent:
                    worst_shadow_percent = shaded_pct
                    worst_shadow_time = {
                        "datetime": dt.isoformat(),
                        "month": dt.strftime("%B"),
                        "hour": hour,
                        "sun_azimuth": round(sun_az, 1),
                        "sun_elevation": round(sun_el, 1),
                        "shaded_percent": round(shaded_pct, 1)
                    }

                # Track best production
                if actual_production > best_production:
                    best_production = actual_production
                    best_time = {
                        "datetime": dt.isoformat(),
                        "month": dt.strftime("%B"),
                        "hour": hour,
                        "production_w_m2": round(actual_production, 1)
                    }

                # Collect hourly pattern
                hourly_patterns[hour].append({
                    "shaded_pct": shaded_pct,
                    "production": actual_production
                })

                hourly_data.append({
                    "hour": hour,
                    "sun_azimuth": round(sun_az, 1),
                    "sun_elevation": round(sun_el, 1),
                    "irradiance": round(irradiance, 1),
                    "shaded_percent": round(shaded_pct, 1),
                    "production_w_m2": round(actual_production, 1)
                })

            # Monthly summary
            monthly_loss_pct = 0.0
            if daily_potential > 0:
                monthly_loss_pct = ((daily_potential - daily_actual) / daily_potential) * 100.0

            monthly_data.append({
                "month": day.strftime("%B"),
                "month_number": day.month,
                "potential_kwh_m2_day": round(daily_potential / 1000.0, 2),
                "actual_kwh_m2_day": round(daily_actual / 1000.0, 2),
                "loss_percent": round(monthly_loss_pct, 2),
                "hourly_data": hourly_data
            })

        # Calculate annual metrics
        annual_loss_pct = 0.0
        if total_potential_energy > 0:
            annual_loss_pct = ((total_potential_energy - total_actual_energy) / total_potential_energy) * 100.0

        peak_hours_loss_pct = 0.0
        if peak_hours_potential > 0:
            peak_hours_loss_pct = ((peak_hours_potential - peak_hours_actual) / peak_hours_potential) * 100.0

        # Analyze hourly patterns
        worst_hour = None
        worst_hour_avg_loss = 0.0
        for hour, data_points in hourly_patterns.items():
            if data_points:
                avg_shaded = sum(d["shaded_pct"] for d in data_points) / len(data_points)
                if avg_shaded > worst_hour_avg_loss:
                    worst_hour_avg_loss = avg_shaded
                    worst_hour = hour

        # Compile results
        result = {
            "plane_id": roof_plane["id"],
            "plane_name": roof_plane.get("name", f"Plane {roof_plane['id']}"),
            "roof_specifications": {
                "tilt_deg": roof_tilt,
                "azimuth_deg": roof_azimuth,
                "area_m2": round(roof_geom.area, 2)
            },
            "annual_energy_loss_percent": round(annual_loss_pct, 2),
            "peak_hours_loss_percent": round(peak_hours_loss_pct, 2),
            "annual_production_kwh_m2": round(total_actual_energy / 1000.0, 2),
            "potential_production_kwh_m2": round(total_potential_energy / 1000.0, 2),
            "worst_shading_moment": worst_shadow_time,
            "best_production_moment": best_time,
            "worst_hour_of_day": worst_hour,
            "monthly_breakdown": monthly_data,
            "recommendations": []
        }

        # Add recommendations
        if annual_loss_pct < 5:
            result["recommendations"].append("✓ Excellent solar exposure - minimal shading impact")
        elif annual_loss_pct < 15:
            result["recommendations"].append("⚠️  Moderate shading - consider obstruction trimming")
        else:
            result["recommendations"].append("❌ Significant shading losses - obstruction mitigation highly recommended")

        if peak_hours_loss_pct > annual_loss_pct * 1.5:
            result["recommendations"].append("⚠️  Peak hour shading is disproportionately high - focus on midday obstructions")

        if worst_hour:
            result["recommendations"].append(f"📊 Most affected time: {worst_hour}:00 - avg {round(worst_hour_avg_loss, 1)}% shaded")

        return result

    except Exception as e:
        return {
            "plane_id": roof_plane.get("id"),
            "plane_name": roof_plane.get("name", "Unknown"),
            "error": f"Analysis failed: {str(e)}",
            "annual_energy_loss_percent": 0.0,
            "peak_hours_loss_percent": 0.0
        }
