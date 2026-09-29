/**
 * Test Processing Workstation Tab
 * 
 * In-vitro diagnostic analyzer execution:
 * - Active analyzer queue management
 * - Start analysis, record analyzer runs & calibration observations
 * - Advance specimen to Results Entry once processing is complete
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Barcode,
  X,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function TestProcessingTab({ activeSample, onNavigateTab }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [selectedSample, setSelectedSample] = useState(activeSample || null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Modals
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  useEffect(() => {
    if (activeSample) {
      setSelectedSample(activeSample);
    }
  }, [activeSample]);

  const fetchProcessingQueue = () => {
    setLoading(true);
    labService.getProcessingQueue()
      .then((res) => {
        setQueue(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load processing queue:', err);
        setFeedback({ type: 'error', message: 'Unable to load test processing queue.' });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProcessingQueue();
  }, []);

  const handleStartProcessing = async () => {
    if (!selectedSample) return;
    setActionLoading(true);
    try {
      await labService.startProcessing({
        id: selectedSample._id,
        notes,
      });
      setFeedback({
        type: 'success',
        message: `Sample ${selectedSample.sampleId || selectedSample.requestId} is now In Processing.`,
      });
      setStartModalOpen(false);
      setNotes('');
      fetchProcessingQueue();
    } catch (err) {
      console.error('Start processing error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to start processing.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteProcessing = async () => {
    if (!selectedSample) return;
    setActionLoading(true);
    try {
      const res = await labService.completeProcessing(selectedSample._id, {
        notes,
      });
      setFeedback({
        type: 'success',
        message: 'Processing marked complete. Ready for Results Entry.',
      });
      setCompleteModalOpen(false);
      setNotes('');
      fetchProcessingQueue();
      // Optionally forward to results entry tab
      onNavigateTab('results', res.data);
    } catch (err) {
      console.error('Complete processing error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to complete processing.',
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
            <Activity size={13} />
            <span>IN-VITRO DIAGNOSTIC WORKSTATION</span>
          </div>
          <h1 className="lab-header-title">Test Processing Workstation</h1>
          <p className="lab-header-subtitle">
            Execute automated analyzers, track photometric assays, and advance specimens to results recording.
          </p>
        </div>
        <div className="lab-header-actions">
          <button
            type="button"
            className="lab-btn lab-btn--secondary"
            onClick={fetchProcessingQueue}
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

      {/* ── Processing Queue Table ── */}
      <div className="lab-card">
        <div className="lab-card__header">
          <div className="lab-card__title-group">
            <Activity size={18} className="lab-color-blue" />
            <h2 className="lab-card__title">Active Processing Workstation Queue</h2>
            <span className="lab-count-badge">{queue.length}</span>
          </div>
        </div>

        <div className="lab-card__body lab-card__body--flush">
          {loading ? (
            <div className="lab-loading-block">
              <div className="lab-spinner" />
              <span>Scanning analyzer workstation queue...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="lab-empty-state">
              <CheckCircle2 size={40} className="lab-empty-icon lab-color-green" />
              <p className="lab-empty-title">Analyzer Queue Clear</p>
              <p className="lab-empty-desc">No specimens currently waiting or running in processing.</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Patient</th>
                    <th>Investigation</th>
                    <th>Priority</th>
                    <th>Specimen Type</th>
                    <th>Status</th>
                    <th>Started At</th>
                    <th className="lab-col-right">Workstation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <span className="lab-barcode-chip">
                          <Barcode size={13} />
                          <span>{item.sampleId || item.requestId}</span>
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
                        <span>{item.sampleType || 'Serum'}</span>
                      </td>
                      <td>
                        <span className={`lab-status-badge lab-status-badge--${item.status === 'Processing' ? 'blue' : 'cyan'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.processingStartedAt ? (
                          <span className="lab-sub-text">
                            {new Date(item.processingStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="lab-muted-text">Ready to run</span>
                        )}
                      </td>
                      <td className="lab-col-right">
                        <div className="lab-row-actions">
                          {item.status !== 'Processing' ? (
                            <button
                              type="button"
                              className="lab-btn lab-btn--xs lab-btn--primary"
                              onClick={() => {
                                setSelectedSample(item);
                                setStartModalOpen(true);
                              }}
                            >
                              <Play size={13} />
                              <span>Start Run</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="lab-btn lab-btn--xs lab-btn--green"
                              onClick={() => {
                                setSelectedSample(item);
                                setCompleteModalOpen(true);
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Complete & Enter</span>
                            </button>
                          )}
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

      {/* ── Modal: Start Processing ── */}
      {startModalOpen && selectedSample && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <Play size={18} className="lab-color-cyan" />
                <h3 className="lab-modal__title">Initiate In-Vitro Analyzer Run</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setStartModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              <div className="lab-summary-box">
                <div>
                  <span className="lab-summary-label">Sample ID:</span>
                  <span className="lab-summary-val">{selectedSample.sampleId || selectedSample.requestId}</span>
                </div>
                <div>
                  <span className="lab-summary-label">Investigation:</span>
                  <span className="lab-summary-val lab-text-bold">{selectedSample.testName}</span>
                </div>
                <div>
                  <span className="lab-summary-label">Patient:</span>
                  <span className="lab-summary-val">
                    {selectedSample.patient ? `${selectedSample.patient.firstName} ${selectedSample.patient.lastName}` : 'Walk-in'}
                  </span>
                </div>
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">Analyzer / Instrument Notes</label>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  placeholder="e.g. Calibrated automated biochemistry analyzer. Reagent lot #48291 verified..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setStartModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--primary"
                onClick={handleStartProcessing}
                disabled={actionLoading}
              >
                <Play size={15} />
                <span>Begin Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Complete Processing ── */}
      {completeModalOpen && selectedSample && (
        <div className="lab-modal-overlay">
          <div className="lab-modal">
            <div className="lab-modal__header">
              <div className="lab-modal__title-group">
                <CheckCircle2 size={18} className="lab-color-green" />
                <h3 className="lab-modal__title">Complete Processing Run</h3>
              </div>
              <button
                type="button"
                className="lab-modal__close"
                onClick={() => setCompleteModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="lab-modal__body">
              <p className="lab-modal-desc">
                Confirm analyzer run completion for specimen{' '}
                <strong>{selectedSample.sampleId || selectedSample.requestId}</strong> ({selectedSample.testName}).
                This will advance the specimen to the <strong>Results Entry</strong> workstation.
              </p>

              <div className="lab-form-group">
                <label className="lab-form-label">Processing Notes & Quality Check</label>
                <textarea
                  className="lab-textarea"
                  rows={3}
                  placeholder="e.g. Assay completed without dilution. Quality controls within +/- 2 SD..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="lab-modal__footer">
              <button
                type="button"
                className="lab-btn lab-btn--secondary"
                onClick={() => setCompleteModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lab-btn lab-btn--primary"
                onClick={handleCompleteProcessing}
                disabled={actionLoading}
              >
                <CheckCircle2 size={15} />
                <span>Finish Run & Go to Results</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
