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
