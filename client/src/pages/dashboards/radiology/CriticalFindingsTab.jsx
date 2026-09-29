/**
 * Critical & Abnormal Findings Tab
 * 
 * High-priority diagnostic alerts requiring immediate physician notification & closed-loop acknowledgment:
 * - STAT intracranial hemorrhage, acute pulmonary embolism, tension pneumothorax, aortic dissection, etc.
 * - Closed-loop verbal communication log with referring physician
 * - Read-back verification and timestamp tracking
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PhoneCall,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function CriticalFindingsTab({ onNavigateTab }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, unacknowledged, acknowledged

  // Acknowledgment Modal
  const [ackModalItem, setAckModalItem] = useState(null);
  const [ackData, setAckData] = useState({
    notifiedPhysicianName: '',
    communicationMethod: 'Phone',
    readBackConfirmed: true,
    acknowledgmentNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFindings = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getCriticalFindings({ status: filterStatus })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.findings || res.data?.reports || []);
        setFindings(list);
      })
      .catch((err) => {
        console.error('Failed to load critical findings:', err);
        setError('Failed to fetch critical findings registry.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filterStatus]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleOpenAckModal = (item) => {
    setAckModalItem(item);
    setAckData({
      notifiedPhysicianName: item.orderingDoctor?.fullName || item.requestingPhysician || '',
      communicationMethod: 'Phone',
      readBackConfirmed: true,
      acknowledgmentNotes: '',
    });
  };

  const handleAcknowledge = async (e) => {
    e.preventDefault();
    if (!ackModalItem) return;
    setSubmitting(true);
    try {
      await radiologyService.acknowledgeCritical(ackModalItem._id || ackModalItem.id, ackData);
      alert('Critical finding communication logged and closed-loop verified!');
      setAckModalItem(null);
      fetchFindings();
    } catch (err) {
      console.error('Failed to acknowledge critical finding:', err);
      alert(err.response?.data?.message || 'Error recording critical finding communication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={13} />
            <span>CRITICAL VALUE COMMUNICATION LOG</span>
          </div>
          <h1 className="lab-header-title">Critical & Abnormal Findings</h1>
          <p className="lab-header-subtitle">
            Closed-loop verbal notification tracking for life-threatening or urgent diagnostic observations.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchFindings} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchFindings} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className={`lab-btn lab-btn-sm ${filterStatus === 'all' ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
            style={filterStatus === 'all' ? { background: '#6366f1', borderColor: '#4f46e5' } : {}}
            onClick={() => setFilterStatus('all')}
          >
            All Critical ({findings.length})
          </button>
          <button
            className={`lab-btn lab-btn-sm ${filterStatus === 'unacknowledged' ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
            style={filterStatus === 'unacknowledged' ? { background: '#ef4444', borderColor: '#dc2626' } : {}}
            onClick={() => setFilterStatus('unacknowledged')}
          >
            Pending Acknowledgment
          </button>
          <button
            className={`lab-btn lab-btn-sm ${filterStatus === 'acknowledged' ? 'lab-btn-primary' : 'lab-btn-secondary'}`}
            style={filterStatus === 'acknowledged' ? { background: '#10b981', borderColor: '#059669' } : {}}
            onClick={() => setFilterStatus('acknowledged')}
          >
            Closed-Loop Verified
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading critical findings log...</p>
            </div>
          ) : findings.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', color: '#10b981' }} />
              <p style={{ fontWeight: 600, color: '#475569' }}>No critical findings requiring action.</p>
              <p style={{ fontSize: '0.85rem' }}>All life-threatening observations have been communicated or none exist.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Accession / Ref</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Critical Finding Observation</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((item) => (
                  <tr key={item._id || item.id} style={{ background: !item.criticalAcknowledged ? 'rgba(254, 242, 242, 0.4)' : undefined }}>
                    <td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#b91c1c' }}>
                        {item.accessionNumber || 'N/A'}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </td>
                    <td>
                      <strong>{item.patient?.fullName || item.patient?.name || 'Patient'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        MRN: {item.patient?.medicalRecordNumber || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.studyType || item.procedureName}</div>
                      <span className="lab-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                        {item.modality}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
                        {item.criticalFindingNotes || item.impression || 'Marked as STAT critical alert'}
                      </p>
                    </td>
                    <td>
                      {item.criticalAcknowledged ? (
                        <span className="lab-badge lab-badge-success">
                          <CheckCircle2 size={12} style={{ marginRight: '3px' }} />
                          NOTIFIED & ACKNOWLEDGED
                        </span>
                      ) : (
                        <span className="lab-badge lab-badge-danger">
                          <AlertTriangle size={12} style={{ marginRight: '3px' }} />
                          PENDING CALL
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {!item.criticalAcknowledged ? (
                          <button
                            className="lab-btn lab-btn-sm"
                            style={{ background: '#ef4444', color: '#ffffff' }}
                            onClick={() => handleOpenAckModal(item)}
                          >
                            <PhoneCall size={13} />
                            <span>Log Call</span>
                          </button>
                        ) : (
                          <button
                            className="lab-btn lab-btn-sm lab-btn-secondary"
                            onClick={() => onNavigateTab('reports', item)}
                          >
                            <Eye size={13} />
                            <span>View Report</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Communication Log Modal ── */}
      {ackModalItem && (
        <div className="lab-modal-overlay" onClick={() => setAckModalItem(null)}>
          <div className="lab-modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#991b1b' }}>
                  Document Verbal Closed-Loop Communication
                </h3>
              </div>
              <button className="lab-btn-icon" onClick={() => setAckModalItem(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAcknowledge}>
              <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#fef2f2', padding: '0.85rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                    <strong>Patient:</strong> {ackModalItem.patient?.fullName} (MRN: {ackModalItem.patient?.medicalRecordNumber || 'N/A'})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '0.2rem' }}>
                    <strong>Observation:</strong> {ackModalItem.criticalFindingNotes || ackModalItem.impression}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Attending Physician / Care Team Member Notified *
                  </label>
                  <input
                    type="text"
                    required
                    className="lab-input"
                    placeholder="e.g. Dr. Sarah Jenkins, MD (ED Attending)"
                    value={ackData.notifiedPhysicianName}
                    onChange={(e) => setAckData({ ...ackData, notifiedPhysicianName: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Communication Method
                    </label>
                    <select
                      className="lab-select"
                      value={ackData.communicationMethod}
                      onChange={(e) => setAckData({ ...ackData, communicationMethod: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="Phone">Direct Telephone</option>
                      <option value="In-Person">In-Person Hand-off</option>
                      <option value="Hospital Pager">Hospital Pager / VoIP</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={ackData.readBackConfirmed}
                        onChange={(e) => setAckData({ ...ackData, readBackConfirmed: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span><strong>Read-back confirmed</strong></span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Communication Summary / Care Plan Notes
                  </label>
                  <textarea
                    rows={2}
                    className="lab-textarea"
                    placeholder="e.g. Physician acknowledged acute findings and ordered emergency chest tube placement..."
                    value={ackData.acknowledgmentNotes}
                    onChange={(e) => setAckData({ ...ackData, acknowledgmentNotes: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div className="lab-modal-footer">
                <button type="button" className="lab-btn lab-btn-secondary" onClick={() => setAckModalItem(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#ef4444', borderColor: '#dc2626' }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : 'Confirm Verbal Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
