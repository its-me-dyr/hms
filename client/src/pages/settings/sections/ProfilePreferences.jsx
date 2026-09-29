/**
 * Profile Preferences Settings Section
 * 
 * Regional, language, and date/time display configurations
 * persisted with the user profile.
 */

import { useState, useEffect } from 'react';
import {
  Globe,
  Calendar,
  Clock,
  Layout,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { settingsService } from '../../../services/settings.service';

export default function ProfilePreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    dashboardPreference: 'default',
  });

  useEffect(() => {
    let isMounted = true;
    settingsService.getPreferences()
      .then((res) => {
        if (isMounted) {
          const loaded = res.data?.preferences || res.data?.data?.preferences || {};
          setForm((prev) => ({
            ...prev,
            language: loaded.language || 'en',
            dateFormat: loaded.dateFormat || 'DD/MM/YYYY',
            timeFormat: loaded.timeFormat || '12h',
            dashboardPreference: loaded.dashboardPreference || 'default',
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch profile preferences:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await settingsService.updatePreferences(form);
      setSuccessMsg('Profile preferences updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <RefreshCw className="settings-spinner" size={28} />
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Profile & Regional Preferences</h2>
        <p className="settings-section__subtitle">
          Configure clinical datetime representations, portal language, and dashboard display options.
        </p>
      </div>

      {successMsg && (
        <div className="settings-alert settings-alert--success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="settings-alert settings-alert--error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="settings-card">
          <div className="settings-form-row">
            {/* Language */}
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="pref-lang" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Globe size={15} style={{ color: 'var(--color-primary)' }} />
                Interface Language
              </label>
              <select
                id="pref-lang"
                className="settings-select"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                <option value="en">English (US / International)</option>
                <option value="es">Español (Spanish)</option>
                <option value="fr">Français (French)</option>
                <option value="de">Deutsch (German)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
              <span className="settings-input-help">Select the primary language displayed throughout the application.</span>
            </div>

            {/* Date Format */}
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="pref-date" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
                Date Representation Format
              </label>
              <select
                id="pref-date"
                className="settings-select"
                value={form.dateFormat}
                onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 18/09/2026 - Standard Medical)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 09/18/2026 - US Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2026-09-18 - ISO 8601)</option>
              </select>
              <span className="settings-input-help">Applies to consultation dates, lab records, and report logs.</span>
            </div>
          </div>

          <div className="settings-form-row">
            {/* Time Format */}
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="pref-time" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={15} style={{ color: 'var(--color-primary)' }} />
                Time Display Format
              </label>
              <select
                id="pref-time"
                className="settings-select"
                value={form.timeFormat}
                onChange={(e) => setForm({ ...form, timeFormat: e.target.value })}
              >
                <option value="12h">12-hour Clock (e.g., 09:30 AM / 04:15 PM)</option>
                <option value="24h">24-hour Clock (e.g., 09:30 / 16:15 - Military / Hospital Ward)</option>
              </select>
              <span className="settings-input-help">Format used for shift rosters, appointment slots, and vitals timestamps.</span>
            </div>

            {/* Dashboard Display View */}
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="pref-dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layout size={15} style={{ color: 'var(--color-primary)' }} />
                Default Dashboard Landing
              </label>
              <select
                id="pref-dashboard"
                className="settings-select"
                value={form.dashboardPreference}
                onChange={(e) => setForm({ ...form, dashboardPreference: e.target.value })}
              >
                <option value="default">Standard Role Operational Cockpit</option>
                <option value="compact">High-Density Compact Grid</option>
                <option value="queue">Prioritize Patient Queue / Worklist</option>
              </select>
              <span className="settings-input-help">Choose your preferred viewport configuration upon signing in.</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="settings-btn settings-btn--primary"
            >
              {saving ? <RefreshCw size={16} className="settings-spinner" /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
