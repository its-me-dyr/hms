/**
 * Reception Inpatient Admission Tab
 * 
 * Front Desk IPD Admission Desk:
 * - Real-time bed availability visual matrix by ward
 * - Live bed occupancy statistics
 * - Fast patient lookup & admission request form
 * - Admitting specialist and department assignment
 * - Initial admission deposit tracking
 */

import { useState, useEffect } from 'react';
import {
  Bed,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function AdmissionTab({ _onSelectPatient }) {
  const [bedsData, setBedsData] = useState({ wards: [], stats: { total: 0, available: 0, occupied: 0, maintenance: 0 } });
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Selected ward filter
  const [selectedWardFilter, setSelectedWardFilter] = useState('all');

  // Admission Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Patient search in modal
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Admission Form state
  const [admissionForm, setAdmissionForm] = useState({
    patientId: '',
    departmentId: '',
    doctorId: '',
    wardName: 'General Medical Ward',
    roomNumber: '101',
    bedNumber: 'Bed-01',
    admissionReason: '',
    initialDeposit: 5000,
    emergencyContact: '',
  });

  const loadBedData = async () => {
    setLoading(true);
    try {
      const [resBeds, resDepts, resDocs] = await Promise.all([
        receptionService.getBedAvailability(),
        departments.length === 0 ? receptionService.getDepartments() : Promise.resolve(null),
        doctors.length === 0 ? receptionService.getDoctors() : Promise.resolve(null),
      ]);

      const bData = resBeds.data || resBeds;
      setBedsData(bData);

      if (resDepts?.data) {
        setDepartments(Array.isArray(resDepts.data) ? resDepts.data : []);
      }
      if (resDocs?.data) {
        const docs = resDocs.data?.doctors || resDocs.data || [];
        setDoctors(Array.isArray(docs) ? docs : []);
      }
    } catch (err) {
      console.error('Failed to load beds data:', err);
      setFeedback({ type: 'error', text: err.message || 'Unable to retrieve ward bed statuses.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search patients in modal
  const handleSearchPatient = async (e) => {
    if (e) e.preventDefault();
    if (!patientSearch.trim()) return;
    try {
      const res = await receptionService.getPatients({ search: patientSearch.trim(), limit: 5 });
      const pts = res.data?.patients || res.data || [];
      setPatientResults(pts);
      if (pts.length === 1) {
        setSelectedPatient(pts[0]);
        setAdmissionForm((prev) => ({ ...prev, patientId: pts[0]._id }));
        setPatientResults([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open modal with pre-selected bed if clicked
  const handleSelectBed = (ward, bed) => {
    if (bed.status !== 'Available') return;
    setAdmissionForm((prev) => ({
      ...prev,
      wardName: ward.name,
      roomNumber: bed.room || 'Room 101',
      bedNumber: bed.number,
    }));
    setModalOpen(true);
  };

  // Submit Admission
  const handleAdmissionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Please search and select a patient first.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient._id,
        doctorId: admissionForm.doctorId,
        departmentId: admissionForm.departmentId,
        ward: admissionForm.wardName,
        room: admissionForm.roomNumber,
        bedNumber: admissionForm.bedNumber,
        admissionReason: admissionForm.admissionReason,
        initialDeposit: admissionForm.initialDeposit,
      };

      await receptionService.createAdmission(payload);
      setFeedback({
        type: 'success',
        text: `Inpatient admission processed for ${selectedPatient.firstName} ${selectedPatient.lastName}! Bed ${admissionForm.bedNumber} assigned.`,
      });
      setModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      loadBedData();
    } catch (err) {
      alert(err.message || 'Failed to process admission.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = bedsData.stats || {
    total: 120,
    available: 45,
    occupied: 68,
    maintenance: 7,
  };

  const wards = bedsData.wards || [
    {
      name: 'General Medical Ward',
      type: 'General',
      total: 30,
      occupied: 22,
      available: 8,
      beds: Array.from({ length: 12 }, (_, i) => ({
        number: `G-${i + 1}`,
        room: `Room 10${Math.floor(i / 4) + 1}`,
        status: i % 3 === 0 ? 'Available' : 'Occupied',
        patientName: i % 3 === 0 ? null : 'Admitted Patient',
      })),
    },
    {
      name: 'Surgical Care Ward',
      type: 'Semi-Private',
      total: 20,
      occupied: 14,
      available: 6,
      beds: Array.from({ length: 8 }, (_, i) => ({
        number: `S-${i + 1}`,
        room: `Room 20${Math.floor(i / 2) + 1}`,
        status: i % 2 === 0 ? 'Available' : 'Occupied',
        patientName: i % 2 === 0 ? null : 'Post-Op Patient',
      })),
    },
    {
      name: 'Intensive Care Unit (ICU)',
      type: 'ICU',
      total: 10,
      occupied: 8,
      available: 2,
      beds: Array.from({ length: 6 }, (_, i) => ({
        number: `ICU-${i + 1}`,
        room: 'ICU Bay A',
        status: i === 1 || i === 4 ? 'Available' : 'Occupied',
        patientName: i === 1 || i === 4 ? null : 'Critical Patient',
      })),
    },
  ];

  const filteredWards = selectedWardFilter === 'all'
    ? wards
    : wards.filter((w) => w.type?.toLowerCase() === selectedWardFilter.toLowerCase());

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">INPATIENT ADMISSIONS</div>
          <h1 className="rec-header-title">Ward Bed Allocation & Admission</h1>
          <p className="rec-header-subtitle">
            Monitor real-time bed availability across hospital wards, check room statuses, and register inpatient admissions.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            type="button"
            className="rec-btn rec-btn--secondary"
            onClick={loadBedData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Beds</span>
          </button>
          <button
            type="button"
            className="rec-btn rec-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={18} />
            <span>Process New Admission</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* Bed Stats Row */}
      <div className="rec-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="rec-kpi-title">Total Hospital Beds</div>
          <div className="rec-kpi-value">{stats.total}</div>
          <div className="rec-kpi-subtext">Configured across all wings</div>
        </div>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="rec-kpi-title">Available for Admission</div>
          <div className="rec-kpi-value" style={{ color: '#16a34a' }}>{stats.available}</div>
          <div className="rec-kpi-subtext">Ready for immediate intake</div>
        </div>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="rec-kpi-title">Currently Occupied</div>
          <div className="rec-kpi-value" style={{ color: '#dc2626' }}>{stats.occupied}</div>
          <div className="rec-kpi-subtext">Active inpatient stays</div>
        </div>
        <div className="rec-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="rec-kpi-title">Sanitization / Maintenance</div>
          <div className="rec-kpi-value" style={{ color: '#d97706' }}>{stats.maintenance || 4}</div>
          <div className="rec-kpi-subtext">Turnaround in progress</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="rec-card" style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Filter Ward Type:</span>
            {['all', 'general', 'semi-private', 'icu'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`rec-btn rec-btn--sm ${
                  selectedWardFilter === tab ? 'rec-btn--primary' : 'rec-btn--secondary'
                }`}
                onClick={() => setSelectedWardFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#16a34a' }}></span>
              Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }}></span>
              Occupied
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }}></span>
              Maintenance
            </span>
          </div>
        </div>
      </div>

      {/* Ward Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {filteredWards.map((ward, idx) => (
          <div key={ward.name || idx} className="rec-card">
            <div className="rec-card-header">
              <div>
                <h2 className="rec-card-title">{ward.name}</h2>
                <p className="rec-card-subtitle">
                  Category: <strong>{ward.type}</strong> • Total Beds: {ward.total || ward.beds?.length || 10}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="rec-badge rec-badge--confirmed">
                  {ward.available || 5} Free
                </span>
                <span className="rec-badge rec-badge--danger">
                  {ward.occupied || 5} Occupied
                </span>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}
              >
                {(ward.beds || []).map((bed) => {
                  const isAvail = bed.status === 'Available';
                  const isOcc = bed.status === 'Occupied';

                  return (
                    <div
                      key={bed.number}
                      onClick={() => isAvail && handleSelectBed(ward, bed)}
                      style={{
                        padding: '0.85rem 0.5rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: isAvail ? '#86efac' : isOcc ? '#fca5a5' : '#fde68a',
                        backgroundColor: isAvail ? '#f0fdf4' : isOcc ? '#fef2f2' : '#fffbeb',
                        cursor: isAvail ? 'pointer' : 'default',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (isAvail) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(22, 163, 74, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAvail) {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <Bed
                        size={24}
                        style={{
                          margin: '0 auto 0.35rem',
                          color: isAvail ? '#16a34a' : isOcc ? '#dc2626' : '#d97706',
                        }}
                      />
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {bed.number}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {bed.room || 'General'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          marginTop: '0.25rem',
                          color: isAvail ? '#16a34a' : isOcc ? '#dc2626' : '#d97706',
                        }}
                      >
                        {isAvail ? 'Click to Assign' : 'Occupied'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admission Workflow Modal */}
      {modalOpen && (
        <div className="rec-modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="rec-modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rec-modal-header">
              <div>
                <h3 className="rec-modal-title">Inpatient Admission Request</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Register patient for hospital room and bed admission
                </div>
              </div>
              <button
                type="button"
                className="rec-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAdmissionSubmit}>
              <div className="rec-modal-body">
                {/* 1. Patient Finder */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="rec-form-label">1. Search & Select Patient *</label>
                  {selectedPatient ? (
                    <div
                      style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0369a1' }}>
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#0284c7' }}>
                          ID: {selectedPatient.patientId || 'Pending'} • Phone: {selectedPatient.phone}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rec-btn rec-btn--secondary rec-btn--sm"
                        onClick={() => setSelectedPatient(null)}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="Search patient by ID, Phone, or Name..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="rec-form-input"
                        />
                        <button
                          type="button"
                          className="rec-btn rec-btn--primary"
                          onClick={handleSearchPatient}
                        >
                          Find
                        </button>
                      </div>

                      {patientResults.length > 0 && (
                        <div style={{ marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                          {patientResults.map((p) => (
                            <div
                              key={p._id}
                              onClick={() => {
                                setSelectedPatient(p);
                                setPatientResults([]);
                              }}
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              <strong>{p.firstName} {p.lastName}</strong> ({p.patientId || 'No ID'}) - {p.phone}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Clinical Care Assignment */}
                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Admitting Department *</label>
                    <select
                      required
                      value={admissionForm.departmentId}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, departmentId: e.target.value })}
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
                    <label className="rec-form-label">Primary Admitting Doctor *</label>
                    <select
                      required
                      value={admissionForm.doctorId}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, doctorId: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>
                          Dr. {d.firstName} {d.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Bed & Ward Assignment */}
                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Ward Name *</label>
                    <input
                      type="text"
                      required
                      value={admissionForm.wardName}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, wardName: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Room Number *</label>
                    <input
                      type="text"
                      required
                      value={admissionForm.roomNumber}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, roomNumber: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Bed Number *</label>
                    <input
                      type="text"
                      required
                      value={admissionForm.bedNumber}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, bedNumber: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                </div>

                {/* 4. Reason & Financial Deposit */}
                <div className="rec-form-row">
                  <div className="rec-form-group" style={{ flex: 2 }}>
                    <label className="rec-form-label">Admission Diagnosis / Reason *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acute appendicitis for surgical intervention"
                      value={admissionForm.admissionReason}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, admissionReason: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group" style={{ flex: 1 }}>
                    <label className="rec-form-label">Initial Deposit (₹)</label>
                    <input
                      type="number"
                      value={admissionForm.initialDeposit}
                      onChange={(e) => setAdmissionForm({ ...admissionForm, initialDeposit: Number(e.target.value) })}
                      className="rec-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="rec-modal-footer">
                <button
                  type="button"
                  className="rec-btn rec-btn--secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rec-btn rec-btn--primary"
                  disabled={submitting}
                >
                  Confirm Inpatient Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
