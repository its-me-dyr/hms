/**
 * Prescriptions Processing Tab
 * 
 * Pharmacist clinical prescription review and validation queue:
 * - Filter by Status (Pending, Partially Dispensed, Dispensed, Cancelled), Doctor, Date
 * - Full-text search across Patient ID, Patient Name, and Prescription ID
 * - In-depth prescription review modal with dosage, frequency, and instructions
 * - Direct transition into the Dispensing workstation
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pill,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function PrescriptionsTab({ onNavigateTab, onSelectPrescription }) {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') || '';
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRx, setSelectedRx] = useState(null);

  const fetchPrescriptions = (searchOverride) => {
    setLoading(true);
    setError('');
    const query = typeof searchOverride === 'string' ? searchOverride : (urlSearch || search);
    pharmacyService.getPrescriptions({ status: statusFilter, search: query })
      .then((res) => {
        const list = res.data?.prescriptions || res.data || [];
        setPrescriptions(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load prescriptions:', err);
        setError('Failed to fetch clinical prescriptions queue.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    pharmacyService.getPrescriptions({ status: statusFilter, search: urlSearch || search })
      .then((res) => {
        if (!active) return;
        const list = res.data?.prescriptions || res.data || [];
        setPrescriptions(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load prescriptions:', err);
        setError('Failed to fetch clinical prescriptions queue.');
        setLoading(false);
      });
    return () => { active = false; };
  }, [urlSearch, statusFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPrescriptions();
  };

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">CLINICAL MEDICATION ORDERS</div>
          <h1 className="pharm-header-title">Prescriptions Management</h1>
          <p className="pharm-header-subtitle">
            Review attending physicians' active medication orders, clinical diagnoses, and prepare for dispensing.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchPrescriptions}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Queue</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => onNavigateTab('dispensing')}
          >
            <CheckCircle2 size={16} />
            <span>Open Dispensing Workstation</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="pharm-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              className="pharm-form-input"
              placeholder="Search by Patient Name, ID (HMS-P-...), Prescription ID (RX-...)"
              style={{ paddingLeft: '38px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="pharm-btn pharm-btn--primary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          {['all', 'Pending', 'Dispensed'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pharm-btn pharm-btn--sm ${
                statusFilter === st ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Prescriptions Listing Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Patient Info</th>
                  <th>Attending Doctor</th>
                  <th>Department</th>
                  <th>Prescribed Date</th>
                  <th>Medicines</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading clinical prescriptions queue...</p>
                    </td>
                  </tr>
                ) : prescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <Pill size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No prescriptions found</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        No clinical orders matched your query or filter criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  prescriptions.map((rx) => (
                    <tr key={rx.id || rx.prescriptionId}>
                      <td style={{ fontWeight: 700, color: '#0891b2' }}>{rx.prescriptionId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rx.patient}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          ID: {rx.patientId} {rx.patientAge ? `• ${rx.patientAge}y` : ''} {rx.patientGender ? `• ${rx.patientGender}` : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{rx.doctor}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rx.doctorSpecialization}</div>
                      </td>
                      <td>
                        <span className="pharm-badge pharm-badge--info" style={{ fontSize: '0.72rem' }}>
                          {rx.department || 'Clinical Care'}
                        </span>
                      </td>
                      <td>{rx.date}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info">
                          {rx.medications ? rx.medications.length : rx.items || 1} Medications
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pharm-badge ${
                            rx.status === 'Dispensed' ? 'pharm-badge--success' : 'pharm-badge--warning'
                          }`}
                        >
                          {rx.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                            onClick={() => setSelectedRx(rx)}
                            title="Review Prescription Details"
                          >
                            <Eye size={14} />
                            <span>Review</span>
                          </button>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--primary pharm-btn--sm"
                            onClick={() => {
                              if (onSelectPrescription) onSelectPrescription(rx);
                              onNavigateTab('dispensing');
                            }}
                            title="Dispense Medications"
                          >
                            <CheckCircle2 size={14} />
                            <span>Dispense</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detailed Prescription Inspection Modal ── */}
      {selectedRx && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedRx(null)}>
          <div className="pharm-modal" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Clinical Order Review</div>
                <h3 className="pharm-modal-title">{selectedRx.prescriptionId} — {selectedRx.patient}</h3>
              </div>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedRx(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              {/* Patient & Doctor Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Patient Demographics</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedRx.patient}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Patient ID: {selectedRx.patientId}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Phone: {selectedRx.patientPhone || '—'}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attending Physician</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{selectedRx.doctor}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Specialization: {selectedRx.doctorSpecialization}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Order Date: {selectedRx.date}</div>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedRx.diagnosis && (
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.875rem', color: '#0369a1' }}>
                  <strong>Physician Clinical Diagnosis:</strong> {selectedRx.diagnosis}
                </div>
              )}

              {/* Medication Table */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Prescribed Drug Regimens ({selectedRx.medications ? selectedRx.medications.length : 1})
              </h4>
              <div className="pharm-table-wrap" style={{ marginBottom: '1.25rem' }}>
                <table className="pharm-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Strength/Dose</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Prescribed Qty</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRx.medications || []).map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0891b2' }}>{m.name}</td>
                        <td>{m.dosage}</td>
                        <td>{m.frequency}</td>
                        <td>{m.duration}</td>
                        <td style={{ fontWeight: 700 }}>{m.prescribedQty || 10}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.instructions || 'As instructed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clinical Safety Disclaimer */}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                🔒 <strong>Pharmacy Compliance Notice:</strong> Per hospital policy and RBAC guidelines, pharmacy staff may not modify clinical dosage orders. Contact attending physician for clinical discrepancies.
              </div>
            </div>
            <div className="pharm-modal-footer">
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary"
                onClick={() => setSelectedRx(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="pharm-btn pharm-btn--primary"
                onClick={() => {
                  const rx = selectedRx;
                  setSelectedRx(null);
                  if (onSelectPrescription) onSelectPrescription(rx);
                  onNavigateTab('dispensing');
                }}
              >
                <CheckCircle2 size={16} />
                <span>Proceed to Dispense</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
