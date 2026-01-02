"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../lib/api";

type Project = { id: number; name: string; address?: string | null; status: string };

type PaginatedResponse = {
  data: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
};

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");

  const ITEMS_PER_PAGE = 20;

  // Fetch paginated projects from backend with search
  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ["projects", currentPage, searchQuery],
    queryFn: () => {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      return apiGet<PaginatedResponse>(`/projects?page=${currentPage}&limit=${ITEMS_PER_PAGE}${searchParam}`);
    },
    keepPreviousData: true, // Keep showing old data while fetching new page
  });

  // Handle search with debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Extract data for easier use
  const projects = paginatedData?.data || [];
  const pagination = paginatedData?.pagination;
  const totalProjects = pagination?.total || 0;
  const totalPages = pagination?.total_pages || 0;

  const create = useMutation({
    mutationFn: (payload: { name: string; address?: string }) => apiPost<Project>("/projects", payload),
    onSuccess: () => {
      setName("");
      setAddress("");
      // Refetch all pages to update counts
      qc.invalidateQueries({ queryKey: ["projects"] });
      // Go to first page to see new project
      setCurrentPage(1);
    },
  });

  const deleteProjects = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiDelete(`/projects/${id}`)));
    },
    onSuccess: () => {
      // Refetch current page
      qc.invalidateQueries({ queryKey: ["projects"] });
      setSelectedIds([]);
      setShowConfirmModal(false);

      // If current page becomes empty, go to previous page
      if (projects.length === selectedIds.length && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p.id));
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
        {/* Search Bar */}
        <div style={{
          marginBottom: '1.5rem',
          maxWidth: '600px'
        }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search projects by name or address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '1rem',
                fontSize: '0.95rem'
              }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              {isLoading ? (
                'Searching...'
              ) : (
                `Found ${totalProjects} project${totalProjects !== 1 ? 's' : ''} matching "${searchQuery}"`
              )}
            </div>
          )}
        </div>

        {isLoading && <p className="loading-text">Loading projects...</p>}
        {error && <p className="error-text">Failed to load projects.</p>}

        {projects && projects.length > 0 && (
          <>
            <div className="projects-toolbar">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.length === projects.length && projects.length > 0}
                  onChange={handleSelectAll}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selected`
                    : "Select all on page"}
                </span>
              </div>

              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalProjects)} of {totalProjects} projects
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
              {projects.map((p) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="pagination-controls"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border-color)',
                  flexWrap: 'wrap'
                }}>
                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⏮️ First
                </button>

                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Previous
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>

                <button
                  className="btn btn-small"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Last ⏭️
                </button>
              </div>
            )}
          </>
        )}

        {paginatedData && projects.length === 0 && (
          <div className="empty-state">
            {searchQuery ? (
              <>
                No projects found matching "{searchQuery}".
                <br />
                <button
                  onClick={() => setSearchInput("")}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Clear Search
                </button>
              </>
            ) : (
              'No projects yet. Create your first project above!'
            )}
          </div>
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
