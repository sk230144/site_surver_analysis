"""
Gemini Vision API Integration for Roof Image Analysis
Uses Google's Gemini AI to analyze roof condition from images
"""
import os
import base64
import requests
from typing import Dict, Optional
from app.core.config import settings


def analyze_roof_with_gemini(image_path: str, image_number: int) -> Dict:
    """
    Analyze a roof image using Gemini Vision API.

    Args:
        image_path: Path to the roof image file
        image_number: Image sequence number

    Returns:
        Dictionary with detected issues and findings
    """
    api_key = settings.GEMINI_API_KEY

    if not api_key:
        # Fallback to basic analysis if no API key
        return {
            "findings": [
                f"This is image #{image_number} of the roof.",
                "Gemini API key not configured - using basic analysis.",
                "Please set GEMINI_API_KEY environment variable for AI-powered analysis."
            ],
            "detected_issues": [],
            "analysis_method": "fallback"
        }

    # Read and encode image
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        return {
            "findings": [f"Error reading image: {str(e)}"],
            "detected_issues": [],
            "analysis_method": "error"
        }

    # Prepare Gemini API request
    # Use gemini-2.5-flash (latest available flash model)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    prompt = """Analyze this roof image for solar panel installation suitability. Identify any issues:

1. **Visible Cracks**: Are there any cracks in the roof surface? Rate severity as "minor" or "major"
2. **Rust/Corrosion**: Is there rust or corrosion on metal surfaces?
3. **Water Damage**: Are there signs of water leakage, staining, or discoloration?
4. **Structural Damage**: Is there sagging, holes, or major structural damage?
5. **Weak Areas**: Are there areas that look unstable or deteriorated?
6. **Roof Type**: What type of roof is this? (tile, metal, shingle, concrete, sheet, etc.)
7. **Overall Condition**: Rate as "good", "fair", or "poor"

Respond in this exact JSON format:
{
  "visible_cracks": true/false,
  "crack_severity": "minor" or "major" or "none",
  "rust_corrosion": true/false,
  "leakage_signs": true/false,
  "major_damage": true/false,
  "weak_structures": true/false,
  "roof_type": "type here",
  "overall_condition": "good/fair/poor",
  "findings": ["finding 1", "finding 2", "finding 3"],
  "safety_recommendation": "brief recommendation here"
}

Be thorough and look for subtle signs of damage."""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_data
                    }
                }
            ]
        }]
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()

        # Extract text response
        if "candidates" in result and len(result["candidates"]) > 0:
            text = result["candidates"][0]["content"]["parts"][0]["text"]

            # Try to parse JSON from response
            import json
            # Remove markdown code blocks if present
            text = text.replace("```json", "").replace("```", "").strip()

            try:
                analysis = json.loads(text)
            except json.JSONDecodeError:
                # If JSON parsing fails, return raw text
                return {
                    "findings": [
                        f"Image #{image_number} analyzed with Gemini AI:",
                        text[:500]  # First 500 chars
                    ],
                    "detected_issues": [],
                    "analysis_method": "gemini_raw"
                }

            # Convert Gemini analysis to our format
            detected_issues = []
            findings = analysis.get("findings", [])

            # Add image number to findings (without mentioning AI)
            findings.insert(0, f"Image #{image_number} Analysis:")

            # Detect issues from analysis response
            if analysis.get("visible_cracks"):
                severity = analysis.get("crack_severity", "minor")
                detected_issues.append({
                    "category": "damage",
                    "severity": "high" if severity == "major" else "medium",
                    "description": f"{severity.capitalize()} cracks detected"
                })

            if analysis.get("rust_corrosion"):
                detected_issues.append({
                    "category": "damage",
                    "severity": "medium",
                    "description": "Rust/corrosion detected"
                })

            if analysis.get("leakage_signs"):
                detected_issues.append({
                    "category": "leakage",
                    "severity": "high",
                    "description": "Water leakage signs detected"
                })

            if analysis.get("major_damage"):
                detected_issues.append({
                    "category": "damage",
                    "severity": "high",
                    "description": "Major structural damage detected"
                })

            if analysis.get("weak_structures"):
                detected_issues.append({
                    "category": "structure",
                    "severity": "high",
                    "description": "Weak structural areas detected"
                })

            # Add roof type to findings if detected
            roof_type = analysis.get("roof_type", "")
            if roof_type and roof_type.lower() != "unknown":
                findings.append(f"Roof type identified: {roof_type}")

            # Add recommendation
            if analysis.get("safety_recommendation"):
                findings.append(f"Recommendation: {analysis['safety_recommendation']}")

            return {
                "findings": findings,
                "detected_issues": detected_issues,
                "analysis_method": "gemini_vision",
                "gemini_data": analysis
            }

        else:
            return {
                "findings": [f"Image #{image_number}: Gemini API returned no analysis"],
                "detected_issues": [],
                "analysis_method": "gemini_error"
            }

    except requests.exceptions.RequestException as e:
        return {
            "findings": [
                f"Image #{image_number}: Error calling Gemini API",
                f"Error: {str(e)}"
            ],
            "detected_issues": [],
            "analysis_method": "api_error"
        }
    except Exception as e:
        return {
            "findings": [
                f"Image #{image_number}: Unexpected error",
                f"Error: {str(e)}"
            ],
            "detected_issues": [],
            "analysis_method": "error"
        }


def analyze_shading_with_gemini(image_path: str, roof_planes: list, obstructions: list, latitude: float = None, longitude: float = None) -> Dict:
    """
    Analyze shading using Gemini Vision AI by looking at the geometry editor image.

    Args:
        image_path: Path to the geometry editor screenshot showing panels (green) and obstructions (red)
        roof_planes: List of roof plane data with tilt_deg, azimuth_deg
        obstructions: List of obstruction data with type, height_m
        latitude: Project latitude for sun path analysis
        longitude: Project longitude for sun path analysis

    Returns:
        Dictionary with AI-powered shading analysis
    """
    api_key = settings.GEMINI_API_KEY

    if not api_key:
        return {
            "error": "Gemini API key not configured",
            "analysis_method": "fallback"
        }

    # Read and encode image
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        return {
            "error": f"Error reading image: {str(e)}",
            "analysis_method": "error"
        }

    # Build context about roof planes and obstructions
    roof_context = []
    for plane in roof_planes:
        roof_context.append(f"- {plane.get('name', 'Roof')}: Tilt {plane.get('tilt_deg', 0)}°, Azimuth {plane.get('azimuth_deg', 180)}°")

    obs_context = []
    for obs in obstructions:
        obs_context.append(f"- {obs.get('type', 'obstruction').capitalize()}: Height {obs.get('height_m', 3)}m")

    location_context = ""
    if latitude and longitude:
        location_context = f"\n\nProject Location: Latitude {latitude}°, Longitude {longitude}°"

    # Prepare comprehensive prompt for shading analysis
    prompt = f"""Analyze this solar panel layout for SHADING IMPACT from obstructions.

