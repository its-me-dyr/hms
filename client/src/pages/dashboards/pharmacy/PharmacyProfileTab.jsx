/**
 * Pharmacy Staff Profile & Security Tab
 * 
 * Pharmacist personal info, professional credentials,
 * shift/department management, and secure password update.
 */

import { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Mail,
  Phone,
  Building,
  Award,
  CheckCircle,
  AlertCircle,
  Clock,
  FileCheck,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { pharmacyService } from '../../../services/pharmacy.service';

export default function PharmacyProfileTab() {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || (user?.fullName ? user.fullName.split(' ')[0] : 'Pharmacy'),
    lastName: user?.lastName || (user?.fullName ? user.fullName.split(' ').slice(1).join(' ') : 'Staff'),
    phone: user?.phone || '+1 (555) 432-8765',
    department: user?.department || 'Central Hospital Pharmacy',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      const res = await pharmacyService.updateProfile(profileForm);
      const updatedData = res.data?.data || res.data || profileForm;
      updateUser({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        fullName: `${profileForm.firstName} ${profileForm.lastName}`,
        phone: profileForm.phone,
        department: profileForm.department,
      });
      setProfileSuccess('Profile information updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile information.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordChanging(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordChanging(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setPasswordChanging(false);
      return;
    }

    try {
      await pharmacyService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully. Your account is secured.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.message || 'Current password is incorrect or update failed.');
    } finally {
      setPasswordChanging(false);
    }
  };

  const initials = `${profileForm.firstName?.charAt(0) || 'P'}${profileForm.lastName?.charAt(0) || 'S'}`.toUpperCase();

  return (
    <div className="pharm-page-container">
      {/* Header */}
      <div className="pharm-page-header">
        <div>
          <h1 className="pharm-page-title">Pharmacy Staff Profile & Security</h1>
          <p className="pharm-page-subtitle">
            Manage your personal hospital credentials, pharmacy workstation permissions, and account security.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Pharmacist Identity & Credentials Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identity Card */}
          <div className="pharm-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(13, 148, 136, 0.25)',
              }}
            >
              {initials}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              {profileForm.firstName} {profileForm.lastName}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '16px', background: '#ecfdf5', color: '#059669', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Active Licensed Pharmacist
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Mail size={16} color="#0d9488" />
                <span>{user?.email || 'pharmacist@hms.com'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Phone size={16} color="#0d9488" />
                <span>{profileForm.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Building size={16} color="#0d9488" />
                <span>{profileForm.department}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Award size={16} color="#0d9488" />
                <span>Registration No: <strong>RPH-2026-9042</strong></span>
              </div>
            </div>
          </div>

          {/* Workstation & Security Authorizations */}
          <div className="pharm-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Shield size={18} color="#0d9488" />
              Operational Clearances
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-hover)' }}>
                <FileCheck size={18} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Prescription Dispensing</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Authorized to review, verify, and dispense Schedule II-IV Rx.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-hover)' }}>
                <Clock size={18} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Work Shift Schedule</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Central Dispensary — Day Shift (08:00 AM – 04:30 PM).</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-hover)' }}>
                <CheckCircle size={18} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Billing & POS Register Access</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Cash, Card, and Hospital Patient Credit terminal access.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Edit Profile Details */}
          <div className="pharm-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <User size={20} color="#0d9488" />
              Personal & Employment Information
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              Update your name, emergency contact phone, and assigned hospital pharmacy division.
            </p>

            {profileSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '20px', border: '1px solid #a7f3d0' }}>
                <CheckCircle size={18} />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '20px', border: '1px solid #fecaca' }}>
                <AlertCircle size={18} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="pharm-form-group">
                  <label className="pharm-form-label">First Name</label>
                  <input
                    type="text"
                    required
                    className="pharm-input"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  />
                </div>
                <div className="pharm-form-group">
                  <label className="pharm-form-label">Last Name</label>
                  <input
                    type="text"
                    required
                    className="pharm-input"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="pharm-form-group">
                  <label className="pharm-form-label">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    className="pharm-input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="pharm-form-group">
                  <label className="pharm-form-label">Assigned Department</label>
                  <input
                    type="text"
                    required
                    className="pharm-input"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="pharm-btn pharm-btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  <Save size={16} />
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Account Security & Password Change */}
          <div className="pharm-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Key size={20} color="#0d9488" />
              Account Security & Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              Change your login password to ensure security compliance across hospital pharmacy terminals.
            </p>

            {passwordSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '20px', border: '1px solid #a7f3d0' }}>
                <CheckCircle size={18} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '20px', border: '1px solid #fecaca' }}>
                <AlertCircle size={18} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="pharm-form-group" style={{ marginBottom: '16px' }}>
                <label className="pharm-form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    className="pharm-input"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                  <Lock size={16} color='var(--text-muted)' style={{ position: 'absolute', right: '12px', top: '12px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="pharm-form-group">
                  <label className="pharm-form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      className="pharm-input"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    <Lock size={16} color='var(--text-muted)' style={{ position: 'absolute', right: '12px', top: '12px' }} />
                  </div>
                </div>

                <div className="pharm-form-group">
                  <label className="pharm-form-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      className="pharm-input"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                    <Lock size={16} color='var(--text-muted)' style={{ position: 'absolute', right: '12px', top: '12px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="pharm-btn pharm-btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  <Lock size={16} />
                  {passwordChanging ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
