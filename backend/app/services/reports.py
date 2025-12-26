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
    if y < 150:
        c.showPage()
        y = height - 50

    y -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Analysis Results")
    y -= 25

    for r in analyses[:20]:
        kind = r.get('kind', 'unknown')
        status = r.get('status', 'pending')
        result = r.get('result', {})

        # Check if we need a new page
        if y < 150:
            c.showPage()
            y = height - 50

        # Analysis header
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"{kind.upper()} Analysis")
        y -= 18

        # Show detailed results for shading analysis
        if kind == "shading" and status == "done" and result:
            c.setFont("Helvetica", 10)

            # Overall summary
            avg_risk = result.get('average_shade_risk', 0)
            total_planes = result.get('total_roof_planes', 0)
            total_obs = result.get('total_obstructions', 0)

            c.drawString(60, y, f"Summary: {total_planes} roof plane(s), {total_obs} obstruction(s)")
            y -= 14

            # Check if using advanced analysis (has annual_energy_loss_percent in planes)
            planes = result.get('planes', [])
            is_advanced = any(plane.get('annual_energy_loss_percent') is not None for plane in planes)

            if is_advanced:
                # Show overall shading level for advanced analysis
                avg_loss = result.get('average_annual_energy_loss', 0)
                overall_level = "High" if avg_loss > 15 else "Medium" if avg_loss > 5 else "Low"
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Overall Shading Level: ")
                c.setFillColorRGB(0.8, 0, 0) if avg_loss > 15 else c.setFillColorRGB(0.9, 0.5, 0) if avg_loss > 5 else c.setFillColorRGB(0, 0.6, 0)
                c.drawString(180, y, f"{overall_level}")
                c.setFillColorRGB(0, 0, 0)
                c.setFont("Helvetica", 9)
                c.drawString(220, y, f"(Avg {avg_loss}% loss)")
                y -= 18
            elif not is_advanced and avg_risk:
                c.drawString(60, y, f"Average Shade Risk Score: {avg_risk}/100")
                y -= 18

            # Per-plane results
            for plane in planes[:5]:  # Show up to 5 planes
                if y < 100:
                    c.showPage()
                    y = height - 50

                plane_name = plane.get('plane_name', 'Unnamed')

                # Advanced analysis output
                if plane.get('annual_energy_loss_percent') is not None:
                    c.setFont("Helvetica-Bold", 11)
                    c.drawString(70, y, f"• {plane_name}")
                    y -= 15

                    # Key metrics
                    annual_loss = plane.get('annual_energy_loss_percent', 0)
                    peak_loss = plane.get('peak_hours_loss_percent', 0)
                    annual_prod = plane.get('annual_production_kwh_m2', 0)
                    potential_prod = plane.get('potential_production_kwh_m2', 0)

                    # Determine shading level and production quality
                    shading_level = "High" if annual_loss > 15 else "Medium" if annual_loss > 5 else "Low"
                    production_ratio = annual_prod / potential_prod if potential_prod > 0 else 0
                    production_quality = "Excellent" if production_ratio > 0.95 else "Good" if production_ratio > 0.85 else "Average" if production_ratio > 0.70 else "Poor"

                    # Shading Level with color
                    c.setFont("Helvetica-Bold", 9)
                    c.drawString(85, y, "Shading Level: ")
                    c.setFillColorRGB(0.8, 0, 0) if annual_loss > 15 else c.setFillColorRGB(0.9, 0.5, 0) if annual_loss > 5 else c.setFillColorRGB(0, 0.6, 0)
                    c.drawString(160, y, f"{shading_level}")
                    c.setFillColorRGB(0, 0, 0)
                    c.setFont("Helvetica", 8)
                    c.drawString(200, y, f"({annual_loss}% annual loss)")
                    y -= 12

                    # Production Quality
                    c.setFont("Helvetica-Bold", 9)
                    c.drawString(85, y, "Expected Production: ")
                    prod_color = (0, 0.6, 0) if production_ratio > 0.95 else (0.2, 0.4, 0.8) if production_ratio > 0.85 else (0.9, 0.5, 0) if production_ratio > 0.70 else (0.8, 0, 0)
                    c.setFillColorRGB(*prod_color)
                    c.drawString(180, y, f"{production_quality}")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 11

                    c.setFont("Helvetica", 9)
                    c.drawString(85, y, f"Power loss during strongest sunlight hours (10AM-4PM): {peak_loss}%")
                    y -= 13

                    # Worst shading moment
                    worst = plane.get('worst_shading_moment')
                    if worst and worst.get('timestamp'):
                        c.setFillColorRGB(0.4, 0, 0)
                        c.drawString(85, y, f"⚠ Worst: {worst.get('timestamp')} - {worst.get('shaded_percent', 0):.1f}% shaded")
                        c.setFillColorRGB(0, 0, 0)
                        y -= 11

                    # Best production moment
                    best = plane.get('best_production_moment')
                    if best and best.get('timestamp'):
                        c.setFillColorRGB(0, 0.4, 0)
                        c.drawString(85, y, f"✓ Best: {best.get('timestamp')} - {best.get('irradiance_w_m2', 0):.0f} W/m²")
                        c.setFillColorRGB(0, 0, 0)
                        y -= 13

                    # Recommendations
                    recommendations = plane.get('recommendations', [])
                    if recommendations:
                        c.setFont("Helvetica-Bold", 9)
                        c.drawString(85, y, "Recommendations:")
                        y -= 11
                        c.setFont("Helvetica", 8)
                        for rec in recommendations[:3]:  # Show up to 3 recommendations
                            if y < 50:
                                c.showPage()
                                y = height - 50
                            # Remove emoji for cleaner PDF
                            rec_text = rec.replace('✓', '').replace('⚠️', '').replace('❌', '').replace('📊', '').strip()
                            c.drawString(95, y, f"• {rec_text[:70]}")
                            y -= 10

                    y -= 8  # Extra spacing between planes

                # Simple/legacy analysis output
                else:
                    risk_score = plane.get('shade_risk_score', 0)
                    loss_pct = plane.get('estimated_annual_loss_percent', 0)

                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(70, y, f"• {plane_name}")
                    y -= 13

                    c.setFont("Helvetica", 9)
                    c.drawString(85, y, f"Shade Risk: {risk_score}/100 | Est. Annual Loss: {loss_pct}%")
                    y -= 11

                    # Dominant obstruction
                    dom_obs = plane.get('dominant_obstruction')
                    if dom_obs:
                        obs_type = dom_obs.get('type', 'unknown')
                        obs_height = dom_obs.get('height_m', 0)
                        obs_distance = dom_obs.get('distance_m', 0)
                        c.setFillColorRGB(0.4, 0.4, 0.4)
                        c.drawString(85, y, f"Dominant: {obs_type} ({obs_height}m tall, {obs_distance}m away)")
                        c.setFillColorRGB(0, 0, 0)
                        y -= 11

                    # Notes
                    notes = plane.get('notes', [])
                    if notes:
                        first_note = notes[0] if notes else ""
                        if first_note:
                            c.setFillColorRGB(0.3, 0.3, 0.3)
                            c.drawString(85, y, first_note[:80])  # Truncate long notes
                            c.setFillColorRGB(0, 0, 0)
                            y -= 11

                    y -= 6  # Extra spacing between planes

            # Add overall recommendation at the end of advanced analysis
            if is_advanced:
                if y < 80:
                    c.showPage()
                    y = height - 50

                y -= 10
                avg_loss = result.get('average_annual_energy_loss', 0)

                # Recommendation box
                c.setStrokeColorRGB(0.8, 0, 0) if avg_loss > 15 else c.setStrokeColorRGB(0.9, 0.5, 0) if avg_loss > 5 else c.setStrokeColorRGB(0, 0.6, 0)
                c.setLineWidth(2)
                c.rect(55, y - 35, 500, 40)
                c.setStrokeColorRGB(0, 0, 0)
                c.setLineWidth(1)

                c.setFont("Helvetica-Bold", 10)
                recommendation_icon = "WARNING" if avg_loss > 15 else "INFO" if avg_loss > 5 else "CHECK"
                c.drawString(65, y - 10, f"{recommendation_icon} - RECOMMENDATION:")
                y -= 20

                c.setFont("Helvetica", 9)
                recommendation_text = ""
                if avg_loss > 15:
                    recommendation_text = "Significant shading detected. Consider obstruction mitigation before installation to maximize ROI."
                elif avg_loss > 5:
                    recommendation_text = "Moderate shading present. Site is suitable for solar with expected performance reduction."
                else:
                    recommendation_text = "Excellent site conditions! Minimal shading impact - ideal for solar installation."

                c.drawString(65, y - 10, recommendation_text)
                y -= 40

        # Compliance analysis - detailed display
        elif kind == "compliance" and status == "done" and result:
            overall_status = result.get('overall_status', 'unknown')
            score = result.get('compliance_score', 0)
            violations = result.get('violations', [])

            # Status header with color
            status_color = (0, 0.6, 0) if overall_status == 'pass' else (0.9, 0.5, 0) if overall_status == 'warning' else (0.8, 0, 0)
            c.setFont("Helvetica-Bold", 12)
            c.setFillColorRGB(*status_color)
            status_label = "PASS" if overall_status == 'pass' else "WARNING" if overall_status == 'warning' else "FAIL"
            c.drawString(60, y, f"Compliance Status: {status_label}")
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(300, y, f"Score: {score}/100")
            y -= 18

            # Summary
            summary = result.get('summary', '')
            if summary:
                c.setFont("Helvetica", 9)
                c.drawString(60, y, summary[:100])
                y -= 14

            # Violations
            if violations:
                y -= 5
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, f"Issues Found ({len(violations)}):")
                y -= 16

                for violation in violations[:5]:  # Show up to 5 violations
                    if y < 120:
                        c.showPage()
                        y = height - 50

                    severity = violation.get('severity', 'low')
                    sev_color = (0.8, 0, 0) if severity == 'high' else (0.9, 0.5, 0) if severity == 'medium' else (0.4, 0.4, 0.4)

                    # Rule name with severity
                    c.setFont("Helvetica-Bold", 9)
                    c.drawString(70, y, f"• {violation.get('rule_name', 'Unknown')}")
                    c.setFillColorRGB(*sev_color)
                    c.setFont("Helvetica", 8)
                    c.drawString(300, y, f"[{severity.upper()}]")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 12

                    # Affected plane
                    if violation.get('affected_plane'):
                        c.setFont("Helvetica", 8)
                        c.setFillColorRGB(0.4, 0.4, 0.4)
                        c.drawString(85, y, f"Roof: {violation['affected_plane']}")
                        c.setFillColorRGB(0, 0, 0)
                        y -= 10

                    # Message
                    c.setFont("Helvetica", 8)
                    message = violation.get('message', '')
                    c.drawString(85, y, f"Issue: {message[:80]}")
                    y -= 10

                    # Fix suggestion
                    c.setFillColorRGB(0.2, 0.4, 0.8)
                    fix = violation.get('fix_suggestion', '')
                    c.drawString(85, y, f"Fix: {fix[:80]}")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 14

                if len(violations) > 5:
                    c.setFont("Helvetica", 8)
                    c.setFillColorRGB(0.4, 0.4, 0.4)
                    c.drawString(70, y, f"+ {len(violations) - 5} more issues...")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 12

            # Checked planes info
            checked = result.get('checked_planes', 0)
            total = result.get('total_planes', 0)
            c.setFont("Helvetica", 8)
            c.setFillColorRGB(0.4, 0.4, 0.4)
            c.drawString(60, y, f"Checked {checked} of {total} roof plane(s) with layouts")
            c.setFillColorRGB(0, 0, 0)
            y -= 12

        # Other analysis types - simple status display
        elif kind in ["roof_risk", "electrical"]:
            c.setFont("Helvetica", 10)
            c.drawString(60, y, f"Status: {status}")
            y -= 14

            # Show summary if available
            summary = result.get('summary', '')
            if summary:
                c.setFillColorRGB(0.3, 0.3, 0.3)
                c.drawString(60, y, summary[:100])  # Truncate
                c.setFillColorRGB(0, 0, 0)
                y -= 14
        else:
            # Fallback for unknown analysis types
            c.setFont("Helvetica", 10)
            c.drawString(60, y, f"Status: {status}")
            y -= 14

        y -= 10  # Space between different analyses

    c.showPage()
    c.save()
    return buf.getvalue()
