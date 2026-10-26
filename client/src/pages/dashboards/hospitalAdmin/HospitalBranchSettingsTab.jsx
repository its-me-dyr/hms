/**
 * Hospital Admin Portal → Hospital & Branch Settings Tab
 * 
 * Production-ready facility configuration module for HOSPITAL_ADMIN:
 * 1. Institutional Hospital Information & Parameters (View / Edit mode)
 * 2. Contact & Physical Location
 * 3. Operating Currency & Timezone Localization
 * 4. Multi-Branch & Campus Facility Management (List, Add, Edit, Activate/Deactivate, Set Primary)
 * 
 * Adheres strictly to HMS theme system (Light/Dark mode), responsive layout,
 * and robust MongoDB backend integration.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Globe,
  Coins,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Power,
  Star,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Save,
  RotateCcw,
} from 'lucide-react';
import { hospitalAdminService } from '../../../services/hospitalAdmin.service';

const COMMON_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar ($)' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar ($)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function HospitalBranchSettingsTab({ onSettingsUpdated }) {
  // Main Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hospitalData, setHospitalData] = useState(null);
  const [branches, setBranches] = useState([]);

  // Toast / Feedback State
  const [feedback, setFeedback] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: 'success' }), 4500);
  };

  // ─── 1. Hospital Information Section State ───
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoFormErrors, setInfoFormErrors] = useState({});
  const [infoForm, setInfoForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    emergencyHotline: '',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    taxId: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  // ─── 2. Branch Modal & Management State ───
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchFormErrors, setBranchFormErrors] = useState({});
  const [branchForm, setBranchForm] = useState({
    id: null,
    name: '',
    code: '',
    phone: '',
    email: '',
    capacity: 50,
    isMain: false,
    isActive: true,
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  // ─── 3. Confirmation Dialogs ───
  const [statusConfirmBranch, setStatusConfirmBranch] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [deleteConfirmBranch, setDeleteConfirmBranch] = useState(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [primaryConfirmBranch, setPrimaryConfirmBranch] = useState(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  // Fetch Settings & Branches from Backend
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await hospitalAdminService.getHospitalSettings();
      // Handle unwrapped vs wrapped axios payload
      const data = res?.data || res;
      if (data && (data._id || data.hospitalName)) {
        setHospitalData(data);
        setBranches(Array.isArray(data.branches) ? data.branches : []);

        // Sync Info Form
        setInfoForm({
          hospitalName: data.hospitalName || '',
          registrationNumber: data.registrationNumber || '',
          tagline: data.tagline || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          emergencyHotline: data.emergencyHotline || '',
          currency: data.currency || 'USD',
          currencySymbol: data.currencySymbol || '$',
          timezone: data.timezone || 'America/New_York',
          taxId: data.taxId || '',
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          postalCode: data.address?.postalCode || '',
          country: data.address?.country || 'United States',
        });
      }
    } catch (err) {
      console.error('Failed to load hospital settings:', err);
      showToast(err?.message || 'Failed to load hospital settings from database.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Currency change to update symbol
  const handleCurrencyChange = (currCode) => {
    const found = COMMON_CURRENCIES.find((c) => c.code === currCode);
    setInfoForm((prev) => ({
      ...prev,
      currency: currCode,
      currencySymbol: found ? found.symbol : prev.currencySymbol,
    }));
  };

  // Validate Hospital Info Form
  const validateInfoForm = () => {
    const errors = {};
    if (!infoForm.hospitalName.trim()) {
      errors.hospitalName = 'Hospital Full Legal Name is required.';
    }
    if (!infoForm.registrationNumber.trim()) {
      errors.registrationNumber = 'License / Registration number is required.';
    }
    if (!infoForm.contactEmail.trim()) {
      errors.contactEmail = 'Official contact email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(infoForm.contactEmail.trim())) {
        errors.contactEmail = 'Enter a valid email address.';
      }
    }
    if (!infoForm.contactPhone.trim()) {
      errors.contactPhone = 'Official phone number is required.';
    }
    if (!infoForm.emergencyHotline.trim()) {
      errors.emergencyHotline = 'Emergency hotline is required.';
    }
    if (!infoForm.city.trim()) {
      errors.city = 'City is required.';
    }
    if (!infoForm.country.trim()) {
      errors.country = 'Country is required.';
    }

    setInfoFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Hospital Information
  const handleSaveHospitalInfo = async (e) => {
    e.preventDefault();
    if (!validateInfoForm() || isSavingInfo) return;

    setIsSavingInfo(true);
    try {
      const payload = {
        hospitalName: infoForm.hospitalName.trim(),
        registrationNumber: infoForm.registrationNumber.trim(),
        tagline: infoForm.tagline.trim(),
        contactEmail: infoForm.contactEmail.trim().toLowerCase(),
        contactPhone: infoForm.contactPhone.trim(),
        emergencyHotline: infoForm.emergencyHotline.trim(),
        currency: infoForm.currency,
        currencySymbol: infoForm.currencySymbol,
        timezone: infoForm.timezone,
        taxId: infoForm.taxId.trim(),
        address: {
          street: infoForm.street.trim(),
          city: infoForm.city.trim(),
          state: infoForm.state.trim(),
          postalCode: infoForm.postalCode.trim(),
          country: infoForm.country.trim(),
        },
      };

      const res = await hospitalAdminService.updateHospitalSettings(payload);
      const isSuccess = res?.success === true || Boolean(res?.data || res?._id);

      if (isSuccess) {
        showToast('Hospital parameters and contact details saved successfully.');
        setIsEditingInfo(false);
        setInfoFormErrors({});
        await fetchData(true);
        onSettingsUpdated?.();
      } else {
        showToast(res?.message || 'Failed to update hospital parameters.', 'error');
      }
    } catch (err) {
      console.error('Update hospital info error:', err);
      showToast(err?.message || err?.response?.data?.message || 'Error updating hospital parameters.', 'error');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Cancel Hospital Info Edit
  const handleCancelInfoEdit = () => {
    if (hospitalData) {
      setInfoForm({
        hospitalName: hospitalData.hospitalName || '',
        registrationNumber: hospitalData.registrationNumber || '',
        tagline: hospitalData.tagline || '',
        contactEmail: hospitalData.contactEmail || '',
        contactPhone: hospitalData.contactPhone || '',
        emergencyHotline: hospitalData.emergencyHotline || '',
        currency: hospitalData.currency || 'USD',
        currencySymbol: hospitalData.currencySymbol || '$',
        timezone: hospitalData.timezone || 'America/New_York',
        taxId: hospitalData.taxId || '',
        street: hospitalData.address?.street || '',
        city: hospitalData.address?.city || '',
        state: hospitalData.address?.state || '',
        postalCode: hospitalData.address?.postalCode || '',
        country: hospitalData.address?.country || 'United States',
      });
    }
    setInfoFormErrors({});
    setIsEditingInfo(false);
  };

  // Open Branch Modal for Add or Edit
  const handleOpenBranchModal = (branch = null) => {
    setBranchFormErrors({});
    if (branch) {
      setBranchForm({
        id: branch._id,
        name: branch.name || '',
        code: branch.code || '',
        phone: branch.phone || '',
        email: branch.email || '',
        capacity: branch.capacity ?? 50,
        isMain: Boolean(branch.isMain),
        isActive: branch.isActive !== undefined ? Boolean(branch.isActive) : true,
        street: branch.address?.street || '',
        city: branch.address?.city || '',
        state: branch.address?.state || '',
        postalCode: branch.address?.postalCode || '',
        country: branch.address?.country || hospitalData?.address?.country || 'United States',
      });
    } else {
      setBranchForm({
        id: null,
        name: '',
        code: '',
        phone: hospitalData?.contactPhone || '',
        email: hospitalData?.contactEmail || '',
        capacity: 50,
        isMain: branches.length === 0,
        isActive: true,
        street: '',
        city: hospitalData?.address?.city || '',
        state: hospitalData?.address?.state || '',
        postalCode: hospitalData?.address?.postalCode || '',
        country: hospitalData?.address?.country || 'United States',
      });
    }
    setBranchModalOpen(true);
  };

  // Validate Branch Form
  const validateBranchForm = () => {
    const errors = {};
    if (!branchForm.name.trim()) {
      errors.name = 'Branch Facility Name is required.';
    }
    if (!branchForm.code.trim()) {
      errors.code = 'Branch Identifier Code is required.';
    } else {
      const normalizedCode = branchForm.code.trim().toUpperCase();
      const duplicate = branches.some(
        (b) => String(b._id) !== String(branchForm.id) && b.code === normalizedCode
      );
      if (duplicate) {
        errors.code = `Branch code "${normalizedCode}" already in use by another branch.`;
      }
    }
    if (branchForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(branchForm.email.trim())) {
        errors.email = 'Enter a valid branch contact email.';
      }
    }
    if (branchForm.capacity && Number(branchForm.capacity) < 0) {
      errors.capacity = 'Capacity cannot be negative.';
    }

    setBranchFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Branch (Add or Edit)
  const handleSaveBranchSubmit = async (e) => {
    e.preventDefault();
    if (!validateBranchForm() || isSavingBranch) return;

    setIsSavingBranch(true);
    try {
      const payload = {
        id: branchForm.id,
        name: branchForm.name.trim(),
        code: branchForm.code.trim().toUpperCase(),
        phone: branchForm.phone.trim(),
        email: branchForm.email.trim(),
        capacity: Number(branchForm.capacity) || 50,
        isMain: Boolean(branchForm.isMain),
        isActive: Boolean(branchForm.isActive),
        address: {
          street: branchForm.street.trim(),
          city: branchForm.city.trim(),
          state: branchForm.state.trim(),
          postalCode: branchForm.postalCode.trim(),
          country: branchForm.country.trim(),
        },
      };

      const res = await hospitalAdminService.saveBranch(payload);
      const isSuccess = res?.success === true || Array.isArray(res?.data) || Array.isArray(res);

      if (isSuccess) {
        showToast(branchForm.id ? 'Branch facility updated successfully.' : 'New branch facility registered successfully.');
        setBranchModalOpen(false);
        await fetchData(true);
        onSettingsUpdated?.();
      } else {
        showToast(res?.message || 'Failed to save branch.', 'error');
      }
    } catch (err) {
      console.error('Save branch error:', err);
      showToast(err?.message || err?.response?.data?.message || 'Error saving branch record.', 'error');
    } finally {
      setIsSavingBranch(false);
    }
  };

  // Confirm Status Toggle (Activate / Deactivate)
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmBranch || isTogglingStatus) return;

    const branch = statusConfirmBranch;
    const newStatus = !branch.isActive;

    if (!newStatus && branch.isMain) {
      showToast('The primary hospital campus cannot be deactivated. Select another primary branch first.', 'error');
      setStatusConfirmBranch(null);
      return;
    }

    setIsTogglingStatus(true);
    try {
      const res = await hospitalAdminService.toggleBranchStatus(branch._id, { isActive: newStatus });
      const isSuccess = res?.success === true || Array.isArray(res?.data) || Array.isArray(res);

      if (isSuccess) {
        showToast(`Branch "${branch.name}" is now ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
        setStatusConfirmBranch(null);
        await fetchData(true);
        onSettingsUpdated?.();
      } else {
        showToast(res?.message || 'Failed to update branch status.', 'error');
      }
    } catch (err) {
      console.error('Toggle branch status error:', err);
      showToast(err?.message || err?.response?.data?.message || 'Error updating branch status.', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Confirm Set as Primary Campus
  const handleConfirmSetPrimary = async () => {
    if (!primaryConfirmBranch || isSettingPrimary) return;

    const branch = primaryConfirmBranch;
    if (!branch.isActive) {
      showToast('An inactive branch cannot be designated as the primary campus. Activate it first.', 'error');
      setPrimaryConfirmBranch(null);
      return;
    }

    setIsSettingPrimary(true);
    try {
      const res = await hospitalAdminService.setPrimaryBranch(branch._id);
      const isSuccess = res?.success === true || Array.isArray(res?.data) || Array.isArray(res);

      if (isSuccess) {
        showToast(`"${branch.name}" is now designated as the Primary Hospital Campus.`);
        setPrimaryConfirmBranch(null);
        await fetchData(true);
        onSettingsUpdated?.();
      } else {
        showToast(res?.message || 'Failed to designate primary branch.', 'error');
      }
    } catch (err) {
      console.error('Set primary branch error:', err);
      showToast(err?.message || err?.response?.data?.message || 'Error setting primary branch.', 'error');
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // Confirm Delete Branch
  const handleConfirmDeleteBranch = async () => {
    if (!deleteConfirmBranch || isDeletingBranch) return;

    const branch = deleteConfirmBranch;
    if (branch.isMain) {
      showToast('The primary hospital branch cannot be deleted.', 'error');
      setDeleteConfirmBranch(null);
      return;
    }

    setIsDeletingBranch(true);
    try {
      const res = await hospitalAdminService.deleteBranch(branch._id);
      const isSuccess = res?.success === true || Array.isArray(res?.data) || Array.isArray(res);

      if (isSuccess) {
        showToast(`Branch "${branch.name}" was removed successfully.`);
        setDeleteConfirmBranch(null);
        await fetchData(true);
        onSettingsUpdated?.();
      } else {
        showToast(res?.message || 'Failed to remove branch.', 'error');
      }
    } catch (err) {
      console.error('Delete branch error:', err);
      showToast(err?.message || err?.response?.data?.message || 'Error removing branch.', 'error');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  if (loading) {
    return (
      <div className="ha-panel" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#0891b2', margin: '0 auto 0.75rem auto' }} />
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Loading hospital & branch configuration from database...
        </p>
      </div>
    );
  }

  const primaryBranch = branches.find((b) => b.isMain);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Toast Feedback Alert */}
      {feedback.message && (
        <div
          className={`ha-alert ${feedback.type === 'error' ? 'ha-alert--error' : 'ha-alert--success'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ message: '', type: 'success' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'currentColor' }}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: HOSPITAL INFORMATION & PARAMETERS                              */}
      {/* ========================================================================= */}
      <div className="ha-panel" style={{ margin: 0 }}>
        <div className="ha-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="ha-panel__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Building2 size={18} color="#0891B2" />
              Hospital Information & Institutional Parameters
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Official license identity, contact numbers, campus headquarters, and localization preferences.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!isEditingInfo ? (
              <button
                type="button"
                className="ha-btn ha-btn--primary ha-btn--sm"
                onClick={() => setIsEditingInfo(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Edit2 size={13} />
                <span>Edit Information</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary ha-btn--sm"
                  onClick={handleCancelInfoEdit}
                  disabled={isSavingInfo}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RotateCcw size={13} />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  className="ha-btn ha-btn--primary ha-btn--sm"
                  onClick={handleSaveHospitalInfo}
                  disabled={isSavingInfo}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {isSavingInfo ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="ha-panel__body">
          {/* VIEW MODE */}
          {!isEditingInfo ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Card 1: Identity */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <ShieldCheck size={14} color="#0891b2" />
                  <span>Institutional Identity</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Hospital Full Legal Name</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{hospitalData?.hospitalName || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>License / Registration #</span>
                    <span className="ha-badge ha-badge--info" style={{ fontWeight: 600, fontSize: '0.75rem', marginTop: '0.2rem', display: 'inline-block' }}>
                      {hospitalData?.registrationNumber || '—'}
                    </span>
                  </div>
                  {hospitalData?.tagline && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Tagline / Motto</span>
                      <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>"{hospitalData.tagline}"</span>
                    </div>
                  )}
                  {hospitalData?.taxId && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Tax Identification ID</span>
                      <span style={{ color: 'var(--text-primary)' }}>{hospitalData.taxId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Contact Numbers */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Phone size={14} color="#0891b2" />
                  <span>Official Communications</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Contact Email</span>
                    <a
                      href={`mailto:${hospitalData?.contactEmail}`}
                      style={{ color: '#0891b2', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Mail size={13} /> {hospitalData?.contactEmail || '—'}
                    </a>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Official Phone</span>
                    <span style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={13} style={{ color: 'var(--text-secondary)' }} /> {hospitalData?.contactPhone || '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>24/7 Emergency Hotline</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.25rem',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        marginTop: '0.2rem',
                      }}
                    >
                      <AlertTriangle size={13} />
                      {hospitalData?.emergencyHotline || '911 / 108'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Address & Localization */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <MapPin size={14} color="#0891b2" />
                  <span>Campus Address & Localization</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Headquarters Address</span>
                    <div style={{ color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {hospitalData?.address?.street && <div>{hospitalData.address.street}</div>}
                      <div>
                        {[hospitalData?.address?.city, hospitalData?.address?.state, hospitalData?.address?.postalCode]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{hospitalData?.address?.country || 'United States'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Billing Currency</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {hospitalData?.currency || 'USD'} ({hospitalData?.currencySymbol || '$'})
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Timezone</span>
                      <span style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                        {hospitalData?.timezone || 'America/New_York'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE FORM */
            <form onSubmit={handleSaveHospitalInfo}>
              <div className="ha-form-grid" style={{ marginBottom: '1.25rem' }}>
                {/* Hospital Name */}
                <div className="ha-form-group">
                  <label>Hospital Full Legal Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.hospitalName}
                    onChange={(e) => setInfoForm({ ...infoForm, hospitalName: e.target.value })}
                    placeholder="e.g. MetroHealth Medical Center"
                    style={{ borderColor: infoFormErrors.hospitalName ? '#ef4444' : undefined }}
                    required
                  />
                  {infoFormErrors.hospitalName && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {infoFormErrors.hospitalName}
                    </span>
                  )}
                </div>

                {/* Registration Number */}
                <div className="ha-form-group">
                  <label>License / Registration Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.registrationNumber}
                    onChange={(e) => setInfoForm({ ...infoForm, registrationNumber: e.target.value })}
                    placeholder="e.g. HOSP-REG-2026-001"
                    style={{ borderColor: infoFormErrors.registrationNumber ? '#ef4444' : undefined }}
                    required
                  />
                  {infoFormErrors.registrationNumber && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {infoFormErrors.registrationNumber}
                    </span>
                  )}
                </div>

                {/* Contact Email */}
                <div className="ha-form-group">
                  <label>Official Contact Email <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="email"
                    value={infoForm.contactEmail}
                    onChange={(e) => setInfoForm({ ...infoForm, contactEmail: e.target.value })}
                    placeholder="e.g. contact@metrohealth.org"
                    style={{ borderColor: infoFormErrors.contactEmail ? '#ef4444' : undefined }}
                    required
                  />
                  {infoFormErrors.contactEmail && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {infoFormErrors.contactEmail}
                    </span>
                  )}
                </div>

                {/* Official Phone */}
                <div className="ha-form-group">
                  <label>Official Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.contactPhone}
                    onChange={(e) => setInfoForm({ ...infoForm, contactPhone: e.target.value })}
                    placeholder="e.g. +1 (555) 234-5678"
                    style={{ borderColor: infoFormErrors.contactPhone ? '#ef4444' : undefined }}
                    required
                  />
                  {infoFormErrors.contactPhone && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {infoFormErrors.contactPhone}
                    </span>
                  )}
                </div>

                {/* Emergency Hotline */}
                <div className="ha-form-group">
                  <label>Emergency 24/7 Hotline <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.emergencyHotline}
                    onChange={(e) => setInfoForm({ ...infoForm, emergencyHotline: e.target.value })}
                    placeholder="e.g. 911 / 108"
                    style={{ borderColor: infoFormErrors.emergencyHotline ? '#ef4444' : undefined }}
                    required
                  />
                  {infoFormErrors.emergencyHotline && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {infoFormErrors.emergencyHotline}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                <div className="ha-form-group">
                  <label>Hospital Tagline / Mission</label>
                  <input
                    type="text"
                    value={infoForm.tagline}
                    onChange={(e) => setInfoForm({ ...infoForm, tagline: e.target.value })}
                    placeholder="e.g. Advanced Clinical Care & Excellence"
                  />
                </div>

                {/* Currency */}
                <div className="ha-form-group">
                  <label>Billing Currency</label>
                  <select
                    className="ha-select"
                    value={infoForm.currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  >
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency Symbol */}
                <div className="ha-form-group">
                  <label>Currency Symbol</label>
                  <input
                    type="text"
                    value={infoForm.currencySymbol}
                    onChange={(e) => setInfoForm({ ...infoForm, currencySymbol: e.target.value })}
                    placeholder="$"
                  />
                </div>

                {/* Timezone */}
                <div className="ha-form-group">
                  <label>Facility Timezone</label>
                  <select
                    className="ha-select"
                    value={infoForm.timezone}
                    onChange={(e) => setInfoForm({ ...infoForm, timezone: e.target.value })}
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tax ID */}
                <div className="ha-form-group">
                  <label>Tax Identification ID</label>
                  <input
                    type="text"
                    value={infoForm.taxId}
                    onChange={(e) => setInfoForm({ ...infoForm, taxId: e.target.value })}
                    placeholder="e.g. TAX-HOSP-99201"
                  />
                </div>

                {/* Street Address */}
                <div className="ha-form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={infoForm.street}
                    onChange={(e) => setInfoForm({ ...infoForm, street: e.target.value })}
                    placeholder="e.g. 500 Medical Center Parkway"
                  />
                </div>

                {/* City */}
                <div className="ha-form-group">
                  <label>City <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.city}
                    onChange={(e) => setInfoForm({ ...infoForm, city: e.target.value })}
                    placeholder="e.g. New York"
                    style={{ borderColor: infoFormErrors.city ? '#ef4444' : undefined }}
                    required
                  />
                </div>

                {/* State */}
                <div className="ha-form-group">
                  <label>State / Province</label>
                  <input
                    type="text"
                    value={infoForm.state}
                    onChange={(e) => setInfoForm({ ...infoForm, state: e.target.value })}
                    placeholder="e.g. NY"
                  />
                </div>

                {/* Postal Code */}
                <div className="ha-form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={infoForm.postalCode}
                    onChange={(e) => setInfoForm({ ...infoForm, postalCode: e.target.value })}
                    placeholder="e.g. 10001"
                  />
                </div>

                {/* Country */}
                <div className="ha-form-group">
                  <label>Country <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    value={infoForm.country}
                    onChange={(e) => setInfoForm({ ...infoForm, country: e.target.value })}
                    placeholder="e.g. United States"
                    style={{ borderColor: infoFormErrors.country ? '#ef4444' : undefined }}
                    required
                  />
                </div>
              </div>

              {/* Form Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={handleCancelInfoEdit}
                  disabled={isSavingInfo}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={isSavingInfo}
                >
                  {isSavingInfo ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: BRANCH & FACILITY MANAGEMENT                                  */}
      {/* ========================================================================= */}
      <div className="ha-panel" style={{ margin: 0 }}>
        <div className="ha-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="ha-panel__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Layers size={18} color="#0891B2" />
                Hospital Branches & Facilities
              </h2>
              <span className="ha-badge ha-badge--info" style={{ fontSize: '0.7rem' }}>
                {branches.length} {branches.length === 1 ? 'Branch' : 'Branches'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Configure hospital campus branches, bed capacity, contact info, and designate the primary main campus.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="ha-btn ha-btn--primary ha-btn--sm"
              onClick={() => handleOpenBranchModal()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} />
              <span>Add Branch</span>
            </button>
          </div>
        </div>

        <div className="ha-table-container">
          <table className="ha-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Branch Code</th>
                <th>Role / Campus</th>
                <th>Location</th>
                <th>Contact Details</th>
                <th>Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.length > 0 ? (
                branches.map((b) => {
                  const locationStr = [b.address?.city, b.address?.state].filter(Boolean).join(', ') || b.address?.country || '—';
                  const contactStr = [b.phone, b.email].filter(Boolean).join(' • ') || '—';

                  return (
                    <tr key={b._id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{b.name}</strong>
                          {b.isMain && (
                            <span title="Designated Primary Campus" style={{ color: '#f59e0b', display: 'inline-flex' }}>
                              <Star size={14} fill="#f59e0b" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td>
                        <code style={{ fontSize: '0.8rem', background: 'var(--bg-input)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {b.code}
                        </code>
                      </td>

                      {/* Role / Campus */}
                      <td>
                        {b.isMain ? (
                          <span
                            className="ha-badge ha-badge--info"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
                          >
                            <ShieldCheck size={11} /> Primary Campus
                          </span>
                        ) : (
                          <span className="ha-badge ha-badge--secondary" style={{ color: 'var(--text-secondary)' }}>
                            Satellite Facility
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={12} style={{ flexShrink: 0 }} /> {locationStr}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {contactStr}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.capacity ? `${b.capacity} beds` : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`ha-badge ${b.isActive ? 'ha-badge--active' : 'ha-badge--inactive'}`}>
                          {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* Edit button */}
                          <button
                            type="button"
                            className="ha-btn ha-btn--secondary ha-btn--sm"
                            onClick={() => handleOpenBranchModal(b)}
                            title="Edit branch parameters"
                            style={{ padding: '0.3rem 0.5rem' }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Set as Primary action (if not currently primary and active) */}
                          {!b.isMain && (
                            <button
                              type="button"
                              className="ha-btn ha-btn--secondary ha-btn--sm"
                              onClick={() => setPrimaryConfirmBranch(b)}
                              title="Designate as Primary Campus"
                              disabled={!b.isActive}
                              style={{ padding: '0.3rem 0.5rem', color: b.isActive ? '#f59e0b' : 'var(--text-muted)' }}
                            >
                              <Star size={13} />
                            </button>
                          )}

                          {/* Activate / Deactivate Toggle */}
                          <button
                            type="button"
                            className={`ha-btn ha-btn--sm ${b.isActive ? 'ha-btn--secondary' : 'ha-btn--success'}`}
                            onClick={() => setStatusConfirmBranch(b)}
                            title={b.isActive ? (b.isMain ? 'Primary branch cannot be deactivated' : 'Deactivate Branch') : 'Activate Branch'}
                            disabled={b.isMain && b.isActive}
                            style={{ padding: '0.3rem 0.5rem', color: b.isActive ? '#ef4444' : '#10b981' }}
                          >
                            <Power size={13} />
                          </button>

                          {/* Delete Action (only for non-primary branches when more than 1 branch exists) */}
                          {!b.isMain && branches.length > 1 && (
                            <button
                              type="button"
                              className="ha-btn ha-btn--danger ha-btn--sm"
                              onClick={() => setDeleteConfirmBranch(b)}
                              title="Delete Branch"
                              style={{ padding: '0.3rem 0.5rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem' }}>
                    <Layers size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No branch facilities configured yet.</p>
                    <p style={{ margin: '0.25rem 0 0.75rem 0', fontSize: '0.8rem' }}>
                      Add your primary hospital campus or satellite facility using the button below.
                    </p>
                    <button
                      type="button"
                      className="ha-btn ha-btn--primary ha-btn--sm"
                      onClick={() => handleOpenBranchModal()}
                    >
                      <Plus size={14} /> Add First Branch
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BRANCH                                                 */}
      {/* ========================================================================= */}
      {branchModalOpen && (
        <div className="ha-modal-overlay" onClick={() => !isSavingBranch && setBranchModalOpen(false)}>
          <div
            className="ha-modal"
            style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} color="#0891b2" />
                {branchForm.id ? 'Edit Branch Facility' : 'Register New Hospital Branch'}
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setBranchModalOpen(false)}
                disabled={isSavingBranch}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranchSubmit}>
              <div className="ha-modal__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                  {/* Branch Name */}
                  <div className="ha-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Branch Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="e.g. Metro North Medical Center"
                      style={{ borderColor: branchFormErrors.name ? '#ef4444' : undefined }}
                      required
                    />
                    {branchFormErrors.name && (
                      <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {branchFormErrors.name}
                      </span>
                    )}
                  </div>

                  {/* Branch Code */}
                  <div className="ha-form-group">
                    <label>Branch Identifier Code <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      value={branchForm.code}
                      onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. NORTH-01"
                      style={{ borderColor: branchFormErrors.code ? '#ef4444' : undefined }}
                      required
                    />
                    {branchFormErrors.code && (
                      <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {branchFormErrors.code}
                      </span>
                    )}
                  </div>

                  {/* Capacity */}
                  <div className="ha-form-group">
                    <label>Bed / Patient Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={branchForm.capacity}
                      onChange={(e) => setBranchForm({ ...branchForm, capacity: e.target.value })}
                      placeholder="50"
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="ha-form-group">
                    <label>Branch Contact Phone</label>
                    <input
                      type="text"
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      placeholder="e.g. +1 (555) 456-7890"
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="ha-form-group">
                    <label>Branch Contact Email</label>
                    <input
                      type="email"
                      value={branchForm.email}
                      onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                      placeholder="e.g. north@metrohealth.org"
                      style={{ borderColor: branchFormErrors.email ? '#ef4444' : undefined }}
                    />
                    {branchFormErrors.email && (
                      <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                        {branchFormErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="ha-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Street Address</label>
                    <input
                      type="text"
                      value={branchForm.street}
                      onChange={(e) => setBranchForm({ ...branchForm, street: e.target.value })}
                      placeholder="e.g. 1200 North Ridge Highway"
                    />
                  </div>

                  {/* City */}
                  <div className="ha-form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={branchForm.city}
                      onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                      placeholder="e.g. Metropolis"
                    />
                  </div>

                  {/* State */}
                  <div className="ha-form-group">
                    <label>State / Province</label>
                    <input
                      type="text"
                      value={branchForm.state}
                      onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                      placeholder="e.g. NY"
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="ha-form-group">
                    <label>Postal Code</label>
                    <input
                      type="text"
                      value={branchForm.postalCode}
                      onChange={(e) => setBranchForm({ ...branchForm, postalCode: e.target.value })}
                      placeholder="e.g. 10025"
                    />
                  </div>

                  {/* Country */}
                  <div className="ha-form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      value={branchForm.country}
                      onChange={(e) => setBranchForm({ ...branchForm, country: e.target.value })}
                      placeholder="United States"
                    />
                  </div>

                  {/* Toggles: Primary Campus & Active Status */}
                  <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={branchForm.isMain}
                        onChange={(e) => setBranchForm({ ...branchForm, isMain: e.target.checked })}
                      />
                      <span><strong>Primary Main Campus</strong> (Designates this facility as the flagship hospital campus)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={branchForm.isActive}
                        onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                      />
                      <span><strong>Active Operational Facility</strong> (Available for scheduling, admissions and billing)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="ha-btn ha-btn--secondary"
                  onClick={() => setBranchModalOpen(false)}
                  disabled={isSavingBranch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ha-btn ha-btn--primary"
                  disabled={isSavingBranch}
                >
                  {isSavingBranch ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Branch...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{branchForm.id ? 'Update Branch' : 'Add Branch'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM ACTIVATE / DEACTIVATE BRANCH                             */}
      {/* ========================================================================= */}
      {statusConfirmBranch && (
        <div className="ha-modal-overlay" onClick={() => !isTogglingStatus && setStatusConfirmBranch(null)}>
          <div className="ha-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Power size={18} color={statusConfirmBranch.isActive ? '#ef4444' : '#10b981'} />
                {statusConfirmBranch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setStatusConfirmBranch(null)}
                disabled={isTogglingStatus}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Are you sure you want to <strong>{statusConfirmBranch.isActive ? 'deactivate' : 'activate'}</strong> branch facility{' '}
                <strong>"{statusConfirmBranch.name}"</strong> (<code>{statusConfirmBranch.code}</code>)?
              </p>
              {statusConfirmBranch.isActive && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Inactive branches cannot accept new admissions or appointments until reactivated.
                </p>
              )}
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setStatusConfirmBranch(null)}
                disabled={isTogglingStatus}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`ha-btn ${statusConfirmBranch.isActive ? 'ha-btn--danger' : 'ha-btn--success'}`}
                onClick={handleConfirmToggleStatus}
                disabled={isTogglingStatus}
              >
                {isTogglingStatus ? 'Updating...' : (statusConfirmBranch.isActive ? 'Deactivate Branch' : 'Activate Branch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM SET AS PRIMARY CAMPUS                                    */}
      {/* ========================================================================= */}
      {primaryConfirmBranch && (
        <div className="ha-modal-overlay" onClick={() => !isSettingPrimary && setPrimaryConfirmBranch(null)}>
          <div className="ha-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={18} color="#f59e0b" fill="#f59e0b" />
                Designate Primary Campus
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setPrimaryConfirmBranch(null)}
                disabled={isSettingPrimary}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Set <strong>"{primaryConfirmBranch.name}"</strong> as the <strong>Primary Main Campus</strong>?
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                The previous primary branch ({primaryBranch?.name || 'current main'}) will be designated as a satellite campus. Only one branch can be designated primary.
              </p>
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setPrimaryConfirmBranch(null)}
                disabled={isSettingPrimary}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--primary"
                onClick={handleConfirmSetPrimary}
                disabled={isSettingPrimary}
              >
                {isSettingPrimary ? 'Setting...' : 'Confirm Primary Designation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM DELETE BRANCH                                            */}
      {/* ========================================================================= */}
      {deleteConfirmBranch && (
        <div className="ha-modal-overlay" onClick={() => !isDeletingBranch && setDeleteConfirmBranch(null)}>
          <div className="ha-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ha-modal__header">
              <h3 className="ha-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={18} color="#ef4444" />
                Remove Branch Facility
              </h3>
              <button
                type="button"
                className="ha-btn ha-btn--secondary ha-btn--sm"
                onClick={() => setDeleteConfirmBranch(null)}
                disabled={isDeletingBranch}
                style={{ padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>
            <div className="ha-modal__body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Are you sure you want to permanently remove branch{' '}
                <strong>"{deleteConfirmBranch.name}"</strong> (<code>{deleteConfirmBranch.code}</code>)?
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
                This action cannot be undone. Historical records will retain the branch reference.
              </p>
            </div>
            <div className="ha-modal__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="ha-btn ha-btn--secondary"
                onClick={() => setDeleteConfirmBranch(null)}
                disabled={isDeletingBranch}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ha-btn ha-btn--danger"
                onClick={handleConfirmDeleteBranch}
                disabled={isDeletingBranch}
              >
                {isDeletingBranch ? 'Removing...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
