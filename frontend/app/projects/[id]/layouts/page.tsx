"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../../lib/api";

type Layout = { id: number; project_id: number; name: string; data: any };
type RoofPlane = { id: number; name: string; tilt_deg: number; azimuth_deg: number };

export default function LayoutsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  // Mode toggle state
  const [mode, setMode] = useState<'surveyor' | 'advanced'>('surveyor');

  // Fetch roof planes for selection
  const planesQ = useQuery({
    queryKey: ["planes", id],
    queryFn: () => apiGet<RoofPlane[]>(`/projects/${id}/roof-planes`)
  });

  const layoutsQ = useQuery({
    queryKey: ["layouts", id],
    queryFn: () => apiGet<Layout[]>(`/projects/${id}/layouts`)
  });

  // Surveyor Mode - Simple form state
  const [layoutName, setLayoutName] = useState("Solar Array");
  const [selectedRoofId, setSelectedRoofId] = useState<number | null>(null);
  const [panelOrientation, setPanelOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fillMode, setFillMode] = useState<'max-fit' | 'custom'>('max-fit');
  const [customPanelCount, setCustomPanelCount] = useState(20);
  const [panelSpacing, setPanelSpacing] = useState<'tight' | 'normal' | 'wide'>('normal');

  // Advanced Mode - Technical form state
  const [advancedName, setAdvancedName] = useState("Layout v1");
  const [dataJson, setDataJson] = useState(JSON.stringify({
    roof_plane_id: 1,
    panel_count: 15,
    offset_from_edge_m: 1.0,
    layout_config: {
      rows: 3,
      columns: 5,
      panel_width_m: 1.0,
      panel_height_m: 1.7
    }
  }, null, 2));

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Surveyor Mode mutation
  const createSurveyorLayout = useMutation({
    mutationFn: (layoutData: any) => apiPost<Layout>(`/projects/${id}/layouts`, layoutData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts", id] });
      showToast("Panel array created successfully!", "success");
      // Reset form
      setLayoutName("Solar Array");
      setCustomPanelCount(20);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to create layout";
      showToast(errorMsg, "error");
    },
  });

  // Advanced Mode mutation
  const createAdvancedLayout = useMutation({
    mutationFn: () => apiPost<Layout>(`/projects/${id}/layouts`, {
      name: advancedName,
      data: JSON.parse(dataJson)
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["layouts", id] });
      showToast("Layout created successfully!", "success");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to create layout";
      showToast(errorMsg, "error");
    },
  });

  // Handle surveyor mode submission
  const handleSurveyorSubmit = () => {
    if (!selectedRoofId) {
      showToast("Please select a roof surface", "error");
      return;
    }

    // Map user-friendly values to technical parameters
    const spacingMap = {
      'tight': 0.5,      // 0.5m spacing (tight commercial)
      'normal': 1.0,     // 1.0m spacing (standard residential)
      'wide': 1.5        // 1.5m spacing (wide setbacks)
    };

    const panelDimensions = panelOrientation === 'portrait'
      ? { width: 1.0, height: 1.7 }   // Portrait: 1m x 1.7m
      : { width: 1.7, height: 1.0 };  // Landscape: 1.7m x 1m

    const offsetFromEdge = spacingMap[panelSpacing];

    // Calculate rows and columns based on panel count
    // For max-fit mode, we'll use a reasonable estimate (backend should calculate actual)
    const estimatedPanelCount = fillMode === 'max-fit' ? 50 : customPanelCount;
    const estimatedColumns = Math.ceil(Math.sqrt(estimatedPanelCount));
    const estimatedRows = Math.ceil(estimatedPanelCount / estimatedColumns);

    const layoutData = {
      name: layoutName || "Solar Array",
      data: {
        roof_plane_id: selectedRoofId,
        panel_count: estimatedPanelCount,
        offset_from_edge_m: offsetFromEdge,
        fill_mode: fillMode,
        orientation: panelOrientation,
        layout_config: {
          rows: estimatedRows,
          columns: estimatedColumns,
          panel_width_m: panelDimensions.width,
          panel_height_m: panelDimensions.height,
          spacing_type: panelSpacing
        }
      }
    };

    createSurveyorLayout.mutate(layoutData);
  };

  return (
    <main className="min-h-screen p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Link className="back-link" href={`/projects/${id}`}>← Back to project</Link>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          fontWeight: 500,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <div>
          <h2 className="text-2xl font-semibold">Panel Layout</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {mode === 'surveyor'
              ? 'Simple mode: Automatically arrange solar panels on your roof'
              : 'Advanced mode: Define precise panel layout with technical parameters'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: '0.5rem',
        }}>
          <button
            onClick={() => setMode('surveyor')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: mode === 'surveyor' ? 'var(--primary)' : 'transparent',
              color: mode === 'surveyor' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: mode === 'surveyor' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Simple Mode
          </button>
          <button
            onClick={() => setMode('advanced')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: mode === 'advanced' ? 'var(--primary)' : 'transparent',
              color: mode === 'advanced' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: mode === 'advanced' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Advanced Mode
          </button>
        </div>
      </div>

      {/* Surveyor Mode */}
      {mode === 'surveyor' && (
        <div className="mt-6">
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            padding: '2rem',
            maxWidth: '800px',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Create Solar Panel Array
            </h3>

            {/* Array Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Array Name
              </label>
              <input
                type="text"
                className="input"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="e.g., Main Array, South Roof Array"
                style={{ width: '100%' }}
              />
            </div>

            {/* Select Roof Surface */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Select Roof Surface
              </label>
              {planesQ.isLoading ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading roof surfaces...</p>
              ) : (planesQ.data || []).length === 0 ? (
                <div style={{
                  padding: '1rem',
                  background: 'var(--primary)10',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--primary)40',
                }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    No roof surfaces found. Please add roof geometry first.
                  </p>
                  <Link
                    href={`/projects/${id}/geometry`}
                    className="btn btn-purple"
                    style={{ marginTop: '0.75rem', display: 'inline-block', fontSize: '0.85rem' }}
                  >
                    Go to Geometry Page
                  </Link>
                </div>
              ) : (
                <select
                  className="select"
                  value={selectedRoofId || ''}
                  onChange={(e) => setSelectedRoofId(Number(e.target.value))}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select a roof surface --</option>
                  {(planesQ.data || []).map((plane) => (
                    <option key={plane.id} value={plane.id}>
                      {plane.name} (Tilt: {plane.tilt_deg}°, Azimuth: {plane.azimuth_deg}°)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Panel Orientation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Panel Orientation
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => setPanelOrientation('portrait')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: panelOrientation === 'portrait' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: panelOrientation === 'portrait' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: panelOrientation === 'portrait' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: panelOrientation === 'portrait' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: panelOrientation === 'portrait' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Portrait</div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: panelOrientation === 'portrait' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    Vertical (1.0m × 1.7m)
                  </div>
                </button>
                <button
                  onClick={() => setPanelOrientation('landscape')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: panelOrientation === 'landscape' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: panelOrientation === 'landscape' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: panelOrientation === 'landscape' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: panelOrientation === 'landscape' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: panelOrientation === 'landscape' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📺</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Landscape</div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: panelOrientation === 'landscape' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    Horizontal (1.7m × 1.0m)
                  </div>
                </button>
              </div>
            </div>

            {/* Fill Mode */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Panel Placement
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => setFillMode('max-fit')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: fillMode === 'max-fit' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: fillMode === 'max-fit' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: fillMode === 'max-fit' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: fillMode === 'max-fit' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: fillMode === 'max-fit' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔳</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Max Fit</div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: fillMode === 'max-fit' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    Fill roof with maximum panels
                  </div>
                </button>
                <button
                  onClick={() => setFillMode('custom')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: fillMode === 'custom' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: fillMode === 'custom' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: fillMode === 'custom' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: fillMode === 'custom' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: fillMode === 'custom' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Custom Count</div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: fillMode === 'custom' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    Specify panel count
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Panel Count (only show if custom mode) */}
            {fillMode === 'custom' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                  Number of Panels
                </label>
                <input
                  type="number"
                  className="input"
                  value={customPanelCount}
                  onChange={(e) => setCustomPanelCount(Number(e.target.value))}
                  min="1"
                  max="100"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Panel Spacing */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Panel Spacing
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => setPanelSpacing('tight')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: panelSpacing === 'tight' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: panelSpacing === 'tight' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: panelSpacing === 'tight' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: panelSpacing === 'tight' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: panelSpacing === 'tight' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Tight</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: panelSpacing === 'tight' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    0.5m gap
                  </div>
                </button>
                <button
                  onClick={() => setPanelSpacing('normal')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: panelSpacing === 'normal' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: panelSpacing === 'normal' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: panelSpacing === 'normal' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: panelSpacing === 'normal' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: panelSpacing === 'normal' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Normal</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: panelSpacing === 'normal' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    1.0m gap
                  </div>
                </button>
                <button
                  onClick={() => setPanelSpacing('wide')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: panelSpacing === 'wide' ? '2px solid var(--primary)' : '2px solid transparent',
                    background: panelSpacing === 'wide' ? 'var(--primary)' : 'var(--bg-primary)',
                    color: panelSpacing === 'wide' ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: panelSpacing === 'wide' ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                    transform: panelSpacing === 'wide' ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Wide</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: panelSpacing === 'wide' ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)'
                  }}>
                    1.5m gap
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="btn btn-purple"
              onClick={handleSurveyorSubmit}
              disabled={!selectedRoofId || createSurveyorLayout.isPending}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
            >
              {createSurveyorLayout.isPending ? 'Creating Array...' : '✓ Create Panel Array'}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Mode */}
      {mode === 'advanced' && (
        <div className="mt-6">
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            padding: '2rem',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              Create Layout (Technical)
            </h3>
            <input
              className="input"
              value={advancedName}
              onChange={(e) => setAdvancedName(e.target.value)}
              placeholder="Layout name"
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <textarea
              className="input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.875rem', color: '#000' }}
              rows={12}
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
            />
            <button
              className="btn btn-purple"
              onClick={() => createAdvancedLayout.mutate()}
              disabled={createAdvancedLayout.isPending}
              style={{ marginTop: '1rem' }}
            >
              {createAdvancedLayout.isPending ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
        </div>
      )}

      {/* Saved Layouts */}
      <section className="mt-6">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Saved Panel Arrays</h3>
        {layoutsQ.isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading layouts...</p>
        ) : (layoutsQ.data || []).length === 0 ? (
          <div style={{
            padding: '2rem',
            background: 'var(--bg-secondary)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-secondary)' }}>No panel arrays created yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {(layoutsQ.data || []).map((layout) => (
              <div
                key={layout.id}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{layout.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Layout #{layout.id}
                    </p>
                  </div>
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    background: 'var(--primary)20',
                    borderRadius: '0.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}>
                    {layout.data.panel_count || 0} panels
                  </div>
                </div>
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  borderRadius: '0.375rem',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                }}>
                  <pre style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {JSON.stringify(layout.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
