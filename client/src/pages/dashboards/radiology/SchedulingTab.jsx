/**
 * Scheduling & Calendar Tab
 * 
 * Modality slot reservation, room allocation, and patient appointment booking:
 * - Direct intake from Imaging Requests
 * - Date and modality filters
 * - Room / equipment selection with conflict warnings
 * - Pre-procedure preparation checklist assignment
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function SchedulingTab({ activeRequest, onNavigateTab }) {
  const [schedules, setSchedules] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [modalityFilter, setModalityFilter] = useState('');

  // Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState(null);
  const [formData, setFormData] = useState({
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    modality: 'X-Ray',
    equipmentId: '',
    room: '',
    preparationInstructions: '',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // If redirected with an active request to schedule
  useEffect(() => {
    if (activeRequest) {
      setTargetRequest(activeRequest);
      setFormData((prev) => ({
        ...prev,
        modality: activeRequest.modality || 'X-Ray',
        preparationInstructions: activeRequest.instructions || '',
      }));
      setBookingModalOpen(true);
    }
  }, [activeRequest]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      radiologyService.getSchedules({ date: dateFilter, modality: modalityFilter }),
      radiologyService.getEquipment(),
    ])
      .then(([schedRes, equipRes]) => {
        const sList = Array.isArray(schedRes.data) ? schedRes.data : (schedRes.data?.schedules || schedRes.data?.reports || []);
        const eList = Array.isArray(equipRes.data) ? equipRes.data : (equipRes.data?.equipment || []);
        setSchedules(sList);
        setEquipmentList(eList);
      })
      .catch((err) => {
        console.error('Failed to load schedules:', err);
        setError('Failed to fetch radiology appointments.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateFilter, modalityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!targetRequest) {
      alert('Please select a valid imaging request to schedule.');
      return;
    }
    setBookingSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      await radiologyService.createSchedule({
        reportId: targetRequest._id || targetRequest.id,
        scheduledTime: scheduledDateTime,
        equipmentId: formData.equipmentId || undefined,
        room: formData.room,
        preparationInstructions: formData.preparationInstructions,
      });
      setBookingModalOpen(false);
      setTargetRequest(null);
      loadData();
    } catch (err) {
      console.error('Failed to book schedule:', err);
      alert(err.response?.data?.message || 'Error booking appointment slot.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <Calendar size={13} />
            <span>MODALITY CALENDAR & SLOTS</span>
          </div>
          <h1 className="lab-header-title">Radiology Scheduling</h1>
          <p className="lab-header-subtitle">
            Manage imaging room reservations, scanner timeslots, and outpatient appointment bookings.
          </p>
        </div>
        <div className="lab-header-actions">
          <button className="lab-btn lab-btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="lab-btn lab-btn-primary"
            style={{ background: '#6366f1', borderColor: '#4f46e5' }}
            onClick={() => onNavigateTab('requests')}
          >
            <Plus size={15} />
            <span>Schedule from Requests</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="lab-alert-banner lab-alert-banner-error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="lab-btn lab-btn-sm lab-btn-secondary" onClick={loadData} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="lab-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Date</label>
            <input
              type="date"
              className="lab-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Modality</label>
            <select
              className="lab-select"
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
            >
              <option value="">All Modalities</option>
              <option value="X-Ray">X-Ray</option>
              <option value="CT">CT Scanner</option>
              <option value="MRI">MRI</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Mammography">Mammography</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
            <button
              className="lab-btn lab-btn-sm lab-btn-secondary"
              onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
            >
              Today
            </button>
            <button
              className="lab-btn lab-btn-sm lab-btn-secondary"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setDateFilter(tomorrow.toISOString().split('T')[0]);
              }}
            >
              Tomorrow
            </button>
          </div>
        </div>
      </div>

      {/* ── Scheduled Slots Table ── */}
      <div className="lab-card">
        <div className="lab-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <p>Loading scheduled imaging slots...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: '#475569' }}>No imaging studies scheduled for {dateFilter}.</p>
              <p style={{ fontSize: '0.85rem' }}>Select another date or book an appointment from the Requests tab.</p>
            </div>
          ) : (
            <table className="lab-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Patient</th>
                  <th>Procedure / Modality</th>
                  <th>Room / Equipment</th>
                  <th>Preparation Status</th>
                  <th>Workflow Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const timeStr = s.scheduledTime
                    ? new Date(s.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '10:00 AM';
                  return (
                    <tr key={s._id || s.id}>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: '#4338ca' }}>{timeStr}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {s.scheduledTime ? new Date(s.scheduledTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </div>
                      </td>
                      <td>
                        <strong>{s.patient?.fullName || s.patient?.name || 'Patient'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          MRN: {s.patient?.medicalRecordNumber || 'N/A'} • #{s.accessionNumber || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.studyType || s.procedureName}</div>
                        <span className="lab-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                          {s.modality}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {s.equipment?.name || s.room || 'Imaging Suite 1'}
                        </div>
                      </td>
                      <td>
                        <span className={`lab-badge ${
                          s.preparationCompleted ? 'lab-badge-success' : 'lab-badge-warning'
                        }`}>
                          {s.preparationCompleted ? 'PREPARED' : 'NEEDS PREP'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="lab-btn lab-btn-sm lab-btn-secondary"
                            onClick={() => onNavigateTab('preparation', s)}
                            title="Checklist & Consent"
                          >
                            <span>Preparation</span>
                          </button>
                          <button
                            className="lab-btn lab-btn-sm lab-btn-primary"
                            style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                            onClick={() => onNavigateTab('queue', s)}
                            title="Send to Queue"
                          >
                            <span>Check-In</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {bookingModalOpen && targetRequest && (
        <div className="lab-modal-overlay" onClick={() => setBookingModalOpen(false)}>
          <div className="lab-modal" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="lab-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Schedule Diagnostic Study</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Patient: {targetRequest.patient?.fullName || targetRequest.patient?.name}
                </span>
              </div>
              <button className="lab-btn-icon" onClick={() => setBookingModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBookingSubmit}>
              <div className="lab-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem' }}><strong>Procedure:</strong> {targetRequest.studyType || targetRequest.procedureName}</div>
                  <div style={{ fontSize: '0.85rem' }}><strong>Modality:</strong> {targetRequest.modality}</div>
                  <div style={{ fontSize: '0.85rem' }}><strong>Priority:</strong> {targetRequest.priority?.toUpperCase()}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      className="lab-input"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Time Slot *
                    </label>
                    <input
                      type="time"
                      required
                      className="lab-input"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Assigned Room / Suite
                    </label>
                    <input
                      type="text"
                      className="lab-input"
                      placeholder="e.g. MRI Suite A"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                      Equipment Unit
                    </label>
                    <select
                      className="lab-select"
                      value={formData.equipmentId}
                      onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Equipment (Optional)</option>
                      {equipmentList.map((eq) => (
                        <option key={eq._id || eq.id} value={eq._id || eq.id}>
                          {eq.name} ({eq.modality})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    Patient Preparation Instructions
                  </label>
                  <textarea
                    rows={2}
                    className="lab-textarea"
                    placeholder="e.g. 4 hours fasting required, drink 1L water 30 mins prior, remove metallic jewelry..."
                    value={formData.preparationInstructions}
                    onChange={(e) => setFormData({ ...formData, preparationInstructions: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div className="lab-modal-footer">
                <button type="button" className="lab-btn lab-btn-secondary" onClick={() => setBookingModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lab-btn lab-btn-primary"
                  style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                  disabled={bookingSubmitting}
                >
                  {bookingSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
