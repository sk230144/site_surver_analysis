"""
Generate Professional Solar AI Platform Proposal PDF
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO

def create_proposal_pdf(output_path="Solar_AI_Platform_Proposal.pdf"):
    """Create a professional, concise proposal PDF"""

    # Create canvas
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    # Define colors
    primary_blue = (0.2, 0.4, 0.8)
    dark_gray = (0.2, 0.2, 0.2)
    light_gray = (0.5, 0.5, 0.5)
    green = (0.1, 0.6, 0.3)
    orange = (0.9, 0.5, 0.1)

    y = height - 60

    # ============= PAGE 1: COVER =============

    # Header Banner
    c.setFillColorRGB(0.2, 0.4, 0.8)
    c.rect(0, height - 120, width, 120, fill=True, stroke=False)

    # Title
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width/2, height - 70, "Solar AI Platform")

    c.setFont("Helvetica", 16)
    c.drawCentredString(width/2, height - 100, "Revolutionizing Solar Site Surveys with AI")

    y = height - 180

    # Tagline
    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width/2, y, "10 Minutes. Zero Site Visits. 100% Accuracy.")
    y -= 40

    # Key Stats Box
    c.setFillColorRGB(0.95, 0.95, 0.95)
    c.roundRect(80, y - 120, width - 160, 140, 10, fill=True, stroke=False)

    c.setFillColorRGB(*orange)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width/2, y - 30, "$1,500")
    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, y - 50, "Cost Per Survey (Traditional)")

    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width/4, y - 90, "5-10")
    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/4, y - 110, "Days (Traditional)")

    c.setFillColorRGB(*green)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(3*width/4, y - 90, "10 Min")
    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 14)
    c.drawCentredString(3*width/4, y - 110, "With AI")

    y -= 180

    # The Problem Section
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(60, y, "The Problem")
    y -= 30

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 11)
    problems = [
        "Traditional site surveys cost $1,500-$3,000 and take 5-10 days",
        "Manual shading analysis has 15-30% error margin",
        "Electrician visits cost $200-$500 per site",
        "Roof risk assessment is subjective and unreliable",
        "Failed inspections require expensive rework"
    ]

    for problem in problems:
        c.setFillColorRGB(0.8, 0.2, 0.2)
        c.circle(70, y + 3, 3, fill=True, stroke=False)
        c.setFillColorRGB(*dark_gray)
        c.drawString(85, y, problem)
        y -= 22

    y -= 20

    # The Solution Section
    c.setFillColorRGB(*green)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(60, y, "The Solution")
    y -= 30

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, "AI-Powered Shading Analysis")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(*light_gray)
    c.drawString(85, y - 15, "Upload 1 photo -> AI identifies obstructions -> Instant analysis")
    y -= 40

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, "AI Electrical Panel Assessment")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(*light_gray)
    c.drawString(85, y - 15, "Photo analysis replaces $500 electrician visit")
    y -= 40

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, "AI Roof Risk Analysis")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(*light_gray)
    c.drawString(85, y - 15, "Automated structural integrity assessment from photos")
    y -= 40

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, y, "NEC 2023+ Compliance Verification")
    c.setFont("Helvetica", 10)
    c.setFillColorRGB(*light_gray)
    c.drawString(85, y - 15, "Automatic code compliance checks prevent failed inspections")

    # Footer
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, 40, "Live Demo: https://site-surver-analysis.vercel.app/")

    # Page number
    c.setFillColorRGB(*light_gray)
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 60, 20, "Page 1 of 3")

    c.showPage()

    # ============= PAGE 2: WHY WE'RE DIFFERENT =============

    y = height - 80

    # Page Header
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(60, y, "Why We're Different")
    y -= 50

    # Competitive Advantages
    advantages = [
        {
            "title": "ONLY Platform with AI Vision Analysis",
            "desc": "Gemini 2.0 Flash AI analyzes photos - competitors require manual entry"
        },
        {
            "title": "No Site Visits Required",
            "desc": "Complete analysis from office using customer photos"
        },
        {
            "title": "10 Minutes vs 10 Days",
            "desc": "Instant results vs weeks of waiting for traditional surveys"
        },
        {
            "title": "Zero Human Error",
            "desc": "AI calculations are 100% consistent - no math mistakes or code violations"
        },
        {
            "title": "Works on Free Hosting",
            "desc": "Deploy on Vercel/Render free tier - no infrastructure costs"
        }
    ]

    for adv in advantages:
        # Box for each advantage
        c.setFillColorRGB(0.95, 0.97, 1.0)
        c.roundRect(60, y - 50, width - 120, 60, 8, fill=True, stroke=True)
        c.setStrokeColorRGB(*primary_blue)
        c.setLineWidth(1)

        c.setFillColorRGB(*primary_blue)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(75, y - 20, adv["title"])

        c.setFillColorRGB(*dark_gray)
        c.setFont("Helvetica", 10)
        c.drawString(75, y - 38, adv["desc"])

        y -= 75

    y -= 20

    # Current Pain Points Box
    c.setFillColorRGB(0.9, 0.2, 0.2)
    c.roundRect(60, y - 140, width - 120, 150, 10, fill=True, stroke=False)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width/2, y - 25, "Your Current Pain Points")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, y - 55, "Site Surveyor:")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 100, y - 55, "$1,500-$3,000 per site")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, y - 75, "Electrician Visit:")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 100, y - 75, "$200-$500 per site")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, y - 95, "Timeline:")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 100, y - 95, "5-10 days waiting")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, y - 115, "Shading Analysis Errors:")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 100, y - 115, "15-30% error margin")

    c.setFont("Helvetica-Bold", 16)
    c.setFillColorRGB(1, 1, 0.6)
    c.drawCentredString(width/2, y - 135, "AI Eliminates All These Costs & Delays")

    # Footer
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, 40, "Live Demo: https://site-surver-analysis.vercel.app/")

    c.setFillColorRGB(*light_gray)
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 60, 20, "Page 2 of 3")

    c.showPage()

    # ============= PAGE 3: WORKFLOW & NEXT STEPS =============

    y = height - 80

    # Page Header
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(60, y, "How It Works")
    y -= 50

    # Workflow Steps
    steps = [
        "Upload roof photo",
        "AI analyzes shading (30 seconds)",
        "Upload electrical panel photo",
        "AI assesses electrical (20 seconds)",
        "Upload roof condition photos",
        "AI evaluates roof risk (40 seconds)",
        "Draw roof planes (simple UI)",
        "System checks NEC compliance",
        "Review all results",
        "Generate professional PDF report"
    ]

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(70, y, "Traditional Workflow: 5-10 days")
    y -= 25

    c.setFillColorRGB(*green)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(70, y, "Solar AI Workflow: 10 minutes")
    y -= 35

    step_num = 1
    for step in steps:
        c.setFillColorRGB(*primary_blue)
        c.circle(75, y + 3, 8, fill=True, stroke=False)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(75, y, str(step_num))

        c.setFillColorRGB(*dark_gray)
        c.setFont("Helvetica", 11)
        c.drawString(95, y, step)

        y -= 20
        step_num += 1

    y -= 30

    # Technology Stack
    c.setFillColorRGB(*orange)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(60, y, "Powered By")
    y -= 30

    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 11)
    tech = [
        "Google Gemini 2.0 Flash AI (Vision Analysis)",
        "PVLib Python (Solar Calculations)",
        "FastAPI + PostgreSQL (Backend)",
        "Next.js + TypeScript (Frontend)",
        "Deployed on Vercel + Render (Free Tier)"
    ]

    for t in tech:
        c.setFillColorRGB(*primary_blue)
        c.circle(70, y + 3, 2, fill=True, stroke=False)
        c.setFillColorRGB(*dark_gray)
        c.drawString(85, y, t)
        y -= 18

    y -= 30

    # Sample Report Note
    c.setFillColorRGB(0.95, 0.97, 1.0)
    c.roundRect(60, y - 45, width - 120, 50, 8, fill=True, stroke=True)
    c.setStrokeColorRGB(*primary_blue)
    c.setLineWidth(1)

    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, y - 15, "Sample Report Included")
    c.setFillColorRGB(*dark_gray)
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, y - 32, "We've included a sample analysis report for your reference")

    y -= 65

    # Call to Action Box
    c.setFillColorRGB(*primary_blue)
    c.roundRect(60, y - 100, width - 120, 110, 10, fill=True, stroke=False)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width/2, y - 25, "Ready to Transform Your Business?")

    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, y - 50, "Try it live at:")

    c.setFont("Helvetica-Bold", 14)
    c.setFillColorRGB(1, 1, 0.6)
    c.drawCentredString(width/2, y - 70, "https://site-surver-analysis.vercel.app/")

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width/2, y - 92, "Contact us for a personalized demo with your project data")

    # Footer
    c.setFillColorRGB(*primary_blue)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, 40, "Live Demo: https://site-surver-analysis.vercel.app/")

    c.setFillColorRGB(*light_gray)
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 60, 20, "Page 3 of 3")

    # Save PDF
    c.save()
    print(f"PDF generated: {output_path}")

if __name__ == "__main__":
    create_proposal_pdf()
