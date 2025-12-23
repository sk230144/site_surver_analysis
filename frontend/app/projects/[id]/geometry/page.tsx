"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../../lib/api";

type RoofPlane = { id: number; project_id: number; polygon_wkt: string };
type Obstruction = { id: number; project_id: number; type: string; polygon_wkt: string };

export default function GeometryPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();

  const planesQ = useQuery({ queryKey: ["planes", id], queryFn: () => apiGet<RoofPlane[]>(`/projects/${id}/roof-planes`) });
  const obsQ = useQuery({ queryKey: ["obs", id], queryFn: () => apiGet<Obstruction[]>(`/projects/${id}/obstructions`) });

  const [planeWkt, setPlaneWkt] = React.useState("POLYGON((0 0, 0 10, 10 10, 10 0, 0 0))");
  const [obsWkt, setObsWkt] = React.useState("POLYGON((2 2, 2 3, 3 3, 3 2, 2 2))");
  const [obsType, setObsType] = React.useState("vent");

  const addPlane = useMutation({
    mutationFn: () => apiPost(`/projects/${id}/roof-planes`, { polygon_wkt: planeWkt, name: "Plane", tilt_deg: 10, azimuth_deg: 180 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planes", id] }),
  });

  const addObs = useMutation({
    mutationFn: () => apiPost(`/projects/${id}/obstructions`, { polygon_wkt: obsWkt, type: obsType, height_m: 0.5 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["obs", id] }),
  });

  return (
    <main className="min-h-screen p-8">
      <Link className="underline" href={`/projects/${id}`}>← Back to project</Link>
      <h2 className="mt-4 text-2xl font-semibold">Geometry</h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border p-4">
          <h3 className="font-medium">Roof Planes</h3>
          <textarea className="mt-2 w-full rounded border p-2 text-sm" rows={4} value={planeWkt} onChange={(e) => setPlaneWkt(e.target.value)} />
          <button className="mt-2 rounded border px-3 py-2" onClick={() => addPlane.mutate()}>Add plane</button>
          <ul className="mt-3 grid gap-2 text-sm">
            {(planesQ.data || []).map((p) => (
              <li key={p.id} className="rounded border p-2">
                <div className="font-medium">Plane #{p.id}</div>
                <div className="text-gray-600 break-all">{p.polygon_wkt}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border p-4">
          <h3 className="font-medium">Obstructions</h3>
          <input className="mt-2 w-full rounded border p-2" value={obsType} onChange={(e) => setObsType(e.target.value)} />
          <textarea className="mt-2 w-full rounded border p-2 text-sm" rows={4} value={obsWkt} onChange={(e) => setObsWkt(e.target.value)} />
          <button className="mt-2 rounded border px-3 py-2" onClick={() => addObs.mutate()}>Add obstruction</button>
          <ul className="mt-3 grid gap-2 text-sm">
            {(obsQ.data || []).map((o) => (
              <li key={o.id} className="rounded border p-2">
                <div className="font-medium">[{o.type}] #{o.id}</div>
                <div className="text-gray-600 break-all">{o.polygon_wkt}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
