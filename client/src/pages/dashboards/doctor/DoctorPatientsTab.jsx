/**
 * Doctor Clinical Workspace — My Patients Tab
 * 
 * Clean, professional, doctor-specific patient directory.
 * Backed strictly by real backend data from /api/v1/doctor/patients:
 * - Scoped only to authenticated doctor's assigned patients (via appointments & consultations)
 * - Real summary cards (Total Assigned, Active, Inactive, Recent Visits in last 7 days)
 * - Patient search (name, ID, phone)
 * - Status filtering & sorting (last visit, name, patient ID)
 * - Real last visit & follow-up timestamps
 * - Server-side pagination
 * - Direct navigation to patient records & clinical consultation history
 */

import { useState, useEffect, useCallback } from 'react';
import { doctorService } from '../../../services/doctor.service';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Search,
  RefreshCw,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Stethoscope,
  Pill,
  AlertCircle,
} from 'lucide-react';

export default function DoctorPatientsTab({ onOpenPatientRecord, onNavigateTab }) {
  // Data State
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    recentVisits: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortBy, setSortBy] = useState('lastVisit'); // 'lastVisit' | 'name' | 'patientId'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Patient Details Modal (built-in full viewer)
  const [activePatientRecord, setActivePatientRecord] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Assigned Patients from backend API
  const loadPatients = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await doctorService.getPatients({
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 10,
      });

      const data = res.data?.data || res.data || {};
      setPatients(data.patients || []);
      setSummary(
        data.summary || {
          total: 0,
          active: 0,
          inactive: 0,
          recentVisits: 0,
        }
      );
      setPagination(
        data.pagination || {
          total: (data.patients || []).length,
          page: currentPage,
          limit: 10,
          pages: 1,
        }
      );
    } catch (err) {
      console.error('Failed to load assigned doctor patients:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load your assigned patients directory. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Handle Quick Filter Changes
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    if (val === 'lastVisit_desc') {
      setSortBy('lastVisit');
      setSortOrder('desc');
    } else if (val === 'lastVisit_asc') {
      setSortBy('lastVisit');
      setSortOrder('asc');
    } else if (val === 'name_asc') {
      setSortBy('name');
      setSortOrder('asc');
    } else if (val === 'name_desc') {
      setSortBy('name');
      setSortOrder('desc');
    } else if (val === 'patientId_asc') {
      setSortBy('patientId');
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setSortBy('lastVisit');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'all' || sortBy !== 'lastVisit');

  // Open Patient Record (uses parent modal if provided, or internal modal)
  const handleViewPatient = async (patient) => {
    const pId = patient.patientMongoId || patient.id;
    if (onOpenPatientRecord) {
      onOpenPatientRecord(pId);
      return;
    }

    try {
      const res = await doctorService.getPatientDetails(pId);
      setActivePatientRecord(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to fetch patient details:', err);
    }
  };

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format Date Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="doc-patients-layout">
      {/* ── 1. COMPACT PAGE HEADER ── */}
      <header className="doc-patients-header-row" aria-label="My Patients Header">
        <div className="doc-patients-header-left">
          <h1>
            <Users size={20} style={{ color: '#0891b2' }} />
            <span>My Patients</span>
          </h1>
          <p>View and manage your assigned patients.</p>
        </div>

        <div className="doc-patients-header-right">
          {/* Patient Search Field */}
          <div className="doc-queue-search-box" style={{ position: 'relative', width: '260px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '1.85rem',
                paddingRight: searchQuery ? '1.75rem' : '0.65rem',
                height: '30px',
                fontSize: '0.78rem',
                width: '100%',
                borderRadius: '4px',
              }}
              placeholder="Search by name, ID, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              title="Search assigned patients"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: 0,
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadPatients(true)}
            className="btn btn--outline btn--sm"
            style={{
              height: '30px',
              padding: '0 0.65rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            disabled={loading || refreshing}
            title="Refresh patient list"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ── 2. PATIENT SUMMARY CARDS ── */}
      <section className="doc-patients-kpi-row" aria-label="Patient Summary Cards">
        {/* Card 1: Total Assigned Patients */}
        <div
          className={`doc-patients-kpi-card ${statusFilter === 'all' && !searchQuery ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('all')}
          role="button"
          tabIndex={0}
          title="All assigned patients"
        >
          <div className="doc-patients-kpi-card__header">
            <span className="doc-patients-kpi-card__title">Total Assigned</span>
            <div
              className="doc-patients-kpi-card__icon-wrap"
              style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}
            >
              <Users size={13} />
            </div>
          </div>
          <div className="doc-patients-kpi-card__value">{summary.total}</div>
          <p className="doc-patients-kpi-card__subtext">Unique clinical patients</p>
        </div>

        {/* Card 2: Active Patients */}
        <div
          className={`doc-patients-kpi-card ${statusFilter === 'active' ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('active')}
          role="button"
          tabIndex={0}
          title="Filter by Active patients"
        >
          <div className="doc-patients-kpi-card__header">
            <span className="doc-patients-kpi-card__title">Active Patients</span>
            <div
              className="doc-patients-kpi-card__icon-wrap"
              style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}
            >
              <UserCheck size={13} />
            </div>
          </div>
          <div className="doc-patients-kpi-card__value" style={{ color: '#059669' }}>
            {summary.active}
          </div>
          <p className="doc-patients-kpi-card__subtext">Active clinical status</p>
        </div>

        {/* Card 3: Inactive Patients */}
        <div
          className={`doc-patients-kpi-card ${statusFilter === 'inactive' ? 'is-active' : ''}`}
          onClick={() => handleStatusFilterChange('inactive')}
          role="button"
          tabIndex={0}
          title="Filter by Inactive patients"
        >
          <div className="doc-patients-kpi-card__header">
            <span className="doc-patients-kpi-card__title">Inactive Patients</span>
            <div
              className="doc-patients-kpi-card__icon-wrap"
              style={{ background: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-secondary)' }}
            >
              <UserX size={13} />
            </div>
          </div>
          <div className="doc-patients-kpi-card__value" style={{ color: 'var(--text-secondary)' }}>
            {summary.inactive}
          </div>
          <p className="doc-patients-kpi-card__subtext">Archived or suspended</p>
        </div>

        {/* Card 4: Recent Visits (Last 7 Days) */}
        <div
          className="doc-patients-kpi-card"
          title="Consultations recorded in the last 7 days"
        >
          <div className="doc-patients-kpi-card__header">
            <span className="doc-patients-kpi-card__title">Recent Visits</span>
            <div
              className="doc-patients-kpi-card__icon-wrap"
              style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb' }}
            >
              <Calendar size={13} />
            </div>
          </div>
          <div className="doc-patients-kpi-card__value" style={{ color: '#2563eb' }}>
            {summary.recentVisits}
          </div>
          <p className="doc-patients-kpi-card__subtext">Completed last 7 days</p>
        </div>
      </section>

      {/* ── 3. PATIENT FILTERS & SORTING TOOLBAR ── */}
      <section className="doc-patients-filter-row" aria-label="Patient Filters and Sorting">
        <div className="doc-patients-filter-group">
          {/* Status Filter Pills */}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Status:
          </span>
          {[
            { id: 'all', label: 'All Patients' },
            { id: 'active', label: 'Active' },
            { id: 'inactive', label: 'Inactive' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleStatusFilterChange(st.id)}
              className={`doc-queue-pill-btn ${statusFilter === st.id ? 'is-active' : ''}`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="doc-patients-filter-group">
          {/* Sort By Dropdown */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Sort:
            </span>
            <select
              className="form-input"
              style={{
                height: '28px',
                fontSize: '0.73rem',
                padding: '0 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              value={`${sortBy}_${sortOrder}`}
              onChange={handleSortChange}
            >
              <option value="lastVisit_desc">Last Visit (Newest)</option>
              <option value="lastVisit_asc">Last Visit (Oldest)</option>
              <option value="name_asc">Name (A – Z)</option>
              <option value="name_desc">Name (Z – A)</option>
              <option value="patientId_asc">Patient ID</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn--outline btn--sm"
              style={{
                height: '28px',
                fontSize: '0.72rem',
                padding: '0 0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: 'var(--text-secondary)',
              }}
              title="Reset all filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 4. MAIN PATIENTS TABLE / EMPTY STATE ── */}
      <section className="doc-patients-table-panel" aria-label="Main Patients Table">
        <div className="doc-patients-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Assigned Patients Directory
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {pagination.total} {pagination.total === 1 ? 'Patient' : 'Patients'}
            </span>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Authorized clinical scope
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <div className="spinner spinner--sm" style={{ margin: '0 auto 0.5rem auto' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              Loading assigned patient directory...
            </p>
          </div>
        ) : error ? (
          /* Error State */
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <AlertCircle size={24} style={{ color: '#dc2626', margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
              Failed to load assigned patients
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.25rem 0 1rem 0' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => loadPatients()}
              className="btn btn--primary btn--sm"
              style={{ height: '30px', fontSize: '0.75rem' }}
            >
              Retry
            </button>
          </div>
        ) : patients.length > 0 ? (
          /* Table of Patients */
          <div className="doc-table-container">
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ padding: '0.55rem 0.85rem', fontSize: '0.72rem' }}>Patient Details</th>
                  <th style={{ width: '130px', padding: '0.55rem 0.75rem', fontSize: '0.72rem' }}>Age & Gender</th>
                  <th style={{ width: '130px', padding: '0.55rem 0.75rem', fontSize: '0.72rem' }}>Department</th>
                  <th style={{ width: '150px', padding: '0.55rem 0.75rem', fontSize: '0.72rem' }}>Last Visit</th>
                  <th style={{ width: '100px', padding: '0.55rem 0.75rem', fontSize: '0.72rem' }}>Patient Status</th>
                  <th style={{ width: '140px', padding: '0.55rem 0.75rem', fontSize: '0.72rem' }}>Next Follow-up</th>
                  <th style={{ textAlign: 'right', width: '120px', padding: '0.55rem 0.85rem', fontSize: '0.72rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const lastVisitFormatted = formatDate(p.lastVisitDate);
                  const followUpFormatted = formatDate(p.nextFollowUpDate);

                  return (
                    <tr key={p.id}>
                      {/* Patient Details */}
                      <td style={{ padding: '0.55rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="doc-patient-avatar">
                            {getInitials(p.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.835rem' }}>
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                marginTop: '0.1rem',
                              }}
                            >
                              <span style={{ color: '#0891b2', fontWeight: 600 }}>{p.patientId}</span>
                              {p.bloodGroup && p.bloodGroup !== 'Unknown' && p.bloodGroup !== '—' && (
                                <>
                                  <span>•</span>
                                  <span>{p.bloodGroup}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Age & Gender */}
                      <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div>{p.age}</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                          {p.gender}
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            display: 'inline-block',
                          }}
                        >
                          {p.department || 'General Medicine'}
                        </span>
                      </td>

                      {/* Last Visit */}
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        {lastVisitFormatted ? (
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {lastVisitFormatted}
                            </div>
                            {p.lastVisitDiagnosis && (
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '130px',
                                }}
                                title={p.lastVisitDiagnosis}
                              >
                                {p.lastVisitDiagnosis}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            No visits recorded
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <span
                          className={`badge ${p.status === 'Active' ? 'badge--success' : 'badge--secondary'}`}
                          style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Next Follow-up */}
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        {followUpFormatted ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.76rem',
                              color: '#2563eb',
                              fontWeight: 500,
                            }}
                          >
                            <Calendar size={12} />
                            <span>{followUpFormatted}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Not scheduled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleViewPatient(p)}
                          className="btn btn--outline btn--sm"
                          style={{
                            height: '26px',
                            fontSize: '0.72rem',
                            padding: '0 0.55rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title={`View clinical records for ${p.name}`}
                        >
                          <FileText size={12} />
                          <span>View Record</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="doc-queue-empty-box" style={{ padding: '2.5rem 1rem' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.45rem', opacity: 0.75 }}>
              <Users size={26} />
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
              {hasActiveFilters ? 'No patients match your search' : 'No patients assigned yet'}
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                margin: '0.2rem 0 0.85rem 0',
                maxWidth: '360px',
              }}
            >
              {hasActiveFilters
                ? 'Try adjusting your search terms or clearing your status filters to find matching patients.'
                : 'No patients are currently assigned to or scheduled with your clinic.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn--outline btn--sm"
                style={{ fontSize: '0.74rem', height: '28px', padding: '0 0.6rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* ── 5. PAGINATION TOOLBAR ── */}
        {!loading && !error && pagination.total > 0 && (
          <div className="doc-patients-pagination">
            <div>
              Showing {Math.min((currentPage - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} patients
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn btn--outline btn--sm"
                style={{ height: '26px', padding: '0 0.45rem', fontSize: '0.72rem' }}
                title="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0 0.35rem' }}>
                Page {currentPage} of {pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={currentPage >= pagination.pages}
                className="btn btn--outline btn--sm"
                style={{ height: '26px', padding: '0 0.45rem', fontSize: '0.72rem' }}
                title="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 6. BUILT-IN CLINICAL DETAILS MODAL (FALLBACK IF PARENT HANDLER UNSET) ── */}
      {activePatientRecord && (
        <div className="doc-modal-overlay" onClick={() => setActivePatientRecord(null)}>
          <div className="doc-modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="doc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  Clinical Record — {activePatientRecord.patient?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePatientRecord(null)}
                className="btn btn--outline btn--sm"
                style={{ padding: '0.2rem 0.4rem', border: 'none' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="doc-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Demographics Card */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.65rem',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Patient ID</div>
                  <div style={{ fontWeight: 600, color: '#0891b2' }}>
                    {activePatientRecord.patient?.patientId}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Age / Gender</div>
                  <div style={{ fontWeight: 600 }}>
                    {activePatientRecord.patient?.age} • {activePatientRecord.patient?.gender}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Blood Group</div>
                  <div style={{ fontWeight: 600 }}>
                    {activePatientRecord.patient?.bloodGroup || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Phone</div>
                  <div style={{ fontWeight: 600 }}>
                    {activePatientRecord.patient?.phone || '—'}
                  </div>
                </div>
              </div>

              {/* Consultation History */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Stethoscope size={14} style={{ color: '#2563eb' }} />
                  <span>Recorded Consultations</span>
                </div>
                {activePatientRecord.consultations?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {activePatientRecord.consultations.map((c) => (
                      <div
                        key={c._id}
                        style={{
                          background: 'var(--bg-card)',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.2rem' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{c.diagnosis}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                            {formatDate(c.consultationDate)}
                          </span>
                        </div>
                        {c.clinicalNotes && (
                          <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Notes: {c.clinicalNotes}
                          </div>
                        )}
                        {c.treatment && (
                          <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Treatment: {c.treatment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                    No recorded consultations on file.
                  </p>
                )}
              </div>

              {/* Prescriptions */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Pill size={14} style={{ color: '#059669' }} />
                  <span>Prescription History</span>
                </div>
                {activePatientRecord.prescriptions?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {activePatientRecord.prescriptions.map((pr) => (
                      <div
                        key={pr._id}
                        style={{
                          background: 'var(--bg-card)',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{pr.prescriptionNumber || 'Prescription'}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                            {formatDate(pr.prescriptionDate || pr.createdAt)}
                          </span>
                        </div>
                        {pr.items?.map((it, idx) => (
                          <div key={idx} style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            • {it.medicineName} ({it.dosage}) - {it.frequency}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                    No recorded prescriptions on file.
                  </p>
                )}
              </div>
            </div>

            <div className="doc-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {onNavigateTab ? (
                <button
                  type="button"
                  onClick={() => {
                    setActivePatientRecord(null);
                    onNavigateTab('consultations');
                  }}
                  className="btn btn--outline btn--sm"
                  style={{ height: '28px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Stethoscope size={13} style={{ color: '#2563eb' }} />
                  <span>Consultations Tab</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setActivePatientRecord(null)}
                className="btn btn--primary btn--sm"
                style={{ height: '28px', fontSize: '0.75rem' }}
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
