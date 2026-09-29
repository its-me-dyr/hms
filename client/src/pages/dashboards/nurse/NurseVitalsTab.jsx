/**
 * Nurse Vitals Tab (Clinical Vitals Console)
 * 
 * Inpatient vitals recording, real-time logging, and clinical alert flags:
 * - Summary metric counters (Total rounds, Out of range flags, Oxygen alerts)
 * - Vitals log table: BP, HR, SpO2, Temp, RR, Blood Glucose, Pain score, Notes
 * - Out-of-range value highlights (amber/red tags)
 * - Interactive "+ Record Vitals" modal with validation and instant reactive update
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Thermometer,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseVitalsTab() {
  const [vitalsList, setVitalsList] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Vitals Form State
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    roomBed: '',
    bpSystolic: '120',
    bpDiastolic: '80',
    hr: '72',
    spo2: '98',
    temp: '98.6',
    rr: '16',
    glucose: '105',
    painScore: '0/10',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resVitals, resInpatients] = await Promise.all([
        nurseService.getVitals(selectedPatientId || null),
        nurseService.getInpatients(),
      ]);
      setVitalsList(resVitals.data || []);
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
      console.error('Failed to load vitals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchVitals() {
      setLoading(true);
      try {
        const [resVitals, resInpatients] = await Promise.all([
          nurseService.getVitals(selectedPatientId || null),
          nurseService.getInpatients(),
        ]);
        if (!ignore) {
          setVitalsList(resVitals.data || []);
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
        console.error('Failed to load vitals:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchVitals();
    return () => {
      ignore = true;
    };
  }, [selectedPatientId]);

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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await nurseService.addVitals({
        patientId: formData.patientId,
        patientName: formData.patientName,
        roomBed: formData.roomBed,
        bp: `${formData.bpSystolic}/${formData.bpDiastolic}`,
        hr: parseInt(formData.hr, 10),
        spo2: parseInt(formData.spo2, 10),
        temp: formData.temp,
        rr: parseInt(formData.rr, 10),
        glucose: parseInt(formData.glucose, 10),
        painScore: formData.painScore,
        notes: formData.notes || 'Routine vitals recorded.',
      });
      setFeedback({
        type: 'success',
        text: `Vitals recorded successfully for ${formData.patientName} (${formData.roomBed}).`,
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to record vitals.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const outOfRangeCount = vitalsList.filter((v) => v.alert).length;

  return (
    <div className="nurse-container">
      {/* Page Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>CLINICAL MONITORING CONSOLE</span>
          </div>
          <h1 className="rec-header-title">Inpatient Vitals & Observations</h1>
          <p className="rec-header-subtitle">
            Routine vitals rounds, telemetry sync, and automatic hemodynamic alert thresholds.
          </p>
        </div>
        <div className="rec-header-actions">
          <button
            onClick={() => setShowModal(true)}
            className="rec-btn rec-btn--primary"
          >
            <Plus size={16} />
            <span>+ Record Patient Vitals</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rec-alert ${feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'}`}
          style={{ marginBottom: '1.25rem' }}
        >
          {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* 5-Metric Full-Width Summary Grid */}
      <div className="nurse-vitals-metrics-grid">
        {/* 1. Temperature */}
        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Body Temperature</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <Thermometer size={18} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#0284c7', fontSize: '1.8rem' }}>98.6°F</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Target: 97.8°F – 99.1°F</span>
          </div>
        </div>

        {/* 2. Blood Pressure */}
        <div className="nurse-kpi-card nurse-kpi-card--emerald">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Blood Pressure</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#16a34a', fontSize: '1.8rem' }}>120/80</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Normative baseline</span>
          </div>
        </div>

        {/* 3. Heart Rate */}
        <div className="nurse-kpi-card nurse-kpi-card--rose">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Heart Rate</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fff1f2', color: '#e11d48' }}>
              <Heart size={18} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#e11d48', fontSize: '1.8rem' }}>74 bpm</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Range: 60 – 100 bpm</span>
          </div>
        </div>

        {/* 4. SpO2 Oxygen */}
        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">SpO2 Oxygen</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0fdfa', color: '#0d9488' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#0d9488', fontSize: '1.8rem' }}>98%</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Baseline ≥ 95%</span>
          </div>
        </div>

        {/* 5. Respiratory Rate */}
        <div className="nurse-kpi-card nurse-kpi-card--amber">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Respiratory Rate</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#d97706', fontSize: '1.8rem' }}>16 /min</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Normal: 12 – 20 /min</span>
          </div>
        </div>
      </div>

      {/* Patient Filter & Action Bar */}
      <div
        className="nurse-card"
        style={{
          padding: '1rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Recorded Today
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {vitalsList.length} Rounds
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Alert Flags
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: outOfRangeCount > 0 ? '#dc2626' : '#059669' }}>
              {outOfRangeCount} Flags
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Scheduled Round
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0284c7' }}>
              12:00 PM (Q4H)
            </div>
          </div>
        </div>

        {/* Patient Filter */}
        <div style={{ minWidth: '240px' }}>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="rec-form-select"
            style={{ fontSize: '0.85rem' }}
          >
            <option value="">All Admitted Patients</option>
            {inpatients.map((p) => (
              <option key={p.patientId} value={p.patientId}>
                {p.name} ({p.bed})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vitals Log Table */}
      <div className="nurse-card">
        <div className="nurse-card-header">
          <h2 className="nurse-card-title">
            <Activity size={18} style={{ color: '#0284c7' }} />
            <span>Hemodynamic Vitals Observation History</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Continuous telemetry & clinical observation records across all wards
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
            <span>Loading vitals log...</span>
          </div>
        ) : (
          <div className="nurse-table-wrap">
            <table className="nurse-table">
              <thead>
                <tr>
                  <th>Time / Date</th>
                  <th>Patient / Bed</th>
                  <th>BP (mmHg)</th>
                  <th>HR (bpm)</th>
                  <th>SpO2 (%)</th>
                  <th>Temp (°F)</th>
                  <th>RR (/min)</th>
                  <th>Glucose</th>
                  <th>Pain</th>
                  <th>Clinical Observation</th>
                </tr>
              </thead>
              <tbody>
                {vitalsList.map((v) => {
                  const bpSys = parseInt(v.bp?.split('/')[0] || '120', 10);
                  const isBpHigh = bpSys > 140;
                  const isSpO2Low = parseInt(v.spo2, 10) < 95;
                  const isTempHigh = parseFloat(v.temp) > 100.0;

                  return (
                    <tr key={v.id} style={{ background: v.alert ? '#fffbfa' : undefined }}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                          {v.time}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.date}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{v.patientName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>{v.roomBed}</div>
                      </td>
                      <td>
                        <span className={`nurse-vitals-pill ${isBpHigh ? 'nurse-vitals-pill--danger' : 'nurse-vitals-pill--normal'}`}>
                          {v.bp}
                        </span>
                      </td>
                      <td>
                        <span className="nurse-vitals-pill nurse-vitals-pill--normal">
                          <Heart size={11} style={{ color: '#e11d48' }} />
                          {v.hr}
                        </span>
                      </td>
                      <td>
                        <span className={`nurse-vitals-pill ${isSpO2Low ? 'nurse-vitals-pill--warning' : 'nurse-vitals-pill--normal'}`}>
                          {v.spo2}%
                        </span>
                      </td>
                      <td>
                        <span className={`nurse-vitals-pill ${isTempHigh ? 'nurse-vitals-pill--danger' : 'nurse-vitals-pill--normal'}`}>
                          <Thermometer size={11} style={{ color: isTempHigh ? '#dc2626' : '#64748b' }} />
                          {v.temp}°
                        </span>
                      </td>
                      <td>
                        <span className="nurse-vitals-pill nurse-vitals-pill--normal">
                          {v.rr}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                          {v.glucose ? `${v.glucose} mg/dL` : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {v.painScore}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.35 }}>
                          {v.notes}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          By: {v.recordedBy}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Vitals Modal - Large 2-Column Responsive Form */}
      {showModal && (
        <div className="rec-modal-overlay">
          <div className="rec-modal-card" style={{ maxWidth: '780px', width: '90vw' }}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ color: '#0284c7' }} />
                <span>Record Inpatient Vitals & Observations</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="rec-modal-close">
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="rec-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Select Inpatient */}
                <div className="rec-form-group">
                  <label className="rec-form-label">Select Inpatient *</label>
                  <select
                    value={formData.patientId}
                    onChange={(e) => handlePatientSelectChange(e.target.value)}
                    required
                    className="rec-form-select"
                  >
                    {inpatients.map((p) => (
                      <option key={p.patientId} value={p.patientId}>
                        {p.name} — {p.bed} ({p.room}) [{p.diagnosis}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2-Column Desktop Grid for Vitals Parameters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  {/* Blood Pressure Systolic / Diastolic */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Systolic BP (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={formData.bpSystolic}
                        onChange={(e) => setFormData({ ...formData, bpSystolic: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 120"
                      />
                    </div>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Diastolic BP (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={formData.bpDiastolic}
                        onChange={(e) => setFormData({ ...formData, bpDiastolic: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 80"
                      />
                    </div>
                  </div>

                  {/* Heart Rate & SpO2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Heart Rate (bpm) *</label>
                      <input
                        type="number"
                        required
                        value={formData.hr}
                        onChange={(e) => setFormData({ ...formData, hr: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 72"
                      />
                    </div>
                    <div className="rec-form-group">
                      <label className="rec-form-label">SpO2 Oxygen (%) *</label>
                      <input
                        type="number"
                        required
                        min="70"
                        max="100"
                        value={formData.spo2}
                        onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 98"
                      />
                    </div>
                  </div>

                  {/* Temperature & Respiratory Rate */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Temperature (°F) *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formData.temp}
                        onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 98.6"
                      />
                    </div>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Resp Rate (/min) *</label>
                      <input
                        type="number"
                        required
                        value={formData.rr}
                        onChange={(e) => setFormData({ ...formData, rr: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 16"
                      />
                    </div>
                  </div>

                  {/* Glucose & Pain Score */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Blood Glucose (mg/dL)</label>
                      <input
                        type="number"
                        value={formData.glucose}
                        onChange={(e) => setFormData({ ...formData, glucose: e.target.value })}
                        className="rec-form-input"
                        placeholder="e.g. 110"
                      />
                    </div>
                    <div className="rec-form-group">
                      <label className="rec-form-label">Pain Score (0 - 10)</label>
                      <select
                        value={formData.painScore}
                        onChange={(e) => setFormData({ ...formData, painScore: e.target.value })}
                        className="rec-form-select"
                      >
                        <option value="0/10 (No Pain)">0/10 — No Pain</option>
                        <option value="1/10 (Mild)">1/10 — Mild</option>
                        <option value="2/10 (Mild)">2/10 — Mild</option>
                        <option value="3/10 (Moderate)">3/10 — Moderate</option>
                        <option value="4/10 (Moderate)">4/10 — Moderate</option>
                        <option value="5/10 (Moderate)">5/10 — Moderate</option>
                        <option value="6/10 (Severe)">6/10 — Severe</option>
                        <option value="7/10 (Severe)">7/10 — Severe</option>
                        <option value="8/10 (Very Severe)">8/10 — Very Severe</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label">Clinical Observations & Comments</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. Patient resting comfortably in bed. Denies acute shortness of breath or dizziness..."
                  />
                </div>
              </div>

              <div className="rec-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rec-btn rec-btn--secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rec-btn rec-btn--primary"
                >
                  {submitting ? <RefreshCw size={14} className="rec-spin" /> : <CheckCircle2 size={14} />}
                  <span>{submitting ? 'Saving Vitals...' : 'Save Vitals Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
