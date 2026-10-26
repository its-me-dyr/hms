/**
 * Nurse Patients Tab (My Inpatients Ward Directory)
 * 
 * Clinical directory of all admitted patients assigned to the nursing care station:
 * - Filter by Ward (Ward 3A, Ward 3B, ICU) and Acuity level (Stable, Monitoring, Post-Op, Critical)
 * - Search by patient name, UHID, or room number
 * - Patient cards with bed #, diagnosis, attending physician, code status, diet, allergies, IV lines
 * - Quick Action buttons to record vitals, administer meds, and view chart summary modal
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Activity,
  Stethoscope,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NursePatientsTab({ onNavigateTab }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await nurseService.getInpatients({
        search: searchQuery,
        ward: wardFilter,
        acuity: acuityFilter,
      });
      setPatients(res.data || []);
    } catch (err) {
      console.error('Failed to load inpatients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchInpatients() {
      setLoading(true);
      try {
        const res = await nurseService.getInpatients({
          search: searchQuery,
          ward: wardFilter,
          acuity: acuityFilter,
        });
        if (!ignore) {
          setPatients(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load inpatients:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchInpatients();
    return () => {
      ignore = true;
    };
  }, [searchQuery, wardFilter, acuityFilter]);

  const getInitials = (name) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="nurse-container">
      {/* Page Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>INPATIENT WARD DIRECTORY</span>
          </div>
          <h1 className="rec-header-title">My Inpatients Under Care</h1>
          <p className="rec-header-subtitle">
            Clinical roster of assigned hospital admissions across Medical & Surgical inpatient floors.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            onClick={loadPatients}
            disabled={loading}
            className="rec-btn rec-btn--secondary"
          >
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="nurse-card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.15rem 1.4rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search by patient name, UHID, room, or bed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rec-form-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Ward Filter */}
          <div style={{ minWidth: '170px' }}>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="rec-form-select"
            >
              <option value="">All Wards & Units</option>
              <option value="Ward 3A">Ward 3A - Medical</option>
              <option value="Ward 3B">Ward 3B - Surgical</option>
            </select>
          </div>

          {/* Acuity Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={acuityFilter}
              onChange={(e) => setAcuityFilter(e.target.value)}
              className="rec-form-select"
            >
              <option value="">All Acuity Levels</option>
              <option value="Critical">Critical</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Post-Op">Post-Op</option>
              <option value="Stable">Stable</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              className="rec-form-select"
              defaultValue=""
            >
              <option value="">All Care Statuses</option>
              <option value="Admitted">Admitted Active</option>
              <option value="Observation">Under Observation</option>
              <option value="DischargePending">Discharge Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inpatient Cards Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
          <span>Loading inpatient directory...</span>
        </div>
      ) : patients.length === 0 ? (
        <div className="rec-empty-state nurse-card">
          <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem', display: 'block' }} />
          <div className="rec-empty-state-title">No Inpatients Match Criteria</div>
          <p className="rec-empty-state-desc">Try clearing search filters to see all admitted patients.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setWardFilter('');
              setAcuityFilter('');
            }}
            className="rec-btn rec-btn--primary rec-btn--sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', width: '100%' }}>
          {patients.map((p) => (
            <div
              key={p.id}
              className="nurse-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                width: '100%',
                borderLeft: `4px solid ${
                  p.acuity === 'Critical'
                    ? '#dc2626'
                    : p.acuity === 'Monitoring'
                    ? '#0284c7'
                    : p.acuity === 'Post-Op'
                    ? '#9333ea'
                    : '#10b981'
                }`,
              }}
            >
              {/* Card Header: Bed + Acuity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span
                  style={{
                    background: '#f0f9ff',
                    color: '#0284c7',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd',
                  }}
                >
                  {p.bed} • {p.room}
                </span>
                <span className={`nurse-badge nurse-badge--${p.acuity.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {p.acuity}
                </span>
              </div>

              {/* Patient Profile Line */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  className="rec-avatar-circle"
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: '0.95rem',
                    background: '#e0f2fe',
                    color: '#0284c7',
                  }}
                >
                  {getInitials(p.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {p.patientId} • {p.age} yrs • {p.gender} • <strong style={{ color: '#0891b2' }}>{p.bloodGroup}</strong>
                  </div>
                </div>
              </div>

              {/* Clinical Details */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.78rem',
                  color: '#334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Diagnosis:</strong> {p.diagnosis}
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Physician:</strong> {p.attendingDoctor}
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Diet:</strong> {p.diet}
                </div>
                <div>
                  <strong style={{ color: '#dc2626' }}>Allergies:</strong> {p.allergies}
                </div>
              </div>

              {/* Last Vitals Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  background: p.lastVitals.status === 'warning' ? '#fffbeb' : '#ffffff',
                  border: `1px solid ${p.lastVitals.status === 'warning' ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={14} style={{ color: '#0284c7' }} />
                  <span>
                    BP: <strong>{p.lastVitals.bp}</strong>
                  </span>
                  <span>
                    HR: <strong>{p.lastVitals.hr}</strong>
                  </span>
                  <span>
                    SpO2: <strong>{p.lastVitals.spo2}%</strong>
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.lastVitals.time}</span>
              </div>

              {/* Bottom Card Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedPatient(p)}
                  className="rec-btn rec-btn--secondary rec-btn--sm"
                  style={{ flex: 1 }}
                >
                  <Eye size={13} />
                  <span>Chart Details</span>
                </button>
                <button
                  onClick={() => onNavigateTab('vitals')}
                  className="rec-btn rec-btn--primary rec-btn--sm"
                  style={{ flex: 1 }}
                >
                  <Activity size={13} />
                  <span>Record Vitals</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart Details Large Responsive Modal */}
      {selectedPatient && (
        <div className="rec-modal-overlay">
          <div className="rec-modal-card" style={{ maxWidth: '960px', width: '92vw' }}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Stethoscope size={20} style={{ color: '#0284c7' }} />
                <span>Clinical Inpatient Chart • {selectedPatient.name}</span>
              </h3>
              <button onClick={() => setSelectedPatient(null)} className="rec-modal-close">
                ✕
              </button>
            </div>

            <div className="rec-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Patient Top Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="rec-avatar-circle" style={{ width: 48, height: 48, fontSize: '1.1rem', background: '#e0f2fe', color: '#0284c7' }}>
                    {getInitials(selectedPatient.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedPatient.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      UHID: <strong>{selectedPatient.patientId}</strong> • {selectedPatient.gender} • {selectedPatient.age} yrs • Blood Group: <strong style={{ color: '#0891b2' }}>{selectedPatient.bloodGroup}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '1rem' }}>
                      {selectedPatient.bed} ({selectedPatient.room})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned Inpatient</div>
                  </div>
                  <span className={`nurse-badge nurse-badge--${selectedPatient.acuity.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
                    {selectedPatient.acuity}
                  </span>
                </div>
              </div>

              {/* 2-Column Desktop Grid Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
                {/* Left Column: Patient Info, Admission, Telemetry Vitals & Labs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Admission & Support Telemetry
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div><span style={{ color: '#64748b' }}>Admitted:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.admissionDate}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Code Status:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.codeStatus}</strong></div>
                      <div><span style={{ color: '#64748b' }}>IV Access:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.ivAccess}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Oxygen / Resp:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.oxygen}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Dietary:</span> <strong style={{ color: 'var(--text-primary)' }}>{selectedPatient.diet}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Fall Risk:</span> <strong style={{ color: '#d97706' }}>Standard Protocol</strong></div>
                    </div>
                  </div>

                  {/* Current Vitals Profile */}
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Latest Vitals Stream
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{selectedPatient.lastVitals.time}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', textAlign: 'center' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Blood Pressure</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedPatient.lastVitals.bp}</div>
                      </div>
                      <div style={{ background: 'var(--bg-card)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Heart Rate</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0284c7' }}>{selectedPatient.lastVitals.hr} bpm</div>
                      </div>
                      <div style={{ background: 'var(--bg-card)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Oxygen SpO2</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>{selectedPatient.lastVitals.spo2}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Diagnosis, Orders, Allergies, Care Plans */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Primary Diagnosis & Attending Staff
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPatient.diagnosis}</p>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                      Attending Physician: <strong style={{ color: '#0284c7' }}>{selectedPatient.attendingDoctor}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#fff1f2', padding: '1rem', border: '1px solid #fecdd3', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#991b1b', marginBottom: '0.35rem' }}>
                      Allergies & Clinical Precautions
                    </div>
                    <div style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>{selectedPatient.allergies}</div>
                    <div style={{ fontSize: '0.72rem', color: '#e11d48', marginTop: '0.25rem' }}>Verify wristband barcoding before all medication passes.</div>
                  </div>

                  <div style={{ background: '#f0fdfa', padding: '1rem', border: '1px solid #ccfbf1', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f766e', marginBottom: '0.35rem' }}>
                      Shift Nursing Plan & Orders
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#134e4a', lineHeight: 1.45 }}>
                      Continuous vitals monitoring Q4H. Follow eMAR scheduled timings for IV push and oral medication. Report any SpO2 drop below 94% to attending physician immediately.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rec-modal-footer">
              <button
                onClick={() => setSelectedPatient(null)}
                className="rec-btn rec-btn--secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  onNavigateTab('notes');
                }}
                className="rec-btn rec-btn--secondary"
              >
                <span>View SOAP Notes</span>
              </button>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  onNavigateTab('vitals');
                }}
                className="rec-btn rec-btn--primary"
              >
                <Activity size={15} />
                <span>Record Vitals</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
