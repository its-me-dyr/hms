/**
 * Account & Security Settings Section
 * 
 * Account metadata summary (Email, Phone, Role, Status, Last Login)
 * and secure authenticated password update workflow.
 */

import { useState } from 'react';
import {
  Shield,
  Key,
  Mail,
  Phone,
  UserCheck,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { settingsService } from '../../../services/settings.service';

export default function AccountSecuritySettings() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setErrorMsg('Please complete all password fields.');
      return;
    }

    if (form.newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await settingsService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccessMsg(res.data?.message || 'Password changed successfully. Your account is secured.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Password change error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (dateVal) => {
    if (!dateVal) return 'Current Session';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Current Session';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Current Session';
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h2 className="settings-section__title">Account & Security</h2>
        <p className="settings-section__subtitle">
          Manage your account credentials, security authentications, and update your access password.
        </p>
      </div>

      {/* Account Details Strip Card */}
      <div className="settings-card" style={{ marginBottom: '1.75rem' }}>
        <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Shield size={18} style={{ color: 'var(--color-primary)' }} />
          Account Profile & Status
        </h3>

        <div className="settings-meta-grid">
          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <Mail size={14} /> Registered Email
            </div>
            <div className="settings-meta-val">{user?.email || 'user@hms.com'}</div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <Phone size={14} /> Contact Phone
            </div>
            <div className="settings-meta-val">{user?.phone || 'Not configured'}</div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <UserCheck size={14} /> Account Role
            </div>
            <div className="settings-meta-val" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-primary)' }}>
              {(typeof user?.role === 'string' ? user.role : (user?.roleName || user?.role?.displayName || 'User')).replace(/_/g, ' ')}
            </div>
          </div>

          <div className="settings-meta-item">
            <div className="settings-meta-label">
              <Clock size={14} /> Last Authenticated Login
            </div>
            <div className="settings-meta-val">{formatLastLogin(user?.lastLogin)}</div>
          </div>
        </div>
      </div>

      {/* Password Change Form Card */}
      <div className="settings-card">
        <h3 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Key size={18} style={{ color: 'var(--color-primary)' }} />
          Change Password
        </h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Ensure your new password contains at least 8 characters with a mix of letters, numbers, and special symbols for maximum security.
        </p>

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

        <form onSubmit={handlePasswordSubmit}>
          <div className="settings-form-group">
            <label className="settings-label" htmlFor="current-pass">
              Current Password
            </label>
            <div className="settings-input-wrapper">
              <input
                id="current-pass"
                type={showCurrent ? 'text' : 'password'}
                required
                placeholder="Enter current password"
                className="settings-input"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
              <button
                type="button"
                className="settings-input-toggle"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="new-pass">
                New Password
              </label>
              <div className="settings-input-wrapper">
                <input
                  id="new-pass"
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Minimum 8 characters"
                  className="settings-input"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="settings-input-toggle"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-form-group">
              <label className="settings-label" htmlFor="confirm-pass">
                Confirm New Password
              </label>
              <div className="settings-input-wrapper">
                <input
                  id="confirm-pass"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  className="settings-input"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="settings-input-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="settings-btn settings-btn--primary"
            >
              {loading ? <RefreshCw size={16} className="settings-spinner" /> : <Lock size={16} />}
              <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
