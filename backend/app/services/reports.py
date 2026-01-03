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

    # Assets section - only show if we have valid embeddable images
    # Use absolute path to ensure it works regardless of working directory
    base_path = Path(__file__).parent.parent.parent / "storage"
    print(f"DEBUG: Initial base_path from __file__: {base_path}, exists: {base_path.exists()}")

    # Fallback: if base_path doesn't exist, try relative to cwd
    if not base_path.exists():
        base_path = Path("backend/storage")
        print(f"DEBUG: Trying backend/storage: {base_path}, exists: {base_path.exists()}")
    if not base_path.exists():
        base_path = Path("storage")
        print(f"DEBUG: Trying storage: {base_path}, exists: {base_path.exists()}")

    print(f"DEBUG: Final base_path: {base_path.resolve()}")

    # Collect valid assets that can be displayed
    valid_assets = []
    for a in assets[:20]:
        storage_url = a.get('storage_url', '')
        kind = a.get('kind', '')
        filename = a.get('filename', '')
        content_type = a.get('content_type', '')

        if content_type and content_type.startswith('image/'):
            try:
                # storage_url format: /storage/uploads/project_2/roof_xyz.jpg
                file_path = str(base_path / storage_url.replace('/storage/', ''))
                print(f"DEBUG: Checking image: {filename}")
                print(f"DEBUG: storage_url: {storage_url}")
                print(f"DEBUG: file_path: {file_path}")
                print(f"DEBUG: exists: {os.path.exists(file_path)}")

                if os.path.exists(file_path):
                    valid_assets.append({
                        'file_path': file_path,
                        'kind': kind,
                        'filename': filename,
                        'storage_url': storage_url
                    })
                    print(f"DEBUG: ✓ Added to valid_assets")
                else:
                    print(f"DEBUG: ✗ Image not found, skipping")
            except Exception as e:
                print(f"DEBUG: Error processing image {filename}: {e}")
                pass  # Skip invalid
        elif kind and content_type:  # Non-image files
            valid_assets.append({
                'file_path': None,
                'kind': kind,
                'filename': filename,
                'storage_url': storage_url,
                'content_type': content_type
            })

    # Only show section if we have valid displayable assets
    if valid_assets:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "Project Assets")
        y -= 20

        for asset in valid_assets:
            if y < 200:
                c.showPage()
                y = height - 50

            asset_url = f"http://localhost:8000{asset['storage_url']}"

            if asset['file_path']:  # Image asset
                try:
                    print(f"DEBUG: Trying to embed image from: {asset['file_path']}")
                    img = ImageReader(asset['file_path'])
                    img_width = 150
                    img_height = 150
                    print(f"DEBUG: Drawing image at y={y}")
                    c.drawImage(img, 60, y - img_height, width=img_width, height=img_height, preserveAspectRatio=True)

                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(220, y - 10, f"[{asset['kind']}]")
                    c.setFont("Helvetica", 9)
                    c.drawString(220, y - 25, asset['filename'][:40])

                    c.setFillColorRGB(0, 0, 1)
                    c.drawString(220, y - 40, "View Full Size")
                    c.linkURL(asset_url, (220, y - 45, 300, y - 35), relative=0)
                    c.setFillColorRGB(0, 0, 0)

                    y -= img_height + 20
                    print(f"DEBUG: ✓ Successfully embedded image, new y={y}")
                except Exception as e:
                    print(f"DEBUG: ✗ Error embedding image: {e}")
                    import traceback
                    traceback.print_exc()
                    pass  # Skip if embedding fails
            else:  # Non-image
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, f"[{asset['kind']}]")
                c.setFont("Helvetica", 9)
                c.drawString(110, y, asset['filename'][:50])
                y -= 14

                c.setFillColorRGB(0, 0, 1)
                c.drawString(70, y, "Download")
                c.linkURL(asset_url, (70, y - 2, 130, y + 10), relative=0)
                c.setFillColorRGB(0, 0, 0)
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

        # Analysis header (skip for electrical - it has custom header)
        if kind != "electrical":
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, f"{kind.upper()} Analysis")
            y -= 18

        # Show detailed results for shading analysis
        if kind == "shading" and status == "done" and result:
            c.setFont("Helvetica", 10)

            # Helper function to remove emojis from text for PDF (define early)
            import re
            def remove_emojis(text):
                if isinstance(text, str):
                    # Remove all emojis and other non-ASCII characters
                    return re.sub(r'[^\x00-\x7F]+', '', text).strip()
                return text

            # Recursively clean all strings in the result to remove emojis
            def clean_dict(obj):
                if isinstance(obj, dict):
                    return {k: clean_dict(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [clean_dict(item) for item in obj]
                elif isinstance(obj, str):
                    return remove_emojis(obj)
                return obj

            # Clean the entire result to remove all emojis
            result = clean_dict(result)

            # Check if this is hybrid AI+Math analysis
            analysis_method = result.get('analysis_method')

            # DEBUG: Write to file to check what's happening
            import datetime
            with open("pdf_debug.log", "a") as f:
                f.write(f"\n{datetime.datetime.now()}: PDF Generation Debug\n")
                f.write(f"  analysis_method = {analysis_method}\n")
                f.write(f"  result keys = {list(result.keys())}\n")

            is_hybrid = analysis_method == 'hybrid_math_ai'

            with open("pdf_debug.log", "a") as f:
                f.write(f"  is_hybrid = {is_hybrid}\n")

            if is_hybrid:
                # USER-FRIENDLY HYBRID ANALYSIS DISPLAY
                shading_score = result.get('hybrid_shade_risk_score', 0)
                findings = result.get('ai_analysis', {}).get('findings', [])
                time_of_day = result.get('ai_analysis', {}).get('time_of_day_impact', {})
                seasonal = result.get('ai_analysis', {}).get('seasonal_impact', {})
                recommendations = result.get('ai_analysis', {}).get('recommendations', [])
                assessment = result.get('final_assessment', {})
                energy_loss = assessment.get('estimated_annual_loss_percent', 0)
                dominant_obs = assessment.get('dominant_obstruction', {})

                # Determine shading level in simple language
                shading_level = "High" if shading_score > 70 else "Moderate" if shading_score > 40 else "Low"
                shading_color = (0.8, 0, 0) if shading_score > 70 else (0.9, 0.5, 0) if shading_score > 40 else (0, 0.6, 0)
                shading_icon = "!" if shading_score > 70 else "~" if shading_score > 40 else "✓"

                # Main Summary Box
                c.setFont("Helvetica-Bold", 12)
                c.setFillColorRGB(*shading_color)
                c.drawString(60, y, f"{shading_icon} Shading Impact: {shading_level}")
                c.setFillColorRGB(0, 0, 0)
                y -= 18

                # Expected Energy Loss
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Expected Energy Loss:")
                loss_color = (0.8, 0, 0) if energy_loss > 15 else (0.9, 0.5, 0) if energy_loss > 8 else (0, 0.6, 0)
                c.setFillColorRGB(*loss_color)
                c.setFont("Helvetica-Bold", 11)
                c.drawString(180, y, f"{energy_loss}% per year")
                c.setFillColorRGB(0, 0, 0)
                y -= 18

                # Main Issue (Dominant Obstruction)
                if dominant_obs:
                    c.setFont("Helvetica", 9)
                    obs_type = dominant_obs.get('type', 'Obstruction')
                    impact_time = dominant_obs.get('primary_impact_time', '')
                    impact_desc = ""
                    if impact_time == 'morning_and_afternoon':
                        impact_desc = "in morning and afternoon"
                    elif impact_time == 'midday':
                        impact_desc = "during peak sun hours"
                    else:
                        impact_desc = "throughout the day"
                    c.setFillColorRGB(0.4, 0.4, 0.4)
                    c.drawString(60, y, f"Main Issue: {obs_type} causing shadows {impact_desc}")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 16

                y -= 8

                # What We Found
                if findings:
                    if y < 150:
                        c.showPage()
                        y = height - 50

                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(60, y, "What We Found:")
                    y -= 14

                    c.setFont("Helvetica", 9)
                    for finding in findings[:3]:  # Show up to 3 findings
                        if y < 50:
                            c.showPage()
                            y = height - 50

                        # Word wrap long findings (emojis already removed)
                        words = finding.split()
                        line = ""
                        for word in words:
                            test_line = line + word + " "
                            if len(test_line) > 75:
                                c.drawString(70, y, f"- {line.strip()}")
                                y -= 11
                                line = word + " "
                            else:
                                line = test_line
                        if line:
                            c.drawString(70, y, f"- {line.strip()}")
                            y -= 11

                    y -= 8

                # When Shadows Affect Your Panels
                if time_of_day:
                    if y < 120:
                        c.showPage()
                        y = height - 50

                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(60, y, "When Shadows Affect Your Panels:")
                    y -= 14

                    c.setFont("Helvetica", 9)

                    morning = time_of_day.get('morning_6_9am', '')
                    if morning:
                        morning_text = "Heavy shade" if morning == 'high' else "Some shade" if morning == 'medium' else "Light shade" if morning == 'low' else "No shade"
                        c.drawString(70, y, f"Morning (6-9 AM): {morning_text}")
                        y -= 12

                    midday = time_of_day.get('midday_9am_3pm', '')
                    if midday:
                        midday_text = "Heavy shade" if midday == 'high' else "Some shade" if midday == 'medium' else "Light shade" if midday == 'low' else "No shade"
                        c.drawString(70, y, f"Peak Hours (9 AM-3 PM): {midday_text}")
                        y -= 12

                    afternoon = time_of_day.get('afternoon_3_6pm', '')
                    if afternoon:
                        afternoon_text = "Heavy shade" if afternoon == 'high' else "Some shade" if afternoon == 'medium' else "Light shade" if afternoon == 'low' else "No shade"
                        c.drawString(70, y, f"Afternoon (3-6 PM): {afternoon_text}")
                        y -= 12

                    y -= 8

                # Throughout the Year
                if seasonal:
                    if y < 100:
                        c.showPage()
                        y = height - 50

                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(60, y, "Throughout the Year:")
                    y -= 14

                    c.setFont("Helvetica", 9)

                    summer = seasonal.get('summer', '')
                    if summer:
                        summer_text = "Heavy shading" if summer == 'high' else "Moderate shading" if summer == 'medium' else "Light shading" if summer == 'low' else "No shading"
                        c.drawString(70, y, f"Summer: {summer_text}")
                        y -= 12

                    winter = seasonal.get('winter', '')
                    if winter:
                        winter_text = "Heavy shading" if winter == 'high' else "Moderate shading" if winter == 'medium' else "Light shading" if winter == 'low' else "No shading"
                        c.drawString(70, y, f"Winter: {winter_text}")
                        y -= 12

                    y -= 8

                # What You Should Do / Our Recommendations
                if recommendations:
                    if y < 120:
                        c.showPage()
                        y = height - 50

                    c.setFont("Helvetica-Bold", 10)
                    header_text = "What You Should Do:" if shading_score > 50 else "Our Recommendations:"
                    header_color = (0.8, 0, 0) if shading_score > 50 else (0.2, 0.4, 0.8)
                    c.setFillColorRGB(*header_color)
                    c.drawString(60, y, header_text)
                    c.setFillColorRGB(0, 0, 0)
                    y -= 14

                    c.setFont("Helvetica", 9)
                    for rec in recommendations[:3]:  # Show up to 3 recommendations
                        if y < 50:
                            c.showPage()
                            y = height - 50

                        # Word wrap recommendations (emojis already removed)
                        words = rec.split()
                        line = ""
                        for word in words:
                            test_line = line + word + " "
                            if len(test_line) > 75:
                                c.drawString(70, y, f"- {line.strip()}")
                                y -= 11
                                line = word + " "
                            else:
                                line = test_line
                        if line:
                            c.drawString(70, y, f"- {line.strip()}")
                            y -= 11

                    y -= 10

            else:
                # LEGACY/NON-HYBRID ANALYSIS (fallback)
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
                            c.drawString(85, y, f"WARNING - Worst: {worst.get('timestamp')} - {worst.get('shaded_percent', 0):.1f}% shaded")
                            c.setFillColorRGB(0, 0, 0)
                            y -= 11

                        # Best production moment
                        best = plane.get('best_production_moment')
                        if best and best.get('timestamp'):
                            c.setFillColorRGB(0, 0.4, 0)
                            c.drawString(85, y, f"GOOD - Best: {best.get('timestamp')} - {best.get('irradiance_w_m2', 0):.0f} W/m²")
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

        # Roof Risk analysis - detailed display with per-image analysis
        elif kind == "roof_risk" and status == "done" and result:
            overall_status = result.get('overall_status', 'unknown')
            risk_score = result.get('risk_score', 0)
            reasons = result.get('reasons', [])
            recommendation = result.get('recommendation', '')
            per_image_analysis = result.get('per_image_analysis', [])
            survey_data = result.get('survey_data', {})

            # Status header with color
            status_color = (0, 0.6, 0) if overall_status == 'safe' else (0.9, 0.5, 0) if overall_status == 'needs_inspection' else (0.8, 0, 0)
            c.setFont("Helvetica-Bold", 12)
            c.setFillColorRGB(*status_color)
            status_label = "SAFE" if overall_status == 'safe' else "NEEDS INSPECTION" if overall_status == 'needs_inspection' else "HIGH RISK"
            c.drawString(60, y, f"Roof Risk: {status_label}")
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(300, y, f"Risk Score: {risk_score}/100")
            y -= 18

            # Survey data summary
            if survey_data:
                y -= 5
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Survey Information:")
                y -= 14

                c.setFont("Helvetica", 8)
                if survey_data.get('roof_age'):
                    c.drawString(70, y, f"• Roof Age: {survey_data['roof_age']}")
                    y -= 11
                if survey_data.get('roof_type'):
                    c.drawString(70, y, f"• Roof Type: {survey_data['roof_type'].capitalize()}")
                    y -= 11
                if survey_data.get('slope_angle'):
                    c.drawString(70, y, f"• Slope Angle: {survey_data['slope_angle']}°")
                    y -= 11

                y -= 6

            # Reasons - clean up duplicate "Image X:" prefixes
            if reasons:
                y -= 5
                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Key Risk Factors:")
                y -= 14

                c.setFont("Helvetica", 9)
                # Group reasons by removing duplicate image prefixes
                cleaned_reasons = []
                seen = set()
                for reason in reasons[:8]:  # Check up to 8
                    # Remove "Image X:" prefix if present
                    cleaned = reason
                    if cleaned.startswith("Image"):
                        parts = cleaned.split(":", 1)
                        if len(parts) > 1:
                            cleaned = parts[1].strip()

                    # Only add if not duplicate
                    if cleaned not in seen:
                        seen.add(cleaned)
                        cleaned_reasons.append(cleaned)

                # Show top 4 unique reasons
                for reason in cleaned_reasons[:4]:
                    if y < 80:
                        c.showPage()
                        y = height - 50

                    c.drawString(70, y, f"• {reason[:80]}")
                    y -= 12

                y -= 8

            # Recommendation box - formatted with Action/Reason/Next step
            if recommendation:
                if y < 100:
                    c.showPage()
                    y = height - 50

                c.setFont("Helvetica-Bold", 10)
                c.setFillColorRGB(*status_color)
                c.drawString(60, y, "Recommended Actions:")
                c.setFillColorRGB(0, 0, 0)
                y -= 16

                # Split recommendation into lines (Action/Reason/Next step format)
                rec_lines = recommendation.split('\n')
                for line in rec_lines:
                    if y < 50:
                        c.showPage()
                        y = height - 50

                    line = line.strip()
                    if not line:
                        continue

                    # Highlight Action/Reason/Next step labels
                    if line.startswith("Action:"):
                        c.setFont("Helvetica-Bold", 9)
                        c.setFillColorRGB(*status_color)
                        c.drawString(65, y, "Action:")
                        c.setFillColorRGB(0, 0, 0)
                        c.setFont("Helvetica", 9)
                        action_text = line.replace("Action:", "").strip()
                        c.drawString(110, y, action_text[:65])
                        y -= 13
                    elif line.startswith("Reason:"):
                        c.setFont("Helvetica-Bold", 8)
                        c.drawString(65, y, "Reason:")
                        c.setFont("Helvetica", 8)
                        c.setFillColorRGB(0.3, 0.3, 0.3)
                        reason_text = line.replace("Reason:", "").strip()
                        c.drawString(110, y, reason_text[:65])
                        c.setFillColorRGB(0, 0, 0)
                        y -= 12
                    elif line.startswith("Next step:"):
                        c.setFont("Helvetica-Bold", 8)
                        c.drawString(65, y, "Next step:")
                        c.setFont("Helvetica", 8)
                        next_text = line.replace("Next step:", "").strip()
                        c.drawString(120, y, next_text[:60])
                        y -= 12
                    else:
                        # Generic line
                        c.setFont("Helvetica", 8)
                        c.drawString(70, y, line[:75])
                        y -= 11

                y -= 6

            # Per-image analysis section
            if per_image_analysis:
                y -= 15
                if y < 100:
                    c.showPage()
                    y = height - 50

                c.setFont("Helvetica-Bold", 11)
                c.drawString(60, y, "Detailed Image Analysis:")
                y -= 18

                for img_analysis in per_image_analysis:
                    if y < 150:
                        c.showPage()
                        y = height - 50

                    image_num = img_analysis.get('image_number', 0)
                    image_url = img_analysis.get('image_url', '')
                    findings = img_analysis.get('findings', [])

                    # Image header - cleaner format
                    c.setFont("Helvetica-Bold", 10)
                    c.setFillColorRGB(0.2, 0.4, 0.7)
                    c.drawString(70, y, f"Image {image_num} — Findings")
                    c.setFillColorRGB(0, 0, 0)
                    y -= 14

                    # Try to display the image if it's a local file
                    image_displayed = False
                    if image_url and image_url.startswith('/storage/'):
                        try:
                            # Convert URL to file path
                            image_path = image_url.replace('/storage/', 'storage/')
                            if os.path.exists(image_path):
                                # Draw image
                                img_width = 200
                                img_height = 150
                                if y < img_height + 50:
                                    c.showPage()
                                    y = height - 50

                                # ImageReader already imported at top of file
                                img = ImageReader(image_path)
                                c.drawImage(img, 80, y - img_height, width=img_width, height=img_height, preserveAspectRatio=True)
                                y -= (img_height + 10)
                                image_displayed = True
                        except Exception:
                            pass  # Will show unavailable message below

                    # If image couldn't be displayed, show message
                    if not image_displayed and image_url:
                        c.setFont("Helvetica-Oblique", 8)
                        c.setFillColorRGB(0.5, 0.5, 0.5)
                        c.drawString(80, y, f"[Preview unavailable — stored at: {image_url}]")
                        c.setFillColorRGB(0, 0, 0)
                        y -= 14

                    # Findings - skip first item if it's the duplicate "Image #X Analysis:" header
                    c.setFont("Helvetica", 8)
                    findings_to_show = findings
                    if findings and ("Analysis:" in findings[0] or "analysis:" in findings[0].lower()):
                        findings_to_show = findings[1:]  # Skip the redundant header

                    for finding in findings_to_show[:6]:  # Show up to 6 findings per image
                        if y < 50:
                            c.showPage()
                            y = height - 50

                        # Word wrap findings
                        words = finding.split()
                        line = ""
                        for word in words:
                            test_line = line + word + " "
                            if len(test_line) > 75:
                                c.drawString(85, y, line.strip())
                                y -= 10
                                line = word + " "
                            else:
                                line = test_line
                        if line:
                            c.drawString(85, y, line.strip())
                            y -= 10

                    y -= 8  # Space between images

        # Electrical analysis - customer-ready format
        elif kind == "electrical":
            # Get electrical data
            electrical_status = result.get('status', 'unknown')
            score = result.get('score', 0)
            checks = result.get('checks', [])
            recommendations = result.get('recommendations', [])
            calculations = result.get('calculations', {})
            # Use electrical_data_used from worker, or raw_data from service
            electrical_data_used = result.get('electrical_data_used', result.get('raw_data', {}))

            # Status badge with color and icon
            if electrical_status == "ok":
                status_color = (0.0, 0.6, 0.0)  # Green
                status_icon = "✓"
                status_label = "APPROVED"
                quick_summary = "Safe to install solar on current electrical system"
                action_required = "Proceed with installation"
            elif electrical_status == "warning":
                status_color = (0.9, 0.6, 0.0)  # Orange
                status_icon = "⚠"
                status_label = "WARNING"
                quick_summary = "Electrical system has concerns that need review"
                action_required = "Review safety checks before proceeding"
            else:  # fail
                status_color = (0.8, 0.0, 0.0)  # Red
                status_icon = "✗"
                status_label = "FAILED"
                quick_summary = "Unsafe to install solar on current electrical system"
                action_required = "Electrical panel upgrade needed"

            # === TOP SUMMARY BOX (MOST VISIBLE) ===
            c.setFont("Helvetica-Bold", 11)
            c.setFillColorRGB(*status_color)
            c.drawString(60, y, f"{status_icon} Electrical: {status_label}")
            c.setFillColorRGB(0, 0, 0)
            y -= 14

            c.setFont("Helvetica", 9)
            c.drawString(60, y, quick_summary)
            y -= 12

            c.setFont("Helvetica-Bold", 9)
            c.drawString(60, y, f"Action required: {action_required}")
            y -= 18

            # Divider line
            c.setLineWidth(0.5)
            c.setStrokeColorRGB(0.7, 0.7, 0.7)
            c.line(60, y, width - 60, y)
            y -= 14

            # === DETAILED ANALYSIS SECTION ===
            # Header: Electrical Status
            c.setFont("Helvetica-Bold", 11)
            c.setFillColorRGB(*status_color)
            c.drawString(60, y, f"{status_icon} {status_label}")
            c.setFillColorRGB(0, 0, 0)
            y -= 14

            # Safety Score
            c.setFont("Helvetica", 10)
            c.drawString(60, y, f"Safety Score: {score} / 100")
            y -= 14

            # Technical summary
            system_size = calculations.get('system_size_kw', 'N/A')
            solar_breaker = calculations.get('solar_breaker_a', 'N/A')
            panel_rating = calculations.get('main_panel_rating_a', 'N/A')

            c.setFont("Helvetica", 9)
            c.setFillColorRGB(0.2, 0.2, 0.2)
            c.drawString(60, y, f"{system_size}kW system requires {solar_breaker}A breaker on {panel_rating}A panel")
            c.setFillColorRGB(0, 0, 0)
            y -= 18

            # System Details Section
            if y < 180:
                c.showPage()
                y = height - 50

            c.setFont("Helvetica-Bold", 10)
            c.drawString(60, y, "System Details:")
            y -= 14

            c.setFont("Helvetica", 9)
            system_details = [
                f"- Planned Solar System Size: {electrical_data_used.get('system_size_kw', calculations.get('system_size_kw', 'N/A'))} kW",
                f"- Main Panel Rating: {electrical_data_used.get('main_panel_rating_a', calculations.get('main_panel_rating_a', 'N/A'))} A",
                f"- Main Breaker Rating: {electrical_data_used.get('main_breaker_rating_a', calculations.get('main_breaker_a', 'N/A'))} A",
                f"- Solar Breaker Required: {calculations.get('solar_breaker_a', 'N/A')} A",
                f"- Phase Type: {(electrical_data_used.get('phase_type', calculations.get('phase_type', 'N/A'))).replace('_', ' ').title()}",
                f"- Voltage: {electrical_data_used.get('voltage', calculations.get('voltage', 'N/A'))} V"
            ]

            for detail in system_details:
                if y < 50:
                    c.showPage()
                    y = height - 50
                c.drawString(65, y, detail)
                y -= 12

            y -= 6

            # Key Findings Section
            if checks:
                if y < 120:
                    c.showPage()
                    y = height - 50

                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Key Findings:")
                y -= 14

                c.setFont("Helvetica", 9)

                # Extract key findings from checks
                key_findings = []
                for check in checks:
                    check_status = check.get('status', 'unknown')
                    if check_status != 'pass':  # Only show warnings and failures
                        check_name = check.get('name', 'Unknown')
                        check_message = check.get('message', '')
                        # Extract short summary from message
                        if check_message:
                            # Get first sentence or first 80 chars
                            summary_text = check_message.split('.')[0] if '.' in check_message else check_message[:80]
                            key_findings.append(f"- {summary_text}")

                # If no issues, show positive findings
                if not key_findings:
                    key_findings = [
                        "- All electrical safety checks passed successfully",
                        "- Panel capacity meets requirements for solar installation",
                        "- Wiring and panel condition rated as good"
                    ]

                for finding in key_findings[:4]:  # Show up to 4 key findings
                    if y < 50:
                        c.showPage()
                        y = height - 50

                    # Word wrap finding
                    words = finding.split()
                    line = ""
                    for word in words:
                        test_line = line + word + " "
                        if len(test_line) > 70:
                            c.drawString(65, y, line.strip())
                            y -= 12
                            line = word + " "
                        else:
                            line = test_line
                    if line:
                        c.drawString(65, y, line.strip())
                        y -= 12

                y -= 6

            # Recommendation Section
            if recommendations:
                if y < 100:
                    c.showPage()
                    y = height - 50

                c.setFont("Helvetica-Bold", 10)
                c.drawString(60, y, "Recommendation:")
                y -= 14

                # Get primary recommendation
                primary_rec = recommendations[0] if recommendations else {}
                action = primary_rec.get('action', '').replace('Action:', '').strip()
                reason = primary_rec.get('reason', '').replace('Reason:', '').strip()
                next_step = primary_rec.get('next_step', '').replace('Next step:', '').replace('Next:', '').strip()

                # Combine into customer-friendly text
                rec_text = action
                if reason:
                    rec_text += f" {reason}"
                if next_step:
                    rec_text += f" {next_step}"

                # Word wrap recommendation
                c.setFont("Helvetica", 9)
                words = rec_text.split()
                line = ""
                for word in words:
                    test_line = line + word + " "
                    if len(test_line) > 75:
                        c.drawString(60, y, line.strip())
                        y -= 12
                        line = word + " "
                    else:
                        line = test_line
                if line:
                    c.drawString(60, y, line.strip())
                    y -= 12

                y -= 6

            # Divider line
            if y < 40:
                c.showPage()
                y = height - 50
            c.setLineWidth(0.5)
            c.setStrokeColorRGB(0.7, 0.7, 0.7)
            c.line(60, y, width - 60, y)
            y -= 10
        else:
            # Fallback for unknown analysis types
            c.setFont("Helvetica", 10)
            c.drawString(60, y, f"Status: {status}")
            y -= 14

        y -= 10  # Space between different analyses

    c.showPage()
    c.save()
    return buf.getvalue()
