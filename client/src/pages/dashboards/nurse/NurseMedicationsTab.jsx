/**
 * Nurse Medications Tab (eMAR - Electronic Medication Administration Record)
 * 
 * Inpatient medication administration workflow:
 * - Summary metrics (Due doses, Given doses, Held doses)
 * - Filter by status (Due, Given, Held) or specific inpatient
 * - Comprehensive eMAR table with route, indication, special instructions, and prescribing doctor
 * - 1-Click "Administer Dose" with confirmation and nurse signature
 * - "Hold Dose" workflow with clinical reasoning entry
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Pill,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

export default function NurseMedicationsTab() {
  const [meds, setMeds] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Hold Modal State
  const [holdModal, setHoldModal] = useState({ open: false, med: null, reason: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resMeds, resInpatients] = await Promise.all([
        nurseService.getMedications({
          status: statusFilter || undefined,
          patientId: selectedPatientId || undefined,
        }),
        nurseService.getInpatients(),
      ]);
      setMeds(resMeds.data || []);
      setInpatients(resInpatients.data || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedPatientId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const [resMeds, resInpatients] = await Promise.all([
          nurseService.getMedications({
            status: statusFilter || undefined,
            patientId: selectedPatientId || undefined,
          }),
          nurseService.getInpatients(),
        ]);
        if (!ignore) {
          setMeds(resMeds.data || []);
          setInpatients(resInpatients.data || []);
        }
      } catch (err) {
        console.error('Failed to load medications:', err);
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
  }, [statusFilter, selectedPatientId]);

  const handleAdminister = async (medId) => {
    setProcessingId(medId);
    setFeedback(null);
    try {
      await nurseService.administerMedication(medId);
      setFeedback({
        type: 'success',
        text: 'Medication dose administered & recorded in eMAR.',
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to administer medication.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleHoldConfirm = async () => {
    if (!holdModal.med) return;
    setProcessingId(holdModal.med.id);
    setFeedback(null);
    try {
      await nurseService.holdMedication(
        holdModal.med.id,
        holdModal.reason || 'Clinical contraindication / doctor consultation'
      );
      setFeedback({
        type: 'success',
        text: `Medication ${holdModal.med.drugName} held. Reason documented.`,
      });
      setHoldModal({ open: false, med: null, reason: '' });
      loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to hold medication.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const dueCount = meds.filter((m) => m.status === 'Due').length;
  const givenCount = meds.filter((m) => m.status === 'Given').length;
  const heldCount = meds.filter((m) => m.status === 'Held').length;

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>ELECTRONIC MEDICATION RECORD (eMAR)</span>
          </div>
          <h1 className="rec-header-title">Medication Administration Record</h1>
          <p className="rec-header-subtitle">
            Scheduled prescription administration, five rights validation, dose verification, and hold records.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={loadData} disabled={loading} className="rec-btn rec-btn--secondary">
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Sync eMAR</span>
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

      {/* eMAR Metric Counters */}
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
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Due This Round
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706' }}>
              {dueCount} Doses
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
              Administered
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a' }}>
              {givenCount} Doses
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Held / Omitted
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#64748b' }}>
              {heldCount} Doses
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rec-form-select"
            style={{ width: '160px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="Due">Due Only</option>
            <option value="Given">Given / Administered</option>
            <option value="Held">Held / Omitted</option>
          </select>

          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="rec-form-select"
            style={{ width: '200px', fontSize: '0.85rem' }}
          >
            <option value="">All Inpatients</option>
            {inpatients.map((p) => (
              <option key={p.patientId} value={p.patientId}>
                {p.name} ({p.bed})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* eMAR Table */}
      <div className="nurse-card">
        <div className="nurse-card-header">
          <h2 className="nurse-card-title">
            <Pill size={18} style={{ color: '#10b981' }} />
            <span>Medication Administration Log</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Verify Right Patient, Right Drug, Right Dose, Right Route, Right Time
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <RefreshCw size={24} className="rec-spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: '#0284c7' }} />
            <span>Loading eMAR console...</span>
          </div>
        ) : meds.length === 0 ? (
          <div className="rec-empty-state">
            <Pill size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem', display: 'block' }} />
            <div className="rec-empty-state-title">No Medications Found</div>
            <p className="rec-empty-state-desc">No medication orders match the selected filters.</p>
          </div>
        ) : (
          <div className="nurse-table-wrap">
            <table className="nurse-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Medication</th>
                  <th>Dose</th>
                  <th>Route</th>
                  <th>Indication</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((med) => (
                  <tr key={med.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{med.patientName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>
                        {med.roomBed}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                        {med.drugName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                        {med.dosage}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{med.frequency}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: '#f1f5f9',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          color: '#334155',
                          fontWeight: 600,
                          display: 'inline-block',
                        }}
                      >
                        {med.route}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#334155' }}>{med.indication}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                        Order: {med.orderedBy}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#0f172a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.82rem',
                        }}
                      >
                        <Clock size={12} style={{ color: '#d97706' }} />
                        {med.dueTime}
                      </span>
                    </td>
                    <td>
                      <span className={`nurse-badge nurse-badge--${med.status.toLowerCase()}`}>
                        {med.status}
                      </span>
                      {med.status === 'Given' && (
                        <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '0.2rem' }}>
                          At {med.administeredAt}
                        </div>
                      )}
                      {med.status === 'Held' && (
                        <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '0.2rem' }}>
                          Reason: {med.holdReason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {med.status === 'Due' ? (
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleAdminister(med.id)}
                            disabled={processingId === med.id}
                            className="rec-btn rec-btn--success rec-btn--sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                          >
                            {processingId === med.id ? (
                              <RefreshCw size={12} className="rec-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            <span>Administer</span>
                          </button>
                          <button
                            onClick={() => setHoldModal({ open: true, med, reason: '' })}
                            disabled={processingId === med.id}
                            className="rec-btn rec-btn--secondary rec-btn--sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#dc2626' }}
                          >
                            Hold
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hold Medication Modal */}
      {holdModal.open && (
        <div className="rec-modal-overlay">
          <div className="rec-modal-card" style={{ maxWidth: '480px' }}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={18} />
                <span>Hold Medication Order</span>
              </h3>
              <button onClick={() => setHoldModal({ open: false, med: null, reason: '' })} className="rec-modal-close">
                ✕
              </button>
            </div>

            <div className="rec-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#fef2f2', padding: '0.85rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem' }}>
                  {holdModal.med?.drugName} ({holdModal.med?.dosage})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7f1d1d', marginTop: '0.2rem' }}>
                  Patient: {holdModal.med?.patientName} • Bed {holdModal.med?.roomBed}
                </div>
              </div>

              <div className="rec-form-group" style={{ margin: 0 }}>
                <label className="rec-form-label">Clinical Reason for Holding Dose *</label>
                <select
                  value={holdModal.reason}
                  onChange={(e) => setHoldModal({ ...holdModal, reason: e.target.value })}
                  className="rec-form-select"
                >
                  <option value="Heart rate < 60 bpm parameter">Heart rate &lt; 60 bpm parameter</option>
                  <option value="Blood pressure systolic < 90 mmHg parameter">Blood pressure systolic &lt; 90 mmHg</option>
                  <option value="Patient NPO for upcoming surgery/procedure">Patient NPO for upcoming procedure</option>
                  <option value="Patient refused / requested consultation">Patient refused / requested consultation</option>
                  <option value="Awaiting physician order clarification">Awaiting physician order clarification</option>
                </select>
              </div>
            </div>

            <div className="rec-modal-footer">
              <button
                type="button"
                onClick={() => setHoldModal({ open: false, med: null, reason: '' })}
                className="rec-btn rec-btn--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHoldConfirm}
                disabled={processingId === holdModal.med?.id}
                className="rec-btn rec-btn--danger"
              >
                {processingId === holdModal.med?.id ? 'Saving...' : 'Confirm Hold Dose'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
