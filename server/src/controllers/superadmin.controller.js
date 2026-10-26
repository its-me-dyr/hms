/**
 * Super Admin Controller
 * 
 * HTTP request handlers for the Super Admin master console:
 * Dashboard KPIs, Staff Verification Lifecycle, Staff & User Directory,
 * Roles & RBAC Matrix, Department Management, Audit Logs, and Hospital Settings.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const StaffVerification = require('../models/StaffVerification');
const AuditLog = require('../models/AuditLog');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const HospitalSetting = require('../models/HospitalSetting');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const env = require('../config/env');
const crypto = require('crypto');

/**
 * Internal helper to find or initialize Super Admin user record in database
 */
async function findSuperAdminUser(req) {
  if (req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
    const user = await User.findById(req.user._id);
    if (user) return user;
  }
  const email = (req.user?.email || 'admin@hms.com').toLowerCase().trim();
  let user = await User.findOne({ email });
  if (user) return user;

  user = await User.findOne({ roleName: 'SUPER_ADMIN' });
  if (user) return user;

  const superRole = await Role.findOne({ name: 'SUPER_ADMIN' });
  user = new User({
    firstName: 'Super',
    lastName: 'Administrator',
    email,
    phone: '+18005550100',
    role: superRole ? superRole._id : null,
    roleName: 'SUPER_ADMIN',
    status: 'active',
    isActive: true,
    isEmailVerified: true,
  });
  await user.save({ validateBeforeSave: false });
  return user;
}

/**
 * Cryptographically secure temporary password generator.
 * Produces a 12-character strong temporary password with guaranteed:
 * - Upper-case letter
 * - Lower-case letter
 * - Digit
 * - Special symbol
 */
function generateSecureTemporaryPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  const pwdChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = pwdChars.length; i < length; i++) {
    pwdChars.push(all[crypto.randomInt(0, all.length)]);
  }

  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = pwdChars[i];
    pwdChars[i] = pwdChars[j];
    pwdChars[j] = temp;
  }

  return pwdChars.join('');
}

/**
 * Internal helper to generate real-time Super Admin alerts for critical operations
 */
async function triggerSuperAdminNotification({
  title,
  message,
  type = 'system',
  module = null,
  priority = 'medium',
  link = null,
  hospital = null,
  relatedId = null,
}) {
  try {
    await Notification.create({
      recipient: 'super_admin_system',
      title,
      message,
      type,
      module,
      priority,
      link,
      hospital,
      relatedId,
    });
  } catch (err) {
    logger.warn(`Failed to dispatch Super Admin notification: ${err.message}`);
  }
}

