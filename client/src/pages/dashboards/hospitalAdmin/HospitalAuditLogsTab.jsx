import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Shield,
  RotateCcw,
  Search,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

/**
 * Known supported modules in HMS backend
 */
const SUPPORTED_MODULES = [
  { value: 'all', label: 'All Modules' },
  { value: 'admin', label: 'Admin' },
  { value: 'auth', label: 'Auth & Security' },
  { value: 'billing', label: 'Billing' },
  { value: 'hospital_management', label: 'Hospital Management' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'rbac', label: 'RBAC / Access' },
  { value: 'reception', label: 'Reception' },
  { value: 'roles_and_permissions', label: 'Roles & Permissions' },
  { value: 'user_management', label: 'User Management' },
];

/**
 * Format audit action code to human-readable label
 * e.g. "UPDATE_HOSPITAL_SETTINGS" -> "Update Hospital Settings"
 */
function formatActionLabel(action) {
  if (!action || typeof action !== 'string') return 'Unknown Action';
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format timestamp using standard localization
 */
function formatTimestamp(isoDate) {
  if (!isoDate) return { date: '—', time: '—' };
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return { date: '—', time: '—' };
    const date = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: '—', time: '—' };
  }
}

/**
 * Recursively sanitize any details object on frontend to guarantee zero credential exposure
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'hash',
  'salt',
  'token',
  'accesstoken',
  'refreshtoken',
  'refreshtokens',
  'otp',
  'otpcode',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'credential',
  'credentials',
  'smtppassword',
  'privatekey',
]);

function safeSanitizeDetails(val) {
  if (!val || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(safeSanitizeDetails);
  const clean = {};
  for (const [k, v] of Object.entries(val)) {
    const normalized = k.toLowerCase().replace(/[^a-z]/g, '');
    if (SENSITIVE_KEYS.has(normalized)) continue;
    clean[k] = safeSanitizeDetails(v);
  }
  return clean;
}

/**
 * HospitalAuditLogsTab
 *
 * Professional, read-only security and administrative audit log viewer.
 * Scoped strictly to the authenticated Hospital Admin's hospital.
 */
