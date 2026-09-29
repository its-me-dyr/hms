/**
 * Hospital Admin Dashboard & Management Console
 * 
 * Complete implementation for the HOSPITAL_ADMIN role:
 * 1. Live Administrative KPI Dashboard
 * 2. Hospital & Branch Settings (Hospital Info, Multi-Branch Management)
 * 3. Departments Management (CRUD, status toggles, doctor & staff counts)
 * 4. Services & Charges Configuration (Catalogue CRUD, category filtering)
 * 5. Users & Staff Management (Directory, Filtering, Staff Provisioning, Status toggles)
 * 6. Roles & Permissions (Read-only matrix inspection with security boundary)
 * 7. Operating Hours & Holidays (Weekly schedule & holiday calendar)
 * 8. Hospital Branding (Name, Logo, Colors, Header/Footer banners)
 * 9. Administrative System Configuration (Buffers, Slots, Emergency numbers)
 * 10. Administrative Reports & Analytics (Real clinical, financial & departmental metrics)
 * 11. Notifications (View, Mark Read, Mark All Read)
 * 12. Audit Logs (Live security & operational audit trail)
 * 13. My Profile (Personal profile view & contact update)
 * 14. Settings (Personal user preferences)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { hospitalAdminService } from '../../services/hospitalAdmin.service';
import StaffProvisioningModal from './StaffProvisioningModal';
import './HospitalAdminDashboard.css';

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ShieldCheck,
  Clock,
  Layers,
  Settings,
  FileText,
  Bell,
  History,
  User,
  Activity,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Lock,
} from 'lucide-react';

const VALID_TABS = [
  'dashboard',
  'hospital-settings',
  'departments',
  'services-charges',
  'users',
  'roles',
  'operating-hours',
  'branding',
  'system-config',
  'reports',
  'notifications',
  'audit-logs',
  'profile',
  'settings',
];

export default function HospitalAdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Global state
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Dashboard State
  const [overview, setOverview] = useState(null);

  // 2. Hospital & Branch Settings State
  const [hospitalSettings, setHospitalSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    emergencyHotline: '',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    taxId: '',
    address: { street: '', city: '', state: '', postalCode: '', country: '' },
  });
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    id: null,
    name: '',
    code: '',
    phone: '',
    email: '',
    capacity: 50,
    isMain: false,
    address: { street: '', city: '', state: '', postalCode: '', country: '' },
  });

  // 3. Departments State
  const [departments, setDepartments] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({
    id: null,
    name: '',
    code: '',
    description: '',
    location: 'Main Medical Wing',
    capacity: 25,
    headName: '',
  });

  // 4. Services & Charges State
  const [services, setServices] = useState([]);
  const [svcSearch, setSvcSearch] = useState('');
  const [svcCategoryFilter, setSvcCategoryFilter] = useState('all');
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [svcForm, setSvcForm] = useState({
    id: null,
    code: '',
    name: '',
    category: 'Consultation',
    department: 'General Medicine',
    charge: 50,
    description: '',
  });

  // 5. Users & Staff State
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffStatusFilter, setStaffStatusFilter] = useState('all');
  const [staffSearch, setStaffSearch] = useState('');
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);

  // 6. Roles State
  const [rolesList, setRolesList] = useState([]);

  // 7. Operating Hours & Holidays State
  const [operatingHours, setOperatingHours] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', description: '' });

  // 8. Branding State
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#0891B2',
    accentColor: '#0F172A',
    headerText: 'Hospital Management System',
    footerText: '© 2026 HMS Medical Center. All rights reserved.',
  });

  // 9. System Config State
  const [systemConfigForm, setSystemConfigForm] = useState({
    appointmentBufferMinutes: 15,
    maxAppointmentsPerSlot: 3,
    emergencyContactNumber: '+1 (800) 555-0199',
    enableEmailNotifications: true,
    maintenanceMode: false,
  });

  // 10. Reports State
  const [reportsData, setReportsData] = useState(null);

  // 11. Notifications State
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // 12. Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // 13. Profile State
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: { street: '', city: '', state: '', postalCode: '', country: '' },
  });

  // 14. Settings State
  const [prefForm, setPrefForm] = useState({
    theme: 'system',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  });

  // Temporary feedback messages helper
  const showFeedback = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // Load Tab Data
  const loadActiveTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await hospitalAdminService.getDashboardOverview();
        setOverview(res.data?.data || null);
      } else if (activeTab === 'hospital-settings') {
        const res = await hospitalAdminService.getHospitalSettings();
        const data = res.data?.data;
        if (data) {
          setHospitalSettings(data);
          setSettingsForm({
            hospitalName: data.hospitalName || '',
            registrationNumber: data.registrationNumber || '',
            tagline: data.tagline || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            emergencyHotline: data.emergencyHotline || '',
            currency: data.currency || 'USD',
            currencySymbol: data.currencySymbol || '$',
            timezone: data.timezone || 'America/New_York',
            taxId: data.taxId || '',
            address: {
              street: data.address?.street || '',
              city: data.address?.city || '',
              state: data.address?.state || '',
              postalCode: data.address?.postalCode || '',
              country: data.address?.country || '',
            },
          });
        }
      } else if (activeTab === 'departments') {
        const res = await hospitalAdminService.getDepartments();
        setDepartments(res.data?.data || []);
      } else if (activeTab === 'services-charges') {
        const res = await hospitalAdminService.getServicesAndCharges();
        setServices(res.data?.data || []);
      } else if (activeTab === 'users') {
        const res = await hospitalAdminService.getUsersAndStaff({
          role: staffRoleFilter,
          status: staffStatusFilter,
          search: staffSearch,
        });
        setStaffUsers(res.data?.data?.users || []);
      } else if (activeTab === 'roles') {
        const res = await hospitalAdminService.getRolesAndPermissions();
        setRolesList(res.data?.data || []);
      } else if (activeTab === 'operating-hours') {
        const res = await hospitalAdminService.getOperatingHoursAndHolidays();
        setOperatingHours(res.data?.data?.operatingHours || []);
        setHolidays(res.data?.data?.holidays || []);
      } else if (activeTab === 'branding') {
        const res = await hospitalAdminService.getBranding();
        const b = res.data?.data;
        if (b) {
          setBrandingForm({
            logoUrl: b.logoUrl || '',
            faviconUrl: b.faviconUrl || '',
            primaryColor: b.primaryColor || '#0891B2',
            accentColor: b.accentColor || '#0F172A',
            headerText: b.headerText || 'Hospital Management System',
            footerText: b.footerText || '© 2026 HMS Medical Center. All rights reserved.',
          });
        }
      } else if (activeTab === 'system-config') {
        const res = await hospitalAdminService.getSystemConfig();
        const cfg = res.data?.data;
        if (cfg) {
          setSystemConfigForm({
            appointmentBufferMinutes: cfg.appointmentBufferMinutes ?? 15,
            maxAppointmentsPerSlot: cfg.maxAppointmentsPerSlot ?? 3,
            emergencyContactNumber: cfg.emergencyContactNumber || '+1 (800) 555-0199',
            enableEmailNotifications: cfg.enableEmailNotifications ?? true,
            maintenanceMode: cfg.maintenanceMode ?? false,
          });
        }
      } else if (activeTab === 'reports') {
        const res = await hospitalAdminService.getAdministrativeReports();
        setReportsData(res.data?.data || null);
      } else if (activeTab === 'notifications') {
        const res = await hospitalAdminService.getNotifications();
        setNotificationsList(res.data?.data?.notifications || []);
        setUnreadNotifCount(res.data?.data?.unreadCount || 0);
      } else if (activeTab === 'audit-logs') {
        const res = await hospitalAdminService.getAuditLogs({
          module: auditModuleFilter,
          search: auditSearch,
        });
        setAuditLogs(res.data?.data?.logs || []);
      } else if (activeTab === 'profile') {
        const res = await hospitalAdminService.getMyProfile();
        const p = res.data?.data;
        if (p) {
          setProfileData(p);
          setProfileForm({
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            phone: p.phone || '',
            address: {
              street: p.address?.street || '',
              city: p.address?.city || '',
              state: p.address?.state || '',
              postalCode: p.address?.postalCode || '',
              country: p.address?.country || '',
            },
          });
        }
      } else if (activeTab === 'settings') {
        if (user?.preferences) {
          setPrefForm({
            theme: user.preferences.theme || 'system',
            dateFormat: user.preferences.dateFormat || 'DD/MM/YYYY',
            timeFormat: user.preferences.timeFormat || '12h',
          });
        }
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to fetch data.', true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, staffRoleFilter, staffStatusFilter, staffSearch, auditModuleFilter, auditSearch, user]);

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  // Handlers for mutations
  const handleSaveHospitalSettings = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.updateHospitalSettings(settingsForm);
      showFeedback('Hospital settings updated successfully!');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating settings', true);
    }
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.saveBranch(branchForm);
      setBranchModalOpen(false);
      showFeedback(branchForm.id ? 'Branch updated successfully' : 'Branch added successfully');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error saving branch', true);
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to remove this branch?')) return;
    try {
      await hospitalAdminService.deleteBranch(id);
      showFeedback('Branch removed successfully');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error removing branch', true);
    }
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    try {
      if (deptForm.id) {
        await hospitalAdminService.updateDepartment(deptForm.id, deptForm);
        showFeedback('Department updated successfully');
      } else {
        await hospitalAdminService.createDepartment(deptForm);
        showFeedback('Department created successfully');
      }
      setDeptModalOpen(false);
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error saving department', true);
    }
  };

  const handleToggleDeptStatus = async (id) => {
    try {
      await hospitalAdminService.toggleDepartmentStatus(id);
      showFeedback('Department status updated');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating department status', true);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.saveServiceCharge(svcForm);
      setSvcModalOpen(false);
      showFeedback(svcForm.id ? 'Service charge updated' : 'Service charge added');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error saving service charge', true);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to remove this service?')) return;
    try {
      await hospitalAdminService.deleteServiceCharge(id);
      showFeedback('Service removed successfully');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error removing service', true);
    }
  };

  const handleToggleUserStatus = async (u) => {
    const nextActive = !u.isActive;
    try {
      await hospitalAdminService.updateUserStatus(u._id || u.id, {
        isActive: nextActive,
        status: nextActive ? 'active' : 'suspended',
      });
      showFeedback(`User ${u.firstName} is now ${nextActive ? 'Active' : 'Suspended'}`);
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating user status', true);
    }
  };

  const handleSaveOperatingHours = async () => {
    try {
      await hospitalAdminService.updateOperatingHours({ operatingHours });
      showFeedback('Operating hours updated successfully');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating operating hours', true);
    }
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.saveHoliday(holidayForm);
      setHolidayModalOpen(false);
      setHolidayForm({ name: '', date: '', description: '' });
      showFeedback('Holiday added successfully');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error adding holiday', true);
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await hospitalAdminService.deleteHoliday(id);
      showFeedback('Holiday removed');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error removing holiday', true);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.updateBranding(brandingForm);
      showFeedback('Hospital branding updated successfully');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating branding', true);
    }
  };

  const handleSaveSystemConfig = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.updateSystemConfig(systemConfigForm);
      showFeedback('System configuration saved');
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error saving configuration', true);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await hospitalAdminService.markAllNotificationsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
      showFeedback('All notifications marked as read');
    } catch (err) {
      showFeedback('Error marking notifications read', true);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await hospitalAdminService.updateMyProfile(profileForm);
      showFeedback('Profile updated successfully');
      loadActiveTabData();
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Error updating profile', true);
    }
  };

  return (
    <div className="ha-dashboard-container">
      {/* Top Banner */}
      <div className="ha-banner">
        <div>
          <h1 className="ha-banner__title">Hospital Administration Console</h1>
          <p className="ha-banner__subtitle">
            Operational governance, staff provisioning, service charges & facility parameters
          </p>
        </div>
        <div className="ha-banner__actions">
          <button
            className="ha-btn ha-btn--secondary ha-btn--sm"
            onClick={loadActiveTabData}
            disabled={loading}
            title="Refresh current data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="ha-btn ha-btn--primary ha-btn--sm"
            onClick={() => setProvisionModalOpen(true)}
          >
            <Plus size={14} />
            Provision Staff
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="ha-alert ha-alert--success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="ha-alert ha-alert--error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. DASHBOARD TAB */}
      {/* =================================================================== */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="ha-kpi-grid">
            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Total Hospital Staff</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891B2' }}>
                  <Users size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">{overview?.staffSummary?.totalStaff ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                {overview?.staffSummary?.activeStaff ?? 0} active accounts ({overview?.staffSummary?.doctorsCount ?? 0} Doctors, {overview?.staffSummary?.nursesCount ?? 0} Nurses)
              </div>
            </div>

            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Departments</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                  <Building2 size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">{overview?.departmentSummary?.totalDepartments ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                {overview?.departmentSummary?.activeDepartments ?? 0} operational clinical wings
              </div>
            </div>

            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Clinical Appointments</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                  <Calendar size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">{overview?.operationalSummary?.totalAppointments ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                {overview?.operationalSummary?.completedAppointments ?? 0} completed ({overview?.operationalSummary?.completionRate ?? 100}% completion)
              </div>
            </div>

            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Hospital Revenue</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">${(overview?.financialSummary?.totalRevenue ?? 0).toLocaleString()}</div>
              <div className="ha-kpi-card__subtext">
                {overview?.financialSummary?.totalBills ?? 0} total invoices generated
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Facility Status Card */}
            <div className="ha-panel" style={{ margin: 0 }}>
              <div className="ha-panel__header">
                <h2 className="ha-panel__title">
                  <Building2 size={18} color="#0891B2" />
                  Facility Configuration Status
                </h2>
                <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setActiveTab('hospital-settings')}>
                  Configure
                </button>
              </div>
              <div className="ha-panel__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Hospital Name</span>
                    <strong>{overview?.configurationStatus?.hospitalName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Configured Branches</span>
                    <strong>{overview?.configurationStatus?.branchesCount} Active Facilities</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Standard Charge Items</span>
                    <strong>{overview?.configurationStatus?.servicesCount} Configured Services</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Scheduled Holidays</span>
                    <strong>{overview?.configurationStatus?.holidaysCount} Upcoming Closures</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="ha-panel" style={{ margin: 0 }}>
              <div className="ha-panel__header">
                <h2 className="ha-panel__title">
                  <Activity size={18} color="#0891B2" />
                  Administrative Shortcuts
                </h2>
              </div>
              <div className="ha-panel__body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <button
                    className="ha-btn ha-btn--secondary"
                    style={{ flexDirection: 'column', padding: '1rem', height: 'auto' }}
                    onClick={() => setProvisionModalOpen(true)}
                  >
                    <Users size={20} color="#0891B2" />
                    <span>Provision Staff</span>
                  </button>
                  <button
                    className="ha-btn ha-btn--secondary"
                    style={{ flexDirection: 'column', padding: '1rem', height: 'auto' }}
                    onClick={() => setActiveTab('departments')}
                  >
                    <Building2 size={20} color="#10B981" />
                    <span>Departments</span>
                  </button>
                  <button
                    className="ha-btn ha-btn--secondary"
                    style={{ flexDirection: 'column', padding: '1rem', height: 'auto' }}
                    onClick={() => setActiveTab('services-charges')}
                  >
                    <CreditCard size={20} color="#F59E0B" />
                    <span>Charges Catalog</span>
                  </button>
                  <button
                    className="ha-btn ha-btn--secondary"
                    style={{ flexDirection: 'column', padding: '1rem', height: 'auto' }}
                    onClick={() => setActiveTab('reports')}
                  >
                    <FileText size={20} color="#6366F1" />
                    <span>View Reports</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Audit Activities */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <History size={18} color="#0891B2" />
                Recent Administrative & Security Events
              </h2>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setActiveTab('audit-logs')}>
                Full Audit Trail
              </button>
            </div>
            <div className="ha-table-container">
              <table className="ha-table">
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
                  {overview?.recentAuditLogs?.length > 0 ? (
                    overview.recentAuditLogs.map((log) => (
                      <tr key={log._id}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>{log.userEmail}</td>
                        <td>
                          <span className="ha-badge ha-badge--info">{log.userRole}</span>
                        </td>
                        <td><strong>{log.action}</strong></td>
                        <td>{log.module}</td>
                        <td>
                          <span className={`ha-badge ${log.status === 'SUCCESS' ? 'ha-badge--success' : 'ha-badge--danger'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                        No recent audit records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. HOSPITAL & BRANCH SETTINGS TAB */}
      {/* =================================================================== */}
      {activeTab === 'hospital-settings' && (
        <div>
          {/* Hospital General Parameters */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Building2 size={18} color="#0891B2" />
                Hospital Center Parameters
              </h2>
            </div>
            <div className="ha-panel__body">
              <form onSubmit={handleSaveHospitalSettings}>
                <div className="ha-form-grid" style={{ marginBottom: '1.25rem' }}>
                  <div className="ha-form-group">
                    <label>Hospital Full Legal Name *</label>
                    <input
                      type="text"
                      value={settingsForm.hospitalName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hospitalName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>License / Registration Number</label>
                    <input
                      type="text"
                      value={settingsForm.registrationNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, registrationNumber: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Hospital Tagline</label>
                    <input
                      type="text"
                      value={settingsForm.tagline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Administrative Contact Email *</label>
                    <input
                      type="email"
                      value={settingsForm.contactEmail}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Official Phone Number</label>
                    <input
                      type="text"
                      value={settingsForm.contactPhone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Emergency 24/7 Hotline</label>
                    <input
                      type="text"
                      value={settingsForm.emergencyHotline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, emergencyHotline: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Currency Code</label>
                    <input
                      type="text"
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Currency Symbol</label>
                    <input
                      type="text"
                      value={settingsForm.currencySymbol}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Timezone</label>
                    <input
                      type="text"
                      value={settingsForm.timezone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Tax Identification ID</label>
                    <input
                      type="text"
                      value={settingsForm.taxId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taxId: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="ha-btn ha-btn--primary">
                    Save Hospital Parameters
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Branches & Facilities */}
          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Building2 size={18} color="#0891B2" />
                Hospital Branches & Facilities
              </h2>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => {
                  setBranchForm({
                    id: null,
                    name: '',
                    code: '',
                    phone: '',
                    email: '',
                    capacity: 50,
                    isMain: false,
                    address: { street: '', city: '', state: '', postalCode: '', country: '' },
                  });
                  setBranchModalOpen(true);
                }}
              >
                <Plus size={14} /> Add Branch
              </button>
            </div>
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Phone / Contact</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalSettings?.branches?.length > 0 ? (
                    hospitalSettings.branches.map((b) => (
                      <tr key={b._id}>
                        <td><strong>{b.name}</strong></td>
                        <td><code>{b.code}</code></td>
                        <td>
                          {b.isMain ? (
                            <span className="ha-badge ha-badge--info">Main Campus</span>
                          ) : (
                            <span className="ha-badge ha-badge--secondary">Satellite</span>
                          )}
                        </td>
                        <td>{b.phone || b.email || '—'}</td>
                        <td>{b.capacity} beds</td>
                        <td>
                          <span className={`ha-badge ${b.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="ha-btn ha-btn--secondary ha-btn--sm"
                              onClick={() => {
                                setBranchForm({
                                  id: b._id,
                                  name: b.name,
                                  code: b.code,
                                  phone: b.phone || '',
                                  email: b.email || '',
                                  capacity: b.capacity || 50,
                                  isMain: Boolean(b.isMain),
                                  address: b.address || { street: '', city: '', state: '', postalCode: '', country: '' },
                                });
                                setBranchModalOpen(true);
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                            {!b.isMain && (
                              <button
                                className="ha-btn ha-btn--danger ha-btn--sm"
                                onClick={() => handleDeleteBranch(b._id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                        No branch facilities registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. DEPARTMENTS TAB */}
      {/* =================================================================== */}
      {activeTab === 'departments' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Building2 size={18} color="#0891B2" />
              Clinical & Administrative Departments ({departments.length})
            </h2>
            <div className="ha-toolbar">
              <div className="ha-search-box">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                />
              </div>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => {
                  setDeptForm({
                    id: null,
                    name: '',
                    code: '',
                    description: '',
                    location: 'Main Medical Wing',
                    capacity: 25,
                    headName: '',
                  });
                  setDeptModalOpen(true);
                }}
              >
                <Plus size={14} /> Add Department
              </button>
            </div>
          </div>
          <div className="ha-table-container">
            <table className="ha-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Head Specialist</th>
                  <th>Capacity</th>
                  <th>Doctors</th>
                  <th>Total Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments
                  .filter((d) =>
                    d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
                    d.code.toLowerCase().includes(deptSearch.toLowerCase())
                  )
                  .map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        {d.description && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            {d.description}
                          </div>
                        )}
                      </td>
                      <td><code>{d.code}</code></td>
                      <td>{d.location}</td>
                      <td>{d.headName || '—'}</td>
                      <td>{d.capacity} beds</td>
                      <td><span className="ha-badge ha-badge--info">{d.doctorsCount}</span></td>
                      <td><span className="ha-badge ha-badge--secondary">{d.staffCount}</span></td>
                      <td>
                        <span className={`ha-badge ${d.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="ha-btn ha-btn--secondary ha-btn--sm"
                            onClick={() => {
                              setDeptForm({
                                id: d.id,
                                name: d.name,
                                code: d.code,
                                description: d.description || '',
                                location: d.location || '',
                                capacity: d.capacity || 25,
                                headName: d.headName || '',
                              });
                              setDeptModalOpen(true);
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className={`ha-btn ha-btn--sm ${d.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                            onClick={() => handleToggleDeptStatus(d.id)}
                          >
                            {d.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. SERVICES & CHARGES TAB */}
      {/* =================================================================== */}
      {activeTab === 'services-charges' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <CreditCard size={18} color="#0891B2" />
              Service & Charge Configuration Catalogue ({services.length})
            </h2>
            <div className="ha-toolbar">
              <select
                className="ha-select"
                value={svcCategoryFilter}
                onChange={(e) => setSvcCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Consultation">Consultation</option>
                <option value="Diagnostic">Diagnostic</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Surgery">Surgery</option>
                <option value="Emergency">Emergency</option>
                <option value="General">General</option>
              </select>
              <div className="ha-search-box">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search service..."
                  value={svcSearch}
                  onChange={(e) => setSvcSearch(e.target.value)}
                />
              </div>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => {
                  setSvcForm({
                    id: null,
                    code: '',
                    name: '',
                    category: 'Consultation',
                    department: 'General Medicine',
                    charge: 50,
                    description: '',
                  });
                  setSvcModalOpen(true);
                }}
              >
                <Plus size={14} /> Add Service
              </button>
            </div>
          </div>
          <div className="ha-table-container">
            <table className="ha-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Service Name</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Standard Charge</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((s) => {
                    const matchesCategory = svcCategoryFilter === 'all' || s.category === svcCategoryFilter;
                    const matchesSearch =
                      s.name.toLowerCase().includes(svcSearch.toLowerCase()) ||
                      s.code.toLowerCase().includes(svcSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map((s) => (
                    <tr key={s._id}>
                      <td><code>{s.code}</code></td>
                      <td>
                        <strong>{s.name}</strong>
                        {s.description && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td><span className="ha-badge ha-badge--info">{s.category}</span></td>
                      <td>{s.department || 'All Departments'}</td>
                      <td><strong>${Number(s.charge).toFixed(2)}</strong></td>
                      <td>
                        <span className={`ha-badge ${s.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="ha-btn ha-btn--secondary ha-btn--sm"
                            onClick={() => {
                              setSvcForm({
                                id: s._id,
                                code: s.code,
                                name: s.name,
                                category: s.category || 'General',
                                department: s.department || '',
                                charge: s.charge,
                                description: s.description || '',
                              });
                              setSvcModalOpen(true);
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="ha-btn ha-btn--danger ha-btn--sm"
                            onClick={() => handleDeleteService(s._id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. USERS & STAFF TAB */}
      {/* =================================================================== */}
      {activeTab === 'users' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Users size={18} color="#0891B2" />
              Hospital Staff & Personnel Directory ({staffUsers.length})
            </h2>
            <div className="ha-toolbar">
              <select
                className="ha-select"
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="LAB_TECH">Lab Technician</option>
                <option value="RADIOLOGY_STAFF">Radiology Staff</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="BILLING_STAFF">Billing Staff</option>
              </select>
              <select
                className="ha-select"
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
              <div className="ha-search-box">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search staff name/email..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => setProvisionModalOpen(true)}
              >
                <Plus size={14} /> Provision Staff
              </button>
            </div>
          </div>
          <div className="ha-table-container">
            <table className="ha-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Specialization / License</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((u) => (
                  <tr key={u.id || u._id}>
                    <td><strong>{u.firstName} {u.lastName}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="ha-badge ha-badge--info">
                        {u.roleName || u.role?.name}
                      </span>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>{u.specialization || u.licenseNumber || '—'}</td>
                    <td>
                      <span className={`ha-badge ${u.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {u.roleName !== 'SUPER_ADMIN' && u.roleName !== 'HOSPITAL_ADMIN' ? (
                        <button
                          className={`ha-btn ha-btn--sm ${u.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                          onClick={() => handleToggleUserStatus(u)}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. ROLES & PERMISSIONS TAB */}
      {/* =================================================================== */}
      {activeTab === 'roles' && (
        <div>
          <div className="ha-alert ha-alert--success" style={{ background: '#f0fdfa', borderColor: '#ccfbf1', color: '#0f766e' }}>
            <Lock size={16} />
            <span>
              Role-Based Access Control Matrix is managed under institutional governance. Hospital Admins have read-only visibility into operational permission maps.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {rolesList.map((r) => (
              <div key={r.id} className="ha-panel" style={{ margin: 0 }}>
                <div className="ha-panel__header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{r.displayName}</h3>
                    <code style={{ fontSize: '0.75rem', color: '#0891B2' }}>{r.name}</code>
                  </div>
                  <span className="ha-badge ha-badge--info">{r.userCount} Accounts</span>
                </div>
                <div className="ha-panel__body">
                  <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 0.75rem 0' }}>
                    {r.description || 'Institutional operational role.'}
                  </p>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                      ASSIGNED PERMISSIONS:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {r.permissions?.map((p, idx) => (
                        <span key={idx} className="ha-badge ha-badge--secondary" style={{ fontSize: '0.7rem' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. OPERATING HOURS & HOLIDAYS TAB */}
      {/* =================================================================== */}
      {activeTab === 'operating-hours' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Weekly Hours */}
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Clock size={18} color="#0891B2" />
                Weekly Operating Schedule
              </h2>
              <button className="ha-btn ha-btn--primary ha-btn--sm" onClick={handleSaveOperatingHours}>
                Save Schedule
              </button>
            </div>
            <div className="ha-panel__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {operatingHours.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '0.5rem',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 600, minWidth: '90px' }}>{h.day}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        style={{ width: '90px', padding: '0.3rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        value={h.openTime}
                        disabled={h.isClosed}
                        onChange={(e) => {
                          const updated = [...operatingHours];
                          updated[i].openTime = e.target.value;
                          setOperatingHours(updated);
                        }}
                      />
                      <span>to</span>
                      <input
                        type="text"
                        style={{ width: '90px', padding: '0.3rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        value={h.closeTime}
                        disabled={h.isClosed}
                        onChange={(e) => {
                          const updated = [...operatingHours];
                          updated[i].closeTime = e.target.value;
                          setOperatingHours(updated);
                        }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={h.isClosed}
                          onChange={(e) => {
                            const updated = [...operatingHours];
                            updated[i].isClosed = e.target.checked;
                            setOperatingHours(updated);
                          }}
                        />
                        Closed
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Holidays */}
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Calendar size={18} color="#0891B2" />
                Hospital Holidays & Closures
              </h2>
              <button
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => setHolidayModalOpen(true)}
              >
                <Plus size={14} /> Add Holiday
              </button>
            </div>
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th>Holiday</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.length > 0 ? (
                    holidays.map((h) => (
                      <tr key={h._id}>
                        <td>
                          <strong>{h.name}</strong>
                          {h.description && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{h.description}</div>
                          )}
                        </td>
                        <td><code>{h.date}</code></td>
                        <td>
                          <button
                            className="ha-btn ha-btn--danger ha-btn--sm"
                            onClick={() => handleDeleteHoliday(h._id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>
                        No holiday dates registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. HOSPITAL BRANDING TAB */}
      {/* =================================================================== */}
      {activeTab === 'branding' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Layers size={18} color="#0891B2" />
                Hospital Branding Configuration
              </h2>
            </div>
            <div className="ha-panel__body">
              <form onSubmit={handleSaveBranding}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="ha-form-group">
                    <label>Logo Asset URL</label>
                    <input
                      type="text"
                      placeholder="https://... or /logo.png"
                      value={brandingForm.logoUrl}
                      onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Favicon Asset URL</label>
                    <input
                      type="text"
                      placeholder="https://... or /favicon.ico"
                      value={brandingForm.faviconUrl}
                      onChange={(e) => setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Primary Brand Theme Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="color"
                        style={{ width: '45px', height: '36px', padding: '0.1rem', cursor: 'pointer' }}
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      />
                      <input
                        type="text"
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="ha-form-group">
                    <label>Accent Dark Theme Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="color"
                        style={{ width: '45px', height: '36px', padding: '0.1rem', cursor: 'pointer' }}
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      />
                      <input
                        type="text"
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="ha-form-group">
                    <label>Header Display Title</label>
                    <input
                      type="text"
                      value={brandingForm.headerText}
                      onChange={(e) => setBrandingForm({ ...brandingForm, headerText: e.target.value })}
                    />
                  </div>
                  <div className="ha-form-group">
                    <label>Footer Copyright Statement</label>
                    <input
                      type="text"
                      value={brandingForm.footerText}
                      onChange={(e) => setBrandingForm({ ...brandingForm, footerText: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="ha-btn ha-btn--primary">
                    Update Branding
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">Live Visual Preview</h2>
            </div>
            <div className="ha-panel__body">
              <div
                style={{
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    backgroundColor: brandingForm.primaryColor,
                    color: '#ffffff',
                    padding: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {brandingForm.headerText || 'Hospital Name Header'}
                </div>
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ color: brandingForm.accentColor, fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    Healthcare Excellence & Clinical Trust
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                    Sample patient portal interface rendered with primary theme {brandingForm.primaryColor}.
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: brandingForm.accentColor,
                    color: '#e2e8f0',
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  {brandingForm.footerText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 9. SYSTEM CONFIGURATION TAB */}
      {/* =================================================================== */}
      {activeTab === 'system-config' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Settings size={18} color="#0891B2" />
              Administrative Operational System Configuration
            </h2>
          </div>
          <div className="ha-panel__body">
            <form onSubmit={handleSaveSystemConfig}>
              <div className="ha-form-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="ha-form-group">
                  <label>Appointment Buffer (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={systemConfigForm.appointmentBufferMinutes}
                    onChange={(e) => setSystemConfigForm({ ...systemConfigForm, appointmentBufferMinutes: e.target.value })}
                  />
                  <small style={{ color: '#64748b' }}>Buffer duration scheduled between consultations</small>
                </div>
                <div className="ha-form-group">
                  <label>Max Appointments per Slot</label>
                  <input
                    type="number"
                    min="1"
                    value={systemConfigForm.maxAppointmentsPerSlot}
                    onChange={(e) => setSystemConfigForm({ ...systemConfigForm, maxAppointmentsPerSlot: e.target.value })}
                  />
                  <small style={{ color: '#64748b' }}>Maximum concurrent bookings permitted</small>
                </div>
                <div className="ha-form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={systemConfigForm.emergencyContactNumber}
                    onChange={(e) => setSystemConfigForm({ ...systemConfigForm, emergencyContactNumber: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={systemConfigForm.enableEmailNotifications}
                    onChange={(e) => setSystemConfigForm({ ...systemConfigForm, enableEmailNotifications: e.target.checked })}
                  />
                  <span>Enable automated transactional email notifications (appointments, lab alerts, billing)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#b91c1c' }}>
                  <input
                    type="checkbox"
                    checked={systemConfigForm.maintenanceMode}
                    onChange={(e) => setSystemConfigForm({ ...systemConfigForm, maintenanceMode: e.target.checked })}
                  />
                  <span>Enable Hospital Administrative Maintenance Mode (restricts routine scheduling)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="ha-btn ha-btn--primary">
                  Save System Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 10. ADMINISTRATIVE REPORTS TAB */}
      {/* =================================================================== */}
      {activeTab === 'reports' && (
        <div>
          <div className="ha-kpi-grid">
            <div className="ha-kpi-card">
              <div className="ha-kpi-card__title">Total Consultations</div>
              <div className="ha-kpi-card__value">{reportsData?.clinicalMetrics?.totalAppointments ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                {reportsData?.clinicalMetrics?.completedAppointments ?? 0} completed ({reportsData?.clinicalMetrics?.completionRate ?? 100}% rate)
              </div>
            </div>
            <div className="ha-kpi-card">
              <div className="ha-kpi-card__title">Cancelled Appointments</div>
              <div className="ha-kpi-card__value" style={{ color: '#ef4444' }}>
                {reportsData?.clinicalMetrics?.cancelledAppointments ?? 0}
              </div>
              <div className="ha-kpi-card__subtext">Cancelled or discontinued visits</div>
            </div>
            <div className="ha-kpi-card">
              <div className="ha-kpi-card__title">Total Hospital Invoices</div>
              <div className="ha-kpi-card__value">{reportsData?.financialMetrics?.totalBills ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                {reportsData?.financialMetrics?.paidBills ?? 0} settled ({reportsData?.financialMetrics?.collectionRate ?? 100}% collection)
              </div>
            </div>
            <div className="ha-kpi-card">
              <div className="ha-kpi-card__title">Total Collected Revenue</div>
              <div className="ha-kpi-card__value" style={{ color: '#10b981' }}>
                ${(reportsData?.financialMetrics?.totalRevenue ?? 0).toLocaleString()}
              </div>
              <div className="ha-kpi-card__subtext">Verified financial income</div>
            </div>
          </div>

          <div className="ha-panel">
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Building2 size={18} color="#0891B2" />
                Departmental Clinical Workload & Staffing
              </h2>
            </div>
            <div className="ha-table-container">
              <table className="ha-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Bed Capacity</th>
                    <th>Doctors Active</th>
                    <th>Total Staff</th>
                    <th>Appointments Load</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData?.departmentAnalytics?.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td><code>{d.code}</code></td>
                      <td>{d.capacity} beds</td>
                      <td><span className="ha-badge ha-badge--info">{d.doctorCount} Doctors</span></td>
                      <td><span className="ha-badge ha-badge--secondary">{d.staffCount} Staff</span></td>
                      <td><strong>{d.appointmentCount} Visits</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 11. NOTIFICATIONS TAB */}
      {/* =================================================================== */}
      {activeTab === 'notifications' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Bell size={18} color="#0891B2" />
              Administrative Alerts & Operational Notifications ({notificationsList.length})
            </h2>
            {unreadNotifCount > 0 && (
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={handleMarkAllNotifsRead}>
                Mark All as Read
              </button>
            )}
          </div>
          <div>
            {notificationsList.length > 0 ? (
              notificationsList.map((n) => (
                <div key={n._id} className={`ha-notif-item ${!n.isRead ? 'ha-notif-item--unread' : ''}`}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '0.2rem', color: '#0891B2' }}>
                      <Bell size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.875rem' }}>{n.title}</strong>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8125rem', color: '#334155' }}>{n.message}</p>
                      <small style={{ color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="ha-badge ha-badge--warning">Unread</span>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                No notifications delivered to administrative inbox.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 12. AUDIT LOGS TAB */}
      {/* =================================================================== */}
      {activeTab === 'audit-logs' && (
        <div className="ha-panel">
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <History size={18} color="#0891B2" />
              Hospital Audit Trail & Security Ledger
            </h2>
            <div className="ha-toolbar">
              <select
                className="ha-select"
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
              >
                <option value="all">All Modules</option>
                <option value="admin">Admin</option>
                <option value="user_management">User Management</option>
                <option value="billing">Billing</option>
                <option value="rbac">RBAC</option>
                <option value="auth">Auth</option>
              </select>
              <div className="ha-search-box">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search user, action, ip..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="ha-table-container">
            <table className="ha-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User / Initiator</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.userEmail}</td>
                    <td><span className="ha-badge ha-badge--info">{log.userRole}</span></td>
                    <td><code>{log.action}</code></td>
                    <td>{log.module}</td>
                    <td>
                      <span className={`ha-badge ${log.status === 'SUCCESS' ? 'ha-badge--success' : 'ha-badge--danger'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 13. MY PROFILE TAB */}
      {/* =================================================================== */}
      {activeTab === 'profile' && (
        <div className="ha-panel" style={{ maxWidth: '700px' }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <User size={18} color="#0891B2" />
              Hospital Administrator Profile
            </h2>
          </div>
          <div className="ha-panel__body">
            <form onSubmit={handleSaveProfile}>
              <div className="ha-form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="ha-form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label>Official Email (Read-Only)</label>
                  <input type="text" value={profileData?.email || user?.email} disabled />
                </div>
                <div className="ha-form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="ha-btn ha-btn--primary">
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 14. SETTINGS TAB */}
      {/* =================================================================== */}
      {activeTab === 'settings' && (
        <div className="ha-panel" style={{ maxWidth: '600px' }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Settings size={18} color="#0891B2" />
              Personal Interface Preferences
            </h2>
          </div>
          <div className="ha-panel__body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ha-form-group">
                <label>Theme Display</label>
                <select
                  value={prefForm.theme}
                  onChange={(e) => setPrefForm({ ...prefForm, theme: e.target.value })}
                >
                  <option value="system">System Default</option>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
              <div className="ha-form-group">
                <label>Date Format</label>
                <select
                  value={prefForm.dateFormat}
                  onChange={(e) => setPrefForm({ ...prefForm, dateFormat: e.target.value })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="ha-form-group">
                <label>Time Format</label>
                <select
                  value={prefForm.timeFormat}
                  onChange={(e) => setPrefForm({ ...prefForm, timeFormat: e.target.value })}
                >
                  <option value="12h">12-Hour (AM/PM)</option>
                  <option value="24h">24-Hour Military</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--primary"
                  onClick={() => showFeedback('Interface preferences saved')}
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS */}
      {/* =================================================================== */}

      {/* Branch Modal */}
      {branchModalOpen && (
        <div className="ha-modal-overlay">
          <div className="ha-modal">
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">{branchForm.id ? 'Edit Branch' : 'Add Hospital Branch'}</h3>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setBranchModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBranch}>
              <div className="ha-modal__body">
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Unique Branch Code *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Bed Capacity</label>
                  <input
                    type="number"
                    value={branchForm.capacity}
                    onChange={(e) => setBranchForm({ ...branchForm, capacity: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={branchForm.isMain}
                      onChange={(e) => setBranchForm({ ...branchForm, isMain: e.target.checked })}
                    />
                    <span>Designate as Main Hospital Facility</span>
                  </label>
                </div>
              </div>
              <div className="ha-modal__footer">
                <button type="button" className="ha-btn ha-btn--secondary" onClick={() => setBranchModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ha-btn ha-btn--primary">
                  {branchForm.id ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {deptModalOpen && (
        <div className="ha-modal-overlay">
          <div className="ha-modal">
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">{deptForm.id ? 'Edit Department' : 'Create Department'}</h3>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setDeptModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div className="ha-modal__body">
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Department Name *</label>
                  <input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Unique Code *</label>
                  <input
                    type="text"
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Location / Wing</label>
                  <input
                    type="text"
                    value={deptForm.location}
                    onChange={(e) => setDeptForm({ ...deptForm, location: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Head of Department Name</label>
                  <input
                    type="text"
                    value={deptForm.headName}
                    onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Bed / Patient Capacity</label>
                  <input
                    type="number"
                    value={deptForm.capacity}
                    onChange={(e) => setDeptForm({ ...deptForm, capacity: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="ha-modal__footer">
                <button type="button" className="ha-btn ha-btn--secondary" onClick={() => setDeptModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ha-btn ha-btn--primary">
                  {deptForm.id ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Charge Modal */}
      {svcModalOpen && (
        <div className="ha-modal-overlay">
          <div className="ha-modal">
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">{svcForm.id ? 'Edit Service Charge' : 'Add Service Charge Item'}</h3>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setSvcModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveService}>
              <div className="ha-modal__body">
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Service Code *</label>
                  <input
                    type="text"
                    required
                    value={svcForm.code}
                    onChange={(e) => setSvcForm({ ...svcForm, code: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Service Name *</label>
                  <input
                    type="text"
                    required
                    value={svcForm.name}
                    onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Category</label>
                  <select
                    value={svcForm.category}
                    onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })}
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Emergency">Emergency</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Standard Charge Amount ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={svcForm.charge}
                    onChange={(e) => setSvcForm({ ...svcForm, charge: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    value={svcForm.description}
                    onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="ha-modal__footer">
                <button type="button" className="ha-btn ha-btn--secondary" onClick={() => setSvcModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ha-btn ha-btn--primary">
                  {svcForm.id ? 'Save Service' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {holidayModalOpen && (
        <div className="ha-modal-overlay">
          <div className="ha-modal" style={{ maxWidth: '450px' }}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title">Add Holiday / Closure</h3>
              <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setHolidayModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveHoliday}>
              <div className="ha-modal__body">
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Holiday Name *</label>
                  <input
                    type="text"
                    required
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  />
                </div>
                <div className="ha-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  />
                </div>
                <div className="ha-form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="ha-modal__footer">
                <button type="button" className="ha-btn ha-btn--secondary" onClick={() => setHolidayModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="ha-btn ha-btn--primary">
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Provisioning Modal (Reusing core provisioning architecture) */}
      <StaffProvisioningModal
        isOpen={provisionModalOpen}
        onClose={() => setProvisionModalOpen(false)}
        onSuccess={() => {
          showFeedback('Staff member successfully provisioned!');
          loadActiveTabData();
        }}
        mode="staff_only"
        allowHospitalAdminRole={false}
      />
    </div>
  );
}
