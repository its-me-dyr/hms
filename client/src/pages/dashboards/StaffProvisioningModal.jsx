/**
 * Staff Provisioning Modal Component
 * 
 * Secure modal dialog for Hospital Admin and Super Admin to provision
 * staff accounts (Doctor, Nurse, Pharmacist, Lab Technician, Radiologist,
 * Receptionist, Billing Staff, etc.).
 * 
 * Password Architecture:
 * - Manual Temporary Password.
 * - Hospital Admin enters the temporary password directly in the Add Staff form.
 * - Backend securely hashes it with bcrypt and sets mustChangePassword = true.
 * - Staff member logs in using Staff Email Address and temporary password.
 * - Staff member is forced to change the temporary password on first login.
 */

import { useState } from 'react';
import {
  UserPlus,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { superadminService } from '../../services/superadmin.service';
import { hospitalAdminService } from '../../services/hospitalAdmin.service';

const DEPARTMENTS = [
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
  'Hospital Administration',
];

const STAFF_ROLES = [
  { value: 'DOCTOR', label: 'Doctor / Physician', dept: 'General Medicine' },
  { value: 'NURSE', label: 'Nurse / Nursing Staff', dept: 'General Medicine' },
  { value: 'PHARMACIST', label: 'Pharmacist', dept: 'Pharmacy Services' },
  { value: 'LAB_TECH', label: 'Laboratory Technician', dept: 'Pathology & Laboratory' },
  { value: 'RADIOLOGY_STAFF', label: 'Radiology / Imaging Staff', dept: 'Radiology & Imaging' },
  { value: 'RECEPTIONIST', label: 'Reception / Front Desk Staff', dept: 'Front Desk & Patient Services' },
  { value: 'BILLING_STAFF', label: 'Billing & Cashier Staff', dept: 'Billing & Accounts' },
];

function generateQuickPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let pwd = 'Hms@';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function StaffProvisioningModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'staff_only',
  allowHospitalAdminRole = false,
}) {
  const isHospitalAdminOnly = mode === 'hospital_admin_only' || allowHospitalAdminRole === true;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: isHospitalAdminOnly ? 'HOSPITAL_ADMIN' : 'DOCTOR',
    department: isHospitalAdminOnly ? 'Hospital Administration' : 'General Medicine',
    specialization: isHospitalAdminOnly ? 'Hospital Administration' : '',
    qualification: '',
    licenseNumber: '',
    password: '',
    status: 'active',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'role') {
        const found = STAFF_ROLES.find((r) => r.value === value);
        if (found) next.department = found.dept;
      }
      return next;
    });
    setError('');
  };

  const handleGeneratePassword = () => {
    const generated = generateQuickPassword();
    setFormData((prev) => ({ ...prev, password: generated }));
    setShowPassword(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid Staff Email Address (e.g. doctor@hospital.org).');
      return;
    }

    if (!formData.password || formData.password.trim().length < 8) {
      setError('Please enter a temporary password of at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: cleanEmail,
        phone: formData.phone.trim(),
        role: isHospitalAdminOnly ? 'HOSPITAL_ADMIN' : formData.role,
        department: formData.department,
        specialization: formData.specialization.trim(),
        qualification: formData.qualification.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        password: formData.password.trim(),
        status: formData.status,
      };

      const apiService = isHospitalAdminOnly ? superadminService : hospitalAdminService;
      const res = await apiService.createStaffUser(payload);
      const createdUser = res?.data?.user || res?.user || res?.data;

      setSuccessInfo({
        user: createdUser,
        role: payload.role,
        department: payload.department,
        email: payload.email,
        name: `${payload.firstName} ${payload.lastName}`.trim(),
      });

      if (onSuccess) {
        onSuccess(createdUser);
      }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to provision staff account.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessInfo(null);
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="hms-modal-backdrop" onClick={handleClose}>
      <div
        className="hms-modal"
        style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(8, 145, 178, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isHospitalAdminOnly ? 'Provision Hospital Administrator' : 'Provision Staff Account'}
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isHospitalAdminOnly
                  ? 'Create an authorized Hospital Administrator account to manage hospital operations and staff.'
                  : 'Enter staff details and assign a temporary login password.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="hms-modal__close-btn"
            style={{ position: 'static' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* SUCCESS CONFIRMATION STATE */}
        {successInfo ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--color-success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
              {isHospitalAdminOnly
                ? 'Hospital Administrator Provisioned Successfully'
                : 'Staff Account Provisioned Successfully'}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              The staff profile and database records have been established.
            </p>

            {/* DETAILS CARD */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{successInfo.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Role:</span>
                <span className="badge badge--primary">{successInfo.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{successInfo.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Staff Email Address:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{successInfo.email}</strong>
              </div>

              {/* CREDENTIALS / NEXT STEPS NOTICE */}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <div
                  style={{
                    background: 'rgba(8, 145, 178, 0.08)',
                    border: '1px solid rgba(8, 145, 178, 0.25)',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    gap: '0.65rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <KeyRound size={18} color="#0891b2" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8rem', lineHeight: 1.45, color: 'var(--text-primary)' }}>
                    <strong>Account Ready for First Login:</strong>
                    <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
                      Provide the <strong>Staff Email Address</strong> (<code>{successInfo.email}</code>) and temporary password directly to the staff member.
                      They can log in immediately at the HMS login page and will be required to change their temporary password upon first login before accessing their dashboard.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSuccessInfo(null);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    role: isHospitalAdminOnly ? 'HOSPITAL_ADMIN' : 'DOCTOR',
                    department: isHospitalAdminOnly ? 'Hospital Administration' : 'General Medicine',
                    specialization: isHospitalAdminOnly ? 'Hospital Administration' : '',
                    qualification: '',
                    licenseNumber: '',
                    password: '',
                    status: 'active',
                  });
                  setShowPassword(false);
                }}
                className="btn btn--outline"
              >
                {isHospitalAdminOnly ? 'Provision Another Admin' : 'Provision Another Staff'}
              </button>
              <button type="button" onClick={handleClose} className="btn btn--primary">
                Done
              </button>
            </div>
          </div>
        ) : (
          /* PROVISIONING FORM */
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert--danger" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* SECTION 1: NAME */}
              <div className="hms-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    name="firstName"
                    placeholder="e.g. John"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    name="lastName"
                    placeholder="e.g. Smith"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* SECTION 2: CONTACT */}
              <div className="hms-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Staff Email Address *</label>
                  <input
                    type="email"
                    required
                    name="email"
                    placeholder="e.g. doctor@hospital.org"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Contact Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 012-3456"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* SECTION 3: ROLE & DEPARTMENT */}
              <div className="hms-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    {isHospitalAdminOnly ? 'Administrative Role *' : 'Assigned Staff Role *'}
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', padding: '0 1.75rem 0 0.85rem', fontSize: '0.85rem', lineHeight: 'normal', boxSizing: 'border-box' }}
                    disabled={isHospitalAdminOnly}
                  >
                    {isHospitalAdminOnly ? (
                      <option value="HOSPITAL_ADMIN">Hospital Administrator (HOSPITAL_ADMIN)</option>
                    ) : (
                      STAFF_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', padding: '0 1.75rem 0 0.85rem', fontSize: '0.85rem', lineHeight: 'normal', boxSizing: 'border-box' }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 4: CLINICAL SPECIALIZATION (Optional) */}
              <div className="hms-form-row">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Specialization / Title</label>
                  <input
                    type="text"
                    name="specialization"
                    placeholder="e.g. Cardiologist, Senior Staff Nurse"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Medical License / Reg Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    placeholder="e.g. MED-REG-7819"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="form-input"
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* SECTION 5: MANUAL TEMPORARY PASSWORD */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '0.25rem',
                }}
              >
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>
                      Temporary Login Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="btn btn--outline btn--sm"
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Generate a random password suggestion"
                    >
                      <RefreshCw size={11} />
                      <span>Suggest Strong Password</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      name="password"
                      placeholder="Enter temporary password (min 8 chars)"
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input"
                      style={{
                        height: '38px',
                        fontSize: '0.85rem',
                        paddingRight: '38px',
                        fontFamily: showPassword ? 'monospace' : 'inherit',
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
                        padding: '2px',
                      }}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.35 }}>
                    This temporary password will be securely hashed with bcrypt. The staff member will be required to change it upon first login before accessing their dashboard.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Initial Account Status:</span>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="form-input form-input--sm"
                    style={{
                      width: '135px',
                      height: '36px',
                      padding: '0 1.5rem 0 0.75rem',
                      fontSize: '0.85rem',
                      lineHeight: 'normal',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" onClick={handleClose} className="btn btn--outline" disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn--primary" style={{ minWidth: '200px' }}>
                {loading ? 'Provisioning...' : 'Provision Staff Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
