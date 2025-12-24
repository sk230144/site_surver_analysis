"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["projects"], queryFn: () => apiGet<Project[]>("/projects") });

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<number[]>([]);

  const create = useMutation({
    mutationFn: (payload: { name: string; address?: string }) => apiPost<Project>("/projects", payload),
    onSuccess: () => {
      setName("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteProjects = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiDelete(`/projects/${id}`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setSelectedIds([]);
      setShowConfirmModal(false);
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === (data?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.map((p) => p.id) || []);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteClick = (ids: number[]) => {
    setDeleteTarget(ids);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    deleteProjects.mutate(deleteTarget);
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setDeleteTarget([]);
  };

  return (
    <main className="projects-page">
      <h2 className="page-title">Solar Projects</h2>

      <div className="create-project-card">
        <h3 className="section-title">Create New Project</h3>
        <div className="form-group">
          <input
            className="input input-full"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input input-full"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            className="btn"
            onClick={() => create.mutate({ name, address })}
            disabled={!name || create.isPending}
          >
            {create.isPending ? "Creating..." : "➕ Create Project"}
          </button>
        </div>
      </div>

      <div>
        {isLoading && <p className="loading-text">Loading projects...</p>}
        {error && <p className="error-text">Failed to load projects.</p>}

        {data && data.length > 0 && (
          <>
            <div className="projects-toolbar">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.length === data.length}
                  onChange={handleSelectAll}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selected`
                    : "Select all"}
                </span>
              </div>

              {selectedIds.length > 0 && (
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleDeleteClick(selectedIds)}
                >
                  🗑️ Delete Selected ({selectedIds.length})
                </button>
              )}
            </div>

            <ul className="asset-list">
              {data.map((p) => (
                <li
                  key={p.id}
                  className={`project-item ${selectedIds.includes(p.id) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => handleToggleSelect(p.id)}
                  />
                  <div className="project-content">
                    <div>
                      <Link className="project-link" href={`/projects/${p.id}`}>
                        {p.name}
                      </Link>
                      <div className="asset-url">{p.address || "No address"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span className="project-status">{p.status}</span>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteClick([p.id])}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {data && data.length === 0 && (
          <div className="empty-state">No projects yet. Create your first project above!</div>
        )}
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">⚠️ Confirm Deletion</h3>
            <p className="modal-message">
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget.length === 1
                  ? "this project"
                  : `${deleteTarget.length} projects`}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancelDelete}
                disabled={deleteProjects.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteProjects.isPending}
              >
                {deleteProjects.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
