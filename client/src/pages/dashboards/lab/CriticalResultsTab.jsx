/**
 * Critical & Abnormal Results Alert Center Tab
 * 
 * Clinical emergency findings console:
 * - Highlights STAT alerts and panic lab values
 * - Real-time physician notification tracking
 * - Immediate audit acknowledgement protocol
 */

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  Bell,
  Clock,
  User,
  Stethoscope,
  X,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function CriticalResultsTab({ onNavigateTab }) {
  const [criticalList, setCriticalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');

  // Modals & Selection
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [ackNotes, setAckNotes] = useState('Critical finding verbally communicated and recorded in laboratory logbook.');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCriticals = () => {
    setLoading(true);
    labService.getCriticalResults()
      .then((res) => {
        setCriticalList(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load critical results:', err);
        setFeedback({ type: 'error', message: 'Unable to load critical diagnostic results.' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCriticals();
  }, []);

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    setActionLoading(true);
    try {
      await labService.acknowledgeCritical(selectedAlert._id, {
        notes: ackNotes,
      });
      setFeedback({
        type: 'success',
        message: 'Critical result alert officially acknowledged and logged in audit record.',
      });
      setAckModalOpen(false);
      setSelectedAlert(null);
      fetchCriticals();
    } catch (err) {
      console.error('Acknowledge error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to acknowledge critical alert.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = criticalList.filter((item) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const reqId = item.requestId?.toLowerCase() || '';
    const testN = item.testName?.toLowerCase() || '';
    const patN = `${item.patient?.firstName || ''} ${item.patient?.lastName || ''}`.toLowerCase();
    return reqId.includes(q) || testN.includes(q) || patN.includes(q);
  });

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}>
            <ShieldAlert size={13} />
            <span>STAT PANIC VALUES & ABNORMAL ALERTS</span>
          </div>
          <h1 className="lab-header-title">Critical & Abnormal Results</h1>
          <p className="lab-header-subtitle">
            Life-critical laboratory parameters requiring immediate physician notification and clinical intervention.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchCriticals}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`lab-alert lab-alert--${feedback.type}`} style={{ marginBottom: '1rem' }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
          <button
            type="button"
            className="lab-alert-close"
            onClick={() => setFeedback(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className="lab-filter-card">
        <div className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search critical findings by patient, test name, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table: Critical Findings ── */}
      <div className="lab-card">
        <div className="lab-card__header">
          <div className="lab-card__title-group">
            <AlertTriangle size={18} className="lab-color-red" />
            <h2 className="lab-card__title">Active Critical & Abnormal Findings</h2>
            <span className="lab-count-badge lab-count-badge--danger">{filtered.length}</span>
          </div>
        </div>

        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Scanning critical alert ledger...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="lab-empty-state">
              <CheckCircle2 size={40} className="lab-empty-icon lab-color-green" />
              <p className="lab-empty-title">Zero Critical Alerts</p>
              <p className="lab-empty-desc">No active STAT or panic laboratory findings detected.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Patient</th>
                    <th>Investigation</th>
                    <th>Critical Parameter</th>
                    <th>Observed Value</th>
                    <th>Ref Range</th>
                    <th>Ordering Doctor</th>
                    <th>Doctor Notified</th>
                    <th>Acknowledged</th>
                    <th className="lab-col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const criticalParam =
                      item.results?.find((r) => r.flag === 'Critical') ||
                      item.results?.find((r) => ['High', 'Low', 'Abnormal'].includes(r.flag)) ||
                      item.results?.[0];

                    return (
                      <tr key={item._id} className={item.isCritical ? 'lab-row--critical' : ''}>
                        <td>
                          <span className="lab-code-chip">{item.requestId}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Walk-in'}
                            </span>
                            <span className="lab-user-sub">{item.patient?.phone || ''}</span>
                          </div>
                        </td>
                        <td>
                          <span className="lab-text-bold">{item.testName}</span>
                          <span className="lab-badge-cat">{item.category}</span>
                        </td>
                        <td>
                          <span className="lab-text-bold lab-color-red">
                            {criticalParam?.parameter || 'Diagnostic Finding'}
                          </span>
                        </td>
                        <td>
                          <span className="lab-result-chip lab-result-chip--critical">
                            {criticalParam?.result} {criticalParam?.unit}
                          </span>
                        </td>
                        <td>
                          <span className="lab-sub-text">{criticalParam?.referenceRange || 'N/A'}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}` : item.department}
                            </span>
                            <span className="lab-user-sub">{item.department}</span>
                          </div>
                        </td>
                        <td>
                          {item.criticalNotified ? (
                            <span className="lab-status-badge lab-status-badge--green">Notified</span>
                          ) : (
                            <span className="lab-status-badge lab-status-badge--amber">Pending</span>
                          )}
                        </td>
                        <td>
                          {item.criticalAcknowledged ? (
                            <span className="lab-status-badge lab-status-badge--cyan">Acknowledged</span>
                          ) : (
                            <span className="lab-status-badge lab-status-badge--red">Unacknowledged</span>
                          )}
                        </td>
                        <td className="lab-col-right">
                          <div className="lab-row-actions">
                            {!item.criticalAcknowledged && (
                              <button
                                type="button"
                                className="lab-btn lab-btn--xs lab-btn--danger"
                                onClick={() => {
                                  setSelectedAlert(item);
                                  setAckModalOpen(true);
                                }}
                              >
                                Acknowledge
                              </button>
                            )}
                            <button
                              type="button"
                              className="lab-action-btn"
                              title="Inspect Full Findings"
                              onClick={() => onNavigateTab('verification', item)}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Acknowledge Critical Alert ── */}
      {ackModalOpen && selectedAlert && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <ShieldAlert size={18} className="lab-color-red" />
                <h3 className="lab-modal__title">Acknowledge Critical Finding</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setAckModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              <p className="lab-modal-desc">
                Document laboratory acknowledgement and physician notification for order{' '}
                <strong>{selectedAlert.requestId}</strong> ({selectedAlert.testName}).
              </p>

              <div className="lab-summary-box">
                <div>
                  <span className="lab-summary-label">Patient:</span>
                  <span className="lab-summary-val">
                    {selectedAlert.patient ? `${selectedAlert.patient.firstName} ${selectedAlert.patient.lastName}` : 'Patient'}
                  </span>
                </div>
                <div>
                  <span className="lab-summary-label">Attending Doctor:</span>
                  <span className="lab-summary-val">
                    {selectedAlert.doctor ? `Dr. ${selectedAlert.doctor.firstName} ${selectedAlert.doctor.lastName}` : selectedAlert.department}
                  </span>
                </div>
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">Communication Notes / Audit Remarks *</label>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setAckModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--danger"
                onClick={handleAcknowledge}
                disabled={actionLoading}
              >
                <CheckCircle2 size={15} />
                <span>Confirm Official Acknowledgement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
