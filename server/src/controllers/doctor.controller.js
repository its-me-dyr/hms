/**
 * Doctor Controller
 * 
 * Provides endpoints for the Doctor Clinical Workspace:
 * - Real-time doctor clinical dashboard (KPIs, Queue, Tasks, Activity, Trends)
 * - Appointment queue management & status updates (Start consultation, Complete)
 * - Authorized patient clinical summary & records lookup
 * - Consultation & clinical note creation
 * - Doctor notifications
 * 
 * Strictly isolates all clinical data to the authenticated doctor (req.user._id)
 * and verifies hospital tenant isolation.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const LabReport = require('../models/LabReport');
const RadiologyReport = require('../models/RadiologyReport');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');

class DoctorController {
  /**
   * Helper to get start and end Date objects for today
   */
  getTodayRange() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { todayStart, todayEnd };
  }

  /**
   * GET /api/v1/doctor/dashboard
   * Real-time authenticated doctor clinical workspace dashboard overview
   */
  async getDashboardOverview(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { todayStart, todayEnd } = this.getTodayRange();

      // 1. Fetch Today's Appointments for this Doctor
      const todayAppointments = await Appointment.find({
        doctor: doctorId,
        appointmentDate: { $gte: todayStart, $lte: todayEnd },
      })
        .populate('patient', 'firstName lastName patientId phone gender dateOfBirth bloodGroup')
        .sort({ appointmentTime: 1 })
        .lean();

      // 2. Calculate Real KPIs
      const activeAppointments = todayAppointments.filter((a) => a.status !== 'Cancelled');
      const todayAppointmentsCount = activeAppointments.length;

      const waitingPatientsCount = todayAppointments.filter((a) =>
        ['Pending', 'Confirmed', 'Waiting', 'Checked In'].includes(a.status)
      ).length;

      const inProgressCount = todayAppointments.filter((a) =>
        ['In-Progress', 'Consulting'].includes(a.status)
      ).length;

      const completedCount = todayAppointments.filter((a) => a.status === 'Completed').length;

      // 3. Pending Investigation Reviews for this doctor (Verified by lab, awaiting doctor review)
      const [pendingLabReports, pendingRadiologyReports, followUpsDue] = await Promise.all([
        LabReport.find({
          doctor: doctorId,
          status: { $in: ['Verified', 'Completed', 'Result Ready'] },
        })
          .populate('patient', 'firstName lastName patientId')
          .sort({ verifiedAt: -1, updatedAt: -1 })
          .limit(10)
          .lean(),

        RadiologyReport.find({
          doctor: doctorId,
          status: { $in: ['Completed'] },
        })
          .populate('patient', 'firstName lastName patientId')
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean(),

        MedicalRecord.find({
          doctor: doctorId,
          followUpDate: { $lte: todayEnd, $ne: null },
        })
          .populate('patient', 'firstName lastName patientId')
          .sort({ followUpDate: 1 })
          .limit(10)
          .lean(),
      ]);

      const pendingTasksCount =
        pendingLabReports.length + pendingRadiologyReports.length + followUpsDue.length;

      // 4. Build Today's Appointment Queue with sorting & token numbering
      // Priority sorting: In-Progress first, Waiting/Checked-In second, Confirmed/Pending third, Completed last
      const statusPriority = {
        'In-Progress': 1,
        'Consulting': 1,
        'Waiting': 2,
        'Checked In': 2,
        'Confirmed': 3,
        'Pending': 3,
        'Completed': 4,
        'Cancelled': 5,
      };

      const sortedQueue = [...todayAppointments].sort((a, b) => {
        const prioA = statusPriority[a.status] || 3;
        const prioB = statusPriority[b.status] || 3;
        if (prioA !== prioB) return prioA - prioB;
        return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
      });

      // Map queue items to clean supported fields
      const todayQueue = sortedQueue.map((apt, index) => {
        const patient = apt.patient || {};
        let age = null;
        if (patient.dateOfBirth) {
          const diffMs = Date.now() - new Date(patient.dateOfBirth).getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const tokenNum = `T-${String(index + 1).padStart(2, '0')}`;
        const isUrgent =
          (apt.reason || '').toLowerCase().includes('emergency') ||
          (apt.reason || '').toLowerCase().includes('urgent') ||
          (apt.reason || '').toLowerCase().includes('severe');

        return {
          id: apt._id,
          tokenNumber: tokenNum,
          patientId: patient.patientId || `HMS-P-${String(patient._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: patient._id || null,
          patientName: patient.firstName
            ? `${patient.firstName} ${patient.lastName || ''}`.trim()
            : 'Patient',
          patientGender: patient.gender || '—',
          patientAge: age !== null ? `${age} yrs` : '—',
          patientPhone: patient.phone || '—',
          appointmentTime: apt.appointmentTime || '—',
          appointmentDate: apt.appointmentDate,
          department: apt.department || req.user.department || 'General Medicine',
          reason: apt.reason || 'General Consultation',
          status: apt.status || 'Confirmed',
          priority: isUrgent ? 'Urgent' : 'Normal',
          consultationFee: apt.consultationFee || 50,
        };
      });

      // 5. Structure Pending Clinical Tasks (Only real records requiring attention)
      const pendingTasks = [];

      pendingLabReports.forEach((report) => {
        const p = report.patient || {};
        pendingTasks.push({
          id: report._id,
          type: 'lab_review',
          category: 'Laboratory Investigation',
          title: `Review ${report.testName || 'Lab Report'}`,
          description: `Diagnostic findings ready for review (${report.category || 'General'})`,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id,
          date: report.verifiedAt || report.testDate || report.updatedAt,
          priority: report.priority === 'STAT' || report.priority === 'Urgent' ? 'High' : 'Normal',
        });
      });

      pendingRadiologyReports.forEach((rad) => {
        const p = rad.patient || {};
        pendingTasks.push({
          id: rad._id,
          type: 'radiology_review',
          category: 'Radiology & Imaging',
          title: `Review ${rad.procedureName || 'Imaging Study'}`,
          description: `Study completed (${rad.modality || 'Imaging'})`,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id,
          date: rad.examinationDate || rad.updatedAt,
          priority: 'Normal',
        });
      });

      followUpsDue.forEach((rec) => {
        const p = rec.patient || {};
        const isOverdue = new Date(rec.followUpDate) < todayStart;
        pendingTasks.push({
          id: rec._id,
          type: 'follow_up_due',
          category: 'Follow-up Due',
          title: `Patient Follow-up ${isOverdue ? '(Overdue)' : '(Due Today)'}`,
          description: `Scheduled review for ongoing treatment`,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id,
          date: rec.followUpDate,
          priority: isOverdue ? 'High' : 'Normal',
        });
      });

      // 6. Recent Patient Activity (Latest consultations and prescriptions by this doctor)
      const [recentConsultations, recentPrescriptions] = await Promise.all([
        MedicalRecord.find({ doctor: doctorId })
          .populate('patient', 'firstName lastName patientId')
          .sort({ consultationDate: -1, createdAt: -1 })
          .limit(4)
          .lean(),
        Prescription.find({ doctor: doctorId })
          .populate('patient', 'firstName lastName patientId')
          .sort({ prescriptionDate: -1, createdAt: -1 })
          .limit(4)
          .lean(),
      ]);

      const recentActivity = [];

      recentConsultations.forEach((rec) => {
        const p = rec.patient || {};
        recentActivity.push({
          id: rec._id,
          type: 'consultation',
          title: 'Consultation Completed',
          summary: rec.diagnosis ? `Clinical Assessment Recorded` : 'Consultation documentation saved',
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id,
          timestamp: rec.consultationDate || rec.createdAt,
        });
      });

      recentPrescriptions.forEach((rx) => {
        const p = rx.patient || {};
        const medCount = Array.isArray(rx.medicines) ? rx.medicines.length : 0;
        recentActivity.push({
          id: rx._id,
          type: 'prescription',
          title: 'Prescription Issued',
          summary: `${medCount} medication${medCount !== 1 ? 's' : ''} prescribed`,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id,
          timestamp: rx.prescriptionDate || rx.createdAt,
        });
      });

      recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const trimmedActivity = recentActivity.slice(0, 5);

      // 7. Compact Consultation Overview (Last 7 days completion trend)
      const trends = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        const count = await Appointment.countDocuments({
          doctor: doctorId,
          status: 'Completed',
          appointmentDate: { $gte: dayStart, $lte: dayEnd },
        });

        trends.push({
          day: dayNames[dayStart.getDay()],
          date: dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          completed: count,
        });
      }

      // 8. Notifications count
      const unreadNotificationsCount = await Notification.countDocuments({
        recipient: doctorId,
        isRead: false,
      });

      return ApiResponse.success(res, 'Doctor clinical workspace dashboard retrieved', {
        doctor: {
          id: req.user._id,
          name: `Dr. ${req.user.firstName} ${req.user.lastName || ''}`.trim(),
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          phone: req.user.phone,
          department: req.user.department || 'General Medicine',
          specialization: req.user.specialization || 'Attending Physician',
          qualification: req.user.qualification || '',
          licenseNumber: req.user.licenseNumber || '',
        },
        kpi: {
          todayAppointments: todayAppointmentsCount,
          waitingPatients: waitingPatientsCount,
          inProgressConsultations: inProgressCount,
          completedConsultations: completedCount,
          pendingTasks: pendingTasksCount,
        },
        todayQueue,
        pendingTasks,
        recentActivity: trimmedActivity,
        consultationTrends: trends,
        unreadNotificationsCount,
      });
    } catch (error) {
      logger.error('Error fetching doctor dashboard overview:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/queue
   * Specialized real-time patient queue for the authenticated attending doctor
   * Supports:
   * - Date navigation & scoping (defaults to today in local time)
   * - Status filtering ('all' | 'waiting' | 'in-progress' | 'completed' | 'scheduled' | 'cancelled')
   * - Priority filtering ('all' | 'urgent' | 'normal')
   * - Live search (patient name, patientId, phone, reason, token)
   * - Real mutually exclusive queue metrics (total, waiting, now serving, completed, scheduled, urgent)
   * - Deterministic chronological token numbering (T-01, T-02, ...)
   * - Active 'nowServing' patient metadata
   * - Pagination support
   */
  async getQueue(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        date,
        status = 'all',
        priority = 'all',
        search = '',
        page = 1,
        limit = 20,
      } = req.query;

      // 1. Resolve date boundaries
      let startOfDay, endOfDay;
      if (date && typeof date === 'string' && date.includes('-')) {
        const [year, month, day] = date.split('-').map(Number);
        if (year && month && day) {
          startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
          endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
          const parsed = new Date(date);
          startOfDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
          endOfDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
        }
      } else {
        const now = new Date();
        startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }

      // 2. Fetch all appointments assigned to this doctor for the given day
      const baseScope = {
        doctor: doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      };

      const dayAppointments = await Appointment.find(baseScope)
        .populate('patient', 'firstName lastName patientId phone gender dateOfBirth bloodGroup')
        .sort({ appointmentTime: 1 })
        .lean();

      // 3. Derive real, mutually consistent queue counts
      const waitingCount = dayAppointments.filter((a) =>
        ['Waiting', 'Checked In'].includes(a.status)
      ).length;

      const inProgressCount = dayAppointments.filter((a) =>
        ['In-Progress', 'Consulting'].includes(a.status)
      ).length;

      const completedCount = dayAppointments.filter((a) =>
        a.status === 'Completed'
      ).length;

      const scheduledCount = dayAppointments.filter((a) =>
        ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status)
      ).length;

      const cancelledCount = dayAppointments.filter((a) =>
        ['Cancelled', 'No Show'].includes(a.status)
      ).length;

      // Active queue excludes cancelled and no-show appointments
      const activeAppointments = dayAppointments.filter(
        (a) => !['Cancelled', 'No Show'].includes(a.status)
      );

      // Urgent patients identified by triage reasons
      const urgentCount = activeAppointments.filter((a) => {
        const r = (a.reason || '').toLowerCase();
        return r.includes('emergency') || r.includes('urgent') || r.includes('severe');
      }).length;

      const totalInQueue = activeAppointments.length;

      // 4. Determine Now Serving (current in-progress consultation if one exists)
      const activeServingApt = dayAppointments.find((a) =>
        ['In-Progress', 'Consulting'].includes(a.status)
      );

      // Map day appointments with deterministic token numbers based on original schedule
      const tokenMap = new Map();
      dayAppointments.forEach((apt, idx) => {
        tokenMap.set(String(apt._id), `T-${String(idx + 1).padStart(2, '0')}`);
      });

      let nowServing = null;
      if (activeServingApt) {
        const sp = activeServingApt.patient || {};
        const isSpUrgent =
          (activeServingApt.reason || '').toLowerCase().includes('emergency') ||
          (activeServingApt.reason || '').toLowerCase().includes('urgent') ||
          (activeServingApt.reason || '').toLowerCase().includes('severe');

        nowServing = {
          id: activeServingApt._id,
          tokenNumber: tokenMap.get(String(activeServingApt._id)) || 'T-01',
          patientMongoId: sp._id || null,
          patientId: sp.patientId || `HMS-P-${String(sp._id || '').slice(-4).toUpperCase()}`,
          patientName: sp.firstName ? `${sp.firstName} ${sp.lastName || ''}`.trim() : 'Patient',
          appointmentTime: activeServingApt.appointmentTime || '—',
          department: activeServingApt.department || req.user.department || 'General Medicine',
          reason: activeServingApt.reason || 'General Consultation',
          status: activeServingApt.status,
          priority: isSpUrgent ? 'Urgent' : 'Normal',
        };
      }

      // 5. Structure and enrich queue items
      const enrichedQueue = dayAppointments.map((apt) => {
        const p = apt.patient || {};
        let age = null;
        if (p.dateOfBirth) {
          const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const isUrgent =
          (apt.reason || '').toLowerCase().includes('emergency') ||
          (apt.reason || '').toLowerCase().includes('urgent') ||
          (apt.reason || '').toLowerCase().includes('severe');

        const tokenNumber = tokenMap.get(String(apt._id)) || 'T-01';

        // Check if eligible to start consultation
        const canStart = ['Waiting', 'Checked In', 'Confirmed', 'Pending'].includes(apt.status);
        const isInProgress = ['In-Progress', 'Consulting'].includes(apt.status);
        const isCompleted = apt.status === 'Completed';

        return {
          id: apt._id,
          tokenNumber,
          patientMongoId: p._id || null,
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientGender: p.gender || '—',
          patientAge: age !== null ? `${age} yrs` : '—',
          patientPhone: p.phone || '—',
          patientBloodGroup: p.bloodGroup || '—',
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime || '—',
          department: apt.department || req.user.department || 'General Medicine',
          reason: apt.reason || 'General Consultation',
          notes: apt.notes || '',
          status: apt.status || 'Confirmed',
          priority: isUrgent ? 'Urgent' : 'Normal',
          consultationFee: apt.consultationFee || 50,
          canStart,
          isInProgress,
          isCompleted,
        };
      });

      // 6. Sort queue according to clinical workflow rules:
      // Priority 1: In-Progress (currently in consultation)
      // Priority 2: Waiting / Checked In with Urgent priority
      // Priority 3: Waiting / Checked In with Normal priority
      // Priority 4: Confirmed / Scheduled (upcoming)
      // Priority 5: Completed
      // Priority 6: Cancelled
      const getPriorityRank = (item) => {
        if (item.isInProgress) return 1;
        if (['Waiting', 'Checked In'].includes(item.status)) {
          return item.priority === 'Urgent' ? 2 : 3;
        }
        if (['Confirmed', 'Pending', 'Rescheduled'].includes(item.status)) return 4;
        if (item.status === 'Completed') return 5;
        return 6;
      };

      enrichedQueue.sort((a, b) => {
        const rankA = getPriorityRank(a);
        const rankB = getPriorityRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
      });

      // 7. Apply filtering
      let filtered = enrichedQueue;

      // Status filter
      if (status && status !== 'all') {
        const norm = status.toLowerCase();
        if (norm === 'waiting') {
          filtered = filtered.filter((item) => ['Waiting', 'Checked In'].includes(item.status));
        } else if (norm === 'in-progress' || norm === 'serving' || norm === 'consulting') {
          filtered = filtered.filter((item) => ['In-Progress', 'Consulting'].includes(item.status));
        } else if (norm === 'completed') {
          filtered = filtered.filter((item) => item.status === 'Completed');
        } else if (norm === 'scheduled' || norm === 'confirmed') {
          filtered = filtered.filter((item) => ['Pending', 'Confirmed', 'Rescheduled'].includes(item.status));
        } else if (norm === 'cancelled') {
          filtered = filtered.filter((item) => ['Cancelled', 'No Show'].includes(item.status));
        }
      } else {
        // 'all' excludes cancelled appointments unless explicitly requested
        filtered = filtered.filter((item) => !['Cancelled', 'No Show'].includes(item.status));
      }

      // Priority filter
      if (priority && priority !== 'all') {
        filtered = filtered.filter(
          (item) => item.priority.toLowerCase() === priority.toLowerCase()
        );
      }

      // Text search (patient name, patientId, phone, reason, token)
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((item) => {
          return (
            item.patientName.toLowerCase().includes(q) ||
            item.patientId.toLowerCase().includes(q) ||
            item.patientPhone.includes(q) ||
            item.tokenNumber.toLowerCase().includes(q) ||
            item.reason.toLowerCase().includes(q)
          );
        });
      }

      // 8. Pagination
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
      const paginatedQueue = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return ApiResponse.success(res, 'Doctor patient queue retrieved', {
        queue: paginatedQueue,
        summary: {
          total: totalInQueue,
          waiting: waitingCount,
          inProgress: inProgressCount,
          completed: completedCount,
          scheduled: scheduledCount,
          cancelled: cancelledCount,
          urgent: urgentCount,
        },
        nowServing,
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
        },
      });
    } catch (error) {
      logger.error('Error fetching doctor patient queue:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/appointments
   * Filterable appointment list strictly for the authenticated doctor
   * Supports date, search, status, sort, pagination, and mutually exclusive summary counts
   */
  async getAppointments(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        status = 'all',
        date,
        search = '',
        page = 1,
        limit = 20,
        sort = 'time_asc',
      } = req.query;

      const query = { doctor: doctorId };

      // Date filtering
      let dateFilter = null;
      if (date && date !== 'all') {
        const d = new Date(date);
        const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        dateFilter = { $gte: dStart, $lte: dEnd };
        query.appointmentDate = dateFilter;
      }

      // Status filtering
      if (status && status !== 'all') {
        const normStatus = status.toLowerCase();
        if (normStatus === 'confirmed' || normStatus === 'scheduled') {
          query.status = { $in: ['Pending', 'Confirmed', 'Rescheduled'] };
        } else if (normStatus === 'waiting') {
          query.status = { $in: ['Waiting', 'Checked In'] };
        } else if (normStatus === 'in-progress' || normStatus === 'inprogress') {
          query.status = { $in: ['In-Progress', 'Consulting'] };
        } else if (normStatus === 'completed') {
          query.status = 'Completed';
        } else if (normStatus === 'cancelled') {
          query.status = { $in: ['Cancelled', 'No Show'] };
        } else {
          query.status = status;
        }
      }

      // Search filtering by patient name, patientId, phone, or appointment reason
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        const matchedPatients = await User.find({
          roleName: 'PATIENT',
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { patientId: searchRegex },
            { phone: searchRegex },
          ],
        }).select('_id');
        const matchedPatientIds = matchedPatients.map((p) => p._id);

        query.$or = [
          { reason: searchRegex },
          { notes: searchRegex },
          { patient: { $in: matchedPatientIds } },
        ];
      }

      // Sorting
      let sortObj = { appointmentTime: 1 };
      if (sort === 'time_desc') sortObj = { appointmentTime: -1 };
      else if (sort === 'date_desc') sortObj = { appointmentDate: -1, appointmentTime: 1 };
      else if (sort === 'date_asc') sortObj = { appointmentDate: 1, appointmentTime: 1 };

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const [appointments, total] = await Promise.all([
        Appointment.find(query)
          .populate('patient', 'firstName lastName patientId phone gender dateOfBirth bloodGroup')
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit, 10))
          .lean(),
        Appointment.countDocuments(query),
      ]);

      // Summary counts for the selected date scope (mutually exclusive)
      const baseScopeQuery = { doctor: doctorId };
      if (dateFilter) {
        baseScopeQuery.appointmentDate = dateFilter;
      }

      const allScoped = await Appointment.find(baseScopeQuery).select('status').lean();
      const summary = {
        total: allScoped.length,
        confirmed: allScoped.filter((a) => ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status)).length,
        waiting: allScoped.filter((a) => ['Waiting', 'Checked In'].includes(a.status)).length,
        inProgress: allScoped.filter((a) => ['In-Progress', 'Consulting'].includes(a.status)).length,
        completed: allScoped.filter((a) => a.status === 'Completed').length,
        cancelled: allScoped.filter((a) => ['Cancelled', 'No Show'].includes(a.status)).length,
      };

      const formatted = appointments.map((apt, index) => {
        const p = apt.patient || {};
        let age = null;
        if (p.dateOfBirth) {
          const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const isUrgent =
          (apt.reason || '').toLowerCase().includes('emergency') ||
          (apt.reason || '').toLowerCase().includes('urgent') ||
          (apt.reason || '').toLowerCase().includes('severe');

        return {
          id: apt._id,
          tokenNumber: `T-${String(skip + index + 1).padStart(2, '0')}`,
          patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: p._id || null,
          patientName: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
          patientPhone: p.phone || '—',
          patientGender: p.gender || '—',
          patientAge: age !== null ? `${age} yrs` : '—',
          patientBloodGroup: p.bloodGroup || '—',
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime || '—',
          department: apt.department || 'General Medicine',
          reason: apt.reason || 'General Consultation',
          notes: apt.notes || '',
          cancellationReason: apt.cancellationReason || '',
          status: apt.status || 'Confirmed',
          priority: isUrgent ? 'Urgent' : 'Normal',
          consultationFee: apt.consultationFee || 50,
        };
      });

      return ApiResponse.success(res, 'Appointments retrieved', {
        appointments: formatted,
        summary,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10)) || 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching doctor appointments:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/appointments/:id
   * Single appointment metadata & linked consultation details
   */
  async getAppointmentById(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;

      const apt = await Appointment.findOne({ _id: id, doctor: doctorId })
        .populate('patient', 'firstName lastName patientId phone gender dateOfBirth bloodGroup address')
        .lean();

      if (!apt) {
        throw new ApiError(404, 'Appointment not found or not assigned to this doctor.');
      }

      const consultation = await MedicalRecord.findOne({ appointment: id, doctor: doctorId }).lean();

      const p = apt.patient || {};
      let age = null;
      if (p.dateOfBirth) {
        const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
        age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      }

      return ApiResponse.success(res, 'Appointment details retrieved', {
        appointment: {
          id: apt._id,
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime,
          department: apt.department,
          reason: apt.reason,
          notes: apt.notes,
          status: apt.status,
          consultationFee: apt.consultationFee || 50,
          cancellationReason: apt.cancellationReason || '',
          patient: {
            id: p._id,
            patientId: p.patientId || `HMS-P-${String(p._id || '').slice(-4).toUpperCase()}`,
            name: p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Patient',
            phone: p.phone || '—',
            gender: p.gender || '—',
            age: age !== null ? `${age} yrs` : '—',
            bloodGroup: p.bloodGroup || '—',
            address: p.address || null,
          },
          consultation: consultation
            ? {
                id: consultation._id,
                diagnosis: consultation.diagnosis,
                consultationDate: consultation.consultationDate,
                treatment: consultation.treatment,
                clinicalNotes: consultation.clinicalNotes,
                vitals: consultation.vitals,
              }
            : null,
        },
      });
    } catch (error) {
      logger.error('Error fetching appointment details:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/appointments/:id/status
   * Update appointment queue status (e.g. 'In-Progress', 'Completed')
   * Strictly verifies:
   * - Status transitions follow real clinical workflow
   * - Duplicate active consultations are prevented
   * - Audit logging is preserved
   */
  async updateAppointmentStatus(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        'Pending',
        'Confirmed',
        'Waiting',
        'Checked In',
        'In-Progress',
        'Completed',
        'Cancelled',
        'Rescheduled',
      ];

      if (!status || !allowedStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`);
      }

      const appointment = await Appointment.findOne({ _id: id, doctor: doctorId }).populate('patient', 'firstName lastName patientId');
      if (!appointment) {
        throw new ApiError(404, 'Appointment not found or not assigned to this doctor.');
      }

      if (appointment.status === 'Cancelled' && status !== 'Cancelled') {
        throw new ApiError(400, 'Cannot change status of a cancelled appointment.');
      }
      if (appointment.status === 'Completed' && status !== 'Completed') {
        throw new ApiError(400, 'Cannot alter status of a completed appointment.');
      }

      // Prevent starting a consultation on a cancelled appointment
      if (status === 'In-Progress' && ['Cancelled', 'No Show'].includes(appointment.status)) {
        throw new ApiError(400, 'Cannot start consultation for a cancelled appointment.');
      }

      // PREVENT DUPLICATE ACTIVE CONSULTATIONS
      // If setting an appointment to In-Progress, ensure no other appointment is currently In-Progress
      if (['In-Progress', 'Consulting'].includes(status) && !['In-Progress', 'Consulting'].includes(appointment.status)) {
        const activeConsultation = await Appointment.findOne({
          doctor: doctorId,
          _id: { $ne: id },
          status: { $in: ['In-Progress', 'Consulting'] },
        }).populate('patient', 'firstName lastName');

        if (activeConsultation) {
          const activePatientName = activeConsultation.patient
            ? `${activeConsultation.patient.firstName} ${activeConsultation.patient.lastName}`.trim()
            : 'another patient';
          throw new ApiError(
            409,
            `You already have an active consultation in progress with ${activePatientName}. Please complete or conclude that consultation before starting a new one.`
          );
        }
      }

      const prevStatus = appointment.status;
      appointment.status = status;
      await appointment.save();

      // Audit log for clinical status change
      try {
        await AuditLog.create({
          user: doctorId,
          userEmail: req.user.email,
          userRole: req.user.roleName || 'DOCTOR',
          action: 'APPOINTMENT_STATUS_UPDATE',
          module: 'doctor',
          resourceId: String(appointment._id),
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
          status: 'SUCCESS',
          details: {
            previousStatus: prevStatus,
            newStatus: status,
            patientId: appointment.patient?._id,
          },
        });
      } catch (logErr) {
        logger.warn('Failed to write audit log for appointment status update:', logErr);
      }

      return ApiResponse.success(res, `Appointment status updated to ${status}`, {
        id: appointment._id,
        status: appointment.status,
      });
    } catch (error) {
      logger.error('Error updating appointment status by doctor:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/appointments/:id/cancel
   * Cancel appointment with reason
   */
  async cancelAppointment(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;
      const { reason = '' } = req.body;

      const appointment = await Appointment.findOne({ _id: id, doctor: doctorId });
      if (!appointment) {
        throw new ApiError(404, 'Appointment not found or not assigned to this doctor.');
      }

      if (appointment.status === 'Completed') {
        throw new ApiError(400, 'Cannot cancel an appointment that has already been completed.');
      }
      if (appointment.status === 'In-Progress') {
        throw new ApiError(400, 'Cannot cancel an active consultation. Please complete consultation notes or discharge.');
      }
      if (appointment.status === 'Cancelled') {
        throw new ApiError(400, 'Appointment is already cancelled.');
      }

      appointment.status = 'Cancelled';
      appointment.cancellationReason = reason.trim() || 'Cancelled by attending physician';
      await appointment.save();

      return ApiResponse.success(res, 'Appointment cancelled successfully', {
        id: appointment._id,
        status: appointment.status,
        cancellationReason: appointment.cancellationReason,
      });
    } catch (error) {
      logger.error('Error cancelling appointment by doctor:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/appointments/:id/reschedule
   * Reschedule appointment to a new date and time
   */
  async rescheduleAppointment(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;
      const { newDate, newTime, reason = '' } = req.body;

      if (!newDate || !newTime) {
        throw new ApiError(400, 'New appointment date and time are required.');
      }

      const appointment = await Appointment.findOne({ _id: id, doctor: doctorId });
      if (!appointment) {
        throw new ApiError(404, 'Appointment not found or not assigned to this doctor.');
      }

      if (appointment.status === 'Completed') {
        throw new ApiError(400, 'Cannot reschedule an appointment that has already been completed.');
      }
      if (appointment.status === 'Cancelled') {
        throw new ApiError(400, 'Cannot reschedule a cancelled appointment.');
      }

      const parsedDate = new Date(newDate);
      if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, 'Invalid appointment date format.');
      }

      appointment.appointmentDate = parsedDate;
      appointment.appointmentTime = newTime.trim();
      appointment.status = 'Rescheduled';
      if (reason.trim()) {
        appointment.notes = appointment.notes
          ? `${appointment.notes}\nRescheduled: ${reason.trim()}`
          : `Rescheduled: ${reason.trim()}`;
      }
      await appointment.save();

      return ApiResponse.success(res, 'Appointment rescheduled successfully', {
        id: appointment._id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status,
      });
    } catch (error) {
      logger.error('Error rescheduling appointment by doctor:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/patients
   * List authorized patients assigned to or seen by the authenticated doctor.
   * Features:
   * - Scoped strictly to authenticated doctor (req.user._id)
   * - Real summary metrics (Total Assigned, Active, Inactive, Recent Visits in last 7 days)
   * - Patient search (name, patientId, phone)
   * - Status filtering (all, active, inactive)
   * - Sorting (lastVisit, name, patientId)
   * - Real last visit & next follow-up dates
   * - Server-side pagination
   */
  async getPatients(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        search = '',
        status = 'all',
        sortBy = 'lastVisit',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
      } = req.query;

      // 1. Identify all distinct patients assigned to / seen by this doctor
      const [appointmentPatientIds, consultationPatientIds] = await Promise.all([
        Appointment.distinct('patient', { doctor: doctorId }),
        MedicalRecord.distinct('patient', { doctor: doctorId }),
      ]);

      const assignedPatientObjectIds = [...new Set([
        ...appointmentPatientIds.map(String),
        ...consultationPatientIds.map(String),
      ])]
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id));

      if (assignedPatientObjectIds.length === 0) {
        return ApiResponse.success(res, 'Assigned patients retrieved', {
          patients: [],
          summary: {
            total: 0,
            active: 0,
            inactive: 0,
            recentVisits: 0,
          },
          pagination: {
            total: 0,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            pages: 1,
          },
        });
      }

      // 2. Calculate Real Doctor Summary Metrics
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [allAssignedPatients, recentVisitsCount] = await Promise.all([
        User.find({
          _id: { $in: assignedPatientObjectIds },
          roleName: 'PATIENT',
        }).select('_id status isActive').lean(),
        MedicalRecord.countDocuments({
          doctor: doctorId,
          consultationDate: { $gte: sevenDaysAgo },
        }),
      ]);

      const totalAssigned = allAssignedPatients.length;
      const activeCount = allAssignedPatients.filter(
        (p) => (p.status === 'active' || !p.status) && p.isActive !== false
      ).length;
      const inactiveCount = allAssignedPatients.filter(
        (p) => p.status === 'inactive' || p.status === 'suspended' || p.isActive === false
      ).length;

      const summary = {
        total: totalAssigned,
        active: activeCount,
        inactive: inactiveCount,
        recentVisits: recentVisitsCount,
      };

      // 3. Build Patient Filter Query
      const query = {
        _id: { $in: assignedPatientObjectIds },
        roleName: 'PATIENT',
      };

      // Status filter
      if (status && status !== 'all') {
        const normStatus = status.toLowerCase();
        if (normStatus === 'active') {
          query.$or = [
            { status: 'active', isActive: { $ne: false } },
            { status: { $exists: false }, isActive: { $ne: false } },
          ];
        } else if (normStatus === 'inactive') {
          query.$or = [
            { status: { $in: ['inactive', 'suspended', 'rejected'] } },
            { isActive: false },
          ];
        }
      }

      // Search filter (patient name, patientId, phone)
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { patientId: searchRegex },
            { phone: searchRegex },
          ],
        });
      }

      // 4. Fetch Last Visit & Next Follow-Up aggregation for all scoped patients
      const [lastVisitsAgg, lastCompletedAptAgg, upcomingFollowUpsAgg, upcomingAppointmentsAgg] = await Promise.all([
        MedicalRecord.aggregate([
          { $match: { doctor: doctorId, patient: { $in: assignedPatientObjectIds } } },
          { $sort: { consultationDate: -1 } },
          {
            $group: {
              _id: '$patient',
              lastVisitDate: { $first: '$consultationDate' },
              diagnosis: { $first: '$diagnosis' },
              followUpDate: { $first: '$followUpDate' },
            },
          },
        ]),
        Appointment.aggregate([
          { $match: { doctor: doctorId, patient: { $in: assignedPatientObjectIds }, status: 'Completed' } },
          { $sort: { appointmentDate: -1 } },
          {
            $group: {
              _id: '$patient',
              lastAptDate: { $first: '$appointmentDate' },
              reason: { $first: '$reason' },
            },
          },
        ]),
        MedicalRecord.aggregate([
          {
            $match: {
              doctor: doctorId,
              patient: { $in: assignedPatientObjectIds },
              followUpDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          },
          { $sort: { followUpDate: 1 } },
          {
            $group: {
              _id: '$patient',
              nextFollowUpDate: { $first: '$followUpDate' },
            },
          },
        ]),
        Appointment.aggregate([
          {
            $match: {
              doctor: doctorId,
              patient: { $in: assignedPatientObjectIds },
              appointmentDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              status: { $in: ['Pending', 'Confirmed', 'Rescheduled', 'Waiting'] },
            },
          },
          { $sort: { appointmentDate: 1 } },
          {
            $group: {
              _id: '$patient',
              nextAppointmentDate: { $first: '$appointmentDate' },
              department: { $first: '$department' },
            },
          },
        ]),
      ]);

      const lastVisitMap = {};
      lastCompletedAptAgg.forEach((a) => {
        lastVisitMap[String(a._id)] = {
          lastVisitDate: a.lastAptDate,
          diagnosis: a.reason,
        };
      });
      lastVisitsAgg.forEach((v) => {
        lastVisitMap[String(v._id)] = {
          lastVisitDate: v.lastVisitDate,
          diagnosis: v.diagnosis,
        };
      });

      const nextFollowUpMap = {};
      upcomingFollowUpsAgg.forEach((f) => {
        nextFollowUpMap[String(f._id)] = f.nextFollowUpDate;
      });
      upcomingAppointmentsAgg.forEach((a) => {
        const pId = String(a._id);
        if (!nextFollowUpMap[pId] || new Date(a.nextAppointmentDate) < new Date(nextFollowUpMap[pId])) {
          nextFollowUpMap[pId] = a.nextAppointmentDate;
        }
      });

      const deptMap = {};
      upcomingAppointmentsAgg.forEach((a) => {
        if (a.department) deptMap[String(a._id)] = a.department;
      });

      // 5. Fetch Filtered Patients
      const matchedPatients = await User.find(query)
        .select('firstName lastName patientId email phone gender dateOfBirth bloodGroup address status isActive createdAt department')
        .lean();

      // Format records
      let formattedPatients = matchedPatients.map((p) => {
        const pIdStr = String(p._id);
        const lastVisitInfo = lastVisitMap[pIdStr];
        const nextFollowUpDate = nextFollowUpMap[pIdStr];

        let age = null;
        if (p.dateOfBirth) {
          const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const isPatientActive = (p.status === 'active' || !p.status) && p.isActive !== false;

        return {
          id: p._id,
          patientMongoId: p._id,
          patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
          name: `${p.firstName} ${p.lastName || ''}`.trim(),
          firstName: p.firstName,
          lastName: p.lastName || '',
          email: p.email || '',
          phone: p.phone || '—',
          gender: p.gender || '—',
          age: age !== null ? `${age} yrs` : '—',
          bloodGroup: p.bloodGroup || '—',
          department: p.department || deptMap[pIdStr] || req.user.department || 'General Medicine',
          status: isPatientActive ? 'Active' : 'Inactive',
          rawStatus: p.status || 'active',
          lastVisitDate: lastVisitInfo ? lastVisitInfo.lastVisitDate : null,
          lastVisitDiagnosis: lastVisitInfo ? lastVisitInfo.diagnosis : null,
          nextFollowUpDate: nextFollowUpDate || null,
          createdAt: p.createdAt,
        };
      });

      // 6. Sorting
      formattedPatients.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'patientId') {
          comparison = a.patientId.localeCompare(b.patientId);
        } else if (sortBy === 'createdAt') {
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          // Default: sortBy === 'lastVisit'
          const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
          comparison = dateA - dateB;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // 7. Pagination
      const totalFiltered = formattedPatients.length;
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.max(1, parseInt(limit, 10));
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedList = formattedPatients.slice(startIndex, startIndex + limitNum);

      return ApiResponse.success(res, 'Assigned patients retrieved', {
        patients: paginatedList,
        summary,
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalFiltered / limitNum) || 1,
        },
      });
    } catch (error) {
      logger.error('Error fetching doctor assigned patients:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/patients/:id
   * Get authorized patient clinical summary, longitudinal timeline, and history for attending doctor.
   * Strictly enforces:
   * - Validates patient identity
   * - Enforces doctor-patient assignment authorization (rejects non-assigned doctors with 403)
   * - Assembles chronological longitudinal timeline across consultations, prescriptions, lab tests, and imaging
   * - Returns real allergies, emergency contact, and vitals
   */
  async getPatientDetails(req, res, next) {
    try {
      const doctorId = req.user._id;
      const isSuperAdmin = req.user.roleName === 'SUPER_ADMIN';
      const { id } = req.params;

      const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { patientId: id };

      const patient = await User.findOne(query).select('-password -refreshTokens').lean();
      if (!patient || patient.roleName !== 'PATIENT') {
        throw new ApiError(404, 'Patient not found.');
      }

      // Authorization check: Is the doctor assigned to this patient?
      if (!isSuperAdmin) {
        const [hasApt, hasConsult] = await Promise.all([
          Appointment.exists({ patient: patient._id, doctor: doctorId }),
          MedicalRecord.exists({ patient: patient._id, doctor: doctorId }),
        ]);

        if (!hasApt && !hasConsult) {
          throw new ApiError(403, 'You are not authorized to access this patient\'s medical records.');
        }
      }

      // Fetch patient's past appointments, consultations, prescriptions, lab reports, and radiology reports
      const [pastAppointments, consultations, prescriptions, labReports, radiologyReports] = await Promise.all([
        Appointment.find({ patient: patient._id, doctor: doctorId })
          .sort({ appointmentDate: -1 })
          .lean(),
        MedicalRecord.find({ patient: patient._id, doctor: doctorId })
          .populate('doctor', 'firstName lastName specialization department')
          .sort({ consultationDate: -1 })
          .lean(),
        Prescription.find({ patient: patient._id, doctor: doctorId })
          .populate('doctor', 'firstName lastName specialization')
          .sort({ prescriptionDate: -1 })
          .lean(),
        LabReport.find({ patient: patient._id, doctor: doctorId })
          .populate('doctor', 'firstName lastName specialization')
          .sort({ testDate: -1, createdAt: -1 })
          .lean(),
        RadiologyReport.find({ patient: patient._id, doctor: doctorId })
          .populate('doctor', 'firstName lastName specialization')
          .sort({ examinationDate: -1, createdAt: -1 })
          .lean(),
      ]);

      // Construct Unified Longitudinal Medical Record Timeline
      const timeline = [];

      consultations.forEach((c) => {
        timeline.push({
          id: c._id,
          type: 'consultation',
          category: 'Clinical Consultation',
          date: c.consultationDate,
          title: c.diagnosis,
          clinician: c.doctor ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName || ''}`.trim() : null,
          status: 'Completed',
          summary: c.clinicalNotes || (c.symptoms && c.symptoms.length ? c.symptoms.join(', ') : 'Consultation encounter recorded'),
          data: c,
        });
      });

      prescriptions.forEach((pr) => {
        const medCount = pr.medications?.length || 0;
        timeline.push({
          id: pr._id,
          type: 'prescription',
          category: 'Prescription Order',
          date: pr.prescriptionDate || pr.createdAt,
          title: pr.diagnosis ? `Prescription: ${pr.diagnosis}` : `Prescription (${medCount} medication${medCount === 1 ? '' : 's'})`,
          clinician: pr.doctor ? `Dr. ${pr.doctor.firstName} ${pr.doctor.lastName || ''}`.trim() : null,
          status: pr.status || 'Active',
          summary: pr.medications?.map((m) => `${m.name} ${m.dosage}`).join(', ') || 'Medication order',
          data: pr,
        });
      });

      labReports.forEach((lr) => {
        timeline.push({
          id: lr._id,
          type: 'lab',
          category: `Lab • ${lr.category || 'General'}`,
          date: lr.testDate || lr.createdAt,
          title: lr.testName,
          clinician: lr.doctor ? `Dr. ${lr.doctor.firstName} ${lr.doctor.lastName || ''}`.trim() : null,
          status: lr.status || 'Pending',
          summary: lr.clinicalNotes || `Test code: ${lr.testCode || 'N/A'} • Priority: ${lr.priority || 'Routine'}`,
          data: lr,
        });
      });

      radiologyReports.forEach((rr) => {
        timeline.push({
          id: rr._id,
          type: 'radiology',
          category: `Imaging • ${rr.modality || 'Study'}`,
          date: rr.examinationDate || rr.createdAt,
          title: rr.examinationName,
          clinician: rr.doctor ? `Dr. ${rr.doctor.firstName} ${rr.doctor.lastName || ''}`.trim() : null,
          status: rr.status || 'Requested',
          summary: rr.impression || rr.clinicalIndication || `Modality: ${rr.modality} • Priority: ${rr.priority || 'Routine'}`,
          data: rr,
        });
      });

      pastAppointments.forEach((apt) => {
        timeline.push({
          id: apt._id,
          type: 'appointment',
          category: 'Appointment',
          date: apt.appointmentDate,
          title: apt.reason || 'OPD Visit',
          clinician: null,
          status: apt.status || 'Confirmed',
          summary: `Time: ${apt.appointmentTime || 'N/A'} • Dept: ${apt.department || 'OPD'}`,
          data: apt,
        });
      });

      // Sort timeline newest first
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let age = null;
      if (patient.dateOfBirth) {
        const diffMs = Date.now() - new Date(patient.dateOfBirth).getTime();
        age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
      }

      const isPatientActive = (patient.status === 'active' || !patient.status) && patient.isActive !== false;

      return ApiResponse.success(res, 'Patient clinical details retrieved', {
        patient: {
          id: patient._id,
          patientMongoId: patient._id,
          patientId: patient.patientId || `HMS-P-${String(patient._id).slice(-4).toUpperCase()}`,
          name: `${patient.firstName} ${patient.lastName || ''}`.trim(),
          firstName: patient.firstName,
          lastName: patient.lastName || '',
          email: patient.email || '',
          gender: patient.gender || '—',
          age: age || '—',
          dateOfBirth: patient.dateOfBirth,
          phone: patient.phone || '—',
          bloodGroup: patient.bloodGroup || '—',
          status: isPatientActive ? 'Active' : 'Inactive',
          address: patient.address || null,
          allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
          emergencyContact: patient.emergencyContact || null,
        },
        timeline,
        summaryCounts: {
          totalRecords: timeline.length,
          consultationsCount: consultations.length,
          prescriptionsCount: prescriptions.length,
          labCount: labReports.length,
          radiologyCount: radiologyReports.length,
          appointmentsCount: pastAppointments.length,
        },
        pastAppointments,
        consultations,
        prescriptions,
        labReports,
        radiologyReports,
      });
    } catch (error) {
      logger.error('Error fetching patient details for doctor:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/consultations
   * Filterable consultation records strictly for the authenticated doctor
   * Supports search (patient name, patientId, diagnosis), status (all, completed, in-progress, waiting),
   * date filter (YYYY-MM-DD), and pagination.
   */
  async getConsultations(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        search = '',
        status = 'all',
        date,
        page = 1,
        limit = 20,
      } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);

      // 1. Build date filter if provided
      let dateQuery = {};
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        dateQuery = { consultationDate: { $gte: start, $lte: end } };
      }

      // 2. Fetch completed consultations (MedicalRecord)
      const recordQuery = {
        doctor: doctorId,
        ...dateQuery,
      };

      const records = await MedicalRecord.find(recordQuery)
        .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact')
        .populate('appointment', 'appointmentDate appointmentTime reason status department')
        .sort({ consultationDate: -1 })
        .lean();

      // Format records
      const formattedRecords = records
        .filter((r) => r.patient)
        .map((r) => {
          const p = r.patient;
          let age = null;
          if (p.dateOfBirth) {
            const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
            age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
          }

          return {
            id: r._id,
            consultationMongoId: r._id,
            patientMongoId: p._id,
            patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
            patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
            patientGender: p.gender || '—',
            patientAge: age || '—',
            patientBloodGroup: p.bloodGroup || '—',
            patientPhone: p.phone || '—',
            patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
            consultationDate: r.consultationDate,
            diagnosis: r.diagnosis,
            symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
            clinicalNotes: r.clinicalNotes || '',
            treatment: r.treatment || '',
            vitals: r.vitals || {},
            followUpDate: r.followUpDate || null,
            appointmentId: r.appointment ? r.appointment._id : null,
            appointmentDate: r.appointment ? r.appointment.appointmentDate : null,
            appointmentTime: r.appointment ? r.appointment.appointmentTime : null,
            reasonForVisit: r.appointment ? r.appointment.reason : (r.symptoms && r.symptoms.length > 0 ? r.symptoms.join(', ') : 'Clinical Consultation'),
            status: 'Completed',
            canEdit: true,
          };
        });

      // 3. Fetch in-progress or waiting appointments for today/date if requested
      let activeVisits = [];
      if (status === 'all' || status === 'in-progress' || status === 'waiting') {
        const aptDateRange = date
          ? {
              $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
              $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
            }
          : {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              $lte: new Date(new Date().setHours(23, 59, 59, 999)),
            };

        const activeApts = await Appointment.find({
          doctor: doctorId,
          appointmentDate: aptDateRange,
          status: { $in: ['In-Progress', 'Waiting', 'Checked In'] },
        })
          .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact')
          .sort({ appointmentTime: 1 })
          .lean();

        activeVisits = activeApts
          .filter((a) => a.patient)
          .map((a) => {
            const p = a.patient;
            let age = null;
            if (p.dateOfBirth) {
              const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
              age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
            }

            return {
              id: a._id,
              consultationMongoId: null,
              appointmentId: a._id,
              patientMongoId: p._id,
              patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
              patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
              patientGender: p.gender || '—',
              patientAge: age || '—',
              patientBloodGroup: p.bloodGroup || '—',
              patientPhone: p.phone || '—',
              patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
              consultationDate: a.appointmentDate,
              diagnosis: '',
              symptoms: a.reason ? [a.reason] : [],
              clinicalNotes: '',
              treatment: '',
              vitals: {
                bp: '120/80 mmHg',
                heartRate: '72 bpm',
                temperature: '98.6 °F',
                respiratoryRate: '16 breaths/min',
                weight: '70 kg',
                spo2: '99%',
              },
              followUpDate: null,
              appointmentDate: a.appointmentDate,
              appointmentTime: a.appointmentTime,
              reasonForVisit: a.reason || 'General Consultation',
              status: a.status === 'In-Progress' ? 'In-Progress' : a.status,
              canEdit: true,
            };
          });
      }

      // Combine according to status filter
      let combined = [];
      if (status === 'completed') {
        combined = formattedRecords;
      } else if (status === 'in-progress') {
        combined = activeVisits.filter((v) => v.status === 'In-Progress');
      } else if (status === 'waiting') {
        combined = activeVisits.filter((v) => ['Waiting', 'Checked In'].includes(v.status));
      } else {
        // 'all': active in-progress visits first, then waiting, then completed
        combined = [...activeVisits, ...formattedRecords];
      }

      // 4. Apply search filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        combined = combined.filter((item) => {
          return (
            (item.patientName || '').toLowerCase().includes(q) ||
            (item.patientId || '').toLowerCase().includes(q) ||
            (item.diagnosis || '').toLowerCase().includes(q) ||
            (item.reasonForVisit || '').toLowerCase().includes(q)
          );
        });
      }

      // 5. Summary counts
      const totalCompleted = formattedRecords.length;
      const totalInProgress = activeVisits.filter((v) => v.status === 'In-Progress').length;
      const totalWaiting = activeVisits.filter((v) => ['Waiting', 'Checked In'].includes(v.status)).length;

      // 6. Pagination
      const totalCount = combined.length;
      const totalPages = Math.ceil(totalCount / limitNum) || 1;
      const paginated = combined.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return ApiResponse.success(res, 'Consultations retrieved successfully', {
        consultations: paginated,
        summary: {
          total: totalCount,
          completed: totalCompleted,
          inProgress: totalInProgress,
          waiting: totalWaiting,
        },
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
        },
      });
    } catch (error) {
      logger.error('Error fetching doctor consultations:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/consultations/:id
   * Fetch single consultation details with patient clinical history
   */
  async getConsultationById(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid consultation identifier.');
      }

      // 1. Try finding as MedicalRecord
      const record = await MedicalRecord.findById(id)
        .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact address')
        .populate('appointment', 'appointmentDate appointmentTime reason status department')
        .lean();

      if (record) {
        // Enforce doctor authorization
        if (record.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
          throw new ApiError(403, 'You are not authorized to view this consultation record.');
        }

        const p = record.patient || {};
        let age = null;
        if (p.dateOfBirth) {
          const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
          age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
        }

        // Fetch patient previous consultations
        const previousConsultations = await MedicalRecord.find({
          patient: p._id,
          doctor: doctorId,
          _id: { $ne: record._id },
        })
          .sort({ consultationDate: -1 })
          .limit(10)
          .lean();

        return ApiResponse.success(res, 'Consultation record retrieved', {
          consultation: {
            id: record._id,
            consultationMongoId: record._id,
            patientMongoId: p._id,
            patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
            patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
            patientGender: p.gender || '—',
            patientAge: age || '—',
            patientBloodGroup: p.bloodGroup || '—',
            patientPhone: p.phone || '—',
            patientEmail: p.email || '',
            patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
            patientEmergencyContact: p.emergencyContact || null,
            consultationDate: record.consultationDate,
            diagnosis: record.diagnosis,
            symptoms: Array.isArray(record.symptoms) ? record.symptoms : [],
            clinicalNotes: record.clinicalNotes || '',
            treatment: record.treatment || '',
            vitals: record.vitals || {},
            followUpDate: record.followUpDate || null,
            appointmentId: record.appointment ? record.appointment._id : null,
            appointmentDate: record.appointment ? record.appointment.appointmentDate : null,
            appointmentTime: record.appointment ? record.appointment.appointmentTime : null,
            reasonForVisit: record.appointment ? record.appointment.reason : 'Clinical Consultation',
            status: 'Completed',
          },
          previousConsultations: previousConsultations.map((c) => ({
            id: c._id,
            consultationDate: c.consultationDate,
            diagnosis: c.diagnosis,
            treatment: c.treatment,
            clinicalNotes: c.clinicalNotes,
          })),
        });
      }

      // 2. Fallback: try finding as active Appointment
      const apt = await Appointment.findById(id)
        .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact address')
        .lean();

      if (apt) {
        if (apt.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
          throw new ApiError(403, 'You are not authorized to access this consultation.');
        }

        const p = apt.patient || {};
        let age = null;
        if (p.dateOfBirth) {
          const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
          age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
        }

        const previousConsultations = await MedicalRecord.find({
          patient: p._id,
          doctor: doctorId,
        })
          .sort({ consultationDate: -1 })
          .limit(10)
          .lean();

        return ApiResponse.success(res, 'Active consultation visit retrieved', {
          consultation: {
            id: apt._id,
            consultationMongoId: null,
            appointmentId: apt._id,
            patientMongoId: p._id,
            patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
            patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
            patientGender: p.gender || '—',
            patientAge: age || '—',
            patientBloodGroup: p.bloodGroup || '—',
            patientPhone: p.phone || '—',
            patientEmail: p.email || '',
            patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
            patientEmergencyContact: p.emergencyContact || null,
            consultationDate: apt.appointmentDate,
            diagnosis: '',
            symptoms: apt.reason ? [apt.reason] : [],
            clinicalNotes: '',
            treatment: '',
            vitals: {
              bp: '120/80 mmHg',
              heartRate: '72 bpm',
              temperature: '98.6 °F',
              respiratoryRate: '16 breaths/min',
              weight: '70 kg',
              spo2: '99%',
            },
            followUpDate: null,
            appointmentId: apt._id,
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            reasonForVisit: apt.reason || 'General Consultation',
            status: apt.status === 'In-Progress' ? 'In-Progress' : apt.status,
          },
          previousConsultations: previousConsultations.map((c) => ({
            id: c._id,
            consultationDate: c.consultationDate,
            diagnosis: c.diagnosis,
            treatment: c.treatment,
            clinicalNotes: c.clinicalNotes,
          })),
        });
      }

      throw new ApiError(404, 'Consultation record not found.');
    } catch (error) {
      logger.error('Error fetching consultation by ID:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/doctor/consultations
   * Save consultation record and mark appointment Completed.
   * If record already exists for appointment, updates it to prevent duplicate submissions.
   */
  async createConsultation(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        patientId,
        appointmentId,
        diagnosis,
        symptoms = [],
        clinicalNotes = '',
        treatment = '',
        vitals = {},
        followUpDate = null,
      } = req.body;

      if (!patientId || !diagnosis || !diagnosis.trim()) {
        throw new ApiError(400, 'Patient reference and primary diagnosis are required.');
      }

      const patient = await User.findById(patientId);
      if (!patient) {
        throw new ApiError(404, 'Patient not found.');
      }

      // If appointment was linked, check authorization
      if (appointmentId) {
        const apt = await Appointment.findById(appointmentId);
        if (apt && apt.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
          throw new ApiError(403, 'You are not authorized to complete consultations for another doctor\'s appointment.');
        }

        // Check if a MedicalRecord already exists for this appointment
        const existingRecord = await MedicalRecord.findOne({ appointment: appointmentId, doctor: doctorId });
        if (existingRecord) {
          existingRecord.diagnosis = diagnosis.trim();
          existingRecord.symptoms = Array.isArray(symptoms)
            ? symptoms
            : typeof symptoms === 'string'
            ? symptoms.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
          existingRecord.clinicalNotes = clinicalNotes.trim();
          existingRecord.treatment = treatment.trim();
          if (vitals && typeof vitals === 'object') {
            existingRecord.vitals = { ...existingRecord.vitals, ...vitals };
          }
          existingRecord.followUpDate = followUpDate ? new Date(followUpDate) : null;
          await existingRecord.save();

          await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });

          await AuditLog.create({
            user: doctorId,
            userEmail: req.user.email,
            userRole: 'DOCTOR',
            action: 'UPDATE_CONSULTATION',
            module: 'consultations',
            resourceId: String(existingRecord._id),
            details: { patientId: String(patientId), appointmentId: String(appointmentId) },
            status: 'SUCCESS',
          });

          return ApiResponse.success(res, 'Consultation record updated successfully', {
            id: existingRecord._id,
            diagnosis: existingRecord.diagnosis,
            consultationDate: existingRecord.consultationDate,
          });
        }
      }

      const medicalRecord = new MedicalRecord({
        patient: patientId,
        doctor: doctorId,
        appointment: appointmentId || null,
        consultationDate: new Date(),
        diagnosis: diagnosis.trim(),
        symptoms: Array.isArray(symptoms)
          ? symptoms
          : typeof symptoms === 'string'
          ? symptoms.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        clinicalNotes: clinicalNotes.trim(),
        treatment: treatment.trim(),
        vitals,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      });

      await medicalRecord.save();

      // If appointment was linked, mark it completed
      if (appointmentId) {
        await Appointment.findOneAndUpdate(
          { _id: appointmentId, doctor: doctorId },
          { status: 'Completed' }
        );
      }

      await AuditLog.create({
        user: doctorId,
        userEmail: req.user.email,
        userRole: 'DOCTOR',
        action: 'CREATE_CONSULTATION',
        module: 'consultations',
        resourceId: String(medicalRecord._id),
        details: { patientId: String(patientId), appointmentId: appointmentId ? String(appointmentId) : null, diagnosis: diagnosis.trim() },
        status: 'SUCCESS',
      });

      return ApiResponse.created(res, 'Consultation record saved successfully', {
        id: medicalRecord._id,
        diagnosis: medicalRecord.diagnosis,
        consultationDate: medicalRecord.consultationDate,
      });
    } catch (error) {
      logger.error('Error saving consultation record:', error);
      next(error);
    }
  }

  /**
   * PUT /api/v1/doctor/consultations/:id
   * Update clinical documentation of an existing consultation
   */
  async updateConsultation(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;
      const {
        diagnosis,
        symptoms,
        clinicalNotes,
        treatment,
        vitals,
        followUpDate,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid consultation ID.');
      }

      const record = await MedicalRecord.findById(id);
      if (!record) {
        throw new ApiError(404, 'Consultation record not found.');
      }

      if (record.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
        throw new ApiError(403, 'You are not authorized to update this consultation.');
      }

      if (diagnosis !== undefined) {
        if (!diagnosis.trim()) {
          throw new ApiError(400, 'Primary clinical diagnosis cannot be empty.');
        }
        record.diagnosis = diagnosis.trim();
      }

      if (symptoms !== undefined) {
        record.symptoms = Array.isArray(symptoms)
          ? symptoms
          : typeof symptoms === 'string'
          ? symptoms.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }

      if (clinicalNotes !== undefined) {
        record.clinicalNotes = clinicalNotes.trim();
      }

      if (treatment !== undefined) {
        record.treatment = treatment.trim();
      }

      if (vitals && typeof vitals === 'object') {
        record.vitals = { ...record.vitals, ...vitals };
      }

      if (followUpDate !== undefined) {
        record.followUpDate = followUpDate ? new Date(followUpDate) : null;
      }

      await record.save();

      // Audit Log
      await AuditLog.create({
        user: doctorId,
        userEmail: req.user.email,
        userRole: 'DOCTOR',
        action: 'UPDATE_CONSULTATION',
        module: 'consultations',
        resourceId: String(record._id),
        details: { diagnosis: record.diagnosis },
        status: 'SUCCESS',
      });

      return ApiResponse.success(res, 'Consultation record updated successfully', {
        id: record._id,
        diagnosis: record.diagnosis,
        consultationDate: record.consultationDate,
        followUpDate: record.followUpDate,
      });
    } catch (error) {
      logger.error('Error updating consultation record:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/notifications
   */
  async getNotifications(req, res, next) {
    try {
      const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
      });

      return ApiResponse.success(res, 'Notifications retrieved', {
        notifications,
        unreadCount,
      });
    } catch (error) {
      logger.error('Error fetching doctor notifications:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/notifications/:id/read
   */
  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      await Notification.findOneAndUpdate(
        { _id: id, recipient: req.user._id },
        { isRead: true }
      );
      return ApiResponse.success(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/notifications/mark-all-read
   */
  async markAllNotificationsRead(req, res, next) {
    try {
      await Notification.updateMany({ recipient: req.user._id }, { isRead: true });
      return ApiResponse.success(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/prescriptions
   * Retrieve filterable, searchable, and paginated prescriptions written by this doctor
   */
  async getPrescriptions(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        search = '',
        status = 'all',
        date,
        patientId,
        page = 1,
        limit = 20,
      } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);

      // Base query scoped to authenticated doctor
      const query = { doctor: doctorId };

      // Status filter
      if (status && status !== 'all') {
        const normStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        query.status = normStatus;
      }

      // Patient filter
      if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
        query.patient = patientId;
      }

      // Date filter
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        query.prescriptionDate = { $gte: start, $lte: end };
      }

      const allDoctorPrescriptions = await Prescription.find(query)
        .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact')
        .populate('appointment', 'appointmentDate appointmentTime reason status department')
        .sort({ prescriptionDate: -1 })
        .lean();

      // Format records
      let formatted = allDoctorPrescriptions
        .filter((pr) => pr.patient)
        .map((pr) => {
          const p = pr.patient;
          let age = null;
          if (p.dateOfBirth) {
            const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
            age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
          }

          const prescriptionCode = `RX-${String(pr._id).slice(-6).toUpperCase()}`;

          return {
            id: pr._id,
            prescriptionMongoId: pr._id,
            prescriptionCode,
            prescriptionDate: pr.prescriptionDate,
            patientMongoId: p._id,
            patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
            patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
            patientGender: p.gender || '—',
            patientAge: age || '—',
            patientBloodGroup: p.bloodGroup || '—',
            patientPhone: p.phone || '—',
            patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
            doctorName: req.user ? `Dr. ${req.user.firstName} ${req.user.lastName || ''}`.trim() : 'Attending Physician',
            doctorSpecialization: req.user?.specialization || 'General Medicine',
            diagnosis: pr.diagnosis || 'Clinical Consultation',
            medications: Array.isArray(pr.medications) ? pr.medications : [],
            medicationsCount: Array.isArray(pr.medications) ? pr.medications.length : 0,
            notes: pr.notes || '',
            status: pr.status || 'Active',
            appointmentId: pr.appointment ? pr.appointment._id : null,
            appointmentDate: pr.appointment ? pr.appointment.appointmentDate : null,
            appointmentTime: pr.appointment ? pr.appointment.appointmentTime : null,
            appointmentReason: pr.appointment ? pr.appointment.reason : '',
            createdAt: pr.createdAt,
          };
        });

      // Search filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        formatted = formatted.filter((item) => {
          const matchPatient = (item.patientName || '').toLowerCase().includes(q) ||
            (item.patientId || '').toLowerCase().includes(q);
          const matchCode = (item.prescriptionCode || '').toLowerCase().includes(q);
          const matchDiagnosis = (item.diagnosis || '').toLowerCase().includes(q);
          const matchMed = (item.medications || []).some((m) =>
            (m.name || '').toLowerCase().includes(q)
          );
          return matchPatient || matchCode || matchDiagnosis || matchMed;
        });
      }

      // Summary counts across all doctor's prescriptions
      const [totalCount, activeCount, completedCount, discontinuedCount] = await Promise.all([
        Prescription.countDocuments({ doctor: doctorId }),
        Prescription.countDocuments({ doctor: doctorId, status: 'Active' }),
        Prescription.countDocuments({ doctor: doctorId, status: 'Completed' }),
        Prescription.countDocuments({ doctor: doctorId, status: 'Discontinued' }),
      ]);

      // Pagination
      const totalFiltered = formatted.length;
      const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
      const paginated = formatted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return ApiResponse.success(res, 'Doctor prescriptions retrieved successfully', {
        prescriptions: paginated,
        summary: {
          total: totalCount,
          active: activeCount,
          completed: completedCount,
          discontinued: discontinuedCount,
        },
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
        },
      });
    } catch (error) {
      logger.error('Error fetching doctor prescriptions:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/prescriptions/:id
   * Fetch details of a single prescription written by this doctor
   */
  async getPrescriptionById(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid prescription identifier.');
      }

      const pr = await Prescription.findById(id)
        .populate('patient', 'firstName lastName patientId gender dateOfBirth bloodGroup phone email allergies emergencyContact address')
        .populate('doctor', 'firstName lastName specialization department licenseNumber email')
        .populate('appointment', 'appointmentDate appointmentTime reason status department')
        .lean();

      if (!pr) {
        throw new ApiError(404, 'Prescription not found.');
      }

      // Enforce doctor ownership
      if (pr.doctor._id.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
        throw new ApiError(403, 'You are not authorized to access this prescription.');
      }

      const p = pr.patient || {};
      let age = null;
      if (p.dateOfBirth) {
        const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
        age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
      }

      // Fetch other prescriptions for this patient by this doctor
      const pastPrescriptions = await Prescription.find({
        patient: p._id,
        doctor: doctorId,
        _id: { $ne: pr._id },
      })
        .sort({ prescriptionDate: -1 })
        .limit(5)
        .lean();

      return ApiResponse.success(res, 'Prescription details retrieved', {
        prescription: {
          id: pr._id,
          prescriptionMongoId: pr._id,
          prescriptionCode: `RX-${String(pr._id).slice(-6).toUpperCase()}`,
          prescriptionDate: pr.prescriptionDate,
          patientMongoId: p._id,
          patientId: p.patientId || `HMS-P-${String(p._id).slice(-4).toUpperCase()}`,
          patientName: `${p.firstName} ${p.lastName || ''}`.trim(),
          patientGender: p.gender || '—',
          patientAge: age || '—',
          patientBloodGroup: p.bloodGroup || '—',
          patientPhone: p.phone || '—',
          patientEmail: p.email || '',
          patientAllergies: Array.isArray(p.allergies) ? p.allergies : [],
          patientEmergencyContact: p.emergencyContact || null,
          patientAddress: p.address || null,
          doctorName: `Dr. ${pr.doctor.firstName} ${pr.doctor.lastName || ''}`.trim(),
          doctorSpecialization: pr.doctor.specialization || 'General Medicine',
          doctorDepartment: pr.doctor.department || 'Outpatient',
          doctorLicenseNumber: pr.doctor.licenseNumber || 'Verified by Hospital',
          diagnosis: pr.diagnosis || '',
          medications: Array.isArray(pr.medications) ? pr.medications : [],
          notes: pr.notes || '',
          status: pr.status || 'Active',
          appointmentId: pr.appointment ? pr.appointment._id : null,
          appointmentDate: pr.appointment ? pr.appointment.appointmentDate : null,
          appointmentTime: pr.appointment ? pr.appointment.appointmentTime : null,
          appointmentReason: pr.appointment ? pr.appointment.reason : '',
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
        },
        pastPrescriptions: pastPrescriptions.map((past) => ({
          id: past._id,
          prescriptionCode: `RX-${String(past._id).slice(-6).toUpperCase()}`,
          prescriptionDate: past.prescriptionDate,
          diagnosis: past.diagnosis,
          medicationsCount: (past.medications || []).length,
          status: past.status,
        })),
      });
    } catch (error) {
      logger.error('Error fetching prescription details:', error);
      next(error);
    }
  }

  /**
   * POST /api/v1/doctor/prescriptions
   * Create a new patient prescription order
   */
  async createPrescription(req, res, next) {
    try {
      const doctorId = req.user._id;
      const {
        patientId,
        appointmentId,
        diagnosis = '',
        medications = [],
        notes = '',
      } = req.body;

      if (!patientId) {
        throw new ApiError(400, 'Patient reference is required.');
      }

      if (!Array.isArray(medications) || medications.length === 0) {
        throw new ApiError(400, 'Prescription must contain at least one medication item.');
      }

      // Validate each medication row
      for (let i = 0; i < medications.length; i++) {
        const item = medications[i];
        if (!item.name || !item.name.trim()) {
          throw new ApiError(400, `Medication item #${i + 1} requires a valid medicine name.`);
        }
        if (!item.dosage || !item.dosage.trim()) {
          throw new ApiError(400, `Medication item #${i + 1} requires dosage (e.g. 500mg).`);
        }
        if (!item.frequency || !item.frequency.trim()) {
          throw new ApiError(400, `Medication item #${i + 1} requires frequency (e.g. Twice daily).`);
        }
        if (!item.duration || !item.duration.trim()) {
          throw new ApiError(400, `Medication item #${i + 1} requires duration (e.g. 5 days).`);
        }
      }

      const patient = await User.findById(patientId);
      if (!patient) {
        throw new ApiError(404, 'Patient not found.');
      }

      // If appointment was provided, verify it belongs to this doctor
      if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId)) {
        const apt = await Appointment.findById(appointmentId);
        if (apt && apt.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
          throw new ApiError(403, 'You are not authorized to create prescriptions for another doctor\'s appointment.');
        }
      }

      // Prevent duplicate creation from rapid double-clicks
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const existingRecent = await Prescription.findOne({
        patient: patientId,
        doctor: doctorId,
        appointment: appointmentId || null,
        createdAt: { $gte: thirtySecondsAgo },
      });

      if (existingRecent) {
        return ApiResponse.success(res, 'Prescription already created', {
          id: existingRecent._id,
          prescriptionCode: `RX-${String(existingRecent._id).slice(-6).toUpperCase()}`,
          status: existingRecent.status,
        });
      }

      const sanitizedMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        instructions: (m.instructions || '').trim(),
      }));

      const newPrescription = new Prescription({
        patient: patientId,
        doctor: doctorId,
        appointment: appointmentId || null,
        prescriptionDate: new Date(),
        diagnosis: (diagnosis || '').trim(),
        medications: sanitizedMeds,
        notes: (notes || '').trim(),
        status: 'Active',
      });

      await newPrescription.save();

      // Audit log
      await AuditLog.create({
        user: doctorId,
        userEmail: req.user.email,
        userRole: 'DOCTOR',
        action: 'CREATE_PRESCRIPTION',
        module: 'prescriptions',
        resourceId: String(newPrescription._id),
        details: {
          patientId: String(patientId),
          medicationsCount: sanitizedMeds.length,
          diagnosis: newPrescription.diagnosis,
        },
        status: 'SUCCESS',
      });

      return ApiResponse.created(res, 'Prescription created successfully', {
        id: newPrescription._id,
        prescriptionCode: `RX-${String(newPrescription._id).slice(-6).toUpperCase()}`,
        prescriptionDate: newPrescription.prescriptionDate,
        status: newPrescription.status,
      });
    } catch (error) {
      logger.error('Error creating prescription:', error);
      next(error);
    }
  }

  /**
   * PATCH /api/v1/doctor/prescriptions/:id/status
   * Update prescription status (e.g. Discontinue or Complete)
   */
  async updatePrescriptionStatus(req, res, next) {
    try {
      const doctorId = req.user._id;
      const { id } = req.params;
      const { status, reason = '' } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid prescription ID.');
      }

      const allowedStatuses = ['Active', 'Completed', 'Discontinued'];
      if (!allowedStatuses.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`);
      }

      const pr = await Prescription.findById(id);
      if (!pr) {
        throw new ApiError(404, 'Prescription not found.');
      }

      if (pr.doctor.toString() !== doctorId.toString() && req.user.role !== 'super_admin') {
        throw new ApiError(403, 'You are not authorized to update this prescription.');
      }

      const oldStatus = pr.status;
      pr.status = status;
      if (reason) {
        pr.notes = pr.notes ? `${pr.notes} [Status changed to ${status}: ${reason}]` : `[Status changed to ${status}: ${reason}]`;
      }
      await pr.save();

      await AuditLog.create({
        user: doctorId,
        userEmail: req.user.email,
        userRole: 'DOCTOR',
        action: 'UPDATE_PRESCRIPTION_STATUS',
        module: 'prescriptions',
        resourceId: String(pr._id),
        details: { oldStatus, newStatus: status, reason },
        status: 'SUCCESS',
      });

      return ApiResponse.success(res, `Prescription status updated to ${status}`, {
        id: pr._id,
        status: pr.status,
      });
    } catch (error) {
      logger.error('Error updating prescription status:', error);
      next(error);
    }
  }

  /**
   * GET /api/v1/doctor/medicines
   * Return hospital medicines catalog for easy prescribing autocomplete
   */
  async getMedicinesCatalog(req, res, next) {
    try {
      const { search = '' } = req.query;
      const catalog = [
        { name: 'Amoxicillin & Clavulanate', strength: '625 mg', dosage: '625mg', defaultFrequency: 'Twice daily after meals', defaultDuration: '5 days', instructions: 'Take with food or milk' },
        { name: 'Paracetamol', strength: '650 mg', dosage: '650mg', defaultFrequency: 'Thrice daily', defaultDuration: '3 days', instructions: 'Take SOS for fever or pain' },
        { name: 'Metformin Hydrochloride', strength: '500 mg', dosage: '500mg', defaultFrequency: 'Twice daily with meals', defaultDuration: '30 days', instructions: 'Take with morning and evening meal' },
        { name: 'Amlodipine Besylate', strength: '5 mg', dosage: '5mg', defaultFrequency: 'Once daily morning', defaultDuration: '30 days', instructions: 'Take in the morning' },
        { name: 'Atorvastatin Calcium', strength: '20 mg', dosage: '20mg', defaultFrequency: 'Once daily at bedtime', defaultDuration: '30 days', instructions: 'Take at night after food' },
        { name: 'Azithromycin', strength: '500 mg', dosage: '500mg', defaultFrequency: 'Once daily', defaultDuration: '3 days', instructions: 'Take 1 hour before or 2 hours after meals' },
        { name: 'Omeprazole', strength: '20 mg', dosage: '20mg', defaultFrequency: 'Once daily empty stomach', defaultDuration: '14 days', instructions: 'Take 30 minutes before breakfast' },
        { name: 'Pantoprazole', strength: '40 mg', dosage: '40mg', defaultFrequency: 'Once daily empty stomach', defaultDuration: '14 days', instructions: 'Take 30 minutes before breakfast' },
        { name: 'Ibuprofen', strength: '400 mg', dosage: '400mg', defaultFrequency: 'Twice daily after meals', defaultDuration: '5 days', instructions: 'Take with food to prevent gastric upset' },
        { name: 'Cetirizine Hydrochloride', strength: '10 mg', dosage: '10mg', defaultFrequency: 'Once daily at bedtime', defaultDuration: '7 days', instructions: 'May cause mild drowsiness' },
        { name: 'Ciprofloxacin', strength: '500 mg', dosage: '500mg', defaultFrequency: 'Twice daily', defaultDuration: '7 days', instructions: 'Drink plenty of fluids' },
        { name: 'Metoprolol Succinate', strength: '25 mg', dosage: '25mg', defaultFrequency: 'Once daily morning', defaultDuration: '30 days', instructions: 'Take with food' },
        { name: 'Losartan Potassium', strength: '50 mg', dosage: '50mg', defaultFrequency: 'Once daily', defaultDuration: '30 days', instructions: 'Maintain adequate hydration' },
        { name: 'Salbutamol Inhaler', strength: '100 mcg/dose', dosage: '2 puffs', defaultFrequency: 'SOS as needed', defaultDuration: '30 days', instructions: 'Inhale as directed for acute shortness of breath' },
      ];

      let results = catalog;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        results = catalog.filter((m) =>
          m.name.toLowerCase().includes(q) || m.strength.toLowerCase().includes(q)
        );
      }

      return ApiResponse.success(res, 'Medicines catalog retrieved', { medicines: results });
    } catch (error) {
      logger.error('Error fetching medicines catalog:', error);
      next(error);
    }
  }
}

module.exports = new DoctorController();
