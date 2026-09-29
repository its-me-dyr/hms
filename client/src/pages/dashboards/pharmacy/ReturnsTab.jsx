/**
 * Medicine Returns Processing Tab
 * 
 * Clinical return and refund authorization workflow:
 * - Patient Returns: Bill lookup, return reason auditing (Wrong Medicine, Damaged, Unused, Adverse Issue)
 * - Supplier Returns: Vendor lot RMA tracking for damaged or expired batches
 * - Process Patient Return modal with automatic inventory rollback
 */

import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  Package,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function ReturnsTab({ onNavigateTab }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('Patient Return'); // 'Patient Return' or 'Supplier Return'
  const [showModal, setShowModal] = useState(false);

  // Return Form State
  const [formData, setFormData] = useState({
    billNumber: '',
    patientName: '',
    medicineName: '',
    batchNumber: '',
    quantity: '1',
    reason: 'Unused',
    refundAmount: '0.00',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchReturns = () => {
    setLoading(true);
    setError('');
    pharmacyService.getReturns()
      .then((res) => {
        const list = res.data || [];
        setReturns(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load returns:', err);
        setError('Failed to fetch return records.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleSubmitReturn = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    pharmacyService.createPatientReturn(formData)
      .then(() => {
        setShowModal(false);
        setFormData({
          billNumber: '',
          patientName: '',
          medicineName: '',
          batchNumber: '',
          quantity: '1',
          reason: 'Unused',
          refundAmount: '0.00',
        });
        fetchReturns();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to process return.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const filteredReturns = returns.filter((r) => r.returnType === activeSubTab);

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">REVERSE LOGISTICS & DISPENSARY AUDIT</div>
          <h1 className="pharm-header-title">Medicine Returns & Refunds</h1>
          <p className="pharm-header-subtitle">
            Authorize patient medication returns, audit discarded stock, and process supplier RMA lot returns.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchReturns}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={16} />
            <span>Process Patient Return</span>
          </button>
        </div>
      </div>

      {/* ── Workflow Sub-tabs ── */}
      <div className="pharm-filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['Patient Return', 'Supplier Return'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`pharm-btn ${
                activeSubTab === tab ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab === 'Patient Return' ? <User size={16} /> : <Building2 size={16} />}
              <span>{tab}s</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Logged Records: <strong style={{ color: '#0891b2' }}>{filteredReturns.length}</strong>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Returns Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Return ID</th>
                  <th>{activeSubTab === 'Patient Return' ? 'Patient / Bill' : 'Supplier / Vendor'}</th>
                  <th>Medicine</th>
                  <th>Batch Lot</th>
                  <th>Qty Returned</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading returns ledger...</p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RotateCcw size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No {activeSubTab.toLowerCase()} records</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Processed medicine return entries will appear here.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: '#0891b2' }}>{r.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.patientName || r.supplierName}
                        </div>
                        {r.billNumber && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Invoice: {r.billNumber}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.medicineName}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, background: 'var(--bg-hover)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {r.batchNumber}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#dc2626' }}>{r.quantity} units</strong>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.reason}</td>
                      <td>{r.date}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--success">{r.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Process Patient Return Modal ── */}
      {showModal && (
        <div className="pharm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pharm-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitReturn}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Authorize Patient Medicine Return</h3>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setShowModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="pharm-form-label">Invoice / Bill Number</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="e.g. INV-PHARM-2026-001"
                      value={formData.billNumber}
                      onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. Eleanor Vance"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Medicine to Return *</label>
                    <input
                      type="text"
                      required
                      className="pharm-form-input"
                      placeholder="e.g. Pantoprazole Sodium 40mg"
                      value={formData.medicineName}
                      onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Batch Number</label>
                    <input
                      type="text"
                      className="pharm-form-input"
                      placeholder="e.g. PAN-7712"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Quantity Returned *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="pharm-form-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="pharm-form-label">Approved Refund ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="pharm-form-input"
                      value={formData.refundAmount}
                      onChange={(e) => setFormData({ ...formData, refundAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Return Reason *</label>
                  <select
                    className="pharm-form-select"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  >
                    <option value="Unused">Unused / Physician altered regimen</option>
                    <option value="Wrong Medicine">Wrong Medicine Dispensed</option>
                    <option value="Damaged">Damaged / Broken Seal</option>
                    <option value="Adverse Issue">Patient Reported Adverse Reaction</option>
                    <option value="Other">Other Clinical Discrepancy</option>
                  </select>
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  ✓ Unopened & intact medicines will be automatically restocked into inventory.<br />
                  ✓ Damaged or adverse-reaction medications will be quarantined.
                </div>
              </div>
              <div className="pharm-modal-footer">
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pharm-btn pharm-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? <RefreshCw size={16} className="rec-spin" /> : <CheckCircle2 size={16} />}
                  <span>{submitting ? 'Authorizing...' : 'Authorize Return'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
