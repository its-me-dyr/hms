/**
 * Nurse Notes Tab (Clinical Nursing Progress Notes)
 * 
 * Standardized SOAP (Subjective, Objective, Assessment, Plan) progress notes:
 * - Filter by patient or category (Routine, Post-Op, Physician Notification, Critical)
 * - Structured clinical note display with timestamp and RN signature
 * - Interactive "+ Add Nursing Note" modal with SOAP inputs
 */

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseNotesTab() {
  const [notes, setNotes] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    roomBed: '',
    category: 'Routine Care',
    s: '',
    o: '',
    a: '',
    p: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resNotes, resInpatients] = await Promise.all([
        nurseService.getNotes(selectedPatientId || null),
        nurseService.getInpatients(),
      ]);
      let list = resNotes.data || [];
      if (categoryFilter) {
        list = list.filter((n) => n.category === categoryFilter);
      }
      setNotes(list);
      setInpatients(resInpatients.data || []);
      if (resInpatients.data?.length > 0 && !formData.patientId) {
        const first = resInpatients.data[0];
        setFormData((prev) => ({
          ...prev,
          patientId: first.patientId,
          patientName: first.name,
          roomBed: `${first.bed} (${first.room})`,
        }));
      }
    } catch (err) {
      console.error('Failed to load nursing notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchNotes() {
      setLoading(true);
      try {
        const [resNotes, resInpatients] = await Promise.all([
          nurseService.getNotes(selectedPatientId || null),
          nurseService.getInpatients(),
        ]);
        let list = resNotes.data || [];
        if (categoryFilter) {
          list = list.filter((n) => n.category === categoryFilter);
        }
        if (!ignore) {
          setNotes(list);
          setInpatients(resInpatients.data || []);
          if (resInpatients.data?.length > 0) {
            const first = resInpatients.data[0];
            setFormData((prev) => (prev.patientId ? prev : ({
              ...prev,
              patientId: first.patientId,
              patientName: first.name,
              roomBed: `${first.bed} (${first.room})`,
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load nursing notes:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchNotes();
    return () => {
      ignore = true;
    };
  }, [selectedPatientId, categoryFilter]);

  const handlePatientSelectChange = (pId) => {
    const p = inpatients.find((item) => item.patientId === pId);
    if (p) {
      setFormData((prev) => ({
        ...prev,
        patientId: p.patientId,
        patientName: p.name,
        roomBed: `${p.bed} (${p.room})`,
      }));
    }
  };

  const handleSubmitNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await nurseService.addNote({
        patientId: formData.patientId,
        patientName: formData.patientName,
        roomBed: formData.roomBed,
        category: formData.category,
        soap: {
          s: formData.s || 'Patient denies new acute discomfort.',
          o: formData.o || 'Vital signs within expected ward parameters.',
          a: formData.a || 'Condition stable, continuing current plan of care.',
          p: formData.p || 'Continue routine shift monitoring and ordered therapy.',
        },
      });
      setFeedback({
        type: 'success',
        text: `Progress note saved for ${formData.patientName}.`,
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save note.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>CLINICAL DOCUMENTATION</span>
          </div>
          <h1 className="rec-header-title">Nursing Progress Notes (SOAP)</h1>
          <p className="rec-header-subtitle">
            Shift observations, physician notifications, post-op checks, and clinical care evaluations.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={loadData} disabled={loading} className="rec-btn rec-btn--secondary">
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Sync Notes</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* 2-Column Clinical Documentation Workspace */}
      <div className="nurse-notes-grid">
        {/* Left Column (60%): Filters + Chronological Notes Feed */}
        <div>
          {/* Filters Bar */}
          <div
            className="nurse-card"
            style={{
              padding: '1.1rem 1.4rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ flex: '1 1 200px' }}>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="rec-form-select"
              >
                <option value="">All Assigned Patients</option>
                {inpatients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name} — {p.bed} ({p.room})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '180px' }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rec-form-select"
              >
                <option value="">All Note Categories</option>
                <option value="Routine Care">Routine Care</option>
                <option value="Post-Op Assessment">Post-Op Assessment</option>
                <option value="Physician Notification">Physician Notification</option>
                <option value="Medication Reaction">Medication Reaction</option>
                <option value="Discharge Planning">Discharge Planning</option>
              </select>
            </div>
          </div>

          {/* Notes Feed */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
              <span>Loading progress notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="nurse-card rec-empty-state">
              <FileText size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem', display: 'block' }} />
              <div className="rec-empty-state-title">No Nursing Notes Recorded</div>
              <p className="rec-empty-state-desc">Select a patient or use the workstation on the right to log clinical SOAP observations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {notes.map((note) => (
                <div key={note.id} className="nurse-card" style={{ margin: 0 }}>
                  {/* Note Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                        {note.patientName}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, background: '#f0f9ff', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                        {note.roomBed}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: note.category === 'Physician Notification' ? '#fff1f2' : '#f1f5f9',
                          color: note.category === 'Physician Notification' ? '#e11d48' : '#475569',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {note.category}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                      {note.timestamp} ({note.shift})
                    </div>
                  </div>

                  {/* SOAP Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        (S) Subjective
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                        {note.soap.s}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        (O) Objective
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                        {note.soap.o}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        (A) Assessment
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                        {note.soap.a}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        (P) Plan
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                        {note.soap.p}
                      </div>
                    </div>
                  </div>

                  {/* Author Footer */}
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Signed: <strong>{note.author}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (40%): Sticky Add SOAP Note Workstation */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div className="nurse-card" style={{ margin: 0, boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
            <div className="nurse-card-header">
              <h2 className="nurse-card-title">
                <ClipboardList size={18} style={{ color: '#0284c7' }} />
                <span>+ Add Clinical SOAP Note</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Workstation</span>
            </div>

            <form onSubmit={handleSubmitNote}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="rec-form-group" style={{ margin: 0 }}>
                    <label className="rec-form-label">Inpatient *</label>
                    <select
                      value={formData.patientId}
                      onChange={(e) => handlePatientSelectChange(e.target.value)}
                      required
                      className="rec-form-select"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      {inpatients.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          {p.name} ({p.bed})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rec-form-group" style={{ margin: 0 }}>
                    <label className="rec-form-label">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="rec-form-select"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <option value="Routine Care">Routine Care</option>
                      <option value="Post-Op Assessment">Post-Op Assessment</option>
                      <option value="Physician Notification">Physician Notification</option>
                      <option value="Medication Reaction">Medication Reaction</option>
                      <option value="Discharge Planning">Discharge Planning</option>
                    </select>
                  </div>
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subjective (S)</span>
                    <span style={{ color: '#64748b', fontWeight: 400 }}>Patient statements</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.s}
                    onChange={(e) => setFormData({ ...formData, s: e.target.value })}
                    className="rec-form-input"
                    placeholder='e.g. Patient states "I felt slightly lightheaded after sitting up, but it resolved quickly."'
                    style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Objective (O)</span>
                    <span style={{ color: '#64748b', fontWeight: 400 }}>Physical signs & vitals</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.o}
                    onChange={(e) => setFormData({ ...formData, o: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. Alert and oriented x 4. BP 122/76, HR 74 regular. Incisional dressing clean and dry."
                    style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Assessment (A)</span>
                    <span style={{ color: '#64748b', fontWeight: 400 }}>Clinical interpretation</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.a}
                    onChange={(e) => setFormData({ ...formData, a: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. Transient orthostatic lightheadedness; patient stable upon seated rest."
                    style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Plan (P)</span>
                    <span style={{ color: '#64748b', fontWeight: 400 }}>Interventions & next steps</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.p}
                    onChange={(e) => setFormData({ ...formData, p: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. Assist with ambulation. Encourage oral hydration. Recheck orthostatic vitals in 2 hours."
                    style={{ fontSize: '0.8125rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rec-btn rec-btn--primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {submitting ? <RefreshCw size={14} className="rec-spin" /> : <CheckCircle2 size={14} />}
                    <span>{submitting ? 'Signing & Saving...' : 'Save & Sign Progress Note'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
