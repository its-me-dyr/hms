/**
 * Hospital Admin Controller
 * 
 * Complete administrative manager implementation for the Hospital Administrator role.
 * Covers:
 * 1. Administrative Dashboard KPIs & live summaries
 * 2. Hospital & Branch Settings
 * 3. Department Management (CRUD, status toggles)
 * 4. Service & Charge Configuration (CRUD, status toggles)
 * 5. Users & Staff Management (view, filter, provision operational staff, toggle status)
 * 6. Roles & Permissions read-only inspection (with privilege protection)
 * 7. Operating Hours & Holidays management
 * 8. Hospital Branding configuration
 * 9. Administrative System Configuration
 * 10. Administrative Reports (clinical, staff, financial, departments)
 * 11. Notifications (view, mark read, mark all read)
 * 12. Audit Logs (view administrative and security logs)
 * 13. My Profile management
 */

const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const HospitalSetting = require('../models/HospitalSetting');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function escapeRegex(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim().toUpperCase();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3];
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  return null;
}

class HospitalAdminController {
  /**
   * Helper to fetch or initialize HospitalSetting scoped strictly to the requester's hospital
   */
  async _getOrCreateSettings(req) {
    let settings = null;
    const hospitalId = req?.user?.hospital || req?.user?.hospitalId;
    if (hospitalId) {
      settings = await HospitalSetting.findById(hospitalId);
    }
    if (!settings && req?.user?._id && req.user._id !== 'super_admin_system') {
      settings = await HospitalSetting.findOne({ adminUser: req.user._id });
    }
    if (!settings && req?.user?.email && req.user._id !== 'super_admin_system') {
      settings = await HospitalSetting.findOne({ adminEmail: req.user.email });
    }
    if (!settings && req?.user?.hospitalBranch && req.user.roleName !== 'HOSPITAL_ADMIN') {
      settings = await HospitalSetting.findOne({ 'branches.code': req.user.hospitalBranch });
    }

    const userRole = (
      req?.user?.roleName ||
      (req?.user?.role && req.user.role.name) ||
      (req?.user?._id === 'super_admin_system' ? 'SUPER_ADMIN' : '')
    ).toUpperCase();

    // SUPER_ADMIN can fallback to first available hospital if no specific hospital attached
    if (!settings && userRole === 'SUPER_ADMIN') {
      settings = await HospitalSetting.findOne();
    }

    // For HOSPITAL_ADMIN: NEVER return another hospital. Auto-create a dedicated hospital setting if none exists yet.
    if (!settings && req?.user?._id && userRole === 'HOSPITAL_ADMIN') {
      const adminName = req.user.firstName ? `${req.user.firstName}'s Hospital` : 'Hospital Medical Center';
      const regNo = `REG-${Date.now().toString().slice(-6)}`;
      settings = await HospitalSetting.create({
        hospitalName: adminName,
        registrationNumber: regNo,
        adminUser: req.user._id,
        adminEmail: req.user.email,
        contactEmail: req.user.email || 'admin@hospital.org',
        contactPhone: req.user.phone || '+1 (800) 555-0100',
        emergencyHotline: '911 / 108',
        address: {
          street: req.user.address?.street || '100 Healthcare Boulevard',
          city: req.user.address?.city || 'Metropolis',
          state: req.user.address?.state || 'NY',
          postalCode: req.user.address?.postalCode || '10001',
          country: req.user.address?.country || 'United States',
        },
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/New_York',
        branches: [
          {
            name: `${adminName} Main Campus`,
            code: 'MAIN-01',
            isMain: true,
            address: {
              street: req.user.address?.street || '100 Healthcare Boulevard',
              city: req.user.address?.city || 'Metropolis',
              state: req.user.address?.state || 'NY',
              postalCode: req.user.address?.postalCode || '10001',
              country: req.user.address?.country || 'United States',
            },
            phone: req.user.phone || '+1 (800) 555-0100',
            email: req.user.email || 'main@hospital.org',
            capacity: 100,
            isActive: true,
          },
        ],
        services: [
          { code: 'CONS-GEN', name: 'General Consultation', category: 'Consultation', charge: 50, isActive: true },
          { code: 'CONS-SPEC', name: 'Specialist Consultation', category: 'Consultation', charge: 100, isActive: true },
          { code: 'LAB-CBC', name: 'Complete Blood Count (CBC)', category: 'Laboratory', charge: 35, isActive: true },
          { code: 'RAD-XRAY', name: 'Chest X-Ray Digital', category: 'Radiology', charge: 65, isActive: true },
        ],
        operatingHours: [
          { day: 'Monday', openTime: '08:00 AM', closeTime: '08:00 PM', isClosed: false },
          { day: 'Tuesday', openTime: '08:00 AM', closeTime: '08:00 PM', isClosed: false },
          { day: 'Wednesday', openTime: '08:00 AM', closeTime: '08:00 PM', isClosed: false },
          { day: 'Thursday', openTime: '08:00 AM', closeTime: '08:00 PM', isClosed: false },
          { day: 'Friday', openTime: '08:00 AM', closeTime: '08:00 PM', isClosed: false },
          { day: 'Saturday', openTime: '09:00 AM', closeTime: '05:00 PM', isClosed: false },
          { day: 'Sunday', openTime: '09:00 AM', closeTime: '01:00 PM', isClosed: true },
        ],
        holidays: [
          { name: "New Year's Day", date: '2026-01-01', description: 'National public holiday' },
          { name: 'Independence Day', date: '2026-07-04', description: 'Emergency services active 24/7' },
          { name: 'Christmas Day', date: '2026-12-25', description: 'Statutory medical emergency protocol' },
        ],
      });
    }

    if (settings && req?.user && String(req.user.hospital) !== String(settings._id) && req.user._id !== 'super_admin_system') {
      req.user.hospital = settings._id;
      req.user.hospitalId = settings._id;
      await req.user.save({ validateBeforeSave: false });
    }

    return settings;
  }

