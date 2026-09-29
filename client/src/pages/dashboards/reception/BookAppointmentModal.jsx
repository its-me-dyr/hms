/**
 * Book Appointment Modal / Wizard
 * 
 * 6-step front-desk booking workflow:
 * - Step 1: Search / Select Patient
 * - Step 2: Select Department
 * - Step 3: Select Doctor
 * - Step 4: Select Date
 * - Step 5: Select Available Time Slot
 * - Step 6: Appointment Details (Type, Reason, Notes)
 * - Live summary on the right
 * - Success confirmation modal
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileText,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function BookAppointmentModal({
  isOpen,
  onClose,
  initialPatient = null,
  onSuccess,
}) {
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Selected entities
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [appointmentType, setAppointmentType] = useState('General Consultation');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setStep(2);
    }
  }, [initialPatient]);

  // Load departments and doctors
  useEffect(() => {
    if (!isOpen) return;
    receptionService
      .getDepartments()
      .then((res) => setDepartments(res.data || res || []))
      .catch((err) => console.error('Error fetching departments:', err));

    receptionService
      .getDoctors()
      .then((res) => setDoctors(res.data || res || []))
      .catch((err) => console.error('Error fetching doctors:', err));
  }, [isOpen]);

  // Search patients
  useEffect(() => {
    if (!isOpen || step !== 1 || !patientSearch.trim()) return;
    const timeout = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const res = await receptionService.getPatients({ search: patientSearch.trim(), limit: 5 });
        setPatients(res.data?.patients || []);
      } catch (err) {
        console.error('Failed to search patients:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, isOpen, step]);

  if (!isOpen) return null;

  // Filter doctors by selected department
  const filteredDoctors = selectedDepartment
    ? doctors.filter((d) => d.department.toLowerCase() === selectedDepartment.toLowerCase())
    : doctors;

  // Available time slots from doctor
  const availableSlots = selectedDoctor?.availableTimeSlots || [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
  ];

  const handleConfirmBooking = async () => {
    if (!selectedPatient?._id && !selectedPatient?.id) {
      setError('Please select a patient.');
      return;
    }
    if (!selectedDoctor?.id && !selectedDoctor?._id) {
      setError('Please select a doctor.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an appointment time slot.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the appointment.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        patientId: selectedPatient._id || selectedPatient.id,
        doctorId: selectedDoctor._id || selectedDoctor.id,
        department: selectedDepartment || selectedDoctor.department || 'General Medicine',
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot,
        appointmentType,
        reason: reason.trim(),
        notes: notes.trim(),
        consultationFee: selectedDoctor.consultationFee || 50,
      };

      const res = await receptionService.bookAppointment(payload);
      setConfirmedBooking(res.data || res);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Booking failed:', err);
      setError(err.message || 'Failed to book appointment. Please check availability.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedPatient(null);
    setSelectedDepartment('');
    setSelectedDoctor(null);
    setSelectedSlot('');
    setReason('');
    setNotes('');
    setConfirmedBooking(null);
    setError('');
  };

  return (
    <div className="hms-modal-backdrop" onClick={onClose}>
      <div
        className="hms-modal"
        style={{ maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto', textAlign: 'left', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Schedule Hospital Appointment
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Front-desk consultation booking workflow</span>
          </div>
          <button onClick={onClose} className="btn btn--outline btn--sm" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="alert alert--danger" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ─── SUCCESS CONFIRMATION ──────────────────────────── */}
        {confirmedBooking ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div className="hms-modal__icon" style={{ background: '#ecfdf5', color: '#059669', margin: '0 auto 1rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Appointment Booked Successfully!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem' }}>
              The consultation has been added to today&apos;s schedule and patient file.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.15rem',
                maxWidth: '460px',
                margin: '0 auto 1.5rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Appointment ID:</span>
                <strong style={{ color: '#0891b2' }}>{confirmedBooking.appointmentId || confirmedBooking.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Patient:</span>
                <strong style={{ color: '#0f172a' }}>{confirmedBooking.patientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Physician:</span>
                <strong style={{ color: '#0f172a' }}>{confirmedBooking.doctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Date & Time:</span>
                <strong style={{ color: '#0f172a' }}>
                  {new Date(confirmedBooking.appointmentDate).toLocaleDateString()} at {confirmedBooking.appointmentTime}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Consultation Fee:</span>
                <strong style={{ color: '#059669' }}>${confirmedBooking.consultationFee || 50}.00</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn--outline btn--sm"
              >
                <Printer size={14} />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="btn btn--primary btn--sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ─── 2 COLUMN BOOKING INTERFACE ────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.1fr)', gap: '1.5rem' }}>
            {/* Left Steps Panel */}
            <div>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: step >= i ? '#0891b2' : '#e2e8f0',
                    }}
                  />
                ))}
              </div>

              {/* STEP 1: Search Patient */}
              {step === 1 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 1: Select Patient
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748b' }}>
                    Lookup patient by name, ID, or phone number.
                  </p>

                  <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <Search
                      size={15}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type patient name or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>

                  {searchingPatients ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>Searching...</div>
                  ) : patients.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {patients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setStep(2);
                          }}
                          style={{
                            padding: '0.65rem 0.85rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: selectedPatient?.id === p.id ? '#f0fdfa' : '#ffffff',
                            borderColor: selectedPatient?.id === p.id ? '#0891b2' : '#e2e8f0',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{p.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {p.patientId} • Phone: {p.phone}</div>
                          </div>
                          <button className="btn btn--outline btn--sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : patientSearch.length > 2 ? (
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                      No patients matching &quot;{patientSearch}&quot;.
                    </p>
                  ) : null}
                </div>
              )}

              {/* STEP 2: Department */}
              {step === 2 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 2: Select Medical Department
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.75rem' }}>
                    {departments.map((dept) => (
                      <button
                        key={dept._id || dept.code || dept.name}
                        type="button"
                        onClick={() => {
                          setSelectedDepartment(dept.name);
                          setStep(3);
                        }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: selectedDepartment === dept.name ? '#0891b2' : '#e2e8f0',
                          background: selectedDepartment === dept.name ? '#f0fdfa' : '#ffffff',
                          color: '#0f172a',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {dept.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Doctor */}
              {step === 3 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 3: Select Physician ({selectedDepartment || 'All Departments'})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {filteredDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setStep(4);
                        }}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: selectedDoctor?.id === doc.id ? '#0891b2' : '#e2e8f0',
                          background: selectedDoctor?.id === doc.id ? '#f0fdfa' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{doc.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {doc.specialization} • {doc.department}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>
                            ${doc.consultationFee || 50}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Date Selection */}
              {step === 4 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 4: Select Appointment Date
                  </h4>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Consultation Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="form-input"
                      style={{ height: '42px' }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Time Slot */}
              {step === 5 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 5: Select Available Time Slot
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: selectedSlot === slot ? '#0891b2' : '#e2e8f0',
                          background: selectedSlot === slot ? '#0891b2' : '#f8fafc',
                          color: selectedSlot === slot ? '#ffffff' : '#0f172a',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 6: Details (Reason & Notes) */}
              {step === 6 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '0.95rem' }}>
                    Step 6: Consultation Details
                  </h4>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Visit Type</label>
                    <select
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value)}
                      className="form-input"
                    >
                      <option value="General Consultation">General Consultation</option>
                      <option value="Follow-up Review">Follow-up Review</option>
                      <option value="Routine Checkup">Routine Checkup</option>
                      <option value="Specialist Evaluation">Specialist Evaluation</option>
                      <option value="Pre-Operative Check">Pre-Operative Check</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Symptoms / Reason *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chest pain, persistent cough, routine follow-up"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Front Desk Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Any additional notes for the nurse or attending physician..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="form-input"
                      style={{ height: 'auto' }}
                    />
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="btn btn--outline btn--sm"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                {step < 6 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(6, s + 1))}
                    className="btn btn--primary btn--sm"
                  >
                    <span>Next</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmBooking}
                    className="btn btn--primary btn--sm"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Summary Sidebar Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.15rem',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.85rem', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem' }}>
                  Booking Summary
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>PATIENT</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedPatient ? selectedPatient.name : '— Not selected'}
                    </strong>
                    {selectedPatient?.patientId && (
                      <span style={{ fontSize: '0.72rem', color: '#0891b2', display: 'block' }}>
                        ID: {selectedPatient.patientId}
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>DEPARTMENT</span>
                    <strong style={{ color: '#0f172a' }}>{selectedDepartment || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>DOCTOR</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedDoctor ? selectedDoctor.name : '—'}
                    </strong>
                    {selectedDoctor?.specialization && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                        {selectedDoctor.specialization}
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>DATE & TIME</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedDate} {selectedSlot && `at ${selectedSlot}`}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>ESTIMATED FEE</span>
                    <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.95rem' }}>
                      ${selectedDoctor?.consultationFee || 50}.00
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem' }}>
                HMS Front Desk Scheduling Engine v1.0
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
