import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Receipt,
  CheckCheck,
  CreditCard,
  Percent,
  Building2,
  Users,
  Stethoscope,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

/**
 * HospitalAdministrativeReportsTab
 * 
 * Focused, production-ready, read-only Administrative Reports module
 * for Hospital Admins.
 * 
 * Displays strictly:
 * 1. Clinical Performance (Total Consultations, Completed, Cancelled, Completion Rate)
 * 2. Financial Summary (Total Invoices, Paid Invoices, Collected Revenue, Collection Rate)
 * 3. Departmental Workload & Staffing (Department, Total Staff, Doctors, Other Staff, Workload)
 * 
 * All data aggregates directly from real MongoDB collections with hospital isolation.
 */
export default function HospitalAdministrativeReportsTab({ initialHospitalSettings }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [reportsData, setReportsData] = useState(null);

  const fetchReports = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await hospitalAdminService.getAdministrativeReports();
      const payload = res?.data?.data || res?.data || res || {};
      if (payload && (payload.clinicalMetrics || payload.departmentAnalytics)) {
        setReportsData(payload);
      } else {
        throw new Error(res?.message || 'Unable to load administrative reports.');
      }
    } catch (err) {
      console.error('Error fetching administrative reports:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load administrative reports.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Currency configuration derived from reports or hospital settings
  const currencySymbol =
    reportsData?.currencySymbol ||
    initialHospitalSettings?.currencySymbol ||
    '$';
  const currencyCode =
    reportsData?.currency ||
    initialHospitalSettings?.currency ||
    'USD';

  const formatCurrency = (amount) => {
    const num = Number(amount || 0);
    return `${currencySymbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Metrics extraction
  const clinical = reportsData?.clinicalMetrics || {
    totalAppointments: 0,
    totalConsultations: 0,
    completedAppointments: 0,
    completed: 0,
    cancelledAppointments: 0,
    cancelled: 0,
    completionRate: 0,
  };

  const totalConsultations = clinical.totalConsultations ?? clinical.totalAppointments ?? 0;
  const completedConsultations = clinical.completed ?? clinical.completedAppointments ?? 0;
  const cancelledConsultations = clinical.cancelled ?? clinical.cancelledAppointments ?? 0;
  const completionRate = totalConsultations > 0 ? (clinical.completionRate ?? 0) : 0;

  const financial = reportsData?.financialMetrics || {
    totalBills: 0,
    totalInvoices: 0,
    paidBills: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    collectedRevenue: 0,
    collectionRate: 0,
  };

  const totalInvoices = financial.totalInvoices ?? financial.totalBills ?? 0;
  const paidInvoices = financial.paidInvoices ?? financial.paidBills ?? 0;
  const collectedRevenue = financial.collectedRevenue ?? financial.totalRevenue ?? 0;
  const collectionRate = totalInvoices > 0 ? (financial.collectionRate ?? 0) : 0;

  const departments = reportsData?.departmentAnalytics || [];

  return (
    <div className="ha-reports-tab">
      {/* ─── Page Header ────────────────────────────────────────── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title" id="admin-reports-title">Administrative Reports</h1>
          <p className="ha-page-description">
            View operational, clinical, financial, and departmental performance for your hospital.
          </p>
        </div>
        <div className="ha-page-header__right">
          <button
            type="button"
            className="ha-btn ha-btn--secondary"
            onClick={() => fetchReports(true)}
            disabled={loading || refreshing}
            aria-label="Refresh reports data"
            id="refresh-reports-btn"
          >
            <RotateCcw
              size={15}
              className={refreshing ? 'ha-spin' : ''}
              aria-hidden="true"
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Error State ────────────────────────────────────────── */}
      {error && (
        <div
          className="ha-panel"
          style={{
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.04)',
            marginBottom: '1.5rem',
          }}
          role="alert"
        >
          <div className="ha-panel__body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={22} color="#ef4444" aria-hidden="true" />
              <div>
                <strong style={{ color: '#ef4444', fontSize: '0.9375rem', display: 'block' }}>
                  Unable to load administrative reports.
                </strong>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {error}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="ha-btn ha-btn--secondary ha-btn--sm"
              onClick={() => fetchReports(false)}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ─── Loading Skeleton ───────────────────────────────────── */}
      {loading && !reportsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="ha-kpi-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ha-kpi-card" style={{ minHeight: '110px', opacity: 0.6 }}>
                <div style={{ height: '14px', width: '50%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '1rem' }} />
                <div style={{ height: '28px', width: '35%', background: 'var(--border-color)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ height: '12px', width: '70%', background: 'var(--border-color)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
          <div className="ha-panel" style={{ minHeight: '200px', opacity: 0.6 }}>
            <div className="ha-panel__header">
              <div style={{ height: '18px', width: '200px', background: 'var(--border-color)', borderRadius: '4px' }} />
            </div>
            <div className="ha-panel__body">
              <div style={{ height: '120px', background: 'var(--border-color)', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content ───────────────────────────────────────── */}
      {reportsData && (
        <>
          {/* ======================================================== */}
          {/* SECTION A: CLINICAL PERFORMANCE                         */}
          {/* ======================================================== */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title" id="clinical-perf-heading">
                <Calendar size={18} color="#0891B2" aria-hidden="true" />
                Clinical Performance
              </h2>
            </div>
            <div className="ha-panel__body">
              <div className="ha-kpi-grid" style={{ marginBottom: 0 }}>
                {/* 1. Total Consultations */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Total Consultations</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)', color: '#0891B2' }}
                    >
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value">
                    {totalConsultations.toLocaleString()}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalConsultations > 0
                      ? 'Total registered outpatient visits'
                      : 'No consultations recorded'}
                  </div>
                </div>

                {/* 2. Completed */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Completed</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                    >
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: '#10b981' }}>
                    {completedConsultations.toLocaleString()}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalConsultations > 0
                      ? `${Math.round((completedConsultations / totalConsultations) * 100)}% of total consultations`
                      : 'Zero completed visits'}
                  </div>
                </div>

                {/* 3. Cancelled */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Cancelled</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                    >
                      <XCircle size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: cancelledConsultations > 0 ? '#ef4444' : 'inherit' }}>
                    {cancelledConsultations.toLocaleString()}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalConsultations > 0
                      ? `${Math.round((cancelledConsultations / totalConsultations) * 100)}% cancellation rate`
                      : 'Zero cancellations recorded'}
                  </div>
                </div>

                {/* 4. Completion Rate */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Completion Rate</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}
                    >
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: '#0ea5e9' }}>
                    {totalConsultations > 0 ? `${completionRate}%` : '0%'}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalConsultations > 0
                      ? 'Successful clinical fulfillment'
                      : 'No consultation activity to calculate'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION B: FINANCIAL SUMMARY                             */}
          {/* ======================================================== */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title" id="financial-summary-heading">
                <Receipt size={18} color="#0891B2" aria-hidden="true" />
                Financial Summary
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Currency: <strong>{currencyCode} ({currencySymbol})</strong>
              </span>
            </div>
            <div className="ha-panel__body">
              <div className="ha-kpi-grid" style={{ marginBottom: 0 }}>
                {/* 1. Total Invoices */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Total Invoices</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)', color: '#0891B2' }}
                    >
                      <Receipt size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value">
                    {totalInvoices.toLocaleString()}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalInvoices > 0 ? 'Total bills generated' : 'No invoices billed yet'}
                  </div>
                </div>

                {/* 2. Paid Invoices */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Paid Invoices</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                    >
                      <CheckCheck size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: '#10b981' }}>
                    {paidInvoices.toLocaleString()}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalInvoices > 0
                      ? `${paidInvoices} of ${totalInvoices} fully settled`
                      : 'No settled invoices'}
                  </div>
                </div>

                {/* 3. Collected Revenue */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Collected Revenue</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                    >
                      <CreditCard size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: '#10b981' }}>
                    {formatCurrency(collectedRevenue)}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {collectedRevenue > 0
                      ? 'Verified income received'
                      : 'No revenue collected yet'}
                  </div>
                </div>

                {/* 4. Collection Rate */}
                <div className="ha-kpi-card">
                  <div className="ha-kpi-card__header">
                    <span className="ha-kpi-card__title">Collection Rate</span>
                    <div
                      className="ha-kpi-card__icon-wrapper"
                      style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}
                    >
                      <Percent size={18} />
                    </div>
                  </div>
                  <div className="ha-kpi-card__value" style={{ color: '#0ea5e9' }}>
                    {totalInvoices > 0 ? `${collectionRate}%` : '0%'}
                  </div>
                  <div className="ha-kpi-card__subtext">
                    {totalInvoices > 0
                      ? 'Ratio of settled invoices'
                      : 'No billing activity to calculate'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION C: DEPARTMENTAL WORKLOAD & STAFFING               */}
          {/* ======================================================== */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title" id="dept-workload-heading">
                <Building2 size={18} color="#0891B2" aria-hidden="true" />
                Departmental Workload & Staffing
              </h2>
              <span className="ha-badge ha-badge--info">
                {departments.length} {departments.length === 1 ? 'Department' : 'Departments'}
              </span>
            </div>
            <div className="ha-table-container">
              {departments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <Building2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No departments configured for this hospital.</p>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Add clinical and administrative departments in the Departments module to view staffing distribution.
                  </span>
                </div>
              ) : (
                <table className="ha-table" aria-label="Departmental Workload and Staffing Table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '30%' }}>Department</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Total Staff</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Doctors</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Other Staff</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Workload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => {
                      const totalStaff = dept.staffCount ?? 0;
                      const doctors = dept.doctorCount ?? 0;
                      const otherStaff = dept.otherStaffCount ?? Math.max(0, totalStaff - doctors);
                      const workload = dept.workload ?? dept.appointmentCount ?? 0;

                      return (
                        <tr key={dept.id || dept.name}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(8, 145, 178, 0.08)',
                                  color: '#0891B2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Building2 size={16} />
                              </div>
                              <div>
                                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                                  {dept.name}
                                </strong>
                                {dept.code && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Code: {dept.code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="ha-badge ha-badge--secondary" style={{ fontWeight: 600 }}>
                              {totalStaff} Staff
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="ha-badge"
                              style={{
                                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                                color: '#0891B2',
                                fontWeight: 600,
                              }}
                            >
                              {doctors} Doctors
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="ha-badge"
                              style={{
                                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                                color: 'var(--text-secondary)',
                                fontWeight: 500,
                              }}
                            >
                              {otherStaff} Other
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                              {workload.toLocaleString()}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                              visits
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