  // =========================================================================
  // 1. DASHBOARD OVERVIEW
  // =========================================================================
  async getDashboardOverview(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Hospital-scoped staff IDs
      const hospitalStaff = await User.find({
        $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
        roleName: { $ne: 'PATIENT' },
      }).select('_id roleName isActive status');

      const totalStaff = hospitalStaff.length;
      const activeStaff = hospitalStaff.filter((s) => s.isActive && s.status === 'active').length;
      const doctorsCount = hospitalStaff.filter((s) => s.roleName === 'DOCTOR' && s.isActive).length;
      const nursesCount = hospitalStaff.filter((s) => s.roleName === 'NURSE' && s.isActive).length;
      const hospitalDoctorIds = hospitalStaff.filter((s) => s.roleName === 'DOCTOR').map((d) => d._id);
      const hospitalStaffIds = hospitalStaff.map((u) => u._id);

      const [
        totalDepartments,
        activeDepartments,
        totalAppointments,
        todayAppointments,
        completedAppointments,
        pendingAppointments,
        totalBills,
        paidRevenueAgg,
        recentAuditLogs,
        unreadNotificationsCount,
      ] = await Promise.all([
        Department.countDocuments({ hospital: hospitalId }),
        Department.countDocuments({ hospital: hospitalId, isActive: true }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          appointmentDate: { $gte: todayStart },
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          status: 'Completed',
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          status: { $in: ['Pending', 'Confirmed'] },
        }),
        Bill.countDocuments({
          $or: [{ hospital: hospitalId }, { patient: { $in: hospitalStaffIds } }],
        }),
        Bill.aggregate([
          {
            $match: {
              paymentStatus: 'Paid',
              $or: [{ hospital: hospitalId }, { patient: { $in: hospitalStaffIds } }],
            },
          },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        AuditLog.find({
          $or: [
            { hospital: hospitalId },
            { 'details.hospitalId': hospitalId },
            { 'details.hospitalId': String(hospitalId) },
            { user: { $in: hospitalStaffIds } },
            { user: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(6)
          .select('-details.password'),
        Notification.countDocuments({
          $or: [{ recipient: req.user._id }, { hospital: hospitalId }],
          isRead: false,
        }),
      ]);

      const branchesCount = settings?.branches?.length || 1;
      const servicesCount = settings?.services?.length || 0;
      const totalRevenue = paidRevenueAgg[0]?.total || 0;

      return ApiResponse.success(res, 'Hospital admin dashboard metrics loaded successfully', {
        staffSummary: {
          totalStaff,
          activeStaff,
          doctorsCount,
          nursesCount,
          otherStaffCount: Math.max(0, totalStaff - (doctorsCount + nursesCount)),
        },
        departmentSummary: {
          totalDepartments,
          activeDepartments,
        },
        operationalSummary: {
          totalAppointments,
          todayAppointments,
          completedAppointments,
          pendingAppointments,
          completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 100,
        },
        financialSummary: {
          totalBills,
          totalRevenue,
        },
        configurationStatus: {
          hospitalName: settings?.hospitalName || 'Hospital Medical Center',
          branchesCount,
          servicesCount,
          operatingHoursDays: settings?.operatingHours?.length || 7,
          holidaysCount: settings?.holidays?.length || 0,
        },
        unreadNotificationsCount,
        recentAuditLogs,
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 2. HOSPITAL & BRANCH SETTINGS
  // =========================================================================
  async getHospitalSettings(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      return ApiResponse.success(res, 'Hospital settings retrieved successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  async updateHospitalSettings(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const {
        hospitalName,
        registrationNumber,
        tagline,
        contactEmail,
        contactPhone,
        emergencyHotline,
        address,
        currency,
        currencySymbol,
        timezone,
        taxId,
      } = req.body;

      if (hospitalName !== undefined) {
        if (!hospitalName || !hospitalName.trim()) {
          throw new ApiError(400, 'Hospital Full Legal Name cannot be empty.');
        }
        settings.hospitalName = hospitalName.trim();
      }

      // Check unique registration number across other hospitals if updated
      if (registrationNumber && registrationNumber.trim() && registrationNumber.trim() !== settings.registrationNumber) {
        const existingWithReg = await HospitalSetting.findOne({
          _id: { $ne: settings._id },
          registrationNumber: registrationNumber.trim(),
        });
        if (existingWithReg) {
          throw new ApiError(409, `Another hospital with registration number '${registrationNumber.trim()}' already exists.`);
        }
        settings.registrationNumber = registrationNumber.trim();
      }

      // Validate email format if provided
      if (contactEmail && contactEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail.trim())) {
          throw new ApiError(400, 'Invalid contact email format.');
        }
        settings.contactEmail = contactEmail.trim().toLowerCase();
      }

      if (tagline !== undefined) settings.tagline = tagline.trim();
      if (contactPhone !== undefined) settings.contactPhone = contactPhone.trim();
      if (emergencyHotline !== undefined) settings.emergencyHotline = emergencyHotline.trim();
      if (currency !== undefined) settings.currency = currency.trim();
      if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol.trim();
      if (timezone !== undefined) settings.timezone = timezone.trim();
      if (taxId !== undefined) settings.taxId = taxId.trim();

      if (address && typeof address === 'object') {
        settings.address = {
          street: address.street !== undefined ? address.street.trim() : (settings.address?.street || ''),
          city: address.city !== undefined ? address.city.trim() : (settings.address?.city || ''),
          state: address.state !== undefined ? address.state.trim() : (settings.address?.state || ''),
          postalCode: address.postalCode !== undefined ? address.postalCode.trim() : (settings.address?.postalCode || ''),
          country: address.country !== undefined ? address.country.trim() : (settings.address?.country || 'United States'),
        };
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'UPDATE_HOSPITAL_SETTINGS',
        module: 'admin',
        status: 'SUCCESS',
        details: {
          hospitalId: settings._id,
          hospitalName: settings.hospitalName,
          registrationNumber: settings.registrationNumber,
          contactEmail: settings.contactEmail,
        },
      });

      return ApiResponse.success(res, 'Hospital parameters updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  async getBranches(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      return ApiResponse.success(res, 'Hospital branches retrieved successfully', settings.branches || []);
    } catch (error) {
      next(error);
    }
  }

  async saveBranch(req, res, next) {
    try {
      const branchId = req.params?.id || req.body?.id || req.body?._id;
      const { name, code, isMain, address, phone, email, capacity, isActive } = req.body;

      if (!name || !name.trim()) {
        throw new ApiError(400, 'Branch Name is required.');
      }
      if (!code || !code.trim()) {
        throw new ApiError(400, 'Unique Branch Code is required.');
      }

      const settings = await this._getOrCreateSettings(req);
      const branchCode = code.trim().toUpperCase();

      if (branchId) {
        // Update existing branch
        const branchIndex = settings.branches.findIndex((b) => String(b._id) === String(branchId));
        if (branchIndex === -1) {
          throw new ApiError(404, 'Branch not found.');
        }

        // Check unique code across other branches of this hospital
        const duplicate = settings.branches.some(
          (b, i) => i !== branchIndex && b.code === branchCode
        );
        if (duplicate) {
          throw new ApiError(409, `Another branch with code ${branchCode} already exists.`);
        }

        const willBeMain = Boolean(isMain);
        if (willBeMain) {
          // Unset isMain on all other branches to guarantee single primary branch
          settings.branches.forEach((b, i) => {
            if (i !== branchIndex) b.isMain = false;
          });
        }

        settings.branches[branchIndex].name = name.trim();
        settings.branches[branchIndex].code = branchCode;
        if (isMain !== undefined) settings.branches[branchIndex].isMain = willBeMain;
        settings.branches[branchIndex].phone = phone ? phone.trim() : '';
        settings.branches[branchIndex].email = email ? email.trim() : '';
        settings.branches[branchIndex].capacity = capacity !== undefined && !isNaN(capacity) ? Number(capacity) : (settings.branches[branchIndex].capacity || 50);
        if (isActive !== undefined) settings.branches[branchIndex].isActive = Boolean(isActive);

        if (address && typeof address === 'object') {
          settings.branches[branchIndex].address = {
            street: address.street !== undefined ? address.street.trim() : (settings.branches[branchIndex].address?.street || ''),
            city: address.city !== undefined ? address.city.trim() : (settings.branches[branchIndex].address?.city || ''),
            state: address.state !== undefined ? address.state.trim() : (settings.branches[branchIndex].address?.state || ''),
            postalCode: address.postalCode !== undefined ? address.postalCode.trim() : (settings.branches[branchIndex].address?.postalCode || ''),
            country: address.country !== undefined ? address.country.trim() : (settings.branches[branchIndex].address?.country || ''),
          };
        }
      } else {
        // Create new branch
        const duplicate = settings.branches.some((b) => b.code === branchCode);
        if (duplicate) {
          throw new ApiError(409, `A branch with code ${branchCode} already exists.`);
        }

        const willBeMain = Boolean(isMain) || settings.branches.length === 0;
        if (willBeMain) {
          settings.branches.forEach((b) => {
            b.isMain = false;
          });
        }

        settings.branches.push({
          name: name.trim(),
          code: branchCode,
          isMain: willBeMain,
          phone: phone ? phone.trim() : '',
          email: email ? email.trim() : '',
          capacity: capacity !== undefined && !isNaN(capacity) ? Number(capacity) : 50,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          address: {
            street: address?.street ? address.street.trim() : '',
            city: address?.city ? address.city.trim() : '',
            state: address?.state ? address.state.trim() : '',
            postalCode: address?.postalCode ? address.postalCode.trim() : '',
            country: address?.country ? address.country.trim() : '',
          },
        });
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: branchId ? 'UPDATE_BRANCH' : 'CREATE_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, branchId, name: name.trim(), code: branchCode },
      });

      return ApiResponse.success(
        res,
        branchId ? 'Branch updated successfully' : 'Branch created successfully',
        settings.branches
      );
    } catch (error) {
      next(error);
    }
  }

  async toggleBranchStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive, status } = req.body;
      const settings = await this._getOrCreateSettings(req);

      const branch = settings.branches.id(id);
      if (!branch) {
        throw new ApiError(404, 'Branch not found.');
      }

      const newActive = isActive !== undefined ? Boolean(isActive) : (status === 'active' ? true : !branch.isActive);
      if (!newActive && branch.isMain) {
        throw new ApiError(400, 'The primary hospital branch cannot be deactivated. Please set another active branch as primary first.');
      }

      branch.isActive = newActive;
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: newActive ? 'ACTIVATE_BRANCH' : 'DEACTIVATE_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, branchId: id, name: branch.name, code: branch.code, isActive: newActive },
      });

      return ApiResponse.success(res, `Branch "${branch.name}" ${newActive ? 'activated' : 'deactivated'} successfully`, settings.branches);
    } catch (error) {
      next(error);
    }
  }

  async setPrimaryBranch(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);

      const branch = settings.branches.id(id);
      if (!branch) {
        throw new ApiError(404, 'Branch not found.');
      }

      if (!branch.isActive) {
        throw new ApiError(400, 'An inactive branch cannot be designated as the primary branch. Please activate the branch first.');
      }

      settings.branches.forEach((b) => {
        b.isMain = String(b._id) === String(id);
      });

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'UPDATE_PRIMARY_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, branchId: id, name: branch.name, code: branch.code },
      });

      return ApiResponse.success(res, `Primary campus updated to "${branch.name}"`, settings.branches);
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);

      const branch = settings.branches.id(id);
      if (!branch) {
        throw new ApiError(404, 'Branch not found.');
      }

      if (branch.isMain) {
        throw new ApiError(400, 'The primary hospital branch cannot be deleted.');
      }

      if (settings.branches.length <= 1) {
        throw new ApiError(400, 'A hospital must retain at least one configured branch.');
      }

      const branchName = branch.name;
      const branchCode = branch.code;
      settings.branches.pull({ _id: id });
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'DELETE_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, name: branchName, code: branchCode },
      });

      return ApiResponse.success(res, 'Branch removed successfully', settings.branches);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 3. DEPARTMENT MANAGEMENT
  // =========================================================================
  async getDepartments(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      // Ensure base default departments exist if hospital has 0 departments
      const totalInHosp = await Department.countDocuments({ hospital: hospitalId });
      if (totalInHosp === 0) {
        const defaultDepts = [
          { name: 'Cardiology', code: 'CARD', description: 'Cardiovascular and coronary care.', capacity: 35, hospital: hospitalId },
          { name: 'Neurology', code: 'NEUR', description: 'Neurological and brain care.', capacity: 25, hospital: hospitalId },
          { name: 'Orthopedics', code: 'ORTH', description: 'Musculoskeletal surgery and trauma recovery.', capacity: 40, hospital: hospitalId },
          { name: 'Pediatrics', code: 'PEDI', description: 'Pediatric medicine and wellness.', capacity: 30, hospital: hospitalId },
          { name: 'Radiology & Imaging', code: 'RADI', description: 'Diagnostic imaging and scan evaluations.', capacity: 20, hospital: hospitalId },
          { name: 'Pathology & Laboratory', code: 'PATH', description: 'Clinical laboratory specimen testing.', capacity: 20, hospital: hospitalId },
          { name: 'Emergency Medicine', code: 'EMER', description: '24/7 acute trauma and emergency triage.', capacity: 50, hospital: hospitalId },
          { name: 'General Surgery', code: 'SURG', description: 'Elective and emergency surgical operations.', capacity: 30, hospital: hospitalId },
        ];
        await Department.insertMany(defaultDepts);
      }

      const { search, status } = req.query;
      const query = { hospital: hospitalId };

      if (status && status !== 'all') {
        if (status === 'active') {
          query.isActive = true;
        } else if (status === 'inactive') {
          query.isActive = false;
        }
      }

      if (search && search.trim()) {
        const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
        query.$or = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }];
      }

      const departments = await Department.find(query)
        .populate('headOfDepartment', '_id firstName lastName email roleName specialization')
        .sort({ name: 1 });

      const departmentsWithMetrics = await Promise.all(
        departments.map(async (d) => {
          const deptMatchConditions = [
            new RegExp(`^${escapeRegex(d.name.trim())}$`, 'i'),
            new RegExp(`^${escapeRegex(d.code.trim())}$`, 'i'),
            String(d._id),
          ];

          const doctorCount = await User.countDocuments({
            $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
            department: { $in: deptMatchConditions },
            roleName: { $regex: /^doctor$/i },
            isActive: true,
          });

          const staffCount = await User.countDocuments({
            $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
            department: { $in: deptMatchConditions },
            roleName: { $nin: ['PATIENT', 'patient', 'Patient'] },
            isActive: true,
          });

          const headUser = d.headOfDepartment;
          let headDisplayName = 'Not assigned';
          if (headUser && headUser.firstName) {
            headDisplayName = `${headUser.roleName === 'DOCTOR' ? 'Dr. ' : ''}${headUser.firstName} ${headUser.lastName}`.trim();
          } else if (d.headName && d.headName.trim() && d.headName !== 'Assigned Specialist') {
            headDisplayName = d.headName.trim();
          }

          return {
            id: d._id,
            _id: d._id,
            name: d.name,
            code: d.code,
            description: d.description || '',
            headOfDepartment: headUser
              ? {
                  _id: headUser._id,
                  id: headUser._id,
                  name: `${headUser.firstName} ${headUser.lastName}`.trim(),
                  email: headUser.email,
                  roleName: headUser.roleName,
                  specialization: headUser.specialization || '',
                }
              : null,
            headName: headDisplayName,
            location: d.location || 'Main Medical Wing',
            capacity: d.capacity !== undefined ? d.capacity : 20,
            isActive: Boolean(d.isActive),
            doctorsCount: doctorCount,
            staffCount: staffCount,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        })
      );

      return ApiResponse.success(res, 'Departments retrieved successfully', departmentsWithMetrics);
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const { name, code, description, location, capacity, headOfDepartment, headName } = req.body;
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      if (!name || !name.trim()) {
        throw new ApiError(400, 'Department name is required.');
      }
      if (!code || !code.trim()) {
        throw new ApiError(400, 'Department code is required.');
      }

      const cleanCode = code.trim().toUpperCase();
      const cleanName = name.trim();

      // Check unique code in hospital
      const existingCode = await Department.findOne({
        hospital: hospitalId,
        code: cleanCode,
      });
      if (existingCode) {
        throw new ApiError(409, `Department code '${cleanCode}' already exists in your hospital.`);
      }

      // Check unique name in hospital (case-insensitive)
      const existingName = await Department.findOne({
        hospital: hospitalId,
        name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
      });
      if (existingName) {
        throw new ApiError(409, `Department name '${cleanName}' already exists in your hospital.`);
      }

      // Validate capacity
      let numCapacity = 20;
      if (capacity !== undefined && capacity !== '') {
        numCapacity = Number(capacity);
        if (isNaN(numCapacity) || numCapacity < 0) {
          throw new ApiError(400, 'Capacity must be a valid non-negative number.');
        }
      }

      // Validate Head of Department if provided
      let headUserId = null;
      let finalHeadName = '';

      if (headOfDepartment && headOfDepartment !== '' && headOfDepartment !== 'none') {
        const headUser = await User.findOne({
          _id: headOfDepartment,
          $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
        }).select('_id firstName lastName email roleName specialization isActive');

        if (!headUser) {
          throw new ApiError(400, 'Selected Head of Department is not valid for this hospital.');
        }

        headUserId = headUser._id;
        finalHeadName = `${headUser.roleName === 'DOCTOR' ? 'Dr. ' : ''}${headUser.firstName} ${headUser.lastName}`.trim();
      } else if (headName && headName.trim() && headName.trim() !== 'Assigned Specialist') {
        finalHeadName = headName.trim();
      }

      const dept = await Department.create({
        name: cleanName,
        code: cleanCode,
        description: (description || '').trim(),
        location: (location || 'Main Medical Wing').trim(),
        capacity: numCapacity,
        headOfDepartment: headUserId,
        headName: finalHeadName,
        hospital: hospitalId,
        isActive: true,
      });

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: hospitalId,
        action: 'CREATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { hospitalId, departmentId: dept._id, name: dept.name, code: dept.code, capacity: dept.capacity },
      });

      return ApiResponse.created(res, 'Department created successfully', dept);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const { name, code, description, location, capacity, headOfDepartment, headName, isActive } = req.body;
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const dept = await Department.findOne({ _id: id, hospital: hospitalId });
      if (!dept) {
        throw new ApiError(404, 'Department not found in your hospital.');
      }

      if (code !== undefined) {
        if (!code.trim()) {
          throw new ApiError(400, 'Department code is required.');
        }
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode !== dept.code) {
          const duplicate = await Department.findOne({ hospital: hospitalId, code: cleanCode, _id: { $ne: id } });
          if (duplicate) {
            throw new ApiError(409, `Department code '${cleanCode}' already exists in your hospital.`);
          }
          dept.code = cleanCode;
        }
      }

      if (name !== undefined) {
        if (!name.trim()) {
          throw new ApiError(400, 'Department name is required.');
        }
        const cleanName = name.trim();
        if (cleanName.toLowerCase() !== dept.name.toLowerCase()) {
          const duplicate = await Department.findOne({
            hospital: hospitalId,
            name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, 'i') },
            _id: { $ne: id },
          });
          if (duplicate) {
            throw new ApiError(409, `Department name '${cleanName}' already exists in your hospital.`);
          }
          dept.name = cleanName;
        }
      }

      if (capacity !== undefined && capacity !== '') {
        const numCapacity = Number(capacity);
        if (isNaN(numCapacity) || numCapacity < 0) {
          throw new ApiError(400, 'Capacity must be a valid non-negative number.');
        }
        dept.capacity = numCapacity;
      }

      if (headOfDepartment !== undefined) {
        if (headOfDepartment && headOfDepartment !== '' && headOfDepartment !== 'none') {
          const headUser = await User.findOne({
            _id: headOfDepartment,
            $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
          }).select('_id firstName lastName email roleName specialization isActive');

          if (!headUser) {
            throw new ApiError(400, 'Selected Head of Department is not valid for this hospital.');
          }

          dept.headOfDepartment = headUser._id;
          dept.headName = `${headUser.roleName === 'DOCTOR' ? 'Dr. ' : ''}${headUser.firstName} ${headUser.lastName}`.trim();
        } else {
          dept.headOfDepartment = null;
          dept.headName = headName !== undefined ? headName.trim() : '';
        }
      } else if (headName !== undefined) {
        dept.headName = headName.trim();
      }

      if (description !== undefined) dept.description = description.trim();
      if (location !== undefined) dept.location = location.trim();
      if (isActive !== undefined) dept.isActive = Boolean(isActive);

      await dept.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: hospitalId,
        action: 'UPDATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { hospitalId, departmentId: dept._id, name: dept.name, code: dept.code, capacity: dept.capacity, isActive: dept.isActive },
      });

      return ApiResponse.success(res, 'Department updated successfully', dept);
    } catch (error) {
      next(error);
    }
  }

  async toggleDepartmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const dept = await Department.findOne({ _id: id, hospital: hospitalId });
      if (!dept) {
        throw new ApiError(404, 'Department not found in your hospital.');
      }

      if (req.body && req.body.isActive !== undefined) {
        dept.isActive = Boolean(req.body.isActive);
      } else {
        dept.isActive = !dept.isActive;
      }

      await dept.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: hospitalId,
        action: dept.isActive ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { hospitalId, departmentId: dept._id, name: dept.name, code: dept.code, isActive: dept.isActive },
      });

      return ApiResponse.success(
        res,
        `Department ${dept.name} is now ${dept.isActive ? 'Active' : 'Inactive'}`,
        dept
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 4. SERVICE & CHARGE CONFIGURATION
  // =========================================================================
  async getServicesAndCharges(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const { search, category } = req.query;
      let services = settings.services || [];

      if (category && category !== 'all') {
        services = services.filter(
          (s) => s.category && s.category.toLowerCase() === category.toLowerCase()
        );
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        services = services.filter(
          (s) =>
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.code && s.code.toLowerCase().includes(q)) ||
            (s.description && s.description.toLowerCase().includes(q))
        );
      }

      return ApiResponse.success(res, 'Services and charges retrieved successfully', services);
    } catch (error) {
      next(error);
    }
  }

  async saveServiceCharge(req, res, next) {
    try {
      const serviceId = req.params?.id || req.body?.id || req.body?._id;
      const { code, name, category, department, charge, description, isActive } = req.body;

      if (!code || !code.trim()) {
        throw new ApiError(400, 'Service code is required.');
      }
      if (!name || !name.trim()) {
        throw new ApiError(400, 'Service name is required.');
      }
      if (charge === undefined || charge === null || charge === '') {
        throw new ApiError(400, 'Charge amount is required.');
      }

      const numericCharge = Number(charge);
      if (isNaN(numericCharge) || numericCharge < 0) {
        throw new ApiError(400, 'Charge must be a valid non-negative number.');
      }

      const VALID_CATEGORIES = [
        'Consultation',
        'Diagnostic',
        'Laboratory',
        'Radiology',
        'Surgery',
        'Emergency',
        'General',
      ];

      const inputCategory = (category || 'General').trim();
      const matchedCategory = VALID_CATEGORIES.find(
        (c) => c.toLowerCase() === inputCategory.toLowerCase()
      );
      if (!matchedCategory) {
        throw new ApiError(
          400,
          `Invalid category '${inputCategory}'. Please select a valid category (${VALID_CATEGORIES.join(', ')}).`
        );
      }

      const settings = await this._getOrCreateSettings(req);
      const serviceCode = code.trim().toUpperCase();
      const serviceName = name.trim();

      if (serviceId) {
        // Update service
        const svcIndex = settings.services.findIndex((s) => String(s._id) === String(serviceId));
        if (svcIndex === -1) {
          throw new ApiError(404, 'Service charge record not found in your hospital.');
        }

        const duplicateCode = settings.services.some(
          (s, i) => i !== svcIndex && s.code === serviceCode
        );
        if (duplicateCode) {
          throw new ApiError(409, `Another service with code '${serviceCode}' already exists in your hospital.`);
        }

        const duplicateName = settings.services.some(
          (s, i) => i !== svcIndex && s.name.toLowerCase() === serviceName.toLowerCase()
        );
        if (duplicateName) {
          throw new ApiError(409, `Another service named '${serviceName}' already exists in your hospital.`);
        }

        settings.services[svcIndex].code = serviceCode;
        settings.services[svcIndex].name = serviceName;
        settings.services[svcIndex].category = matchedCategory;
        settings.services[svcIndex].department = department ? department.trim() : '';
        settings.services[svcIndex].charge = numericCharge;
        settings.services[svcIndex].description = description ? description.trim() : '';
        if (isActive !== undefined) settings.services[svcIndex].isActive = Boolean(isActive);

        await settings.save();

        await AuditLog.create({
          user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
          userEmail: req.user?.email || 'hospitaladmin@hms.com',
          userRole: 'HOSPITAL_ADMIN',
          hospital: settings._id,
          action: 'UPDATE_SERVICE_CHARGE',
          module: 'billing',
          resourceId: String(serviceId),
          status: 'SUCCESS',
          details: { hospitalId: settings._id, code: serviceCode, name: serviceName, charge: numericCharge, category: matchedCategory },
        });

        return ApiResponse.success(res, 'Service and charge updated successfully', settings.services);
      } else {
        // Create service
        const duplicateCode = settings.services.some((s) => s.code === serviceCode);
        if (duplicateCode) {
          throw new ApiError(409, `A service with code '${serviceCode}' already exists in your hospital.`);
        }

        const duplicateName = settings.services.some((s) => s.name.toLowerCase() === serviceName.toLowerCase());
        if (duplicateName) {
          throw new ApiError(409, `A service named '${serviceName}' already exists in your hospital.`);
        }

        settings.services.push({
          code: serviceCode,
          name: serviceName,
          category: matchedCategory,
          department: department ? department.trim() : '',
          charge: numericCharge,
          description: description ? description.trim() : '',
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        });

        await settings.save();

        const createdItem = settings.services[settings.services.length - 1];

        await AuditLog.create({
          user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
          userEmail: req.user?.email || 'hospitaladmin@hms.com',
          userRole: 'HOSPITAL_ADMIN',
          hospital: settings._id,
          action: 'CREATE_SERVICE_CHARGE',
          module: 'billing',
          resourceId: String(createdItem?._id || ''),
          status: 'SUCCESS',
          details: { hospitalId: settings._id, code: serviceCode, name: serviceName, charge: numericCharge, category: matchedCategory },
        });

        return ApiResponse.success(res, 'Service charge created successfully', settings.services);
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteServiceCharge(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);

      const service = settings.services.id(id);
      if (!service) {
        throw new ApiError(404, 'Service charge record not found in your hospital.');
      }

      const svcName = service.name;
      const svcCode = service.code;
      settings.services.pull({ _id: id });
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'DELETE_SERVICE_CHARGE',
        module: 'billing',
        resourceId: String(id),
        status: 'SUCCESS',
        details: { hospitalId: settings._id, name: svcName, code: svcCode },
      });

      return ApiResponse.success(res, 'Service removed successfully', settings.services);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 5. OPERATING HOURS & HOLIDAYS
  // =========================================================================
  async getOperatingHoursAndHolidays(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let hours = settings.operatingHours || [];
      if (!hours.length) {
        hours = DEFAULT_DAYS.map((d) => ({
          day: d,
          openTime: '08:00 AM',
          closeTime: '08:00 PM',
          isClosed: d === 'Sunday',
        }));
        settings.operatingHours = hours;
        await settings.save();
      }

      const sortedHolidays = [...(settings.holidays || [])].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );

      return ApiResponse.success(res, 'Operating hours and holidays retrieved', {
        operatingHours: hours,
        holidays: sortedHolidays,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOperatingHours(req, res, next) {
    try {
      const { operatingHours } = req.body;
      if (!Array.isArray(operatingHours)) {
        throw new ApiError(400, 'Operating hours must be an array of daily schedules.');
      }

      for (const item of operatingHours) {
        if (!item.day || typeof item.day !== 'string') {
          throw new ApiError(400, 'Each operating schedule item must specify a valid day.');
        }
        if (!item.isClosed) {
          if (!item.openTime || !item.closeTime) {
            throw new ApiError(400, `Opening time and closing time are required for ${item.day}.`);
          }
          const openMins = parseTimeToMinutes(item.openTime);
          const closeMins = parseTimeToMinutes(item.closeTime);
          if (openMins === null) {
            throw new ApiError(400, `Invalid opening time "${item.openTime}" for ${item.day}.`);
          }
          if (closeMins === null) {
            throw new ApiError(400, `Invalid closing time "${item.closeTime}" for ${item.day}.`);
          }
          if (openMins === closeMins) {
            throw new ApiError(400, `Opening time and closing time cannot be identical for ${item.day}.`);
          }
          if (closeMins < openMins) {
            throw new ApiError(400, `Closing time must be after opening time for ${item.day}.`);
          }
        }
      }

      const settings = await this._getOrCreateSettings(req);
      settings.operatingHours = operatingHours.map((item) => ({
        day: String(item.day || '').trim(),
        openTime: String(item.openTime || '08:00 AM').trim(),
        closeTime: String(item.closeTime || '08:00 PM').trim(),
        isClosed: Boolean(item.isClosed),
      }));

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'UPDATE_OPERATING_HOURS',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, daysCount: settings.operatingHours.length },
      });

      return ApiResponse.success(res, 'Operating hours updated successfully', settings.operatingHours);
    } catch (error) {
      next(error);
    }
  }

  async saveHoliday(req, res, next) {
    try {
      const { id, name, date, description } = req.body;
      if (!name || !date) {
        throw new ApiError(400, 'Holiday name and date are required.');
      }
      const trimmedName = String(name).trim();
      const trimmedDate = String(date).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Holiday name cannot be empty.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) || isNaN(Date.parse(trimmedDate))) {
        throw new ApiError(400, 'Invalid holiday date. Must be in YYYY-MM-DD format.');
      }

      const settings = await this._getOrCreateSettings(req);

      if (id) {
        const holidayIndex = settings.holidays.findIndex((h) => String(h._id) === String(id));
        if (holidayIndex === -1) {
          throw new ApiError(404, 'Holiday record not found.');
        }
        settings.holidays[holidayIndex].name = trimmedName;
        settings.holidays[holidayIndex].date = trimmedDate;
        settings.holidays[holidayIndex].description = description !== undefined ? String(description).trim() : settings.holidays[holidayIndex].description;
      } else {
        const existingOnDateIndex = settings.holidays.findIndex((h) => h.date === trimmedDate);
        if (existingOnDateIndex !== -1) {
          settings.holidays[existingOnDateIndex].name = trimmedName;
          if (description !== undefined) {
            settings.holidays[existingOnDateIndex].description = String(description).trim();
          }
        } else {
          settings.holidays.push({
            name: trimmedName,
            date: trimmedDate,
            description: description ? String(description).trim() : '',
          });
        }
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: id ? 'UPDATE_HOLIDAY' : 'CREATE_HOLIDAY',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, name: trimmedName, date: trimmedDate },
      });

      const sortedHolidays = [...settings.holidays].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );

      return ApiResponse.success(
        res,
        id ? 'Holiday updated successfully' : 'Holiday added successfully',
        sortedHolidays
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);

      const holiday = settings.holidays.id(id);
      if (!holiday) {
        throw new ApiError(404, 'Holiday record not found.');
      }

      const hName = holiday.name;
      settings.holidays.pull({ _id: id });
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'DELETE_HOLIDAY',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, name: hName },
      });

      const sortedHolidays = [...settings.holidays].sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      );

      return ApiResponse.success(res, 'Holiday removed successfully', sortedHolidays);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6. HOSPITAL BRANDING
  // =========================================================================
  async getBranding(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const brandingObj = settings.branding ? (typeof settings.branding.toObject === 'function' ? settings.branding.toObject() : settings.branding) : {};
      return ApiResponse.success(res, 'Branding parameters retrieved', {
        ...brandingObj,
        hospitalName: settings.hospitalName || '',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBranding(req, res, next) {
    try {
      const { logoUrl, faviconUrl, primaryColor, accentColor, headerText, footerText } = req.body;
      const settings = await this._getOrCreateSettings(req);

      // Validate hex colors if provided
      const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (primaryColor) {
        const cleanPrimary = String(primaryColor).trim();
        if (!hexRegex.test(cleanPrimary)) {
          throw new ApiError(400, 'Primary color must be a valid hex color code (e.g., #0891B2)');
        }
      }

      if (accentColor) {
        const cleanAccent = String(accentColor).trim();
        if (!hexRegex.test(cleanAccent)) {
          throw new ApiError(400, 'Accent color must be a valid hex color code (e.g., #0F172A)');
        }
      }

      // Plain text check and HTML/script sanitization
      const stripHtml = (str) => String(str || '').replace(/<[^>]*>?/gm, '').trim();

      const sanitizedHeaderText = headerText !== undefined ? stripHtml(headerText) : (settings.branding?.headerText || '');
      const sanitizedFooterText = footerText !== undefined ? stripHtml(footerText) : (settings.branding?.footerText || '');

      if (sanitizedHeaderText.length > 150) {
        throw new ApiError(400, 'Header text cannot exceed 150 characters');
      }

      if (sanitizedFooterText.length > 250) {
        throw new ApiError(400, 'Footer text cannot exceed 250 characters');
      }

      settings.branding = {
        logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : (settings.branding?.logoUrl || ''),
        faviconUrl: faviconUrl !== undefined ? String(faviconUrl).trim() : (settings.branding?.faviconUrl || ''),
        primaryColor: primaryColor ? String(primaryColor).trim() : (settings.branding?.primaryColor || '#0891B2'),
        accentColor: accentColor ? String(accentColor).trim() : (settings.branding?.accentColor || '#0F172A'),
        headerText: sanitizedHeaderText,
        footerText: sanitizedFooterText,
      };

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'UPDATE_BRANDING',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalId: settings._id, headerText: settings.branding.headerText, primaryColor: settings.branding.primaryColor },
      });

      const brandingObj = typeof settings.branding.toObject === 'function' ? settings.branding.toObject() : settings.branding;
      return ApiResponse.success(res, 'Hospital branding updated successfully', {
        ...brandingObj,
        hospitalName: settings.hospitalName || '',
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 7. SYSTEM CONFIGURATION
  // =========================================================================
  async getSystemConfig(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hotline = settings.systemConfig?.emergencyContactNumber || settings.emergencyHotline || '+1 (800) 555-0199';
      const cfgObj = settings.systemConfig ? (typeof settings.systemConfig.toObject === 'function' ? settings.systemConfig.toObject() : settings.systemConfig) : {};
      return ApiResponse.success(res, 'System configuration retrieved', {
        ...cfgObj,
        emergencyContactNumber: hotline,
        emergencyHotline: hotline,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSystemConfig(req, res, next) {
    try {
      const {
        appointmentBufferMinutes,
        maxAppointmentsPerSlot,
        emergencyContactNumber,
        emergencyHotline,
        enableEmailNotifications,
        maintenanceMode,
      } = req.body;

      const settings = await this._getOrCreateSettings(req);

      if (appointmentBufferMinutes !== undefined) {
        const val = Number(appointmentBufferMinutes);
        if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
          throw new ApiError(400, 'Appointment buffer must be a non-negative integer (in minutes).');
        }
        if (val > 240) {
          throw new ApiError(400, 'Appointment buffer cannot exceed 240 minutes.');
        }
        settings.systemConfig.appointmentBufferMinutes = val;
      }

      if (maxAppointmentsPerSlot !== undefined) {
        const val = Number(maxAppointmentsPerSlot);
        if (isNaN(val) || val < 1 || !Number.isInteger(val)) {
          throw new ApiError(400, 'Maximum appointments per slot must be a positive integer of at least 1.');
        }
        if (val > 100) {
          throw new ApiError(400, 'Maximum appointments per slot cannot exceed 100.');
        }
        settings.systemConfig.maxAppointmentsPerSlot = val;
      }

      const rawHotline = emergencyContactNumber !== undefined ? emergencyContactNumber : emergencyHotline;
      if (rawHotline !== undefined) {
        const hotlineVal = String(rawHotline).trim();
        if (!hotlineVal) {
          throw new ApiError(400, 'Emergency hotline contact number cannot be empty.');
        }
        if (hotlineVal.length > 50) {
          throw new ApiError(400, 'Emergency hotline contact number cannot exceed 50 characters.');
        }
        settings.systemConfig.emergencyContactNumber = hotlineVal;
        settings.emergencyHotline = hotlineVal;
      }

      if (enableEmailNotifications !== undefined) {
        settings.systemConfig.enableEmailNotifications = Boolean(enableEmailNotifications);
      }

      if (maintenanceMode !== undefined) {
        settings.systemConfig.maintenanceMode = Boolean(maintenanceMode);
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        hospital: settings._id,
        action: 'UPDATE_SYSTEM_CONFIG',
        module: 'admin',
        status: 'SUCCESS',
        details: {
          hospitalId: settings._id,
          appointmentBufferMinutes: settings.systemConfig.appointmentBufferMinutes,
          maxAppointmentsPerSlot: settings.systemConfig.maxAppointmentsPerSlot,
          maintenanceMode: settings.systemConfig.maintenanceMode,
        },
      });

      const currentHotline = settings.systemConfig?.emergencyContactNumber || settings.emergencyHotline;
      const cfgObj = typeof settings.systemConfig.toObject === 'function' ? settings.systemConfig.toObject() : settings.systemConfig;

      return ApiResponse.success(res, 'System configuration updated successfully', {
        ...cfgObj,
        emergencyContactNumber: currentHotline,
        emergencyHotline: currentHotline,
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 8. ADMINISTRATIVE REPORTS
  // =========================================================================
  async getAdministrativeReports(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const hospitalStaff = await User.find({
        $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
        roleName: { $ne: 'PATIENT' },
      }).select('_id roleName isActive department');

      const hospitalDoctorIds = hospitalStaff.filter((s) => s.roleName === 'DOCTOR').map((d) => d._id);
      const hospitalAllUserIds = await User.find({
        $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
      }).distinct('_id');

      const [
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        pendingAppointments,
        totalBills,
        paidBills,
        revenueAgg,
        departments,
        staffByRoleAgg,
      ] = await Promise.all([
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          status: 'Completed',
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          status: 'Cancelled',
        }),
        Appointment.countDocuments({
          $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          status: { $in: ['Pending', 'Confirmed'] },
        }),
        Bill.countDocuments({
          $or: [{ hospital: hospitalId }, { patient: { $in: hospitalAllUserIds } }],
        }),
        Bill.countDocuments({
          paymentStatus: 'Paid',
          $or: [{ hospital: hospitalId }, { patient: { $in: hospitalAllUserIds } }],
        }),
        Bill.aggregate([
          {
            $match: {
              paymentStatus: 'Paid',
              $or: [{ hospital: hospitalId }, { patient: { $in: hospitalAllUserIds } }],
            },
          },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Department.find({ hospital: hospitalId }).sort({ name: 1 }),
        User.aggregate([
          {
            $match: {
              $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
              roleName: { $ne: 'PATIENT' },
            },
          },
          { $group: { _id: '$roleName', count: { $sum: 1 } } },
        ]),
      ]);

      const totalRevenue = revenueAgg[0]?.total || 0;

      // Department breakdown with actual staff and doctor counts
      const departmentAnalytics = await Promise.all(
        departments.map(async (dept) => {
          const docCount = hospitalStaff.filter((s) => s.department === dept.name && s.roleName === 'DOCTOR' && s.isActive).length;
          const staffCount = hospitalStaff.filter((s) => s.department === dept.name && s.isActive).length;
          const otherStaffCount = Math.max(0, staffCount - docCount);
          const apptCount = await Appointment.countDocuments({
            department: dept.name,
            $or: [{ hospital: hospitalId }, { doctor: { $in: hospitalDoctorIds } }],
          });
          return {
            id: dept._id,
            name: dept.name,
            code: dept.code,
            capacity: dept.capacity || 25,
            doctorCount: docCount,
            staffCount: staffCount,
            otherStaffCount: otherStaffCount,
            appointmentCount: apptCount,
            workload: apptCount,
            isActive: dept.isActive,
          };
        })
      );

      const staffDistribution = staffByRoleAgg.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      return ApiResponse.success(res, 'Administrative reports compiled successfully', {
        hospitalName: settings.hospitalName || 'Hospital',
        currency: settings.currency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        clinicalMetrics: {
          totalAppointments,
          totalConsultations: totalAppointments,
          completedAppointments,
          completed: completedAppointments,
          cancelledAppointments,
          cancelled: cancelledAppointments,
          pendingAppointments,
          completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
        },
        financialMetrics: {
          totalBills,
          totalInvoices: totalBills,
          paidBills,
          paidInvoices: paidBills,
          totalRevenue,
          collectedRevenue: totalRevenue,
          collectionRate: totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0,
        },
        departmentAnalytics,
        staffDistribution,
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 9. NOTIFICATIONS
  // =========================================================================
  async getNotifications(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const notifFilter = {
        $or: [
          { recipient: req.user._id },
          { hospital: hospitalId },
        ],
      };

      const notifications = await Notification.find(notifFilter)
        .sort({ createdAt: -1 })
        .limit(50);
      const unreadCount = await Notification.countDocuments({ ...notifFilter, isRead: false });

      return ApiResponse.success(res, 'Notifications retrieved successfully', {
        notifications,
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const notif = await Notification.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { recipient: req.user._id },
            { hospital: hospitalId },
          ],
        },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notif) {
        throw new ApiError(404, 'Notification not found.');
      }

      const unreadCount = await Notification.countDocuments({
        $or: [
          { recipient: req.user._id },
          { hospital: hospitalId },
        ],
        isRead: false,
      });

      return ApiResponse.success(res, 'Notification marked as read', {
        notification: notif,
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      await Notification.updateMany(
        {
          $or: [
            { recipient: req.user._id },
            { hospital: hospitalId },
          ],
          isRead: false,
        },
        { isRead: true, readAt: new Date() }
      );

      return ApiResponse.success(res, 'All notifications marked as read', {
        unreadCount: 0,
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 10. AUDIT LOGS
  // =========================================================================
  async getAuditLogs(req, res, next) {
    try {
      const { action, module, status, search, page = 1, limit = 25 } = req.query;
      const settings = await this._getOrCreateSettings(req);
      const hospitalId = settings._id;

      const hospitalStaffIds = await User.find({
        $or: [{ hospital: hospitalId }, { hospitalId: hospitalId }],
      }).distinct('_id');

      const query = {
        $and: [
          {
            $or: [
              { hospital: hospitalId },
              { 'details.hospitalId': hospitalId },
              { 'details.hospitalId': String(hospitalId) },
              { user: { $in: hospitalStaffIds } },
              { user: req.user._id },
            ],
          },
        ],
      };

      if (action && action !== 'all') {
        const safeAction = escapeRegex(action.trim());
        query.$and.push({ action: new RegExp(safeAction, 'i') });
      }
      if (module && module !== 'all') {
        query.$and.push({ module: module.toLowerCase().trim() });
      }
      if (status && status !== 'all') {
        query.$and.push({ status: status.toUpperCase().trim() });
      }
      if (search && search.trim()) {
        const safeSearch = escapeRegex(search.trim());
        const searchRegex = new RegExp(safeSearch, 'i');
        const orConditions = [
          { userEmail: searchRegex },
          { userRole: searchRegex },
          { action: searchRegex },
          { module: searchRegex },
          { ipAddress: searchRegex },
          { resourceId: searchRegex },
        ];

        const matchingUsers = await User.find({
          $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
        })
          .select('_id')
          .limit(20)
          .lean();

        if (matchingUsers.length > 0) {
          orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
        }

        query.$and.push({ $or: orConditions });
      }

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
      const skip = (parsedPage - 1) * parsedLimit;

      const total = await AuditLog.countDocuments(query);
      const rawLogs = await AuditLog.find(query)
        .populate('user', 'firstName lastName email roleName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      // Recursive sanitizer to guarantee NO passwords, hashes, tokens, or credentials leak
      const SENSITIVE_KEYS = new Set([
        'password',
        'passwordhash',
        'hash',
        'salt',
        'token',
        'accesstoken',
        'refreshtoken',
        'refreshtokens',
        'otp',
        'otpcode',
        'secret',
        'apikey',
        'authorization',
        'cookie',
        'credential',
        'credentials',
        'smtppassword',
        'privatekey',
      ]);

      const sanitizeDetails = (item) => {
        if (!item || typeof item !== 'object') return item;
        if (Array.isArray(item)) return item.map(sanitizeDetails);
        const clean = {};
        for (const [key, val] of Object.entries(item)) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
          if (SENSITIVE_KEYS.has(normalizedKey)) {
            continue;
          }
          clean[key] = sanitizeDetails(val);
        }
        return clean;
      };

      const logs = rawLogs.map((log) => {
        const actorName = log.user
          ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.userEmail
          : log.userEmail || 'System';

        return {
          _id: log._id,
          id: log._id,
          createdAt: log.createdAt,
          user: log.user
            ? {
                _id: log.user._id,
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
        };
      });

      return ApiResponse.success(res, 'Audit logs fetched successfully', {
        logs,
        pagination: {
          total,
          page: parsedPage,
          pages: Math.ceil(total / parsedLimit) || 1,
          limit: parsedLimit,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 11. ROLES & PERMISSIONS INSPECTION
  // =========================================================================
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

  // =========================================================================
  // 12. MY PROFILE
  // =========================================================================
  // 12. MY PROFILE
  // =========================================================================
  async getMyProfile(req, res, next) {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -refreshTokens -passwordResetToken -passwordResetExpires')
        .populate('role', 'name displayName permissions')
        .populate('hospital', 'hospitalName registrationNumber address contactEmail contactPhone currency currencySymbol timezone');

      if (!user) {
        throw new ApiError(404, 'User profile not found.');
      }

      return ApiResponse.success(res, 'Profile retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  async updateMyProfile(req, res, next) {
    try {
      let { firstName, lastName, fullName, phone, address, preferences } = req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        throw new ApiError(404, 'User profile not found.');
      }

      // Security: Disallow tampering with role, status, credentials or email via profile update
      if (req.body.role || req.body.roleName || req.body.permissions || req.body.status || req.body.isActive) {
        logger.warn(`User ${req.user.email} attempted role/status privilege escalation via profile update.`);
      }
      if (req.body.email && req.body.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
        throw new ApiError(400, 'Official email address is your login identity and cannot be modified here.');
      }

      // If fullName is provided without distinct firstName/lastName
      if (fullName !== undefined && (!firstName && !lastName)) {
        const trimmedFull = String(fullName).trim();
        if (!trimmedFull) {
          throw new ApiError(400, 'Full name is required and cannot be empty.');
        }
        if (trimmedFull.length > 100) {
          throw new ApiError(400, 'Full name cannot exceed 100 characters.');
        }
        const parts = trimmedFull.split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || parts[0];
      }

      // Validate and update First Name
      if (firstName !== undefined) {
        const trimmedFirst = String(firstName).trim();
        if (!trimmedFirst) {
          throw new ApiError(400, 'First name is required and cannot be empty.');
        }
        if (trimmedFirst.length > 50) {
          throw new ApiError(400, 'First name cannot exceed 50 characters.');
        }
        user.firstName = trimmedFirst;
      }

      // Validate and update Last Name
      if (lastName !== undefined) {
        const trimmedLast = String(lastName).trim();
        if (!trimmedLast) {
          throw new ApiError(400, 'Last name is required and cannot be empty.');
        }
        if (trimmedLast.length > 50) {
          throw new ApiError(400, 'Last name cannot exceed 50 characters.');
        }
        user.lastName = trimmedLast;
      }

      // Update Phone
      if (phone !== undefined) {
        user.phone = String(phone).trim();
      }

      // Update Address (supports both string and structured object)
      if (typeof address === 'string') {
        user.address = {
          street: address.trim(),
          city: user.address?.city || '',
          state: user.address?.state || '',
          postalCode: user.address?.postalCode || '',
          country: user.address?.country || '',
        };
      } else if (address && typeof address === 'object') {
        user.address = {
          street: (address.street || user.address?.street || '').trim(),
          city: (address.city || user.address?.city || '').trim(),
          state: (address.state || user.address?.state || '').trim(),
          postalCode: (address.postalCode || user.address?.postalCode || '').trim(),
          country: (address.country || user.address?.country || '').trim(),
        };
      }

      if (preferences && typeof preferences === 'object') {
        user.preferences = { ...user.preferences, ...preferences };
      }

      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        user: user._id,
        userEmail: user.email,
        userRole: user.roleName,
        hospital: user.hospital || user.hospitalId || null,
        action: 'UPDATE_PROFILE',
        module: 'auth',
        status: 'SUCCESS',
        details: {
          hospitalId: user.hospital || user.hospitalId,
          updatedFields: Object.keys(req.body).filter((k) =>
            ['firstName', 'lastName', 'phone', 'address', 'preferences'].includes(k)
          ),
        },
      });

      const updatedUser = await User.findById(user._id)
        .select('-password -refreshTokens -passwordResetToken -passwordResetExpires')
        .populate('role', 'name displayName permissions')
        .populate('hospital', 'hospitalName registrationNumber address contactEmail contactPhone currency currencySymbol timezone');

      return ApiResponse.success(res, 'Profile updated successfully', updatedUser);
    } catch (error) {
      next(error);
    }
  }
}

// Bind all methods to ensure proper `this` context
const controller = new HospitalAdminController();
const boundController = {};
for (const key of Object.getOwnPropertyNames(HospitalAdminController.prototype)) {
  if (typeof controller[key] === 'function') {
    boundController[key] = controller[key].bind(controller);
  }
}

module.exports = boundController;

