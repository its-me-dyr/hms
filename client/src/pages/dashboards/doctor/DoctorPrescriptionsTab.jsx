/**
 * Doctor Clinical Workspace — Prescriptions Tab
 * 
 * Clinical workstation for doctors to create, review, discontinue,
 * and print patient prescriptions.
 * 
 * Backed by real MongoDB Prescription and User models with zero mock data.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pill,
  Search,
  RefreshCw,
  Plus,
  Eye,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Trash2,
  User,
  Calendar,
  Clock,
  Ban,
  Activity,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { doctorService } from '../../../services/doctor.service';

const COMMON_DIAGNOSES = [
  'Upper Respiratory Tract Infection',
  'Acute Bronchitis',
  'Hypertension (Stage 1)',
  'Type 2 Diabetes Mellitus',
  'Acute Gastroenteritis',
  'Allergic Rhinitis',
  'Migraine without Aura',
  'Urinary Tract Infection',
  'Musculoskeletal Pain / Strain',
];

const FREQUENCY_OPTIONS = [
  'Once daily (OD) - Morning',
  'Once daily (OD) - Bedtime',
  'Twice daily (BD) - Morning & Night',
  'Thrice daily (TDS) - 8 Hourly',
  'Four times daily (QDS) - 6 Hourly',
  'SOS (As needed for pain/fever)',
  'Every alternate day',
];

const DURATION_OPTIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month (30 days)',
  '2 months (60 days)',
  '3 months (90 days)',
];

export default function DoctorPrescriptionsTab({ onNavigateTab, onOpenPatientRecord }) {
  const [searchParams] = useSearchParams();
  const paramPatientId = searchParams.get('patientId');
  const paramAppointmentId = searchParams.get('appointmentId');

  // ── 1. Prescriptions List State ──
  const [prescriptions, setPrescriptions] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, discontinued: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Completed' | 'Discontinued'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // ── 2. Modal States ──
  // New Prescription Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [catalogMedicines, setCatalogMedicines] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // New Prescription Form
  const [formPatientId, setFormPatientId] = useState('');
  const [formAppointmentId, setFormAppointmentId] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMedications, setFormMedications] = useState([
    { name: '', dosage: '', frequency: 'Twice daily (BD) - Morning & Night', duration: '5 days', instructions: 'Take after food' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Details & Print Modal
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Discontinue Confirmation Modal
  const [discontinueTarget, setDiscontinueTarget] = useState(null);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [discontinuing, setDiscontinuing] = useState(false);

  // Printable ref
  const printContentRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── 3. Fetch Prescriptions List ──
  const fetchPrescriptions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedDate) params.date = selectedDate;

      const res = await doctorService.getPrescriptions(params);
      const data = res.data?.data || res.data || {};
      setPrescriptions(data.prescriptions || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load prescriptions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, debouncedSearch, selectedDate]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Load medicines catalog and patients for creation form
  const loadFormDataPrerequisites = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const [medsRes, patRes] = await Promise.all([
        doctorService.getMedicines().catch((e) => {
          console.warn('Could not load medicines catalog:', e);
          return { data: { data: { medicines: [] } } };
        }),
        doctorService.getPatients({ limit: 100 }).catch((e) => {
          console.warn('Could not load assigned patients:', e);
          return { data: { data: { patients: [] } } };
        }),
      ]);

      const rawMeds = medsRes.data?.data?.medicines || medsRes.data?.medicines || (Array.isArray(medsRes.data?.data) ? medsRes.data.data : (Array.isArray(medsRes.data) ? medsRes.data : []));
      setCatalogMedicines(Array.isArray(rawMeds) ? rawMeds : []);

      const rawPats = patRes.data?.data?.patients || patRes.data?.patients || (Array.isArray(patRes.data?.data) ? patRes.data.data : (Array.isArray(patRes.data) ? patRes.data : []));
      setAssignedPatients(Array.isArray(rawPats) ? rawPats : []);
    } catch (err) {
      console.error('Failed to load form prerequisites:', err);
      setCatalogMedicines([]);
      setAssignedPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (showNewModal) {
      loadFormDataPrerequisites();
    }
  }, [showNewModal, loadFormDataPrerequisites]);

  // Auto-select patient from query param if provided
  useEffect(() => {
    if (paramPatientId && !formPatientId) {
      setFormPatientId(paramPatientId);
      if (paramAppointmentId) {
        setFormAppointmentId(paramAppointmentId);
      }
      setShowNewModal(true);
    }
  }, [paramPatientId, paramAppointmentId, formPatientId]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions(true);
  };

  // ── 4. Open Details Modal ──
  const handleOpenDetails = async (id) => {
    setLoadingDetails(true);
    setDetailsError(null);
    setSelectedPrescription(null);
    try {
      const res = await doctorService.getPrescriptionById(id);
      const data = res.data?.data || res.data || {};
      setSelectedPrescription(data.prescription || null);
    } catch (err) {
      console.error('Failed to load prescription details:', err);
      setDetailsError(err.response?.data?.message || err.message || 'Could not load prescription details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // ── 5. Add / Remove / Update Medication Row ──
  const handleAddMedicationRow = () => {
    setFormMedications((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: 'Twice daily (BD) - Morning & Night', duration: '5 days', instructions: 'Take after food' },
    ]);
  };

  const handleRemoveMedicationRow = (index) => {
    if (formMedications.length <= 1) return;
    setFormMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    setFormMedications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectCatalogMedicine = (index, med) => {
    setFormMedications((prev) => {
      const updated = [...prev];
      updated[index] = {
        name: med.name,
        dosage: med.dosage || med.strength || updated[index].dosage,
        frequency: med.defaultFrequency || updated[index].frequency,
        duration: med.defaultDuration || updated[index].duration,
        instructions: med.instructions || updated[index].instructions,
      };
      return updated;
    });
  };

  // Selected Patient Details in Form
  const selectedPatientData = useMemo(() => {
    if (!formPatientId) return null;
    return assignedPatients.find((p) => p.id === formPatientId || p._id === formPatientId || p.patientMongoId === formPatientId);
  }, [formPatientId, assignedPatients]);

  // ── 6. Create Prescription Submit ──
  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formPatientId) {
      setFormError('Please select a patient.');
      return;
    }

    // Validate medication rows
    for (let i = 0; i < formMedications.length; i++) {
      const med = formMedications[i];
      if (!med.name.trim()) {
        setFormError(`Medication item #${i + 1} requires a valid medicine name.`);
        return;
      }
      if (!med.dosage.trim()) {
        setFormError(`Medication item #${i + 1} (${med.name}) requires a dosage.`);
        return;
      }
      if (!med.frequency.trim()) {
        setFormError(`Medication item #${i + 1} (${med.name}) requires frequency.`);
        return;
      }
      if (!med.duration.trim()) {
        setFormError(`Medication item #${i + 1} (${med.name}) requires duration.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: formPatientId,
        appointmentId: formAppointmentId || null,
        diagnosis: formDiagnosis.trim(),
        notes: formNotes.trim(),
        medications: formMedications.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions.trim(),
        })),
      };

      const res = await doctorService.createPrescription(payload);
      const newRx = res.data?.data || res.data;

      setFormSuccess('Prescription issued and signed successfully.');
      setTimeout(() => {
        setShowNewModal(false);
        // Reset form
        setFormPatientId('');
        setFormAppointmentId('');
        setFormDiagnosis('');
        setFormNotes('');
        setFormMedications([
          { name: '', dosage: '', frequency: 'Twice daily (BD) - Morning & Night', duration: '5 days', instructions: 'Take after food' },
        ]);
        setFormSuccess(null);
        fetchPrescriptions(true);
        if (newRx?.id) {
          handleOpenDetails(newRx.id);
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to create prescription:', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to issue prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 7. Discontinue Prescription ──
  const handleConfirmDiscontinue = async () => {
    if (!discontinueTarget) return;
    setDiscontinuing(true);
    try {
      await doctorService.updatePrescriptionStatus(discontinueTarget.id, {
        status: 'Discontinued',
        reason: discontinueReason.trim() || 'Prescription discontinued by attending physician',
      });
      setDiscontinueTarget(null);
      setDiscontinueReason('');
      if (selectedPrescription && selectedPrescription.id === discontinueTarget.id) {
        setSelectedPrescription((prev) => ({ ...prev, status: 'Discontinued' }));
      }
      fetchPrescriptions(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to discontinue prescription.');
    } finally {
      setDiscontinuing(false);
    }
  };

  // ── 8. Print Handler ──
  const handlePrint = () => {
    window.print();
  };

  // Clear filters
  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setSelectedDate('');
  };

  const hasActiveFilters = statusFilter !== 'all' || searchQuery.trim() !== '' || selectedDate !== '';

  return (
    <div className="doc-prescriptions-workspace">
      {/* ── SECTION 1: COMPACT HEADER ── */}
      <div
        className="doc-section-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Pill size={20} style={{ color: 'var(--color-primary, #059669)' }} />
            Prescriptions
          </h1>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Create, review, and manage electronic prescriptions for authorized patients.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="btn btn--outline btn--sm"
            title="Refresh prescriptions list"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="btn btn--primary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            <Plus size={15} />
            <span>New Prescription</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 2: SUMMARY KPI CARDS ── */}
      <div
        className="doc-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1rem',
        }}
      >
        {/* Total Prescriptions */}
        <div
          className={`doc-kpi-card ${statusFilter === 'all' ? 'doc-kpi-card--active' : ''}`}
          onClick={() => setStatusFilter('all')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', padding: '0.85rem 1rem' }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__label">Total Prescriptions</span>
            <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
              <FileText size={17} />
            </div>
          </div>
          <div className="doc-kpi-card__value">{summary.total}</div>
          <div className="doc-kpi-card__meta">All issued records</div>
        </div>

        {/* Active Prescriptions */}
        <div
          className={`doc-kpi-card ${statusFilter === 'Active' ? 'doc-kpi-card--active' : ''}`}
          onClick={() => setStatusFilter('Active')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', padding: '0.85rem 1rem' }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__label">Active Regimens</span>
            <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ color: '#059669' }}>{summary.active}</div>
          <div className="doc-kpi-card__meta">Valid active courses</div>
        </div>

        {/* Completed Prescriptions */}
        <div
          className={`doc-kpi-card ${statusFilter === 'Completed' ? 'doc-kpi-card--active' : ''}`}
          onClick={() => setStatusFilter('Completed')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', padding: '0.85rem 1rem' }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__label">Completed Courses</span>
            <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <Check size={17} />
            </div>
          </div>
          <div className="doc-kpi-card__value">{summary.completed}</div>
          <div className="doc-kpi-card__meta">Course concluded</div>
        </div>

        {/* Discontinued */}
        <div
          className={`doc-kpi-card ${statusFilter === 'Discontinued' ? 'doc-kpi-card--active' : ''}`}
          onClick={() => setStatusFilter('Discontinued')}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', padding: '0.85rem 1rem' }}
        >
          <div className="doc-kpi-card__top">
            <span className="doc-kpi-card__label">Discontinued</span>
            <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <Ban size={17} />
            </div>
          </div>
          <div className="doc-kpi-card__value" style={{ color: summary.discontinued > 0 ? '#ef4444' : undefined }}>
            {summary.discontinued}
          </div>
          <div className="doc-kpi-card__meta">Stopped / Altered</div>
        </div>
      </div>

      {/* ── SECTION 3: FILTER & SEARCH TOOLBAR ── */}
      <div
        className="doc-filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          background: 'var(--bg-card)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Status Pills */}
        <div className="doc-filter-pills" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Prescriptions', count: summary.total },
            { id: 'Active', label: 'Active', count: summary.active },
            { id: 'Completed', label: 'Completed', count: summary.completed },
            { id: 'Discontinued', label: 'Discontinued', count: summary.discontinued },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`doc-filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--border-color)',
                background: statusFilter === tab.id ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                color: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: statusFilter === tab.id ? 600 : 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '10px',
                  background: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: statusFilter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div className="doc-search-box" style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search Rx code, patient, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '30px',
                paddingRight: searchQuery ? '28px' : '10px',
                fontSize: '0.8rem',
                height: '34px',
                borderRadius: '6px',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ fontSize: '0.8rem', height: '34px', borderRadius: '6px', width: '140px' }}
            title="Filter by Prescription Date"
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn--outline btn--sm"
              style={{ fontSize: '0.78rem', height: '34px', padding: '0 0.6rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── ERROR ALERT ── */}
      {error && (
        <div className="alert alert--danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => fetchPrescriptions(false)} className="btn btn--outline btn--sm">
            Retry
          </button>
        </div>
      )}

      {/* ── SECTION 4: PRESCRIPTIONS TABLE ── */}
      <div className="doc-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && !refreshing ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Loading authorized clinical prescriptions...
            </p>
          </div>
        ) : prescriptions.length > 0 ? (
          <div className="doc-table-container">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Rx Code & Date</th>
                  <th>Patient Details</th>
                  <th>Diagnosis</th>
                  <th>Medications Summary</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const hasAllergies = rx.patientAllergies && rx.patientAllergies.length > 0;
                  const dateStr = rx.prescriptionDate
                    ? new Date(rx.prescriptionDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={rx.id}>
                      {/* Rx Code & Date */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            color: 'var(--color-primary)',
                            display: 'block',
                          }}
                        >
                          {rx.prescriptionCode}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {dateStr}
                        </span>
                      </td>

                      {/* Patient */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          {rx.patientName}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          <span style={{ fontFamily: 'monospace' }}>{rx.patientId}</span> • {rx.patientGender} • {rx.patientAge}
                          {rx.patientBloodGroup && rx.patientBloodGroup !== '—' && ` • Blood: ${rx.patientBloodGroup}`}
                        </div>

                        {/* Allergy warning if any */}
                        {hasAllergies && (
                          <div
                            style={{
                              marginTop: '0.25rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: '#b45309',
                              background: 'rgba(245, 158, 11, 0.12)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            <AlertTriangle size={11} />
                            <span>Allergy: {rx.patientAllergies.join(', ')}</span>
                          </div>
                        )}
                      </td>

                      {/* Diagnosis */}
                      <td>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {rx.diagnosis || 'Clinical Prescription'}
                        </div>
                        {rx.notes && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.15rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '220px',
                            }}
                            title={rx.notes}
                          >
                            {rx.notes}
                          </div>
                        )}
                      </td>

                      {/* Medications Summary */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '280px' }}>
                          {(rx.medications || []).slice(0, 2).map((m, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Pill size={10} style={{ color: 'var(--color-primary)' }} />
                              <strong>{m.name}</strong> {m.dosage}
                            </span>
                          ))}
                          {(rx.medications || []).length > 2 && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(8, 145, 178, 0.1)',
                                color: '#0891b2',
                                fontWeight: 600,
                              }}
                            >
                              +{(rx.medications || []).length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`doc-badge ${
                            rx.status === 'Active'
                              ? 'doc-badge--active'
                              : rx.status === 'Completed'
                              ? 'doc-badge--completed'
                              : 'doc-badge--discontinued'
                          }`}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background:
                              rx.status === 'Active'
                                ? 'rgba(5, 150, 105, 0.12)'
                                : rx.status === 'Completed'
                                ? 'rgba(37, 99, 235, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                            color:
                              rx.status === 'Active'
                                ? '#059669'
                                : rx.status === 'Completed'
                                ? '#2563eb'
                                : '#ef4444',
                            border: `1px solid ${
                              rx.status === 'Active'
                                ? 'rgba(5, 150, 105, 0.25)'
                                : rx.status === 'Completed'
                                ? 'rgba(37, 99, 235, 0.25)'
                                : 'rgba(239, 68, 68, 0.25)'
                            }`,
                          }}
                        >
                          {rx.status === 'Active' ? (
                            <CheckCircle2 size={12} />
                          ) : rx.status === 'Completed' ? (
                            <Check size={12} />
                          ) : (
                            <Ban size={12} />
                          )}
                          {rx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(rx.id)}
                            className="btn btn--outline btn--sm"
                            title="View & Print Prescription"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          {rx.status === 'Active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDiscontinueTarget(rx);
                                setDiscontinueReason('');
                              }}
                              className="btn btn--outline btn--sm"
                              title="Discontinue medication course"
                              style={{
                                padding: '0.25rem 0.45rem',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              <Ban size={13} />
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
        ) : (
          <div className="doc-empty-state" style={{ padding: '3.5rem 1rem' }}>
            <Pill size={36} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
              No Prescriptions Found
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.25rem' }}>
              {hasActiveFilters
                ? 'No prescriptions match the active search criteria or filters.'
                : 'You have not issued any prescriptions yet. Click below to create your first clinical prescription.'}
            </p>
            {hasActiveFilters ? (
              <button type="button" onClick={handleClearFilters} className="btn btn--outline btn--sm">
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="btn btn--primary btn--sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={15} />
                <span>Create Prescription</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL 1: NEW PRESCRIPTION FORM ── */}
      {showNewModal && (
        <div className="doc-modal-overlay" onClick={() => !submitting && setShowNewModal(false)}>
          <div
            className="doc-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div
              className="doc-modal-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pill size={18} style={{ color: 'var(--color-primary)' }} />
                  Create Electronic Prescription
                </h2>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Issue signed prescription with allergy verification and medication schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setShowNewModal(false)}
                className="btn-icon"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Alert Message */}
            {formError && (
              <div className="alert alert--danger" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="alert alert--success" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePrescription}>
              {/* Patient Selection & Allergies */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Select Patient <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    value={formPatientId}
                    onChange={(e) => setFormPatientId(e.target.value)}
                    required
                    disabled={loadingPatients || submitting}
                    style={{ fontSize: '0.825rem' }}
                  >
                    <option value="">-- Choose authorized patient --</option>
                    {(Array.isArray(assignedPatients) ? assignedPatients : []).map((p) => {
                      const id = p.id || p._id || p.patientMongoId;
                      return (
                        <option key={id} value={id}>
                          {p.firstName || p.patientName} {p.lastName || ''} ({p.patientId || 'ID'}) - {p.gender || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Patient Summary Card / Allergy Warning */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Patient Safety & Allergy Profile
                  </label>
                  {selectedPatientData ? (
                    <div
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedPatientData.firstName || selectedPatientData.patientName} {selectedPatientData.lastName || ''}
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                          ({selectedPatientData.patientId})
                        </span>
                      </div>
                      <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
                        Gender: {selectedPatientData.gender || '—'} • Blood: {selectedPatientData.bloodGroup || '—'}
                      </div>
                      <div style={{ marginTop: '0.35rem' }}>
                        {selectedPatientData.allergies && selectedPatientData.allergies.length > 0 ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#b45309',
                              background: 'rgba(245, 158, 11, 0.15)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}
                          >
                            <AlertTriangle size={12} />
                            <span>ALLERGIES: {selectedPatientData.allergies.join(', ')}</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#059669',
                              background: 'rgba(5, 150, 105, 0.1)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            <ShieldCheck size={12} />
                            <span>No known drug allergies on file</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px dashed var(--border-color)',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Select a patient above to review allergy alerts and clinical profile.
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Diagnosis with Quick Chips */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Clinical Diagnosis
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acute Upper Respiratory Tract Infection, Essential Hypertension"
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                  style={{ fontSize: '0.825rem', marginBottom: '0.4rem' }}
                />

                {/* Quick suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                    Quick suggestions:
                  </span>
                  {COMMON_DIAGNOSES.slice(0, 5).map((diag) => (
                    <button
                      key={diag}
                      type="button"
                      onClick={() => setFormDiagnosis(diag)}
                      style={{
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: formDiagnosis === diag ? 'rgba(5, 150, 105, 0.15)' : 'var(--bg-surface)',
                        color: formDiagnosis === diag ? 'var(--color-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {diag}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── MEDICATIONS SECTION (DYNAMIC ROWS) ── */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: 'var(--bg-surface)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Prescribed Medications
                    </h3>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      Specify dosage, regimen, duration, and administration instructions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Plus size={13} />
                    <span>Add Medicine</span>
                  </button>
                </div>

                {/* Medicine Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formMedications.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            background: 'rgba(5, 150, 105, 0.1)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          Item #{idx + 1}
                        </span>

                        {formMedications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(idx)}
                            className="btn-icon"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                            title="Remove medication"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                        {/* Medicine Name */}
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                            Medicine Name <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Paracetamol, Amoxicillin"
                            value={item.name}
                            onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                            required
                            style={{ fontSize: '0.78rem', height: '32px' }}
                            list={`med-catalog-${idx}`}
                          />
                          <datalist id={`med-catalog-${idx}`}>
                            {(Array.isArray(catalogMedicines) ? catalogMedicines : []).map((m, mIdx) => (
                              <option key={mIdx} value={m.name}>
                                {m.strength} - {m.defaultFrequency}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        {/* Dosage */}
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                            Dosage <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 500 mg, 1 tablet, 10 ml"
                            value={item.dosage}
                            onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                            required
                            style={{ fontSize: '0.78rem', height: '32px' }}
                          />
                        </div>

                        {/* Frequency */}
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                            Frequency <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            className="form-input"
                            value={item.frequency}
                            onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                            style={{ fontSize: '0.78rem', height: '32px' }}
                          >
                            {FREQUENCY_OPTIONS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                            Duration <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <select
                            className="form-input"
                            value={item.duration}
                            onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                            style={{ fontSize: '0.78rem', height: '32px' }}
                          >
                            {DURATION_OPTIONS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div style={{ marginTop: '0.45rem' }}>
                        <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                          Administration Instructions
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Take after meals with warm water, avoid dairy"
                          value={item.instructions}
                          onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                          style={{ fontSize: '0.78rem', height: '30px' }}
                        />
                      </div>

                      {/* Quick Auto-Complete helper from catalog */}
                      {Array.isArray(catalogMedicines) && catalogMedicines.length > 0 && !item.name && (
                        <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Standard items:</span>
                          {catalogMedicines.slice(0, 4).map((med, mIdx) => (
                            <button
                              key={mIdx}
                              type="button"
                              onClick={() => handleSelectCatalogMedicine(idx, med)}
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '3px',
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                              }}
                            >
                              + {med.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Instructions & Advice */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  General Advice & Dietary Instructions
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Drink plenty of fluids, rest adequately, return to clinic if fever persists beyond 3 days."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.85rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  disabled={submitting}
                  className="btn btn--outline btn--sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formPatientId}
                  className="btn btn--primary btn--sm"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: '13px', height: '13px' }} />
                      <span>Signing & Issuing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Issue Prescription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRESCRIPTION DETAILS & PRINTABLE VIEW ── */}
      {selectedPrescription && (
        <div className="doc-modal-overlay" onClick={() => setSelectedPrescription(null)}>
          <div
            className="doc-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Top Toolbar (Non-printable) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: 'var(--color-primary)',
                  }}
                >
                  {selectedPrescription.prescriptionCode}
                </span>
                <span
                  className={`doc-badge ${
                    selectedPrescription.status === 'Active'
                      ? 'doc-badge--active'
                      : selectedPrescription.status === 'Completed'
                      ? 'doc-badge--completed'
                      : 'doc-badge--discontinued'
                  }`}
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                >
                  {selectedPrescription.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn--primary btn--sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                >
                  <Printer size={14} />
                  <span>Print Prescription</span>
                </button>

                {selectedPrescription.status === 'Active' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscontinueTarget(selectedPrescription);
                      setDiscontinueReason('');
                    }}
                    className="btn btn--outline btn--sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <Ban size={13} />
                    <span>Discontinue</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPrescription(null)}
                  className="btn-icon"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Prescription Document Area */}
            <div
              ref={printContentRef}
              className="doc-printable-rx"
              style={{
                background: '#ffffff',
                color: '#1e293b',
                padding: '1.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Hospital Header Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '2px solid #059669',
                  paddingBottom: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    HMS CLINICAL WORKSTATION
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Department of Outpatient Medicine & Specialized Care
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Hospital Management System • Official Clinical Prescription
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>
                    {selectedPrescription.prescriptionCode}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Date:{' '}
                    {selectedPrescription.prescriptionDate
                      ? new Date(selectedPrescription.prescriptionDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Status: <strong style={{ color: '#0f172a' }}>{selectedPrescription.status}</strong>
                  </div>
                </div>
              </div>

              {/* Doctor & Patient Info Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                }}
              >
                {/* Attending Doctor */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Prescribing Physician
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedPrescription.doctorName}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem' }}>
                    {selectedPrescription.doctorSpecialization} • {selectedPrescription.doctorDepartment}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Reg / License: {selectedPrescription.doctorLicenseNumber}
                  </div>
                </div>

                {/* Patient Profile */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Patient Information
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedPrescription.patientName}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem' }}>
                    ID: {selectedPrescription.patientId} • {selectedPrescription.patientGender} • {selectedPrescription.patientAge}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.72rem' }}>
                    Blood: {selectedPrescription.patientBloodGroup || '—'} • Phone: {selectedPrescription.patientPhone || '—'}
                  </div>

                  {/* Allergy Alert in Print Area */}
                  {selectedPrescription.patientAllergies && selectedPrescription.patientAllergies.length > 0 ? (
                    <div
                      style={{
                        marginTop: '0.35rem',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                      }}
                    >
                      ⚠️ Known Allergies: {selectedPrescription.patientAllergies.join(', ')}
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.35rem', color: '#059669', fontSize: '0.72rem' }}>
                      ✓ No known drug allergies recorded
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnosis */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Clinical Diagnosis
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    padding: '0.5rem 0.75rem',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    borderLeft: '4px solid #059669',
                  }}
                >
                  {selectedPrescription.diagnosis || 'General Outpatient Prescription'}
                </div>
              </div>

              {/* Prescribed Medications Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                  }}
                >
                  <Pill size={13} style={{ color: '#059669' }} />
                  <span>Prescription Regimen (Rx)</span>
                </div>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.78rem',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.6rem', width: '35px' }}>#</th>
                      <th style={{ padding: '0.5rem 0.6rem' }}>Medication Name</th>
                      <th style={{ padding: '0.5rem 0.6rem', width: '90px' }}>Dosage</th>
                      <th style={{ padding: '0.5rem 0.6rem' }}>Frequency</th>
                      <th style={{ padding: '0.5rem 0.6rem', width: '85px' }}>Duration</th>
                      <th style={{ padding: '0.5rem 0.6rem' }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPrescription.medications || []).map((med, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700, color: '#0f172a' }}>{med.name}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: '#334155' }}>{med.dosage}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: '#334155' }}>{med.frequency}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: '#334155' }}>{med.duration}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: '#475569', fontStyle: 'italic' }}>
                          {med.instructions || 'As advised'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* General Notes & Lifestyle Advice */}
              {selectedPrescription.notes && (
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Physician Advice / Remarks
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
                    {selectedPrescription.notes}
                  </div>
                </div>
              )}

              {/* Digital Signature & Footer Stamp */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '2rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '300px' }}>
                  This is a digitally generated medical prescription issued by an authorized physician via the Hospital Management System.
                </div>

                <div style={{ textAlign: 'center', minWidth: '180px' }}>
                  <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'cursive', fontSize: '1.1rem', color: '#059669', fontStyle: 'italic' }}>
                      {selectedPrescription.doctorName}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedPrescription.doctorName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Attending Physician • Signature & Seal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: DISCONTINUE CONFIRMATION ── */}
      {discontinueTarget && (
        <div className="doc-modal-overlay" onClick={() => !discontinuing && setDiscontinueTarget(null)}>
          <div
            className="doc-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '90%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ban size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Discontinue Prescription?
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {discontinueTarget.prescriptionCode} • {discontinueTarget.patientName}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Are you sure you want to discontinue this active prescription course? This will update the patient's record and notify the clinical pharmacy.
            </p>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                Reason for Discontinuation
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Adverse effect, therapy completed, dosage altered"
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setDiscontinueTarget(null)}
                disabled={discontinuing}
                className="btn btn--outline btn--sm"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscontinue}
                disabled={discontinuing}
                className="btn btn--danger btn--sm"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {discontinuing ? (
                  <>
                    <div className="spinner" style={{ width: '13px', height: '13px' }} />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Ban size={14} />
                    <span>Discontinue Prescription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
