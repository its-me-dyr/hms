/**
 * Reception Appointments Tab
 * 
 * Complete appointments management for Front Desk:
 * - Search by patient name, patient ID, doctor name
 * - Filters by date (Today, Tomorrow, Date picker, All), status, and department
 * - Action buttons: 1-click Check-in, View Details, Reschedule, Cancel
 * - Modal workflows for Rescheduling and Cancellation
 * - Trigger for Book Appointment wizard
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarClock,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Stethoscope,
  Building,
  Phone,
  FileText,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function AppointmentsTab({ onOpenBookAppointment, onSelectPatient }) {
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'tomorrow' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Action states / Modals
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, appointment: null, newDate: '', newTime: '', reason: '' });
  const [cancelModal, setCancelModal] = useState({ open: false, appointment: null, reason: '' });

  // Format date helper
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (dateFilter === 'today') params.date = getTodayStr();
      else if (dateFilter === 'tomorrow') params.date = getTomorrowStr();
      else if (dateFilter === 'custom' && customDate) params.date = customDate;

      if (statusFilter) params.status = statusFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [resApps, resDepts] = await Promise.all([
        receptionService.getAppointments(params),
        departments.length === 0 ? receptionService.getDepartments() : Promise.resolve(null),
      ]);

      const dataApps = resApps.data?.appointments || resApps.data || [];
      setAppointments(Array.isArray(dataApps) ? dataApps : []);
      if (resDepts?.data) {
        setDepartments(Array.isArray(resDepts.data) ? resDepts.data : []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(err.message || 'Unable to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customDate, statusFilter, departmentFilter]);

  // Client-side quick filter for search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter((app) => {
      const pName = `${app.patient?.firstName || ''} ${app.patient?.lastName || ''}`.toLowerCase();
      const pId = (app.patient?.patientId || '').toLowerCase();
      const dName = `${app.doctor?.firstName || ''} ${app.doctor?.lastName || ''}`.toLowerCase();
      const reason = (app.reason || '').toLowerCase();
      return pName.includes(q) || pId.includes(q) || dName.includes(q) || reason.includes(q);
    });
  }, [appointments, searchQuery]);

  // Pagination slice
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(start, start + itemsPerPage);
  }, [filteredAppointments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage) || 1;

  // Handle 1-click Check-in
  const handleCheckIn = async (appointment) => {
    setActionLoadingId(appointment._id);
    setFeedback(null);
    try {
      const res = await receptionService.updateAppointmentStatus(appointment._id, {
        status: 'Checked In',
      });
      const token = res.data?.queueToken?.tokenNumber || 'Assigned';
      setFeedback({
        type: 'success',
        text: `Checked in successfully for ${appointment.patient?.firstName || 'Patient'}! Queue Token: #${token}`,
      });
      loadAppointments();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to check in appointment.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reschedule submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModal.newDate || !rescheduleModal.newTime) {
      alert('Please select both a new date and time slot.');
      return;
    }
    setActionLoadingId(rescheduleModal.appointment._id);
    try {
      await receptionService.updateAppointmentStatus(rescheduleModal.appointment._id, {
        status: 'Rescheduled',
        date: rescheduleModal.newDate,
        timeSlot: rescheduleModal.newTime,
        cancellationReason: rescheduleModal.reason || 'Rescheduled by Receptionist',
      });
      setFeedback({
        type: 'success',
        text: `Appointment rescheduled to ${rescheduleModal.newDate} at ${rescheduleModal.newTime}.`,
      });
      setRescheduleModal({ open: false, appointment: null, newDate: '', newTime: '', reason: '' });
      loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to reschedule appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Cancel submit
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    setActionLoadingId(cancelModal.appointment._id);
    try {
      await receptionService.updateAppointmentStatus(cancelModal.appointment._id, {
        status: 'Cancelled',
        cancellationReason: cancelModal.reason || 'Cancelled by Front Desk',
      });
      setFeedback({
        type: 'success',
        text: 'Appointment cancelled successfully.',
      });
      setCancelModal({ open: false, appointment: null, reason: '' });
      loadAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="rec-badge rec-badge--confirmed">Confirmed</span>;
      case 'Checked In':
        return <span className="rec-badge rec-badge--checkedin">Checked In</span>;
      case 'In Consultation':
        return <span className="rec-badge rec-badge--consulting">In Consultation</span>;
      case 'Completed':
        return <span className="rec-badge rec-badge--completed">Completed</span>;
      case 'Cancelled':
        return <span className="rec-badge rec-badge--cancelled">Cancelled</span>;
      case 'No Show':
        return <span className="rec-badge rec-badge--danger">No Show</span>;
      default:
        return <span className="rec-badge rec-badge--scheduled">{status || 'Scheduled'}</span>;
    }
  };

  return (
    <div className="rec-container">
      {/* Tab Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">FRONT DESK SCHEDULING</div>
          <h1 className="rec-header-title">Appointments Management</h1>
          <p className="rec-header-subtitle">
            Search, check-in, reschedule, or cancel patient consultations across all clinical departments.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={loadAppointments}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="rec-btn rec-btn--primary"
            onClick={onOpenBookAppointment}
          >
            <Plus size={18} />
            <span>Book Appointment</span>
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

      {/* Filters Bar Card */}
      <div className="rec-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search by patient name, ID, doctor, reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="rec-form-input"
              style={{ paddingLeft: '38px', width: '100%' }}
            />
          </div>

          {/* Date Range Quick Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className={`rec-btn rec-btn--sm ${
                dateFilter === 'today' ? 'rec-btn--primary' : 'rec-btn--secondary'
              }`}
              onClick={() => {
                setDateFilter('today');
                setCurrentPage(1);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={`rec-btn rec-btn--sm ${
                dateFilter === 'tomorrow' ? 'rec-btn--primary' : 'rec-btn--secondary'
              }`}
              onClick={() => {
                setDateFilter('tomorrow');
                setCurrentPage(1);
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`rec-btn rec-btn--sm ${
                dateFilter === 'all' ? 'rec-btn--primary' : 'rec-btn--secondary'
              }`}
              onClick={() => {
                setDateFilter('all');
                setCurrentPage(1);
              }}
            >
              All Dates
            </button>
            <button
              type="button"
              className={`rec-btn rec-btn--sm ${
                dateFilter === 'custom' ? 'rec-btn--primary' : 'rec-btn--secondary'
              }`}
              onClick={() => {
                setDateFilter('custom');
                if (!customDate) setCustomDate(getTodayStr());
                setCurrentPage(1);
              }}
            >
              Custom Date
            </button>
          </div>

          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rec-form-input"
              style={{ padding: '0.4rem 0.75rem', width: 'auto' }}
            />
          )}

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rec-form-select"
              style={{ padding: '0.45rem 0.75rem' }}
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked In">Checked In</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          {/* Department Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rec-form-select"
              style={{ padding: '0.45rem 0.75rem' }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Data Table Card */}
      <div className="rec-card">
        <div className="rec-card-header">
          <div>
            <h2 className="rec-card-title">Appointments Directory</h2>
            <p className="rec-card-subtitle">
              Showing {filteredAppointments.length} matching appointment{filteredAppointments.length === 1 ? '' : 's'}
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="rec-spin" style={{ margin: '0 auto 1rem', color: '#0891b2' }} />
            <p>Loading appointments registry...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <div className="rec-alert rec-alert--error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="rec-empty-state">
            <Calendar size={48} className="rec-empty-state-icon" />
            <div className="rec-empty-state-title">No appointments found</div>
            <div className="rec-empty-state-desc">
              {searchQuery || statusFilter || departmentFilter || dateFilter !== 'all'
                ? 'No appointments match the selected filters. Try broadening your search.'
                : 'No appointments have been booked for this timeframe yet.'}
            </div>
            <button
              type="button"
              className="rec-btn rec-btn--primary"
              onClick={onOpenBookAppointment}
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} />
              <span>Book Appointment</span>
            </button>
          </div>
        ) : (
          <div className="rec-table-wrapper">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Patient Details</th>
                  <th>Doctor & Dept</th>
                  <th>Schedule</th>
                  <th>Reason / Symptoms</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.map((app) => {
                  const pName = app.patient
                    ? `${app.patient.firstName || ''} ${app.patient.lastName || ''}`.trim() || 'Unnamed Patient'
                    : 'Unknown Patient';
                  const dName = app.doctor
                    ? `Dr. ${app.doctor.firstName || ''} ${app.doctor.lastName || ''}`.trim()
                    : 'Any Doctor';
                  const dept = app.department?.name || app.doctor?.department?.name || 'General Medicine';
                  const dateStr = app.date ? new Date(app.date).toLocaleDateString() : 'N/A';
                  const isCheckedIn = app.status === 'Checked In' || app.status === 'In Consultation' || app.status === 'Completed';
                  const isCancelled = app.status === 'Cancelled' || app.status === 'No Show';

                  return (
                    <tr key={app._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(8, 145, 178, 0.1)',
                              color: '#0891b2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {pName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#0f172a',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (app.patient && onSelectPatient) onSelectPatient(app.patient);
                              }}
                              title="View Patient Details"
                            >
                              {pName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              ID: {app.patient?.patientId || 'Pending'} • Phone: {app.patient?.phone || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{dName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#0891b2', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building size={12} />
                          <span>{dept}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#334155' }}>
                          <Calendar size={14} style={{ color: '#0891b2' }} />
                          <span>{dateStr}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#64748b' }}>
                          <Clock size={12} />
                          <span>{app.timeSlot || '09:00 AM - 10:00 AM'}</span>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            maxWidth: '220px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.85rem',
                            color: '#475569',
                          }}
                          title={app.reason || 'General Consultation'}
                        >
                          {app.reason || 'General Consultation'}
                        </div>
                        {app.type && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Type: {app.type}
                          </span>
                        )}
                      </td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Quick Check-in button */}
                          {!isCheckedIn && !isCancelled && (
                            <button
                              type="button"
                              className="rec-btn rec-btn--primary rec-btn--sm"
                              onClick={() => handleCheckIn(app)}
                              disabled={actionLoadingId === app._id}
                              title="Check In Patient"
                            >
                              <CheckCircle2 size={14} />
                              <span>{actionLoadingId === app._id ? 'Checking In...' : 'Check-In'}</span>
                            </button>
                          )}

                          {/* Details Button */}
                          <button
                            type="button"
                            className="rec-btn rec-btn--secondary rec-btn--sm"
                            onClick={() => setSelectedAppointment(app)}
                            title="View Full Appointment Details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Reschedule Button */}
                          {!isCancelled && app.status !== 'Completed' && (
                            <button
                              type="button"
                              className="rec-btn rec-btn--secondary rec-btn--sm"
                              onClick={() =>
                                setRescheduleModal({
                                  open: true,
                                  appointment: app,
                                  newDate: app.date ? new Date(app.date).toISOString().split('T')[0] : getTodayStr(),
                                  newTime: app.timeSlot || '10:00 AM - 10:30 AM',
                                  reason: '',
                                })
                              }
                              title="Reschedule Appointment"
                            >
                              <CalendarClock size={14} />
                            </button>
                          )}

                          {/* Cancel Button */}
                          {!isCancelled && app.status !== 'Completed' && (
                            <button
                              type="button"
                              className="rec-btn rec-btn--secondary rec-btn--sm"
                              style={{ color: '#ef4444', borderColor: '#fecaca' }}
                              onClick={() =>
                                setCancelModal({
                                  open: true,
                                  appointment: app,
                                  reason: '',
                                })
                              }
                              title="Cancel Appointment"
                            >
                              <XCircle size={14} />
                            </button>
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

        {/* Pagination Controls */}
        {filteredAppointments.length > itemsPerPage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderTop: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of{' '}
              {filteredAppointments.length} records
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="rec-btn rec-btn--secondary rec-btn--sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                .map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`rec-btn rec-btn--sm ${
                      currentPage === num ? 'rec-btn--primary' : 'rec-btn--secondary'
                    }`}
                    style={{ minWidth: '32px', padding: '0.35rem 0.6rem' }}
                    onClick={() => setCurrentPage(num)}
                  >
                    {num}
                  </button>
                ))}
              <button
                type="button"
                className="rec-btn rec-btn--secondary rec-btn--sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="rec-modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div
            className="rec-modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rec-modal-header">
              <div>
                <h3 className="rec-modal-title">Appointment Details</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ID: {selectedAppointment._id}
                </div>
              </div>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setSelectedAppointment(null)}
              >
                ×
              </button>
            </div>
            <div className="rec-modal-body">
              {/* Patient Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#0891b2',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                  }}
                >
                  {(selectedAppointment.patient?.firstName || 'P').charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
                    {selectedAppointment.patient?.firstName} {selectedAppointment.patient?.lastName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Patient ID: {selectedAppointment.patient?.patientId || 'N/A'} • Phone:{' '}
                    {selectedAppointment.patient?.phone || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Email: {selectedAppointment.patient?.email || 'N/A'} • Blood Group:{' '}
                    {selectedAppointment.patient?.bloodGroup || 'Not Recorded'}
                  </div>
                </div>
                {selectedAppointment.patient && onSelectPatient && (
                  <button
                    type="button"
                    className="rec-btn rec-btn--secondary rec-btn--sm"
                    onClick={() => {
                      onSelectPatient(selectedAppointment.patient);
                      setSelectedAppointment(null);
                    }}
                  >
                    View Record
                  </button>
                )}
              </div>

              {/* Grid of details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DOCTOR</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
                    Dr. {selectedAppointment.doctor?.firstName} {selectedAppointment.doctor?.lastName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#0891b2' }}>
                    {selectedAppointment.department?.name || 'Department Clinic'}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SCHEDULE</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
                    {selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selectedAppointment.timeSlot || 'Scheduled Slot'}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>STATUS</div>
                  <div style={{ marginTop: '0.35rem' }}>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>

              {/* Consultation Reason */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.35rem' }}>
                  REASON FOR VISIT / CLINICAL NOTES
                </div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {selectedAppointment.reason || 'General health consultation and check-up.'}
                </div>
                {selectedAppointment.cancellationReason && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#b91c1c', fontSize: '0.82rem' }}>
                    <strong>Note:</strong> {selectedAppointment.cancellationReason}
                  </div>
                )}
              </div>
            </div>
            <div className="rec-modal-footer">
              <button
                type="button"
                className="rec-btn rec-btn--secondary"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
              {selectedAppointment.status !== 'Checked In' &&
                selectedAppointment.status !== 'Completed' &&
                selectedAppointment.status !== 'Cancelled' && (
                  <button
                    type="button"
                    className="rec-btn rec-btn--primary"
                    onClick={() => {
                      const app = selectedAppointment;
                      setSelectedAppointment(null);
                      handleCheckIn(app);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Check In Now</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.open && (
        <div className="rec-modal-overlay" onClick={() => setRescheduleModal({ open: false, appointment: null, newDate: '', newTime: '', reason: '' })}>
          <div className="rec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title">Reschedule Appointment</h3>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setRescheduleModal({ open: false, appointment: null, newDate: '', newTime: '', reason: '' })}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="rec-modal-body">
                <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Rescheduling consultation for{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {rescheduleModal.appointment?.patient?.firstName} {rescheduleModal.appointment?.patient?.lastName}
                  </strong>{' '}
                  with{' '}
                  <strong style={{ color: '#0891b2' }}>
                    Dr. {rescheduleModal.appointment?.doctor?.firstName} {rescheduleModal.appointment?.doctor?.lastName}
                  </strong>
                  .
                </p>

                <div className="rec-form-group">
                  <label className="rec-form-label">New Appointment Date *</label>
                  <input
                    type="date"
                    required
                    min={getTodayStr()}
                    value={rescheduleModal.newDate}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Preferred Time Slot *</label>
                  <select
                    required
                    value={rescheduleModal.newTime}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, newTime: e.target.value })}
                    className="rec-form-select"
                  >
                    <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                    <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="10:30 AM - 11:00 AM">10:30 AM - 11:00 AM</option>
                    <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                    <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                    <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                    <option value="03:00 PM - 03:30 PM">03:00 PM - 03:30 PM</option>
                    <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                  </select>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Reason for Rescheduling</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Patient requested morning slot change"
                    value={rescheduleModal.reason}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                    className="rec-form-input"
                  />
                </div>
              </div>
              <div className="rec-modal-footer">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={() => setRescheduleModal({ open: false, appointment: null, newDate: '', newTime: '', reason: '' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rec-btn rec-btn--primary"
                  disabled={actionLoadingId !== null}
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal.open && (
        <div className="rec-modal-overlay" onClick={() => setCancelModal({ open: false, appointment: null, reason: '' })}>
          <div className="rec-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ color: '#ef4444' }}>
                Cancel Appointment
              </h3>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setCancelModal({ open: false, appointment: null, reason: '' })}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCancelSubmit}>
              <div className="rec-modal-body">
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                  Are you sure you want to cancel the appointment for{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {cancelModal.appointment?.patient?.firstName} {cancelModal.appointment?.patient?.lastName}
                  </strong>
                  ?
                </p>

                <div className="rec-form-group">
                  <label className="rec-form-label">Cancellation Reason *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter reason (e.g. Patient unable to attend, emergency conflict)..."
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                    className="rec-form-input"
                  />
                </div>
              </div>
              <div className="rec-modal-footer">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={() => setCancelModal({ open: false, appointment: null, reason: '' })}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="rec-btn rec-btn--danger"
                  disabled={actionLoadingId !== null}
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
