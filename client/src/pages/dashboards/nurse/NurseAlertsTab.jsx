/**
 * Nurse Alerts Tab (Emergency Alerts & Room Call Bell Console)
 * 
 * Clinical telemetry alarms, bedside call lights, bathroom pull cords, and rapid response / Code Blue alerts:
 * - Real-time call light monitor with elapsed timers
 * - Urgent audio/visual alert indicators
 * - 1-Click "Acknowledge" and "Clear Call Light" workflows
 * - Emergency Code Blue / Rapid Response trigger
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Check,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseAlertsTab() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [newCall, setNewCall] = useState({
    room: 'Room 303',
    bed: 'Bed 303-A',
    patientName: 'Chloe Decker',
    type: 'Bedside Call Light',
    urgency: 'Urgent',
    details: 'Patient requesting assistance to bed from chair.',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nurseService.getAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await nurseService.getAlerts();
        if (!ignore) {
          setAlerts(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await nurseService.acknowledgeAlert(id);
      setFeedback({
        type: 'success',
        text: 'Nurse call signal acknowledged. Responding to room.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to acknowledge signal.',
      });
    }
  };

  const handleClear = async (id) => {
    try {
      await nurseService.clearAlert(id);
      setFeedback({
        type: 'success',
        text: 'Call bell reset. Light turned off at bedside.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to clear alert.',
      });
    }
  };

  const handleTriggerCall = (e) => {
    e.preventDefault();
    const alertObj = {
      id: `alt-${Date.now()}`,
      room: newCall.room,
      bed: newCall.bed,
      patientName: newCall.patientName,
      type: newCall.type,
      urgency: newCall.urgency,
      timeElapsed: 'Just now',
      details: newCall.details,
      status: 'Active',
    };
    nurseService.alerts.unshift(alertObj);
    setShowNewCallModal(false);
    setFeedback({
      type: 'success',
      text: `Call light activated for ${newCall.room} (${newCall.bed}).`,
    });
    loadData();
  };

  const activeCount = alerts.filter((a) => a.status === 'Active').length;

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>EMERGENCY CALL BELL CONSOLE</span>
          </div>
          <h1 className="rec-header-title">Nurse Call Signals & Telemetry Alerts</h1>
          <p className="rec-header-subtitle">
            Active patient room call bells, bathroom emergency cords, rapid response notifications, and code signals.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            onClick={() => setShowNewCallModal(true)}
            className="rec-btn rec-btn--danger"
          >
            <AlertTriangle size={15} />
            <span>+ Trigger Room Call</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Active Call Alert Banner (if calls exist) */}
      {activeCount > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #be123c 0%, #991b1b 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 25px -5px rgba(225, 29, 72, 0.3)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Volume2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {activeCount} Active Nurse Call Signal{activeCount > 1 ? 's' : ''} on Floor
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                Immediate staff bedside attendance required per hospital safety policy.
              </div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="rec-btn"
            style={{ background: '#ffffff', color: '#991b1b', fontWeight: 700 }}
          >
            Refresh Status
          </button>
        </div>
      )}

      {/* Alerts Grid / Full-Width Call Bell Console */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
          <span>Monitoring room signals...</span>
        </div>
      ) : alerts.length === 0 ? (
        <div className="nurse-card rec-empty-state">
          <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 0.75rem', display: 'block' }} />
          <div className="rec-empty-state-title">All Room Call Lights Clear</div>
          <p className="rec-empty-state-desc">
            No active nurse call signals or alarms on Ward 3A / 3B at this time.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', width: '100%' }}>
          {alerts.map((alt) => {
            const isCritical = alt.type === 'Code Blue' || alt.urgency === 'Critical' || alt.type === 'Bathroom Emergency Pull';
            const isActive = alt.status === 'Active';

            return (
              <div
                key={alt.id}
                className="nurse-card"
                style={{
                  margin: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: `5px solid ${isCritical ? '#dc2626' : isActive ? '#d97706' : '#0284c7'}`,
                  background: isCritical && isActive ? '#fff1f2' : isActive ? '#fffbfa' : '#ffffff',
                  boxShadow: isCritical && isActive ? '0 8px 25px -4px rgba(225, 29, 72, 0.25)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card Top: Room & Priority */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: isCritical ? '#fee2e2' : '#f0f9ff',
                        color: isCritical ? '#dc2626' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bell size={20} className={isActive ? 'rec-spin' : ''} style={{ animationDuration: '3s' }} />
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                        {alt.room} • {alt.bed}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ward 3A Station</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <span className={`nurse-badge ${isCritical ? 'nurse-badge--stat' : 'nurse-badge--routine'}`}>
                      {alt.type}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: isActive ? '#fee2e2' : '#f0fdf4',
                        color: isActive ? '#dc2626' : '#16a34a',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {alt.status}
                    </span>
                  </div>
                </div>

                {/* Patient Information & Details */}
                <div style={{ marginBottom: '1rem', flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                    Patient: {alt.patientName}
                  </div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                    {alt.details}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      background: '#f8fafc',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b' }}>Waiting Duration:</span>{' '}
                      <strong style={{ color: isActive ? '#dc2626' : '#0f172a' }}>{alt.timeElapsed}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Assigned RN:</span>{' '}
                      <strong style={{ color: '#0284c7' }}>Floor Nurse</strong>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  {isActive ? (
                    <button
                      onClick={() => handleAcknowledge(alt.id)}
                      className="rec-btn rec-btn--primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Check size={14} />
                      <span>Acknowledge Signal</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClear(alt.id)}
                      className="rec-btn rec-btn--success"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Clear Bedside Call Light</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trigger Call Modal */}
      {showNewCallModal && (
        <div className="rec-modal-overlay">
          <div className="rec-modal-card" style={{ maxWidth: '500px' }}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <AlertTriangle size={18} />
                <span>Simulate Room Call Signal</span>
              </h3>
              <button onClick={() => setShowNewCallModal(false)} className="rec-modal-close">✕</button>
            </div>

            <form onSubmit={handleTriggerCall}>
              <div className="rec-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Room Number *</label>
                    <input
                      type="text"
                      required
                      value={newCall.room}
                      onChange={(e) => setNewCall({ ...newCall, room: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Bed *</label>
                    <input
                      type="text"
                      required
                      value={newCall.bed}
                      onChange={(e) => setNewCall({ ...newCall, bed: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={newCall.patientName}
                    onChange={(e) => setNewCall({ ...newCall, patientName: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Call Signal Type *</label>
                  <select
                    value={newCall.type}
                    onChange={(e) => setNewCall({ ...newCall, type: e.target.value })}
                    className="rec-form-select"
                  >
                    <option value="Bedside Call Light">Bedside Call Light</option>
                    <option value="Bathroom Emergency Pull">Bathroom Emergency Pull Cord</option>
                    <option value="Staff Assist">Staff Assist Signal</option>
                    <option value="Rapid Response">Rapid Response Alert</option>
                    <option value="Code Blue">Code Blue (Cardiac Arrest)</option>
                  </select>
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label">Call Details / Reason</label>
                  <input
                    type="text"
                    value={newCall.details}
                    onChange={(e) => setNewCall({ ...newCall, details: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. Patient reporting severe dizziness upon standing..."
                  />
                </div>
              </div>

              <div className="rec-modal-footer">
                <button type="button" onClick={() => setShowNewCallModal(false)} className="rec-btn rec-btn--secondary">
                  Cancel
                </button>
                <button type="submit" className="rec-btn rec-btn--danger">
                  <Bell size={14} />
                  <span>Activate Signal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
