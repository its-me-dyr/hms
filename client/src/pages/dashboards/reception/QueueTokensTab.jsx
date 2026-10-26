/**
 * Reception Queue & Tokens Tab
 * 
 * Live OPD queue management console:
 * - Department and Doctor queue filters
 * - Hero "Now Serving" announcement card
 * - Action controls: Call Next, Recall, Mark Served, Skip
 * - Active waiting queue table with priority indicators
 * - Manual Walk-In Token modal generator
 */

import { useState, useEffect } from 'react';
import {
  Ticket,
  Volume2,
  CheckCircle2,
  SkipForward,
  Plus,
  RefreshCw,
  AlertCircle,
  Building,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function QueueTokensTab() {
  const [tokens, setTokens] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // Action state
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Token Modal
  const [tokenModal, setTokenModal] = useState({
    open: false,
    patientName: '',
    phone: '',
    doctorId: '',
    departmentId: '',
    priority: 'Normal',
    reason: '',
  });

  const loadQueueData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      if (selectedDoctor) params.doctor = selectedDoctor;

      const [resQueue, resDepts, resDocs] = await Promise.all([
        receptionService.getQueueTokens(params),
        departments.length === 0 ? receptionService.getDepartments() : Promise.resolve(null),
        doctors.length === 0 ? receptionService.getDoctors() : Promise.resolve(null),
      ]);

      const queueList = resQueue.data?.queue || resQueue.data || [];
      setTokens(Array.isArray(queueList) ? queueList : []);

      if (resDepts?.data) {
        setDepartments(Array.isArray(resDepts.data) ? resDepts.data : []);
      }
      if (resDocs?.data) {
        const docList = resDocs.data?.doctors || resDocs.data || [];
        setDoctors(Array.isArray(docList) ? docList : []);
      }
    } catch (err) {
      console.error('Failed to load queue tokens:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Unable to retrieve queue status.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchQueue() {
      try {
        const params = {};
        if (selectedDept) params.department = selectedDept;
        if (selectedDoctor) params.doctor = selectedDoctor;

        const [resQueue, resDepts, resDocs] = await Promise.all([
          receptionService.getQueueTokens(params),
          departments.length === 0 ? receptionService.getDepartments() : Promise.resolve(null),
          doctors.length === 0 ? receptionService.getDoctors() : Promise.resolve(null),
        ]);

        if (!ignore) {
          const queueList = resQueue.data?.queue || resQueue.data || [];
          setTokens(Array.isArray(queueList) ? queueList : []);

          if (resDepts?.data) {
            setDepartments(Array.isArray(resDepts.data) ? resDepts.data : []);
          }
          if (resDocs?.data) {
            const docList = resDocs.data?.doctors || resDocs.data || [];
            setDoctors(Array.isArray(docList) ? docList : []);
          }
        }
      } catch (err) {
        if (!ignore) {
          setFeedback({
            type: 'error',
            text: err.message || 'Unable to retrieve queue status.',
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchQueue();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDept, selectedDoctor]);

  // Identify Now Serving token
  const nowServing = tokens.find((t) => t.status === 'Serving') || null;
  // Waiting tokens
  const waitingTokens = tokens.filter((t) => t.status === 'Waiting');

  // Perform queue action
  const handleQueueAction = async (tokenNumber, action) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      await receptionService.updateQueueAction(tokenNumber, action);
      setFeedback({
        type: 'success',
        text: `Action "${action}" processed successfully for Token #${tokenNumber}.`,
      });
      loadQueueData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || `Failed to perform action ${action}.`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Announce / Recall token audio effect
  const handleAnnounce = (tokenNumber) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Token number ${tokenNumber}, please proceed to the consultation room.`);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    setFeedback({
      type: 'success',
      text: `Announced Token #${tokenNumber} over the public display system.`,
    });
  };

  // Create Manual Token submit
  const handleCreateTokenSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        patientName: tokenModal.patientName,
        phone: tokenModal.phone,
        doctorId: tokenModal.doctorId,
        departmentId: tokenModal.departmentId,
        priority: tokenModal.priority,
        reason: tokenModal.reason,
      };
      const res = await receptionService.createOpdToken(payload);
      const newToken = res.data?.tokenNumber || 'Created';
      setFeedback({
        type: 'success',
        text: `OPD Token #${newToken} generated successfully for ${tokenModal.patientName}!`,
      });
      setTokenModal({
        open: false,
        patientName: '',
        phone: '',
        doctorId: '',
        departmentId: '',
        priority: 'Normal',
        reason: '',
      });
      loadQueueData();
    } catch (err) {
      alert(err.message || 'Failed to issue token.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rec-container">
      {/* Tab Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">LIVE OPD QUEUE DISPATCH</div>
          <h1 className="rec-header-title">Queue & Tokens Management</h1>
          <p className="rec-header-subtitle">
            Manage real-time outpatient waiting lines, call next in line, announce tokens, and dispatch patients.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={loadQueueData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
          <button
            type="button"
            className="rec-btn rec-btn--primary"
            onClick={() => setTokenModal({ ...tokenModal, open: true })}
          >
            <Plus size={18} />
            <span>Issue OPD Token</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rec-alert ${
            feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'
          }`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rec-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#334155' }}>
            <Building size={16} style={{ color: '#0891b2' }} />
            <span>Filter Clinic:</span>
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rec-form-select"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '220px' }}>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="rec-form-select"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.firstName} {doc.lastName} ({doc.department?.name || 'Doctor'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>
              Waiting in Queue: <strong style={{ color: '#0891b2' }}>{waitingTokens.length}</strong>
            </span>
            <span style={{ color: '#64748b' }}>
              Total Today: <strong style={{ color: 'var(--text-primary)' }}>{tokens.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Hero "NOW SERVING" Showcase Card */}
      <div
        className="rec-card"
        style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '1.75rem',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(8, 145, 178, 0.25)',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                letterSpacing: '0.5px',
                marginBottom: '0.75rem',
              }}
            >
              <Sparkles size={14} />
              <span>NOW SERVING AT CONSULTATION DESK</span>
            </div>

            {nowServing ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px' }}>
                    #{nowServing.tokenNumber}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                      {nowServing.patient?.firstName} {nowServing.patient?.lastName}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Dr. {nowServing.doctor?.firstName || 'Assigned'} {nowServing.doctor?.lastName || 'Consultant'} • {nowServing.department?.name || 'General Clinic'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Room: <strong>{nowServing.doctor?.roomNumber || 'Room 101'}</strong> • Priority: {nowServing.priority || 'Normal'}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#94a3b8' }}>
                  No Active Token Calling
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {waitingTokens.length > 0
                    ? `${waitingTokens.length} patients are currently waiting. Click "Call Next" to begin consultation.`
                    : 'No patients are currently in the waiting line.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {nowServing && (
              <>
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={() => handleAnnounce(nowServing.tokenNumber)}
                >
                  <Volume2 size={16} />
                  <span>Announce</span>
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--success"
                  onClick={() => handleQueueAction(nowServing.tokenNumber, 'Served')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} />
                  <span>Mark Served</span>
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--danger"
                  onClick={() => handleQueueAction(nowServing.tokenNumber, 'Skipped')}
                  disabled={actionLoading}
                >
                  <SkipForward size={16} />
                  <span>Skip Patient</span>
                </button>
              </>
            )}

            {waitingTokens.length > 0 && (
              <button
                type="button"
                className="rec-btn rec-btn--primary"
                style={{ backgroundColor: '#0891b2', borderColor: '#0891b2', padding: '0.65rem 1.25rem', fontSize: '1rem' }}
                onClick={() => handleQueueAction(waitingTokens[0].tokenNumber, 'Serving')}
                disabled={actionLoading}
              >
                <span>Call Next (#{waitingTokens[0].tokenNumber})</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Queue Registry Table Card */}
      <div className="rec-card">
        <div className="rec-card-header">
          <div>
            <h2 className="rec-card-title">Live Queue Status</h2>
            <p className="rec-card-subtitle">
              All tokens dispatched today ordered by priority and arrival time
            </p>
          </div>
          <button
            type="button"
            className="rec-btn rec-btn--secondary rec-btn--sm"
            onClick={loadQueueData}
          >
            <RefreshCw size={14} className={loading ? 'rec-spin' : ''} />
            <span>Update</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Loading active hospital queue...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="rec-empty-state">
            <Ticket size={48} className="rec-empty-state-icon" />
            <div className="rec-empty-state-title">Queue is empty</div>
            <div className="rec-empty-state-desc">
              No patient tokens have been generated today for this clinic. Click "Issue OPD Token" to add walk-in patients.
            </div>
          </div>
        ) : (
          <div className="rec-table-wrapper">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Patient Details</th>
                  <th>Doctor & Room</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((item) => {
                  const pName = item.patient
                    ? `${item.patient.firstName || ''} ${item.patient.lastName || ''}`.trim()
                    : item.patientName || 'Walk-in Patient';
                  const dName = item.doctor
                    ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}`
                    : 'On-Duty Physician';
                  const isServing = item.status === 'Serving';
                  const isWaiting = item.status === 'Waiting';

                  return (
                    <tr
                      key={item.tokenNumber || item._id}
                      style={{
                        backgroundColor: isServing ? 'rgba(8, 145, 178, 0.05)' : 'inherit',
                      }}
                    >
                      <td>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            color: isServing ? '#0891b2' : '#0f172a',
                          }}
                        >
                          #{item.tokenNumber}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.issuedAt ? new Date(item.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Phone: {item.patient?.phone || item.phone || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{dName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#0891b2' }}>
                          {item.doctor?.roomNumber || 'Room 101'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.department?.name || 'General Clinic'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`rec-badge ${
                            item.priority === 'Emergency'
                              ? 'rec-badge--danger'
                              : item.priority === 'Senior Citizen'
                              ? 'rec-badge--confirmed'
                              : 'rec-badge--scheduled'
                          }`}
                        >
                          {item.priority || 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`rec-badge ${
                            isServing
                              ? 'rec-badge--consulting'
                              : isWaiting
                              ? 'rec-badge--waiting'
                              : item.status === 'Served'
                              ? 'rec-badge--completed'
                              : 'rec-badge--cancelled'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isWaiting && (
                            <button
                              type="button"
                              className="rec-btn rec-btn--primary rec-btn--sm"
                              onClick={() => handleQueueAction(item.tokenNumber, 'Serving')}
                              disabled={actionLoading}
                            >
                              Call In
                            </button>
                          )}
                          {isServing && (
                            <>
                              <button
                                type="button"
                                className="rec-btn rec-btn--secondary rec-btn--sm"
                                onClick={() => handleAnnounce(item.tokenNumber)}
                                title="Announce Speaker"
                              >
                                <Volume2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="rec-btn rec-btn--success rec-btn--sm"
                                onClick={() => handleQueueAction(item.tokenNumber, 'Served')}
                                disabled={actionLoading}
                              >
                                Served
                              </button>
                            </>
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

      {/* Issue OPD Token Modal */}
      {tokenModal.open && (
        <div className="rec-modal-overlay" onClick={() => setTokenModal({ ...tokenModal, open: false })}>
          <div className="rec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title">Generate Walk-in OPD Token</h3>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setTokenModal({ ...tokenModal, open: false })}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTokenSubmit}>
              <div className="rec-modal-body">
                <div className="rec-form-group">
                  <label className="rec-form-label">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robert Smith"
                    value={tokenModal.patientName}
                    onChange={(e) => setTokenModal({ ...tokenModal, patientName: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={tokenModal.phone}
                    onChange={(e) => setTokenModal({ ...tokenModal, phone: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Department *</label>
                    <select
                      required
                      value={tokenModal.departmentId}
                      onChange={(e) => setTokenModal({ ...tokenModal, departmentId: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id || d.name} value={d._id || d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rec-form-group">
                    <label className="rec-form-label">Consulting Doctor</label>
                    <select
                      value={tokenModal.doctorId}
                      onChange={(e) => setTokenModal({ ...tokenModal, doctorId: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="">Any Available Doctor</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>
                          Dr. {d.firstName} {d.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Priority Level</label>
                  <select
                    value={tokenModal.priority}
                    onChange={(e) => setTokenModal({ ...tokenModal, priority: e.target.value })}
                    className="rec-form-select"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Senior Citizen">Senior Citizen (Fast Track)</option>
                    <option value="Child / Infant">Child / Infant</option>
                    <option value="Emergency">Emergency (Immediate)</option>
                  </select>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Chief Complaint / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Symptoms or reason for OPD visit..."
                    value={tokenModal.reason}
                    onChange={(e) => setTokenModal({ ...tokenModal, reason: e.target.value })}
                    className="rec-form-input"
                  />
                </div>
              </div>
              <div className="rec-modal-footer">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={() => setTokenModal({ ...tokenModal, open: false })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rec-btn rec-btn--primary"
                  disabled={actionLoading}
                >
                  Issue Token Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
