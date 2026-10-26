/**
 * Hospital Management View & Add Hospital Flow
 * 
 * Production-ready Super Admin module providing:
 * 1. View Hospitals - Complete directory with real-time search, status filter, and refresh.
 * 2. Add Hospital Wizard - 3-step atomic wizard:
 *    - Step 1: Hospital Details (Name, Reg #, Email, Phone, Hotline, Address, Currency, Timezone)
 *    - Step 2: Initial Hospital Admin Details (Name, Login Email, Phone, Password) - Fixed HOSPITAL_ADMIN role
 *    - Step 3: Review Summary (Verify all parameters with masked password)
 *    - Step 4: Success Confirmation Screen (Linked relationship breakdown)
 * 3. Hospital Details View - Comprehensive institutional profile and linked admin info.
 * 4. Edit Hospital Modal - Real database updates via PUT /api/v1/super-admin/hospitals/:id.
 * 5. Status Toggle Dialog - Activate / Deactivate hospital with confirmation prompt.
 */

import { useState, useEffect, useCallback } from 'react';
import { superadminService } from '../../services/superadmin.service';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Check,
  Edit,
  Power,
  X,
  AlertTriangle,
} from 'lucide-react';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const COMMON_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar ($)' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar ($)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
];

export default function HospitalManagementView({ initialView = 'list', onTabChange }) {
  // Navigation / View State: 'list' | 'add' | 'details'
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Hospitals List State
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Wizard Step State: 1 (Hospital Details) | 2 (Admin Details) | 3 (Review) | 4 (Success)
  const [wizardStep, setWizardStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  // Form State for Add Hospital Wizard
  const [formData, setFormData] = useState({
    // Step 1: Hospital Details
    hospitalName: '',
    registrationNumber: '',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    emergencyHotline: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',

    // Step 2: Initial Hospital Admin Details
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });

  // Edit Hospital Modal State
  const [editingHospital, setEditingHospital] = useState(null);
  const [editForm, setEditForm] = useState({
    hospitalName: '',
    registrationNumber: '',
    tagline: '',
    contactEmail: '',
    contactPhone: '',
    emergencyHotline: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    status: 'active',
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Status Toggle Confirmation Dialog State
  const [statusConfirmHospital, setStatusConfirmHospital] = useState(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  // Toast / Status message
  const [notificationMsg, setNotificationMsg] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setNotificationMsg(msg);
    setNotificationType(type);
    setTimeout(() => setNotificationMsg(''), 4500);
  };

  // Sync with initialView prop changes (e.g. sidebar navigation)
  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
      if (initialView === 'add') {
        setWizardStep(1);
        setCreatedResult(null);
        setSubmitError('');
        setFormErrors({});
      }
    }
  }, [initialView]);

  // Reset form helper
  const resetForm = () => {
    setFormData({
      hospitalName: '',
      registrationNumber: '',
      tagline: '',
      contactEmail: '',
      contactPhone: '',
      emergencyHotline: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
      adminFullName: '',
      adminEmail: '',
      adminPhone: '',
      adminPassword: '',
    });
    setFormErrors({});
    setSubmitError('');
    setWizardStep(1);
    setCreatedResult(null);
  };

  // Fetch Hospitals List
  const fetchHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    try {
      const res = await superadminService.getHospitals({
        search: searchQuery,
        status: statusFilter,
      });
      const list =
        res?.data?.hospitals ||
        res?.hospitals ||
        res?.data?.data?.hospitals ||
        (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      if (Array.isArray(list)) {
        setHospitals(list);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
      showToast('Failed to load hospitals from backend.', 'error');
    } finally {
      setLoadingHospitals(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Handle Input Changes for Add Form
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'currency') {
        const found = COMMON_CURRENCIES.find((c) => c.code === value);
        if (found) updated.currencySymbol = found.symbol;
      }
      return updated;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    setSubmitError('');
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors = {};
    if (!formData.hospitalName.trim()) {
      errors.hospitalName = 'Hospital Name is required.';
    }
    if (!formData.registrationNumber.trim()) {
      errors.registrationNumber = 'Registration / License Number is required.';
    }
    if (!formData.contactEmail.trim()) {
      errors.contactEmail = 'Hospital Contact Email is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address.';
    }
    if (!formData.contactPhone.trim()) {
      errors.contactPhone = 'Hospital Phone Number is required.';
    }
    if (!formData.street.trim()) {
      errors.street = 'Street Address is required.';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required.';
    }
    if (!formData.state.trim()) {
      errors.state = 'State / Province is required.';
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors = {};
    if (!formData.adminFullName.trim()) {
      errors.adminFullName = 'Hospital Admin Full Name is required.';
    }
    if (!formData.adminEmail.trim()) {
      errors.adminEmail = 'Hospital Admin Email is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.adminEmail.trim())) {
      errors.adminEmail = 'Enter a valid email address.';
    }
    if (!formData.adminPhone.trim()) {
      errors.adminPhone = 'Hospital Admin Phone Number is required.';
    }
    if (!formData.adminPassword) {
      errors.adminPassword = 'Password is required.';
    } else if (formData.adminPassword.length < 8) {
      errors.adminPassword = 'Password must be at least 8 characters long.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Next Step Handlers
  const handleStep1Next = (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setWizardStep(2);
    }
  };

  const handleStep2Next = (e) => {
    e.preventDefault();
    if (validateStep2()) {
      setWizardStep(3); // Go to Step 3 Review
    }
  };

  // Submit Handler for Step 3 Review
  const handleFinalSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const parts = formData.adminFullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || parts[0] || '';

      const payload = {
        hospitalDetails: {
          hospitalName: formData.hospitalName.trim(),
          registrationNumber: formData.registrationNumber.trim(),
          tagline: formData.tagline.trim(),
          contactEmail: formData.contactEmail.trim(),
          contactPhone: formData.contactPhone.trim(),
          emergencyHotline: formData.emergencyHotline.trim() || '+1 (800) 911-0000',
          address: {
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.postalCode.trim(),
            country: formData.country.trim(),
          },
          currency: formData.currency,
          currencySymbol: formData.currencySymbol,
          timezone: formData.timezone,
        },
        adminDetails: {
          firstName,
          lastName,
          fullName: formData.adminFullName.trim(),
          email: formData.adminEmail.trim(),
          phone: formData.adminPhone.trim(),
          password: formData.adminPassword,
        },
      };

      const res = await superadminService.createHospitalWithAdmin(payload);

      // api.js response interceptor unwraps response.data, so res = { success, message, data: { hospital, admin } }
      const isSuccess =
        res?.success === true ||
        res?.data?.success === true ||
        res?.status === 201 ||
        Boolean(res?.data?.hospital || res?.hospital);

      if (isSuccess) {
        const createdHospital = res?.data?.hospital || res?.hospital;
        const createdAdmin = res?.data?.admin || res?.admin;

        setCreatedResult({
          hospital: createdHospital || {
            hospitalName: formData.hospitalName.trim(),
            registrationNumber: formData.registrationNumber.trim(),
            contactEmail: formData.contactEmail.trim(),
            address: {
              city: formData.city.trim(),
              country: formData.country.trim(),
            },
          },
          admin: createdAdmin || {
            fullName: formData.adminFullName.trim(),
            email: formData.adminEmail.trim(),
          },
        });
        setWizardStep(4);
        fetchHospitals();
        showToast('Hospital and Hospital Admin created successfully.');
      } else {
        setSubmitError(res?.message || res?.data?.message || 'Failed to create hospital.');
      }
    } catch (err) {
      console.error('Creation error:', err);
      const msg = err?.message || err?.response?.data?.message || 'An error occurred while creating the hospital and admin.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (hosp) => {
    const adminUser = hosp.adminUser || null;
    const adminFullName = adminUser?.fullName || adminUser?.name || (adminUser?.firstName ? `${adminUser.firstName} ${adminUser.lastName || ''}`.trim() : hosp.adminName || '');
    const adminEmail = adminUser?.email || hosp.adminEmail || '';
    const adminPhone = adminUser?.phone || hosp.adminPhone || '';
    const adminStatus = (adminUser?.status || hosp.adminStatus || 'active').toLowerCase();
    const hasLinkedAdmin = Boolean(adminUser || hosp.adminEmail || hosp.adminName);

    setEditingHospital(hosp);
    setEditForm({
      hospitalName: hosp.hospitalName || hosp.name || '',
      registrationNumber: hosp.registrationNumber || '',
      tagline: hosp.tagline || '',
      contactEmail: hosp.contactEmail || '',
      contactPhone: hosp.contactPhone || '',
      emergencyHotline: hosp.emergencyHotline || '',
      street: hosp.address?.street || '',
      city: hosp.address?.city || '',
      state: hosp.address?.state || '',
      postalCode: hosp.address?.postalCode || '',
      country: hosp.address?.country || 'United States',
      currency: hosp.currency || 'USD',
      currencySymbol: hosp.currencySymbol || '$',
      timezone: hosp.timezone || 'America/New_York',
      status: (hosp.status || 'active').toLowerCase(),
      // Linked Admin Fields
      adminFullName,
      adminEmail,
      adminPhone,
      adminStatus,
      hasLinkedAdmin,
    });
    setEditFormErrors({});
    setEditErrorMsg('');
  };

  // Handle Edit Input Change
  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'currency') {
        const found = COMMON_CURRENCIES.find((c) => c.code === value);
        if (found) updated.currencySymbol = found.symbol;
      }
      return updated;
    });

    if (editFormErrors[field]) {
      setEditFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    setEditErrorMsg('');
  };

  // Save Edit Hospital & Linked Admin
  const handleSaveEditHospital = async (e) => {
    e.preventDefault();
    if (editLoading) return;

    const errors = {};
    if (!editForm.hospitalName.trim()) errors.hospitalName = 'Hospital Name is required.';
    if (!editForm.registrationNumber.trim()) errors.registrationNumber = 'Registration # is required.';
    if (!editForm.contactEmail.trim()) {
      errors.contactEmail = 'Hospital contact email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.contactEmail.trim())) {
        errors.contactEmail = 'Invalid hospital email format.';
      }
    }

    if (editForm.hasLinkedAdmin) {
      if (!editForm.adminFullName.trim()) {
        errors.adminFullName = 'Admin full name is required.';
      }
      if (!editForm.adminEmail.trim()) {
        errors.adminEmail = 'Admin email is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editForm.adminEmail.trim())) {
          errors.adminEmail = 'Invalid admin email format.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setEditLoading(true);
    setEditErrorMsg('');

    try {
      const payload = {
        hospitalDetails: {
          hospitalName: editForm.hospitalName.trim(),
          name: editForm.hospitalName.trim(),
          registrationNumber: editForm.registrationNumber.trim(),
          tagline: editForm.tagline.trim(),
          contactEmail: editForm.contactEmail.trim(),
          contactPhone: editForm.contactPhone.trim(),
          emergencyHotline: editForm.emergencyHotline.trim(),
          address: {
            street: editForm.street.trim(),
            city: editForm.city.trim(),
            state: editForm.state.trim(),
            postalCode: editForm.postalCode.trim(),
            country: editForm.country.trim(),
          },
          currency: editForm.currency,
          currencySymbol: editForm.currencySymbol,
          timezone: editForm.timezone,
          status: editForm.status,
        },
        adminDetails: editForm.hasLinkedAdmin
          ? {
              fullName: editForm.adminFullName.trim(),
              email: editForm.adminEmail.trim(),
              phone: editForm.adminPhone.trim(),
              status: editForm.adminStatus,
            }
          : undefined,
      };

      const hospitalId = editingHospital.id || editingHospital._id;
      const res = await superadminService.updateHospital(hospitalId, payload);

      // api.js interceptor unwraps response.data, so res = { success, message, data }
      // A successful response always has success === true from the backend ApiResponse.
      const isSuccess = res?.success === true;

      if (isSuccess) {
        showToast('Hospital and Hospital Admin details updated successfully.');
        setEditingHospital(null);
        fetchHospitals();

        // Update selectedHospital if currently viewing hospital details
        if (selectedHospital && (selectedHospital.id === hospitalId || selectedHospital._id === hospitalId)) {
          // Prefer the fresh server-returned hospital object; fall back to local merge
          const serverHosp = res?.data?.hospital;
          const updatedHosp = serverHosp
            ? {
                ...selectedHospital,
                ...serverHosp,
                adminUser: serverHosp.adminUser || selectedHospital.adminUser,
              }
            : {
                ...selectedHospital,
                ...payload.hospitalDetails,
                location: [
                  payload.hospitalDetails.address.city,
                  payload.hospitalDetails.address.state,
                  payload.hospitalDetails.address.country,
                ]
                  .filter(Boolean)
                  .join(', '),
                adminName: payload.adminDetails?.fullName || selectedHospital.adminName,
                adminEmail: payload.adminDetails?.email || selectedHospital.adminEmail,
                adminPhone: payload.adminDetails?.phone || selectedHospital.adminPhone,
                adminStatus: payload.adminDetails?.status || selectedHospital.adminStatus,
              };
          setSelectedHospital(updatedHosp);
        }
      } else {
        // Unexpected: 2xx with success:false — show message from response
        setEditErrorMsg(res?.message || 'Failed to update hospital. Please try again.');
      }
    } catch (err) {
      // api.js rejects with a plain object { status, message, errors } on HTTP errors
      // err.message is directly the backend error message string
      const msg = err?.message || err?.response?.data?.message || 'Failed to update hospital. Please check your inputs and try again.';
      setEditErrorMsg(msg);
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle Hospital Status (Activate / Deactivate)
  const handleToggleStatusConfirm = async () => {
    if (!statusConfirmHospital) return;

    setStatusActionLoading(true);
    try {
      const hospitalId = statusConfirmHospital.id || statusConfirmHospital._id;
      const currentStatus = (statusConfirmHospital.status || 'active').toLowerCase();
      const targetStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await superadminService.toggleHospitalStatus(hospitalId, { status: targetStatus });

      showToast(`Hospital "${statusConfirmHospital.hospitalName || statusConfirmHospital.name}" is now ${targetStatus.toUpperCase()}.`);
      setStatusConfirmHospital(null);
      fetchHospitals();

      if (selectedHospital && (selectedHospital.id === hospitalId || selectedHospital._id === hospitalId)) {
        setSelectedHospital((prev) => ({ ...prev, status: targetStatus, isActive: targetStatus === 'active' }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to toggle hospital status.';
      showToast(msg, 'error');
    } finally {
      setStatusActionLoading(false);
    }
  };

  // Filtered hospitals
  const filteredHospitals = hospitals.filter((h) => {
    if (statusFilter !== 'all' && (h.status || 'active').toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (h.hospitalName || h.name || '').toLowerCase().includes(q) ||
      (h.registrationNumber || '').toLowerCase().includes(q) ||
      (h.contactEmail || '').toLowerCase().includes(q) ||
      (h.contactPhone || '').toLowerCase().includes(q) ||
      (h.location || '').toLowerCase().includes(q) ||
      (h.adminName || '').toLowerCase().includes(q) ||
      (h.adminEmail || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`alert ${notificationType === 'error' ? 'alert--error' : 'alert--success'}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            maxWidth: '440px',
          }}
        >
          {notificationType === 'error' ? (
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'inherit' }}>
            {notificationMsg}
          </span>
          <button
            type="button"
            onClick={() => setNotificationMsg('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              opacity: 0.8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── TOP SECTION SUB-NAVIGATION ────────────────────────────── */}
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
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(8, 145, 178, 0.12)',
              color: '#0891b2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Hospital Management
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Create, configure, and inspect hospitals and their initial Hospital Administrators
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: HOSPITAL MANAGEMENT LIST                                          */}
      {/* ========================================================================= */}
      {currentView === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Controls Bar: Search & Status Filter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.85rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by hospital name, reg #, admin, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.85rem 0.5rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Hospitals</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Refresh & Add Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={fetchHospitals}
                disabled={loadingHospitals}
                title="Refresh list"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} className={loadingHospitals ? 'spin-animation' : ''} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  resetForm();
                  setCurrentView('add');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
              >
                <Plus size={15} />
                <span>Add Hospital</span>
              </button>
            </div>
          </div>

          {/* Hospitals Table */}
          <div className="sa-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="sa-table-responsive">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Hospital Name</th>
                    <th>Registration #</th>
                    <th>Contact Details</th>
                    <th>Location</th>
                    <th>Initial Hospital Admin</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHospitals ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#0891b2' }}>
                          <RefreshCw size={18} className="spin-animation" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>Loading hospital registry...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredHospitals.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 size={36} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            No Hospitals Found
                          </p>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {searchQuery ? 'Try changing your search terms or filters.' : 'Get started by creating your first hospital and initial Hospital Admin.'}
                          </p>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => {
                              resetForm();
                              setCurrentView('add');
                            }}
                            style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <Plus size={15} /> Create First Hospital
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHospitals.map((hosp) => {
                      const createdDateStr = hosp.createdAt
                        ? new Date(hosp.createdAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Sep 30, 2026';

                      const isActive = (hosp.status || 'active').toLowerCase() === 'active';

                      return (
                        <tr key={hosp.id || hosp._id}>
                          {/* Hospital Name */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: 'rgba(8, 145, 178, 0.12)',
                                  color: '#0891b2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Building2 size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                  {hosp.hospitalName || hosp.name || 'Hospital Center'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {hosp.tagline || 'Clinical Care & Diagnostics'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Registration # */}
                          <td>
                            <span className="sa-badge sa-badge--info" style={{ fontSize: '0.75rem' }}>
                              {hosp.registrationNumber || 'HOSP-2026-001'}
                            </span>
                          </td>

                          {/* Contact Email & Phone */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Mail size={12} style={{ color: 'var(--text-secondary)' }} />
                                {hosp.contactEmail || 'contact@hms.com'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Phone size={12} />
                                {hosp.contactPhone || '+1 (800) 555-0199'}
                              </span>
                            </div>
                          </td>

                          {/* Location */}
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                              <MapPin size={13} style={{ color: '#0891b2', flexShrink: 0 }} />
                              <span>{hosp.location || `${hosp.address?.city || 'Metropolis'}, ${hosp.address?.country || 'USA'}`}</span>
                            </div>
                          </td>

                          {/* Hospital Admin */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <User size={13} style={{ color: '#0891b2' }} />
                                {hosp.adminName || hosp.adminUser?.fullName || 'Hospital Administrator'}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {hosp.adminEmail || hosp.adminUser?.email || 'admin@hms.com'}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span
                              className={`sa-badge ${isActive ? 'sa-badge--success' : 'sa-badge--neutral'}`}
                              style={{ fontSize: '0.72rem' }}
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 size={11} /> ACTIVE
                                </>
                              ) : (
                                'INACTIVE'
                              )}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {createdDateStr}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={() => {
                                  setSelectedHospital(hosp);
                                  setCurrentView('details');
                                }}
                                title="View details"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                              >
                                <span>Details</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={() => handleOpenEditModal(hosp)}
                                title="Edit hospital parameters"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                className={`btn btn--sm ${isActive ? 'btn--outline' : 'btn--primary'}`}
                                onClick={() => setStatusConfirmHospital(hosp)}
                                title={isActive ? 'Deactivate Hospital' : 'Activate Hospital'}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.6rem',
                                  color: isActive ? '#dc2626' : undefined,
                                  borderColor: isActive ? 'rgba(220, 38, 38, 0.4)' : undefined,
                                }}
                              >
                                <Power size={13} />
                                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: HOSPITAL DETAILS VIEW                                             */}
      {/* ========================================================================= */}
      {currentView === 'details' && selectedHospital && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                setCurrentView('list');
                setSelectedHospital(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={14} /> Back to Hospital List
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => handleOpenEditModal(selectedHospital)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
              >
                <Edit size={14} />
                <span>Edit Hospital</span>
              </button>

              <button
                type="button"
                className={`btn btn--sm ${(selectedHospital.status || 'active').toLowerCase() === 'active' ? 'btn--outline' : 'btn--primary'}`}
                onClick={() => setStatusConfirmHospital(selectedHospital)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  color: (selectedHospital.status || 'active').toLowerCase() === 'active' ? '#dc2626' : undefined,
                  borderColor: (selectedHospital.status || 'active').toLowerCase() === 'active' ? 'rgba(220, 38, 38, 0.4)' : undefined,
                }}
              >
                <Power size={14} />
                <span>{(selectedHospital.status || 'active').toLowerCase() === 'active' ? 'Deactivate Hospital' : 'Activate Hospital'}</span>
              </button>

              <span
                className={`sa-badge ${(selectedHospital.status || 'active').toLowerCase() === 'active' ? 'sa-badge--success' : 'sa-badge--neutral'}`}
                style={{ fontSize: '0.78rem' }}
              >
                {(selectedHospital.status || 'active').toLowerCase() === 'active' ? <CheckCircle2 size={12} /> : null}
                {String(selectedHospital.status || 'ACTIVE').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details Overview Banner */}
          <div className="sa-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'rgba(8, 145, 178, 0.12)',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={30} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedHospital.hospitalName || selectedHospital.name}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedHospital.tagline || 'Center of Healthcare Excellence & Specialized Clinical Services'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="sa-badge sa-badge--info" style={{ fontSize: '0.8rem' }}>
                  License: {selectedHospital.registrationNumber}
                </span>
                <span className="sa-badge sa-badge--neutral" style={{ fontSize: '0.8rem' }}>
                  TZ: {selectedHospital.timezone || 'America/New_York'}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>EMERGENCY HOTLINE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', marginTop: '0.2rem' }}>
                  {selectedHospital.emergencyHotline || '+1 (800) 911-0000'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CURRENCY / BILLING</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                  {selectedHospital.currency || 'USD'} ({selectedHospital.currencySymbol || '$'})
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OPERATIONAL STATUS</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: (selectedHospital.status || 'active').toLowerCase() === 'active' ? '#0891b2' : '#94a3b8', marginTop: '0.2rem' }}>
                  {String(selectedHospital.status || 'ACTIVE').toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Information Display: Hospital Information & Hospital Admin */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Panel 1: Hospital Information */}
            <div className="sa-card">
              <div className="sa-card__header">
                <div>
                  <h4 className="sa-card__title" style={{ fontSize: '1rem' }}>
                    <Building2 size={17} style={{ color: '#0891b2' }} />
                    Hospital Information
                  </h4>
                  <p className="sa-card__subtitle">Official registration, contact, and campus parameters</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hospital Name</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.hospitalName || selectedHospital.name}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Registration / License</span>
                  <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem' }}>
                    {selectedHospital.registrationNumber}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Contact Email</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.contactEmail}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Contact Phone</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.contactPhone}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Emergency Hotline</span>
                  <span style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>
                    {selectedHospital.emergencyHotline || '+1 (800) 911-0000'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Campus Address</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>
                    {selectedHospital.address?.street ? `${selectedHospital.address.street}, ` : ''}
                    {selectedHospital.address?.city || ''} {selectedHospital.address?.state || ''} {selectedHospital.address?.postalCode || ''}, {selectedHospital.address?.country || ''}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Timezone</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.timezone || 'America/New_York'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Created Date</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.createdAt ? new Date(selectedHospital.createdAt).toLocaleDateString() : 'Sep 30, 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 2: Hospital Admin */}
            <div className="sa-card">
              <div className="sa-card__header">
                <div>
                  <h4 className="sa-card__title" style={{ fontSize: '1rem' }}>
                    <ShieldCheck size={17} style={{ color: '#0891b2' }} />
                    Initial Hospital Administrator
                  </h4>
                  <p className="sa-card__subtitle">Primary administrator managing this hospital and staff</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Administrator Name</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.adminName || selectedHospital.adminUser?.fullName || 'Hospital Administrator'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Login Email / Username</span>
                  <span style={{ fontSize: '0.82rem', color: '#0891b2', fontWeight: 600 }}>
                    {selectedHospital.adminEmail || selectedHospital.adminUser?.email || 'admin@hms.com'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Phone Number</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    {selectedHospital.adminPhone || selectedHospital.adminUser?.phone || selectedHospital.contactPhone}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Assigned System Role</span>
                  <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem' }}>
                    HOSPITAL_ADMIN
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Account Status</span>
                  <span className="sa-badge sa-badge--success" style={{ fontSize: '0.72rem' }}>
                    <CheckCircle2 size={11} /> {String(selectedHospital.adminStatus || selectedHospital.adminUser?.status || 'ACTIVE').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hospital Association</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Linked & Restricted
                  </span>
                </div>

                {/* Security Note */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    background: 'rgba(8, 145, 178, 0.06)',
                    border: '1px solid rgba(8, 145, 178, 0.2)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.76rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: '#0891b2' }}>Security Notice:</strong> Temporary passwords and credential hashes are protected in storage and are never exposed via API or UI views.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ADD HOSPITAL FORM (MULTI-STEP WIZARD + REVIEW + SUCCESS)           */}
      {/* ========================================================================= */}
      {currentView === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '880px', margin: '0 auto' }}>
          {/* Wizard Stepper Progress Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.15rem 1.5rem',
            }}
          >
            {/* Step 1 Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: wizardStep >= 1 ? '#0891b2' : 'var(--bg-card)',
                  color: wizardStep >= 1 ? '#ffffff' : 'var(--text-secondary)',
                  border: wizardStep >= 1 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {wizardStep > 1 ? <Check size={16} /> : '1'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: wizardStep === 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  STEP 1
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Hospital Details
                </div>
              </div>
            </div>

            <div style={{ flex: 1, height: '2px', background: wizardStep >= 2 ? '#0891b2' : 'var(--border-color)', margin: '0 1rem' }} />

            {/* Step 2 Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: wizardStep >= 2 ? '#0891b2' : 'var(--bg-card)',
                  color: wizardStep >= 2 ? '#ffffff' : 'var(--text-secondary)',
                  border: wizardStep >= 2 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {wizardStep > 2 ? <Check size={16} /> : '2'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: wizardStep === 2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  STEP 2
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Initial Admin
                </div>
              </div>
            </div>

            <div style={{ flex: 1, height: '2px', background: wizardStep >= 3 ? '#0891b2' : 'var(--border-color)', margin: '0 1rem' }} />

            {/* Step 3 Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: wizardStep >= 3 ? '#0891b2' : 'var(--bg-card)',
                  color: wizardStep >= 3 ? '#ffffff' : 'var(--text-secondary)',
                  border: wizardStep >= 3 ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {wizardStep > 3 ? <Check size={16} /> : '3'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: wizardStep === 3 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  STEP 3
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Review & Create
                </div>
              </div>
            </div>
          </div>

          {/* Global Form Error Alert */}
          {submitError && (
            <div className="alert alert--error" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 1: HOSPITAL DETAILS                                   */}
          {/* ────────────────────────────────────────────────────────── */}
          {wizardStep === 1 && (
            <form onSubmit={handleStep1Next} className="sa-card" style={{ padding: '1.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Step 1: Hospital Details & Institutional Parameters
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Provide official registration, clinical contact details, physical campus location, and localization preferences.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {/* Hospital Name */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Hospital Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. MetroHealth Medical Center"
                    value={formData.hospitalName}
                    onChange={(e) => handleInputChange('hospitalName', e.target.value)}
                    style={{ borderColor: formErrors.hospitalName ? '#ef4444' : undefined }}
                  />
                  {formErrors.hospitalName && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.hospitalName}
                    </span>
                  )}
                </div>

                {/* Registration / License Number */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Registration / License Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HOSP-2026-NY-882"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    style={{ borderColor: formErrors.registrationNumber ? '#ef4444' : undefined }}
                  />
                  {formErrors.registrationNumber && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.registrationNumber}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Tagline / Clinical Motto
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Excellence in Compassionate Patient Care"
                    value={formData.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                  />
                </div>

                {/* Hospital Email */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Hospital Official Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. contact@metrohealth.org"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    style={{ borderColor: formErrors.contactEmail ? '#ef4444' : undefined }}
                  />
                  {formErrors.contactEmail && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.contactEmail}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 (555) 019-2831"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    style={{ borderColor: formErrors.contactPhone ? '#ef4444' : undefined }}
                  />
                  {formErrors.contactPhone && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.contactPhone}
                    </span>
                  )}
                </div>

                {/* Emergency Hotline */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Emergency / Hotline Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 (800) 911-0000"
                    value={formData.emergencyHotline}
                    onChange={(e) => handleInputChange('emergencyHotline', e.target.value)}
                  />
                </div>

                {/* Street Address */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Campus Street Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 500 Medical Center Way, Suite 100"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    style={{ borderColor: formErrors.street ? '#ef4444' : undefined }}
                  />
                  {formErrors.street && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.street}
                    </span>
                  )}
                </div>

                {/* City */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    City <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. New York"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    style={{ borderColor: formErrors.city ? '#ef4444' : undefined }}
                  />
                  {formErrors.city && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.city}
                    </span>
                  )}
                </div>

                {/* State / Province */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    State / Province <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. NY"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    style={{ borderColor: formErrors.state ? '#ef4444' : undefined }}
                  />
                  {formErrors.state && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.state}
                    </span>
                  )}
                </div>

                {/* Postal Code */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 10001"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  />
                </div>

                {/* Country */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Country <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. United States"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    style={{ borderColor: formErrors.country ? '#ef4444' : undefined }}
                  />
                  {formErrors.country && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.country}
                    </span>
                  )}
                </div>

                {/* Currency */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Operational Currency
                  </label>
                  <select
                    className="form-input"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                  >
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Timezone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Timezone
                  </label>
                  <select
                    className="form-input"
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.75rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => {
                    setCurrentView('list');
                    onTabChange?.('hospitals');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={15} /> Cancel & Return
                </button>

                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                >
                  <span>Continue to Admin Details</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 2: INITIAL HOSPITAL ADMIN DETAILS                     */}
          {/* ────────────────────────────────────────────────────────── */}
          {wizardStep === 2 && (
            <form onSubmit={handleStep2Next} className="sa-card" style={{ padding: '1.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Step 2: Initial Hospital Administrator Details
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Create the primary administrator account for <strong>{formData.hospitalName}</strong>. This account will have the fixed role of <code>HOSPITAL_ADMIN</code>.
                </p>
              </div>

              {/* Security Boundary Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(8, 145, 178, 0.08)',
                  border: '1px solid rgba(8, 145, 178, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                }}
              >
                <ShieldCheck size={18} style={{ color: '#0891b2', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                  <strong>Role Assignment Notice:</strong> The user role is strictly locked to <strong>HOSPITAL_ADMIN</strong>. Super Administrators cannot assign <code>SUPER_ADMIN</code> privileges here.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {/* Full Name */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Admin Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Eleanor Vance"
                    value={formData.adminFullName}
                    onChange={(e) => handleInputChange('adminFullName', e.target.value)}
                    style={{ borderColor: formErrors.adminFullName ? '#ef4444' : undefined }}
                  />
                  {formErrors.adminFullName && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.adminFullName}
                    </span>
                  )}
                </div>

                {/* Login Email */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Login Email / Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. admin.vance@cityhospital.org"
                    value={formData.adminEmail}
                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                    style={{ borderColor: formErrors.adminEmail ? '#ef4444' : undefined }}
                  />
                  {formErrors.adminEmail && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.adminEmail}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Admin Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +1 (555) 234-5678"
                    value={formData.adminPhone}
                    onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                    style={{ borderColor: formErrors.adminPhone ? '#ef4444' : undefined }}
                  />
                  {formErrors.adminPhone && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.adminPhone}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Password / Temporary Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Minimum 8 characters with letters, numbers, and symbols"
                      value={formData.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      style={{
                        paddingRight: '2.5rem',
                        borderColor: formErrors.adminPassword ? '#ef4444' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.adminPassword && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      {formErrors.adminPassword}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    The administrator can use this password to sign into the Hospital Admin Portal immediately.
                  </span>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.75rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setWizardStep(1)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={15} /> Back to Hospital Details
                </button>

                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                >
                  <span>Review & Summary</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 3: REVIEW SUMMARY                                     */}
          {/* ────────────────────────────────────────────────────────── */}
          {wizardStep === 3 && (
            <div className="sa-card" style={{ padding: '1.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Step 3: Review & Final Confirmation
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Verify all hospital specifications and administrator credentials before committing to database creation.
                </p>
              </div>

              {/* Review Grid: Hospital Details & Admin Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Hospital Review */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <Building2 size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Hospital Parameters</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Hospital Name:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formData.hospitalName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Registration #:</span>
                      <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem' }}>{formData.registrationNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tagline:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formData.tagline || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Contact Email:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formData.contactEmail}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Contact Phone:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formData.contactPhone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Emergency Hotline:</span>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>{formData.emergencyHotline || '+1 (800) 911-0000'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                      <span style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>
                        {formData.street}, {formData.city}, {formData.state} {formData.postalCode}, {formData.country}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Currency & TZ:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formData.currency} ({formData.currencySymbol}) • {formData.timezone}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Review */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <ShieldCheck size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Initial Hospital Administrator</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Admin Full Name:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formData.adminFullName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Login Email / Username:</span>
                      <strong style={{ color: '#0891b2' }}>{formData.adminEmail}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Admin Phone:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{formData.adminPhone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned Role:</span>
                      <span className="sa-badge sa-badge--info" style={{ fontSize: '0.72rem' }}>HOSPITAL_ADMIN</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Password Status:</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>•••••••• (Masked for security)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target Facility:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formData.hospitalName}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.75rem 0.85rem',
                      background: 'rgba(8, 145, 178, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(8, 145, 178, 0.2)',
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    Both records will be provisioned in an atomic database transaction. If any validation fails, no partial records will be created.
                  </div>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setWizardStep(2)}
                  disabled={isSubmitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ArrowLeft size={15} /> Back to Edit Admin
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="btn btn--primary"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    padding: '0.65rem 1.4rem',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" />
                      <span>Creating Hospital & Admin...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Create Hospital & Admin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 4: SUCCESS CONFIRMATION                               */}
          {/* ────────────────────────────────────────────────────────── */}
          {wizardStep === 4 && createdResult && (
            <div className="sa-card" style={{ padding: '2.25rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Hospital created successfully.
              </h2>
              <p style={{ margin: '0.4rem 0 1.5rem 0', fontSize: '1rem', color: '#10b981', fontWeight: 600 }}>
                Hospital Admin account created and linked successfully.
              </p>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', textAlign: 'left', marginBottom: '1.75rem' }}>
                {/* Hospital Summary */}
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Building2 size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Hospital Record</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Name: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{createdResult.hospital?.hospitalName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Registration #: </span>
                      <span className="sa-badge sa-badge--info" style={{ fontSize: '0.7rem' }}>
                        {createdResult.hospital?.registrationNumber}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Contact Email: </span>
                      <span style={{ color: 'var(--text-primary)' }}>{createdResult.hospital?.contactEmail}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Location: </span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {createdResult.hospital?.address?.city}, {createdResult.hospital?.address?.country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Summary */}
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ShieldCheck size={18} style={{ color: '#0891b2' }} />
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Linked Hospital Admin</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Admin Name: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{createdResult.admin?.fullName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Login Email: </span>
                      <strong style={{ color: '#0891b2' }}>{createdResult.admin?.email}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Assigned Role: </span>
                      <span className="sa-badge sa-badge--info" style={{ fontSize: '0.7rem' }}>
                        HOSPITAL_ADMIN
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Status: </span>
                      <span className="sa-badge sa-badge--success" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle2 size={10} /> ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    resetForm();
                    setCurrentView('list');
                    onTabChange?.('hospitals');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  Return to Hospital Management
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setSelectedHospital(createdResult.hospital);
                    setCurrentView('details');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ExternalLink size={15} /> View Hospital Details
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT HOSPITAL & LINKED ADMINISTRATOR                                */}
      {/* ========================================================================= */}
      {editingHospital && (
        <div className="sa-modal-backdrop" onClick={() => !editLoading && setEditingHospital(null)}>
          <div
            className="sa-modal-container"
            style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveEditHospital} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="sa-modal-header" style={{ flexShrink: 0 }}>
                <div>
                  <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Edit size={18} style={{ color: '#0891b2' }} />
                    Edit Hospital & Administrator
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Update institutional parameters and linked Hospital Administrator profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !editLoading && setEditingHospital(null)}
                  className="btn btn--outline btn--sm"
                  disabled={editLoading}
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="sa-modal-body"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  padding: '1.25rem 1.5rem',
                }}
              >
                {editErrorMsg && (
                  <div className="alert alert--error" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <AlertCircle size={16} />
                    <span style={{ fontSize: '0.82rem' }}>{editErrorMsg}</span>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* SECTION 1: HOSPITAL DETAILS                                */}
                {/* ────────────────────────────────────────────────────────── */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} style={{ color: '#0891b2' }} />
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        1. Hospital Details
                      </h4>
                    </div>
                    <span className="sa-badge sa-badge--cyan" style={{ fontSize: '0.7rem' }}>Institutional Core</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                    {/* Hospital Name */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Hospital Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.hospitalName}
                        onChange={(e) => handleEditInputChange('hospitalName', e.target.value)}
                        className="form-input"
                        placeholder="e.g. MetroHealth Medical Center"
                      />
                      {editFormErrors.hospitalName && (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{editFormErrors.hospitalName}</span>
                      )}
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Registration Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.registrationNumber}
                        onChange={(e) => handleEditInputChange('registrationNumber', e.target.value)}
                        className="form-input"
                        placeholder="e.g. HOSP-2026-NY-882"
                      />
                      {editFormErrors.registrationNumber && (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{editFormErrors.registrationNumber}</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Operational Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => handleEditInputChange('status', e.target.value)}
                        className="form-input"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Contact Email */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Contact Email <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={editForm.contactEmail}
                        onChange={(e) => handleEditInputChange('contactEmail', e.target.value)}
                        className="form-input"
                        placeholder="contact@hospital.com"
                      />
                      {editFormErrors.contactEmail && (
                        <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{editFormErrors.contactEmail}</span>
                      )}
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={editForm.contactPhone}
                        onChange={(e) => handleEditInputChange('contactPhone', e.target.value)}
                        className="form-input"
                        placeholder="+1 (555) 019-2831"
                      />
                    </div>

                    {/* Emergency Hotline */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Emergency Hotline
                      </label>
                      <input
                        type="text"
                        value={editForm.emergencyHotline}
                        onChange={(e) => handleEditInputChange('emergencyHotline', e.target.value)}
                        className="form-input"
                        placeholder="+1 (800) 911-0000"
                      />
                    </div>

                    {/* Tagline */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Tagline / Clinical Motto
                      </label>
                      <input
                        type="text"
                        value={editForm.tagline}
                        onChange={(e) => handleEditInputChange('tagline', e.target.value)}
                        className="form-input"
                        placeholder="Excellence in Care"
                      />
                    </div>

                    {/* Street Address */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={editForm.street}
                        onChange={(e) => handleEditInputChange('street', e.target.value)}
                        className="form-input"
                        placeholder="500 Medical Center Way"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        City
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => handleEditInputChange('city', e.target.value)}
                        className="form-input"
                        placeholder="New York"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        State / Province
                      </label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => handleEditInputChange('state', e.target.value)}
                        className="form-input"
                        placeholder="NY"
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Country
                      </label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => handleEditInputChange('country', e.target.value)}
                        className="form-input"
                        placeholder="United States"
                      />
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Timezone
                      </label>
                      <select
                        value={editForm.timezone}
                        onChange={(e) => handleEditInputChange('timezone', e.target.value)}
                        className="form-input"
                      >
                        {COMMON_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* SECTION 2: HOSPITAL ADMIN DETAILS                          */}
                {/* ────────────────────────────────────────────────────────── */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={16} style={{ color: '#6366f1' }} />
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Hospital Administrator Details
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="sa-badge sa-badge--indigo" style={{ fontSize: '0.7rem' }}>
                        Role: HOSPITAL_ADMIN
                      </span>
                    </div>
                  </div>

                  {!editForm.hasLinkedAdmin ? (
                    <div className="alert" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontSize: '0.82rem' }}>No Hospital Admin is currently linked to this hospital.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      {/* Full Name */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Administrator Full Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.adminFullName}
                          onChange={(e) => handleEditInputChange('adminFullName', e.target.value)}
                          className="form-input"
                          placeholder="e.g. Dr. Jane Smith"
                        />
                        {editFormErrors.adminFullName && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{editFormErrors.adminFullName}</span>
                        )}
                      </div>

                      {/* Login Email */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Admin Email <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={editForm.adminEmail}
                          onChange={(e) => handleEditInputChange('adminEmail', e.target.value)}
                          className="form-input"
                          placeholder="admin@hospital.com"
                        />
                        {editFormErrors.adminEmail && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>{editFormErrors.adminEmail}</span>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Admin Contact Phone
                        </label>
                        <input
                          type="text"
                          value={editForm.adminPhone}
                          onChange={(e) => handleEditInputChange('adminPhone', e.target.value)}
                          className="form-input"
                          placeholder="+1 (555) 019-2831"
                        />
                      </div>

                      {/* Account Status */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Account Status
                        </label>
                        <select
                          value={editForm.adminStatus}
                          onChange={(e) => handleEditInputChange('adminStatus', e.target.value)}
                          className="form-input"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sa-modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border-color)', padding: '0.85rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => !editLoading && setEditingHospital(null)}
                  className="btn btn--outline btn--sm"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn btn--primary btn--sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {editLoading ? <RefreshCw size={14} className="spin-animation" /> : <CheckCircle2 size={14} />}
                  <span>{editLoading ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STATUS TOGGLE CONFIRMATION DIALOG                                  */}
      {/* ========================================================================= */}
      {statusConfirmHospital && (
        <div className="sa-modal-backdrop" onClick={() => setStatusConfirmHospital(null)}>
          <div className="sa-modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3 className="sa-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: (statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? '#dc2626' : '#0891b2' }}>
                <AlertTriangle size={20} />
                {(statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? 'Deactivate Hospital' : 'Activate Hospital'}
              </h3>
              <button
                type="button"
                onClick={() => setStatusConfirmHospital(null)}
                className="btn btn--outline btn--sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sa-modal-body" style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                Are you sure you want to <strong>{(statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? 'deactivate' : 'activate'}</strong> hospital <strong>"{statusConfirmHospital.hospitalName || statusConfirmHospital.name}"</strong>?
              </p>
              {(statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Deactivating this hospital will restrict its administrative staff and clinical access until it is reactivated by a Super Administrator.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Activating this hospital will restore operational access for its linked Hospital Administrator and clinical departments.
                </p>
              )}
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                onClick={() => setStatusConfirmHospital(null)}
                className="btn btn--outline btn--sm"
                disabled={statusActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatusConfirm}
                disabled={statusActionLoading}
                className={`btn btn--sm ${(statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? 'btn--primary' : 'btn--primary'}`}
                style={{
                  background: (statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? '#dc2626' : undefined,
                  borderColor: (statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? '#dc2626' : undefined,
                }}
              >
                {statusActionLoading ? 'Updating Status...' : (statusConfirmHospital.status || 'active').toLowerCase() === 'active' ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
