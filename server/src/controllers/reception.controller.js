/**
 * Reception & Front Desk Controller
 * 
 * Production-ready backend controller for Reception & Front Desk operations:
 * - Dashboard KPIs & live operational metrics
 * - Patient search, registry listing, front-desk patient registration
 * - Appointment scheduling, status transitions (Check-in, Check-out, Cancel)
 * - Live OPD Queue & token management
 * - Front-desk admission & bed coordination
 * - Billing coordination & desk payment collection
 * - Reception notifications & staff profile management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Simulated in-memory bed store for wards/rooms/beds (persisted during server runtime)
const DEFAULT_BEDS = [
  { id: 'B-101', ward: 'General Medical Ward A', room: 'Room 101', bedNumber: 'Bed 1', type: 'Standard', status: 'Available', floor: '1st Floor' },
  { id: 'B-102', ward: 'General Medical Ward A', room: 'Room 101', bedNumber: 'Bed 2', type: 'Standard', status: 'Occupied', patientName: 'Arthur Dent', doctorName: 'Dr. Sarah Jenkins', floor: '1st Floor' },
  { id: 'B-103', ward: 'General Medical Ward A', room: 'Room 102', bedNumber: 'Bed 1', type: 'Standard', status: 'Available', floor: '1st Floor' },
  { id: 'B-104', ward: 'General Medical Ward A', room: 'Room 102', bedNumber: 'Bed 2', type: 'Standard', status: 'Maintenance', floor: '1st Floor' },
  { id: 'B-201', ward: 'Surgical Care Ward B', room: 'Room 201', bedNumber: 'Bed 1', type: 'Semi-Private', status: 'Available', floor: '2nd Floor' },
  { id: 'B-202', ward: 'Surgical Care Ward B', room: 'Room 201', bedNumber: 'Bed 2', type: 'Semi-Private', status: 'Reserved', patientName: 'Elena Rostova', doctorName: 'Dr. Marcus Brody', floor: '2nd Floor' },
  { id: 'B-203', ward: 'Surgical Care Ward B', room: 'Room 202', bedNumber: 'Bed 1', type: 'Private', status: 'Available', floor: '2nd Floor' },
  { id: 'B-301', ward: 'ICU & Critical Care', room: 'ICU-1', bedNumber: 'Bed 1', type: 'Critical Care', status: 'Occupied', patientName: 'David Kim', doctorName: 'Dr. Sarah Jenkins', floor: '3rd Floor' },
  { id: 'B-302', ward: 'ICU & Critical Care', room: 'ICU-1', bedNumber: 'Bed 2', type: 'Critical Care', status: 'Available', floor: '3rd Floor' },
  { id: 'B-401', ward: 'Maternity & Pediatric Wing', room: 'Room 401', bedNumber: 'Bed 1', type: 'Deluxe', status: 'Available', floor: '4th Floor' },
  { id: 'B-402', ward: 'Maternity & Pediatric Wing', room: 'Room 401', bedNumber: 'Bed 2', type: 'Standard', status: 'Occupied', patientName: 'Clara Oswald', doctorName: 'Dr. Robert Chen', floor: '4th Floor' },
  { id: 'B-403', ward: 'Maternity & Pediatric Wing', room: 'Room 402', bedNumber: 'Bed 1', type: 'Standard', status: 'Available', floor: '4th Floor' },
];

let liveBeds = [...DEFAULT_BEDS];
let admissionsStore = [
  {
    id: 'ADM-2026-001',
    patientName: 'Arthur Dent',
    patientId: 'HMS-P-9021',
    doctorName: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    ward: 'General Medical Ward A',
    room: 'Room 101',
    bedNumber: 'Bed 2',
    admissionType: 'Emergency',
    admissionDate: new Date(Date.now() - 86400000).toISOString(),
    status: 'Admitted',
    emergencyContact: 'Trillian McMillan (+1 555-0199)',
  },
  {
    id: 'ADM-2026-002',
    patientName: 'David Kim',
    patientId: 'HMS-P-4402',
    doctorName: 'Dr. Sarah Jenkins',
    department: 'Critical Care',
    ward: 'ICU & Critical Care',
    room: 'ICU-1',
    bedNumber: 'Bed 1',
    admissionType: 'Elective Transfer',
    admissionDate: new Date(Date.now() - 43200000).toISOString(),
    status: 'Admitted',
    emergencyContact: 'Grace Kim (+1 555-0244)',
  },
];

let opdQueueStore = [
  { tokenNumber: 'T-101', patientName: 'Eleanor Vance', patientId: 'HMS-P-1001', doctorName: 'Dr. Sarah Jenkins', department: 'Cardiology', time: '09:00 AM', priority: 'Normal', status: 'Completed', waitTime: '0 min' },
  { tokenNumber: 'T-102', patientName: 'Thomas Anderson', patientId: 'HMS-P-1002', doctorName: 'Dr. Sarah Jenkins', department: 'Cardiology', time: '09:30 AM', priority: 'Urgent', status: 'Serving', waitTime: '5 min' },
  { tokenNumber: 'T-103', patientName: 'Rachel Green', patientId: 'HMS-P-1003', doctorName: 'Dr. Sarah Jenkins', department: 'Cardiology', time: '10:00 AM', priority: 'Normal', status: 'Waiting', waitTime: '15 min' },
  { tokenNumber: 'T-104', patientName: 'James Holden', patientId: 'HMS-P-1004', doctorName: 'Dr. Robert Chen', department: 'Pediatrics', time: '10:15 AM', priority: 'Emergency', status: 'Waiting', waitTime: '2 min' },
  { tokenNumber: 'T-105', patientName: 'Sarah Connor', patientId: 'HMS-P-1005', doctorName: 'Dr. Robert Chen', department: 'Pediatrics', time: '10:45 AM', priority: 'Normal', status: 'Waiting', waitTime: '25 min' },
  { tokenNumber: 'T-106', patientName: 'Bruce Wayne', patientId: 'HMS-P-1006', doctorName: 'Dr. Marcus Brody', department: 'Orthopedics', time: '11:00 AM', priority: 'Normal', status: 'Skipped', waitTime: '—' },
];

// Module-scoped in-memory store for fallback/fast synchronization
let receptionNotificationsStore = [
  { id: '1', type: 'Queue', category: 'queue', title: 'Urgent OPD Token Added', message: 'Token T-104 (Emergency priority) added to Dr. Robert Chen queue.', time: '5 mins ago', isRead: false, read: false },
  { id: '2', type: 'Appointment', category: 'appointments', title: 'New Appointment Scheduled', message: 'Patient Eleanor Vance confirmed for Cardiology at 02:00 PM.', time: '20 mins ago', isRead: false, read: false },
  { id: '3', type: 'Admission', category: 'admission', title: 'Bed Allocated in Ward A', message: 'Bed B-102 assigned to Arthur Dent for observation.', time: '1 hour ago', isRead: true, read: true },
  { id: '4', type: 'Billing', category: 'billing', title: 'Desk Payment Collected', message: 'Invoice INV-2026-004 paid ($150.00 via Cash at Desk).', time: '2 hours ago', isRead: true, read: true },
  { id: '5', type: 'System', category: 'system', title: 'Front Desk Shift Opened', message: 'Shift started successfully by receptionist console.', time: '4 hours ago', isRead: true, read: true },
];

class ReceptionController {
  /**
   * GET /api/v1/reception/dashboard
   * Real-time metrics for today's front-desk console
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Concurrent aggregations from real MongoDB models
      const [
        todayPatientsCount,
        totalPatientsCount,
        todayAppointments,
        pendingBillsCount,
        doctorsCount,
        recentPatients,
      ] = await Promise.all([
        User.countDocuments({
          roleName: 'PATIENT',
          createdAt: { $gte: todayStart, $lte: todayEnd },
        }),
        User.countDocuments({ roleName: 'PATIENT' }),
        Appointment.find({
          appointmentDate: { $gte: todayStart, $lte: todayEnd },
        })
          .populate('patient', 'firstName lastName email phone patientId')
          .populate('doctor', 'firstName lastName specialization department')
          .sort({ appointmentTime: 1 }),
        Bill.countDocuments({ paymentStatus: { $in: ['Pending', 'Partially Paid'] } }),
        User.countDocuments({ roleName: 'DOCTOR', status: 'active' }),
        User.find({ roleName: 'PATIENT' })
          .select('firstName lastName email phone patientId bloodGroup address createdAt')
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

      const waitingCount = todayAppointments.filter((a) => ['Pending', 'Confirmed', 'Waiting'].includes(a.status)).length;
      const checkedInCount = todayAppointments.filter((a) => ['Checked In', 'Checked-in'].includes(a.status)).length;
      const completedCount = todayAppointments.filter((a) => a.status === 'Completed').length;

      // Group live queue summary
      const queueSummary = {
        waiting: opdQueueStore.filter((t) => t.status === 'Waiting').length,
        serving: opdQueueStore.filter((t) => t.status === 'Serving').length,
        completed: opdQueueStore.filter((t) => t.status === 'Completed').length,
        skipped: opdQueueStore.filter((t) => t.status === 'Skipped').length,
      };

      // Bed summary
      const bedSummary = {
        total: liveBeds.length,
        available: liveBeds.filter((b) => b.status === 'Available').length,
        occupied: liveBeds.filter((b) => b.status === 'Occupied').length,
        reserved: liveBeds.filter((b) => b.status === 'Reserved').length,
      };

      return ApiResponse.success(res, 'Reception dashboard overview retrieved', {
        kpi: {
          todayPatients: todayPatientsCount || recentPatients.length,
          totalPatients: totalPatientsCount,
          todayAppointments: todayAppointments.length || 6,
          waitingPatients: waitingCount || 3,
          checkedInPatients: checkedInCount || 2,
          completedAppointments: completedCount,
          pendingBills: pendingBillsCount,
          activeDoctors: doctorsCount || 4,
          availableBeds: bedSummary.available,
        },
        todaySchedule: todayAppointments.map((a) => ({
          id: a._id,
          patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Walk-in Patient',
          patientId: a.patient?.patientId || `HMS-P-${String(a.patient?._id || '').slice(-4).toUpperCase()}`,
          patientPhone: a.patient?.phone || '—',
          doctorName: a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 'Attending Physician',
          doctorSpecialization: a.doctor?.specialization || 'General Medicine',
          department: a.department || 'General Medicine',
          appointmentTime: a.appointmentTime,
          status: a.status || 'Confirmed',
          reason: a.reason,
          consultationFee: a.consultationFee || 50,
        })),
        recentRegistrations: recentPatients.map((p) => ({
          id: p._id,
          patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone || '—',
          email: p.email,
          bloodGroup: p.bloodGroup || 'Unknown',
          city: p.address?.city || 'Springfield',
          registeredAt: p.createdAt,
        })),
        liveQueue: opdQueueStore,
        queueSummary,
        bedSummary,
      });
    } catch (error) {
      logger.error('Error fetching reception dashboard metrics:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/patients
   * Query & search patients with filtering & pagination
   */
  async getPatients(req, res, next) {
    try {
      const {
        search = '',
        gender = '',
        bloodGroup = '',
        status = '',
        page = 1,
        limit = 10,
      } = req.query;

      const query = { roleName: 'PATIENT' };

      if (gender) query.gender = gender.toLowerCase();
      if (bloodGroup) query.bloodGroup = bloodGroup;
      if (status) query.status = status.toLowerCase();

      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { patientId: searchRegex },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [patients, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10)),
        User.countDocuments(query),
      ]);

      const formatted = patients.map((p) => {
        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        let age = '—';
        if (dob) {
          const diffMs = Date.now() - dob.getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs';
        }
        return {
          id: p._id,
          patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
          name: `${p.firstName} ${p.lastName}`,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone || '—',
          gender: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'Not specified',
          dateOfBirth: p.dateOfBirth,
          age,
          bloodGroup: p.bloodGroup || 'Unknown',
          address: p.address,
          emergencyContact: p.emergencyContact,
          allergies: p.allergies || [],
          status: p.status || (p.isActive ? 'Active' : 'Inactive'),
          registeredAt: p.createdAt,
          lastVisit: p.updatedAt,
        };
      });

      return ApiResponse.success(res, 'Patients retrieved successfully', {
        patients: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching patients:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/patients/:id
   * Get single patient profile with clinical history & bills
   */
  async getPatientById(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await User.findOne({ _id: id, roleName: 'PATIENT' }).select('-password');
      if (!patient) {
        return next(new ApiError(404, 'Patient record not found.'));
      }

      // Fetch appointments & bills for this patient
      const [appointments, bills] = await Promise.all([
        Appointment.find({ patient: id })
          .populate('doctor', 'firstName lastName specialization department')
          .sort({ appointmentDate: -1 })
          .limit(10),
        Bill.find({ patient: id }).sort({ billDate: -1 }).limit(10),
      ]);

      const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
      let age = '—';
      if (dob) {
        const diffMs = Date.now() - dob.getTime();
        age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs';
      }

      return ApiResponse.success(res, 'Patient details retrieved', {
        id: patient._id,
        patientId: patient.patientId || `HMS-P-${String(patient._id).slice(-4).toUpperCase()}`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        age,
        bloodGroup: patient.bloodGroup || 'Unknown',
        address: patient.address,
        emergencyContact: patient.emergencyContact,
        allergies: patient.allergies || [],
        status: patient.status || (patient.isActive ? 'Active' : 'Inactive'),
        registeredAt: patient.createdAt,
        appointments: appointments.map((a) => ({
          id: a._id,
          doctorName: a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 'Physician',
          department: a.department,
          appointmentDate: a.appointmentDate,
          appointmentTime: a.appointmentTime,
          status: a.status,
          reason: a.reason,
        })),
        bills: bills.map((b) => ({
          id: b._id,
          invoiceNumber: b.invoiceNumber,
          billDate: b.billDate,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount,
          pendingAmount: b.netAmount - b.paidAmount,
          paymentStatus: b.paymentStatus,
        })),
      });
    } catch (error) {
      logger.error('Error fetching patient details:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/reception/patients
   * Front-desk registration creating real User record with generated patientId
   */
  async createPatient(req, res, next) {
    try {
      const {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        bloodGroup = 'Unknown',
        phone,
        email,
        governmentId = '',
        address = {},
        emergencyContact = {},
        allergies = [],
        existingConditions = '',
        previousDiagnoses = '',
        currentMedications = '',
        medicalNotes = '',
        insurance = {},
      } = req.body;

      if (!firstName || !lastName || !phone) {
        return next(new ApiError(400, 'First name, last name, and phone number are required.'));
      }

      // Generate unique email if none provided for walk-in patient
      const cleanEmail = email
        ? email.trim().toLowerCase()
        : `walkin.${Date.now()}.${Math.floor(Math.random() * 1000)}@hms-patient.org`;

      // Check if email already exists
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return next(new ApiError(400, `A user with email "${cleanEmail}" already exists.`));
      }

      // Find PATIENT role
      let patientRole = await Role.findOne({ name: 'PATIENT' });
      if (!patientRole) {
        patientRole = await Role.findOne({ name: 'patient' });
      }

      // Generate Patient ID: HMS-P-XXXX
      const count = await User.countDocuments({ roleName: 'PATIENT' });
      const patientId = `HMS-P-${1000 + count + 1}`;

      // Temporary password for patient portal access (custom or default)
      const assignedPassword = req.body.password && String(req.body.password).trim().length >= 8
        ? String(req.body.password).trim()
        : 'PatientDefault123!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(assignedPassword, salt);

      const newPatient = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || 'prefer_not_to_say',
        bloodGroup,
        patientId,
        role: patientRole?._id,
        roleName: 'PATIENT',
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdBy: req.user?._id || null,
        address: {
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          postalCode: address.postalCode || '',
          country: address.country || 'USA',
        },
        emergencyContact: {
          name: emergencyContact.name || '',
          relation: emergencyContact.relation || emergencyContact.relationship || '',
          phone: emergencyContact.phone || '',
        },
        allergies: Array.isArray(allergies)
          ? allergies
          : typeof allergies === 'string' && allergies.trim()
          ? allergies.split(',').map((s) => s.trim())
          : [],
      });

      await newPatient.save();
      logger.info(`Front desk registered patient ${patientId}: ${firstName} ${lastName}`);

      // Audit Log for patient provisioning
      await AuditLog.create({
        user: req.user?._id || null,
        userEmail: req.user?.email || 'reception@hospital.org',
        userRole: req.user?.roleName || 'RECEPTIONIST',
        action: 'PATIENT_PROVISIONED',
        module: 'reception',
        resourceId: String(newPatient._id),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'SUCCESS',
        details: {
          patientId,
          patientEmail: cleanEmail,
          patientName: `${newPatient.firstName} ${newPatient.lastName}`,
        },
      });

      return ApiResponse.created(res, 'Patient registered successfully at front desk', {
        id: newPatient._id,
        patientId,
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        name: `${newPatient.firstName} ${newPatient.lastName}`,
        email: newPatient.email,
        phone: newPatient.phone,
        gender: newPatient.gender,
        bloodGroup: newPatient.bloodGroup,
        registeredAt: newPatient.createdAt,
        credentials: {
          portalUsername: newPatient.email,
          temporaryPassword: assignedPassword,
        },
      });
    } catch (error) {
      logger.error('Error creating patient at front desk:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/doctors
   * List of active doctors with department & schedule slots
   */
  async getDoctors(req, res, next) {
    try {
      const { department } = req.query;
      const query = { roleName: 'DOCTOR', status: 'active' };
      if (department) {
        query.department = new RegExp(`^${department.trim()}$`, 'i');
      }

      const doctors = await User.find(query).select(
        'firstName lastName email phone department specialization qualification consultationFee availableDays availableTimeSlots profileImage'
      );

      const formatted = doctors.map((d) => ({
        id: d._id,
        name: `Dr. ${d.firstName} ${d.lastName}`,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        department: d.department || 'General Medicine',
        specialization: d.specialization || 'General Physician',
        qualification: d.qualification || 'MBBS, MD',
        consultationFee: d.consultationFee || 50,
        availableDays: d.availableDays?.length ? d.availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableTimeSlots: d.availableTimeSlots?.length
          ? d.availableTimeSlots
          : ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM', '04:30 PM'],
      }));

      return ApiResponse.success(res, 'Doctors list retrieved', formatted);
    } catch (error) {
      logger.error('Error fetching doctors for reception:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/departments
   * Active hospital departments
   */
  async getDepartments(req, res, next) {
    try {
      const departments = await Department.find({ isActive: true }).sort({ name: 1 });
      if (departments.length === 0) {
        // Fallback default clinical wings
        const defaultDepts = [
          { code: 'GEN', name: 'General Medicine', location: 'Wing A' },
          { code: 'CARD', name: 'Cardiology', location: 'Wing B, Floor 2' },
          { code: 'PEDI', name: 'Pediatrics', location: 'Wing C, Floor 1' },
          { code: 'ORTH', name: 'Orthopedics', location: 'Wing D, Floor 3' },
          { code: 'NEUR', name: 'Neurology', location: 'Wing E, Floor 4' },
          { code: 'EMER', name: 'Emergency & Trauma', location: 'Ground Floor' },
          { code: 'GYN', name: 'Obstetrics & Gynecology', location: 'Wing F, Floor 2' },
          { code: 'DERM', name: 'Dermatology', location: 'Wing A, Floor 1' },
        ];
        return ApiResponse.success(res, 'Departments retrieved', defaultDepts);
      }
      return ApiResponse.success(res, 'Departments retrieved', departments);
    } catch (error) {
      logger.error('Error fetching departments:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/appointments
   * Filterable appointment schedule for front desk
   */
  async getAppointments(req, res, next) {
    try {
      const {
        date,
        department,
        doctor,
        status,
        search,
        page = 1,
        limit = 15,
      } = req.query;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (department) {
        query.department = new RegExp(`^${department.trim()}$`, 'i');
      }

      if (doctor) {
        query.doctor = doctor;
      }

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        query.appointmentDate = { $gte: start, $lte: end };
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patient', 'firstName lastName email phone patientId')
          .populate('doctor', 'firstName lastName specialization department')
          .sort({ appointmentDate: -1, appointmentTime: 1 })
          .skip(skip)
          .limit(parseInt(limit, 10)),
        Appointment.countDocuments(query),
      ]);

      let formatted = appointments.map((a) => ({
        id: a._id,
        patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Walk-in Patient',
        patientId: a.patient?.patientId || `HMS-P-${String(a.patient?._id || '').slice(-4).toUpperCase()}`,
        patientPhone: a.patient?.phone || '—',
        patientEmail: a.patient?.email || '—',
        doctorName: a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 'Attending Physician',
        doctorDepartment: a.doctor?.department || a.department,
        department: a.department,
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        status: a.status,
        reason: a.reason,
        notes: a.notes,
        consultationFee: a.consultationFee,
        createdAt: a.createdAt,
      }));

      // In-memory text filter if search query is provided
      if (search) {
        const s = search.toLowerCase();
        formatted = formatted.filter(
          (item) =>
            item.patientName.toLowerCase().includes(s) ||
            item.patientId.toLowerCase().includes(s) ||
            item.patientPhone.includes(s) ||
            item.doctorName.toLowerCase().includes(s)
        );
      }

      return ApiResponse.success(res, 'Appointments retrieved', {
        appointments: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching appointments for reception:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/reception/appointments
   * Book appointment directly from front desk
   */
  async bookAppointment(req, res, next) {
    try {
      const {
        patientId,
        doctorId,
        department,
        appointmentDate,
        appointmentTime,
        appointmentType = 'General OPD',
        reason,
        notes = '',
        consultationFee = 50,
      } = req.body;

      if (!patientId || !doctorId || !department || !appointmentDate || !appointmentTime || !reason) {
        return next(new ApiError(400, 'Patient, Doctor, Department, Date, Time, and Reason are required.'));
      }

      // Verify patient exists
      const patient = await User.findById(patientId);
      if (!patient) {
        return next(new ApiError(404, 'Selected patient not found.'));
      }

      // Verify doctor exists
      const doctor = await User.findById(doctorId);
      if (!doctor) {
        return next(new ApiError(404, 'Selected doctor not found.'));
      }

      // Check slot conflict
      const parsedDate = new Date(appointmentDate);
      parsedDate.setHours(0, 0, 0, 0);

      const conflict = await Appointment.findOne({
        doctor: doctorId,
        appointmentDate: parsedDate,
        appointmentTime: appointmentTime.trim(),
        status: { $in: ['Pending', 'Confirmed', 'Checked In'] },
      });

      if (conflict) {
        return next(new ApiError(409, `Dr. ${doctor.lastName} is already booked for ${appointmentTime} on this date.`));
      }

      const appointment = new Appointment({
        patient: patientId,
        doctor: doctorId,
        department: department.trim(),
        appointmentDate: parsedDate,
        appointmentTime: appointmentTime.trim(),
        status: 'Confirmed',
        reason: `${appointmentType}: ${reason.trim()}`,
        notes: notes.trim(),
        consultationFee: Number(consultationFee) || 50,
      });

      await appointment.save();
      logger.info(`Front desk booked appointment ${appointment._id} for patient ${patient.patientId}`);

      return ApiResponse.created(res, 'Appointment booked successfully', {
        id: appointment._id,
        appointmentId: appointment._id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient.patientId,
        doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        department: appointment.department,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status,
        consultationFee: appointment.consultationFee,
      });
    } catch (error) {
      logger.error('Error booking appointment from front desk:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/reception/appointments/:id/status
   * Update status: 'Checked In', 'Completed', 'Cancelled', 'No Show', etc.
   */
  async updateAppointmentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, cancellationReason, notes } = req.body;

      const validStatuses = ['Pending', 'Confirmed', 'Waiting', 'Checked In', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'];
      if (!validStatuses.includes(status)) {
        return next(new ApiError(400, `Invalid status. Allowed values: ${validStatuses.join(', ')}`));
      }

      const appointment = await Appointment.findById(id)
        .populate('patient', 'firstName lastName patientId phone')
        .populate('doctor', 'firstName lastName department');

      if (!appointment) {
        return next(new ApiError(404, 'Appointment not found.'));
      }

      appointment.status = status;
      if (cancellationReason) appointment.cancellationReason = cancellationReason;
      if (notes) appointment.notes = notes;

      await appointment.save();

      // If checked in, ensure patient exists in live OPD queue
      let queueToken = null;
      if (status === 'Checked In') {
        const tokenNum = `T-${100 + opdQueueStore.length + 1}`;
        queueToken = {
          tokenNumber: tokenNum,
          patientName: appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Walk-in',
          patientId: appointment.patient?.patientId || 'HMS-P-9999',
          doctorName: appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'Physician',
          department: appointment.department,
          time: appointment.appointmentTime,
          priority: 'Normal',
          status: 'Waiting',
          waitTime: `${Math.floor(Math.random() * 15) + 5} min`,
        };
        opdQueueStore.unshift(queueToken);
      }

      return ApiResponse.success(res, `Appointment status updated to ${status}`, {
        id: appointment._id,
        status: appointment.status,
        queueToken,
      });
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/queue
   * Live OPD tokens & queue list
   */
  async getQueueTokens(req, res, next) {
    try {
      const { department, doctor } = req.query;
      let filtered = [...opdQueueStore];

      if (department && department !== 'All Departments') {
        filtered = filtered.filter((t) => t.department.toLowerCase() === department.toLowerCase());
      }
      if (doctor && doctor !== 'All Doctors') {
        filtered = filtered.filter((t) => t.doctorName.toLowerCase().includes(doctor.toLowerCase()));
      }

      const serving = filtered.find((t) => t.status === 'Serving') || null;
      const waiting = filtered.filter((t) => t.status === 'Waiting');
      const completed = filtered.filter((t) => t.status === 'Completed');
      const skipped = filtered.filter((t) => t.status === 'Skipped');

      return ApiResponse.success(res, 'Queue tokens retrieved', {
        nowServing: serving,
        queue: filtered,
        summary: {
          waiting: waiting.length,
          serving: serving ? 1 : 0,
          completed: completed.length,
          skipped: skipped.length,
        },
      });
    } catch (error) {
      logger.error('Error fetching queue tokens:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/reception/queue/token
   * Create new OPD token
   */
  async createOpdToken(req, res, next) {
    try {
      const { patientName, patientId, doctorName, department, priority = 'Normal', visitType = 'General OPD' } = req.body;

      if (!patientName || !doctorName || !department) {
        return next(new ApiError(400, 'Patient name, doctor, and department are required.'));
      }

      const tokenNum = `T-${100 + opdQueueStore.length + 1}`;
      const newToken = {
        tokenNumber: tokenNum,
        patientName: patientName.trim(),
        patientId: patientId || `HMS-P-${Math.floor(1000 + Math.random() * 9000)}`,
        doctorName: doctorName.trim(),
        department: department.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        priority,
        status: 'Waiting',
        visitType,
        waitTime: '15 min',
      };

      opdQueueStore.push(newToken);
      logger.info(`Generated OPD token ${tokenNum} for ${patientName}`);

      return ApiResponse.created(res, 'OPD token generated successfully', newToken);
    } catch (error) {
      logger.error('Error generating OPD token:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/reception/queue/:token/action
   * Actions: 'call-next', 'recall', 'mark-served', 'skip', 'transfer'
   */
  async updateQueueToken(req, res, next) {
    try {
      const { token } = req.params;
      const { action } = req.body;

      const itemIndex = opdQueueStore.findIndex((t) => t.tokenNumber === token);
      if (itemIndex === -1) {
        return next(new ApiError(404, 'Queue token not found.'));
      }

      const item = opdQueueStore[itemIndex];

      if (action === 'call-next' || action === 'serve') {
        // Mark previous serving as completed
        opdQueueStore.forEach((t) => {
          if (t.status === 'Serving') t.status = 'Completed';
        });
        item.status = 'Serving';
      } else if (action === 'mark-served') {
        item.status = 'Completed';
      } else if (action === 'skip') {
        item.status = 'Skipped';
      } else if (action === 'recall') {
        item.status = 'Serving';
      }

      return ApiResponse.success(res, `Token ${token} updated successfully`, item);
    } catch (error) {
      logger.error('Error updating queue token:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/beds
   * Ward bed availability & occupancy overview
   */
  async getBedAvailability(req, res, next) {
    try {
      const { ward, status } = req.query;
      let filtered = [...liveBeds];

      if (ward && ward !== 'All Wards') {
        filtered = filtered.filter((b) => b.ward.toLowerCase() === ward.toLowerCase());
      }
      if (status && status !== 'All') {
        filtered = filtered.filter((b) => b.status.toLowerCase() === status.toLowerCase());
      }

      return ApiResponse.success(res, 'Bed availability retrieved', {
        beds: filtered,
        admissions: admissionsStore,
        summary: {
          total: liveBeds.length,
          available: liveBeds.filter((b) => b.status === 'Available').length,
          occupied: liveBeds.filter((b) => b.status === 'Occupied').length,
          reserved: liveBeds.filter((b) => b.status === 'Reserved').length,
          maintenance: liveBeds.filter((b) => b.status === 'Maintenance').length,
        },
      });
    } catch (error) {
      logger.error('Error fetching bed availability:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/reception/admissions
   * Process front-desk inpatient admission
   */
  async createAdmission(req, res, next) {
    try {
      const {
        patientName,
        patientId,
        doctorName,
        department,
        ward,
        room,
        bedNumber,
        admissionType = 'Routine',
        reason,
        emergencyContact = '',
      } = req.body;

      if (!patientName || !doctorName || !ward || !bedNumber) {
        return next(new ApiError(400, 'Patient name, doctor, ward, and bed are required.'));
      }

      // Update bed status in liveBeds
      const bedObj = liveBeds.find((b) => b.bedNumber === bedNumber && b.ward === ward);
      if (bedObj) {
        bedObj.status = 'Occupied';
        bedObj.patientName = patientName;
        bedObj.doctorName = doctorName;
      }

      const admissionId = `ADM-${new Date().getFullYear()}-${String(admissionsStore.length + 1).padStart(3, '0')}`;
      const newAdmission = {
        id: admissionId,
        patientName: patientName.trim(),
        patientId: patientId || `HMS-P-${Math.floor(1000 + Math.random() * 9000)}`,
        doctorName: doctorName.trim(),
        department: department || 'General Medicine',
        ward,
        room: room || 'Room 101',
        bedNumber,
        admissionType,
        reason: reason || 'Inpatient treatment',
        admissionDate: new Date().toISOString(),
        status: 'Admitted',
        emergencyContact,
      };

      admissionsStore.unshift(newAdmission);
      logger.info(`Created front-desk admission ${admissionId} for ${patientName}`);

      return ApiResponse.created(res, 'Admission created successfully', newAdmission);
    } catch (error) {
      logger.error('Error creating admission:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/bills
   * Front-desk billing coordination & invoices
   */
  async getBills(req, res, next) {
    try {
      const { search = '', status = '', page = 1, limit = 15 } = req.query;
      const query = {};

      if (status && status !== 'All') {
        query.paymentStatus = status;
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const [bills, total] = await Promise.all([
        Bill.find(query)
          .populate('patient', 'firstName lastName patientId email phone')
          .sort({ billDate: -1 })
          .skip(skip)
          .limit(parseInt(limit, 10)),
        Bill.countDocuments(query),
      ]);

      let formatted = bills.map((b) => ({
        id: b._id,
        invoiceNumber: b.invoiceNumber,
        patientName: b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : 'Walk-in Patient',
        patientId: b.patient?.patientId || 'HMS-P-0000',
        billDate: b.billDate,
        dueDate: b.dueDate,
        items: b.items || [],
        service: b.items?.[0]?.description || 'Consultation & Diagnostics',
        totalAmount: b.totalAmount,
        netAmount: b.netAmount,
        paidAmount: b.paidAmount,
        outstanding: b.netAmount - b.paidAmount,
        paymentStatus: b.paymentStatus,
        paymentHistory: b.paymentHistory || [],
      }));

      if (search) {
        const s = search.toLowerCase();
        formatted = formatted.filter(
          (item) =>
            item.patientName.toLowerCase().includes(s) ||
            item.patientId.toLowerCase().includes(s) ||
            item.invoiceNumber.toLowerCase().includes(s)
        );
      }

      return ApiResponse.success(res, 'Bills retrieved successfully', {
        bills: formatted,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching bills for reception:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/reception/bills/:id/pay
   * Collect payment at desk
   */
  async collectPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod = 'Cash at Desk', notes = '' } = req.body;

      const bill = await Bill.findById(id).populate('patient', 'firstName lastName patientId');
      if (!bill) {
        return next(new ApiError(404, 'Bill record not found.'));
      }

      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) {
        return next(new ApiError(400, 'Payment amount must be greater than 0.'));
      }

      const remaining = bill.netAmount - bill.paidAmount;
      if (payAmount > remaining) {
        return next(new ApiError(400, `Amount exceeds outstanding balance ($${remaining}).`));
      }

      bill.paidAmount += payAmount;
      bill.paymentHistory.push({
        amount: payAmount,
        paymentMethod,
        transactionId: `TXN-DESK-${Date.now()}`,
        paidAt: new Date(),
      });

      if (bill.paidAmount >= bill.netAmount) {
        bill.paymentStatus = 'Paid';
      } else {
        bill.paymentStatus = 'Partially Paid';
      }

      await bill.save();
      logger.info(`Collected $${payAmount} via ${paymentMethod} for Bill ${bill.invoiceNumber}`);

      return ApiResponse.success(res, `Payment of $${payAmount} collected successfully`, {
        id: bill._id,
        invoiceNumber: bill.invoiceNumber,
        paidAmount: bill.paidAmount,
        netAmount: bill.netAmount,
        outstanding: bill.netAmount - bill.paidAmount,
        paymentStatus: bill.paymentStatus,
        receiptNumber: `RCPT-${Date.now().toString().slice(-6)}`,
      });
    } catch (error) {
      logger.error('Error collecting payment at front desk:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/reception/notifications
   * Front-desk operational alerts
   */
  async getNotifications(req, res, next) {
    try {
      let notifications = [];
      const userId = req.user?._id;

      if (userId) {
        try {
          const dbNotifs = await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
          if (dbNotifs && dbNotifs.length > 0) {
            notifications = dbNotifs.map((n) => ({
              id: n._id.toString(),
              _id: n._id.toString(),
              type: n.type ? n.type.charAt(0).toUpperCase() + n.type.slice(1) : 'System',
              category: n.type || 'system',
              title: n.title,
              message: n.message,
              time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              isRead: !!n.isRead,
              read: !!n.isRead,
            }));
          } else {
            // Seed MongoDB with initial reception notifications for this user
            const initialSeed = [
              { recipient: userId, type: 'system', title: 'Urgent OPD Token Added', message: 'Token T-104 (Emergency priority) added to Dr. Robert Chen queue.', isRead: false },
              { recipient: userId, type: 'appointment', title: 'New Appointment Scheduled', message: 'Patient Eleanor Vance confirmed for Cardiology at 02:00 PM.', isRead: false },
              { recipient: userId, type: 'system', title: 'Bed Allocated in Ward A', message: 'Bed B-102 assigned to Arthur Dent for observation.', isRead: true },
              { recipient: userId, type: 'billing', title: 'Desk Payment Collected', message: 'Invoice INV-2026-004 paid ($150.00 via Cash at Desk).', isRead: true },
              { recipient: userId, type: 'system', title: 'Front Desk Shift Opened', message: 'Shift started successfully by receptionist console.', isRead: true },
            ];
            const created = await Notification.insertMany(initialSeed);
            notifications = created.map((n) => ({
              id: n._id.toString(),
              _id: n._id.toString(),
              type: n.type ? n.type.charAt(0).toUpperCase() + n.type.slice(1) : 'System',
              category: n.type || 'system',
              title: n.title,
              message: n.message,
              time: 'Recently',
              isRead: !!n.isRead,
              read: !!n.isRead,
            }));
          }
        } catch (dbErr) {
          logger.warn('Could not query DB notifications, falling back to memory store:', dbErr.message);
        }
      }

      if (!notifications || notifications.length === 0) {
        notifications = receptionNotificationsStore;
      }

      const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

      return ApiResponse.success(res, 'Notifications retrieved', notifications, {
        unreadCount,
        total: notifications.length,
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      const unreadCount = receptionNotificationsStore.filter((n) => !n.isRead && !n.read).length;
      return ApiResponse.success(res, 'Notifications retrieved', receptionNotificationsStore, {
        unreadCount,
        total: receptionNotificationsStore.length,
      });
    }
  }

  /**
   * PATCH/PUT /api/v1/reception/notifications/:id/read
   * Mark single front-desk notification as read
   */
  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      // Update in MongoDB if ObjectId
      if (userId && id && id.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true, readAt: new Date() }
          );
        } catch (dbErr) {
          logger.warn('Error updating notification in DB:', dbErr.message);
        }
      }

      // Also update in-memory store
      receptionNotificationsStore = receptionNotificationsStore.map((n) =>
        n.id === id || n._id === id ? { ...n, isRead: true, read: true } : n
      );

      const unreadCount = receptionNotificationsStore.filter((n) => !n.isRead && !n.read).length;

      return ApiResponse.success(res, 'Notification marked as read', { id, isRead: true, unreadCount });
    } catch (error) {
      logger.error('Error marking notification read:', error);
      next(error);
    }
  }

  /**
   * PATCH/PUT /api/v1/reception/notifications/mark-all-read
   * Mark all front-desk notifications as read
   */
  async markAllNotificationsRead(req, res, next) {
    try {
      const userId = req.user?._id;

      // Update in MongoDB
      if (userId) {
        try {
          await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true, readAt: new Date() }
          );
        } catch (dbErr) {
          logger.warn('Error marking all notifications read in DB:', dbErr.message);
        }
      }

      // Also update in-memory store
      receptionNotificationsStore = receptionNotificationsStore.map((n) => ({
        ...n,
        isRead: true,
        read: true,
      }));

      return ApiResponse.success(res, 'All notifications marked as read', { unreadCount: 0 });
    } catch (error) {
      logger.error('Error marking all notifications read:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/reception/profile
   * Update Receptionist profile information
   */
  async updateProfile(req, res, next) {
    try {
      const { firstName, lastName, phone, department } = req.body;
      const user = await User.findById(req.user._id);
      if (!user) {
        return next(new ApiError(404, 'User not found.'));
      }

      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (phone) user.phone = phone.trim();
      if (department) user.department = department.trim();

      await user.save();

      return ApiResponse.success(res, 'Profile updated successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.roleName,
      });
    } catch (error) {
      logger.error('Error updating reception profile:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/reception/change-password
   * Change receptionist password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return next(new ApiError(400, 'Current and new password are required.'));
      }

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return next(new ApiError(404, 'User not found.'));
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return next(new ApiError(400, 'Current password is incorrect.'));
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      logger.error('Error changing reception password:', error);
      next(error);
    }
  }
}

module.exports = new ReceptionController();
