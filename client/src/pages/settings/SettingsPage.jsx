/**
 * Master Settings Page Component
 * 
 * Central controller for all system settings sections:
 * 1. Appearance (Light / Dark / System Default)
 * 2. Notifications (Email, Appointments, System, Billing, Reminders, Operational)
 * 3. Account & Security (Profile Metadata, Change Password)
 * 4. Profile Preferences (Language, Date/Time Representation)
 * 5. Privacy & Security (Active Session, Encryption, HIPAA Compliance)
 * 6. Hospital Settings (Admin-Only: Institutional Metadata, Policies, Hotlines)
 */

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { normalizeRoleKey } from '../dashboards/roleNavigation';

import AppearanceSettings from './sections/AppearanceSettings';
import NotificationSettings from './sections/NotificationSettings';
import AccountSecuritySettings from './sections/AccountSecuritySettings';
import ProfilePreferences from './sections/ProfilePreferences';
import PrivacySecuritySettings from './sections/PrivacySecuritySettings';
import AdminSystemSettings from './sections/AdminSystemSettings';

import {
  Palette,
  Bell,
  Key,
  Globe,
  ShieldCheck,
  Building2,
  Settings,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const roleKey = normalizeRoleKey(user?.role);
  const isAdmin = roleKey === 'super_admin' || roleKey === 'hospital_admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'appearance';

  const setSection = useCallback((sectionId) => {
    setSearchParams({ section: sectionId });
  }, [setSearchParams]);

  const navItems = [
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Themes & Visual Contrast' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & Dispatch Rules' },
    { id: 'account', label: 'Account & Security', icon: Key, desc: 'Credentials & Password' },
    { id: 'preferences', label: 'Profile Preferences', icon: Globe, desc: 'Language, Date & Time' },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck, desc: 'HIPAA & Active Session' },
    ...(isAdmin
      ? [{ id: 'admin', label: 'Hospital Settings', icon: Building2, desc: 'Institutional Config' }]
      : []),
  ];

  // If non-admin tries to access admin section, revert to appearance
  useEffect(() => {
    if (activeSection === 'admin' && !isAdmin) {
      setSection('appearance');
    }
  }, [activeSection, isAdmin, setSection]);

  return (
    <div className="settings-page-wrapper">
      {/* Settings Master Header */}
      <div className="settings-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="settings-page-icon-badge">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="settings-page-title">Application Settings</h1>
            <p className="settings-page-subtitle">
              Configure your personal workspace, clinical dispatch alerts, and institutional preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Navigation (Dropdown / Horizontal Pills) */}
      <div className="settings-mobile-nav">
        <label className="settings-label" htmlFor="settings-mobile-select" style={{ fontSize: '0.8rem' }}>
          Settings Section
        </label>
        <select
          id="settings-mobile-select"
          className="settings-select"
          value={activeSection}
          onChange={(e) => setSection(e.target.value)}
        >
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} — {item.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Main Settings Master Layout */}
      <div className="settings-layout-grid">
        {/* Left Settings Sidebar Navigation */}
        <aside className="settings-sidebar-nav" aria-label="Settings navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`settings-nav-btn ${isActive ? 'settings-nav-btn--active' : ''}`}
                onClick={() => setSection(item.id)}
              >
                <div className="settings-nav-btn__icon">
                  <Icon size={18} />
                </div>
                <div className="settings-nav-btn__text">
                  <span className="settings-nav-btn__label">{item.label}</span>
                  <span className="settings-nav-btn__desc">{item.desc}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right Settings Content Area */}
        <main className="settings-content-card">
          {(() => {
            switch (activeSection) {
              case 'appearance':
                return <AppearanceSettings />;
              case 'notifications':
                return <NotificationSettings />;
              case 'account':
                return <AccountSecuritySettings />;
              case 'preferences':
                return <ProfilePreferences />;
              case 'privacy':
                return <PrivacySecuritySettings />;
              case 'admin':
                return isAdmin ? <AdminSystemSettings /> : <AppearanceSettings />;
              default:
                return <AppearanceSettings />;
            }
          })()}
        </main>
      </div>
    </div>
  );
}
