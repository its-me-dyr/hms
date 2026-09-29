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

class HospitalAdminController {
  /**
   * Helper to fetch or initialize HospitalSetting singleton
   */
  async _getOrCreateSettings() {
    let settings = await HospitalSetting.findOne();
    if (!settings) {
      settings = await HospitalSetting.create({
        branches: [
          {
            name: 'Central Hospital Campus',
            code: 'MAIN-01',
            isMain: true,
            address: {
              street: '100 Medical Center Drive',
              city: 'Metropolis',
              state: 'NY',
              postalCode: '10001',
              country: 'United States',
            },
            phone: '+1 (800) 555-0199',
            email: 'main@hms.com',
            capacity: 250,
            isActive: true,
          },
        ],
        services: [
          {
            code: 'CONS-GEN',
            name: 'General Consultation',
            category: 'Consultation',
            department: 'General Medicine',
            charge: 50,
            description: 'Routine outpatient consultation with general physician',
            isActive: true,
          },
          {
            code: 'CONS-SPEC',
            name: 'Specialist Consultation',
            category: 'Consultation',
            department: 'Cardiology',
            charge: 100,
            description: 'Consultation with senior medical specialist',
            isActive: true,
          },
          {
            code: 'DIAG-ECG',
            name: 'Electrocardiogram (ECG)',
            category: 'Diagnostic',
            department: 'Cardiology',
            charge: 75,
            description: '12-lead standard diagnostic electrocardiogram',
            isActive: true,
          },
          {
            code: 'LAB-CBC',
            name: 'Complete Blood Count (CBC)',
            category: 'Laboratory',
            department: 'Pathology & Laboratory',
            charge: 35,
            description: 'Full hemogram and differential leukocyte count',
            isActive: true,
          },
          {
            code: 'RAD-XRAY',
            name: 'Chest X-Ray Digital',
            category: 'Radiology',
            department: 'Radiology & Imaging',
            charge: 65,
            description: 'High-resolution digital posteroanterior chest radiograph',
            isActive: true,
          },
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
    return settings;
  }

  // =========================================================================
  // 1. DASHBOARD OVERVIEW
  // =========================================================================
  async getDashboardOverview(req, res, next) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalStaff,
        activeStaff,
        doctorsCount,
        nursesCount,
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
        settings,
      ] = await Promise.all([
        User.countDocuments({ roleName: { $ne: 'PATIENT' } }),
        User.countDocuments({ roleName: { $ne: 'PATIENT' }, isActive: true, status: 'active' }),
        User.countDocuments({ roleName: 'DOCTOR', isActive: true }),
        User.countDocuments({ roleName: 'NURSE', isActive: true }),
        Department.countDocuments(),
        Department.countDocuments({ isActive: true }),
        Appointment.countDocuments(),
        Appointment.countDocuments({ appointmentDate: { $gte: todayStart } }),
        Appointment.countDocuments({ status: 'Completed' }),
        Appointment.countDocuments({ status: { $in: ['Pending', 'Confirmed'] } }),
        Bill.countDocuments(),
        Bill.aggregate([
          { $match: { paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .select('-details.password'),
        Notification.countDocuments({ recipient: req.user._id, isRead: false }),
        HospitalSetting.findOne(),
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
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'Hospital settings retrieved successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  async updateHospitalSettings(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings();
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

      if (hospitalName) settings.hospitalName = hospitalName.trim();
      if (registrationNumber) settings.registrationNumber = registrationNumber.trim();
      if (tagline !== undefined) settings.tagline = tagline.trim();
      if (contactEmail) settings.contactEmail = contactEmail.trim().toLowerCase();
      if (contactPhone) settings.contactPhone = contactPhone.trim();
      if (emergencyHotline) settings.emergencyHotline = emergencyHotline.trim();
      if (currency) settings.currency = currency.trim();
      if (currencySymbol) settings.currencySymbol = currencySymbol.trim();
      if (timezone) settings.timezone = timezone.trim();
      if (taxId !== undefined) settings.taxId = taxId.trim();

      if (address && typeof address === 'object') {
        settings.address = {
          street: address.street || settings.address.street,
          city: address.city || settings.address.city,
          state: address.state || settings.address.state,
          postalCode: address.postalCode || settings.address.postalCode,
          country: address.country || settings.address.country,
        };
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: 'UPDATE_HOSPITAL_SETTINGS',
        module: 'admin',
        status: 'SUCCESS',
        details: { hospitalName: settings.hospitalName, contactEmail: settings.contactEmail },
      });

      return ApiResponse.success(res, 'Hospital parameters updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  async getBranches(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'Hospital branches retrieved successfully', settings.branches || []);
    } catch (error) {
      next(error);
    }
  }

  async saveBranch(req, res, next) {
    try {
      const { id, name, code, isMain, address, phone, email, capacity, isActive } = req.body;

      if (!name || !code) {
        throw new ApiError(400, 'Branch name and unique branch code are required.');
      }

      const settings = await this._getOrCreateSettings();
      const branchCode = code.trim().toUpperCase();

      if (id) {
        // Update existing branch
        const branchIndex = settings.branches.findIndex((b) => String(b._id) === String(id));
        if (branchIndex === -1) {
          throw new ApiError(404, 'Branch not found.');
        }

        // Check unique code across other branches
        const duplicate = settings.branches.some(
          (b, i) => i !== branchIndex && b.code === branchCode
        );
        if (duplicate) {
          throw new ApiError(409, `Another branch with code ${branchCode} already exists.`);
        }

        settings.branches[branchIndex].name = name.trim();
        settings.branches[branchIndex].code = branchCode;
        settings.branches[branchIndex].isMain = Boolean(isMain);
        settings.branches[branchIndex].phone = phone || '';
        settings.branches[branchIndex].email = email || '';
        settings.branches[branchIndex].capacity = Number(capacity) || 50;
        if (isActive !== undefined) settings.branches[branchIndex].isActive = Boolean(isActive);
        if (address) {
          settings.branches[branchIndex].address = {
            street: address.street || '',
            city: address.city || '',
            state: address.state || '',
            postalCode: address.postalCode || '',
            country: address.country || '',
          };
        }
      } else {
        // Create new branch
        const duplicate = settings.branches.some((b) => b.code === branchCode);
        if (duplicate) {
          throw new ApiError(409, `A branch with code ${branchCode} already exists.`);
        }

        settings.branches.push({
          name: name.trim(),
          code: branchCode,
          isMain: Boolean(isMain),
          phone: phone || '',
          email: email || '',
          capacity: Number(capacity) || 50,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          address: {
            street: address?.street || '',
            city: address?.city || '',
            state: address?.state || '',
            postalCode: address?.postalCode || '',
            country: address?.country || '',
          },
        });
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: id ? 'UPDATE_BRANCH' : 'CREATE_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { name, code: branchCode },
      });

      return ApiResponse.success(
        res,
        id ? 'Branch updated successfully' : 'Branch created successfully',
        settings.branches
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings();

      const branch = settings.branches.id(id);
      if (!branch) {
        throw new ApiError(404, 'Branch not found.');
      }

      if (branch.isMain) {
        throw new ApiError(400, 'The primary hospital branch cannot be deleted.');
      }

      const branchName = branch.name;
      const branchCode = branch.code;
      settings.branches.pull({ _id: id });
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: 'DELETE_BRANCH',
        module: 'admin',
        status: 'SUCCESS',
        details: { name: branchName, code: branchCode },
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
      let departments = await Department.find().sort({ name: 1 });

      if (departments.length === 0) {
        const defaultDepts = [
          { name: 'Cardiology', code: 'CARD', description: 'Cardiovascular and coronary care.', capacity: 35 },
          { name: 'Neurology', code: 'NEUR', description: 'Neurological and brain care.', capacity: 25 },
          { name: 'Orthopedics', code: 'ORTH', description: 'Musculoskeletal surgery and trauma recovery.', capacity: 40 },
          { name: 'Pediatrics', code: 'PEDI', description: 'Pediatric medicine and wellness.', capacity: 30 },
          { name: 'Radiology & Imaging', code: 'RADI', description: 'Diagnostic imaging and scan evaluations.', capacity: 20 },
          { name: 'Pathology & Laboratory', code: 'PATH', description: 'Clinical laboratory specimen testing.', capacity: 20 },
          { name: 'Emergency Medicine', code: 'EMER', description: '24/7 acute trauma and emergency triage.', capacity: 50 },
          { name: 'General Surgery', code: 'SURG', description: 'Elective and emergency surgical operations.', capacity: 30 },
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

  async createDepartment(req, res, next) {
    try {
      const { name, code, description, location, capacity, headName } = req.body;

      if (!name || !code) {
        throw new ApiError(400, 'Department name and unique code are required.');
      }

      const cleanCode = code.trim().toUpperCase();
      const cleanName = name.trim();

      const existing = await Department.findOne({
        $or: [{ name: cleanName }, { code: cleanCode }],
      });
      if (existing) {
        throw new ApiError(409, 'A department with this name or code already exists.');
      }

      const dept = await Department.create({
        name: cleanName,
        code: cleanCode,
        description: (description || '').trim(),
        location: (location || 'Main Hospital Tower').trim(),
        capacity: Number(capacity) || 25,
        headName: (headName || '').trim(),
        isActive: true,
      });

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
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

  async updateDepartment(req, res, next) {
    try {
      const { id } = req.params;
      const { name, code, description, location, capacity, headName, isActive } = req.body;

      const dept = await Department.findById(id);
      if (!dept) {
        throw new ApiError(404, 'Department not found.');
      }

      if (code) {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode !== dept.code) {
          const duplicate = await Department.findOne({ code: cleanCode, _id: { $ne: id } });
          if (duplicate) {
            throw new ApiError(409, `Another department with code ${cleanCode} already exists.`);
          }
          dept.code = cleanCode;
        }
      }

      if (name) {
        const cleanName = name.trim();
        if (cleanName !== dept.name) {
          const duplicate = await Department.findOne({ name: cleanName, _id: { $ne: id } });
          if (duplicate) {
            throw new ApiError(409, `Another department named '${cleanName}' already exists.`);
          }
          dept.name = cleanName;
        }
      }

      if (description !== undefined) dept.description = description.trim();
      if (location !== undefined) dept.location = location.trim();
      if (capacity !== undefined) dept.capacity = Number(capacity);
      if (headName !== undefined) dept.headName = headName.trim();
      if (isActive !== undefined) dept.isActive = Boolean(isActive);

      await dept.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
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

  async toggleDepartmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const dept = await Department.findById(id);
      if (!dept) {
        throw new ApiError(404, 'Department not found.');
      }

      dept.isActive = !dept.isActive;
      await dept.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: dept.isActive ? 'ACTIVATE_DEPARTMENT' : 'DEACTIVATE_DEPARTMENT',
        module: 'admin',
        resourceId: String(dept._id),
        status: 'SUCCESS',
        details: { name: dept.name, code: dept.code, isActive: dept.isActive },
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
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'Services and charges retrieved successfully', settings.services || []);
    } catch (error) {
      next(error);
    }
  }

  async saveServiceCharge(req, res, next) {
    try {
      const { id, code, name, category, department, charge, description, isActive } = req.body;

      if (!code || !name || charge === undefined || charge === null) {
        throw new ApiError(400, 'Service code, name, and charge amount are required.');
      }

      const numericCharge = Number(charge);
      if (isNaN(numericCharge) || numericCharge < 0) {
        throw new ApiError(400, 'Charge must be a valid non-negative number.');
      }

      const settings = await this._getOrCreateSettings();
      const serviceCode = code.trim().toUpperCase();

      if (id) {
        // Update service
        const svcIndex = settings.services.findIndex((s) => String(s._id) === String(id));
        if (svcIndex === -1) {
          throw new ApiError(404, 'Service charge record not found.');
        }

        const duplicate = settings.services.some(
          (s, i) => i !== svcIndex && s.code === serviceCode
        );
        if (duplicate) {
          throw new ApiError(409, `Another service with code ${serviceCode} already exists.`);
        }

        settings.services[svcIndex].code = serviceCode;
        settings.services[svcIndex].name = name.trim();
        settings.services[svcIndex].category = category ? category.trim() : 'General';
        settings.services[svcIndex].department = department ? department.trim() : '';
        settings.services[svcIndex].charge = numericCharge;
        settings.services[svcIndex].description = description ? description.trim() : '';
        if (isActive !== undefined) settings.services[svcIndex].isActive = Boolean(isActive);
      } else {
        // Create service
        const duplicate = settings.services.some((s) => s.code === serviceCode);
        if (duplicate) {
          throw new ApiError(409, `A service with code ${serviceCode} already exists.`);
        }

        settings.services.push({
          code: serviceCode,
          name: name.trim(),
          category: category ? category.trim() : 'General',
          department: department ? department.trim() : '',
          charge: numericCharge,
          description: description ? description.trim() : '',
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        });
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: id ? 'UPDATE_SERVICE_CHARGE' : 'CREATE_SERVICE_CHARGE',
        module: 'billing',
        status: 'SUCCESS',
        details: { code: serviceCode, name, charge: numericCharge },
      });

      return ApiResponse.success(
        res,
        id ? 'Service charge updated successfully' : 'Service charge created successfully',
        settings.services
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteServiceCharge(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings();

      const service = settings.services.id(id);
      if (!service) {
        throw new ApiError(404, 'Service charge record not found.');
      }

      const svcName = service.name;
      const svcCode = service.code;
      settings.services.pull({ _id: id });
      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: 'DELETE_SERVICE_CHARGE',
        module: 'billing',
        status: 'SUCCESS',
        details: { name: svcName, code: svcCode },
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
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'Operating hours and holidays retrieved', {
        operatingHours: settings.operatingHours || [],
        holidays: settings.holidays || [],
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

      const settings = await this._getOrCreateSettings();
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
        action: 'UPDATE_OPERATING_HOURS',
        module: 'admin',
        status: 'SUCCESS',
        details: { daysCount: settings.operatingHours.length },
      });

      return ApiResponse.success(res, 'Operating hours saved successfully', settings.operatingHours);
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

      const settings = await this._getOrCreateSettings();

      if (id) {
        const holidayIndex = settings.holidays.findIndex((h) => String(h._id) === String(id));
        if (holidayIndex === -1) {
          throw new ApiError(404, 'Holiday record not found.');
        }
        settings.holidays[holidayIndex].name = name.trim();
        settings.holidays[holidayIndex].date = String(date).trim();
        settings.holidays[holidayIndex].description = description ? description.trim() : '';
      } else {
        settings.holidays.push({
          name: name.trim(),
          date: String(date).trim(),
          description: description ? description.trim() : '',
        });
      }

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: id ? 'UPDATE_HOLIDAY' : 'CREATE_HOLIDAY',
        module: 'admin',
        status: 'SUCCESS',
        details: { name, date },
      });

      return ApiResponse.success(
        res,
        id ? 'Holiday updated successfully' : 'Holiday added successfully',
        settings.holidays
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const settings = await this._getOrCreateSettings();

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
        action: 'DELETE_HOLIDAY',
        module: 'admin',
        status: 'SUCCESS',
        details: { name: hName },
      });

      return ApiResponse.success(res, 'Holiday removed successfully', settings.holidays);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6. HOSPITAL BRANDING
  // =========================================================================
  async getBranding(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'Branding parameters retrieved', settings.branding || {});
    } catch (error) {
      next(error);
    }
  }

  async updateBranding(req, res, next) {
    try {
      const { logoUrl, faviconUrl, primaryColor, accentColor, headerText, footerText } = req.body;
      const settings = await this._getOrCreateSettings();

      settings.branding = {
        logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : settings.branding.logoUrl,
        faviconUrl: faviconUrl !== undefined ? String(faviconUrl).trim() : settings.branding.faviconUrl,
        primaryColor: primaryColor ? String(primaryColor).trim() : settings.branding.primaryColor,
        accentColor: accentColor ? String(accentColor).trim() : settings.branding.accentColor,
        headerText: headerText !== undefined ? String(headerText).trim() : settings.branding.headerText,
        footerText: footerText !== undefined ? String(footerText).trim() : settings.branding.footerText,
      };

      await settings.save();

      await AuditLog.create({
        user: req.user?._id && req.user._id !== 'super_admin_system' ? req.user._id : null,
        userEmail: req.user?.email || 'hospitaladmin@hms.com',
        userRole: 'HOSPITAL_ADMIN',
        action: 'UPDATE_BRANDING',
        module: 'admin',
        status: 'SUCCESS',
        details: { headerText: settings.branding.headerText, primaryColor: settings.branding.primaryColor },
      });

      return ApiResponse.success(res, 'Hospital branding updated successfully', settings.branding);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 7. SYSTEM CONFIGURATION
  // =========================================================================
  async getSystemConfig(req, res, next) {
    try {
      const settings = await this._getOrCreateSettings();
      return ApiResponse.success(res, 'System configuration retrieved', settings.systemConfig || {});
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
        enableEmailNotifications,
        maintenanceMode,
      } = req.body;

      const settings = await this._getOrCreateSettings();

      if (appointmentBufferMinutes !== undefined) {
        settings.systemConfig.appointmentBufferMinutes = Math.max(0, Number(appointmentBufferMinutes));
      }
      if (maxAppointmentsPerSlot !== undefined) {
        settings.systemConfig.maxAppointmentsPerSlot = Math.max(1, Number(maxAppointmentsPerSlot));
      }
      if (emergencyContactNumber !== undefined) {
        settings.systemConfig.emergencyContactNumber = String(emergencyContactNumber).trim();
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
        action: 'UPDATE_SYSTEM_CONFIG',
        module: 'admin',
        status: 'SUCCESS',
        details: { maintenanceMode: settings.systemConfig.maintenanceMode },
      });

      return ApiResponse.success(res, 'System configuration updated successfully', settings.systemConfig);
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 8. ADMINISTRATIVE REPORTS
  // =========================================================================
  async getAdministrativeReports(req, res, next) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

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
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: 'Completed' }),
        Appointment.countDocuments({ status: 'Cancelled' }),
        Appointment.countDocuments({ status: { $in: ['Pending', 'Confirmed'] } }),
        Bill.countDocuments(),
        Bill.countDocuments({ paymentStatus: 'Paid' }),
        Bill.aggregate([
          { $match: { paymentStatus: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$paidAmount' } } },
        ]),
        Department.find().sort({ name: 1 }),
        User.aggregate([
          { $match: { roleName: { $ne: 'PATIENT' } } },
          { $group: { _id: '$roleName', count: { $sum: 1 } } },
        ]),
      ]);

      const totalRevenue = revenueAgg[0]?.total || 0;

      // Department breakdown with actual staff and doctor counts
      const departmentAnalytics = await Promise.all(
        departments.map(async (dept) => {
          const docCount = await User.countDocuments({ department: dept.name, roleName: 'DOCTOR', isActive: true });
          const staffCount = await User.countDocuments({ department: dept.name, roleName: { $ne: 'PATIENT' }, isActive: true });
          const apptCount = await Appointment.countDocuments({ department: dept.name });
          return {
            id: dept._id,
            name: dept.name,
            code: dept.code,
            capacity: dept.capacity || 25,
            doctorCount: docCount,
            staffCount: staffCount,
            appointmentCount: apptCount,
            isActive: dept.isActive,
          };
        })
      );

      const staffDistribution = staffByRoleAgg.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      return ApiResponse.success(res, 'Administrative reports compiled successfully', {
        clinicalMetrics: {
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          pendingAppointments,
          completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 100,
        },
        financialMetrics: {
          totalBills,
          paidBills,
          totalRevenue,
          collectionRate: totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 100,
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
      const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
      const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

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
      const notif = await Notification.findOneAndUpdate(
        { _id: id, recipient: req.user._id },
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

  async markAllNotificationsRead(req, res, next) {
    try {
      await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return ApiResponse.success(res, 'All notifications marked as read');
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
        .limit(parseInt(limit, 10))
        .select('-details.password');

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
  async getMyProfile(req, res, next) {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -refreshTokens')
        .populate('role', 'name displayName permissions');

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
      const { firstName, lastName, phone, address, preferences } = req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        throw new ApiError(404, 'User profile not found.');
      }

      // Security: Disallow tampering with role or credentials via profile update
      if (req.body.role || req.body.roleName || req.body.password || req.body.permissions) {
        logger.warn(`User ${req.user.email} attempted role/credential modification via profile update.`);
      }

      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (address && typeof address === 'object') {
        user.address = {
          street: address.street || user.address?.street || '',
          city: address.city || user.address?.city || '',
          state: address.state || user.address?.state || '',
          postalCode: address.postalCode || user.address?.postalCode || '',
          country: address.country || user.address?.country || '',
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
        action: 'UPDATE_PROFILE',
        module: 'auth',
        status: 'SUCCESS',
        details: { updatedFields: Object.keys(req.body).filter((k) => ['firstName', 'lastName', 'phone', 'address', 'preferences'].includes(k)) },
      });

      const updatedUser = await User.findById(user._id)
        .select('-password -refreshTokens')
        .populate('role', 'name displayName');

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
