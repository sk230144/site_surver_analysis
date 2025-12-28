# Surveyor Mode - Quick Start Guide

## What is Surveyor Mode?

Surveyor Mode lets you define roof geometry by **drawing on photos** instead of entering technical measurements. No need to know angles, coordinates, or technical terms!

## 5-Minute Workflow

### 1. Open Geometry Page
- Go to any project
- Click "Geometry" tab
- Surveyor Mode is the default view

### 2. Upload Your Site Photo
- Click **"Upload Roof Image"**
- Choose: drone photo, satellite view, or phone picture
- Photo appears on the map

### 3. Draw Roof Planes

**For each roof section:**

1. Make sure **"Roof Plane"** mode is selected (top button)

2. Fill out the simple form:
   - **Name:** e.g., "South Facing Roof"
   - **Type:** Flat or Sloped
   - **Direction:** Pick from compass (N, S, E, W, NE, SE, SW, NW)
   - **Steepness:** Flat / Low slope / Medium slope / Steep

3. **Draw on the map:**
   - Click corners of the roof plane
   - Click first point again to close the shape
   - You'll see the polygon appear

4. Click **"Add Roof Plane"**

✅ Done! Technical values (tilt angle, azimuth, coordinates) are auto-generated.

### 4. Mark Obstructions (Optional)

**For trees, chimneys, vents, etc.:**

1. Select **"Obstruction"** mode (bottom button)

2. Choose:
   - **Type:** Tree / Chimney / Water Tank / Vent / Antenna / Other
   - **Height:** Short (2m) / Medium (5m) / Tall (10m)

3. **Draw on the map:**
   - Click around the obstruction to draw its outline
   - Close the shape

4. Click **"Add Obstruction"**

✅ Done! Height and location are saved automatically.

### 5. Run Your Analysis
- Go back to project page
- Click "Run Shading Analysis" or other analyses
- Your drawn geometry is used automatically

## What You DON'T Need to Know

❌ **Tilt angle** (we calculate it from "steep" / "medium" / "low")
❌ **Azimuth** (we calculate it from "north" / "south" / etc.)
❌ **WKT polygons** (we generate them from your drawn shapes)
❌ **Coordinates** (we track them automatically)
❌ **Meters** (we convert from height categories)

## Tips & Tricks

### Good Photos
- ✅ Clear view of entire roof
- ✅ Drone photos work best
- ✅ Google Earth screenshots work too
- ✅ Phone photos from across the street are fine

### Drawing Tips
- Click slowly to place each corner accurately
- You can use the Leaflet drawing tools to edit/delete shapes
- Draw separate roof planes for each roof section with different angles
- For complex roofs, break into simple rectangles/polygons

### Roof Types
- **Flat:** Patios, flat commercial roofs (uses 5° tilt)
- **Sloped:** Standard pitched residential roofs

### Directions
- **South:** Best for solar (most sun in Northern Hemisphere)
- **East/West:** Good for morning/evening sun
- **North:** Least favorable (but still works)

### Steepness Guide
- **Flat:** Walking surface (5°)
- **Low slope:** Gentle pitch (15°)
- **Medium slope:** Standard house roof (25°)
- **Steep:** Hard to walk on (40°)

## Switching to Advanced Mode

Need precise control? Click **"⚙️ Advanced Mode"** to:
- Enter exact tilt/azimuth degrees
- Input WKT polygons directly
- Use technical coordinate systems

You can switch back and forth anytime!

## Need Help?

**Common Issues:**

**Q: My image is too small/large on the map**
A: Use your browser's scroll wheel to zoom in/out on the map

**Q: I made a mistake drawing**
A: Use the drawing tools' edit mode (square icon) to modify shapes, or delete button (trash icon) to remove

**Q: The polygon won't close**
A: Click the very first point you placed to close the shape

**Q: I don't see my roof plane after adding**
A: Check the existing roof planes list on the right side

**Q: Which direction is my roof facing?**
A: Stand at the roof and face the downslope direction - that's your azimuth direction

## Example Scenarios

### Scenario 1: Simple House
```
1 roof plane:
- Name: "Main Roof"
- Type: Sloped
- Direction: South
- Steepness: Medium slope

0 obstructions (clear roof)
```

### Scenario 2: House with Chimney
```
2 roof planes:
- "South Roof" - Sloped, South, Medium
- "North Roof" - Sloped, North, Medium

1 obstruction:
- Type: Chimney
- Height: Medium (5m)
```

### Scenario 3: Complex Commercial
```
3 roof planes:
- "Main Flat Roof" - Flat, South, N/A
- "East Wing" - Sloped, East, Low slope
- "West Wing" - Sloped, West, Low slope

3 obstructions:
- HVAC Unit - Chimney type, Medium
- Water Tank - Water Tank type, Tall
- Vent Pipe - Vent type, Short
```

---

**Time to complete:** 3-5 minutes per roof
**Technical knowledge required:** None!
**Training needed:** This guide is all you need

Start drawing! 🎨
