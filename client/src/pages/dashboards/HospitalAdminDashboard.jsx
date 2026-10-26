/**
 * Hospital Admin Dashboard & Management Console
 * 
 * Clean, production-ready, backend-integrated Hospital Admin Portal.
 * Implements strictly the 13 primary pages/modules:
 * 
 * MAIN
 * 1. Dashboard (Overview KPI, facility parameters, recent audit events, notifications summary)
 * 2. Hospital & Branch Settings (Modular via HospitalBranchSettingsTab)
 * 3. Departments (Modular via HospitalDepartmentsTab)
 * 4. Services & Charges (Modular via HospitalServicesChargesTab)
 * 5. Users & Staff (Modular via HospitalStaffManagementTab)
 * 6. Operating Hours & Holidays (Weekly schedule & holiday calendar)
 * 7. Hospital Branding (Name, Logo, Favicon, Brand colors, Header/Footer text)
 * 8. System Configuration (Buffer, Max slots, Emergency contact, Email, Maintenance mode)
 * 9. Administrative Reports (Workload, staffing distribution, department analytics)
 * 
 * SYSTEM
 * 10. Notifications (View, read/unread, mark single read, mark all read)
 * 11. Audit Logs (Read-only historical security and administrative activity)
 * 
 * ACCOUNT
 * 12. My Profile (Personal profile view, contact update, password change)
 * 13. Settings (Personal user preferences with global ThemeProvider integration)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hospitalAdminService } from '../../services/hospitalAdmin.service';
import HospitalBranchSettingsTab from './hospitalAdmin/HospitalBranchSettingsTab';
import HospitalDepartmentsTab from './hospitalAdmin/HospitalDepartmentsTab';
import HospitalServicesChargesTab from './hospitalAdmin/HospitalServicesChargesTab';
import HospitalStaffManagementTab from './hospitalAdmin/HospitalStaffManagementTab';
import HospitalOperatingHoursHolidaysTab from './hospitalAdmin/HospitalOperatingHoursHolidaysTab';
import HospitalBrandingTab from './hospitalAdmin/HospitalBrandingTab';
import HospitalSystemConfigTab from './hospitalAdmin/HospitalSystemConfigTab';
import HospitalAdministrativeReportsTab from './hospitalAdmin/HospitalAdministrativeReportsTab';
import HospitalNotificationsTab from './hospitalAdmin/HospitalNotificationsTab';
import HospitalAuditLogsTab from './hospitalAdmin/HospitalAuditLogsTab';
import HospitalProfileTab from './hospitalAdmin/HospitalProfileTab';
import SettingsPage from '../settings/SettingsPage';
import './HospitalAdminDashboard.css';

import {
  Building2,
  CreditCard,
  Users,
  Bell,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const VALID_TABS = [
  'dashboard',
  'hospital-settings',
  'departments',
  'services-charges',
  'users',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Global state
  const [, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Dashboard State
  const [overview, setOverview] = useState(null);

  // 2. Hospital & Branch Settings State (context for currency)
  const [hospitalSettings, setHospitalSettings] = useState(null);














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
        if (res.data?.data) {
          setHospitalSettings(res.data.data);
        }
      } else if (activeTab === 'services-charges') {
        if (!hospitalSettings) {
          try {
            const sRes = await hospitalAdminService.getHospitalSettings();
            if (sRes?.data?.data) {
              setHospitalSettings(sRes.data.data);
            }
          } catch (_) {
            // graceful fallback
          }
        }
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to fetch data.', true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, hospitalSettings]);

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  return (
    <div className="ha-dashboard-container">
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
          <div className="ha-page-header">
            <div className="ha-page-header__left">
              <h1 className="ha-page-title">Administrative Dashboard</h1>
              <p className="ha-page-description">
                Hospital overview, facility capacity, operational staff distribution, and recent activity.
              </p>
            </div>
          </div>

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
                {overview?.staffSummary?.activeStaff ?? 0} active ({overview?.staffSummary?.doctorsCount ?? 0} Doctors, {overview?.staffSummary?.nursesCount ?? 0} Nurses)
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
                {overview?.departmentSummary?.activeDepartments ?? 0} active clinical wings
              </div>
            </div>

            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Service Catalogue</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">{overview?.configurationStatus?.servicesCount ?? 0}</div>
              <div className="ha-kpi-card__subtext">
                Standard charge items configured
              </div>
            </div>

            <div className="ha-kpi-card">
              <div className="ha-kpi-card__header">
                <span className="ha-kpi-card__title">Facility Branches</span>
                <div className="ha-kpi-card__icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                  <Building2 size={20} />
                </div>
              </div>
              <div className="ha-kpi-card__value">{overview?.configurationStatus?.branchesCount ?? 1}</div>
              <div className="ha-kpi-card__subtext">
                {overview?.configurationStatus?.holidaysCount ?? 0} scheduled closures
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Facility Status Card */}
            <div className="ha-panel" style={{ margin: 0 }}>
              <div className="ha-panel__header">
                <h2 className="ha-panel__title">
                  <Building2 size={18} color="#0891B2" />
                  Facility Overview
                </h2>
              </div>
              <div className="ha-panel__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hospital Name</span>
                    <strong>{overview?.configurationStatus?.hospitalName || 'Hospital Medical Center'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Configured Branches</span>
                    <strong>{overview?.configurationStatus?.branchesCount ?? 1} Active Facilities</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Operating Schedule</span>
                    <strong>{overview?.configurationStatus?.operatingHoursDays ?? 7} Days Scheduled</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Scheduled Holidays</span>
                    <strong>{overview?.configurationStatus?.holidaysCount ?? 0} Upcoming Closures</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notifications Card */}
            <div className="ha-panel" style={{ margin: 0 }}>
              <div className="ha-panel__header">
                <h2 className="ha-panel__title">
                  <Bell size={18} color="#0891B2" />
                  Administrative Alerts
                </h2>
                <button className="ha-btn ha-btn--secondary ha-btn--sm" onClick={() => setActiveTab('notifications')}>
                  View All
                </button>
              </div>
              <div className="ha-panel__body">
                {overview?.unreadNotificationsCount > 0 ? (
                  <div style={{ padding: '1rem', background: 'rgba(8, 145, 178, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(8, 145, 178, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#0891B2', fontWeight: 600 }}>
                      <Bell size={16} />
                      <span>{overview.unreadNotificationsCount} Unread Notifications</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      There are unread administrative notifications requiring your attention in the notifications center.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={24} color="#10B981" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0 }}>All administrative alerts acknowledged.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Administrative Activities */}
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
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
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
        <HospitalBranchSettingsTab onSettingsUpdated={loadActiveTabData} />
      )}

      {/* =================================================================== */}
      {/* 3. DEPARTMENTS TAB */}
      {/* =================================================================== */}
      {activeTab === 'departments' && (
        <HospitalDepartmentsTab onDepartmentChange={loadActiveTabData} />
      )}

      {/* =================================================================== */}
      {/* 4. SERVICES & CHARGES TAB */}
      {/* =================================================================== */}
      {activeTab === 'services-charges' && (
        <HospitalServicesChargesTab
          onServiceChange={loadActiveTabData}
          currencySymbol={hospitalSettings?.currencySymbol || '$'}
          currencyCode={hospitalSettings?.currency || 'USD'}
        />
      )}

      {/* =================================================================== */}
      {/* 5. USERS & STAFF TAB */}
      {/* =================================================================== */}
      {activeTab === 'users' && (
        <HospitalStaffManagementTab onStaffChange={loadActiveTabData} />
      )}


      {/* =================================================================== */}
      {/* 6. OPERATING HOURS & HOLIDAYS TAB */}
      {/* =================================================================== */}
      {activeTab === 'operating-hours' && (
        <HospitalOperatingHoursHolidaysTab onScheduleChange={loadActiveTabData} />
      )}

      {/* =================================================================== */}
      {/* 8. HOSPITAL BRANDING TAB */}
      {/* =================================================================== */}
      {activeTab === 'branding' && (
        <HospitalBrandingTab
          onBrandingChange={loadActiveTabData}
          initialHospitalName={hospitalSettings?.hospitalName}
        />
      )}

      {/* =================================================================== */}
      {/* 9. SYSTEM CONFIGURATION TAB */}
      {/* =================================================================== */}
      {activeTab === 'system-config' && (
        <HospitalSystemConfigTab onConfigChange={loadActiveTabData} />
      )}

      {/* =================================================================== */}
      {/* 10. ADMINISTRATIVE REPORTS TAB */}
      {/* =================================================================== */}
      {activeTab === 'reports' && (
        <HospitalAdministrativeReportsTab initialHospitalSettings={hospitalSettings} />
      )}

      {/* =================================================================== */}
      {/* 11. NOTIFICATIONS TAB */}
      {/* =================================================================== */}
      {activeTab === 'notifications' && (
        <HospitalNotificationsTab onNavigateTab={setActiveTab} />
      )}

      {/* =================================================================== */}
      {/* 12. AUDIT LOGS TAB */}
      {/* =================================================================== */}
      {activeTab === 'audit-logs' && (
        <HospitalAuditLogsTab />
      )}

      {/* =================================================================== */}
      {/* 13. MY PROFILE TAB */}
      {/* =================================================================== */}
      {activeTab === 'profile' && (
        <HospitalProfileTab />
      )}

      {/* =================================================================== */}
      {/* 14. SETTINGS TAB */}
      {/* =================================================================== */}
      {activeTab === 'settings' && (
        <SettingsPage />
      )}
    </div>
  );
}

