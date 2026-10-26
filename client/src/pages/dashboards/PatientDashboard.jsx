/**
 * Patient Dashboard & Complete Patient Portal
 * 
 * Integrated patient portal with real MongoDB persistence:
 * 1. Overview Dashboard (Real-time clinical metrics, upcoming appointment banner, alerts)
 * 2. My Profile (Personal details, medical ID, editable contact/emergency fields)
 * 3. My Appointments & Appointment Details (Filter by status, view details modal, cancellation)
 * 4. Book Appointment (Department & doctor selection, slot picker, double-booking prevention)
 * 5. Medical Records (Consultation history, diagnoses, clinical notes, vitals)
 * 6. Prescriptions (Medications, dosage, frequency, instructions, viewable cards)
 * 7. Lab Reports (Diagnostic orders, parameter findings with reference ranges and flags)
 * 8. Radiology Reports (X-Ray, MRI, CT, Ultrasound findings and radiologist impressions)
 * 9. Bills & Payments (Itemized invoices, fee breakdown, payment simulation modal)
 * 10. Notifications (Alerts, reminders, mark-as-read controls)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { patientService } from '../../services/patient.service';
import {
  User,
  Calendar,
  Stethoscope,
  History,
  Pill,
  Microscope,
  Image as ImageIcon,
  CreditCard,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  MapPin,
  Activity,
  FileText,
  Eye,
  Save,
  Check,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Lock,
  Phone,
} from 'lucide-react';
import CompactPageHeader from './CompactPageHeader';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab synchronized with URL query parameter (?tab=...)
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tabId) => {
    setError('');
    setSearchParams(tabId === 'dashboard' ? {} : { tab: tabId });
  };

  // ─── Global State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Tab-Specific States ───────────────────────────────────────
  // Dashboard Overview
  const [summary, setSummary] = useState(null);

  // Profile
  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: '',
    bloodGroup: '',
    gender: '',
    dateOfBirth: '',
    address: { street: '', city: '', state: '', postalCode: '', country: '' },
    emergencyContact: { name: '', relation: '', phone: '' },
    allergies: '',
  });

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('All');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Booking
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Clinical & Reports
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [radiologyReports, setRadiologyReports] = useState([]);

  // Bills & Payments
  const [bills, setBills] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Credit/Debit Card');
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');

  // Auto-dismiss success alert
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ─── Data Fetchers ─────────────────────────────────────────────

  const fetchDashboardSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getDashboardSummary();
      setSummary(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getProfile();
      setProfile(res.data);
      setProfileForm({
        phone: res.data.phone || '',
        bloodGroup: res.data.bloodGroup || 'Unknown',
        gender: res.data.gender || 'prefer_not_to_say',
        dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : '',
        address: {
          street: res.data.address?.street || '',
          city: res.data.address?.city || '',
          state: res.data.address?.state || '',
          postalCode: res.data.address?.postalCode || '',
          country: res.data.address?.country || '',
        },
        emergencyContact: {
          name: res.data.emergencyContact?.name || '',
          relation: res.data.emergencyContact?.relation || '',
          phone: res.data.emergencyContact?.phone || '',
        },
        allergies: (res.data.allergies || []).join(', '),
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getAppointments({
        status: appointmentFilter !== 'All' ? appointmentFilter : undefined,
      });
      setAppointments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [appointmentFilter]);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getDoctors({
        department: selectedDept !== 'All' ? selectedDept : undefined,
      });
      setDoctors(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load doctor directory.');
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  const fetchMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getMedicalRecords();
      setMedicalRecords(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load medical records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getPrescriptions();
      setPrescriptions(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLabReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getLabReports();
      setLabReports(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load laboratory reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRadiologyReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getRadiologyReports();
      setRadiologyReports(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load radiology reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getBills();
      setBills(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load billing records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data whenever active tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboardSummary();
        break;
      case 'profile':
        fetchProfile();
        break;
      case 'appointments':
        fetchAppointments();
        break;
      case 'book-appointment':
        fetchDoctors();
        break;
      case 'medical-records':
        fetchMedicalRecords();
        break;
      case 'prescriptions':
        fetchPrescriptions();
        break;
      case 'lab-reports':
        fetchLabReports();
        break;
      case 'radiology-reports':
        fetchRadiologyReports();
        break;
      case 'bills':
        fetchBills();
        break;
      case 'notifications':
        fetchNotifications();
        break;
      default:
        fetchDashboardSummary();
    }
  }, [
    activeTab,
    fetchDashboardSummary,
    fetchProfile,
    fetchAppointments,
    fetchDoctors,
    fetchMedicalRecords,
    fetchPrescriptions,
    fetchLabReports,
    fetchRadiologyReports,
    fetchBills,
    fetchNotifications,
  ]);

  // ─── Actions ───────────────────────────────────────────────────

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      const payload = {
        phone: profileForm.phone,
        bloodGroup: profileForm.bloodGroup,
        gender: profileForm.gender,
        dateOfBirth: profileForm.dateOfBirth || null,
        address: profileForm.address,
        emergencyContact: profileForm.emergencyContact,
        allergies: profileForm.allergies
          ? profileForm.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await patientService.updateProfile(payload);
      setProfile(res.data);
      setEditingProfile(false);
      setSuccessMsg('Your patient profile has been updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Book Appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingDoctor || !bookingDate || !bookingTime || !bookingReason) {
      setError('Please select a doctor, appointment date, time slot, and reason for visit.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await patientService.bookAppointment({
        doctorId: bookingDoctor._id,
        department: bookingDoctor.department || 'General Medicine',
        appointmentDate: bookingDate,
        appointmentTime: bookingTime,
        reason: bookingReason,
        notes: bookingNotes,
      });

      setSuccessMsg(`Appointment successfully scheduled with Dr. ${bookingDoctor.firstName} ${bookingDoctor.lastName}!`);
      // Reset booking inputs
      setBookingDoctor(null);
      setBookingDate('');
      setBookingTime('');
      setBookingReason('');
      setBookingNotes('');
      // Navigate to appointments tab
      setActiveTab('appointments');
    } catch (err) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Appointment
  const handleConfirmCancelAppointment = async () => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    setError('');
    try {
      await patientService.cancelAppointment(selectedAppointment._id, cancelReason);
      setSuccessMsg('Appointment has been cancelled.');
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pay Bill
  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!paymentBill) return;

    setActionLoading(true);
    setError('');
    try {
      const res = await patientService.payBill(paymentBill._id, {
        amount: Number(paymentAmount),
        paymentMethod,
      });
      setPaymentReceipt({
        bill: res.data.bill,
        transactionId: res.data.transactionId,
        amount: Number(paymentAmount),
        method: paymentMethod,
        date: new Date().toLocaleString(),
      });
      fetchBills();
    } catch (err) {
      setError(err.message || 'Payment failed to process.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Notification Read
  const handleMarkNotificationRead = async (id) => {
    try {
      await patientService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Non-blocking
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await patientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSuccessMsg('All notifications marked as read.');
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    }
  };

  const getNotificationCategoryInfo = (type) => {
    switch (type) {
      case 'appointment':
        return {
          icon: Calendar,
          label: 'Appointment',
          iconBoxClass: 'notif-icon-box--appointment',
          badgeStyle: { background: '#ecfeff', color: '#0e7490', border: '1px solid #cffafe' },
        };
      case 'lab':
        return {
          icon: Microscope,
          label: 'Lab Report',
          iconBoxClass: 'notif-icon-box--lab',
          badgeStyle: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' },
        };
      case 'radiology':
        return {
          icon: ImageIcon,
          label: 'Radiology',
          iconBoxClass: 'notif-icon-box--radiology',
          badgeStyle: { background: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff' },
        };
      case 'prescription':
        return {
          icon: Pill,
          label: 'Prescription',
          iconBoxClass: 'notif-icon-box--prescription',
          badgeStyle: { background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' },
        };
      case 'billing':
        return {
          icon: CreditCard,
          label: 'Billing',
          iconBoxClass: 'notif-icon-box--billing',
          badgeStyle: { background: '#fefce8', color: '#a16207', border: '1px solid #fef08a' },
        };
      default:
        return {
          icon: Bell,
          label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Alert',
          iconBoxClass: 'notif-icon-box--system',
          badgeStyle: { background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' },
        };
    }
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="patient-portal">
      {/* ─── Feedback Alerts ──────────────────────────────────── */}
      {error && (
        <div
          className="alert alert--danger"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          className="alert alert--success"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            padding: '0.75rem 1rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── Tab Content ──────────────────────────────────────── */}
      {loading && !summary && !profile && appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
          <div className="btn__loading" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Fetching clinical records from database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              {/* ─── Patient Welcome & Quick Actions Card (DASHBOARD ONLY) ── */}
              <div className="patient-welcome-card">
                <div className="patient-welcome-header">
                  <div className="patient-welcome-title-group">
                    <div className="patient-status-badge">
                      <span className="patient-status-dot" />
                      <span>PATIENT PORTAL • Active & Verified</span>
                    </div>
                    <h1 className="patient-welcome-greeting">
                      {getGreeting()}, {user?.firstName || user?.fullName?.split(' ')[0] || 'Patient'}
                    </h1>
                    <p className="patient-welcome-subtext">
                      Here is your health and appointment overview.
                    </p>
                    <div className="patient-meta-row">
                      <span className="patient-meta-pill">
                        Patient ID: <strong>{user?.patientId || summary?.patient?.patientId || 'HMS-P-10042'}</strong>
                      </span>
                      <span className="patient-meta-pill">
                        Blood Group: <strong className="patient-blood-highlight">{user?.bloodGroup || summary?.patient?.bloodGroup || profile?.bloodGroup || 'O+'}</strong>
                      </span>
                      <span className="patient-meta-pill">
                        Account: <strong>{user?.email}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clean Quick Actions Bar */}
                <div className="patient-quick-actions-bar">
                  <span className="patient-quick-actions-label">
                    Quick Actions
                  </span>
                  <div className="patient-quick-actions-group">
                    <button
                      onClick={() => setActiveTab('book-appointment')}
                      className="btn btn--primary btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                      <Plus size={15} />
                      <span>Book Appointment</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="btn btn--outline btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)' }}
                    >
                      <Calendar size={15} />
                      <span>View Appointments</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('medical-records')}
                      className="btn btn--outline btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)' }}
                    >
                      <FileText size={15} />
                      <span>Medical Records</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('prescriptions')}
                      className="btn btn--outline btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)' }}
                    >
                      <Pill size={15} />
                      <span>Prescriptions</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('bills')}
                      className="btn btn--outline btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)' }}
                    >
                      <CreditCard size={15} />
                      <span>Pay Bills</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* UPCOMING APPOINTMENT - HIGH PRIORITY SECTION */}
              <div className="patient-upcoming-container">
                <div className="patient-section-header">
                  <h2 className="patient-section-title">
                    <Calendar size={18} style={{ color: '#0891b2' }} />
                    <span>Upcoming Appointment</span>
                  </h2>
                  {summary?.upcomingAppointment && (
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="patient-section-link"
                    >
                      View All Appointments →
                    </button>
                  )}
                </div>

                {summary?.upcomingAppointment ? (
                  <div className="patient-upcoming-card">
                    <div className="patient-doctor-group">
                      <div className="patient-doctor-icon">
                        <Stethoscope size={24} />
                      </div>
                      <div className="patient-doctor-details">
                        <div className="patient-doctor-badges">
                          <span className="badge" style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700, fontSize: '0.72rem' }}>
                            {summary.upcomingAppointment.status}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#0891b2', fontWeight: 600 }}>
                            {summary.upcomingAppointment.department}
                          </span>
                        </div>
                        <h3 className="patient-doctor-name">
                          Dr. {summary.upcomingAppointment.doctor?.firstName} {summary.upcomingAppointment.doctor?.lastName}
                          {summary.upcomingAppointment.doctor?.specialization && (
                            <span className="patient-doctor-spec">
                              {' '}• {summary.upcomingAppointment.doctor.specialization}
                            </span>
                          )}
                        </h3>
                        <div className="patient-schedule-info">
                          <span className="patient-schedule-item">
                            <Clock size={15} style={{ color: '#0891b2' }} />
                            <strong>
                              {new Date(summary.upcomingAppointment.appointmentDate).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}{' '}
                              at {summary.upcomingAppointment.appointmentTime}
                            </strong>
                          </span>
                          <span className="patient-schedule-item" style={{ color: 'var(--text-secondary)' }}>
                            <MapPin size={15} style={{ color: 'var(--text-secondary)' }} />
                            Main Hospital, OPD Wing B (Room 302)
                          </span>
                        </div>
                        {summary.upcomingAppointment.reason && (
                          <p className="patient-appointment-reason">
                            "{summary.upcomingAppointment.reason}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="patient-appointment-actions">
                      <button
                        onClick={() => setSelectedAppointment(summary.upcomingAppointment)}
                        className="btn btn--outline btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, background: 'var(--bg-card)' }}
                      >
                        <Eye size={15} />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(summary.upcomingAppointment);
                          setShowCancelModal(true);
                        }}
                        className="btn btn--outline btn--sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', background: 'var(--bg-card)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="patient-card" style={{ textAlign: 'center', padding: '1.25rem 1.25rem' }}>
                    <div className="patient-empty-state__icon">
                      <Calendar size={20} style={{ color: '#0891b2' }} />
                    </div>
                    <h3 className="patient-empty-state__title">
                      No upcoming appointments scheduled
                    </h3>
                    <p className="patient-empty-state__desc" style={{ maxWidth: '460px', marginInline: 'auto', marginBottom: '0.75rem' }}>
                      You currently have no consultations on your schedule. You can schedule an in-person or virtual consultation with any of our hospital specialists.
                    </p>
                    <button
                      onClick={() => setActiveTab('book-appointment')}
                      className="btn btn--primary btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                      <Plus size={15} />
                      <span>Book an Appointment</span>
                    </button>
                  </div>
                )}
              </div>

              {/* HEALTH SUMMARY KPI CARDS (ROW OF 4) */}
              <div className="patient-kpi-grid">
                {/* Card 1: Upcoming Visit */}
                <div
                  className="patient-kpi-card"
                  onClick={() => setActiveTab('appointments')}
                >
                  <div className="patient-kpi-card__header">
                    <div className="patient-kpi-card__icon">
                      <Calendar size={18} />
                    </div>
                    <span className="patient-kpi-card__action">
                      View <ChevronRight size={13} />
                    </span>
                  </div>
                  <div>
                    <p className="patient-kpi-card__label">
                      Upcoming Visit
                    </p>
                    <h3 className="patient-kpi-card__value">
                      {summary?.upcomingAppointment
                        ? new Date(summary.upcomingAppointment.appointmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : 'None'}
                    </h3>
                    <p className="patient-kpi-card__sub">
                      {summary?.upcomingAppointment
                        ? `Dr. ${summary.upcomingAppointment.doctor?.firstName || ''} ${summary.upcomingAppointment.doctor?.lastName || ''}`
                        : 'No visit scheduled'}
                    </p>
                  </div>
                </div>

                {/* Card 2: Active Prescriptions */}
                <div
                  className="patient-kpi-card"
                  onClick={() => setActiveTab('prescriptions')}
                >
                  <div className="patient-kpi-card__header">
                    <div className="patient-kpi-card__icon">
                      <Pill size={18} />
                    </div>
                    <span className="patient-kpi-card__action">
                      View <ChevronRight size={13} />
                    </span>
                  </div>
                  <div>
                    <p className="patient-kpi-card__label">
                      Active Prescriptions
                    </p>
                    <h3 className="patient-kpi-card__value">
                      {summary?.activePrescriptionsCount ?? 0}
                    </h3>
                    <p className="patient-kpi-card__sub">
                      {summary?.activePrescriptionsCount > 0 ? `${summary.activePrescriptionsCount} active prescription(s)` : 'No active prescriptions'}
                    </p>
                  </div>
                </div>

                {/* Card 3: Latest Reports */}
                <div
                  className="patient-kpi-card"
                  onClick={() => setActiveTab('lab-reports')}
                >
                  <div className="patient-kpi-card__header">
                    <div className="patient-kpi-card__icon">
                      <Microscope size={18} />
                    </div>
                    <span className="patient-kpi-card__action">
                      View <ChevronRight size={13} />
                    </span>
                  </div>
                  <div>
                    <p className="patient-kpi-card__label">
                      Latest Reports
                    </p>
                    <h3 className="patient-kpi-card__value">
                      {summary?.recentLabReport?.status || summary?.recentRadiologyReport?.status || 'All Verified'}
                    </h3>
                    <p className="patient-kpi-card__sub" title={summary?.recentLabReport?.testName || summary?.recentRadiologyReport?.examinationName || 'Diagnostics'}>
                      {summary?.recentLabReport?.testName || summary?.recentRadiologyReport?.examinationName || 'No reports on file'}
                    </p>
                  </div>
                </div>

                {/* Card 4: Pending Balance */}
                <div
                  className="patient-kpi-card"
                  onClick={() => setActiveTab('bills')}
                >
                  <div className="patient-kpi-card__header">
                    <div className="patient-kpi-card__icon">
                      <CreditCard size={18} />
                    </div>
                    <span className="patient-kpi-card__action">
                      {summary?.pendingBalance > 0 ? 'Pay Now' : 'View'} <ChevronRight size={13} />
                    </span>
                  </div>
                  <div>
                    <p className="patient-kpi-card__label">
                      Pending Balance
                    </p>
                    <h3 className="patient-kpi-card__value" style={{ color: summary?.pendingBalance > 0 ? '#b45309' : '#0f172a' }}>
                      ₹{summary?.pendingBalance ? summary.pendingBalance.toFixed(2) : '0.00'}
                    </h3>
                    <p className="patient-kpi-card__sub">
                      {summary?.unpaidBillsCount > 0 ? `${summary.unpaidBillsCount} unpaid bill(s)` : 'All accounts settled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TWO-COLUMN CLINICAL DASHBOARD GRID */}
              <div className="patient-clinical-grid">
                
                {/* ─── LEFT COLUMN ─────────────────────────────────────── */}
                <div className="patient-column">
                  
                  {/* CURRENT MEDICATIONS */}
                  <div className="patient-card">
                    <div className="patient-card__header">
                      <div className="patient-card__title-group">
                        <div className="patient-card__icon">
                          <Pill size={17} />
                        </div>
                        <div>
                          <h3 className="patient-card__title">
                            Current Medications
                          </h3>
                          <span className="patient-card__subtitle">Active prescriptions</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('prescriptions')}
                        className="patient-card__link"
                      >
                        View All <ArrowRight size={13} />
                      </button>
                    </div>

                    {summary?.activePrescriptions && summary.activePrescriptions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {summary.activePrescriptions.map((rx) => (
                          <div key={rx._id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(rx.medications || []).map((med, idx) => (
                              <div
                                key={idx}
                                className="patient-item-row"
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{med.name}</strong>
                                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 600 }}>
                                      {med.dosage}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                                    {med.frequency} • {med.duration}
                                  </div>
                                  {med.instructions && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                      "{med.instructions}"
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                                    Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {new Date(rx.prescriptionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="patient-empty-state">
                        <div className="patient-empty-state__icon">
                          <Pill size={20} />
                        </div>
                        <p className="patient-empty-state__title">No active prescriptions on file.</p>
                        <p className="patient-empty-state__desc">Any medications prescribed by your attending physicians will be cataloged here.</p>
                      </div>
                    )}
                  </div>

                  {/* RECENT REPORTS (COMBINED LAB & RADIOLOGY) */}
                  <div className="patient-card">
                    <div className="patient-card__header">
                      <div className="patient-card__title-group">
                        <div className="patient-card__icon">
                          <Microscope size={17} />
                        </div>
                        <div>
                          <h3 className="patient-card__title">
                            Recent Reports
                          </h3>
                          <span className="patient-card__subtitle">Laboratory & Radiology</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => setActiveTab('lab-reports')}
                          className="btn btn--outline btn--sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'var(--bg-card)' }}
                        >
                          Lab Reports
                        </button>
                        <button
                          onClick={() => setActiveTab('radiology-reports')}
                          className="btn btn--outline btn--sm"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'var(--bg-card)' }}
                        >
                          Radiology
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {summary?.recentLabReport && (
                        <div className="patient-item-row" style={{ alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{summary.recentLabReport.testName}</strong>
                              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', fontWeight: 600 }}>
                                Laboratory
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              Date: {new Date(summary.recentLabReport.testDate).toLocaleDateString()} • Attending: Dr. {summary.recentLabReport.doctor?.firstName || 'Staff'} {summary.recentLabReport.doctor?.lastName || ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge badge--success" style={{ fontSize: '0.72rem' }}>
                              {summary.recentLabReport.status}
                            </span>
                            <button
                              onClick={() => {
                                setActiveTab('lab-reports');
                              }}
                              className="btn btn--outline btn--sm"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: 'var(--bg-card)' }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      )}

                      {summary?.recentRadiologyReport && (
                        <div className="patient-item-row" style={{ alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{summary.recentRadiologyReport.examinationName || summary.recentRadiologyReport.modality || 'Radiology Study'}</strong>
                              <span className="badge" style={{ background: '#f0fdfa', color: '#0891b2', border: '1px solid #ccfbf1', fontSize: '0.7rem', fontWeight: 600 }}>
                                {summary.recentRadiologyReport.modality || 'Radiology'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              Date: {new Date(summary.recentRadiologyReport.examinationDate).toLocaleDateString()} • Modality: {summary.recentRadiologyReport.modality || 'Radiology'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge badge--primary" style={{ fontSize: '0.72rem' }}>
                              {summary.recentRadiologyReport.status}
                            </span>
                            <button
                              onClick={() => {
                                setActiveTab('radiology-reports');
                              }}
                              className="btn btn--outline btn--sm"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: 'var(--bg-card)' }}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      )}

                      {!summary?.recentLabReport && !summary?.recentRadiologyReport && (
                        <div className="patient-empty-state">
                          <div className="patient-empty-state__icon">
                            <Microscope size={20} />
                          </div>
                          <p className="patient-empty-state__title">No recent laboratory or radiology reports on file.</p>
                          <p className="patient-empty-state__desc">Diagnostic results and verified laboratory values will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* ─── RIGHT COLUMN ────────────────────────────────────── */}
                <div className="patient-column">

                  {/* BILLS & PAYMENTS SUMMARY */}
                  <div className="patient-card">
                    <div className="patient-card__header">
                      <div className="patient-card__title-group">
                        <div className="patient-card__icon">
                          <CreditCard size={17} />
                        </div>
                        <div>
                          <h3 className="patient-card__title">
                            Bills & Payments
                          </h3>
                          <span className="patient-card__subtitle">Account statement status</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('bills')}
                        className="patient-card__link"
                      >
                        View Bills <ArrowRight size={13} />
                      </button>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                            Pending Amount
                          </span>
                          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: summary?.pendingBalance > 0 ? '#b45309' : '#0f172a' }}>
                            ₹{summary?.pendingBalance ? summary.pendingBalance.toFixed(2) : '0.00'}
                          </span>
                        </div>
                        {summary?.recentBill && summary.pendingBalance > 0 ? (
                          <button
                            onClick={() => {
                              setPaymentBill(summary.recentBill);
                              setPaymentAmount(Math.max(0, summary.recentBill.netAmount - (summary.recentBill.paidAmount || 0)));
                              setShowPaymentModal(true);
                            }}
                            className="btn btn--primary btn--sm"
                            style={{ fontWeight: 600 }}
                          >
                            Pay Now
                          </button>
                        ) : (
                          <span className="badge badge--success" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            All Accounts Settled
                          </span>
                        )}
                      </div>

                      {summary?.recentBill && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Recent Invoice: #{summary.recentBill.invoiceNumber}</span>
                          <span>{new Date(summary.recentBill.billDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RECENT MEDICAL ACTIVITY */}
                  <div className="patient-card">
                    <div className="patient-card__header">
                      <div className="patient-card__title-group">
                        <div className="patient-card__icon">
                          <Activity size={17} />
                        </div>
                        <div>
                          <h3 className="patient-card__title">
                            Recent Medical Activity
                          </h3>
                          <span className="patient-card__subtitle">Clinical milestones timeline</span>
                        </div>
                      </div>
                    </div>

                    {summary?.recentActivity && summary.recentActivity.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {summary.recentActivity.map((act) => (
                          <div
                            key={act.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.65rem',
                              padding: '0.45rem 0',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: 'rgba(8, 145, 178, 0.08)',
                                color: '#0891b2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              {act.type === 'Appointment' && <Calendar size={14} />}
                              {act.type === 'Medical Record' && <FileText size={14} />}
                              {act.type === 'Prescription' && <Pill size={14} />}
                              {act.type === 'Lab Report' && <Microscope size={14} />}
                              {act.type === 'Radiology Report' && <ImageIcon size={14} />}
                              {act.type === 'Billing' && <CreditCard size={14} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                                <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{act.title}</strong>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                  {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {act.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="patient-empty-state">
                        <div className="patient-empty-state__icon">
                          <Activity size={20} />
                        </div>
                        <p className="patient-empty-state__title">No recent medical activity recorded.</p>
                        <p className="patient-empty-state__desc">Your consultations, investigations, and prescriptions will be logged chronologically here.</p>
                      </div>
                    )}
                  </div>

                  {/* IMPORTANT NOTIFICATIONS */}
                  <div className="patient-card">
                    <div className="patient-card__header">
                      <div className="patient-card__title-group">
                        <div className="patient-card__icon">
                          <Bell size={17} />
                        </div>
                        <div>
                          <h3 className="patient-card__title">
                            Important Notifications
                          </h3>
                          <span className="patient-card__subtitle">Alerts & reminders</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('notifications')}
                        className="patient-card__link"
                      >
                        View All <ArrowRight size={13} />
                      </button>
                    </div>

                    {summary?.recentNotifications && summary.recentNotifications.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {summary.recentNotifications.map((notif) => (
                          <div
                            key={notif._id}
                            style={{
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: notif.isRead ? '#f8fafc' : '#f0fdfa',
                              borderLeft: notif.isRead ? '3px solid #cbd5e1' : '3px solid #0891b2',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                              transition: 'background 120ms ease',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{notif.title}</strong>
                                {!notif.isRead && (
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0891b2' }} />
                                )}
                              </div>
                              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4 }}>
                                {notif.message}
                              </p>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                                {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!notif.isRead && (
                              <button
                                onClick={() => handleMarkNotificationRead(notif._id)}
                                title="Mark as read"
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="patient-empty-state">
                        <div className="patient-empty-state__icon">
                          <Bell size={20} />
                        </div>
                        <p className="patient-empty-state__title">No unread notifications.</p>
                        <p className="patient-empty-state__desc">You're all caught up with your clinical reminders and alerts.</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 2: MY PROFILE */}
          {activeTab === 'profile' && profile && (() => {
            const patientFullName = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.name || 'Patient';
            const initials = patientFullName.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'P';
            const patientId = profile.patientId || (profile._id ? `HMS-P-${profile._id.substring(18).toUpperCase()}` : 'HMS-P-000000');
            const formattedDob = profile.dateOfBirth && !isNaN(new Date(profile.dateOfBirth).getTime())
              ? new Date(profile.dateOfBirth).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '';

            return (
              <div className="patient-profile-page">
                <CompactPageHeader
                  module="My Profile"
                  title="My Profile"
                  subtitle="Official medical record profile and verified contact information."
                  actions={
                    !editingProfile ? (
                      <button
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        className="btn btn--outline btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <User size={15} />
                        <span>Edit Contact Info</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setEditingProfile(false)}
                          className="btn btn--outline btn--sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form="patient-profile-form"
                          className="btn btn--primary btn--sm"
                          disabled={actionLoading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Save size={15} />
                          <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )
                  }
                />

                {/* 1. Profile Header Card */}
                <div className="profile-header-card">
                  <div className="profile-header-user">
                    <div className="profile-avatar-circle">
                      {initials}
                    </div>
                    <div className="profile-header-info">
                      <div className="profile-header-name-row">
                        <h2 className="profile-header-name">{patientFullName}</h2>
                        <span className="profile-verified-chip">
                          <ShieldCheck size={13} /> Active / Verified
                        </span>
                      </div>
                      <div className="profile-header-meta">
                        <span className="profile-header-meta-item">
                          <strong>Role:</strong> Patient
                        </span>
                        <span>•</span>
                        <span className="profile-header-meta-item">
                          <strong>Patient ID:</strong>
                          <span className="profile-header-meta-pill">{patientId}</span>
                        </span>
                        {profile.bloodGroup && profile.bloodGroup !== 'Unknown' && (
                          <>
                            <span>•</span>
                            <span className="profile-header-meta-item">
                              <strong>Blood:</strong>
                              <span className="profile-field-value-pill profile-field-value-blood" style={{ padding: '0.1rem 0.4rem', fontSize: '0.78rem' }}>
                                {profile.bloodGroup}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="profile-header-actions">
                    {!editingProfile ? (
                      <button
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        className="btn btn--outline btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <User size={15} />
                        <span>Edit Contact Info</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setEditingProfile(false)}
                          className="btn btn--outline btn--sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form="patient-profile-form"
                          className="btn btn--primary btn--sm"
                          disabled={actionLoading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Save size={15} />
                          <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Container */}
                <form id="patient-profile-form" onSubmit={handleSaveProfile} style={{ display: 'contents' }}>
                  {/* 2. Main 2-Column Area */}
                  <div className="profile-grid-2col">
                    {/* Left Card: Personal Information */}
                    <div className="profile-section-card">
                      <div className="profile-section-header">
                        <h3 className="profile-section-title">
                          <User size={18} className="profile-section-icon" />
                          Personal Information
                        </h3>
                        {editingProfile && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Identity fields are locked
                          </span>
                        )}
                      </div>

                      <div className="profile-fields-grid">
                        {/* Full Name */}
                        <div className="profile-field">
                          <label className="profile-field-label">
                            Full Name
                            <span className="profile-field-label-locked">
                              <Lock size={10} /> Verified
                            </span>
                          </label>
                          {editingProfile ? (
                            <input
                              type="text"
                              className="profile-input"
                              value={patientFullName}
                              disabled
                            />
                          ) : (
                            <div className="profile-field-value">{patientFullName}</div>
                          )}
                        </div>

                        {/* Email Address */}
                        <div className="profile-field">
                          <label className="profile-field-label">
                            Email Address
                            <span className="profile-field-label-locked">
                              <Lock size={10} /> Verified
                            </span>
                          </label>
                          {editingProfile ? (
                            <input
                              type="email"
                              className="profile-input"
                              value={profile.email || ''}
                              disabled
                            />
                          ) : (
                            <div className="profile-field-value">{profile.email || <span className="profile-field-value--empty">Not provided</span>}</div>
                          )}
                        </div>

                        {/* Phone Number */}
                        <div className="profile-field">
                          <label className="profile-field-label">
                            Phone Number {editingProfile && '*'}
                          </label>
                          {editingProfile ? (
                            <input
                              type="tel"
                              className="profile-input"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              placeholder="+91 98765 43210"
                              required
                            />
                          ) : (
                            <div className="profile-field-value">
                              {profile.phone ? profile.phone : <span className="profile-field-value--empty">Not provided</span>}
                            </div>
                          )}
                        </div>

                        {/* Date of Birth */}
                        <div className="profile-field">
                          <label className="profile-field-label">Date of Birth</label>
                          {editingProfile ? (
                            <input
                              type="date"
                              className="profile-input"
                              value={profileForm.dateOfBirth}
                              onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                            />
                          ) : (
                            <div className="profile-field-value">
                              {formattedDob ? formattedDob : <span className="profile-field-value--empty">Not provided</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Card: Patient & Clinical Demographics */}
                    <div className="profile-section-card">
                      <div className="profile-section-header">
                        <h3 className="profile-section-title">
                          <Activity size={18} className="profile-section-icon" />
                          Patient & Clinical Details
                        </h3>
                        <span className="profile-field-value-pill" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          Medical Record
                        </span>
                      </div>

                      <div className="profile-fields-grid">
                        {/* Patient ID */}
                        <div className="profile-field">
                          <label className="profile-field-label">
                            Patient ID
                            <span className="profile-field-label-locked">
                              <Lock size={10} /> Verified
                            </span>
                          </label>
                          {editingProfile ? (
                            <input
                              type="text"
                              className="profile-input"
                              value={patientId}
                              disabled
                              style={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          ) : (
                            <div className="profile-field-value">
                              <span className="profile-header-meta-pill">{patientId}</span>
                            </div>
                          )}
                        </div>

                        {/* Blood Group */}
                        <div className="profile-field">
                          <label className="profile-field-label">Blood Group</label>
                          {editingProfile ? (
                            <select
                              className="profile-input"
                              value={profileForm.bloodGroup}
                              onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                            >
                              {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="profile-field-value">
                              <span className="profile-field-value-pill profile-field-value-blood">
                                {profile.bloodGroup || 'Unknown'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Gender */}
                        <div className="profile-field">
                          <label className="profile-field-label">Gender</label>
                          {editingProfile ? (
                            <select
                              className="profile-input"
                              value={profileForm.gender}
                              onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                              <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                          ) : (
                            <div className="profile-field-value" style={{ textTransform: 'capitalize' }}>
                              {profile.gender ? profile.gender.replace(/_/g, ' ') : <span className="profile-field-value--empty">Not specified</span>}
                            </div>
                          )}
                        </div>

                        {/* Allergies */}
                        <div className="profile-field">
                          <label className="profile-field-label">Known Allergies</label>
                          {editingProfile ? (
                            <input
                              type="text"
                              className="profile-input"
                              placeholder="e.g. Penicillin, Peanuts"
                              value={profileForm.allergies}
                              onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                            />
                          ) : (
                            <div className="profile-field-value">
                              {profile.allergies && profile.allergies.length > 0 ? (
                                profile.allergies.join(', ')
                              ) : (
                                <span className="profile-field-value--empty">No known allergies</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Residential Address Card */}
                  <div className="profile-section-card">
                    <div className="profile-section-header">
                      <h3 className="profile-section-title">
                        <MapPin size={18} className="profile-section-icon" />
                        Residential Address
                      </h3>
                    </div>

                    <div className="profile-fields-grid profile-fields-grid--4col">
                      <div className="profile-field profile-field--span-2">
                        <label className="profile-field-label">Street Address</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="Flat/House number, Street name"
                            value={profileForm.address.street}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              address: { ...profileForm.address, street: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.address?.street ? profile.address.street : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label className="profile-field-label">City</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="City"
                            value={profileForm.address.city}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              address: { ...profileForm.address, city: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.address?.city ? profile.address.city : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label className="profile-field-label">State</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="State"
                            value={profileForm.address.state}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              address: { ...profileForm.address, state: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.address?.state ? profile.address.state : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label className="profile-field-label">Postal Code</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="Postal code"
                            value={profileForm.address.postalCode}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              address: { ...profileForm.address, postalCode: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.address?.postalCode ? profile.address.postalCode : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Emergency Contact Details Card */}
                  <div className="profile-section-card">
                    <div className="profile-section-header">
                      <h3 className="profile-section-title">
                        <Phone size={18} className="profile-section-icon" />
                        Emergency Contact Details
                      </h3>
                    </div>

                    <div className="profile-fields-grid profile-fields-grid--3col">
                      <div className="profile-field">
                        <label className="profile-field-label">Contact Name</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="Emergency contact full name"
                            value={profileForm.emergencyContact.name}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              emergencyContact: { ...profileForm.emergencyContact, name: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.emergencyContact?.name ? profile.emergencyContact.name : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label className="profile-field-label">Relationship</label>
                        {editingProfile ? (
                          <input
                            type="text"
                            className="profile-input"
                            placeholder="e.g. Spouse, Parent, Sibling"
                            value={profileForm.emergencyContact.relation}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              emergencyContact: { ...profileForm.emergencyContact, relation: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.emergencyContact?.relation ? profile.emergencyContact.relation : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>

                      <div className="profile-field">
                        <label className="profile-field-label">Emergency Phone</label>
                        {editingProfile ? (
                          <input
                            type="tel"
                            className="profile-input"
                            placeholder="+91 98765 43210"
                            value={profileForm.emergencyContact.phone}
                            onChange={(e) => setProfileForm({
                              ...profileForm,
                              emergencyContact: { ...profileForm.emergencyContact, phone: e.target.value },
                            })}
                          />
                        ) : (
                          <div className="profile-field-value">
                            {profile.emergencyContact?.phone ? profile.emergencyContact.phone : <span className="profile-field-value--empty">Not provided</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Save/Cancel bar if in edit mode */}
                    {editingProfile && (
                      <div className="profile-actions-bar">
                        <button
                          type="button"
                          onClick={() => setEditingProfile(false)}
                          className="btn btn--outline"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={actionLoading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Save size={16} />
                          <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            );
          })()}

          {/* TAB 3: MY APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="My Appointments"
                title="My Appointments"
                subtitle="Upcoming and previous appointments, consultation details, and booking status."
                actions={
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {['All', 'Upcoming', 'Completed', 'Cancelled'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setAppointmentFilter(st)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: appointmentFilter === st ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: appointmentFilter === st ? 'var(--color-primary)' : '#ffffff',
                          color: appointmentFilter === st ? '#ffffff' : '#475569',
                          fontWeight: appointmentFilter === st ? 600 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {st}
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveTab('book-appointment')}
                      className="btn btn--primary btn--sm"
                      style={{ marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Plus size={14} /> Book New
                    </button>
                  </div>
                }
              />

              {appointments.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                  {appointments.map((appt) => {
                    const isUpcoming = ['Pending', 'Confirmed'].includes(appt.status);
                    return (
                      <div
                        key={appt._id}
                        style={{
                          background: 'var(--bg-card)',
                          borderRadius: '14px',
                          border: '1px solid var(--border-color)',
                          padding: '1.35rem',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <span
                              className={`badge ${
                                appt.status === 'Confirmed'
                                  ? 'badge--success'
                                  : appt.status === 'Completed'
                                  ? 'badge--primary'
                                  : appt.status === 'Cancelled'
                                  ? 'badge--danger'
                                  : 'badge--warning'
                              }`}
                            >
                              {appt.status}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Fee: ${appt.consultationFee || 50}
                            </span>
                          </div>

                          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                            {appt.department || appt.doctor?.specialization || 'Clinical Department'}
                          </p>

                          <div style={{ margin: '0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '0.6rem 0.75rem', borderRadius: '8px' }}>
                            <div>📅 <strong>Date:</strong> {new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div>⏰ <strong>Time Slot:</strong> {appt.appointmentTime}</div>
                            <div style={{ marginTop: '0.25rem' }}>📝 <strong>Reason:</strong> {appt.reason}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                          <button
                            onClick={() => setSelectedAppointment(appt)}
                            className="btn btn--outline btn--sm"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>
                          {isUpcoming && (
                            <button
                              onClick={() => {
                                setSelectedAppointment(appt);
                                setShowCancelModal(true);
                              }}
                              className="btn btn--outline btn--sm"
                              style={{ color: 'var(--color-danger)', borderColor: '#fecaca' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <Calendar size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No appointments found</h3>
                  <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    You have no {appointmentFilter !== 'All' ? appointmentFilter.toLowerCase() : ''} consultations scheduled.
                  </p>
                  <button onClick={() => setActiveTab('book-appointment')} className="btn btn--primary btn--sm">
                    Book an Appointment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOOK APPOINTMENT */}
          {activeTab === 'book-appointment' && (
            <div className="book-appointment-page">
              <CompactPageHeader
                module="Book Appointment"
                title="Book Appointment"
                subtitle="Select department, choose verified specialist doctor, and pick an available clinical slot."
              />

              {/* ── Step 1: Department Filter ───────────────────────── */}
              <div className="book-appt-section book-appt-section--filters">
                <p className="book-appt-section__label">Filter by Department</p>
                <div className="book-appt-dept-filters">
                  {['All', 'Cardiology', 'General Medicine', 'Neurology', 'Orthopedics', 'Pediatrics'].map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDept(dept)}
                      className={`book-appt-dept-btn${selectedDept === dept ? ' book-appt-dept-btn--active' : ''}`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Step 2: Doctor Cards Grid ────────────────────────── */}
              <div className="book-appt-section">
                <p className="book-appt-section__label">Select Attending Physician *</p>
                <div className="book-appt-doctor-grid">
                  {doctors.map((doc) => {
                    const isSelected = bookingDoctor?._id === doc._id;
                    return (
                      <div
                        key={doc._id}
                        onClick={() => {
                          setBookingDoctor(doc);
                          setBookingTime('');
                        }}
                        className={`book-appt-doctor-card${isSelected ? ' book-appt-doctor-card--selected' : ''}`}
                      >
                        <div className="book-appt-doctor-card__header">
                          <strong className="book-appt-doctor-card__name">
                            Dr. {doc.firstName} {doc.lastName}
                          </strong>
                          {isSelected && (
                            <CheckCircle2 size={18} className="book-appt-doctor-card__check" />
                          )}
                        </div>
                        <p className="book-appt-doctor-card__spec">
                          {doc.specialization || doc.department}
                        </p>
                        <p className="book-appt-doctor-card__qual">
                          {doc.qualification}
                        </p>
                        <div className="book-appt-doctor-card__meta">
                          <span>Fee: <strong>${doc.consultationFee || 50}</strong></span>
                          <span>{doc.availableDays ? doc.availableDays.join(', ') : 'Mon–Fri'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Steps 3–5: Booking Form (shown after doctor selected) ── */}
              {bookingDoctor && (
                <div className="book-appt-section book-appt-section--form">
                  <form onSubmit={handleBookAppointment} className="book-appt-form">

                    {/* Date & Time row */}
                    <div className="book-appt-form__row">
                      <div className="form-group book-appt-form__field">
                        <label htmlFor="bookingDate" className="form-label">
                          Appointment Date *
                        </label>
                        <input
                          id="bookingDate"
                          type="date"
                          className="form-input"
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group book-appt-form__field">
                        <label className="form-label">Available Time Slots *</label>
                        <div className="book-appt-timeslots">
                          {(bookingDoctor.availableTimeSlots || [
                            '09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM',
                          ]).map((slot) => {
                            const isSlotSelected = bookingTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setBookingTime(slot)}
                                className={`book-appt-slot-btn${isSlotSelected ? ' book-appt-slot-btn--active' : ''}`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="form-group">
                      <label htmlFor="bookingReason" className="form-label">
                        Chief Complaint / Reason for Visit *
                      </label>
                      <input
                        id="bookingReason"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Chest pain on exertion, fever for 3 days, regular quarterly checkup"
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                      <label htmlFor="bookingNotes" className="form-label">
                        Additional Clinical Notes (Optional)
                      </label>
                      <textarea
                        id="bookingNotes"
                        className="form-input"
                        rows={3}
                        placeholder="Mention any existing medications, allergies, or questions for the doctor..."
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      className="btn btn--primary btn--full book-appt-submit-btn"
                      disabled={actionLoading || !bookingDate || !bookingTime || !bookingReason}
                    >
                      {actionLoading
                        ? 'Verifying & Booking...'
                        : `Confirm Booking with Dr. ${bookingDoctor.firstName} ${bookingDoctor.lastName}`}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MEDICAL RECORDS */}
          {activeTab === 'medical-records' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="Medical Records"
                title="Medical Records"
                subtitle="View your clinical history, outpatient summaries, diagnosis records, and recorded vitals."
              />

              {medicalRecords.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {medicalRecords.map((rec) => (
                    <div
                      key={rec._id}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        padding: '1.25rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                        <div>
                          <span className="badge badge--primary" style={{ marginBottom: '0.3rem' }}>
                            Consultation Record
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {rec.diagnosis}
                          </h3>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Attending Physician: <strong>Dr. {rec.doctor?.firstName} {rec.doctor?.lastName}</strong> ({rec.doctor?.specialization || 'Clinical Specialist'})
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          📅 {new Date(rec.consultationDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {/* Vitals Grid */}
                      {rec.vitals && (
                        <div style={{ marginBottom: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Blood Pressure</span><strong>{rec.vitals.bp || 'N/A'}</strong></div>
                          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Heart Rate</span><strong>{rec.vitals.heartRate || 'N/A'}</strong></div>
                          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Temperature</span><strong>{rec.vitals.temperature || 'N/A'}</strong></div>
                          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Weight</span><strong>{rec.vitals.weight || 'N/A'}</strong></div>
                          <div><span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>SpO2</span><strong>{rec.vitals.spo2 || 'N/A'}</strong></div>
                        </div>
                      )}

                      <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                        <strong>Doctor Notes:</strong> {rec.clinicalNotes || 'Patient evaluated and advised.'}
                      </div>

                      {rec.treatment && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#047857' }}>
                          <strong>Treatment Plan:</strong> {rec.treatment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <History size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No medical history records yet</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Consultation summaries and diagnostic notes appear here following your hospital visits.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="Prescriptions"
                title="Prescriptions"
                subtitle="Active and historical medication orders prescribed by your attending physicians."
              />

              {prescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {prescriptions.map((rx) => (
                    <div
                      key={rx._id}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        padding: '1.25rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span className={`badge ${rx.status === 'Active' ? 'badge--success' : 'badge--secondary'}`}>
                            {rx.status}
                          </span>
                          <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {rx.diagnosis || 'Clinical Prescription'}
                          </h3>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Prescribed by Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} ({rx.doctor?.specialization || 'Attending Physician'})
                          </p>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          📅 Issued: {new Date(rx.prescriptionDate).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Medications Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', fontSize: '0.825rem' }}>
                          <thead>
                            <tr>
                              <th>Medicine Name</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                              <th>Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rx.medications || []).map((med, idx) => (
                              <tr key={idx}>
                                <td><strong>{med.name}</strong></td>
                                <td>{med.dosage}</td>
                                <td>{med.frequency}</td>
                                <td>{med.duration}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{med.instructions || 'As directed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {rx.notes && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                          📌 <strong>Doctor Note:</strong> {rx.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <Pill size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No prescriptions on record</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Signed medical prescriptions from hospital physicians will display here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LAB REPORTS */}
          {activeTab === 'lab-reports' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="Lab Reports"
                title="Lab Reports"
                subtitle="Laboratory specimens, diagnostic profiles, and pathologist-verified parameter findings."
              />

              {labReports.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {labReports.map((lab) => (
                    <div
                      key={lab._id}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        padding: '1.25rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <span className="badge badge--info" style={{ fontSize: '0.7rem' }}>
                              {lab.category || 'General Lab'}
                            </span>
                            <span className={`badge ${lab.status === 'Completed' ? 'badge--success' : 'badge--warning'}`} style={{ fontSize: '0.7rem' }}>
                              {lab.status}
                            </span>
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {lab.testName}
                          </h3>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Ordered by: Dr. {lab.doctor?.firstName} {lab.doctor?.lastName}
                          </p>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          📅 Specimen Date: {new Date(lab.testDate).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Results Table */}
                      {lab.results && lab.results.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table" style={{ width: '100%', fontSize: '0.825rem' }}>
                            <thead>
                              <tr>
                                <th>Test Parameter</th>
                                <th>Result</th>
                                <th>Unit</th>
                                <th>Reference Range</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lab.results.map((item, idx) => (
                                <tr key={idx}>
                                  <td><strong>{item.parameter}</strong></td>
                                  <td style={{ fontWeight: 600, color: item.flag === 'Normal' ? '#0f172a' : '#dc2626' }}>
                                    {item.result}
                                  </td>
                                  <td>{item.unit || '-'}</td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{item.referenceRange}</td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        item.flag === 'Normal'
                                          ? 'badge--success'
                                          : item.flag === 'High'
                                          ? 'badge--danger'
                                          : 'badge--warning'
                                      }`}
                                      style={{ fontSize: '0.7rem' }}
                                    >
                                      {item.flag}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Specimen in processing. Results pending laboratory verification.
                        </p>
                      )}

                      {lab.notes && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                          🔬 <strong>Laboratory Impression:</strong> {lab.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <Microscope size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No lab reports found</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Laboratory diagnostic orders and specimen analyses will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: RADIOLOGY REPORTS */}
          {activeTab === 'radiology-reports' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="Radiology Reports"
                title="Radiology Reports"
                subtitle="X-Ray, MRI, CT Scan, and Ultrasound studies with certified radiologist interpretations."
              />

              {radiologyReports.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {radiologyReports.map((rad) => (
                    <div
                      key={rad._id}
                      style={{
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        padding: '1.25rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <span className="badge badge--primary" style={{ fontSize: '0.7rem' }}>
                              {rad.modality}
                            </span>
                            <span className={`badge ${rad.status === 'Completed' ? 'badge--success' : 'badge--warning'}`} style={{ fontSize: '0.7rem' }}>
                              {rad.status}
                            </span>
                          </div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {rad.examinationName}
                          </h3>
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Ordering Physician: Dr. {rad.doctor?.firstName} {rad.doctor?.lastName}
                          </p>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          📅 Exam Date: {new Date(rad.examinationDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Radiological Findings:</strong>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {rad.findings || 'Examination completed. No remarkable acute pathological abnormalities observed.'}
                        </p>
                      </div>

                      {rad.impression && (
                        <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#0f766e' }}>Clinical Impression:</strong>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#115e59' }}>
                            {rad.impression}
                          </p>
                        </div>
                      )}

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        Interpreted by: <em>{rad.radiologist || 'Staff Radiologist'}</em>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <ImageIcon size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No radiology studies found</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Imaging scans and radiology interpretations will appear here when scheduled.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: BILLS & PAYMENTS */}
          {activeTab === 'bills' && (
            <div className="patient-module-page">
              <CompactPageHeader
                module="Bills & Payments"
                title="Bills & Payments"
                subtitle="Itemized medical charges, consultation fees, and online payment settlement."
              />

              {bills.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {bills.map((bill) => {
                    const pending = Math.max(0, bill.netAmount - (bill.paidAmount || 0));
                    return (
                      <div
                        key={bill._id}
                        style={{
                          background: 'var(--bg-card)',
                          borderRadius: '14px',
                          border: '1px solid var(--border-color)',
                          padding: '1.25rem',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                Invoice #{bill.invoiceNumber}
                              </strong>
                              <span
                                className={`badge ${
                                  bill.paymentStatus === 'Paid'
                                    ? 'badge--success'
                                    : bill.paymentStatus === 'Partially Paid'
                                    ? 'badge--warning'
                                    : 'badge--danger'
                                }`}
                              >
                                {bill.paymentStatus}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Date: {new Date(bill.billDate).toLocaleDateString()} • Due: {new Date(bill.dueDate).toLocaleDateString()}
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Total: <strong>${bill.netAmount.toFixed(2)}</strong></div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: pending > 0 ? '#b45309' : '#059669' }}>
                              {pending > 0 ? `Due: $${pending.toFixed(2)}` : 'Fully Paid'}
                            </div>
                          </div>
                        </div>

                        {/* Itemized Breakdown Table */}
                        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
                          <table className="table" style={{ width: '100%', fontSize: '0.825rem' }}>
                            <thead>
                              <tr>
                                <th>Item Description</th>
                                <th>Category</th>
                                <th>Qty</th>
                                <th>Rate</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(bill.items || []).map((it, idx) => (
                                <tr key={idx}>
                                  <td>{it.description}</td>
                                  <td><span className="badge" style={{ fontSize: '0.7rem' }}>{it.category}</span></td>
                                  <td>{it.quantity}</td>
                                  <td>${it.unitPrice.toFixed(2)}</td>
                                  <td><strong>${it.total.toFixed(2)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Payment Actions & History */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Paid so far: <strong>${(bill.paidAmount || 0).toFixed(2)}</strong>
                            {bill.discount > 0 && ` (Discount: $${bill.discount.toFixed(2)})`}
                          </div>

                          {pending > 0 ? (
                            <button
                              onClick={() => {
                                setPaymentBill(bill);
                                setPaymentAmount(pending);
                                setPaymentReceipt(null);
                                setShowPaymentModal(true);
                              }}
                              className="btn btn--primary btn--sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <CreditCard size={15} />
                              <span>Settle Bill (${pending.toFixed(2)})</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={16} /> Receipt Cleared
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', padding: '3rem 1.5rem', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <CreditCard size={40} style={{ color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>No invoices on file</h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Hospital consultation and diagnostic service bills will be issued here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {activeTab === 'notifications' && (() => {
            const unreadCount = notifications.filter((n) => !n.isRead).length;
            const apptCount = notifications.filter((n) => n.type === 'appointment').length;
            const reportsCount = notifications.filter((n) => n.type === 'lab' || n.type === 'radiology' || n.type === 'prescription').length;
            const billingCount = notifications.filter((n) => n.type === 'billing').length;

            const filteredList = notifications.filter((n) => {
              if (notificationFilter === 'unread') return !n.isRead;
              if (notificationFilter === 'appointment') return n.type === 'appointment';
              if (notificationFilter === 'reports') return n.type === 'lab' || n.type === 'radiology' || n.type === 'prescription';
              if (notificationFilter === 'billing') return n.type === 'billing';
              return true;
            });

            return (
              <div className="patient-notifications-page">
                <CompactPageHeader
                  module="Notifications"
                  title="Notifications"
                  subtitle="Stay updated on appointment confirmations, test results, billing receipts, and other important updates."
                />

                {/* Notification Filter Bar */}
                <div className="notif-filter-bar">
                  <div className="notif-filter-chips">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`notif-chip-btn ${notificationFilter === 'all' ? 'notif-chip-btn--active' : ''}`}
                    >
                      All <span className="notif-chip-count">{notifications.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={`notif-chip-btn ${notificationFilter === 'unread' ? 'notif-chip-btn--active' : ''}`}
                    >
                      Unread <span className="notif-chip-count">{unreadCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('appointment')}
                      className={`notif-chip-btn ${notificationFilter === 'appointment' ? 'notif-chip-btn--active' : ''}`}
                    >
                      Appointments <span className="notif-chip-count">{apptCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('reports')}
                      className={`notif-chip-btn ${notificationFilter === 'reports' ? 'notif-chip-btn--active' : ''}`}
                    >
                      Medical Reports <span className="notif-chip-count">{reportsCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('billing')}
                      className={`notif-chip-btn ${notificationFilter === 'billing' ? 'notif-chip-btn--active' : ''}`}
                    >
                      Billing <span className="notif-chip-count">{billingCount}</span>
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="btn btn--outline btn--sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.85rem',
                        color: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <Check size={14} /> Mark all as read
                    </button>
                  )}
                </div>

                {/* Notification List or Empty State */}
                {filteredList.length > 0 ? (
                  <div className="notif-list">
                    {filteredList.map((n) => {
                      const cat = getNotificationCategoryInfo(n.type);
                      const IconComponent = cat.icon;
                      const createdDate = new Date(n.createdAt);
                      const dateStr = !isNaN(createdDate.getTime())
                        ? createdDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : '';
                      const timeStr = !isNaN(createdDate.getTime())
                        ? createdDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={n._id}
                          className={`notif-card ${!n.isRead ? 'notif-card--unread' : ''}`}
                        >
                          <div className={`notif-icon-box ${cat.iconBoxClass}`}>
                            <IconComponent size={20} />
                          </div>

                          <div className="notif-content">
                            <div className="notif-header">
                              <div className="notif-header-left">
                                <span className="notif-category-badge" style={cat.badgeStyle}>
                                  {cat.label}
                                </span>
                                <strong className="notif-title">{n.title}</strong>
                                {!n.isRead && (
                                  <span className="notif-unread-dot" title="Unread" />
                                )}
                              </div>
                              {dateStr && (
                                <span className="notif-time-top">{dateStr}</span>
                              )}
                            </div>

                            <p className="notif-message">{n.message}</p>

                            <div className="notif-footer">
                              <span className="notif-footer-time">
                                <Clock size={12} />
                                <span>{timeStr ? `${timeStr}${dateStr ? ` • ${dateStr}` : ''}` : dateStr}</span>
                              </span>

                              <div className="notif-actions">
                                {!n.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkNotificationRead(n._id)}
                                    className="notif-mark-btn"
                                    title="Mark as read"
                                  >
                                    <Check size={13} />
                                    <span>Mark as read</span>
                                  </button>
                                ) : (
                                  <span className="notif-read-status">
                                    <CheckCircle2 size={13} />
                                    <span>Read</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="notif-empty-state">
                    <div className="notif-empty-icon">
                      <Bell size={28} />
                    </div>
                    <h3 className="notif-empty-title">
                      {notificationFilter === 'all'
                        ? 'No notifications yet'
                        : `No ${notificationFilter === 'unread' ? 'unread' : notificationFilter} notifications`}
                    </h3>
                    <p className="notif-empty-subtitle">
                      {notificationFilter === 'all'
                        ? "You're all caught up. Important appointment, medical report, and billing updates will appear here."
                        : `There are currently no ${notificationFilter === 'unread' ? 'unread' : notificationFilter} alerts in your account.`}
                    </p>
                    {notificationFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setNotificationFilter('all')}
                        className="btn btn--outline btn--sm"
                        style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}
                      >
                        View All Notifications
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ─── MODAL 1: APPOINTMENT DETAILS ─────────────────────── */}
      {selectedAppointment && !showCancelModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Appointment Details</h3>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong>Status: </strong>
                <span className={`badge ${selectedAppointment.status === 'Confirmed' ? 'badge--success' : selectedAppointment.status === 'Completed' ? 'badge--primary' : 'badge--warning'}`}>
                  {selectedAppointment.status}
                </span>
              </div>
              <div>
                <strong>Doctor: </strong>
                Dr. {selectedAppointment.doctor?.firstName} {selectedAppointment.doctor?.lastName}
                {selectedAppointment.doctor?.specialization && ` (${selectedAppointment.doctor.specialization})`}
              </div>
              <div>
                <strong>Department: </strong>
                {selectedAppointment.department}
              </div>
              <div>
                <strong>Scheduled Date: </strong>
                {new Date(selectedAppointment.appointmentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div>
                <strong>Scheduled Time: </strong>
                {selectedAppointment.appointmentTime}
              </div>
              <div>
                <strong>Consultation Fee: </strong>
                ${selectedAppointment.consultationFee || 50}
              </div>
              <div>
                <strong>Reason for Visit: </strong>
                <p style={{ margin: '0.2rem 0 0', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '6px' }}>
                  {selectedAppointment.reason}
                </p>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <strong>Clinical Notes: </strong>
                  <p style={{ margin: '0.2rem 0 0', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '6px' }}>
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
              {selectedAppointment.cancellationReason && (
                <div style={{ color: '#b91c1c' }}>
                  <strong>Cancellation Reason: </strong>
                  <p style={{ margin: '0.2rem 0 0', background: '#fef2f2', padding: '0.5rem', borderRadius: '6px' }}>
                    {selectedAppointment.cancellationReason}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="btn btn--primary btn--sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CANCEL APPOINTMENT CONFIRMATION ─────────── */}
      {showCancelModal && selectedAppointment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
              <AlertCircle size={22} />
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Cancel Appointment?</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1rem' }}>
              Are you sure you want to cancel your appointment with <strong>Dr. {selectedAppointment.doctor?.firstName} {selectedAppointment.doctor?.lastName}</strong> scheduled on {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at {selectedAppointment.appointmentTime}?
            </p>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="cancelReason" className="form-label" style={{ fontSize: '0.8125rem' }}>
                Reason for Cancellation (Optional)
              </label>
              <input
                id="cancelReason"
                type="text"
                className="form-input"
                placeholder="e.g. Schedule conflict, feeling better"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="btn btn--outline btn--sm"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelAppointment}
                disabled={actionLoading}
                className="btn btn--sm"
                style={{ background: 'var(--color-danger)', color: '#ffffff' }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: BILL PAYMENT SIMULATION ─────────────────── */}
      {showPaymentModal && paymentBill && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {!paymentReceipt ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                    <CreditCard size={20} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Online Bill Settlement</h3>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div><strong>Invoice:</strong> #{paymentBill.invoiceNumber}</div>
                  <div><strong>Total Bill:</strong> ${paymentBill.netAmount.toFixed(2)}</div>
                  <div><strong>Already Paid:</strong> ${(paymentBill.paidAmount || 0).toFixed(2)}</div>
                  <div style={{ marginTop: '0.25rem', color: '#b45309', fontWeight: 600 }}>
                    Outstanding Due: ${(paymentBill.netAmount - (paymentBill.paidAmount || 0)).toFixed(2)}
                  </div>
                </div>

                <form onSubmit={handleProcessPayment}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem' }}>Payment Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={paymentBill.netAmount - (paymentBill.paidAmount || 0)}
                      min={1}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem' }}>Payment Method *</label>
                    <select
                      className="form-input"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Credit/Debit Card">Credit / Debit Card</option>
                      <option value="UPI">UPI / Instant Pay</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Cash at Desk">Cash at Cashier Desk</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="btn btn--outline"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={actionLoading || paymentAmount <= 0}
                    >
                      {actionLoading ? 'Authorizing Payment...' : `Pay $${Number(paymentAmount).toFixed(2)}`}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem',
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Payment Receipt</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your transaction has been verified and recorded.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '10px', fontSize: '0.825rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  <div><strong>Transaction Ref:</strong> {paymentReceipt.transactionId}</div>
                  <div><strong>Invoice #:</strong> {paymentReceipt.bill?.invoiceNumber}</div>
                  <div><strong>Amount Paid:</strong> ${paymentReceipt.amount.toFixed(2)}</div>
                  <div><strong>Payment Method:</strong> {paymentReceipt.method}</div>
                  <div><strong>Timestamp:</strong> {paymentReceipt.date}</div>
                  <div><strong>Status:</strong> <span className="badge badge--success" style={{ fontSize: '0.7rem' }}>Authorized & Settled</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentReceipt(null);
                  }}
                  className="btn btn--primary btn--full"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
