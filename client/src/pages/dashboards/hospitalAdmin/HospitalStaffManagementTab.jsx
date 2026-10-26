/**
 * Hospital Admin Portal — Users & Staff
 * 
 * Clean, production-ready hospital staff management page.
 * Responsibilities:
 * 1. View staff belonging to the Hospital Admin's own hospital.
 * 2. Search staff (name, email, phone).
 * 3. Filter staff by role (canonical role codes).
 * 4. Filter staff by account status (Active, Suspended, Pending).
 * 5. Provision permitted operational staff via existing StaffProvisioningModal.
 * 6. Activate/suspend staff accounts with confirmation dialog.
 * 7. View and edit permitted staff information (Name, Phone, Department, Specialization, etc.).
 * 8. Real backend database integration, multi-hospital isolation, and audit logging.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Lock,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';
import StaffProvisioningModal from '../StaffProvisioningModal';

const ALLOWED_STAFF_ROLES = [
  { value: 'all', label: 'All Roles' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECH', label: 'Lab Technician' },
  { value: 'RADIOLOGY_STAFF', label: 'Radiology Staff' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'BILLING_STAFF', label: 'Billing Staff' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

export default function HospitalStaffManagementTab({ onStaffChange }) {
  // ─── 1. State ───
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── 2. Search & Filter State ───
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ─── 3. Pagination State ───
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ─── 4. Modals ───
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    specialization: '',
    qualification: '',
    licenseNumber: '',
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Status Confirmation Modal
  const [statusConfirmStaff, setStatusConfirmStaff] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Department list for edit select
  const [departments, setDepartments] = useState([]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load Departments once for edit form
  useEffect(() => {
    let isMounted = true;
    hospitalAdminService
      .getDepartments()
      .then((res) => {
        if (isMounted && res.data?.data) {
          setDepartments(res.data.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Feedback helper
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // ─── Fetch Staff ───
  const fetchStaff = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorMsg('');

    try {
      const params = {
        page,
        limit,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await hospitalAdminService.getUsersAndStaff(params);
      const data = res?.data?.data || res?.data || {};
      const list = Array.isArray(data) ? data : (data.users || []);
      const pag = data.pagination || { total: list.length, pages: Math.ceil(list.length / limit) || 1 };

      setUsersList(list);
      setPagination(pag);
    } catch (err) {
      console.error('Failed to load staff directory:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Unable to load staff members. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ─── Open Edit Modal ───
  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      phone: staff.phone || '',
      department: staff.department || '',
      specialization: staff.specialization || '',
      qualification: staff.qualification || '',
      licenseNumber: staff.licenseNumber || '',
    });
    setEditFormErrors({});
    setEditModalOpen(true);
  };

  // ─── Save Edit Form ───
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const errors = {};
    if (!editForm.firstName.trim()) errors.firstName = 'First name is required.';
    if (!editForm.lastName.trim()) errors.lastName = 'Last name is required.';

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setSavingEdit(true);
    setEditFormErrors({});

    try {
      const targetId = selectedStaff._id || selectedStaff.id;
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        department: editForm.department.trim(),
        specialization: editForm.specialization.trim(),
        qualification: editForm.qualification.trim(),
        licenseNumber: editForm.licenseNumber.trim(),
      };

      await hospitalAdminService.updateStaffUser(targetId, payload);
      showSuccess(`Staff details for ${payload.firstName} ${payload.lastName} updated successfully.`);
      setEditModalOpen(false);
      await fetchStaff(true);
      if (onStaffChange) onStaffChange();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update staff details.';
      setEditFormErrors({ submit: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Toggle Staff Status ───
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmStaff) return;
    const targetId = statusConfirmStaff._id || statusConfirmStaff.id;
    const willActivate = !statusConfirmStaff.isActive;
    const newStatus = willActivate ? 'active' : 'suspended';

    setIsUpdatingStatus(true);
    try {
      await hospitalAdminService.updateUserStatus(targetId, {
        isActive: willActivate,
        status: newStatus,
      });

      showSuccess(
        `Staff account '${statusConfirmStaff.firstName} ${statusConfirmStaff.lastName}' has been ${
          willActivate ? 'activated' : 'suspended'
        }.`
      );
      setStatusConfirmStaff(null);
      await fetchStaff(true);
      if (onStaffChange) onStaffChange();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to update staff account status.'
      );
      setStatusConfirmStaff(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ─── Resend Temporary Password Credentials ───
  const [resendingCredentialsId, setResendingCredentialsId] = useState(null);

  const handleResendCredentials = async (staffMember) => {
    const targetId = staffMember._id || staffMember.id;
    setResendingCredentialsId(targetId);
    try {
      await hospitalAdminService.resendStaffCredentials(targetId);
      showSuccess(`Temporary credentials have been reset for ${staffMember.email}. They will be required to change their password upon next login.`);
      await fetchStaff(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to resend credentials.';
      setErrorMsg(msg);
    } finally {
      setResendingCredentialsId(null);
    }
  };

  // Helper for friendly role name
  const getRoleDisplayName = (user) => {
    const rawRole = (user.roleName || user.role?.name || '').toUpperCase();
    const match = ALLOWED_STAFF_ROLES.find((r) => r.value === rawRole);
    if (match) return match.label;
    if (rawRole === 'SUPER_ADMIN') return 'Super Admin';
    if (rawRole === 'HOSPITAL_ADMIN') return 'Hospital Admin';
    if (rawRole === 'PATIENT') return 'Patient';
    return user.role?.displayName || rawRole.replace(/_/g, ' ') || 'Staff Member';
  };

  // Helper for role badge CSS
  const getRoleBadgeClass = (user) => {
    const raw = (user.roleName || user.role?.name || '').toUpperCase();
    switch (raw) {
      case 'DOCTOR':
        return 'ha-badge--primary';
      case 'NURSE':
        return 'ha-badge--success';
      case 'PHARMACIST':
        return 'ha-badge--purple';
      case 'LAB_TECH':
        return 'ha-badge--warning';
      case 'RADIOLOGY_STAFF':
        return 'ha-badge--info';
      case 'RECEPTIONIST':
      case 'BILLING_STAFF':
        return 'ha-badge--secondary';
      default:
        return 'ha-badge--info';
    }
  };

  const isProtectedAccount = (user) => {
    const raw = (user.roleName || user.role?.name || '').toUpperCase();
    return raw === 'SUPER_ADMIN' || raw === 'HOSPITAL_ADMIN';
  };

  const hasActiveFilters = debouncedSearch || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="ha-users-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Page Header (Clean, compact, no duplicate hero) ── */}
      <div className="ha-page-header">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
          Users & Staff
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Manage staff accounts and access for this hospital.
        </p>
      </div>

      {/* ── Feedback Notifications ── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="ha-alert ha-alert--error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Staff Panel ── */}
      <div className="ha-panel">
        {/* Panel Header & Clean Toolbar */}
        <div
          className="ha-panel__header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Staff Members
            </h2>
            {pagination.total > 0 && (
              <span
                style={{
                  background: 'var(--bg-input, rgba(148, 163, 184, 0.15))',
                  color: 'var(--text-secondary)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {pagination.total}
              </span>
            )}
          </div>

          {/* Simple Toolbar */}
          <div className="ha-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="ha-search-box" style={{ minWidth: '220px', flex: '1 1 220px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search staff by name or email"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 4px' }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              className="ha-filter-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by role"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8125rem',
                minWidth: '130px',
              }}
            >
              {ALLOWED_STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="ha-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.375rem',
                padding: '0.45rem 0.65rem',
                fontSize: '0.8125rem',
                minWidth: '115px',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Refresh Icon */}
            <button
              type="button"
              className="ha-btn ha-btn--secondary ha-btn--sm"
              onClick={() => fetchStaff()}
              disabled={loading}
              title="Refresh staff directory"
              style={{ padding: '0.45rem 0.65rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            </button>

            {/* + Add Staff CTA */}
            <button
              type="button"
              className="ha-btn ha-btn--primary ha-btn--sm"
              onClick={() => setProvisionModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, whiteSpace: 'nowrap' }}
              id="btn-add-staff"
            >
              <Plus size={14} />
              <span>Add Staff</span>
            </button>
          </div>
        </div>

        {/* Panel Body: Table or Empty/Error State */}
        <div className="ha-panel__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin-animation" style={{ color: '#0891b2', margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading staff members...</p>
            </div>
          ) : errorMsg ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
              <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                Unable to load staff members.
              </p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>{errorMsg}</p>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => fetchStaff()}>
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : usersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
              {hasActiveFilters ? (
                <>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No staff members match your current filters.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>
                    Try adjusting your search query, role filter, or status filter.
                  </p>
                  <button
                    className="ha-btn ha-btn--secondary ha-btn--sm"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                      setPage(1);
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No staff members found.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>
                    Provision your first operational staff account to start building your clinical team.
                  </p>
                  <button className="ha-btn ha-btn--primary ha-btn--sm" onClick={() => setProvisionModalOpen(true)}>
                    <Plus size={14} /> Add Staff
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Name</th>
                    <th style={{ width: '20%' }}>Email</th>
                    <th style={{ width: '14%' }}>Role</th>
                    <th style={{ width: '14%' }}>Department</th>
                    <th style={{ width: '12%' }}>Phone</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ minWidth: '140px', width: '12%', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const uId = u._id || u.id;
                    const isProtected = isProtectedAccount(u);
                    const isDoctor = (u.roleName || u.role?.name || '').toUpperCase() === 'DOCTOR';
                    const prefix = isDoctor && !u.firstName?.toLowerCase().startsWith('dr') ? 'Dr. ' : '';
                    const fullName = `${prefix}${u.firstName || ''} ${u.lastName || ''}`.trim();

                    return (
                      <tr key={uId}>
                        {/* Name */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {fullName || '—'}
                          </div>
                          {u.specialization && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {u.specialization}
                            </div>
                          )}
                        </td>

                        {/* Email */}
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {u.email}
                        </td>

                        {/* Role */}
                        <td>
                          <span className={`ha-badge ${getRoleBadgeClass(u)}`}>
                            {getRoleDisplayName(u)}
                          </span>
                        </td>

                        {/* Department */}
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {u.department || '—'}
                        </td>

                        {/* Phone */}
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {u.phone || '—'}
                        </td>

                        {/* Status */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span
                              className={`ha-badge ${
                                u.isActive && u.status === 'active'
                                  ? 'ha-badge--active'
                                  : u.status === 'pending' || u.status === 'pending_verification'
                                  ? 'ha-badge--warning'
                                  : 'ha-badge--inactive'
                              }`}
                            >
                              {u.isActive && u.status === 'active'
                                ? 'Active'
                                : u.status === 'pending' || u.status === 'pending_verification'
                                ? 'Pending'
                                : 'Suspended'}
                            </span>
                            {u.mustChangePassword && (
                              <span
                                style={{
                                  fontSize: '0.675rem',
                                  color: '#d97706',
                                  background: 'rgba(217, 119, 6, 0.1)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title="Staff member must change their temporary password upon login"
                              >
                                <KeyRound size={10} /> Temp Password
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {isProtected ? (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(100, 116, 139, 0.1)',
                                borderRadius: '0.25rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Lock size={11} /> Protected
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '0.375rem', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' }}>
                              {/* Reissue Temporary Password Credentials */}
                              {u.mustChangePassword && (
                                <button
                                  type="button"
                                  className="ha-btn ha-btn--secondary ha-btn--sm"
                                  onClick={() => handleResendCredentials(u)}
                                  disabled={resendingCredentialsId === (u._id || u.id)}
                                  title="Generate new temporary password and email credentials"
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    fontSize: '0.75rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap',
                                    color: '#0891b2',
                                    borderColor: 'rgba(8, 145, 178, 0.4)',
                                  }}
                                >
                                  {resendingCredentialsId === (u._id || u.id) ? (
                                    <Loader2 size={12} className="hms-spin" />
                                  ) : (
                                    <KeyRound size={12} />
                                  )}
                                  <span>Resend</span>
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                type="button"
                                className="ha-btn ha-btn--secondary ha-btn--sm"
                                onClick={() => handleOpenEdit(u)}
                                title="View & Edit Staff Profile"
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>

                              {/* Activate / Suspend */}
                              <button
                                type="button"
                                className={`ha-btn ha-btn--sm ${u.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                                onClick={() => setStatusConfirmStaff(u)}
                                title={u.isActive ? 'Suspend Staff Account' : 'Activate Staff Account'}
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                              >
                                {u.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div>
                Page {pagination.page} of {pagination.pages} ({pagination.total} staff total)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem' }}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages || loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.5rem' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── View / Edit Staff Modal ── */}
      {editModalOpen && selectedStaff && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '520px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">Staff Profile & Details</h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setEditModalOpen(false)}
                disabled={savingEdit}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="ha-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {editFormErrors.submit && (
                  <div className="ha-alert ha-alert--error" style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}>
                    <AlertCircle size={14} />
                    <span>{editFormErrors.submit}</span>
                  </div>
                )}

                {/* Read-only Identity Banner */}
                <div
                  style={{
                    background: 'var(--bg-input, rgba(148, 163, 184, 0.1))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedStaff.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                      Login identifier (Read-only)
                    </div>
                  </div>
                  <span className={`ha-badge ${getRoleBadgeClass(selectedStaff)}`}>
                    {getRoleDisplayName(selectedStaff)}
                  </span>
                </div>

                {/* Name Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    {editFormErrors.firstName && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {editFormErrors.firstName}
                      </span>
                    )}
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    {editFormErrors.lastName && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {editFormErrors.lastName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phone & Department */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Department
                    </label>
                    {departments.length > 0 ? (
                      <select
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.375rem',
                          padding: '0.5rem',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d._id || d.id || d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Cardiology"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                </div>

                {/* Specialization & Qualification */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Specialization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiothoracic Surgeon"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Qualification
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD"
                      value={editForm.qualification}
                      onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* License Number */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    License / Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MED-REG-10492"
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Meta details (Read-only) */}
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    Created: {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : '—'}
                  </span>
                  <span>
                    Account Status: <strong style={{ color: 'var(--text-primary)' }}>{selectedStaff.status || 'Active'}</strong>
                  </span>
                </div>
              </div>

              <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={savingEdit}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {savingEdit ? (
                    <>
                      <Loader2 size={13} className="spin-animation" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Confirmation Dialog (Activate / Suspend) ── */}
      {statusConfirmStaff && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color={statusConfirmStaff.isActive ? '#ef4444' : '#10b981'} />
                <span>
                  {statusConfirmStaff.isActive ? 'Suspend Staff Account?' : 'Activate Staff Account?'}
                </span>
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setStatusConfirmStaff(null)}
                disabled={isUpdatingStatus}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to {statusConfirmStaff.isActive ? 'suspend' : 'activate'}{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {statusConfirmStaff.firstName} {statusConfirmStaff.lastName}
                </strong>{' '}
                ({statusConfirmStaff.email})?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  color: statusConfirmStaff.isActive ? '#ef4444' : '#10b981',
                }}
              >
                {statusConfirmStaff.isActive
                  ? 'This will prevent the staff member from accessing the system.'
                  : 'This will restore the staff member’s access to the system.'}
              </p>
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setStatusConfirmStaff(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`ha-btn ${statusConfirmStaff.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                onClick={handleConfirmToggleStatus}
                disabled={isUpdatingStatus}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 size={13} className="spin-animation" />
                    <span>{statusConfirmStaff.isActive ? 'Suspending...' : 'Activating...'}</span>
                  </>
                ) : (
                  <span>{statusConfirmStaff.isActive ? 'Suspend Account' : 'Activate Account'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reusable Staff Provisioning Modal ── */}
      <StaffProvisioningModal
        isOpen={provisionModalOpen}
        onClose={() => setProvisionModalOpen(false)}
        onSuccess={async () => {
          setProvisionModalOpen(false);
          showSuccess('Staff account provisioned successfully.');
          await fetchStaff(true);
          if (onStaffChange) onStaffChange();
        }}
        mode="staff_only"
        allowHospitalAdminRole={false}
      />
    </div>
  );
}
