/**
 * Nurse Handover Tab (Shift Handover / SBAR Clinical Tool)
 * 
 * Structured SBAR (Situation, Background, Assessment, Recommendation) handover report:
 * - Patient-by-patient bedside handover summary
 * - Outgoing / Incoming nurse documentation
 * - One-click Print Handover Sheet functionality
 */

import { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseHandoverTab({ user }) {
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomingNurse, setIncomingNurse] = useState('Nurse Sarah Connor, RN');
  const [handoverSigned, setHandoverSigned] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await nurseService.getInpatients();
        if (!ignore) {
          setInpatients(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load handover patients:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>SHIFT TRANSITION PROTOCOL</span>
          </div>
          <h1 className="rec-header-title">Shift Handover Report (SBAR)</h1>
          <p className="rec-header-subtitle">
            Structured Situation, Background, Assessment & Recommendation bedside reporting for shift change.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={handlePrint} className="rec-btn rec-btn--secondary">
            <Printer size={15} />
            <span>Print Handover Sheet</span>
          </button>
          <button
            onClick={() => setHandoverSigned(true)}
            disabled={handoverSigned}
            className="rec-btn rec-btn--primary"
          >
            <CheckCircle2 size={15} />
            <span>{handoverSigned ? 'Handover Signed' : 'Sign & Transfer Shift'}</span>
          </button>
        </div>
      </div>

      {/* Handover Meta Card */}
      <div
        className="nurse-card"
        style={{
          padding: '1.25rem 1.5rem',
          background: 'var(--bg-surface)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Ward / Clinical Unit
            </span>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Ward 3A • Medical-Surgical Floor
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Outgoing Nurse (Reporting)
            </span>
            <div style={{ fontWeight: 700, color: '#0284c7', marginTop: '0.2rem' }}>
              {user?.fullName || user?.firstName || 'Deva Chitturi'}, BSN, RN (Morning Shift)
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Incoming Nurse (Receiving)
            </span>
            <input
              type="text"
              value={incomingNurse}
              onChange={(e) => setIncomingNurse(e.target.value)}
              className="rec-form-input"
              style={{
                marginTop: '0.2rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                height: 'auto',
              }}
            />
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Handover Status
            </span>
            <div style={{ fontWeight: 700, color: handoverSigned ? '#16a34a' : '#d97706', marginTop: '0.2rem' }}>
              {handoverSigned ? '✓ Formal Handover Complete' : '● Bedside Review in Progress'}
            </div>
          </div>
        </div>
      </div>

      {/* SBAR Inpatient Reports */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading SBAR Handover Records...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {inpatients.map((p) => (
          <div key={p.id} className="nurse-card" style={{ margin: 0 }}>
            {/* Card Header */}
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
                <span
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}
                >
                  {p.bed}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {p.patientId} • {p.age}y {p.gender[0]} • Code: <strong style={{ color: 'var(--text-primary)' }}>{p.codeStatus}</strong>
                </span>
              </div>
              <span className={`nurse-badge nurse-badge--${p.acuity.toLowerCase().replace(/[^a-z]/g, '')}`}>
                {p.acuity}
              </span>
            </div>

            {/* SBAR Multi-Column Desktop Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', width: '100%' }}>
              {/* Situation */}
              <div className="nurse-sbar-section" style={{ borderLeft: '4px solid #0284c7', margin: 0 }}>
                <div className="nurse-sbar-header" style={{ color: '#0284c7' }}>
                  <span>(S) Situation</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                  Admitted on <strong>{p.admissionDate}</strong> under care of <strong>{p.attendingDoctor}</strong>.
                  Current Primary Diagnosis: <strong>{p.diagnosis}</strong>. Acuity rating: <strong>{p.acuity}</strong>.
                </div>
              </div>

              {/* Background */}
              <div className="nurse-sbar-section" style={{ borderLeft: '4px solid #d97706', margin: 0 }}>
                <div className="nurse-sbar-header" style={{ color: '#d97706' }}>
                  <span>(B) Background & Precautions</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                  Diet Order: <strong>{p.diet}</strong> | Documented Allergies: <strong style={{ color: '#dc2626' }}>{p.allergies}</strong> | Lines: <strong>{p.ivAccess}</strong> | O2: <strong>{p.oxygen}</strong>.
                </div>
              </div>

              {/* Assessment */}
              <div className="nurse-sbar-section" style={{ borderLeft: '4px solid #10b981', margin: 0 }}>
                <div className="nurse-sbar-header" style={{ color: '#059669' }}>
                  <span>(A) Shift Assessment & Vitals</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                  Last recorded vitals at {p.lastVitals.time}: BP <strong>{p.lastVitals.bp}</strong>, HR <strong>{p.lastVitals.hr}</strong> bpm, SpO2 <strong>{p.lastVitals.spo2}%</strong>, Temp <strong>{p.lastVitals.temp}</strong>, RR <strong>{p.lastVitals.rr}</strong>. Alert, oriented.
                </div>
              </div>

              {/* Recommendation */}
              <div className="nurse-sbar-section" style={{ borderLeft: '4px solid #7c3aed', margin: 0 }}>
                <div className="nurse-sbar-header" style={{ color: '#7c3aed' }}>
                  <span>(R) Recommendation & Continuity</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                  Administer 10:00 PM routine evening medications. Recheck blood glucose before evening meal. Continue strict Q4H vital sign observation and telemetry monitoring.
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
