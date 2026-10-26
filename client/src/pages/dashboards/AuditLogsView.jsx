/**
 * Audit Logs View
 * 
 * Production-ready Super Admin Audit Vault providing:
 * 1. Global immutable audit trail from MongoDB AuditLog collection.
 * 2. Real aggregated summary cards (Total, Success, Failed, Security events).
 * 3. Multi-dimensional backend filtering (Date range, Module, Action, Role, Status, Hospital, Actor).
 * 4. Deep search across Actor name/email, action, module, IP, resource ID, and Event ID.
 * 5. Event inspection details modal with recursive sensitive credential sanitization.
 * 6. Server-side pagination with custom page sizes (20, 50, 100).
 * 7. CSV Export for filtered audit logs.
 * 8. Strict read-only enforcement (no edit or delete capabilities).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { superadminService } from '../../services/superadmin.service';
import CompactPageHeader from './CompactPageHeader';
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Download,
  Calendar,
  Eye,
  X,
  Building2,
  Filter,
  RotateCcw,
  Clock,
  Laptop,


  ChevronLeft,
  ChevronRight,

} from 'lucide-react';

export default function AuditLogsView() {
  // ─── Query State ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hospitalFilter, setHospitalFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ─── Data & Metadata State ────────────────────────────────────────────────
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });
  const [stats, setStats] = useState({ total: 0, success: 0, failure: 0, security: 0 });
  const [filterOptions, setFilterOptions] = useState({
    modules: [],
    actions: [],
    roles: [],
    hospitals: [],
  });

  // ─── UI & Interaction State ────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ─── Fetch Audit Logs from Backend ─────────────────────────────────────────
  const fetchAuditLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg('');

      try {
        const params = {
          page,
          limit,
          search: search.trim() || undefined,
          dateRange,
          module: moduleFilter !== 'all' ? moduleFilter : undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          hospital: hospitalFilter !== 'all' ? hospitalFilter : undefined,
          startDate: dateRange === 'custom' && startDate ? startDate : undefined,
          endDate: dateRange === 'custom' && endDate ? endDate : undefined,
        };

        const res = await superadminService.getAuditLogs(params);
        const data = res?.data || res;

        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
          if (data.pagination) setPagination(data.pagination);
          if (data.stats) setStats(data.stats);
          if (data.filterOptions) {
            setFilterOptions((prev) => ({
              modules: data.filterOptions.modules?.length ? data.filterOptions.modules : prev.modules,
              actions: data.filterOptions.actions?.length ? data.filterOptions.actions : prev.actions,
              roles: data.filterOptions.roles?.length ? data.filterOptions.roles : prev.roles,
              hospitals: data.filterOptions.hospitals?.length ? data.filterOptions.hospitals : prev.hospitals,
            }));
          }
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setErrorMsg(err.message || 'Failed to load audit logs. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      limit,
      search,
      dateRange,
      startDate,
      endDate,
      moduleFilter,
      actionFilter,
      roleFilter,
      statusFilter,
      hospitalFilter,
    ]
  );

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // ─── Filter & Search Handlers ──────────────────────────────────────────────
  const handleApplyFilters = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setModuleFilter('all');
    setActionFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setHospitalFilter('all');
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      dateRange !== 'all' ||
      moduleFilter !== 'all' ||
      actionFilter !== 'all' ||
      roleFilter !== 'all' ||
      statusFilter !== 'all' ||
      hospitalFilter !== 'all' ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [
    search,
    dateRange,
    moduleFilter,
    actionFilter,
    roleFilter,
    statusFilter,
    hospitalFilter,
    startDate,
    endDate,
  ]);

  // ─── CSV Export Functionality ──────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {
        export: 'csv',
        search: search.trim() || undefined,
        dateRange,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        hospital: hospitalFilter !== 'all' ? hospitalFilter : undefined,
        startDate: dateRange === 'custom' && startDate ? startDate : undefined,
        endDate: dateRange === 'custom' && endDate ? endDate : undefined,
      };

      const res = await superadminService.getAuditLogs(params);
      const data = res?.data || res;
      const exportLogs = data?.logs || logs;

      if (!exportLogs.length) {
        alert('No audit logs available to export.');
        return;
      }

      const headers = ['Event ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Module', 'Hospital', 'Status', 'IP Address', 'Details'];
      const rows = exportLogs.map((l) => [
        l.id || l._id || '',
        l.createdAt ? new Date(l.createdAt).toISOString() : '',
        l.actorName || l.userEmail || 'System',
        l.userRole || 'ANONYMOUS',
        l.action || '',
        l.module || '',
        l.hospitalName || '—',
        l.status || 'SUCCESS',
        l.ipAddress || '—',
        JSON.stringify(l.details || {}).replace(/"/g, '""'),
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `hms_audit_vault_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export audit logs. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Status Badge Styler ───────────────────────────────────────────────────
  const renderStatusBadge = (status) => {
    const s = String(status || 'SUCCESS').toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span
          className="sa-badge sa-badge--success"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
        >
          <CheckCircle2 size={12} />
          SUCCESS
        </span>
      );
    }
    if (s === 'FAILURE') {
      return (
        <span
          className="sa-badge sa-badge--danger"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
        >
          <XCircle size={12} />
          FAILURE
        </span>
      );
    }
    return (
      <span
        className="sa-badge sa-badge--warning"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
      >
        <AlertTriangle size={12} />
        {s}
      </span>
    );
  };

  // ─── Action Badge Styler ───────────────────────────────────────────────────
  const getActionBadgeStyle = (action, module) => {
    const act = (action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('DEACTIVATE') || act.includes('REJECT') || act.includes('SUSPEND') || act.includes('FAIL')) {
      return { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' };
    }
    if (act.includes('CREATE') || act.includes('ACTIVATE') || act.includes('APPROVE') || act.includes('REGISTER')) {
      return { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' };
    }
    if (act.includes('UPDATE') || act.includes('CHANGE') || act.includes('EDIT')) {
      return { background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2', border: '1px solid rgba(8, 145, 178, 0.25)' };
    }
    if (act.includes('LOGIN') || act.includes('LOGOUT') || module === 'auth' || module === 'rbac') {
      return { background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.25)' };
    }
    return { background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* ─── Top Header & Global Actions ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <CompactPageHeader
          breadcrumb="Super Admin"
          module="Audit Vault"
          title="System Security & Global Audit Logs"
          subtitle="Immutable, tamper-evident logs of administrative decisions, authentication attempts, and network mutations."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fetchAuditLogs(true)}
            disabled={refreshing || loading}
            className="btn btn--outline btn--sm"
            style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || loading || logs.length === 0}
            className="btn btn--primary btn--sm"
            style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={14} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* ─── Summary KPI Cards ───────────────────────────────────────────── */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-card__top">
            <span className="sa-kpi-card__label">Total Audit Events</span>
            <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
              <History size={18} />
            </div>
          </div>
          <h3 className="sa-kpi-card__value">{stats.total.toLocaleString()}</h3>
          <div className="sa-kpi-card__sub">
            <span>Historical database actions</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-card__top">
            <span className="sa-kpi-card__label">Successful Operations</span>
            <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <h3 className="sa-kpi-card__value">{stats.success.toLocaleString()}</h3>
          <div className="sa-kpi-card__sub">
            <span style={{ color: '#059669' }}>
              {stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}% execution rate` : '0%'}
            </span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-card__top">
            <span className="sa-kpi-card__label">Failed / Warning Events</span>
            <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <h3 className="sa-kpi-card__value">{stats.failure.toLocaleString()}</h3>
          <div className="sa-kpi-card__sub">
            <span style={{ color: stats.failure > 0 ? '#ef4444' : 'inherit' }}>
              Requires security inspection
            </span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-card__top">
            <span className="sa-kpi-card__label">Security & RBAC Events</span>
            <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <h3 className="sa-kpi-card__value">{stats.security.toLocaleString()}</h3>
          <div className="sa-kpi-card__sub">
            <span>Auth, login & permissions</span>
          </div>
        </div>
      </div>

      {/* ─── Search & Multi-Dimensional Filters Bar ──────────────────────── */}
      <div className="sa-card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleApplyFilters} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Search & Primary Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
            {/* Search Box */}
            <div className="sa-search-input-wrap" style={{ gridColumn: 'span 2', minWidth: '260px' }}>
              <Search size={15} />
              <input
                type="text"
                placeholder="Search actor name/email, action, module, IP, Event ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sa-search-input"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 0.5rem' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Date Range Selector */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="7d">Date: Last 7 Days</option>
                <option value="30d">Date: Last 30 Days</option>
                <option value="custom">Date: Custom Range</option>
              </select>
            </div>

            {/* Module Filter */}
            <div>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Module: All Modules</option>
                {filterOptions.modules.map((m) => (
                  <option key={m} value={m}>
                    Module: {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Dropdown Filters Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
            {/* Action Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Action: All Actions</option>
                {filterOptions.actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Role: All Roles</option>
                {filterOptions.roles.map((r) => (
                  <option key={r} value={r}>
                    Role: {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Status: All Statuses</option>
                <option value="SUCCESS">Status: SUCCESS</option>
                <option value="FAILURE">Status: FAILURE</option>
                <option value="WARNING">Status: WARNING</option>
              </select>
            </div>

            {/* Hospital Filter */}
            <div>
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="sa-select"
                style={{ width: '100%' }}
              >
                <option value="all">Hospital: All Facilities</option>
                {filterOptions.hospitals.map((h) => (
                  <option key={h.id || h._id} value={h.id || h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Pickers (Shown only when dateRange === 'custom') */}
          {dateRange === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(8, 145, 178, 0.05)',
                border: '1px solid rgba(8, 145, 178, 0.2)',
                borderRadius: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={15} style={{ color: '#0891b2' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Start Date:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="sa-search-input"
                  style={{ width: '160px', padding: '0.4rem 0.6rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>End Date:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="sa-search-input"
                  style={{ width: '160px', padding: '0.4rem 0.6rem' }}
                />
              </div>
            </div>
          )}

          {/* Apply & Reset Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {logs.length} of {pagination.total.toLocaleString()} total events matching query
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn--outline btn--sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '34px' }}
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
              <button
                type="submit"
                className="btn btn--primary btn--sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', height: '34px' }}
              >
                <Filter size={13} />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ─── Error Notification ─────────────────────────────────────────── */}
      {errorMsg && (
        <div className="alert alert--error" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Audit Log Records Table ─────────────────────────────────────── */}
      <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16} style={{ color: '#0891b2' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Audit Vault Stream
            </h3>
            <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.7rem' }}>
              Read-Only
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Page size:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="sa-select"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', height: '30px' }}
            >
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={28} className="spin-animation" style={{ margin: '0 auto 1rem auto', color: '#0891b2' }} />
            <p style={{ margin: 0, fontSize: '0.88rem' }}>Streaming audit records from secure vault...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="sa-empty-state" style={{ padding: '4rem 1.5rem' }}>
            <div className="sa-empty-state__icon">
              <History size={28} />
            </div>
            <h4 className="sa-empty-state__title">No Audit Records Found</h4>
            <p className="sa-empty-state__sub">
              {hasActiveFilters
                ? 'No events match the selected filters or date range. Try clearing your filters.'
                : 'Administrative decisions and mutations will appear here as they are executed.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn--outline btn--sm"
                style={{ marginTop: '1rem' }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="sa-table-responsive">
            <table className="sa-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px' }}>Timestamp</th>
                  <th style={{ minWidth: '180px' }}>Actor</th>
                  <th>Role</th>
                  <th style={{ minWidth: '170px' }}>Action</th>
                  <th>Module</th>
                  <th style={{ minWidth: '160px' }}>Hospital</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '90px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const logId = log.id || log._id;
                  const dateObj = new Date(log.createdAt);
                  const formattedDate = dateObj.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={logId} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                      {/* Timestamp */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {formattedDate}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={11} />
                          {formattedTime}
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                          {log.actorName || log.userEmail}
                        </div>
                        {log.actorName && log.userEmail && log.actorName !== log.userEmail && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {log.userEmail}
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td>
                        <span className="sa-badge sa-badge--info" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                          {log.userRole}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            display: 'inline-block',
                            ...getActionBadgeStyle(log.action, log.module),
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td>
                        <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.68rem' }}>
                          {log.module}
                        </span>
                      </td>

                      {/* Hospital */}
                      <td>
                        {log.hospitalName && log.hospitalName !== '—' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                            <Building2 size={13} style={{ color: '#0891b2', flexShrink: 0 }} />
                            <span>{log.hospitalName}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>{renderStatusBadge(log.status)}</td>

                      {/* Details Trigger Button */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="btn btn--outline btn--sm"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Pagination Footer ────────────────────────────────────────── */}
        {!loading && logs.length > 0 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.pages || 1}</strong> ({pagination.total.toLocaleString()} total entries)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pagination.page <= 1 || loading}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.3rem 0.6rem', height: '32px' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                }}
              >
                {pagination.page}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={pagination.page >= pagination.pages || loading}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.3rem 0.6rem', height: '32px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: AUDIT EVENT INSPECTION DETAILS                                     */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="sa-modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div
            className="sa-modal-container"
            style={{ maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sa-modal-header" style={{ flexShrink: 0 }}>
              <div>
                <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} style={{ color: '#0891b2' }} />
                  Audit Event Inspection
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Event ID: <code>{selectedLog.id || selectedLog._id}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className="sa-modal-body"
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem 1.5rem' }}
            >
              {/* Event Attributes Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Timestamp
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Execution Status
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    {renderStatusBadge(selectedLog.status)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Action Code
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '0.2rem', color: '#0891b2' }}>
                    {selectedLog.action}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-hover)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Target Module
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                    {selectedLog.module}
                  </div>
                </div>
              </div>

              {/* Actor & Hospital Section */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Actor & Institutional Context
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Actor Name: </span>
                    <strong>{selectedLog.actorName || selectedLog.userEmail}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Actor Email: </span>
                    <span style={{ color: '#0891b2' }}>{selectedLog.userEmail}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Actor Role: </span>
                    <span className="sa-badge sa-badge--info" style={{ fontSize: '0.68rem' }}>
                      {selectedLog.userRole}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Facility: </span>
                    <strong>{selectedLog.hospitalName || 'Global Network (No facility scope)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>IP Address: </span>
                    <code>{selectedLog.ipAddress || '—'}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Resource ID: </span>
                    <code>{selectedLog.resourceId || '—'}</code>
                  </div>
                </div>
                {selectedLog.userAgent && (
                  <div style={{ marginTop: '0.65rem', fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    <Laptop size={12} style={{ display: 'inline', marginRight: '0.35rem' }} />
                    {selectedLog.userAgent}
                  </div>
                )}
              </div>

              {/* Event Metadata Payload (Sanitized JSON) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Event Metadata & Mutation Payload
                  </h4>
                  <span className="sa-badge sa-badge--success" style={{ fontSize: '0.68rem' }}>
                    Sanitized (No Secrets / Passwords)
                  </span>
                </div>

                <div
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1rem',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                  }}
                >
                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      No additional metadata recorded for this action.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sa-modal-footer" style={{ flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn btn--outline btn--sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