export default function HospitalAuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 25,
  });

  // Filters & Search
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Selected Log for Read-Only Inspection Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // reset to page 1 on new search term
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch audit logs with server-side queries
  const fetchAuditLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          page: currentPage,
          limit: pageSize,
        };
        if (moduleFilter && moduleFilter !== 'all') {
          params.module = moduleFilter;
        }
        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (debouncedSearch && debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        const res = await hospitalAdminService.getAuditLogs(params);
        // Handle both unwrapped response { success, data: { logs, pagination } } and raw Axios response
        const payload = res?.data?.data || res?.data || res || {};
        const logsList = Array.isArray(payload.logs)
          ? payload.logs
          : Array.isArray(payload)
          ? payload
          : [];

        const paginationData = payload.pagination || {
          total: logsList.length,
          page: currentPage,
          pages: Math.ceil(logsList.length / pageSize) || 1,
          limit: pageSize,
        };

        setLogs(logsList);
        setPagination(paginationData);
      } catch (err) {
        console.error('Error fetching hospital admin audit logs:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to load audit logs.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, moduleFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle filter changes
  const handleModuleChange = (e) => {
    setModuleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10) || 25;
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setModuleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    moduleFilter !== 'all' || statusFilter !== 'all' || debouncedSearch !== '';

  // Pagination calculation
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="ha-audit-logs-tab">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <h1 className="ha-page-title">Audit Logs</h1>
            <span
              className="ha-badge"
              style={{
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                color: '#0891b2',
                border: '1px solid rgba(8, 145, 178, 0.25)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Shield size={12} />
              Read-only
            </span>
          </div>
          <p className="ha-page-description">
            Review administrative and security activity for your hospital.
          </p>
        </div>

        <div className="ha-page-header__right">
          <button
            type="button"
            className="ha-btn ha-btn--secondary ha-btn--sm"
            onClick={() => fetchAuditLogs(true)}
            disabled={loading || refreshing}
            title="Refresh audit logs from server"
            aria-label="Refresh audit logs"
          >
            <RotateCcw
              size={14}
              className={refreshing ? 'ha-spin' : ''}
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Panel & Filter Toolbar ─────────────────────────────────── */}
      <div className="ha-panel" style={{ margin: 0 }}>
        <div className="ha-panel__header" style={{ padding: '0.875rem 1.25rem' }}>
          <div className="ha-panel__title">
            <History size={18} color="#0891B2" />
            Hospital Security Ledger
          </div>

          <div className="ha-toolbar" style={{ gap: '0.625rem' }}>
            {/* Search Box */}
            <div className="ha-search-box" style={{ minWidth: '220px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search actor, action, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search audit records"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Module Filter */}
            <select
              className="ha-select"
              value={moduleFilter}
              onChange={handleModuleChange}
              aria-label="Filter by module"
            >
              {SUPPORTED_MODULES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="ha-select"
              value={statusFilter}
              onChange={handleStatusChange}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="WARNING">Warning</option>
            </select>

            {/* Records per page selector */}
            <select
              className="ha-select"
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="Records per page"
              title="Page size"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={handleResetFilters}
                title="Reset all filters"
              >
                <X size={12} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ─── Main Content Area ───────────────────────────────────── */}
        <div style={{ padding: 0 }}>
          {/* Error State */}
          {error && !loading && (
            <div
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <AlertCircle size={24} color="#ef4444" />
              </div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem 0',
                }}
              >
                Unable to load audit logs.
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '460px',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                {error}
              </p>
              <button
                type="button"
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => fetchAuditLogs()}
              >
                <RotateCcw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !error && (
            <div className="ha-table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ha-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Timestamp</th>
                    <th style={{ width: '22%' }}>Actor</th>
                    <th style={{ width: '12%' }}>Role</th>
                    <th style={{ width: '24%' }}>Action</th>
                    <th style={{ width: '12%' }}>Module</th>
                    <th style={{ width: '12%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <tr key={idx}>
                      <td>
                        <div
                          style={{
                            height: '14px',
                            width: '110px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '4px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            height: '14px',
                            width: '140px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                        <div
                          style={{
                            height: '11px',
                            width: '90px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '4px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            height: '20px',
                            width: '80px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '9999px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            height: '14px',
                            width: '160px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '4px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            height: '20px',
                            width: '60px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '9999px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            height: '20px',
                            width: '70px',
                            backgroundColor: 'var(--bg-hover)',
                            borderRadius: '9999px',
                            animation: 'pulse 1.5s infinite',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && logs.length === 0 && (
            <div
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(8, 145, 178, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <History size={26} color="#0891B2" />
              </div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: '0 0 0.5rem 0',
                }}
              >
                No audit activity found.
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '460px',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                {hasActiveFilters
                  ? 'No security or administrative audit records match your current filter criteria.'
                  : 'No administrative or security events have been logged for this facility yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={12} />
                  Reset Filters
                </button>
              )}
            </div>
          )}

          {/* Audit Logs Table */}
          {!loading && !error && logs.length > 0 && (
            <div className="ha-table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ha-table" aria-label="Hospital Audit Logs">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '17%' }}>Timestamp</th>
                    <th scope="col" style={{ width: '21%' }}>Actor</th>
                    <th scope="col" style={{ width: '13%' }}>Role</th>
                    <th scope="col" style={{ width: '22%' }}>Action</th>
                    <th scope="col" style={{ width: '11%' }}>Module</th>
                    <th scope="col" style={{ width: '10%' }}>Status</th>
                    <th scope="col" style={{ width: '6%', textAlign: 'right' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const { date, time } = formatTimestamp(log.createdAt);
                    const actorDisplay = log.actorName || log.userEmail || 'System';
                    const isSuccess = log.status === 'SUCCESS';
                    const isFailure = log.status === 'FAILURE';
                    const isWarning = log.status === 'WARNING';

                    return (
                      <tr key={log._id || log.id}>
                        {/* Timestamp */}
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {date}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {time}
                          </div>
                        </td>

                        {/* Actor */}
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px',
                            }}
                            title={actorDisplay}
                          >
                            {actorDisplay}
                          </div>
                          {log.userEmail && log.userEmail !== actorDisplay && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '180px',
                              }}
                              title={log.userEmail}
                            >
                              {log.userEmail}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td>
                          <span
                            className="ha-badge"
                            style={{
                              backgroundColor: 'rgba(8, 145, 178, 0.08)',
                              color: '#0e7490',
                              border: '1px solid rgba(8, 145, 178, 0.2)',
                            }}
                          >
                            {log.userRole || 'ANONYMOUS'}
                          </span>
                        </td>

                        {/* Action */}
                        <td>
                          <div
                            style={{
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                              lineHeight: 1.3,
                            }}
                          >
                            {formatActionLabel(log.action)}
                          </div>
                          <code
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--text-muted)',
                              background: 'transparent',
                              padding: 0,
                            }}
                          >
                            {log.action}
                          </code>
                        </td>

                        {/* Module */}
                        <td>
                          <span
                            className="ha-badge"
                            style={{
                              backgroundColor: 'rgba(100, 116, 139, 0.1)',
                              color: 'var(--text-secondary)',
                              textTransform: 'lowercase',
                              fontSize: '0.7rem',
                            }}
                          >
                            {log.module}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {isSuccess && (
                            <span
                              className="ha-badge ha-badge--success"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <CheckCircle2 size={11} />
                              SUCCESS
                            </span>
                          )}
                          {isFailure && (
                            <span
                              className="ha-badge ha-badge--danger"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <XCircle size={11} />
                              FAILURE
                            </span>
                          )}
                          {isWarning && (
                            <span
                              className="ha-badge ha-badge--warning"
                              style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <AlertTriangle size={11} />
                              WARNING
                            </span>
                          )}
                        </td>

                        {/* Details Modal Trigger */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="ha-btn ha-btn--secondary ha-btn--sm"
                            onClick={() => setSelectedLog(log)}
                            title="Inspect event details"
                            aria-label={`Inspect event ${log.action}`}
                            style={{ padding: '0.25rem 0.5rem', height: '28px' }}
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── Pagination Footer ─────────────────────────────────── */}
          {!loading && !error && logs.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Showing{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {startItem}-{endItem}
                </strong>{' '}
                of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> events
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    marginRight: '0.25rem',
                  }}
                >
                  Page {pagination.page} of {pagination.pages}
                </span>

                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage >= pagination.pages || loading}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Safe Read-Only Details Inspection Modal ─────────────── */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-log-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border-color)',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.125rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '0.5rem',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={18} color="#0891B2" />
                </div>
                <div>
                  <h3
                    id="audit-log-modal-title"
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Audit Event Details
                  </h3>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}
                  >
                    ID: {selectedLog._id || selectedLog.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.375rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Event Attributes Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Action
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatActionLabel(selectedLog.action)}
                  </div>
                  <code style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {selectedLog.action}
                  </code>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Status
                  </div>
                  <div>
                    {selectedLog.status === 'SUCCESS' ? (
                      <span className="ha-badge ha-badge--success">SUCCESS</span>
                    ) : selectedLog.status === 'FAILURE' ? (
                      <span className="ha-badge ha-badge--danger">FAILURE</span>
                    ) : (
                      <span className="ha-badge ha-badge--warning">
                        {selectedLog.status || 'UNKNOWN'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Initiator / Actor
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedLog.actorName || selectedLog.userEmail || 'System'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedLog.userEmail}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Actor Role
                  </div>
                  <span className="ha-badge ha-badge--info">
                    {selectedLog.userRole || 'ANONYMOUS'}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Module
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {selectedLog.module}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Recorded Timestamp
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    IP Address
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {selectedLog.ipAddress || '—'}
                  </div>
                </div>

                {selectedLog.resourceId && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Affected Resource ID
                    </div>
                    <code style={{ fontSize: '0.75rem' }}>{selectedLog.resourceId}</code>
                  </div>
                )}
              </div>

              {/* Safe Event Details Payload */}
              <div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  <FileText size={15} color="#0891B2" />
                  Additional Event Details
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: '1rem',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '220px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {JSON.stringify(safeSanitizeDetails(selectedLog.details), null, 2)}
                  </pre>
                ) : (
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    No additional details recorded for this event.
                  </div>
                )}
              </div>

              {/* Read-Only Security Notice */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(8, 145, 178, 0.05)',
                  border: '1px solid rgba(8, 145, 178, 0.15)',
                  borderRadius: '0.375rem',
                  padding: '0.625rem 0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Shield size={14} color="#0891B2" style={{ flexShrink: 0 }} />
                <span>
                  This record is an immutable, append-only security ledger entry. Administrative audit records cannot be modified or removed.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.875rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setSelectedLog(null)}
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