class SuperAdminController {
  /**
   * @route GET /api/v1/super-admin/dashboard
   * @desc Super Admin global overview metrics, hospital summary, recent administrative activity & alerts
   */
  async getDashboardOverview(req, res, next) {
    try {
      const recipientId = req.user?._id || 'super_admin_system';

      // Concurrent global system KPI aggregations
      const [
        totalHospitals,
        activeHospitals,
        inactiveHospitals,
        totalHospitalAdmins,
        activeHospitalAdmins,
        inactiveHospitalAdmins,
        totalUsers,
        totalOperationalStaff,
        totalPatients,
        totalAuditEvents,
        unreadNotificationsCount,
        recentHospitalsList,
        recentActivityLogs,
        systemNotifications,
        roleDistributionAgg,
        totalRoles,
      ] = await Promise.all([
        HospitalSetting.countDocuments(),
        HospitalSetting.countDocuments({
          $or: [
            { status: 'active' },
            { status: { $exists: false }, isActive: { $ne: false } },
          ],
        }),
        HospitalSetting.countDocuments({
          $or: [
            { status: { $in: ['inactive', 'suspended'] } },
            { isActive: false },
          ],
        }),
        User.countDocuments({ roleName: 'HOSPITAL_ADMIN' }),
        User.countDocuments({ roleName: 'HOSPITAL_ADMIN', isActive: true }),
        User.countDocuments({ roleName: 'HOSPITAL_ADMIN', isActive: false }),
        User.countDocuments(),
        User.countDocuments({
          roleName: { $nin: ['PATIENT', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'] },
          isActive: true,
        }),
        User.countDocuments({ roleName: 'PATIENT' }),
        AuditLog.countDocuments(),
        Notification.countDocuments({
          $or: [
            { recipient: recipientId },
            { recipient: 'super_admin_system' },
            { type: 'system' },
          ],
          isRead: false,
        }),
        HospitalSetting.find()
          .populate('adminUser', 'firstName lastName email phone status')
          .sort({ createdAt: -1 })
          .limit(6),
        AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        Notification.find({
          $or: [
            { recipient: recipientId },
            { recipient: 'super_admin_system' },
            { type: 'system' },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        User.aggregate([
          { $group: { _id: '$roleName', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Role.countDocuments(),
      ]);

      const mappedRecentHospitals = recentHospitalsList.map((h) => {
        const city = h.address?.city || '';
        const state = h.address?.state || '';
        const country = h.address?.country || '';
        const loc = [city, state, country].filter(Boolean).join(', ') || 'Global Campus';
        const adminName = h.adminUser
          ? `${h.adminUser.firstName || ''} ${h.adminUser.lastName || ''}`.trim()
          : (h.adminEmail || 'Hospital Administrator');
        const adminEmail = h.adminUser?.email || h.adminEmail || h.contactEmail;

        return {
          id: h._id,
          hospitalName: h.hospitalName,
          registrationNumber: h.registrationNumber,
          contactEmail: h.contactEmail,
          contactPhone: h.contactPhone,
          location: loc,
          status: h.status || (h.isActive !== false ? 'active' : 'inactive'),
          adminName,
          adminEmail,
          createdAt: h.createdAt,
        };
      });

      // Sanitize recent activity - never expose credentials
      const sanitizedRecentActivity = recentActivityLogs.map((log) => {
        const safeDetails = { ...(log.details || {}) };
        delete safeDetails.password;
        delete safeDetails.passwordHash;
        delete safeDetails.token;
        delete safeDetails.accessToken;
        delete safeDetails.refreshToken;
        delete safeDetails.otp;
        delete safeDetails.secret;
        delete safeDetails.apiKey;

        return {
          id: log._id,
          _id: log._id,
          action: log.action,
          module: log.module,
          userEmail: log.userEmail,
          userRole: log.userRole,
          status: log.status,
          createdAt: log.createdAt,
          details: safeDetails,
        };
      });

      return ApiResponse.success(res, 'Super Admin global dashboard overview retrieved', {
        summary: {
          totalHospitals,
          activeHospitals,
          inactiveHospitals,
          totalHospitalAdmins,
          activeHospitalAdmins,
          inactiveHospitalAdmins,
          totalUsers,
          totalOperationalStaff,
          totalPatients,
          totalRoles: totalRoles || 10,
          totalAuditEvents,
          unreadNotifications: unreadNotificationsCount,
        },
        overview: {
          totalHospitals,
          activeHospitals,
          inactiveHospitals,
          totalHospitalAdmins,
          activeHospitalAdmins,
          inactiveHospitalAdmins,
          totalOperationalStaff,
          totalPatients,
          totalRoles: totalRoles || 10,
        },
        kpis: {
          totalHospitals,
          activeHospitals,
          inactiveHospitals,
          totalHospitalAdmins,
          activeHospitalAdmins,
          totalOperationalStaff,
          totalUsers,
          systemAlerts: unreadNotificationsCount,
          totalAuditEvents,
          totalPatients,
          totalRoles: totalRoles || 10,
        },
        hospitalsSummary: mappedRecentHospitals,
        recentActivity: sanitizedRecentActivity,
        notifications: systemNotifications,
        roleDistribution: roleDistributionAgg.map((r) => ({
          role: r._id || 'OTHER',
          count: r.count,
        })),
        systemStatus: {
          database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
          server: 'OPERATIONAL',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/verifications
   * @desc Paginated list of staff registration verification applications
   */
  async getVerificationRequests(req, res, next) {
    try {
      const { status, role, department, search, page = 1, limit = 20 } = req.query;

      const query = {};
      if (status && status !== 'all') {
        query.status = status.toUpperCase();
      }
      if (role && role !== 'all') {
        query.role = role.toLowerCase();
      }
      if (department && department !== 'all') {
        query.department = new RegExp(department, 'i');
      }
      if (search) {
        query.$or = [
          { applicantName: new RegExp(search, 'i') },
          { applicantEmail: new RegExp(search, 'i') },
          { 'professionalInfo.licenseNumber': new RegExp(search, 'i') },
          { 'professionalInfo.specialization': new RegExp(search, 'i') },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const total = await StaffVerification.countDocuments(query);
      const verifications = await StaffVerification.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('applicant', 'firstName lastName email phone profileImage');

      return ApiResponse.success(res, 'Verification requests retrieved successfully', {
        verifications,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
          limit: parseInt(limit, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/verifications/:id
   * @desc Full application details for reviewing credentials & documents
   */
  async getVerificationDetails(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid verification application ID format.');
      }
      const verification = await StaffVerification.findById(id).populate(
        'applicant',
        'firstName lastName email phone roleName createdAt lastLogin profileImage'
      );

      if (!verification) {
        throw new ApiError(404, 'Verification application not found');
      }

      return ApiResponse.success(res, 'Verification details retrieved', verification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/verifications/:id/status
   * @desc Super Admin Review action: UNDER_REVIEW, APPROVE, or REJECT
   */
  async updateVerificationStatus(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid verification application ID format.');
      }
      const { action, rejectionReason, adminNotes } = req.body;

      const normalizedAction = String(action || 'UPDATE_NOTES').toUpperCase().trim();
      const validActions = ['UNDER_REVIEW', 'APPROVE', 'APPROVED', 'REJECT', 'REJECTED', 'RESUBMITTED', 'UPDATE_NOTES'];

      if (!validActions.includes(normalizedAction)) {
        throw new ApiError(400, 'Invalid verification action.');
      }

      const verification = await StaffVerification.findById(id);
      if (!verification) {
        throw new ApiError(404, 'Verification application not found.');
      }

      const adminEmail = req.user?.email || 'admin@hms.com';
      const previousStatus = verification.status;
      let newStatus = verification.status;

      if (normalizedAction === 'UNDER_REVIEW') {
        newStatus = 'UNDER_REVIEW';
      } else if (normalizedAction === 'APPROVE' || normalizedAction === 'APPROVED') {
        newStatus = 'APPROVED';
      } else if (normalizedAction === 'REJECT' || normalizedAction === 'REJECTED') {
        newStatus = 'REJECTED';
        if (!rejectionReason || !rejectionReason.trim()) {
          throw new ApiError(400, 'A mandatory rejection reason is required when rejecting staff verification.');
        }
      }

      verification.status = newStatus;
      verification.reviewedAt = new Date();
      verification.reviewedBy = adminEmail;
      if (rejectionReason) {
        verification.rejectionReason = rejectionReason.trim();
      }
      if (adminNotes !== undefined) {
        verification.adminNotes = adminNotes.trim();
      }

      // Add to verification history audit trail
      verification.verificationHistory.push({
        action: newStatus,
        previousStatus,
        newStatus,
        performedBy: adminEmail,
        reason: rejectionReason || adminNotes || `Status transitioned to ${newStatus}`,
        timestamp: new Date(),
      });

      await verification.save();

      // Synchronize User model status
      const user = await User.findById(verification.applicant);
      if (user) {
        if (newStatus === 'APPROVED') {
          user.status = 'active';
          user.isActive = true;
          // Apply professional details to user document if not already set
          if (verification.department && !user.department) user.department = verification.department;
          if (verification.professionalInfo?.specialization && !user.specialization) {
            user.specialization = verification.professionalInfo.specialization;
          }
          if (verification.professionalInfo?.qualification && !user.qualification) {
            user.qualification = verification.professionalInfo.qualification;
          }
          if (verification.professionalInfo?.licenseNumber && !user.licenseNumber) {
            user.licenseNumber = verification.professionalInfo.licenseNumber;
          }
        } else if (newStatus === 'REJECTED') {
          user.status = 'rejected';
          user.isActive = false;
        } else if (newStatus === 'UNDER_REVIEW') {
          user.status = 'pending_verification';
          user.isActive = false;
        }
        await user.save({ validateBeforeSave: false });
      }

      // Create permanent Audit Log record
      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: adminEmail,
        userRole: 'SUPER_ADMIN',
        action: `STAFF_VERIFICATION_${newStatus}`,
        module: 'admin',
        resourceId: String(verification._id),
        status: 'SUCCESS',
        details: {
          applicantId: verification.applicant,
          applicantEmail: verification.applicantEmail,
          role: verification.role,
          previousStatus,
          newStatus,
          rejectionReason: rejectionReason || null,
        },
      });

      logger.info(
        `Staff verification application ${verification._id} (${verification.applicantEmail}) updated to ${newStatus} by ${adminEmail}`
      );

      return ApiResponse.success(res, `Staff verification status updated to ${newStatus}`, verification);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/users
   * @desc Get all users and staff with filters
   */
  async getUsersAndStaff(req, res, next) {
    try {
      const { role, department, status, search, page = 1, limit = 25 } = req.query;

      const query = {};
      if (role && role !== 'all') {
        query.roleName = role.toUpperCase();
      }
      if (department && department !== 'all') {
        query.department = new RegExp(department, 'i');
      }
      if (status && status !== 'all') {
        if (status === 'active') {
          query.status = 'active';
          query.isActive = true;
        } else if (status === 'pending') {
          query.status = { $in: ['pending', 'pending_verification'] };
        } else if (status === 'rejected') {
          query.status = 'rejected';
        } else if (status === 'suspended') {
          query.status = 'suspended';
        }
      }
      if (search) {
        query.$or = [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { specialization: new RegExp(search, 'i') },
        ];
      }

      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      if (requesterRole === 'HOSPITAL_ADMIN') {
        let adminHospitalId = req.user?.hospital || req.user?.hospitalId;
        if (!adminHospitalId) {
          const hs = await HospitalSetting.findOne({ adminUser: req.user?._id });
          if (hs) {
            adminHospitalId = hs._id;
            req.user.hospital = hs._id;
            req.user.hospitalId = hs._id;
          }
        }

        const hospitalMatch = [];
        if (adminHospitalId) {
          hospitalMatch.push({ hospital: adminHospitalId }, { hospitalId: adminHospitalId });
        }

        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              ...hospitalMatch,
              { createdBy: req.user?._id },
            ],
          },
          { roleName: { $nin: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PATIENT'] } },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-password -refreshTokens')
        .populate('role', 'name displayName')
        .populate('hospital', 'hospitalName registrationNumber address')
        .populate('hospitalId', 'hospitalName registrationNumber address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      return ApiResponse.success(res, 'Users fetched successfully', {
        users,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
          limit: parseInt(limit, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/users/:id/status
   * @desc Activate or suspend user account
   */
  async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive, status } = req.body;

      const user = await User.findById(id);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      if (user.roleName === 'SUPER_ADMIN') {
        throw new ApiError(403, 'Cannot deactivate Super Administrator accounts');
      }

      if (requesterRole === 'HOSPITAL_ADMIN') {
        if (user.roleName === 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Hospital Administrators cannot modify administrative accounts.');
        }

        let adminHospitalId = String(req.user?.hospital || req.user?.hospitalId || '');
        if (!adminHospitalId) {
          const hs = await HospitalSetting.findOne({ adminUser: req.user?._id });
          if (hs) {
            adminHospitalId = String(hs._id);
            req.user.hospital = hs._id;
            req.user.hospitalId = hs._id;
          }
        }

        const userHospitalId = String(user.hospital || user.hospitalId || '');
        if (!adminHospitalId || (userHospitalId !== adminHospitalId && String(user.createdBy) !== String(req.user?._id))) {
          throw new ApiError(403, 'Hospital Administrators cannot modify staff belonging to another hospital.');
        }
      }

      if (isActive !== undefined) {
        user.isActive = Boolean(isActive);
      }
      if (status) {
        user.status = status;
      }

      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        user: req.user?._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: requesterRole || 'SUPER_ADMIN',
        hospital: req.user?.hospital || req.user?.hospitalId || null,
        action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        module: 'admin',
        resourceId: String(user._id),
        status: 'SUCCESS',
        details: { targetEmail: user.email, targetRole: user.roleName, newStatus: user.status },
      });

      return ApiResponse.success(res, `User status updated to ${user.isActive ? 'Active' : 'Suspended'}`, {
        id: user._id,
        status: user.status,
        isActive: user.isActive,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/hospital-admin/users/:id
   * @desc Update permitted staff details (Name, Phone, Department, Specialization, etc.)
   */
  async updateStaffUser(req, res, next) {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        phone,
        department,
        specialization,
        qualification,
        licenseNumber,
      } = req.body;

      const user = await User.findById(id);
      if (!user) {
        throw new ApiError(404, 'Staff user not found.');
      }

      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      if (user.roleName === 'SUPER_ADMIN') {
        throw new ApiError(403, 'Cannot modify Super Administrator accounts.');
      }

      if (requesterRole === 'HOSPITAL_ADMIN') {
        if (user.roleName === 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Hospital Administrators cannot modify administrative accounts.');
        }

        let adminHospitalId = String(req.user?.hospital || req.user?.hospitalId || '');
        if (!adminHospitalId) {
          const hs = await HospitalSetting.findOne({ adminUser: req.user?._id });
          if (hs) {
            adminHospitalId = String(hs._id);
            req.user.hospital = hs._id;
            req.user.hospitalId = hs._id;
          }
        }

        const userHospitalId = String(user.hospital || user.hospitalId || '');
        if (!adminHospitalId || (userHospitalId !== adminHospitalId && String(user.createdBy) !== String(req.user?._id))) {
          throw new ApiError(403, 'Hospital Administrators cannot modify staff belonging to another hospital.');
        }
      }

      if (firstName !== undefined && firstName.trim()) user.firstName = firstName.trim();
      if (lastName !== undefined && lastName.trim()) user.lastName = lastName.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (department !== undefined) user.department = department.trim();
      if (specialization !== undefined) user.specialization = specialization.trim();
      if (qualification !== undefined) user.qualification = qualification.trim();
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber.trim();

      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        user: req.user?._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: requesterRole || 'HOSPITAL_ADMIN',
        hospital: req.user?.hospital || req.user?.hospitalId || null,
        action: 'UPDATE_STAFF_USER',
        module: 'user_management',
        resourceId: String(user._id),
        status: 'SUCCESS',
        details: {
          targetEmail: user.email,
          targetRole: user.roleName,
          updatedFields: {
            firstName: user.firstName,
            lastName: user.lastName,
            department: user.department,
            phone: user.phone,
            specialization: user.specialization,
          },
        },
      });

      const updatedUser = await User.findById(user._id)
        .select('-password -refreshTokens')
        .populate('role', 'name displayName')
        .populate('hospital', 'hospitalName registrationNumber');

      return ApiResponse.success(res, 'Staff details updated successfully', updatedUser);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/users
   * @desc Provision staff account (Doctor, Nurse, Pharmacist, Lab Tech, Radiologist, Receptionist, etc.)
   * @access Private (Super Admin, Hospital Admin)
   */
  async createStaffUser(req, res, next) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone = '',
        role,
        department = '',
        specialization = '',
        qualification = '',
        licenseNumber = '',
        consultationFee = 50,
        password,
        status = 'active',
      } = req.body;

      if (!firstName || !lastName || !email || !role) {
        throw new ApiError(400, 'First name, last name, email, and role are required.');
      }

      const cleanEmail = email.trim().toLowerCase();
      const targetRoleCode = role.trim().toUpperCase().replace(/[-\s]/g, '_');

      // Authorization checks:
      // Super Admin cannot be created via standard provisioning
      if (targetRoleCode === 'SUPER_ADMIN') {
        throw new ApiError(403, 'Super Administrator accounts cannot be created via account provisioning.');
      }

      // Patient accounts must be registered via Reception & Front Desk
      if (targetRoleCode === 'PATIENT') {
        throw new ApiError(400, 'Patient accounts must be registered through the Reception & Front Desk module.');
      }

      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      const ALLOWED_STAFF_ROLES = [
        'DOCTOR',
        'NURSE',
        'RECEPTIONIST',
        'PHARMACIST',
        'LAB_TECH',
        'RADIOLOGY_STAFF',
        'BILLING_STAFF',
      ];

      let adminHospitalId = null;
      if (requesterRole === 'SUPER_ADMIN') {
        if (targetRoleCode !== 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Super Administrators are only permitted to provision Hospital Administrator accounts. Operational staff must be provisioned by Hospital Administration.');
        }
      } else if (requesterRole === 'HOSPITAL_ADMIN') {
        // 2. HOSPITAL_ADMIN cannot create SUPER_ADMIN or another HOSPITAL_ADMIN
        if (targetRoleCode === 'HOSPITAL_ADMIN' || targetRoleCode === 'SUPER_ADMIN') {
          throw new ApiError(403, 'Hospital Administrators cannot provision Administrator accounts.');
        }
        if (!ALLOWED_STAFF_ROLES.includes(targetRoleCode)) {
          throw new ApiError(403, `Hospital Administrators can only create operational staff accounts (${ALLOWED_STAFF_ROLES.join(', ')}).`);
        }

        // Determine authenticated admin's hospital
        adminHospitalId = req.user?.hospital || req.user?.hospitalId;
        if (!adminHospitalId) {
          let hs = await HospitalSetting.findOne({ adminUser: req.user?._id });
          if (!hs && req.user?.email) {
            hs = await HospitalSetting.findOne({ adminEmail: req.user.email });
          }
          if (!hs) {
            const adminName = req.user.firstName ? `${req.user.firstName}'s Hospital` : 'Hospital Medical Center';
            const regNo = `REG-${Date.now().toString().slice(-6)}`;
            hs = await HospitalSetting.create({
              hospitalName: adminName,
              registrationNumber: regNo,
              adminUser: req.user._id,
              adminEmail: req.user.email,
              contactEmail: req.user.email || 'admin@hospital.org',
              branches: [
                {
                  name: `${adminName} Main Campus`,
                  code: 'MAIN-01',
                  isMain: true,
                  capacity: 100,
                  isActive: true,
                },
              ],
            });
          }
          if (hs) {
            adminHospitalId = hs._id;
            req.user.hospital = hs._id;
            req.user.hospitalId = hs._id;
            await req.user.save({ validateBeforeSave: false });
          }
        }
        if (!adminHospitalId) {
          throw new ApiError(400, 'Hospital Administrator has no assigned hospital.');
        }

        // Validate branch belongs to hospital if requested
        const requestedBranch = (req.body.hospitalBranch || req.body.branchCode || '').trim().toUpperCase();
        if (requestedBranch) {
          const currentSettings = await HospitalSetting.findById(adminHospitalId);
          const hasBranch = currentSettings?.branches?.some((b) => b.code === requestedBranch);
          if (!hasBranch && requestedBranch !== (req.user?.hospitalBranch || 'MAIN-01')) {
            throw new ApiError(403, 'Hospital Administrators cannot create staff accounts for a branch not in their hospital.');
          }
        }
      } else {
        // Any other role (Receptionist, Doctor, Patient, etc.)
        throw new ApiError(403, 'You do not have permission to provision accounts.');
      }

      // Validate staff email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new ApiError(400, 'Invalid email format. Please provide a valid Staff Email Address (e.g. doctor@hospital.org).');
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        throw new ApiError(400, `A staff account with email '${cleanEmail}' already exists. Each staff member must have a unique login email address.`);
      }

      // Find role in DB
      let roleDoc = await Role.findOne({ name: targetRoleCode });
      if (!roleDoc) {
        // Fallback search by lowercase or display name
        roleDoc = await Role.findOne({
          $or: [
            { name: targetRoleCode.toLowerCase() },
            { displayName: new RegExp(`^${role.trim()}$`, 'i') },
          ],
        });
      }

      if (!roleDoc) {
        throw new ApiError(400, `Role '${role}' is not a valid system role.`);
      }

      // Temporary password manually entered by Hospital Admin (with fallback generator)
      let tempPassword = req.body.password ? String(req.body.password).trim() : '';
      if (!tempPassword) {
        tempPassword = generateSecureTemporaryPassword(12);
      } else if (tempPassword.length < 8) {
        throw new ApiError(400, 'Temporary password must be at least 8 characters long.');
      }

      const isAccountActive = status !== 'inactive' && status !== 'suspended';

      let creatorId = req.user?._id;
      if (creatorId === 'super_admin_system') {
        const sysAdmin = await User.findOne({ roleName: 'SUPER_ADMIN' });
        creatorId = sysAdmin?._id || null;
      }

      const branchToAssign = requesterRole === 'HOSPITAL_ADMIN'
        ? (req.body.hospitalBranch || req.body.branchCode || req.user?.hospitalBranch || req.user?.branchCode || 'MAIN-01')
        : (req.body.hospitalBranch || req.body.branchCode || 'MAIN-01');

      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password: tempPassword, // Handled by User.pre('save') bcrypt hashing
        phone: phone.trim(),
        role: roleDoc._id,
        roleName: roleDoc.name,
        department: department.trim(),
        specialization: specialization.trim(),
        qualification: qualification.trim(),
        licenseNumber: licenseNumber.trim(),
        consultationFee: consultationFee ? Number(consultationFee) : 50,
        hospitalBranch: branchToAssign,
        branchCode: branchToAssign,
        hospital: requesterRole === 'HOSPITAL_ADMIN' ? adminHospitalId : (req.body.hospital || null),
        hospitalId: requesterRole === 'HOSPITAL_ADMIN' ? adminHospitalId : (req.body.hospital || null),
        status: status || 'active',
        isActive: isAccountActive,
        isEmailVerified: true,
        createdBy: creatorId,
        mustChangePassword: true,
      });

      await newUser.save();

      if (targetRoleCode === 'HOSPITAL_ADMIN' && !newUser.hospital) {
        const adminName = newUser.firstName ? `${newUser.firstName}'s Hospital` : 'Hospital Medical Center';
        const regNo = `REG-${Date.now().toString().slice(-6)}`;
        const hs = await HospitalSetting.create({
          hospitalName: adminName,
          registrationNumber: regNo,
          adminUser: newUser._id,
          adminEmail: newUser.email,
          contactEmail: newUser.email || 'admin@hospital.org',
          branches: [
            {
              name: `${adminName} Main Campus`,
              code: 'MAIN-01',
              isMain: true,
              capacity: 100,
              isActive: true,
            },
          ],
        });
        newUser.hospital = hs._id;
        newUser.hospitalId = hs._id;
        await newUser.save();
      }

      // Look up hospital name for email branding & audit log
      let hospitalName = 'Hospital Medical Center';
      const userHospitalRef = newUser.hospital || newUser.hospitalId || adminHospitalId;
      if (userHospitalRef) {
        const hs = await HospitalSetting.findById(userHospitalRef);
        if (hs?.hospitalName) hospitalName = hs.hospitalName;
      }

      // Audit Log (Never log temporary password)
      await AuditLog.create({
        user: creatorId,
        userEmail: req.user?.email || 'admin@hospital.org',
        userRole: requesterRole || 'ADMIN',
        hospital: userHospitalRef || null,
        action: 'STAFF_PROVISIONED',
        module: 'user_management',
        resourceId: String(newUser._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          createdUserId: newUser._id,
          createdEmail: newUser.email,
          assignedRole: newUser.roleName,
          department: newUser.department,
          hospitalBranch: newUser.hospitalBranch,
          accountStatus: newUser.status,
          mustChangePassword: true,
        },
      });

      return ApiResponse.created(
        res,
        'Staff account provisioned successfully. The staff member can now log in using their Staff Email Address and temporary password.',
        {
          user: {
            id: newUser._id,
            _id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            name: `${newUser.firstName} ${newUser.lastName}`.trim(),
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.roleName,
            roleName: newUser.roleName,
            department: newUser.department,
            specialization: newUser.specialization,
            roleDisplayName: roleDoc.displayName || roleDoc.name,
            qualification: newUser.qualification,
            licenseNumber: newUser.licenseNumber,
            hospital: newUser.hospital,
            hospitalBranch: newUser.hospitalBranch,
            status: newUser.status,
            isActive: newUser.isActive,
            mustChangePassword: newUser.mustChangePassword,
            createdAt: newUser.createdAt,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/hospital-admin/users/:id/resend-credentials
   * @route POST /api/v1/super-admin/users/:id/resend-credentials
   * @desc Reissue fresh temporary password and resend login credentials email
   */
  async resendStaffCredentials(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id).populate('role');
      if (!user) {
        throw new ApiError(404, 'Staff account not found.');
      }

      if (user.roleName === 'SUPER_ADMIN') {
        throw new ApiError(403, 'Cannot re-issue credentials for Super Administrator accounts.');
      }

      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      let adminHospitalId = String(req.user?.hospital || req.user?.hospitalId || '');
      if (requesterRole === 'HOSPITAL_ADMIN') {
        if (user.roleName === 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Hospital Administrators cannot re-issue credentials to administrative accounts.');
        }
        if (!adminHospitalId) {
          const hs = await HospitalSetting.findOne({ adminUser: req.user?._id });
          if (hs) {
            adminHospitalId = String(hs._id);
          }
        }
        const userHospitalId = String(user.hospital || user.hospitalId || '');
        if (!adminHospitalId || (userHospitalId !== adminHospitalId && String(user.createdBy) !== String(req.user?._id))) {
          throw new ApiError(403, 'Hospital Administrators cannot manage staff belonging to another hospital.');
        }
      }

      // Use admin-entered temporary password or generate new one
      let newTempPassword = (req.body?.password || req.body?.tempPassword)
        ? String(req.body.password || req.body.tempPassword).trim()
        : '';
      if (!newTempPassword) {
        newTempPassword = generateSecureTemporaryPassword(12);
      } else if (newTempPassword.length < 8) {
        throw new ApiError(400, 'Temporary password must be at least 8 characters long.');
      }

      // Invalidate existing sessions/tokens and replace password
      user.password = newTempPassword; // Pre-save hook will hash it with bcrypt
      user.mustChangePassword = true;
      user.refreshTokens = [];
      await user.save();

      // Lookup hospital name
      let hospitalName = 'Hospital Medical Center';
      const userHospitalRef = user.hospital || user.hospitalId || adminHospitalId;
      if (userHospitalRef) {
        const hs = await HospitalSetting.findById(userHospitalRef);
        if (hs?.hospitalName) hospitalName = hs.hospitalName;
      }

      // Audit Log (Never log password)
      await AuditLog.create({
        user: req.user?._id !== 'super_admin_system' ? req.user?._id : null,
        userEmail: req.user?.email || 'admin@hospital.org',
        userRole: requesterRole || 'HOSPITAL_ADMIN',
        hospital: userHospitalRef || null,
        action: 'RESET_STAFF_CREDENTIALS',
        module: 'user_management',
        resourceId: String(user._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          targetEmail: user.email,
          targetRole: user.roleName,
          mustChangePassword: true,
        },
      });

      return ApiResponse.success(
        res,
        `Temporary credentials updated successfully for ${user.email}.`,
        {
          email: user.email,
          mustChangePassword: true,
        }
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/roles
   * @desc Get all roles with canonical ordering, permissions, and accurate user counts
   */
  async getRolesAndPermissions(req, res, next) {
    try {
      const CANONICAL_ROLE_ORDER = [
        'SUPER_ADMIN',
        'HOSPITAL_ADMIN',
        'DOCTOR',
        'NURSE',
        'RECEPTIONIST',
        'PHARMACIST',
        'LAB_TECH',
        'RADIOLOGY_STAFF',
        'BILLING_STAFF',
        'PATIENT',
      ];

      const DISPLAY_NAME_MAP = {
        SUPER_ADMIN: 'Super Administrator',
        HOSPITAL_ADMIN: 'Hospital Administrator',
        DOCTOR: 'Medical Doctor',
        NURSE: 'Staff Nurse',
        RECEPTIONIST: 'Front Desk Receptionist',
        PHARMACIST: 'Pharmacist',
        LAB_TECH: 'Laboratory Technician',
        RADIOLOGY_STAFF: 'Radiology / Imaging Staff',
        BILLING_STAFF: 'Billing & Cashier Staff',
        PATIENT: 'Patient Portal Account',
      };

      const DESCRIPTION_MAP = {
        SUPER_ADMIN: 'Full global system administration, hospital network provisioning, and root access control.',
        HOSPITAL_ADMIN: 'Hospital-level operational governance, department management, and staff supervision.',
        DOCTOR: 'Clinical consultation, patient diagnosis, e-prescriptions, and medical records entry.',
        NURSE: 'Inpatient nursing care, vitals tracking, medication administration, and shift handovers.',
        RECEPTIONIST: 'Patient registration, appointment scheduling, queue token management, and front-desk coordination.',
        PHARMACIST: 'Prescription dispensing, medication inventory, stock adjustments, and dosage verification.',
        LAB_TECH: 'Specimen processing, diagnostic lab test execution, and laboratory report authorization.',
        RADIOLOGY_STAFF: 'Medical imaging exams (X-Ray, CT, MRI, Ultrasound) and radiology report entry.',
        BILLING_STAFF: 'Patient billing, invoice generation, cashier payment collection, and insurance claims.',
        PATIENT: 'Self-service patient portal, appointment booking, prescription history, and lab report access.',
      };

      const roles = await Role.find();

      const rolesWithCounts = await Promise.all(
        roles.map(async (r) => {
          const userCount = await User.countDocuments({
            $or: [{ role: r._id }, { roleName: r.name }],
            status: { $nin: ['rejected'] },
          });

          return {
            id: r._id,
            _id: r._id,
            name: r.name,
            displayName: r.displayName || DISPLAY_NAME_MAP[r.name] || r.name,
            description: r.description || DESCRIPTION_MAP[r.name] || 'System access policies and authorization matrix.',
            permissions: r.permissions || [],
            isSystemRole: r.isSystemRole !== false,
            isActive: r.isActive !== false,
            userCount,
          };
        })
      );

      // Sort by canonical order
      rolesWithCounts.sort((a, b) => {
        const indexA = CANONICAL_ROLE_ORDER.indexOf(a.name);
        const indexB = CANONICAL_ROLE_ORDER.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      return ApiResponse.success(res, 'Roles and permissions retrieved successfully', rolesWithCounts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/roles
   * @desc Create or update role permissions matrix
   * @access Private (Super Admin only)
   */
  async updateRolePermissions(req, res, next) {
    try {
      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      if (requesterRole !== 'SUPER_ADMIN') {
        throw new ApiError(403, 'Only Super Administrators are permitted to modify role permissions.');
      }

      const { roleId, permissions, description, displayName } = req.body;

      if (!roleId) {
        throw new ApiError(400, 'Role identifier is required.');
      }

      let role = null;
      if (mongoose.Types.ObjectId.isValid(roleId)) {
        role = await Role.findById(roleId);
      }
      if (!role) {
        role = await Role.findOne({
          $or: [{ name: roleId }, { name: String(roleId).toUpperCase() }],
        });
      }

      if (!role) {
        throw new ApiError(404, `Role not found with identifier '${roleId}'.`);
      }

      const sanitizedPerms = Array.isArray(permissions)
        ? permissions.map((p) => String(p).toLowerCase().trim()).filter(Boolean)
        : [];

      // 1. Protect SUPER_ADMIN from lockout
      if (role.name === 'SUPER_ADMIN') {
        const hasUniversal = sanitizedPerms.includes('*');
        const hasCoreAdmin = ['roles:manage', 'users:manage', 'hospital_management:manage'].some((cp) =>
          sanitizedPerms.includes(cp)
        );

        if (!hasUniversal && (!hasCoreAdmin || sanitizedPerms.length < 3)) {
          throw new ApiError(
            400,
            'Cannot remove core administrative governance permissions from the protected Super Administrator system role.'
          );
        }
      }

      // 2. Protect HOSPITAL_ADMIN from privilege escalation to global Super Admin powers
      if (role.name === 'HOSPITAL_ADMIN') {
        const forbiddenGlobalPerms = [
          '*',
          'hospital_management:manage',
          'hospital_admin_management:manage',
          'roles:manage',
          'security:manage',
          'admin:system',
        ];

        const hasForbidden = sanitizedPerms.some((p) => forbiddenGlobalPerms.includes(p));
        if (hasForbidden) {
          throw new ApiError(
            400,
            'Hospital Administrators cannot be granted global Super Admin management or system-level configuration privileges.'
          );
        }
      }

      role.permissions = sanitizedPerms;
      if (typeof description === 'string') {
        role.description = description.trim();
      }
      if (typeof displayName === 'string' && displayName.trim()) {
        role.displayName = displayName.trim();
      }

      await role.save();

      // Log the administrative action in AuditLog
      await AuditLog.create({
        user: req.user?._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_ROLE_PERMISSIONS',
        module: 'rbac',
        resourceId: String(role._id),
        status: 'SUCCESS',
        details: {
          roleName: role.name,
          permissionsCount: role.permissions.length,
          permissions: role.permissions,
        },
      });

      await triggerSuperAdminNotification({
        title: `Role Permissions Updated: ${role.displayName || role.name}`,
        message: `Security access rules modified for role ${role.displayName || role.name} (${role.permissions.length} active permissions).`,
        type: 'security',
        module: 'ROLES',
        priority: 'high',
        link: '/dashboard/super-admin?tab=roles',
        relatedId: role._id,
      });

      const userCount = await User.countDocuments({
        $or: [{ role: role._id }, { roleName: role.name }],
        status: { $nin: ['rejected'] },
      });

      return ApiResponse.success(res, `Permissions for role "${role.displayName || role.name}" updated successfully.`, {
        id: role._id,
        _id: role._id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystemRole: role.isSystemRole !== false,
        isActive: role.isActive !== false,
        userCount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/departments
   * @desc Get all hospital departments with staff and doctor statistics
   */
  async getDepartments(req, res, next) {
    try {
      let departments = await Department.find().sort({ name: 1 });

      // Seed core departments if empty
      if (departments.length === 0) {
        const defaultDepts = [
          { name: 'Cardiology', code: 'CARD', description: 'Comprehensive heart, cardiovascular, and coronary disease care.', capacity: 35 },
          { name: 'Neurology', code: 'NEUR', description: 'Diagnosis and treatment of neurological and brain disorders.', capacity: 25 },
          { name: 'Orthopedics', code: 'ORTH', description: 'Musculoskeletal surgical care, joint replacement, and trauma recovery.', capacity: 40 },
          { name: 'Pediatrics', code: 'PEDI', description: 'Specialized healthcare and clinical wellness for children.', capacity: 30 },
          { name: 'Radiology & Imaging', code: 'RADI', description: 'Diagnostic imaging, X-Ray, CT Scan, and MRI evaluations.', capacity: 20 },
          { name: 'Pathology & Laboratory', code: 'PATH', description: 'Clinical pathology, hematology, and biochemical specimen testing.', capacity: 20 },
          { name: 'Emergency Medicine', code: 'EMER', description: '24/7 acute emergency triage, trauma, and resuscitation care.', capacity: 50 },
          { name: 'General Surgery', code: 'SURG', description: 'Laparoscopic, elective, and emergency surgical operations.', capacity: 30 },
        ];
        await Department.insertMany(defaultDepts);
        departments = await Department.find().sort({ name: 1 });
      }

      const departmentsWithMetrics = await Promise.all(
        departments.map(async (d) => {
          const doctorCount = await User.countDocuments({ department: d.name, roleName: 'DOCTOR', isActive: true });
          const staffCount = await User.countDocuments({ department: d.name, roleName: { $ne: 'PATIENT' }, isActive: true });
          return {
            id: d._id,
            name: d.name,
            code: d.code,
            description: d.description,
            headName: d.headName || 'Assigned Specialist',
            location: d.location || 'Main Medical Wing',
            capacity: d.capacity || 25,
            isActive: d.isActive,
            doctorsCount: doctorCount,
            staffCount: staffCount,
          };
        })
      );

      return ApiResponse.success(res, 'Departments retrieved successfully', departmentsWithMetrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/departments
   * @desc Create a new department
   */
  async createDepartment(req, res, next) {
    try {
      const { name, code, description, location, capacity, headName } = req.body;

      if (!name || !code) {
        throw new ApiError(400, 'Department name and unique code are required.');
      }

      const existing = await Department.findOne({
        $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
      });
      if (existing) {
        throw new ApiError(409, 'A department with this name or code already exists.');
      }

      const dept = await Department.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: (description || '').trim(),
        location: (location || 'Main Hospital Tower').trim(),
        capacity: Number(capacity) || 25,
        headName: (headName || '').trim(),
        isActive: true,
      });

      await AuditLog.create({
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: 'SUPER_ADMIN',
        action: 'CREATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { name: dept.name, code: dept.code },
      });

      return ApiResponse.created(res, 'Department created successfully', dept);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/super-admin/departments/:id
   * @desc Update department details
   */
  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const { name, code, description, location, capacity, headName, isActive } = req.body;

      const dept = await Department.findById(id);
      if (!dept) {
        throw new ApiError(404, 'Department not found');
      }

      if (name) dept.name = name.trim();
      if (code) dept.code = code.trim().toUpperCase();
      if (description !== undefined) dept.description = description.trim();
      if (location !== undefined) dept.location = location.trim();
      if (capacity !== undefined) dept.capacity = Number(capacity);
      if (headName !== undefined) dept.headName = headName.trim();
      if (isActive !== undefined) dept.isActive = Boolean(isActive);

      await dept.save();

      await AuditLog.create({
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { name: dept.name, code: dept.code },
      });

      return ApiResponse.success(res, 'Department updated successfully', dept);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/departments/:id/status
   * @desc Toggle department active status
   */
  async toggleDepartmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const dept = await Department.findById(id);
      if (!dept) {
        throw new ApiError(404, 'Department not found');
      }

      dept.isActive = !dept.isActive;
      await dept.save();

      return ApiResponse.success(
        res,
        `Department ${dept.name} is now ${dept.isActive ? 'Active' : 'Inactive'}`,
        dept
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/audit-logs
   * @desc Complete global audit trail for security, staff actions, and access control
   */
  async getAuditLogs(req, res, next) {
    try {
      const {
        action,
        module: auditModule,
        status,
        role,
        hospital,
        actor,
        dateRange = 'all',
        startDate,
        endDate,
        search,
        page = 1,
        limit = 20,
        export: isExport,
      } = req.query;

      const query = {};

      // 1. Date Range Filtering
      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: startOfDay };
      } else if (dateRange === '7d') {
        const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: start7d };
      } else if (dateRange === '30d') {
        const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: start30d };
      } else if (dateRange === 'custom' || startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
        if (!startDate && !endDate) {
          delete query.createdAt;
        }
      }

      // 2. Module Filtering
      if (auditModule && auditModule !== 'all') {
        query.module = auditModule.toLowerCase().trim();
      }

      // 3. Action Filtering
      if (action && action !== 'all') {
        query.action = action.toUpperCase().trim();
      }

      // 4. Status Filtering
      if (status && status !== 'all') {
        query.status = status.toUpperCase().trim();
      }

      // 5. Role Filtering
      if (role && role !== 'all') {
        query.userRole = role.toUpperCase().trim();
      }

      // 6. Hospital Filtering
      if (hospital && hospital !== 'all') {
        if (mongoose.Types.ObjectId.isValid(hospital)) {
          const hospId = new mongoose.Types.ObjectId(hospital);
          query.$or = query.$or || [];
          // Match direct hospital reference or hospitalId stored in details
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { hospital: hospId },
              { 'details.hospitalId': String(hospital) },
              { 'details.hospitalId': hospId },
            ],
          });
        }
      }

      // 7. Actor / User Filtering
      if (actor && actor !== 'all') {
        if (mongoose.Types.ObjectId.isValid(actor)) {
          query.user = new mongoose.Types.ObjectId(actor);
        } else {
          query.userEmail = new RegExp(actor.trim(), 'i');
        }
      }

      // 8. Global Free-text Search
      if (search && search.trim()) {
        const term = search.trim();
        const searchRegex = new RegExp(term, 'i');
        const orConditions = [
          { userEmail: searchRegex },
          { userRole: searchRegex },
          { action: searchRegex },
          { module: searchRegex },
          { ipAddress: searchRegex },
          { resourceId: searchRegex },
        ];

        if (mongoose.Types.ObjectId.isValid(term)) {
          const objId = new mongoose.Types.ObjectId(term);
          orConditions.push({ _id: objId });
          orConditions.push({ user: objId });
          orConditions.push({ hospital: objId });
        }

        // Substring search on user names
        const matchingUsers = await User.find({
          $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
        })
          .select('_id')
          .limit(20)
          .lean();

        if (matchingUsers.length > 0) {
          orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
        }

        // Substring search on hospital names
        const matchingHospitals = await HospitalSetting.find({
          hospitalName: searchRegex,
        })
          .select('_id')
          .limit(20)
          .lean();

        if (matchingHospitals.length > 0) {
          const matchedIds = matchingHospitals.map((h) => h._id);
          orConditions.push({ hospital: { $in: matchedIds } });
          orConditions.push({ 'details.hospitalId': { $in: matchedIds.map(String) } });
        }

        if (query.$and) {
          query.$and.push({ $or: orConditions });
        } else if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: orConditions }];
          delete query.$or;
        } else {
          query.$or = orConditions;
        }
      }

      // Pagination & Export controls
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const isExportMode = isExport === 'true' || isExport === 'csv';
      const parsedLimit = isExportMode ? 1000 : Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (parsedPage - 1) * parsedLimit;

      // Execute primary count & query with populations
      const [total, rawLogs, allHospitals] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.find(query)
          .populate('user', 'firstName lastName email roleName')
          .populate('hospital', 'hospitalName registrationNumber address')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        HospitalSetting.find().select('_id hospitalName registrationNumber').lean(),
      ]);

      // Hospital lookup map for events that stored hospitalId only in details
      const hospitalMap = new Map();
      allHospitals.forEach((h) => {
        hospitalMap.set(String(h._id), h);
      });

      // Recursive sanitizer to guarantee NO passwords, hashes, tokens, or credentials leak
      const SENSITIVE_KEYS = new Set([
        'password',
        'passwordhash',
        'otp',
        'otpcode',
        'token',
        'accesstoken',
        'refreshtoken',
        'refreshtokens',
        'secret',
        'apikey',
        'authorization',
        'credentials',
      ]);

      const sanitizeDetails = (item) => {
        if (!item || typeof item !== 'object') return item;
        if (Array.isArray(item)) return item.map(sanitizeDetails);
        const clean = {};
        for (const [key, val] of Object.entries(item)) {
          if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[^a-z]/g, ''))) {
            continue; // drop sensitive key entirely
          }
          clean[key] = sanitizeDetails(val);
        }
        return clean;
      };

      // Format sanitized logs
      const logs = rawLogs.map((log) => {
        let assignedHospital = log.hospital;
        if (!assignedHospital && log.details?.hospitalId) {
          const found = hospitalMap.get(String(log.details.hospitalId));
          if (found) {
            assignedHospital = {
              _id: found._id,
              hospitalName: found.hospitalName,
              registrationNumber: found.registrationNumber,
            };
          }
        }

        const actorName = log.user
          ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.userEmail
          : log.userEmail || 'System';

        return {
          id: log._id,
          _id: log._id,
          createdAt: log.createdAt,
          user: log.user
            ? {
                id: log.user._id,
                name: actorName,
                email: log.user.email,
                role: log.user.roleName || log.userRole,
              }
            : null,
          userEmail: log.userEmail || 'system',
          userRole: log.userRole || 'ANONYMOUS',
          actorName,
          action: log.action,
          module: log.module,
          resourceId: log.resourceId,
          details: sanitizeDetails(log.details || {}),
          ipAddress: log.ipAddress || '—',
          userAgent: log.userAgent || '',
          status: log.status || 'SUCCESS',
          hospital: assignedHospital
            ? {
                id: assignedHospital._id,
                _id: assignedHospital._id,
                name: assignedHospital.hospitalName,
                hospitalName: assignedHospital.hospitalName,
                registrationNumber: assignedHospital.registrationNumber || '',
              }
            : null,
          hospitalName: assignedHospital?.hospitalName || '—',
        };
      });

      // Calculate real aggregated stats based on the current date scope
      const statsBaseQuery = query.createdAt ? { createdAt: query.createdAt } : {};
      const [totalCount, successCount, failureCount, securityCount] = await Promise.all([
        AuditLog.countDocuments(statsBaseQuery),
        AuditLog.countDocuments({ ...statsBaseQuery, status: 'SUCCESS' }),
        AuditLog.countDocuments({ ...statsBaseQuery, status: { $in: ['FAILURE', 'WARNING'] } }),
        AuditLog.countDocuments({
          ...statsBaseQuery,
          $or: [
            { module: { $in: ['auth', 'rbac', 'security', 'roles_and_permissions'] } },
            { action: { $regex: /login|logout|unauthorized|forbidden|token|password|permission|role|security/i } },
          ],
        }),
      ]);

      // Retrieve distinct metadata options for dynamic frontend dropdowns
      const [distinctModules, distinctActions, distinctRoles] = await Promise.all([
        AuditLog.distinct('module'),
        AuditLog.distinct('action'),
        AuditLog.distinct('userRole'),
      ]);

      return ApiResponse.success(res, 'Audit logs fetched successfully', {
        logs,
        pagination: {
          total,
          page: parsedPage,
          pages: Math.ceil(total / parsedLimit) || 1,
          limit: parsedLimit,
        },
        stats: {
          total: totalCount,
          success: successCount,
          failure: failureCount,
          security: securityCount,
        },
        filterOptions: {
          modules: distinctModules.filter(Boolean).sort(),
          actions: distinctActions.filter(Boolean).sort(),
          roles: distinctRoles.filter(Boolean).sort(),
          hospitals: allHospitals.map((h) => ({
            id: String(h._id),
            _id: String(h._id),
            name: h.hospitalName,
            registrationNumber: h.registrationNumber || '',
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/settings
   * @desc Get hospital parameters and configuration
   */
  async getHospitalSettings(req, res, next) {
    try {
      let settings = await HospitalSetting.findOne();
      if (!settings) {
        settings = await HospitalSetting.create({});
      }
      return ApiResponse.success(res, 'Hospital settings retrieved', settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/settings
   * @desc Get Super Admin account and application settings
   */
  async getSuperAdminSettings(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id || 'super_admin_system';
      const preferences = await authService.getUserPreferences(userId);
      return ApiResponse.success(res, 'Super Admin settings retrieved', preferences);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/settings
   * @route PUT /api/v1/super-admin/settings
   * @desc Update Super Admin account and application settings
   */
  async updateSuperAdminSettings(req, res, next) {
    try {
      const userId = req.user?.id || req.user?._id || 'super_admin_system';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      // Whitelist only valid, safe preference fields
      const allowedKeys = ['language', 'timezone', 'dateFormat', 'timeFormat', 'theme', 'notifications', 'dashboardPreference'];
      const sanitizedUpdates = {};

      for (const key of allowedKeys) {
        if (req.body[key] !== undefined) {
          sanitizedUpdates[key] = req.body[key];
        }
      }

      const updated = await authService.updateUserPreferences(userId, sanitizedUpdates, ipAddress, userAgent);
      return ApiResponse.success(res, 'Settings updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/settings/change-password
   * @desc Change Super Admin password securely
   */
  async changeSuperAdminPassword(req, res, next) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Current password and new password are required.');
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        throw new ApiError(400, 'New password and confirmation password do not match.');
      }
      if (newPassword.length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters long.');
      }

      const userId = req.user?.id || req.user?._id || 'super_admin_system';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.changePassword(userId, currentPassword, newPassword, ipAddress, userAgent);
      return ApiResponse.success(res, result.message || 'Password changed successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/super-admin/settings
   * @desc Update hospital configuration parameters
   */
  async updateHospitalSettings(req, res, next) {
    try {
      let settings = await HospitalSetting.findOne();
      if (!settings) {
        settings = new HospitalSetting(req.body);
      } else {
        Object.assign(settings, req.body);
      }
      await settings.save();

      await AuditLog.create({
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_HOSPITAL_SETTINGS',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalName: settings.hospitalName },
      });

      await triggerSuperAdminNotification({
        title: `Platform Settings Updated: ${settings.hospitalName || 'Global Preferences'}`,
        message: `System preferences and platform configuration updated by Super Administrator.`,
        type: 'system',
        module: 'SETTINGS',
        priority: 'medium',
        link: '/dashboard/super-admin?tab=settings',
        relatedId: settings._id,
      });

      return ApiResponse.success(res, 'Hospital settings updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/reports
   * @desc Hospital-wide clinical & administrative reports with multi-dimensional filtering
   * @access Private (Super Admin only)
   */
  async getReportsAndAnalytics(req, res, next) {
    try {
      const { period = '30d', hospitalId, role, status } = req.query;

      // 1. Date range filter builder
      let dateFilter = {};
      const now = new Date();
      const p = String(period || '30d').toLowerCase();

      if (p === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: startOfDay } };
      } else if (p === '7d' || p === '7days' || p === 'last_7_days') {
        const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: start7 } };
      } else if (p === '30d' || p === '30days' || p === 'last_30_days') {
        const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: start30 } };
      } else if (p === '90d' || p === '90days' || p === 'last_90_days') {
        const start90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilter = { createdAt: { $gte: start90 } };
      } else if (p === 'this_year' || p === 'year' || p === '1y') {
        const startYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { $gte: startYear } };
      } // If 'all' or 'all_time', dateFilter remains {}

      // 2. Hospital filter builder
      const hospitalMatch = {};
      let userHospitalMatch = {};
      let auditHospitalMatch = {};

      if (hospitalId && hospitalId !== 'all' && mongoose.Types.ObjectId.isValid(hospitalId)) {
        const hObjId = new mongoose.Types.ObjectId(hospitalId);
        hospitalMatch._id = hObjId;
        userHospitalMatch = { $or: [{ hospital: hObjId }, { hospitalId: hObjId }] };
        auditHospitalMatch = { hospital: hObjId };
      }

      // 3. Status filter builder
      let hospitalStatusMatch = {};
      let adminStatusMatch = {};
      const s = String(status || 'all').toLowerCase();

      if (s === 'active') {
        hospitalStatusMatch = {
          $or: [
            { status: 'active' },
            { isActive: true, status: { $nin: ['inactive', 'suspended', 'rejected'] } },
          ],
        };
        adminStatusMatch = {
          isActive: { $ne: false },
          status: { $nin: ['inactive', 'suspended', 'rejected'] },
        };
      } else if (s === 'inactive' || s === 'suspended') {
        hospitalStatusMatch = {
          $or: [
            { status: { $in: ['inactive', 'suspended', 'rejected'] } },
            { isActive: false },
          ],
        };
        adminStatusMatch = {
          $or: [
            { status: { $in: ['inactive', 'suspended', 'rejected'] } },
            { isActive: false },
          ],
        };
      }

      // 4. Parallel real database queries
      const [
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalBills,
        paidBills,
        totalRevenueAgg,
        pendingVerificationCount,
        approvedVerificationCount,
        rejectedVerificationCount,
        allHospitals,
        allAdmins,
        allOperationalStaff,
        auditLogsCount,
        recentAuditLogs,
      ] = await Promise.all([
        Appointment.countDocuments({ ...dateFilter }),
        Appointment.countDocuments({ status: 'Completed', ...dateFilter }),
        Appointment.countDocuments({ status: 'Cancelled', ...dateFilter }),
        Bill.countDocuments({ ...dateFilter }),
        Bill.countDocuments({ paymentStatus: 'Paid', ...dateFilter }),
        Bill.aggregate([
          { $match: { paymentStatus: 'Paid', ...dateFilter } },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        StaffVerification.countDocuments({ status: 'PENDING_VERIFICATION' }),
        StaffVerification.countDocuments({ status: 'APPROVED' }),
        StaffVerification.countDocuments({ status: 'REJECTED' }),
        HospitalSetting.find({
          ...hospitalMatch,
          ...hospitalStatusMatch,
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        })
          .populate('adminUser', 'firstName lastName email phone status isActive createdAt')
          .sort({ createdAt: -1 }),
        User.find({
          roleName: 'HOSPITAL_ADMIN',
          ...userHospitalMatch,
          ...adminStatusMatch,
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
        })
          .populate('hospital', 'hospitalName registrationNumber')
          .populate('hospitalId', 'hospitalName registrationNumber')
          .select('-password -refreshTokens'),
        User.find({
          roleName: { $nin: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'PATIENT'] },
          ...userHospitalMatch,
          ...(role && role !== 'all' ? { roleName: role.toUpperCase() } : {}),
          ...(s !== 'all' ? adminStatusMatch : {}),
          ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {})
        }).select('firstName lastName email phone roleName department hospital hospitalId isActive status createdAt'),
        AuditLog.countDocuments({
          ...dateFilter,
          ...auditHospitalMatch,
        }),
        AuditLog.find({
          ...dateFilter,
          ...auditHospitalMatch,
        })
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      const totalRevenue = totalRevenueAgg[0]?.total || 0;

      // 5. Map operational staff counts by role
      const staffByRoleMap = {};
      allOperationalStaff.forEach((st) => {
        const r = st.roleName || 'OTHER';
        staffByRoleMap[r] = (staffByRoleMap[r] || 0) + 1;
      });

      // 6. Map hospital reports with linked administrators
      const hospitalReports = allHospitals.map((h) => {
        const city = h.address?.city || '';
        const state = h.address?.state || '';
        const country = h.address?.country || '';
        const loc = [city, state, country].filter(Boolean).join(', ') || 'Global Campus';
        
        const adminName = h.adminUser
          ? `${h.adminUser.firstName || ''} ${h.adminUser.lastName || ''}`.trim()
          : (h.adminEmail || 'Hospital Administrator');
        const adminEmail = h.adminUser?.email || h.adminEmail || h.contactEmail || '—';
        const isAct = h.status === 'active' || (h.isActive !== false && h.status !== 'inactive' && h.status !== 'suspended');

        return {
          id: h._id,
          _id: h._id,
          hospitalName: h.hospitalName,
          registrationNumber: h.registrationNumber || 'N/A',
          contactEmail: h.contactEmail || '',
          contactPhone: h.contactPhone || '',
          location: loc,
          status: isAct ? 'active' : 'inactive',
          adminName: adminName || 'Hospital Administrator',
          adminEmail: adminEmail,
          createdAt: h.createdAt,
        };
      });

      // 7. Map admin reports (for backward compatibility & deep inspection)
      const adminReports = allAdmins.map((a) => {
        const assignedHospital = a.hospital?.hospitalName || a.hospitalId?.hospitalName || 'Main Medical Center';
        const isAct = a.isActive !== false && a.status !== 'suspended' && a.status !== 'inactive' && a.status !== 'rejected';
        return {
          id: a._id,
          _id: a._id,
          name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Hospital Administrator',
          fullName: `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Hospital Administrator',
          email: a.email,
          phone: a.phone || '—',
          assignedHospital,
          hospitalName: assignedHospital,
          role: 'HOSPITAL_ADMIN',
          status: isAct ? 'active' : 'inactive',
          createdAt: a.createdAt,
        };
      });

      // 8. Map recent activity (clean latest 10 logs)
      const recentActivity = recentAuditLogs.map((log) => ({
        id: log._id,
        _id: log._id,
        timestamp: log.createdAt,
        createdAt: log.createdAt,
        user: log.userEmail || 'System',
        userEmail: log.userEmail || 'System',
        role: log.userRole || 'SUPER_ADMIN',
        userRole: log.userRole || 'SUPER_ADMIN',
        action: log.action,
        module: log.module,
        status: log.status || 'SUCCESS',
      }));

      // Active vs Inactive calculation
      const activeHospitalsCount = allHospitals.filter((h) => h.status === 'active' || (h.isActive !== false && h.status !== 'inactive' && h.status !== 'suspended')).length;
      const inactiveHospitalsCount = allHospitals.length - activeHospitalsCount;

      const activeAdminsCount = allAdmins.filter((a) => a.isActive !== false && a.status !== 'suspended' && a.status !== 'inactive' && a.status !== 'rejected').length;
      const inactiveAdminsCount = allAdmins.length - activeAdminsCount;

      return ApiResponse.success(res, 'Reports and analytics fetched successfully', {
        filters: {
          period: p,
          hospitalId: hospitalId || 'all',
          role: role || 'all',
          status: s,
        },
        clinicalMetrics: {
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 100,
        },
        financialMetrics: {
          totalBills,
          paidBills,
          totalRevenue,
          collectionRate: totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 100,
        },
        verificationMetrics: {
          pending: pendingVerificationCount,
          approved: approvedVerificationCount,
          rejected: rejectedVerificationCount,
          total: pendingVerificationCount + approvedVerificationCount + rejectedVerificationCount,
        },
        administrativeMetrics: {
          hospitals: {
            total: allHospitals.length,
            active: activeHospitalsCount,
            inactive: inactiveHospitalsCount,
          },
          administrators: {
            total: allAdmins.length,
            active: activeAdminsCount,
            inactive: inactiveAdminsCount,
          },
          operationalStaff: {
            total: allOperationalStaff.length,
            byRole: staffByRoleMap,
          },
          auditLogs: {
            total: auditLogsCount,
          },
          auditTrends: [
            { _id: 'hospital_management', count: auditLogsCount }
          ],
        },
        hospitalReports,
        adminReports,
        recentActivity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/hospitals
   * @desc Create a new hospital and its initial Hospital Admin in an atomic operation
   * @access Private (Super Admin only)
   */
  async createHospitalWithAdmin(req, res, next) {
    let session = null;
    let useTransaction = false;
    let newHospital = null;
    let newAdmin = null;

    try {
      const requesterRole = (
        req.user?.roleName ||
        (req.user?.role && req.user.role.name) ||
        (req.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
      ).toUpperCase();

      if (requesterRole !== 'SUPER_ADMIN') {
        throw new ApiError(403, 'Only Super Administrators are permitted to create hospitals and initial Hospital Admins.');
      }

      // Extract details from nested or flat payload
      const hospitalPayload = req.body.hospitalDetails || req.body.hospital || req.body;
      const adminPayload = req.body.adminDetails || req.body.admin || req.body;

      // Hospital Details normalization
      const hospitalName = (hospitalPayload.hospitalName || hospitalPayload.name || '').trim();
      const registrationNumber = (hospitalPayload.registrationNumber || hospitalPayload.licenseNumber || '').trim();
      const contactEmail = (hospitalPayload.contactEmail || hospitalPayload.email || '').trim().toLowerCase();
      const contactPhone = (hospitalPayload.contactPhone || hospitalPayload.phone || '').trim();
      const emergencyHotline = (hospitalPayload.emergencyHotline || hospitalPayload.hotline || '911 / 108').trim();
      const street = (hospitalPayload.address?.street || hospitalPayload.street || '').trim();
      const city = (hospitalPayload.address?.city || hospitalPayload.city || '').trim();
      const state = (hospitalPayload.address?.state || hospitalPayload.state || '').trim();
      const postalCode = (hospitalPayload.address?.postalCode || hospitalPayload.postalCode || '').trim();
      const country = (hospitalPayload.address?.country || hospitalPayload.country || '').trim();
      const currency = (hospitalPayload.currency || 'USD').trim().toUpperCase();
      const currencySymbol = (hospitalPayload.currencySymbol || (currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$')).trim();
      const timezone = (hospitalPayload.timezone || 'America/New_York').trim();
      const tagline = (hospitalPayload.tagline || `${hospitalName} Medical Center`).trim();

      // Admin Details normalization
      let firstName = (adminPayload.firstName || '').trim();
      let lastName = (adminPayload.lastName || '').trim();
      if ((!firstName || !lastName) && adminPayload.fullName) {
        const parts = adminPayload.fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || parts[0] || '';
      }
      const adminEmail = (adminPayload.email || adminPayload.loginEmail || adminPayload.username || '').trim().toLowerCase();
      const adminPhone = (adminPayload.phone || '').trim();
      const adminPassword = adminPayload.password || adminPayload.temporaryPassword || adminPayload.tempPassword || '';

      // 1. Validation - Hospital Fields
      if (!hospitalName) {
        throw new ApiError(400, 'Hospital name is required.');
      }
      if (!registrationNumber) {
        throw new ApiError(400, 'Registration / License number is required.');
      }
      if (!contactEmail) {
        throw new ApiError(400, 'Hospital contact email is required.');
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(contactEmail)) {
        throw new ApiError(400, 'Please provide a valid hospital contact email address.');
      }
      if (!contactPhone) {
        throw new ApiError(400, 'Hospital contact phone number is required.');
      }
      if (!street || !city || !state || !country) {
        throw new ApiError(400, 'Hospital address (street, city, state, and country) is required.');
      }

      // 2. Validation - Initial Hospital Admin Fields
      if (!firstName || !lastName) {
        throw new ApiError(400, 'Hospital Admin full name (first and last name) is required.');
      }
      if (!adminEmail) {
        throw new ApiError(400, 'Hospital Admin email is required.');
      }
      if (!emailRegex.test(adminEmail)) {
        throw new ApiError(400, 'Please provide a valid Hospital Admin email address.');
      }
      if (!adminPhone) {
        throw new ApiError(400, 'Hospital Admin phone number is required.');
      }
      if (!adminPassword || adminPassword.length < 8) {
        throw new ApiError(400, 'Hospital Admin password must be at least 8 characters long.');
      }

      // 3. Duplicate checks
      const cleanRegNumberEscaped = registrationNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingHospital = await HospitalSetting.findOne({
        registrationNumber: { $regex: new RegExp(`^${cleanRegNumberEscaped}$`, 'i') },
      });
      if (existingHospital) {
        throw new ApiError(400, `A hospital with registration number '${registrationNumber}' already exists.`);
      }

      const existingUser = await User.findOne({ email: adminEmail });
      if (existingUser) {
        throw new ApiError(400, `A user account with email '${adminEmail}' already exists.`);
      }

      // 4. Retrieve HOSPITAL_ADMIN role
      let roleDoc = await Role.findOne({ name: 'HOSPITAL_ADMIN' });
      if (!roleDoc) {
        roleDoc = await Role.findOne({ name: 'hospital_admin' });
      }
      if (!roleDoc) {
        throw new ApiError(500, 'System role HOSPITAL_ADMIN could not be located in database.');
      }

      // 5. Try starting a MongoDB transaction if replica set is present (otherwise compensation rollback)
      const topologyType = mongoose.connection?.client?.topology?.description?.type;
      const isReplicaSet = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

      if (isReplicaSet) {
        try {
          session = await mongoose.startSession();
          session.startTransaction();
          useTransaction = true;
        } catch (sessErr) {
          session = null;
          useTransaction = false;
        }
      }

      const opts = useTransaction && session ? { session } : {};

      // Branch Code derived from registration number
      const codeSnippet = registrationNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || '01';
      const mainBranchCode = `BR-${codeSnippet}`;

      // Create Hospital document
      newHospital = new HospitalSetting({
        hospitalName,
        registrationNumber,
        tagline,
        contactEmail,
        contactPhone,
        emergencyHotline,
        address: {
          street,
          city,
          state,
          postalCode,
          country,
        },
        currency,
        currencySymbol,
        timezone,
        status: 'active',
        isActive: true,
        branches: [
          {
            name: `${hospitalName} Main Campus`,
            code: mainBranchCode,
            isMain: true,
            address: { street, city, state, postalCode, country },
            phone: contactPhone,
            email: contactEmail,
            capacity: 100,
            isActive: true,
          },
        ],
        createdBy: req.user?._id !== 'super_admin_system' ? req.user?._id : null,
      });

      await newHospital.save(opts);

      // Create Hospital Admin user
      newAdmin = new User({
        firstName,
        lastName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: roleDoc._id,
        roleName: 'HOSPITAL_ADMIN',
        department: 'Hospital Administration',
        hospital: newHospital._id,
        hospitalId: newHospital._id,
        hospitalBranch: mainBranchCode,
        branchCode: mainBranchCode,
        status: 'active',
        isActive: true,
        isEmailVerified: true,
        createdBy: req.user?._id !== 'super_admin_system' ? req.user?._id : null,
      });

      await newAdmin.save(opts);

      // Link Admin back to Hospital
      newHospital.adminUser = newAdmin._id;
      newHospital.adminEmail = newAdmin.email;
      await newHospital.save(opts);

      // Commit transaction if active
      if (useTransaction && session) {
        await session.commitTransaction();
      }

      // Audit Logging
      const actorId = req.user?._id !== 'super_admin_system' ? req.user?._id : null;
      const actorEmail = req.user?.email || 'admin@hms.com';

      await AuditLog.create({
        user: actorId,
        userEmail: actorEmail,
        userRole: 'SUPER_ADMIN',
        action: 'HOSPITAL_CREATED',
        module: 'hospital_management',
        resourceId: String(newHospital._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          hospitalId: newHospital._id,
          hospitalName: newHospital.hospitalName,
          registrationNumber: newHospital.registrationNumber,
          adminUserId: newAdmin._id,
          adminEmail: newAdmin.email,
          actorSuperAdminId: req.user?._id || 'super_admin_system',
          timestamp: new Date().toISOString(),
        },
      });

      await AuditLog.create({
        user: actorId,
        userEmail: actorEmail,
        userRole: 'SUPER_ADMIN',
        action: 'HOSPITAL_ADMIN_CREATED',
        module: 'user_management',
        resourceId: String(newAdmin._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          adminUserId: newAdmin._id,
          adminEmail: newAdmin.email,
          hospitalId: newHospital._id,
          hospitalName: newHospital.hospitalName,
          actorSuperAdminId: req.user?._id || 'super_admin_system',
          timestamp: new Date().toISOString(),
        },
      });

      await triggerSuperAdminNotification({
        title: `Hospital Provisioned: ${newHospital.hospitalName}`,
        message: `${newHospital.hospitalName} (${newHospital.registrationNumber}) provisioned with administrator ${newAdmin.email}.`,
        type: 'hospital',
        module: 'HOSPITALS',
        priority: 'high',
        link: '/dashboard/super-admin?tab=hospitals',
        hospital: newHospital._id,
        relatedId: newHospital._id,
      });

      return ApiResponse.created(res, 'Hospital and initial Hospital Admin created successfully', {
        hospital: {
          id: newHospital._id,
          hospitalName: newHospital.hospitalName,
          registrationNumber: newHospital.registrationNumber,
          tagline: newHospital.tagline,
          contactEmail: newHospital.contactEmail,
          contactPhone: newHospital.contactPhone,
          emergencyHotline: newHospital.emergencyHotline,
          address: newHospital.address,
          currency: newHospital.currency,
          currencySymbol: newHospital.currencySymbol,
          timezone: newHospital.timezone,
          status: newHospital.status,
          createdAt: newHospital.createdAt,
        },
        admin: {
          id: newAdmin._id,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          fullName: newAdmin.fullName,
          email: newAdmin.email,
          phone: newAdmin.phone,
          role: newAdmin.roleName,
          status: newAdmin.status,
          hospitalId: newHospital._id,
          createdAt: newAdmin.createdAt,
        },
      });
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction().catch(() => {});
      } else {
        // Compensation rollback on non-replica set Mongo
        if (newHospital && newHospital._id) {
          await HospitalSetting.findByIdAndDelete(newHospital._id).catch(() => {});
        }
        if (newAdmin && newAdmin._id) {
          await User.findByIdAndDelete(newAdmin._id).catch(() => {});
        }
      }
      next(error);
    } finally {
      if (session) {
        session.endSession().catch(() => {});
      }
    }
  }

  /**
   * @route GET /api/v1/super-admin/hospitals
   * @desc List all hospitals with linked Hospital Admin metadata
   * @access Private (Super Admin only)
   */
  async getHospitals(req, res, next) {
    try {
      const { search, status } = req.query;

      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { hospitalName: new RegExp(search, 'i') },
          { registrationNumber: new RegExp(search, 'i') },
          { contactEmail: new RegExp(search, 'i') },
          { contactPhone: new RegExp(search, 'i') },
          { 'address.city': new RegExp(search, 'i') },
          { 'address.country': new RegExp(search, 'i') },
        ];
      }

      let hospitals = await HospitalSetting.find(query)
        .populate('adminUser', 'firstName lastName email phone status isActive createdAt')
        .sort({ createdAt: -1 });

      // Fallback query if no hospital settings exist
      if (!hospitals || hospitals.length === 0) {
        let single = await HospitalSetting.findOne();
        if (!single) {
          single = await HospitalSetting.create({});
        }
        hospitals = [single];
      }

      // Find all hospital admins to ensure every hospital displays its admin
      const allAdmins = await User.find({ roleName: 'HOSPITAL_ADMIN' })
        .select('firstName lastName email phone status isActive hospital hospitalId hospitalBranch createdAt');

      const mappedHospitals = hospitals.map((h) => {
        // Resolve linked admin
        let admin = h.adminUser;
        if (!admin) {
          admin = allAdmins.find(
            (u) =>
              (u.hospital && String(u.hospital) === String(h._id)) ||
              (u.hospitalId && String(u.hospitalId) === String(h._id)) ||
              (h.branches && h.branches.some((b) => b.code === u.hospitalBranch))
          );
        }

        const city = h.address?.city || '';
        const state = h.address?.state || '';
        const country = h.address?.country || '';
        const locParts = [city, state, country].filter(Boolean);
        const locationStr = locParts.length > 0 ? locParts.join(', ') : 'Metropolis, NY, USA';

        return {
          id: h._id,
          hospitalName: h.hospitalName,
          name: h.hospitalName,
          registrationNumber: h.registrationNumber,
          tagline: h.tagline,
          contactEmail: h.contactEmail,
          contactPhone: h.contactPhone,
          emergencyHotline: h.emergencyHotline,
          location: locationStr,
          address: h.address,
          currency: h.currency || 'USD',
          currencySymbol: h.currencySymbol || '$',
          timezone: h.timezone || 'America/New_York',
          status: h.status || (h.isActive !== false ? 'active' : 'inactive'),
          createdAt: h.createdAt,
          branchesCount: h.branches?.length || 1,
          adminUser: admin
            ? {
                id: admin._id,
                name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Hospital Administrator',
                fullName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Hospital Administrator',
                email: admin.email,
                phone: admin.phone || h.contactPhone,
                status: admin.status || 'active',
              }
            : null,
          adminName: admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : 'Hospital Administrator',
          adminEmail: admin ? admin.email : (h.adminEmail || h.contactEmail),
          adminPhone: admin ? (admin.phone || h.contactPhone) : h.contactPhone,
          adminStatus: admin ? (admin.status || 'active') : 'active',
        };
      });

      return ApiResponse.success(res, 'Hospitals fetched successfully', {
        hospitals: mappedHospitals,
        total: mappedHospitals.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/hospitals/:id
   * @desc Get single hospital details with linked Hospital Admin
   * @access Private (Super Admin only)
   */
  async getHospitalById(req, res, next) {
    try {
      const { id } = req.params;

      let hospital = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        hospital = await HospitalSetting.findById(id).populate(
          'adminUser',
          'firstName lastName email phone status isActive createdAt'
        );
      }

      if (!hospital) {
        hospital = await HospitalSetting.findOne({
          $or: [{ registrationNumber: id }, { hospitalName: id }],
        }).populate('adminUser', 'firstName lastName email phone status isActive createdAt');
      }

      if (!hospital) {
        throw new ApiError(404, `Hospital not found with identifier '${id}'.`);
      }

      // Resolve linked admin if not directly populated
      let admin = hospital.adminUser;
      if (!admin) {
        admin = await User.findOne({
          roleName: 'HOSPITAL_ADMIN',
          $or: [
            { hospital: hospital._id },
            { hospitalId: hospital._id },
            { hospitalBranch: hospital.branches?.[0]?.code },
          ],
        }).select('-password -refreshTokens');
      }

      const city = hospital.address?.city || '';
      const state = hospital.address?.state || '';
      const country = hospital.address?.country || '';
      const locParts = [city, state, country].filter(Boolean);
      const locationStr = locParts.length > 0 ? locParts.join(', ') : 'Metropolis, NY, USA';

      return ApiResponse.success(res, 'Hospital retrieved successfully', {
        hospital: {
          id: hospital._id,
          name: hospital.hospitalName,
          hospitalName: hospital.hospitalName,
          registrationNumber: hospital.registrationNumber,
          tagline: hospital.tagline,
          contactEmail: hospital.contactEmail,
          contactPhone: hospital.contactPhone,
          emergencyHotline: hospital.emergencyHotline,
          location: locationStr,
          address: hospital.address,
          currency: hospital.currency,
          currencySymbol: hospital.currencySymbol,
          timezone: hospital.timezone,
          status: hospital.status || 'active',
          branches: hospital.branches,
          servicesCount: hospital.services?.length || 0,
          createdAt: hospital.createdAt,
        },
        admin: admin
          ? {
              id: admin._id,
              name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Hospital Administrator',
              fullName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Hospital Administrator',
              email: admin.email,
              phone: admin.phone || hospital.contactPhone,
              status: admin.status || 'active',
              createdAt: admin.createdAt,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/notifications
   * @desc Get system and administrative alerts for Super Admin with filtering, search, and pagination
   * @access Private (Super Admin only)
   */
  async getNotifications(req, res, next) {
    try {
      const {
        status = 'all',
        type = 'all',
        search = '',
        priority = 'all',
        page = 1,
        limit = 20,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const recipientId = req.user?._id || 'super_admin_system';
      const baseFilter = {
        $or: [
          { recipient: recipientId },
          { recipient: 'super_admin_system' },
          { type: 'system' },
        ],
      };

      const queryFilter = { ...baseFilter };

      // Status filter: all | unread | read
      if (status === 'unread' || status === 'false') {
        queryFilter.isRead = false;
      } else if (status === 'read' || status === 'true') {
        queryFilter.isRead = true;
      }

      // Type filter
      if (type && type !== 'all') {
        queryFilter.type = type.toLowerCase();
      }

      // Priority filter
      if (priority && priority !== 'all') {
        queryFilter.priority = priority.toLowerCase();
      }

      // Search term (searches title, message, module, type)
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        queryFilter.$and = [
          {
            $or: [
              { title: regex },
              { message: regex },
              { module: regex },
              { type: regex },
            ],
          },
        ];
      }

      const [notifications, totalFiltered, totalAll, totalUnread] = await Promise.all([
        Notification.find(queryFilter)
          .populate('hospital', 'hospitalName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notification.countDocuments(queryFilter),
        Notification.countDocuments(baseFilter),
        Notification.countDocuments({ ...baseFilter, isRead: false }),
      ]);

      const totalRead = Math.max(0, totalAll - totalUnread);

      return ApiResponse.success(res, 'Notifications retrieved successfully', {
        notifications,
        unreadCount: totalUnread,
        stats: {
          total: totalAll,
          unread: totalUnread,
          read: totalRead,
        },
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalFiltered / limitNum) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/notifications/unread-count
   * @desc Get live unread notification count for Super Admin
   * @access Private (Super Admin only)
   */
  async getUnreadNotificationCount(req, res, next) {
    try {
      const recipientId = req.user?._id || 'super_admin_system';
      const unreadCount = await Notification.countDocuments({
        $or: [
          { recipient: recipientId },
          { recipient: 'super_admin_system' },
          { type: 'system' },
        ],
        isRead: false,
      });

      return ApiResponse.success(res, 'Unread notification count retrieved', { unreadCount });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/notifications/:id/read
   * @desc Mark notification as read
   * @access Private (Super Admin only)
   */
  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid notification identifier.');
      }
      const notif = await Notification.findByIdAndUpdate(
        id,
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      if (!notif) {
        throw new ApiError(404, 'Notification not found.');
      }
      return ApiResponse.success(res, 'Notification marked as read', notif);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/notifications/read-all
   * @desc Mark all notifications as read for current Super Admin
   * @access Private (Super Admin only)
   */
  async markAllNotificationsRead(req, res, next) {
    try {
      const recipientId = req.user?._id || 'super_admin_system';
      const result = await Notification.updateMany(
        {
          $or: [
            { recipient: recipientId },
            { recipient: 'super_admin_system' },
            { type: 'system' },
          ],
          isRead: false,
        },
        { isRead: true, readAt: new Date() }
      );
      return ApiResponse.success(res, 'All notifications marked as read', { modifiedCount: result.modifiedCount });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route DELETE /api/v1/super-admin/notifications/:id
   * @desc Delete or dismiss a notification
   * @access Private (Super Admin only)
   */
  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid notification identifier.');
      }
      const notif = await Notification.findByIdAndDelete(id);
      if (!notif) {
        throw new ApiError(404, 'Notification not found.');
      }
      return ApiResponse.success(res, 'Notification deleted successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * @route PUT /api/v1/super-admin/hospitals/:id
   * @desc Update hospital details
   * @access Private (Super Admin only)
   */
  /**
   * @route PUT /api/v1/super-admin/hospitals/:id
   * @desc Update hospital details and linked Hospital Admin details
   * @access Private (Super Admin only)
   */
  async updateHospital(req, res, next) {
    try {
      const { id } = req.params;

      // Extract hospital and admin payloads (supports nested hospitalDetails/adminDetails or flat format)
      const hData = req.body.hospitalDetails || req.body.hospital || req.body;
      const aData = req.body.adminDetails || req.body.admin || {
        fullName: req.body.adminFullName || req.body.adminName,
        email: req.body.adminEmail,
        phone: req.body.adminPhone,
        status: req.body.adminStatus,
      };

      const hospital = await HospitalSetting.findById(id);
      if (!hospital) {
        throw new ApiError(404, `Hospital not found with id '${id}'.`);
      }

      // Build hospital $set fields object for atomic targeted update
      const hospitalSetFields = {};

      const finalHospitalName = hData.hospitalName || hData.name || hospital.hospitalName;
      const finalRegNum = hData.registrationNumber || hospital.registrationNumber;
      const finalEmail = (hData.contactEmail || hospital.contactEmail || '').toLowerCase();

      // Duplicate registration number check
      if (finalRegNum && finalRegNum !== hospital.registrationNumber) {
        const dupReg = await HospitalSetting.findOne({
          registrationNumber: finalRegNum,
          _id: { $ne: hospital._id },
        });
        if (dupReg) {
          throw new ApiError(409, `Registration number '${finalRegNum}' is already assigned to another hospital.`);
        }
      }

      // Duplicate hospital contact email check
      if (finalEmail && finalEmail !== (hospital.contactEmail || '').toLowerCase()) {
        const dupEmail = await HospitalSetting.findOne({
          contactEmail: finalEmail,
          _id: { $ne: hospital._id },
        });
        if (dupEmail) {
          throw new ApiError(409, `Hospital email '${finalEmail}' is already used by another hospital.`);
        }
      }

      // Collect Hospital field changes
      if (finalHospitalName) hospitalSetFields.hospitalName = finalHospitalName;
      if (finalRegNum) hospitalSetFields.registrationNumber = finalRegNum;
      if (hData.tagline !== undefined) hospitalSetFields.tagline = hData.tagline;
      if (finalEmail) hospitalSetFields.contactEmail = finalEmail;
      if (hData.contactPhone !== undefined) hospitalSetFields.contactPhone = hData.contactPhone;
      if (hData.emergencyHotline !== undefined) hospitalSetFields.emergencyHotline = hData.emergencyHotline;
      if (hData.currency !== undefined) hospitalSetFields.currency = hData.currency;
      if (hData.currencySymbol !== undefined) hospitalSetFields.currencySymbol = hData.currencySymbol;
      if (hData.timezone !== undefined) hospitalSetFields.timezone = hData.timezone;
      if (hData.status !== undefined) {
        const validHospitalStatuses = ['active', 'inactive', 'pending', 'suspended'];
        const normalizedStatus = String(hData.status).toLowerCase();
        hospitalSetFields.status = validHospitalStatuses.includes(normalizedStatus) ? normalizedStatus : hospital.status;
        hospitalSetFields.isActive = hospitalSetFields.status === 'active';
      }

      const addressData = hData.address || (hData.street !== undefined ? {
        street: hData.street,
        city: hData.city,
        state: hData.state,
        postalCode: hData.postalCode,
        country: hData.country,
      } : null);

      if (addressData) {
        hospitalSetFields['address.street'] = addressData.street !== undefined ? addressData.street : hospital.address?.street;
        hospitalSetFields['address.city'] = addressData.city !== undefined ? addressData.city : hospital.address?.city;
        hospitalSetFields['address.state'] = addressData.state !== undefined ? addressData.state : hospital.address?.state;
        hospitalSetFields['address.postalCode'] = addressData.postalCode !== undefined ? addressData.postalCode : hospital.address?.postalCode;
        hospitalSetFields['address.country'] = addressData.country !== undefined ? addressData.country : hospital.address?.country;
      }

      // ─── Resolve and Update Linked HOSPITAL_ADMIN ─────────────────
      // NOTE: Fetch with +password so Mongoose doesn't fail required validation
      // on the password field when calling .save() on the user document.
      let adminUser = null;
      if (hospital.adminUser) {
        adminUser = await User.findById(hospital.adminUser).select('+password');
      }
      if (!adminUser) {
        adminUser = await User.findOne({
          roleName: 'HOSPITAL_ADMIN',
          $or: [
            { hospital: hospital._id },
            { hospitalId: hospital._id },
          ],
        }).select('+password');
      }

      let adminUpdated = false;
      if (adminUser && (
        aData.fullName ||
        aData.name ||
        aData.email ||
        aData.phone !== undefined ||
        aData.status !== undefined ||
        aData.firstName ||
        aData.lastName
      )) {
        // Build $set update object for atomic, targeted update
        const adminSetFields = {};

        // ── Validate & update Admin Email ───────────────────────────
        const targetAdminEmail = aData.email ? aData.email.trim().toLowerCase() : null;
        if (targetAdminEmail && targetAdminEmail !== adminUser.email.toLowerCase()) {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(targetAdminEmail)) {
            throw new ApiError(400, 'Invalid admin email address format.');
          }

          const dupAdmin = await User.findOne({
            email: targetAdminEmail,
            _id: { $ne: adminUser._id },
          });
          if (dupAdmin) {
            throw new ApiError(409, `Email address '${targetAdminEmail}' is already associated with another user account.`);
          }

          adminSetFields.email = targetAdminEmail;
          adminUser.email = targetAdminEmail;
          hospital.adminEmail = targetAdminEmail;
          adminUpdated = true;
        }

        // ── Update Full Name ────────────────────────────────────────
        // Safe split: if only one word, keep the existing lastName rather than setting ''
        const fullNameInput = (aData.fullName || aData.name || '').trim();
        if (fullNameInput) {
          const nameParts = fullNameInput.split(/\s+/);
          const newFirstName = nameParts[0] || adminUser.firstName;
          // Preserve existing lastName if no last-name part is provided
          const newLastName = nameParts.length > 1
            ? nameParts.slice(1).join(' ')
            : adminUser.lastName;

          if (!newFirstName) {
            throw new ApiError(400, 'Administrator first name cannot be empty.');
          }
          if (!newLastName) {
            throw new ApiError(400, 'Administrator last name is required. Please provide a full name (first and last).');
          }

          adminSetFields.firstName = newFirstName;
          adminSetFields.lastName = newLastName;
          adminUser.firstName = newFirstName;
          adminUser.lastName = newLastName;
          adminUpdated = true;
        } else {
          // Handle separate firstName / lastName fields
          if (aData.firstName !== undefined && aData.firstName.trim()) {
            adminSetFields.firstName = aData.firstName.trim();
            adminUser.firstName = aData.firstName.trim();
            adminUpdated = true;
          }
          if (aData.lastName !== undefined && aData.lastName.trim()) {
            adminSetFields.lastName = aData.lastName.trim();
            adminUser.lastName = aData.lastName.trim();
            adminUpdated = true;
          }
        }

        // ── Update Phone ────────────────────────────────────────────
        if (aData.phone !== undefined) {
          adminSetFields.phone = (aData.phone || '').trim();
          adminUser.phone = adminSetFields.phone;
          adminUpdated = true;
        }

        // ── Update Account Status ───────────────────────────────────
        if (aData.status !== undefined) {
          const rawStatus = String(aData.status).toLowerCase();
          const validAdminStatuses = ['active', 'suspended', 'inactive', 'pending'];
          const targetStatus = validAdminStatuses.includes(rawStatus) ? rawStatus : adminUser.status;
          adminSetFields.status = targetStatus;
          adminSetFields.isActive = targetStatus === 'active';
          adminUser.status = targetStatus;
          adminUser.isActive = targetStatus === 'active';
          adminUpdated = true;
        }

        // ── Enforce role invariants ─────────────────────────────────
        // Role must always remain HOSPITAL_ADMIN and be linked to this hospital.
        adminSetFields.roleName = 'HOSPITAL_ADMIN';
        adminSetFields.hospital = hospital._id;
        adminSetFields.hospitalId = hospital._id;
        adminUser.roleName = 'HOSPITAL_ADMIN';
        adminUser.hospital = hospital._id;
        adminUser.hospitalId = hospital._id;

        if (adminUpdated) {
          // Use findByIdAndUpdate with $set to perform a targeted field update.
          // This avoids full document re-validation which would require the
          // password field (select:false) and other non-loaded required fields.
          await User.findByIdAndUpdate(
            adminUser._id,
            { $set: adminSetFields },
            { runValidators: false, new: false }
          );
        }

        hospital.adminUser = adminUser._id;
        hospital.adminEmail = adminUser.email;
        // Keep hospitalSetFields in sync with the linked admin
        hospitalSetFields.adminUser = adminUser._id;
        hospitalSetFields.adminEmail = adminUser.email;
      }

      // Persist hospital changes using findByIdAndUpdate to avoid
      // full-document re-validation on complex subdocuments (branches, services, etc.)
      const updatedHospital = await HospitalSetting.findByIdAndUpdate(
        hospital._id,
        { $set: hospitalSetFields },
        { new: true, runValidators: false }
      );

      const finalHospital = updatedHospital || hospital;

      // Audit Log Creation
      const actorId = req.user?._id !== 'super_admin_system' ? req.user?._id : null;
      const actorEmail = req.user?.email || 'admin@hms.com';

      await AuditLog.create({
        user: actorId,
        userEmail: actorEmail,
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_HOSPITAL',
        module: 'hospital_management',
        resourceId: String(finalHospital._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          hospitalId: finalHospital._id,
          hospitalName: finalHospital.hospitalName,
          registrationNumber: finalHospital.registrationNumber,
          linkedAdminId: adminUser ? String(adminUser._id) : null,
          linkedAdminEmail: adminUser ? adminUser.email : null,
          adminUpdated,
          changedHospitalFields: Object.keys(hospitalSetFields),
          timestamp: new Date().toISOString(),
        },
      });

      await triggerSuperAdminNotification({
        title: `Hospital Updated: ${finalHospital.hospitalName}`,
        message: `Profile and operational configurations updated for ${finalHospital.hospitalName}.${adminUpdated ? ' Linked administrator credentials were also modified.' : ''}`,
        type: 'hospital',
        module: 'HOSPITALS',
        priority: 'medium',
        link: '/dashboard/super-admin?tab=hospitals',
        hospital: finalHospital._id,
        relatedId: finalHospital._id,
      });

      const safeAdmin = adminUser
        ? {
            id: adminUser._id,
            name: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Hospital Administrator',
            fullName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Hospital Administrator',
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            email: adminUser.email,
            phone: adminUser.phone,
            role: 'HOSPITAL_ADMIN',
            roleName: 'HOSPITAL_ADMIN',
            status: adminUser.status,
            isActive: adminUser.isActive,
          }
        : null;

      const safeHospital = {
        id: finalHospital._id,
        _id: finalHospital._id,
        name: finalHospital.hospitalName,
        hospitalName: finalHospital.hospitalName,
        registrationNumber: finalHospital.registrationNumber,
        tagline: finalHospital.tagline,
        contactEmail: finalHospital.contactEmail,
        contactPhone: finalHospital.contactPhone,
        emergencyHotline: finalHospital.emergencyHotline,
        address: finalHospital.address,
        location: [finalHospital.address?.city, finalHospital.address?.state, finalHospital.address?.country].filter(Boolean).join(', '),
        currency: finalHospital.currency,
        currencySymbol: finalHospital.currencySymbol,
        timezone: finalHospital.timezone,
        status: finalHospital.status,
        isActive: finalHospital.isActive,
        adminUser: safeAdmin,
        adminName: safeAdmin ? safeAdmin.fullName : 'Hospital Administrator',
        adminEmail: safeAdmin ? safeAdmin.email : (finalHospital.adminEmail || finalHospital.contactEmail),
        adminPhone: safeAdmin ? safeAdmin.phone : finalHospital.contactPhone,
        adminStatus: safeAdmin ? safeAdmin.status : 'active',
        updatedAt: finalHospital.updatedAt,
      };

      return ApiResponse.success(res, 'Hospital and Hospital Admin details updated successfully', {
        hospital: safeHospital,
        admin: safeAdmin,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/hospitals/:id/status
   * @desc Activate or Deactivate hospital
   * @access Private (Super Admin only)
   */
  async toggleHospitalStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const hospital = await HospitalSetting.findById(id);
      if (!hospital) {
        throw new ApiError(404, `Hospital not found with id '${id}'.`);
      }

      let newStatus = status;
      if (!newStatus) {
        newStatus = hospital.status === 'active' ? 'inactive' : 'active';
      }

      hospital.status = newStatus;
      hospital.isActive = newStatus === 'active';
      await hospital.save();

      // Audit Log
      const actorId = req.user?._id !== 'super_admin_system' ? req.user?._id : null;
      const actorEmail = req.user?.email || 'admin@hms.com';

      await AuditLog.create({
        user: actorId,
        userEmail: actorEmail,
        userRole: 'SUPER_ADMIN',
        action: newStatus === 'active' ? 'HOSPITAL_ACTIVATED' : 'HOSPITAL_DEACTIVATED',
        module: 'hospital_management',
        resourceId: String(hospital._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          hospitalId: hospital._id,
          hospitalName: hospital.hospitalName,
          previousStatus: hospital.status,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      await triggerSuperAdminNotification({
        title: `Hospital ${newStatus === 'active' ? 'Activated' : 'Deactivated'}: ${hospital.hospitalName}`,
        message: `Hospital status for ${hospital.hospitalName} changed to ${newStatus.toUpperCase()}.`,
        type: 'hospital',
        module: 'HOSPITALS',
        priority: newStatus === 'active' ? 'medium' : 'high',
        link: '/dashboard/super-admin?tab=hospitals',
        hospital: hospital._id,
        relatedId: hospital._id,
      });

      return ApiResponse.success(res, `Hospital successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`, {
        id: hospital._id,
        hospitalName: hospital.hospitalName,
        status: hospital.status,
        isActive: hospital.isActive,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/hospital-admins
   * @desc List all Hospital Admins with linked Hospital info
   * @access Private (Super Admin only)
   */
  async getHospitalAdmins(req, res, next) {
    try {
      const { search, status } = req.query;

      const query = { roleName: 'HOSPITAL_ADMIN' };
      if (status && status !== 'all') {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { firstName: new RegExp(search, 'i') },
          { lastName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ];
      }

      const admins = await User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 });

      const allHospitals = await HospitalSetting.find().lean();

      const mappedAdmins = admins.map((admin) => {
        let assignedHospital = allHospitals.find(
          (h) =>
            (admin.hospital && String(admin.hospital) === String(h._id)) ||
            (admin.hospitalId && String(admin.hospitalId) === String(h._id)) ||
            (h.adminUser && String(h.adminUser) === String(admin._id)) ||
            (h.adminEmail && h.adminEmail.toLowerCase() === admin.email.toLowerCase()) ||
            (h.branches && h.branches.some((b) => b.code === admin.hospitalBranch))
        );

        if (!assignedHospital && allHospitals.length > 0) {
          assignedHospital = allHospitals[0];
        }

        const fullName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email;

        return {
          id: admin._id,
          _id: admin._id,
          name: fullName,
          fullName,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone || assignedHospital?.contactPhone || 'N/A',
          role: 'HOSPITAL_ADMIN',
          status: admin.status || (admin.isActive !== false ? 'active' : 'inactive'),
          isActive: admin.isActive !== false,
          assignedHospital: assignedHospital
            ? {
                id: assignedHospital._id,
                name: assignedHospital.hospitalName,
                hospitalName: assignedHospital.hospitalName,
                registrationNumber: assignedHospital.registrationNumber,
                city: assignedHospital.address?.city || '',
                country: assignedHospital.address?.country || '',
              }
            : null,
          hospitalName: assignedHospital?.hospitalName || 'Unassigned Hospital',
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        };
      });

      return ApiResponse.success(res, 'Hospital admins fetched successfully', {
        admins: mappedAdmins,
        total: mappedAdmins.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/hospital-admins/:id
   * @desc Get single Hospital Admin details
   * @access Private (Super Admin only)
   */
  async getHospitalAdminById(req, res, next) {
    try {
      const { id } = req.params;

      const admin = await User.findOne({ _id: id, roleName: 'HOSPITAL_ADMIN' }).select('-password -refreshTokens');
      if (!admin) {
        throw new ApiError(404, `Hospital admin not found with id '${id}'.`);
      }

      const allHospitals = await HospitalSetting.find().lean();
      let assignedHospital = allHospitals.find(
        (h) =>
          (admin.hospital && String(admin.hospital) === String(h._id)) ||
          (admin.hospitalId && String(admin.hospitalId) === String(h._id)) ||
          (h.adminUser && String(h.adminUser) === String(admin._id)) ||
          (h.adminEmail && h.adminEmail.toLowerCase() === admin.email.toLowerCase())
      );

      if (!assignedHospital && allHospitals.length > 0) {
        assignedHospital = allHospitals[0];
      }

      const fullName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email;

      return ApiResponse.success(res, 'Hospital admin retrieved successfully', {
        admin: {
          id: admin._id,
          _id: admin._id,
          name: fullName,
          fullName,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone || assignedHospital?.contactPhone || 'N/A',
          role: 'HOSPITAL_ADMIN',
          status: admin.status || (admin.isActive !== false ? 'active' : 'inactive'),
          isActive: admin.isActive !== false,
          hospital: assignedHospital
            ? {
                id: assignedHospital._id,
                name: assignedHospital.hospitalName,
                hospitalName: assignedHospital.hospitalName,
                registrationNumber: assignedHospital.registrationNumber,
                city: assignedHospital.address?.city || '',
                country: assignedHospital.address?.country || '',
              }
            : null,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/super-admin/hospital-admins/:id/status
   * @desc Activate or Deactivate Hospital Admin
   * @access Private (Super Admin only)
   */
  async toggleHospitalAdminStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const admin = await User.findOne({ _id: id, roleName: 'HOSPITAL_ADMIN' });
      if (!admin) {
        throw new ApiError(404, `Hospital admin not found with id '${id}'.`);
      }

      let newStatus = status;
      if (!newStatus) {
        newStatus = admin.status === 'active' ? 'inactive' : 'active';
      }

      admin.status = newStatus;
      admin.isActive = newStatus === 'active';
      await admin.save();

      // Audit Log
      const actorId = req.user?._id !== 'super_admin_system' ? req.user?._id : null;
      const actorEmail = req.user?.email || 'admin@hms.com';

      await AuditLog.create({
        user: actorId,
        userEmail: actorEmail,
        userRole: 'SUPER_ADMIN',
        action: newStatus === 'active' ? 'HOSPITAL_ADMIN_ACTIVATED' : 'HOSPITAL_ADMIN_DEACTIVATED',
        module: 'user_management',
        resourceId: String(admin._id),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          adminUserId: admin._id,
          adminEmail: admin.email,
          previousStatus: admin.status,
          newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      await triggerSuperAdminNotification({
        title: `Hospital Admin ${newStatus === 'active' ? 'Activated' : 'Deactivated'}: ${admin.email}`,
        message: `Administrator account ${admin.email} status changed to ${newStatus.toUpperCase()}.`,
        type: 'admin',
        module: 'HOSPITAL_ADMIN',
        priority: newStatus === 'active' ? 'medium' : 'high',
        link: '/dashboard/super-admin?tab=hospital-admins',
        relatedId: admin._id,
      });

      return ApiResponse.success(res, `Hospital admin successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`, {
        id: admin._id,
        email: admin.email,
        status: admin.status,
        isActive: admin.isActive,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/profile
   * @desc Retrieve authenticated Super Admin profile information
   */
  async getSuperAdminProfile(req, res, next) {
    try {
      const user = await findSuperAdminUser(req);

      const profile = {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Super Administrator',
        email: user.email,
        phone: user.phone || '',
        address: user.address || {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        profileImage: user.profileImage || '',
        roleName: 'SUPER_ADMIN',
        role: {
          name: 'SUPER_ADMIN',
          displayName: 'Super Administrator',
          permissions: ['*'],
        },
        status: user.status || 'active',
        isActive: user.isActive ?? true,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        session: {
          currentSession: 'Active',
          lastLogin: user.lastLogin || user.updatedAt || new Date(),
          loginTime: user.lastLogin || user.updatedAt || new Date(),
          device: req.headers['user-agent'] || 'Web Browser',
          ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
          authType: 'JWT Session',
        },
      };

      return ApiResponse.success(res, 'Super Admin profile retrieved successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/super-admin/profile
   * @route PATCH /api/v1/super-admin/profile
   * @desc Update authenticated Super Admin profile information (name, phone, address)
   */
  async updateSuperAdminProfile(req, res, next) {
    try {
      const user = await findSuperAdminUser(req);

      // Security check: Never allow modifying protected security fields
      if (req.body.role || req.body.roleName || req.body.permissions || req.body.email || req.body.password) {
        logger.warn(`Security warning: Super Admin ${user.email} attempted modifying protected fields via profile update.`);
      }

      const { firstName, lastName, phone, address } = req.body;
      const updatedFields = [];

      if (firstName !== undefined) {
        if (!firstName.trim()) {
          throw new ApiError(400, 'First name cannot be empty.');
        }
        user.firstName = firstName.trim();
        updatedFields.push('firstName');
      }

      if (lastName !== undefined) {
        if (!lastName.trim()) {
          throw new ApiError(400, 'Last name cannot be empty.');
        }
        user.lastName = lastName.trim();
        updatedFields.push('lastName');
      }

      if (phone !== undefined) {
        user.phone = phone.trim();
        updatedFields.push('phone');
      }

      if (address !== undefined && typeof address === 'object') {
        user.address = {
          street: address.street !== undefined ? address.street.trim() : (user.address?.street || ''),
          city: address.city !== undefined ? address.city.trim() : (user.address?.city || ''),
          state: address.state !== undefined ? address.state.trim() : (user.address?.state || ''),
          postalCode: address.postalCode !== undefined ? address.postalCode.trim() : (user.address?.postalCode || ''),
          country: address.country !== undefined ? address.country.trim() : (user.address?.country || ''),
        };
        updatedFields.push('address');
      }

      await user.save({ validateBeforeSave: false });

      // Create Audit Log
      await AuditLog.create({
        user: user._id && mongoose.Types.ObjectId.isValid(user._id) ? user._id : null,
        userEmail: user.email,
        userRole: 'SUPER_ADMIN',
        action: 'PROFILE_UPDATED',
        module: 'auth',
        ipAddress: req.ip || req.connection?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          description: 'Super Administrator profile details updated.',
          updatedFields,
        },
      });

      const updatedProfile = {
        id: user._id,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone || '',
        address: user.address,
        profileImage: user.profileImage || '',
        roleName: 'SUPER_ADMIN',
        role: {
          name: 'SUPER_ADMIN',
          displayName: 'Super Administrator',
        },
        status: user.status || 'active',
        isActive: user.isActive ?? true,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };

      return ApiResponse.success(res, 'Profile updated successfully.', updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/super-admin/profile/password
   * @route POST /api/v1/super-admin/profile/password
   * @desc Change Super Admin password securely
   */
  async changeSuperAdminProfilePassword(req, res, next) {
    try {
      const { currentPassword, newPassword, confirmNewPassword, confirmPassword } = req.body;
      const confirmation = confirmNewPassword || confirmPassword;

      if (!currentPassword) {
        throw new ApiError(400, 'Current password is required.');
      }
      if (!newPassword) {
        throw new ApiError(400, 'New password is required.');
      }
      if (newPassword.length < 8) {
        throw new ApiError(400, 'New password must be at least 8 characters long.');
      }
      if (confirmation && newPassword !== confirmation) {
        throw new ApiError(400, 'New password and confirmation password do not match.');
      }
      if (currentPassword === newPassword) {
        throw new ApiError(400, 'New password cannot be identical to your current password.');
      }

      const user = await findSuperAdminUser(req);
      const ipAddress = req.ip || req.connection?.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const userId = user._id ? user._id : 'super_admin_system';
      const result = await authService.changePassword(userId, currentPassword, newPassword, ipAddress, userAgent);

      return ApiResponse.success(res, result.message || 'Password changed successfully.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SuperAdminController();
