/**
 * Low Stock Alerts Tab
 * 
 * Pharmacist early-warning replenishment console:
 * - Direct visibility into medications at or below safety reorder levels
 * - Shortage quantity calculations and Critical vs Warning priority grading
 * - One-click "Create Purchase Order" trigger linked directly to the procurement pipeline
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function LowStockAlertsTab({ onNavigateTab }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchLowStock = useCallback(() => {
    setLoading(true);
    setError('');
    pharmacyService.getMedicines()
      .then((res) => {
        const allMeds = res.data?.medicines || res.data || [];
        // Filter those at or below reorder level
        const lowMeds = allMeds.filter((m) => m.totalStock <= m.reorderLevel);
        setItems(lowMeds);
      })
      .catch((err) => {
        console.error('Failed to load low stock alerts:', err);
        setError('Failed to fetch low stock alerts.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const filteredItems = search
    ? items.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.genericName.toLowerCase().includes(search.toLowerCase()))
    : items;

  const criticalCount = items.filter((m) => m.totalStock === 0).length;
  const warningCount = items.filter((m) => m.totalStock > 0).length;

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">STOCK DEPLETION & REORDER THRESHOLDS</div>
          <h1 className="pharm-header-title">Low Stock & Shortage Alerts</h1>
          <p className="pharm-header-subtitle">
            Critical medications nearing warehouse exhaustion requiring emergency or routine vendor procurement.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchLowStock}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Alerts</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => onNavigateTab('purchase-orders')}
          >
            <ShoppingCart size={16} />
            <span>Procure All Shortages</span>
          </button>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Status Ticker Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="pharm-kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="pharm-kpi-label">Critical Exhaustion (Stock: 0)</div>
          <div className="pharm-kpi-value" style={{ color: '#dc2626' }}>{criticalCount}</div>
          <div className="pharm-kpi-sub">Immediate stock-out danger</div>
        </div>
        <div className="pharm-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="pharm-kpi-label">Low Stock (At Reorder Level)</div>
          <div className="pharm-kpi-value" style={{ color: '#d97706' }}>{warningCount}</div>
          <div className="pharm-kpi-sub">Below recommended safety buffer</div>
        </div>
        <div className="pharm-kpi-card" style={{ borderLeft: '4px solid #0891b2' }}>
          <div className="pharm-kpi-label">Total Shortage SKUs</div>
          <div className="pharm-kpi-value" style={{ color: '#0891b2' }}>{items.length}</div>
          <div className="pharm-kpi-sub">Requiring purchase orders</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="pharm-filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            className="pharm-form-input"
            placeholder="Search low-stock drug name..."
            style={{ paddingLeft: '38px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Alerts Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Point</th>
                  <th>Shortage Deficit</th>
                  <th>Recommended Requisition</th>
                  <th>Alert Priority</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Analyzing inventory thresholds...</p>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No stock shortages detected</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        All pharmaceutical inventory is currently above minimum safety reorder thresholds.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((m) => {
                    const isZero = m.totalStock === 0;
                    const shortage = Math.max(0, m.reorderLevel - m.totalStock);
                    const suggestedOrder = shortage + m.reorderLevel;

                    return (
                      <tr
                        key={m.id}
                        style={{
                          backgroundColor: isZero ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.03)',
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.genericName} • {m.strength}</div>
                        </td>
                        <td>
                          <span className="pharm-badge pharm-badge--info" style={{ fontSize: '0.72rem' }}>
                            {m.category}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1.1rem', color: isZero ? '#dc2626' : '#d97706' }}>
                            {m.totalStock} units
                          </strong>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.reorderLevel} units</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#dc2626' }}>
                            -{shortage} units
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#0891b2' }}>+{suggestedOrder} units</strong>
                        </td>
                        <td>
                          <span
                            className={`pharm-badge ${
                              isZero ? 'pharm-badge--danger' : 'pharm-badge--warning'
                            }`}
                          >
                            {isZero ? 'Critical Depleted' : 'Low Buffer'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="pharm-btn pharm-btn--primary pharm-btn--sm"
                              onClick={() => onNavigateTab('purchase-orders')}
                              title="Generate Procurement Order"
                            >
                              <ShoppingCart size={14} />
                              <span>Create PO</span>
                            </button>
                          </div>
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
    </div>
  );
}
