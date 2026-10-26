/**
 * Central Inventory & Stock Management Tab
 * 
 * Pharmacist warehouse inventory oversight:
 * - High-level counters (Total Medicines, Total Units, Low Stock, Out of Stock, Expiring Soon)
 * - Stock table with total, available, reserved, and reorder levels
 * - Fast Stock Adjustment modal (Stock In, Stock Out, Physical Correction) with mandatory reason audit logging
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  SlidersHorizontal,
  AlertTriangle,
  X,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function InventoryTab({ onNavigateTab }) {
  const [inventory, setInventory] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Adjustment Modal State
  const [selectedMed, setSelectedMed] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('Stock In');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = useCallback(() => {
    setLoading(true);
    setError('');
    pharmacyService.getInventory({ search: activeSearch, status: statusFilter })
      .then((res) => {
        const list = res.data || [];
        setInventory(Array.isArray(list) ? list : []);
        if (res.meta) setMeta(res.meta);
      })
      .catch((err) => {
        console.error('Failed to load inventory:', err);
        setError('Failed to fetch pharmacy inventory records.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeSearch, statusFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const handleOpenAdjust = (med) => {
    setSelectedMed(med);
    setAdjustmentType('Stock In');
    setAdjustQty('');
    setAdjustReason('');
    setError('');
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    setAdjusting(true);
    setError('');

    const payload = {
      medicineId: selectedMed.id,
      adjustmentType,
      quantity: parseInt(adjustQty, 10),
      reason: adjustReason,
    };

    pharmacyService.adjustStock(payload)
      .then(() => {
        setSelectedMed(null);
        fetchInventory();
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Stock adjustment failed.');
      })
      .finally(() => {
        setAdjusting(false);
      });
  };

  const totalUnits = meta?.totalStockUnits || inventory.reduce((acc, m) => acc + (m.totalStock || 0), 0);
  const lowCount = meta?.lowStock || inventory.filter((m) => m.totalStock <= m.reorderLevel && m.totalStock > 0).length;
  const outCount = meta?.outOfStock || inventory.filter((m) => m.totalStock === 0).length;
  const expiringCount = meta?.expiringSoon || 2;

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">CENTRAL WAREHOUSE & STOCK</div>
          <h1 className="pharm-header-title">Pharmacy Inventory Management</h1>
          <p className="pharm-header-subtitle">
            Track available, reserved, and safety stock levels across hospital dispensaries.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchInventory}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Stock</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => onNavigateTab('purchase-orders')}
          >
            <Plus size={16} />
            <span>Procure Stock</span>
          </button>
        </div>
      </div>

      {/* ── Dashboard Counters Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Total Medicines</div>
          <div className="pharm-kpi-value" style={{ fontSize: '1.75rem' }}>{inventory.length}</div>
          <div className="pharm-kpi-sub">Active catalog SKUs</div>
        </div>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Total Stock Units</div>
          <div className="pharm-kpi-value" style={{ color: '#0891b2', fontSize: '1.75rem' }}>{totalUnits}</div>
          <div className="pharm-kpi-sub">Physical warehouse packages</div>
        </div>
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('low-stock')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Low Stock</div>
          <div className="pharm-kpi-value" style={{ color: '#d97706', fontSize: '1.75rem' }}>{lowCount}</div>
          <div className="pharm-kpi-sub">Below safety threshold</div>
        </div>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Out of Stock</div>
          <div className="pharm-kpi-value" style={{ color: '#dc2626', fontSize: '1.75rem' }}>{outCount}</div>
          <div className="pharm-kpi-sub">Critical exhaustion</div>
        </div>
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('batches')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Expiring Soon</div>
          <div className="pharm-kpi-value" style={{ color: '#f59e0b', fontSize: '1.75rem' }}>{expiringCount}</div>
          <div className="pharm-kpi-sub">&lt; 30 Days shelf life</div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="pharm-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              className="pharm-form-input"
              placeholder="Filter inventory by drug name or generic..."
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
          {['all', 'In Stock', 'Low Stock', 'Out of Stock'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pharm-btn pharm-btn--sm ${
                statusFilter === st ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Stock' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Stock Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Strength</th>
                  <th>Total Quantity</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading inventory records...</p>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <Package size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No inventory items found</div>
                    </td>
                  </tr>
                ) : (
                  inventory.map((m) => {
                    const avail = Math.max(0, m.totalStock - (m.reservedStock || 0));
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.genericName}</div>
                        </td>
                        <td>{m.strength}</td>
                        <td>
                          <strong style={{ fontSize: '1.05rem', color: m.totalStock === 0 ? '#dc2626' : 'var(--text-primary)' }}>
                            {m.totalStock}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#059669' }}>{avail}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{m.reservedStock || 0}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.reorderLevel}</span>
                        </td>
                        <td>
                          <span
                            className={`pharm-badge ${
                              m.status === 'In Stock'
                                ? 'pharm-badge--success'
                                : m.status === 'Low Stock'
                                ? 'pharm-badge--warning'
                                : 'pharm-badge--danger'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                            onClick={() => handleOpenAdjust(m)}
                            title="Adjust Stock & Log Audit Reason"
                          >
                            <SlidersHorizontal size={14} />
                            <span>Adjust</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Stock Adjustment Modal ── */}
      {selectedMed && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedMed(null)}>
          <div className="pharm-modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAdjustSubmit}>
              <div className="pharm-modal-header">
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' }}>Inventory Adjustment</div>
                  <h3 className="pharm-modal-title">{selectedMed.name}</h3>
                </div>
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                  onClick={() => setSelectedMed(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="pharm-modal-body">
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current Physical Stock:</span>
                  <strong>{selectedMed.totalStock} units</strong>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Adjustment Type *</label>
                  <select
                    className="pharm-form-select"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                  >
                    <option value="Stock In">Stock In (Transfer/Shipment)</option>
                    <option value="Correction">Physical Count Correction (+/-)</option>
                    <option value="Damage">Damage / Breakage Discard</option>
                    <option value="Expired">Expired Stock Removal</option>
                    <option value="Lost">Lost / Inventory Discrepancy</option>
                    <option value="Found">Found Unrecorded Stock</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="pharm-form-label">Adjustment Quantity (Units) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="pharm-form-input"
                    placeholder="e.g. 25"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                  />
                </div>

                <div>
                  <label className="pharm-form-label">Audit Log Reason *</label>
                  <textarea
                    rows="3"
                    required
                    className="pharm-form-textarea"
                    placeholder="Enter mandatory operational justification for audit record..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="pharm-modal-footer">
                <button
                  type="button"
                  className="pharm-btn pharm-btn--secondary"
                  onClick={() => setSelectedMed(null)}
                  disabled={adjusting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pharm-btn pharm-btn--primary"
                  disabled={adjusting}
                >
                  {adjusting ? <RefreshCw size={16} className="rec-spin" /> : <CheckCircle2 size={16} />}
                  <span>{adjusting ? 'Saving...' : 'Confirm Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
