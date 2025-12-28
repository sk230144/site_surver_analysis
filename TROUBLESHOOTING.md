# Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Cannot find module './vendor-chunks/@tanstack.js'" Error

**Symptoms:**
- Server error when loading pages after adding new dependencies
- Error message: `Error: Cannot find module './vendor-chunks/@tanstack.js'`

**Root Cause:**
Next.js dev server cache becomes stale when new npm packages are installed while the server is running.

**Solution:**

1. **Stop all Node processes:**
```bash
# Windows
taskkill //F //IM node.exe

# Mac/Linux
pkill -9 node
```

2. **Clear Next.js build cache:**
```bash
cd frontend
rm -rf .next        # Mac/Linux
# OR
Remove-Item -Recurse -Force .next    # Windows PowerShell
```

3. **Restart dev server:**
```bash
npm run dev
```

**Why this works:**
- Next.js caches webpack chunks in `.next/` directory
- When you install new packages (like Leaflet), the cache doesn't know about them
- Clearing cache forces Next.js to rebuild with new dependencies

### Issue: Port 3000 Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

**Windows:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill //F //PID <PID>
```

**Mac/Linux:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: Leaflet Map Not Displaying

**Symptoms:**
- Blank space where map should be
- Console error: "Map container is already initialized"

**Solutions:**

1. **Check CSS import order:**
```tsx
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
```
Must come before component code.

2. **Ensure dynamic import with ssr: false:**
```tsx
const SurveyorMapEditor = dynamic(() => import('./SurveyorMapEditor'), {
  ssr: false  // Critical for Leaflet!
});
```

3. **Verify ref is attached:**
```tsx
<div ref={mapContainerRef} style={{ height: '500px', width: '100%' }} />
```
Height MUST be set explicitly.

### Issue: Leaflet Icons Not Showing

**Symptoms:**
- Markers appear but icon images are broken

**Solution:**

Add this to your component (already in SurveyorMapEditor.tsx):
```tsx
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

### Issue: Backend Analysis Not Working with Surveyor Data

**Symptoms:**
- Roof planes save but shading analysis fails
- WKT polygon errors in backend

**Diagnostic:**

1. **Check WKT format:**
```python
# Valid WKT
"POLYGON((0.00 0.00, 10.00 0.00, 10.00 10.00, 0.00 10.00, 0.00 0.00))"

# Must be closed (first point = last point)
# Must use space between X Y coordinates
# Must use comma between point pairs
```

2. **Run integration test:**
```bash
cd backend
python test_surveyor_simple.py
```

3. **Check auto-generation logic:**
```javascript
cd frontend
node test-surveyor-logic.js
```

### Issue: Drawing Tool Not Working

**Symptoms:**
- Can't click to draw polygons
- Drawing tools not visible

**Solutions:**

1. **Verify Leaflet.Draw CSS loaded:**
```tsx
import 'leaflet-draw/dist/leaflet.draw.css';
```

2. **Check draw control initialization:**
```tsx
const drawControl = new L.Control.Draw({
  draw: {
    polygon: true,
    marker: true,
    // ... other options
  }
});
map.addControl(drawControl);
```

3. **Listen for draw events:**
```tsx
map.on(L.Draw.Event.CREATED, (e: any) => {
  const layer = e.layer;
  drawnItems.addLayer(layer);
});
```

## Preventive Measures

### When Installing New npm Packages:

1. **Stop dev server first** (Ctrl+C)
2. Install packages: `npm install <package>`
3. Clear cache: `rm -rf .next`
4. Restart: `npm run dev`

### Before Committing:

1. **Test build:** `npm run build`
2. **Check for TypeScript errors:** `npx tsc --noEmit`
3. **Run integration tests:** `python test_surveyor_simple.py`

### Regular Maintenance:

```bash
# Clear all caches (when things get weird)
cd frontend
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

## Getting Help

If you encounter an issue not covered here:

1. Check browser console for errors (F12)
2. Check terminal for server errors
3. Review recent file changes
4. Check if issue exists in Advanced Mode (isolates Surveyor Mode)

## Useful Commands

```bash
# Frontend
cd frontend
npm run dev              # Start dev server
npm run build           # Production build
npm run lint            # Check code quality

# Backend
cd backend
python test_surveyor_simple.py    # Test surveyor integration
.venv/Scripts/python test_electrical.py  # Test electrical analysis

# Database
docker compose ps       # Check if DB is running
docker compose logs db  # Check DB logs

# Process Management (Windows)
netstat -ano | findstr :3000   # Find process on port
taskkill //F //PID <PID>       # Kill process

# Process Management (Mac/Linux)
lsof -ti:3000                  # Find process on port
kill -9 <PID>                  # Kill process
```

## Version Compatibility

**Critical:** These exact versions must be used:

```json
{
  "react": "^18.x.x",
  "react-leaflet": "^4.2.1",  // NOT v5 (requires React 19)
  "leaflet": "^1.9.4",
  "leaflet-draw": "^1.0.4"
}
```

Installing `react-leaflet@5.x.x` will cause peer dependency errors with React 18.

## Need More Help?

- Check `SURVEYOR_MODE_IMPLEMENTATION.md` for technical details
- Check `QUICK_START_SURVEYOR.md` for user guide
- Review code comments in `SurveyorMapEditor.tsx`
