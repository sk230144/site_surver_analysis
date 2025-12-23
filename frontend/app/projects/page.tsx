"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["projects"], queryFn: () => apiGet<Project[]>("/projects") });

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  const create = useMutation({
    mutationFn: (payload: { name: string; address?: string }) => apiPost<Project>("/projects", payload),
    onSuccess: () => {
      setName("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <main className="min-h-screen p-8">
      <h2 className="text-2xl font-semibold">Projects</h2>

      <div className="mt-6 max-w-xl rounded-lg border p-4">
        <h3 className="font-medium">Create Project</h3>
        <div className="mt-3 grid gap-2">
          <input className="rounded border p-2" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border p-2" placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button className="rounded border px-3 py-2" onClick={() => create.mutate({ name, address })} disabled={!name || create.isPending}>
            {create.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Failed to load projects.</p>}
        <ul className="mt-3 grid gap-2">
          {(data || []).map((p) => (
            <li key={p.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Link className="font-medium underline" href={`/projects/${p.id}`}>{p.name}</Link>
                  <div className="text-sm text-gray-600">{p.address || "—"}</div>
                </div>
                <div className="text-sm">{p.status}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
