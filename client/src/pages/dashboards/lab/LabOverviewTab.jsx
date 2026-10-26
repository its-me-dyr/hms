/**
 * Laboratory Overview & Command Center Tab
 * 
 * Central operational cockpit for Hospital Laboratory:
 * - 6 Primary KPI cards + 4 secondary metrics with real backend data
 * - Active Queues: Pending Requests, Samples Awaiting Collection, In Processing, Critical Alerts
 * - Recent Laboratory Audit / Activity feed
 * - Full slide-over clinical inspection drawer
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Microscope,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Eye,
  ArrowRight,
  Package,
  X,
  User,
  Activity,
  ChevronRight,
  FileText,
  FlaskConical,
  Barcode,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabOverviewTab({ user, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchOverview = useCallback(() => {
    setLoading(true);
    setError('');
    labService.getDashboard()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load lab dashboard metrics:', err);
        setError('Unable to load laboratory operational metrics.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const staffName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Lab Specialist';

  const kpis = data?.kpis || {
    pendingRequests: 0,
    samplesAwaitingCollection: 0,
    samplesInProcessing: 0,
    resultsPendingEntry: 0,
    resultsPendingVerification: 0,
    criticalResults: 0,
    testsCompletedToday: 0,
    reportsGeneratedToday: 0,
    rejectedSamples: 0,
    totalTestsToday: 0,
  };

  const pendingRequests = data?.pendingRequestsList || [];
  const awaitingSamples = data?.awaitingCollectionList || [];
  const processingQueue = data?.processingQueue || [];
  const criticalAlerts = data?.criticalAlerts || [];

  return (
    <div className="lab-container">
      {/* ── Welcome Hero Banner ── */}
      <div className="lab-welcome-hero">
        <div className="lab-welcome-top">
          <div>
            <div className="lab-header-badge">
              <Microscope size={13} />
              <span>CENTRAL LABORATORY COMMAND COCKPIT</span>
            </div>
            <h1 className="lab-welcome-greeting">
              {getGreeting()}, {staffName}
            </h1>
            <p className="lab-welcome-subtext">
              Real-time specimen tracking, diagnostic processing, parameterized results entry, and clinical sign-off.
            </p>
          </div>
          <div className="lab-header-actions">
            <button
              type="button"
              className="lab-btn lab-btn--secondary"
              onClick={fetchOverview}
              disabled={loading}
              title="Refresh laboratory metrics"
            >
              <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="lab-btn lab-btn--primary"
              onClick={() => onNavigateTab('collection')}
            >
              <FlaskConical size={16} />
              <span>Collect Sample</span>
            </button>
          </div>
        </div>

        {/* Secondary Metrics Strip */}
        <div className="lab-metrics-strip">
          <div className="lab-metric-chip">
            <span className="lab-chip-label">Total Today:</span>
            <span className="lab-chip-val">{kpis.totalTestsToday}</span>
          </div>
          <div className="lab-metric-chip lab-metric-chip--success">
            <span className="lab-chip-label">Completed Today:</span>
            <span className="lab-chip-val">{kpis.testsCompletedToday}</span>
          </div>
          <div className="lab-metric-chip lab-metric-chip--info">
            <span className="lab-chip-label">Reports Generated:</span>
            <span className="lab-chip-val">{kpis.reportsGeneratedToday}</span>
          </div>
          <div className="lab-metric-chip lab-metric-chip--danger">
            <span className="lab-chip-label">Rejected Specimens:</span>
            <span className="lab-chip-val">{kpis.rejectedSamples}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="lab-alert lab-alert--error" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="lab-btn lab-btn--sm" onClick={fetchOverview} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── 6 Primary KPI Cards ── */}
      <div className="lab-kpi-grid">
        {/* 1. Pending Lab Requests */}
        <div className="lab-kpi-card" onClick={() => onNavigateTab('requests')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">Pending Orders</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--amber">
              <Clock size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value">{kpis.pendingRequests}</div>
          <div className="lab-kpi-card__subtext">
            <span>Awaiting accessioning or collection</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 2. Samples Awaiting Collection */}
        <div className="lab-kpi-card" onClick={() => onNavigateTab('collection')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">Awaiting Collection</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--cyan">
              <FlaskConical size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value">{kpis.samplesAwaitingCollection}</div>
          <div className="lab-kpi-card__subtext">
            <span>Specimens to be drawn</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 3. In Processing */}
        <div className="lab-kpi-card" onClick={() => onNavigateTab('processing')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">In Processing</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--blue">
              <Activity size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value">{kpis.samplesInProcessing}</div>
          <div className="lab-kpi-card__subtext">
            <span>Active analyzer runs</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 4. Results Pending Entry */}
        <div className="lab-kpi-card" onClick={() => onNavigateTab('results')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">Results Pending</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--purple">
              <FileText size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value">{kpis.resultsPendingEntry}</div>
          <div className="lab-kpi-card__subtext">
            <span>Ready for parameter recording</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 5. Results Pending Verification */}
        <div className="lab-kpi-card" onClick={() => onNavigateTab('verification')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">Pending Sign-Off</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--green">
              <CheckCircle2 size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value">{kpis.resultsPendingVerification}</div>
          <div className="lab-kpi-card__subtext">
            <span>Awaiting clinical verification</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* 6. Critical / Abnormal Alerts */}
        <div className={`lab-kpi-card ${kpis.criticalResults > 0 ? 'lab-kpi-card--critical' : ''}`} onClick={() => onNavigateTab('critical')}>
          <div className="lab-kpi-card__header">
            <span className="lab-kpi-card__label">Critical Alerts</span>
            <div className="lab-kpi-card__icon-box lab-kpi-card__icon-box--red">
              <AlertTriangle size={19} />
            </div>
          </div>
          <div className="lab-kpi-card__value" style={{ color: kpis.criticalResults > 0 ? '#ef4444' : 'inherit' }}>
            {kpis.criticalResults}
          </div>
          <div className="lab-kpi-card__subtext">
            <span>Urgent STAT notification required</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* ── Section A & B: Pending Orders & Critical Alerts ── */}
      <div className="lab-grid-2col" style={{ marginTop: '1.5rem' }}>
        {/* Left Column: Pending Lab Requests */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <Clock size={18} className="lab-color-amber" />
              <h2 className="lab-card__title">Pending Lab Requests</h2>
              <span className="lab-count-badge">{pendingRequests.length}</span>
            </div>
            <button
              type="button"
              className="lab-btn lab-btn--text"
              onClick={() => onNavigateTab('requests')}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="lab-card__body lab-card__body--flush">
            {loading ? (
              <div className="lab-loading-block">
                <div className="lab-spinner" />
                <span>Loading pending requests...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="lab-empty-state">
                <CheckCircle2 size={36} className="lab-empty-icon lab-color-green" />
                <p className="lab-empty-title">All Caught Up</p>
                <p className="lab-empty-desc">There are no pending lab investigation requests awaiting action.</p>
              </div>
            ) : (
              <div className="lab-table-wrap">
                <table className="lab-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Patient</th>
                      <th>Investigation</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th className="lab-col-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((req) => (
                      <tr key={req._id}>
                        <td>
                          <span className="lab-code-chip">{req.requestId || 'LR-PENDING'}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Direct Patient'}
                            </span>
                            <span className="lab-user-sub">{req.patient?.email || req.department}</span>
                          </div>
                        </td>
                        <td>
                          <span className="lab-text-bold">{req.testName}</span>
                          <span className="lab-badge-cat">{req.category}</span>
                        </td>
                        <td>
                          <span className={`lab-priority-pill lab-priority-pill--${(req.priority || 'Routine').toLowerCase()}`}>
                            {req.priority || 'Routine'}
                          </span>
                        </td>
                        <td>
                          <span className="lab-status-badge lab-status-badge--amber">
                            {req.status}
                          </span>
                        </td>
                        <td className="lab-col-right">
                          <div className="lab-row-actions">
                            <button
                              type="button"
                              className="lab-action-btn"
                              title="Inspect Clinical Order"
                              onClick={() => setSelectedRequest(req)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="lab-action-btn lab-action-btn--primary"
                              title="Collect Specimen"
                              onClick={() => onNavigateTab('collection', req)}
                            >
                              <FlaskConical size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Critical Alerts Console */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <AlertTriangle size={18} className="lab-color-red" />
              <h2 className="lab-card__title">Critical & Abnormal Alerts</h2>
              <span className="lab-count-badge lab-count-badge--danger">{criticalAlerts.length}</span>
            </div>
            <button
              type="button"
              className="lab-btn lab-btn--text"
              onClick={() => onNavigateTab('critical')}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="lab-card__body lab-card__body--flush">
            {loading ? (
              <div className="lab-loading-block">
                <div className="lab-spinner" />
                <span>Scanning critical alerts...</span>
              </div>
            ) : criticalAlerts.length === 0 ? (
              <div className="lab-empty-state">
                <CheckCircle2 size={36} className="lab-empty-icon lab-color-green" />
                <p className="lab-empty-title">Zero Critical Flags</p>
                <p className="lab-empty-desc">No active STAT or life-threatening critical findings detected.</p>
              </div>
            ) : (
              <div className="lab-critical-list">
                {criticalAlerts.map((crit) => {
                  const criticalParam = crit.results?.find((r) => r.flag === 'Critical' || r.flag === 'Abnormal');
                  return (
                    <div key={crit._id} className="lab-critical-item">
                      <div className="lab-critical-item__top">
                        <div className="lab-critical-item__patient">
                          <User size={14} />
                          <span>
                            {crit.patient ? `${crit.patient.firstName} ${crit.patient.lastName}` : 'Patient'}
                          </span>
                          <span className="lab-code-chip">{crit.requestId}</span>
                        </div>
                        <span className="lab-priority-pill lab-priority-pill--stat">
                          {crit.criticalSeverity || 'CRITICAL'}
                        </span>
                      </div>

                      <div className="lab-critical-item__details">
                        <div className="lab-crit-metric">
                          <span className="lab-crit-label">Test:</span>
                          <span className="lab-crit-val">{crit.testName}</span>
                        </div>
                        {criticalParam && (
                          <div className="lab-crit-metric lab-crit-metric--highlight">
                            <span className="lab-crit-label">{criticalParam.parameter}:</span>
                            <span className="lab-crit-val lab-crit-val--danger">
                              {criticalParam.result} {criticalParam.unit}
                            </span>
                            <span className="lab-crit-ref">Ref: {criticalParam.referenceRange}</span>
                          </div>
                        )}
                        <div className="lab-crit-metric">
                          <span className="lab-crit-label">Doctor:</span>
                          <span className="lab-crit-val">
                            {crit.doctor ? `Dr. ${crit.doctor.firstName} ${crit.doctor.lastName}` : crit.department}
                          </span>
                        </div>
                      </div>

                      <div className="lab-critical-item__footer">
                        <span className="lab-crit-time">
                          {crit.criticalNotified ? 'Physician Notified' : 'Notification Pending'}
                        </span>
                        <button
                          type="button"
                          className="lab-btn lab-btn--xs lab-btn--danger"
                          onClick={() => onNavigateTab('critical')}
                        >
                          Review & Acknowledge
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section C & D: Specimen Collection Queue & Active Processing ── */}
      <div className="lab-grid-2col" style={{ marginTop: '1.5rem' }}>
        {/* Left: Samples Awaiting Collection */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <FlaskConical size={18} className="lab-color-cyan" />
              <h2 className="lab-card__title">Samples Awaiting Collection</h2>
              <span className="lab-count-badge">{awaitingSamples.length}</span>
            </div>
            <button
              type="button"
              className="lab-btn lab-btn--text"
              onClick={() => onNavigateTab('collection')}
            >
              <span>Workstation</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="lab-card__body lab-card__body--flush">
            {awaitingSamples.length === 0 ? (
              <div className="lab-empty-state" style={{ padding: '2rem 1.5rem' }}>
                <Package size={32} className="lab-empty-icon" />
                <p className="lab-empty-title">No Pending Draws</p>
                <p className="lab-empty-desc">All requested test orders have specimens logged.</p>
              </div>
            ) : (
              <div className="lab-table-wrap">
                <table className="lab-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Investigation</th>
                      <th>Sample Tube</th>
                      <th>Priority</th>
                      <th className="lab-col-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingSamples.slice(0, 5).map((s) => (
                      <tr key={s._id}>
                        <td>
                          <span className="lab-text-bold">
                            {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : 'Patient'}
                          </span>
                        </td>
                        <td>
                          <span>{s.testName}</span>
                        </td>
                        <td>
                          <span className="lab-tube-pill">{s.sampleContainer || s.sampleType || 'Tube'}</span>
                        </td>
                        <td>
                          <span className={`lab-priority-pill lab-priority-pill--${(s.priority || 'Routine').toLowerCase()}`}>
                            {s.priority || 'Routine'}
                          </span>
                        </td>
                        <td className="lab-col-right">
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--primary"
                            onClick={() => onNavigateTab('collection', s)}
                          >
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Processing Queue */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <Activity size={18} className="lab-color-blue" />
              <h2 className="lab-card__title">Active Analyzer Queue</h2>
              <span className="lab-count-badge">{processingQueue.length}</span>
            </div>
            <button
              type="button"
              className="lab-btn lab-btn--text"
              onClick={() => onNavigateTab('processing')}
            >
              <span>Workstation</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="lab-card__body lab-card__body--flush">
            {processingQueue.length === 0 ? (
              <div className="lab-empty-state" style={{ padding: '2rem 1.5rem' }}>
                <Activity size={32} className="lab-empty-icon" />
                <p className="lab-empty-title">No Active Runs</p>
                <p className="lab-empty-desc">No specimens currently under active in-vitro analyzer run.</p>
              </div>
            ) : (
              <div className="lab-table-wrap">
                <table className="lab-table">
                  <thead>
                    <tr>
                      <th>Sample ID</th>
                      <th>Patient</th>
                      <th>Test</th>
                      <th>Technician</th>
                      <th className="lab-col-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processingQueue.slice(0, 5).map((p) => (
                      <tr key={p._id}>
                        <td>
                          <span className="lab-barcode-chip">
                            <Barcode size={12} />
                            <span>{p.sampleId || 'IN-PROCESS'}</span>
                          </span>
                        </td>
                        <td>
                          <span className="lab-text-bold">
                            {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Patient'}
                          </span>
                        </td>
                        <td>
                          <span>{p.testName}</span>
                        </td>
                        <td>
                          <span className="lab-sub-text">
                            {p.processedBy ? `${p.processedBy.firstName} ${p.processedBy.lastName}` : 'Automated'}
                          </span>
                        </td>
                        <td className="lab-col-right">
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--secondary"
                            onClick={() => onNavigateTab('processing', p)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Slide-Over Drawer: Clinical Investigation Details ── */}
      {selectedRequest && (
        <div className="lab-drawer-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="lab-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="lab-drawer__header">
              <div>
                <div className="lab-header-badge">INVESTIGATION ORDER DETAILS</div>
                <h3 className="lab-drawer__title">{selectedRequest.requestId || 'Lab Order'}</h3>
              </div>
              <button
                type="button"
                className="lab-drawer__close"
                onClick={() => setSelectedRequest(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-drawer__content">
              {/* Patient Demographics */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Patient Demographics</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Full Name:</span>
                    <span className="lab-info-value">
                      {selectedRequest.patient
                        ? `${selectedRequest.patient.firstName} ${selectedRequest.patient.lastName}`
                        : 'Direct Walk-in'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Email:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Gender:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.gender || 'Unspecified'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Phone:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Order Specs */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Clinical Order</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Test Name:</span>
                    <span className="lab-info-value lab-text-bold">{selectedRequest.testName}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Category:</span>
                    <span className="lab-info-value">{selectedRequest.category}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Priority:</span>
                    <span className={`lab-priority-pill lab-priority-pill--${(selectedRequest.priority || 'Routine').toLowerCase()}`}>
                      {selectedRequest.priority || 'Routine'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Ordering Doctor:</span>
                    <span className="lab-info-value">
                      {selectedRequest.doctor
                        ? `Dr. ${selectedRequest.doctor.firstName} ${selectedRequest.doctor.lastName}`
                        : 'Hospital Physician'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Department:</span>
                    <span className="lab-info-value">{selectedRequest.department || 'Outpatient'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Status:</span>
                    <span className="lab-status-badge lab-status-badge--amber">{selectedRequest.status}</span>
                  </div>
                </div>

                {selectedRequest.clinicalNotes && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <span className="lab-info-label">Physician Clinical Notes:</span>
                    <div className="lab-notes-box">{selectedRequest.clinicalNotes}</div>
                  </div>
                )}
              </div>

              {/* Specimen Requirements */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Specimen Requirements</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Specimen Type:</span>
                    <span className="lab-info-value">{selectedRequest.sampleType || 'Whole Blood'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Collection Tube:</span>
                    <span className="lab-info-value">{selectedRequest.sampleContainer || 'Standard Vacutainer'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lab-drawer__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--primary"
                onClick={() => {
                  const req = selectedRequest;
                  setSelectedRequest(null);
                  onNavigateTab('collection', req);
                }}
              >
                <FlaskConical size={16} />
                <span>Collect Specimen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
