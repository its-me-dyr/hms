/**
 * Super Admin Settings View
 * 
 * Clean, minimal, and fully functional Super Admin settings console:
 * 1. Header: Matches Super Admin design standard with subtle link to My Profile.
 * 2. Account Preferences: Language, Timezone, Date Format, Time Format with persistence.
 * 3. Appearance: Light / Dark / System theme selector with global application sync via useTheme.
 * 4. Notification Preferences: Real administrative and operational alerts toggles.
 * 5. Security: Current password verification, bcrypt hashing, AuditLog recording.
 * 
 * UX Principle: Sidebar = Navigation, Settings = Focused Configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/useTheme';
import { superadminService } from '../../services/superadmin.service';
import {
  Settings,
  Globe,
  Palette,
  Bell,
  Lock,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  User,
} from 'lucide-react';

const SUPPORTED_TIMEZONES = [
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'America/New_York — Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'America/Chicago — Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'America/Denver — Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles — Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'Europe/London — Greenwich Mean Time' },
  { value: 'Europe/Paris', label: 'Europe/Paris — Central European Time' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata — India Standard Time' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai — Gulf Standard Time' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore — Singapore Standard Time' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo — Japan Standard Time' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney — Australian Eastern Time' },
];

const SUPPORTED_DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 05/10/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 10/05/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-10-05)' },
];

const SUPPORTED_TIME_FORMATS = [
  { value: '12h', label: '12-hour (e.g. 03:45 PM)' },
  { value: '24h', label: '24-hour (e.g. 15:45)' },
];

export default function SuperAdminSettingsView({ onNavigateTab }) {
  const { theme, effectiveTheme, setTheme } = useTheme();

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Preferences Form State
  const [initialPreferences, setInitialPreferences] = useState(null);
  const [accountForm, setAccountForm] = useState({
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  });

  const [notificationForm, setNotificationForm] = useState({
    system: true,
    operational: true,
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(msg);
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 4500);
    }
  };

  // 1. Fetch real preferences from backend
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await superadminService.getSettings();
      if (res?.data) {
        const pref = res.data.data || res.data;
        setInitialPreferences(pref);
        setAccountForm({
          language: pref.language || 'en',
          timezone: pref.timezone || 'UTC',
          dateFormat: pref.dateFormat || 'DD/MM/YYYY',
          timeFormat: pref.timeFormat || '12h',
        });
        setNotificationForm({
          system: pref.notifications?.system ?? true,
          operational: pref.notifications?.operational ?? true,
        });
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Track unsaved account preferences
  const hasUnsavedAccount = Boolean(
    initialPreferences &&
      (accountForm.language !== (initialPreferences.language || 'en') ||
        accountForm.timezone !== (initialPreferences.timezone || 'UTC') ||
        accountForm.dateFormat !== (initialPreferences.dateFormat || 'DD/MM/YYYY') ||
        accountForm.timeFormat !== (initialPreferences.timeFormat || '12h'))
  );

  // Track unsaved notification preferences
  const hasUnsavedNotifications = Boolean(
    initialPreferences &&
      (notificationForm.system !== (initialPreferences.notifications?.system ?? true) ||
        notificationForm.operational !== (initialPreferences.notifications?.operational ?? true))
  );

  // Reset Account Preferences to last saved
  const handleResetAccount = () => {
    if (!initialPreferences) return;
    setAccountForm({
      language: initialPreferences.language || 'en',
      timezone: initialPreferences.timezone || 'UTC',
      dateFormat: initialPreferences.dateFormat || 'DD/MM/YYYY',
      timeFormat: initialPreferences.timeFormat || '12h',
    });
  };

  // Reset Notification Preferences to last saved
  const handleResetNotifications = () => {
    if (!initialPreferences) return;
    setNotificationForm({
      system: initialPreferences.notifications?.system ?? true,
      operational: initialPreferences.notifications?.operational ?? true,
    });
  };

  // Save Account Preferences
  const handleSaveAccountPreferences = async (e) => {
    e.preventDefault();
    try {
      setSavingPreferences(true);
      const res = await superadminService.updateSettings({
        language: accountForm.language,
        timezone: accountForm.timezone,
        dateFormat: accountForm.dateFormat,
        timeFormat: accountForm.timeFormat,
      });
      const updated = res?.data?.data || res?.data;
      setInitialPreferences((prev) => ({ ...prev, ...updated }));
      showToast('Account preferences updated successfully.');
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save account preferences.', true);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Save Notification Preferences
  const handleSaveNotificationPreferences = async (e) => {
    e.preventDefault();
    try {
      setSavingPreferences(true);
      const res = await superadminService.updateSettings({
        notifications: notificationForm,
      });
      const updated = res?.data?.data || res?.data;
      setInitialPreferences((prev) => ({ ...prev, ...updated }));
      showToast('Notification preferences updated successfully.');
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save notification preferences.', true);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Change Theme
  const handleSelectTheme = async (selectedTheme) => {
    try {
      setTheme(selectedTheme);
      await superadminService.updateSettings({ theme: selectedTheme });
      setInitialPreferences((prev) => ({ ...prev, theme: selectedTheme }));
      showToast(`Appearance changed to ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} mode.`);
    } catch {
      // Local theme is still updated smoothly
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await superadminService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      showToast(res?.data?.message || 'Password changed successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%' }}>
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(8, 145, 178, 0.12)',
              color: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Settings
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Manage your account preferences and application settings
            </p>
          </div>
        </div>

        {typeof onNavigateTab === 'function' && (
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="btn btn--outline btn--sm"
            style={{ height: '32px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <User size={13} style={{ color: '#0891b2' }} />
            <span>My Profile</span>
          </button>
        )}
      </div>

      {/* ─── Alerts & Feedback ──────────────────────────────────────────────── */}
      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: 'rgba(5, 150, 105, 0.12)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#059669',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            color: '#f87171',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="btn btn--outline btn--sm"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Loading Skeleton ────────────────────────────────────────────────── */}
      {loading && !initialPreferences ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sa-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '18px', width: '30%', background: 'var(--border-color)', borderRadius: '4px' }} />
              <div style={{ height: '36px', width: '60%', background: 'var(--border-color)', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* ─── 1. Account Preferences Card ─────────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Globe size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Account Preferences
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Configure your regional, localization, and date presentation standards.
            </p>

            <form onSubmit={handleSaveAccountPreferences}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {/* Language (Fixed to English) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Language
                  </label>
                  <input
                    type="text"
                    value="English (United States)"
                    disabled
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 0.75rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Current system language. Additional locales will appear here when supported.
                  </span>
                </div>

                {/* Timezone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Timezone
                  </label>
                  <select
                    value={accountForm.timezone}
                    onChange={(e) => setAccountForm({ ...accountForm, timezone: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 0.75rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Date Format
                  </label>
                  <select
                    value={accountForm.dateFormat}
                    onChange={(e) => setAccountForm({ ...accountForm, dateFormat: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 0.75rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {SUPPORTED_DATE_FORMATS.map((df) => (
                      <option key={df.value} value={df.value}>
                        {df.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Time Format
                  </label>
                  <select
                    value={accountForm.timeFormat}
                    onChange={(e) => setAccountForm({ ...accountForm, timeFormat: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 0.75rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {SUPPORTED_TIME_FORMATS.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                {hasUnsavedAccount && (
                  <button
                    type="button"
                    onClick={handleResetAccount}
                    className="btn btn--outline btn--sm"
                    style={{ height: '34px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingPreferences || !hasUnsavedAccount}
                  className="btn btn--primary btn--sm"
                  style={{
                    height: '34px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#0891b2',
                    borderColor: '#0891b2',
                    color: '#fff',
                    opacity: !hasUnsavedAccount ? 0.6 : 1,
                  }}
                >
                  <Save size={13} />
                  <span>{savingPreferences ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ─── 2. Appearance Card ─────────────────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Palette size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Appearance
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Select your interface color mode. Applies globally across all screens and retains the Super Admin dark cockpit styling.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Light Theme Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTheme('light')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectTheme('light');
                  }
                }}
                style={{
                  padding: '1.15rem 1.25rem',
                  borderRadius: '10px',
                  border: `2px solid ${theme === 'light' ? '#0891b2' : 'var(--border-color)'}`,
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sun size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Light Mode</strong>
                  </div>
                  {theme === 'light' && <CheckCircle2 size={16} style={{ color: '#0891b2' }} />}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  High-clarity day mode with crisp surfaces and balanced medical teal accents.
                </p>
              </div>

              {/* Dark Theme Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTheme('dark')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectTheme('dark');
                  }
                }}
                style={{
                  padding: '1.15rem 1.25rem',
                  borderRadius: '10px',
                  border: `2px solid ${theme === 'dark' ? '#0891b2' : 'var(--border-color)'}`,
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Moon size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Dark Mode</strong>
                  </div>
                  {theme === 'dark' && <CheckCircle2 size={16} style={{ color: '#0891b2' }} />}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Low-glare cockpit with refined contrast, visible borders, and preserved header color.
                </p>
              </div>

              {/* System Default Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTheme('system')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectTheme('system');
                  }
                }}
                style={{
                  padding: '1.15rem 1.25rem',
                  borderRadius: '10px',
                  border: `2px solid ${theme === 'system' ? '#0891b2' : 'var(--border-color)'}`,
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Laptop size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>System Default</strong>
                  </div>
                  {theme === 'system' && <CheckCircle2 size={16} style={{ color: '#0891b2' }} />}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Automatically synchronizes with your device operating system display preferences.
                </p>
              </div>
            </div>
          </div>

          {/* ─── 3. Notification Preferences Card ───────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Bell size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Notification Preferences
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Configure which administrative and system alerts trigger notifications in your topbar and dashboard.
            </p>

            <form onSubmit={handleSaveNotificationPreferences}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Administrative / Platform Alerts Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-main)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                      Administrative & Security Alerts
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Receive notifications for staff applications, role changes, and critical security audits.
                    </span>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationForm.system}
                      onChange={(e) => setNotificationForm({ ...notificationForm, system: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: notificationForm.system ? '#0891b2' : 'var(--border-color)',
                        borderRadius: '24px',
                        transition: '0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notificationForm.system ? '23px' : '3px',
                          bottom: '3px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s ease',
                        }}
                      />
                    </span>
                  </label>
                </div>

                {/* Operational Notifications Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-main)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                      Operational Hospital Notifications
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Receive broadcasts regarding hospital license activations, branch provisions, and system maintenance.
                    </span>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationForm.operational}
                      onChange={(e) => setNotificationForm({ ...notificationForm, operational: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: notificationForm.operational ? '#0891b2' : 'var(--border-color)',
                        borderRadius: '24px',
                        transition: '0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          content: '',
                          height: '18px',
                          width: '18px',
                          left: notificationForm.operational ? '23px' : '3px',
                          bottom: '3px',
                          background: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s ease',
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                {hasUnsavedNotifications && (
                  <button
                    type="button"
                    onClick={handleResetNotifications}
                    className="btn btn--outline btn--sm"
                    style={{ height: '34px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingPreferences || !hasUnsavedNotifications}
                  className="btn btn--primary btn--sm"
                  style={{
                    height: '34px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#0891b2',
                    borderColor: '#0891b2',
                    color: '#fff',
                    opacity: !hasUnsavedNotifications ? 0.6 : 1,
                  }}
                >
                  <Save size={13} />
                  <span>{savingPreferences ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ─── 4. Security & Password Card ─────────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Lock size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Security & Password
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Update your Super Administrator root password. Changes are verified with bcrypt and recorded in immutable audit logs.
            </p>

            {passwordError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {/* Current Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Current Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      minLength={8}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn btn--primary btn--sm"
                  style={{
                    height: '34px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#0891b2',
                    borderColor: '#0891b2',
                    color: '#fff',
                  }}
                >
                  <Lock size={13} />
                  <span>{savingPassword ? 'Updating...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
