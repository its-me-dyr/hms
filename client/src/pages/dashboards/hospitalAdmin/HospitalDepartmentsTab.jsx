/**
 * Hospital Admin Portal — Clinical & Administrative Departments Management
 * 
 * Production-ready, backend-integrated, fully isolated, responsive, and theme-aware
 * department governance module.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Power,
  Eye,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users,
  Bed,
  MapPin,
  RefreshCw,
  X,
  Shield,
  UserCheck,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

export default function HospitalDepartmentsTab({ onDepartmentChange }) {
  // ─── 1. Core State ───
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── 2. Search & Filter State ───
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // ─── 3. Staff / Eligible Heads State ───
  const [eligibleHeads, setEligibleHeads] = useState([]);
  const [loadingHeads, setLoadingHeads] = useState(false);

  // ─── 4. Modals State ───
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null for create
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    location: 'Main Medical Wing',
    capacity: 25,
    headOfDepartment: '',
    headName: '',
  });

  // Status Confirmation Modal
  const [statusConfirmDept, setStatusConfirmDept] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Details Modal
  const [detailsDept, setDetailsDept] = useState(null);

  // ─── Feedback Helpers ───
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 6000);
  };

  // ─── Fetch Departments ───
  const fetchDepartments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMsg('');

    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await hospitalAdminService.getDepartments(params);
      const data = res?.data?.data || res?.data || [];
      const list = Array.isArray(data) ? data : (data.departments || []);
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setErrorMsg(err.response?.data?.message || 'Unable to load departments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, statusFilter]);

  // ─── Fetch Eligible Heads (Active Doctors and Staff in this hospital) ───
  const fetchEligibleHeads = useCallback(async () => {
    setLoadingHeads(true);
    try {
      const res = await hospitalAdminService.getUsersAndStaff({ limit: 200, status: 'active' });
      const rawUsers = res?.data?.data?.users || res?.data?.users || res?.data?.data || [];
      if (Array.isArray(rawUsers)) {
        // Filter active doctors and clinical/administrative staff
        const candidates = rawUsers.filter(
          (u) => u.isActive && u.roleName !== 'PATIENT' && u.roleName !== 'SUPER_ADMIN'
        );
        setEligibleHeads(candidates);
      }
    } catch (err) {
      console.warn('Could not load eligible department heads:', err);
    } finally {
      setLoadingHeads(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Load eligible heads when modal is opened
  useEffect(() => {
    if (deptModalOpen && eligibleHeads.length === 0) {
      fetchEligibleHeads();
    }
  }, [deptModalOpen, eligibleHeads.length, fetchEligibleHeads]);

  // ─── Client Filter Fallback (Ensures instantaneous responsive feedback) ───
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        dept.name?.toLowerCase().includes(term) ||
        dept.code?.toLowerCase().includes(term) ||
        dept.description?.toLowerCase().includes(term) ||
        dept.location?.toLowerCase().includes(term) ||
        dept.headName?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && dept.isActive) ||
        (statusFilter === 'inactive' && !dept.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchTerm, statusFilter]);

  // ─── Modal Open Handlers ───
  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      location: 'Main Medical Wing',
      capacity: 25,
      headOfDepartment: '',
      headName: '',
    });
    setFormErrors({});
    setDeptModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      location: dept.location || 'Main Medical Wing',
      capacity: dept.capacity !== undefined ? dept.capacity : 25,
      headOfDepartment: dept.headOfDepartment?._id || dept.headOfDepartment?.id || '',
      headName: dept.headName && dept.headName !== 'Not assigned' ? dept.headName : '',
    });
    setFormErrors({});
    setDeptModalOpen(true);
  };

  // ─── Form Submission ───
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Department Name is required.';
    }
    if (!formData.code.trim()) {
      errors.code = 'Department Code is required.';
    }
    const capNum = Number(formData.capacity);
    if (isNaN(capNum) || capNum < 0) {
      errors.capacity = 'Capacity must be a valid non-negative number.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        capacity: capNum,
        headOfDepartment: formData.headOfDepartment || null,
        headName: formData.headName.trim() || undefined,
      };

      if (editingDept) {
        await hospitalAdminService.updateDepartment(editingDept.id || editingDept._id, payload);
        showSuccess(`Department '${payload.name}' updated successfully.`);
      } else {
        await hospitalAdminService.createDepartment(payload);
        showSuccess(`Department '${payload.name}' created successfully.`);
      }

      setDeptModalOpen(false);
      await fetchDepartments(true);
      if (onDepartmentChange) onDepartmentChange();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save department. Please check your inputs.';
      setFormErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  // ─── Status Toggle ───
  const handleInitiateToggleStatus = (dept) => {
    setStatusConfirmDept(dept);
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmDept) return;
    setIsTogglingStatus(true);

    try {
      const targetId = statusConfirmDept.id || statusConfirmDept._id;
      const newStatus = !statusConfirmDept.isActive;
      await hospitalAdminService.toggleDepartmentStatus(targetId, { isActive: newStatus });
      showSuccess(`Department '${statusConfirmDept.name}' is now ${newStatus ? 'Active' : 'Inactive'}.`);
      setStatusConfirmDept(null);
      await fetchDepartments(true);
      if (onDepartmentChange) onDepartmentChange();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update department status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="ha-departments-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Feedback Notifications ── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="ha-alert ha-alert--error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Department Governance Panel ── */}
      <div className="ha-panel">
        <div className="ha-panel__header" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="ha-panel__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Building2 size={20} color="#0891b2" />
              <span>Clinical & Administrative Departments</span>
              <span className="ha-badge ha-badge--info" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {departments.length}
              </span>
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Configure hospital clinical wings, bed capacities, head specialists, and departmental operational statuses.
            </p>
          </div>

          {/* Search, Filter & Add Actions Toolbar */}
          <div className="ha-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div className="ha-search-box" style={{ minWidth: '220px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search by name, code, wing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search departments"
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

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                className="ha-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter departments by status"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  padding: '0.375rem 0.625rem',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Add Department CTA */}
            <button
              className="ha-btn ha-btn--primary ha-btn--sm"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}
            >
              <Plus size={14} />
              <span>Add Department</span>
            </button>
          </div>
        </div>

        {/* ── Table & Content Section ── */}
        <div className="ha-panel__body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
              <RefreshCw size={28} className="spin-animation" style={{ color: '#0891b2', margin: '0 auto 0.75rem auto' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>Loading departments...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <Building2 size={36} style={{ color: '#94a3b8', margin: '0 auto 0.75rem auto', opacity: 0.7 }} />
              {departments.length === 0 ? (
                <>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No departments have been configured yet.
                  </p>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem' }}>
                    Register clinical wings to enable doctor assignments, ward management, and appointment scheduling.
                  </p>
                  <button className="ha-btn ha-btn--primary ha-btn--sm" onClick={handleOpenAdd}>
                    <Plus size={14} /> Add First Department
                  </button>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    No departments match your search.
                  </p>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem' }}>
                    Try adjusting your search query or status filter.
                  </p>
                  <button
                    className="ha-btn ha-btn--secondary ha-btn--sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Department</th>
                    <th style={{ width: '9%' }}>Code</th>
                    <th style={{ width: '15%' }}>Location / Wing</th>
                    <th style={{ width: '16%' }}>Head of Department</th>
                    <th style={{ width: '9%', textAlign: 'center' }}>Doctors</th>
                    <th style={{ width: '9%', textAlign: 'center' }}>Staff</th>
                    <th style={{ width: '9%', textAlign: 'center' }}>Capacity</th>
                    <th style={{ width: '9%', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => {
                    const deptId = dept.id || dept._id;
                    const isHeadAssigned = dept.headName && dept.headName !== 'Not assigned';

                    return (
                      <tr key={deptId}>
                        {/* Department Name & Description */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {dept.name}
                          </div>
                          {dept.description && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                marginTop: '0.125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '240px',
                              }}
                              title={dept.description}
                            >
                              {dept.description}
                            </div>
                          )}
                        </td>

                        {/* Unique Code */}
                        <td>
                          <code
                            style={{
                              background: 'var(--bg-input, rgba(148, 163, 184, 0.15))',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '0.25rem',
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              color: '#0891b2',
                            }}
                          >
                            {dept.code}
                          </code>
                        </td>

                        {/* Location */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={13} style={{ color: '#0891b2', flexShrink: 0 }} />
                            <span>{dept.location || 'Main Medical Wing'}</span>
                          </div>
                        </td>

                        {/* Head of Department */}
                        <td>
                          {isHeadAssigned ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                              <UserCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
                              <strong style={{ color: 'var(--text-primary)' }}>{dept.headName}</strong>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* Real Doctors Count */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="ha-badge ha-badge--info"
                            title={`${dept.doctorsCount} active doctor(s) assigned`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}
                          >
                            <Stethoscope size={11} />
                            <span>{dept.doctorsCount}</span>
                          </span>
                        </td>

                        {/* Real Staff Count */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="ha-badge ha-badge--secondary"
                            title={`${dept.staffCount} active non-patient staff assigned`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}
                          >
                            <Users size={11} />
                            <span>{dept.staffCount}</span>
                          </span>
                        </td>

                        {/* Capacity */}
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {dept.capacity} beds
                          </span>
                        </td>

                        {/* Active / Inactive Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`ha-badge ${dept.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* Quick Details Inspection */}
                            <button
                              className="ha-btn ha-btn--secondary ha-btn--sm"
                              onClick={() => setDetailsDept(dept)}
                              title="View Department Details"
                              style={{ padding: '0.3rem 0.45rem' }}
                            >
                              <Eye size={12} />
                            </button>

                            {/* Edit Action */}
                            <button
                              className="ha-btn ha-btn--secondary ha-btn--sm"
                              onClick={() => handleOpenEdit(dept)}
                              title="Edit Department"
                              style={{ padding: '0.3rem 0.45rem' }}
                            >
                              <Edit2 size={12} />
                            </button>

                            {/* Activate / Deactivate Toggle */}
                            <button
                              className={`ha-btn ha-btn--sm ${dept.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                              onClick={() => handleInitiateToggleStatus(dept)}
                              title={dept.isActive ? 'Deactivate Department' : 'Activate Department'}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              {dept.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Department Modal ── */}
      {deptModalOpen && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '580px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="#0891b2" />
                <span>{editingDept ? 'Edit Department Parameters' : 'Register New Department'}</span>
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setDeptModalOpen(false)}
                disabled={saving}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="ha-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Submit Error Alert */}
                {formErrors.submit && (
                  <div className="ha-alert ha-alert--error" style={{ margin: 0, padding: '0.625rem' }}>
                    <AlertCircle size={15} />
                    <span style={{ fontSize: '0.8125rem' }}>{formErrors.submit}</span>
                  </div>
                )}

                {/* Row 1: Name and Code */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Department Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cardiology"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    {formErrors.name && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {formErrors.name}
                      </span>
                    )}
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Code <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CARD"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', textTransform: 'uppercase' }}
                    />
                    {formErrors.code && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {formErrors.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Location and Capacity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem' }}>
                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Location / Wing
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Hospital Tower, 3rd Floor"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="ha-form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                      Bed Capacity <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="25"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      style={{ width: '100%' }}
                    />
                    {formErrors.capacity && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {formErrors.capacity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Head of Department Dropdown */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Head of Department (Eligible Hospital Staff)
                  </label>
                  <select
                    value={formData.headOfDepartment}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedUser = eligibleHeads.find((u) => String(u._id || u.id) === String(selectedId));
                      setFormData({
                        ...formData,
                        headOfDepartment: selectedId,
                        headName: selectedUser
                          ? `${selectedUser.roleName === 'DOCTOR' ? 'Dr. ' : ''}${selectedUser.firstName} ${selectedUser.lastName}`
                          : '',
                      });
                    }}
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
                    <option value="">-- Not assigned / None --</option>
                    {eligibleHeads.map((u) => {
                      const uId = u._id || u.id;
                      const roleTag = u.roleName ? ` [${u.roleName}]` : '';
                      const specTag = u.specialization ? ` (${u.specialization})` : '';
                      return (
                        <option key={uId} value={uId}>
                          {u.firstName} {u.lastName}{specTag}{roleTag}
                        </option>
                      );
                    })}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Select an active doctor or staff member belonging to your hospital facility.
                  </span>
                </div>

                {/* Description */}
                <div className="ha-form-group">
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Clinical Description & Specialization Scope
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Describe clinical wing specialty, emergency care readiness, or inpatient facilities..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem',
                      fontSize: '0.8125rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={() => setDeptModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={13} className="spin-animation" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingDept ? 'Save Changes' : 'Create Department'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Confirmation Dialog ── */}
      {statusConfirmDept && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Power size={18} color={statusConfirmDept.isActive ? '#ef4444' : '#10b981'} />
                <span>{statusConfirmDept.isActive ? 'Deactivate Department?' : 'Activate Department?'}</span>
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setStatusConfirmDept(null)}
                disabled={isTogglingStatus}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                Are you sure you want to {statusConfirmDept.isActive ? 'deactivate' : 'activate'}{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{statusConfirmDept.name}</strong> (
                <code>{statusConfirmDept.code}</code>)?
              </p>
              {statusConfirmDept.isActive ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                  Deactivating this department will suspend new patient appointments and active clinical intake for this wing. Existing records remain intact.
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                  Activating this department will restore operational scheduling, clinical staff allocation, and bed capacity for intake.
                </div>
              )}
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setStatusConfirmDept(null)}
                disabled={isTogglingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`ha-btn ${statusConfirmDept.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                onClick={handleConfirmToggleStatus}
                disabled={isTogglingStatus}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                {isTogglingStatus ? (
                  <>
                    <RefreshCw size={13} className="spin-animation" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{statusConfirmDept.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compact Department Details Modal ── */}
      {detailsDept && (
        <div className="ha-modal-overlay" role="dialog" aria-modal="true">
          <div className="ha-modal" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="#0891b2" />
                <span>{detailsDept.name} ({detailsDept.code})</span>
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setDetailsDept(null)}
              >
                ✕
              </button>
            </div>

            <div className="ha-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span className={`ha-badge ${detailsDept.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                  {detailsDept.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{detailsDept.location || 'Main Medical Wing'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Head of Department:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{detailsDept.headName || 'Not assigned'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Capacity:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{detailsDept.capacity} beds</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Active Doctors:</span>
                <span className="ha-badge ha-badge--info">{detailsDept.doctorsCount}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Active Staff:</span>
                <span className="ha-badge ha-badge--secondary">{detailsDept.staffCount}</span>
              </div>

              {detailsDept.description && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Clinical Scope & Description:</div>
                  <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{detailsDept.description}</div>
                </div>
              )}
            </div>

            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setDetailsDept(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--primary"
                onClick={() => {
                  const target = detailsDept;
                  setDetailsDept(null);
                  handleOpenEdit(target);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Edit2 size={13} />
                <span>Edit Department</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
