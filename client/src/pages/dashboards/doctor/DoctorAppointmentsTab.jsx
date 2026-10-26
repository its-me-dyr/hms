/**
 * Doctor Clinical Workspace — My Appointments Tab
 * 
 * Comprehensive appointment management workspace for attending physicians.
 * Features:
 * - Real date navigation (Today, Prev <, Next >, Date Picker, Refresh)
 * - Real summary KPI cards derived from backend queries (mutually exclusive counts)
 * - Server-side filterable, searchable, and sortable appointment list
 * - Status-aware clinical actions: Start/Continue Consultation, View Details, Open Patient Record, Reschedule, Cancel
 * - Modal dialogs for Appointment Details, Rescheduling, and Cancellation
 * - Strict doctor data isolation with zero mock data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Stethoscope,
  FileText,
  Search,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  CalendarClock,
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

export default function DoctorAppointmentsTab({
  onOpenPatientRecord,
  onStartConsultation,
}) {
  // ── 1. Date Navigation State ──
  const todayISO = useMemo(() => toISODateString(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // ── 2. Filters & Search State ──
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('time_asc'); // 'time_asc' | 'time_desc'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ── 3. Data & Loading State ──
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    confirmed: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── 4. Modals State ──
  const [detailModalApt, setDetailModalApt] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: todayISO,
    newTime: '09:00 AM',
    reason: '',
  });
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);

  const [cancelApt, setCancelApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when status filter changes
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // ── Fetch Appointments from Backend ──
  const fetchAppointments = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          date: selectedDate,
          status: statusFilter,
          search: debouncedSearch.trim() || undefined,
          page: currentPage,
          limit: pageSize,
          sort: sortBy,
        };

        const res = await doctorService.getAppointments(params);
        const data = res.data?.data || res.data || {};

        setAppointments(data.appointments || []);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch doctor appointments:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to load appointments. Please check your connection and retry.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, statusFilter, debouncedSearch, currentPage, sortBy]
  );

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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

  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setDebouncedSearch('');
    setSortBy('time_asc');
    setSelectedDate(todayISO);
    setCurrentPage(1);
  };

  // Human-readable date label
  const formattedDateLabel = useMemo(() => {
    const d = new Date(selectedDate);
    const isToday = selectedDate === todayISO;
    const dateFormatted = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return isToday ? `Today (${dateFormatted})` : dateFormatted;
  }, [selectedDate, todayISO]);

  // ── Open Appointment Details Modal ──
  const handleOpenDetails = async (apt) => {
    setDetailModalApt(apt);
    setLoadingDetail(true);
    try {
      const res = await doctorService.getAppointmentById(apt.id);
      const detail = res.data?.data?.appointment || res.data?.appointment;
      if (detail) {
        setDetailModalApt((prev) => ({
          ...prev,
          ...detail,
        }));
      }
    } catch (err) {
      console.error('Error fetching detailed appointment metadata:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Reschedule Handlers ──
  const handleOpenReschedule = (apt) => {
    setRescheduleApt(apt);
    setRescheduleError(null);
    setRescheduleForm({
      newDate: selectedDate,
      newTime: apt.appointmentTime && apt.appointmentTime !== '—' ? apt.appointmentTime : '10:00 AM',
      reason: '',
    });
  };

  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;

    if (!rescheduleForm.newDate || !rescheduleForm.newTime) {
      setRescheduleError('Please select both a new date and time.');
      return;
    }

    setRescheduling(true);
    setRescheduleError(null);

    try {
      await doctorService.rescheduleAppointment(rescheduleApt.id, {
        newDate: rescheduleForm.newDate,
        newTime: rescheduleForm.newTime,
        reason: rescheduleForm.reason.trim(),
      });
      setRescheduleApt(null);
      fetchAppointments(true);
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
      setRescheduleError(
        err.response?.data?.message || err.message || 'Failed to reschedule appointment.'
      );
    } finally {
      setRescheduling(false);
    }
  };

  // ── Cancellation Handlers ──
  const handleOpenCancel = (apt) => {
    setCancelApt(apt);
    setCancelReason('');
    setCancelError(null);
  };

  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancelApt) return;

    setCancelling(true);
    setCancelError(null);

    try {
      await doctorService.cancelAppointment(cancelApt.id, {
        reason: cancelReason.trim() || 'Cancelled by attending doctor',
      });
      setCancelApt(null);
      fetchAppointments(true);
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      setCancelError(
        err.response?.data?.message || err.message || 'Failed to cancel appointment.'
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="doc-appointments-workspace" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── SECTION 1: COMPACT PAGE HEADER & DATE NAVIGATION ── */}
      <section className="doc-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Calendar size={20} style={{ color: '#0891b2' }} />
              <span>My Appointments</span>
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Manage your scheduled patient appointments
            </p>
          </div>

          {/* Date Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Quick Navigation Buttons */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={handlePrevDay}
                className="btn btn--outline btn--sm"
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: '0.3rem 0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Previous Day"
              >
                <ChevronLeft size={16} />
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
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
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
                style={{
                  border: 'none',
                  borderRadius: 0,
                  padding: '0.3rem 0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Date Picker Input */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="date"
                className="form-input"
                style={{
                  height: '32px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                title="Select Date"
              />
            </div>

            {/* Selected Date Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.65rem',
                background: 'rgba(8, 145, 178, 0.1)',
                border: '1px solid rgba(8, 145, 178, 0.25)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0891b2',
              }}
            >
              <Clock size={13} />
              <span>{formattedDateLabel}</span>
            </div>

            {/* Refresh Action */}
            <button
              type="button"
              onClick={() => fetchAppointments(true)}
              disabled={refreshing}
              className="btn btn--outline btn--sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '32px',
              }}
              title="Refresh appointments"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: APPOINTMENT SUMMARY CARDS (REAL SERVER COUNTS) ── */}
      <section
        className="doc-kpi-grid"
        aria-label="Appointment Summary Cards"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {/* 1. Total Appointments */}
        <div
          className={`doc-kpi-card ${statusFilter === 'all' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('all')}
          role="button"
          tabIndex={0}
          title="Filter by: All Appointments"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'all' ? '2px solid #0891b2' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>Total</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2', width: '28px', height: '28px' }}
            >
              <Calendar size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem' }}>
            {summary.total}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            All for selected day
          </p>
        </div>

        {/* 2. Scheduled or Confirmed */}
        <div
          className={`doc-kpi-card ${statusFilter === 'confirmed' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('confirmed')}
          role="button"
          tabIndex={0}
          title="Filter by: Scheduled or Confirmed"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'confirmed' ? '2px solid #0284c7' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>Confirmed</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', width: '28px', height: '28px' }}
            >
              <CalendarClock size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem', color: '#0284c7' }}>
            {summary.confirmed}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            Scheduled & confirmed
          </p>
        </div>

        {/* 3. Waiting */}
        <div
          className={`doc-kpi-card ${statusFilter === 'waiting' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('waiting')}
          role="button"
          tabIndex={0}
          title="Filter by: Waiting Patients"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'waiting' ? '2px solid #d97706' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>Waiting</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', width: '28px', height: '28px' }}
            >
              <Clock size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem', color: '#d97706' }}>
            {summary.waiting}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            Checked in & in queue
          </p>
        </div>

        {/* 4. In Progress */}
        <div
          className={`doc-kpi-card ${statusFilter === 'in-progress' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('in-progress')}
          role="button"
          tabIndex={0}
          title="Filter by: In-Progress Consultations"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'in-progress' ? '2px solid #2563eb' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>In Progress</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', width: '28px', height: '28px' }}
            >
              <Stethoscope size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem', color: '#2563eb' }}>
            {summary.inProgress}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            Active consultations
          </p>
        </div>

        {/* 5. Completed */}
        <div
          className={`doc-kpi-card ${statusFilter === 'completed' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('completed')}
          role="button"
          tabIndex={0}
          title="Filter by: Completed Consultations"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'completed' ? '2px solid #059669' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>Completed</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669', width: '28px', height: '28px' }}
            >
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem', color: '#059669' }}>
            {summary.completed}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            Finished visits
          </p>
        </div>

        {/* 6. Cancelled */}
        <div
          className={`doc-kpi-card ${statusFilter === 'cancelled' ? 'active-filter-card' : ''}`}
          onClick={() => handleStatusFilterChange('cancelled')}
          role="button"
          tabIndex={0}
          title="Filter by: Cancelled Appointments"
          style={{
            cursor: 'pointer',
            padding: '0.85rem 1rem',
            border: statusFilter === 'cancelled' ? '2px solid #dc2626' : undefined,
          }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__title" style={{ fontSize: '0.75rem' }}>Cancelled</span>
            <div
              className="doc-kpi-card__icon-box"
              style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626', width: '28px', height: '28px' }}
            >
              <XCircle size={15} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ fontSize: '1.35rem', color: '#dc2626' }}>
            {summary.cancelled}
          </div>
          <p className="doc-kpi-card__subtext" style={{ fontSize: '0.7rem' }}>
            Cancelled / No show
          </p>
        </div>
      </section>

      {/* ── SECTION 3: SEARCH, FILTER TOOLBAR & MAIN APPOINTMENTS TABLE ── */}
      <section className="doc-panel" style={{ padding: '1.25rem' }}>
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
            <div className="doc-search-box" style={{ width: '100%', minWidth: 'unset' }}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search patient, ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.1rem 0.25rem',
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns & Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Status Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={13} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-input"
                style={{ height: '32px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '130px' }}
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
              >
                <option value="all">All Statuses ({summary.total})</option>
                <option value="confirmed">Confirmed / Scheduled ({summary.confirmed})</option>
                <option value="waiting">Waiting & Checked In ({summary.waiting})</option>
                <option value="in-progress">In Progress ({summary.inProgress})</option>
                <option value="completed">Completed ({summary.completed})</option>
                <option value="cancelled">Cancelled ({summary.cancelled})</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <select
              className="form-input"
              style={{ height: '32px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '120px' }}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="time_asc">Time (Earliest)</option>
              <option value="time_desc">Time (Latest)</option>
            </select>

            {/* Reset Filters Button */}
            {(statusFilter !== 'all' || searchQuery || selectedDate !== todayISO || sortBy !== 'time_asc') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn--outline btn--sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  height: '32px',
                  fontSize: '0.78rem',
                }}
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="alert alert--danger"
            style={{
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchAppointments()}
              className="btn btn--outline btn--sm"
              style={{ background: '#ffffff', color: '#dc2626' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Appointments Table */}
        <div className="doc-table-container">
          {loading && !refreshing ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Loading doctor appointments from server...
              </p>
            </div>
          ) : appointments.length > 0 ? (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Token</th>
                  <th style={{ width: '100px' }}>Time</th>
                  <th>Patient Name & ID</th>
                  <th>Department / Type</th>
                  <th>Reason for Visit</th>
                  <th style={{ width: '80px' }}>Priority</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '190px' }}>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => {
                  const isInProgress = apt.status === 'In-Progress';
                  const isCompleted = apt.status === 'Completed';
                  const isCancelled = apt.status === 'Cancelled' || apt.status === 'No Show';
                  const isEligibleToStart = !isCompleted && !isCancelled;

                  return (
                    <tr key={apt.id} className={isInProgress ? 'in-progress' : ''}>
                      {/* Token */}
                      <td>
                        <span className="doc-token-badge">{apt.tokenNumber}</span>
                      </td>

                      {/* Time */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                          {apt.appointmentTime}
                        </div>
                      </td>

                      {/* Patient Name & Demographics */}
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <span>{apt.patientName}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '0.35rem',
                            alignItems: 'center',
                            marginTop: '0.15rem',
                          }}
                        >
                          <span style={{ color: '#0891b2', fontWeight: 600 }}>{apt.patientId}</span>
                          <span>•</span>
                          <span>{apt.patientGender}</span>
                          <span>•</span>
                          <span>{apt.patientAge}</span>
                        </div>
                      </td>

                      {/* Department / Type */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {apt.department}
                        </span>
                      </td>

                      {/* Reason */}
                      <td>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={apt.reason}
                        >
                          {apt.reason}
                        </div>
                      </td>

                      {/* Priority */}
                      <td>
                        <span
                          className={`doc-priority-badge ${
                            apt.priority === 'Urgent' ? 'urgent' : 'normal'
                          }`}
                        >
                          {apt.priority}
                        </span>
                      </td>

                      {/* Status */}
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
                              : apt.status === 'Cancelled'
                              ? 'cancelled'
                              : 'confirmed'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.35rem',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {/* 1. Start / Continue Consultation (only eligible non-cancelled/completed) */}
                          {isEligibleToStart && onStartConsultation && (
                            <button
                              type="button"
                              onClick={() => onStartConsultation(apt)}
                              className={`btn btn--sm ${isInProgress ? 'btn--primary' : 'btn--outline'}`}
                              style={{
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.5rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                              title={isInProgress ? 'Continue active consultation' : 'Start clinical consultation'}
                            >
                              <Stethoscope size={13} />
                              <span>{isInProgress ? 'Continue' : 'Start'}</span>
                            </button>
                          )}

                          {/* 2. View Details Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(apt)}
                            className="btn btn--outline btn--sm"
                            style={{
                              fontSize: '0.725rem',
                              padding: '0.25rem 0.45rem',
                              color: 'var(--text-secondary)',
                            }}
                            title="View appointment details"
                          >
                            <Eye size={13} />
                          </button>

                          {/* 3. Open Patient Clinical Record */}
                          {onOpenPatientRecord && (
                            <button
                              type="button"
                              onClick={() => onOpenPatientRecord(apt.patientMongoId)}
                              className="btn btn--outline btn--sm"
                              style={{
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.45rem',
                                color: 'var(--text-secondary)',
                              }}
                              title="Open patient medical history"
                            >
                              <FileText size={13} />
                            </button>
                          )}

                          {/* 4. Reschedule (only if not completed and not cancelled) */}
                          {!isCompleted && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOpenReschedule(apt)}
                              className="btn btn--outline btn--sm"
                              style={{
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.45rem',
                                color: '#0284c7',
                              }}
                              title="Reschedule appointment"
                            >
                              <CalendarClock size={13} />
                            </button>
                          )}

                          {/* 5. Cancel (only if not completed, not in-progress, and not already cancelled) */}
                          {!isCompleted && !isInProgress && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancel(apt)}
                              className="btn btn--outline btn--sm"
                              style={{
                                fontSize: '0.725rem',
                                padding: '0.25rem 0.45rem',
                                color: '#dc2626',
                              }}
                              title="Cancel appointment"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="doc-empty-state" style={{ padding: '3rem 1rem' }}>
              <Calendar size={36} style={{ color: 'var(--text-muted)' }} />
              <h4 style={{ margin: '0.75rem 0 0.35rem 0' }}>No Appointments Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: 0 }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'No appointments matched your query or filter criteria for this date.'
                  : `You have no scheduled appointments for ${formattedDateLabel}.`}
              </p>
              {(searchQuery || statusFilter !== 'all' || selectedDate !== todayISO) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn--outline btn--sm"
                  style={{ marginTop: '1rem', fontSize: '0.78rem' }}
                >
                  Clear Filters & Show Today
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> (
              {pagination.total} total)
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MODAL A: APPOINTMENT DETAILS MODAL ── */}
      {detailModalApt && (
        <div className="doc-modal-overlay" onClick={() => setDetailModalApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={18} style={{ color: '#0891b2' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Appointment Details — {detailModalApt.tokenNumber || 'Record'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalApt(null)}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body">
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Loading appointment details...
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
                      <div style={{ marginTop: '0.2rem' }}>
                        <span
                          className={`doc-status-badge ${
                            detailModalApt.status === 'In-Progress'
                              ? 'in-progress'
                              : detailModalApt.status === 'Waiting'
                              ? 'waiting'
                              : detailModalApt.status === 'Completed'
                              ? 'completed'
                              : detailModalApt.status === 'Cancelled'
                              ? 'cancelled'
                              : 'confirmed'
                          }`}
                        >
                          {detailModalApt.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time & Token</span>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {detailModalApt.appointmentTime} ({detailModalApt.tokenNumber})
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</span>
                      <div style={{ marginTop: '0.2rem' }}>
                        <span
                          className={`doc-priority-badge ${
                            detailModalApt.priority === 'Urgent' ? 'urgent' : 'normal'
                          }`}
                        >
                          {detailModalApt.priority || 'Normal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Patient Demographics */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      padding: '0.85rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {detailModalApt.patientName || detailModalApt.patient?.name}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Patient ID:</span>
                      <div style={{ fontWeight: 600, color: '#0891b2' }}>
                        {detailModalApt.patientId || detailModalApt.patient?.patientId}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Gender / Age:</span>
                      <div>
                        {detailModalApt.patientGender || detailModalApt.patient?.gender} •{' '}
                        {detailModalApt.patientAge || detailModalApt.patient?.age}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                      <div>{detailModalApt.patientPhone || detailModalApt.patient?.phone || '—'}</div>
                    </div>
                  </div>

                  {/* Clinical & Visit Details */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Department:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{detailModalApt.department}</span>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Reason for Visit:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{detailModalApt.reason}</span>
                    </div>
                    {detailModalApt.notes && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Clinical Notes:</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{detailModalApt.notes}</span>
                      </div>
                    )}
                    {detailModalApt.cancellationReason && (
                      <div style={{ color: '#dc2626' }}>
                        <strong>Cancellation Reason:</strong> {detailModalApt.cancellationReason}
                      </div>
                    )}
                  </div>

                  {/* Related Consultation Details (if completed) */}
                  {detailModalApt.consultation && (
                    <div
                      style={{
                        background: 'rgba(5, 150, 105, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(5, 150, 105, 0.25)',
                        padding: '0.85rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#059669', marginBottom: '0.35rem' }}>
                        Consultation Recorded
                      </div>
                      <div>
                        <strong>Diagnosis:</strong> {detailModalApt.consultation.diagnosis}
                      </div>
                      {detailModalApt.consultation.treatment && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <strong>Treatment:</strong> {detailModalApt.consultation.treatment}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="doc-modal-footer">
              <button
                type="button"
                onClick={() => setDetailModalApt(null)}
                className="btn btn--outline btn--sm"
              >
                Close
              </button>
              {onOpenPatientRecord && detailModalApt.patientMongoId && (
                <button
                  type="button"
                  onClick={() => {
                    const id = detailModalApt.patientMongoId;
                    setDetailModalApt(null);
                    onOpenPatientRecord(id);
                  }}
                  className="btn btn--primary btn--sm"
                >
                  View Full Medical Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL B: RESCHEDULE APPOINTMENT MODAL ── */}
      {rescheduleApt && (
        <div className="doc-modal-overlay" onClick={() => !rescheduling && setRescheduleApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitReschedule}>
              <div className="doc-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarClock size={18} style={{ color: '#0284c7' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    Reschedule Appointment
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !rescheduling && setRescheduleApt(null)}
                  className="btn btn--outline btn--sm"
                  style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="doc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Rescheduling appointment for <strong>{rescheduleApt.patientName}</strong> ({rescheduleApt.patientId}).
                </p>

                {rescheduleError && (
                  <div className="alert alert--danger" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                    {rescheduleError}
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>New Appointment Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={rescheduleForm.newDate}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>New Appointment Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 AM or 02:00 PM"
                    className="form-input"
                    value={rescheduleForm.newTime}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, newTime: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Reason for Rescheduling (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Doctor emergency, ward rounds, patient requested time change..."
                    className="form-input"
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="doc-modal-footer">
                <button
                  type="button"
                  disabled={rescheduling}
                  onClick={() => setRescheduleApt(null)}
                  className="btn btn--outline btn--sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="btn btn--primary btn--sm"
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL C: CANCEL APPOINTMENT MODAL ── */}
      {cancelApt && (
        <div className="doc-modal-overlay" onClick={() => !cancelling && setCancelApt(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitCancel}>
              <div className="doc-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} style={{ color: '#dc2626' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                    Cancel Appointment
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => !cancelling && setCancelApt(null)}
                  className="btn btn--outline btn--sm"
                  style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="doc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Are you sure you want to cancel the appointment for{' '}
                  <strong>{cancelApt.patientName}</strong> ({cancelApt.patientId}) scheduled for{' '}
                  <strong>{cancelApt.appointmentTime}</strong>?
                </p>

                {cancelError && (
                  <div className="alert alert--danger" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                    {cancelError}
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Reason for Cancellation *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter clinical reason or cancellation note..."
                    className="form-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="doc-modal-footer">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setCancelApt(null)}
                  className="btn btn--outline btn--sm"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="btn btn--danger btn--sm"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
