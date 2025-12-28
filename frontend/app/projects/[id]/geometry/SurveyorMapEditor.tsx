"use client";
import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Fix Leaflet default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RoofPlane = {
  id: number;
  name?: string;
  tilt_deg?: number;
  azimuth_deg?: number;
  polygon_wkt: string;
};

type Obstruction = {
  id: number;
  type: string;
  height_m?: number;
  polygon_wkt: string;
};

interface Props {
  projectId: number;
  existingPlanes: RoofPlane[];
  existingObstructions: Obstruction[];
  onRoofPlaneAdd: (data: { polygon_wkt: string; name: string; tilt_deg: number; azimuth_deg: number }) => void;
  onObstructionAdd: (data: { polygon_wkt: string; type: string; height_m: number }) => void;
}

// Mapping functions for user-friendly to technical conversions
const directionToAzimuth = (direction: string): number => {
  const map: Record<string, number> = {
    'north': 0,
    'east': 90,
    'south': 180,
    'west': 270,
    'northeast': 45,
    'southeast': 135,
    'southwest': 225,
    'northwest': 315,
  };
  return map[direction] || 180; // Default to south
};

const steepnessToTilt = (steepness: string): number => {
  const map: Record<string, number> = {
    'flat': 5,
    'low': 15,
    'medium': 25,
    'steep': 40,
  };
  return map[steepness] || 25; // Default to medium
};

const heightCategoryToMeters = (category: string): number => {
  const map: Record<string, number> = {
    'short': 2,
    'medium': 5,
    'tall': 10,
  };
  return map[category] || 3; // Default to medium
};

// Convert Leaflet LatLng coordinates to WKT polygon
const coordsToWKT = (coords: L.LatLng[]): string => {
  if (coords.length === 0) return '';

  // Convert lat/lng to simple X,Y coordinates (meters)
  // Scale factor: approximate meters (simplified for visualization)
  const scale = 10; // 1 degree ≈ 10 meters for visualization

  const points = coords.map(coord => {
    const x = (coord.lng * scale).toFixed(2);
    const y = (coord.lat * scale).toFixed(2);
    return `${x} ${y}`;
  });

  // Close the polygon by adding first point at end
  const firstPoint = points[0];
  points.push(firstPoint);

  return `POLYGON((${points.join(', ')}))`;
};

