"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../../lib/api";

type Report = { id: number; project_id: number; status: string; storage_url?: string | null; metadata: any };

export default function ReportsPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const reportsQ = useQuery({ queryKey: ["reports", id], queryFn: () => apiGet<Report[]>(`/projects/${id}/reports`) });

  return (
    <main className="min-h-screen p-8">
      <Link className="underline" href={`/projects/${id}`}>← Back to project</Link>
      <h2 className="mt-4 text-2xl font-semibold">Reports</h2>
      <ul className="mt-4 grid gap-2 text-sm">
        {(reportsQ.data || []).map((r) => (
          <li key={r.id} className="rounded border p-3">
            <div className="font-medium">Report #{r.id} — {r.status}</div>
            {r.storage_url && <div className="text-gray-600 break-all">{r.storage_url}</div>}
          </li>
        ))}
      </ul>
    </main>
  );
}
