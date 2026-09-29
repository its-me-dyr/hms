/**
 * HMS Registration Page — Unified Healthcare Flow
 * 
 * Architecture:
 * 1. Common Personal & Contact Details for ALL roles (Patient and Staff).
 * 2. Role-Specific Professional Credentials dynamically tailored per role.
 * 3. Step Progression:
 *    - Patient: Step 1 (Personal & Contact) -> Step 2 (Security & Consent) -> OTP -> ACTIVE
 *    - Staff: Step 1 (Personal Details) -> Step 2 (Professional Credentials) -> Step 3 (Documents & Security) -> OTP -> Success Summary Card
 * 4. Email OTP Verification:
 *    - Patients gain immediate active access.
 *    - Staff accounts are set to PENDING_VERIFICATION and submitted to Super Admin.
 * 5. Staff Registration Success Summary:
 *    - Displays Application Summary (Applicant, Email, Role, Department, Application ID, Timestamp, Docs count, Status: PENDING SUPER ADMIN APPROVAL).
 *    - Provides "Back to Sign In" action.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { authService } from '../../services/auth.service';
import {
  Heart,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Activity,
  Lock,
  UploadCloud,
  Trash2,
  User,
  Briefcase,
  FileCheck,
  Calendar,
  Pill,
} from 'lucide-react';

const REGISTRATION_ROLES = [
  { value: 'patient', label: 'Patient Portal', badge: 'Immediate Access' },
  { value: 'doctor', label: 'Doctor / Physician', badge: 'Requires Admin Approval' },
  { value: 'nurse', label: 'Registered Nurse', badge: 'Requires Admin Approval' },
  { value: 'receptionist', label: 'Front Desk Receptionist', badge: 'Requires Admin Approval' },
  { value: 'pharmacist', label: 'Hospital Pharmacist', badge: 'Requires Admin Approval' },
  { value: 'lab_technician', label: 'Laboratory Technician', badge: 'Requires Admin Approval' },
  { value: 'radiology_staff', label: 'Radiology Staff', badge: 'Requires Admin Approval' },
  { value: 'ot_staff', label: 'Operation Theatre Staff', badge: 'Requires Admin Approval' },
  { value: 'billing_staff', label: 'Billing Officer', badge: 'Requires Admin Approval' },
  { value: 'insurance_staff', label: 'Insurance Coordinator', badge: 'Requires Admin Approval' },
  { value: 'hr_staff', label: 'HR Staff', badge: 'Requires Admin Approval' },
  { value: 'inventory_staff', label: 'Inventory Manager', badge: 'Requires Admin Approval' },
  { value: 'blood_bank_staff', label: 'Blood Bank Officer', badge: 'Requires Admin Approval' },
  { value: 'emergency_staff', label: 'Emergency Staff', badge: 'Requires Admin Approval' },
];

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

const ROLE_DOCUMENT_CONFIG = {
  doctor: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Medical Qualification Certificate', sub: 'MBBS, MD, MS, or equivalent certificate', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'Medical Registration / License', sub: 'State Medical Council / National Registration certificate', required: true, type: 'license' },
    { key: 'experience_cert', label: 'Experience Certificate', sub: 'Previous hospital employment record (optional)', required: false, type: 'experience_cert' },
  ],
  nurse: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Nursing Qualification Certificate', sub: 'B.Sc Nursing, GNM, or M.Sc degree certificate', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'Nursing Council Registration / License', sub: 'State Nursing Council valid registration copy', required: true, type: 'license' },
    { key: 'experience_cert', label: 'Experience Certificate', sub: 'Hospital ward or clinical experience proof (optional)', required: false, type: 'experience_cert' },
  ],
  pharmacist: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Pharmacy Qualification Certificate', sub: 'B.Pharm, M.Pharm, or Pharm.D certificate', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'Pharmacy Council License / Registration', sub: 'State Pharmacy Council License certificate', required: true, type: 'license' },
    { key: 'experience_cert', label: 'Experience Certificate', sub: 'Dispensing or clinical pharmacy proof (optional)', required: false, type: 'experience_cert' },
  ],
  lab_technician: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Laboratory Qualification Certificate', sub: 'MLT, DMLT, or B.Sc Medical Lab Tech certificate', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'Paramedical Registration / License', sub: 'Council registration or accredited lab certification', required: true, type: 'license' },
    { key: 'experience_cert', label: 'Work Experience Certificate', sub: 'Diagnostic laboratory experience letter (optional)', required: false, type: 'experience_cert' },
  ],
  radiology_staff: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Radiology Qualification Certificate', sub: 'B.Sc Radiology or Medical Imaging certificate', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'Radiation Safety / Imaging License', sub: 'AERB or competent imaging registration certificate', required: true, type: 'license' },
    { key: 'experience_cert', label: 'Radiology Experience Certificate', sub: 'Hospital imaging / scanning experience proof (optional)', required: false, type: 'experience_cert' },
  ],
  ot_staff: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'OT Qualification Certificate', sub: 'OT Technician Diploma or Surgical Assistant Degree', required: true, type: 'qualification_cert' },
    { key: 'license', label: 'OT Registration / Certificate', sub: 'Accredited certificate or state council registration (optional)', required: false, type: 'license' },
    { key: 'experience_cert', label: 'Surgical Experience Certificate', sub: 'Hospital OT / surgical unit experience proof (optional)', required: false, type: 'experience_cert' },
  ],
  non_clinical: [
    { key: 'identity', label: 'Government Photo ID', sub: 'Passport, National ID, or Driving License', required: true, type: 'identity' },
    { key: 'qualification_cert', label: 'Educational Qualification Certificate', sub: 'Highest degree or diploma certificate', required: true, type: 'qualification_cert' },
    { key: 'experience_cert', label: 'Experience / Employment Certificate', sub: 'Previous organizational experience certificate (optional)', required: false, type: 'experience_cert' },
  ],
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Navigation state:
  // step: 1 (Personal Details), 2 (Professional or Security), 3 (Documents & Security for Staff)
  const [formStep, setFormStep] = useState(1);
  const [isOtpScreen, setIsOtpScreen] = useState(false);
  const [applicationSummary, setApplicationSummary] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Common Personal Information
    role: 'patient',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',

    // Common Address & Emergency Contact
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: 'United States',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',

    // Role-Specific Professional Information
    department: 'General Medicine',
    qualification: '',
    institution: '',
    yearsOfExperience: '',
    previousOrganization: '',
    licenseNumber: '',
    specialization: '',
    professionalBio: '',

    // Security & Terms
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  // Document Uploads State
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [docErrors, setDocErrors] = useState({});

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // Timers
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(0); // 60s cooldown

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState('');

  // Countdown timer for OTP expiration (5 mins)
  useEffect(() => {
    if (!isOtpScreen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpScreen]);

  // Resend cooldown timer (60s)
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  // If already authenticated, redirect to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isPatient = formData.role === 'patient';
  const totalSteps = isPatient ? 2 : 3;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (newRole) => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
    }));
    setError('');
    setFieldErrors({});
    if (newRole === 'patient' && formStep > 2) {
      setFormStep(2);
    }
  };

  // Handle Document Upload
  const handleFileUpload = async (e, docDef) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setDocErrors((prev) => ({ ...prev, [docDef.key]: 'File exceeds 5MB limit. Please upload a smaller file.' }));
      return;
    }

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      setDocErrors((prev) => ({ ...prev, [docDef.key]: 'Invalid format. Allowed: PDF, PNG, JPG, JPEG.' }));
      return;
    }

    setDocErrors((prev) => ({ ...prev, [docDef.key]: '' }));
    setUploadingSlot(docDef.key);

    try {
      const res = await authService.uploadDocument(file, docDef.label, docDef.type);
      const data = res?.data || res;
      setUploadedDocs((prev) => ({
        ...prev,
        [docDef.key]: {
          key: docDef.key,
          documentName: docDef.label,
          documentType: docDef.type,
          originalName: file.name,
          fileKey: data.fileKey,
          fileUrl: data.fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        },
      }));
    } catch (err) {
      setDocErrors((prev) => ({
        ...prev,
        [docDef.key]: err.message || err.response?.data?.message || 'Failed to upload document.',
      }));
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemoveDoc = (key) => {
    setUploadedDocs((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setDocErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // ── Step 1 Validation: Common Personal & Contact Details ──
  const validateStep1 = () => {
    const errs = {};

    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';

    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number';
    }

    if (!formData.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        errs.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (!formData.gender) errs.gender = 'Please select a gender';
    if (!formData.role) errs.role = 'Please select an account type';

    // Disallow administrative roles
    if (['super_admin', 'hospital_admin'].includes(formData.role)) {
      errs.role = 'Administrative roles cannot be registered publicly';
    }

    // Address validation
    if (!formData.addressStreet.trim()) errs.addressStreet = 'Street address is required';
    if (!formData.addressCity.trim()) errs.addressCity = 'City is required';
    if (!formData.addressState.trim()) errs.addressState = 'State / Province is required';
    if (!formData.addressPostalCode.trim()) errs.addressPostalCode = 'Postal code is required';

    // Emergency contact validation
    if (!formData.emergencyName.trim()) errs.emergencyName = 'Emergency contact name is required';
    if (!formData.emergencyPhone.trim()) {
      errs.emergencyPhone = 'Emergency contact phone is required';
    } else if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/.test(formData.emergencyPhone.trim())) {
      errs.emergencyPhone = 'Please enter a valid phone number';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 2 Validation: Role-Specific Professional Details ──
  const validateStep2Staff = () => {
    const errs = {};

    if (!formData.department) errs.department = 'Please select a hospital department';
    if (!formData.qualification.trim()) errs.qualification = 'Highest qualification is required';
    if (!formData.institution.trim()) errs.institution = 'Institution / University is required';
    if (formData.yearsOfExperience === '' || isNaN(Number(formData.yearsOfExperience))) {
      errs.yearsOfExperience = 'Years of experience is required';
    }

    if (formData.role === 'doctor') {
      if (!formData.specialization.trim()) errs.specialization = 'Medical specialization is required';
      if (!formData.licenseNumber.trim()) errs.licenseNumber = 'Medical registration / license ID is required';
    } else if (formData.role === 'nurse') {
      if (!formData.licenseNumber.trim()) errs.licenseNumber = 'Nursing council registration ID is required';
    } else if (formData.role === 'pharmacist') {
      if (!formData.licenseNumber.trim()) errs.licenseNumber = 'Pharmacy license / registration ID is required';
    } else if (formData.role === 'radiology_staff') {
      if (!formData.licenseNumber.trim()) errs.licenseNumber = 'Radiation safety / imaging license ID is required';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 3 Validation: Documents, Security & Consent ──
  const validateStepFinal = () => {
    const errs = {};

    // Validate documents for staff
    if (!isPatient) {
      const docRequirements = ROLE_DOCUMENT_CONFIG[formData.role] || ROLE_DOCUMENT_CONFIG.non_clinical;
      const currentDocErrs = {};
      docRequirements.forEach((reqDoc) => {
        if (reqDoc.required && !uploadedDocs[reqDoc.key]) {
          currentDocErrs[reqDoc.key] = `Please upload your ${reqDoc.label}`;
        }
      });

      if (Object.keys(currentDocErrs).length > 0) {
        setDocErrors(currentDocErrs);
        errs.documents = 'Please upload all mandatory documents marked with *';
      }
    }

    // Security & Consent
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      errs.acceptTerms = 'You must accept the terms & verification consent';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Navigation handlers
  const handleContinue = (e) => {
    e.preventDefault();
    if (formStep === 1) {
      if (validateStep1()) {
        setFormStep(2);
      }
    } else if (formStep === 2 && !isPatient) {
      if (validateStep2Staff()) {
        setFormStep(3);
      }
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    if (formStep > 1) {
      setFormStep((prev) => prev - 1);
    }
  };

  // Request OTP (Final step submission)
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!validateStepFinal()) return;

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        role: formData.role,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        address: {
          street: formData.addressStreet.trim(),
          city: formData.addressCity.trim(),
          state: formData.addressState.trim(),
          postalCode: formData.addressPostalCode.trim(),
          country: formData.addressCountry.trim(),
        },
        emergencyContact: {
          name: formData.emergencyName.trim(),
          phone: formData.emergencyPhone.trim(),
          relation: formData.emergencyRelation.trim(),
        },
      };

      if (!isPatient) {
        payload.department = formData.department;
        payload.qualification = formData.qualification.trim();
        payload.institution = formData.institution.trim();
        payload.yearsOfExperience = Number(formData.yearsOfExperience) || 0;
        payload.previousOrganization = formData.previousOrganization.trim();
        payload.licenseNumber = formData.licenseNumber.trim();
        payload.specialization = formData.specialization.trim();
        payload.professionalDescription = formData.professionalBio.trim();
        payload.documents = Object.values(uploadedDocs).map((d) => ({
          documentName: d.documentName,
          documentType: d.documentType,
          fileUrl: d.fileUrl,
          fileKey: d.fileKey,
          originalName: d.originalName,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        }));
      }

      const res = await authService.requestOtp(payload);

      setInfoMessage(res?.message || 'Verification code sent to your email.');
      setCountdown(300);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setIsOtpScreen(true);
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Failed to request verification code.';
      setError(msg);
      if (err.errors && Array.isArray(err.errors)) {
        const mapped = {};
        err.errors.forEach((item) => {
          if (item.field) mapped[item.field] = item.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = cleanValue.slice(-1);
    setOtpDigits(newDigits);
    setError('');

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authService.verifyOtp(formData.email.trim(), fullOtp);

      if (isPatient) {
        navigate('/login', {
          state: {
            message: 'Your patient account has been verified! Please sign in to access your portal.',
          },
        });
      } else {
        // Staff application verified -> Display Application Summary
        const appData = res?.data?.application || res?.application || {};
        const submissionDate = appData.submittedAt
          ? new Date(appData.submittedAt).toLocaleString()
          : new Date().toLocaleString();

        const roleObj = REGISTRATION_ROLES.find((r) => r.value === formData.role);

        setApplicationSummary({
          applicantName: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email.trim(),
          role: roleObj ? roleObj.label : formData.role,
          department: formData.department || 'General Medicine',
          applicationId: appData.id || `APP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          submittedAt: submissionDate,
          documentsCount: Object.keys(uploadedDocs).length || appData.documentsCount || 0,
          status: 'PENDING SUPER ADMIN APPROVAL',
        });
      }
    } catch (err) {
      let msg = err.message || err.response?.data?.message || 'Invalid or expired verification code.';
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        msg = err.errors.map((e) => e.message).join('. ');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resending || resendCooldown > 0) return;

    setResending(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await authService.resendOtp(formData.email.trim());
      setInfoMessage(res?.message || 'Verification code sent.');
      setCountdown(300);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Unable to resend verification code.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedRoleMeta = REGISTRATION_ROLES.find((r) => r.value === formData.role) || REGISTRATION_ROLES[0];
  const requiredDocuments = ROLE_DOCUMENT_CONFIG[formData.role] || ROLE_DOCUMENT_CONFIG.non_clinical;

  return (
    <div className="hms-split-page">
      {/* ─── LEFT PANEL: REGISTRATION & WORKFLOW ───────────────── */}
      <div className="hms-split-page__left">
        <div className="hms-split-card">
          {/* BRAND HEADER */}
          <div className="hms-split-card__brand">
            <div className="hms-split-card__logo">
              <Heart size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="hms-split-card__brand-title">HMS</div>
              <div className="hms-split-card__brand-sub">Hospital Management System</div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              VIEW 1: STAFF VERIFICATION SUCCESS SUMMARY CARD
             ══════════════════════════════════════════════════════ */}
          {applicationSummary ? (
            <div className="hms-verification-summary-card" style={{ marginTop: '0.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.5rem',
                  }}
                >
                  <ShieldCheck size={28} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Registration Submitted Successfully
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  Your email has been verified and your staff registration has been submitted successfully. Your application is now pending Super Administrator verification.
                </p>
              </div>

              {/* APPLICATION SUMMARY */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Application Summary
                </div>
                <div className="hms-summary-grid">
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Applicant Name</span>
                    <span className="hms-summary-val">{applicationSummary.applicantName}</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Registered Email</span>
                    <span className="hms-summary-val">{applicationSummary.email}</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Applied Role</span>
                    <span className="hms-summary-val">{applicationSummary.role}</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Assigned Department</span>
                    <span className="hms-summary-val">{applicationSummary.department}</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Application ID</span>
                    <span className="hms-summary-val" style={{ fontFamily: 'monospace', color: '#0891b2' }}>
                      {applicationSummary.applicationId}
                    </span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Submitted On</span>
                    <span className="hms-summary-val">{applicationSummary.submittedAt}</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Documents Submitted</span>
                    <span className="hms-summary-val">{applicationSummary.documentsCount} Documents Submitted</span>
                  </div>
                  <div className="hms-summary-item">
                    <span className="hms-summary-label">Application Status</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        width: 'fit-content',
                        marginTop: '2px',
                      }}
                    >
                      <Clock size={12} />
                      {applicationSummary.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* VERIFICATION INFORMATION NOTICE */}
              <div
                style={{
                  background: 'rgba(8, 145, 178, 0.06)',
                  border: '1px solid rgba(8, 145, 178, 0.25)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.76rem',
                  color: '#0e7490',
                  lineHeight: 1.45,
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>Super Administrator Verification Notice</div>
                Your submitted professional credentials and documents will be reviewed by the Super Administrator.
                <div style={{ marginTop: '0.25rem', fontWeight: 600, color: '#0f172a' }}>
                  Important: You will receive an email notification after your application has been approved or rejected.
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary"
                style={{
                  width: '100%',
                  height: '40px',
                  background: '#0891b2',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderRadius: '6px',
                }}
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </div>
          ) : isOtpScreen ? (
            /* ══════════════════════════════════════════════════════
                VIEW 2: 6-DIGIT EMAIL OTP VERIFICATION
               ══════════════════════════════════════════════════════ */
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(8, 145, 178, 0.1)',
                    color: '#0891b2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.4rem',
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.15rem' }}>
                  Verify Your Email
                </h2>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                  Enter the 6-digit verification code sent to{' '}
                  <strong style={{ color: '#0f172a' }}>{formData.email}</strong>
                </p>
              </div>

              {/* FEEDBACK BANNERS */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.6rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    marginBottom: '0.65rem',
                    fontSize: '0.75rem',
                    color: '#b91c1c',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.6rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    marginBottom: '0.65rem',
                    fontSize: '0.75rem',
                    color: '#15803d',
                  }}
                >
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                  <span>{infoMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                {/* 6 OTP DIGITS */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      style={{
                        width: '42px',
                        height: '46px',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '6px',
                        border: digit ? '2px solid #0891b2' : '1px solid #cbd5e1',
                        background: digit ? '#f0f9ff' : '#ffffff',
                        color: '#0f172a',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* TIMERS & RESEND */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.74rem',
                    color: '#64748b',
                    marginBottom: '0.85rem',
                    padding: '0 0.25rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    Expires in: <strong style={{ color: countdown < 60 ? '#ef4444' : '#0f172a' }}>{formatTime(countdown)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending || resendCooldown > 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: resendCooldown > 0 ? '#94a3b8' : '#0891b2',
                      fontWeight: 600,
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                    }}
                  >
                    <RotateCcw size={12} className={resending ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                {/* VERIFY BUTTON */}
                <button
                  type="submit"
                  disabled={loading || otpDigits.some((d) => !d)}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0891b2',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  {loading ? 'Verifying...' : isPatient ? 'Complete Registration' : 'Verify & Submit Application'}
                </button>

                {/* BACK TO EDIT FORM BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsOtpScreen(false)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0.35rem 0',
                  }}
                >
                  <ArrowLeft size={14} />
                  Back to edit registration details
                </button>
              </form>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════
                VIEW 3: STEP-BY-STEP REGISTRATION FORM
               ══════════════════════════════════════════════════════ */
            <div>
              {/* TITLE & DESCRIPTION */}
              <div className="hms-split-card__header">
                <h1 className="hms-split-card__title">Create Your HMS Account</h1>
                <p className="hms-split-card__subtitle">
                  {isPatient
                    ? 'Register to access your personal health records, appointment scheduling, and care services.'
                    : 'Submit your clinical credentials and professional licensing for Super Admin verification.'}
                </p>
              </div>

              {/* COMPACT SUBTLE STEP INDICATOR */}
              <div className="hms-step-indicator-compact">
                <div className={`hms-step-pill ${formStep === 1 ? 'active' : formStep > 1 ? 'done' : ''}`}>
                  <span className="hms-step-num">{formStep > 1 ? '✓' : '1'}</span>
                  <span>Personal Details</span>
                </div>
                <div className={`hms-step-divider ${formStep > 1 ? 'done' : ''}`} />
                <div className={`hms-step-pill ${formStep === 2 ? 'active' : formStep > 2 ? 'done' : ''}`}>
                  <span className="hms-step-num">{formStep > 2 ? '✓' : '2'}</span>
                  <span>{isPatient ? 'Security & Consent' : 'Professional'}</span>
                </div>
                {!isPatient && (
                  <>
                    <div className={`hms-step-divider ${formStep > 2 ? 'done' : ''}`} />
                    <div className={`hms-step-pill ${formStep === 3 ? 'active' : ''}`}>
                      <span className="hms-step-num">3</span>
                      <span>Documents & Security</span>
                    </div>
                  </>
                )}
              </div>

              {/* ERROR BANNER */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.55rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    marginBottom: '0.4rem',
                    fontSize: '0.74rem',
                    color: '#b91c1c',
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={formStep === totalSteps ? handleSubmitRegistration : handleContinue}>
                {/* ────────────────────────────────────────────────────────
                    STEP 1: ROLE SELECTION & COMMON PERSONAL INFORMATION
                   ──────────────────────────────────────────────────────── */}
                {formStep === 1 && (
                  <div>
                    {/* ROLE SELECTOR & ACCESS BADGE */}
                    <div style={{ marginBottom: '0.45rem' }}>
                      <div className="hms-form-label">
                        <span>Account Type / Role <span style={{ color: '#ef4444' }}>*</span></span>
                        <span
                          className={`hms-role-badge ${isPatient ? 'hms-role-badge--immediate' : 'hms-role-badge--approval'}`}
                        >
                          {selectedRoleMeta.badge}
                        </span>
                      </div>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                      >
                        {REGISTRATION_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label} ({r.badge})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.role && <div className="form-error">{fieldErrors.role}</div>}
                    </div>

                    {/* ROLE NOTICE BANNER */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.3rem 0.55rem',
                        background: isPatient ? 'rgba(8, 145, 178, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                        border: isPatient ? '1px solid rgba(8, 145, 178, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '6px',
                        marginBottom: '0.45rem',
                        fontSize: '0.73rem',
                        color: isPatient ? '#0e7490' : '#92400e',
                        lineHeight: 1.25,
                      }}
                    >
                      <ShieldCheck size={14} style={{ color: isPatient ? '#0891b2' : '#d97706', flexShrink: 0 }} />
                      <div>
                        <strong>{isPatient ? 'Immediate Portal Access:' : 'Staff Credential Verification:'}</strong>{' '}
                        {isPatient
                          ? 'Patient accounts receive immediate access upon email verification.'
                          : 'Staff applications require Super Admin credential verification before staff portal access is activated.'}
                      </div>
                    </div>

                    {/* SECTION A: COMMON PERSONAL DETAILS */}
                    <div className="hms-section-header">
                      <User size={14} style={{ color: '#0891b2' }} />
                      <span>Section A — Personal Details</span>
                    </div>

                    {/* First & Last Name */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">First Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="e.g. Eleanor"
                          className={`form-input ${fieldErrors.firstName ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.firstName && <div className="form-error">{fieldErrors.firstName}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Last Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="e.g. Vance"
                          className={`form-input ${fieldErrors.lastName ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.lastName && <div className="form-error">{fieldErrors.lastName}</div>}
                      </div>
                    </div>

                    {/* DOB & Gender */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Date of Birth <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className={`form-input ${fieldErrors.dateOfBirth ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.dateOfBirth && <div className="form-error">{fieldErrors.dateOfBirth}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Gender <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="form-input"
                        >
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="name@example.com"
                          className={`form-input ${fieldErrors.email ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.email && <div className="form-error">{fieldErrors.email}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          className={`form-input ${fieldErrors.phone ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.phone && <div className="form-error">{fieldErrors.phone}</div>}
                      </div>
                    </div>

                    {/* SECTION B: ADDRESS & EMERGENCY CONTACT */}
                    <div className="hms-section-header">
                      <Activity size={14} style={{ color: '#0891b2' }} />
                      <span>Section B — Address & Emergency Contact</span>
                    </div>

                    {/* Street Address */}
                    <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                      <label className="form-label">Street Address <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text"
                        name="addressStreet"
                        value={formData.addressStreet}
                        onChange={handleChange}
                        placeholder="e.g. 742 Evergreen Terrace, Suite 400"
                        className={`form-input ${fieldErrors.addressStreet ? 'form-input--error' : ''}`}
                      />
                      {fieldErrors.addressStreet && <div className="form-error">{fieldErrors.addressStreet}</div>}
                    </div>

                    {/* City & State */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">City <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="addressCity"
                          value={formData.addressCity}
                          onChange={handleChange}
                          placeholder="e.g. Springfield"
                          className={`form-input ${fieldErrors.addressCity ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.addressCity && <div className="form-error">{fieldErrors.addressCity}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">State / Province <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="addressState"
                          value={formData.addressState}
                          onChange={handleChange}
                          placeholder="e.g. Illinois"
                          className={`form-input ${fieldErrors.addressState ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.addressState && <div className="form-error">{fieldErrors.addressState}</div>}
                      </div>
                    </div>

                    {/* Postal Code & Country */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Postal Code <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="addressPostalCode"
                          value={formData.addressPostalCode}
                          onChange={handleChange}
                          placeholder="e.g. 62701"
                          className={`form-input ${fieldErrors.addressPostalCode ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.addressPostalCode && <div className="form-error">{fieldErrors.addressPostalCode}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Country</label>
                        <input
                          type="text"
                          name="addressCountry"
                          value={formData.addressCountry}
                          onChange={handleChange}
                          placeholder="United States"
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Emergency Contact Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="text"
                          name="emergencyName"
                          value={formData.emergencyName}
                          onChange={handleChange}
                          placeholder="e.g. Robert Vance (Spouse / Relative)"
                          className={`form-input ${fieldErrors.emergencyName ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.emergencyName && <div className="form-error">{fieldErrors.emergencyName}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Emergency Contact Phone <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          type="tel"
                          name="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={handleChange}
                          placeholder="+1 (555) 019-2834"
                          className={`form-input ${fieldErrors.emergencyPhone ? 'form-input--error' : ''}`}
                        />
                        {fieldErrors.emergencyPhone && <div className="form-error">{fieldErrors.emergencyPhone}</div>}
                      </div>
                    </div>

                    {/* STEP 1 NAVIGATION */}
                    <button
                      type="submit"
                      className="btn btn--primary btn--full"
                      style={{ height: '44px', fontSize: '0.92rem', marginTop: '0.85rem' }}
                    >
                      <span>{isPatient ? 'Continue to Security & Consent' : 'Continue to Professional Details'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────
                    STEP 2 (FOR STAFF): ROLE-SPECIFIC PROFESSIONAL DETAILS
                   ──────────────────────────────────────────────────────── */}
                {formStep === 2 && !isPatient && (
                  <div>
                    <div className="hms-section-header">
                      <Briefcase size={14} style={{ color: '#0891b2' }} />
                      <span>Section B — Professional Information ({selectedRoleMeta.label})</span>
                    </div>

                    {/* Department */}
                    <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                      <label className="form-label">Hospital Department <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="form-input"
                        style={{ width: '100%', height: '38px' }}
                      >
                        {HOSPITAL_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Role-Specific Fields */}
                    {formData.role === 'doctor' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Medical Specialization <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="specialization"
                              value={formData.specialization}
                              onChange={handleChange}
                              placeholder="e.g. Interventional Cardiology"
                              className={`form-input ${fieldErrors.specialization ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.specialization && <div className="form-error">{fieldErrors.specialization}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Highest Medical Degree <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. MBBS, MD (Cardiology)"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Medical Council Reg / License <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. MED-REG-749204-IL"
                              className={`form-input ${fieldErrors.licenseNumber ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.licenseNumber && <div className="form-error">{fieldErrors.licenseNumber}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. Johns Hopkins / AIIMS"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 7"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Previous Hospital / Healthcare Org</label>
                            <input
                              type="text"
                              name="previousOrganization"
                              value={formData.previousOrganization}
                              onChange={handleChange}
                              placeholder="e.g. Northwestern Memorial Hospital"
                              className="form-input"
                            />
                          </div>
                        </div>
                      </>
                    ) : formData.role === 'nurse' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Nursing Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. B.Sc Nursing, RN, GNM"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Nursing Council Reg ID <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. RN-849204-STATE"
                              className={`form-input ${fieldErrors.licenseNumber ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.licenseNumber && <div className="form-error">{fieldErrors.licenseNumber}</div>}
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. Boston College of Nursing"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 5"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                          <label className="form-label">Previous Organization / Hospital</label>
                          <input
                            type="text"
                            name="previousOrganization"
                            value={formData.previousOrganization}
                            onChange={handleChange}
                            placeholder="e.g. Memorial Hospital Ward Unit"
                            className="form-input"
                          />
                        </div>
                      </>
                    ) : formData.role === 'pharmacist' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Pharmacy Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. B.Pharm, M.Pharm, Pharm.D"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Pharmacy License / Reg ID <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. RPH-948210"
                              className={`form-input ${fieldErrors.licenseNumber ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.licenseNumber && <div className="form-error">{fieldErrors.licenseNumber}</div>}
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. College of Pharmacy"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 4"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                          <label className="form-label">Previous Organization / Pharmacy</label>
                          <input
                            type="text"
                            name="previousOrganization"
                            value={formData.previousOrganization}
                            onChange={handleChange}
                            placeholder="e.g. St. Jude Hospital Pharmacy"
                            className="form-input"
                          />
                        </div>
                      </>
                    ) : formData.role === 'lab_technician' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Laboratory Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. DMLT, B.Sc Medical Lab Tech"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Paramedical Reg ID</label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. MLT-Council-ID (Optional)"
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. Institute of Paramedical Science"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 3"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                          <label className="form-label">Previous Organization / Diagnostic Lab</label>
                          <input
                            type="text"
                            name="previousOrganization"
                            value={formData.previousOrganization}
                            onChange={handleChange}
                            placeholder="e.g. City Diagnostic Laboratory"
                            className="form-input"
                          />
                        </div>
                      </>
                    ) : formData.role === 'radiology_staff' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Radiology Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. B.Sc Medical Imaging"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Radiation Safety License ID <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. AERB / Imaging Reg ID"
                              className={`form-input ${fieldErrors.licenseNumber ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.licenseNumber && <div className="form-error">{fieldErrors.licenseNumber}</div>}
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. Radiological Institute"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 4"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                          <label className="form-label">Previous Hospital / Imaging Center</label>
                          <input
                            type="text"
                            name="previousOrganization"
                            value={formData.previousOrganization}
                            onChange={handleChange}
                            placeholder="e.g. Metro Scan & Imaging Center"
                            className="form-input"
                          />
                        </div>
                      </>
                    ) : formData.role === 'ot_staff' ? (
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">OT Technology Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. Diploma in Operation Theatre Tech"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">OT / Paramedical Registration</label>
                            <input
                              type="text"
                              name="licenseNumber"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              placeholder="e.g. OT-Reg-ID (Optional)"
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. Surgical Technologists Academy"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 3"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                          <label className="form-label">Previous Hospital / Surgical Center</label>
                          <input
                            type="text"
                            name="previousOrganization"
                            value={formData.previousOrganization}
                            onChange={handleChange}
                            placeholder="e.g. St. Mark Surgical Hospital"
                            className="form-input"
                          />
                        </div>
                      </>
                    ) : (
                      /* Non-clinical staff */
                      <>
                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Highest Qualification <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="qualification"
                              value={formData.qualification}
                              onChange={handleChange}
                              placeholder="e.g. Bachelor of Commerce / MBA / Diploma"
                              className={`form-input ${fieldErrors.qualification ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.qualification && <div className="form-error">{fieldErrors.qualification}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Previous Organization</label>
                            <input
                              type="text"
                              name="previousOrganization"
                              value={formData.previousOrganization}
                              onChange={handleChange}
                              placeholder="e.g. Healthcare Associates / Clinic"
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="hms-form-row">
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Graduating Institution <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="text"
                              name="institution"
                              value={formData.institution}
                              onChange={handleChange}
                              placeholder="e.g. State University"
                              className={`form-input ${fieldErrors.institution ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.institution && <div className="form-error">{fieldErrors.institution}</div>}
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Years of Experience <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                              type="number"
                              name="yearsOfExperience"
                              value={formData.yearsOfExperience}
                              onChange={handleChange}
                              min="0"
                              max="60"
                              placeholder="e.g. 4"
                              className={`form-input ${fieldErrors.yearsOfExperience ? 'form-input--error' : ''}`}
                            />
                            {fieldErrors.yearsOfExperience && <div className="form-error">{fieldErrors.yearsOfExperience}</div>}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Professional Bio / Summary */}
                    <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                      <label className="form-label">Professional Bio / Clinical Summary</label>
                      <textarea
                        name="professionalBio"
                        value={formData.professionalBio}
                        onChange={handleChange}
                        placeholder="Brief summary of clinical background, clinical fellowships, procedures, or departmental duties..."
                        rows={2}
                        className="form-input"
                        style={{ height: '56px', resize: 'vertical' }}
                      />
                    </div>

                    {/* STEP 2 NAVIGATION */}
                    <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.85rem' }}>
                      <button
                        type="button"
                        onClick={handleBack}
                        className="btn btn--outline"
                        style={{ height: '44px', padding: '0 1.25rem', fontSize: '0.88rem' }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        className="btn btn--primary"
                        style={{ flex: 1, height: '44px', fontSize: '0.9rem' }}
                      >
                        <span>Continue to Documents & Security</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────
                    STEP 2 (PATIENT) OR STEP 3 (STAFF): SECURITY & CONSENT
                   ──────────────────────────────────────────────────────── */}
                {((isPatient && formStep === 2) || (!isPatient && formStep === 3)) && (
                  <div>
                    {/* STAFF DOCUMENTS SECTION (ONLY FOR STAFF) */}
                    {!isPatient && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div className="hms-section-header">
                          <FileCheck size={14} style={{ color: '#0891b2' }} />
                          <span>Section C — Required Document Uploads ({requiredDocuments.length} Documents)</span>
                        </div>

                        {fieldErrors.documents && (
                          <div className="form-error" style={{ marginBottom: '0.45rem' }}>
                            {fieldErrors.documents}
                          </div>
                        )}

                        <div className="hms-doc-grid-2">
                          {requiredDocuments.map((docDef) => {
                            const isUploaded = !!uploadedDocs[docDef.key];
                            const isSlotLoading = uploadingSlot === docDef.key;
                            const slotError = docErrors[docDef.key];

                            return (
                              <div
                                key={docDef.key}
                                className={`hms-doc-card-compact ${
                                  isUploaded
                                    ? 'hms-doc-card-compact--uploaded'
                                    : slotError
                                    ? 'hms-doc-card-compact--error'
                                    : ''
                                }`}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: isUploaded ? '#166534' : '#0f172a',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {docDef.label} {docDef.required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.68rem',
                                        color: isUploaded ? '#15803d' : '#64748b',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginTop: '1px',
                                      }}
                                    >
                                      {isUploaded ? uploadedDocs[docDef.key].originalName : docDef.sub}
                                    </div>
                                  </div>

                                  {isUploaded ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDoc(docDef.key)}
                                      title="Remove document"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '1px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : (
                                    <UploadCloud size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                  <label
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '3px 8px',
                                      background: isUploaded ? '#e2e8f0' : '#0891b2',
                                      color: isUploaded ? '#334155' : '#ffffff',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      cursor: isSlotLoading ? 'wait' : 'pointer',
                                    }}
                                  >
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={(e) => handleFileUpload(e, docDef)}
                                      disabled={isSlotLoading}
                                      style={{ display: 'none' }}
                                    />
                                    {isSlotLoading ? 'Uploading...' : isUploaded ? 'Replace' : 'Select'}
                                  </label>
                                  <span style={{ fontSize: '0.68rem', color: isUploaded ? '#15803d' : '#94a3b8' }}>
                                    {isUploaded
                                      ? `${Math.round(uploadedDocs[docDef.key].fileSize / 1024)} KB`
                                      : docDef.required
                                      ? 'Mandatory'
                                      : 'Optional'}
                                  </span>
                                </div>

                                {slotError && (
                                  <div style={{ fontSize: '0.66rem', color: '#b91c1c', marginTop: '2px' }}>
                                    {slotError}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* SECTION: SECURITY & CONSENT */}
                    <div className="hms-section-header">
                      <Lock size={14} style={{ color: '#0891b2' }} />
                      <span>{isPatient ? 'Section B — Security & Consent' : 'Section D — Security & Consent'}</span>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="hms-form-row">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Min 8 characters"
                            className={`form-input ${fieldErrors.password ? 'form-input--error' : ''}`}
                            style={{ paddingRight: '2rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {fieldErrors.password && <div className="form-error">{fieldErrors.password}</div>}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter password"
                            className={`form-input ${fieldErrors.confirmPassword ? 'form-input--error' : ''}`}
                            style={{ paddingRight: '2rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={{
                              position: 'absolute',
                              right: '0.5rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && <div className="form-error">{fieldErrors.confirmPassword}</div>}
                      </div>
                    </div>

                    {/* Terms & Consent Checkbox */}
                    <div style={{ marginTop: '0.55rem', marginBottom: '0.65rem' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          name="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={handleChange}
                          style={{ marginTop: '2px', accentColor: '#0891b2' }}
                        />
                        <span style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                          {isPatient ? (
                            <>
                              I agree to the <Link to="/terms" style={{ color: '#0891b2', fontWeight: 600 }}>Terms of Service</Link> and{' '}
                              <Link to="/privacy" style={{ color: '#0891b2', fontWeight: 600 }}>HIPAA Privacy Policy</Link>.
                            </>
                          ) : (
                            <>
                              I certify that all professional credentials, licensing numbers, and uploaded documents are genuine and accurate.
                              I agree to the <Link to="/terms" style={{ color: '#0891b2', fontWeight: 600 }}>Staff Code of Conduct</Link> and{' '}
                              <Link to="/privacy" style={{ color: '#0891b2', fontWeight: 600 }}>HIPAA Compliance Rules</Link>.
                            </>
                          )}
                        </span>
                      </label>
                      {fieldErrors.acceptTerms && <div className="form-error">{fieldErrors.acceptTerms}</div>}
                    </div>

                    {/* FINAL STEP NAVIGATION */}
                    <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.85rem' }}>
                      <button
                        type="button"
                        onClick={handleBack}
                        className="btn btn--outline"
                        style={{ height: '44px', padding: '0 1.25rem', fontSize: '0.88rem' }}
                      >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn--primary"
                        style={{ flex: 1, height: '44px', fontSize: '0.9rem' }}
                      >
                        {loading
                          ? 'Submitting...'
                          : isPatient
                          ? 'Continue & Verify Email'
                          : 'Submit Staff Registration & Verify Email'}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* SIGN IN LINK */}
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                <span>Already have an account? </span>
                <Link to="/login" style={{ color: '#0891b2', fontWeight: 600 }}>
                  Sign In
                </Link>
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
