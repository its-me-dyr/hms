/**
 * Hospital Admin Portal — Hospital Branding
 * 
 * Clean, production-ready, focused branding management component.
 * 
 * Responsibilities:
 * 1. Manage hospital visual identity and display parameters:
 *    - Hospital Name (read-only reference; source of truth is Hospital Settings)
 *    - Logo (logoUrl)
 *    - Favicon (faviconUrl)
 *    - Primary Color (primaryColor)
 *    - Accent Color (accentColor)
 *    - Header Text (headerText)
 *    - Footer Text / Copyright Text (footerText)
 * 2. Real-time realistic Brand Preview without premature auto-saving.
 * 3. Hex color validation and plain text sanitization.
 * 4. Tracking of unsaved changes and reset/cancel to last saved state.
 * 5. Full audit logging integration (UPDATE_BRANDING), multi-tenant isolation,
 *    and seamless light/dark mode compatibility.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Loader2,
  Building2,
  Image as ImageIcon,
  ExternalLink,
  Info,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

const DEFAULT_BRANDING = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#0891B2',
  accentColor: '#0F172A',
  headerText: 'Hospital Management System',
  footerText: '© 2026 HMS Medical Center. All rights reserved.',
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function HospitalBrandingTab({ onBrandingChange, initialHospitalName = '' }) {
  // ─── 1. State ───
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Source of truth identity from Hospital Setting
  const [hospitalName, setHospitalName] = useState(initialHospitalName);

  // Form State
  const [formData, setFormData] = useState({ ...DEFAULT_BRANDING });
  const [savedData, setSavedData] = useState({ ...DEFAULT_BRANDING });

  // Field validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Image loading errors for preview
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [faviconLoadError, setFaviconLoadError] = useState(false);

  // ─── 2. Fetch Branding Data ───
  const fetchBranding = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await hospitalAdminService.getBranding();
      const data = res?.data?.data || res?.data || {};

      const loaded = {
        logoUrl: data.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
        primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
        accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
        headerText: data.headerText !== undefined ? data.headerText : DEFAULT_BRANDING.headerText,
        footerText: data.footerText !== undefined ? data.footerText : DEFAULT_BRANDING.footerText,
      };

      if (data.hospitalName) {
        setHospitalName(data.hospitalName);
      }

      setFormData(loaded);
      setSavedData(loaded);
      setValidationErrors({});
      setLogoLoadError(false);
      setFaviconLoadError(false);
    } catch (err) {
      console.error('Failed to load hospital branding:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Unable to load hospital branding. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Keep hospital name updated if prop changes
  useEffect(() => {
    if (initialHospitalName && !hospitalName) {
      setHospitalName(initialHospitalName);
    }
  }, [initialHospitalName, hospitalName]);

  // ─── 3. Unsaved Changes Calculation ───
  const isDirty = useMemo(() => {
    return (
      formData.logoUrl !== savedData.logoUrl ||
      formData.faviconUrl !== savedData.faviconUrl ||
      formData.primaryColor !== savedData.primaryColor ||
      formData.accentColor !== savedData.accentColor ||
      formData.headerText !== savedData.headerText ||
      formData.footerText !== savedData.footerText
    );
  }, [formData, savedData]);

  // ─── 4. Safe Color Fallbacks for Preview ───
  const safePrimaryHex = useMemo(() => {
    const val = (formData.primaryColor || '').trim();
    return HEX_COLOR_REGEX.test(val) ? val : DEFAULT_BRANDING.primaryColor;
  }, [formData.primaryColor]);

  const safeAccentHex = useMemo(() => {
    const val = (formData.accentColor || '').trim();
    return HEX_COLOR_REGEX.test(val) ? val : DEFAULT_BRANDING.accentColor;
  }, [formData.accentColor]);

  // Helper for dynamic favicon update where supported
  const applyDynamicFavicon = (url) => {
    if (!url) return;
    try {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = url;
    } catch {
      // Graceful fallback if DOM manipulation is restricted
    }
  };

  // ─── 5. Field Change Handlers ───
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Reset error when user updates
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }

    if (field === 'logoUrl') {
      setLogoLoadError(false);
    }
    if (field === 'faviconUrl') {
      setFaviconLoadError(false);
    }
  };

  // ─── 6. Validation ───
  const validateForm = () => {
    const errors = {};

    if (formData.primaryColor && !HEX_COLOR_REGEX.test(formData.primaryColor.trim())) {
      errors.primaryColor = 'Must be a valid hex color code (e.g. #0891B2)';
    }

    if (formData.accentColor && !HEX_COLOR_REGEX.test(formData.accentColor.trim())) {
      errors.accentColor = 'Must be a valid hex color code (e.g. #0F172A)';
    }

    if (formData.headerText && formData.headerText.length > 150) {
      errors.headerText = 'Header text cannot exceed 150 characters';
    }

    if (formData.footerText && formData.footerText.length > 250) {
      errors.footerText = 'Footer text cannot exceed 250 characters';
    }

    // Basic URL check if provided
    if (formData.logoUrl && formData.logoUrl.trim() !== '') {
      const url = formData.logoUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        errors.logoUrl = 'Logo URL must start with https://, http://, or /';
      }
    }

    if (formData.faviconUrl && formData.faviconUrl.trim() !== '') {
      const url = formData.faviconUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        errors.faviconUrl = 'Favicon URL must start with https://, http://, or /';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── 7. Save Handler ───
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        logoUrl: formData.logoUrl.trim(),
        faviconUrl: formData.faviconUrl.trim(),
        primaryColor: formData.primaryColor.trim(),
        accentColor: formData.accentColor.trim(),
        headerText: formData.headerText.trim(),
        footerText: formData.footerText.trim(),
      };

      const res = await hospitalAdminService.updateBranding(payload);
      const updated = res?.data?.data || payload;

      const normalized = {
        logoUrl: updated.logoUrl || '',
        faviconUrl: updated.faviconUrl || '',
        primaryColor: updated.primaryColor || DEFAULT_BRANDING.primaryColor,
        accentColor: updated.accentColor || DEFAULT_BRANDING.accentColor,
        headerText: updated.headerText !== undefined ? updated.headerText : DEFAULT_BRANDING.headerText,
        footerText: updated.footerText !== undefined ? updated.footerText : DEFAULT_BRANDING.footerText,
      };

      if (updated.hospitalName) {
        setHospitalName(updated.hospitalName);
      }

      setFormData(normalized);
      setSavedData(normalized);
      setSuccessMsg('Hospital branding updated successfully.');

      // Update browser favicon dynamically if valid
      if (normalized.faviconUrl) {
        applyDynamicFavicon(normalized.faviconUrl);
      }

      // Notify parent if needed
      if (onBrandingChange) {
        onBrandingChange();
      }

      // Clear success message after 4.5 seconds
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error saving branding:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to update hospital branding. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── 8. Reset / Cancel Handler ───
  const handleReset = () => {
    setFormData({ ...savedData });
    setValidationErrors({});
    setLogoLoadError(false);
    setFaviconLoadError(false);
    setErrorMsg('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem', color: '#0891B2' }} />
        <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>Loading branding...</p>
      </div>
    );
  }

  return (
    <div className="ha-branding-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Page Header (Clean, compact, no generic hero) ── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title">Hospital Branding</h1>
          <p className="ha-page-description">
            Manage your hospital's visual identity and branding displayed across the system.
          </p>
        </div>
      </div>

      {/* ── Feedback Alerts ── */}
      {successMsg && (
        <div className="ha-alert ha-alert--success" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="ha-alert ha-alert--error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Two-Section Layout: Brand Information (Left) + Brand Preview (Right) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* =================================================================== */}
        {/* SECTION 1: BRAND INFORMATION */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Layers size={18} color="#0891B2" />
              Brand Information
            </h2>
          </div>

          <div className="ha-panel__body">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Hospital Name (Read-only, owned by Hospital Settings) */}
              <div className="ha-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Hospital Name</label>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-input, rgba(148, 163, 184, 0.15))',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                    }}
                  >
                    Managed in Hospital & Branch Settings
                  </span>
                </div>
                <input
                  type="text"
                  value={hospitalName || 'Hospital Medical Center'}
                  readOnly
                  disabled
                  aria-readonly="true"
                  style={{
                    opacity: 0.85,
                    cursor: 'not-allowed',
                    backgroundColor: 'var(--bg-surface, rgba(15, 23, 42, 0.05))',
                    border: '1px solid var(--border-color)',
                  }}
                  title="Hospital name is configured in Hospital & Branch Settings"
                />
              </div>

              {/* 2. Logo URL */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Logo URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png or /assets/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                  style={{
                    borderColor: validationErrors.logoUrl ? '#ef4444' : undefined,
                  }}
                />
                {validationErrors.logoUrl && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.logoUrl}
                  </span>
                )}

                {/* In-form Logo Preview */}
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {formData.logoUrl && !logoLoadError ? (
                    <div
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        maxWidth: '220px',
                      }}
                    >
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        style={{ height: '28px', maxWidth: '120px', objectFit: 'contain' }}
                        onError={() => setLogoLoadError(true)}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logo preview</span>
                    </div>
                  ) : formData.logoUrl && logoLoadError ? (
                    <div
                      style={{
                        padding: '0.35rem 0.65rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '0.375rem',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <AlertCircle size={13} />
                      Unable to load image from URL
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <ImageIcon size={14} />
                      No logo configured
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Favicon URL */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Favicon URL
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/favicon.ico or /favicon.ico"
                    value={formData.faviconUrl}
                    onChange={(e) => handleFieldChange('faviconUrl', e.target.value)}
                    style={{
                      flex: 1,
                      borderColor: validationErrors.faviconUrl ? '#ef4444' : undefined,
                    }}
                  />
                  {/* Small Favicon Chip */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Favicon icon preview"
                  >
                    {formData.faviconUrl && !faviconLoadError ? (
                      <img
                        src={formData.faviconUrl}
                        alt="Favicon"
                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        onError={() => setFaviconLoadError(true)}
                      />
                    ) : (
                      <ExternalLink size={14} color="var(--text-secondary)" />
                    )}
                  </div>
                </div>
                {validationErrors.faviconUrl && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.faviconUrl}
                  </span>
                )}
              </div>

              {/* 4. Primary Color */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Primary Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    aria-label="Primary color picker"
                    value={safePrimaryHex}
                    onChange={(e) => handleFieldChange('primaryColor', e.target.value.toUpperCase())}
                    style={{
                      width: '45px',
                      height: '38px',
                      padding: '0.15rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: 'var(--bg-input)',
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#0891B2"
                    value={formData.primaryColor}
                    onChange={(e) => handleFieldChange('primaryColor', e.target.value)}
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      borderColor: validationErrors.primaryColor ? '#ef4444' : undefined,
                    }}
                  />
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: safePrimaryHex,
                      border: '1px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                    title={`Current color: ${safePrimaryHex}`}
                  />
                </div>
                {validationErrors.primaryColor && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.primaryColor}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  Main visual identity color for hospital headers and primary buttons.
                </span>
              </div>

              {/* 5. Accent Color */}
              <div className="ha-form-group">
                <label style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', display: 'block' }}>
                  Accent Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    aria-label="Accent color picker"
                    value={safeAccentHex}
                    onChange={(e) => handleFieldChange('accentColor', e.target.value.toUpperCase())}
                    style={{
                      width: '45px',
                      height: '38px',
                      padding: '0.15rem',
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: 'var(--bg-input)',
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="#0F172A"
                    value={formData.accentColor}
                    onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      borderColor: validationErrors.accentColor ? '#ef4444' : undefined,
                    }}
                  />
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: safeAccentHex,
                      border: '1px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                    title={`Current color: ${safeAccentHex}`}
                  />
                </div>
                {validationErrors.accentColor && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.accentColor}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                  Secondary contrast color used for footers, badges, and accents.
                </span>
              </div>

              {/* 6. Header Text */}
              <div className="ha-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Header Text</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {formData.headerText.length} / 150
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="Hospital Management System"
                  value={formData.headerText}
                  onChange={(e) => handleFieldChange('headerText', e.target.value)}
                  style={{
                    borderColor: validationErrors.headerText ? '#ef4444' : undefined,
                  }}
                />
                {validationErrors.headerText && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.headerText}
                  </span>
                )}
              </div>

              {/* 7. Footer Text / Copyright Text */}
              <div className="ha-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Footer Text / Copyright</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {formData.footerText.length} / 250
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={250}
                  placeholder="© 2026 HMS Medical Center. All rights reserved."
                  value={formData.footerText}
                  onChange={(e) => handleFieldChange('footerText', e.target.value)}
                  style={{
                    borderColor: validationErrors.footerText ? '#ef4444' : undefined,
                    resize: 'vertical',
                  }}
                />
                {validationErrors.footerText && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {validationErrors.footerText}
                  </span>
                )}
              </div>

              {/* Save / Cancel Action Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <div>
                  {isDirty && (
                    <span
                      className="ha-badge ha-badge--warning"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <Info size={13} />
                      Unsaved changes
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={handleReset}
                  disabled={!isDirty || saving}
                >
                  <RotateCcw size={15} />
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={saving || !isDirty}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: BRAND PREVIEW */}
        {/* =================================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <Eye size={18} color="#0891B2" />
              Brand Preview
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              Live rendering
            </span>
          </div>

          <div className="ha-panel__body">
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Realistic preview using the current branding settings. Changes take effect across hospital screens upon saving.
            </p>

            {/* Realistic Branded Preview Frame */}
            <div
              style={{
                borderRadius: '0.625rem',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
                background: 'var(--bg-surface)',
              }}
            >
              {/* 1. Branded Header Bar */}
              <div
                style={{
                  backgroundColor: safePrimaryHex,
                  color: '#ffffff',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  {formData.logoUrl && !logoLoadError ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo"
                      style={{ height: '32px', maxWidth: '80px', objectFit: 'contain' }}
                      onError={() => setLogoLoadError(true)}
                    />
                  ) : (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={18} color="#ffffff" />
                    </div>
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {hospitalName || 'Hospital Medical Center'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.9,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {formData.headerText || 'Hospital Management System'}
                    </div>
                  </div>
                </div>

                {formData.faviconUrl && !faviconLoadError && (
                  <img
                    src={formData.faviconUrl}
                    alt="Favicon"
                    style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'contain' }}
                    onError={() => setFaviconLoadError(true)}
                    title="Configured favicon"
                  />
                )}
              </div>

              {/* 2. Branded Preview Content */}
              <div style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: safeAccentHex,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: safeAccentHex,
                    }}
                  >
                    Active Brand Palette
                  </span>
                </div>

                {/* Color Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Primary
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          backgroundColor: safePrimaryHex,
                          flexShrink: 0,
                        }}
                      />
                      <code style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {safePrimaryHex}
                      </code>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Accent
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          backgroundColor: safeAccentHex,
                          flexShrink: 0,
                        }}
                      />
                      <code style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {safeAccentHex}
                      </code>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-body)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  This preview illustrates the header banner, brand accent tones, and institutional signature rendered on patient reports, appointment confirmations, and clinical printouts.
                </div>
              </div>

              {/* 3. Branded Footer Bar */}
              <div
                style={{
                  backgroundColor: safeAccentHex,
                  color: '#e2e8f0',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {formData.footerText || '© 2026 HMS Medical Center. All rights reserved.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