**Image Understanding:**
- GREEN areas = Solar panels on roof
- RED areas = Obstructions (trees, chimneys, etc.)

**Roof Information:**
{chr(10).join(roof_context) if roof_context else "- Standard roof"}

**Obstructions:**
{chr(10).join(obs_context) if obs_context else "- No obstruction data provided"}
{location_context}

**Your Task:**
Analyze the visual relationship between the RED obstructions and GREEN solar panels to estimate annual shading impact.

Consider:
1. **Proximity**: How close are obstructions to panels?
2. **Obstruction Height**: Taller objects cast longer shadows
3. **Sun Path**: In the northern hemisphere, sun travels from east → south → west. Southern exposure gets most sun.
4. **Roof Orientation**: Azimuth 180° = facing south (best for solar)
5. **Daily/Seasonal Patterns**: Morning shadows from east, evening from west, winter shadows longer

**Respond in JSON format:**
{{
  "overall_shade_risk_score": 0-100,
  "estimated_annual_loss_percent": 0-25,
  "analysis_confidence": "high/medium/low",
  "findings": [
    "Finding 1: Describe spatial relationship between obstructions and panels",
    "Finding 2: Estimate when shadows will impact panels (morning/afternoon/all-day)",
    "Finding 3: Assess severity (minimal/moderate/significant)"
  ],
  "dominant_obstruction": {{
    "type": "tree/chimney/etc",
    "relative_position": "north/south/east/west of panels",
    "shadow_impact": "description of shadow impact",
    "affected_panel_percentage": 0-100
  }},
  "time_of_day_impact": {{
    "morning_6am_9am": "none/low/medium/high",
    "midday_9am_3pm": "none/low/medium/high",
    "afternoon_3pm_6pm": "none/low/medium/high"
  }},
  "seasonal_impact": {{
    "summer": "none/low/medium/high",
    "winter": "none/low/medium/high"
  }},
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}}

Be realistic and practical. If obstructions are far from panels, shade risk should be LOW. If obstructions are directly adjacent or overlapping panels, shade risk should be HIGH."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/png",
                        "data": image_data
                    }
                }
            ]
        }]
    }

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()

        if "candidates" in result and len(result["candidates"]) > 0:
            text = result["candidates"][0]["content"]["parts"][0]["text"]

            # Parse JSON response
            import json
            text = text.replace("```json", "").replace("```", "").strip()

            try:
                analysis = json.loads(text)
                analysis["analysis_method"] = "gemini_vision"
                analysis["raw_response"] = text[:500]  # Keep first 500 chars for debugging
                return analysis
            except json.JSONDecodeError:
                return {
                    "error": "Failed to parse AI response",
                    "raw_text": text[:500],
                    "analysis_method": "gemini_parse_error"
                }
        else:
            return {
                "error": "No analysis returned from Gemini",
                "analysis_method": "gemini_no_result"
            }

    except requests.exceptions.RequestException as e:
        return {
            "error": f"API request failed: {str(e)}",
            "analysis_method": "api_error"
        }
    except Exception as e:
        return {
            "error": f"Unexpected error: {str(e)}",
            "analysis_method": "error"
        }
