/**
 * Result Verification Workstation Tab
 * 
 * Clinical sign-off and diagnostic authorization:
 * - Review entered parameter findings against reference metrics
 * - Sign off and verify report for publication to patient & physician
 * - Return for correction with auditable clinical feedback
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Eye,
  X,
  Barcode,
  ShieldCheck,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function ResultVerificationTab({ onNavigateTab }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  // Modals
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('Clinical findings reviewed and approved.');
  const [returnReason, setReturnReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVerificationQueue = () => {
    setLoading(true);
    labService.getVerificationQueue()
      .then((res) => {
        setQueue(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load verification queue:', err);
        setFeedback({ type: 'error', message: 'Unable to load verification queue.' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVerificationQueue();
  }, []);

  const handleVerify = async () => {
    if (!selectedResult) return;
    setActionLoading(true);
    try {
      const res = await labService.verifyResult(selectedResult._id, {
        verificationNotes,
      });
      setFeedback({
        type: 'success',
        message: 'Investigation result successfully verified and published.',
      });
      setVerifyModalOpen(false);
      setSelectedResult(null);
      fetchVerificationQueue();
      // Optionally navigate to reports
      onNavigateTab('reports', res.data);
    } catch (err) {
      console.error('Verification error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to verify result.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedResult || !returnReason.trim()) return;
    setActionLoading(true);
    try {
      await labService.returnResult(selectedResult._id, {
        reason: returnReason,
      });
      setFeedback({
        type: 'success',
        message: 'Result returned to technician for parameter correction.',
      });
      setReturnModalOpen(false);
      setReturnReason('');
      setSelectedResult(null);
      fetchVerificationQueue();
    } catch (err) {
      console.error('Return error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to return result.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <CheckCircle2 size={13} />
            <span>CLINICAL AUTHORIZATION WORKSTATION</span>
          </div>
          <h1 className="lab-header-title">Result Verification</h1>
          <p className="lab-header-subtitle">
            Review recorded parameters, confirm diagnostic consistency, and sign off official reports.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchVerificationQueue}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'lab-spin' : ''} />
            <span>Refresh</span>
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

      {/* ── Table: Results Awaiting Sign-Off ── */}
      <div className="lab-card">
        <div className="lab-card__header">
          <div className="lab-card__title-group">
            <ShieldCheck size={18} className="lab-color-green" />
            <h2 className="lab-card__title">Investigations Pending Clinical Sign-off</h2>
            <span className="lab-count-badge">{queue.length}</span>
          </div>
        </div>

        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Scanning verification queue...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="lab-empty-state">
              <CheckCircle2 size={40} className="lab-empty-icon lab-color-green" />
              <p className="lab-empty-title">Queue Cleared</p>
              <p className="lab-empty-desc">All entered results have been verified and signed off.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Sample ID</th>
                    <th>Patient</th>
                    <th>Investigation</th>
                    <th>Priority</th>
                    <th>Entered By</th>
                    <th>Flag Status</th>
                    <th className="lab-col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <span className="lab-code-chip">{item.requestId}</span>
                      </td>
                      <td>
                        <span className="lab-barcode-chip">
                          <Barcode size={12} />
                          <span>{item.sampleId || 'SMP-LOG'}</span>
                        </span>
                      </td>
                      <td>
                        <div className="lab-cell-user">
                          <span className="lab-user-name">
                            {item.patient ? `${item.patient.firstName} ${item.patient.lastName}` : 'Walk-in'}
                          </span>
                          <span className="lab-user-sub">{item.patient?.email || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="lab-text-bold">{item.testName}</span>
                        <span className="lab-badge-cat">{item.category}</span>
                      </td>
                      <td>
                        <span className={`lab-priority-pill lab-priority-pill--${(item.priority || 'Routine').toLowerCase()}`}>
                          {item.priority || 'Routine'}
                        </span>
                      </td>
                      <td>
                        <span className="lab-sub-text">
                          {item.resultsEnteredBy
                            ? `${item.resultsEnteredBy.firstName} ${item.resultsEnteredBy.lastName}`
                            : 'Technician'}
                        </span>
                      </td>
                      <td>
                        {item.isCritical ? (
                          <span className="lab-priority-pill lab-priority-pill--stat">CRITICAL</span>
                        ) : item.results?.some((r) => r.flag !== 'Normal') ? (
                          <span className="lab-priority-pill lab-priority-pill--urgent">ABNORMAL</span>
                        ) : (
                          <span className="lab-status-badge lab-status-badge--green">NORMAL</span>
                        )}
                      </td>
                      <td className="lab-col-right">
                        <div className="lab-row-actions">
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--secondary"
                            onClick={() => setSelectedResult(item)}
                          >
                            <Eye size={13} />
                            <span>Review</span>
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

      {/* ── Slide-Over Drawer: Review Findings & Verify ── */}
      {selectedResult && (
        <div className="lab-drawer-overlay" onClick={() => setSelectedResult(null)}>
          <div className="lab-drawer lab-drawer--wide" onClick={(e) => e.stopPropagation()}>
            <div className="lab-drawer__header">
              <div>
                <div className="lab-header-badge">INVESTIGATION FINDINGS DOSSIER</div>
                <h3 className="lab-drawer__title">{selectedResult.testName}</h3>
                <div className="lab-card__subtext">
                  Order: {selectedResult.requestId} | Specimen: {selectedResult.sampleId} |{' '}
                  Patient: {selectedResult.patient ? `${selectedResult.patient.firstName} ${selectedResult.patient.lastName}` : 'Walk-in'}
                </div>
              </div>
              <button
                type="button"
                className="lab-drawer__close"
                onClick={() => setSelectedResult(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-drawer__content">
              {/* Critical Alert Warning */}
              {selectedResult.isCritical && (
                <div className="lab-alert lab-alert--critical" style={{ marginBottom: '1.25rem' }}>
                  <AlertTriangle size={20} />
                  <div>
                    <strong>STAT CRITICAL REPORT:</strong> This report contains parameters outside critical limits.
                    Ensure the ordering physician has been alerted.
                  </div>
                </div>
              )}

              {/* Parameter Findings Table */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Diagnostic Parameter Findings</h4>
                <div className="lab-table-wrap">
                  <table className="lab-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Observed Result</th>
                        <th>Unit</th>
                        <th>Reference Range</th>
                        <th>Clinical Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedResult.results?.map((r, idx) => (
                        <tr key={idx}>
                          <td className="lab-text-bold">{r.parameter}</td>
                          <td>
                            <span className={`lab-result-chip lab-result-chip--${r.flag.toLowerCase()}`}>
                              {r.result}
                            </span>
                          </td>
                          <td>{r.unit}</td>
                          <td>{r.referenceRange}</td>
                          <td>
                            <span className={`lab-priority-pill lab-priority-pill--${r.flag === 'Critical' ? 'stat' : r.flag === 'High' || r.flag === 'Low' || r.flag === 'Abnormal' ? 'urgent' : 'routine'}`}>
                              {r.flag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technician Notes */}
              {selectedResult.technicianNotes && (
                <div className="lab-drawer-section">
                  <h4 className="lab-drawer-section__title">Technician Observations</h4>
                  <div className="lab-notes-box">{selectedResult.technicianNotes}</div>
                </div>
              )}

              {/* Physician Clinical Notes */}
              {selectedResult.clinicalNotes && (
                <div className="lab-drawer-section">
                  <h4 className="lab-drawer-section__title">Ordering Physician Indication</h4>
                  <div className="lab-notes-box">{selectedResult.clinicalNotes}</div>
                </div>
              )}
            </div>

            {/* Verification Footer Actions */}
            <div className="lab-drawer__footer">
              <button
                type="button"
                className="lab-btn lab-btn--danger"
                onClick={() => setReturnModalOpen(true)}
              >
                <RotateCcw size={15} />
                <span>Return for Correction</span>
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--green"
                onClick={() => setVerifyModalOpen(true)}
              >
                <CheckCircle2 size={16} />
                <span>Sign-off & Verify Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Verify Report ── */}
      {verifyModalOpen && selectedResult && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <ShieldCheck size={18} className="lab-color-green" />
                <h3 className="lab-modal__title">Clinical Authorization Sign-Off</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setVerifyModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              <p className="lab-modal-desc">
                You are signing off and authorizing official diagnostic report publication for order{' '}
                <strong>{selectedResult.requestId}</strong> ({selectedResult.testName}).
                This report will become visible to the patient and ordering doctor.
              </p>

              <div className="lab-form-group">
                <label className="lab-form-label">Verification Note / Remarks</label>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setVerifyModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--green"
                onClick={handleVerify}
                disabled={actionLoading}
              >
                <CheckCircle2 size={15} />
                <span>Confirm & Sign Off</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Return for Correction ── */}
      {returnModalOpen && selectedResult && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <RotateCcw size={18} className="lab-color-red" />
                <h3 className="lab-modal__title">Return for Parameter Correction</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setReturnModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              <p className="lab-modal-desc">
                Provide clinical rationale for returning order{' '}
                <strong>{selectedResult.requestId}</strong> to the technician for re-test or correction.
              </p>

              <div className="lab-form-group">
                <label className="lab-form-label">Reason for Return *</label>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  placeholder="e.g. Discrepancy between hemoglobin and RBC indices; repeat CBC run required. Clotted smear suspected..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setReturnModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--danger"
                disabled={!returnReason.trim() || actionLoading}
                onClick={handleReturn}
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
