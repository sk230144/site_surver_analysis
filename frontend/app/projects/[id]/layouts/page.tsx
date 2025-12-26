"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../../lib/api";

type Layout = { id: number; project_id: number; name: string; data: any };

export default function LayoutsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  const layoutsQ = useQuery({ queryKey: ["layouts", id], queryFn: () => apiGet<Layout[]>(`/projects/${id}/layouts`) });

  const [name, setName] = React.useState("Layout v1");
  const [dataJson, setDataJson] = React.useState(JSON.stringify({
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

  const create = useMutation({
    mutationFn: () => apiPost<Layout>(`/projects/${id}/layouts`, { name, data: JSON.parse(dataJson) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["layouts", id] }),
  });

  return (
    <main className="min-h-screen p-8">
      <Link className="underline" href={`/projects/${id}`}>← Back to project</Link>
      <h2 className="mt-4 text-2xl font-semibold">Layouts</h2>

      <section className="mt-6 rounded border p-4">
        <h3 className="font-medium">Create layout</h3>
        <input className="mt-2 w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea
          className="mt-2 w-full rounded border p-2 font-mono text-sm text-black"
          style={{ color: '#000' }}
          rows={12}
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
        />
        <button className="mt-2 rounded border px-3 py-2" onClick={() => create.mutate()}>Save layout</button>
      </section>

      <section className="mt-6">
        <h3 className="font-medium">Saved layouts</h3>
        <ul className="mt-2 grid gap-2 text-sm">
          {(layoutsQ.data || []).map((l) => (
            <li key={l.id} className="rounded border p-3">
              <div className="font-medium">{l.name} (#{l.id})</div>
              <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-black" style={{ color: '#000' }}>{JSON.stringify(l.data, null, 2)}</pre>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