export default function SurveyorMapEditor({
  projectId,
  existingPlanes,
  existingObstructions,
  onRoofPlaneAdd,
  onObstructionAdd,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);

  const [mode, setMode] = useState<'roof' | 'obstruction'>('roof');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Roof plane form state
  const [roofName, setRoofName] = useState('Main Roof');
  const [roofType, setRoofType] = useState('sloped');
  const [roofDirection, setRoofDirection] = useState('south');
  const [roofSteepness, setRoofSteepness] = useState('medium');
  const [drawnRoofCoords, setDrawnRoofCoords] = useState<L.LatLng[] | null>(null);

  // Obstruction form state
  const [obsType, setObsType] = useState('tree');
  const [obsHeight, setObsHeight] = useState('medium');
  const [drawnObsCoords, setDrawnObsCoords] = useState<L.LatLng[] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 0,
      maxZoom: 5,
      crs: L.CRS.Simple, // Use simple coordinate system for image overlay
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add drawing layer
    map.addLayer(drawnItemsRef.current);

    // Drawing controls
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: mode === 'roof' ? '#3b82f6' : '#ef4444',
            weight: 2,
          },
        },
        marker: true,
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      drawnItemsRef.current.addLayer(layer);

      if (e.layerType === 'polygon') {
        const coords = layer.getLatLngs()[0]; // Get outer ring
        if (mode === 'roof') {
          setDrawnRoofCoords(coords);
        } else {
          setDrawnObsCoords(coords);
        }
      } else if (e.layerType === 'marker') {
        // For obstructions, create small square polygon around marker
        const latlng = layer.getLatLng();
        const size = 0.5; // Size in map units
        const coords = [
          L.latLng(latlng.lat - size, latlng.lng - size),
          L.latLng(latlng.lat - size, latlng.lng + size),
          L.latLng(latlng.lat + size, latlng.lng + size),
          L.latLng(latlng.lat + size, latlng.lng - size),
        ];
        setDrawnObsCoords(coords);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update drawing color when mode changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old draw control and add new one with updated color
    const map = mapRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Control.Draw) {
        map.removeControl(layer);
      }
    });

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: mode === 'roof' ? '#3b82f6' : '#ef4444',
            weight: 2,
          },
        },
        marker: mode === 'obstruction',
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true,
      },
    });

    map.addControl(drawControl);
  }, [mode]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setUploadedImage(imageUrl);

      if (mapRef.current) {
        // Remove old overlay if exists
        if (imageOverlayRef.current) {
          mapRef.current.removeLayer(imageOverlayRef.current);
        }

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          // Calculate bounds based on actual image aspect ratio
          const aspectRatio = img.width / img.height;
          const height = 100;
          const width = height * aspectRatio;

          // Center the image at [0, 0] with proper aspect ratio
          const imageBounds = L.latLngBounds([
            [-height / 2, -width / 2],  // Southwest corner
            [height / 2, width / 2]     // Northeast corner
          ]);

          // Add image as overlay
          const overlay = L.imageOverlay(imageUrl, imageBounds, {
            opacity: 0.8,
            interactive: false,
          });
          overlay.addTo(mapRef.current!);
          imageOverlayRef.current = overlay;

          // Fit map to image bounds with padding
          mapRef.current!.fitBounds(imageBounds, { padding: [20, 20] });

          // Set a reasonable zoom level
          mapRef.current!.setZoom(mapRef.current!.getZoom() - 0.5);
        };
        img.src = imageUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle roof plane submission
  const handleRoofSubmit = () => {
    if (!drawnRoofCoords || drawnRoofCoords.length < 3) {
      alert('Please draw a roof plane on the map first!');
      return;
    }

    const wkt = coordsToWKT(drawnRoofCoords);
    const azimuth = directionToAzimuth(roofDirection);
    const tilt = roofType === 'flat' ? 5 : steepnessToTilt(roofSteepness);

    onRoofPlaneAdd({
      polygon_wkt: wkt,
      name: roofName || 'Unnamed Roof',
      tilt_deg: tilt,
      azimuth_deg: azimuth,
    });

    // Clear drawn shape
    drawnItemsRef.current.clearLayers();
    setDrawnRoofCoords(null);
    setRoofName('Main Roof');
  };

  // Handle obstruction submission
  const handleObstructionSubmit = () => {
    if (!drawnObsCoords || drawnObsCoords.length < 3) {
      alert('Please mark an obstruction on the map first!');
      return;
    }

    const wkt = coordsToWKT(drawnObsCoords);
    const heightM = heightCategoryToMeters(obsHeight);

    onObstructionAdd({
      polygon_wkt: wkt,
      type: obsType,
      height_m: heightM,
    });

    // Clear drawn shape
    drawnItemsRef.current.clearLayers();
    setDrawnObsCoords(null);
  };

  // Clear current drawing
  const handleClear = () => {
    drawnItemsRef.current.clearLayers();
    setDrawnRoofCoords(null);
    setDrawnObsCoords(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', height: '700px' }}>
      {/* Map Canvas */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {!uploadedImage && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 1000,
            background: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: '0.5rem',
            border: '2px dashed var(--border-color)',
          }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Upload a roof photo/satellite image to start drawing
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Control Panel */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        overflowY: 'auto',
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Drawing Controls
        </h3>

        {/* Mode Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            What are you drawing?
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setMode('roof')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: mode === 'roof' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: mode === 'roof' ? 'var(--primary)20' : 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: mode === 'roof' ? 600 : 400,
              }}
            >
              🏠 Roof Plane
            </button>
            <button
              onClick={() => setMode('obstruction')}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: mode === 'obstruction' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: mode === 'obstruction' ? 'var(--primary)20' : 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: mode === 'obstruction' ? 600 : 400,
              }}
            >
              🌳 Obstruction
            </button>
          </div>
        </div>

        <div className="divider" style={{ margin: '1rem 0' }}></div>

        {/* Roof Plane Form */}
        {mode === 'roof' && (
          <>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
              Roof Plane Details
            </h4>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Roof Name
              </label>
              <input
                className="input"
                value={roofName}
                onChange={(e) => setRoofName(e.target.value)}
                placeholder="e.g., Main Roof"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Roof Type
              </label>
              <select
                className="select"
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="flat">Flat Roof</option>
                <option value="sloped">Sloped Roof</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Roof Direction (Facing)
              </label>
              <select
                className="select"
                value={roofDirection}
                onChange={(e) => setRoofDirection(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="north">⬆️ North</option>
                <option value="northeast">↗️ Northeast</option>
                <option value="east">➡️ East</option>
                <option value="southeast">↘️ Southeast</option>
                <option value="south">⬇️ South</option>
                <option value="southwest">↙️ Southwest</option>
                <option value="west">⬅️ West</option>
                <option value="northwest">↖️ Northwest</option>
              </select>
            </div>

            {roofType === 'sloped' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Roof Steepness
                </label>
                <select
                  className="select"
                  value={roofSteepness}
                  onChange={(e) => setRoofSteepness(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="low">Low Slope (15°)</option>
                  <option value="medium">Medium Slope (25°)</option>
                  <option value="steep">Steep Slope (40°)</option>
                </select>
              </div>
            )}

            {drawnRoofCoords && (
              <div style={{
                padding: '0.75rem',
                background: 'var(--primary)10',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                border: '1px solid var(--primary)40',
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  ✓ Roof area drawn with {drawnRoofCoords.length} points
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Auto-generated: {steepnessToTilt(roofSteepness)}° tilt, {directionToAzimuth(roofDirection)}° azimuth
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn"
                onClick={handleClear}
                style={{ flex: 1, background: 'var(--bg-primary)' }}
              >
                🗑️ Clear
              </button>
              <button
                className="btn btn-purple"
                onClick={handleRoofSubmit}
                disabled={!drawnRoofCoords}
                style={{ flex: 2 }}
              >
                ✓ Add Roof Plane
              </button>
            </div>
          </>
        )}

        {/* Obstruction Form */}
        {mode === 'obstruction' && (
          <>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
              Obstruction Details
            </h4>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Obstruction Type
              </label>
              <select
                className="select"
                value={obsType}
                onChange={(e) => setObsType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="tree">🌳 Tree</option>
                <option value="chimney">🏭 Chimney</option>
                <option value="water_tank">💧 Water Tank</option>
                <option value="vent">🔧 Vent</option>
                <option value="antenna">📡 Antenna</option>
                <option value="other">❓ Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Height Category
              </label>
              <select
                className="select"
                value={obsHeight}
                onChange={(e) => setObsHeight(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="short">Short (~2m)</option>
                <option value="medium">Medium (~5m)</option>
                <option value="tall">Tall (~10m)</option>
              </select>
            </div>

            {drawnObsCoords && (
              <div style={{
                padding: '0.75rem',
                background: 'var(--primary)10',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                border: '1px solid var(--primary)40',
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  ✓ Obstruction marked on map
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Auto-generated: {heightCategoryToMeters(obsHeight)}m height
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn"
                onClick={handleClear}
                style={{ flex: 1, background: 'var(--bg-primary)' }}
              >
                🗑️ Clear
              </button>
              <button
                className="btn btn-purple"
                onClick={handleObstructionSubmit}
                disabled={!drawnObsCoords}
                style={{ flex: 2 }}
              >
                ✓ Add Obstruction
              </button>
            </div>
          </>
        )}

        <div className="divider" style={{ margin: '1.5rem 0' }}></div>

        {/* Instructions */}
        <div style={{
          padding: '1rem',
          background: 'var(--bg-primary)',
          borderRadius: '0.375rem',
          fontSize: '0.85rem',
        }}>
          <h5 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📝 How to use:</h5>
          <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li>Upload a roof photo or satellite image</li>
            <li>Choose Roof Plane or Obstruction mode</li>
            <li>Click the polygon/marker tool in the map</li>
            <li>Draw on the image by clicking points</li>
            <li>Fill in simple details (no technical values!)</li>
            <li>Click "Add" to save</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
