"use client";
import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { API } from '../../../../lib/api';

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
  project?: any;  // Project details including uploaded_image_url and geometry_view_mode
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
    'steep': 35,  // Updated to match spec
  };
  return map[steepness] || 25; // Default to medium
};

// Type-specific height mappings (per industry standard)
const heightCategoryToMeters = (category: string, type: string): number => {
  const mappings: Record<string, Record<string, number>> = {
    'tree': {
      'short': 4,   // Small ornamental tree
      'medium': 8,  // Typical residential tree
      'tall': 12,   // Large mature tree
    },
    'chimney': {
      'short': 1.5,  // Low roof penetration
      'medium': 2.5, // Standard chimney
      'tall': 3.5,   // Tall chimney
    },
    'antenna': {
      'short': 1,    // Small antenna
      'medium': 2,   // TV antenna
      'tall': 3,     // Tall radio antenna
    },
    'vent': {
      'short': 0.5,  // Roof vent
      'medium': 1,   // Plumbing vent
      'tall': 1.5,   // Large vent stack
    },
    'adjacent_building': {
      'short': 3,    // Single story
      'medium': 6,   // Two story
      'tall': 10,    // Three+ story
    },
    'other': {
      'short': 2,
      'medium': 5,
      'tall': 10,
    },
  };

  const typeMap = mappings[type] || mappings['other'];
  return typeMap[category] || typeMap['medium'];
};

