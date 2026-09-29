/**
 * Patient Registration Tab
 * 
 * Front-desk patient registration workflow with 5 organized sections:
 * - Section A: Personal Information
 * - Section B: Address
 * - Section C: Emergency Contact
 * - Section D: Medical Information
 * - Section E: Insurance
 * - Sticky bottom action bar
 * - Post-registration modal with Print Card & Book Appointment actions
 */

import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar,
  Eye,
  X,
  Shield,
  Phone,
  MapPin,
  Heart,
  User,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'male',
  bloodGroup: 'Unknown',
  phone: '',
  email: '',
  governmentId: '',
  streetAddress: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'USA',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
  allergies: '',
  existingConditions: '',
  previousDiagnoses: '',
  currentMedications: '',
  medicalNotes: '',
  insuranceProvider: '',
  policyNumber: '',
  policyHolder: '',
  insuranceExpiry: '',
  password: '',
};

export default function PatientRegistrationTab({ onNavigateTab, onSelectPatient, onOpenBookAppointment }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredPatient, setRegisteredPatient] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password ? form.password.trim() : undefined,
        governmentId: form.governmentId.trim(),
        address: {
          street: form.streetAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
        },
        emergencyContact: {
          name: form.emergencyName.trim(),
          relationship: form.emergencyRelation.trim(),
          phone: form.emergencyPhone.trim(),
        },
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()) : [],
        existingConditions: form.existingConditions.trim(),
        previousDiagnoses: form.previousDiagnoses.trim(),
        currentMedications: form.currentMedications.trim(),
        medicalNotes: form.medicalNotes.trim(),
        insurance: {
          provider: form.insuranceProvider.trim(),
          policyNumber: form.policyNumber.trim(),
          holder: form.policyHolder.trim(),
          expiry: form.insuranceExpiry || null,
        },
      };

      const res = await receptionService.createPatient(payload);
      setRegisteredPatient(res.data || res);
      setForm(INITIAL_FORM);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Failed to register patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-page-header">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab('patients')}
            className="btn btn--outline btn--sm"
            style={{ marginBottom: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Patients</span>
          </button>
          <h1 className="rec-page-title">Patient Registration</h1>
          <p className="rec-page-subtitle">
            Create a new patient record and register them for hospital outpatient & inpatient services.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── FORM CONTAINER ─────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ position: 'relative', paddingBottom: '5rem' }}>
        {/* SECTION A — Personal Information */}
        <div className="rec-card">
          <div className="rec-card-header">
            <h2 className="rec-card-title">
              <User size={18} style={{ color: '#0891b2' }} />
              <span>SECTION A — Personal Information</span>
            </h2>
          </div>

          <div className="rec-form-grid-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">First Name *</label>
              <input
                type="text"
                required
                name="firstName"
                placeholder="e.g. John"
                value={form.firstName}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                required
                name="lastName"
                placeholder="e.g. Smith"
                value={form.lastName}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                required
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Gender *</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="form-input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Blood Group</label>
              <select
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Unknown">Unknown / Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                required
                name="phone"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address (Optional)</label>
              <input
                type="email"
                name="email"
                placeholder="patient@example.com"
                value={form.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Government ID / SSN</label>
              <input
                type="text"
                name="governmentId"
                placeholder="e.g. DL-9820-X or National ID"
                value={form.governmentId}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Portal Password (Optional)</label>
              <input
                type="text"
                name="password"
                placeholder="Auto-default: PatientDefault123!"
                value={form.password}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* SECTION B — Address */}
        <div className="rec-card">
          <div className="rec-card-header">
            <h2 className="rec-card-title">
              <MapPin size={18} style={{ color: '#0891b2' }} />
              <span>SECTION B — Residential Address</span>
            </h2>
          </div>

          <div className="rec-form-grid-3">
            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Street Address *</label>
              <input
                type="text"
                required
                name="streetAddress"
                placeholder="e.g. 742 Evergreen Terrace, Apt 4B"
                value={form.streetAddress}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">City *</label>
              <input
                type="text"
                required
                name="city"
                placeholder="Springfield"
                value={form.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">State / Province *</label>
              <input
                type="text"
                required
                name="state"
                placeholder="Illinois"
                value={form.state}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Postal Code *</label>
              <input
                type="text"
                required
                name="postalCode"
                placeholder="62704"
                value={form.postalCode}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Country</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* SECTION C — Emergency Contact */}
        <div className="rec-card">
          <div className="rec-card-header">
            <h2 className="rec-card-title">
              <Phone size={18} style={{ color: '#0891b2' }} />
              <span>SECTION C — Emergency Contact</span>
            </h2>
          </div>

          <div className="rec-form-grid-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Emergency Contact Name *</label>
              <input
                type="text"
                required
                name="emergencyName"
                placeholder="e.g. Sarah Smith"
                value={form.emergencyName}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Relationship</label>
              <input
                type="text"
                name="emergencyRelation"
                placeholder="Spouse / Parent / Sibling"
                value={form.emergencyRelation}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Emergency Phone Number *</label>
              <input
                type="tel"
                required
                name="emergencyPhone"
                placeholder="+1 (555) 999-8888"
                value={form.emergencyPhone}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* SECTION D — Medical Information */}
        <div className="rec-card">
          <div className="rec-card-header">
            <h2 className="rec-card-title">
              <Heart size={18} style={{ color: '#0891b2' }} />
              <span>SECTION D — Medical Information & Allergies</span>
            </h2>
          </div>

          <div className="rec-form-grid-3">
            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Known Allergies (comma separated)</label>
              <input
                type="text"
                name="allergies"
                placeholder="e.g. Penicillin, Peanuts, Latex"
                value={form.allergies}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Existing Chronic Conditions</label>
              <input
                type="text"
                name="existingConditions"
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={form.existingConditions}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Current Medications</label>
              <input
                type="text"
                name="currentMedications"
                placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                value={form.currentMedications}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Medical History Notes / Remarks</label>
              <textarea
                rows={2}
                name="medicalNotes"
                placeholder="Any past surgeries, hospitalizations, or relevant medical observations..."
                value={form.medicalNotes}
                onChange={handleChange}
                className="form-input"
                style={{ height: 'auto' }}
              />
            </div>
          </div>
        </div>

        {/* SECTION E — Insurance */}
        <div className="rec-card">
          <div className="rec-card-header">
            <h2 className="rec-card-title">
              <Shield size={18} style={{ color: '#0891b2' }} />
              <span>SECTION E — Insurance Coverage</span>
            </h2>
          </div>

          <div className="rec-form-grid-3">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Insurance Provider</label>
              <input
                type="text"
                name="insuranceProvider"
                placeholder="e.g. BlueCross BlueShield, Aetna"
                value={form.insuranceProvider}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Policy Number</label>
              <input
                type="text"
                name="policyNumber"
                placeholder="e.g. POL-99201948"
                value={form.policyNumber}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Policy Holder Name</label>
              <input
                type="text"
                name="policyHolder"
                placeholder="e.g. Self or Primary Insured"
                value={form.policyHolder}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Insurance Expiration Date</label>
              <input
                type="date"
                name="insuranceExpiry"
                value={form.insuranceExpiry}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* ─── STICKY BOTTOM ACTION BAR ───────────────────────── */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 30,
            borderRadius: '12px',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
            marginTop: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => onNavigateTab('patients')}
            className="btn btn--outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn--primary"
            style={{ minWidth: '180px' }}
          >
            {submitting ? 'Saving Record...' : 'Save Patient Record'}
          </button>
        </div>
      </form>

      {/* ─── SUCCESS MODAL ──────────────────────────────────── */}
      {registeredPatient && (
        <div className="hms-modal-backdrop" onClick={() => setRegisteredPatient(null)}>
          <div className="hms-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="hms-modal__close-btn"
              onClick={() => setRegisteredPatient(null)}
            >
              <X size={16} />
            </button>

            <div className="hms-modal__icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 className="hms-modal__title">Patient Registered Successfully</h3>
            <p className="hms-modal__desc">
              Permanent hospital medical record created and enrolled in the patient registry.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Patient Name:</span>
                <strong style={{ color: '#0f172a' }}>{registeredPatient.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Assigned Patient ID:</span>
                <span
                  style={{
                    background: '#0891b2',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                  }}
                >
                  {registeredPatient.patientId}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Contact Phone:</span>
                <span style={{ color: '#0f172a', fontWeight: 500 }}>{registeredPatient.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b' }}>Registration Date:</span>
                <span style={{ color: '#0f172a' }}>{new Date(registeredPatient.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>

            {registeredPatient.credentials && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                  <Shield size={15} />
                  <span>Portal Login Credentials (Provide to Patient)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                  <span style={{ color: '#15803d' }}>Portal Email / Username:</span>
                  <strong style={{ color: '#0f172a' }}>{registeredPatient.credentials.portalUsername}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                  <span style={{ color: '#15803d' }}>Assigned Password:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', background: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                    {registeredPatient.credentials.temporaryPassword}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setRegisteredPatient(null);
                  if (onSelectPatient) onSelectPatient(registeredPatient.id);
                  else onNavigateTab('patients');
                }}
                className="btn btn--outline btn--sm"
              >
                <Eye size={14} />
                <span>View Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisteredPatient(null);
                  if (onOpenBookAppointment) onOpenBookAppointment(registeredPatient);
                  else onNavigateTab('appointments');
                }}
                className="btn btn--primary btn--sm"
              >
                <Calendar size={14} />
                <span>Book Visit</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintCard}
              className="btn btn--outline btn--full btn--sm"
              style={{ marginBottom: '0.5rem' }}
            >
              <Printer size={14} />
              <span>Print Patient Identification Slip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
