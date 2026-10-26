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
const AuditLog = require('../models/AuditLog');
const StaffVerification = require('../models/StaffVerification');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

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
        hospital: user.hospital || null,
        hospitalId: user.hospital || user.hospitalId || null,
        hospitalBranch: user.hospitalBranch || user.branchCode || 'MAIN-01',
        lastLogin: user.lastLogin,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
      accessToken,
      refreshToken,
    };
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
      mustChangePassword: Boolean(user.mustChangePassword),
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
      mustChangePassword: Boolean(user.mustChangePassword),
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
      const email = env.superAdminEmail || 'devadharshinichitturi95@gmail.com';
      const saUser = await User.findOne({ email }).select('+password');

      let isSuperMatch = false;
      if (saUser && saUser.password) {
        try {
          isSuperMatch = await bcrypt.compare(currentPassword, saUser.password);
        } catch (e) {
          isSuperMatch = false;
        }
      }

      if (!isSuperMatch && env.superAdminPasswordHash && env.superAdminPasswordHash.startsWith('$2')) {
        try {
          isSuperMatch = await bcrypt.compare(currentPassword, env.superAdminPasswordHash);
        } catch (e) {
          isSuperMatch = false;
        }
      }

      if (!isSuperMatch && (currentPassword === 'Shini@2026' || currentPassword === 'Shini@123' || currentPassword === 'SuperAdmin@2026!')) {
        isSuperMatch = true;
      }

      if (!isSuperMatch) {
        throw new ApiError(400, 'Current password is incorrect.');
      }

      if (currentPassword === newPassword) {
        throw new ApiError(400, 'New password cannot be identical to current password.');
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);
      env.superAdminPasswordHash = newHash;

      if (saUser) {
        saUser.password = newHash;
        await saUser.save({ validateBeforeSave: false });
      }

      await AuditLog.create({
        userEmail: email,
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

    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password cannot be identical to current password.');
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.refreshTokens = [];
    await user.save();

    await user.populate('role');
    const permissions = user.role ? (user.role.permissions || []) : [];
    const accessToken = user.generateAccessToken(permissions);
    const refreshToken = user.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    user.refreshTokens.push({ token: refreshToken, expiresAt });
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      user: user._id,
      userEmail: user.email,
      userRole: user.roleName,
      action: 'PASSWORD_CHANGED',
      module: 'auth',
      ipAddress,
      userAgent,
      status: 'SUCCESS',
      details: { description: 'User password updated successfully. mustChangePassword cleared.' },
    });

    return {
      message: 'Password changed successfully.',
      mustChangePassword: false,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: (user.roleName || (user.role && user.role.name) || 'patient').toLowerCase(),
        roleName: user.roleName || user.role?.name,
        mustChangePassword: false,
      },
    };
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    if (userId === 'super_admin_system') {
      const email = env.superAdminEmail || 'devadharshinichitturi95@gmail.com';
      const saUser = await User.findOne({ email });
      if (saUser && saUser.preferences) {
        return {
          theme: saUser.preferences.theme || 'system',
          language: saUser.preferences.language || 'en',
          timezone: saUser.preferences.timezone || 'UTC',
          dateFormat: saUser.preferences.dateFormat || 'DD/MM/YYYY',
          timeFormat: saUser.preferences.timeFormat || '12h',
          dashboardPreference: saUser.preferences.dashboardPreference || 'default',
          notifications: {
            system: saUser.preferences.notifications?.system ?? true,
            operational: saUser.preferences.notifications?.operational ?? true,
          },
        };
      }
      return {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        dashboardPreference: 'default',
        notifications: {
          system: true,
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
      timezone: 'UTC',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      dashboardPreference: 'default',
      notifications: {
        system: true,
        operational: true,
      },
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, updates = {}, ipAddress = '', userAgent = '') {
    const allowedThemes = ['light', 'dark', 'system'];
    const allowedDateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
    const allowedTimeFormats = ['12h', '24h'];

    if (updates.theme !== undefined && !allowedThemes.includes(updates.theme)) {
      throw new ApiError(400, 'Invalid theme preference. Supported options are: light, dark, system.');
    }
    if (updates.dateFormat !== undefined && !allowedDateFormats.includes(updates.dateFormat)) {
      throw new ApiError(400, 'Invalid date format. Supported options are: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD.');
    }
    if (updates.timeFormat !== undefined && !allowedTimeFormats.includes(updates.timeFormat)) {
      throw new ApiError(400, 'Invalid time format. Supported options are: 12h, 24h.');
    }

    if (userId === 'super_admin_system') {
      const email = env.superAdminEmail || 'devadharshinichitturi95@gmail.com';
      let saUser = await User.findOne({ email });
      if (!saUser) {
        const superAdminRole = await Role.findOne({ name: 'SUPER_ADMIN' });
        saUser = new User({
          firstName: 'Super',
          lastName: 'Administrator',
          email,
          password: env.superAdminPasswordHash || '$2b$10$iLkrpJxDtNKXSJW8XTdeLepBMSj0jEU.OV74HALcYixR2jRGz4n/a',
          role: superAdminRole?._id,
          roleName: 'SUPER_ADMIN',
          status: 'active',
          isActive: true,
        });
      }

      const currentPreferences = saUser.preferences || {};
      saUser.preferences = {
        ...currentPreferences,
        ...updates,
        notifications: {
          ...(currentPreferences.notifications || {}),
          ...(updates.notifications || {}),
        },
      };

      saUser.markModified('preferences');
      await saUser.save({ validateBeforeSave: false });

      await AuditLog.create({
        userEmail: email,
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_SETTINGS',
        module: 'admin',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        details: { updatedKeys: Object.keys(updates) },
      });

      return saUser.preferences;
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
