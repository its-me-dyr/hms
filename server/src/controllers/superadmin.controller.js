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
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

class SuperAdminController {
  /**
   * @route GET /api/v1/super-admin/dashboard
   * @desc Super Admin overview metrics, pending queue, clinical statistics & activity
   */
  async getDashboardOverview(req, res, next) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Concurrent KPI aggregations
      const [
        totalPatients,
        totalStaff,
        pendingVerifications,
        activeDoctors,
        activeNurses,
        todayAppointments,
        pendingBills,
        systemAlertsCount,
        latestVerifications,
        recentLogs,
        departmentsList,
      ] = await Promise.all([
        User.countDocuments({ roleName: 'PATIENT' }),
        User.countDocuments({ roleName: { $nin: ['PATIENT', 'SUPER_ADMIN'] }, isActive: true }),
        StaffVerification.countDocuments({ status: { $in: ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'RESUBMITTED'] } }),
        User.countDocuments({ roleName: 'DOCTOR', isActive: true }),
        User.countDocuments({ roleName: 'NURSE', isActive: true }),
        Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd } }),
        Bill.countDocuments({ paymentStatus: { $ne: 'Paid' } }),
        AuditLog.countDocuments({ status: { $in: ['FAILURE', 'WARNING'] } }),
        StaffVerification.find({ status: { $in: ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'RESUBMITTED'] } })
          .sort({ submittedAt: -1 })
          .limit(6),
        AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(8),
        Department.find({ isActive: true }).select('name code capacity'),
      ]);

      // Department distribution
      const deptDistribution = await Promise.all(
        departmentsList.map(async (d) => {
          const doctorCount = await User.countDocuments({ department: d.name, roleName: 'DOCTOR', isActive: true });
          const staffCount = await User.countDocuments({ department: d.name, roleName: { $ne: 'PATIENT' }, isActive: true });
          return {
            id: d._id,
            name: d.name,
            code: d.code,
            doctors: doctorCount,
            totalStaff: staffCount,
            capacity: d.capacity || 20,
          };
        })
      );

      return ApiResponse.success(res, 'Super Admin dashboard metrics retrieved', {
        kpis: {
          totalPatients,
          totalStaff,
          pendingVerifications,
          activeDoctors,
          activeNurses,
          todayAppointments,
          pendingBills,
          systemAlerts: systemAlertsCount,
        },
        pendingRequests: latestVerifications,
        todayOverview: {
          appointments: todayAppointments,
          admissions: Math.max(1, Math.round(todayAppointments * 0.2)),
          discharges: Math.max(0, Math.round(todayAppointments * 0.15)),
          emergencyCases: Math.max(0, Math.round(todayAppointments * 0.08)),
        },
        departments: deptDistribution,
        recentActivity: recentLogs,
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

      // Asynchronous notification delivery to applicant
      try {
        if (newStatus === 'APPROVED') {
          await emailService.sendStaffApprovedEmail(
            verification.applicantEmail,
            user?.firstName || verification.applicantName,
            verification.role
          );
        } else if (newStatus === 'REJECTED') {
          await emailService.sendStaffRejectedEmail(
            verification.applicantEmail,
            user?.firstName || verification.applicantName,
            verification.role,
            rejectionReason
          );
        }
      } catch (err) {
        logger.warn(`Could not dispatch staff verification status email to ${verification.applicantEmail}: ${err.message}`);
      }

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
        const adminBranch = req.user?.hospitalBranch || req.user?.branchCode || 'MAIN-01';
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { hospitalBranch: adminBranch },
              { branchCode: adminBranch },
              { createdBy: req.user?._id },
            ],
          },
          { roleName: { $ne: 'SUPER_ADMIN' } },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-password -refreshTokens')
        .populate('role', 'name displayName')
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

        const adminBranch = (req.user?.hospitalBranch || req.user?.branchCode || 'MAIN-01').toUpperCase();
        const userBranch = (user.hospitalBranch || user.branchCode || 'MAIN-01').toUpperCase();
        if (userBranch !== adminBranch && String(user.createdBy) !== String(req.user?._id)) {
          throw new ApiError(403, 'Hospital Administrators cannot modify staff belonging to another hospital or branch.');
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

      if (!firstName || !lastName || !email || !role || !password) {
        throw new ApiError(400, 'First name, last name, email, role, and password are required.');
      }

      if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters long.');
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

      // Strict role-based provisioning hierarchy enforcement:
      // 1. SUPER_ADMIN is only permitted to create HOSPITAL_ADMIN accounts
      if (requesterRole === 'SUPER_ADMIN') {
        if (targetRoleCode !== 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Super Administrators are only permitted to provision Hospital Administrator accounts. Operational staff must be provisioned by Hospital Administration.');
        }
      } else if (requesterRole === 'HOSPITAL_ADMIN') {
        // 2. HOSPITAL_ADMIN cannot create SUPER_ADMIN or another HOSPITAL_ADMIN
        if (targetRoleCode === 'HOSPITAL_ADMIN') {
          throw new ApiError(403, 'Hospital Administrators cannot provision another Hospital Administrator account.');
        }
        if (!ALLOWED_STAFF_ROLES.includes(targetRoleCode)) {
          throw new ApiError(403, `Hospital Administrators can only create operational staff accounts (${ALLOWED_STAFF_ROLES.join(', ')}).`);
        }

        // 3. Hospital Admin must only manage users belonging to their assigned hospital / branch
        const adminBranch = (req.user?.hospitalBranch || req.user?.branchCode || 'MAIN-01').toUpperCase();
        const requestedBranch = (req.body.hospitalBranch || req.body.branchCode || '').trim().toUpperCase();
        if (requestedBranch && requestedBranch !== adminBranch) {
          throw new ApiError(403, 'Hospital Administrators cannot create staff accounts for another hospital or branch.');
        }
      } else {
        // Any other role (Receptionist, Doctor, Patient, etc.)
        throw new ApiError(403, 'You do not have permission to provision accounts.');
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        throw new ApiError(400, `A user with email '${cleanEmail}' already exists.`);
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

      const isAccountActive = status !== 'inactive' && status !== 'suspended';

      let creatorId = req.user?._id;
      if (creatorId === 'super_admin_system') {
        const sysAdmin = await User.findOne({ roleName: 'SUPER_ADMIN' });
        creatorId = sysAdmin?._id || null;
      }

      const branchToAssign = requesterRole === 'HOSPITAL_ADMIN'
        ? (req.user?.hospitalBranch || req.user?.branchCode || 'MAIN-01')
        : (req.body.hospitalBranch || req.body.branchCode || 'MAIN-01');

      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password, // Handled by User.pre('save') bcrypt hashing
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
        status: status || 'active',
        isActive: isAccountActive,
        isEmailVerified: true,
        createdBy: creatorId,
      });

      await newUser.save();

      // Audit Log
      await AuditLog.create({
        user: creatorId,
        userEmail: req.user?.email || 'admin@hospital.org',
        userRole: requesterRole || 'ADMIN',
        action: 'STAFF_PROVISIONED',
        module: 'user_management',
        resourceId: String(newUser._id),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          createdUserId: newUser._id,
          createdEmail: newUser.email,
          assignedRole: newUser.roleName,
          department: newUser.department,
          hospitalBranch: newUser.hospitalBranch,
          accountStatus: newUser.status,
        },
      });

      return ApiResponse.created(res, 'Staff account provisioned successfully', {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          name: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.roleName,
          roleDisplayName: roleDoc.displayName,
          department: newUser.department,
          specialization: newUser.specialization,
          status: newUser.status,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/roles
   * @desc Get all roles with permissions and user count
   */
  async getRolesAndPermissions(req, res, next) {
    try {
      const roles = await Role.find().sort({ name: 1 });
      const rolesWithCounts = await Promise.all(
        roles.map(async (r) => {
          const userCount = await User.countDocuments({ role: r._id });
          return {
            id: r._id,
            name: r.name,
            displayName: r.displayName,
            description: r.description,
            permissions: r.permissions,
            isSystemRole: r.isSystemRole,
            isActive: r.isActive,
            userCount,
          };
        })
      );

      return ApiResponse.success(res, 'Roles and permissions retrieved', rolesWithCounts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/super-admin/roles
   * @desc Create or update role permissions matrix
   */
  async updateRolePermissions(req, res, next) {
    try {
      const { roleId, permissions, description, displayName } = req.body;

      const role = await Role.findById(roleId);
      if (!role) {
        throw new ApiError(404, 'Role not found');
      }

      if (Array.isArray(permissions)) {
        role.permissions = permissions;
      }
      if (description) {
        role.description = description;
      }
      if (displayName) {
        role.displayName = displayName;
      }

      await role.save();

      await AuditLog.create({
        user: req.user?._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'admin@hms.com',
        userRole: 'SUPER_ADMIN',
        action: 'UPDATE_ROLE_PERMISSIONS',
        module: 'rbac',
        resourceId: String(role._id),
        status: 'SUCCESS',
        details: { roleName: role.name, permissionsCount: role.permissions.length },
      });

      return ApiResponse.success(res, `Permissions for role ${role.name} updated`, role);
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
   * @desc Complete audit trail for security, staff actions, and access control
   */
  async getAuditLogs(req, res, next) {
    try {
      const { action, module, status, search, page = 1, limit = 30 } = req.query;

      const query = {};
      if (action && action !== 'all') {
        query.action = new RegExp(action, 'i');
      }
      if (module && module !== 'all') {
        query.module = module.toLowerCase();
      }
      if (status && status !== 'all') {
        query.status = status.toUpperCase();
      }
      if (search) {
        query.$or = [
          { userEmail: new RegExp(search, 'i') },
          { userRole: new RegExp(search, 'i') },
          { action: new RegExp(search, 'i') },
          { ipAddress: new RegExp(search, 'i') },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      return ApiResponse.success(res, 'Audit logs fetched successfully', {
        logs,
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

      return ApiResponse.success(res, 'Hospital settings updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/super-admin/reports
   * @desc Hospital-wide clinical & administrative reports
   */
  async getReportsAndAnalytics(req, res, next) {
    try {
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
      ] = await Promise.all([
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: 'Completed' }),
        Appointment.countDocuments({ status: 'Cancelled' }),
        Bill.countDocuments(),
        Bill.countDocuments({ paymentStatus: 'Paid' }),
        Bill.aggregate([
          { $match: { paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        StaffVerification.countDocuments({ status: 'PENDING_VERIFICATION' }),
        StaffVerification.countDocuments({ status: 'APPROVED' }),
        StaffVerification.countDocuments({ status: 'REJECTED' }),
      ]);

      const totalRevenue = totalRevenueAgg[0]?.total || 48500;

      return ApiResponse.success(res, 'Reports and analytics fetched', {
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
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SuperAdminController();
