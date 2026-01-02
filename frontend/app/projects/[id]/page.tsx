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

  // Roof risk modal state
  const [showRoofRiskModal, setShowRoofRiskModal] = React.useState(false);
  const [roofImages, setRoofImages] = React.useState<File[]>([]);
  const [roofSurveyData, setRoofSurveyData] = React.useState({
    roof_age: "",
    roof_type: "",
    visible_cracks: false,
    crack_severity: "minor",
    leakage_signs: false,
    major_damage: false,
    weak_structures: false,
    rust_corrosion: false,
    obstacle_count: 0,
    slope_angle: "",
  });

  // Electrical analysis modal state
  const [showElectricalModal, setShowElectricalModal] = React.useState(false);
  const [panelImages, setPanelImages] = React.useState<File[]>([]);
  const [electricalData, setElectricalData] = React.useState({
    system_size_kw: "",
    main_panel_rating_a: "",
    main_breaker_rating_a: "",
    phase_type: "single",
    panel_age: "unknown",
    voltage: "230",
    panel_condition: "good",
    wiring_condition: "good",
  });

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

  const deleteAsset = useMutation({
    mutationFn: (assetId: number) => fetch(`http://localhost:8000/assets/${assetId}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", id] }),
  });

  const runRoofRiskWithData = useMutation({
    mutationFn: async () => {
      // Show notification that analysis is starting
      alert('Roof risk analysis started. This may take 30-60 seconds. Please wait...');

      const formData = new FormData();

      // Add roof images
      roofImages.forEach((file, index) => {
        formData.append(`images`, file);
      });

      // Add survey data as JSON
      formData.append('survey_data', JSON.stringify(roofSurveyData));

      const res = await fetch(`http://localhost:8000/projects/${id}/analysis/roof_risk/run_with_data`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Roof risk analysis failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis", id] });
      qc.invalidateQueries({ queryKey: ["assets", id] });
      setShowRoofRiskModal(false);
      setRoofImages([]);
      setRoofSurveyData({
        roof_age: "",
        roof_type: "",
        visible_cracks: false,
        crack_severity: "minor",
        leakage_signs: false,
        major_damage: false,
        weak_structures: false,
        rust_corrosion: false,
        obstacle_count: 0,
        slope_angle: "",
      });
      alert('Roof risk analysis completed! Check the results below.');
    },
  });

  const runElectricalWithData = useMutation({
    mutationFn: async () => {
      alert('Electrical analysis started. This may take 20-30 seconds. Please wait...');

      const formData = new FormData();

      // Add panel images
      panelImages.forEach((file) => {
        formData.append(`images`, file);
      });

      // Add electrical data as JSON
      formData.append('electrical_data', JSON.stringify(electricalData));

      const res = await fetch(`http://localhost:8000/projects/${id}/analysis/electrical/run_with_data`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Electrical analysis failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis", id] });
      qc.invalidateQueries({ queryKey: ["assets", id] });
      setShowElectricalModal(false);
      setPanelImages([]);
      setElectricalData({
        system_size_kw: "",
        main_panel_rating_a: "",
        main_breaker_rating_a: "",
        phase_type: "single",
        panel_age: "unknown",
        voltage: "230",
        panel_condition: "good",
        wiring_condition: "good",
      });
      alert('Electrical analysis completed! Check the results below.');
    },
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

  const renderComplianceResult = (result: any) => {
    if (!result || Object.keys(result).length === 0) return null;

    const status = result.overall_status || 'unknown';
    const score = result.compliance_score || 0;
    const violations = result.violations || [];

    // Status colors and icons
    const statusConfig = {
      pass: { color: '#10b981', bg: '#10b98110', icon: '✅', label: 'PASS' },
      warning: { color: '#f59e0b', bg: '#f59e0b10', icon: '⚠️', label: 'WARNING' },
      fail: { color: '#ef4444', bg: '#ef444410', icon: '❌', label: 'FAIL' },
      unknown: { color: '#6b7280', bg: '#6b728010', icon: '❓', label: 'UNKNOWN' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;

    return (
      <div style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '0.5rem',
        fontSize: '0.9rem'
      }}>
        {/* Overall Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          padding: '0.5rem',
          background: config.bg,
          borderLeft: `4px solid ${config.color}`,
          borderRadius: '0.25rem'
        }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: config.color }}>
            {config.icon} {config.label}
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: config.color }}>
            Score: {score}/100
          </div>
        </div>

        {/* Summary */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          {result.summary}
        </div>

        {/* Violations */}
        {violations.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Issues Found ({violations.length}):
            </div>
            {violations.slice(0, 3).map((violation: any, idx: number) => {
              const severityColor = violation.severity === 'high' ? '#ef4444' : violation.severity === 'medium' ? '#f59e0b' : '#6b7280';
              const severityBg = violation.severity === 'high' ? '#ef444410' : violation.severity === 'medium' ? '#f59e0b10' : '#6b728010';

              return (
                <div key={idx} style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: severityBg,
                  borderLeft: `3px solid ${severityColor}`,
                  borderRadius: '0.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {violation.rule_name}
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem',
                      background: severityColor,
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {violation.severity}
                    </span>
                  </div>
                  {violation.affected_plane && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      📍 {violation.affected_plane}
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    {violation.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    💡 Fix: {violation.fix_suggestion}
                  </div>
                </div>
              );
            })}
            {violations.length > 3 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                + {violations.length - 3} more issue(s)
              </div>
            )}
          </div>
        )}

        {/* Checked planes info */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          Checked {result.checked_planes || 0} of {result.total_planes || 0} roof plane(s) with layouts
        </div>
      </div>
    );
  };

  const renderRoofRiskResult = (result: any) => {
    if (!result || Object.keys(result).length === 0) return null;

    const status = result.overall_status || 'unknown';
    const riskScore = result.risk_score || 0;
    const reasons = result.reasons || [];
    const recommendation = result.recommendation || '';

    // Status colors and icons
    const statusConfig: Record<string, any> = {
      safe: { color: '#10b981', bg: '#10b98110', icon: '✅', label: 'SAFE' },
      needs_inspection: { color: '#f59e0b', bg: '#f59e0b10', icon: '⚠️', label: 'NEEDS INSPECTION' },
      high_risk: { color: '#ef4444', bg: '#ef444410', icon: '❌', label: 'HIGH RISK' },
      unknown: { color: '#6b7280', bg: '#6b728010', icon: '❓', label: 'UNKNOWN' }
    };

    const config = statusConfig[status] || statusConfig.unknown;

    return (
      <div style={{
        marginTop: '0.75rem',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: `2px solid ${config.color}20`
      }}>
        {/* Status Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{config.icon}</span>
            <span style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: config.color
            }}>
              {config.label}
            </span>
          </div>
          <div style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            background: config.bg,
            color: config.color,
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            Risk Score: {riskScore}/100
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Reasons:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.25rem' }}>
              {reasons.map((reason: string, idx: number) => (
                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {recommendation && (
          <div style={{
            padding: '0.75rem',
            background: config.bg,
            borderRadius: '0.375rem',
            borderLeft: `3px solid ${config.color}`
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', color: config.color }}>
              Recommendation:
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
              {recommendation}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderElectricalResult = (result: any) => {
    if (!result || Object.keys(result).length === 0) return null;

    const status = result.status || 'unknown';
    const score = result.score || 0;
    const summary = result.summary || '';
    const checks = result.checks || [];
    const recommendations = result.recommendations || [];
    const calculations = result.calculations || {};
    const electricalDataUsed = result.electrical_data_used || {};

    // Status colors and icons
    const statusConfig: Record<string, any> = {
      ok: { color: '#10b981', bg: '#10b98110', icon: '✅', label: 'APPROVED' },
      warning: { color: '#f59e0b', bg: '#f59e0b10', icon: '⚠️', label: 'WARNING' },
      fail: { color: '#ef4444', bg: '#ef444410', icon: '❌', label: 'FAILED' },
      unknown: { color: '#6b7280', bg: '#6b728010', icon: '❓', label: 'UNKNOWN' }
    };

    const config = statusConfig[status] || statusConfig.unknown;

    // Map panel age values to display text
    const panelAgeMap: Record<string, string> = {
      'under_10_years': '< 10 years',
      '10_20_years': '10-20 years',
      '20_30_years': '20-30 years',
      'over_30_years': '30+ years',
      'unknown': 'Unknown'
    };

    // Extract quick summary from status
    let quickSummary = '';
    let actionRequired = '';

    if (status === 'ok') {
      quickSummary = 'Safe to install solar on current electrical system';
      actionRequired = 'Proceed with installation';
    } else if (status === 'warning') {
      quickSummary = 'Electrical system has concerns that need review';
      actionRequired = 'Review safety checks before proceeding';
    } else {
      quickSummary = 'Unsafe to install solar on current electrical system';
      actionRequired = 'Electrical panel upgrade needed';
    }

    return (
      <div style={{
        marginTop: '0.75rem',
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: '0.5rem',
        border: `2px solid ${config.color}20`
      }}>
        {/* Quick Summary at Top */}
        <div style={{
          padding: '0.75rem',
          background: config.bg,
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          borderLeft: `4px solid ${config.color}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
            <span style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              color: config.color
            }}>
              Electrical: {config.label}
            </span>
          </div>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
            fontWeight: 500
          }}>
            {quickSummary}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            Action required: {actionRequired}
          </div>
        </div>

        {/* Status Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{config.icon}</span>
            <span style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: config.color
            }}>
              {config.label}
            </span>
          </div>
          <div style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            background: config.bg,
            color: config.color,
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            Safety Score: {score}/100
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div style={{
            padding: '0.75rem',
            background: config.bg,
            borderRadius: '0.375rem',
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            lineHeight: '1.5'
          }}>
            {summary}
          </div>
        )}

        {/* Input Data Section */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Analysis Input Data:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Planned Solar System Size (kW):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {electricalDataUsed.system_size_kw || calculations.system_size_kw || 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Main Panel Rating (A):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {electricalDataUsed.main_panel_rating_a || calculations.main_panel_rating_a || 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Main Breaker Rating (A):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {electricalDataUsed.main_breaker_rating_a || calculations.main_breaker_a || 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Voltage (V):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {electricalDataUsed.voltage || calculations.voltage || 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Phase Type:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {(electricalDataUsed.phase_type || calculations.phase_type || 'N/A').replace('_', ' ')}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Panel Age:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {panelAgeMap[electricalDataUsed.panel_age] || electricalDataUsed.panel_age || 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Panel Condition:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {(electricalDataUsed.panel_condition || 'N/A').charAt(0).toUpperCase() + (electricalDataUsed.panel_condition || '').slice(1)}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Wiring Condition:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
                {(electricalDataUsed.wiring_condition || 'N/A').charAt(0).toUpperCase() + (electricalDataUsed.wiring_condition || '').slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Checks */}
        {checks.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Safety Checks:
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {checks.map((check: any, idx: number) => {
                const checkStatus = check.status || 'unknown';
                const checkIcon = checkStatus === 'pass' ? '✅' : checkStatus === 'warning' ? '⚠️' : '❌';
                const checkColor = checkStatus === 'pass' ? '#10b981' : checkStatus === 'warning' ? '#f59e0b' : '#ef4444';

                return (
                  <div key={idx} style={{
                    padding: '0.5rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '0.375rem',
                    borderLeft: `3px solid ${checkColor}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span>{checkIcon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {check.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>
                      {check.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Recommendations:
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {recommendations.slice(0, 2).map((rec: any, idx: number) => {
                const priority = rec.priority || 'low';
                const priorityColor = priority === 'critical' ? '#ef4444' : priority === 'high' ? '#f59e0b' : priority === 'medium' ? '#3b82f6' : '#10b981';

                return (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: `${priorityColor}10`,
                    borderRadius: '0.375rem',
                    borderLeft: `3px solid ${priorityColor}`
                  }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{rec.action}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rec.reason}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{rec.next_step}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
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
            <div className="project-nav project-nav-mobile">
              <Link className="nav-link project-nav-link" href={`/projects/${id}/geometry`}>
                📐 Geometry
              </Link>
              <Link className="nav-link project-nav-link" href={`/projects/${id}/layouts`}>
                🔲 Layouts
              </Link>
              <Link className="nav-link project-nav-link" href={`/projects/${id}/reports`}>
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

          <ul
            className="asset-list"
            style={{
              maxHeight: '500px',
              overflowY: 'auto',
              padding: '0.5rem'
            }}
          >
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
                      <span className="asset-filename">{a.filename}</span>
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
                  <button
                    className="btn btn-small asset-delete-btn"
                    style={{
                      background: 'var(--error)',
                      borderColor: 'var(--error)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      minWidth: 'auto'
                    }}
                    onClick={() => {
                      if (confirm(`Delete ${a.filename}?`)) {
                        deleteAsset.mutate(a.id);
                      }
                    }}
                    disabled={deleteAsset.isPending}
                    title="Delete asset"
                  >
                    <span className="delete-icon">🗑️</span>
                    <span className="delete-text"> Delete</span>
                  </button>
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
            <button className="btn-warning btn" onClick={() => setShowRoofRiskModal(true)}>
              ⚠️ Run Roof Risk Analysis
            </button>
            <button className="btn-purple btn" onClick={() => setShowElectricalModal(true)}>
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

                    {analysis.status === 'done' && analysis.kind === 'compliance' && renderComplianceResult(analysis.result)}

                    {analysis.status === 'done' && analysis.kind === 'roof_risk' && renderRoofRiskResult(analysis.result)}

                    {analysis.status === 'done' && analysis.kind === 'electrical' && renderElectricalResult(analysis.result)}

                    {analysis.status === 'done' && analysis.kind !== 'shading' && analysis.kind !== 'compliance' && analysis.kind !== 'roof_risk' && analysis.kind !== 'electrical' && analysis.result?.summary && (
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

      {/* Roof Risk Analysis Modal */}
      {showRoofRiskModal && (
        <div className="modal-overlay" onClick={() => setShowRoofRiskModal(false)}>
          <div className="roof-risk-modal" onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>⚠️ Roof Risk Analysis</h3>
              <button
                onClick={() => setShowRoofRiskModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0',
                  width: '2rem',
                  height: '2rem'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Please upload roof images and optionally provide survey information for a comprehensive risk assessment.
            </p>

            {/* Image Upload Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                📸 Roof Images (Required)
              </label>
              <input
                type="file"
                className="input"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setRoofImages(files);
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  fontSize: '0.9rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              {roofImages.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                  ✓ {roofImages.length} image{roofImages.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                📋 Optional Survey Information
              </h4>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Roof Age */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Roof Age
                  </label>
                  <select
                    className="select"
                    value={roofSurveyData.roof_age}
                    onChange={(e) => setRoofSurveyData({ ...roofSurveyData, roof_age: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Select age...</option>
                    <option value="0-5 years">0-5 years</option>
                    <option value="5-10 years">5-10 years</option>
                    <option value="10+ years">10+ years</option>
                    <option value="20+ years">20+ years</option>
                  </select>
                </div>

                {/* Roof Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Roof Type
                  </label>
                  <select
                    className="select"
                    value={roofSurveyData.roof_type}
                    onChange={(e) => setRoofSurveyData({ ...roofSurveyData, roof_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Select type...</option>
                    <option value="concrete">Concrete</option>
                    <option value="metal">Metal/Tin</option>
                    <option value="sheet">Sheet</option>
                    <option value="asbestos">Asbestos</option>
                    <option value="tile">Tile</option>
                  </select>
                </div>

                {/* Slope Angle */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Slope Angle (degrees)
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={roofSurveyData.slope_angle}
                    onChange={(e) => setRoofSurveyData({ ...roofSurveyData, slope_angle: e.target.value })}
                    placeholder="e.g., 15"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Checkboxes */}
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roofSurveyData.visible_cracks}
                      onChange={(e) => setRoofSurveyData({ ...roofSurveyData, visible_cracks: e.target.checked })}
                    />
                    Visible cracks or damage
                  </label>

                  {roofSurveyData.visible_cracks && (
                    <div style={{ marginLeft: '1.5rem' }}>
                      <select
                        className="select"
                        value={roofSurveyData.crack_severity}
                        onChange={(e) => setRoofSurveyData({ ...roofSurveyData, crack_severity: e.target.value })}
                        style={{
                          padding: '0.4rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.375rem',
                          fontSize: '0.85rem',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="minor">Minor cracks</option>
                        <option value="major">Major cracks</option>
                      </select>
                    </div>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roofSurveyData.leakage_signs}
                      onChange={(e) => setRoofSurveyData({ ...roofSurveyData, leakage_signs: e.target.checked })}
                    />
                    Signs of water leakage
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roofSurveyData.major_damage}
                      onChange={(e) => setRoofSurveyData({ ...roofSurveyData, major_damage: e.target.checked })}
                    />
                    Major structural damage
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roofSurveyData.weak_structures}
                      onChange={(e) => setRoofSurveyData({ ...roofSurveyData, weak_structures: e.target.checked })}
                    />
                    Weak or unstable structures
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roofSurveyData.rust_corrosion}
                      onChange={(e) => setRoofSurveyData({ ...roofSurveyData, rust_corrosion: e.target.checked })}
                    />
                    Rust or corrosion (metal roofs)
                  </label>
                </div>

                {/* Obstacle Count */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Number of Roof Obstacles (vents, chimneys, etc.)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={roofSurveyData.obstacle_count}
                    onChange={(e) => setRoofSurveyData({ ...roofSurveyData, obstacle_count: parseInt(e.target.value) || 0 })}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-warning"
                onClick={() => runRoofRiskWithData.mutate()}
                disabled={roofImages.length === 0 || runRoofRiskWithData.isPending}
                style={{ flex: 1 }}
              >
                {runRoofRiskWithData.isPending ? '⏳ Analyzing...' : '⚠️ Run Analysis'}
              </button>
              <button
                className="btn"
                onClick={() => setShowRoofRiskModal(false)}
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Electrical Analysis Modal */}
      {showElectricalModal && (
        <div className="modal-overlay" onClick={() => setShowElectricalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', marginBottom: '1.5rem' }}>⚡ Electrical Panel Analysis</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontWeight: '600' }}>
                Panel Photos (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setPanelImages(Array.from(e.target.files));
                  }
                }}
                style={{ color: '#fff' }}
              />
              {panelImages.length > 0 && (
                <p style={{ color: '#4ade80', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  ✓ {panelImages.length} image(s) selected
                </p>
              )}
            </div>

            <div className="divider" style={{ margin: '1.5rem 0' }}></div>

            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.1rem' }}>System & Panel Information</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Planned Solar System Size (kW) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 9.6"
                  value={electricalData.system_size_kw}
                  onChange={(e) => setElectricalData({ ...electricalData, system_size_kw: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Main Panel Rating (A) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={electricalData.main_panel_rating_a}
                  onChange={(e) => setElectricalData({ ...electricalData, main_panel_rating_a: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                />
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  Look for 63A / 80A / 100A label on the main switch
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Main Breaker Rating (A)
                </label>
                <input
                  type="number"
                  placeholder="Leave empty = same as panel"
                  value={electricalData.main_breaker_rating_a}
                  onChange={(e) => setElectricalData({ ...electricalData, main_breaker_rating_a: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                />
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.3rem', fontStyle: 'italic' }}>
                  If empty, assumes same as Main Panel Rating
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Voltage (V)
                </label>
                <select
                  value={electricalData.voltage}
                  onChange={(e) => setElectricalData({ ...electricalData, voltage: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="230">230V (India/EU)</option>
                  <option value="240">240V (US/Australia)</option>
                  <option value="220">220V (Other)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Phase Type
                </label>
                <select
                  value={electricalData.phase_type}
                  onChange={(e) => setElectricalData({ ...electricalData, phase_type: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="single">Single Phase</option>
                  <option value="three">Three Phase</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Panel Age/Condition
                </label>
                <select
                  value={electricalData.panel_age}
                  onChange={(e) => setElectricalData({ ...electricalData, panel_age: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="new">New (0-5 years)</option>
                  <option value="good">Good (5-15 years)</option>
                  <option value="old">Old (15+ years)</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Panel Condition
                </label>
                <select
                  value={electricalData.panel_condition}
                  onChange={(e) => setElectricalData({ ...electricalData, panel_condition: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="good">Good - No visible damage</option>
                  <option value="fair">Fair - Minor wear</option>
                  <option value="poor">Poor - Needs attention</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff' }}>
                  Wiring Condition
                </label>
                <select
                  value={electricalData.wiring_condition}
                  onChange={(e) => setElectricalData({ ...electricalData, wiring_condition: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: '4px', color: '#fff' }}
                >
                  <option value="good">Good - Modern wiring</option>
                  <option value="fair">Fair - Some age visible</option>
                  <option value="poor">Poor - Old/unsafe wiring</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setShowElectricalModal(false)}
                style={{ background: '#6b7280', borderColor: '#6b7280' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-purple"
                onClick={() => runElectricalWithData.mutate()}
                disabled={runElectricalWithData.isPending || !electricalData.system_size_kw || !electricalData.main_panel_rating_a}
              >
                {runElectricalWithData.isPending ? 'Running...' : '⚡ Run Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
