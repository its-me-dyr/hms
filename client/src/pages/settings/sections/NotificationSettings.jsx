/**
 * Notification Settings Section
 * 
 * Manages user alert preferences across email, appointments, system,
 * billing, reminders, and role-tailored clinical/operational notifications.
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  AlertTriangle,
  CreditCard,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { settingsService } from '../../../services/settings.service';
import { normalizeRoleKey } from '../../dashboards/roleNavigation';

export default function NotificationSettings() {
  const { user } = useAuth();
  const roleKey = normalizeRoleKey(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [prefs, setPrefs] = useState({
    email: true,
    appointments: true,
    system: true,
    billing: true,
    reminders: true,
    operational: true,
  });

  // Load preferences from backend
  useEffect(() => {
    let isMounted = true;
    settingsService.getPreferences()
      .then((res) => {
        if (isMounted) {
          const loaded = res.data?.preferences?.notifications || res.data?.data?.preferences?.notifications || {};
          setPrefs((prev) => ({ ...prev, ...loaded }));
        }
      })
      .catch((err) => {
        console.warn('Could not fetch notification preferences from backend:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleToggle = (key) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await settingsService.updatePreferences({
        notifications: prefs,
      });
      setSuccessMsg('Notification preferences updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  // Role-tailored operational description
  const getOperationalDetails = () => {
    switch (roleKey) {
      case 'pharmacist':
        return {
          title: 'Pharmacy & Inventory Alerts',
          desc: 'Instant notifications when medications fall below reorder level, batches approach expiry, or urgent prescriptions are ordered.',
          icon: Activity,
        };
      case 'doctor':
        return {
          title: 'Clinical & Patient Queue Alerts',
          desc: 'Alerts when lab investigation results are published, patient checks into queue, or emergency consultations are requested.',
          icon: Activity,
        };
      case 'nurse':
        return {
          title: 'Nursing Ward & Call Bell Signals',
          desc: 'STAT physician order alerts, eMAR medication schedule due notifications, and emergency patient call bell triggers.',
          icon: Activity,
        };
      case 'receptionist':
        return {
          title: 'Front Desk & Queue Alerts',
          desc: 'Walk-in queue token overflow alerts, scheduled appointment check-ins, and admission room readiness notifications.',
          icon: Activity,
        };
      case 'patient':
        return {
          title: 'Prescription & Lab Result Releases',
          desc: 'Alerts when your physician authorizes a new prescription, lab reports are verified, or discharge summaries are ready.',
          icon: Activity,
        };
      case 'super_admin':
      case 'hospital_admin':
        return {
          title: 'Administrative & Staff Compliance Alerts',
          desc: 'Immediate notifications on new staff credential verification submissions, system security anomalies, and license expirations.',
          icon: Activity,
        };
      default:
        return {
          title: 'Operational Workflow Notifications',
          desc: 'Department-specific tasks, clinical schedule updates, and station event alerts.',
          icon: Activity,
        };
    }
  };

  const opDetails = getOperationalDetails();

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
        <h2 className="settings-section__title">Notification Preferences</h2>
        <p className="settings-section__subtitle">
          Configure how and when you receive hospital operational dispatch alerts, clinical reminders, and administrative notifications.
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

      <div className="settings-toggle-list">
        {/* Email Notifications */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <Mail size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">Email Communications</div>
              <div className="settings-toggle-desc">Receive formal hospital notifications, verification updates, and scheduled report digests via email.</div>
            </div>
          </div>
          <label className="settings-switch" aria-label="Toggle Email Communications">
            <input
              type="checkbox"
              checked={prefs.email}
              onChange={() => handleToggle('email')}
            />
            <span className="settings-slider" />
          </label>
        </div>

        {/* Appointment Notifications */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <Calendar size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">Appointment & Schedule Updates</div>
              <div className="settings-toggle-desc">Notifications for appointment bookings, clinical reschedules, cancellations, and doctor availability shifts.</div>
            </div>
          </div>
          <label className="settings-switch" aria-label="Toggle Appointment Updates">
            <input
              type="checkbox"
              checked={prefs.appointments}
              onChange={() => handleToggle('appointments')}
            />
            <span className="settings-slider" />
          </label>
        </div>

        {/* Role-Specific Operational Notifications */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <opDetails.icon size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">{opDetails.title}</div>
              <div className="settings-toggle-desc">{opDetails.desc}</div>
            </div>
          </div>
          <label className="settings-switch" aria-label={`Toggle ${opDetails.title}`}>
            <input
              type="checkbox"
              checked={prefs.operational}
              onChange={() => handleToggle('operational')}
            />
            <span className="settings-slider" />
          </label>
        </div>

        {/* System Notifications */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">System & Security Notices</div>
              <div className="settings-toggle-desc">Critical updates regarding scheduled maintenance windows, compliance bulletins, and account security changes.</div>
            </div>
          </div>
          <label className="settings-switch" aria-label="Toggle System Notices">
            <input
              type="checkbox"
              checked={prefs.system}
              onChange={() => handleToggle('system')}
            />
            <span className="settings-slider" />
          </label>
        </div>

        {/* Billing & Payment Notifications */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">Billing & Financial Activity</div>
              <div className="settings-toggle-desc">Invoices generated, insurance claim authorizations, payment receipts, and outstanding fee reminders.</div>
            </div>
          </div>
          <label className="settings-switch" aria-label="Toggle Billing Activity">
            <input
              type="checkbox"
              checked={prefs.billing}
              onChange={() => handleToggle('billing')}
            />
            <span className="settings-slider" />
          </label>
        </div>

        {/* Reminders */}
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <div className="settings-toggle-icon-box">
              <Clock size={18} />
            </div>
            <div>
              <div className="settings-toggle-title">General Reminders & Follow-Ups</div>
              <div className="settings-toggle-desc">Automated 24-hour reminders prior to consultations, medication administration checkpoints, and roster check-ins.</div>
            </div>
          </div>
          <label className="settings-switch" aria-label="Toggle General Reminders">
            <input
              type="checkbox"
              checked={prefs.reminders}
              onChange={() => handleToggle('reminders')}
            />
            <span className="settings-slider" />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="settings-btn settings-btn--primary"
        >
          {saving ? <RefreshCw size={16} className="settings-spinner" /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save Notification Preferences'}</span>
        </button>
      </div>
    </div>
  );
}
