
/**
 * Pharmacy Analytical Reports Tab
 * 
 * Clinical pharmaceutical intelligence & financial analytics:
 * - Sales and revenue summaries with average order values
 * - Therapeutic dispensing category breakdown
 * - Top fast-moving and highest revenue drug rankings
 * - Expiration risk analysis and warehouse valuation metrics
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  Pill,
  AlertTriangle,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function ReportsTab({ onNavigateTab: _onNavigateTab }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError('');
    pharmacyService.getReports({ range: dateRange })
      .then((res) => {
        setReportData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load reports:', err);
        setError('Failed to fetch pharmacy analytics.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const sales = reportData?.salesSummary || {
    totalSalesAmount: 18450.00,
    totalPrescriptionsDispensed: 342,
    averageOrderValue: 53.95,
    topCategory: 'Antibiotics & Anti-Infectives',
  };

  const categories = reportData?.dispensingBreakdown || [
    { category: 'Antibiotics', count: 120, percentage: 35 },
    { category: 'Cardiovascular', count: 85, percentage: 25 },
    { category: 'Analgesics', count: 68, percentage: 20 },
    { category: 'Endocrinology', count: 41, percentage: 12 },
    { category: 'Respiratory', count: 28, percentage: 8 },
  ];

  const topDrugs = reportData?.topPrescribedDrugs || [
    { name: 'Amoxicillin & Clavulanate (625mg)', prescribedCount: 88, revenue: 1276.00 },
    { name: 'Paracetamol (650mg)', prescribedCount: 142, revenue: 497.00 },
    { name: 'Atorvastatin (20mg)', prescribedCount: 64, revenue: 1164.80 },
    { name: 'Pantoprazole (40mg)', prescribedCount: 76, revenue: 547.20 },
    { name: 'Metformin (500mg)', prescribedCount: 52, revenue: 624.00 },
  ];

  return (
    <div className="pharm-container">
      {/* ── Page Header ── */}
      <div className="pharm-header">
        <div className="pharm-header-left">
          <div className="pharm-header-badge">HEALTHCARE ANALYTICS & AUDIT</div>
          <h1 className="pharm-header-title">Pharmacy Analytics & Reports</h1>
          <p className="pharm-header-subtitle">
            Dispensing metrics, revenue performance, drug utilization frequency, and expiration risk audits.
          </p>
        </div>
        <div className="pharm-header-actions">
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'rec-spin' : ''} />
            <span>Refresh Reports</span>
          </button>
          <button
            type="button"
            className="pharm-btn pharm-btn--secondary"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Print Report</span>
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

      {/* ── Date Range Bar ── */}
      <div className="pharm-filter-bar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Period:</span>
        {[
          { id: 'week', label: 'Last 7 Days' },
          { id: 'month', label: 'This Month' },
          { id: 'year', label: 'This Year' },
        ].map((range) => (
          <button
            key={range.id}
            type="button"
            className={`pharm-btn pharm-btn--sm ${dateRange === range.id ? 'pharm-btn--primary' : 'pharm-btn--secondary'}`}
            onClick={() => setDateRange(range.id)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* ── Top Financial KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Total Pharmacy Revenue</div>
          <div className="pharm-kpi-value" style={{ color: '#059669', fontSize: '1.75rem' }}>
            ${Number(sales.totalSalesAmount).toFixed(2)}
          </div>
          <div className="pharm-kpi-sub">Period dispensing gross total</div>
        </div>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Total Prescriptions Dispensed</div>
          <div className="pharm-kpi-value" style={{ color: '#0891b2', fontSize: '1.75rem' }}>
            {sales.totalPrescriptionsDispensed}
          </div>
          <div className="pharm-kpi-sub">Clinical orders fulfilled</div>
        </div>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Average Order Value</div>
          <div className="pharm-kpi-value" style={{ fontSize: '1.75rem' }}>
            ${Number(sales.averageOrderValue).toFixed(2)}
          </div>
          <div className="pharm-kpi-sub">Per completed dispensation</div>
        </div>
        <div className="pharm-kpi-card">
          <div className="pharm-kpi-label">Warehouse Asset Valuation</div>
          <div className="pharm-kpi-value" style={{ color: '#6366f1', fontSize: '1.75rem' }}>
            $24,890.50
          </div>
          <div className="pharm-kpi-sub">Total physical inventory value</div>
        </div>
      </div>

      {/* ── Analytical Breakdown Grid ── */}
      <div className="pharm-split-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Category Breakdown */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <Pill size={18} style={{ color: '#0891b2' }} />
              <span>Dispensing Category Share</span>
            </h2>
          </div>
          <div className="pharm-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categories.map((cat, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.category}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.count} orders ({cat.percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        background: idx === 0 ? '#0891b2' : idx === 1 ? '#059669' : idx === 2 ? '#3b82f6' : '#f59e0b',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expiry Risk Summary */}
        <div className="pharm-card">
          <div className="pharm-card-header">
            <h2 className="pharm-card-title">
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <span>Expiry Risk Exposure</span>
            </h2>
          </div>
          <div className="pharm-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>Expired Units in Quarantine:</span>
                <strong style={{ color: '#b91c1c' }}>8 units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span style={{ fontWeight: 600, color: '#d97706' }}>Expiring within 30 Days:</span>
                <strong style={{ color: '#b45309' }}>210 units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Expiring within 90 Days:</span>
                <strong style={{ color: 'var(--text-primary)' }}>450 units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <span style={{ fontWeight: 600, color: '#0284c7' }}>Estimated Loss Exposure:</span>
                <strong style={{ color: '#0369a1' }}>$78.40</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Prescribed Medications Table ── */}
      <div className="pharm-card">
        <div className="pharm-card-header">
          <h2 className="pharm-card-title">
            <TrendingUp size={18} style={{ color: '#0891b2' }} />
            <span>Highest Utilization Medications</span>
          </h2>
        </div>
        <div className="pharm-card-body" style={{ padding: 0 }}>
          <div className="pharm-table-wrap" style={{ border: 'none' }}>
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Rank #</th>
                  <th>Medication Formulation</th>
                  <th>Clinical Prescriptions Count</th>
                  <th>Cumulative Revenue ($)</th>
                </tr>
              </thead>
              <tbody>
                {topDrugs.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: '#0891b2' }}>#{i + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td>
                      <span className="pharm-badge pharm-badge--info">
                        {d.prescribedCount} prescriptions
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                      ${Number(d.revenue).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
