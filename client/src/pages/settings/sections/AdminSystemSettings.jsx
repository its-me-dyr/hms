/**
 * Admin System Settings Section
 * 
 * Privileged institutional configuration available ONLY to
 * Super Administrators and Hospital Administrators.
 * Guarded by role verification and backend RBAC authorization.
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { settingsService } from '../../../services/settings.service';
import { normalizeRoleKey } from '../../dashboards/roleNavigation';

export default function AdminSystemSettings() {
  const { user } = useAuth();
  const roleKey = normalizeRoleKey(user?.role);
  const isAdmin = roleKey === 'super_admin' || roleKey === 'hospital_admin';

  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    hospitalName: 'Hospital Management System (HMS) Medical Center',
    registrationNumber: 'HMS-HOSP-2026-001',
    tagline: 'Advanced Clinical Care & Diagnostic Excellence',
    contactEmail: 'admin@hms.com',
    contactPhone: '+1 (800) 555-0199',
    emergencyHotline: '911 / 108',
    street: '100 Medical Center Drive',
    city: 'Metropolis',
    state: 'NY',
    postalCode: '10001',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    allowPublicRegistration: true,
    requireStaffVerification: true,
  });

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;
    settingsService.getHospitalSettings()
      .then((res) => {
        if (isMounted && res.data) {
          const s = res.data.settings || res.data.data || res.data;
          setForm({
            hospitalName: s.hospitalName || '',
            registrationNumber: s.registrationNumber || '',
            tagline: s.tagline || '',
            contactEmail: s.contactEmail || '',
            contactPhone: s.contactPhone || '',
            emergencyHotline: s.emergencyHotline || '',
            street: s.address?.street || s.street || '',
            city: s.address?.city || s.city || '',
            state: s.address?.state || s.state || '',
            postalCode: s.address?.postalCode || s.postalCode || '',
            country: s.address?.country || s.country || '',
            currency: s.currency || 'USD',
            currencySymbol: s.currencySymbol || '$',
            timezone: s.timezone || 'America/New_York',
            allowPublicRegistration: s.allowPublicRegistration ?? true,
            requireStaffVerification: s.requireStaffVerification ?? true,
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load hospital settings:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isAdmin]);

  // Enforce role guard: non-admin users must not see or access
  if (!isAdmin) {
    return (
      <div className="settings-section">
        <div className="settings-alert settings-alert--error">
          <Lock size={18} />
          <span>Access Restricted: Institutional system configuration requires Super Admin or Hospital Admin privileges.</span>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        hospitalName: form.hospitalName,
        registrationNumber: form.registrationNumber,
        tagline: form.tagline,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        emergencyHotline: form.emergencyHotline,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        currency: form.currency,
        currencySymbol: form.currencySymbol,
        timezone: form.timezone,
        allowPublicRegistration: form.allowPublicRegistration,
        requireStaffVerification: form.requireStaffVerification,
      };

      await settingsService.updateHospitalSettings(payload);
      setSuccessMsg('Hospital configuration and regional settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Failed to update hospital settings:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update hospital settings.');
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
        <h2 className="settings-section__title">Hospital & Institutional Configuration</h2>
        <p className="settings-section__subtitle">
          Manage clinical institutional profile, regional currency, emergency dispatch contacts, and public registration policies.
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
        {/* Hospital Identity Card */}
        <div className="settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
            Hospital Identity & Registration
          </h3>

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-name">Hospital Name</label>
              <input
                id="hosp-name"
                type="text"
                required
                className="settings-input"
                value={form.hospitalName}
                onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-reg">License / Registration Number</label>
              <input
                id="hosp-reg"
                type="text"
                required
                className="settings-input"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-form-group" style={{ marginBottom: 0 }}>
            <label className="settings-label" htmlFor="hosp-tag">Institutional Tagline</label>
            <input
              id="hosp-tag"
              type="text"
              className="settings-input"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </div>
        </div>

        {/* Contact & Emergency Hotline Card */}
        <div className="settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Phone size={18} style={{ color: 'var(--color-primary)' }} />
            Emergency & Inquiries Contact
          </h3>

          <div className="settings-form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-email">Official Contact Email</label>
              <input
                id="hosp-email"
                type="email"
                required
                className="settings-input"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-phone">Hospital Phone</label>
              <input
                id="hosp-phone"
                type="tel"
                required
                className="settings-input"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-hotline">Emergency Hotline (24/7)</label>
              <input
                id="hosp-hotline"
                type="text"
                required
                className="settings-input"
                value={form.emergencyHotline}
                onChange={(e) => setForm({ ...form, emergencyHotline: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Physical Address Card */}
        <div className="settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
            Hospital Campus Address
          </h3>

          <div className="settings-form-group" style={{ marginBottom: '1rem' }}>
            <label className="settings-label" htmlFor="hosp-street">Street Address</label>
            <input
              id="hosp-street"
              type="text"
              className="settings-input"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>

          <div className="settings-form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-city">City</label>
              <input
                id="hosp-city"
                type="text"
                className="settings-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-state">State / Province</label>
              <input
                id="hosp-state"
                type="text"
                className="settings-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-postal">Postal Code</label>
              <input
                id="hosp-postal"
                type="text"
                className="settings-input"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-country">Country</label>
              <input
                id="hosp-country"
                type="text"
                className="settings-input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Regional & Financial Settings */}
        <div className="settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
            Currency & Timezone Localization
          </h3>

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-currency">Hospital Currency</label>
              <select
                id="hosp-currency"
                className="settings-select"
                value={form.currency}
                onChange={(e) => {
                  const curr = e.target.value;
                  const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹' };
                  setForm({ ...form, currency: curr, currencySymbol: symbols[curr] || '$' });
                }}
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="CAD">CAD (CA$) - Canadian Dollar</option>
                <option value="AUD">AUD (A$) - Australian Dollar</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
              </select>
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="hosp-timezone">System Timezone</label>
              <select
                id="hosp-timezone"
                className="settings-select"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                <option value="America/New_York">America/New_York (Eastern Time)</option>
                <option value="America/Chicago">America/Chicago (Central Time)</option>
                <option value="America/Denver">America/Denver (Mountain Time)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
            Registration & Onboarding Governance
          </h3>

          <div className="settings-toggle-list">
            <div className="settings-toggle-item">
              <div className="settings-toggle-info">
                <div>
                  <div className="settings-toggle-title">Allow Public Patient Registration</div>
                  <div className="settings-toggle-desc">Permits new patients to self-register via the portal landing page.</div>
                </div>
              </div>
              <label className="settings-switch" aria-label="Toggle Public Registration">
                <input
                  type="checkbox"
                  checked={form.allowPublicRegistration}
                  onChange={(e) => setForm({ ...form, allowPublicRegistration: e.target.checked })}
                />
                <span className="settings-slider" />
              </label>
            </div>

            <div className="settings-toggle-item">
              <div className="settings-toggle-info">
                <div>
                  <div className="settings-toggle-title">Mandatory Staff Credential Verification</div>
                  <div className="settings-toggle-desc">Requires Super Administrator document inspection and approval before newly registered clinical staff can access the portal.</div>
                </div>
              </div>
              <label className="settings-switch" aria-label="Toggle Staff Verification Requirement">
                <input
                  type="checkbox"
                  checked={form.requireStaffVerification}
                  onChange={(e) => setForm({ ...form, requireStaffVerification: e.target.checked })}
                />
                <span className="settings-slider" />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
          <button
            type="submit"
            disabled={saving}
            className="settings-btn settings-btn--primary"
          >
            {saving ? <RefreshCw size={16} className="settings-spinner" /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save Hospital Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
