/**
 * HMS Login Page
 * 
 * Full-viewport split-screen SaaS layout matching the Registration page:
 * - Left panel: HMS branding, "Welcome Back" header, Email, Password, Remember Me,
 *   Forgot Password, Sign In action, and Account Status Banners.
 * - Right panel: Informational panel with badge, heading, description, and 4
 *   feature cards.
 * 
 * Connected to backend /api/v1/auth/login:
 * - Direct portal access for approved/active accounts
 * - Informative message for PENDING_VERIFICATION & UNDER_REVIEW
 * - Rejection message with reason and interactive Resubmit Application workflow for REJECTED staff.
 */

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { authService } from '../../services/auth.service';
import {
  Heart,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Calendar,
  Pill,
  Lock,
  XCircle,
  UploadCloud,
  RotateCcw,
  X,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

const HOSPITAL_DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Oncology',
  'Dermatology',
  'Emergency Medicine',
  'Radiology & Imaging',
  'Pathology & Laboratory',
  'Operation Theatre & Anesthesiology',
  'Pharmacy Services',
  'Front Desk & Patient Services',
  'Billing & Accounts',
  'Human Resources',
  'Blood Bank',
  'Hospital Administration',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, login } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  const [rememberMe, setRememberMe] = useState(() => {
    return Boolean(localStorage.getItem('hms_remember_email'));
  });

  const [formData, setFormData] = useState(() => ({
    email: location.state?.prefilledEmail || localStorage.getItem('hms_remember_email') || '',
    password: '',
  }));

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account Status & Rejection States
  const [accountStatus, setAccountStatus] = useState(null); // 'PENDING_VERIFICATION' | 'UNDER_REVIEW' | 'REJECTED'
  const [rejectionReason, setRejectionReason] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Resubmit Modal States
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState('');
  const [resubmitError, setResubmitError] = useState('');
  const [resubmitData, setResubmitData] = useState({
    email: '',
    password: '',
    phone: '',
    department: 'General Medicine',
    qualification: '',
    institution: '',
    yearsOfExperience: '',
    licenseNumber: '',
    specialization: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: 'United States',
    emergencyName: '',
    emergencyPhone: '',
    resubmissionNotes: '',
  });
  const [resubmitDocs, setResubmitDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // If already authenticated, redirect to appropriate destination
  if (!authLoading && isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/force-change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Success message passed from registration redirect
  const successMessage = location.state?.message;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setAccountStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAccountStatus(null);
    setRejectionReason('');

    try {
      const payload = await authService.login(formData.email.trim(), formData.password);
      if (payload && payload.user) {
        if (rememberMe) {
          localStorage.setItem('hms_remember_email', formData.email.trim());
        } else {
          localStorage.removeItem('hms_remember_email');
        }

        login(payload.user, payload.accessToken, payload.refreshToken);
        if (payload.user?.mustChangePassword) {
          navigate('/force-change-password', { replace: true });
        } else {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } else {
        setError('Login failed: Invalid server response.');
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Invalid email or password.';
      const lower = msg.toLowerCase();

      if (lower.includes('under review')) {
        setAccountStatus('UNDER_REVIEW');
      } else if (lower.includes('pending verification') || lower.includes('pending administrator') || lower.includes('awaiting administrator')) {
        setAccountStatus('PENDING_VERIFICATION');
      } else if (lower.includes('rejected')) {
        setAccountStatus('REJECTED');
        const match = msg.match(/Reason:\s*([^.]+)/i);
        setRejectionReason(match ? match[1].trim() : msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Open Resubmission modal pre-populated
  const openResubmitModal = () => {
    setResubmitData((prev) => ({
      ...prev,
      email: formData.email,
      password: formData.password,
    }));
    setResubmitSuccess('');
    setResubmitError('');
    setShowResubmitModal(true);
  };

  // Handle document upload inside Resubmission modal
  const handleResubmitDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setResubmitError('File exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    setUploadingDoc(true);
    setResubmitError('');

    try {
      const res = await authService.uploadDocument(file, file.name, 'qualification_cert');
      const data = res?.data || res;
      setResubmitDocs((prev) => [
        ...prev,
        {
          documentName: file.name,
          documentType: 'qualification_cert',
          originalName: file.name,
          fileKey: data.fileKey,
          fileUrl: data.fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        },
      ]);
    } catch (err) {
      setResubmitError(err.message || 'Failed to upload replacement document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeResubmitDoc = (index) => {
    setResubmitDocs((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Resubmission
  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    setResubmitLoading(true);
    setResubmitError('');
    setResubmitSuccess('');

    try {
      const payload = {
        email: resubmitData.email.trim(),
        password: resubmitData.password,
        phone: resubmitData.phone.trim(),
        department: resubmitData.department,
        qualification: resubmitData.qualification.trim(),
        institution: resubmitData.institution.trim(),
        yearsOfExperience: resubmitData.yearsOfExperience ? Number(resubmitData.yearsOfExperience) : undefined,
        licenseNumber: resubmitData.licenseNumber.trim(),
        specialization: resubmitData.specialization.trim(),
        address: {
          street: resubmitData.addressStreet.trim(),
          city: resubmitData.addressCity.trim(),
          state: resubmitData.addressState.trim(),
          postalCode: resubmitData.addressPostalCode.trim(),
          country: resubmitData.addressCountry.trim(),
        },
        emergencyContact: {
          name: resubmitData.emergencyName.trim(),
          phone: resubmitData.emergencyPhone.trim(),
        },
        resubmissionNotes: resubmitData.resubmissionNotes.trim(),
        documents: resubmitDocs,
      };

      const res = await authService.resubmitApplication(payload);
      setResubmitSuccess(res?.message || 'Application resubmitted successfully! It is now pending Super Admin review.');
      setAccountStatus('PENDING_VERIFICATION');

      setTimeout(() => {
        setShowResubmitModal(false);
      }, 2000);
    } catch (err) {
      setResubmitError(err.message || err.response?.data?.message || 'Failed to resubmit application.');
    } finally {
      setResubmitLoading(false);
    }
  };

  return (
    <div className="hms-split-page">
      {/* ─── LEFT PANEL: HMS LOGIN FORM ───────────────────────── */}
      <div className="hms-split-page__left">
        <div className="hms-split-card">
          {/* HMS BRAND HEADER */}
          <div className="hms-split-card__brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div className="hms-split-card__logo">
                <Heart size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div className="hms-split-card__brand-title">HMS</div>
                <div className="hms-split-card__brand-sub">Hospital Management System</div>
              </div>
            </div>
            <button
              type="button"
              className="topbar__theme-toggle-btn"
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: '36px', height: '36px' }}
            >
              {effectiveTheme === 'dark' ? (
                <Sun size={18} className="topbar__theme-icon topbar__theme-icon--sun" />
              ) : (
                <Moon size={18} className="topbar__theme-icon topbar__theme-icon--moon" />
              )}
            </button>
          </div>

          {/* TITLE & DESCRIPTION */}
          <div className="hms-split-card__header">
            <h1 className="hms-split-card__title">Welcome Back</h1>
            <p className="hms-split-card__subtitle">
              Sign in to securely access your HMS portal and continue managing healthcare services and clinical operations.
            </p>
          </div>

          {/* SUCCESS BANNER FROM REGISTRATION */}
          {successMessage && !error && !accountStatus && (
            <div
              className="alert alert--success"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. PENDING VERIFICATION NOTICE */}
          {accountStatus === 'PENDING_VERIFICATION' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                lineHeight: 1.45,
              }}
            >
              <Clock size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Account Pending Verification:</strong>
                Your account is pending verification by the Super Administrator.
              </div>
            </div>
          )}

          {/* 2. UNDER REVIEW NOTICE */}
          {accountStatus === 'UNDER_REVIEW' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                lineHeight: 1.45,
              }}
            >
              <Activity size={20} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Application Under Review:</strong>
                Your application is currently under review by the Super Administrator.
              </div>
            </div>
          )}

          {/* 3. REJECTED STATUS BANNER WITH REASON & RESUBMIT BUTTON */}
          {accountStatus === 'REJECTED' && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                <XCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block' }}>Your verification application was rejected.</strong>
                  {rejectionReason && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.8125rem', color: '#ef4444', background: 'var(--bg-card)', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <strong>Reason:</strong> {rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={openResubmitModal}
                className="btn btn--primary btn--sm"
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  marginTop: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8125rem',
                }}
              >
                <RotateCcw size={14} />
                <span>Resubmit Application</span>
              </button>
            </div>
          )}

          {/* GENERAL ERROR NOTICE */}
          {error && !accountStatus && (
            <div
              className="alert alert--danger"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} noValidate>
            {/* EMAIL ADDRESS */}
            <div className="hms-form-group">
              <label htmlFor="email" className="form-label" style={{ fontSize: '0.8125rem' }}>
                Email Address *
              </label>
              <div className="form-input-wrapper">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="hms-form-group">
              <label htmlFor="password" className="form-label" style={{ fontSize: '0.8125rem' }}>
                Password *
              </label>
              <div className="form-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="form-input-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD */}
            <div className="hms-form-options">
              <label className="hms-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="hms-link-button"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
              style={{ height: '44px', fontSize: '0.95rem', marginTop: '0.75rem' }}
            >
              {loading ? (
                <span className="btn__loading">Signing In...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* FOOTER: PROVISIONED ACCOUNTS INFORMATIONAL NOTICE */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              color: '#475569',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <ShieldCheck size={16} style={{ color: '#0891b2', flexShrink: 0 }} />
              <span>Staff and patient accounts are created by authorized hospital staff.</span>
            </div>
          </div>

          {/* RESUBMIT APPLICATION MODAL */}
          {showResubmitModal && (
            <div className="hms-modal-backdrop" onClick={() => setShowResubmitModal(false)}>
              <div
                className="hms-modal"
                style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={20} style={{ color: '#0891b2' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      Resubmit Staff Verification Application
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowResubmitModal(false)}
                    className="btn btn--outline btn--sm"
                    style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {resubmitSuccess && (
                  <div className="alert alert--success" style={{ marginBottom: '1rem' }}>
                    <CheckCircle2 size={16} />
                    <span>{resubmitSuccess}</span>
                  </div>
                )}

                {resubmitError && (
                  <div className="alert alert--danger" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{resubmitError}</span>
                  </div>
                )}

                <form onSubmit={handleResubmitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                    Update your contact information, credentials, and replace any rejected or missing documents. Upon submission, your application will return to <strong>PENDING_VERIFICATION</strong> for re-review by the Super Administrator.
                  </p>

                  <div className="hms-form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Email *</label>
                      <input
                        type="email"
                        required
                        value={resubmitData.email}
                        onChange={(e) => setResubmitData({ ...resubmitData, email: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Verify your account password"
                        value={resubmitData.password}
                        onChange={(e) => setResubmitData({ ...resubmitData, password: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>

                  <div className="hms-form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Phone Number</label>
                      <input
                        type="tel"
                        value={resubmitData.phone}
                        onChange={(e) => setResubmitData({ ...resubmitData, phone: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Department</label>
                      <select
                        value={resubmitData.department}
                        onChange={(e) => setResubmitData({ ...resubmitData, department: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      >
                        {HOSPITAL_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="hms-form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Highest Qualification</label>
                      <input
                        type="text"
                        placeholder="e.g. MBBS, MD, B.Sc Nursing"
                        value={resubmitData.qualification}
                        onChange={(e) => setResubmitData({ ...resubmitData, qualification: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>License / Registration #</label>
                      <input
                        type="text"
                        placeholder="e.g. MED-REG-89201"
                        value={resubmitData.licenseNumber}
                        onChange={(e) => setResubmitData({ ...resubmitData, licenseNumber: e.target.value })}
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Replace / Add Corrected Documents (PDF/Images, Max 5MB)
                      </span>
                      <label
                        className="btn btn--outline btn--sm"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', cursor: uploadingDoc ? 'not-allowed' : 'pointer' }}
                      >
                        <UploadCloud size={14} />
                        <span>{uploadingDoc ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          disabled={uploadingDoc}
                          accept=".pdf,.png,.jpg,.jpeg"
                          style={{ display: 'none' }}
                          onChange={handleResubmitDocUpload}
                        />
                      </label>
                    </div>

                    {resubmitDocs.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem' }}>
                        No replacement documents uploaded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {resubmitDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.65rem',
                              fontSize: '0.78rem',
                            }}
                          >
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{doc.originalName}</span>
                            <button
                              type="button"
                              onClick={() => removeResubmitDoc(idx)}
                              style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Resubmission Notes / Explanation</label>
                    <textarea
                      rows={2}
                      placeholder="Explain what credentials or documents were corrected for the Super Admin..."
                      value={resubmitData.resubmissionNotes}
                      onChange={(e) => setResubmitData({ ...resubmitData, resubmissionNotes: e.target.value })}
                      className="form-input"
                      style={{ height: 'auto', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowResubmitModal(false)}
                      className="btn btn--outline btn--sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resubmitLoading}
                      className="btn btn--primary btn--sm"
                    >
                      {resubmitLoading ? 'Submitting...' : 'Submit Resubmission'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD MODAL */}
          {showForgotModal && (
            <div className="hms-modal-backdrop" onClick={() => setShowForgotModal(false)}>
              <div className="hms-modal" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="hms-modal__close-btn"
                  onClick={() => setShowForgotModal(false)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
                <div className="hms-modal__icon">
                  <Lock size={26} />
                </div>
                <h3 className="hms-modal__title">Password Recovery</h3>
                <p className="hms-modal__desc">
                  To reset your HMS account password, please contact the Hospital System
                  Administrator or your departmental IT support desk.
                </p>
                <div className="hms-modal__contact-box">
                  <div className="hms-modal__contact-row">
                    <span className="hms-modal__contact-label">IT Support Desk:</span>
                    <a href="mailto:support@hospital.org" className="hms-modal__contact-val">support@hospital.org</a>
                  </div>
                  <div className="hms-modal__contact-row">
                    <span className="hms-modal__contact-label">Internal Extension:</span>
                    <span className="hms-modal__contact-val">4401 (Admin Wing)</span>
                  </div>
                  <div className="hms-modal__contact-row">
                    <span className="hms-modal__contact-label">Operating Hours:</span>
                    <span className="hms-modal__contact-val">24/7 Clinical Support</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--full"
                  onClick={() => setShowForgotModal(false)}
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: HMS INFORMATIONAL PANEL ─────────────── */}
      <div className="hms-split-page__right">
        <div className="hms-split-info">
          {/* BADGE */}
          <div className="hms-split-badge">
            <Activity size={14} />
            <span>HOSPITAL MANAGEMENT SYSTEM</span>
          </div>

          {/* HEADING */}
          <h2 className="hms-split-info__heading">
            Manage Healthcare Smarter with HMS
          </h2>

          {/* DESCRIPTION */}
          <p className="hms-split-info__desc">
            Access a unified platform designed to support hospital operations,
            clinical workflows, patient services, and healthcare administration.
          </p>

          {/* 4 FEATURE CARDS */}
          <div className="hms-features-grid">
            <div className="hms-feature-card">
              <div className="hms-feature-card__icon-box">
                <Activity size={22} />
              </div>
              <div className="hms-feature-card__content">
                <div className="hms-feature-card__title">
                  Patient & Clinical Management
                </div>
                <p className="hms-feature-card__desc">
                  Access patient records, appointments, electronic medical charts, and care workflows.
                </p>
              </div>
            </div>

            <div className="hms-feature-card">
              <div className="hms-feature-card__icon-box">
                <Calendar size={22} />
              </div>
              <div className="hms-feature-card__content">
                <div className="hms-feature-card__title">
                  Hospital Operations
                </div>
                <p className="hms-feature-card__desc">
                  Manage appointments, queues, admissions, bed capacity, and daily hospital activities.
                </p>
              </div>
            </div>

            <div className="hms-feature-card">
              <div className="hms-feature-card__icon-box">
                <Pill size={22} />
              </div>
              <div className="hms-feature-card__content">
                <div className="hms-feature-card__title">
                  Integrated Services
                </div>
                <p className="hms-feature-card__desc">
                  Connect pharmacy, diagnostic laboratory, billing, reports, and imaging systems.
                </p>
              </div>
            </div>

            <div className="hms-feature-card">
              <div className="hms-feature-card__icon-box">
                <Lock size={22} />
              </div>
              <div className="hms-feature-card__content">
                <div className="hms-feature-card__title">
                  Super Admin Verified Access
                </div>
                <p className="hms-feature-card__desc">
                  Access hospital features securely based on validated medical licensing and admin approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
