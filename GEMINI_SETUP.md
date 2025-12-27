# Gemini AI Vision Setup for Roof Analysis

## Overview
The roof risk analysis now uses Google's Gemini AI Vision API to automatically detect roof damage from uploaded images. This provides real AI-powered analysis instead of relying on manual survey form inputs.

## Features
- **Automatic crack detection** - Identifies surface cracks and rates severity
- **Rust/corrosion detection** - Detects metal deterioration
- **Water damage detection** - Identifies leakage signs and staining
- **Structural damage assessment** - Finds major structural issues
- **Roof type identification** - Automatically identifies roof material
- **Overall condition rating** - Provides safety recommendations

## Setup Instructions

### 1. Get Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)

**Free Tier Limits:**
- Gemini 1.5 Flash: 15 requests/minute, 1 million requests/day
- This is more than enough for typical roof analysis usage

### 2. Add API Key to Backend

1. Open `backend/.env` file
2. Find the line `GEMINI_API_KEY=`
3. Add your API key after the equals sign:
   ```
   GEMINI_API_KEY=AIzaSyD...your-key-here
   ```
4. Save the file

### 3. Restart Services

After adding the API key, restart the backend services:

**Windows:**
```bash
# Stop Celery worker (Ctrl+C in the terminal where it's running)
# Then restart it:
cd backend
.venv\Scripts\celery -A app.worker worker --loglevel=info --pool=solo
```

**Note:** You don't need to restart the FastAPI server - it will pick up the environment variable automatically.

### 4. Test It Out

1. Go to your project page
2. Click "Run Roof Risk Analysis"
3. Upload roof images (damaged roofs, cracks, rust, etc.)
4. Leave survey fields empty or fill them if you want
5. Click "Submit"
6. Wait a few seconds for AI analysis

The results will now show:
- AI-detected issues (cracks, rust, damage, etc.)
- Per-image detailed findings
- Risk assessment based on actual image content

## How It Works

1. When you upload images and click "Run Roof Risk Analysis":
   - Images are saved to `backend/storage/uploads/project_X/`
   - Celery worker task is queued

2. The worker calls Gemini Vision API for each image:
   - Sends image + analysis prompt to Gemini
   - Gemini analyzes the image for damage, cracks, rust, etc.
   - Returns structured JSON with findings

3. Results are combined:
   - AI findings from images
   - Survey data (if provided)
   - Overall risk score calculated
   - Recommendations generated

## Fallback Behavior

**Without API Key:**
- System falls back to survey-based analysis
- Only uses the form fields you manually fill out
- No AI vision analysis

**With API Key:**
- Uses AI to analyze images automatically
- Detects issues even if you don't fill survey fields
- Survey fields can supplement AI findings

## Cost & Limits

**Free Tier (Current):**
- ✅ 15 requests/minute
- ✅ 1 million requests/day
- ✅ No credit card required

**If you exceed free tier:**
- Gemini 1.5 Flash: $0.075 per 1K requests
- Very affordable for production use

## Troubleshooting

**Issue: Analysis shows "AI analysis unavailable"**
- Check that `GEMINI_API_KEY` is set in `backend/.env`
- Verify the API key is valid
- Restart Celery worker

**Issue: Analysis still shows survey-based results**
- Make sure Celery worker was restarted after adding API key
- Check worker logs for errors

**Issue: "API quota exceeded"**
- You've hit the 15 requests/minute limit
- Wait 1 minute and try again
- Consider upgrading to paid tier if needed

## Code Files

- `backend/app/services/gemini_vision.py` - Gemini API integration
- `backend/app/services/roof_risk.py` - Main analysis logic
- `backend/app/worker.py` - Celery worker task
- `backend/.env` - Configuration file

## Example API Response

When Gemini analyzes a damaged roof, it returns:
```json
{
  "visible_cracks": true,
  "crack_severity": "major",
  "rust_corrosion": false,
  "leakage_signs": true,
  "major_damage": true,
  "weak_structures": false,
  "roof_type": "concrete tile",
  "overall_condition": "poor",
  "findings": [
    "Multiple large cracks visible across the roof surface",
    "Signs of water staining indicate potential leakage",
    "Structural integrity appears compromised"
  ],
  "safety_recommendation": "Immediate professional inspection required before solar installation"
}
```

This gets converted into the risk analysis you see in the UI.
