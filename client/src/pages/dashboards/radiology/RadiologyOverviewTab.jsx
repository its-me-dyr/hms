/**
 * Radiology Overview & Command Center Tab
 * 
 * Central operational cockpit for Hospital Radiology & Imaging:
 * - 6 Primary KPI cards + 4 secondary metrics with real backend data
 * - Active Queues: Critical Alerts, Pending Requests, Scheduled Studies, In Processing
 * - Modality breakdowns (X-Ray, CT, MRI, Ultrasound, Mammography, PET)
 * - Full slide-over clinical inspection drawer
 */

import { useState, useEffect } from 'react';
import {
  Image,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Eye,
  X,
  Activity,
  ChevronRight,
  FileText,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function RadiologyOverviewTab({ user, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudy, setSelectedStudy] = useState(null);

  const fetchOverview = () => {
    setLoading(true);
    setError('');
    radiologyService.getDashboard()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load radiology dashboard metrics:', err);
        setError('Unable to load radiology operational metrics.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const staffName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Radiology Specialist';

  const kpis = data?.kpis || {
    pendingRequests: 0,
    scheduledToday: 0,
    awaitingPreparation: 0,
    inQueue: 0,
    inProcessing: 0,
    pendingReport: 0,
    pendingVerification: 0,
    criticalFindings: 0,
    studiesCompletedToday: 0,
    reportsFinalizedToday: 0,
    equipmentOperational: 0,
  };

  const pendingRequests = data?.pendingRequestsList || [];
  const queueList = data?.queueList || [];
  const criticalAlerts = data?.criticalAlerts || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="lab-container">
      {/* ── Welcome Hero Banner ── */}
      <div className="lab-welcome-hero" style={{ borderLeft: '4px solid #6366f1' }}>
        <div className="lab-welcome-top">
          <div>
            <div className="radiology-header-badge">
              <Image size={13} />
              <span>CENTRAL RADIOLOGY & IMAGING COMMAND COCKPIT</span>
            </div>
            <h1 className="lab-welcome-greeting">
              {getGreeting()}, {staffName}
            </h1>
            <p className="lab-welcome-subtext">
              Real-time diagnostic imaging acquisition workflow, modality scheduling, and radiologist reporting.
            </p>
          </div>
          <div className="lab-header-actions">
            <button
              className="lab-btn lab-btn-secondary"
              onClick={fetchOverview}
              disabled={loading}
              title="Refresh dashboard metrics"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              className="lab-btn lab-btn-primary"
              style={{ background: '#6366f1', borderColor: '#4f46e5' }}
              onClick={() => onNavigateTab('scheduling')}
            >
              <Calendar size={15} />
              <span>Schedule Study</span>
            </button>
          </div>
        </div>

        {/* Operational Strip */}
        <div className="lab-metrics-strip">
          <div className="lab-metric-chip">
            <Activity size={13} style={{ color: '#6366f1' }} />
            <span>Operational Modalities: <strong>{kpis.equipmentOperational ?? 4} Active</strong></span>
          </div>
          <div className="lab-metric-chip">
            <Clock size={13} style={{ color: '#0284c7' }} />
            <span>Scheduled Today: <strong>{kpis.scheduledToday} Studies</strong></span>
          </div>
          <div className="lab-metric-chip">
            <AlertTriangle size={13} style={{ color: kpis.criticalFindings > 0 ? '#ef4444' : '#64748b' }} />
            <span>Critical Findings: <strong style={{ color: kpis.criticalFindings > 0 ? '#ef4444' : 'inherit' }}>{kpis.criticalFindings} Active</strong></span>
          </div>
          <div className="lab-metric-chip">
            <CheckCircle2 size={13} style={{ color: '#10b981' }} />
            <span>Finalized Today: <strong>{kpis.reportsFinalizedToday} Reports</strong></span>
          </div>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchOverview} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Primary KPI Grid (6 Top Cards) ── */}
      <div className="lab-kpi-grid">
        <div className="lab-kpi-card" onClick={() => onNavigateTab('requests')} style={{ cursor: 'pointer' }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">Pending Orders</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Image size={18} />
            </div>
          </div>
          <div className="lab-kpi-value">{kpis.pendingRequests}</div>
          <div className="lab-kpi-subtext">Awaiting acceptance & scheduling</div>
        </div>

        <div className="lab-kpi-card" onClick={() => onNavigateTab('scheduling')} style={{ cursor: 'pointer' }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">Scheduled Today</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="lab-kpi-value">{kpis.scheduledToday}</div>
          <div className="lab-kpi-subtext">Booked slots across modalities</div>
        </div>

        <div className="lab-kpi-card" onClick={() => onNavigateTab('queue')} style={{ cursor: 'pointer' }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">In Queue / Ready</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="lab-kpi-value">{kpis.inQueue}</div>
          <div className="lab-kpi-subtext">Checked-in & prepped for scan</div>
        </div>

        <div className="lab-kpi-card" onClick={() => onNavigateTab('processing')} style={{ cursor: 'pointer' }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">In Acquisition</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="lab-kpi-value">{kpis.inProcessing}</div>
          <div className="lab-kpi-subtext">Scanners actively running</div>
        </div>

        <div className="lab-kpi-card" onClick={() => onNavigateTab('entry')} style={{ cursor: 'pointer' }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">Awaiting Report</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <FileText size={18} />
            </div>
          </div>
          <div className="lab-kpi-value">{kpis.pendingReport}</div>
          <div className="lab-kpi-subtext">Acquired studies needing interpretation</div>
        </div>

        <div className="lab-kpi-card" onClick={() => onNavigateTab('critical')} style={{ cursor: 'pointer', borderLeft: kpis.criticalFindings > 0 ? '3px solid #ef4444' : undefined }}>
          <div className="lab-kpi-card-header">
            <span className="lab-kpi-title">Critical Findings</span>
            <div className="lab-kpi-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="lab-kpi-value" style={{ color: kpis.criticalFindings > 0 ? '#ef4444' : 'inherit' }}>
            {kpis.criticalFindings}
          </div>
          <div className="lab-kpi-subtext">Immediate physician notification alerts</div>
        </div>
      </div>

      {/* ── Critical Alerts Banner (if any) ── */}
      {criticalAlerts.length > 0 && (
        <div className="lab-card" style={{ marginBottom: '1.5rem', borderColor: '#fca5a5', background: 'rgba(254, 242, 242, 0.5)' }}>
          <div className="lab-card-header" style={{ borderBottom: '1px solid #fee2e2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#991b1b', fontWeight: 700 }}>
                High-Priority / STAT Alerts Requiring Action ({criticalAlerts.length})
              </h3>
            </div>
            <button className="lab-btn lab-btn-sm" style={{ background: '#ef4444', color: '#fff' }} onClick={() => onNavigateTab('critical')}>
              View All Critical
            </button>
          </div>
          <div className="lab-table-container">
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Accession / Study</th>
                  <th>Modality</th>
                  <th>Finding Summary</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {criticalAlerts.slice(0, 4).map((c) => (
                  <tr key={c._id || c.id}>
                    <td>
                      <strong>{c.patient?.fullName || c.patient?.name || 'Unknown Patient'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.patient?.medicalRecordNumber || c.patient?.phone || ''}</div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{c.accessionNumber || c.reportNumber || 'N/A'}</span>
                      <div style={{ fontSize: '0.78rem' }}>{c.studyType || c.procedureName}</div>
                    </td>
                    <td>
                      <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                        {c.modality || 'Radiology'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px', color: '#b91c1c', fontWeight: 600 }}>
                      {c.criticalFindingNotes || c.impression || 'Abnormal finding marked for urgent review'}
                    </td>
                    <td>
                      <span className="lab-badge lab-badge-danger">CRITICAL / STAT</span>
                    </td>
                    <td>
                      <button
                        className="lab-btn lab-btn-sm lab-btn-outline"
                        onClick={() => setSelectedStudy(c)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Two-Column Operational Section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Pending Requests Column */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Pending Imaging Orders</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Doctor referrals awaiting scheduling</p>
            </div>
            <button className="lab-btn lab-btn-sm lab-btn-ghost" onClick={() => onNavigateTab('requests')}>
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="lab-table-container">
            {pendingRequests.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem', color: '#10b981' }} />
                <p style={{ margin: 0 }}>No pending requests waiting in queue</p>
              </div>
            ) : (
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Procedure / Modality</th>
                    <th>Priority</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.slice(0, 5).map((r) => (
                    <tr key={r._id || r.id}>
                      <td>
                        <strong>{r.patient?.fullName || r.patient?.name || 'Patient'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.patient?.medicalRecordNumber || ''}</div>
                      </td>
                      <td>
                        <div>{r.studyType || r.procedureName || 'Radiology Study'}</div>
                        <span className="lab-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>
                          {r.modality}
                        </span>
                      </td>
                      <td>
                        <span className={`lab-badge ${r.priority === 'emergency' || r.priority === 'urgent' ? 'lab-badge-danger' : 'lab-badge-info'}`}>
                          {r.priority?.toUpperCase() || 'ROUTINE'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="lab-btn lab-btn-sm lab-btn-secondary"
                          onClick={() => onNavigateTab('scheduling', r)}
                          title="Schedule this study"
                        >
                          <Calendar size={13} />
                          <span>Schedule</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Active Queue Column */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Imaging Modality Queue</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Patients checked in and ready for scan</p>
            </div>
            <button className="lab-btn lab-btn-sm lab-btn-ghost" onClick={() => onNavigateTab('queue')}>
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="lab-table-container">
            {queueList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <Clock size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                <p style={{ margin: 0 }}>Queue is currently clear</p>
              </div>
            ) : (
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Modality / Room</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueList.slice(0, 5).map((q) => (
                    <tr key={q._id || q.id}>
                      <td>
                        <strong>{q.patient?.fullName || q.patient?.name || 'Patient'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>#{q.accessionNumber || 'N/A'}</div>
                      </td>
                      <td>
                        <strong>{q.modality}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.equipment?.name || q.room || 'Scanner 1'}</div>
                      </td>
                      <td>
                        <span className={`lab-badge ${q.status === 'in_progress' ? 'lab-badge-warning' : 'lab-badge-success'}`}>
                          {q.status === 'in_progress' ? 'Scanning' : 'Ready'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="lab-btn lab-btn-sm lab-btn-primary"
                          style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                          onClick={() => onNavigateTab('processing', q)}
                        >
                          <Activity size={13} />
                          <span>Acquisition</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ── Recent Activity / Audit Feed ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem' }}>
        <div className="lab-card-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Radiology Operational Log</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Real-time chronological events and status transitions</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          {recentActivity.length === 0 ? (
            <p style={{ margin: 0, color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No recent audit activity logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentActivity.slice(0, 6).map((act, idx) => (
                <div key={idx} className="radiology-timeline-item">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.88rem' }}>{act.action || act.title || 'Workflow Action'}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                      </span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      {act.details || act.description || 'Status changed successfully.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-over Clinical Inspection Drawer ── */}
      {selectedStudy && (
        <div className="lab-modal-overlay" onClick={() => setSelectedStudy(null)}>
          <div className="lab-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Clinical Study Inspection</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Accession: {selectedStudy.accessionNumber || 'N/A'}</span>
              </div>
              <button className="lab-btn-icon" onClick={() => setSelectedStudy(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#475569' }}>Patient Details</h4>
                <div><strong>{selectedStudy.patient?.fullName || selectedStudy.patient?.name || 'Unknown Patient'}</strong></div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  MRN: {selectedStudy.patient?.medicalRecordNumber || 'N/A'} | Gender: {selectedStudy.patient?.gender || 'N/A'} | Age: {selectedStudy.patient?.age || 'N/A'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#475569' }}>Procedure & Modality</h4>
                <div><strong>{selectedStudy.studyType || selectedStudy.procedureName}</strong> ({selectedStudy.modality})</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Body Part: {selectedStudy.bodyPart || selectedStudy.anatomicalRegion || 'General'}</div>
              </div>

              {selectedStudy.clinicalHistory && (
                <div>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#475569' }}>Clinical Indication / History</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', background: '#f1f5f9', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                    {selectedStudy.clinicalHistory}
                  </p>
                </div>
              )}

              {selectedStudy.criticalFindingNotes && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.8rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={15} />
                    <span>Critical Alert Notes</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d' }}>
                    {selectedStudy.criticalFindingNotes}
                  </p>
                </div>
              )}
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setSelectedStudy(null)}>
                Close
              </button>
              <button
                className="lab-btn lab-btn-primary"
                style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                onClick={() => {
                  const s = selectedStudy;
                  setSelectedStudy(null);
                  onNavigateTab('entry', s);
                }}
              >
                <FileText size={15} />
                <span>Open in Reporting</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
