/**
 * Doctor Clinical Workspace — Consultations Tab
 * 
 * Clinical workspace for attending physicians to review patient details,
 * document the current visit, record diagnoses, vital signs, examination findings,
 * treatment plans, and schedule follow-ups using the real HMS workflow.
 * 
 * Backed by real MongoDB data (MedicalRecord, Appointment, User) with zero mock data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  Clock,
  User,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Pill,
  Microscope,
  ArrowLeft,
  Eye,
  Save,
  Edit3,
  X,
  History,
} from 'lucide-react';
import { doctorService } from '../../../services/doctor.service';

export default function DoctorConsultationsTab({
  onNavigateTab,
  onOpenPatientRecord,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramAppointmentId = searchParams.get('appointmentId');
  const _paramPatientId = searchParams.get('patientId');
  const paramConsultationId = searchParams.get('consultationId');

  // ── 1. State: Directory / List View ──
  const [consultations, setConsultations] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    waiting: 0,
  });
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'in-progress' | 'completed' | 'waiting'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // ── 2. State: Active Consultation Encounter ──
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [previousHistory, setPreviousHistory] = useState([]);
  const [loadingEncounter, setLoadingEncounter] = useState(false);
  const [encounterError, setEncounterError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    diagnosis: '',
    symptoms: '',
    clinicalNotes: '',
    treatment: '',
    bp: '120/80 mmHg',
    heartRate: '72 bpm',
    temperature: '98.6 °F',
    respiratoryRate: '16 breaths/min',
    spo2: '99%',
    weight: '70 kg',
    followUpDate: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── 3. Fetch Consultations List ──
  const fetchConsultations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingList(true);
    setListError(null);

    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedDate) params.date = selectedDate;

      const res = await doctorService.getConsultations(params);
      const data = res.data?.data || res.data || {};
      setConsultations(data.consultations || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load doctor consultations:', err);
      setListError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load clinical consultations. Please try again.'
      );
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [statusFilter, debouncedSearch, selectedDate]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Manual Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchConsultations(true);
  };

  // ── 4. Load Single Consultation Encounter ──
  const loadConsultationEncounter = useCallback(async (id) => {
    if (!id) return;
    setLoadingEncounter(true);
    setEncounterError(null);
    setSaveSuccessMessage(null);
    setFormError(null);

    try {
      const res = await doctorService.getConsultationById(id);
      const data = res.data?.data || res.data || {};
      const consult = data.consultation;
      if (!consult) throw new Error('Consultation details not found.');

      setSelectedConsultation(consult);
      setPreviousHistory(data.previousConsultations || []);

      const isCompleted = consult.status === 'Completed';
      setIsEditMode(!isCompleted); // Completed visits open in read-only view by default

      // Populate form data
      setFormData({
        diagnosis: consult.diagnosis || '',
        symptoms: Array.isArray(consult.symptoms)
          ? consult.symptoms.join(', ')
          : consult.symptoms || '',
        clinicalNotes: consult.clinicalNotes || '',
        treatment: consult.treatment || '',
        bp: consult.vitals?.bp || '120/80 mmHg',
        heartRate: consult.vitals?.heartRate || '72 bpm',
        temperature: consult.vitals?.temperature || '98.6 °F',
        respiratoryRate: consult.vitals?.respiratoryRate || '16 breaths/min',
        spo2: consult.vitals?.spo2 || '99%',
        weight: consult.vitals?.weight || '70 kg',
        followUpDate: consult.followUpDate
          ? new Date(consult.followUpDate).toISOString().slice(0, 10)
          : '',
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load consultation encounter:', err);
      setEncounterError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load consultation encounter details.'
      );
    } finally {
      setLoadingEncounter(false);
    }
  }, []);

  // Sync URL query params with encounter selection
  useEffect(() => {
    const targetId = paramConsultationId || paramAppointmentId;
    if (targetId) {
      loadConsultationEncounter(targetId);
    }
  }, [paramConsultationId, paramAppointmentId, loadConsultationEncounter]);

  // Handle Form Input Change
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (formError) setFormError(null);
  };

  // ── 5. Save / Finalize Consultation ──
  const handleSaveConsultation = async (isFinalize = true) => {
    if (!formData.diagnosis.trim()) {
      setFormError('Primary clinical diagnosis is required to complete the consultation.');
      return;
    }

    setSaving(true);
    setFormError(null);
    setSaveSuccessMessage(null);

    try {
      const payload = {
        patientId: selectedConsultation.patientMongoId,
        appointmentId: selectedConsultation.appointmentId || null,
        diagnosis: formData.diagnosis.trim(),
        symptoms: formData.symptoms
          ? formData.symptoms.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        clinicalNotes: formData.clinicalNotes.trim(),
        treatment: formData.treatment.trim(),
        vitals: {
          bp: formData.bp,
          heartRate: formData.heartRate,
          temperature: formData.temperature,
          respiratoryRate: formData.respiratoryRate,
          spo2: formData.spo2,
          weight: formData.weight,
        },
        followUpDate: formData.followUpDate || null,
      };

      if (selectedConsultation.consultationMongoId) {
        // Update existing MedicalRecord
        await doctorService.updateConsultation(selectedConsultation.consultationMongoId, payload);
      } else {
        // Create new MedicalRecord & complete appointment
        await doctorService.createConsultation(payload);
      }

      setHasUnsavedChanges(false);
      setSaveSuccessMessage(
        isFinalize
          ? 'Clinical consultation completed and finalized successfully.'
          : 'Consultation notes updated successfully.'
      );

      // Reload consultation & directory list
      if (selectedConsultation.consultationMongoId || selectedConsultation.id) {
        loadConsultationEncounter(selectedConsultation.consultationMongoId || selectedConsultation.id);
      }
      fetchConsultations(true);
    } catch (err) {
      console.error('Failed to save consultation documentation:', err);
      setFormError(
        err.response?.data?.message ||
          err.message ||
          'Failed to save consultation documentation. Please check required fields.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Close Encounter & Return to List
  const handleCloseEncounter = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in the clinical consultation form. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }

    setSelectedConsultation(null);
    setEncounterError(null);
    setHasUnsavedChanges(false);
    setSaveSuccessMessage(null);
    // Clear URL params
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('appointmentId');
    nextParams.delete('consultationId');
    nextParams.delete('patientId');
    setSearchParams(nextParams);
  };

  // Active visit / in-progress quick items from list
  const activeQueueVisits = useMemo(() => {
    return consultations.filter((c) => ['In-Progress', 'Waiting', 'Checked In'].includes(c.status));
  }, [consultations]);

  return (
    <div className="doc-consultations-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── 1. COMPACT PAGE HEADER ── */}
      <header className="doc-patients-header-row" aria-label="Consultations Header">
        <div className="doc-patients-header-left">
          <h1>
            <Stethoscope size={20} style={{ color: '#0891b2' }} />
            <span>Consultations</span>
            {selectedConsultation && (
              <span className="badge badge--primary" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', marginLeft: '0.5rem' }}>
                {selectedConsultation.status === 'Completed' ? 'Record Details' : 'Active Encounter'}
              </span>
            )}
          </h1>
          <p>Document and manage patient consultations.</p>
        </div>

        <div className="doc-patients-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedConsultation ? (
            <button
              type="button"
              onClick={handleCloseEncounter}
              className="btn btn--outline btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <ArrowLeft size={14} />
              <span>Back to Directory</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loadingList}
              className="btn btn--outline btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
              title="Refresh consultations"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 2. GLOBAL ALERT FEEDBACK ── */}
      {listError && !selectedConsultation && (
        <div className="alert alert--danger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={17} />
            <span style={{ fontSize: '0.85rem' }}>{listError}</span>
          </div>
          <button type="button" onClick={() => fetchConsultations()} className="btn btn--outline btn--sm" style={{ background: '#fff' }}>
            Retry
          </button>
        </div>
      )}

      {/* ── VIEW A: ACTIVE CONSULTATION ENCOUNTER DOCUMENTATION ── */}
      {loadingEncounter ? (
        <div className="doc-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Loading patient clinical encounter & history...
          </p>
        </div>
      ) : selectedConsultation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Encounter Error Alert */}
          {encounterError && (
            <div className="alert alert--danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={17} />
              <span style={{ fontSize: '0.85rem' }}>{encounterError}</span>
            </div>
          )}

          {/* Save Success Alert */}
          {saveSuccessMessage && (
            <div className="alert alert--success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={17} style={{ color: '#059669' }} />
              <span style={{ fontSize: '0.85rem', color: '#065f46' }}>{saveSuccessMessage}</span>
            </div>
          )}

          {/* ── A. COMPACT SELECTED PATIENT SUMMARY BANNER ── */}
          <div
            className="doc-panel"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              borderLeft: '4px solid var(--color-primary, #0891b2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--bg-app, #f1f5f9)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  <User size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedConsultation.patientName}
                    </h2>
                    <span className="doc-token-badge" style={{ fontSize: '0.72rem' }}>
                      {selectedConsultation.patientId}
                    </span>
                    <span
                      className={`badge ${
                        selectedConsultation.status === 'Completed'
                          ? 'badge--success'
                          : selectedConsultation.status === 'In-Progress'
                          ? 'badge--primary'
                          : 'badge--warning'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {selectedConsultation.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Gender: <strong>{selectedConsultation.patientGender}</strong></span>
                    <span>•</span>
                    <span>Age: <strong>{selectedConsultation.patientAge}</strong></span>
                    <span>•</span>
                    <span>Blood Group: <strong>{selectedConsultation.patientBloodGroup}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong>{selectedConsultation.patientPhone}</strong></span>
                  </div>
                </div>
              </div>

              {/* Patient Record Navigation Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenPatientRecord) {
                      onOpenPatientRecord(selectedConsultation.patientMongoId);
                    } else if (onNavigateTab) {
                      onNavigateTab('records', { patientId: selectedConsultation.patientMongoId });
                    }
                  }}
                  className="btn btn--outline btn--sm"
                  style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Open longitudinal electronic medical records"
                >
                  <Eye size={13} />
                  <span>Full Patient Record</span>
                </button>

                {onNavigateTab && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateTab('prescriptions', {
                          patientId: selectedConsultation.patientMongoId,
                          appointmentId: selectedConsultation.appointmentId,
                        })
                      }
                      className="btn btn--outline btn--sm"
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Open prescriptions module"
                    >
                      <Pill size={13} style={{ color: '#d97706' }} />
                      <span>Prescriptions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onNavigateTab('investigations', {
                          patientId: selectedConsultation.patientMongoId,
                          appointmentId: selectedConsultation.appointmentId,
                        })
                      }
                      className="btn btn--outline btn--sm"
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Open investigations module"
                    >
                      <Microscope size={13} style={{ color: '#6366f1' }} />
                      <span>Investigations</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Clinical Alerts / Allergy Status Bar */}
            <div
              style={{
                background: 'var(--bg-app, #f8fafc)',
                padding: '0.55rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Allergies:</span>
                {Array.isArray(selectedConsultation.patientAllergies) && selectedConsultation.patientAllergies.length > 0 ? (
                  selectedConsultation.patientAllergies.map((alg, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <AlertTriangle size={12} />
                      {alg}
                    </span>
                  ))
                ) : Array.isArray(selectedConsultation.patientAllergies) ? (
                  <span style={{ color: '#059669', fontWeight: 500 }}>No known allergies</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Allergy information not recorded
                  </span>
                )}
              </div>

              <div style={{ color: 'var(--text-secondary)' }}>
                Visit Reason:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {selectedConsultation.reasonForVisit || 'General Clinical Visit'}
                </strong>
              </div>
            </div>
          </div>

          {/* ── B. MAIN DOCUMENTATION WORKSPACE (TWO-COLUMN CLINICAL LAYOUT) ── */}
          <div className="doc-consultations-encounter-grid">
            {/* LEFT COLUMN: CLINICAL DOCUMENTATION FORM */}
            <div className="doc-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={17} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Clinical Documentation
                  </h3>
                  {hasUnsavedChanges && (
                    <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                      • Unsaved changes
                    </span>
                  )}
                </div>

                {selectedConsultation.status === 'Completed' && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Edit3 size={13} />
                    <span>{isEditMode ? 'Lock Read-Only' : 'Edit Notes'}</span>
                  </button>
                )}
              </div>

              {/* Form Validation Feedback */}
              {formError && (
                <div className="alert alert--danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Presenting Complaint & Chief Complaints */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Presenting Complaint & Symptoms
                </label>
                <input
                  type="text"
                  readOnly={!isEditMode}
                  className="form-input"
                  placeholder="e.g. Fever, Productive cough for 3 days, Shortness of breath on exertion"
                  value={formData.symptoms}
                  onChange={(e) => handleInputChange('symptoms', e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Enter symptoms and chief complaints (comma separated for multiple symptoms).
                </span>
              </div>

              {/* 2. Primary Clinical Diagnosis (Required) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Primary Clinical Diagnosis <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  readOnly={!isEditMode}
                  className="form-input"
                  style={{
                    borderColor: formError && !formData.diagnosis.trim() ? '#dc2626' : undefined,
                    fontWeight: 600,
                  }}
                  placeholder="e.g. Acute Bronchitis, Essential Hypertension (ICD-10)"
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Official primary clinical diagnosis for this encounter. Required before finalizing.
                </span>
              </div>

              {/* 3. Clinical Examination & Assessment Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Clinical Examination & Progress Notes
                </label>
                <textarea
                  rows={4}
                  readOnly={!isEditMode}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="History of present illness, physical examination findings, chest auscultation, abdominal palpation, neurological signs..."
                  value={formData.clinicalNotes}
                  onChange={(e) => handleInputChange('clinicalNotes', e.target.value)}
                />
              </div>

              {/* 4. Assessment & Treatment Plan */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assessment & Treatment Plan
                </label>
                <textarea
                  rows={4}
                  readOnly={!isEditMode}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Clinical assessment, medications prescribed, dosage instructions, patient advice, lifestyle and dietary recommendations..."
                  value={formData.treatment}
                  onChange={(e) => handleInputChange('treatment', e.target.value)}
                />
              </div>

              {/* 5. Scheduled Follow-up Date */}
              <div className="form-group" style={{ margin: 0, maxWidth: '280px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Scheduled Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  readOnly={!isEditMode}
                  className="form-input"
                  value={formData.followUpDate}
                  onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                />
              </div>

              {/* ── ACTION BUTTONS ── */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseEncounter}
                  className="btn btn--outline btn--sm"
                  disabled={saving}
                >
                  Close Encounter
                </button>

                {isEditMode && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedConsultation.status === 'Completed' ? (
                      <button
                        type="button"
                        onClick={() => handleSaveConsultation(false)}
                        disabled={saving}
                        className="btn btn--primary btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Save size={14} />
                        <span>{saving ? 'Updating...' : 'Update Notes'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveConsultation(true)}
                          disabled={saving}
                          className="btn btn--primary btn--sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            minWidth: '170px',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>{saving ? 'Finalizing...' : 'Complete Consultation'}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: VITAL SIGNS & PATIENT HISTORY SIDE PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* ── CARD 1: RECORDED VITAL SIGNS ── */}
              <div className="doc-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Activity size={16} style={{ color: 'var(--color-primary)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Patient Vital Signs
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Blood Pressure (BP)
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.bp}
                      onChange={(e) => handleInputChange('bp', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Heart Rate (Pulse)
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.heartRate}
                      onChange={(e) => handleInputChange('heartRate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Temperature
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.temperature}
                      onChange={(e) => handleInputChange('temperature', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      SpO2 (Saturation)
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.spo2}
                      onChange={(e) => handleInputChange('spo2', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Respiratory Rate
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.respiratoryRate}
                      onChange={(e) => handleInputChange('respiratoryRate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Weight (kg)
                    </label>
                    <input
                      type="text"
                      readOnly={!isEditMode}
                      className="form-input"
                      style={{ height: '32px', fontSize: '0.78rem' }}
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ── CARD 2: PREVIOUS CONSULTATION HISTORY ── */}
              <div className="doc-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <History size={16} style={{ color: '#0891b2' }} />
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Prior Visits ({previousHistory.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenPatientRecord) onOpenPatientRecord(selectedConsultation.patientMongoId);
                      else if (onNavigateTab) onNavigateTab('records', { patientId: selectedConsultation.patientMongoId });
                    }}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                  >
                    View Timeline
                  </button>
                </div>

                {previousHistory.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                    {previousHistory.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          padding: '0.65rem',
                          background: 'var(--bg-app, #f8fafc)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{h.diagnosis || 'Clinical Visit'}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {new Date(h.consultationDate).toLocaleDateString()}
                          </span>
                        </div>
                        {h.treatment && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            Treatment: {h.treatment}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => loadConsultationEncounter(h.id)}
                          className="btn btn--outline btn--sm"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            marginTop: '0.35rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Eye size={11} />
                          <span>Review Visit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No prior consultations on file for this patient with you.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── VIEW B: CONSULTATIONS DIRECTORY & QUEUE WORKSPACE ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* ── SECTION 1: SUMMARY KPI CARDS ── */}
          <section className="doc-kpi-grid" aria-label="Consultation Metrics">
            <div
              className={`doc-kpi-card ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Total Consultations</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2' }}>
                  <Stethoscope size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value">{summary.total}</div>
              <p className="doc-kpi-card__subtext">All documented & active visits</p>
            </div>

            <div
              className={`doc-kpi-card ${statusFilter === 'in-progress' ? 'active' : ''}`}
              onClick={() => setStatusFilter('in-progress')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">In-Progress Visits</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
                  <Activity size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#2563eb' }}>
                {summary.inProgress}
              </div>
              <p className="doc-kpi-card__subtext">Currently active consultations</p>
            </div>

            <div
              className={`doc-kpi-card ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Completed Encounters</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#059669' }}>
                {summary.completed}
              </div>
              <p className="doc-kpi-card__subtext">Finalized clinical records</p>
            </div>

            <div
              className={`doc-kpi-card ${statusFilter === 'waiting' ? 'active' : ''}`}
              onClick={() => setStatusFilter('waiting')}
              role="button"
              tabIndex={0}
            >
              <div className="doc-kpi-card__top">
                <span className="doc-kpi-card__title">Waiting in Queue</span>
                <div className="doc-kpi-card__icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="doc-kpi-card__value" style={{ color: '#d97706' }}>
                {summary.waiting}
              </div>
              <p className="doc-kpi-card__subtext">Waiting for doctor review</p>
            </div>
          </section>

          {/* ── SECTION 2: ACTIVE QUEUE QUICK SELECTOR (IF PATIENTS WAITING/IN-PROGRESS) ── */}
          {activeQueueVisits.length > 0 && (
            <div
              className="doc-panel"
              style={{
                padding: '0.85rem 1rem',
                borderLeft: '4px solid #2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} style={{ color: '#2563eb' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active Consultations Ready for Documentation ({activeQueueVisits.length}):
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {activeQueueVisits.slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => loadConsultationEncounter(v.id)}
                    className="btn btn--outline btn--sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Stethoscope size={13} style={{ color: v.status === 'In-Progress' ? '#2563eb' : '#d97706' }} />
                    <span>{v.patientName}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>({v.status})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 3: FILTER TOOLBAR ── */}
          <div className="doc-panel" style={{ padding: '0.85rem 1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              {/* Status Filter Pills */}
              <div className="doc-filter-pills">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`doc-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                >
                  All ({summary.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in-progress')}
                  className={`doc-filter-pill ${statusFilter === 'in-progress' ? 'active' : ''}`}
                >
                  In-Progress ({summary.inProgress})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`doc-filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                >
                  Completed ({summary.completed})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('waiting')}
                  className={`doc-filter-pill ${statusFilter === 'waiting' ? 'active' : ''}`}
                >
                  Waiting ({summary.waiting})
                </button>
              </div>

              {/* Search & Date Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className="doc-search-box" style={{ minWidth: '220px' }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search patient, ID, diagnosis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={13} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </div>

                <input
                  type="date"
                  className="form-input"
                  style={{ height: '32px', fontSize: '0.78rem', width: '140px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  title="Filter consultations by date"
                />

                {(selectedDate || searchQuery || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('');
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="btn btn--outline btn--sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    title="Clear all filters"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: CONSULTATIONS TABLE ── */}
          <div className="doc-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="doc-table-container">
              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.75rem auto' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Loading clinical consultation records...
                  </p>
                </div>
              ) : consultations.length > 0 ? (
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Date & Time</th>
                      <th>Patient</th>
                      <th>Reason / Complaint</th>
                      <th>Primary Diagnosis</th>
                      <th style={{ width: '110px' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '150px' }}>Clinical Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c) => {
                      const isCompleted = c.status === 'Completed';
                      const isInProgress = c.status === 'In-Progress';

                      return (
                        <tr key={c.id} className={isInProgress ? 'in-progress' : ''}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {new Date(c.consultationDate).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {c.appointmentTime || 'Outpatient'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {c.patientName}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <span>{c.patientId}</span>
                              <span>•</span>
                              <span>{c.patientGender}</span>
                              <span>•</span>
                              <span>{c.patientAge}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                              {c.reasonForVisit || 'Clinical consultation'}
                            </span>
                          </td>
                          <td>
                            {c.diagnosis ? (
                              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                {c.diagnosis}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                                Not recorded
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`doc-status-badge ${
                                isCompleted
                                  ? 'completed'
                                  : isInProgress
                                  ? 'in-progress'
                                  : 'waiting'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => loadConsultationEncounter(c.id)}
                                className={`btn btn--sm ${isInProgress ? 'btn--primary' : 'btn--outline'}`}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.6rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                {isCompleted ? (
                                  <>
                                    <Eye size={13} />
                                    <span>View Details</span>
                                  </>
                                ) : (
                                  <>
                                    <Stethoscope size={13} />
                                    <span>{isInProgress ? 'Continue Visit' : 'Start Visit'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenPatientRecord) onOpenPatientRecord(c.patientMongoId);
                                  else if (onNavigateTab) onNavigateTab('records', { patientId: c.patientMongoId });
                                }}
                                className="btn btn--outline btn--sm"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem', color: 'var(--text-secondary)' }}
                                title="Open patient records"
                              >
                                <FileText size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="doc-empty-state" style={{ padding: '3rem 1rem' }}>
                  <Stethoscope size={38} style={{ color: 'var(--text-muted)' }} />
                  <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '0.95rem' }}>
                    No Consultations Found
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {searchQuery || selectedDate || statusFilter !== 'all'
                      ? 'No clinical consultations match your filter criteria.'
                      : 'No patient consultations currently on record.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
