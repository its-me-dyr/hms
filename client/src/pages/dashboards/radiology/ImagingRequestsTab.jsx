/**
 * Imaging Requests Tab
 * 
 * Order intake, triage, acceptance, and cancellation for diagnostic imaging referrals:
 * - Modality filter (X-Ray, CT, MRI, Ultrasound, Mammography, etc.)
 * - Priority triage (Routine, Urgent, STAT / Emergency)
 * - Multi-criteria search by patient name, MRN, procedure, accession
 * - Actions: Accept & Schedule, Cancel Order, Inspect Details
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Calendar,
  XCircle,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function ImagingRequestsTab({ onNavigateTab }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('requested');

  // Selected for inspection modal
  const [inspectItem, setInspectItem] = useState(null);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getRequests({ search, modality, priority, status })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.requests || res.data?.reports || []);
        setRequests(list);
      })
      .catch((err) => {
        console.error('Failed to fetch imaging requests:', err);
        setError('Failed to load imaging requests from backend.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [search, modality, priority, status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleCancelRequest = async () => {
    if (!cancelModalItem) return;
    setSubmittingAction(true);
    try {
      await radiologyService.updateRequestStatus(cancelModalItem._id || cancelModalItem.id, {
        status: 'cancelled',
        reason: cancelReason || 'Order cancelled by radiology department',
      });
      setCancelModalItem(null);
      setCancelReason('');
      fetchRequests();
    } catch (err) {
      console.error('Failed to cancel request:', err);
      alert(err.response?.data?.message || 'Error cancelling imaging request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <ClipboardList size={13} />
            <span>ORDER INTAKE & TRIAGE</span>
          </div>
          <h1 className="lab-header-title">Diagnostic Imaging Orders</h1>
          <p className="lab-header-subtitle">
            Physician diagnostic imaging referrals awaiting scheduling, modality routing, or protocoling.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchRequests} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchRequests} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient, MRN, procedure, accession..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lab-input"
              style={{ width: '100%', paddingLeft: '2rem' }}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select className="lab-select" value={modality} onChange={(e) => setModality(e.target.value)}>
              <option value="">All Modalities</option>
              <option value="X-Ray">X-Ray (CR / DR)</option>
              <option value="CT">Computed Tomography (CT)</option>
              <option value="MRI">Magnetic Resonance (MRI)</option>
              <option value="Ultrasound">Ultrasound (US)</option>
              <option value="Mammography">Mammography</option>
              <option value="PET-CT">PET-CT / Nuclear</option>
              <option value="Fluoroscopy">Fluoroscopy</option>
            </select>
          </div>

          <div style={{ minWidth: '130px' }}>
            <select className="lab-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">STAT / Emergency</option>
            </select>
          </div>

          <div style={{ minWidth: '130px' }}>
            <select className="lab-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="requested">Pending Acceptance</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button type="submit" className="lab-btn lab-btn-primary" style={{ background: '#6366f1', borderColor: '#4f46e5' }}>
            <Search size={15} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* ── Orders Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading diagnostic imaging orders...</p>
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No imaging orders match the selected filters.</p>
              <p style={{ fontSize: '0.85rem' }}>Adjust search criteria or view all requests.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Accession / Ref</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Ordering Doctor</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item._id || item.id}>
                    <td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                        {item.accessionNumber || item.reportNumber || 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                        {item.patient?.fullName || item.patient?.name || 'Unknown Patient'}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        MRN: {item.patient?.medicalRecordNumber || 'N/A'} {item.patient?.gender ? `• ${item.patient.gender}` : ''}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.studyType || item.procedureName || 'Diagnostic Study'}</div>
                      <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3', marginTop: '0.2rem' }}>
                        {item.modality}
                      </span>
                      {item.bodyPart && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>
                          ({item.bodyPart})
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {item.orderingDoctor?.fullName || item.doctor?.name || item.requestingPhysician || 'Attending MD'}
                      </div>
                    </td>
                    <td>
                      <span className={`lab-badge ${
                        item.priority === 'emergency' || item.priority === 'stat' ? 'lab-badge-danger' :
                        item.priority === 'urgent' ? 'lab-badge-warning' : 'lab-badge-info'
                      }`}>
                        {item.priority?.toUpperCase() || 'ROUTINE'}
                      </span>
                    </td>
                    <td>
                      <span className={`lab-badge ${
                        item.status === 'completed' ? 'lab-badge-success' :
                        item.status === 'in_progress' ? 'lab-badge-warning' :
                        item.status === 'scheduled' ? 'lab-badge-info' :
                        item.status === 'cancelled' ? 'lab-badge-danger' : 'lab-badge-secondary'
                      }`}>
                        {item.status?.toUpperCase() || 'REQUESTED'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {item.status === 'requested' && (
                          <button
                            className="lab-btn lab-btn-sm lab-btn-primary"
                            style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                            onClick={() => onNavigateTab('scheduling', item)}
                            title="Accept and book slot"
                          >
                            <Calendar size={13} />
                            <span>Schedule</span>
                          </button>
                        )}
                        <button
                          className="lab-btn lab-btn-sm lab-btn-secondary"
                          onClick={() => setInspectItem(item)}
                          title="Inspect full clinical order"
                        >
                          <Eye size={13} />
                        </button>
                        {item.status !== 'cancelled' && item.status !== 'completed' && (
                          <button
                            className="lab-btn lab-btn-sm lab-btn-danger"
                            onClick={() => setCancelModalItem(item)}
                            title="Cancel order"
                          >
                            <XCircle size={13} />
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

      {/* ── Order Detail Modal ── */}
      {inspectItem && (
        <div className="lab-modal-overlay" onClick={() => setInspectItem(null)}>
          <div className="lab-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Imaging Referral Details</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Accession #{inspectItem.accessionNumber || 'N/A'}</span>
              </div>
              <button className="lab-btn-icon" onClick={() => setInspectItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Patient Demographics</h4>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {inspectItem.patient?.fullName || inspectItem.patient?.name || 'Unknown Patient'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  MRN: {inspectItem.patient?.medicalRecordNumber || 'N/A'} | DOB / Age: {inspectItem.patient?.age || 'N/A'} | Phone: {inspectItem.patient?.phone || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Procedure</h4>
                  <div style={{ fontWeight: 600 }}>{inspectItem.studyType || inspectItem.procedureName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Modality: {inspectItem.modality}</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Priority & Status</h4>
                  <span className="lab-badge lab-badge-warning">{inspectItem.priority?.toUpperCase()}</span>
                  <span className="lab-badge lab-badge-info" style={{ marginLeft: '0.5rem' }}>{inspectItem.status?.toUpperCase()}</span>
                </div>
              </div>

              {inspectItem.clinicalHistory && (
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Clinical Indication / Reason for Exam</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '6px' }}>
                    {inspectItem.clinicalHistory}
                  </p>
                </div>
              )}

              {inspectItem.instructions && (
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Special Referral Instructions</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{inspectItem.instructions}</p>
                </div>
              )}
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setInspectItem(null)}>
                Close
              </button>
              {inspectItem.status === 'requested' && (
                <button
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                  onClick={() => {
                    const item = inspectItem;
                    setInspectItem(null);
                    onNavigateTab('scheduling', item);
                  }}
                >
                  <Calendar size={15} />
                  <span>Proceed to Schedule</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Order Modal ── */}
      {cancelModalItem && (
        <div className="lab-modal-overlay" onClick={() => setCancelModalItem(null)}>
          <div className="lab-modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#991b1b' }}>Cancel Imaging Order</h3>
              <button className="lab-btn-icon" onClick={() => setCancelModalItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Are you sure you want to cancel the order for <strong>{cancelModalItem.patient?.fullName || 'this patient'}</strong>?
              </p>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Cancellation Reason:
              </label>
              <textarea
                rows={3}
                className="lab-textarea"
                placeholder="Contraindication, patient refusal, duplicate order..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setCancelModalItem(null)} disabled={submittingAction}>
                Dismiss
              </button>
              <button className="lab-btn lab-btn-danger" onClick={handleCancelRequest} disabled={submittingAction}>
                {submittingAction ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
