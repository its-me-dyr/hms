/**
 * Hospital Staff Management Tab Component
 * 
 * Provides Hospital Administration console with full staff directory,
 * role and status filtering, real-time status activation/suspension toggles,
 * and seamless staff account provisioning.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Stethoscope,
  Key,
} from 'lucide-react';
import { superadminService } from '../../../services/superadmin.service';
import StaffProvisioningModal from '../StaffProvisioningModal';

export default function HospitalStaffManagementTab() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await superadminService.getUsersAndStaff(params);
      const list = res?.data?.users || res?.users || [];
      // Filter out pure patient accounts from the staff console by default unless explicitly chosen
      const staffOnly = roleFilter === 'all'
        ? list.filter((u) => u.roleName !== 'PATIENT')
        : list;
      setUsersList(staffOnly);
    } catch (err) {
      setError(err.message || 'Failed to load hospital staff directory.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleStatus = async (userId, currentActive) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const newStatus = currentActive ? 'inactive' : 'active';
      await superadminService.updateUserStatus(userId, {
        isActive: !currentActive,
        status: newStatus,
      });
      setSuccessMsg(`Staff account status updated to ${!currentActive ? 'Active' : 'Inactive'}.`);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to update account status.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalStaff = usersList.length;
  const activeCount = usersList.filter((u) => u.isActive && u.status === 'active').length;
  const inactiveCount = usersList.filter((u) => !u.isActive || u.status === 'inactive' || u.status === 'suspended').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* SUCCESS BANNER */}
      {successMsg && (
        <div
          className="alert alert--success"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div
          className="alert alert--danger"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="dashboard-card">
          <div className="dashboard-card__icon" style={{ color: 'var(--color-primary)', background: 'rgba(8, 145, 178, 0.1)' }}>
            <Users size={22} />
          </div>
          <div className="dashboard-card__content">
            <p className="dashboard-card__label">Total Staff Profiles</p>
            <h3 className="dashboard-card__value">{totalStaff}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Provisioned hospital personnel</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon" style={{ color: '#059669', background: '#ecfdf5' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="dashboard-card__content">
            <p className="dashboard-card__label">Active Accounts</p>
            <h3 className="dashboard-card__value" style={{ color: '#059669' }}>{activeCount}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Authorized to sign in</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon" style={{ color: '#dc2626', background: '#fef2f2' }}>
            <XCircle size={22} />
          </div>
          <div className="dashboard-card__content">
            <p className="dashboard-card__label">Inactive / Suspended</p>
            <h3 className="dashboard-card__value" style={{ color: '#dc2626' }}>{inactiveCount}</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Login blocked by policy</p>
          </div>
        </div>
      </div>

      {/* CONTROL & FILTER BAR */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          {/* SEARCH */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>

          {/* ROLE FILTER */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-input"
            style={{ width: '170px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="all">All Staff Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="receptionist">Receptionists</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="lab_tech">Lab Technicians</option>
            <option value="radiology_staff">Radiologists</option>
            <option value="billing_staff">Billing Staff</option>
          </select>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: '150px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>

          <button
            onClick={fetchStaff}
            className="btn btn--outline btn--sm"
            style={{ height: '38px' }}
            title="Refresh Staff List"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>

        {/* PROVISION STAFF CTA */}
        <button
          onClick={() => setProvisionModalOpen(true)}
          className="btn btn--primary"
          style={{ height: '38px', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={16} />
          <span>Provision Staff Account</span>
        </button>
      </div>

      {/* STAFF TABLE CARD */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Loading hospital personnel directory...</p>
          </div>
        ) : usersList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(8, 145, 178, 0.08)',
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Users size={26} />
            </div>
            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', color: '#0f172a' }}>No Staff Members Found</h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              No staff accounts matched your selected role or filter criteria. Click below to provision a new staff account.
            </p>
            <button
              onClick={() => setProvisionModalOpen(true)}
              className="btn btn--primary btn--sm"
            >
              <Plus size={15} />
              <span>Provision First Staff Account</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Staff Member</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Assigned Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Department & Details</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Phone</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Joined</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((staff) => {
                  const isActive = staff.isActive && staff.status === 'active';
                  return (
                    <tr
                      key={staff._id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 120ms ease' }}
                    >
                      {/* NAME & EMAIL */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'rgba(8, 145, 178, 0.1)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {(staff.firstName?.[0] || staff.email?.[0] || 'S').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Staff'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          className="badge"
                          style={{
                            background:
                              staff.roleName === 'DOCTOR'
                                ? 'rgba(5, 150, 105, 0.1)'
                                : staff.roleName === 'NURSE'
                                ? 'rgba(2, 132, 199, 0.1)'
                                : staff.roleName === 'PHARMACIST'
                                ? 'rgba(217, 119, 6, 0.1)'
                                : 'rgba(8, 145, 178, 0.1)',
                            color:
                              staff.roleName === 'DOCTOR'
                                ? '#059669'
                                : staff.roleName === 'NURSE'
                                ? '#0284c7'
                                : staff.roleName === 'PHARMACIST'
                                ? '#d97706'
                                : 'var(--color-primary)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        >
                          {String(staff.roleName || staff.role?.name || 'STAFF').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* DEPARTMENT & SPECIALTY */}
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        <div>{staff.department || 'General'}</div>
                        {staff.specialization && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {staff.specialization}
                          </div>
                        )}
                      </td>

                      {/* PHONE */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {staff.phone || '—'}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          className={`badge ${isActive ? 'badge--success' : 'badge--danger'}`}
                          style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}
                        >
                          {isActive ? 'Active' : staff.status || 'Inactive'}
                        </span>
                      </td>

                      {/* JOINED */}
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>
                        {new Date(staff.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleStatus(staff._id, isActive)}
                          disabled={actionLoading}
                          className={`btn btn--sm ${isActive ? 'btn--outline' : 'btn--primary'}`}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            color: isActive ? '#dc2626' : undefined,
                            borderColor: isActive ? '#fca5a5' : undefined,
                          }}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROVISIONING MODAL */}
      <StaffProvisioningModal
        isOpen={provisionModalOpen}
        onClose={() => setProvisionModalOpen(false)}
        mode="staff_only"
        allowHospitalAdminRole={false}
        onSuccess={() => {
          fetchStaff();
          setSuccessMsg('Staff member provisioned successfully. They can now log in with their credentials.');
        }}
      />
    </div>
  );
}
