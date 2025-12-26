"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../../lib/api";

type RoofPlane = {
  id: number;
  project_id: number;
  name?: string;
  tilt_deg?: number;
  azimuth_deg?: number;
  polygon_wkt: string;
};

type Obstruction = {
  id: number;
  project_id: number;
  type: string;
  height_m?: number;
  polygon_wkt: string;
};

export default function GeometryPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  const planesQ = useQuery({ queryKey: ["planes", id], queryFn: () => apiGet<RoofPlane[]>(`/projects/${id}/roof-planes`) });
  const obsQ = useQuery({ queryKey: ["obs", id], queryFn: () => apiGet<Obstruction[]>(`/projects/${id}/obstructions`) });

  // Roof Plane state
  const [planeName, setPlaneName] = React.useState("Main Roof");
  const [planeTilt, setPlaneTilt] = React.useState("25");
  const [planeAzimuth, setPlaneAzimuth] = React.useState("180");
  const [planeWkt, setPlaneWkt] = React.useState("POLYGON((0 0, 10 0, 10 8, 0 8, 0 0))");

  // Obstruction state
  const [obsType, setObsType] = React.useState("tree");
  const [obsHeight, setObsHeight] = React.useState("3");
  const [obsWkt, setObsWkt] = React.useState("POLYGON((2 2, 2 3, 3 3, 3 2, 2 2))");

  // Toast state
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Auto-hide after 5 seconds
  };

  const addPlane = useMutation({
    mutationFn: () => apiPost(`/projects/${id}/roof-planes`, {
      polygon_wkt: planeWkt,
      name: planeName || "Unnamed Plane",
      tilt_deg: parseFloat(planeTilt) || 0,
      azimuth_deg: parseFloat(planeAzimuth) || 0
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planes", id] });
      showToast("Roof plane added successfully!", "success");
      // Reset to defaults for next entry
      setPlaneName("Main Roof");
      setPlaneTilt("25");
      setPlaneAzimuth("180");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to add roof plane";
      showToast(errorMsg, "error");
    },
  });

  const addObs = useMutation({
    mutationFn: () => apiPost(`/projects/${id}/obstructions`, {
      polygon_wkt: obsWkt,
      type: obsType || "obstruction",
      height_m: parseFloat(obsHeight) || 0
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["obs", id] });
      showToast("Obstruction added successfully!", "success");
      // Reset to defaults for next entry
      setObsType("tree");
      setObsHeight("3");
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to add obstruction";
      showToast(errorMsg, "error");
    },
  });

  return (
    <main className="min-h-screen p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Link className="back-link" href={`/projects/${id}`}>← Back to project</Link>
      <h2 className="mt-4 text-2xl font-semibold">Geometry Editor</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        Define roof planes and obstructions for shading analysis
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* ROOF PLANES SECTION */}
        <section className="section-card">
          <h3 className="section-title">Roof Planes</h3>

          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="input"
              placeholder="e.g., Main Roof - South Facing"
              value={planeName}
              onChange={(e) => setPlaneName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Tilt (degrees)</label>
              <input
                className="input"
                type="number"
                placeholder="25"
                value={planeTilt}
                onChange={(e) => setPlaneTilt(e.target.value)}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>0° = flat, 90° = vertical</small>
            </div>

            <div className="form-group">
              <label className="form-label">Azimuth (degrees)</label>
              <input
                className="input"
                type="number"
                placeholder="180"
                value={planeAzimuth}
                onChange={(e) => setPlaneAzimuth(e.target.value)}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>0° = N, 90° = E, 180° = S</small>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Polygon WKT</label>
            <textarea
              className="input"
              rows={4}
              placeholder="POLYGON((0 0, 10 0, 10 8, 0 8, 0 0))"
              value={planeWkt}
              onChange={(e) => setPlaneWkt(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Coordinates in meters (X Y pairs)
            </small>
          </div>

          <button
            className="btn"
            onClick={() => addPlane.mutate()}
            disabled={addPlane.isPending}
          >
            {addPlane.isPending ? "Adding..." : "➕ Add Roof Plane"}
          </button>

          <div className="divider"></div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Existing Roof Planes ({planesQ.data?.length || 0})
          </h4>
          <ul className="grid gap-2">
            {(planesQ.data || []).map((p) => (
              <li key={p.id} className="asset-item">
                <div>
                  <div className="asset-title">
                    <span className="badge badge-photo">Plane {p.id}</span>
                    {p.name || "Unnamed"}
                  </div>
                  <div className="asset-url">
                    <span>Tilt: {p.tilt_deg || 0}° | Azimuth: {p.azimuth_deg || 0}°</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    {p.polygon_wkt}
                  </div>
                </div>
              </li>
            ))}
            {planesQ.data?.length === 0 && (
              <div className="empty-state">No roof planes yet. Add one above!</div>
            )}
          </ul>
        </section>

        {/* OBSTRUCTIONS SECTION */}
        <section className="section-card">
          <h3 className="section-title">Obstructions</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="select"
                value={obsType}
                onChange={(e) => setObsType(e.target.value)}
              >
                <option value="tree">🌳 Tree</option>
                <option value="chimney">🏭 Chimney</option>
                <option value="vent">🔧 Vent</option>
                <option value="adjacent_building">🏢 Adjacent Building</option>
                <option value="antenna">📡 Antenna</option>
                <option value="other">❓ Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Height (meters)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                placeholder="3.0"
                value={obsHeight}
                onChange={(e) => setObsHeight(e.target.value)}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Height above roof</small>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Polygon WKT</label>
            <textarea
              className="input"
              rows={4}
              placeholder="POLYGON((2 2, 2 3, 3 3, 3 2, 2 2))"
              value={obsWkt}
              onChange={(e) => setObsWkt(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Footprint coordinates in meters
            </small>
          </div>

          <button
            className="btn"
            onClick={() => addObs.mutate()}
            disabled={addObs.isPending}
          >
            {addObs.isPending ? "Adding..." : "➕ Add Obstruction"}
          </button>

          <div className="divider"></div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Existing Obstructions ({obsQ.data?.length || 0})
          </h4>
          <ul className="grid gap-2">
            {(obsQ.data || []).map((o) => (
              <li key={o.id} className="asset-item">
                <div>
                  <div className="asset-title">
                    <span className="badge badge-drone">{o.type}</span>
                    Obstruction {o.id}
                  </div>
                  <div className="asset-url">
                    <span>Height: {o.height_m || 0}m</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    {o.polygon_wkt}
                  </div>
                </div>
              </li>
            ))}
            {obsQ.data?.length === 0 && (
              <div className="empty-state">No obstructions yet. Add one above!</div>
            )}
          </ul>
        </section>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>
              {toast.type === 'success' ? '✓' : '⚠️'}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