// Convert Leaflet LatLng coordinates to WKT polygon
const coordsToWKT = (coords: L.LatLng[]): string => {
  if (coords.length === 0) return '';

  // Convert lat/lng to meters using proper scale
  // 1 degree latitude ≈ 111,000 meters
  // We use 111319.9 (exact at equator) for both lat/lng as approximation
  const scale = 111319.9;

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
  project,
  existingPlanes,
  existingObstructions,
  onRoofPlaneAdd,
  onObstructionAdd,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const currentDrawingLayerRef = useRef<L.Layer | null>(null); // Track currently drawn layer
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const satelliteTileRef = useRef<L.TileLayer | null>(null);
  const mapTileRef = useRef<L.TileLayer | null>(null);

  const [mode, setMode] = useState<'roof' | 'obstruction'>('roof');
  const modeRef = useRef<'roof' | 'obstruction'>('roof'); // Ref to track mode for event handlers
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Image source: 'satellite', 'uploaded', 'map' - default to uploaded per user request
  const [imageSource, setImageSource] = useState<'satellite' | 'uploaded' | 'map'>(
    (project?.geometry_view_mode as 'satellite' | 'uploaded' | 'map') || 'uploaded'
  );

  // Location search
  const [searchAddress, setSearchAddress] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

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

  // Sync mode to ref for event handlers
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Load uploaded image from server when project data is available
  useEffect(() => {
    if (project?.uploaded_image_url && !uploadedImage) {
      const imageUrl = `${API}${project.uploaded_image_url}`;
      setUploadedImage(imageUrl);
      setImageSource('uploaded');
    }
  }, [project]);

  // Display uploaded image on map when it's loaded
  useEffect(() => {
    if (!uploadedImage || !mapRef.current || imageSource !== 'uploaded') return;

    const map = mapRef.current;

    // Hide satellite/map tiles when showing uploaded image
    if (satelliteTileRef.current) {
      map.removeLayer(satelliteTileRef.current);
    }
    if (mapTileRef.current) {
      map.removeLayer(mapTileRef.current);
    }

    // Wait a bit for map to be fully initialized
    const timer = setTimeout(() => {
      // Remove old overlay if exists
      if (imageOverlayRef.current) {
        try {
          map.removeLayer(imageOverlayRef.current);
        } catch (e) {
          console.warn('Could not remove old overlay:', e);
        }
      }

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        if (!mapRef.current) return; // Safety check

        // Use actual pixel dimensions - no scaling
        // Map 1 pixel = 1 unit in coordinate space
        const pixelWidth = img.width;
        const pixelHeight = img.height;

        // Scale down to reasonable coordinate space (divide by 10 for better map behavior)
        const scale = 10;
        const width = pixelWidth / scale;
        const height = pixelHeight / scale;

        // Center the image at [0, 0]
        const imageBounds = L.latLngBounds([
          [-height / 2, -width / 2],  // Southwest corner
          [height / 2, width / 2]     // Northeast corner
        ]);

        // Add image as overlay
        const overlay = L.imageOverlay(uploadedImage, imageBounds, {
          opacity: 1.0, // Full opacity - no transparency
          interactive: false,
        });

        try {
          overlay.addTo(mapRef.current);
          imageOverlayRef.current = overlay;

          // Set fixed zoom level instead of fitBounds
          mapRef.current.setView([0, 0], 1); // Center at origin, zoom level 1
        } catch (e) {
          console.error('Failed to add image overlay:', e);
        }
      };
      img.src = uploadedImage;
    }, 500); // Wait 500ms for map to initialize

    return () => clearTimeout(timer);
  }, [uploadedImage, imageSource]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map with real-world coordinates (not CRS.Simple)
    const map = L.map(mapContainerRef.current, {
      center: [37.7749, -122.4194], // Default: San Francisco
      zoom: 18,
      minZoom: 3,
      maxZoom: 19, // Match tile layer's max zoom - no blank screens!
      zoomControl: true,
      scrollWheelZoom: true,
      maxBounds: [[-90, -180], [90, 180]], // Prevent panning outside world
    });

    // Add FREE satellite tile layer (ESRI World Imagery)
    const satelliteTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
        maxNativeZoom: 19, // Prevent requesting tiles that don't exist
        minZoom: 3,
        errorTileUrl: '', // Don't show broken image icons
        crossOrigin: true, // Allow cross-origin requests
      }
    );

    // Log tile loading errors for debugging
    satelliteTile.on('tileerror', (error: any) => {
      console.warn('Satellite tile failed to load:', error);
    });

    satelliteTileRef.current = satelliteTile;

    // Add FREE map tile layer (OpenStreetMap)
    const mapTile = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        maxNativeZoom: 19, // Prevent requesting tiles that don't exist
        minZoom: 3,
      }
    );
    mapTileRef.current = mapTile;

    // Start with satellite view
    satelliteTile.addTo(map);

    // Add drawing layer
    map.addLayer(drawnItemsRef.current);

    // Drawing controls
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: modeRef.current === 'roof' ? '#3b82f6' : '#ef4444',
            weight: 2,
          },
          icon: new L.DivIcon({
            iconSize: new L.Point(8, 8),
            className: 'leaflet-div-icon leaflet-editing-icon'
          }),
          touchIcon: new L.DivIcon({
            iconSize: new L.Point(20, 20),
            className: 'leaflet-div-icon leaflet-editing-icon leaflet-touch-icon'
          }),
          guidelineDistance: 20,
          metric: true,
          showLength: true,
          repeatMode: false,
        },
        marker: false,
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

    // Handle draw start - mark the first vertex
    map.on(L.Draw.Event.DRAWSTART, (e: any) => {
      console.log('Draw started');
      // Use a timeout to let Leaflet create the first marker
      setTimeout(() => {
        const markers = document.querySelectorAll('.leaflet-marker-icon.leaflet-div-icon.leaflet-editing-icon');
        if (markers.length > 0) {
          const firstMarker = markers[0];
          firstMarker.classList.add('start-point-marker');
          console.log('Added start-point-marker class to first vertex');
        }
      }, 100);
    });

    // Track vertex additions to keep start point marked
    map.on(L.Draw.Event.DRAWVERTEX, (e: any) => {
      setTimeout(() => {
        const markers = document.querySelectorAll('.leaflet-marker-icon.leaflet-div-icon.leaflet-editing-icon');
        if (markers.length > 0) {
          // Remove class from all
          markers.forEach(m => m.classList.remove('start-point-marker'));
          // Add only to first
          markers[0].classList.add('start-point-marker');
        }
      }, 50);
    });

    // Handle draw events
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      drawnItemsRef.current.addLayer(layer);
      currentDrawingLayerRef.current = layer; // Store reference to this drawing

      if (e.layerType === 'polygon') {
        const coords = layer.getLatLngs()[0]; // Get outer ring
        if (modeRef.current === 'roof') {
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

    // Handle delete events - note that deleted layers are removed from drawnItems
    // but we don't automatically delete from database (user controls that)
    map.on(L.Draw.Event.DELETED, (e: any) => {
      console.log('Layers deleted:', e.layers.getLayers().length);
      // Note: Deleted layers are already removed from drawnItemsRef by Leaflet.Draw
      // If you want to delete from DB, you'd need to track layer IDs and call API
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Display existing roof planes and obstructions on map
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Save temporary drawing (if exists)
    const tempDrawing = currentDrawingLayerRef.current;

    // Clear existing layers before re-adding (avoid duplicates)
    drawnItemsRef.current.clearLayers();

    // Restore temporary drawing
    if (tempDrawing) {
      drawnItemsRef.current.addLayer(tempDrawing);
    }

    // Helper to convert WKT to Leaflet coordinates
    const wktToLeaflet = (wktString: string): L.LatLng[] | null => {
      try {
        // Extract coordinates from WKT POLYGON((x1 y1, x2 y2, ...))
        const coordsMatch = wktString.match(/POLYGON\(\((.*)\)\)/);
        if (!coordsMatch) return null;

        const coordPairs = coordsMatch[1].split(',');
        const scale = 111319.9; // Same scale used for conversion

        return coordPairs.map(pair => {
          const [x, y] = pair.trim().split(' ').map(Number);
          // Reverse the conversion: lat/lng = coord / scale
          const lng = x / scale;
          const lat = y / scale;
          return L.latLng(lat, lng);
        });
      } catch (error) {
        console.error('Failed to parse WKT:', error);
        return null;
      }
    };

    // Add existing roof planes (blue polygons)
    existingPlanes.forEach((plane) => {
      const coords = wktToLeaflet(plane.polygon_wkt);
      if (coords) {
        const polygon = L.polygon(coords, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        });
        drawnItemsRef.current.addLayer(polygon); // Add to drawnItems for edit/delete
        polygon.bindPopup(`
          <strong>${plane.name}</strong><br>
          Tilt: ${plane.tilt_deg}°<br>
          Azimuth: ${plane.azimuth_deg}°
        `);
      }
    });

    // Add existing obstructions (red polygons) - ALWAYS show them!
    existingObstructions.forEach((obs) => {
      const coords = wktToLeaflet(obs.polygon_wkt);
      if (coords) {
        const polygon = L.polygon(coords, {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.1,  // Light fill to avoid red tint
          weight: 2,
        });
        drawnItemsRef.current.addLayer(polygon); // Add to drawnItems for edit/delete
        polygon.bindPopup(`
          <strong>Obstruction: ${obs.type}</strong><br>
          Height: ${obs.height_m}m
        `);
      }
    });
  }, [existingPlanes, existingObstructions]);

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
            color: modeRef.current === 'roof' ? '#3b82f6' : '#ef4444',
            weight: 2,
          },
        },
        marker: mode === 'obstruction' ? {} : false,
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

  // Handle image source toggle
  const handleImageSourceChange = async (source: 'satellite' | 'uploaded' | 'map') => {
    setImageSource(source);

    // Persist view mode preference to backend
    try {
      await fetch(`${API}/projects/${projectId}/view-mode?view_mode=${source}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Failed to save view mode:', error);
    }

    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove image overlay if switching away from uploaded
    if (source !== 'uploaded' && imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    // Toggle tile layers
    if (source === 'satellite') {
      if (mapTileRef.current) map.removeLayer(mapTileRef.current);
      if (satelliteTileRef.current) satelliteTileRef.current.addTo(map);
    } else if (source === 'map') {
      if (satelliteTileRef.current) map.removeLayer(satelliteTileRef.current);
      if (mapTileRef.current) mapTileRef.current.addTo(map);
    } else {
      // uploaded - hide both tiles
      if (satelliteTileRef.current) map.removeLayer(satelliteTileRef.current);
      if (mapTileRef.current) map.removeLayer(mapTileRef.current);
    }
  };

  // Search location using Nominatim (free)
  const handleLocationSearch = async () => {
    if (!searchAddress.trim() || !mapRef.current) return;

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchAddress)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 18);
      } else {
        alert('Location not found. Try a different address.');
      }
    } catch (error) {
      console.error('Location search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Locate Me - use browser GPS
  const handleLocateMe = () => {
    if (!mapRef.current) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current?.setView([latitude, longitude], 18);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services or search for an address.');
        }
      );
    } else {
      alert('Geolocation not supported by your browser.');
    }
  };

  // Handle image upload
  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ask user if they want to clear existing geometry
    const shouldClear = confirm(
      '🖼️ Upload New Image\n\n' +
      'Do you want to clear existing roof planes and obstructions?\n\n' +
      '• Click OK to start fresh (clear all)\n' +
      '• Click Cancel to keep existing geometry'
    );

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setUploadedImage(imageUrl);
      setImageSource('uploaded'); // Auto-switch to uploaded mode

      if (mapRef.current) {
        const map = mapRef.current;
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();

        // Remove old overlay
        if (imageOverlayRef.current) {
          map.removeLayer(imageOverlayRef.current);
        }

        // Clear existing polygons if user chose to
        if (shouldClear) {
          // Clear ALL drawn items (fresh start!)
          drawnItemsRef.current.clearLayers();
          setDrawnRoofCoords(null);
          setDrawnObsCoords(null);
          currentDrawingLayerRef.current = null;
        }

        // Hide tile layers when showing uploaded image
        if (satelliteTileRef.current) map.removeLayer(satelliteTileRef.current);
        if (mapTileRef.current) map.removeLayer(mapTileRef.current);

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          // Calculate bounds around current map center
          const aspectRatio = img.width / img.height;
          const latDelta = 0.001; // ~110 meters
          const lngDelta = latDelta * aspectRatio;

          const imageBounds = L.latLngBounds([
            [currentCenter.lat - latDelta, currentCenter.lng - lngDelta],
            [currentCenter.lat + latDelta, currentCenter.lng + lngDelta]
          ]);

          // Add image as overlay
          const overlay = L.imageOverlay(imageUrl, imageBounds, {
            opacity: 0.9,
            interactive: false,
          });
          overlay.addTo(mapRef.current!);
          imageOverlayRef.current = overlay;

          // Fit to new image
          mapRef.current!.fitBounds(imageBounds, { padding: [20, 20] });
        };
        img.src = imageUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/projects/${projectId}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const serverImageUrl = `${API}${data.image_url}`;

      // Also create local preview for immediate display
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setUploadedImage(serverImageUrl); // Use server URL so it persists

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
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  // Handle roof plane submission
  const handleRoofSubmit = () => {
    if (!drawnRoofCoords || drawnRoofCoords.length < 3) {
      alert('Please draw a roof plane polygon on the map first!\n\n📐 How to draw:\n1. Click the polygon tool (⬟ icon) in the top-left of the map\n2. Click at DIFFERENT points to mark each corner of the roof\n3. Double-click or click the first point again to close the polygon\n4. Then click "Add Roof Plane" button');
      return;
    }

    // Validate that points are actually different (not all the same)
    const uniquePoints = new Set(drawnRoofCoords.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`));
    if (uniquePoints.size < 3) {
      alert('❌ Invalid polygon: All points are at the same location!\n\nYou clicked the SAME spot multiple times. Please:\n1. Click at DIFFERENT corners of the roof\n2. Move your mouse between clicks\n3. Create a proper polygon shape');
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

    // Only clear the temporary drawing, NOT existing polygons
    if (currentDrawingLayerRef.current) {
      drawnItemsRef.current.removeLayer(currentDrawingLayerRef.current);
      currentDrawingLayerRef.current = null;
    }
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
    const heightM = heightCategoryToMeters(obsHeight, obsType); // Pass type for accurate height

    onObstructionAdd({
      polygon_wkt: wkt,
      type: obsType,
      height_m: heightM,
    });

    // Only clear the temporary drawing, NOT existing polygons
    if (currentDrawingLayerRef.current) {
      drawnItemsRef.current.removeLayer(currentDrawingLayerRef.current);
      currentDrawingLayerRef.current = null;
    }
    setDrawnObsCoords(null);
  };

  // Clear current drawing (only the temp layer, not existing polygons)
  const handleClear = () => {
    if (currentDrawingLayerRef.current) {
      drawnItemsRef.current.removeLayer(currentDrawingLayerRef.current);
      currentDrawingLayerRef.current = null;
    }
    setDrawnRoofCoords(null);
    setDrawnObsCoords(null);
  };

  return (
    <>
      {/* Custom styles for polygon drawing */}
      <style jsx>{`
        /* Highlight the first vertex (start point) with pulsing animation */
        :global(.start-point-marker) {
          background-color: #10b981 !important;
          border: 3px solid #ffffff !important;
          border-radius: 50% !important;
          width: 14px !important;
          height: 14px !important;
          margin-left: -7px !important;
          margin-top: -7px !important;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7) !important;
          animation: pulse-start-point 2s infinite !important;
        }

        @keyframes pulse-start-point {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        /* Regular vertex markers */
        :global(.leaflet-editing-icon) {
          background-color: #ffffff !important;
          border: 2px solid #3b82f6 !important;
          border-radius: 50% !important;
          width: 10px !important;
          height: 10px !important;
          margin-left: -5px !important;
          margin-top: -5px !important;
        }

        /* Touch icons for mobile */
        :global(.leaflet-touch-icon) {
          width: 20px !important;
          height: 20px !important;
          margin-left: -10px !important;
          margin-top: -10px !important;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '700px' }}>
      {/* Top Controls Bar */}
      <div className="geometry-top-controls" style={{
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        padding: '1rem',
      }}>
        <div className="geometry-controls-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
          {/* Location Search */}
          <div className="search-location-wrapper">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              🔍 Search Location
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                className="input"
                style={{ flex: 1, fontSize: '0.9rem' }}
              />
              <button
                onClick={handleLocationSearch}
                disabled={searchLoading}
                className="btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', minWidth: 'auto' }}
              >
                {searchLoading ? '...' : 'Go'}
              </button>
            </div>
          </div>

          {/* Locate Me Button */}
          <div className="locate-me-wrapper">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              📍 GPS Location
            </label>
            <button
              onClick={handleLocateMe}
              className="btn"
              style={{ width: '100%', fontSize: '0.9rem' }}
            >
              Locate Me
            </button>
          </div>

          {/* Image Source Toggle - Upload Image first as default */}
          <div className="image-source-wrapper">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              🖼️ Drawing Base
            </label>
            <select
              value={imageSource}
              onChange={(e) => handleImageSourceChange(e.target.value as 'satellite' | 'uploaded' | 'map')}
              className="select"
              style={{ width: '100%', fontSize: '0.9rem' }}
            >
              <option value="uploaded">📸 Upload Your Image (Recommended)</option>
              <option value="satellite">🛰️ Satellite View</option>
              <option value="map">🗺️ Map View</option>
            </select>
          </div>
        </div>

        {/* Upload/Replace Image Section - Show when in uploaded mode */}
        {imageSource === 'uploaded' && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: uploadedImage ? 'var(--bg-primary)' : 'var(--primary)10',
            borderRadius: '0.5rem',
            border: uploadedImage ? '1px solid var(--border-color)' : '2px solid var(--primary)40'
          }}>
            {!uploadedImage ? (
              <>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  📸 Upload Your Roof Image
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Upload a photo or aerial view of your roof to draw precise geometry. Recommended for accurate measurements.
                </p>
                <label className="btn btn-purple" style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                  📤 Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ✅ Image uploaded • Drawing on your image
                </label>
                <label className="btn" style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.85rem' }}>
                  🔄 Replace Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReplaceImage}
                    style={{ display: 'none' }}
                  />
                </label>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="geometry-map-wrapper" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Map Canvas */}
        <div className="geometry-map-canvas" style={{
          background: imageSource === 'uploaded' ? '#000000' : '#f0f0f0', // Black for uploaded, gray for satellite/map
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div ref={mapContainerRef} style={{
            width: '100%',
            height: '100%',
            background: imageSource === 'uploaded' ? '#000000' : '#f0f0f0'
          }} />
        </div>

        {/* Control Panel */}
        <div className="geometry-control-panel" style={{
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
                  Auto-generated: {heightCategoryToMeters(obsHeight, obsType)}m height
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
            <li>Click the polygon tool in the map toolbar</li>
            <li>Click points to draw - the <strong style={{ color: '#10b981' }}>green pulsing dot</strong> shows your start point</li>
            <li>Click the start point again to finish the polygon</li>
            <li>Fill in simple details (no technical values!)</li>
            <li>Click "Add" to save</li>
          </ol>
        </div>
      </div>
      </div>
    </div>
    </>
  );
}
