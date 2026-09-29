/**
 * Reception Dashboard Overview Tab
 * 
 * Executive Master Dashboard for Front Desk Receptionists:
 * - Executive Welcome & Command Center Hero Card (live clock, station badge, shift pills)
 * - Action Command Strip (+ Register Patient, + Book Appointment, + Check-In, + OPD Token, Bed Admissions)
 * - 4 High-Contrast Executive KPI Metric Cards (Patients, Appointments, Waiting, Pending Check-Ins)
 * - Today's Consultation Schedule (with initials avatar, status pills, one-click fast Check-in)
 * - Live OPD Queue Dispatch Board (serving highlight, priority badges, room/wait-time chips)
 * - Quick Front Desk Workflow Cards (Search, Register, Check-in, Billing)
 * - Recent Patient Registrations (with initials avatar chips, phone, ID, and quick view)
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Ticket,
  UserPlus,
  LogIn,
  Search,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Bed,
  Stethoscope,
  ChevronRight,
  Activity,
  CreditCard,
  Building,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function ReceptionOverviewTab({
  user,
  onNavigateTab,
  onSelectPatient,
  onOpenBookAppointment,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await receptionService.getDashboard();
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to load reception dashboard:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Unable to connect to hospital services. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await receptionService.getDashboard();
        if (!ignore) {
          setData(res.data || res);
        }
      } catch (err) {
        if (!ignore) {
          setFeedback({
            type: 'error',
            text: err.message || 'Unable to connect to hospital services.',
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

  const handleQuickCheckIn = async (appointmentId) => {
    setCheckingInId(appointmentId);
    setFeedback(null);
    try {
      const res = await receptionService.updateAppointmentStatus(appointmentId, {
        status: 'Checked In',
      });
      setFeedback({
        type: 'success',
        text: `Patient checked in successfully! Token: ${res.data?.queueToken?.tokenNumber || 'Assigned'}`,
      });
      loadDashboardData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to check in patient.',
      });
    } finally {
      setCheckingInId(null);
    }
  };

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

  const kpi = data?.kpi || {
    todayPatients: 0,
    todayAppointments: 0,
    waitingPatients: 0,
    checkedInPatients: 0,
    availableBeds: 0,
  };

  const appointments = data?.todaySchedule || [];
  const recentRegistrations = data?.recentRegistrations || [];
  const liveQueue = data?.liveQueue || [];

  const pendingCheckIns =
    kpi.todayAppointments - kpi.checkedInPatients > 0
      ? kpi.todayAppointments - kpi.checkedInPatients
      : 0;

  return (
    <div className="rec-container">
      {/* ─── 1. EXECUTIVE WELCOME & COMMAND CENTER HERO CARD ─── */}
      <div className="rec-welcome-hero">
        <div className="rec-welcome-top">
          <div className="rec-welcome-title-group">
            <div className="rec-status-badge">
              <span className="rec-status-pulse-dot" />
              <span>RECEPTION COMMAND CENTER • STATION ACTIVE</span>
            </div>
            <h1 className="rec-welcome-greeting">
              {getGreeting()}, {user?.firstName || user?.fullName?.split(' ')[0] || 'Deva'}!
            </h1>
            <p className="rec-welcome-subtext">
              Real-time patient registration, schedule coordination, outpatient queue dispatch, and intake operations.
            </p>
          </div>

          <div className="rec-welcome-clock">
            <div className="rec-clock-time">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
            <div className="rec-clock-date">
              {currentTime.toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Station Metadata Chips & Fast Refresh */}
        <div className="rec-meta-strip">
          <span className="rec-meta-chip">
            <Building size={14} style={{ color: '#0891b2' }} />
            <span>Station: <strong>Desk 01 • Main Entrance Atrium</strong></span>
          </span>
          <span className="rec-meta-chip">
            <Clock size={14} style={{ color: '#0891b2' }} />
            <span>Shift: <strong>Morning (08:00 - 16:00)</strong></span>
          </span>
          <span className="rec-meta-chip">
            <Stethoscope size={14} style={{ color: '#0891b2' }} />
            <span>Doctors on Duty: <strong>12 Active</strong></span>
          </span>
          <span className="rec-meta-chip">
            <Activity size={14} style={{ color: '#10b981' }} />
            <span>Operational Status: <strong style={{ color: '#059669' }}>Online & Synced</strong></span>
          </span>

          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="rec-btn rec-btn--secondary rec-btn--sm"
              title="Refresh dashboard metrics"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <RefreshCw size={13} className={loading ? 'rec-spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Sync Hub'}</span>
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
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1, fontWeight: 500 }}>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 2. ACTION COMMAND STRIP ─────────────────────────── */}
      <div className="rec-actions-strip">
        <span className="rec-actions-strip-label">Quick Actions:</span>
        <button
          className="rec-action-pill rec-action-pill--primary"
          onClick={() => onNavigateTab('register-patient')}
        >
          <UserPlus size={15} />
          <span>+ Register Patient</span>
        </button>
        <button
          className="rec-action-pill rec-action-pill--blue"
          onClick={() => {
            if (onOpenBookAppointment) onOpenBookAppointment();
            else onNavigateTab('appointments');
          }}
        >
          <Calendar size={15} />
          <span>+ Book Appointment</span>
        </button>
        <button
          className="rec-action-pill rec-action-pill--emerald"
          onClick={() => onNavigateTab('check-in-out')}
        >
          <LogIn size={15} />
          <span>+ Check-In Patient</span>
        </button>
        <button
          className="rec-action-pill rec-action-pill--amber"
          onClick={() => onNavigateTab('opd-registration')}
        >
          <Ticket size={15} />
          <span>+ Issue OPD Token</span>
        </button>
        <button
          className="rec-action-pill rec-action-pill--purple"
          onClick={() => onNavigateTab('admission')}
        >
          <Bed size={15} />
          <span>Bed Allocations</span>
        </button>
      </div>

      {/* ─── 3. EXECUTIVE KPI CARDS GRID ─────────────────────── */}
      <div className="rec-kpi-grid">
        {/* Today's Patients */}
        <div className="rec-kpi-card rec-kpi-card--teal">
          <div className="rec-kpi-top">
            <div className="rec-kpi-label">Today&apos;s Patients</div>
            <div className="rec-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0891b2' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="rec-kpi-val">{loading ? '...' : kpi.todayPatients}</div>
          <div className="rec-kpi-footer">
            <span className="rec-kpi-trend" style={{ color: '#0891b2' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0891b2', display: 'inline-block' }} />
              Live registered patients
            </span>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="rec-kpi-card rec-kpi-card--blue">
          <div className="rec-kpi-top">
            <div className="rec-kpi-label">Today&apos;s Consultations</div>
            <div className="rec-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div className="rec-kpi-val" style={{ color: '#0284c7' }}>
            {loading ? '...' : kpi.todayAppointments}
          </div>
          <div className="rec-kpi-footer">
            <span className="rec-kpi-trend" style={{ color: '#0284c7' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
              Scheduled consultations
            </span>
          </div>
        </div>

        {/* Waiting Patients */}
        <div className="rec-kpi-card rec-kpi-card--amber">
          <div className="rec-kpi-top">
            <div className="rec-kpi-label">Waiting in Lobby</div>
            <div className="rec-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="rec-kpi-val" style={{ color: '#d97706' }}>
            {loading ? '...' : kpi.waitingPatients}
          </div>
          <div className="rec-kpi-footer">
            <span className="rec-kpi-trend" style={{ color: '#d97706' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
              In clinic waiting lounge
            </span>
          </div>
        </div>

        {/* Pending Check-Ins */}
        <div className="rec-kpi-card rec-kpi-card--emerald">
          <div className="rec-kpi-top">
            <div className="rec-kpi-label">Pending Check-Ins</div>
            <div className="rec-kpi-icon-wrap" style={{ background: '#ccfbf1', color: '#0d9488' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="rec-kpi-val" style={{ color: '#0d9488' }}>
            {loading ? '...' : pendingCheckIns}
          </div>
          <div className="rec-kpi-footer">
            <span className="rec-kpi-trend" style={{ color: '#0d9488' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488', display: 'inline-block' }} />
              Expected arrivals today
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. TWO COLUMN MAIN COMMAND SECTION ──────────────── */}
      <div className="rec-workspace-grid">
        {/* Left Column: Schedules & Live Queue */}
        <div>
          {/* Today's Appointment Schedule */}
          <div className="rec-card">
            <div className="rec-card-header">
              <h2 className="rec-card-title">
                <Calendar size={18} style={{ color: '#0891b2' }} />
                <span>Today&apos;s Appointment Schedule</span>
                {appointments.length > 0 && (
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
                    {appointments.length} Consultations
                  </span>
                )}
              </h2>
              <button
                onClick={() => onNavigateTab('appointments')}
                className="rec-btn rec-btn--secondary rec-btn--sm"
                style={{ fontSize: '0.78rem' }}
              >
                <span>View All Schedule</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0891b2' }} />
                <span>Loading scheduled consultations...</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="rec-empty-state">
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#f0fdfa',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <Calendar size={26} />
                </div>
                <div className="rec-empty-state-title">No Consultations Scheduled for Today</div>
                <p className="rec-empty-state-desc">
                  Patients with bookings will show up here for fast 1-click reception check-in.
                </p>
                <button
                  onClick={() => {
                    if (onOpenBookAppointment) onOpenBookAppointment();
                    else onNavigateTab('appointments');
                  }}
                  className="rec-btn rec-btn--primary rec-btn--sm"
                >
                  + Book An Appointment
                </button>
              </div>
            ) : (
              <div className="rec-table-wrapper">
                <table className="rec-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Slot Time</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Check-In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 6).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div className="rec-avatar-circle">
                              {getInitials(item.patientName)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.patientName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.patientId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#334155' }}>{item.doctorName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.doctorSpecialization}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontWeight: 500,
                            }}
                          >
                            {item.department}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#0f172a',
                              fontSize: '0.8125rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Clock size={12} style={{ color: '#0891b2' }} />
                            {item.appointmentTime}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`rec-badge rec-badge--${item.status ? item.status.toLowerCase().replace(/\s+/g, '') : 'confirmed'}`}
                          >
                            {item.status || 'Confirmed'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {['Confirmed', 'Pending', 'Waiting'].includes(item.status) ? (
                            <button
                              onClick={() => handleQuickCheckIn(item.id)}
                              disabled={checkingInId === item.id}
                              className="rec-btn rec-btn--primary rec-btn--sm"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                            >
                              {checkingInId === item.id ? (
                                <RefreshCw size={12} className="rec-spin" />
                              ) : (
                                <LogIn size={12} />
                              )}
                              <span>{checkingInId === item.id ? 'Checking In...' : 'Check-In'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onNavigateTab('check-in-out')}
                              className="rec-btn rec-btn--secondary rec-btn--sm"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            >
                              Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live OPD Queue Overview */}
          <div className="rec-card">
            <div className="rec-card-header">
              <h2 className="rec-card-title">
                <Ticket size={18} style={{ color: '#0891b2' }} />
                <span>Live OPD Queue Overview</span>
                <span className="rec-status-pulse-dot" style={{ marginLeft: '0.25rem' }} />
              </h2>
              <button
                onClick={() => onNavigateTab('queue-tokens')}
                className="rec-btn rec-btn--secondary rec-btn--sm"
                style={{ fontSize: '0.78rem' }}
              >
                <span>Manage Live Queue</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="rec-table-wrapper">
              <table className="rec-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Department</th>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Wait Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {liveQueue.slice(0, 5).map((q, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: q.status === 'Serving' ? 'rgba(8, 145, 178, 0.04)' : undefined,
                      }}
                    >
                      <td>
                        <span
                          className={`rec-token-pill ${q.status === 'Serving' ? 'rec-token-pill--serving' : 'rec-token-pill--waiting'}`}
                        >
                          {q.tokenNumber}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{q.department}</td>
                      <td style={{ color: '#334155' }}>{q.doctorName}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{q.patientName}</div>
                        <div style={{ fontSize: '0.72rem', color: q.priority === 'Urgent' ? '#ef4444' : '#64748b' }}>
                          {q.priority} priority
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            color: '#64748b',
                            background: '#f8fafc',
                            border: '1px solid var(--border-color)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                          }}
                        >
                          <Clock size={11} />
                          {q.waitTime}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`rec-badge rec-badge--${q.status ? q.status.toLowerCase() : 'waiting'}`}
                        >
                          {q.status === 'Serving' && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: 'var(--bg-card)',
                                display: 'inline-block',
                              }}
                            />
                          )}
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Operations & Recent Registrations */}
        <div>
          {/* Quick Front Desk Operations Box */}
          <div className="rec-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="rec-card-header">
              <h3 className="rec-card-title" style={{ fontSize: '0.98rem' }}>
                <Activity size={16} style={{ color: '#0891b2' }} />
                <span>Front Desk Operations</span>
              </h3>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
              Rapid front-desk workflows for immediate walk-in assistance, queuing, and inquiries.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                className="rec-op-card"
                onClick={() => onNavigateTab('search-patient')}
              >
                <div className="rec-op-icon" style={{ background: '#f0fdfa', color: '#0891b2' }}>
                  <Search size={18} />
                </div>
                <div className="rec-op-text">
                  <div className="rec-op-title">Search Patient Registry</div>
                  <div className="rec-op-desc">Find by UHID, Mobile, or Name</div>
                </div>
                <ChevronRight size={16} className="rec-op-arrow" />
              </div>

              <div
                className="rec-op-card"
                onClick={() => onNavigateTab('register-patient')}
              >
                <div className="rec-op-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <UserPlus size={18} />
                </div>
                <div className="rec-op-text">
                  <div className="rec-op-title">Register Walk-In Patient</div>
                  <div className="rec-op-desc">Fast 1-page intake and card issue</div>
                </div>
                <ChevronRight size={16} className="rec-op-arrow" />
              </div>

              <div
                className="rec-op-card"
                onClick={() => onNavigateTab('check-in-out')}
              >
                <div className="rec-op-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
                  <LogIn size={18} />
                </div>
                <div className="rec-op-text">
                  <div className="rec-op-title">Check-In & Issue Token</div>
                  <div className="rec-op-desc">Scan appointment & issue token</div>
                </div>
                <ChevronRight size={16} className="rec-op-arrow" />
              </div>

              <div
                className="rec-op-card"
                onClick={() => onNavigateTab('billing-coord')}
              >
                <div className="rec-op-icon" style={{ background: '#faf5ff', color: '#7c3aed' }}>
                  <CreditCard size={18} />
                </div>
                <div className="rec-op-text">
                  <div className="rec-op-title">Billing & Payment Desk</div>
                  <div className="rec-op-desc">Collect fees, print receipts & bills</div>
                </div>
                <ChevronRight size={16} className="rec-op-arrow" />
              </div>
            </div>
          </div>

          {/* Recent Registrations Card */}
          <div className="rec-card">
            <div className="rec-card-header">
              <h3 className="rec-card-title" style={{ fontSize: '0.98rem' }}>
                <Users size={16} style={{ color: '#0891b2' }} />
                <span>Recent Registrations</span>
              </h3>
              <button
                onClick={() => onNavigateTab('patients')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0891b2',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View All
              </button>
            </div>

            {recentRegistrations.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '1rem 0' }}>
                No recent registrations today.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentRegistrations.map((p) => (
                  <div key={p.id} className="rec-patient-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div className="rec-avatar-circle">
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {p.patientId} • {p.phone}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onSelectPatient ? onSelectPatient(p.id) : onNavigateTab('patients')
                      }
                      className="rec-btn rec-btn--secondary rec-btn--sm"
                      title="View patient profile"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
