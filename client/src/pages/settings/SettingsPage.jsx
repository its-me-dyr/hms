/**
 * SettingsPage.jsx
 * 
 * Master Settings page for the Hospital Management System (HMS).
 * Strictly focused on PERSONAL UI / APPLICATION PREFERENCES:
 * 1. Appearance (Theme: Light / Dark / System Default) via global ThemeContext
 * 2. Date Format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 * 3. Time Format (12h, 24h)
 * 
 * Connected to centralized backend preferences API:
 * GET /api/v1/auth/preferences & PUT /api/v1/auth/preferences
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../../context/useTheme';
import { settingsService } from '../../services/settings.service';
import './SettingsPage.css';

import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react';

const SUPPORTED_DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 08/10/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 10/08/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-10-08)' },
];

const SUPPORTED_TIME_FORMATS = [
  { value: '12h', label: '12-Hour (e.g. 03:30 PM)' },
  { value: '24h', label: '24-Hour (e.g. 15:30)' },
];

function getSampleDatePreview(format) {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

function getSampleTimePreview(format) {
  const d = new Date();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

export default function SettingsPage() {
  const { theme, effectiveTheme, setTheme } = useTheme();

  // Initial committed preferences state
  const [initialPrefs, setInitialPrefs] = useState({
    theme: theme || 'system',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  });

  // Current active form preferences
  const [selectedTheme, setSelectedTheme] = useState(theme || 'system');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');

  // Loading & mutation states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const initialLoadedRef = useRef(false);

  // Load backend user preferences on mount
  useEffect(() => {
    let isMounted = true;
    settingsService.getPreferences()
      .then((res) => {
        if (!isMounted) return;
        const loaded = res.data?.preferences || res.data?.data?.preferences || {};
        const backendTheme = loaded.theme || theme || 'system';
        const backendDateFormat = loaded.dateFormat || 'DD/MM/YYYY';
        const backendTimeFormat = loaded.timeFormat || '12h';

        const prefs = {
          theme: backendTheme,
          dateFormat: backendDateFormat,
          timeFormat: backendTimeFormat,
        };

        setInitialPrefs(prefs);
        setSelectedTheme(backendTheme);
        setDateFormat(backendDateFormat);
        setTimeFormat(backendTimeFormat);
        initialLoadedRef.current = true;
      })
      .catch((err) => {
        console.warn('Could not load preferences from backend:', err);
        // Fallback to local theme state
        setInitialPrefs({
          theme: theme || 'system',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
        });
        setSelectedTheme(theme || 'system');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  // Change detection: true if any preference differs from initial committed state
  const hasChanges = useMemo(() => {
    return (
      selectedTheme !== initialPrefs.theme ||
      dateFormat !== initialPrefs.dateFormat ||
      timeFormat !== initialPrefs.timeFormat
    );
  }, [selectedTheme, dateFormat, timeFormat, initialPrefs]);

  // Handle Theme Selection with instant live preview
  const handleSelectTheme = (themeId) => {
    setSelectedTheme(themeId);
    setTheme(themeId); // Instantly updates DOM & ThemeContext
  };

  // Handle Reset to committed preferences
  const handleReset = () => {
    setSelectedTheme(initialPrefs.theme);
    setDateFormat(initialPrefs.dateFormat);
    setTimeFormat(initialPrefs.timeFormat);
    setTheme(initialPrefs.theme); // Restore original theme
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Handle Save Preferences
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!hasChanges || saving) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        theme: selectedTheme,
        dateFormat,
        timeFormat,
      };

      await settingsService.updatePreferences(payload);

      // Persist global theme
      setTheme(selectedTheme);

      // Update committed state to newly saved values
      setInitialPrefs(payload);

      setSuccessMsg('Preferences saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    {
      id: 'light',
      title: 'Light',
      icon: Sun,
      sidebarBg: '#1e293b',
      headerBg: '#0f172a',
      bodyBg: '#f8fafc',
      cardBg: '#ffffff',
      border: '#e2e8f0',
      activeEffective: effectiveTheme === 'light' && selectedTheme === 'light',
    },
    {
      id: 'dark',
      title: 'Dark',
      icon: Moon,
      sidebarBg: '#0f172a',
      headerBg: '#090d16',
      bodyBg: '#0b1120',
      cardBg: '#1e293b',
      border: '#334155',
      activeEffective: effectiveTheme === 'dark' && selectedTheme === 'dark',
    },
    {
      id: 'system',
      title: 'System Default',
      icon: Laptop,
      sidebarBg: effectiveTheme === 'dark' ? '#0f172a' : '#1e293b',
      headerBg: effectiveTheme === 'dark' ? '#090d16' : '#0f172a',
      bodyBg: effectiveTheme === 'dark' ? '#0b1120' : '#f8fafc',
      cardBg: effectiveTheme === 'dark' ? '#1e293b' : '#ffffff',
      border: effectiveTheme === 'dark' ? '#334155' : '#e2e8f0',
      activeEffective: selectedTheme === 'system',
    },
  ];

  if (loading) {
    return (
      <div className="hms-settings-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 className="hms-settings-spinner" size={28} color="#0891b2" />
      </div>
    );
  }

  return (
    <div className="hms-settings-wrapper">
      {/* ─── PAGE HEADER ────────────────────────────────────────── */}
      <div className="hms-settings-header">
        <div className="hms-settings-icon-badge">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="hms-settings-title">Settings</h1>
          <p className="hms-settings-subtitle">
            Manage your personal application preferences.
          </p>
        </div>
      </div>

      {/* ─── FEEDBACK ALERTS ────────────────────────────────────── */}
      {successMsg && (
        <div className="hms-settings-alert hms-settings-alert--success" role="alert">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="hms-settings-alert hms-settings-alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── 1. APPEARANCE (THEME) ──────────────────────────────── */}
      <div className="hms-settings-card">
        <div className="hms-settings-card__header">
          <span className="hms-settings-section-badge">Appearance</span>
          <h2 className="hms-settings-card__title">Theme</h2>
          <p className="hms-settings-card__desc">
            Choose your preferred color theme. Changes apply across the entire application workspace.
          </p>
        </div>

        <div className="hms-theme-grid">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedTheme === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                className={`hms-theme-option ${isSelected ? 'hms-theme-option--selected' : ''}`}
                onClick={() => handleSelectTheme(opt.id)}
                aria-pressed={isSelected}
              >
                {/* Visual miniature mockup */}
                <div
                  className="hms-theme-preview"
                  style={{ background: opt.bodyBg }}
                >
                  <div
                    className="hms-theme-preview__sidebar"
                    style={{ background: opt.sidebarBg }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0891b2' }} />
                    <div style={{ width: '14px', height: '3px', borderRadius: '2px', background: '#94a3b8', opacity: 0.5 }} />
                    <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: '#94a3b8', opacity: 0.5 }} />
                  </div>
                  <div className="hms-theme-preview__body">
                    <div
                      className="hms-theme-preview__bar"
                      style={{ background: opt.headerBg, border: `1px solid ${opt.border}` }}
                    />
                    <div
                      className="hms-theme-preview__content-box"
                      style={{ background: opt.cardBg, borderColor: opt.border }}
                    />
                  </div>
                </div>

                {/* Option label & checkmark */}
                <div className="hms-theme-option__info">
                  <div className="hms-theme-option__label-wrap">
                    <Icon size={16} className="hms-theme-option__icon" />
                    <span className="hms-theme-option__name">{opt.title}</span>
                  </div>
                  {isSelected && (
                    <div className="hms-theme-option__check">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. DATE FORMAT ─────────────────────────────────────── */}
      <div className="hms-settings-card">
        <div className="hms-settings-card__header">
          <span className="hms-settings-section-badge">Date Format</span>
          <h2 className="hms-settings-card__title">Date Display Preference</h2>
          <p className="hms-settings-card__desc">
            Choose how dates are rendered throughout patient records, appointment schedules, and tables.
          </p>
        </div>

        <div className="hms-settings-form-group">
          <label htmlFor="hms-settings-date-format" className="hms-settings-label">
            Date Format
          </label>
          <select
            id="hms-settings-date-format"
            className="hms-settings-select"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            {SUPPORTED_DATE_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
          <div>
            <div className="hms-settings-preview-tag">
              Preview: <strong>{getSampleDatePreview(dateFormat)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. TIME FORMAT ─────────────────────────────────────── */}
      <div className="hms-settings-card">
        <div className="hms-settings-card__header">
          <span className="hms-settings-section-badge">Time Format</span>
          <h2 className="hms-settings-card__title">Time Display Preference</h2>
          <p className="hms-settings-card__desc">
            Choose between standard 12-hour clock (with AM/PM) or 24-hour military clock.
          </p>
        </div>

        <div className="hms-settings-form-group">
          <label htmlFor="hms-settings-time-format" className="hms-settings-label">
            Time Format
          </label>
          <select
            id="hms-settings-time-format"
            className="hms-settings-select"
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
          >
            {SUPPORTED_TIME_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
          <div>
            <div className="hms-settings-preview-tag">
              Preview: <strong>{getSampleTimePreview(timeFormat)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ACTION BUTTONS (SAVE / RESET) ──────────────────────── */}
      <div className="hms-settings-actions">
        {hasChanges && (
          <button
            type="button"
            className="hms-settings-btn hms-settings-btn--secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        )}
        <button
          type="button"
          className="hms-settings-btn hms-settings-btn--primary"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="hms-settings-spinner" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
