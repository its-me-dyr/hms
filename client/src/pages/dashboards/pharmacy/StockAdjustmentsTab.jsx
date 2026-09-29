/**
 * Stock Adjustments & Audit Trail Tab
 * 
 * Formal inventory variance reconciliation:
 * - Complete audit history of manual adjustments (Stock In, Stock Out, Correction, Damage, Expired, Lost, Found)
 * - Required clinical reason and timestamp logging
 * - Modal to record new stock adjustments directly affecting active catalog quantities
 */

import { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Package,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function StockAdjustmentsTab({ onNavigateTab }) {
  const [medicines, setMedicines] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [selectedMedId, setSelectedMedId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [adjType, setAdjType] = useState('Stock In');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStockData = () => {
    setLoading(true);
    setError('');
    pharmacyService.getMedicines()
      .then((res) => {
        const list = res.data?.medicines || res.data || [];
        setMedicines(Array.isArray(list) ? list : []);
        if (list.length > 0 && !selectedMedId) {
          setSelectedMedId(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load medicines for adjustments:', err);
        setError('Failed to fetch stock adjustments.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStockData();
    // Default mock adjustments if initial
    setAdjustments([
      {
        id: 'ADJ-101',
        medicineName: 'Salbutamol / Albuterol Inhaler',
        batchNumber: 'VEN-5502',
        adjustmentType: 'Stock In',
        quantity: '+20',
        reason: 'New shipment stock transfer verified from central storage',
        updatedBy: 'Chief Pharmacist',
        date: '2026-09-16 11:30 AM',
      },
      {
        id: 'ADJ-102',
        medicineName: 'Metformin Hydrochloride 500mg',
        batchNumber: 'GLU-1089',
        adjustmentType: 'Correction',
        quantity: '-2',
        reason: 'Physical count discrepancy audit at shelf 3B',
        updatedBy: 'Staff Pharmacist',
        date: '2026-09-17 09:15 AM',
      },
      {
        id: 'ADJ-103',
        medicineName: 'Azithromycin Dihydrate 500mg',
        batchNumber: 'AZI-3301',
        adjustmentType: 'Expired',
        quantity: '-8',
        reason: 'Batch reached expiration date; transferred to quarantine',
        updatedBy: 'Inventory Specialist',
        date: '2026-09-17 10:00 AM',
      },
    ]);
  }, []);

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const med = medicines.find((m) => m.id === selectedMedId);

    const payload = {
      medicineId: selectedMedId,
      batchNumber: batchNumber || 'Warehouse Shelf',
      adjustmentType: adjType,
      quantity: parseInt(quantity, 10),
      reason,
    };

    pharmacyService.adjustStock(payload)
      .then((res) => {
        const newRecord = res.data || {
          id: `ADJ-${Date.now().toString().slice(-4)}`,
          medicineName: med?.name || 'Medicine',
          batchNumber: batchNumber || 'Standard',
          adjustmentType: adjType,
          quantity: ['Stock In', 'Found'].includes(adjType) ? `+${quantity}` : `-${quantity}`,
          reason,
          updatedBy: 'Pharmacist Staff',
          date: 'Just now',
        };
        setAdjustments([newRecord, ...adjustments]);
        setShowModal(false);
        setQuantity('');
        setReason('');
        setBatchNumber('');
        fetchStockData();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to record adjustment.');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">AUDIT RECONCILIATION & VARIANCE</div>
          <h1 className="pharm-header-title">Stock Adjustments Log</h1>
          <p className="pharm-header-subtitle">
            Audited transaction ledger for inventory reconciliations, damage write-offs, and stock transfers.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchStockData}
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
            <span>Record Stock Adjustment</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Adjustments Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Medicine</th>
                  <th>Batch Number</th>
                  <th>Adjustment Type</th>
                  <th>Units Delta</th>
                  <th>Operational Reason</th>
                  <th>Updated By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id}>
                    <td style={{ fontWeight: 700, color: '#0891b2' }}>{adj.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{adj.medicineName}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, background: 'var(--bg-hover)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {adj.batchNumber}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`pharm-badge ${
                          ['Stock In', 'Found'].includes(adj.adjustmentType)
                            ? 'pharm-badge--success'
                            : ['Damage', 'Expired'].includes(adj.adjustmentType)
                            ? 'pharm-badge--danger'
                            : 'pharm-badge--warning'
                        }`}
                      >
                        {adj.adjustmentType}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '1rem', color: String(adj.quantity).startsWith('+') ? '#059669' : '#dc2626' }}>
                        {adj.quantity}
                      </strong>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                      {adj.reason}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{adj.updatedBy}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{adj.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Record Adjustment Modal ── */}
      {showModal && (
        <div className="pharm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="pharm-modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAdjustSubmit}>
              <div className="pharm-modal-header">
                <h3 className="pharm-modal-title">Record Stock Variance / Adjustment</h3>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setShowModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Select Pharmaceutical SKU *</label>
                  <select
                    className="pharm-form-select"
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                  >
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.strength}) — Current Stock: {m.totalStock}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="pharm-form-label">Adjustment Type *</label>
                    <select
                      className="pharm-form-select"
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                    >
                      <option value="Stock In">Stock In (Transfer)</option>
                      <option value="Correction">Physical Count Correction</option>
                      <option value="Damage">Damage Discard</option>
                      <option value="Expired">Expired Stock Disposal</option>
                      <option value="Lost">Lost Discrepancy</option>
                      <option value="Found">Found Unrecorded</option>
                    </select>
                  </div>
                  <div>
                    <label className="pharm-form-label">Quantity Units *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="pharm-form-input"
                      placeholder="e.g. 15"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Batch Lot Number (Optional)</label>
                  <input
                    type="text"
                    className="pharm-form-input"
                    placeholder="e.g. AUG-9824"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="pharm-form-label">Mandatory Audit Justification *</label>
                  <textarea
                    rows="3"
                    required
                    className="pharm-form-textarea"
                    placeholder="Describe discrepancy root cause or transfer manifest number..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
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
                  <span>{submitting ? 'Auditing...' : 'Authorize Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
