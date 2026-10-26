/**
 * Doctor Clinical Workspace — Patient Records (EMR)
 * 
 * Secure, professional electronic medical record (EMR) workspace.
 * Displays longitudinal clinical history, consultations, prescriptions,
 * laboratory tests, radiology reports, and medical alerts.
 * Backed strictly by real backend data from /api/v1/doctor/patients endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doctorService } from '../../../services/doctor.service';
import {
  FileText,
  Search,
  RefreshCw,
  User,
  AlertTriangle,
  Stethoscope,
  Pill,
  Microscope,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Eye,
  Activity,
} from 'lucide-react';

export default function DoctorPatientRecordsTab({ onNavigateTab: _onNavigateTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId');

  // Currently Loaded Patient Clinical Summary
  const [selectedPatientId, setSelectedPatientId] = useState(urlPatientId || null);
  const [recordData, setRecordData] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Patient Directory Selection
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Timeline Filters & Expanded Items
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'consultation' | 'prescription' | 'investigation' | 'appointment'
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // Load Recent Patients for quick selection
  const loadRecentPatients = useCallback(async () => {
    try {
      const res = await doctorService.getPatients({ limit: 6, sortBy: 'lastVisit', sortOrder: 'desc' });
      setRecentPatients(res.data?.data?.patients || []);
    } catch (err) {
      console.error('Failed to load recent patients:', err);
    }
  }, []);

  useEffect(() => {
    loadRecentPatients();
  }, [loadRecentPatients]);

  // Load Selected Patient's Medical Records
  const loadPatientRecord = useCallback(async (patientIdToLoad, isSilent = false) => {
    if (!patientIdToLoad) return;
    if (!isSilent) setLoadingRecord(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await doctorService.getPatientDetails(patientIdToLoad);
      const data = res.data?.data || res.data;
      setRecordData(data);
      setSelectedPatientId(patientIdToLoad);
    } catch (err) {
      console.error('Failed to load patient records:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load medical records for this patient.'
      );
    } finally {
      setLoadingRecord(false);
      setRefreshing(false);
    }
  }, []);

  // Sync with URL or state
  useEffect(() => {
    if (urlPatientId && urlPatientId !== selectedPatientId) {
      setSelectedPatientId(urlPatientId);
      loadPatientRecord(urlPatientId);
    } else if (selectedPatientId && !recordData) {
      loadPatientRecord(selectedPatientId);
    }
  }, [urlPatientId, selectedPatientId, recordData, loadPatientRecord]);

  // Handle Patient Search autocomplete
  useEffect(() => {
    if (!patientSearchQuery.trim()) {
      setPatientSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await doctorService.getPatients({
          search: patientSearchQuery.trim(),
          limit: 6,
        });
        setPatientSearchResults(res.data?.data?.patients || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Failed to search patients:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearchQuery]);

  // Select a patient
  const handleSelectPatient = (p) => {
    const id = p.patientMongoId || p.id || p.patientId;
    setSelectedPatientId(id);
    setPatientSearchQuery('');
    setShowSearchDropdown(false);
    setExpandedRecordId(null);
    setCategoryFilter('all');
    setSearchParams({ tab: 'records', patientId: id });
    loadPatientRecord(id);
  };

  // Change / Deselect patient
  const handleChangePatient = () => {
    setSelectedPatientId(null);
    setRecordData(null);
    setError(null);
    setSearchParams({ tab: 'records' });
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filtered Timeline
  const timeline = recordData?.timeline || [];
  const filteredTimeline = timeline.filter((item) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'consultation') return item.type === 'consultation';
    if (categoryFilter === 'prescription') return item.type === 'prescription';
    if (categoryFilter === 'investigation') return item.type === 'lab' || item.type === 'radiology';
    if (categoryFilter === 'appointment') return item.type === 'appointment';
    return true;
  });

  // Patient Profile & Demographics
  const patient = recordData?.patient;
  const allergies = patient?.allergies || [];
  const summaryCounts = recordData?.summaryCounts || {
    totalRecords: timeline.length,
    consultationsCount: 0,
    prescriptionsCount: 0,
    labCount: 0,
    radiologyCount: 0,
    appointmentsCount: 0,
  };

  return (
    <div className="doc-records-layout">
      {/* ── 1. COMPACT PAGE HEADER ── */}
      <header className="doc-patients-header-row" aria-label="Patient Records Header">
        <div className="doc-patients-header-left">
          <h1>
            <FileText size={20} style={{ color: '#0891b2' }} />
            <span>Patient Records</span>
          </h1>
          <p>Review authorized patient medical histories and clinical records.</p>
        </div>

        <div className="doc-patients-header-right" style={{ position: 'relative' }}>
          {/* Patient Search Input */}
          <div className="doc-queue-search-box" style={{ position: 'relative', width: '270px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '1.85rem',
                paddingRight: patientSearchQuery ? '1.75rem' : '0.65rem',
                height: '30px',
                fontSize: '0.78rem',
                width: '100%',
                borderRadius: '4px',
              }}
              placeholder="Find patient by name or ID..."
              value={patientSearchQuery}
              onChange={(e) => setPatientSearchQuery(e.target.value)}
              onFocus={() => {
                if (patientSearchResults.length > 0) setShowSearchDropdown(true);
              }}
            />
            {patientSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setPatientSearchQuery('');
                  setPatientSearchResults([]);
                }}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: 0,
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}

            {/* Quick Autocomplete Dropdown */}
            {showSearchDropdown && patientSearchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  marginTop: '0.25rem',
                  zIndex: 20,
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {patientSearchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ color: '#0891b2', fontSize: '0.7rem' }}>{p.patientId}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {p.gender} • {p.age}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Change Patient Button (when patient is selected) */}
          {selectedPatientId && (
            <button
              type="button"
              onClick={handleChangePatient}
              className="btn btn--outline btn--sm"
              style={{
                height: '30px',
                padding: '0 0.6rem',
                fontSize: '0.75rem',
              }}
              title="Select another patient"
            >
              Change Patient
            </button>
          )}

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadPatientRecord(selectedPatientId, true)}
            className="btn btn--outline btn--sm"
            style={{
              height: '30px',
              padding: '0 0.65rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            disabled={!selectedPatientId || loadingRecord || refreshing}
            title="Refresh clinical records"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ── 2. STATE A: NO PATIENT SELECTED YET ── */}
      {!selectedPatientId ? (
        <section className="doc-patients-table-panel" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', opacity: 0.8 }}>
              <User size={32} style={{ color: '#0891b2' }} />
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
              Search for a patient to view records
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Use the search bar above to look up an authorized patient by name or ID, or select from your recent assigned patients below.
            </p>
          </div>

          {/* Recent Assigned Patients Grid */}
          {recentPatients.length > 0 && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Your Assigned Patients
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.55rem' }}>
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="doc-patients-kpi-card"
                    style={{ padding: '0.6rem 0.75rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="doc-patient-avatar" style={{ width: '28px', height: '28px', fontSize: '0.72rem' }}>
                        {(p.firstName || 'P')[0]}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#0891b2', fontWeight: 600 }}>
                          {p.patientId}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : loadingRecord ? (
        /* ── LOADING RECORD STATE ── */
        <div className="doc-patients-table-panel" style={{ textAlign: 'center', padding: '3.5rem 0' }}>
          <div className="spinner spinner--sm" style={{ margin: '0 auto 0.5rem auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: 0 }}>
            Loading longitudinal medical records...
          </p>
        </div>
      ) : error ? (
        /* ── ERROR / FORBIDDEN STATE ── */
        <div className="doc-patients-table-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <AlertCircle size={28} style={{ color: '#dc2626', margin: '0 auto 0.5rem auto' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            Unable to access medical records
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem auto 1rem auto', maxWidth: '420px' }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => loadPatientRecord(selectedPatientId)}
              className="btn btn--primary btn--sm"
              style={{ height: '30px', fontSize: '0.75rem' }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleChangePatient}
              className="btn btn--outline btn--sm"
              style={{ height: '30px', fontSize: '0.75rem' }}
            >
              Select Another Patient
            </button>
          </div>
        </div>
      ) : (
        /* ── 3. STATE B: PATIENT RECORD LOADED ── */
        <>
          {/* 3.1 Patient Identity & Demographics Banner */}
          <section className="doc-records-banner" aria-label="Patient Identity">
            <div className="doc-records-banner-left">
              <div className="doc-records-avatar">
                {(patient?.firstName || 'P')[0]}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {patient?.name}
                  </h2>
                  <span className="badge badge--primary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>
                    {patient?.patientId}
                  </span>
                  <span
                    className={`badge ${patient?.status === 'Active' ? 'badge--success' : 'badge--secondary'}`}
                    style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}
                  >
                    {patient?.status || 'Active'}
                  </span>
                </div>

                {/* Demographics details */}
                <div className="doc-records-meta-grid">
                  <div className="doc-records-meta-item">
                    <span>Age:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{patient?.age}</strong>
                  </div>
                  <span>•</span>
                  <div className="doc-records-meta-item">
                    <span>Gender:</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {patient?.gender}
                    </strong>
                  </div>
                  <span>•</span>
                  <div className="doc-records-meta-item">
                    <span>Blood Group:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{patient?.bloodGroup || '—'}</strong>
                  </div>
                  <span>•</span>
                  <div className="doc-records-meta-item">
                    <span>Phone:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{patient?.phone || '—'}</strong>
                  </div>
                  {patient?.emergencyContact?.phone && (
                    <>
                      <span>•</span>
                      <div className="doc-records-meta-item">
                        <span>Emergency:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {patient.emergencyContact.name} ({patient.emergencyContact.phone})
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3.2 Clinical Alerts & Medical History */}
          <section className="doc-records-alerts-bar" aria-label="Clinical Warnings and Allergies">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: allergies.length > 0 ? '#b91c1c' : 'var(--text-secondary)',
                }}
              >
                <AlertTriangle size={13} />
                <span>Allergies:</span>
              </div>

              {allergies.length > 0 ? (
                allergies.map((allergy, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.12rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#dc2626',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    {allergy}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Allergy information not recorded on file
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span>Total Records: <strong style={{ color: 'var(--text-primary)' }}>{summaryCounts.totalRecords}</strong></span>
              <span>•</span>
              <span>Visits: <strong style={{ color: 'var(--text-primary)' }}>{summaryCounts.consultationsCount}</strong></span>
              <span>•</span>
              <span>Prescriptions: <strong style={{ color: 'var(--text-primary)' }}>{summaryCounts.prescriptionsCount}</strong></span>
            </div>
          </section>

          {/* 3.3 Record Category Filters */}
          <section className="doc-patients-filter-row" aria-label="Record Type Filters">
            <div className="doc-patients-filter-group">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Filter Records:
              </span>
              {[
                { id: 'all', label: `All Timeline (${summaryCounts.totalRecords})` },
                { id: 'consultation', label: `Consultations (${summaryCounts.consultationsCount})` },
                { id: 'prescription', label: `Prescriptions (${summaryCounts.prescriptionsCount})` },
                { id: 'investigation', label: `Investigations (${summaryCounts.labCount + summaryCounts.radiologyCount})` },
                { id: 'appointment', label: `Appointments (${summaryCounts.appointmentsCount})` },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  className={`doc-queue-pill-btn ${categoryFilter === c.id ? 'is-active' : ''}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Sorted newest first
            </div>
          </section>

          {/* 3.4 Longitudinal Medical Record Timeline */}
          <section className="doc-records-timeline-wrap" aria-label="Medical Timeline">
            {filteredTimeline.length > 0 ? (
              filteredTimeline.map((item) => {
                const isExpanded = expandedRecordId === item.id;

                // Color configuration per record type
                let badgeStyle = { background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' };
                let Icon = Stethoscope;

                if (item.type === 'consultation') {
                  badgeStyle = { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' };
                  Icon = Stethoscope;
                } else if (item.type === 'prescription') {
                  badgeStyle = { background: 'rgba(5, 150, 105, 0.1)', color: '#059669' };
                  Icon = Pill;
                } else if (item.type === 'lab') {
                  badgeStyle = { background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' };
                  Icon = Microscope;
                } else if (item.type === 'radiology') {
                  badgeStyle = { background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' };
                  Icon = Eye;
                } else if (item.type === 'appointment') {
                  badgeStyle = { background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-secondary)' };
                  Icon = Calendar;
                }

                return (
                  <article key={item.id} className="doc-records-card">
                    {/* Header Row */}
                    <div className="doc-records-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span className="doc-records-badge-type" style={badgeStyle}>
                          <Icon size={12} />
                          <span>{item.category}</span>
                        </span>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {item.title}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={11} />
                          <span>{formatDate(item.date)}</span>
                        </span>
                        <span
                          className={`badge ${
                            ['Completed', 'Verified', 'Active'].includes(item.status)
                              ? 'badge--success'
                              : ['Pending', 'Requested'].includes(item.status)
                              ? 'badge--secondary'
                              : 'badge--primary'
                          }`}
                          style={{ fontSize: '0.675rem', padding: '0.1rem 0.4rem' }}
                        >
                          {item.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedRecordId(isExpanded ? null : item.id)}
                          className="btn btn--outline btn--sm"
                          style={{
                            height: '24px',
                            padding: '0 0.45rem',
                            fontSize: '0.7rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                          title={isExpanded ? 'Collapse record' : 'Expand full details'}
                        >
                          <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </div>
                    </div>

                    {/* Concise Summary */}
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.summary}
                    </p>

                    {item.clinician && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Recorded by: <strong>{item.clinician}</strong>
                      </div>
                    )}

                    {/* ── EXPANDED DETAIL VIEW ── */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                          background: 'var(--bg-surface)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '4px',
                        }}
                      >
                        {/* Consultation Record Details */}
                        {item.type === 'consultation' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {item.data?.vitals && (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Activity size={12} style={{ color: '#0891b2' }} />
                                  <span>Recorded Vitals</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                                  <div>BP: <strong>{item.data.vitals.bp || '—'}</strong></div>
                                  <div>HR: <strong>{item.data.vitals.heartRate || '—'}</strong></div>
                                  <div>Temp: <strong>{item.data.vitals.temperature || '—'}</strong></div>
                                  <div>SpO2: <strong>{item.data.vitals.spo2 || '—'}</strong></div>
                                  <div>Weight: <strong>{item.data.vitals.weight || '—'}</strong></div>
                                </div>
                              </div>
                            )}
                            {item.data?.clinicalNotes && (
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Examination Notes: </strong>
                                <span>{item.data.clinicalNotes}</span>
                              </div>
                            )}
                            {item.data?.treatment && (
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Treatment Plan: </strong>
                                <span>{item.data.treatment}</span>
                              </div>
                            )}
                            {item.data?.followUpDate && (
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Scheduled Follow-up: </strong>
                                <span style={{ color: '#2563eb', fontWeight: 600 }}>{formatDate(item.data.followUpDate)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Prescription Record Details */}
                        {item.type === 'prescription' && (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Medications Prescribed:
                            </div>
                            {item.data?.medications?.length > 0 ? (
                              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.25rem 0' }}>Medicine</th>
                                    <th style={{ padding: '0.25rem 0' }}>Dosage</th>
                                    <th style={{ padding: '0.25rem 0' }}>Frequency</th>
                                    <th style={{ padding: '0.25rem 0' }}>Duration</th>
                                    <th style={{ padding: '0.25rem 0' }}>Instructions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.data.medications.map((m, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '0.3rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                                      <td style={{ padding: '0.3rem 0' }}>{m.dosage}</td>
                                      <td style={{ padding: '0.3rem 0' }}>{m.frequency}</td>
                                      <td style={{ padding: '0.3rem 0' }}>{m.duration}</td>
                                      <td style={{ padding: '0.3rem 0', color: 'var(--text-secondary)' }}>{m.instructions || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ color: 'var(--text-muted)' }}>No medication items recorded.</div>
                            )}
                          </div>
                        )}

                        {/* Lab Test Parameters Details */}
                        {item.type === 'lab' && (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                              Investigation Results:
                            </div>
                            {item.data?.parameters?.length > 0 ? (
                              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.25rem 0' }}>Parameter</th>
                                    <th style={{ padding: '0.25rem 0' }}>Result</th>
                                    <th style={{ padding: '0.25rem 0' }}>Reference Range</th>
                                    <th style={{ padding: '0.25rem 0' }}>Flag</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.data.parameters.map((p, pIdx) => (
                                    <tr key={pIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <td style={{ padding: '0.3rem 0', fontWeight: 600 }}>{p.parameter}</td>
                                      <td style={{ padding: '0.3rem 0' }}>{p.result} {p.unit}</td>
                                      <td style={{ padding: '0.3rem 0', color: 'var(--text-secondary)' }}>{p.referenceRange || '—'}</td>
                                      <td style={{ padding: '0.3rem 0' }}>
                                        <span className={`badge ${p.flag === 'Normal' ? 'badge--success' : 'badge--danger'}`} style={{ fontSize: '0.65rem' }}>
                                          {p.flag}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ color: 'var(--text-muted)' }}>Result parameters pending verification.</div>
                            )}
                          </div>
                        )}

                        {/* Radiology Imaging Details */}
                        {item.type === 'radiology' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Modality: </strong>{item.data?.modality} • Body Part: {item.data?.bodyPart || '—'}</div>
                            {item.data?.findings && (
                              <div><strong style={{ color: 'var(--text-primary)' }}>Findings: </strong>{item.data.findings}</div>
                            )}
                            {item.data?.impression && (
                              <div><strong style={{ color: 'var(--text-primary)' }}>Clinical Impression: </strong>{item.data.impression}</div>
                            )}
                          </div>
                        )}

                        {/* Appointment Details */}
                        {item.type === 'appointment' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Department: </strong>{item.data?.department}</div>
                            <div><strong style={{ color: 'var(--text-primary)' }}>Scheduled Time: </strong>{item.data?.appointmentTime}</div>
                            {item.data?.notes && (
                              <div><strong style={{ color: 'var(--text-primary)' }}>Notes: </strong>{item.data.notes}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              /* No matching records in timeline */
              <div className="doc-patients-table-panel" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.45rem', opacity: 0.75 }}>
                  <Clock size={26} />
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {categoryFilter === 'all'
                    ? 'No clinical records found'
                    : `No ${categoryFilter} records found`}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.2rem 0 0.85rem 0' }}>
                  {categoryFilter === 'all'
                    ? 'No previous clinical consultations, prescriptions, or investigations are recorded for this patient.'
                    : `There are currently no records in the ${categoryFilter} category for this patient.`}
                </p>
                {categoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.74rem', height: '28px' }}
                  >
                    View All Records
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
