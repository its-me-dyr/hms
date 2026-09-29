/**
 * Reception Profile Tab
 * 
 * Receptionist staff personal workspace & security:
 * - Staff identity card with Duty Desk and Shift details
 * - Contact details modification
 * - Secure password change form with validation
 * - Desk session & shift handover notes
 */

import { useState } from 'react';
import {
  Mail,
  Phone,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { receptionService } from '../../../services/reception.service';

export default function ReceptionProfileTab({ user }) {
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || 'Reception',
    lastName: user?.lastName || 'Staff',
    email: user?.email || 'reception@hms.com',
    phone: user?.phone || '+1 555-019-2834',
    deskLocation: 'Main Atrium - Desk 1',
    shift: 'Morning (08:00 AM - 04:00 PM)',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Update Profile Submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    try {
      await receptionService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      });
      setFeedback({
        type: 'success',
        text: 'Profile details updated successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFeedback({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setFeedback({
        type: 'error',
        text: 'Password must be at least 8 characters long.',
      });
      return;
    }

    setChangingPassword(true);
    try {
      await receptionService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setFeedback({
        type: 'success',
        text: 'Password updated successfully!',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to change password.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="rec-container">
      {/* Header */}
      <div className="rec-header">
        <div className="rec-header-left">
          <div className="rec-header-badge">STAFF ACCOUNT</div>
          <h1 className="rec-header-title">Receptionist Profile & Security</h1>
          <p className="rec-header-subtitle">
            Manage your front-desk personnel profile, contact details, assigned station, and security credentials.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rec-alert ${
            feedback.type === 'error' ? 'rec-alert--error' : 'rec-alert--success'
          }`}
          style={{ marginBottom: '1.5rem' }}
        >
          {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span style={{ flex: 1 }}>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="rec-profile-grid">
        {/* Left Column: Staff Badge Card + Shift Details */}
        <div>
          {/* Identity Card */}
          <div className="rec-card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(8, 145, 178, 0.12)',
                color: '#0891b2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '2rem',
                margin: '0 auto 1rem',
                border: '3px solid #0891b2',
              }}
            >
              {(profileData.firstName || 'R').charAt(0).toUpperCase()}
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
              {profileData.firstName} {profileData.lastName}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Front Desk Operations Specialist
            </div>

            <span className="rec-badge rec-badge--confirmed" style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}>
              RECEPTIONIST • ACTIVE
            </span>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#334155' }}>
                <Mail size={16} style={{ color: '#0891b2' }} />
                <span>{profileData.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#334155' }}>
                <Phone size={16} style={{ color: '#0891b2' }} />
                <span>{profileData.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#334155' }}>
                <Building size={16} style={{ color: '#0891b2' }} />
                <span>{profileData.deskLocation}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#334155' }}>
                <Clock size={16} style={{ color: '#0891b2' }} />
                <span>{profileData.shift}</span>
              </div>
            </div>
          </div>

          {/* Shift Handover Card */}
          <div className="rec-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Front Desk Handover Protocol
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
              Ensure all pending OPD tokens are cleared or transferred before logging off. Count daily cash register balance and submit to Chief Cashier at shift conclusion.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#0891b2', fontWeight: 600 }}>
              Hospital Emergency Line: Ext. 999
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile + Password Change */}
        <div>
          {/* Edit Profile Card */}
          <div className="rec-card" style={{ marginBottom: '1.5rem' }}>
            <div className="rec-card-header">
              <h2 className="rec-card-title">Personal Information</h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Update contact information</span>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div style={{ padding: '1.25rem' }}>
                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">First Name</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Last Name</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                </div>

                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">Email Address (Read-only)</label>
                    <input
                      type="email"
                      disabled
                      value={profileData.email}
                      className="rec-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Contact Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="rec-btn rec-btn--primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? <RefreshCw size={16} className="rec-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="rec-card">
            <div className="rec-card-header">
              <h2 className="rec-card-title">Security & Password</h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Change account password</span>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ padding: '1.25rem' }}>
                <div className="rec-form-group">
                  <label className="rec-form-label">Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="rec-form-input"
                  />
                </div>

                <div className="rec-form-row">
                  <div className="rec-form-group">
                    <label className="rec-form-label">New Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                  <div className="rec-form-group">
                    <label className="rec-form-label">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="rec-form-input"
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="rec-btn rec-btn--primary"
                    disabled={changingPassword}
                  >
                    {changingPassword ? <RefreshCw size={16} className="rec-spin" /> : 'Update Password'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
