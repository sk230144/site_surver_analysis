"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };
type Asset = { id: number; project_id: number; kind: string; filename: string; content_type?: string | null; storage_url: string; metadata: any };
type Report = { id: number; project_id: number; status: string; storage_url?: string | null; metadata: any };

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
    mutationFn: () => apiPost<Asset>(`/projects/${id}/assets`, { kind, filename, storage_url: storageUrl, metadata: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", id] }),
  });

  const runAnalysis = useMutation({
    mutationFn: (kind: string) => apiPost(`/projects/${id}/analysis`, { kind }),
  });

  const genReport = useMutation({
    mutationFn: () => apiPost<Report>(`/projects/${id}/reports`, { include_assets: true, include_analysis: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", id] }),
  });

  return (
    <main className="min-h-screen p-8">
      <Link className="underline" href="/projects">← Back</Link>

      <div className="mt-4">
        <h2 className="text-2xl font-semibold">Project</h2>
        {projectQ.isLoading && <p>Loading…</p>}
        {projectQ.error && <p className="text-red-600">Failed to load project</p>}
        {projectQ.data && (
          <div className="mt-2 rounded border p-3">
            <div className="font-medium">{projectQ.data.name}</div>
            <div className="text-sm text-gray-600">{projectQ.data.address || "—"}</div>
            <div className="text-sm">Status: {projectQ.data.status}</div>
            <div className="mt-2 flex gap-3 text-sm">
              <Link className="underline" href={`/projects/${id}/geometry`}>Geometry</Link>
              <Link className="underline" href={`/projects/${id}/layouts`}>Layouts</Link>
              <Link className="underline" href={`/projects/${id}/reports`}>Reports</Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded border p-4">
          <h3 className="font-medium">Assets</h3>
          <div className="mt-3 grid gap-2">
            <div className="flex gap-2">
              <select className="rounded border p-2" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="photo">photo</option>
                <option value="model">model</option>
                <option value="drone">drone</option>
                <option value="doc">doc</option>
              </select>
              <input className="flex-1 rounded border p-2" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="filename" />
            </div>
            <input className="rounded border p-2" value={storageUrl} onChange={(e) => setStorageUrl(e.target.value)} placeholder="storage_url (temp)" />
            <button className="rounded border px-3 py-2" onClick={() => addAsset.mutate()} disabled={addAsset.isPending}>
              {addAsset.isPending ? "Saving…" : "Add asset metadata"}
            </button>
          </div>

          <ul className="mt-4 grid gap-2">
            {(assetsQ.data || []).map((a) => (
              <li key={a.id} className="rounded border p-2 text-sm">
                <div className="font-medium">[{a.kind}] {a.filename}</div>
                <div className="text-gray-600 break-all">{a.storage_url}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border p-4">
          <h3 className="font-medium">Run Analysis</h3>
          <div className="mt-3 grid gap-2">
            <button className="rounded border px-3 py-2" onClick={() => runAnalysis.mutate("shading")}>Run shading</button>
            <button className="rounded border px-3 py-2" onClick={() => runAnalysis.mutate("compliance")}>Run compliance</button>
            <button className="rounded border px-3 py-2" onClick={() => runAnalysis.mutate("roof_risk")}>Run roof risk</button>
            <button className="rounded border px-3 py-2" onClick={() => runAnalysis.mutate("electrical")}>Run electrical</button>
          </div>

          <div className="mt-6">
            <h4 className="font-medium">Reports</h4>
            <button className="mt-2 rounded border px-3 py-2" onClick={() => genReport.mutate()} disabled={genReport.isPending}>
              {genReport.isPending ? "Generating…" : "Generate minimal report"}
            </button>
            <ul className="mt-3 grid gap-2 text-sm">
              {(reportsQ.data || []).map((r) => (
                <li key={r.id} className="rounded border p-2">
                  <div>Report #{r.id} — {r.status}</div>
                  {r.storage_url && <div className="text-gray-600 break-all">{r.storage_url}</div>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
