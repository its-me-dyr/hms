/**
 * Doctor Clinical Workspace — Patient Queue Tab
 * 
 * Specialized, doctor-specific queue management workspace.
 * Features:
 * - Real queue records strictly scoped to authenticated attending doctor
 * - Date navigation (Today, Prev, Next, Date Picker, Refresh)
 * - Real mutually exclusive summary KPI cards (Total in Queue, Waiting, Now Serving, Completed, Urgent)
 * - Live "Now Serving" real indicator based on database state
 * - Main patient queue table sorted by clinical priority & appointment time
 * - Token numbering (T-01, T-02, ...)
 * - Status filters (All, Waiting, Now Serving, Completed, Scheduled)
 * - Priority filter (Urgent / Emergency vs Normal)
 * - Live search (Patient name, ID, Token, Phone, Reason)
 * - Status-aware clinical actions: Start/Continue Consultation, View Record, Consultation Details
 * - Duplicate active consultation prevention with clinical warning modal
 * - Consultation Encounter & Completed Consultation Detail modals
 * - High-contrast responsive clinical styling (Light & Dark theme compliant)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { doctorService } from '../../../services/doctor.service';

// Helper to convert Date object to YYYY-MM-DD in local time
const toISODateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DoctorQueueTab({
  onOpenPatientRecord,
  onStartConsultation,
}) {
  // ── 1. Date Navigation State ──
  const todayISO = useMemo(() => toISODateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // ── 2. Filters & Search State ──
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'waiting' | 'in-progress' | 'completed' | 'scheduled'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'urgent' | 'normal'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ── 3. Queue Data State ──
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
    urgent: 0,
  });
  const [nowServing, setNowServing] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── 4. Modals State ──
  // Encounter Form Modal
  const [activeEncounterApt, setActiveEncounterApt] = useState(null);
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
  const [formError, setFormError] = useState(null);

  // Completed Consultation Details Modal
  const [completedRecordApt, setCompletedRecordApt] = useState(null);
  const [loadingCompletedRecord, setLoadingCompletedRecord] = useState(false);

  // Item Details Modal
  const [detailItemApt, setDetailItemApt] = useState(null);

  // Duplicate Consultation Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Local fallback Patient Record Modal if prop not provided
  const [localPatientRecord, setLocalPatientRecord] = useState(null);
  const [loadingPatientRecord, setLoadingPatientRecord] = useState(false);

  // ── Debounce Search Query ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch Queue Data ──
  const fetchQueue = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          date: selectedDate,
          page: currentPage,
          limit: pageSize,
        };

        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (priorityFilter && priorityFilter !== 'all') {
          params.priority = priorityFilter;
        }
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        const res = await doctorService.getQueue(params);
        const data = res.data?.data || res.data || {};

        setQueue(data.queue || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        setNowServing(data.nowServing || null);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch doctor patient queue:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to load patient queue. Please verify your connection and retry.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, statusFilter, priorityFilter, debouncedSearch, currentPage]
  );

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ── Date Navigation Handlers ──
  const handleDateChange = (newDateStr) => {
    setSelectedDate(newDateStr);
    setCurrentPage(1);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toISODateString(d));
    setCurrentPage(1);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toISODateString(d));
    setCurrentPage(1);
  };

  const handleToday = () => {
    setSelectedDate(todayISO);
    setCurrentPage(1);
  };

  // Formatted date string for header
  const formattedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const isToday = selectedDate === todayISO;
    const d = new Date(selectedDate);
    const dateFormatted = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return isToday ? `Today (${dateFormatted})` : dateFormatted;
  }, [selectedDate, todayISO]);

  // ── Filter Handlers ──
  const handleStatusFilterChange = (status) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (prio) => {
    setPriorityFilter((prev) => (prev === prio ? 'all' : prio));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || debouncedSearch !== '';

  // ── Clinical Consultation Workflow ──
  // Start or Continue Consultation
  const handleInitiateConsultation = async (apt) => {
    // If not already in-progress, check if another appointment is already currently in progress
    if (!apt.isInProgress && nowServing && nowServing.id !== apt.id) {
      setDuplicateWarning({
        attemptedPatient: apt,
        currentServing: nowServing,
      });
      return;
    }

    // Call external handler if provided by parent DoctorDashboard
    if (onStartConsultation) {
      onStartConsultation(apt);
      return;
    }

    // Otherwise handle consultation encounter directly in this component
    try {
      if (!apt.isInProgress) {
        await doctorService.updateAppointmentStatus(apt.id, { status: 'In-Progress' });
      }
      setActiveEncounterApt(apt);
      setFormError(null);
      setConsultationForm({
        diagnosis: '',
        symptoms: apt.reason || '',
        clinicalNotes: '',
        treatment: '',
        bp: '120/80 mmHg',
        heartRate: '72 bpm',
        temperature: '98.6 °F',
        spo2: '99%',
        weight: '70 kg',
        followUpDate: '',
      });
      fetchQueue(true);
    } catch (err) {
      console.error('Failed to initiate consultation:', err);
      alert(err.response?.data?.message || 'Failed to start consultation.');
    }
  };

  // Submit Consultation Form
  const handleSaveConsultationForm = async (e) => {
    e.preventDefault();
    if (!consultationForm.diagnosis.trim()) {
      setFormError('Clinical diagnosis is required.');
      return;
    }

    setSavingConsultation(true);
    setFormError(null);

    try {
      const payload = {
        patientId: activeEncounterApt.patientMongoId,
        appointmentId: activeEncounterApt.id,
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
      setActiveEncounterApt(null);
      fetchQueue(true);
    } catch (err) {
      console.error('Failed to save consultation record:', err);
      setFormError(err.response?.data?.message || 'Failed to save consultation documentation.');
    } finally {
      setSavingConsultation(false);
    }
  };

  // View Completed Consultation Record
  const handleOpenCompletedRecord = async (apt) => {
    setCompletedRecordApt(apt);
    setLoadingCompletedRecord(true);
    try {
      const res = await doctorService.getAppointmentById(apt.id);
      const detail = res.data?.data?.appointment || res.data?.appointment;
      if (detail) {
        setCompletedRecordApt((prev) => ({
          ...prev,
          ...detail,
        }));
      }
    } catch (err) {
      console.error('Error fetching completed consultation metadata:', err);
    } finally {
      setLoadingCompletedRecord(false);
    }
  };

  // Open Patient Record
  const handleOpenPatientRecordAction = async (patientMongoId) => {
    if (onOpenPatientRecord) {
      onOpenPatientRecord(patientMongoId);
      return;
    }

    // Local fallback modal
    if (!patientMongoId) return;
    setLoadingPatientRecord(true);
    setLocalPatientRecord({ loading: true });
    try {
      const res = await doctorService.getPatientDetails(patientMongoId);
      setLocalPatientRecord(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load patient record:', err);
      setLocalPatientRecord(null);
    } finally {
      setLoadingPatientRecord(false);
    }
  };

  // Identify first waiting patient for ready state
  const firstWaitingPatient = useMemo(() => {
    return queue.find((item) => ['Waiting', 'Checked In'].includes(item.status)) || null;
  }, [queue]);

  return (
    <div className="doc-queue-layout">
      {/* ── 1. COMPACT PAGE HEADER & DATE NAVIGATION ── */}
      <div className="doc-queue-header-row" aria-label="Queue Header and Date Controls">
        <div className="doc-queue-title-group">
          <h1>
            <Clock size={19} style={{ color: '#0891b2' }} />
            <span>Patient Queue</span>
          </h1>
          <p>
            Manage waiting patients and consultation progress.
          </p>
        </div>

        {/* Date Navigation & Refresh Controls */}
        <div className="doc-queue-date-toolbar">
          {/* Quick Date Stepper */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              overflow: 'hidden',
              height: '30px',
            }}
          >
            <button
              type="button"
              onClick={handlePrevDay}
              className="btn btn--outline btn--sm"
              style={{ border: 'none', borderRadius: 0, padding: '0 0.45rem', height: '100%', display: 'inline-flex', alignItems: 'center' }}
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="btn btn--outline btn--sm"
              style={{
                border: 'none',
                borderLeft: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderRadius: 0,
                padding: '0 0.6rem',
                height: '100%',
                fontSize: '0.75rem',
                fontWeight: selectedDate === todayISO ? 700 : 500,
                color: selectedDate === todayISO ? '#0891b2' : undefined,
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="btn btn--outline btn--sm"
              style={{ border: 'none', borderRadius: 0, padding: '0 0.45rem', height: '100%', display: 'inline-flex', alignItems: 'center' }}
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            className="form-input"
            style={{
              height: '30px',
              padding: '0 0.5rem',
              fontSize: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              width: 'auto',
            }}
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            title="Select Queue Date"
          />

          {/* Formatted Date Chip */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0 0.55rem',
              height: '30px',
              background: 'rgba(8, 145, 178, 0.08)',
              border: '1px solid rgba(8, 145, 178, 0.2)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0891b2',
            }}
          >
            <Calendar size={13} />
            <span>{formattedDateLabel}</span>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
            className="btn btn--outline btn--sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', height: '30px', fontSize: '0.75rem', padding: '0 0.55rem' }}
            title="Refresh queue"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── ERROR ALERT BANNER ── */}
      {error && (
        <div
          className="alert alert--danger"
          style={{
            padding: '0.55rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '6px',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchQueue()}
            className="btn btn--outline btn--sm"
            style={{ background: '#ffffff', color: '#dc2626', fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 2. COMPACT SUMMARY CARDS (REAL SERVER COUNTS) ── */}
      <section className="doc-queue-kpi-row" aria-label="Queue Summary Cards">
        {/* Card 1: Total in Queue */}
        <div
          className={`doc-queue-kpi-card ${statusFilter === 'all' && priorityFilter === 'all' ? 'is-active' : ''}`}
          onClick={handleClearFilters}
          role="button"
          tabIndex={0}
          title="Filter by: All Patients in Queue"
        >
          <div className="doc-queue-kpi-card__header">
            <span className="doc-queue-kpi-card__title">Total in Queue</span>
            <div
              className="doc-queue-kpi-card__icon-wrap"
              style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}
            >
              <Clock size={13} />
            </div>
          </div>
          <div className="doc-queue-kpi-card__value">{summary.total}</div>
          <p className="doc-queue-kpi-card__subtext">Active patients scheduled</p>
        </div>

        {/* Card 2: Waiting Patients */}
        <div
          className={`doc-queue-kpi-card ${statusFilter === 'waiting' ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('waiting')}
          role="button"
          tabIndex={0}
          title="Filter by: Waiting Patients"
        >
          <div className="doc-queue-kpi-card__header">
            <span className="doc-queue-kpi-card__title">Waiting</span>
            <div
              className="doc-queue-kpi-card__icon-wrap"
              style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}
            >
              <Clock size={13} />
            </div>
          </div>
          <div className="doc-queue-kpi-card__value" style={{ color: '#d97706' }}>
            {summary.waiting}
          </div>
          <p className="doc-queue-kpi-card__subtext">Checked in & in queue</p>
        </div>

        {/* Card 3: In Consultation */}
        <div
          className={`doc-queue-kpi-card ${statusFilter === 'in-progress' ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('in-progress')}
          role="button"
          tabIndex={0}
          title="Filter by: In Consultation"
        >
          <div className="doc-queue-kpi-card__header">
            <span className="doc-queue-kpi-card__title">In Consultation</span>
            <div
              className="doc-queue-kpi-card__icon-wrap"
              style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}
            >
              <Stethoscope size={13} />
            </div>
          </div>
          <div className="doc-queue-kpi-card__value" style={{ color: '#2563eb' }}>
            {summary.inProgress}
          </div>
          <p className="doc-queue-kpi-card__subtext">Currently active visit</p>
        </div>

        {/* Card 4: Completed Consultations */}
        <div
          className={`doc-queue-kpi-card ${statusFilter === 'completed' ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('completed')}
          role="button"
          tabIndex={0}
          title="Filter by: Completed Consultations"
        >
          <div className="doc-queue-kpi-card__header">
            <span className="doc-queue-kpi-card__title">Completed</span>
            <div
              className="doc-queue-kpi-card__icon-wrap"
              style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}
            >
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div className="doc-queue-kpi-card__value" style={{ color: '#059669' }}>
            {summary.completed}
          </div>
          <p className="doc-queue-kpi-card__subtext">Finished consultations</p>
        </div>

        {/* Card 5: Priority / Emergency Patients */}
        <div
          className={`doc-queue-kpi-card ${priorityFilter === 'urgent' ? 'is-active' : ''}`}
          onClick={() => handlePriorityFilterChange('urgent')}
          role="button"
          tabIndex={0}
          title="Filter by: Urgent / Priority Patients"
        >
          <div className="doc-queue-kpi-card__header">
            <span className="doc-queue-kpi-card__title">Urgent / Priority</span>
            <div
              className="doc-queue-kpi-card__icon-wrap"
              style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' }}
            >
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="doc-queue-kpi-card__value" style={{ color: '#dc2626' }}>
            {summary.urgent}
          </div>
          <p className="doc-queue-kpi-card__subtext">Triage priority flag</p>
        </div>
      </section>

      {/* ── 3. COMPACT CONSULTATION STATUS STRIP ── */}
      <section
        className={`doc-queue-status-strip ${nowServing ? 'is-serving' : 'is-ready'}`}
        aria-label="Current Consultation Status"
      >
        <div className="doc-queue-status-strip__info">
          {nowServing ? (
            <>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <Stethoscope size={14} />
                <span>In Consultation:</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {nowServing.patientName} ({nowServing.patientId})
              </span>
              <span className="badge badge--primary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                Token {nowServing.tokenNumber}
              </span>
              {nowServing.priority === 'Urgent' && (
                <span className="badge badge--danger" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
                  Urgent
                </span>
              )}
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                • Time: {nowServing.appointmentTime} • Reason: {nowServing.reason}
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Ready for next patient</span>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {firstWaitingPatient
                  ? `• Next in queue: ${firstWaitingPatient.patientName} (Token ${firstWaitingPatient.tokenNumber})`
                  : '• Consultation desk available. No waiting patients in queue.'}
              </span>
            </>
          )}
        </div>

        {nowServing && (
          <button
            type="button"
            onClick={() => handleInitiateConsultation(nowServing)}
            className="btn btn--primary btn--sm"
            style={{
              height: '26px',
              fontSize: '0.72rem',
              padding: '0 0.55rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Stethoscope size={12} />
            <span>Continue Consultation</span>
          </button>
        )}
      </section>

      {/* ── 4. COMBINED SEARCH & STATUS FILTERS TOOLBAR ── */}
      <section className="doc-queue-filter-row" aria-label="Queue Search and Filters">
        {/* Search Input */}
        <div className="doc-queue-search-box" style={{ position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '1.85rem',
              paddingRight: searchQuery ? '1.75rem' : '0.65rem',
              height: '30px',
              fontSize: '0.78rem',
              width: '100%',
              borderRadius: '4px',
            }}
            placeholder="Search by patient name, ID, token, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 0,
              }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status Filters & Reset Actions */}
        <div className="doc-queue-pills-group">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '0.15rem' }}>
            Status:
          </span>

          {[
            { id: 'all', label: 'All Active' },
            { id: 'waiting', label: 'Waiting' },
            { id: 'in-progress', label: 'In Consultation' },
            { id: 'completed', label: 'Completed' },
            { id: 'scheduled', label: 'Scheduled' },
          ].map((st) => {
            const isActive = statusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleStatusFilterChange(st.id)}
                className={`doc-queue-pill-btn ${isActive ? 'is-active' : ''}`}
              >
                {st.label}
              </button>
            );
          })}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn--outline btn--sm"
              style={{
                height: '28px',
                fontSize: '0.72rem',
                padding: '0 0.5rem',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                borderRadius: '4px',
                marginLeft: '0.2rem',
              }}
              title="Reset all filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 5. MAIN PATIENT QUEUE TABLE / EMPTY STATE ── */}
      <section className="doc-queue-table-panel" aria-label="Main Patient Queue Table">
        <div className="doc-queue-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Queue Order & Patient Flow
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {pagination.total} {pagination.total === 1 ? 'Patient' : 'Patients'}
            </span>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Sorted by clinical priority and check-in sequence
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div className="spinner spinner--sm" style={{ margin: '0 auto 0.5rem auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              Loading real-time patient queue...
            </p>
          </div>
        ) : queue.length > 0 ? (
          <div className="doc-table-container">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '75px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Token</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Patient Details</th>
                  <th style={{ width: '100px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Time</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Reason for Visit</th>
                  <th style={{ width: '90px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Priority</th>
                  <th style={{ width: '125px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Queue Status</th>
                  <th style={{ textAlign: 'right', minWidth: '170px', padding: '0.5rem 0.75rem', fontSize: '0.72rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const isInProgress = item.isInProgress;
                  const isWaiting = ['Waiting', 'Checked In'].includes(item.status);
                  const isCompleted = item.isCompleted;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isInProgress ? 'rgba(37, 99, 235, 0.04)' : undefined,
                      }}
                    >
                      {/* Token */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span
                          className="doc-token-badge"
                          style={{
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.72rem',
                            background: isInProgress
                              ? '#2563eb'
                              : item.priority === 'Urgent'
                              ? '#dc2626'
                              : undefined,
                            color: isInProgress || item.priority === 'Urgent' ? '#ffffff' : undefined,
                            borderColor: isInProgress || item.priority === 'Urgent' ? 'transparent' : undefined,
                          }}
                        >
                          {item.tokenNumber}
                        </span>
                      </td>

                      {/* Patient Details */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                          {item.patientName}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '0.3rem',
                            alignItems: 'center',
                            marginTop: '0.1rem',
                          }}
                        >
                          <span style={{ color: '#0891b2', fontWeight: 600 }}>{item.patientId}</span>
                          <span>•</span>
                          <span>{item.patientGender}</span>
                          <span>•</span>
                          <span>{item.patientAge}</span>
                        </div>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                          {item.appointmentTime}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {isWaiting ? 'In Waiting Room' : isInProgress ? 'In Consultation' : isCompleted ? 'Completed' : 'Scheduled'}
                        </div>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                          {item.reason}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {item.priority === 'Urgent' ? (
                          <span
                            className="badge badge--danger"
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.4rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <AlertTriangle size={10} />
                            <span>Urgent</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Queue Status Badge */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {isInProgress ? (
                          <span
                            className="badge badge--primary"
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.45rem',
                              background: '#2563eb',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#ffffff',
                                display: 'inline-block',
                              }}
                            />
                            <span>In Consultation</span>
                          </span>
                        ) : isWaiting ? (
                          <span
                            className="badge badge--warning"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            Waiting
                          </span>
                        ) : isCompleted ? (
                          <span
                            className="badge badge--success"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            Completed
                          </span>
                        ) : (
                          <span
                            className="badge badge--info"
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                          >
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', padding: '0.5rem 0.75rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.3rem',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {/* 1. Start or Continue Consultation */}
                          {isInProgress ? (
                            <button
                              type="button"
                              onClick={() => handleInitiateConsultation(item)}
                              className="btn btn--primary btn--sm"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              title="Continue active consultation"
                            >
                              <Stethoscope size={12} />
                              <span>Continue</span>
                            </button>
                          ) : item.canStart ? (
                            <button
                              type="button"
                              onClick={() => handleInitiateConsultation(item)}
                              className={`btn btn--sm ${isWaiting ? 'btn--primary' : 'btn--outline'}`}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              title="Start clinical consultation"
                            >
                              <Stethoscope size={12} />
                              <span>Start</span>
                            </button>
                          ) : isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCompletedRecord(item)}
                              className="btn btn--outline btn--sm"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.2rem 0.5rem',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#059669',
                              }}
                              title="View saved consultation documentation"
                            >
                              <CheckCircle2 size={12} />
                              <span>Details</span>
                            </button>
                          ) : null}

                          {/* 2. Open Patient Record */}
                          <button
                            type="button"
                            onClick={() => handleOpenPatientRecordAction(item.patientMongoId)}
                            className="btn btn--outline btn--sm"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.4rem',
                              height: '26px',
                              color: 'var(--text-secondary)',
                            }}
                            title="Open patient medical record"
                          >
                            <User size={12} />
                          </button>

                          {/* 3. View Queue Item Details */}
                          <button
                            type="button"
                            onClick={() => setDetailItemApt(item)}
                            className="btn btn--outline btn--sm"
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.4rem',
                              height: '26px',
                              color: 'var(--text-secondary)',
                            }}
                            title="View appointment details"
                          >
                            <Info size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="doc-queue-empty-box">
            <Clock size={24} style={{ color: 'var(--text-muted)' }} />
            <h4 style={{ margin: '0.4rem 0 0.15rem 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              No patients in this queue
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '380px' }}>
              {hasActiveFilters
                ? 'No eligible patients were found for the selected date and filters.'
                : 'No patients are scheduled or checked into the queue for this date.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn--outline btn--sm"
                style={{ marginTop: '0.5rem', height: '26px', fontSize: '0.72rem', padding: '0 0.5rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* ── PAGINATION CONTROLS ── */}
        {pagination.pages > 1 && (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              Showing {((pagination.page - 1) * pageSize) + 1} to{' '}
              {Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total} patients
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', height: '24px' }}
              >
                Previous
              </button>
              <span style={{ padding: '0 0.35rem', fontWeight: 600 }}>
                {pagination.page} / {pagination.pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.pages))}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', height: '24px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MODAL 1: CLINICAL CONSULTATION ENCOUNTER MODAL ── */}
      {activeEncounterApt && (
        <div className="doc-modal-overlay" onClick={() => setActiveEncounterApt(null)}>
          <div
            className="doc-modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveConsultationForm}>
              <div className="doc-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Stethoscope size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    Consultation Encounter — {activeEncounterApt.patientName} (Token {activeEncounterApt.tokenNumber})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEncounterApt(null)}
                  className="btn btn--outline btn--sm"
                  style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="doc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {formError && (
                  <div className="alert alert--danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                    {formError}
                  </div>
                )}

                {/* Vitals Summary Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '0.5rem',
                    background: 'var(--bg-surface)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>BP</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '30px', fontSize: '0.78rem' }}
                      value={consultationForm.bp}
                      onChange={(e) => setConsultationForm({ ...consultationForm, bp: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Pulse</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '30px', fontSize: '0.78rem' }}
                      value={consultationForm.heartRate}
                      onChange={(e) => setConsultationForm({ ...consultationForm, heartRate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Temp</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '30px', fontSize: '0.78rem' }}
                      value={consultationForm.temperature}
                      onChange={(e) => setConsultationForm({ ...consultationForm, temperature: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>SpO2</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '30px', fontSize: '0.78rem' }}
                      value={consultationForm.spo2}
                      onChange={(e) => setConsultationForm({ ...consultationForm, spo2: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Weight</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '30px', fontSize: '0.78rem' }}
                      value={consultationForm.weight}
                      onChange={(e) => setConsultationForm({ ...consultationForm, weight: e.target.value })}
                    />
                  </div>
                </div>

                {/* Primary Diagnosis (Required) */}
                <div className="form-group">
                  <label className="form-label">
                    Primary Clinical Diagnosis <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Essential Hypertension, Acute Bronchitis..."
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                  />
                </div>

                {/* Symptoms / Chief Complaints */}
                <div className="form-group">
                  <label className="form-label">Symptoms & Chief Complaints</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Headache, Dry cough, Mild fever"
                    value={consultationForm.symptoms}
                    onChange={(e) => setConsultationForm({ ...consultationForm, symptoms: e.target.value })}
                  />
                </div>

                {/* Clinical Notes */}
                <div className="form-group">
                  <label className="form-label">Clinical Examination Notes</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Physical examination observations, auscultation, clinical rationale..."
                    value={consultationForm.clinicalNotes}
                    onChange={(e) => setConsultationForm({ ...consultationForm, clinicalNotes: e.target.value })}
                  />
                </div>

                {/* Treatment / Prescriptions */}
                <div className="form-group">
                  <label className="form-label">Treatment & Plan</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="Medications prescribed, lifestyle advice, further investigation orders..."
                    value={consultationForm.treatment}
                    onChange={(e) => setConsultationForm({ ...consultationForm, treatment: e.target.value })}
                  />
                </div>

                {/* Follow-up Date */}
                <div className="form-group">
                  <label className="form-label">Follow-up Date (Optional)</label>
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
                  onClick={() => setActiveEncounterApt(null)}
                  className="btn btn--outline btn--sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConsultation}
                  className="btn btn--primary btn--sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {savingConsultation ? (
                    <>
                      <div className="spinner spinner--sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Complete & Sign Consultation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: COMPLETED CONSULTATION DETAILS MODAL ── */}
      {completedRecordApt && (
        <div className="doc-modal-overlay" onClick={() => setCompletedRecordApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Completed Consultation Documentation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletedRecordApt(null)}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body">
              {loadingCompletedRecord ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Loading consultation documentation...
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Patient Banner */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{completedRecordApt.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0891b2' }}>{completedRecordApt.patientId}</div>
                    </div>
                    <span className="badge badge--success">Completed</span>
                  </div>

                  {completedRecordApt.consultation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Diagnosis:</strong>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                          {completedRecordApt.consultation.diagnosis}
                        </div>
                      </div>

                      {completedRecordApt.consultation.treatment && (
                        <div>
                          <strong style={{ color: 'var(--text-secondary)' }}>Treatment Plan:</strong>
                          <div style={{ marginTop: '0.15rem', color: 'var(--text-primary)' }}>
                            {completedRecordApt.consultation.treatment}
                          </div>
                        </div>
                      )}

                      {completedRecordApt.consultation.clinicalNotes && (
                        <div>
                          <strong style={{ color: 'var(--text-secondary)' }}>Clinical Notes:</strong>
                          <div style={{ marginTop: '0.15rem', color: 'var(--text-primary)' }}>
                            {completedRecordApt.consultation.clinicalNotes}
                          </div>
                        </div>
                      )}

                      {completedRecordApt.consultation.vitals && (
                        <div style={{ background: 'var(--bg-surface)', padding: '0.65rem', borderRadius: '6px' }}>
                          <strong style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Vitals Recorded:</strong>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {Object.entries(completedRecordApt.consultation.vitals).map(([k, v]) => (
                              <span key={k} style={{ fontSize: '0.75rem' }}>
                                <strong>{k.toUpperCase()}:</strong> {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                      Reason for visit: {completedRecordApt.reason}. Encounter completed without additional notes.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="doc-modal-footer">
              <button
                type="button"
                onClick={() => setCompletedRecordApt(null)}
                className="btn btn--primary btn--sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: QUEUE ITEM DETAILS MODAL ── */}
      {detailItemApt && (
        <div className="doc-modal-overlay" onClick={() => setDetailItemApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={17} style={{ color: '#0891b2' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Queue Item Details — Token {detailItemApt.tokenNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItemApt(null)}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body" style={{ fontSize: '0.825rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Patient Name:</span>
                  <div style={{ fontWeight: 600 }}>{detailItemApt.patientName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Patient ID:</span>
                  <div style={{ fontWeight: 600, color: '#0891b2' }}>{detailItemApt.patientId}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Appointment Time:</span>
                  <div style={{ fontWeight: 600 }}>{detailItemApt.appointmentTime}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Queue Status:</span>
                  <div>
                    <span className="badge badge--primary">{detailItemApt.status}</span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Triage Priority:</span>
                  <div>
                    <span className={detailItemApt.priority === 'Urgent' ? 'badge badge--danger' : 'badge badge--info'}>
                      {detailItemApt.priority}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                  <div style={{ fontWeight: 500 }}>{detailItemApt.patientPhone}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Reason for Visit:</span>
                  <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{detailItemApt.reason}</div>
                </div>
              </div>
            </div>

            <div className="doc-modal-footer">
              <button
                type="button"
                onClick={() => setDetailItemApt(null)}
                className="btn btn--primary btn--sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DUPLICATE CONSULTATION WARNING MODAL ── */}
      {duplicateWarning && (
        <div className="doc-modal-overlay" onClick={() => setDuplicateWarning(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                <AlertTriangle size={18} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Active Consultation In Progress
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body" style={{ fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 1rem 0' }}>
                You already have an active consultation currently in progress with{' '}
                <strong>{duplicateWarning.currentServing.patientName}</strong> (Token{' '}
                <strong>{duplicateWarning.currentServing.tokenNumber}</strong>).
              </p>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Active Patient:</div>
                <div style={{ fontWeight: 700, marginTop: '0.2rem' }}>
                  {duplicateWarning.currentServing.patientName} ({duplicateWarning.currentServing.patientId})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Reason: {duplicateWarning.currentServing.reason}
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                To maintain clinical safety and prevent duplicate encounters, please conclude or save documentation for the current patient before starting a new consultation.
              </p>
            </div>

            <div className="doc-modal-footer">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="btn btn--outline btn--sm"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  const servingApt = queue.find((q) => q.id === duplicateWarning.currentServing.id) || duplicateWarning.currentServing;
                  setDuplicateWarning(null);
                  handleInitiateConsultation(servingApt);
                }}
                className="btn btn--primary btn--sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Stethoscope size={14} />
                <span>Switch to Active Consultation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: LOCAL FALLBACK PATIENT MEDICAL RECORD MODAL ── */}
      {localPatientRecord && (
        <div className="doc-modal-overlay" onClick={() => setLocalPatientRecord(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Patient Clinical Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLocalPatientRecord(null)}
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
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading patient profile...</p>
                </div>
              ) : localPatientRecord.patient ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.825rem' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem',
                      background: 'var(--bg-surface)',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Name:</span>
                      <div style={{ fontWeight: 600 }}>{localPatientRecord.patient.name}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Patient ID:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {localPatientRecord.patient.patientId}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Gender / Age:</span>
                      <div>{localPatientRecord.patient.gender} • {localPatientRecord.patient.age}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Blood Group:</span>
                      <div style={{ fontWeight: 600 }}>{localPatientRecord.patient.bloodGroup}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                      <div>{localPatientRecord.patient.phone}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700 }}>
                      Past Consultations with You ({localPatientRecord.consultations?.length || 0})
                    </h4>
                    {localPatientRecord.consultations && localPatientRecord.consultations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {localPatientRecord.consultations.map((c) => (
                          <div
                            key={c._id}
                            style={{
                              padding: '0.65rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              background: 'var(--bg-surface)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>Diagnosis: {c.diagnosis}</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                {new Date(c.consultationDate).toLocaleDateString()}
                              </span>
                            </div>
                            {c.treatment && (
                              <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Treatment: {c.treatment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>No prior consultations on record.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="doc-modal-footer">
              <button
                type="button"
                onClick={() => setLocalPatientRecord(null)}
                className="btn btn--primary btn--sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
