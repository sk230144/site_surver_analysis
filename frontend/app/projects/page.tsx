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
  const [showCreateModal, setShowCreateModal] = React.useState(false);
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
    placeholderData: (previousData) => previousData,
  });

  // Handle search with debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);

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
      setShowCreateModal(false);
      qc.invalidateQueries({ queryKey: ["projects"] });
      setCurrentPage(1);
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
    <main className="projects-page-modern" style={{
      background: 'var(--bg-primary)',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {/* Header with Logo and Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
          }}>
            ☀️
          </div>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Solar Projects
            </h1>
            <p style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              Manage your solar installations
            </p>
          </div>
        </div>

        {/* Top Right: Search and New Project */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flex: '1',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: '300px', flex: '0 1 400px' }}>
            <input
              type="text"
              className="input search-input-modern"
              placeholder="🔍 Search projects..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                paddingRight: searchInput ? '3rem' : '1rem',
                borderRadius: '50px',
                border: '2px solid var(--border-color)',
                fontSize: '0.95rem'
              }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* New Project Button */}
          <button
            className="btn-new-project"
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
          >
            ➕ New Project
          </button>
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLoading ? 'Searching...' : `Found ${totalProjects} project${totalProjects !== 1 ? 's' : ''} matching "${searchQuery}"`}
          </span>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '2px solid var(--primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {selectedIds.length} project{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            className="btn"
            onClick={() => handleDeleteClick(selectedIds)}
            style={{
              background: 'var(--error)',
              borderColor: 'var(--error)'
            }}
          >
            🗑️ Delete Selected
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem' }}>Loading projects...</p>
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '2px solid var(--error)'
        }}>
          <p style={{ color: 'var(--error)', fontSize: '1.1rem' }}>❌ Failed to load projects</p>
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '2px dashed var(--border-color)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📂</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            {searchQuery ? `No projects found matching "${searchQuery}"` : 'No projects yet'}
          </p>
          {!searchQuery && (
            <button
              className="btn"
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderColor: 'transparent'
              }}
            >
              ➕ Create Your First Project
            </button>
          )}
        </div>
      )}

      {projects.length > 0 && (
        <>
          <div className="projects-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
                className="project-card-modern"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: `2px solid ${selectedIds.includes(project.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                  padding: '1.5rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: selectedIds.includes(project.id) ? '0 8px 24px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {/* Checkbox */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem'
                }}>
                  <input
                    type="checkbox"
                    className="checkbox-modern"
                    checked={selectedIds.includes(project.id)}
                    onChange={() => handleToggleSelect(project.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Project Icon */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)'
                }}>
                  ⚡
                </div>

                {/* Project Info */}
                <Link
                  href={`/projects/${project.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block'
                  }}
                >
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.name}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    📍 {project.address || 'No address provided'}
                  </p>
                </Link>

                {/* Status Badge */}
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '50px',
                  background: project.status === 'active' ? '#10b98120' : '#6b728020',
                  color: project.status === 'active' ? '#10b981' : '#6b7280',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '1rem'
                }}>
                  {project.status}
                </div>

                {/* Action Button */}
                <Link
                  href={`/projects/${project.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    border: '1px solid var(--border-color)'
                  }}
                  className="project-card-action"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '2rem 0',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              ⏮ First
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              ← Previous
            </button>

            <div style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontWeight: 600
            }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              Next →
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              Last ⏭
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginTop: '1rem'
          }}>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalProjects)} of {totalProjects} projects
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-secondary)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                ⚡ Create New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: 'var(--text-secondary)'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                Project Name *
              </label>
              <input
                className="input"
                placeholder="e.g., Residential Solar - Downtown"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem'
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                Address (Optional)
              </label>
              <input
                className="input"
                placeholder="e.g., 123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ name, address })}
                disabled={!name || create.isPending}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: !name ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: !name ? 'var(--text-muted)' : '#ffffff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: !name ? 'not-allowed' : 'pointer',
                  boxShadow: !name ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                {create.isPending ? '⏳ Creating...' : '✓ Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-secondary)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem'
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '1rem'
            }}>
              Confirm Deletion
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: 1.6
            }}>
              Are you sure you want to delete {deleteTarget.length} project{deleteTarget.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteProjects.isPending}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--error)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: deleteProjects.isPending ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteProjects.isPending ? '⏳ Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS Animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .btn-new-project:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }

        .project-card-modern:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }

        .project-card-action:hover {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
        }

        .pagination-btn:not(:disabled):hover {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .projects-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
