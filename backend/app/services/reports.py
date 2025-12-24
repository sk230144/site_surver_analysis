from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pathlib import Path
import os

def build_minimal_report(project, assets, analyses) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    y = height - 50

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "Solar AI Platform — Project Report (Starter)")
    y -= 30
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Project: {project.get('name')} (ID: {project.get('id')})")
    y -= 16
    c.drawString(50, y, f"Address: {project.get('address') or '-'}")
    y -= 30

    # Assets section with images
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Assets")
    y -= 20

    # Base path for uploaded files
    base_path = Path(__file__).parent.parent.parent / "storage" / "uploads"

    for a in assets[:20]:
        storage_url = a.get('storage_url', '')
        kind = a.get('kind', '')
        filename = a.get('filename', '')
        content_type = a.get('content_type', '')

        # Check if we need a new page
        if y < 200:
            c.showPage()
            y = height - 50

        # Build clickable URL for the asset
        asset_url = f"http://localhost:8000{storage_url}"

        # Try to embed image if it's a photo
        if content_type and content_type.startswith('image/'):
            try:
                # Convert storage URL to file path
                # storage_url looks like: /uploads/project_7/uuid.jpg
                file_path = str(base_path / storage_url.replace('/uploads/', ''))

                if os.path.exists(file_path):
                    # Draw image thumbnail
                    img = ImageReader(file_path)
                    img_width = 150
                    img_height = 150
                    c.drawImage(img, 60, y - img_height, width=img_width, height=img_height, preserveAspectRatio=True)

                    # Draw filename and clickable link next to image
                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(220, y - 10, f"[{kind}]")
                    c.setFont("Helvetica", 9)
                    c.drawString(220, y - 25, filename)

                    # Add clickable link
                    c.setFillColorRGB(0, 0, 1)  # Blue color
                    c.drawString(220, y - 40, "View Image")
                    c.linkURL(asset_url, (220, y - 45, 280, y - 35), relative=0)
                    c.setFillColorRGB(0, 0, 0)  # Reset to black

                    y -= img_height + 20
                else:
                    # Fallback if file doesn't exist
                    c.setFont("Helvetica", 10)
                    c.drawString(60, y, f"- [{kind}] {filename} (image not found)")
                    y -= 12
            except Exception as e:
                # Fallback on error
                c.setFont("Helvetica", 10)
                c.drawString(60, y, f"- [{kind}] {filename} (error loading image)")
                y -= 12
        else:
            # Non-image assets - show text with clickable link
            c.setFont("Helvetica-Bold", 10)
            c.drawString(60, y, f"[{kind}]")
            c.setFont("Helvetica", 9)
            c.drawString(110, y, filename)
            y -= 14

            # Add clickable download/view link
            c.setFillColorRGB(0, 0, 1)  # Blue color
            link_text = "Download PDF" if content_type == "application/pdf" else f"Download {kind}"
            c.drawString(70, y, link_text)
            c.linkURL(asset_url, (70, y - 2, 170, y + 10), relative=0)
            c.setFillColorRGB(0, 0, 0)  # Reset to black
            y -= 16

    # Analyses section
    if y < 100:
        c.showPage()
        y = height - 50

    y -= 10
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Analyses")
    y -= 16
    c.setFont("Helvetica", 10)

    for r in analyses[:20]:
        if y < 80:
            c.showPage()
            y = height - 50
        c.drawString(60, y, f"- {r.get('kind')} : {r.get('status')}")
        y -= 12

    c.showPage()
    c.save()
    return buf.getvalue()
