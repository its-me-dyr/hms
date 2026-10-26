import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../context/useAuth';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

/**
 * HospitalProfileTab
 * 
 * Clean, production-ready PERSONAL PROFILE page for the currently authenticated Hospital Admin.
 * 
 * Provides:
 * 1. Profile Header: Avatar/Initials, Full Name, HOSPITAL ADMIN role badge, Official Email, Account Status.
 * 2. Personal Information: Full Name, Official Email (Read-only), Phone, Personal Address (Street, City, State, Postal Code, Country).
 * 3. Account Information: Read-only Role, Account Status, Account Created Date, Last Login, Account ID with copy.
 * 4. Password & Security: Current Password verification, New Password with confirmation, bcrypt backend persistence.
 * 
 * Strictly Personal: No hospital settings, system configurations, roles/permissions matrix, or notifications mixed in.
 */
export default function HospitalProfileTab() {
  const { user: authUser, updateUser } = useAuth();

  // Authoritative Server Data
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editable Form State
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  // Server Baseline for Change Detection & Reset
  const [initialForm, setInitialForm] = useState(null);

  // Profile Save Feedback
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ msg: '', isError: false });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ msg: '', isError: false });

  // User ID Clipboard Copy
  const [copiedId, setCopiedId] = useState(false);

  // 1. Fetch Authoritative Profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hospitalAdminService.getMyProfile();
      const userData = res?.data?.data || res?.data || res || {};

      if (userData && (userData._id || userData.id)) {
        setProfile(userData);

        const loadedFullName =
          userData.fullName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

        const loadedForm = {
          fullName: loadedFullName,
          phone: userData.phone || '',
          address: {
            street: userData.address?.street || '',
            city: userData.address?.city || '',
            state: userData.address?.state || '',
            postalCode: userData.address?.postalCode || '',
            country: userData.address?.country || '',
          },
        };

        setForm(loadedForm);
        setInitialForm(loadedForm);

        // Synchronize auth context with fresh user data
        if (updateUser) {
          updateUser(userData);
        }
      } else {
        throw new Error('Incomplete profile data received from server.');
      }
    } catch (err) {
      console.error('Error loading Hospital Admin profile:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load your profile.'
      );
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Unsaved Changes Detection
  const hasUnsavedChanges = initialForm
    ? form.fullName !== initialForm.fullName ||
      form.phone !== initialForm.phone ||
      form.address.street !== initialForm.address.street ||
      form.address.city !== initialForm.address.city ||
      form.address.state !== initialForm.address.state ||
      form.address.postalCode !== initialForm.address.postalCode ||
      form.address.country !== initialForm.address.country
    : false;

  // Reset Changes to Server Baseline
  const handleResetForm = () => {
    if (initialForm) {
      setForm(initialForm);
      setProfileFeedback({ msg: '', isError: false });
    }
  };

  // 2. Save Personal Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileFeedback({ msg: '', isError: false });

    const trimmedFull = form.fullName.trim();

    // Validation: Full Name required, reasonable length
    if (!trimmedFull) {
      setProfileFeedback({ msg: 'Full name is required and cannot be empty.', isError: true });
      return;
    }
    if (trimmedFull.length > 100) {
      setProfileFeedback({ msg: 'Full name cannot exceed 100 characters.', isError: true });
      return;
    }

    // Validation: Phone format if provided
    const trimmedPhone = form.phone.trim();
    if (trimmedPhone && !/^[+0-9\s\-().]{7,25}$/.test(trimmedPhone)) {
      setProfileFeedback({
        msg: 'Please enter a valid phone number format (e.g. +1 555-0199).',
        isError: true,
      });
      return;
    }

    setSavingProfile(true);

    try {
      const parts = trimmedFull.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || parts[0];

      const payload = {
        fullName: trimmedFull,
        firstName,
        lastName,
        phone: trimmedPhone,
        address: {
          street: form.address.street.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          postalCode: form.address.postalCode.trim(),
          country: form.address.country.trim(),
        },
      };

      const res = await hospitalAdminService.updateMyProfile(payload);
      const updatedUser = res?.data?.data || res?.data || res || {};

      setProfile(updatedUser);

      const refreshedFullName =
        updatedUser.fullName ||
        `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() ||
        trimmedFull;

      const refreshedForm = {
        fullName: refreshedFullName,
        phone: updatedUser.phone !== undefined ? updatedUser.phone : trimmedPhone,
        address: {
          street: updatedUser.address?.street !== undefined ? updatedUser.address.street : form.address.street.trim(),
          city: updatedUser.address?.city !== undefined ? updatedUser.address.city : form.address.city.trim(),
          state: updatedUser.address?.state !== undefined ? updatedUser.address.state : form.address.state.trim(),
          postalCode: updatedUser.address?.postalCode !== undefined ? updatedUser.address.postalCode : form.address.postalCode.trim(),
          country: updatedUser.address?.country !== undefined ? updatedUser.address.country : form.address.country.trim(),
        },
      };

      setForm(refreshedForm);
      setInitialForm(refreshedForm);

      if (updateUser) {
        updateUser(updatedUser);
      }

      setProfileFeedback({ msg: 'Profile updated successfully!', isError: false });
      setTimeout(() => {
        setProfileFeedback((prev) => (prev.isError ? prev : { msg: '', isError: false }));
      }, 4000);
    } catch (err) {
      setProfileFeedback({
        msg: err.response?.data?.message || err.message || 'Failed to update profile.',
        isError: true,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // 3. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback({ msg: '', isError: false });

    if (!passwordForm.currentPassword) {
      setPasswordFeedback({ msg: 'Current password is required.', isError: true });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordFeedback({ msg: 'New password must be at least 8 characters long.', isError: true });
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordFeedback({ msg: 'New password cannot be identical to current password.', isError: true });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({ msg: 'New passwords do not match.', isError: true });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await hospitalAdminService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      const message =
        res?.data?.message ||
        res?.message ||
        'Password changed successfully!';

      setPasswordFeedback({ msg: message, isError: false });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        setPasswordFeedback((prev) => (prev.isError ? prev : { msg: '', isError: false }));
      }, 5000);
    } catch (err) {
      setPasswordFeedback({
        msg:
          err.response?.data?.message ||
          err.message ||
          'Failed to change password. Please verify your current password.',
        isError: true,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Copy Account ID
  const handleCopyId = () => {
    const idToCopy = profile?._id || profile?.id || authUser?._id || '';
    if (idToCopy) {
      navigator.clipboard.writeText(String(idToCopy));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Generate Initials
  const getInitials = (first, last, full) => {
    if (first || last) {
      const f = first ? first.charAt(0).toUpperCase() : '';
      const l = last ? last.charAt(0).toUpperCase() : '';
      return `${f}${l}` || 'HA';
    }
    if (full) {
      const parts = full.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return full.slice(0, 2).toUpperCase();
    }
    return 'HA';
  };

  // Loading Skeleton State
  if (loading && !profile) {
    return (
      <div className="ha-profile-tab">
        <div className="ha-page-header">
          <div className="ha-page-header__left">
            <h1 className="ha-page-title">My Profile</h1>
            <p className="ha-page-description">
              Personal administrator details, contact information, and account security.
            </p>
          </div>
        </div>

        <div className="ha-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-hover)',
              margin: '0 auto 1.25rem auto',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div
            style={{
              height: '22px',
              width: '200px',
              backgroundColor: 'var(--bg-hover)',
              margin: '0 auto 0.75rem auto',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div
            style={{
              height: '14px',
              width: '260px',
              backgroundColor: 'var(--bg-hover)',
              margin: '0 auto',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error && !profile) {
    return (
      <div className="ha-profile-tab">
        <div className="ha-page-header">
          <div className="ha-page-header__left">
            <h1 className="ha-page-title">My Profile</h1>
            <p className="ha-page-description">
              Personal administrator details, contact information, and account security.
            </p>
          </div>
        </div>

        <div className="ha-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <AlertCircle size={28} color="#ef4444" />
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
            }}
          >
            Unable to load your profile.
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              maxWidth: '440px',
              margin: '0 auto 1.5rem auto',
            }}
          >
            {error}
          </p>
          <button
            type="button"
            className="ha-btn ha-btn--primary ha-btn--sm"
            onClick={fetchProfile}
          >
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Authoritative Derived Display Values
  const userFullName =
    form.fullName ||
    profile?.fullName ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    'Hospital Administrator';

  const userEmail = profile?.email || authUser?.email || '—';
  const userStatus = (profile?.status || authUser?.status || 'active').toUpperCase();
  const initials = getInitials(profile?.firstName, profile?.lastName, userFullName);

  const formattedCreatedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not provided';

  const formattedLastLogin = profile?.lastLogin
    ? new Date(profile.lastLogin).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Current session';

  return (
    <div className="ha-profile-tab">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="ha-page-header">
        <div className="ha-page-header__left">
          <h1 className="ha-page-title">My Profile</h1>
          <p className="ha-page-description">
            Personal administrator details, contact information, and account security.
          </p>
        </div>
      </div>

      {/* ─── 2. Profile Header Card ─────────────────────────────────── */}
      <div className="ha-profile-header-card">
        {/* Avatar / Initials */}
        <div className="ha-profile-avatar">
          {profile?.profileImage ? (
            <img src={profile.profileImage} alt={userFullName} />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Identity Details */}
        <div className="ha-profile-header-info">
          <div className="ha-profile-name-row">
            <h2 className="ha-profile-name">{userFullName}</h2>

            <span
              className="ha-badge"
              style={{
                backgroundColor: 'rgba(8, 145, 178, 0.12)',
                color: '#0891B2',
                border: '1px solid rgba(8, 145, 178, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Shield size={11} />
              HOSPITAL ADMIN
            </span>

            <span
              className={`ha-badge ${
                userStatus === 'ACTIVE'
                  ? 'ha-badge--success'
                  : userStatus === 'SUSPENDED'
                  ? 'ha-badge--danger'
                  : 'ha-badge--info'
              }`}
            >
              {userStatus}
            </span>
          </div>

          <div className="ha-profile-meta-row">
            <span className="ha-profile-meta-item">
              <Mail size={14} color="#0891B2" />
              <span>{userEmail}</span>
            </span>

            {profile?.phone && (
              <span className="ha-profile-meta-item">
                <Phone size={14} color="#0891B2" />
                <span>{profile.phone}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="ha-profile-layout">
        {/* ============================================================== */}
        {/* 3. PERSONAL INFORMATION SECTION                                 */}
        {/* ============================================================== */}
        <div className="ha-panel" style={{ margin: 0 }}>
          <div className="ha-panel__header">
            <h2 className="ha-panel__title">
              <User size={18} color="#0891B2" />
              Personal Information
            </h2>
            {hasUnsavedChanges && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#d97706',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                Unsaved changes
              </span>
            )}
          </div>

          <div className="ha-panel__body">
            {profileFeedback.msg && (
              <div
                className={`ha-alert ${
                  profileFeedback.isError ? 'ha-alert--error' : 'ha-alert--success'
                }`}
                role="alert"
              >
                {profileFeedback.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{profileFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Full Name */}
                <div className="ha-form-group">
                  <label htmlFor="profile-full-name">
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="profile-full-name"
                    name="fullName"
                    type="text"
                    required
                    maxLength={100}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Enter full name"
                    autoComplete="name"
                  />
                </div>

                {/* 2. Official Email (Read-only) */}
                <div className="ha-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="profile-email">Official Email</label>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Login Identity (Read-only)
                    </span>
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    value={userEmail}
                    disabled
                    readOnly
                    autoComplete="email"
                    style={{
                      cursor: 'not-allowed',
                      opacity: 0.85,
                    }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Official email address is your login identity and cannot be modified here.
                  </small>
                </div>

                {/* 3. Phone */}
                <div className="ha-form-group">
                  <label htmlFor="profile-phone">Phone</label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +1 555-0199 (optional)"
                    autoComplete="tel"
                  />
                </div>

                {/* 4. Personal Address */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Personal Address
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div className="ha-form-group">
                      <label htmlFor="profile-street">Street Address</label>
                      <input
                        id="profile-street"
                        type="text"
                        value={form.address.street}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            address: { ...form.address, street: e.target.value },
                          })
                        }
                        placeholder="Street address (optional)"
                        autoComplete="street-address"
                      />
                    </div>

                    <div className="ha-form-grid">
                      <div className="ha-form-group">
                        <label htmlFor="profile-city">City</label>
                        <input
                          id="profile-city"
                          type="text"
                          value={form.address.city}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address: { ...form.address, city: e.target.value },
                            })
                          }
                          placeholder="City"
                          autoComplete="address-level2"
                        />
                      </div>

                      <div className="ha-form-group">
                        <label htmlFor="profile-state">State / Province</label>
                        <input
                          id="profile-state"
                          type="text"
                          value={form.address.state}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address: { ...form.address, state: e.target.value },
                            })
                          }
                          placeholder="State / Province"
                          autoComplete="address-level1"
                        />
                      </div>
                    </div>

                    <div className="ha-form-grid">
                      <div className="ha-form-group">
                        <label htmlFor="profile-postal">Postal / Zip Code</label>
                        <input
                          id="profile-postal"
                          type="text"
                          value={form.address.postalCode}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address: { ...form.address, postalCode: e.target.value },
                            })
                          }
                          placeholder="Postal code"
                          autoComplete="postal-code"
                        />
                      </div>

                      <div className="ha-form-group">
                        <label htmlFor="profile-country">Country</label>
                        <input
                          id="profile-country"
                          type="text"
                          value={form.address.country}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              address: { ...form.address, country: e.target.value },
                            })
                          }
                          placeholder="Country"
                          autoComplete="country-name"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8. Save Changes & 9. Cancel / Reset */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    className="ha-btn ha-btn--secondary"
                    onClick={handleResetForm}
                    disabled={savingProfile}
                  >
                    <RotateCcw size={14} />
                    Reset Changes
                  </button>
                )}

                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={!hasUnsavedChanges || savingProfile}
                >
                  <Save size={14} />
                  {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: Account Information & Password Security              */}
        {/* ============================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 10. Account Information Card */}
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <Shield size={18} color="#0891B2" />
                Account Information
              </h2>
            </div>
            <div className="ha-panel__body">
              <div className="ha-profile-info-grid">
                {/* 11. Role (Read-only) */}
                <div className="ha-profile-info-box">
                  <span className="ha-profile-info-label">Assigned Role</span>
                  <span className="ha-profile-info-val">Hospital Administrator</span>
                  <span className="ha-profile-info-sub">HOSPITAL ADMIN • Read-only</span>
                </div>

                {/* 12. Account Status (Read-only) */}
                <div className="ha-profile-info-box">
                  <span className="ha-profile-info-label">Account Status</span>
                  <span className="ha-profile-info-val">{userStatus}</span>
                  <span className="ha-profile-info-sub">System state • Read-only</span>
                </div>

                {/* Account Created Date */}
                <div className="ha-profile-info-box">
                  <span className="ha-profile-info-label">Account Created</span>
                  <span className="ha-profile-info-val">{formattedCreatedDate}</span>
                  <span className="ha-profile-info-sub">Registration date</span>
                </div>

                {/* Last Login */}
                <div className="ha-profile-info-box">
                  <span className="ha-profile-info-label">Last Login</span>
                  <span className="ha-profile-info-val">{formattedLastLogin}</span>
                  <span className="ha-profile-info-sub">Session access</span>
                </div>
              </div>

              {/* Account ID Row with Copy */}
              <div className="ha-profile-id-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Account ID:</span>
                  <code style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {profile?._id || profile?.id || '—'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedId ? '#10b981' : 'var(--text-secondary)',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                  }}
                  title="Copy Account ID"
                  aria-label="Copy Account ID"
                >
                  {copiedId ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div
                style={{
                  marginTop: '0.875rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <Shield size={12} color="#0891B2" />
                Administrative privileges and role assignments are governed strictly by the Super Administrator.
              </div>
            </div>
          </div>

          {/* 13. Password & Security Card */}
          <div className="ha-panel" style={{ margin: 0 }}>
            <div className="ha-panel__header">
              <h2 className="ha-panel__title">
                <KeyRound size={18} color="#0891B2" />
                Password & Security
              </h2>
            </div>
            <div className="ha-panel__body">
              {passwordFeedback.msg && (
                <div
                  className={`ha-alert ${
                    passwordFeedback.isError ? 'ha-alert--error' : 'ha-alert--success'
                  }`}
                  role="alert"
                >
                  {passwordFeedback.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{passwordFeedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Current Password */}
                  <div className="ha-form-group">
                    <label htmlFor="profile-current-pass">
                      Current Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="ha-profile-pass-wrap">
                      <input
                        id="profile-current-pass"
                        type={showCurrentPass ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                        }
                        placeholder="Enter current password"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        className="ha-profile-pass-toggle"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        aria-label={showCurrentPass ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="ha-form-group">
                    <label htmlFor="profile-new-pass">
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="ha-profile-pass-wrap">
                      <input
                        id="profile-new-pass"
                        type={showNewPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                        }
                        placeholder="Min. 8 characters"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        className="ha-profile-pass-toggle"
                        onClick={() => setShowNewPass(!showNewPass)}
                        aria-label={showNewPass ? 'Hide password' : 'Show password'}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="ha-form-group">
                    <label htmlFor="profile-confirm-pass">
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div className="ha-profile-pass-wrap">
                      <input
                        id="profile-confirm-pass"
                        type={showConfirmPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                        }
                        placeholder="Confirm new password"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        className="ha-profile-pass-toggle"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    type="submit"
                    className="ha-btn ha-btn--primary"
                    disabled={
                      passwordLoading ||
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword
                    }
                  >
                    <KeyRound size={14} />
                    {passwordLoading ? 'Updating Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
