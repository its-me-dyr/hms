/**
 * Batches & Expiry Management Tab
 * 
 * Clinical batch tracking & expiration safety:
 * - Real-time shelf-life countdowns & automated safety status tagging (Valid, Expiring Soon, Expired)
 * - Strict segregation: expired stock flagged with quarantine alerts
 * - Filters by expiration risk category (All, Expiring Soon, Expired, Valid)
 * - Fast batch traceability to supplier and procurement records
 */

import { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  XCircle,
  Truck,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function BatchesExpiryTab({ onNavigateTab }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchBatches = () => {
    setLoading(true);
    setError('');
    pharmacyService.getBatches({ filter: filterStatus, search })
      .then((res) => {
        const list = res.data || [];
        setBatches(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to load batches:', err);
        setError('Failed to fetch batch inventory.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBatches();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBatches();
  };

  const validCount = batches.filter((b) => b.status === 'Valid').length;
  const expiringSoonCount = batches.filter((b) => b.status === 'Expiring Soon').length;
  const expiredCount = batches.filter((b) => b.status === 'Expired').length;

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">QUALITY ASSURANCE & EXPIRY AUDIT</div>
          <h1 className="pharm-header-title">Batches & Expiry Tracking</h1>
          <p className="pharm-header-subtitle">
            Inspect individual manufacturing lots, track shelf-life countdowns, and guard patient safety against expired medications.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchBatches}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Batches</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--primary"
            onClick={() => onNavigateTab('purchase-orders')}
          >
            <Truck size={16} />
            <span>Procure Replacement Lots</span>
          </button>
        </div>
      </div>

      {/* ── Risk Counter Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="pharm-kpi-card" onClick={() => setFilterStatus('all')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Active Batch Lots</div>
          <div className="pharm-kpi-value">{batches.length}</div>
          <div className="pharm-kpi-sub">Total tracked warehouse lots</div>
        </div>
        <div className="pharm-kpi-card" onClick={() => setFilterStatus('Expiring Soon')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Expiring in &lt; 30 Days</div>
          <div className="pharm-kpi-value" style={{ color: '#d97706' }}>{expiringSoonCount}</div>
          <div className="pharm-kpi-sub">Prioritize for dispensing</div>
        </div>
        <div className="pharm-kpi-card" onClick={() => setFilterStatus('Expired')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Expired Batches (Quarantined)</div>
          <div className="pharm-kpi-value" style={{ color: '#dc2626' }}>{expiredCount}</div>
          <div className="pharm-kpi-sub">Blocked from dispensary</div>
        </div>
        <div className="pharm-kpi-card" onClick={() => setFilterStatus('Valid')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-label">Valid Shelf Life Lots</div>
          <div className="pharm-kpi-value" style={{ color: '#059669' }}>{validCount}</div>
          <div className="pharm-kpi-sub">Fully certified for dispensing</div>
        </div>
      </div>

      {/* ── Search & Filters ── */}
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
              placeholder="Search by Batch Number (e.g. AUG-9824) or Medicine..."
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
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
          {['all', 'Expiring Soon', 'Expired', 'Valid'].map((st) => (
            <button
              key={st}
              type="button"
              className={`pharm-btn pharm-btn--sm ${
                filterStatus === st ? 'pharm-btn--primary' : 'pharm-btn--secondary'
              }`}
              onClick={() => setFilterStatus(st)}
            >
              {st === 'all' ? 'All Batches' : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Batches Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Batch Lot #</th>
                  <th>Mfg. Date</th>
                  <th>Expiry Date</th>
                  <th>Batch Qty</th>
                  <th>Available Qty</th>
                  <th>Supplier / Distributor</th>
                  <th>Safety Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={28} className="rec-spin" style={{ margin: '0 auto 0.75rem', color: '#0891b2' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Loading batch lots...</p>
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                      <Clock size={40} style={{ color: 'var(--border-color)', margin: '0 auto 0.75rem' }} />
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>No matching batches</div>
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => {
                    const isExpired = b.status === 'Expired';
                    const isExpiringSoon = b.status === 'Expiring Soon';

                    return (
                      <tr
                        key={b.id || b.batchNumber}
                        style={{
                          backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.04)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.medicineName}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#0891b2',
                              background: 'var(--bg-hover)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {b.batchNumber}
                          </span>
                        </td>
                        <td>{b.mfgDate}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: isExpired ? '#dc2626' : isExpiringSoon ? '#d97706' : 'var(--text-primary)' }}>
                            {b.expiryDate}
                          </span>
                        </td>
                        <td>{b.quantity}</td>
                        <td>
                          <strong style={{ color: isExpired ? 'var(--text-muted)' : '#059669', fontSize: '1rem' }}>
                            {isExpired ? 0 : b.availableQuantity}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.supplierName}</td>
                        <td>
                          <span
                            className={`pharm-badge ${
                              isExpired
                                ? 'pharm-badge--danger'
                                : isExpiringSoon
                                ? 'pharm-badge--warning'
                                : 'pharm-badge--success'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isExpired ? (
                            <button
                              type="button"
                              className="pharm-btn pharm-btn--danger pharm-btn--sm"
                              onClick={() => onNavigateTab('returns')}
                              title="Process Supplier Return for Expired Stock"
                            >
                              <span>Return</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                              onClick={() => onNavigateTab('dispensing')}
                              title="Prioritize for Dispensing"
                            >
                              <span>Dispense</span>
                            </button>
                          )}
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
