/**
 * Report Verification & Sign-off Workstation Tab
 * 
 * Attending Radiologist workstation for secondary review, validation, and electronic signing:
 * - Full clinical inspection of draft report against findings
 * - Actions: Finalize & Electronically Sign, Return for Amendment
 * - Immediate notification dispatch to referring physicians and EMR chart
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function ReportVerificationTab({ activeReport, _onNavigateTab }) {
  const [queue, setQueue] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Return modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  const fetchQueue = useCallback(() => {
    setLoading(true);
    setError('');
    radiologyService.getVerificationQueue()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.queue || res.data?.reports || []);
        setQueue(list);
        if (activeReport) {
          const match = list.find((r) => (r._id || r.id) === (activeReport._id || activeReport.id));
          setSelectedReport(match || activeReport);
        } else if (list.length > 0 && !selectedReport) {
          setSelectedReport(list[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load verification queue:', err);
        setError('Failed to fetch reports awaiting radiologist sign-off.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeReport, selectedReport]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleVerify = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    try {
      await radiologyService.verifyReport(selectedReport._id || selectedReport.id, {});
      alert('Report verified and finalized! The electronic signature has been affixed and the report is now published to EMR.');
      setSelectedReport(null);
      fetchQueue();
    } catch (err) {
      console.error('Failed to verify report:', err);
      alert(err.response?.data?.message || 'Error signing and verifying report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedReport) return;
    if (!revisionNotes.trim()) {
      alert('Please explain the reason or amendment required.');
      return;
    }
    setSubmitting(true);
    try {
      await radiologyService.returnReport(selectedReport._id || selectedReport.id, {
        returnReason: revisionNotes,
      });
      alert('Report returned for revision.');
      setReturnModalOpen(false);
      setRevisionNotes('');
      setSelectedReport(null);
      fetchQueue();
    } catch (err) {
      console.error('Failed to return report:', err);
      alert(err.response?.data?.message || 'Error returning report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <CheckCircle2 size={13} />
            <span>ATTENDING RADIOLOGIST SIGN-OFF</span>
          </div>
          <h1 className="lab-header-title">Diagnostic Report Verification</h1>
          <p className="lab-header-subtitle">
            Validate preliminary diagnostic interpretations, review impressions, and affix electronic signatures.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={fetchQueue} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={fetchQueue} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Queue List */}
        <div className="lab-card" style={{ padding: 0 }}>
          <div className="lab-card-header" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Verification Worklist</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{queue.length} pending</span>
          </div>
          <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
            {queue.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', color: '#10b981' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No reports awaiting verification!</p>
              </div>
            ) : (
              queue.map((item) => {
                const isSelected = selectedReport && (selectedReport._id || selectedReport.id) === (item._id || item.id);
                return (
                  <div
                    key={item._id || item.id}
                    onClick={() => setSelectedReport(item)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? '#4338ca' : '#0f172a' }}>
                        {item.patient?.fullName || item.patient?.name || 'Patient'}
                      </strong>
                      {item.isCritical && (
                        <span className="lab-badge lab-badge-danger" style={{ fontSize: '0.65rem' }}>
                          STAT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      {item.studyType || item.procedureName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{item.modality}</span>
                      <span className="font-mono">{item.accessionNumber || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Report Review & Sign Console */}
        {selectedReport ? (
          <div className="lab-card" style={{ padding: '1.5rem' }}>
            
            {/* Header & Verification Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                    {selectedReport.modality}
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: '#4338ca' }}>
                    #{selectedReport.accessionNumber || 'N/A'}
                  </span>
                  {selectedReport.isCritical && (
                    <span className="lab-badge lab-badge-danger">CRITICAL FINDING</span>
                  )}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                  {selectedReport.studyType || selectedReport.procedureName}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Patient: <strong>{selectedReport.patient?.fullName}</strong> • MRN: {selectedReport.patient?.medicalRecordNumber || 'N/A'} • Age: {selectedReport.patient?.age || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="lab-btn lab-btn-secondary"
                  onClick={() => setReturnModalOpen(true)}
                  disabled={submitting}
                >
                  <RotateCcw size={14} />
                  <span>Return for Revision</span>
                </button>
                <button
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#10b981', borderColor: '#059669' }}
                  onClick={handleVerify}
                  disabled={submitting}
                >
                  <CheckCircle2 size={15} />
                  <span>{submitting ? 'Signing...' : 'Verify & Publish'}</span>
                </button>
              </div>
            </div>

            {/* Document Preview Box */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}>
              <div>
                <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Technique
                </h4>
                <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                  {selectedReport.technique || 'Standard imaging protocol executed.'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comparison
                </h4>
                <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                  {selectedReport.comparison || 'None.'}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Diagnostic Findings
                </h4>
                <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {selectedReport.findings || 'No findings recorded.'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Impression
                </h4>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {selectedReport.impression || 'Pending impression.'}
                </div>
              </div>

              {selectedReport.recommendation && (
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recommendations
                  </h4>
                  <div style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                    {selectedReport.recommendation}
                  </div>
                </div>
              )}

              {selectedReport.criticalFindingNotes && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={15} />
                    <span>Critical Alert Documentation</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
                    {selectedReport.criticalFindingNotes}
                  </p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="lab-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select a report from the worklist to review and sign off.</p>
          </div>
        )}

      </div>

      {/* ── Return for Revision Modal ── */}
      {returnModalOpen && selectedReport && (
        <div className="lab-modal-overlay" onClick={() => setReturnModalOpen(false)}>
          <div className="lab-modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Return Report for Revision</h3>
              <button className="lab-btn-icon" onClick={() => setReturnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lab-modal-body">
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Revision Feedback / Instructions for Drafter:
              </label>
              <textarea
                rows={3}
                className="lab-textarea"
                placeholder="e.g. Please clarify lung apex opacity vs lordotic projection artifact..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-secondary" onClick={() => setReturnModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="lab-btn lab-btn-danger" onClick={handleReturn} disabled={submitting}>
                {submitting ? 'Returning...' : 'Send Back for Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
