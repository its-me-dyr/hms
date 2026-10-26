/**
 * Doctor Clinical Workspace — Dashboard
 * 
 * Clinical workstation for attending physicians & specialists.
 * Provides real-time clinical summary, today's appointment queue,
 * pending investigation reviews & clinical tasks, recent patient activity,
 * and compact consultation trends.
 * 
 * Strictly uses real backend data from /api/v1/doctor endpoints with zero mock data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { doctorService } from '../../services/doctor.service';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Microscope,
  FileText,
  Activity,
  User,
  Search,

  Eye,
  X,
  History,
  Pill,
} from 'lucide-react';
import DoctorAppointmentsTab from './doctor/DoctorAppointmentsTab';
import DoctorQueueTab from './doctor/DoctorQueueTab';
import DoctorPatientsTab from './doctor/DoctorPatientsTab';
import DoctorPatientRecordsTab from './doctor/DoctorPatientRecordsTab';
import DoctorConsultationsTab from './doctor/DoctorConsultationsTab';
import DoctorPrescriptionsTab from './doctor/DoctorPrescriptionsTab';
import './DoctorDashboard.css';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Dashboard Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  // Queue Filters & Search State
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'waiting' | 'in-progress' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientRecordData, setPatientRecordData] = useState(null);
  const [loadingPatientRecord, setLoadingPatientRecord] = useState(false);

  const [activeConsultationApt, setActiveConsultationApt] = useState(null);
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    symptoms: '',
    clinicalNotes: '',
    treatment: '',
    bp: '120/80 mmHg',
    heartRate: '72 bpm',
    temperature: '98.6 °F',
    spo2: '99%',
    weight: '70 kg',
    followUpDate: '',
  });
  const [savingConsultation, setSavingConsultation] = useState(false);

  // Tab navigation handler
  const handleTabChange = (tabId, params = {}) => {
    setSearchParams({ tab: tabId, ...params });
  };

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await doctorService.getDashboard();
      setData(res.data?.data || res.data || {});
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load clinical workspace. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Open Patient Record Modal
  const handleOpenPatientRecord = async (patientMongoId) => {
    if (!patientMongoId) return;
    setSelectedPatientId(patientMongoId);
    setLoadingPatientRecord(true);
    try {
      const res = await doctorService.getPatientDetails(patientMongoId);
      setPatientRecordData(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load patient record:', err);
    } finally {
      setLoadingPatientRecord(false);
    }
  };

  // Close Patient Record Modal
  const handleClosePatientRecord = () => {
    setSelectedPatientId(null);
    setPatientRecordData(null);
  };

  // Start Consultation
  const handleStartConsultation = async (apt) => {
    try {
      if (apt.status !== 'In-Progress') {
        await doctorService.updateAppointmentStatus(apt.id, { status: 'In-Progress' });
      }
      handleTabChange('consultations', {
        appointmentId: apt.id,
        patientId: apt.patientMongoId || apt.patient?._id || apt.patient,
      });
    } catch (err) {
      console.error('Failed to start consultation:', err);
    }
  };

  // Submit Consultation Record
  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!consultationForm.diagnosis.trim()) {
      alert('Please enter a clinical diagnosis.');
      return;
    }

    setSavingConsultation(true);
    try {
      const payload = {
        patientId: activeConsultationApt.patientMongoId,
        appointmentId: activeConsultationApt.id,
        diagnosis: consultationForm.diagnosis.trim(),
        symptoms: consultationForm.symptoms
          ? consultationForm.symptoms.split(',').map((s) => s.trim())
          : [],
        clinicalNotes: consultationForm.clinicalNotes.trim(),
        treatment: consultationForm.treatment.trim(),
        vitals: {
          bp: consultationForm.bp,
          heartRate: consultationForm.heartRate,
          temperature: consultationForm.temperature,
          spo2: consultationForm.spo2,
          weight: consultationForm.weight,
        },
        followUpDate: consultationForm.followUpDate || null,
      };

      await doctorService.createConsultation(payload);
      setActiveConsultationApt(null);
      loadDashboard();
    } catch (err) {
      console.error('Failed to save consultation:', err);
      alert(err.response?.data?.message || 'Failed to save consultation documentation.');
    } finally {
      setSavingConsultation(false);
    }
  };

  // Filtered Queue Calculation
  const filteredQueue = useMemo(() => {
    const queue = data?.todayQueue || [];
    return queue.filter((item) => {
      // Status Filter
      if (queueFilter === 'waiting') {
        if (!['Waiting', 'Checked In', 'Confirmed', 'Pending'].includes(item.status)) return false;
      } else if (queueFilter === 'in-progress') {
        if (!['In-Progress', 'Consulting'].includes(item.status)) return false;
      } else if (queueFilter === 'completed') {
        if (item.status !== 'Completed') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.patientName || '').toLowerCase().includes(q);
        const matchesId = (item.patientId || '').toLowerCase().includes(q);
        const matchesReason = (item.reason || '').toLowerCase().includes(q);
        const matchesToken = (item.tokenNumber || '').toLowerCase().includes(q);
        return matchesName || matchesId || matchesReason || matchesToken;
      }

      return true;
    });
  }, [data?.todayQueue, queueFilter, searchQuery]);

  // Max value for consultation trend chart scaling
  const maxTrend = useMemo(() => {
    const trends = data?.consultationTrends || [];
    return Math.max(...trends.map((t) => t.completed), 1);
  }, [data?.consultationTrends]);



  return (
    <div className="doctor-workspace">


      {/* ── ERROR ALERT BANNER ── */}
      {error && (
        <div className="alert alert--danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => loadDashboard()} className="btn btn--outline btn--sm" style={{ background: '#ffffff', color: '#dc2626' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── LOADING SKELETON ── */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Loading doctor clinical records and real-time appointment queue...
          </p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <>
          {/* ── SECTION B: TODAY'S CLINICAL SUMMARY KPI CARDS ── */}
          <section className="doc-kpi-grid" aria-label="Clinical Summary Metrics">
            {/* 1. Today's Appointments */}
            <div
              className="doc-kpi-card"
              onClick={() => handleTabChange('appointments')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Today's Appointments</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2' }}>
                  <Calendar size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value">{data?.kpi?.todayAppointments ?? 0}</div>
              <p className="doc-kpi-card__subtext">Scheduled outpatient appointments</p>
            </div>

            {/* 2. Waiting Patients */}
            <div
              className="doc-kpi-card"
              onClick={() => {
                setQueueFilter('waiting');
                handleTabChange('queue');
              }}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Waiting Patients</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#d97706' }}>
                {data?.kpi?.waitingPatients ?? 0}
              </div>
              <p className="doc-kpi-card__subtext">In queue for consultation</p>
            </div>

            {/* 3. In-Progress Consultations */}
            <div
              className="doc-kpi-card"
              onClick={() => {
                setQueueFilter('in-progress');
                handleTabChange('queue');
              }}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">In-Progress Consultations</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
                  <Stethoscope size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#2563eb' }}>
                {data?.kpi?.inProgressConsultations ?? 0}
              </div>
              <p className="doc-kpi-card__subtext">Currently active clinical visits</p>
            </div>

            {/* 4. Completed Consultations */}
            <div
              className="doc-kpi-card"
              onClick={() => handleTabChange('consultations')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Completed Consultations</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#059669' }}>
                {data?.kpi?.completedConsultations ?? 0}
              </div>
              <p className="doc-kpi-card__subtext">Finished consultations today</p>
            </div>

            {/* 5. Pending Investigation Reviews / Tasks */}
            <div
              className="doc-kpi-card"
              onClick={() => handleTabChange('investigations')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Pending Reviews</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                  <Microscope size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#6366f1' }}>
                {data?.kpi?.pendingTasks ?? 0}
              </div>
              <p className="doc-kpi-card__subtext">Lab reports & follow-ups</p>
            </div>
          </section>

          {/* ── TWO-COLUMN CLINICAL LAYOUT ── */}
          <div className="doc-main-grid">
            {/* ── LEFT COLUMN: SECTION C. TODAY'S APPOINTMENT QUEUE (PRIMARY SECTION) ── */}
            <div className="doc-panel" aria-label="Today's Appointment Queue">
              <div className="doc-panel__header">
                <div className="doc-panel__title-box">
                  <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                  <h2 className="doc-panel__title">Today's Appointment Queue</h2>
                  <span className="doc-panel__counter">
                    {filteredQueue.length} {filteredQueue.length === 1 ? 'Patient' : 'Patients'}
                  </span>
                </div>
                <div className="doc-panel__actions">
                  <button
                    type="button"
                    onClick={() => handleTabChange('appointments')}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    View All Appointments
                  </button>
                </div>
              </div>

              {/* QUEUE FILTER TOOLBAR */}
              <div className="doc-queue-toolbar">
                <div className="doc-filter-pills">
                  <button
                    type="button"
                    onClick={() => setQueueFilter('all')}
                    className={`doc-filter-pill ${queueFilter === 'all' ? 'active' : ''}`}
                  >
                    All ({data?.todayQueue?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('waiting')}
                    className={`doc-filter-pill ${queueFilter === 'waiting' ? 'active' : ''}`}
                  >
                    Waiting & Checked In ({data?.kpi?.waitingPatients || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('in-progress')}
                    className={`doc-filter-pill ${queueFilter === 'in-progress' ? 'active' : ''}`}
                  >
                    In-Progress ({data?.kpi?.inProgressConsultations || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueFilter('completed')}
                    className={`doc-filter-pill ${queueFilter === 'completed' ? 'active' : ''}`}
                  >
                    Completed ({data?.kpi?.completedConsultations || 0})
                  </button>
                </div>

                <div className="doc-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search patient, ID, token..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* QUEUE TABLE */}
              <div className="doc-table-container">
                {filteredQueue.length > 0 ? (
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: '65px' }}>Token</th>
                        <th>Patient</th>
                        <th style={{ width: '90px' }}>Time</th>
                        <th>Reason for Visit</th>
                        <th style={{ width: '80px' }}>Priority</th>
                        <th style={{ width: '100px' }}>Status</th>
                        <th style={{ textAlign: 'right', minWidth: '160px' }}>Clinical Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueue.map((apt) => {
                        const isInProgress = apt.status === 'In-Progress';
                        const isCompleted = apt.status === 'Completed';

                        return (
                          <tr key={apt.id} className={isInProgress ? 'in-progress' : ''}>
                            <td>
                              <span className="doc-token-badge">{apt.tokenNumber}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {apt.patientName}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <span>{apt.patientId}</span>
                                <span>•</span>
                                <span>{apt.patientGender}</span>
                                <span>•</span>
                                <span>{apt.patientAge}</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>{apt.appointmentTime}</td>
                            <td>
                              <span style={{ color: 'var(--text-secondary)' }}>{apt.reason}</span>
                            </td>
                            <td>
                              <span
                                className={`doc-priority-badge ${
                                  apt.priority === 'Urgent' ? 'urgent' : 'normal'
                                }`}
                              >
                                {apt.priority}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`doc-status-badge ${
                                  apt.status === 'In-Progress'
                                    ? 'in-progress'
                                    : apt.status === 'Waiting'
                                    ? 'waiting'
                                    : apt.status === 'Checked In'
                                    ? 'checked-in'
                                    : apt.status === 'Completed'
                                    ? 'completed'
                                    : 'confirmed'
                                }`}
                              >
                                {apt.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartConsultation(apt)}
                                    className={`btn btn--sm ${isInProgress ? 'btn--primary' : 'btn--outline'}`}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.25rem 0.55rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <Stethoscope size={13} />
                                    <span>{isInProgress ? 'Continue' : 'Start'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenPatientRecord(apt.patientMongoId)}
                                  className="btn btn--outline btn--sm"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.45rem',
                                    color: 'var(--text-secondary)',
                                  }}
                                  title="Open patient medical record"
                                >
                                  <Eye size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="doc-empty-state">
                    <Clock size={36} />
                    <h4>No Appointments in Today's Queue</h4>
                    <p>
                      {searchQuery
                        ? 'No patients matched your search filter.'
                        : 'No outpatient visits currently scheduled for today.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: PENDING TASKS & RECENT ACTIVITY ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* ── SECTION D: PENDING CLINICAL TASKS ── */}
              <div className="doc-panel" aria-label="Pending Clinical Tasks">
                <div className="doc-panel__header">
                  <div className="doc-panel__title-box">
                    <AlertCircle size={17} style={{ color: '#6366f1' }} />
                    <h2 className="doc-panel__title">Pending Clinical Tasks</h2>
                    <span className="doc-panel__counter" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                      {data?.pendingTasks?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="doc-task-list">
                  {data?.pendingTasks && data.pendingTasks.length > 0 ? (
                    data.pendingTasks.map((task) => (
                      <div key={task.id} className="doc-task-item">
                        <div className="doc-task-item__left">
                          <div className="doc-task-item__icon">
                            {task.type === 'lab_review' ? (
                              <Microscope size={16} />
                            ) : task.type === 'radiology_review' ? (
                              <FileText size={16} />
                            ) : (
                              <History size={16} />
                            )}
                          </div>
                          <div className="doc-task-item__content">
                            <span className="doc-task-item__title">{task.title}</span>
                            <span className="doc-task-item__meta">
                              <strong>{task.patientName}</strong> ({task.patientId}) • {task.description}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPatientRecord(task.patientMongoId)}
                          className="btn btn--outline btn--sm"
                          style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', whiteSpace: 'nowrap' }}
                        >
                          Review
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="doc-empty-state" style={{ padding: '1.75rem 1rem' }}>
                      <CheckCircle2 size={30} style={{ color: '#059669' }} />
                      <h4 style={{ fontSize: '0.875rem' }}>All Clinical Tasks Up to Date</h4>
                      <p style={{ fontSize: '0.75rem' }}>No pending investigation reviews or overdue follow-ups.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION E: RECENT PATIENT ACTIVITY ── */}
              <div className="doc-panel" aria-label="Recent Patient Activity">
                <div className="doc-panel__header">
                  <div className="doc-panel__title-box">
                    <History size={17} style={{ color: '#0891b2' }} />
                    <h2 className="doc-panel__title">Recent Patient Activity</h2>
                  </div>
                </div>

                <div className="doc-activity-list">
                  {data?.recentActivity && data.recentActivity.length > 0 ? (
                    data.recentActivity.map((act) => (
                      <div key={act.id} className="doc-activity-item">
                        <div className="doc-activity-item__details">
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              background:
                                act.type === 'consultation'
                                  ? 'rgba(5, 150, 105, 0.1)'
                                  : 'rgba(217, 119, 6, 0.1)',
                              color: act.type === 'consultation' ? '#059669' : '#d97706',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {act.type === 'consultation' ? <Stethoscope size={15} /> : <Pill size={15} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {act.title}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                              <strong>{act.patientName}</strong> ({act.patientId}) • {act.summary}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPatientRecord(act.patientMongoId)}
                          className="btn btn--outline btn--sm"
                          style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                        >
                          View
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="doc-empty-state" style={{ padding: '1.75rem 1rem' }}>
                      <Activity size={30} />
                      <h4 style={{ fontSize: '0.875rem' }}>No Recent Clinical Activity</h4>
                      <p style={{ fontSize: '0.75rem' }}>Clinical records will appear here as consultations are completed.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION F: COMPACT CONSULTATION OVERVIEW ── */}
              {data?.consultationTrends && (
                <div className="doc-panel" aria-label="Weekly Consultation Overview">
                  <div className="doc-panel__header">
                    <div className="doc-panel__title-box">
                      <Activity size={17} style={{ color: 'var(--color-primary)' }} />
                      <h2 className="doc-panel__title">Consultation Trend (Last 7 Days)</h2>
                    </div>
                  </div>

                  <div className="doc-trends-box">
                    {data.consultationTrends.map((t, idx) => {
                      const pct = Math.max(8, Math.round((t.completed / maxTrend) * 100));
                      const isToday = idx === data.consultationTrends.length - 1;

                      return (
                        <div key={t.date} className="doc-trend-col">
                          <span className="doc-trend-count">{t.completed}</span>
                          <div className="doc-trend-bar-wrapper">
                            <div
                              className="doc-trend-bar"
                              style={{
                                height: `${pct}%`,
                                background: isToday
                                  ? 'linear-gradient(180deg, #059669 0%, #10b981 100%)'
                                  : undefined,
                              }}
                            />
                          </div>
                          <span
                            className="doc-trend-label"
                            style={{ fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--color-primary)' : undefined }}
                          >
                            {t.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'appointments' ? (
        <DoctorAppointmentsTab
          onOpenPatientRecord={handleOpenPatientRecord}
          onStartConsultation={handleStartConsultation}
        />
      ) : activeTab === 'queue' ? (
        <DoctorQueueTab
          onOpenPatientRecord={handleOpenPatientRecord}
          onStartConsultation={handleStartConsultation}
        />
      ) : activeTab === 'my-patients' || activeTab === 'patients' ? (
        <DoctorPatientsTab
          onOpenPatientRecord={handleOpenPatientRecord}
          onNavigateTab={handleTabChange}
        />
      ) : activeTab === 'records' || activeTab === 'patient-records' ? (
        <DoctorPatientRecordsTab
          onNavigateTab={handleTabChange}
        />
      ) : activeTab === 'consultations' ? (
        <DoctorConsultationsTab
          onNavigateTab={handleTabChange}
          onOpenPatientRecord={handleOpenPatientRecord}
        />
      ) : activeTab === 'prescriptions' ? (
        <DoctorPrescriptionsTab
          onNavigateTab={handleTabChange}
          onOpenPatientRecord={handleOpenPatientRecord}
        />
      ) : activeTab === 'profile' ? (
        /* ── CLINICAL PROFILE — rendered without custom header/nav ── */
        <div className="doc-panel" style={{ padding: '1.5rem' }}>
          <div style={{ maxWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.name || user?.fullName || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.email || user?.email || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.department || user?.department || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.specialization || user?.specialization || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Medical License Number</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.licenseNumber || user?.licenseNumber || 'Verified by Super Admin'} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input type="text" readOnly className="form-input" value={data?.doctor?.phone || user?.phone || '\u2014'} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── SUB-TAB FALLBACK VIEWS (REUSING REAL DATA) ── */
        <div className="doc-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 className="doc-panel__title" style={{ fontSize: '1.1rem' }}>
              {activeTab === 'appointments'
                ? 'Doctor Appointments Directory'
                : activeTab === 'queue'
                ? 'Patient Queue Management'
                : activeTab === 'consultations'
                ? 'Consultations History'
                : 'Investigation Reviews Workstation'}
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('dashboard')}
              className="btn btn--outline btn--sm"
            >
              Back to Dashboard
            </button>
          </div>

          {
            <div className="doc-table-container">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.todayQueue || []).map((apt) => (
                    <tr key={apt.id}>
                      <td><span className="doc-token-badge">{apt.tokenNumber}</span></td>
                      <td>
                        <strong>{apt.patientName}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{apt.patientId}</div>
                      </td>
                      <td>{apt.appointmentTime}</td>
                      <td>{apt.reason}</td>
                      <td>
                        <span className="badge badge--primary">{apt.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenPatientRecord(apt.patientMongoId)}
                          className="btn btn--outline btn--sm"
                        >
                          View Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* ── MODAL 1: AUTHORIZED PATIENT MEDICAL RECORD MODAL ── */}
      {selectedPatientId && (
        <div className="doc-modal-overlay" onClick={handleClosePatientRecord}>
          <div className="doc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Patient Clinical Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClosePatientRecord}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body">
              {loadingPatientRecord ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Loading patient clinical history...
                  </p>
                </div>
              ) : patientRecordData?.patient ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Demographics Card */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Name:</span>
                      <div style={{ fontWeight: 600 }}>{patientRecordData.patient.name}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Patient ID:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {patientRecordData.patient.patientId}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Gender / Age:</span>
                      <div style={{ fontWeight: 500 }}>
                        {patientRecordData.patient.gender} • {patientRecordData.patient.age}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Blood Group:</span>
                      <div style={{ fontWeight: 600 }}>{patientRecordData.patient.bloodGroup}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                      <div style={{ fontWeight: 500 }}>{patientRecordData.patient.phone}</div>
                    </div>
                  </div>

                  {/* Past Consultations */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                      Past Consultations with You ({patientRecordData.consultations?.length || 0})
                    </h4>
                    {patientRecordData.consultations && patientRecordData.consultations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {patientRecordData.consultations.map((c) => (
                          <div
                            key={c._id}
                            style={{
                              padding: '0.65rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              background: 'var(--bg-surface)',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <strong>Diagnosis: {c.diagnosis}</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {new Date(c.consultationDate).toLocaleDateString()}
                              </span>
                            </div>
                            {c.treatment && (
                              <div style={{ color: 'var(--text-secondary)' }}>Treatment: {c.treatment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        No prior recorded consultations on file.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                  No patient clinical records available.
                </p>
              )}
            </div>

            <div className="doc-modal-footer">
              <button type="button" onClick={handleClosePatientRecord} className="btn btn--primary btn--sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CLINICAL CONSULTATION ENCOUNTER MODAL ── */}
      {activeConsultationApt && (
        <div className="doc-modal-overlay" onClick={() => setActiveConsultationApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveConsultation}>
              <div className="doc-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    Clinical Consultation Encounter — {activeConsultationApt.patientName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveConsultationApt(null)}
                  className="btn btn--outline btn--sm"
                  style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="doc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Vitals Row */}
                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Patient Vitals
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BP</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={consultationForm.bp}
                        onChange={(e) => setConsultationForm({ ...consultationForm, bp: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HR</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={consultationForm.heartRate}
                        onChange={(e) => setConsultationForm({ ...consultationForm, heartRate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Temp</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={consultationForm.temperature}
                        onChange={(e) => setConsultationForm({ ...consultationForm, temperature: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SpO2</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={consultationForm.spo2}
                        onChange={(e) => setConsultationForm({ ...consultationForm, spo2: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={consultationForm.weight}
                        onChange={(e) => setConsultationForm({ ...consultationForm, weight: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Diagnosis (Required) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Primary Clinical Diagnosis *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute Bronchitis, Essential Hypertension"
                    className="form-input"
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                  />
                </div>

                {/* Symptoms / Chief Complaints */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Symptoms & Chief Complaints</label>
                  <input
                    type="text"
                    placeholder="Comma separated: Fever, Dry cough, Fatigue"
                    className="form-input"
                    value={consultationForm.symptoms}
                    onChange={(e) => setConsultationForm({ ...consultationForm, symptoms: e.target.value })}
                  />
                </div>

                {/* Clinical Notes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Clinical Examination Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Clinical findings, examination details, chest auscultation, etc."
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    value={consultationForm.clinicalNotes}
                    onChange={(e) => setConsultationForm({ ...consultationForm, clinicalNotes: e.target.value })}
                  />
                </div>

                {/* Treatment & Prescription Plan */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Treatment & Prescriptions</label>
                  <textarea
                    rows={2}
                    placeholder="Medications, dosage, advice, dietary guidance"
                    className="form-input"
                    style={{ resize: 'vertical' }}
                    value={consultationForm.treatment}
                    onChange={(e) => setConsultationForm({ ...consultationForm, treatment: e.target.value })}
                  />
                </div>

                {/* Follow-up Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Scheduled Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={consultationForm.followUpDate}
                    onChange={(e) => setConsultationForm({ ...consultationForm, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="doc-modal-footer">
                <button
                  type="button"
                  onClick={() => setActiveConsultationApt(null)}
                  className="btn btn--outline btn--sm"
                  disabled={savingConsultation}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={savingConsultation}
                  style={{ minWidth: '150px' }}
                >
                  {savingConsultation ? 'Saving...' : 'Complete Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
