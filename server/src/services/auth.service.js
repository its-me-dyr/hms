/**
 * Auth Service
 * 
 * Contains core business logic for authentication, password verification, token issuance,
 * session refresh, audit log tracking, registration with OTP verification, and staff approvals.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Otp = require('../models/OtpVerification');
const AuditLog = require('../models/AuditLog');
const StaffVerification = require('../models/StaffVerification');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');
const emailService = require('./emailService');

const ROLE_DISPLAY_MAP = {
  patient: { name: 'PATIENT', displayName: 'Patient Portal Account', permissions: ['patients:read', 'appointments:read', 'appointments:create'] },
  doctor: { name: 'DOCTOR', displayName: 'Physician / Doctor', permissions: ['patients:read', 'patients:write', 'appointments:read', 'appointments:write', 'prescriptions:write', 'emr:write'] },
  nurse: { name: 'NURSE', displayName: 'Registered Nurse', permissions: ['patients:read', 'vitals:write', 'appointments:read', 'medications:administer'] },
  receptionist: { name: 'RECEPTIONIST', displayName: 'Front Desk Receptionist', permissions: ['patients:read', 'patients:create', 'appointments:manage', 'queue:manage'] },
  pharmacist: { name: 'PHARMACIST', displayName: 'Hospital Pharmacist', permissions: ['pharmacy:read', 'pharmacy:dispense', 'inventory:read'] },
  lab_technician: { name: 'LAB_TECHNICIAN', displayName: 'Laboratory Technician', permissions: ['lab:read', 'lab:write', 'lab:results'] },
  radiology_staff: { name: 'RADIOLOGY_STAFF', displayName: 'Radiology Staff', permissions: ['radiology:read', 'radiology:write', 'pacs:access'] },
  ot_staff: { name: 'OT_STAFF', displayName: 'Operation Theatre Staff', permissions: ['ot:read', 'ot:write', 'surgeries:read'] },
  billing_staff: { name: 'BILLING_STAFF', displayName: 'Billing Officer', permissions: ['billing:read', 'billing:write', 'invoices:create'] },
  insurance_staff: { name: 'INSURANCE_STAFF', displayName: 'Insurance Coordinator', permissions: ['insurance:read', 'claims:manage', 'preauth:verify'] },
  hr_staff: { name: 'HR_STAFF', displayName: 'HR Staff', permissions: ['hr:read', 'staff:manage', 'shifts:manage'] },
  inventory_staff: { name: 'INVENTORY_STAFF', displayName: 'Inventory Manager', permissions: ['inventory:read', 'inventory:write', 'suppliers:read'] },
  blood_bank_staff: { name: 'BLOOD_BANK_STAFF', displayName: 'Blood Bank Officer', permissions: ['bloodbank:read', 'bloodbank:manage', 'donors:manage'] },
  emergency_staff: { name: 'EMERGENCY_STAFF', displayName: 'Emergency Response Staff', permissions: ['emergency:read', 'emergency:write', 'triage:manage'] },
};

class AuthService {
  /**
   * Authenticate user with email and password
   * Supports both Super Admin from environment and database-persisted users
   */
  async login(email, password, ipAddress = '', userAgent = '') {
    const normalizedEmail = (email || '').toLowerCase().trim();

    // 1. Check if login matches Super Admin configured in environment or user-specified admin email
    const isSuperAdminEmail =
      (env.superAdminEmail && normalizedEmail === env.superAdminEmail) ||
      normalizedEmail === 'devadharshinichitturi95@gmail.com' ||
      normalizedEmail === 'superadmin@hms.com';

    if (isSuperAdminEmail) {
      let isMatch = false;

      // Verify with bcrypt hash if configured
      if (env.superAdminPasswordHash && env.superAdminPasswordHash.startsWith('$2')) {
        try {
          isMatch = await bcrypt.compare(password, env.superAdminPasswordHash);
        } catch (e) {
          isMatch = false;
        }
      }

      // Support plaintext match if user typed password directly in .env
      if (!isMatch && env.superAdminPasswordHash && password === env.superAdminPasswordHash) {
        isMatch = true;
      }

      // Explicitly support Shini@2026, Shini@123, or SuperAdmin@2026!
      if (!isMatch && (password === 'Shini@2026' || password === 'Shini@123' || password === 'SuperAdmin@2026!')) {
        isMatch = true;
      }

      if (!isMatch) {
        await AuditLog.create({
          userEmail: normalizedEmail,
          action: 'FAILED_LOGIN',
          module: 'auth',
          ipAddress,
          userAgent,
          status: 'FAILURE',
          details: { reason: 'Invalid super admin credentials' },
        });
        throw new ApiError(401, 'Invalid email or password.');
      }

      const secret = env.jwtSecret || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
      const refreshSecret = env.jwtRefreshSecret || 'fallback_refresh_secret_dev_mode_only';

      const accessToken = jwt.sign(
        {
          id: 'super_admin_system',
          email: normalizedEmail,
          role: 'super_admin',
          permissions: ['*'],
        },
        secret,
        { expiresIn: env.jwtExpiresIn || '15m' }
      );

      const refreshToken = jwt.sign(
        {
          id: 'super_admin_system',
        },
        refreshSecret,
        { expiresIn: env.jwtRefreshExpiresIn || '7d' }
      );

      await AuditLog.create({
        userEmail: normalizedEmail,
        userRole: 'SUPER_ADMIN',
        action: 'LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        details: { isSuperAdminEnvLogin: true },
      });

      logger.info(`Super Admin authenticated: ${normalizedEmail}`);

      return {
        user: {
          id: 'super_admin_system',
          firstName: 'Super',
          lastName: 'Administrator',
          fullName: 'Super Administrator',
          email: normalizedEmail,
          phone: '',
          role: 'super_admin',
          roleDetails: { name: 'SUPER_ADMIN', displayName: 'Super Administrator' },
          permissions: ['*'],
          status: 'active',
          lastLogin: new Date(),
        },
        accessToken,
        refreshToken,
      };
    }

    // 2. Find standard user in database
    const user = await User.findOne({ email: normalizedEmail }).select('+password').populate('role');

    if (!user) {
      await AuditLog.create({
        userEmail: normalizedEmail,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'User not found' },
      });
      throw new ApiError(401, 'Invalid email or password.');
    }

    // 3. Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Invalid password' },
      });
      throw new ApiError(401, 'Invalid email or password.');
    }

    // 4. Check account verification status for staff accounts
    const verif = await StaffVerification.findOne({ applicant: user._id }).sort({ createdAt: -1 });

    if (verif && verif.status === 'UNDER_REVIEW') {
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Application currently under review by Super Administrator', status: 'UNDER_REVIEW' },
      });
      throw new ApiError(403, 'Your application is currently under review by the Super Administrator.', [
        { field: 'status', message: 'UNDER_REVIEW' },
      ]);
    }

    if (user.status === 'pending' || user.status === 'pending_verification' || (verif && verif.status === 'PENDING_VERIFICATION')) {
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Account awaiting administrator verification', status: user.status },
      });
      throw new ApiError(403, 'Your account is pending verification by the Super Administrator.', [
        { field: 'status', message: 'PENDING_VERIFICATION' },
      ]);
    }

    // 5. Check if account is rejected
    if (user.status === 'rejected' || (verif && verif.status === 'REJECTED')) {
      const reasonText = verif && verif.rejectionReason ? ` Reason: ${verif.rejectionReason}` : '';
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Account application rejected', rejectionReason: verif?.rejectionReason },
      });
      throw new ApiError(403, `Your verification application was rejected.${reasonText}`, [
        { field: 'status', message: 'REJECTED' },
        { field: 'rejectionReason', message: verif?.rejectionReason || '' },
      ]);
    }

    // 6. Check if account is suspended
    if (user.status === 'suspended') {
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Account suspended', status: 'suspended' },
      });
      throw new ApiError(403, 'Your account has been deactivated or suspended. Contact administration.');
    }

    // 7. Check if account is inactive or deactivated
    if (user.status === 'inactive' || !user.isActive) {
      await AuditLog.create({
        user: user._id,
        userEmail: normalizedEmail,
        userRole: user.roleName,
        action: 'FAILED_LOGIN',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'FAILURE',
        details: { reason: 'Account inactive or deactivated', status: user.status },
      });
      throw new ApiError(403, 'Your account is currently inactive. Please contact the hospital administrator.');
    }

    // 6. Extract permissions from user role
    const permissions = user.role ? user.role.permissions : [];

    // 7. Generate Access and Refresh Tokens
    const accessToken = user.generateAccessToken(permissions);
    const refreshToken = user.generateRefreshToken();

    // 8. Store refresh token in user document (limit to top 5 devices)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    user.refreshTokens.push({ token: refreshToken, expiresAt });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift();
    }
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // 9. Record successful login in Audit Log
    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.roleName,
      action: 'LOGIN',
      module: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    logger.info(`Successful login for user: ${user.email} [${user.roleName}]`);

    // 10. Return formatted user payload
    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: (user.roleName || 'patient').toLowerCase(),
        roleName: user.roleName || user.role?.name || 'PATIENT',
        roleDetails: user.role ? { name: user.role.name, displayName: user.role.displayName } : null,
        permissions,
        status: user.status || 'active',
        profileImage: user.profileImage,
        lastLogin: user.lastLogin,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Request Registration OTP (Step 1)
   * Validates input, hashes password and OTP, stores in Otp collection, dispatches email
   */
  async requestRegistrationOtp(data, ipAddress = '', userAgent = '') {
    const email = data.email.toLowerCase().trim();
    const normalizedRole = String(data.role || 'patient').toLowerCase().trim();

    // 1. Strictly forbid privileged roles from self-registration
    if (['super_admin', 'hospital_admin'].includes(normalizedRole)) {
      throw new ApiError(400, 'Self-registration for privileged administrative roles is strictly prohibited.');
    }

    // 2. Check if an active account with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, 'An account with this email address already exists.');
    }

    // 3. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    // 4. Upsert pending registration in Otp collection
    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otpHash,
      registrationData: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone ? data.phone.trim() : '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || 'prefer_not_to_say',
        role: normalizedRole,
        passwordHash,
        department: data.department || '',
        qualification: data.qualification || '',
        institution: data.institution || '',
        yearsOfExperience: data.yearsOfExperience || 0,
        previousOrganization: data.previousOrganization || '',
        employeeId: data.employeeId || '',
        licenseNumber: data.licenseNumber || '',
        specialization: data.specialization || '',
        professionalDescription: data.professionalDescription || '',
        documents: Array.isArray(data.documents) ? data.documents : [],
        address: data.address || {},
        emergencyContact: data.emergencyContact || {},
      },
      attempts: 0,
      verified: false,
      expiresAt,
      purgeAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session retention
    });

    // 5. Send OTP via email
    try {
      await emailService.sendRegistrationOTP(email, otp, data.firstName.trim());
    } catch (err) {
      // Invalidate the unverified OTP record if email dispatch fails
      await Otp.deleteMany({ email });
      throw new ApiError(500, 'Unable to send verification email. Please try again.');
    }

    return {
      success: true,
      message: 'Verification code sent to your email.',
    };
  }

  /**
   * Verify Registration OTP (Step 2)
   * Verifies OTP, persists User, assigns status ('active' for patient, 'pending' for staff)
   */
  async verifyRegistrationOtp(email, otp, ipAddress = '', userAgent = '') {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const trimmedOtp = String(otp || '').trim();

    // 1. Find OTP record and verify expiration
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      verified: false,
    });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      throw new ApiError(400, 'Verification code has expired. Please request a new code.');
    }

    // 2. Rate limit attempt count (max 5)
    if (otpRecord.attempts >= 5) {
      await Otp.deleteMany({ email: normalizedEmail });
      throw new ApiError(400, 'Too many incorrect attempts. Please request a new verification code.');
    }

    // 3. Compare OTP hash
    const isValidOtp = await bcrypt.compare(trimmedOtp, otpRecord.otpHash);
    if (!isValidOtp) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await Otp.deleteMany({ email: normalizedEmail });
        throw new ApiError(400, 'Too many incorrect attempts. Please request a new verification code.');
      }
      await otpRecord.save();
      throw new ApiError(400, 'Invalid verification code. Please check and try again.');
    }

    // 4. Double check duplicate user creation race condition
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      await Otp.deleteMany({ email: normalizedEmail });
      throw new ApiError(409, 'An account with this email address already exists.');
    }

    // 5. Provision or resolve Role
    const reg = otpRecord.registrationData;
    const roleMeta = ROLE_DISPLAY_MAP[reg.role] || {
      name: reg.role.toUpperCase(),
      displayName: reg.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      permissions: ['patients:read'],
    };

    let roleDoc = await Role.findOne({ name: roleMeta.name });
    if (!roleDoc) {
      roleDoc = await Role.create({
        name: roleMeta.name,
        displayName: roleMeta.displayName,
        description: `${roleMeta.displayName} account in HMS.`,
        permissions: roleMeta.permissions,
        isSystemRole: true,
        isActive: true,
      });
    }

    // 6. Role status assignment: Patient -> 'active', Staff roles -> 'pending_verification'
    const isPatient = reg.role === 'patient';
    const status = isPatient ? 'active' : 'pending_verification';

    const user = new User({
      firstName: reg.firstName,
      lastName: reg.lastName,
      email: normalizedEmail,
      phone: reg.phone,
      dateOfBirth: reg.dateOfBirth,
      gender: reg.gender,
      password: reg.passwordHash,
      role: roleDoc._id,
      roleName: roleMeta.name,
      address: reg.address || {},
      emergencyContact: reg.emergencyContact || {},
      department: reg.department || '',
      qualification: reg.qualification || '',
      institution: reg.institution || '',
      yearsOfExperience: Number(reg.yearsOfExperience) || 0,
      previousOrganization: reg.previousOrganization || '',
      licenseNumber: reg.licenseNumber || '',
      specialization: reg.specialization || '',
      status,
      isActive: isPatient,
      isEmailVerified: true,
    });

    await user.save();

    let verificationDoc = null;

    // If staff role, create linked StaffVerification application
    if (!isPatient) {
      verificationDoc = await StaffVerification.create({
        applicant: user._id,
        applicantName: `${user.firstName} ${user.lastName}`.trim(),
        applicantEmail: user.email,
        role: reg.role,
        department: reg.department || 'General',
        personalInfo: {
          phone: reg.phone || '',
          dateOfBirth: reg.dateOfBirth || null,
          gender: reg.gender || 'prefer_not_to_say',
          address: reg.address || {},
          emergencyContact: reg.emergencyContact || {},
        },
        professionalInfo: {
          qualification: reg.qualification || '',
          institution: reg.institution || '',
          yearsOfExperience: Number(reg.yearsOfExperience) || 0,
          previousOrganization: reg.previousOrganization || '',
          employeeId: reg.employeeId || '',
          licenseNumber: reg.licenseNumber || '',
          specialization: reg.specialization || '',
          professionalDescription: reg.professionalDescription || '',
        },
        documents: Array.isArray(reg.documents) ? reg.documents : [],
        status: 'PENDING_VERIFICATION',
        submittedAt: new Date(),
        verificationHistory: [
          {
            action: 'SUBMITTED',
            newStatus: 'PENDING_VERIFICATION',
            performedBy: 'Applicant',
            reason: 'Initial staff registration application submitted',
            timestamp: new Date(),
          },
        ],
      });

      // Dispatch pending verification email asynchronously
      try {
        await emailService.sendStaffPendingEmail(user.email, user.firstName, reg.role);
      } catch (err) {
        logger.warn(`Could not dispatch staff pending email: ${err.message}`);
      }
    }

    // 7. Remove OTP record
    await Otp.deleteMany({ email: normalizedEmail });

    // 8. Audit log registration
    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: roleMeta.name,
      action: isPatient ? 'REGISTER_PATIENT' : 'STAFF_REGISTER_SUBMITTED',
      module: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: { role: reg.role, status },
    });

    logger.info(`User registered successfully: ${user.email} [Role: ${reg.role}, Status: ${status}]`);

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: reg.role,
        status,
        createdAt: user.createdAt,
      },
      application: verificationDoc ? {
        id: verificationDoc._id.toString(),
        applicantName: verificationDoc.applicantName,
        applicantEmail: verificationDoc.applicantEmail,
        role: verificationDoc.role,
        department: verificationDoc.department,
        status: verificationDoc.status,
        submittedAt: verificationDoc.submittedAt,
        documentsCount: Array.isArray(verificationDoc.documents) ? verificationDoc.documents.length : 0,
      } : null,
      status,
      message: isPatient
        ? 'Registration completed successfully. You can now log in.'
        : 'Account registered successfully. Your verification request has been submitted to the Super Administrator for review.',
    };
  }

  /**
   * Resend Registration OTP
   */
  async resendRegistrationOtp(email) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const otpRecord = await Otp.findOne({ email: normalizedEmail, verified: false }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new ApiError(404, 'No pending registration found for this email address. Please register again.');
    }

    // 60-second cooldown check
    const cooldownMs = 60 * 1000;
    const timeSinceLastUpdate = Date.now() - new Date(otpRecord.updatedAt).getTime();
    if (timeSinceLastUpdate < cooldownMs) {
      const remainingSecs = Math.ceil((cooldownMs - timeSinceLastUpdate) / 1000);
      throw new ApiError(429, `Please wait ${remainingSecs} seconds before requesting another verification code.`);
    }

    // Purge any orphan/duplicate active OTP records for this email
    await Otp.deleteMany({ email: normalizedEmail, _id: { $ne: otpRecord._id } });

    // Generate new secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    otpRecord.otpHash = await bcrypt.hash(otp, salt);
    otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
    otpRecord.purgeAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour session retention
    otpRecord.attempts = 0;
    await otpRecord.save();

    const firstName = (otpRecord.registrationData && otpRecord.registrationData.firstName) || 'User';

    try {
      await emailService.sendRegistrationOTP(normalizedEmail, otp, firstName);
    } catch (err) {
      throw new ApiError(500, 'Unable to send verification email. Please try again.');
    }

    return {
      success: true,
      message: 'A new verification code has been sent to your email.',
    };
  }

  /**
   * Legacy registerPatient endpoint for backward compatibility
   */
  async registerPatient(data, ipAddress = '', userAgent = '') {
    return this.requestRegistrationOtp({ ...data, role: 'patient' }, ipAddress, userAgent);
  }

  /**
   * Hospital Admin: Get all staff awaiting approval
   */
  async getPendingStaff() {
    const pendingStaff = await User.find({ status: 'pending', roleName: { $ne: 'PATIENT' } })
      .populate('role', 'name displayName')
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });

    return pendingStaff.map((u) => ({
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: (u.roleName || '').toLowerCase(),
      roleDisplayName: u.role ? u.role.displayName : u.roleName,
      status: u.status,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Hospital Admin: Update staff approval status
   */
  async updateStaffStatus(userId, status, updatedByAdmin = null) {
    if (!['active', 'rejected', 'suspended'].includes(status)) {
      throw new ApiError(400, 'Invalid status. Must be active, rejected, or suspended.');
    }

    const user = await User.findById(userId).populate('role');
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    user.status = status;
    if (status === 'rejected' || status === 'suspended') {
      user.isActive = false;
    } else if (status === 'active') {
      user.isActive = true;
    }

    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.roleName,
      action: `STAFF_STATUS_${status.toUpperCase()}`,
      module: 'admin',
      status: 'SUCCESS',
      details: {
        updatedBy: updatedByAdmin ? updatedByAdmin.email : 'system',
        newStatus: status,
      },
    });

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: (user.roleName || '').toLowerCase(),
      status: user.status,
      isActive: user.isActive,
    };
  }

  /**
   * Refresh access token using valid refresh token
   */
  async refreshToken(refreshTokenString) {
    let decoded;
    try {
      const secret = env.jwtRefreshSecret || 'fallback_refresh_secret_dev_mode_only';
      decoded = jwt.verify(refreshTokenString, secret);
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired refresh token.');
    }

    // If Super Admin token
    if (decoded.id === 'super_admin_system') {
      const secret = env.jwtSecret || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
      const newAccessToken = jwt.sign(
        {
          id: 'super_admin_system',
          email: env.superAdminEmail,
          role: 'super_admin',
          permissions: ['*'],
        },
        secret,
        { expiresIn: env.jwtExpiresIn || '15m' }
      );
      return { accessToken: newAccessToken };
    }

    const user = await User.findById(decoded.id).populate('role');
    if (!user || !user.isActive || user.status !== 'active') {
      throw new ApiError(401, 'User account no longer active or approved.');
    }

    const tokenExists = user.refreshTokens.some((t) => t.token === refreshTokenString);
    if (!tokenExists) {
      throw new ApiError(401, 'Refresh token revoked or invalid.');
    }

    const permissions = user.role ? user.role.permissions : [];
    const newAccessToken = user.generateAccessToken(permissions);

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(userId, refreshTokenString, ipAddress = '', userAgent = '') {
    if (userId === 'super_admin_system') {
      await AuditLog.create({
        userEmail: env.superAdminEmail,
        userRole: 'SUPER_ADMIN',
        action: 'LOGOUT',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      });
      return;
    }

    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshTokenString);
      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        user: user._id,
        userEmail: user.email,
        userRole: user.roleName,
        action: 'LOGOUT',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      });
    }
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId) {
    if (userId === 'super_admin_system') {
      return {
        id: 'super_admin_system',
        firstName: 'Super',
        lastName: 'Administrator',
        fullName: 'Super Administrator',
        email: env.superAdminEmail,
        phone: '',
        dateOfBirth: null,
        gender: 'prefer_not_to_say',
        role: 'super_admin',
        roleDetails: { name: 'SUPER_ADMIN', displayName: 'Super Administrator' },
        permissions: ['*'],
        status: 'active',
        profileImage: '',
        lastLogin: new Date(),
        createdAt: new Date(),
        preferences: {
          theme: 'system',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          dashboardPreference: 'default',
          notifications: {
            email: true,
            appointments: true,
            system: true,
            billing: true,
            reminders: true,
            operational: true,
          },
        },
      };
    }

    const user = await User.findById(userId).populate('role');
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const permissions = user.role ? user.role.permissions : [];

    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      role: (user.roleName || 'patient').toLowerCase(),
      roleDetails: user.role ? { name: user.role.name, displayName: user.role.displayName } : null,
      permissions,
      status: user.status || 'active',
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      preferences: user.preferences || {
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        dashboardPreference: 'default',
        notifications: {
          email: true,
          appointments: true,
          system: true,
          billing: true,
          reminders: true,
          operational: true,
        },
      },
    };
  }

  /**
   * Resubmit Staff Verification Application
   * Allows rejected staff applicants to update their professional details and documents
   */
  async resubmitStaffApplication(data, ipAddress = '', userAgent = '') {
    const email = (data.email || '').toLowerCase().trim();
    const password = data.password;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required to verify your identity for resubmission.');
    }

    const user = await User.findOne({ email }).select('+password').populate('role');
    if (!user) {
      throw new ApiError(404, 'User account not found.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    // Must be in rejected state or have rejected verification application
    const verification = await StaffVerification.findOne({ applicant: user._id }).sort({ createdAt: -1 });
    if (!verification) {
      throw new ApiError(404, 'No existing staff verification record found for this account.');
    }

    if (verification.status !== 'REJECTED' && user.status !== 'rejected') {
      throw new ApiError(400, `Application cannot be resubmitted while currently in ${verification.status} status.`);
    }

    // Update user fields
    if (data.phone) user.phone = data.phone.trim();
    if (data.department) user.department = data.department.trim();
    if (data.qualification) user.qualification = data.qualification.trim();
    if (data.institution) user.institution = data.institution.trim();
    if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== '') {
      user.yearsOfExperience = Number(data.yearsOfExperience) || 0;
    }
    if (data.previousOrganization) user.previousOrganization = data.previousOrganization.trim();
    if (data.licenseNumber) user.licenseNumber = data.licenseNumber.trim();
    if (data.specialization) user.specialization = data.specialization.trim();
    if (data.address) user.address = { ...user.address, ...data.address };
    if (data.emergencyContact) user.emergencyContact = { ...user.emergencyContact, ...data.emergencyContact };

    user.status = 'pending_verification';
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    // Update verification record
    const previousStatus = verification.status;
    verification.status = 'PENDING_VERIFICATION';
    verification.submittedAt = new Date();
    verification.rejectionReason = ''; // Clear rejection reason for new review cycle
    verification.reviewedAt = null;
    verification.reviewedBy = null;

    if (data.department) verification.department = data.department.trim();
    if (data.personalInfo) {
      verification.personalInfo = {
        phone: data.phone || verification.personalInfo.phone,
        dateOfBirth: data.dateOfBirth || verification.personalInfo.dateOfBirth,
        gender: data.gender || verification.personalInfo.gender,
        address: data.address || verification.personalInfo.address,
        emergencyContact: data.emergencyContact || verification.personalInfo.emergencyContact,
      };
    }

    verification.professionalInfo = {
      qualification: data.qualification || verification.professionalInfo.qualification,
      institution: data.institution || verification.professionalInfo.institution,
      yearsOfExperience: data.yearsOfExperience !== undefined && data.yearsOfExperience !== ''
        ? Number(data.yearsOfExperience)
        : verification.professionalInfo.yearsOfExperience,
      previousOrganization: data.previousOrganization || verification.professionalInfo.previousOrganization,
      employeeId: data.employeeId || verification.professionalInfo.employeeId,
      licenseNumber: data.licenseNumber || verification.professionalInfo.licenseNumber,
      specialization: data.specialization || verification.professionalInfo.specialization,
      professionalDescription: data.professionalDescription || verification.professionalInfo.professionalDescription,
    };

    // If replacement/additional documents provided, merge or replace
    if (Array.isArray(data.documents) && data.documents.length > 0) {
      verification.documents = data.documents;
    }

    verification.verificationHistory.push({
      action: 'RESUBMITTED',
      previousStatus,
      newStatus: 'PENDING_VERIFICATION',
      performedBy: user.email,
      reason: data.resubmissionNotes || 'Applicant resubmitted updated credentials & documents for re-review.',
      timestamp: new Date(),
    });

    await verification.save();

    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.roleName,
      action: 'STAFF_APPLICATION_RESUBMITTED',
      module: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: { role: verification.role, previousStatus, newStatus: 'PENDING_VERIFICATION' },
    });

    try {
      await emailService.sendStaffPendingEmail(user.email, user.firstName, verification.role);
    } catch (e) {
      logger.warn(`Could not dispatch staff pending email on resubmit: ${e.message}`);
    }

    logger.info(`Staff application resubmitted by ${user.email} (Status: PENDING_VERIFICATION)`);

    return {
      success: true,
      status: 'pending_verification',
      message: 'Your application has been resubmitted successfully. It is now pending Super Administrator review.',
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId) {
    if (userId === 'super_admin_system') {
      return {
        id: 'super_admin_system',
        _id: 'super_admin_system',
        firstName: 'Super',
        lastName: 'Admin',
        fullName: 'Super Administrator',
        email: env.superAdminEmail || 'superadmin@hms.com',
        role: 'super_admin',
        roleDetails: { name: 'SUPER_ADMIN', displayName: 'Super Administrator' },
        permissions: ['*'],
        status: 'active',
        preferences: {
          theme: 'system',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12h',
          dashboardPreference: 'default',
          notifications: {
            email: true,
            appointments: true,
            system: true,
            billing: true,
            reminders: true,
            operational: true,
          },
        },
      };
    }

    const user = await User.findById(userId).populate('role');
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const permissions = user.role ? (user.role.permissions || []) : [];

    return {
      id: user._id,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      role: (user.roleName || (user.role && user.role.name) || 'patient').toLowerCase(),
      roleDetails: user.role ? { name: user.role.name, displayName: user.role.displayName } : null,
      permissions,
      status: user.status || 'active',
      profileImage: user.profileImage,
      lastLogin: user.lastLogin,
      preferences: user.preferences || {
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        dashboardPreference: 'default',
        notifications: {
          email: true,
          appointments: true,
          system: true,
          billing: true,
          reminders: true,
          operational: true,
        },
      },
    };
  }

  /**
   * Change user password with current password verification
   */
  async changePassword(userId, currentPassword, newPassword, ipAddress = '', userAgent = '') {
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current and new password are required.');
    }
    if (newPassword.length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters long.');
    }

    // If Super Admin session
    if (userId === 'super_admin_system') {
      const isSuperMatch =
        (env.superAdminPasswordHash && (await bcrypt.compare(currentPassword, env.superAdminPasswordHash))) ||
        currentPassword === 'Shini@2026' ||
        currentPassword === 'Shini@123' ||
        currentPassword === 'SuperAdmin@2026!';

      if (!isSuperMatch) {
        throw new ApiError(400, 'Current password is incorrect.');
      }

      const salt = await bcrypt.genSalt(10);
      env.superAdminPasswordHash = await bcrypt.hash(newPassword, salt);

      await AuditLog.create({
        userEmail: env.superAdminEmail,
        userRole: 'SUPER_ADMIN',
        action: 'PASSWORD_CHANGED',
        module: 'auth',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        details: { description: 'Super Administrator password changed successfully.' },
      });

      return { message: 'Password changed successfully.' };
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new ApiError(404, 'User account not found.');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect.');
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.roleName,
      action: 'PASSWORD_CHANGED',
      module: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: { description: 'User password updated successfully.' },
    });

    return { message: 'Password changed successfully.' };
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    if (userId === 'super_admin_system') {
      return {
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        dashboardPreference: 'default',
        notifications: {
          email: true,
          appointments: true,
          system: true,
          billing: true,
          reminders: true,
          operational: true,
        },
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    return user.preferences || {
      theme: 'system',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      dashboardPreference: 'default',
      notifications: {
        email: true,
        appointments: true,
        system: true,
        billing: true,
        reminders: true,
        operational: true,
      },
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, updates, ipAddress = '', userAgent = '') {
    if (userId === 'super_admin_system') {
      return {
        ...updates,
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const currentPreferences = user.preferences || {};
    user.preferences = {
      ...currentPreferences,
      ...updates,
      notifications: {
        ...(currentPreferences.notifications || {}),
        ...(updates.notifications || {}),
      },
    };

    user.markModified('preferences');
    await user.save({ validateBeforeSave: false });

    return user.preferences;
  }
}

module.exports = new AuthService();
