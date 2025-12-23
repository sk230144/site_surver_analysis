from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def build_minimal_report(project, assets, analyses) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    y = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "Solar AI Platform — Project Report (Starter)")
    y -= 30
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Project: {project.get('name')} (ID: {project.get('id')})")
    y -= 16
    c.drawString(50, y, f"Address: {project.get('address') or '-'}")
    y -= 22
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Assets")
    y -= 16
    c.setFont("Helvetica", 10)
    for a in assets[:20]:
        c.drawString(60, y, f"- [{a.get('kind')}] {a.get('filename')}")
        y -= 12
        if y < 80:
            c.showPage()
            y = height - 50
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Analyses")
    y -= 16
    c.setFont("Helvetica", 10)
    for r in analyses[:20]:
        c.drawString(60, y, f"- {r.get('kind')} : {r.get('status')}")
        y -= 12
        if y < 80:
            c.showPage()
            y = height - 50
    c.showPage()
    c.save()
    return buf.getvalue()
