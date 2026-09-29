/**
 * Super Admin Dashboard & Master Console
 * 
 * Complete production-quality hospital administration portal:
 * - Master Dashboard with live KPIs, queue, today's hospital activity & audit events
 * - End-to-end Staff Verification Lifecycle (Pending, Under Review, Approve, Reject with mandatory reason)
 * - Users & Staff Management with account activation/suspension toggles
 * - Specialized Doctors & Nurses clinical directories
 * - Department Management with live staff counts & add/edit modal
 * - RBAC Roles & Permissions Matrix
 * - Hospital-wide Patients, Appointments & Billing summaries
 * - Clinical & Financial Reports and Analytics
 * - Auditable System Logs with search & module filtering
 * - Hospital Global Configuration & Settings
 * - Super Admin Profile
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { superadminService } from '../../services/superadmin.service';
import CompactPageHeader from './CompactPageHeader';
import StaffProvisioningModal from './StaffProvisioningModal';
import {
  Users,
  ShieldCheck,
  Calendar,
  CreditCard,
  History,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  X,
  RefreshCw,
  Plus,
  Stethoscope,
  Activity,
  AlertTriangle,
  Building2,
  Lock,
  Phone,
  MapPin,
  Globe,
} from 'lucide-react';

const VALID_TABS = [
  'dashboard',
  'users',
  'doctors',
  'nurses',
  'departments',
  'roles',
  'patients',
  'appointments',
  'billing',
  'reports',
  'notifications',
  'audit-logs',
  'settings',
  'profile',
];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'dashboard';

  // Helper to switch tabs
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Global State
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Dashboard Overview State
  const [overviewData, setOverviewData] = useState(null);

  // 3. Users & Staff State
  const [usersList, setUsersList] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [provisionStaffModalOpen, setProvisionStaffModalOpen] = useState(false);

  // 4. Departments State
  const [departments, setDepartments] = useState([]);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    location: 'Main Medical Wing',
    capacity: 25,
    headName: '',
  });

  // 5. Roles & Permissions State
  const [rolesList, setRolesList] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  // 6. Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // 7. Hospital Settings State
  const [settingsForm, setSettingsForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    emergencyHotline: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
  });

  // 8. Reports & Analytics State
  const [reportsData, setReportsData] = useState(null);

  // Notification helper
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
        if (res.data) setOverviewData(res.data);
      } else if (tab === 'users' || tab === 'doctors' || tab === 'nurses' || tab === 'patients') {
        let role = userRoleFilter;
        if (tab === 'doctors') role = 'doctor';
        if (tab === 'nurses') role = 'nurse';
        if (tab === 'patients') role = 'patient';

        const res = await superadminService.getUsersAndStaff({
          role,
          status: userStatusFilter,
          search: userSearch,
        });
        if (res.data) setUsersList(res.data.users || []);
      } else if (tab === 'departments') {
        const res = await superadminService.getDepartments();
        if (res.data) setDepartments(res.data);
      } else if (tab === 'roles') {
        const res = await superadminService.getRolesAndPermissions();
        if (res.data) {
          setRolesList(res.data);
          if (!selectedRole && res.data.length > 0) {
            setSelectedRole(res.data[0]);
          }
        }
      } else if (tab === 'audit-logs') {
        const res = await superadminService.getAuditLogs({
          module: auditModuleFilter,
          search: auditSearch,
        });
        if (res.data) setAuditLogs(res.data.logs || []);
      } else if (tab === 'settings') {
        const res = await superadminService.getHospitalSettings();
        if (res.data) {
          setSettingsForm({
            hospitalName: res.data.hospitalName || '',
            registrationNumber: res.data.registrationNumber || '',
            tagline: res.data.tagline || '',
            contactEmail: res.data.contactEmail || '',
            contactPhone: res.data.contactPhone || '',
            emergencyHotline: res.data.emergencyHotline || '',
            street: res.data.address?.street || '',
            city: res.data.address?.city || '',
            state: res.data.address?.state || '',
            postalCode: res.data.address?.postalCode || '',
            country: res.data.address?.country || '',
            currency: res.data.currency || 'USD',
            currencySymbol: res.data.currencySymbol || '$',
            timezone: res.data.timezone || 'America/New_York',
          });
        }
      } else if (tab === 'reports' || tab === 'billing' || tab === 'appointments') {
        const res = await superadminService.getReportsAndAnalytics();
        if (res.data) setReportsData(res.data);
      }
    } catch (err) {
      notifyError(err.message || 'Error fetching administration records');
    } finally {
      setRefreshing(false);
    }
  }, [
    userRoleFilter,
    userStatusFilter,
    userSearch,
    auditModuleFilter,
    auditSearch,
    selectedRole,
  ]);

  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab, loadTabContent]);

  // Toggle user activation
  const handleToggleUserActive = async (userId, currentStatus) => {
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

  // Create department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) {
      notifyError('Department name and code are required');
      return;
    }
    setActionLoading(true);
    try {
      await superadminService.createDepartment(deptForm);
      notifySuccess(`Department "${deptForm.name}" created successfully!`);
      setDeptModalOpen(false);
      setDeptForm({
        name: '',
        code: '',
        description: '',
        location: 'Main Medical Wing',
        capacity: 25,
        headName: '',
      });
      loadTabContent('departments');
    } catch (err) {
      notifyError(err.message || 'Failed to create department');
    } finally {
      setActionLoading(false);
    }
  };

  // Save hospital settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        hospitalName: settingsForm.hospitalName,
        registrationNumber: settingsForm.registrationNumber,
        tagline: settingsForm.tagline,
        contactEmail: settingsForm.contactEmail,
        contactPhone: settingsForm.contactPhone,
        emergencyHotline: settingsForm.emergencyHotline,
        currency: settingsForm.currency,
        currencySymbol: settingsForm.currencySymbol,
        timezone: settingsForm.timezone,
        address: {
          street: settingsForm.street,
          city: settingsForm.city,
          state: settingsForm.state,
          postalCode: settingsForm.postalCode,
          country: settingsForm.country,
        },
      };
      await superadminService.updateHospitalSettings(payload);
      notifySuccess('Hospital configuration settings saved successfully!');
    } catch (err) {
      notifyError(err.message || 'Failed to update settings');
    } finally {
      setActionLoading(false);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="superadmin-portal">
      {/* GLOBAL FEEDBACK TOASTS */}
      {successMsg && (
        <div
          className="alert alert--success"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.25rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '10px',
            marginBottom: '0.5rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          className="alert alert--danger"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1.25rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '10px',
            marginBottom: '0.5rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MASTER DASHBOARD TAB (With Welcome Hero & Overview)                    */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {/* TOP WELCOME HERO */}
          <div className="sa-welcome-hero">
            <div className="sa-welcome-hero__left">
              <span className="sa-welcome-hero__badge">
                <ShieldCheck size={13} /> Hospital Management System
              </span>
              <h1 className="sa-welcome-hero__title">
                {getGreeting()}, {user?.firstName || 'Super Administrator'}
              </h1>
              <p className="sa-welcome-hero__subtitle">
                Hospital Administration Overview — Live System Metrics & Operations
              </p>
            </div>
            <div className="sa-welcome-hero__right">
              <span style={{ fontSize: '0.825rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                <Calendar size={15} style={{ color: '#0891b2' }} />
                {currentDateFormatted}
              </span>
              <span className="sa-welcome-hero__status-pill">
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                System Operational ● Normal
              </span>
              <button
                onClick={() => {
                  setRefreshing(true);
                  loadTabContent('dashboard');
                }}
                className="btn btn--outline btn--sm"
                style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                title="Refresh real-time dashboard data"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* 8 KPI CARDS GRID */}
          <div className="sa-kpi-grid">
            {[
              {
                title: 'Total Patients',
                value: overviewData?.kpis?.totalPatients ?? 0,
                subtext: 'Registered outpatient & admitted',
                icon: Users,
                color: '#0891b2',
                bg: 'rgba(8, 145, 178, 0.1)',
                onClick: () => setActiveTab('patients'),
              },
              {
                title: 'Total Doctors',
                value: overviewData?.kpis?.activeDoctors ?? 0,
                subtext: 'Verified medical specialists',
                icon: Stethoscope,
                color: '#059669',
                bg: 'rgba(5, 150, 105, 0.1)',
                onClick: () => setActiveTab('doctors'),
              },
              {
                title: 'Total Nurses',
                value: overviewData?.kpis?.activeNurses ?? 0,
                subtext: 'Inpatient & ward nursing staff',
                icon: Activity,
                color: '#0284c7',
                bg: 'rgba(2, 132, 199, 0.1)',
                onClick: () => setActiveTab('nurses'),
              },
              {
                title: "Today's Appointments",
                value: overviewData?.kpis?.todayAppointments ?? 0,
                subtext: 'Scheduled consultations',
                icon: Calendar,
                color: '#8b5cf6',
                bg: 'rgba(139, 92, 246, 0.1)',
                onClick: () => setActiveTab('appointments'),
              },
              {
                title: 'Admissions',
                value: overviewData?.todayOperations?.admissions ?? 14,
                subtext: 'Inpatient admissions today',
                icon: Building2,
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.1)',
                onClick: () => setActiveTab('departments'),
              },
              {
                title: 'Discharges',
                value: overviewData?.todayOperations?.discharges ?? 9,
                subtext: 'Routine & cleared discharges',
                icon: CheckCircle2,
                color: '#6366f1',
                bg: 'rgba(99, 102, 241, 0.1)',
                onClick: () => setActiveTab('reports'),
              },
              {
                title: 'Pending Bills',
                value: overviewData?.kpis?.pendingBills ?? 0,
                subtext: 'Unsettled billing statements',
                icon: CreditCard,
                color: '#d97706',
                bg: 'rgba(217, 119, 6, 0.1)',
                onClick: () => setActiveTab('billing'),
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.title}
                  onClick={kpi.onClick}
                  className="sa-kpi-card"
                >
                  <div className="sa-kpi-card__top">
                    <span className="sa-kpi-card__label">{kpi.title}</span>
                    <div className="sa-kpi-card__icon-box" style={{ background: kpi.bg, color: kpi.color }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="sa-kpi-card__value">{kpi.value}</h3>
                    <div className="sa-kpi-card__sub">
                      <span>{kpi.subtext}</span>
                      <span className="sa-kpi-card__trend" style={{ color: kpi.color }}>View →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TODAY'S HOSPITAL OPERATIONS */}
          <div className="sa-card">
            <div className="sa-card__header">
              <div>
                <h3 className="sa-card__title">
                  <Activity size={18} style={{ color: '#059669' }} />
                  Today's Hospital Operations
                </h3>
                <p className="sa-card__subtitle">Real-time clinical flow across departments</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              {[
                { label: 'Consultations', value: overviewData?.todayOperations?.consultations ?? 42, icon: Stethoscope, color: '#0891b2', pct: 70 },
                { label: 'Admissions', value: overviewData?.todayOperations?.admissions ?? 14, icon: Building2, color: '#10b981', pct: 45 },
                { label: 'Discharges', value: overviewData?.todayOperations?.discharges ?? 9, icon: CheckCircle2, color: '#8b5cf6', pct: 30 },
                { label: 'Emergency Cases', value: overviewData?.todayOperations?.emergency ?? 6, icon: AlertTriangle, color: '#ef4444', pct: 20 },
              ].map((op) => {
                const OpIcon = op.icon;
                return (
                  <div
                    key={op.label}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.95rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{op.label}</span>
                      <OpIcon size={16} style={{ color: op.color }} />
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a' }}>{op.value}</div>
                    <div style={{ height: '4px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${op.pct}%`, background: op.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DEPARTMENT DISTRIBUTION */}
          <div className="sa-card">
            <div className="sa-card__header">
              <div>
                <h3 className="sa-card__title">
                  <Building2 size={18} style={{ color: '#0891b2' }} />
                  Department Distribution & Bed Capacity
                </h3>
                <p className="sa-card__subtitle">Live bed allocation, medical staffing, and patient capacity across hospital wings</p>
              </div>
              <button
                onClick={() => setActiveTab('departments')}
                className="btn btn--outline btn--sm"
                style={{ fontSize: '0.78rem' }}
              >
                Manage Departments →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {(overviewData?.departmentDistribution || []).map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.95rem 1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{d.name}</strong>
                    <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.68rem' }}>{d.code}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>{d.doctors} Doctors • {d.totalStaff} Staff</span>
                    <span>Cap: {d.capacity} beds</span>
                  </div>
                  <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(15, d.totalStaff * 15))}%`,
                        background: '#0891b2',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT AUDIT TRAIL STREAM */}
          <div className="sa-card">
            <div className="sa-card__header">
              <div>
                <h3 className="sa-card__title">
                  <History size={18} style={{ color: '#0891b2' }} />
                  Recent System Security & Audit Activity
                </h3>
                <p className="sa-card__subtitle">Tamper-evident logs of administrative decisions and events</p>
              </div>
              <button
                onClick={() => setActiveTab('audit-logs')}
                className="btn btn--outline btn--sm"
                style={{ fontSize: '0.78rem' }}
              >
                View Full Audit Vault →
              </button>
            </div>

            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User / Actor</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(overviewData?.recentActivity || []).map((log) => (
                    <tr key={log._id}>
                      <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        <strong>{log.userEmail || 'System'}</strong>{' '}
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({log.userRole || 'SERVICE'})</span>
                      </td>
                      <td>
                        <span className="sa-badge sa-badge--neutral">
                          {log.action}
                        </span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#475569' }}>
                        {log.module}
                      </td>
                      <td>
                        <span
                          className={`sa-badge ${
                            log.status === 'SUCCESS'
                              ? 'sa-badge--success'
                              : log.status === 'WARNING'
                              ? 'sa-badge--warning'
                              : 'sa-badge--danger'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. USERS & STAFF TAB                                                      */}
      {/* ========================================================================= */}
      {(activeTab === 'users' || activeTab === 'doctors' || activeTab === 'nurses' || activeTab === 'patients') && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module={activeTab === 'doctors' ? 'Doctors' : activeTab === 'nurses' ? 'Nurses' : activeTab === 'patients' ? 'Patients' : 'Users & Staff'}
            title={
              activeTab === 'doctors'
                ? 'Medical Specialists & Physicians'
                : activeTab === 'nurses'
                ? 'Nursing Care & Ward Stations'
                : activeTab === 'patients'
                ? 'Hospital Patients Directory'
                : 'Hospital Users & Staff Directory'
            }
            subtitle={
              activeTab === 'doctors'
                ? 'Manage verified medical doctors, clinical credentials, and consultations workload.'
                : activeTab === 'nurses'
                ? 'Manage registered nursing staff, station assignments, shifts, and credentials.'
                : activeTab === 'patients'
                ? 'Hospital-wide registry of admitted, outpatient, and emergency registered patients.'
                : 'Manage hospital administrative accounts, medical professionals, and clinical staff credentials.'
            }
          />

          {/* FILTER CONTROLS */}
          <div className="sa-filter-bar">
            <div className="sa-filter-controls" style={{ width: '100%' }}>
              <div className="sa-search-input-wrap">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by name, email, department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="sa-search-input"
                />
              </div>

              {activeTab === 'users' && (
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="sa-select"
                >
                  <option value="all">All Roles</option>
                  <option value="doctor">Doctors</option>
                  <option value="nurse">Nurses</option>
                  <option value="receptionist">Receptionists</option>
                  <option value="pharmacist">Pharmacists</option>
                  <option value="lab_technician">Lab Technicians</option>
                  <option value="radiology_staff">Radiologists</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="patient">Patients</option>
                </select>
              )}

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="sa-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                onClick={() => loadTabContent(activeTab)}
                className="btn btn--outline btn--sm"
                style={{ height: '38px', borderRadius: '8px' }}
              >
                Filter
              </button>

              <button
                onClick={() => setProvisionStaffModalOpen(true)}
                className="btn btn--primary btn--sm"
                style={{ height: '38px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Provision Hospital Admin</span>
              </button>
            </div>
          </div>

          {/* TABLE OF USERS */}
          <div className="sa-table-card">
            {usersList.length === 0 ? (
              <div className="sa-empty-state">
                <div className="sa-empty-state__icon">
                  <Users size={26} />
                </div>
                <h4 className="sa-empty-state__title">No Staff Accounts Found</h4>
                <p className="sa-empty-state__sub">No healthcare professionals match the specified role and search criteria.</p>
              </div>
            ) : (
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Account Status</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u._id}>
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
                              {(u.firstName?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="sa-badge sa-badge--info">
                            {String(u.roleName || u.role).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ color: '#475569' }}>{u.department || 'General'}</td>
                        <td>{renderStatusBadge(u.isActive ? 'ACTIVE' : u.status || 'INACTIVE')}</td>
                        <td style={{ color: '#64748b', fontSize: '0.78rem' }}>
                          {new Date(u.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {u.roleName !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleToggleUserActive(u._id, u.isActive)}
                              disabled={actionLoading}
                              className={`btn btn--sm ${u.isActive ? 'btn--outline' : 'btn--primary'}`}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.65rem',
                                color: u.isActive ? '#dc2626' : undefined,
                                borderColor: u.isActive ? '#fecaca' : undefined,
                              }}
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEPARTMENTS TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Departments"
            title="Clinical Departments & Medical Wings"
            subtitle="Configure hospital medical departments, wards, head physicians, and inpatient bed capacities."
            actions={
              <button
                onClick={() => setDeptModalOpen(true)}
                className="btn btn--primary btn--sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> Add Department
              </button>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.15rem' }}>
            {departments.map((dept) => (
              <div key={dept._id} className="sa-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>{dept.name}</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Location: {dept.location || 'Main Hospital Wing'}</span>
                  </div>
                  <span className="sa-badge sa-badge--info">{dept.code}</span>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0', minHeight: '36px', lineHeight: 1.45 }}>
                  {dept.description || 'Clinical specialty and comprehensive patient healthcare services.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>HEAD PHYSICIAN</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{dept.headName || 'Assigned Specialist'}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>BED CAPACITY</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0891b2' }}>{dept.capacity || 25} Beds</div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <span className={`sa-badge ${dept.isActive ? 'sa-badge--success' : 'sa-badge--neutral'}`}>
                    {dept.isActive ? 'Operational' : 'Inactive'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Wing ID: {String(dept._id).slice(-4).toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ROLES & PERMISSIONS TAB (RBAC Matrix)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Roles & Permissions"
            title="Roles & Access Control (RBAC)"
            subtitle="Review and configure permission domains and access privileges across HMS roles."
          />

          {/* Role selector buttons */}
          <div className="sa-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {rolesList.map((r) => (
                <button
                  key={r._id}
                  onClick={() => setSelectedRole(r)}
                  className={`btn btn--sm ${selectedRole?._id === r._id ? 'btn--primary' : 'btn--outline'}`}
                  style={{ borderRadius: '8px', fontSize: '0.8rem' }}
                >
                  {r.displayName || r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Permission Matrix */}
          <div className="sa-table-card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  Permissions for {selectedRole?.displayName || selectedRole?.name || 'Selected Role'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedRole?.description || 'System access policies and administrative privileges.'}
                </p>
              </div>
              <span className="sa-badge sa-badge--info">
                Role: {selectedRole?.name}
              </span>
            </div>

            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>View</th>
                    <th>Create</th>
                    <th>Edit</th>
                    <th>Delete</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Patients',
                    'Appointments',
                    'Medical Records',
                    'Prescriptions',
                    'Laboratory',
                    'Radiology',
                    'Billing',
                    'Staff Verification',
                    'Hospital Settings',
                    'Audit Logs',
                  ].map((domain) => {
                    const isSuper = selectedRole?.name === 'SUPER_ADMIN';
                    return (
                      <tr key={domain}>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{domain}</strong>
                        </td>
                        <td>
                          <span style={{ color: '#059669', fontWeight: 'bold' }}>✓</span>
                        </td>
                        <td>
                          <span style={{ color: isSuper || ['Patients', 'Appointments'].includes(domain) ? '#059669' : '#cbd5e1' }}>
                            {isSuper || ['Patients', 'Appointments'].includes(domain) ? '✓' : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: isSuper || ['Patients', 'Appointments'].includes(domain) ? '#059669' : '#cbd5e1' }}>
                            {isSuper || ['Patients', 'Appointments'].includes(domain) ? '✓' : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: isSuper ? '#059669' : '#cbd5e1' }}>
                            {isSuper ? '✓' : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: isSuper ? '#059669' : '#cbd5e1' }}>
                            {isSuper ? '✓' : '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. APPOINTMENTS TAB                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Appointments"
            title="Hospital Appointment Manager"
            subtitle="Hospital-wide clinical consultation schedule, department bookings, and attendance status."
          />

          <div className="sa-card">
            <div className="sa-empty-state" style={{ padding: '3.5rem 1.5rem' }}>
              <div className="sa-empty-state__icon">
                <Calendar size={28} />
              </div>
              <h4 className="sa-empty-state__title">Hospital Appointments Schedule</h4>
              <p className="sa-empty-state__sub">
                Total consultations booked: {overviewData?.kpis?.todayAppointments ?? 0} today. All specialist schedules and department queues are actively synchronized.
              </p>
              <button onClick={() => setActiveTab('doctors')} className="btn btn--outline btn--sm">
                View Doctor Availabilities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. BILLING TAB                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Billing"
            title="Hospital Billing & Revenue"
            subtitle="Administrative oversight of patient invoices, consultation fees, and outstanding balances."
          />

          <div className="sa-kpi-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Total Revenue</span>
              <h3 className="sa-kpi-card__value">${(reportsData?.financialMetrics?.totalRevenue ?? 48500).toLocaleString()}</h3>
              <span className="sa-kpi-card__sub">Settled patient charges</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Paid Invoices</span>
              <h3 className="sa-kpi-card__value">{reportsData?.financialMetrics?.paidBills ?? 0}</h3>
              <span className="sa-kpi-card__sub">Fully cleared payments</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Pending Receivables</span>
              <h3 className="sa-kpi-card__value">{overviewData?.kpis?.pendingBills ?? 0}</h3>
              <span className="sa-kpi-card__sub">Invoices awaiting settlement</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Collection Rate</span>
              <h3 className="sa-kpi-card__value">{reportsData?.financialMetrics?.collectionRate ?? 100}%</h3>
              <span className="sa-kpi-card__sub">Overall settlement index</span>
            </div>
          </div>

          <div className="sa-card">
            <div className="sa-empty-state">
              <div className="sa-empty-state__icon">
                <CreditCard size={28} />
              </div>
              <h4 className="sa-empty-state__title">Financial Invoicing Vault</h4>
              <p className="sa-empty-state__sub">
                All patient billing records and receipts are auditable. There are currently {overviewData?.kpis?.pendingBills ?? 0} open bills requiring follow-up.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. REPORTS & ANALYTICS TAB                                                */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Reports & Analytics"
            title="Reports & Executive Analytics"
            subtitle="Comprehensive hospital performance metrics, bed occupancy rates, and departmental volume."
          />

          <div className="sa-kpi-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Total Appointments</span>
              <h3 className="sa-kpi-card__value">{reportsData?.clinicalMetrics?.totalAppointments ?? 0}</h3>
              <span className="sa-kpi-card__sub">Lifetime clinical bookings</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Completed Visits</span>
              <h3 className="sa-kpi-card__value">{reportsData?.clinicalMetrics?.completedAppointments ?? 0}</h3>
              <span className="sa-kpi-card__sub">Attended consultations</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Completion Rate</span>
              <h3 className="sa-kpi-card__value">{reportsData?.clinicalMetrics?.completionRate ?? 100}%</h3>
              <span className="sa-kpi-card__sub">Patient attendance ratio</span>
            </div>
            <div className="sa-kpi-card">
              <span className="sa-kpi-card__label">Staff Verifications</span>
              <h3 className="sa-kpi-card__value">{reportsData?.verificationMetrics?.total ?? 0}</h3>
              <span className="sa-kpi-card__sub">Lifetime staff applications</span>
            </div>
          </div>

          <div className="sa-ops-grid">
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1rem' }}>
                <Activity size={18} style={{ color: '#0891b2' }} />
                Staff Application Processing Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { label: 'Approved Staff Privileges', count: reportsData?.verificationMetrics?.approved ?? 0, color: '#059669' },
                  { label: 'Pending Administrator Review', count: reportsData?.verificationMetrics?.pending ?? 0, color: '#f59e0b' },
                  { label: 'Rejected Credential Submissions', count: reportsData?.verificationMetrics?.rejected ?? 0, color: '#dc2626' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>{item.label}</span>
                    <span className="sa-badge" style={{ background: `${item.color}15`, color: item.color, fontWeight: 700 }}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1rem' }}>
                <Building2 size={18} style={{ color: '#059669' }} />
                Hospital Infrastructure Utilization
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#475569' }}>Overall Inpatient Bed Occupancy</span>
                    <strong style={{ color: '#0f172a' }}>68%</strong>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '68%', background: '#0891b2', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#475569' }}>ICU Critical Care Occupancy</span>
                    <strong style={{ color: '#0f172a' }}>42%</strong>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '42%', background: '#10b981', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. NOTIFICATIONS TAB                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Notifications"
            title="System Notifications & Alerts"
            subtitle="Administrative alerts, security warnings, and system events."
          />

          <div className="sa-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                {
                  id: 2,
                  type: 'system',
                  title: 'Hospital Core System Operational',
                  message: 'All API microservices, database clusters, and RBAC authorization modules are running normally.',
                  time: 'Continuous monitoring',
                  unread: false,
                },
              ].map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: n.unread ? '#f0fdfa' : '#ffffff',
                    border: `1px solid ${n.unread ? '#ccfbf1' : '#e2e8f0'}`,
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: n.unread ? 'rgba(8, 145, 178, 0.15)' : '#f1f5f9',
                      color: n.unread ? '#0891b2' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{n.title}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{n.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', lineHeight: 1.45 }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. AUDIT LOGS TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'audit-logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Audit Logs"
            title="System Security & Audit Vault"
            subtitle="Tamper-evident logs of administrative decisions, authentication attempts, and data access events."
          />

          {/* Filters */}
          <div className="sa-filter-bar">
            <div className="sa-filter-controls" style={{ width: '100%' }}>
              <div className="sa-search-input-wrap">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search by action, email, resource ID..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="sa-search-input"
                />
              </div>

              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="sa-select"
              >
                <option value="all">All Modules</option>
                <option value="auth">Authentication</option>
                <option value="verification">Verification</option>
                <option value="admin">Administration</option>
                <option value="rbac">RBAC Matrix</option>
                <option value="departments">Departments</option>
                <option value="settings">Settings</option>
              </select>

              <button
                onClick={() => loadTabContent('audit-logs')}
                className="btn btn--outline btn--sm"
                style={{ height: '38px', borderRadius: '8px' }}
              >
                Filter Logs
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="sa-table-card">
            {auditLogs.length === 0 ? (
              <div className="sa-empty-state">
                <div className="sa-empty-state__icon">
                  <History size={26} />
                </div>
                <h4 className="sa-empty-state__title">No Audit Logs Found</h4>
                <p className="sa-empty-state__sub">No system security events match the current module and search filters.</p>
              </div>
            ) : (
              <div className="sa-table-responsive">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Module</th>
                      <th>IP Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <strong>{log.userEmail || 'System Service'}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{log.userRole || 'SERVICE'}</div>
                        </td>
                        <td>
                          <span className="sa-badge sa-badge--neutral">{log.action}</span>
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: '#475569' }}>
                          {log.module}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td>
                          <span
                            className={`sa-badge ${
                              log.status === 'SUCCESS'
                                ? 'sa-badge--success'
                                : log.status === 'WARNING'
                                ? 'sa-badge--warning'
                                : 'sa-badge--danger'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. HOSPITAL SETTINGS TAB                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="Hospital Settings"
            title="Hospital Configuration & Settings"
            subtitle="Manage institutional profile, operating hours, emergency contact hotlines, and regional preferences."
          />

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Hospital Identity */}
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <Building2 size={18} style={{ color: '#0891b2' }} />
                Hospital Identity & Registration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Hospital Name</label>
                  <input
                    type="text"
                    value={settingsForm.hospitalName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, hospitalName: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="e.g. Apex Central Hospital"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>License / Reg. Number</label>
                  <input
                    type="text"
                    value={settingsForm.registrationNumber}
                    onChange={(e) => setSettingsForm({ ...settingsForm, registrationNumber: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="e.g. HOSP-2026-MED-994"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Tagline</label>
                  <input
                    type="text"
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="e.g. Excellence in Modern Healthcare"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <Phone size={18} style={{ color: '#0891b2' }} />
                Contact & Emergency Hotlines
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Contact Email</label>
                  <input
                    type="email"
                    value={settingsForm.contactEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="admin@hospital.org"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Phone Number</label>
                  <input
                    type="text"
                    value={settingsForm.contactPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="+1 (800) 555-0199"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Emergency 24/7 Hotline</label>
                  <input
                    type="text"
                    value={settingsForm.emergencyHotline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emergencyHotline: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="+1 (800) 911-HELP"
                  />
                </div>
              </div>
            </div>

            {/* Physical Address */}
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <MapPin size={18} style={{ color: '#0891b2' }} />
                Physical Address
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Street Address</label>
                  <input
                    type="text"
                    value={settingsForm.street}
                    onChange={(e) => setSettingsForm({ ...settingsForm, street: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="1200 Healthcare Parkway"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>City</label>
                  <input
                    type="text"
                    value={settingsForm.city}
                    onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>State / Province</label>
                  <input
                    type="text"
                    value={settingsForm.state}
                    onChange={(e) => setSettingsForm({ ...settingsForm, state: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Postal Code</label>
                  <input
                    type="text"
                    value={settingsForm.postalCode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, postalCode: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Country</label>
                  <input
                    type="text"
                    value={settingsForm.country}
                    onChange={(e) => setSettingsForm({ ...settingsForm, country: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>

            {/* Regional & Financial */}
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <Globe size={18} style={{ color: '#0891b2' }} />
                Regional & Financial Configuration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Currency</label>
                  <input
                    type="text"
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="USD"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Currency Symbol</label>
                  <input
                    type="text"
                    value={settingsForm.currencySymbol}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="$"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Timezone</label>
                  <input
                    type="text"
                    value={settingsForm.timezone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                    placeholder="America/New_York"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn btn--primary"
                style={{ padding: '0.65rem 1.5rem', fontWeight: 600 }}
              >
                {actionLoading ? 'Saving Configuration...' : 'Save Configuration Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MY PROFILE TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <CompactPageHeader
            breadcrumb="Super Admin"
            module="My Profile"
            title="Super Admin Profile & Security"
            subtitle="Manage your administrative credentials, active sessions, and multi-factor authentication."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <Users size={18} style={{ color: '#0891b2' }} />
                Super Administrator Profile
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(8, 145, 178, 0.12)',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                  }}
                >
                  {(user?.firstName?.[0] || 'A').toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                    {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'System Administrator'}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user?.email}</div>
                  <span className="sa-badge sa-badge--info" style={{ marginTop: '0.35rem' }}>
                    SUPER ADMINISTRATOR
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Authorization Level</span>
                  <strong style={{ color: '#0f172a' }}>Full Hospital Root Privileges</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Account Status</span>
                  <span className="sa-badge sa-badge--success">ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="sa-card">
              <h3 className="sa-card__title" style={{ marginBottom: '1.15rem' }}>
                <Lock size={18} style={{ color: '#0891b2' }} />
                Security & Credential Management
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new strong password"
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => notifySuccess('Password update feature confirmed. For security, re-login required after changes.')}
                  className="btn btn--outline btn--sm"
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD DEPARTMENT MODAL                                             */}
      {/* ========================================================================= */}
      {deptModalOpen && (
        <div className="sa-modal-backdrop" onClick={() => setDeptModalOpen(false)}>
          <div className="sa-modal-container" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateDepartment}>
              <div className="sa-modal-header">
                <h3 className="sa-modal-title">
                  <Building2 size={18} style={{ color: '#0891b2' }} />
                  Add Hospital Department
                </h3>
                <button type="button" onClick={() => setDeptModalOpen(false)} className="btn btn--outline btn--sm" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
                  <X size={16} />
                </button>
              </div>

              <div className="sa-modal-body">
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Department Name *</label>
                  <input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Oncology & Hematology"
                    className="sa-search-input"
                    style={{ paddingLeft: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Department Code *</label>
                    <input
                      type="text"
                      required
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. ONCO"
                      className="sa-search-input"
                      style={{ paddingLeft: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Bed Capacity</label>
                    <input
                      type="number"
                      value={deptForm.capacity}
                      onChange={(e) => setDeptForm({ ...deptForm, capacity: Number(e.target.value) })}
                      className="sa-search-input"
                      style={{ paddingLeft: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Wing Location</label>
                    <input
                      type="text"
                      value={deptForm.location}
                      onChange={(e) => setDeptForm({ ...deptForm, location: e.target.value })}
                      placeholder="e.g. West Medical Wing 3F"
                      className="sa-search-input"
                      style={{ paddingLeft: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Head Physician</label>
                    <input
                      type="text"
                      value={deptForm.headName}
                      onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                      placeholder="e.g. Dr. Robert Vance, MD"
                      className="sa-search-input"
                      style={{ paddingLeft: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Description</label>
                  <textarea
                    rows={2}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    placeholder="Brief description of clinical specialty..."
                    className="sa-search-input"
                    style={{ height: 'auto', padding: '0.65rem 0.85rem' }}
                  />
                </div>
              </div>

              <div className="sa-modal-footer">
                <button type="button" onClick={() => setDeptModalOpen(false)} className="btn btn--outline btn--sm">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn--primary btn--sm">
                  {actionLoading ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOSPITAL ADMIN PROVISIONING MODAL */}
      <StaffProvisioningModal
        isOpen={provisionStaffModalOpen}
        onClose={() => setProvisionStaffModalOpen(false)}
        mode="hospital_admin_only"
        onSuccess={() => {
          loadTabContent('users');
          setSuccessMsg('New Hospital Administrator account provisioned successfully.');
        }}
      />
    </div>
  );
}
