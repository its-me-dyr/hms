/**
 * Super Admin Profile View
 * 
 * Production-ready personal profile console for the authenticated SUPER_ADMIN:
 * 1. Profile Header: Avatar/Initials, Full Name, SUPER ADMIN badge, Official Email, Status.
 * 2. Personal Information: First Name, Last Name, Phone, Address (View & Edit with cancel/save).
 * 3. Account Information: Informational view of Role, Status, Creation Date, Last Login, ID.
 * 4. Security: Change Password with bcrypt verification and audit logging.
 * 5. Session Overview: Real browser, device, IP address, and login timestamps.
 * 6. Account Actions: Log Out with root protection notice.
 * 
 * Reuses global ThemeContext, AuthContext, superadminService, and .sa-card design.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/useAuth';
import { superadminService } from '../../services/superadmin.service';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  KeyRound,
  Lock,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Edit3,
  LogOut,
  Settings,
  Calendar,
  Globe,
  Check,
  Copy,
} from 'lucide-react';

export default function SuperAdminProfileView({ onNavigateTab }) {
  const { user: authUser, updateUser, logout } = useAuth();

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Profile Data from Backend
  const [profile, setProfile] = useState(null);

  // Edit Mode Toggle
  const [isEditing, setIsEditing] = useState(false);

  // Editable Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage('');
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setSuccessMessage(msg);
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 4500);
    }
  };

  // 1. Fetch real Super Admin profile from backend
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await superadminService.getProfile();
      if (res?.data) {
        const p = res.data.data || res.data;
        setProfile(p);
        setProfileForm({
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          phone: p.phone || '',
          address: {
            street: p.address?.street || '',
            city: p.address?.city || '',
            state: p.address?.state || '',
            postalCode: p.address?.postalCode || '',
            country: p.address?.country || '',
          },
        });
      }
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Cancel editing - reset form to last fetched profile
  const handleCancelEdit = () => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          postalCode: profile.address?.postalCode || '',
          country: profile.address?.country || '',
        },
      });
    }
    setIsEditing(false);
  };

  // Save profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.firstName.trim()) {
      showToast('First name is required.', true);
      return;
    }
    if (!profileForm.lastName.trim()) {
      showToast('Last name is required.', true);
      return;
    }

    try {
      setSavingProfile(true);
      const res = await superadminService.updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
        address: {
          street: profileForm.address.street.trim(),
          city: profileForm.address.city.trim(),
          state: profileForm.address.state.trim(),
          postalCode: profileForm.address.postalCode.trim(),
          country: profileForm.address.country.trim(),
        },
      });

      const updated = res?.data?.data || res?.data;
      setProfile((prev) => ({ ...prev, ...updated }));
      setIsEditing(false);
      showToast(res?.data?.message || 'Profile updated successfully.');

      // Sync AuthContext if name updated
      if (typeof updateUser === 'function' && updated) {
        updateUser({
          firstName: updated.firstName,
          lastName: updated.lastName,
          fullName: updated.fullName || `${updated.firstName} ${updated.lastName}`.trim(),
          phone: updated.phone,
        });
      }
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update profile.', true);
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await superadminService.changeProfilePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      showToast(res?.data?.message || 'Password changed successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Copy Identifier
  const handleCopyId = () => {
    const idVal = profile?._id || profile?.id || 'super_admin_system';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(String(idVal));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Device Info parsing
  const getDeviceInfo = () => {
    if (typeof navigator === 'undefined') return 'Standard Desktop Browser';
    const ua = navigator.userAgent;
    let browser = 'Web Browser';
    if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
    else if (ua.includes('Edge')) browser = 'Microsoft Edge';

    let os = 'Desktop';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  // Format timestamps
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  };

  // Initials for avatar
  const initials = (() => {
    const fn = profile?.firstName || authUser?.firstName || 'Super';
    const ln = profile?.lastName || authUser?.lastName || 'Admin';
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
  })();

  const fullDisplayName =
    profile?.fullName ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    authUser?.fullName ||
    'Super Administrator';

  const officialEmail = profile?.email || authUser?.email || 'admin@hms.com';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%' }}>
      {/* ─── 1. Header Banner ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Avatar with Initials */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(8, 145, 178, 0.35) 100%)',
              border: '2px solid rgba(8, 145, 178, 0.5)',
              color: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: '1px',
            }}
          >
            {initials}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {fullDisplayName}
              </h2>
              <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                SUPER ADMIN
              </span>
              <span className="sa-badge sa-badge--success" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                ACTIVE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <Mail size={14} style={{ color: '#0891b2' }} />
              <span>{officialEmail}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Root Global Administration</span>
            </div>
          </div>
        </div>

        {typeof onNavigateTab === 'function' && (
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="btn btn--outline btn--sm"
            style={{ height: '34px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Settings size={14} style={{ color: '#0891b2' }} />
            <span>Preferences & Settings</span>
          </button>
        )}
      </div>

      {/* ─── Feedback Alerts ───────────────────────────────────────────────── */}
      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: 'rgba(5, 150, 105, 0.12)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#059669',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            color: '#f87171',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchProfile}
            className="btn btn--outline btn--sm"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', height: '28px', padding: '0 0.6rem', fontSize: '0.75rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Loading Skeleton ──────────────────────────────────────────────── */}
      {loading && !profile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="sa-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '20px', width: '35%', background: 'var(--border-color)', borderRadius: '4px' }} />
              <div style={{ height: '40px', width: '70%', background: 'var(--border-color)', borderRadius: '6px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* ─── 2. Personal Information Card ──────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <User size={18} style={{ color: '#0891b2' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Personal Information
                </h3>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn--outline btn--sm"
                  style={{ height: '32px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Edit3 size={13} style={{ color: '#0891b2' }} />
                  <span>Edit Profile</span>
                </button>
              ) : null}
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Manage your administrator name, direct contact number, and registered physical address.
            </p>

            {!isEditing ? (
              /* View Mode */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                    Full Name
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fullDisplayName}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                    Official Email
                  </span>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {officialEmail}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                    Contact Phone
                  </span>
                  <div style={{ fontSize: '0.92rem', color: profile?.phone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {profile?.phone || 'Not configured'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                    Physical Address
                  </span>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {profile?.address?.street || profile?.address?.city || profile?.address?.country ? (
                      [
                        profile.address.street,
                        profile.address.city,
                        profile.address.state,
                        profile.address.postalCode,
                        profile.address.country,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>No physical address recorded</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode Form */
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  {/* First Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      First Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder="First Name"
                      required
                      maxLength={50}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Last Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder="Last Name"
                      required
                      maxLength={50}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Official Email (Read-Only) */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Official Email
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Lock size={11} /> Read-only
                      </span>
                    </div>
                    <input
                      type="email"
                      value={officialEmail}
                      disabled
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'not-allowed',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                      Official root email is immutable for system security.
                    </span>
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+1 (800) 555-0100"
                      maxLength={25}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Street Address */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={profileForm.address.street}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, street: e.target.value },
                        })
                      }
                      placeholder="e.g. 500 Hospital Blvd, Suite 100"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={profileForm.address.city}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, city: e.target.value },
                        })
                      }
                      placeholder="City"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* State / Province */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={profileForm.address.state}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, state: e.target.value },
                        })
                      }
                      placeholder="State / Province"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Postal / ZIP Code
                    </label>
                    <input
                      type="text"
                      value={profileForm.address.postalCode}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, postalCode: e.target.value },
                        })
                      }
                      placeholder="Postal Code"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      Country
                    </label>
                    <input
                      type="text"
                      value={profileForm.address.country}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, country: e.target.value },
                        })
                      }
                      placeholder="Country"
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Edit Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                    className="btn btn--outline btn--sm"
                    style={{ height: '34px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RotateCcw size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn btn--primary btn--sm"
                    style={{
                      height: '34px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#0891b2',
                      borderColor: '#0891b2',
                      color: '#fff',
                    }}
                  >
                    <Save size={13} />
                    <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ─── 3. Account Information Card ───────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Shield size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Account Information
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              System-level properties and authentication credentials for this administrative account.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Account Role
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>SUPER ADMIN</strong>
                  <span className="sa-badge sa-badge--info" style={{ fontSize: '0.68rem' }}>Root Scope</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Account Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="sa-badge sa-badge--success" style={{ fontSize: '0.72rem' }}>ACTIVE</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Fully Verified</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Account Created
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={13} style={{ color: '#0891b2' }} />
                  <span>{formatTimestamp(profile?.createdAt)}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Last Login
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} style={{ color: '#0891b2' }} />
                  <span>{formatTimestamp(profile?.lastLogin)}</span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  System Identifier
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <code style={{ fontSize: '0.78rem', background: 'var(--bg-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    {profile?._id || profile?.id || 'super_admin_system'}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="btn btn--outline btn--sm"
                    style={{ height: '26px', padding: '0 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    {copiedId ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
                    <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 4. Security & Password Card ───────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <KeyRound size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Security & Password
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Update your Super Administrator root password. Changes are verified with bcrypt and logged in immutable security audit logs.
            </p>

            {passwordError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {/* Current Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      minLength={8}
                      required
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 2.4rem 0 0.75rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn btn--primary btn--sm"
                  style={{
                    height: '34px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#0891b2',
                    borderColor: '#0891b2',
                    color: '#fff',
                  }}
                >
                  <Lock size={13} />
                  <span>{savingPassword ? 'Updating...' : 'Change Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ─── 5. Session Overview Card ──────────────────────────────────── */}
          <div className="sa-card" style={{ padding: '1.35rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <Laptop size={18} style={{ color: '#0891b2' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Session Overview
              </h3>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Information regarding your current authenticated access session and connecting workstation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Current Session
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Active (Current Session)</strong>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Device & Browser
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {getDeviceInfo()}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Connecting IP
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={13} style={{ color: '#0891b2' }} />
                  <span>{profile?.session?.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.3rem' }}>
                  Authentication Mode
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Bearer JWT (RBAC Protected)
                </div>
              </div>
            </div>
          </div>

          {/* ─── 6. Account Actions Card ───────────────────────────────────── */}
          <div
            className="sa-card"
            style={{
              padding: '1.35rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                Sign Out of Current Session
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Terminate this administrative browser session. Root privileges are protected and cannot be revoked.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn btn--outline btn--sm"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                height: '34px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
