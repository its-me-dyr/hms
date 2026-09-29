/**
 * Reception OPD Registration Tab
 * 
 * Outpatient Department walk-in registration desk:
 * - Select existing registered patient OR instant walk-in registration
 * - Department & Specialist selection with live consultation fee calculator
 * - Priority triage tagging
 * - Front-desk payment receipt toggle
 * - Instant token & OPD consultation slip generator with Print action
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function OPDRegistrationTab() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode: 'existing' | 'walkin'
  const [patientMode, setPatientMode] = useState('existing');

  // Search existing
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'Male',
    age: '',
    departmentId: '',
    doctorId: '',
    priority: 'Normal',
    chiefComplaint: '',
    consultationFee: 500,
    collectedFee: true,
  });

  const [generatedSlip, setGeneratedSlip] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      receptionService.getDepartments(),
      receptionService.getDoctors(),
    ])
      .then(([resDepts, resDocs]) => {
        if (!active) return;
        setDepartments(Array.isArray(resDepts.data) ? resDepts.data : []);
        const docs = resDocs.data?.doctors || resDocs.data || [];
        setDoctors(Array.isArray(docs) ? docs : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load OPD master data:', err);
        setError('Failed to load departments or doctors.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const calculateFee = (docId, deptId) => {
    let fee = 500;
    if (docId) {
      const doc = doctors.find((d) => d._id === docId);
      if (doc?.experienceYears && doc.experienceYears > 8) fee = 800;
      else fee = 600;
    } else if (deptId) {
      const dept = departments.find((d) => (d._id || d.name) === deptId);
      if (dept?.name?.toLowerCase().includes('cardio') || dept?.name?.toLowerCase().includes('neuro')) {
        fee = 750;
      }
    }
    return fee;
  };

  // Handle Search Existing Patient
  const handleSearchPatient = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await receptionService.getPatients({ search: searchQuery.trim(), limit: 5 });
      const list = res.data?.patients || res.data || [];
      setSearchResults(list);
      if (list.length === 1) {
        setSelectedPatient(list[0]);
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Submit OPD Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const pName =
        patientMode === 'existing' && selectedPatient
          ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
          : `${formData.firstName} ${formData.lastName}`;
      const pPhone =
        patientMode === 'existing' && selectedPatient ? selectedPatient.phone : formData.phone;

      const doc = doctors.find((d) => d._id === formData.doctorId);
      const dept = departments.find((d) => (d._id || d.name) === formData.departmentId);

      const payload = {
        patientId: patientMode === 'existing' && selectedPatient ? selectedPatient._id : undefined,
        patientName: pName,
        phone: pPhone,
        gender: patientMode === 'existing' && selectedPatient ? selectedPatient.gender : formData.gender,
        age: patientMode === 'existing' && selectedPatient ? selectedPatient.age : formData.age,
        doctorId: formData.doctorId || undefined,
        departmentId: formData.departmentId,
        priority: formData.priority,
        reason: formData.symptoms || 'General OPD Consultation',
        paymentMethod: formData.paymentMethod,
        consultationFee: formData.consultationFee,
      };

      const res = await receptionService.createOpdToken(payload);
      const tokenNum = res.data?.tokenNumber || Math.floor(100 + Math.random() * 900);

      setGeneratedSlip({
        tokenNumber: tokenNum,
        patientName: pName,
        patientId: selectedPatient?.patientId || 'WALK-IN-' + tokenNum,
        phone: pPhone,
        doctor: doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'Duty Physician',
        department: dept?.name || 'General Outpatient',
        room: doc?.roomNumber || 'Room 102',
        fee: formData.consultationFee,
        paymentMethod: formData.paymentMethod,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
      });

      setFeedback({
        type: 'success',
        text: `OPD Registration completed! Token #${tokenNum} issued.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'OPD Registration failed. Please check inputs.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">OUTPATIENT SERVICES</div>
          <h1 className="rec-header-title">OPD Desk Registration</h1>
          <p className="rec-header-subtitle">
            Issue walk-in outpatient consultation slips, assign clinical departments, collect fee, and dispatch queue tokens.
          </p>
        </div>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0891b2', fontSize: '0.85rem' }}>
            <RefreshCw size={15} className="rec-spin" />
            <span>Loading Department Data...</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rec-alert rec-alert--error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rec-alert ${
            feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'
          }`}
          style={{ marginBottom: '1.5rem' }}
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

      <form onSubmit={handleSubmit}>
        <div className="rec-split-grid">
          {/* Main Form Fields */}
          <div>
            {/* Step 1: Patient Identity */}
            <div className="rec-card" style={{ marginBottom: '1.5rem' }}>
              <div className="rec-card-header">
                <div>
                  <h2 className="rec-card-title">1. Patient Identification</h2>
                  <p className="rec-card-subtitle">Choose between an existing registered patient or instant walk-in</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`rec-btn rec-btn--sm ${
                      patientMode === 'existing' ? 'rec-btn--primary' : 'rec-btn--secondary'
                    }`}
                    onClick={() => setPatientMode('existing')}
                  >
                    Existing Patient
                  </button>
                  <button
                    type="button"
                    className={`rec-btn rec-btn--sm ${
                      patientMode === 'walkin' ? 'rec-btn--primary' : 'rec-btn--secondary'
                    }`}
                    onClick={() => setPatientMode('walkin')}
                  >
                    Instant Walk-in
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                {patientMode === 'existing' ? (
                  <div>
                    {selectedPatient ? (
                      <div
                        style={{
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '1.05rem' }}>
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#0284c7' }}>
                            ID: {selectedPatient.patientId || 'HMS-PATIENT'} • Phone: {selectedPatient.phone} • Blood: {selectedPatient.bloodGroup || 'N/A'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rec-btn rec-btn--secondary rec-btn--sm"
                          onClick={() => setSelectedPatient(null)}
                        >
                          Change Patient
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
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
                              placeholder="Search registered patient by ID, Phone, or Name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="rec-form-input"
                              style={{ paddingLeft: '38px' }}
                            />
                          </div>
                          <button
                            type="button"
                            className="rec-btn rec-btn--primary"
                            onClick={handleSearchPatient}
                            disabled={searching || !searchQuery.trim()}
                          >
                            {searching ? <RefreshCw size={16} className="rec-spin" /> : 'Find'}
                          </button>
                        </div>

                        {searchResults.length > 0 && (
                          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                            {searchResults.map((p) => (
                              <div
                                key={p._id}
                                onClick={() => {
                                  setSelectedPatient(p);
                                  setSearchResults([]);
                                }}
                                style={{
                                  padding: '0.75rem 1rem',
                                  borderBottom: '1px solid #f1f5f9',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {p.firstName} {p.lastName}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    ID: {p.patientId || 'N/A'} • {p.phone}
                                  </div>
                                </div>
                                <button type="button" className="rec-btn rec-btn--secondary rec-btn--sm">
                                  Select
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="rec-form-row">
                      <div className="rec-form-group">
                        <label className="rec-form-label">First Name *</label>
                        <input
                          type="text"
                          required={patientMode === 'walkin'}
                          placeholder="e.g. John"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="rec-form-input"
                        />
                      </div>
                      <div className="rec-form-group">
                        <label className="rec-form-label">Last Name *</label>
                        <input
                          type="text"
                          required={patientMode === 'walkin'}
                          placeholder="e.g. Doe"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="rec-form-input"
                        />
                      </div>
                    </div>

                    <div className="rec-form-row">
                      <div className="rec-form-group">
                        <label className="rec-form-label">Phone Number *</label>
                        <input
                          type="tel"
                          required={patientMode === 'walkin'}
                          placeholder="10-digit mobile"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="rec-form-input"
                        />
                      </div>
                      <div className="rec-form-group">
                        <label className="rec-form-label">Gender *</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="rec-form-select"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="rec-form-group">
                        <label className="rec-form-label">Age (Years)</label>
                        <input
                          type="number"
                          placeholder="e.g. 34"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          className="rec-form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Department & Doctor Selection */}
            <div className="rec-card" style={{ marginBottom: '1.5rem' }}>
              <div className="rec-card-header">
                <div>
                  <h2 className="rec-card-title">2. Clinical Department & Doctor</h2>
                  <p className="rec-card-subtitle">Select consulting unit or specific on-duty doctor</p>
                </div>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Department *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => {
                        const deptId = e.target.value;
                        const fee = calculateFee(formData.doctorId, deptId);
                        setFormData({ ...formData, departmentId: deptId, consultationFee: fee });
                      }}
                      className="rec-form-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id || d.name} value={d._id || d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rec-form-group">
                    <label className="rec-form-label">Consulting Doctor</label>
                    <select
                      value={formData.doctorId}
                      onChange={(e) => {
                        const docId = e.target.value;
                        const fee = calculateFee(docId, formData.departmentId);
                        setFormData({ ...formData, doctorId: docId, consultationFee: fee });
                      }}
                      className="rec-form-select"
                    >
                      <option value="">Any Available Specialist</option>
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          Dr. {doc.firstName} {doc.lastName} ({doc.department?.name || 'Doctor'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Priority Triage Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="Normal">Normal Regular</option>
                      <option value="Senior Citizen">Senior Citizen (Fast Track)</option>
                      <option value="Pediatric">Pediatric / Child</option>
                      <option value="Emergency">Emergency Triage</option>
                    </select>
                  </div>

                  <div className="rec-form-group">
                    <label className="rec-form-label">Payment Method *</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="Cash at Desk">Cash at Desk</option>
                      <option value="Credit/Debit Card">Credit / Debit Card</option>
                      <option value="UPI / QR">UPI / QR Code</option>
                      <option value="Insurance / Free">Insurance / Exemption</option>
                    </select>
                  </div>
                </div>

                <div className="rec-form-group">
                  <label className="rec-form-label">Chief Complaint / Symptoms</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state patient's complaints (e.g. fever, headache, body ache for 2 days)..."
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    className="rec-form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary & Checkout Panel */}
          <div>
            <div className="rec-card" style={{ position: 'sticky', top: '1.5rem' }}>
              <div className="rec-card-header">
                <h2 className="rec-card-title">OPD Invoice Summary</h2>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>Consultation Type</span>
                    <strong style={{ color: '#0f172a' }}>Standard Outpatient</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>Registration Fee</span>
                    <strong style={{ color: '#0f172a' }}>₹ 100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>Doctor Consultation</span>
                    <strong style={{ color: '#0f172a' }}>₹ {formData.consultationFee - 100}</strong>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.5rem 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
                    <span style={{ color: '#0f172a' }}>Total Payable:</span>
                    <span style={{ color: '#0891b2' }}>₹ {formData.consultationFee}</span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="rec-btn rec-btn--primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                    disabled={submitting || (patientMode === 'existing' && !selectedPatient)}
                  >
                    {submitting ? (
                      <RefreshCw size={18} className="rec-spin" />
                    ) : (
                      <>
                        <Ticket size={18} />
                        <span>Issue OPD Slip & Token</span>
                      </>
                    )}
                  </button>
                </div>

                {patientMode === 'existing' && !selectedPatient && (
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: '0.5rem' }}>
                    Please select an existing patient first or switch to "Instant Walk-in".
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Generated OPD Slip Modal */}
      {generatedSlip && (
        <div className="rec-modal-overlay" onClick={() => setGeneratedSlip(null)}>
          <div
            className="rec-modal-card"
            style={{ maxWidth: '520px', padding: '0' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Printable Slip Container */}
            <div className="rec-print-area" style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0891b2', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', letterSpacing: '0.5px' }}>
                  HEALTHCARE MEDICAL SYSTEM
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  OUTPATIENT CONSULTATION SLIP
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Date: {generatedSlip.date} • Time: {generatedSlip.time}
                </div>
              </div>

              {/* Big Token Number */}
              <div
                style={{
                  textAlign: 'center',
                  backgroundColor: 'rgba(8, 145, 178, 0.08)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>
                  QUEUE TOKEN NUMBER
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#0891b2', lineHeight: 1.1 }}>
                  #{generatedSlip.tokenNumber}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.25rem' }}>
                  Proceed to: <strong>{generatedSlip.room}</strong>
                </div>
              </div>

              {/* Table of Details */}
              <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Patient Name:</span>
                  <strong>{generatedSlip.patientName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Patient ID / Phone:</span>
                  <span>{generatedSlip.patientId} / {generatedSlip.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <strong>{generatedSlip.department}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Consulting Doctor:</span>
                  <strong>{generatedSlip.doctor}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Fee Paid ({generatedSlip.paymentMethod}):</span>
                  <strong style={{ color: '#16a34a' }}>₹ {generatedSlip.fee} (PAID)</strong>
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
                Please keep this slip until consultation is completed. Valid for today only.
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => setGeneratedSlip(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rec-btn rec-btn--primary"
                  style={{ flex: 1 }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
