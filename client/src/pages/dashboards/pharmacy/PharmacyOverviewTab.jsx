/**
 * Pharmacy Overview & Command Center Tab
 * 
 * Central operational cockpit for Hospital Pharmacy:
 * - 6 Responsive KPI cards (Prescriptions, Pending Dispensing, Sales, Low Stock, Expiry, Orders)
 * - Dual workspace: Pending Prescriptions queue + Critical Alerts console
 * - Today's Dispensing feed, recent sales, and fast action triggers
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Pill,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  RefreshCw,
  Search,
  CheckCircle2,
  Eye,
  ArrowRight,
  TrendingUp,
  X,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function PharmacyOverviewTab({ user, onNavigateTab, onSelectPrescription }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRx, setSelectedRx] = useState(null);

  const fetchOverview = useCallback(() => {
    setLoading(true);
    setError('');
    pharmacyService.getDashboard()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load pharmacy dashboard metrics:', err);
        setError('Unable to load pharmacy operational metrics.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const staffName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Pharmacy Specialist';

  const kpis = data?.kpis || {
    todayPrescriptions: 8,
    pendingDispensing: 4,
    todaySales: 269.50,
    lowStockItems: 3,
    expiringSoon: 2,
    pendingPurchaseOrders: 2,
  };

  return (
    <div className="pharm-container">
      {/* ── Welcome Hero Banner ── */}
      <div className="pharm-welcome-hero">
        <div className="pharm-welcome-top">
          <div>
            <div className="pharm-header-badge">PHARMACY COMMAND CENTER</div>
            <h1 className="pharm-welcome-greeting">
              {getGreeting()}, {staffName}
            </h1>
            <p className="pharm-welcome-subtext">
              Manage prescriptions, dispensing, inventory, purchases, billing, and pharmacy operations.
            </p>
          </div>
          <div className="pharm-header-actions">
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary"
              onClick={fetchOverview}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary"
              onClick={() => onNavigateTab('medicines')}
            >
              <Search size={16} />
              <span>Search Medicine</span>
            </button>
            <button
              type="button"
              className="pharm-btn pharm-btn--primary"
              onClick={() => onNavigateTab('prescriptions')}
            >
              <Pill size={16} />
              <span>Process Prescription</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div style={{ padding: '0.85rem 1rem', background: '#fee2e2', borderRadius: '8px', color: '#b91c1c', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── 6 KPI Cards Grid ── */}
      <div className="pharm-kpi-grid">
        {/* KPI 1 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('prescriptions')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
              <Pill size={20} />
            </div>
            <span className="pharm-badge pharm-badge--info">Today</span>
          </div>
          <div className="pharm-kpi-label">Today's Prescriptions</div>
          <div className="pharm-kpi-value">{loading ? '—' : kpis.todayPrescriptions}</div>
          <div className="pharm-kpi-sub">Clinical orders received</div>
        </div>

        {/* KPI 2 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('dispensing')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Clock size={20} />
            </div>
            <span className="pharm-badge pharm-badge--warning">Action Req</span>
          </div>
          <div className="pharm-kpi-label">Pending Dispensing</div>
          <div className="pharm-kpi-value" style={{ color: '#d97706' }}>{loading ? '—' : kpis.pendingDispensing}</div>
          <div className="pharm-kpi-sub">Awaiting pharmacist fulfillment</div>
        </div>

        {/* KPI 3 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('billing')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <DollarSign size={20} />
            </div>
            <span className="pharm-badge pharm-badge--success">+12.4%</span>
          </div>
          <div className="pharm-kpi-label">Today's Sales</div>
          <div className="pharm-kpi-value" style={{ color: '#059669' }}>
            {loading ? '—' : `$${Number(kpis.todaySales).toFixed(2)}`}
          </div>
          <div className="pharm-kpi-sub">Dispensed invoice revenue</div>
        </div>

        {/* KPI 4 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('low-stock')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={20} />
            </div>
            <span className="pharm-badge pharm-badge--danger">Critical</span>
          </div>
          <div className="pharm-kpi-label">Low Stock Items</div>
          <div className="pharm-kpi-value" style={{ color: '#dc2626' }}>{loading ? '—' : kpis.lowStockItems}</div>
          <div className="pharm-kpi-sub">Below reorder threshold</div>
        </div>

        {/* KPI 5 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('batches')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
              <Calendar size={20} />
            </div>
            <span className="pharm-badge pharm-badge--warning">&lt; 30 Days</span>
          </div>
          <div className="pharm-kpi-label">Expiring Soon</div>
          <div className="pharm-kpi-value">{loading ? '—' : kpis.expiringSoon}</div>
          <div className="pharm-kpi-sub">Batches requiring review</div>
        </div>

        {/* KPI 6 */}
        <div className="pharm-kpi-card" onClick={() => onNavigateTab('purchase-orders')} style={{ cursor: 'pointer' }}>
          <div className="pharm-kpi-header">
            <div className="pharm-kpi-icon-wrap" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <ShoppingCart size={20} />
            </div>
            <span className="pharm-badge pharm-badge--info">In Transit</span>
          </div>
          <div className="pharm-kpi-label">Pending Orders</div>
          <div className="pharm-kpi-value">{loading ? '—' : kpis.pendingPurchaseOrders}</div>
          <div className="pharm-kpi-sub">Active procurement POs</div>
        </div>
      </div>

      {/* ── Main Operations Split Workspace ── */}
      <div className="pharm-split-grid" style={{ marginBottom: '1.5rem' }}>
        {/* LEFT: Pending Prescriptions Queue */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <Pill size={18} style={{ color: '#0891b2' }} />
              <span>Pending Prescriptions</span>
            </h2>
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary pharm-btn--sm"
              onClick={() => onNavigateTab('prescriptions')}
            >
              <span>View All Prescriptions</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="pharm-card-body" style={{ padding: 0 }}>
            <div className="pharm-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="pharm-table">
                <thead>
                  <tr>
                    <th>Prescription ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.pendingPrescriptions || []).slice(0, 5).map((rx) => (
                    <tr key={rx.id || rx.prescriptionId}>
                      <td style={{ fontWeight: 700, color: '#0891b2' }}>{rx.prescriptionId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rx.patient}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rx.patientId}</div>
                      </td>
                      <td>{rx.doctor}</td>
                      <td>{rx.date}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info">
                          {rx.items || (rx.medications ? rx.medications.length : 1)} meds
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
                            title="View Prescription Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="pharm-btn pharm-btn--primary pharm-btn--sm"
                            onClick={() => {
                              if (onSelectPrescription) onSelectPrescription(rx);
                              onNavigateTab('dispensing');
                            }}
                            title="Dispense Medication"
                          >
                            <CheckCircle2 size={14} />
                            <span>Dispense</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!data?.pendingPrescriptions || data.pendingPrescriptions.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                        No pending prescriptions found. All caught up!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Critical Pharmacy Alerts */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <span>Critical Pharmacy Alerts</span>
            </h2>
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary pharm-btn--sm"
              onClick={() => onNavigateTab('low-stock')}
            >
              <span>Manage</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="pharm-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(data?.criticalAlerts || []).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    borderLeft: alert.priority === 'Critical' ? '4px solid #ef4444' : '4px solid #f59e0b',
                    backgroundColor: alert.priority === 'Critical' ? 'rgba(239, 68, 68, 0.03)' : 'rgba(245, 158, 11, 0.03)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                      <span
                        className={`pharm-badge ${
                          alert.priority === 'Critical' ? 'pharm-badge--danger' : 'pharm-badge--warning'
                        }`}
                        style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}
                      >
                        {alert.type}
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{alert.title}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {alert.detail}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    onClick={() => onNavigateTab(alert.linkTab || 'inventory')}
                  >
                    {alert.action || 'Resolve'}
                  </button>
                </div>
              ))}
              {(!data?.criticalAlerts || data.criticalAlerts.length === 0) && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>All inventory thresholds stable</p>
                  <span style={{ fontSize: '0.78rem' }}>No critical drug shortages or expired batches found.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Operational Feeds Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Today's Dispensing Feed */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
              <span>Today's Dispensing Feed</span>
            </h2>
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary pharm-btn--sm"
              onClick={() => onNavigateTab('dispensing')}
            >
              <span>Workstation</span>
            </button>
          </div>
          <div className="pharm-card-body" style={{ padding: 0 }}>
            <div className="pharm-table-wrap" style={{ border: 'none' }}>
              <table className="pharm-table">
                <thead>
                  <tr>
                    <th>Dispense ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.todayDispensations || []).map((d) => (
                    <tr key={d.id || d.dispensingId}>
                      <td style={{ fontWeight: 600, color: '#0891b2' }}>{d.dispensingId}</td>
                      <td>{d.patientName}</td>
                      <td>{d.doctorName}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>${Number(d.totalAmount).toFixed(2)}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--success">Completed</span>
                      </td>
                    </tr>
                  ))}
                  {(!data?.todayDispensations || data.todayDispensations.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No medications dispensed yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Prescribed Medicines */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <TrendingUp size={18} style={{ color: '#0891b2' }} />
              <span>Top Fast-Moving Medicines</span>
            </h2>
            <button
              type="button"
              className="pharm-btn pharm-btn--secondary pharm-btn--sm"
              onClick={() => onNavigateTab('medicines')}
            >
              <span>Catalog</span>
            </button>
          </div>
          <div className="pharm-card-body" style={{ padding: 0 }}>
            <div className="pharm-table-wrap" style={{ border: 'none' }}>
              <table className="pharm-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Category</th>
                    <th>Stock Units</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topMedicines || []).map((m, idx) => (
                    <tr key={m.id || idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                      <td>
                        <span className="pharm-badge pharm-badge--info" style={{ fontSize: '0.72rem' }}>
                          {m.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{m.stock}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>${Number(m.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prescription Details Modal ── */}
      {selectedRx && (
        <div className="pharm-modal-overlay" onClick={() => setSelectedRx(null)}>
          <div className="pharm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pharm-modal-header">
              <h3 className="pharm-modal-title">Prescription Details — {selectedRx.prescriptionId}</h3>
              <button
                type="button"
                className="pharm-btn pharm-btn--secondary pharm-btn--sm"
                onClick={() => setSelectedRx(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pharm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Patient Information</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginTop: '0.2rem' }}>{selectedRx.patient}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {selectedRx.patientId}</div>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Attending Physician</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginTop: '0.2rem' }}>{selectedRx.doctor}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date: {selectedRx.date}</div>
                </div>
              </div>

              {selectedRx.diagnosis && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.85rem', color: '#0369a1' }}>
                  <strong>Clinical Diagnosis:</strong> {selectedRx.diagnosis}
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Prescribed Medications ({selectedRx.medications ? selectedRx.medications.length : 1})
              </h4>
              <div className="pharm-table-wrap">
                <table className="pharm-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRx.medications || []).map((med, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#0891b2' }}>{med.name}</td>
                        <td>{med.dosage}</td>
                        <td>{med.frequency}</td>
                        <td>{med.duration}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{med.instructions || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <span>Dispense Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
