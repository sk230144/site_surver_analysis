"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };
type Asset = { id: number; project_id: number; kind: string; filename: string; content_type?: string | null; storage_url: string; meta: any };
type Report = { id: number; project_id: number; status: string; storage_url?: string | null; meta: any; created_at: string; updated_at: string };
type AnalysisResult = { id: number; project_id: number; kind: string; status: string; result: any; created_at: string; updated_at: string };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  const projectQ = useQuery({ queryKey: ["project", id], queryFn: () => apiGet<Project>(`/projects/${id}`) });
  const assetsQ = useQuery({ queryKey: ["assets", id], queryFn: () => apiGet<Asset[]>(`/projects/${id}/assets`) });
  const analysisQ = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => apiGet<AnalysisResult[]>(`/projects/${id}/analysis`),
    refetchInterval: (query) => {
      // Auto-refresh every 2 seconds if there are any queued/running analyses
      const hasActiveAnalyses = query.state.data?.some(a => a.status === "queued" || a.status === "running");
      return hasActiveAnalyses ? 2000 : false;
    },
  });
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
  const [analysisFilter, setAnalysisFilter] = React.useState<string>("all");

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analysis", id] }),
  });

  const genReport = useMutation({
    mutationFn: () => apiPost<Report>(`/projects/${id}/reports/generate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", id] }),
  });

  const deleteReport = useMutation({
    mutationFn: (reportId: number) => fetch(`http://localhost:8000/reports/${reportId}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", id] }),
  });

  const deleteAnalysis = useMutation({
    mutationFn: (analysisId: number) => fetch(`http://localhost:8000/analysis/${analysisId}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analysis", id] }),
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { emoji: string; color: string }> = {
      queued: { emoji: "⏳", color: "#f59e0b" },
      running: { emoji: "⚙️", color: "#3b82f6" },
      done: { emoji: "✓", color: "#10b981" },
      failed: { emoji: "✗", color: "#ef4444" },
    };
    const config = statusMap[status] || { emoji: "?", color: "#6b7280" };
    return (
      <span style={{
        background: config.color,
        color: 'white',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.85rem',
        fontWeight: 600
      }}>
        {config.emoji} {status}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderShadingResult = (result: any) => {
    if (!result || Object.keys(result).length === 0) return null;

    const planes = result.planes || [];

    // Detect if this is advanced analysis (has annual_energy_loss_percent)
    const isAdvanced = planes.length > 0 && planes[0].annual_energy_loss_percent !== undefined;

    if (isAdvanced) {
      // Advanced Analysis Display - Show key summary only
      const avgLoss = result.average_annual_energy_loss || 0;
      const avgPeakLoss = result.average_peak_hours_loss || 0;

      return (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ☀️ Advanced Shading Analysis
            <span style={{
              fontSize: '0.75rem',
              background: 'var(--accent-blue)',
              color: 'white',
              padding: '0.15rem 0.4rem',
              borderRadius: '0.25rem'
            }}>
              v2
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.25rem' }}>
              <span style={{ fontWeight: 600 }}>Overall Shading Level:</span>
              <span style={{
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '0.375rem',
                background: avgLoss > 15 ? '#ef444420' : avgLoss > 5 ? '#f59e0b20' : '#10b98120',
                color: avgLoss > 15 ? '#ef4444' : avgLoss > 5 ? '#f59e0b' : '#10b981'
              }}>
                {avgLoss > 15 ? '🔴 High' : avgLoss > 5 ? '🟡 Medium' : '🟢 Low'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: 'var(--bg-secondary)', borderRadius: '0.25rem' }}>
              <span>📊 Avg Annual Energy Loss:</span>
              <span style={{ fontWeight: 600 }}>{avgLoss.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem', background: 'var(--bg-secondary)', borderRadius: '0.25rem' }}>
              <span title="Power loss during strongest sunlight hours (10 AM - 4 PM)">
                ☀️ Peak Hours Loss:
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>ℹ️</span>
              </span>
              <span style={{ fontWeight: 600 }}>{avgPeakLoss.toFixed(1)}%</span>
            </div>
          </div>

          {planes.slice(0, 3).map((plane: any, idx: number) => {
            const annualLoss = plane.annual_energy_loss_percent || 0;
            const shadingLevel = annualLoss > 15 ? '🔴 High' : annualLoss > 5 ? '🟡 Medium' : '🟢 Low';
            const shadingColor = annualLoss > 15 ? '#ef4444' : annualLoss > 5 ? '#f59e0b' : '#10b981';

            // Calculate production quality based on actual vs potential
            const actualProd = plane.annual_production_kwh_m2 || 0;
            const potentialProd = plane.potential_production_kwh_m2 || 1;
            const productionRatio = actualProd / potentialProd;
            const productionQuality = productionRatio > 0.95 ? 'Excellent' : productionRatio > 0.85 ? 'Good' : productionRatio > 0.70 ? 'Average' : 'Poor';
            const productionColor = productionRatio > 0.95 ? '#10b981' : productionRatio > 0.85 ? '#3b82f6' : productionRatio > 0.70 ? '#f59e0b' : '#ef4444';

            return (
              <div key={idx} style={{ marginTop: '0.5rem', paddingLeft: '0.75rem', borderLeft: '3px solid var(--border-color)' }}>
                <div style={{ fontWeight: 500, marginBottom: '0.35rem' }}>{plane.plane_name || `Plane ${plane.plane_id}`}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Shading Level:</span>
                    <strong style={{
                      color: shadingColor,
                      padding: '0.1rem 0.4rem',
                      background: `${shadingColor}20`,
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem'
                    }}>
                      {shadingLevel}
                    </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({annualLoss}% loss)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Expected Production:</span>
                    <strong style={{
                      color: productionColor,
                      padding: '0.1rem 0.4rem',
                      background: `${productionColor}20`,
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem'
                    }}>
                      {productionQuality}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}

          {planes.length > 3 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              + {planes.length - 3} more plane(s)
            </div>
          )}

          {/* Recommendation Conclusion */}
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: avgLoss > 15 ? '#ef444410' : avgLoss > 5 ? '#f59e0b10' : '#10b98110',
            borderLeft: `4px solid ${avgLoss > 15 ? '#ef4444' : avgLoss > 5 ? '#f59e0b' : '#10b981'}`,
            borderRadius: '0.25rem',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            {avgLoss > 15 ? '⚠️ Recommendation: ' : avgLoss > 5 ? '⚡ Recommendation: ' : '✅ Recommendation: '}
            <span style={{ fontWeight: 500 }}>
              {avgLoss > 15
                ? 'Significant shading detected. Consider obstruction mitigation before installation to maximize ROI.'
                : avgLoss > 5
                ? 'Moderate shading present. Site is suitable for solar with expected performance reduction.'
                : 'Excellent site conditions! Minimal shading impact - ideal for solar installation.'}
            </span>
          </div>

          <div style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: '0.25rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}>
            💡 Full details including worst/best moments, monthly breakdown, and recommendations available in PDF report
          </div>
        </div>
      );
    } else {
      // Simple/Legacy Analysis Display
      const avgRisk = result.average_shade_risk || 0;

      return (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            📊 Average Shade Risk: <span style={{ color: avgRisk > 50 ? '#ef4444' : avgRisk > 25 ? '#f59e0b' : '#10b981' }}>
              {avgRisk}/100
            </span>
          </div>
          {planes.slice(0, 3).map((plane: any, idx: number) => (
            <div key={idx} style={{ marginTop: '0.5rem', paddingLeft: '0.75rem', borderLeft: '3px solid var(--border-color)' }}>
              <div style={{ fontWeight: 500 }}>{plane.plane_name || `Plane ${plane.plane_id}`}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Risk: {plane.shade_risk_score}/100 | Est. Loss: {plane.estimated_annual_loss_percent}%
              </div>
              {plane.dominant_obstruction && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Dominant: {plane.dominant_obstruction.type} ({plane.dominant_obstruction.height_m}m, {plane.dominant_obstruction.distance_m?.toFixed(1)}m away)
                </div>
              )}
            </div>
          ))}
          {planes.length > 3 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              + {planes.length - 3} more plane(s)
            </div>
          )}
        </div>
      );
    }
  };

  // Filter and sort analysis results
  const filteredAnalyses = React.useMemo(() => {
    let filtered = analysisQ.data || [];

    // Apply filter
    if (analysisFilter !== "all") {
      filtered = filtered.filter(a => a.kind === analysisFilter);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [analysisQ.data, analysisFilter]);

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

          {/* Analysis Results */}
          {analysisQ.data && analysisQ.data.length > 0 && (
            <>
              <div className="divider"></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>Analysis Results</h4>
                <select
                  className="select"
                  style={{ width: 'auto', fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                  value={analysisFilter}
                  onChange={(e) => setAnalysisFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="shading">☀️ Shading</option>
                  <option value="compliance">✓ Compliance</option>
                  <option value="roof_risk">⚠️ Roof Risk</option>
                  <option value="electrical">⚡ Electrical</option>
                </select>
              </div>
              <div style={{
                display: 'grid',
                gap: '0.75rem',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '0.25rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-primary)'
              }}>
                {filteredAnalyses.length === 0 && (
                  <div className="empty-state" style={{ margin: '1rem' }}>
                    No {analysisFilter !== 'all' ? analysisFilter : ''} analysis results found
                  </div>
                )}
                {filteredAnalyses.map((analysis) => (
                  <div key={analysis.id} style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-secondary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                          {analysis.kind === 'shading' && '☀️'}
                          {analysis.kind === 'compliance' && '✓'}
                          {analysis.kind === 'roof_risk' && '⚠️'}
                          {analysis.kind === 'electrical' && '⚡'}
                          {' '}
                          {analysis.kind.charAt(0).toUpperCase() + analysis.kind.slice(1).replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🕒 {formatTimestamp(analysis.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {getStatusBadge(analysis.status)}
                        <button
                          className="btn btn-small"
                          style={{
                            background: 'var(--error)',
                            borderColor: 'var(--error)',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            minWidth: 'auto'
                          }}
                          onClick={() => {
                            if (confirm(`Delete this ${analysis.kind} analysis?`)) {
                              deleteAnalysis.mutate(analysis.id);
                            }
                          }}
                          disabled={deleteAnalysis.isPending}
                          title="Delete analysis"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {analysis.status === 'done' && analysis.kind === 'shading' && renderShadingResult(analysis.result)}

                    {analysis.status === 'done' && analysis.kind !== 'shading' && analysis.result?.summary && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {analysis.result.summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="divider"></div>

          <h4 className="section-title">Reports</h4>
          <button className="btn" onClick={() => genReport.mutate()} disabled={genReport.isPending}>
            {genReport.isPending ? "Generating..." : "📊 Generate Report"}
          </button>

          {reportsQ.isLoading && <p className="loading-text">Loading reports...</p>}

          {reportsQ.data && reportsQ.data.length === 0 && (
            <div className="empty-state">No reports generated yet.</div>
          )}

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: '0.75rem',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.25rem'
          }}>
            <ul className="report-list" style={{ margin: 0 }}>
              {(reportsQ.data || [])
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((r) => (
                <li key={r.id} className="report-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="asset-title">
                        Report #{r.id}
                        {getStatusBadge(r.status)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        🕒 {formatTimestamp(r.created_at)}
                      </div>
                    </div>
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
          </div>
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
