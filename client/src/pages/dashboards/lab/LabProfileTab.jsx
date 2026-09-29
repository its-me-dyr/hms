/**
 * Laboratory Technician Profile & Security Tab
 * 
 * Technician credentials and account administration:
 * - Contact information and departmental details
 * - Safe password change protocol
 * - Active security session verification
 */

import { useState } from 'react';
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  Clock,
  X,
  Lock,
} from 'lucide-react';
import { labService } from '../../../services/lab.service';

export default function LabProfileTab({ user }) {
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileFeedback(null);
    try {
      await labService.updateProfile({
        firstName,
        lastName,
        phone,
      });
      setProfileFeedback({ type: 'success', message: 'Profile details updated successfully.' });
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwdFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setPwdLoading(true);
    setPwdFeedback(null);
    try {
      await labService.changePassword({
        currentPassword,
        newPassword,
      });
      setPwdFeedback({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setPwdFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password. Ensure current password is correct.',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="lab-header-badge">
            <User size={13} />
            <span>SPECIALIST PROFILE & CREDENTIALS</span>
          </div>
          <h1 className="lab-header-title">Technician Profile</h1>
          <p className="lab-header-subtitle">
            Manage your personal credentials, departmental assignment, and account security.
          </p>
        </div>
      </div>

      <div className="lab-grid-2col">
        {/* Left: Profile Information Card */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <User size={18} className="lab-color-cyan" />
              <h2 className="lab-card__title">Personal & Contact Details</h2>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="lab-card__body">
              {profileFeedback && (
                <div className={`lab-alert lab-alert--${profileFeedback.type}`} style={{ marginBottom: '1rem' }}>
                  {profileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{profileFeedback.message}</span>
                  <button type="button" className="lab-alert-close" onClick={() => setProfileFeedback(null)}>
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="lab-form-grid">
                <div className="lab-form-group">
                  <label className="lab-form-label">First Name *</label>
                  <input
                    type="text"
                    className="lab-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="lab-form-group">
                  <label className="lab-form-label">Last Name *</label>
                  <input
                    type="text"
                    className="lab-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">Email Address (System ID)</label>
                <input
                  type="email"
                  className="lab-input"
                  value={user?.email || ''}
                  disabled
                />
                <span className="lab-sub-text">Email address is managed by Hospital Administration.</span>
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">Contact Phone Number</label>
                <input
                  type="tel"
                  className="lab-input"
                  placeholder="+18005550100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Departmental Badges */}
              <div className="lab-drawer-section" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
                <h4 className="lab-drawer-section__title">Clinical Affiliation</h4>
                <div className="lab-info-grid">
                  <div>
                    <span className="lab-info-label">Assigned Role:</span>
                    <span className="lab-status-badge lab-status-badge--cyan">LABORATORY SPECIALIST</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Department:</span>
                    <span className="lab-info-value">Central Diagnostic Laboratory</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Account Status:</span>
                    <span className="lab-status-badge lab-status-badge--green">ACTIVE & VERIFIED</span>
                  </div>
                  <div>
                    <span className="lab-info-label">Security Clearance:</span>
                    <span className="lab-info-value">Level 3 (Diagnostics & Phlebotomy)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lab-card__footer">
              <button
                type="submit"
                className="lab-btn lab-btn--primary"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Security & Password */}
        <div className="lab-card">
          <div className="lab-card__header">
            <div className="lab-card__title-group">
              <Shield size={18} className="lab-color-blue" />
              <h2 className="lab-card__title">Account Security & Password</h2>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="lab-card__body">
              {pwdFeedback && (
                <div className={`lab-alert lab-alert--${pwdFeedback.type}`} style={{ marginBottom: '1rem' }}>
                  {pwdFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{pwdFeedback.message}</span>
                  <button type="button" className="lab-alert-close" onClick={() => setPwdFeedback(null)}>
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="lab-form-group">
                <label className="lab-form-label">Current Password *</label>
                <input
                  type="password"
                  className="lab-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">New Password *</label>
                <input
                  type="password"
                  className="lab-input"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="lab-form-group" style={{ marginTop: '0.85rem' }}>
                <label className="lab-form-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="lab-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="lab-notes-box" style={{ marginTop: '1.25rem' }}>
                <Lock size={15} className="lab-color-cyan" style={{ flexShrink: 0 }} />
                <span>
                  All password updates are audited in compliance with HIPAA security standards.
                  Never share laboratory workstations or credentials.
                </span>
              </div>
            </div>

            <div className="lab-card__footer">
              <button
                type="submit"
                className="lab-btn lab-btn--secondary"
                disabled={pwdLoading || !currentPassword || !newPassword}
              >
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
