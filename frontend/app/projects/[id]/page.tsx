"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };
type Asset = { id: number; project_id: number; kind: string; filename: string; content_type?: string | null; storage_url: string; meta: any };
type Report = { id: number; project_id: number; status: string; storage_url?: string | null; meta: any };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  const projectQ = useQuery({ queryKey: ["project", id], queryFn: () => apiGet<Project>(`/projects/${id}`) });
  const assetsQ = useQuery({ queryKey: ["assets", id], queryFn: () => apiGet<Asset[]>(`/projects/${id}/assets`) });
  const reportsQ = useQuery({
    queryKey: ["reports", id],
    queryFn: () => apiGet<Report[]>(`/projects/${id}/reports`),
    refetchInterval: (query) => {
      // Auto-refresh every 3 seconds if there are any queued/running reports
      const hasActiveReports = query.state.data?.some(r => r.status === "queued" || r.status === "running");
      return hasActiveReports ? 3000 : false;
    },
  });

  const [kind, setKind] = React.useState("photo");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [viewingPdfUrl, setViewingPdfUrl] = React.useState<string | null>(null);

  const uploadAsset = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      const res = await fetch(`http://localhost:8000/projects/${id}/assets/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", id] });
      setSelectedFile(null);
    },
  });

  const runAnalysis = useMutation({
    mutationFn: (analysisKind: string) => apiPost(`/projects/${id}/analysis/${analysisKind}/run`, {}),
  });

  const genReport = useMutation({
    mutationFn: () => apiPost<Report>(`/projects/${id}/reports/generate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", id] }),
  });

  const deleteReport = useMutation({
    mutationFn: (reportId: number) => fetch(`http://localhost:8000/reports/${reportId}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", id] }),
  });

  const getBadgeClass = (assetKind: string) => {
    const kindMap: Record<string, string> = {
      photo: "badge-photo",
      drone_model: "badge-drone",
      drone: "badge-drone",
      document: "badge-document",
      model: "badge-model",
    };
    return kindMap[assetKind] || "badge-photo";
  };

  return (
    <main className="project-detail-page">
      <Link className="back-link" href="/projects">
        ← Back to Projects
      </Link>

      <div className="project-header">
        <h2>Project Details</h2>
        {projectQ.isLoading && <p className="loading-text">Loading project...</p>}
        {projectQ.error && <p className="error-text">Failed to load project</p>}
        {projectQ.data && (
          <div className="project-card">
            <div className="project-name">{projectQ.data.name}</div>
            <div className="project-address">{projectQ.data.address || "No address provided"}</div>
            <span className="project-status">Status: {projectQ.data.status}</span>
            <div className="project-nav">
              <Link className="nav-link" href={`/projects/${id}/geometry`}>
                📐 Geometry
              </Link>
              <Link className="nav-link" href={`/projects/${id}/layouts`}>
                🔲 Layouts
              </Link>
              <Link className="nav-link" href={`/projects/${id}/reports`}>
                📄 Reports
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="content-grid">
        <section className="section-card">
          <h3 className="section-title">Assets - Upload Files</h3>
          <div className="form-group">
            <div className="input-row">
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="photo">📸 Photo</option>
                <option value="drone_model">🚁 Drone Model</option>
                <option value="document">📄 Document</option>
              </select>
              <input
                type="file"
                className="input"
                style={{ flex: 1 }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf,.zip,.obj,.fbx"
              />
            </div>
            {selectedFile && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
            <button
              className="btn"
              onClick={() => selectedFile && uploadAsset.mutate(selectedFile)}
              disabled={!selectedFile || uploadAsset.isPending}
            >
              {uploadAsset.isPending ? "Uploading..." : "📤 Upload File"}
            </button>
          </div>

          {assetsQ.isLoading && <p className="loading-text">Loading assets...</p>}

          {assetsQ.data && assetsQ.data.length === 0 && (
            <div className="empty-state">No assets yet. Add your first asset above!</div>
          )}

          <ul className="asset-list">
            {(assetsQ.data || []).map((a) => (
              <li key={a.id} className="asset-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {a.content_type?.startsWith('image/') ? (
                    <img
                      src={`http://localhost:8000${a.storage_url}`}
                      alt={a.filename}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        fontSize: '2rem'
                      }}
                    >
                      📄
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="asset-title">
                      <span className={`badge ${getBadgeClass(a.kind)}`}>{a.kind}</span>
                      {a.filename}
                    </div>
                    <div className="asset-url">
                      <a
                        href={`http://localhost:8000${a.storage_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
                      >
                        {a.content_type?.startsWith('image/') ? '🔍 View' : '⬇️ Download'}
                      </a>
                      {a.meta?.file_size && (
                        <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                          ({(a.meta.file_size / 1024).toFixed(2)} KB)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="section-card">
          <h3 className="section-title">Analysis & Reports</h3>
          <div className="analysis-grid">
            <button className="btn" onClick={() => runAnalysis.mutate("shading")} disabled={runAnalysis.isPending}>
              ☀️ Run Shading Analysis
            </button>
            <button className="btn-success btn" onClick={() => runAnalysis.mutate("compliance")} disabled={runAnalysis.isPending}>
              ✓ Run Compliance Check
            </button>
            <button className="btn-warning btn" onClick={() => runAnalysis.mutate("roof_risk")} disabled={runAnalysis.isPending}>
              ⚠️ Run Roof Risk Analysis
            </button>
            <button className="btn-purple btn" onClick={() => runAnalysis.mutate("electrical")} disabled={runAnalysis.isPending}>
              ⚡ Run Electrical Analysis
            </button>
          </div>

          <div className="divider"></div>

          <h4 className="section-title">Reports</h4>
          <button className="btn" onClick={() => genReport.mutate()} disabled={genReport.isPending}>
            {genReport.isPending ? "Generating..." : "📊 Generate Report"}
          </button>

          {reportsQ.isLoading && <p className="loading-text">Loading reports...</p>}

          {reportsQ.data && reportsQ.data.length === 0 && (
            <div className="empty-state">No reports generated yet.</div>
          )}

          <ul className="report-list">
            {(reportsQ.data || []).map((r) => (
              <li key={r.id} className="report-item">
                <div className="asset-title">
                  Report #{r.id}
                  <span className="project-status" style={{ marginLeft: '0.5rem' }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {r.storage_url && r.status === "done" && (
                    <button
                      className="btn btn-small"
                      onClick={() => setViewingPdfUrl(r.storage_url || null)}
                    >
                      📄 View Report
                    </button>
                  )}
                  <button
                    className="btn btn-small"
                    style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                    onClick={() => {
                      if (confirm(`Delete Report #${r.id}?`)) {
                        deleteReport.mutate(r.id);
                      }
                    }}
                    disabled={deleteReport.isPending}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* PDF Viewer Modal */}
      {viewingPdfUrl && (
        <div className="modal-overlay" onClick={() => setViewingPdfUrl(null)}>
          <div className="pdf-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-viewer-header">
              <h3>Report PDF Viewer</h3>
              <button className="close-btn" onClick={() => setViewingPdfUrl(null)}>
                ✕
              </button>
            </div>
            <iframe
              src={viewingPdfUrl.replace('file://', 'http://localhost:8000/').replace('reports_out', 'reports_files').replace(/\\/g, '/')}
              className="pdf-viewer-iframe"
              title="PDF Report"
            />
          </div>
        </div>
      )}
    </main>
  );
}
