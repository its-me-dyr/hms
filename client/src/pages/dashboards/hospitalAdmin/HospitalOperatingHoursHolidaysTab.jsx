/**
 * Hospital Admin Portal — Operating Hours & Holidays
 * 
 * Clean, production-ready, backend-integrated weekly operating schedule
 * and holiday closures management.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Helper: Convert 12h "09:00 AM" to 24h "09:00" for <input type="time" />
function toTime24(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '08:00';
  const trimmed = timeStr.trim().toUpperCase();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridiem = match12[3];
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return `${String(match24[1]).padStart(2, '0')}:${match24[2]}`;
  }
  return '08:00';
}

// Helper: Convert 24h "09:00" or 12h to display string "09:00 AM"
function toTime12(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '08:00 AM';
  const trimmed = timeStr.trim().toUpperCase();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    const hours = String(parseInt(match12[1], 10)).padStart(2, '0');
    return `${hours}:${match12[2]} ${match12[3]}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`;
  }
  return timeStr;
}

// Helper: Parse time string to minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const time24 = toTime24(timeStr);
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Helper: Format date for clean display
function formatHolidayDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }
    return dateStr;
  } catch (_) {
    return dateStr;
  }
}

export default function HospitalOperatingHoursHolidaysTab({ onScheduleChange }) {
  // ─── 1. State ───
  const [operatingHours, setOperatingHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ─── 2. Row-by-Row Editing State for Weekly Hours ───
  const [editingDay, setEditingDay] = useState(null); // day name currently editing
  const [editRowData, setEditRowData] = useState({
    isClosed: false,
    openTime: '08:00 AM',
    closeTime: '08:00 PM',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // ─── 3. Add Holiday Modal State ───
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    description: '',
  });
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayFormError, setHolidayFormError] = useState('');

  // ─── 4. Delete Holiday Confirmation State ───
  const [deleteConfirmHoliday, setDeleteConfirmHoliday] = useState(null);
  const [deletingHoliday, setDeletingHoliday] = useState(false);

  // ─── Feedback Helpers ───
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // ─── Fetch Data ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hospitalAdminService.getOperatingHoursAndHolidays();
      const data = res.data?.data || {};

      // Ensure all 7 days Monday-Sunday exist in standard order
      const rawHours = data.operatingHours || [];
      const normalizedHours = DAYS_OF_WEEK.map((dayName) => {
        const existing = rawHours.find(
          (h) => String(h.day).toLowerCase() === dayName.toLowerCase()
        );
        if (existing) {
          return {
            day: dayName,
            openTime: toTime12(existing.openTime || '08:00 AM'),
            closeTime: toTime12(existing.closeTime || '08:00 PM'),
            isClosed: Boolean(existing.isClosed),
          };
        }
        return {
          day: dayName,
          openTime: '08:00 AM',
          closeTime: '08:00 PM',
          isClosed: dayName === 'Sunday',
        };
      });

      setOperatingHours(normalizedHours);

      // Sort holidays chronologically
      const rawHolidays = data.holidays || [];
      const sortedHolidays = [...rawHolidays].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
      setHolidays(sortedHolidays);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load operating hours and holidays.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Edit Operating Hours Handlers ───
  const handleStartEdit = (daySchedule) => {
    setEditingDay(daySchedule.day);
    setScheduleError('');
    setEditRowData({
      isClosed: Boolean(daySchedule.isClosed),
      openTime: daySchedule.openTime || '08:00 AM',
      closeTime: daySchedule.closeTime || '08:00 PM',
    });
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
    setScheduleError('');
  };

  const handleSaveDaySchedule = async (dayName) => {
    setScheduleError('');

    // Validation
    if (!editRowData.isClosed) {
      if (!editRowData.openTime || !editRowData.closeTime) {
        setScheduleError('Opening time and closing time are required when open.');
        return;
      }
      const openMins = parseTimeToMinutes(editRowData.openTime);
      const closeMins = parseTimeToMinutes(editRowData.closeTime);

      if (openMins === null || closeMins === null) {
        setScheduleError('Please enter valid times.');
        return;
      }
      if (openMins === closeMins) {
        setScheduleError('Opening time and closing time cannot be identical.');
        return;
      }
      if (closeMins < openMins) {
        setScheduleError('Closing time must be after opening time.');
        return;
      }
    }

    setSavingSchedule(true);
    try {
      // Build updated list
      const updatedList = operatingHours.map((h) => {
        if (h.day === dayName) {
          return {
            day: dayName,
            isClosed: editRowData.isClosed,
            openTime: toTime12(editRowData.openTime),
            closeTime: toTime12(editRowData.closeTime),
          };
        }
        return h;
      });

      const res = await hospitalAdminService.updateOperatingHours({
        operatingHours: updatedList,
      });

      // Update state with backend response
      const savedHours = res.data?.data || updatedList;
      const normalizedSaved = DAYS_OF_WEEK.map((d) => {
        const found = savedHours.find(
          (h) => String(h.day).toLowerCase() === d.toLowerCase()
        );
        return (
          found || {
            day: d,
            openTime: '08:00 AM',
            closeTime: '08:00 PM',
            isClosed: d === 'Sunday',
          }
        );
      });

      setOperatingHours(normalizedSaved);
      setEditingDay(null);
      showSuccess('Operating hours updated successfully.');
      if (onScheduleChange) onScheduleChange();
    } catch (err) {
      setScheduleError(
        err.response?.data?.message || 'Failed to update operating schedule.'
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  // ─── Add Holiday Handlers ───
  const handleOpenAddHoliday = () => {
    setHolidayForm({ name: '', date: '', description: '' });
    setHolidayFormError('');
    setHolidayModalOpen(true);
  };

  const handleCloseAddHoliday = () => {
    if (savingHoliday) return;
    setHolidayModalOpen(false);
    setHolidayFormError('');
  };

  const handleSaveHolidaySubmit = async (e) => {
    e.preventDefault();
    setHolidayFormError('');

    const trimmedName = holidayForm.name.trim();
    const trimmedDate = holidayForm.date.trim();

    if (!trimmedName) {
      setHolidayFormError('Holiday name is required.');
      return;
    }
    if (!trimmedDate) {
      setHolidayFormError('Holiday date is required.');
      return;
    }

    // Client-side duplicate check
    const isDuplicate = holidays.some((h) => h.date === trimmedDate);
    if (isDuplicate) {
      setHolidayFormError(`A holiday is already scheduled for ${trimmedDate}.`);
      return;
    }

    setSavingHoliday(true);
    try {
      const res = await hospitalAdminService.saveHoliday({
        name: trimmedName,
        date: trimmedDate,
        description: holidayForm.description.trim(),
      });

      const updatedHolidays = res.data?.data || [];
      const sorted = [...updatedHolidays].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
      setHolidays(sorted);
      setHolidayModalOpen(false);
      setHolidayForm({ name: '', date: '', description: '' });
      showSuccess('Holiday added successfully.');
      if (onScheduleChange) onScheduleChange();
    } catch (err) {
      setHolidayFormError(
        err.response?.data?.message || 'Failed to add holiday.'
      );
    } finally {
      setSavingHoliday(false);
    }
  };

  // ─── Delete Holiday Handlers ───
  const handleConfirmDeleteHoliday = async () => {
    if (!deleteConfirmHoliday) return;
    setDeletingHoliday(true);
    try {
      const res = await hospitalAdminService.deleteHoliday(deleteConfirmHoliday._id);
      const updatedHolidays = res.data?.data || holidays.filter((h) => h._id !== deleteConfirmHoliday._id);
      const sorted = [...updatedHolidays].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );
      setHolidays(sorted);
      setDeleteConfirmHoliday(null);
      showSuccess('Holiday removed successfully.');
      if (onScheduleChange) onScheduleChange();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove holiday.');
    } finally {
      setDeletingHoliday(false);
    }
  };

  // ─── Initial Loading State ───
  if (loading) {
    return (
      <div>
        <div className="ha-page-header">
          <div className="ha-page-header__left">
            <h1 className="ha-page-title">Operating Hours & Holidays</h1>
            <p className="ha-page-description">
              Manage your hospital&apos;s weekly operating schedule and holiday closures.
            </p>
          </div>
        </div>
        <div
          className="ha-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            gap: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Loader2 size={24} className="ha-spinner" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading operating hours & holidays...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Compact Header ─── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title">Operating Hours & Holidays</h1>
          <p className="ha-page-description">
            Manage your hospital&apos;s weekly operating schedule and holiday closures.
          </p>
        </div>
      </div>

      {/* ─── Alerts ─── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="ha-alert ha-alert--error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION A: WEEKLY OPERATING HOURS                                   */}
      {/* =================================================================== */}
      <div className="ha-panel">
        <div className="ha-panel__header">
          <h2 className="ha-panel__title">
            <Clock size={18} color="#0891B2" />
            Weekly Operating Hours
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Regular clinical & outpatient consultation hours
          </span>
        </div>

        <div className="ha-panel__body" style={{ padding: 0 }}>
          {scheduleError && (
            <div
              className="ha-alert ha-alert--error"
              style={{ margin: '1rem 1.25rem 0.5rem 1.25rem' }}
            >
              <AlertCircle size={16} />
              <span>{scheduleError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {operatingHours.map((schedule) => {
              const isEditing = editingDay === schedule.day;

              return (
                <div
                  key={schedule.day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: isEditing ? 'var(--bg-surface)' : 'transparent',
                    transition: 'background 0.15s ease',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  {/* Left: Day & Status */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      minWidth: '220px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        color: 'var(--text-primary)',
                        width: '110px',
                      }}
                    >
                      {schedule.day}
                    </span>

                    {/* Status Badge */}
                    {!isEditing && (
                      <span
                        className={`ha-badge ${
                          schedule.isClosed ? 'ha-badge--secondary' : 'ha-badge--success'
                        }`}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                        }}
                      >
                        {schedule.isClosed ? 'Closed' : 'Open'}
                      </span>
                    )}
                  </div>

                  {/* Middle / Right: Viewing vs Editing */}
                  {!isEditing ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flex: 1,
                        gap: '2rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Hours Display */}
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: schedule.isClosed
                            ? 'var(--text-secondary)'
                            : 'var(--text-primary)',
                          fontWeight: schedule.isClosed ? 400 : 500,
                          minWidth: '180px',
                          textAlign: 'right',
                        }}
                      >
                        {schedule.isClosed ? (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Closed all day
                          </span>
                        ) : (
                          <span>
                            <strong>{schedule.openTime}</strong>
                            <span style={{ margin: '0 0.5rem', color: 'var(--text-secondary)' }}>
                              —
                            </span>
                            <strong>{schedule.closeTime}</strong>
                          </span>
                        )}
                      </div>

                      {/* Edit Action Button */}
                      <button
                        className="ha-btn ha-btn--secondary ha-btn--sm"
                        onClick={() => handleStartEdit(schedule)}
                        title={`Edit ${schedule.day} schedule`}
                        style={{ minWidth: '70px' }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </div>
                  ) : (
                    /* ─── Inline Editing Row ─── */
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flex: 1,
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Open / Closed Switcher */}
                      <div
                        style={{
                          display: 'inline-flex',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          background: 'var(--bg-input)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setEditRowData((prev) => ({ ...prev, isClosed: false }))
                          }
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background: !editRowData.isClosed
                              ? 'var(--color-primary)'
                              : 'transparent',
                            color: !editRowData.isClosed
                              ? '#ffffff'
                              : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditRowData((prev) => ({ ...prev, isClosed: true }))
                          }
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background: editRowData.isClosed
                              ? '#64748B'
                              : 'transparent',
                            color: editRowData.isClosed
                              ? '#ffffff'
                              : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Closed
                        </button>
                      </div>

                      {/* Time Inputs (when open) */}
                      {!editRowData.isClosed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="time"
                            value={toTime24(editRowData.openTime)}
                            onChange={(e) =>
                              setEditRowData((prev) => ({
                                ...prev,
                                openTime: toTime12(e.target.value),
                              }))
                            }
                            aria-label={`Opening time for ${schedule.day}`}
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              width: '110px',
                            }}
                          />
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            to
                          </span>
                          <input
                            type="time"
                            value={toTime24(editRowData.closeTime)}
                            onChange={(e) =>
                              setEditRowData((prev) => ({
                                ...prev,
                                closeTime: toTime12(e.target.value),
                              }))
                            }
                            aria-label={`Closing time for ${schedule.day}`}
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.8125rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              width: '110px',
                            }}
                          />
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            padding: '0 0.5rem',
                          }}
                        >
                          Facility closed all day
                        </span>
                      )}

                      {/* Save & Cancel Buttons */}
                      <button
                        className="ha-btn ha-btn--primary ha-btn--sm"
                        onClick={() => handleSaveDaySchedule(schedule.day)}
                        disabled={savingSchedule}
                      >
                        {savingSchedule ? (
                          <>
                            <Loader2 size={12} className="ha-spinner" /> Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                      <button
                        className="ha-btn ha-btn--secondary ha-btn--sm"
                        onClick={handleCancelEdit}
                        disabled={savingSchedule}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION B: HOLIDAYS                                                 */}
      {/* =================================================================== */}
      <div className="ha-panel" style={{ marginTop: '1.5rem' }}>
        <div className="ha-panel__header">
          <h2 className="ha-panel__title">
            <Calendar size={18} color="#0891B2" />
            Holidays
          </h2>
          <button
            className="ha-btn ha-btn--primary ha-btn--sm"
            onClick={handleOpenAddHoliday}
          >
            <Plus size={14} /> Add Holiday
          </button>
        </div>

        <div className="ha-panel__body" style={{ padding: 0 }}>
          {holidays.length > 0 ? (
            <div className="ha-table-container" style={{ margin: 0 }}>
              <table className="ha-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Holiday Name</th>
                    <th style={{ width: '25%' }}>Date</th>
                    <th style={{ width: '30%' }}>Description</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h._id || h.date}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{h.name}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.8125rem',
                              background: 'var(--bg-surface)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {h.date}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({formatHolidayDate(h.date)})
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {h.description || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="ha-btn ha-btn--danger ha-btn--sm"
                          onClick={() => setDeleteConfirmHoliday(h)}
                          title={`Remove ${h.name}`}
                          aria-label={`Remove holiday ${h.name}`}
                          style={{ padding: '0.35rem 0.5rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ─── Compact Empty State ─── */
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Calendar
                size={40}
                color="#0891B2"
                style={{ opacity: 0.6, marginBottom: '0.75rem' }}
              />
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem 0',
                }}
              >
                No holidays configured yet.
              </p>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  margin: '0 0 1.25rem 0',
                }}
              >
                Add scheduled holiday dates to notify patients and staff of hospital closures.
              </p>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={handleOpenAddHoliday}
              >
                <Plus size={14} /> Add Holiday
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* ADD HOLIDAY MODAL                                                   */}
      {/* =================================================================== */}
      {holidayModalOpen && (
        <div
          className="ha-modal-overlay"
          onClick={handleCloseAddHoliday}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-holiday-title"
        >
          <div
            className="ha-modal"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ha-modal__header">
              <h3 id="add-holiday-title" className="ha-modal__title">
                <Calendar size={18} color="#0891B2" />
                Add Holiday
              </h3>
              <button
                className="ha-modal__close"
                onClick={handleCloseAddHoliday}
                disabled={savingHoliday}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveHolidaySubmit}>
              <div className="ha-modal__body">
                {holidayFormError && (
                  <div
                    className="ha-alert ha-alert--error"
                    style={{ marginBottom: '1rem' }}
                  >
                    <AlertCircle size={15} />
                    <span>{holidayFormError}</span>
                  </div>
                )}

                <div className="ha-form-group">
                  <label htmlFor="holiday-name">
                    Holiday Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="holiday-name"
                    type="text"
                    required
                    placeholder="e.g. Independence Day"
                    value={holidayForm.name}
                    onChange={(e) =>
                      setHolidayForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={savingHoliday}
                    autoFocus
                  />
                </div>

                <div className="ha-form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="holiday-date">
                    Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id="holiday-date"
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) =>
                      setHolidayForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    disabled={savingHoliday}
                  />
                </div>

                <div className="ha-form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="holiday-description">Description (Optional)</label>
                  <input
                    id="holiday-description"
                    type="text"
                    placeholder="e.g. Emergency care available 24/7"
                    value={holidayForm.description}
                    onChange={(e) =>
                      setHolidayForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    disabled={savingHoliday}
                  />
                </div>
              </div>

              <div className="ha-modal__footer">
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={handleCloseAddHoliday}
                  disabled={savingHoliday}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={savingHoliday}
                >
                  {savingHoliday ? (
                    <>
                      <Loader2 size={14} className="ha-spinner" /> Adding...
                    </>
                  ) : (
                    'Add Holiday'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DELETE HOLIDAY CONFIRMATION MODAL                                  */}
      {/* =================================================================== */}
      {deleteConfirmHoliday && (
        <div
          className="ha-modal-overlay"
          onClick={() => !deletingHoliday && setDeleteConfirmHoliday(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-holiday-title"
        >
          <div
            className="ha-modal"
            style={{ maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ha-modal__header">
              <h3 id="delete-holiday-title" className="ha-modal__title">
                <AlertTriangle size={18} color="#EF4444" />
                Remove Holiday
              </h3>
              <button
                className="ha-modal__close"
                onClick={() => !deletingHoliday && setDeleteConfirmHoliday(null)}
                disabled={deletingHoliday}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ha-modal__body">
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                Are you sure you want to remove this holiday?
              </p>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <strong>{deleteConfirmHoliday.name}</strong>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  Date: <code>{deleteConfirmHoliday.date}</code> ({formatHolidayDate(deleteConfirmHoliday.date)})
                </div>
                {deleteConfirmHoliday.description && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {deleteConfirmHoliday.description}
                  </div>
                )}
              </div>
            </div>

            <div className="ha-modal__footer">
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setDeleteConfirmHoliday(null)}
                disabled={deletingHoliday}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--danger"
                onClick={handleConfirmDeleteHoliday}
                disabled={deletingHoliday}
              >
                {deletingHoliday ? (
                  <>
                    <Loader2 size={14} className="ha-spinner" /> Removing...
                  </>
                ) : (
                  'Remove Holiday'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
