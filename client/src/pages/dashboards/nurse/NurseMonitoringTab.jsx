/**
 * Nurse Monitoring Tab (Continuous Monitoring & Fluid Balance)
 * 
 * Clinical fluid balance (Intake & Output - I/O) and hemodynamic tracking:
 * - 24-Hour intake vs output fluid calculations
 * - Patient-by-patient fluid balance cards with net values (+/- ml)
 * - Interactive "+ Log Fluid Entry" modal
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Droplet,
  Plus,
  RefreshCw,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { nurseService } from '../../../services/nurse.service';

const INITIAL_IO_LOGS = [
  {
    id: 'io-1',
    patientName: 'James Holden',
    roomBed: '306-A',
    intakeOral: 600,
    intakeIV: 800,
    outputUrine: 1950,
    outputDrain: 150,
    indication: 'CHF diuresis protocol (Target negative balance)',
  },
  {
    id: 'io-2',
    patientName: 'Eleanor Vance',
    roomBed: '301-A',
    intakeOral: 1100,
    intakeIV: 750,
    outputUrine: 1420,
    outputDrain: 0,
    indication: 'Routine post-angioplasty hydration',
  },
  {
    id: 'io-3',
    patientName: 'Chloe Decker',
    roomBed: '303-A',
    intakeOral: 1200,
    intakeIV: 1000,
    outputUrine: 1750,
    outputDrain: 0,
    indication: 'IV hydration for pyelonephritis',
  },
  {
    id: 'io-4',
    patientName: 'Rachel Green',
    roomBed: '305-A',
    intakeOral: 450,
    intakeIV: 500,
    outputUrine: 800,
    outputDrain: 50,
    indication: 'Post-op Lap Chole Day 1 fluid balance',
  },
  {
    id: 'io-5',
    patientName: 'Thomas Anderson',
    roomBed: '302-B',
    intakeOral: 800,
    intakeIV: 400,
    outputUrine: 1150,
    outputDrain: 0,
    indication: 'Neuro observation & maintenance hydration',
  },
];

export default function NurseMonitoringTab() {
  const [ioLogs, setIoLogs] = useState(INITIAL_IO_LOGS);
  const [inpatients, setInpatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [form, setForm] = useState({
    patientId: '',
    type: 'Intake',
    category: 'Oral Fluids',
    volume: '250',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nurseService.getInpatients();
      setInpatients(res.data || []);
    } catch (err) {
      console.error('Failed to load monitoring inpatients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
        console.error('Failed to load monitoring inpatients:', err);
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

  const handleAddEntry = (e) => {
    e.preventDefault();
    const p = inpatients.find((item) => item.patientId === form.patientId) || inpatients[0];
    if (!p) return;

    const vol = parseInt(form.volume || '0', 10);
    const existing = ioLogs.find((l) => l.patientName === p.name);

    if (existing) {
      if (form.type === 'Intake') {
        if (form.category === 'Oral Fluids') existing.intakeOral += vol;
        else existing.intakeIV += vol;
      } else {
        if (form.category === 'Urine Output') existing.outputUrine += vol;
        else existing.outputDrain += vol;
      }
      setIoLogs([...ioLogs]);
    }

    setFeedback({
      type: 'success',
      text: `Logged ${vol} ml ${form.type} (${form.category}) for ${p.name}.`,
    });
    setShowModal(false);
  };

  // Grand totals
  const totalIntake = ioLogs.reduce((acc, l) => acc + l.intakeOral + l.intakeIV, 0);
  const totalOutput = ioLogs.reduce((acc, l) => acc + l.outputUrine + l.outputDrain, 0);
  const netFloorBalance = totalIntake - totalOutput;

  return (
    <div className="nurse-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="nurse-status-badge">
            <span>FLUID HOMEOSTASIS & TELEMETRY</span>
          </div>
          <h1 className="rec-header-title">Continuous Monitoring & Fluid Balance (I/O)</h1>
          <p className="rec-header-subtitle">
            24-hour intake vs. output fluid calculation, Foley drainage logs, and telemetry hemodynamic tracking.
          </p>
        </div>
        <div className="rec-header-actions">
          <button onClick={loadData} disabled={loading} className="rec-btn rec-btn--secondary">
            <RefreshCw size={15} className={loading ? 'rec-spin' : ''} />
            <span>Sync Monitoring</span>
          </button>
          <button onClick={() => setShowModal(true)} className="rec-btn rec-btn--primary">
            <Plus size={15} />
            <span>+ Log Fluid Entry</span>
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

      {/* Floor Overview Metric Grid Across Full Width */}
      <div className="nurse-kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Floor Intake (24h)</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#0284c7' }}>{totalIntake.toLocaleString()} ml</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Combined Oral + IV Infusion</span>
          </div>
        </div>

        <div className="nurse-kpi-card nurse-kpi-card--amber">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Floor Output (24h)</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: '#d97706' }}>{totalOutput.toLocaleString()} ml</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Urine output & surgical drains</span>
          </div>
        </div>

        <div className="nurse-kpi-card nurse-kpi-card--emerald">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Net Fluid Balance</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: netFloorBalance >= 0 ? '#f0fdf4' : '#fff1f2', color: netFloorBalance >= 0 ? '#16a34a' : '#dc2626' }}>
              <Droplet size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: netFloorBalance >= 0 ? '#16a34a' : '#dc2626' }}>
            {netFloorBalance >= 0 ? `+${netFloorBalance.toLocaleString()} ml` : `${netFloorBalance.toLocaleString()} ml`}
          </div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cumulative ward fluid status</span>
          </div>
        </div>

        <div className="nurse-kpi-card nurse-kpi-card--blue">
          <div className="nurse-kpi-top">
            <div className="nurse-kpi-label">Monitored Patients</div>
            <div className="nurse-kpi-icon-wrap" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="nurse-kpi-val" style={{ color: 'var(--text-primary)' }}>{ioLogs.length}</div>
          <div className="nurse-kpi-footer">
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active strict I/O protocols</span>
          </div>
        </div>
      </div>

      {/* Main Wide Intake / Output Telemetry Table */}
      <div className="nurse-card">
        <div className="nurse-card-header">
          <h2 className="nurse-card-title">
            <Droplet size={18} style={{ color: '#0284c7' }} />
            <span>Inpatient Intake & Output (I/O) Telemetry Log</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            24-hour cumulative fluid homeostasis tracking table
          </span>
        </div>

        <div className="nurse-table-wrap">
          <table className="nurse-table">
            <thead>
              <tr>
                <th>Bed / Room</th>
                <th>Patient Name</th>
                <th>Oral Intake</th>
                <th>IV Infusion</th>
                <th>Total Intake</th>
                <th>Urine Output</th>
                <th>Drain Output</th>
                <th>Total Output</th>
                <th>24h Net Balance</th>
                <th>Clinical Indication</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ioLogs.map((l) => {
                const patientTotalIntake = l.intakeOral + l.intakeIV;
                const patientTotalOutput = l.outputUrine + l.outputDrain;
                const netBalance = patientTotalIntake - patientTotalOutput;
                const isPositive = netBalance >= 0;

                return (
                  <tr key={l.id}>
                    <td>
                      <span
                        style={{
                          background: '#f0f9ff',
                          color: '#0284c7',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                        }}
                      >
                        {l.roomBed}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.patientName}</div>
                    </td>
                    <td>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{l.intakeOral} ml</span>
                    </td>
                    <td>
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>{l.intakeIV} ml</span>
                    </td>
                    <td>
                      <strong style={{ color: '#0369a1', fontSize: '0.9rem' }}>{patientTotalIntake} ml</strong>
                    </td>
                    <td>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{l.outputUrine} ml</span>
                    </td>
                    <td>
                      <span style={{ color: l.outputDrain > 0 ? '#d97706' : '#94a3b8', fontWeight: 600 }}>
                        {l.outputDrain} ml
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#b45309', fontSize: '0.9rem' }}>{patientTotalOutput} ml</strong>
                    </td>
                    <td>
                      <span
                        className="nurse-badge"
                        style={{
                          background: isPositive ? '#ecfdf5' : '#fef2f2',
                          color: isPositive ? '#059669' : '#dc2626',
                          border: `1px solid ${isPositive ? '#a7f3d0' : '#fecaca'}`,
                          fontWeight: 800,
                          fontSize: '0.78rem',
                        }}
                      >
                        {isPositive ? `+${netBalance} ml` : `${netBalance} ml`}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{l.indication}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          const matched = inpatients.find((item) => item.name === l.patientName);
                          if (matched) {
                            setForm((prev) => ({ ...prev, patientId: matched.patientId }));
                          }
                          setShowModal(true);
                        }}
                        className="rec-btn rec-btn--secondary rec-btn--sm"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                      >
                        <Plus size={12} />
                        <span>Log Entry</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fluid Entry Modal */}
      {showModal && (
        <div className="rec-modal-overlay">
          <div className="rec-modal-card" style={{ maxWidth: '480px' }}>
            <div className="rec-modal-header">
              <h3 className="rec-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Droplet size={18} style={{ color: '#0284c7' }} />
                <span>Log Fluid Intake or Output</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="rec-modal-close">✕</button>
            </div>

            <form onSubmit={handleAddEntry}>
              <div className="rec-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="rec-form-group">
                  <label className="rec-form-label">Inpatient *</label>
                  <select
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    required
                    className="rec-form-select"
                  >
                    <option value="">Select Inpatient</option>
                    {inpatients.map((p) => (
                      <option key={p.patientId} value={p.patientId}>
                        {p.name} — {p.bed} ({p.room})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Direction *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="rec-form-select"
                    >
                      <option value="Intake">Intake (Fluid In)</option>
                      <option value="Output">Output (Fluid Out)</option>
                    </select>
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="rec-form-select"
                    >
                      {form.type === 'Intake' ? (
                        <>
                          <option value="Oral Fluids">Oral Fluids / Water</option>
                          <option value="IV Infusion">IV Infusion / Piggyback</option>
                          <option value="Enteral Tube Feeding">Enteral Tube Feeding</option>
                        </>
                      ) : (
                        <>
                          <option value="Urine Output">Urine Output / Foley</option>
                          <option value="Surgical Drainage">Surgical Drainage (JP / Hemovac)</option>
                          <option value="Emesis">Emesis / Nasogastric</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="rec-form-group" style={{ margin: 0 }}>
                  <label className="rec-form-label">Volume (ml) *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="3000"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    className="rec-form-input"
                    placeholder="e.g. 250"
                  />
                </div>
              </div>

              <div className="rec-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="rec-btn rec-btn--secondary">
                  Cancel
                </button>
                <button type="submit" className="rec-btn rec-btn--primary">
                  <Plus size={14} />
                  <span>Save Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
