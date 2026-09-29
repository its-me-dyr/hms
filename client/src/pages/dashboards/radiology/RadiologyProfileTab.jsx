/**
 * Radiology Staff Profile & Security Tab
 * 
 * Account management, professional credentials, and security settings:
 * - Update profile information (phone, qualifications, department title)
 * - Password update with current password validation
 */

import { useState } from 'react';
import {
  User,
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { radiologyService } from '../../../services/radiology.service';

export default function RadiologyProfileTab({ user }) {
  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    specialization: user?.specialization || 'Radiology Specialist',
    qualifications: user?.qualifications || 'B.Sc Medical Imaging Technology / DMRD',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      await radiologyService.updateProfile(profileForm);
      setProfileSuccess('Profile credentials successfully updated!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setProfileError(err.response?.data?.message || 'Error updating profile details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await radiologyService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.message || 'Error changing password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="lab-container">
      {/* ── Page Header ── */}
      <div className="lab-header">
        <div className="lab-header-left">
          <div className="radiology-header-badge">
            <User size={13} />
            <span>STAFF PROFILE & AUTHENTICATION</span>
          </div>
          <h1 className="lab-header-title">Staff Profile & Security</h1>
          <p className="lab-header-subtitle">
            Manage your personal profile, department credentials, and portal authentication credentials.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Profile Card */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: '#6366f1' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Personal Information</h3>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profileSuccess && (
              <div className="lab-alert-banner lab-alert-banner-success">
                <CheckCircle2 size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="lab-alert-banner lab-alert-banner-error">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Account Email
              </label>
              <input
                type="text"
                disabled
                className="lab-input"
                value={user?.email || ''}
                style={{ width: '100%', background: '#f1f5f9', color: '#64748b' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Managed by hospital administrator</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  First Name
                </label>
                <input
                  type="text"
                  className="lab-input"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  className="lab-input"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Contact Phone Number
              </label>
              <input
                type="text"
                className="lab-input"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Specialization / Clinical Role
              </label>
              <input
                type="text"
                className="lab-input"
                value={profileForm.specialization}
                onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Professional Qualifications & Registration
              </label>
              <input
                type="text"
                className="lab-input"
                value={profileForm.qualifications}
                onChange={(e) => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="lab-btn lab-btn-primary"
                style={{ background: '#6366f1', borderColor: '#4f46e5' }}
                disabled={profileSaving}
              >
                <Save size={15} />
                <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Password / Security Card */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Security & Password</h3>
            </div>
          </div>

          <form onSubmit={handleChangePassword} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {passwordSuccess && (
              <div className="lab-alert-banner lab-alert-banner-success">
                <CheckCircle2 size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="lab-alert-banner lab-alert-banner-error">
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Current Password *
              </label>
              <input
                type="password"
                required
                className="lab-input"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                New Password *
              </label>
              <input
                type="password"
                required
                className="lab-input"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Minimum 6 characters</span>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                className="lab-input"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="lab-btn lab-btn-primary"
                style={{ background: '#10b981', borderColor: '#059669' }}
                disabled={passwordSaving}
              >
                <Key size={15} />
                <span>{passwordSaving ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
