/**
 * Laboratory Requests Directory & Workflow Tab
 * 
 * Complete lab orders workstation:
 * - Multi-field search (Request ID, Patient, Doctor, Investigation)
 * - Clinical filters (Status, Priority, Category, Department)
 * - Safe clinical status transitions with audit tracking
 * - Detailed inspection drawer with patient demographics and billing status
 */

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  FlaskConical,
  Activity,
  FileText,
  FileCheck,
  AlertTriangle,
  X,
  Barcode,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabRequestsTab({ onNavigateTab }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selected request for drawer / status modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    labService.getRequests({
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    })
      .then((res) => {
        setRequests(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load lab requests:', err);
        setFeedback({
          type: 'error',
          message: 'Unable to load laboratory investigation requests.',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleStatusTransition = async (reqId, newStatus, reason = '') => {
    setActionLoading(true);
    try {
      const res = await labService.updateRequestStatus(reqId, {
        status: newStatus,
        reason,
      });
      setFeedback({
        type: 'success',
        message: res.message || `Request status successfully updated to ${newStatus}.`,
      });
      if (selectedRequest && selectedRequest._id === reqId) {
        setSelectedRequest(res.data);
      }
      setRejectModalOpen(false);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      console.error('Status transition error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update request status.',
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
            <ClipboardList size={13} />
            <span>INVESTIGATION ORDERS DIRECTORY</span>
          </div>
          <h1 className="lab-header-title">Laboratory Requests</h1>
          <p className="lab-header-subtitle">
            Manage physician diagnostic orders, verify clinical indications, and track accessioning stages.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchRequests}
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

      {/* ── Filter Bar ── */}
      <div className="lab-filter-card">
        <form onSubmit={handleSearchSubmit} className="lab-filter-search">
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search by Request ID, Patient name, Test name, Doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="lab-btn lab-btn--primary lab-btn--sm">
            Search
          </button>
        </form>

        <div className="lab-filter-selects">
          <div className="lab-select-wrap">
            <label className="lab-filter-label">Status:</label>
            <select
              className="lab-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Sample Pending">Sample Pending</option>
              <option value="Sample Collected">Sample Collected</option>
              <option value="Processing">Processing</option>
              <option value="Result Pending">Result Pending</option>
              <option value="Verified">Verified</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="lab-select-wrap">
            <label className="lab-filter-label">Priority:</label>
            <select
              className="lab-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="Routine">Routine</option>
              <option value="Urgent">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
          </div>

          <div className="lab-select-wrap">
            <label className="lab-filter-label">Category:</label>
            <select
              className="lab-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Immunology">Immunology</option>
              <option value="Pathology">Pathology</option>
              <option value="Urinalysis">Urinalysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table of Lab Requests ── */}
      <div className="lab-card">
        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Fetching laboratory requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="lab-empty-state">
              <ClipboardList size={38} className="lab-empty-icon" />
              <p className="lab-empty-title">No Investigation Orders Found</p>
              <p className="lab-empty-desc">
                {search || statusFilter !== 'ALL'
                  ? 'No diagnostic requests matched your filter criteria.'
                  : 'There are currently no active lab investigation orders.'}
              </p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Patient Demographics</th>
                    <th>Test / Panel</th>
                    <th>Ordering Doctor</th>
                    <th>Priority</th>
                    <th>Billing</th>
                    <th>Status</th>
                    <th className="lab-col-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const statusClass =
                      r.status === 'Verified' || r.status === 'Completed'
                        ? 'green'
                        : r.status === 'Processing'
                        ? 'blue'
                        : r.status === 'Sample Collected'
                        ? 'cyan'
                        : r.status === 'Rejected' || r.status === 'Cancelled'
                        ? 'red'
                        : 'amber';

                    return (
                      <tr key={r._id}>
                        <td>
                          <span className="lab-code-chip">{r.requestId || 'LR-PENDING'}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : 'Direct Walk-in'}
                            </span>
                            <span className="lab-user-sub">
                              {r.patient?.gender ? `${r.patient.gender}, ` : ''}
                              {r.patient?.phone || r.patient?.email || 'No contact'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="lab-text-bold">{r.testName}</span>
                          <span className="lab-badge-cat">{r.category}</span>
                        </td>
                        <td>
                          <div className="lab-cell-user">
                            <span className="lab-user-name">
                              {r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}` : r.department}
                            </span>
                            <span className="lab-user-sub">{r.department || 'Outpatient'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`lab-priority-pill lab-priority-pill--${(r.priority || 'Routine').toLowerCase()}`}>
                            {r.priority || 'Routine'}
                          </span>
                        </td>
                        <td>
                          <span className={`lab-bill-chip lab-bill-chip--${(r.billingStatus || 'Pending').toLowerCase()}`}>
                            {r.billingStatus || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`lab-status-badge lab-status-badge--${statusClass}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="lab-col-right">
                          <div className="lab-row-actions">
                            <button
                              type="button"
                              className="lab-action-btn"
                              title="Inspect Clinical Order"
                              onClick={() => setSelectedRequest(r)}
                            >
                              <Eye size={15} />
                            </button>

                            {/* Contextual Workflow Action based on Status */}
                            {['Pending', 'Accepted'].includes(r.status) && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--primary"
                                title="Collect Specimen"
                                onClick={() => onNavigateTab('collection', r)}
                              >
                                <FlaskConical size={15} />
                              </button>
                            )}

                            {r.status === 'Sample Pending' && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--primary"
                                title="Collect Specimen"
                                onClick={() => onNavigateTab('collection', r)}
                              >
                                <FlaskConical size={15} />
                              </button>
                            )}

                            {['Sample Collected', 'Received'].includes(r.status) && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--blue"
                                title="Start In-Vitro Processing"
                                onClick={() => onNavigateTab('processing', r)}
                              >
                                <Activity size={15} />
                              </button>
                            )}

                            {r.status === 'Processing' && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--blue"
                                title="Manage Processing / Results"
                                onClick={() => onNavigateTab('processing', r)}
                              >
                                <Activity size={15} />
                              </button>
                            )}

                            {r.status === 'Result Pending' && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--purple"
                                title="Record Results"
                                onClick={() => onNavigateTab('results', r)}
                              >
                                <FileText size={15} />
                              </button>
                            )}

                            {['Verified', 'Completed'].includes(r.status) && (
                              <button
                                type="button"
                                className="lab-action-btn lab-action-btn--green"
                                title="View Lab Report"
                                onClick={() => onNavigateTab('reports', r)}
                              >
                                <FileCheck size={15} />
                              </button>
                            )}
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

      {/* ── Slide-Over Drawer: Full Clinical Request Inspection ── */}
      {selectedRequest && (
        <div className="lab-drawer-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="lab-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="lab-drawer__header">
              <div>
                <div className="lab-header-badge">INVESTIGATION AUDIT DOSSIER</div>
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
              {/* Patient Info */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Patient Demographics</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Full Name:</span>
                    <span className="lab-info-value">
                      {selectedRequest.patient
                        ? `${selectedRequest.patient.firstName} ${selectedRequest.patient.lastName}`
                        : 'Walk-in'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Gender:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Contact:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Email:</span>
                    <span className="lab-info-value">{selectedRequest.patient?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Order Specifications */}
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
                    <span className="lab-info-label">Status:</span>
                    <span className="lab-status-badge lab-status-badge--amber">{selectedRequest.status}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Ordering Doctor:</span>
                    <span className="lab-info-value">
                      {selectedRequest.doctor
                        ? `Dr. ${selectedRequest.doctor.firstName} ${selectedRequest.doctor.lastName}`
                        : 'Physician'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Department:</span>
                    <span className="lab-info-value">{selectedRequest.department || 'Outpatient'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Order Date:</span>
                    <span className="lab-info-value">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Billing Status:</span>
                    <span className="lab-info-value">{selectedRequest.billingStatus || 'Pending'}</span>
                  </div>
                </div>

                {selectedRequest.clinicalNotes && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <span className="lab-info-label">Clinical Indication:</span>
                    <div className="lab-notes-box">{selectedRequest.clinicalNotes}</div>
                  </div>
                )}
              </div>

              {/* Specimen Information */}
              <div className="lab-drawer-section">
                <h4 className="lab-drawer-section__title">Specimen Information</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Sample ID:</span>
                    <span className="lab-barcode-chip">
                      <Barcode size={13} />
                      <span>{selectedRequest.sampleId || 'Not yet collected'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="lab-info-label">Sample Type:</span>
                    <span className="lab-info-value">{selectedRequest.sampleType || 'Whole Blood'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Container:</span>
                    <span className="lab-info-value">{selectedRequest.sampleContainer || 'Standard Vacutainer'}</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Condition:</span>
                    <span className="lab-info-value">{selectedRequest.sampleCondition || 'N/A'}</span>
                  </div>
                </div>

                {selectedRequest.rejectionReason && (
                  <div className="lab-alert lab-alert--error" style={{ marginTop: '0.85rem' }}>
                    <AlertTriangle size={16} />
                    <span><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="lab-drawer__footer">
              {['Pending'].includes(selectedRequest.status) && (
                <button
                  type="button"
                  className="lab-btn lab-btn--secondary"
                  onClick={() => handleStatusTransition(selectedRequest._id, 'Accepted')}
                  disabled={actionLoading}
                >
                  Accept Order
                </button>
              )}

              {['Pending', 'Accepted', 'Sample Pending'].includes(selectedRequest.status) && (
                <button
                  type="button"
                  className="lab-btn lab-btn--danger"
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading}
                >
                  Reject Order
                </button>
              )}

              {['Pending', 'Accepted', 'Sample Pending'].includes(selectedRequest.status) && (
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
                  <span>Collect Sample</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reject Request ── */}
      {rejectModalOpen && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <AlertTriangle size={18} className="lab-color-red" />
                <h3 className="lab-modal__title">Reject Diagnostic Request</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setRejectModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal__body">
              <p className="lab-modal-desc">
                Please provide an auditable clinical reason for rejecting investigation order{' '}
                <strong>{selectedRequest?.requestId}</strong>.
              </p>
              <label className="lab-form-label">Clinical Rationale / Rejection Reason *</label>
              <textarea
                className="lab-textarea"
                rows={4}
                placeholder="e.g. Duplicate order, conflicting medication, patient discharged, inappropriate tube specified..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--danger"
                disabled={!rejectionReason.trim() || actionLoading}
                onClick={() => handleStatusTransition(selectedRequest._id, 'Rejected', rejectionReason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
