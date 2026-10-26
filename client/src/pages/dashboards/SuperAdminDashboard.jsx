/**
 * Super Admin Dashboard & Master Console
 * 
 * Production-quality Super Admin Portal:
 * 1. Master Dashboard - Live KPIs, queue, today's hospital activity & audit events.
 * 2. Hospital Management - Delegated to HospitalManagementView with complete 3-step wizard, edit modal, status toggle.
 * 3. Hospital Admin Management - Full directory of Hospital Administrators with search, status filters, details modal, activate/deactivate.
 * 4. Roles & Permissions (RBAC) - Real permission matrix with persistence to MongoDB, SUPER_ADMIN system role protection.
 * 5. Reports & Analytics - Multi-dimensional filtered analytics, hospital & admin report breakdown, operational staff distribution, and CSV export.
 * 6. Audit Logs, Notifications, Settings, and Profile.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { superadminService } from '../../services/superadmin.service';
import CompactPageHeader from './CompactPageHeader';
import HospitalManagementView from './HospitalManagementView';
import AuditLogsView from './AuditLogsView';
import NotificationsView from './NotificationsView';
import ExecutiveDashboardView from './ExecutiveDashboardView';
import SuperAdminSettingsView from './SuperAdminSettingsView';
import SuperAdminProfileView from './SuperAdminProfileView';
import {
  Users,
  ShieldCheck,
  History,

  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  X,
  RefreshCw,
  Stethoscope,
  Activity,
  AlertTriangle,
  Building2,
  Lock,
  RotateCcw,
  Save,

} from 'lucide-react';

const VALID_TABS = [
  'dashboard',
  'hospitals',
  'add-hospital',
  'hospital-admins',
  'roles',
  'reports',
  'audit-logs',
  'notifications',
  'settings',
  'profile',
  // Backward compatibility aliases
  'users',
  'departments',
  'doctors',
  'nurses',
  'patients',
  'appointments',
  'billing',
];

// Standard RBAC permission domains covering all canonical HMS functional areas
const PERMISSION_DOMAINS = [
  { key: 'patients', label: 'Patient Management', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'appointments', label: 'Appointments & Scheduling', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'medical_records', label: 'Medical Records & EMR', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'prescriptions', label: 'Prescriptions & Pharmacy', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'laboratory', label: 'Laboratory & Diagnostics', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'radiology', label: 'Radiology & Imaging', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'billing', label: 'Billing & Invoicing', actions: ['read', 'write', 'delete', 'manage'] },
  { key: 'departments', label: 'Hospital Departments', actions: ['read', 'write', 'manage'] },
  { key: 'users', label: 'Staff & User Accounts', actions: ['read', 'write', 'manage'] },
  { key: 'settings', label: 'Hospital & Branch Settings', actions: ['read', 'write', 'manage'] },
  { key: 'services', label: 'Services & Charges', actions: ['read', 'write', 'manage'] },
  { key: 'operating_hours', label: 'Operating Hours & Holidays', actions: ['read', 'write', 'manage'] },
  { key: 'branding', label: 'Hospital Branding', actions: ['read', 'write', 'manage'] },
  { key: 'system_config', label: 'System Configuration', actions: ['read', 'write', 'manage'] },
  { key: 'reports', label: 'Reports & Analytics', actions: ['read', 'export'] },
  { key: 'audit_logs', label: 'Audit Logs', actions: ['read'] },
  { key: 'notifications', label: 'Notifications', actions: ['read', 'manage'] },
  { key: 'roles', label: 'Roles & Permissions', actions: ['read', 'manage'] },
  { key: 'hospital_management', label: 'Hospital Management', actions: ['read', 'manage'] },
  { key: 'hospital_admin_management', label: 'Hospital Admin Management', actions: ['read', 'manage'] },
  { key: 'security', label: 'Security & Access Control', actions: ['read', 'manage'] },
];

export default function SuperAdminDashboard() {
  const { user: _user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const normalizedTab = rawTab === 'users' ? 'hospital-admins' : rawTab;
  const activeTab = VALID_TABS.includes(normalizedTab) ? normalizedTab : 'dashboard';

  // Helper to switch tabs
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Global Feedback States
  const [_refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Dashboard Overview State
  const [_overviewData, setOverviewData] = useState(null);

  // 2. Hospital Admins State
  const [hospitalAdminsList, setHospitalAdminsList] = useState([]);
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [selectedAdminForDetails, setSelectedAdminForDetails] = useState(null);
  const [adminStatusConfirm, setAdminStatusConfirm] = useState(null);

  // 3. Roles & Permissions State
  const [rolesList, setRolesList] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState(null);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);

  // 4. Audit Logs State
  const [_auditLogs, setAuditLogs] = useState([]);
  const [auditModuleFilter, _setAuditModuleFilter] = useState('all');
  const [auditSearch, _setAuditSearch] = useState('');

  // 5. Reports & Analytics State
  const [reportsData, setReportsData] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [reportStatus, setReportStatus] = useState('all');
  const [reportPage, setReportPage] = useState(1);

  // 6. Notifications State
  const [_notificationsList, setNotificationsList] = useState([]);
  const [_notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);

  // Feedback Notification Helpers
  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const notifyError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // Fetch data based on active tab
  const loadTabContent = useCallback(async (tab) => {
    try {
      if (tab === 'dashboard') {
        const res = await superadminService.getDashboardOverview();
        if (res?.data) setOverviewData(res.data);
      } else if (tab === 'hospital-admins') {
        const res = await superadminService.getHospitalAdmins({
          search: adminSearch,
          status: adminStatusFilter,
        });
        if (res?.data?.admins) {
          setHospitalAdminsList(res.data.admins);
        } else if (Array.isArray(res?.admins)) {
          setHospitalAdminsList(res.admins);
        } else if (Array.isArray(res)) {
          setHospitalAdminsList(res);
        }
      } else if (tab === 'roles') {
        const res = await superadminService.getRolesAndPermissions();
        if (res) {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setRolesList(list);
          if (list.length > 0) {
            setSelectedRole((prev) => {
              const initial = prev ? list.find((r) => r.id === prev.id || r._id === prev._id) || list[0] : list[0];
              setDraftPermissions(initial.permissions || []);
              return initial;
            });
          }
        }
      } else if (tab === 'audit-logs') {
        const res = await superadminService.getAuditLogs({
          module: auditModuleFilter,
          search: auditSearch,
        });
        if (res?.data) setAuditLogs(res.data.logs || []);
      } else if (tab === 'notifications') {
        const res = await superadminService.getNotifications();
        if (res?.data) {
          setNotificationsList(res.data.notifications || []);
          setNotificationsUnreadCount(res.data.unreadCount || 0);
        }
      } else if (tab === 'reports' || tab === 'billing' || tab === 'appointments') {
        const repRes = await superadminService.getReportsAndAnalytics({
          period: reportPeriod,
          status: reportStatus,
        });
        if (repRes?.data) setReportsData(repRes.data);
      }
    } catch (err) {
      notifyError(err.message || 'Error fetching administration records');
    } finally {
      setRefreshing(false);
    }
  }, [
    adminSearch,
    adminStatusFilter,
    auditModuleFilter,
    auditSearch,
    reportPeriod,
    reportStatus,
  ]);

  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab, loadTabContent]);

  // Calculate if the currently selected role has unsaved permission changes
  const hasUnsavedPermissions = useMemo(() => {
    if (!selectedRole) return false;
    const saved = [...(selectedRole.permissions || [])].map((p) => p.toLowerCase()).sort();
    const current = [...(draftPermissions || [])].map((p) => p.toLowerCase()).sort();
    if (saved.length !== current.length) return true;
    return saved.some((val, idx) => val !== current[idx]);
  }, [selectedRole, draftPermissions]);

  // Filtered roles list for searching
  const filteredRolesList = useMemo(() => {
    if (!roleSearchTerm.trim()) return rolesList;
    const q = roleSearchTerm.toLowerCase();
    return rolesList.filter(
      (r) =>
        (r.displayName && r.displayName.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [rolesList, roleSearchTerm]);

  // When selected role changes, check for unsaved changes before switching
  const handleSelectRole = (role) => {
    if (!role) return;
    const currentRoleId = selectedRole?._id || selectedRole?.id;
    const nextRoleId = role._id || role.id;
    if (currentRoleId === nextRoleId) return;

    if (hasUnsavedPermissions) {
      setPendingRoleSwitch(role);
      setDiscardModalOpen(true);
      return;
    }

    setSelectedRole(role);
    setDraftPermissions(role.permissions || []);
  };

  // Confirm discarding unsaved changes to switch role
  const handleConfirmDiscardRoleSwitch = () => {
    if (pendingRoleSwitch) {
      setSelectedRole(pendingRoleSwitch);
      setDraftPermissions(pendingRoleSwitch.permissions || []);
      setPendingRoleSwitch(null);
    }
    setDiscardModalOpen(false);
  };

  // Toggle single permission in draft with safety validation
  const handleTogglePermission = (permCode) => {
    if (!selectedRole) return;
    const code = permCode.toLowerCase();
    const isGranted = draftPermissions.includes('*') || draftPermissions.includes(code);

    // Safety checks for SUPER_ADMIN role
    if (selectedRole.name === 'SUPER_ADMIN') {
      const corePermissions = ['roles:manage', 'users:manage', 'hospital_management:manage'];
      if (isGranted && (code === '*' || corePermissions.includes(code))) {
        // Check if removing this would strip all core administration permissions
        const remaining = draftPermissions.filter((p) => p !== code && p !== '*');
        const hasCoreLeft = remaining.some((p) => corePermissions.includes(p));
        if (!hasCoreLeft) {
          notifyError('This permission is required for system administration and cannot be removed.');
          return;
        }
      }
    }

    // Safety checks for HOSPITAL_ADMIN role (prevent global privilege escalation)
    if (selectedRole.name === 'HOSPITAL_ADMIN') {
      const forbiddenGlobal = [
        '*',
        'hospital_management:manage',
        'hospital_admin_management:manage',
        'roles:manage',
        'security:manage',
      ];
      if (!isGranted && forbiddenGlobal.includes(code)) {
        notifyError('Hospital Administrator cannot be granted global platform administration permissions.');
        return;
      }
    }

    setDraftPermissions((prev) => {
      if (prev.includes('*')) {
        // If wildcard was set, expand or remove
        if (isGranted) {
          return prev.filter((p) => p !== '*' && p !== code);
        }
        return prev;
      }
      if (prev.includes(code)) {
        return prev.filter((p) => p !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // Save permission changes to MongoDB
  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    setIsSavingPermissions(true);
    try {
      const roleId = selectedRole._id || selectedRole.id;
      const res = await superadminService.updateRolePermissions({
        roleId,
        permissions: draftPermissions,
      });

      if (res?.success || res?.data || res?.status === 200) {
        notifySuccess(res?.message || `Permissions for role "${selectedRole.displayName || selectedRole.name}" saved successfully.`);
        // Update local state
        const updatedRole = res?.data || res;
        const newPerms = updatedRole?.permissions || draftPermissions;
        setRolesList((prev) =>
          prev.map((r) => ((r._id || r.id) === roleId ? { ...r, ...updatedRole, permissions: newPerms } : r))
        );
        setSelectedRole((prev) => ({ ...prev, ...updatedRole, permissions: newPerms }));
      } else {
        notifyError(res?.message || 'Failed to update permissions.');
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to update role permissions.';
      notifyError(msg);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Reset permission changes to saved state
  const handleResetRolePermissions = () => {
    if (selectedRole) {
      setDraftPermissions(selectedRole.permissions || []);
      notifySuccess('Permission changes reset to saved state.');
    }
  };

  // Toggle Admin status (Activate / Suspend)
  const handleConfirmToggleAdminStatus = async () => {
    if (!adminStatusConfirm) return;
    setActionLoading(true);
    try {
      const adminId = adminStatusConfirm.id || adminStatusConfirm._id;
      const currentActive = adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended';
      const targetStatus = currentActive ? 'suspended' : 'active';

      await superadminService.toggleHospitalAdminStatus(adminId, { status: targetStatus });

      notifySuccess(`Hospital Administrator "${adminStatusConfirm.fullName || adminStatusConfirm.name}" account is now ${targetStatus.toUpperCase()}.`);
      setAdminStatusConfirm(null);
      loadTabContent('hospital-admins');

      if (selectedAdminForDetails && (selectedAdminForDetails.id === adminId || selectedAdminForDetails._id === adminId)) {
        setSelectedAdminForDetails((prev) => ({ ...prev, status: targetStatus, isActive: targetStatus === 'active' }));
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to update administrator status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Legacy user status toggle
  const _handleToggleUserActive = async (userId, currentStatus) => {
    setActionLoading(true);
    try {
      await superadminService.updateUserStatus(userId, {
        isActive: !currentStatus,
        status: !currentStatus ? 'active' : 'suspended',
      });
      notifySuccess(`User account status successfully updated.`);
      loadTabContent(activeTab);
    } catch (err) {
      notifyError(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark notification as read
  const _handleMarkNotificationRead = async (id) => {
    try {
      await superadminService.markNotificationRead(id);
      setNotificationsList((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      setNotificationsUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  // Mark all notifications as read
  const _handleMarkAllNotificationsRead = async () => {
    try {
      await superadminService.markAllNotificationsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setNotificationsUnreadCount(0);
      notifySuccess('All notifications marked as read.');
    } catch (err) {
      notifyError(err.message || 'Failed to mark all notifications as read');
    }
  };



  // Render Status Badge
  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACTIVE') {
      return (
        <span className="sa-badge sa-badge--success">
          <CheckCircle2 size={12} /> {s}
        </span>
      );
    }
    if (s === 'PENDING_VERIFICATION' || s === 'PENDING') {
      return (
        <span className="sa-badge sa-badge--warning">
          <Clock size={12} /> PENDING
        </span>
      );
    }
    if (s === 'UNDER_REVIEW') {
      return (
        <span className="sa-badge sa-badge--info">
          <Activity size={12} /> UNDER REVIEW
        </span>
      );
    }
    if (s === 'REJECTED' || s === 'SUSPENDED' || s === 'INACTIVE') {
      return (
        <span className="sa-badge sa-badge--danger">
          <XCircle size={12} /> {s}
        </span>
      );
    }
    return <span className="sa-badge sa-badge--neutral">{s}</span>;
  };

  return (
    <div className="superadmin-portal">
      {/* GLOBAL FEEDBACK TOASTS */}
      {successMsg && (
        <div
          className="alert alert--success"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            maxWidth: '440px',
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'inherit' }}>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.8 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          className="alert alert--error"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            maxWidth: '440px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'inherit' }}>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.8 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MASTER DASHBOARD TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <ExecutiveDashboardView onNavigateTab={setActiveTab} />
      )}

      {/* ========================================================================= */}
      {/* 2. HOSPITAL MANAGEMENT TAB                                                */}
      {/* ========================================================================= */}
      {(activeTab === 'hospitals' || activeTab === 'add-hospital') && (
        <HospitalManagementView
          initialView={activeTab === 'add-hospital' ? 'add' : 'list'}
          onTabChange={setActiveTab}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. HOSPITAL ADMIN MANAGEMENT TAB                                         */}
      {/* ========================================================================= */}
      {(activeTab === 'hospital-admins' || activeTab === 'users') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Hospital Admin Management"
            title="Hospital Administrators Directory"
            subtitle="Manage and inspect designated Hospital Administrators across all healthcare facilities."
          />

          {/* Filter Bar */}
          <div className="sa-filter-bar">
            <div className="sa-filter-controls" style={{ width: '100%' }}>
              <div className="sa-search-input-wrap">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search administrator by name, email, phone..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="sa-search-input"
                />
              </div>

              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                className="sa-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended / Inactive</option>
              </select>
            </div>
          </div>

          {/* Hospital Admins Table */}
          <div className="sa-table-card">
            {hospitalAdminsList.length === 0 ? (
              <div className="sa-empty-state">
                <div className="sa-empty-state__icon">
                  <Users size={26} />
                </div>
                <h4 className="sa-empty-state__title">No Hospital Administrators Found</h4>
                <p className="sa-empty-state__sub">
                  No administrator accounts match the current filters. Initial Hospital Administrators are created alongside their facility in Hospital Management.
                </p>
                <button
                  onClick={() => setActiveTab('hospitals')}
                  className="btn btn--primary btn--sm"
                  style={{ marginTop: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Building2 size={15} /> Go to Hospital Management
                </button>
              </div>
            ) : (
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Hospital Administrator</th>
                      <th>Login Email</th>
                      <th>Phone</th>
                      <th>Assigned Hospital</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitalAdminsList.map((u) => {
                      const isActive = u.isActive !== false && u.status !== 'suspended' && u.status !== 'inactive';
                      const assignedHospitalName =
                        u.assignedHospital?.name ||
                        u.assignedHospital?.hospitalName ||
                        u.hospitalName ||
                        'Apex Central Hospital';

                      return (
                        <tr key={u._id || u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'rgba(8, 145, 178, 0.1)',
                                  color: '#0891b2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.825rem',
                                }}
                              >
                                {(u.firstName?.[0] || u.email?.[0] || 'A').toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Administrator'}
                                </div>
                                <span className="sa-badge sa-badge--info" style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>
                                  HOSPITAL_ADMIN
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                            {u.email}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {u.phone || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Building2 size={14} style={{ color: '#0891b2', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                                {assignedHospitalName}
                              </span>
                            </div>
                            {u.assignedHospital?.registrationNumber && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                Reg: {u.assignedHospital.registrationNumber}
                              </div>
                            )}
                          </td>
                          <td>{renderStatusBadge(isActive ? 'ACTIVE' : 'SUSPENDED')}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Sep 30, 2026'}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedAdminForDetails(u)}
                              className="btn btn--outline btn--sm"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', marginRight: '0.4rem' }}
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminStatusConfirm(u)}
                              disabled={actionLoading}
                              className={`btn btn--sm ${isActive ? 'btn--outline' : 'btn--primary'}`}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.65rem',
                                color: isActive ? '#dc2626' : undefined,
                                borderColor: isActive ? 'rgba(220, 38, 38, 0.4)' : undefined,
                              }}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ROLES & PERMISSIONS TAB (RBAC Matrix & Management)                      */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <CompactPageHeader
              breadcrumb="Super Admin"
              module="Roles & Permissions"
              title="Roles & Permissions"
              subtitle="Manage role-based authorization across HMS."
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {hasUnsavedPermissions && (
                <span
                  className="sa-badge sa-badge--warning"
                  style={{
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>Unsaved changes</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleResetRolePermissions}
                disabled={!hasUnsavedPermissions || isSavingPermissions}
                className="btn btn--outline btn--sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: !hasUnsavedPermissions ? 0.6 : 1,
                  cursor: !hasUnsavedPermissions ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={!hasUnsavedPermissions || isSavingPermissions}
                className="btn btn--primary btn--sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  opacity: !hasUnsavedPermissions ? 0.6 : 1,
                  cursor: !hasUnsavedPermissions ? 'not-allowed' : 'pointer',
                }}
              >
                {isSavingPermissions ? <RefreshCw size={14} className="spin-animation" /> : <Save size={14} />}
                <span>{isSavingPermissions ? 'Saving Permissions...' : 'Save Permissions'}</span>
              </button>
            </div>
          </div>

          {/* Role selector card */}
          <div className="sa-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SELECT ROLE
              </div>
              <div className="sa-search-input-wrap" style={{ maxWidth: '240px', height: '32px' }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearchTerm}
                  onChange={(e) => setRoleSearchTerm(e.target.value)}
                  className="sa-search-input"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem 0.25rem 1.75rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {filteredRolesList.map((r) => {
                const isSelected = (selectedRole?._id || selectedRole?.id) === (r._id || r.id);
                const isProtected = r.isSystemRole || r.name === 'SUPER_ADMIN' || r.name === 'HOSPITAL_ADMIN';
                return (
                  <button
                    key={r._id || r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`btn btn--sm ${isSelected ? 'btn--primary' : 'btn--outline'}`}
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.75rem',
                    }}
                  >
                    {isProtected && <Lock size={12} style={{ opacity: 0.8 }} />}
                    <span>{r.displayName || r.name}</span>
                    <span
                      style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(8, 145, 178, 0.15)',
                        color: isSelected ? '#ffffff' : '#0891b2',
                        fontWeight: 700,
                      }}
                    >
                      {r.userCount !== undefined ? r.userCount : 0}
                    </span>
                  </button>
                );
              })}
              {filteredRolesList.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>
                  No roles match "{roleSearchTerm}".
                </div>
              )}
            </div>
          </div>

          {/* Selected Role Details */}
          {selectedRole && (
            <div className="sa-card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {selectedRole.displayName || selectedRole.name}
                    </h3>
                    <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                      Code: {selectedRole.name}
                    </span>
                    <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.72rem' }}>
                      {selectedRole.userCount !== undefined ? selectedRole.userCount : 0} {selectedRole.userCount === 1 ? 'user' : 'users'}
                    </span>
                    {(selectedRole.isSystemRole || selectedRole.name === 'SUPER_ADMIN' || selectedRole.name === 'HOSPITAL_ADMIN') && (
                      <span className="sa-badge sa-badge--success" style={{ fontSize: '0.72rem' }}>
                        <Lock size={10} /> System Protected
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {selectedRole.description || 'System access policies and authorization matrix.'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Assigned Permissions: </span>
                  <strong style={{ color: '#0891b2', fontSize: '0.95rem' }}>
                    {draftPermissions.includes('*') ? 'All (*)' : `${draftPermissions.length} active`}
                  </strong>
                </div>
              </div>

              {/* Special Protection Warning for SUPER_ADMIN */}
              {selectedRole.name === 'SUPER_ADMIN' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(8, 145, 178, 0.08)',
                    border: '1px solid rgba(8, 145, 178, 0.25)',
                    borderRadius: '8px',
                    marginTop: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Lock size={16} style={{ color: '#0891b2', flexShrink: 0 }} />
                  <span>
                    <strong>Protected System Role:</strong> <code>SUPER_ADMIN</code> holds universal administrative governance over hospitals and accounts. Core system permissions are mandatory for system administration.
                  </span>
                </div>
              )}

              {/* Special Protection Warning for HOSPITAL_ADMIN */}
              {selectedRole.name === 'HOSPITAL_ADMIN' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(5, 150, 105, 0.08)',
                    border: '1px solid rgba(5, 150, 105, 0.25)',
                    borderRadius: '8px',
                    marginTop: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Lock size={16} style={{ color: '#059669', flexShrink: 0 }} />
                  <span>
                    <strong>Hospital-Scoped System Role:</strong> <code>HOSPITAL_ADMIN</code> privileges are strictly scoped to their assigned healthcare facility. Global platform administrative permissions are restricted.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Granular Permissions Matrix */}
          <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Permission Domains</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Manage granted functional capabilities for {selectedRole?.displayName || selectedRole?.name || 'this role'}
                </div>
              </div>
              <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.72rem' }}>
                {PERMISSION_DOMAINS.length} Domains Available
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
              {PERMISSION_DOMAINS.map((domain) => {
                return (
                  <div
                    key={domain.key}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{domain.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{domain.key}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                      {domain.actions.map((act) => {
                        const permCode = `${domain.key}:${act}`;
                        const isGranted = draftPermissions.includes('*') || draftPermissions.includes(permCode.toLowerCase());

                        return (
                          <label
                            key={act}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.78rem',
                              color: isGranted ? 'var(--text-primary)' : 'var(--text-secondary)',
                              background: isGranted ? 'rgba(8, 145, 178, 0.12)' : 'var(--bg-card)',
                              border: `1px solid ${isGranted ? '#0891b2' : 'var(--border-color)'}`,
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => handleTogglePermission(permCode)}
                              style={{ accentColor: '#0891b2', cursor: 'pointer' }}
                            />
                            <span style={{ textTransform: 'capitalize', fontWeight: isGranted ? 600 : 400 }}>{act}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REPORTS & ANALYTICS TAB                                                */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 5. REPORTS & ANALYTICS TAB                                                */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {/* A. PAGE HEADER */}
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Reports & Analytics"
            title="Reports & Analytics"
            subtitle="Global administrative reports and system overview."
          />

          {/* B. REPORT CONTROLS */}
          <div className="sa-filter-bar">
            <div className="sa-filter-controls" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.85rem' }}>
              {/* Period Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Period:</span>
                <select
                  value={reportPeriod}
                  onChange={(e) => {
                    setReportPeriod(e.target.value);
                    setReportPage(1);
                  }}
                  className="sa-select"
                  style={{ height: '36px', minWidth: '140px' }}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="this_year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
                <select
                  value={reportStatus}
                  onChange={(e) => {
                    setReportStatus(e.target.value);
                    setReportPage(1);
                  }}
                  className="sa-select"
                  style={{ height: '36px', minWidth: '120px' }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* C. 4 SUMMARY CARDS */}
          <div className="sa-kpi-grid">
            {/* 1. TOTAL HOSPITALS */}
            <div className="sa-kpi-card">
              <div className="sa-kpi-card__top">
                <span className="sa-kpi-card__label">TOTAL HOSPITALS</span>
                <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2' }}>
                  <Building2 size={18} />
                </div>
              </div>
              <h3 className="sa-kpi-card__value">
                {reportsData?.administrativeMetrics?.hospitals?.total ?? 0}
              </h3>
              <div className="sa-kpi-card__sub">
                <span>
                  {reportsData?.administrativeMetrics?.hospitals?.active ?? 0} Active • {reportsData?.administrativeMetrics?.hospitals?.inactive ?? 0} Inactive
                </span>
              </div>
            </div>

            {/* 2. HOSPITAL ADMINS */}
            <div className="sa-kpi-card">
              <div className="sa-kpi-card__top">
                <span className="sa-kpi-card__label">HOSPITAL ADMINS</span>
                <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                  <Users size={18} />
                </div>
              </div>
              <h3 className="sa-kpi-card__value">
                {reportsData?.administrativeMetrics?.administrators?.total ?? 0}
              </h3>
              <div className="sa-kpi-card__sub">
                <span>
                  {reportsData?.administrativeMetrics?.administrators?.active ?? 0} Active • {reportsData?.administrativeMetrics?.administrators?.inactive ?? 0} Inactive
                </span>
              </div>
            </div>

            {/* 3. OPERATIONAL STAFF */}
            <div className="sa-kpi-card">
              <div className="sa-kpi-card__top">
                <span className="sa-kpi-card__label">OPERATIONAL STAFF</span>
                <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                  <Stethoscope size={18} />
                </div>
              </div>
              <h3 className="sa-kpi-card__value">
                {reportsData?.administrativeMetrics?.operationalStaff?.total ?? 0}
              </h3>
              <div className="sa-kpi-card__sub">
                <span>Across supported operational roles</span>
              </div>
            </div>

            {/* 4. AUDIT LOGS */}
            <div className="sa-kpi-card">
              <div className="sa-kpi-card__top">
                <span className="sa-kpi-card__label">AUDIT LOGS</span>
                <div className="sa-kpi-card__icon-box" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                  <History size={18} />
                </div>
              </div>
              <h3 className="sa-kpi-card__value">
                {reportsData?.administrativeMetrics?.auditLogs?.total ?? 0}
              </h3>
              <div className="sa-kpi-card__sub">
                <span>Administrative activity in selected period</span>
              </div>
            </div>
          </div>

          {/* D. HOSPITAL REGISTRY REPORT TABLE */}
          <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Hospital Registry
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Comprehensive registry of facilities, assigned administrators, and operational statuses
                </span>
              </div>
              {reportsData?.hospitalReports?.length > 0 && (
                <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.75rem' }}>
                  {reportsData.hospitalReports.length} {reportsData.hospitalReports.length === 1 ? 'Hospital' : 'Hospitals'}
                </span>
              )}
            </div>

            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Hospital Name</th>
                    <th>Registration #</th>
                    <th>Location</th>
                    <th>Hospital Admin</th>
                    <th>Status</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(!reportsData?.hospitalReports || reportsData.hospitalReports.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                        No hospitals match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const list = reportsData.hospitalReports;
                      const pageSize = 10;
                      const totalPages = Math.ceil(list.length / pageSize) || 1;
                      const currentPage = Math.min(reportPage, totalPages);
                      const paginated = list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                      return paginated.map((h) => (
                        <tr key={h.id || h._id || h.registrationNumber}>
                          <td>
                            <strong>{h.hospitalName}</strong>
                            {h.contactEmail && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{h.contactEmail}</div>
                            )}
                          </td>
                          <td>
                            <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                              {h.registrationNumber}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.location}</td>
                          <td>
                            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{h.adminName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#0891b2' }}>{h.adminEmail}</div>
                          </td>
                          <td>{renderStatusBadge(h.status)}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {reportsData?.hospitalReports && reportsData.hospitalReports.length > 10 && (
              (() => {
                const list = reportsData.hospitalReports;
                const pageSize = 10;
                const totalPages = Math.ceil(list.length / pageSize) || 1;
                const currentPage = Math.min(reportPage, totalPages);
                const startIdx = (currentPage - 1) * pageSize + 1;
                const endIdx = Math.min(currentPage * pageSize, list.length);

                return (
                  <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Showing {startIdx} to {endIdx} of {list.length} hospitals
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setReportPage((prev) => Math.max(1, prev - 1))}
                        className="btn btn--outline btn--sm"
                        style={{ height: '30px', padding: '0 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setReportPage(pNum)}
                          className={`btn btn--sm ${pNum === currentPage ? 'btn--primary' : 'btn--outline'}`}
                          style={{ height: '30px', minWidth: '30px', padding: '0 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          {pNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setReportPage((prev) => Math.min(totalPages, prev + 1))}
                        className="btn btn--outline btn--sm"
                        style={{ height: '30px', padding: '0 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* E. ADMINISTRATIVE ACTIVITY / AUDIT SUMMARY */}
          <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Recent Administrative Activity
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Latest 10 recorded administrative decisions and security events
                </span>
              </div>
            </div>

            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!reportsData?.recentActivity || reportsData.recentActivity.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                        No recent administrative activity.
                      </td>
                    </tr>
                  ) : (
                    reportsData.recentActivity.slice(0, 10).map((log) => (
                      <tr key={log.id || log._id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {log.timestamp || log.createdAt ? new Date(log.timestamp || log.createdAt).toLocaleString() : '—'}
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.825rem' }}>{log.user || log.userEmail || 'System'}</strong>
                        </td>
                        <td>
                          <span className="sa-badge sa-badge--info" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                            {log.role || log.userRole || 'SUPER_ADMIN'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.68rem' }}>
                            {log.module}
                          </span>
                        </td>
                        <td>{renderStatusBadge(log.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. AUDIT LOGS TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'audit-logs' && <AuditLogsView />}

      {/* ========================================================================= */}
      {/* 7. NOTIFICATIONS TAB                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && <NotificationsView />}

      {/* ========================================================================= */}
      {/* 8. SETTINGS TAB                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <SuperAdminSettingsView onNavigateTab={setActiveTab} />
      )}

      {/* ========================================================================= */}
      {/* 9. MY PROFILE TAB                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <SuperAdminProfileView onNavigateTab={setActiveTab} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: HOSPITAL ADMINISTRATOR DETAILS MODAL                                */}
      {/* ========================================================================= */}
      {selectedAdminForDetails && (
        <div className="sa-modal-backdrop" onClick={() => setSelectedAdminForDetails(null)}>
          <div className="sa-modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#0891b2' }} />
                Hospital Administrator Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAdminForDetails(null)}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sa-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(8, 145, 178, 0.12)',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {(selectedAdminForDetails.firstName?.[0] || selectedAdminForDetails.email?.[0] || 'A').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {selectedAdminForDetails.fullName || `${selectedAdminForDetails.firstName || ''} ${selectedAdminForDetails.lastName || ''}`.trim() || 'Administrator'}
                  </h4>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{selectedAdminForDetails.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span className="sa-badge sa-badge--info" style={{ fontSize: '0.68rem' }}>
                      HOSPITAL_ADMIN
                    </span>
                    {renderStatusBadge(selectedAdminForDetails.isActive !== false && selectedAdminForDetails.status !== 'suspended' ? 'ACTIVE' : 'SUSPENDED')}
                  </div>
                </div>
              </div>

              {/* Assigned Facility */}
              <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Assigned Healthcare Facility
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} style={{ color: '#0891b2', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {selectedAdminForDetails.assignedHospital?.name || selectedAdminForDetails.assignedHospital?.hospitalName || selectedAdminForDetails.hospitalName || 'Apex Central Hospital'}
                  </span>
                </div>
                {selectedAdminForDetails.assignedHospital?.registrationNumber && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    License / Registration No: <strong>{selectedAdminForDetails.assignedHospital.registrationNumber}</strong>
                  </div>
                )}
              </div>

              {/* Contact & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ padding: '0.75rem 0.85rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Direct Phone</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedAdminForDetails.phone || 'Not recorded'}
                  </div>
                </div>

                <div style={{ padding: '0.75rem 0.85rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Registered Date</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedAdminForDetails.createdAt
                      ? new Date(selectedAdminForDetails.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Sep 30, 2026'}
                  </div>
                </div>
              </div>

              {/* Security Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 0.85rem', background: 'rgba(8, 145, 178, 0.05)', borderRadius: '8px', border: '1px solid rgba(8, 145, 178, 0.2)' }}>
                <ShieldCheck size={16} style={{ color: '#0891b2', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Authentication credentials are encrypted using bcrypt salted hashes. Passwords are never exposed in API payloads or UI views.
                </span>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedAdminForDetails(null)}
                className="btn btn--outline btn--sm"
              >
                Close
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setAdminStatusConfirm(selectedAdminForDetails);
                }}
                className={`btn btn--sm ${selectedAdminForDetails.isActive !== false && selectedAdminForDetails.status !== 'suspended' ? 'btn--outline' : 'btn--primary'}`}
                style={{
                  color: selectedAdminForDetails.isActive !== false && selectedAdminForDetails.status !== 'suspended' ? '#dc2626' : undefined,
                  borderColor: selectedAdminForDetails.isActive !== false && selectedAdminForDetails.status !== 'suspended' ? 'rgba(220, 38, 38, 0.4)' : undefined,
                }}
              >
                {selectedAdminForDetails.isActive !== false && selectedAdminForDetails.status !== 'suspended' ? 'Suspend Administrator' : 'Activate Administrator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN STATUS CONFIRMATION DIALOG                                    */}
      {/* ========================================================================= */}
      {adminStatusConfirm && (
        <div className="sa-modal-backdrop" onClick={() => setAdminStatusConfirm(null)}>
          <div className="sa-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? '#dc2626' : '#0891b2' }}>
                <AlertTriangle size={20} />
                {adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? 'Suspend Administrator' : 'Activate Administrator'}
              </h3>
              <button
                type="button"
                onClick={() => setAdminStatusConfirm(null)}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sa-modal-body" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                Are you sure you want to <strong>{adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? 'suspend' : 'activate'}</strong> administrator account for <strong>"{adminStatusConfirm.fullName || adminStatusConfirm.name || adminStatusConfirm.email}"</strong>?
              </p>
              {adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Suspending this administrator will immediately block their access to the Hospital Admin portal and prevent management of their facility.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Activating this account will restore full administrative access for this Hospital Administrator.
                </p>
              )}
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                onClick={() => setAdminStatusConfirm(null)}
                className="btn btn--outline btn--sm"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleAdminStatus}
                disabled={actionLoading}
                className={`btn btn--sm ${adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? 'btn--primary' : 'btn--primary'}`}
                style={{
                  background: adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? '#dc2626' : undefined,
                  borderColor: adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? '#dc2626' : undefined,
                }}
              >
                {actionLoading ? 'Updating Status...' : (adminStatusConfirm.isActive !== false && adminStatusConfirm.status !== 'suspended' ? 'Yes, Suspend Account' : 'Yes, Activate Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISCARD UNSAVED PERMISSION CHANGES CONFIRMATION                    */}
      {/* ========================================================================= */}
      {discardModalOpen && (
        <div className="sa-modal-backdrop" onClick={() => { setDiscardModalOpen(false); setPendingRoleSwitch(null); }}>
          <div className="sa-modal-container" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                <AlertTriangle size={20} />
                Unsaved Permission Changes
              </h3>
              <button
                type="button"
                onClick={() => { setDiscardModalOpen(false); setPendingRoleSwitch(null); }}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sa-modal-body" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                You have unsaved permission changes for role <strong>"{selectedRole?.displayName || selectedRole?.name}"</strong>.
              </p>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                If you switch to another role now, all your unsaved modifications will be discarded. Do you want to continue without saving?
              </p>
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                onClick={() => { setDiscardModalOpen(false); setPendingRoleSwitch(null); }}
                className="btn btn--outline btn--sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscardRoleSwitch}
                className="btn btn--primary btn--sm"
                style={{
                  background: '#d97706',
                  borderColor: '#d97706',
                  color: '#ffffff',
                }}
              >
                Continue without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
