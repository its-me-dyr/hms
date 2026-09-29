/**
 * Nurse Dashboard Overview Tab
 * 
 * Clinical Command Center for Registered Nurses & Nursing Care Stations:
 * - Executive Welcome & Station Hero Card (live clock, shift indicator, station metadata)
 * - Rapid Clinical Action Strip (Vitals, Meds, Notes, Tasks, Handover, Alerts)
 * - 4 High-Contrast Executive KPI Metric Cards
 * - Active Ward Inpatients At-A-Glance Table
 * - Next Scheduled Due Medications with 1-click Administer
 * - Emergency Nurse Call Bell Monitor
 * - Attending Physician Orders Feed
 * - Shift Care Tasks Checklist
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Pill,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ClipboardList,
  Stethoscope,
  Heart,
  Bell,
  Check,
  Building,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseOverviewTab({
  user,
  onNavigateTab,
  onOpenRecordVitals,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [administeringId, setAdministeringId] = useState(null);
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time digital clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await nurseService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load nurse station data:', err);
      setFeedback({
        type: 'error',
        text: 'Unable to load nursing station data. Please refresh.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await nurseService.getDashboard();
        if (!ignore) {
          setData(res);
        }
      } catch {
        if (!ignore) {
          setFeedback({
            type: 'error',
            text: 'Unable to load nursing station data. Please refresh.',
          });
        }
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

  const handleAdministerMed = async (medId) => {
    setAdministeringId(medId);
    try {
      await nurseService.administerMedication(medId);
      setFeedback({
        type: 'success',
        text: 'Medication dose marked as Administered in eMAR record.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to administer medication.',
      });
    } finally {
      setAdministeringId(null);
    }
  };

  const handleAcknowledgeInstruction = async (instId) => {
    setAcknowledgingId(instId);
    try {
      await nurseService.acknowledgeInstruction(instId);
      setFeedback({
        type: 'success',
        text: 'Physician instruction acknowledged.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to acknowledge instruction.',
      });
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await nurseService.toggleCareTask(taskId);
      loadData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const kpi = data?.kpi || {
    wardInpatients: 5,
    bedOccupancyRate: '83%',
    dueMedications: 5,
    pendingVitals: 3,
    activeAlerts: 1,
    completedTasks: 1,
    totalTasks: 6,
  };

  const inpatients = data?.inpatients || [];
  const dueMeds = data?.dueMedications || [];
  const activeAlerts = data?.activeAlerts || [];
  const instructions = data?.doctorInstructions || [];
  const shiftTasks = data?.shiftTasks || [];

  const getInitials = (name) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="nurse-container">
      {/* ─── 1. EXECUTIVE NURSING WELCOME & STATION HERO CARD ─── */}
      <div className="nurse-welcome-hero">
        <div className="nurse-welcome-top">
          <div className="nurse-welcome-title-group">
            <div className="nurse-status-badge">
              <span className="nurse-status-pulse-dot" />
              <span>NURSING STATION • WARD 3A ACTIVE CARE</span>
            </div>
            <h1 className="nurse-welcome-greeting">
              {getGreeting()}, Nurse {user?.firstName || user?.fullName?.split(' ')[0] || 'Deva'}!
            </h1>
            <p className="nurse-welcome-subtext">
              Inpatient clinical rounds, scheduled medications, continuous vital monitoring, and physician order execution.
            </p>
          </div>

          <div className="nurse-welcome-clock">
            <div className="nurse-clock-time">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
            <div className="nurse-clock-date">
              {currentTime.toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Station Metadata Strip */}
        <div className="nurse-meta-strip">
          <span className="nurse-meta-chip">
            <Building size={14} style={{ color: '#0284c7' }} />
            <span>Station: <strong>Ward 3A • Medical Floor 3</strong></span>
          </span>
          <span className="nurse-meta-chip">
            <Clock size={14} style={{ color: '#0284c7' }} />
            <span>Shift: <strong>Morning Shift (07:00 - 15:00)</strong></span>
          </span>
          <span className="nurse-meta-chip">
            <Stethoscope size={14} style={{ color: '#0284c7' }} />
            <span>Charge Nurse: <strong>Deva Chitturi, BSN, RN</strong></span>
          </span>
          <span className="nurse-meta-chip">
            <Heart size={14} style={{ color: '#e11d48' }} />
            <span>Telemetry: <strong style={{ color: '#059669' }}>Continuous Sync</strong></span>
          </span>

          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={loadData}
              disabled={loading}
              className="rec-btn rec-btn--secondary rec-btn--sm"
              title="Refresh nursing station feed"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={loading ? 'rec-spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Sync Station'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1, fontWeight: 500 }}>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 2. CLINICAL ACTION COMMAND STRIP ─────────────────── */}
      <div className="nurse-actions-strip">
        <span className="nurse-actions-strip-label">Clinical Quick Actions:</span>
        <button
          className="nurse-action-pill nurse-action-pill--primary"
          onClick={() => {
            if (onOpenRecordVitals) onOpenRecordVitals();
            else onNavigateTab('vitals');
          }}
        >
          <Activity size={15} />
          <span>+ Record Vitals</span>
        </button>
        <button
          className="nurse-action-pill nurse-action-pill--emerald"
          onClick={() => onNavigateTab('medications')}
        >
          <Pill size={15} />
          <span>+ Administer Meds</span>
        </button>
        <button
          className="nurse-action-pill nurse-action-pill--teal"
          onClick={() => onNavigateTab('notes')}
        >
          <ClipboardList size={15} />
          <span>+ Add Nursing Note</span>
        </button>
        <button
          className="nurse-action-pill nurse-action-pill--amber"
          onClick={() => onNavigateTab('tasks')}
        >
          <CheckCircle2 size={15} />
          <span>Care Checklist</span>
        </button>
        <button
          className="nurse-action-pill nurse-action-pill--rose"
          onClick={() => onNavigateTab('alerts')}
        >
          <Bell size={15} />
          <span>Call Bell Monitor</span>
        </button>
      </div>

      {/* ─── 3. EXECUTIVE KPI METRIC CARDS ───────────────────── */}
      <div className="nurse-kpi-grid">
        {/* 1. Assigned Patients */}
        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Assigned Patients</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#0284c7' }}>{kpi.wardInpatients}</div>
          <div className="nurse-kpi-footer">
            <span className="nurse-kpi-trend" style={{ color: '#0284c7' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
              Bed Occupancy: <strong>{kpi.bedOccupancyRate}</strong>
            </span>
          </div>
        </div>

        {/* 2. Pending Vitals */}
        <div className="nurse-kpi-card nurse-kpi-card--amber">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Pending Vitals</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Activity size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#d97706' }}>{kpi.pendingVitals}</div>
          <div className="nurse-kpi-footer">
            <span className="nurse-kpi-trend" style={{ color: '#d97706' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
              Patients due for Q4H round
            </span>
          </div>
        </div>

        {/* 3. Due Medications */}
        <div className="nurse-kpi-card nurse-kpi-card--emerald">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Due Medications</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Pill size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#16a34a' }}>{kpi.dueMedications}</div>
          <div className="nurse-kpi-footer">
            <span className="nurse-kpi-trend" style={{ color: '#16a34a' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              Doses pending morning round
            </span>
          </div>
        </div>

        {/* 4. Active Alerts */}
        <div className="nurse-kpi-card nurse-kpi-card--rose">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Active Alerts</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#e11d48' }}>{kpi.activeAlerts}</div>
          <div className="nurse-kpi-footer">
            <span className="nurse-kpi-trend" style={{ color: '#e11d48' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e11d48', display: 'inline-block' }} />
              Active room call signal
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. MAIN COMMAND CENTER (2-COLUMN BALANCED GRID) ──── */}
      <div className="nurse-command-grid">
        {/* Left Column (2fr): Assigned Inpatients Under Care */}
        <div>
          <div className="nurse-card" style={{ height: '100%', marginBottom: 0 }}>
            <div className="nurse-card-header">
              <h2 className="nurse-card-title">
                <Users size={18} style={{ color: '#0284c7' }} />
                <span>Assigned Inpatients Under Care</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                  }}
                >
                  {inpatients.length} Assigned
                </span>
              </h2>
              <button
                onClick={() => onNavigateTab('patients')}
                className="rec-btn rec-btn--secondary rec-btn--sm"
                style={{ fontSize: '0.78rem' }}
              >
                <span>View Full Directory</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="nurse-table-wrap">
              <table className="nurse-table">
                <thead>
                  <tr>
                    <th>Bed / Room</th>
                    <th>Patient Name</th>
                    <th>Primary Diagnosis</th>
                    <th>Acuity</th>
                    <th>Last Vitals</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inpatients.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          {item.bed}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.room}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div className="rec-avatar-circle" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {item.patientId} • {item.age}y {item.gender[0]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500, maxWidth: '200px' }}>
                          {item.diagnosis}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.attendingDoctor}</div>
                      </td>
                      <td>
                        <span className={`nurse-badge nurse-badge--${item.acuity.toLowerCase().replace(/[^a-z]/g, '')}`}>
                          {item.acuity}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: item.lastVitals.status === 'warning' ? '#d97706' : '#0f172a' }}>
                          BP {item.lastVitals.bp}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          HR {item.lastVitals.hr} • SpO2 {item.lastVitals.spo2}%
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => onNavigateTab('vitals')}
                            className="rec-btn rec-btn--primary rec-btn--sm"
                            title="Record Vitals"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                          >
                            <Activity size={12} />
                            <span>Vitals</span>
                          </button>
                          <button
                            onClick={() => onNavigateTab('notes')}
                            className="rec-btn rec-btn--secondary rec-btn--sm"
                            title="Add Note"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                          >
                            <ClipboardList size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1fr): Active Call Bells & STAT Physician Orders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Call Bells Monitor */}
          <div className="nurse-card" style={{ borderColor: '#fca5a5', margin: 0 }}>
            <div className="nurse-card-header">
              <h3 className="nurse-card-title" style={{ color: '#be123c', fontSize: '0.95rem' }}>
                <Bell size={16} style={{ color: '#e11d48' }} />
                <span>Active Call Bells</span>
                <span className="nurse-status-pulse-dot" style={{ background: '#ef4444' }} />
              </h3>
              <button
                onClick={() => onNavigateTab('alerts')}
                style={{ background: 'none', border: 'none', color: '#be123c', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Monitor
              </button>
            </div>

            {activeAlerts.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', margin: '1rem 0' }}>
                No active call signals on floor.
              </p>
            ) : (
              activeAlerts.map((alt) => (
                <div key={alt.id} className="nurse-call-bell">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem' }}>
                        {alt.room} • {alt.bed}
                      </span>
                      <span className="nurse-badge nurse-badge--stat">{alt.type}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                      {alt.patientName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {alt.details}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 700, marginTop: '0.35rem' }}>
                      Signal active: {alt.timeElapsed}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('alerts')}
                    className="rec-btn rec-btn--danger rec-btn--sm"
                    style={{ fontSize: '0.72rem' }}
                  >
                    Respond
                  </button>
                </div>
              ))
            )}
          </div>

          {/* STAT & Routine Physician Orders Feed */}
          <div className="nurse-card" style={{ margin: 0 }}>
            <div className="nurse-card-header">
              <h3 className="nurse-card-title" style={{ fontSize: '0.95rem' }}>
                <Stethoscope size={16} style={{ color: '#0284c7' }} />
                <span>STAT Physician Orders</span>
              </h3>
              <button
                onClick={() => onNavigateTab('instructions')}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {instructions.slice(0, 3).map((inst) => (
                <div
                  key={inst.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: inst.status === 'Active' ? '#fff1f2' : '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                      {inst.patientName} ({inst.roomBed})
                    </span>
                    <span className={`nurse-badge nurse-badge--${inst.priority === 'STAT' ? 'stat' : 'routine'}`}>
                      {inst.priority}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: '#334155', lineHeight: 1.4 }}>
                    {inst.instruction}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>{inst.doctor} • {inst.timeOrdered}</span>
                    {inst.status === 'Active' ? (
                      <button
                        onClick={() => handleAcknowledgeInstruction(inst.id)}
                        disabled={acknowledgingId === inst.id}
                        className="rec-btn rec-btn--primary rec-btn--sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        {acknowledgingId === inst.id ? 'Saving...' : 'Acknowledge'}
                      </button>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 600 }}>✓ Acknowledged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. LOWER SECTIONS: SCHEDULED DUE MEDICATIONS (FULL WIDTH) ─── */}
      <div className="nurse-card" style={{ marginTop: '1.5rem' }}>
        <div className="nurse-card-header">
          <h2 className="nurse-card-title">
            <Pill size={18} style={{ color: '#10b981' }} />
            <span>Scheduled Due Medications (eMAR Administration Schedule)</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#f0fdf4',
                color: '#15803d',
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
              }}
            >
              {dueMeds.length} Doses Due
            </span>
          </h2>
          <button
            onClick={() => onNavigateTab('medications')}
            className="rec-btn rec-btn--secondary rec-btn--sm"
            style={{ fontSize: '0.78rem' }}
          >
            <span>Full eMAR Console</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="nurse-table-wrap">
          <table className="nurse-table">
            <thead>
              <tr>
                <th>Scheduled</th>
                <th>Bed</th>
                <th>Patient</th>
                <th>Medication / Dose</th>
                <th>Route</th>
                <th>Prescriber</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {dueMeds.map((med) => (
                <tr key={med.id}>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <Clock size={12} style={{ color: '#d97706' }} />
                      {med.dueTime}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{med.roomBed}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{med.patientName}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{med.drugName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{med.dosage} • {med.frequency}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        background: '#f1f5f9',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        color: '#475569',
                        fontWeight: 600,
                      }}
                    >
                      {med.route}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {med.prescribedBy || 'Attending Physician'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleAdministerMed(med.id)}
                      disabled={administeringId === med.id}
                      className="rec-btn rec-btn--success rec-btn--sm"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                    >
                      {administeringId === med.id ? (
                        <RefreshCw size={12} className="rec-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      <span>{administeringId === med.id ? 'Saving...' : 'Administer'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 6. LOWER SECTIONS: SHIFT CARE TASKS (FULL WIDTH) ───── */}
      <div className="nurse-card">
        <div className="nurse-card-header">
          <h3 className="nurse-card-title">
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <span>Shift Care Tasks Checklist</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#f1f5f9',
                color: '#475569',
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
              }}
            >
              {kpi.completedTasks}/{kpi.totalTasks} Completed
            </span>
          </h3>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="rec-btn rec-btn--secondary rec-btn--sm"
            style={{ fontSize: '0.78rem' }}
          >
            <span>Manage All Tasks</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {shiftTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => handleToggleTask(t.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: t.completed ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => {}} // handled by parent div click
                style={{ marginTop: '0.2rem', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: t.completed ? '#94a3b8' : '#0f172a',
                    textDecoration: t.completed ? 'line-through' : 'none',
                  }}
                >
                  {t.task}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {t.patientName} • <span style={{ color: '#d97706', fontWeight: 600 }}>Due {t.dueTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
