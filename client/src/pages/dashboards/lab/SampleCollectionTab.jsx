/**
 * Sample Collection Workstation Tab
 * 
 * Specimen accessioning workstation:
 * - Queue of lab orders awaiting phlebotomy or specimen receipt
 * - Mandatory specimen validation: unique barcode Sample ID, condition, container
 * - Rejection protocol with clinical reasons
 * - Barcode label generation preview
 */

import { useState, useEffect } from 'react';
import {
  FlaskConical,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  X,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function SampleCollectionTab({ activeRequest, onNavigateTab }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');

  // Selected request for collection modal
  const [selectedReq, setSelectedReq] = useState(activeRequest || null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(!!activeRequest);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);

  // Form Fields
  const [sampleType, setSampleType] = useState('Whole Blood');
  const [sampleContainer, setSampleContainer] = useState('EDTA Vacutainer (Lavender top)');
  const [sampleCondition, setSampleCondition] = useState('Acceptable');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [generatedSampleId, setGeneratedSampleId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Sync activeRequest when passed from other tabs
  useEffect(() => {
    if (activeRequest) {
      setSelectedReq(activeRequest);
      setSampleType(activeRequest.sampleType || 'Whole Blood');
      setSampleContainer(activeRequest.sampleContainer || 'EDTA Vacutainer (Lavender top)');
      setCollectionModalOpen(true);
    }
  }, [activeRequest]);

  const fetchAwaitingSamples = () => {
    setLoading(true);
    labService.getSamples({ stage: 'awaiting', search: search || undefined })
      .then((res) => {
        setSamples(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load awaiting samples:', err);
        setFeedback({ type: 'error', message: 'Unable to load specimen collection queue.' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAwaitingSamples();
  }, []);

  const openCollectionDialog = (req) => {
    setSelectedReq(req);
    setSampleType(req.sampleType || 'Whole Blood');
    setSampleContainer(req.sampleContainer || 'EDTA Vacutainer (Lavender top)');
    setSampleCondition('Acceptable');
    setCollectionNotes('');
    setCollectionModalOpen(true);
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    setActionLoading(true);
    try {
      const res = await labService.collectSample({
        requestId: selectedReq._id,
        sampleType,
        sampleContainer,
        sampleCondition,
        collectionNotes,
      });

      const collected = res.data;
      setGeneratedSampleId(collected.sampleId);
      setCollectionModalOpen(false);
      setLabelModalOpen(true);
      setFeedback({
        type: 'success',
        message: `Specimen ${collected.sampleId} logged successfully. Label ready for printing.`,
      });
      fetchAwaitingSamples();
    } catch (err) {
      console.error('Collection error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record specimen collection.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedReq || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      await labService.rejectSample(selectedReq._id, {
        reason: rejectionReason,
      });
      setRejectModalOpen(false);
      setRejectionReason('');
      setFeedback({
        type: 'success',
        message: 'Specimen rejected. Clinician alerted for recollection.',
      });
      fetchAwaitingSamples();
    } catch (err) {
      console.error('Rejection error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reject specimen.',
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
            <FlaskConical size={13} />
            <span>PHLEBOTOMY & SPECIMEN ACCESSIONING</span>
          </div>
          <h1 className="lab-header-title">Sample Collection Workstation</h1>
          <p className="lab-header-subtitle">
            Collect, barcode, and verify integrity of diagnostic biological specimens.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchAwaitingSamples}
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

      {/* ── Search & Metrics ── */}
      <div className="lab-filter-card">
        <div className="lab-filter-search" style={{ flex: 1 }}>
          <Search size={16} className="lab-filter-icon" />
          <input
            type="text"
            className="lab-input lab-input--search"
            placeholder="Search by Patient name, Request ID, or Test..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="lab-btn lab-btn--primary lab-btn--sm"
          onClick={fetchAwaitingSamples}
        >
          Search Queue
        </button>
      </div>

      {/* ── Table: Awaiting Specimen Collection ── */}
      <div className="lab-card">
        <div className="lab-card__header">
          <div className="lab-card__title-group">
            <Clock size={18} className="lab-color-cyan" />
            <h2 className="lab-card__title">Awaiting Specimen Collection</h2>
            <span className="lab-count-badge">{samples.length}</span>
          </div>
        </div>

        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Scanning accessioning queue...</span>
            </div>
          ) : samples.length === 0 ? (
            <div className="lab-empty-state">
              <CheckCircle2 size={40} className="lab-empty-icon lab-color-green" />
              <p className="lab-empty-title">All Specimens Collected</p>
              <p className="lab-empty-desc">There are no pending diagnostic orders waiting for collection.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Patient</th>
                    <th>Test / Panel</th>
                    <th>Required Specimen</th>
                    <th>Tube / Container</th>
                    <th>Priority</th>
                    <th>Requested Time</th>
                    <th className="lab-col-right">Workstation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <span className="lab-code-chip">{s.requestId || 'LR-PENDING'}</span>
                      </td>
                      <td>
                        <div className="lab-cell-user">
                          <span className="lab-user-name">
                            {s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : 'Walk-in'}
                          </span>
                          <span className="lab-user-sub">
                            {s.patient?.gender ? `${s.patient.gender}, ` : ''}
                            {s.patient?.phone || s.patient?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="lab-text-bold">{s.testName}</span>
                        <span className="lab-badge-cat">{s.category}</span>
                      </td>
                      <td>
                        <span>{s.sampleType || 'Whole Blood'}</span>
                      </td>
                      <td>
                        <span className="lab-tube-pill">{s.sampleContainer || 'Standard Tube'}</span>
                      </td>
                      <td>
                        <span className={`lab-priority-pill lab-priority-pill--${(s.priority || 'Routine').toLowerCase()}`}>
                          {s.priority || 'Routine'}
                        </span>
                      </td>
                      <td>
                        <span className="lab-sub-text">
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="lab-col-right">
                        <div className="lab-row-actions">
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--danger"
                            onClick={() => {
                              setSelectedReq(s);
                              setRejectModalOpen(true);
                            }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="lab-btn lab-btn--xs lab-btn--primary"
                            onClick={() => openCollectionDialog(s)}
                          >
                            <FlaskConical size={13} />
                            <span>Collect</span>
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

      {/* ── Modal: Specimen Collection Workstation ── */}
      {collectionModalOpen && selectedReq && (
        <div className="lab-modal-overlay">
          <div className="lab-modal lab-modal--md">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <FlaskConical size={18} className="lab-color-cyan" />
                <h3 className="lab-modal__title">Specimen Collection Protocol</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setCollectionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCollectSubmit}>
              <div className="lab-modal__body">
                {/* Order Summary Strip */}
                <div className="lab-summary-box">
                  <div>
                    <span className="lab-summary-label">Order / Request:</span>
                    <span className="lab-summary-val">{selectedReq.requestId}</span>
                  </div>
                  <div>
                    <span className="lab-summary-label">Patient:</span>
                    <span className="lab-summary-val">
                      {selectedReq.patient ? `${selectedReq.patient.firstName} ${selectedReq.patient.lastName}` : 'Walk-in'}
                    </span>
                  </div>
                  <div>
                    <span className="lab-summary-label">Investigation:</span>
                    <span className="lab-summary-val lab-text-bold">{selectedReq.testName}</span>
                  </div>
                  <div>
                    <span className="lab-summary-label">Priority:</span>
                    <span className={`lab-priority-pill lab-priority-pill--${(selectedReq.priority || 'Routine').toLowerCase()}`}>
                      {selectedReq.priority || 'Routine'}
                    </span>
                  </div>
                </div>

                <div className="lab-form-grid">
                  <div className="lab-form-group">
                    <label className="lab-form-label">Specimen Type *</label>
                    <select
                      className="lab-select"
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      required
                    >
                      <option value="Whole Blood">Whole Blood</option>
                      <option value="Serum">Serum</option>
                      <option value="Plasma">Plasma</option>
                      <option value="Urine">Urine (Clean-Catch)</option>
                      <option value="Sputum">Sputum</option>
                      <option value="Swab (Nasopharyngeal)">Swab (Nasopharyngeal)</option>
                      <option value="Tissue Biopsy">Tissue Biopsy</option>
                      <option value="Cerebrospinal Fluid (CSF)">CSF</option>
                      <option value="Stool">Stool</option>
                    </select>
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Collection Tube / Container *</label>
                    <select
                      className="lab-select"
                      value={sampleContainer}
                      onChange={(e) => setSampleContainer(e.target.value)}
                      required
                    >
                      <option value="EDTA Vacutainer (Lavender top)">EDTA Vacutainer (Lavender top)</option>
                      <option value="SST Gel Separator (Yellow top)">SST Gel Separator (Yellow top)</option>
                      <option value="Plain Clot Activator (Red top)">Plain Clot Activator (Red top)</option>
                      <option value="Sodium Fluoride (Gray top - Glucose)">Sodium Fluoride (Gray top)</option>
                      <option value="Sodium Citrate (Light Blue top - Coagulation)">Sodium Citrate (Light Blue top)</option>
                      <option value="Sterile Urine Container (Screw cap)">Sterile Urine Container</option>
                      <option value="Viral Transport Medium (VTM)">Viral Transport Medium (VTM)</option>
                      <option value="Formalin Biopsy Pot">Formalin Biopsy Pot</option>
                    </select>
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Specimen Physical Condition *</label>
                    <select
                      className="lab-select"
                      value={sampleCondition}
                      onChange={(e) => setSampleCondition(e.target.value)}
                      required
                    >
                      <option value="Acceptable">Acceptable (Clear, No Contamination)</option>
                      <option value="Hemolyzed">Hemolyzed (Red Discoloration)</option>
                      <option value="Lipemic">Lipemic (Milky/Turbid)</option>
                      <option value="Clotted">Clotted (Micro-clots present)</option>
                      <option value="Insufficient Volume">Insufficient Volume (QNS)</option>
                      <option value="Contaminated">Contaminated</option>
                    </select>
                  </div>

                  <div className="lab-form-group">
                    <label className="lab-form-label">Collection Timestamp</label>
                    <input
                      type="text"
                      className="lab-input"
                      value={new Date().toLocaleString()}
                      disabled
                    />
                  </div>
                </div>

                <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                  <label className="lab-form-label">Accessioning Notes / Observations</label>
                  <textarea
                    className="lab-textarea"
                    rows={3}
                    placeholder="e.g. Venipuncture completed right arm, single attempt, patient fasted 10 hours..."
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="lab-modal__footer">
                <button
                  type="button"
                  className="lab-btn lab-btn--secondary"
                  onClick={() => setCollectionModalOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lab-btn lab-btn--primary"
                  disabled={actionLoading}
                >
                  <Barcode size={16} />
                  <span>Log Sample & Generate Barcode</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Barcode Label Preview ── */}
      {labelModalOpen && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <Printer size={18} className="lab-color-cyan" />
                <h3 className="lab-modal__title">Specimen Barcode Label</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setLabelModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              {/* Visual Barcode Label Card */}
              <div className="lab-barcode-label">
                <div className="lab-barcode-label__hospital">HMS CENTRAL DIAGNOSTIC LAB</div>
                <div className="lab-barcode-graphic">
                  |||||| |||||||| |||| |||||||||| |||||
                </div>
                <div className="lab-barcode-id">{generatedSampleId}</div>
                <div className="lab-barcode-meta">
                  <div>
                    <strong>Patient:</strong>{' '}
                    {selectedReq?.patient ? `${selectedReq.patient.firstName} ${selectedReq.patient.lastName}` : 'Walk-in'}
                  </div>
                  <div>
                    <strong>Test:</strong> {selectedReq?.testName}
                  </div>
                  <div>
                    <strong>Tube:</strong> {sampleContainer}
                  </div>
                  <div>
                    <strong>Time:</strong> {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setLabelModalOpen(false)}
              >
                Done
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={15} />
                <span>Print Tube Label</span>
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--blue"
                onClick={() => {
                  setLabelModalOpen(false);
                  onNavigateTab('tracking');
                }}
              >
                <span>Go to Sample Tracking</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reject Specimen ── */}
      {rejectModalOpen && selectedReq && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <ShieldAlert size={18} className="lab-color-red" />
                <h3 className="lab-modal__title">Reject Specimen</h3>
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
                Record clinical rejection rationale for order <strong>{selectedReq.requestId}</strong> ({selectedReq.testName}).
              </p>
              <label className="lab-form-label">Clinical Rejection Reason *</label>
              <textarea
                className="lab-textarea"
                rows={3}
                placeholder="e.g. Gross hemolysis, incorrect anticoagulant tube, clotted EDTA, insufficient volume for assay..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
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
                onClick={handleRejectSubmit}
              >
                Confirm Specimen Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
