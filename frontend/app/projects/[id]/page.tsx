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
  const reportsQ = useQuery({ queryKey: ["reports", id], queryFn: () => apiGet<Report[]>(`/projects/${id}/reports`) });

  const [kind, setKind] = React.useState("photo");
  const [filename, setFilename] = React.useState("example.jpg");
  const [storageUrl, setStorageUrl] = React.useState("https://example.com/file");

  const addAsset = useMutation({
    mutationFn: () => apiPost<Asset>(`/projects/${id}/assets`, { kind, filename, storage_url: storageUrl, meta: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", id] }),
  });

  const runAnalysis = useMutation({
    mutationFn: (analysisKind: string) => apiPost(`/projects/${id}/analysis/${analysisKind}/run`, {}),
  });

  const genReport = useMutation({
    mutationFn: () => apiPost<Report>(`/projects/${id}/reports/generate`, {}),
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
          <h3 className="section-title">Assets</h3>
          <div className="form-group">
            <div className="input-row">
              <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="photo">📸 Photo</option>
                <option value="drone_model">🚁 Drone Model</option>
                <option value="document">📄 Document</option>
              </select>
              <input
                className="input"
                style={{ flex: 1 }}
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Filename"
              />
            </div>
            <input
              className="input input-full"
              value={storageUrl}
              onChange={(e) => setStorageUrl(e.target.value)}
              placeholder="Storage URL"
            />
            <button className="btn" onClick={() => addAsset.mutate()} disabled={addAsset.isPending}>
              {addAsset.isPending ? "Uploading..." : "➕ Add Asset"}
            </button>
          </div>

          {assetsQ.isLoading && <p className="loading-text">Loading assets...</p>}

          {assetsQ.data && assetsQ.data.length === 0 && (
            <div className="empty-state">No assets yet. Add your first asset above!</div>
          )}

          <ul className="asset-list">
            {(assetsQ.data || []).map((a) => (
              <li key={a.id} className="asset-item">
                <div className="asset-title">
                  <span className={`badge ${getBadgeClass(a.kind)}`}>{a.kind}</span>
                  {a.filename}
                </div>
                <div className="asset-url">{a.storage_url}</div>
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
                {r.storage_url && <div className="asset-url">{r.storage_url}</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
