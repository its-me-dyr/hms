/**
 * ForceChangePasswordPage.jsx
 * 
 * Required for staff accounts created with a temporary password.
 * Enforces changing the temporary password upon first login before
 * granting access to role-based operational dashboards and APIs.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { authService } from '../../services/auth.service';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Heart,
  Sun,
  Moon,
  Check,
  X,
} from 'lucide-react';

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // Password Policy Checks
  const checks = {
    minLength: formData.newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(formData.newPassword),
    hasLower: /[a-z]/.test(formData.newPassword),
    hasDigit: /\d/.test(formData.newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(formData.newPassword),
    matches: formData.newPassword && formData.newPassword === formData.confirmPassword,
    notCurrent: formData.newPassword && formData.newPassword !== formData.currentPassword,
  };

  const isFormValid =
    formData.currentPassword &&
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.hasSpecial &&
    checks.matches &&
    checks.notCurrent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.currentPassword) {
      setError('Please enter your current temporary password.');
      return;
    }

    if (!checks.minLength || !checks.hasUpper || !checks.hasLower || !checks.hasDigit || !checks.hasSpecial) {
      setError('New password does not meet the complexity requirements.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password cannot be identical to your temporary password.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      setSuccess(true);

      // Update auth state so mustChangePassword becomes false
      updateUser({ mustChangePassword: false });

      // Redirect to dashboard after brief confirmation
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app, #f8fafc)',
        padding: '1.5rem',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Theme toggle in top right */}
      <button
        type="button"
        onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-secondary, #64748b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
          padding: '2.25rem 2rem',
          boxSizing: 'border-box',
        }}
      >
        {/* LOGO & BRANDING */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(8, 145, 178, 0.25)',
            }}
          >
            <Heart size={22} fill="white" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Green Dwarf Tech HMS
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>
              Hospital Operations Security
            </div>
          </div>
        </div>

        {/* HEADER NOTICE */}
        <div
          style={{
            background: 'rgba(8, 145, 178, 0.08)',
            border: '1px solid rgba(8, 145, 178, 0.25)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <KeyRound size={22} color="#0891b2" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              Temporary Password Change Required
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem', lineHeight: 1.45 }}>
              Your account was created with a temporary password. Before accessing your staff dashboard, you must establish a secure permanent password.
            </div>
            {user?.email && (
              <div style={{ fontSize: '0.75rem', color: '#0891b2', fontWeight: 600, marginTop: '0.4rem' }}>
                Account: {user.fullName || user.firstName || 'Staff'} ({user.email})
              </div>
            )}
          </div>
        </div>

        {/* SUCCESS BANNER */}
        {success && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#065f46',
            }}
          >
            <CheckCircle2 size={20} color="#10b981" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Password updated successfully! Redirecting to your dashboard...
            </span>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#991b1b',
            }}
          >
            <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* CURRENT TEMPORARY PASSWORD */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Current Temporary Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                name="currentPassword"
                placeholder="Enter the temporary password received via email"
                value={formData.currentPassword}
                onChange={handleChange}
                className="form-input"
                style={{
                  height: '42px',
                  fontSize: '0.875rem',
                  paddingRight: '40px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* NEW PERMANENT PASSWORD */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              New Permanent Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                name="newPassword"
                placeholder="Choose a strong new password"
                value={formData.newPassword}
                onChange={handleChange}
                className="form-input"
                style={{
                  height: '42px',
                  fontSize: '0.875rem',
                  paddingRight: '40px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Confirm New Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                name="confirmPassword"
                placeholder="Re-enter your new permanent password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                style={{
                  height: '42px',
                  fontSize: '0.875rem',
                  paddingRight: '40px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #64748b)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* PASSWORD POLICY CHECKLIST */}
          <div
            style={{
              background: 'var(--bg-surface, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '10px',
              padding: '0.85rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary, #64748b)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.minLength ? '#10b981' : undefined }}>
              {checks.minLength ? <Check size={13} /> : <X size={13} />}
              <span>At least 8 characters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.hasUpper ? '#10b981' : undefined }}>
              {checks.hasUpper ? <Check size={13} /> : <X size={13} />}
              <span>At least 1 uppercase (A-Z)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.hasLower ? '#10b981' : undefined }}>
              {checks.hasLower ? <Check size={13} /> : <X size={13} />}
              <span>At least 1 lowercase (a-z)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.hasDigit ? '#10b981' : undefined }}>
              {checks.hasDigit ? <Check size={13} /> : <X size={13} />}
              <span>At least 1 number (0-9)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.hasSpecial ? '#10b981' : undefined }}>
              {checks.hasSpecial ? <Check size={13} /> : <X size={13} />}
              <span>At least 1 special symbol</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: checks.matches ? '#10b981' : undefined }}>
              {checks.matches ? <Check size={13} /> : <X size={13} />}
              <span>Passwords match</span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading || success || !isFormValid}
            className="btn btn--primary"
            style={{
              height: '44px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              cursor: (!isFormValid || loading || success) ? 'not-allowed' : 'pointer',
              opacity: (!isFormValid || loading || success) ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Updating Password...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Save Password & Access Dashboard</span>
              </>
            )}
          </button>

          {/* CANCEL / SIGN OUT */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #64748b)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              padding: '0.4rem',
              marginTop: '0.25rem',
            }}
          >
            <LogOut size={14} />
            <span>Cancel and Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
