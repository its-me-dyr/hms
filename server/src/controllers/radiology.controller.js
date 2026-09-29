/**
 * Radiology & Imaging Controller
 * 
 * Central controller for all radiology operations:
 * - Real-time operational KPIs & dashboard analytics
 * - Imaging request workflow management
 * - Scheduling with conflict detection
 * - Patient preparation checklists
 * - Imaging queue management
 * - Study processing (start/complete)
 * - Report entry with draft/submission workflow
 * - Report verification with correction workflow
 * - Critical/abnormal findings with notification integration
 * - Patient imaging directory & history
 * - Equipment availability management
 * - Role-scoped notifications & audit trails
 */

const mongoose = require('mongoose');
const RadiologyReport = require('../models/RadiologyReport');
const RadiologyEquipment = require('../models/RadiologyEquipment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ── Helpers ──────────────────────────────────────────────────────

const recordAudit = async (req, action, resourceId, details = {}, status = 'SUCCESS') => {
  try {
    await AuditLog.create({
      user: req.user?._id || null,
      userEmail: req.user?.email || 'system',
      userRole: req.user?.roleName || req.user?.role?.name || 'RADIOLOGY_STAFF',
      action,
      module: 'radiology',
      resourceId: resourceId?.toString() || null,
      details,
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      status,
    });
  } catch (err) {
    logger.warn('Failed to record radiology audit log:', err.message);
  }
};

// Valid status transitions
const VALID_TRANSITIONS = {
  'Pending': ['Accepted', 'Rejected', 'Cancelled'],
  'Accepted': ['Scheduled', 'Cancelled'],
  'Scheduled': ['Patient Ready', 'Cancelled'],
  'Patient Ready': ['In Queue', 'Cancelled', 'Scheduled'],
  'In Queue': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed'],
  'Completed': ['Report Draft'],
  'Report Draft': ['Report Pending Verification'],
  'Report Pending Verification': ['Verified', 'Report Draft'], // Return for correction goes back to Report Draft
  'Verified': [],
  'Cancelled': [],
  'Rejected': [],
};

const isValidTransition = (currentStatus, newStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
};

// ─────────────────────────────────────────────────────────────────
// 1. GET /api/v1/radiology/dashboard
// ─────────────────────────────────────────────────────────────────
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      pendingRequests,
      todaysScheduled,
      patientsWaiting,
      studiesInProgress,
      reportsPending,
      reportsPendingVerification,
      criticalFindingsCount,
      completedToday,
      todaysScheduleList,
      queueList,
      pendingReportsList,
      criticalAlerts,
      recentAudits,
    ] = await Promise.all([
      RadiologyReport.countDocuments({ status: { $in: ['Pending', 'Accepted'] } }),
      RadiologyReport.countDocuments({
        scheduledDate: { $gte: todayStart, $lt: new Date(todayStart.getTime() + 86400000) },
        status: { $nin: ['Cancelled', 'Rejected'] },
      }),
      RadiologyReport.countDocuments({ status: { $in: ['Patient Ready', 'In Queue'] } }),
      RadiologyReport.countDocuments({ status: 'In Progress' }),
      RadiologyReport.countDocuments({ status: { $in: ['Completed', 'Report Draft'] } }),
      RadiologyReport.countDocuments({ status: 'Report Pending Verification' }),
      RadiologyReport.countDocuments({ isCritical: true, criticalAcknowledged: { $ne: true } }),
      RadiologyReport.countDocuments({
        status: { $in: ['Verified', 'Completed'] },
        updatedAt: { $gte: todayStart },
      }),
      // Today's schedule (up to 20)
      RadiologyReport.find({
        scheduledDate: { $gte: todayStart, $lt: new Date(todayStart.getTime() + 86400000) },
        status: { $nin: ['Cancelled', 'Rejected'] },
      })
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .sort({ scheduledTime: 1 })
        .limit(20)
        .lean(),
      // Queue (up to 20)
      RadiologyReport.find({ status: { $in: ['Patient Ready', 'In Queue', 'In Progress'] } })
        .populate('patient', 'firstName lastName patientId')
        .sort({ priority: -1, queueEnteredAt: 1 })
        .limit(20)
        .lean(),
      // Pending reports (up to 20)
      RadiologyReport.find({ status: { $in: ['Completed', 'Report Draft', 'Report Pending Verification'] } })
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      // Critical alerts
      RadiologyReport.find({ isCritical: true, criticalAcknowledged: { $ne: true } })
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Recent activity
      AuditLog.find({ module: 'radiology' })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          pendingRequests,
          todaysScheduled,
          patientsWaiting,
          studiesInProgress,
          reportsPending,
          reportsPendingVerification,
          criticalFindings: criticalFindingsCount,
          completedToday,
        },
        todaysScheduleList,
        queueList,
        pendingReportsList,
        criticalAlerts,
        recentActivity: recentAudits,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 2. Imaging Requests
// ─────────────────────────────────────────────────────────────────
exports.getImagingRequests = async (req, res, next) => {
  try {
    const {
      search, status, modality, department, priority, doctor,
      startDate, endDate, page = 1, limit = 25, sort = '-createdAt',
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (modality) filter.modality = modality;
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (priority) filter.priority = priority;
    if (doctor) filter.doctor = doctor;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { requestId: searchRegex },
        { examinationName: searchRegex },
        { bodyPart: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      RadiologyReport.find(filter)
        .populate('patient', 'firstName lastName patientId email phone')
        .populate('doctor', 'firstName lastName specialization department')
        .populate('assignedStaff', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RadiologyReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getImagingRequestById = async (req, res, next) => {
  try {
    const report = await RadiologyReport.findById(req.params.id)
      .populate('patient', 'firstName lastName patientId email phone gender dateOfBirth bloodGroup')
      .populate('doctor', 'firstName lastName specialization department email')
      .populate('assignedStaff', 'firstName lastName email')
      .populate('performedBy', 'firstName lastName')
      .populate('reportSubmittedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .populate('returnedBy', 'firstName lastName')
      .populate('criticalAcknowledgedBy', 'firstName lastName')
      .populate('equipment', 'name modality room status')
      .lean();

    if (!report) {
      return next(new ApiError(404, 'Imaging request not found'));
    }

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status, notes, reason } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Imaging request not found'));
    }

    if (!isValidTransition(report.status, status)) {
      return next(new ApiError(400, `Invalid status transition from "${report.status}" to "${status}"`));
    }

    const prevStatus = report.status;
    report.status = status;

    if (status === 'Rejected' && reason) {
      report.studyNotes = (report.studyNotes ? report.studyNotes + '\n' : '') + `Rejected: ${reason}`;
    }
    if (status === 'Cancelled' && reason) {
      report.studyNotes = (report.studyNotes ? report.studyNotes + '\n' : '') + `Cancelled: ${reason}`;
    }

    await report.save();
    await recordAudit(req, 'UPDATE_REQUEST_STATUS', report._id, { from: prevStatus, to: status, notes });

    // Create notification for status changes
    try {
      if (['Accepted', 'Rejected', 'Cancelled'].includes(status)) {
        await Notification.create({
          recipient: report.doctor,
          title: `Imaging Request ${status}`,
          message: `Request ${report.requestId} for ${report.examinationName} has been ${status.toLowerCase()}.`,
          type: 'radiology',
          relatedId: report._id,
        });
      }
    } catch (notifErr) {
      logger.warn('Failed to create radiology notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: `Request ${status.toLowerCase()} successfully`, data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 3. Scheduling
// ─────────────────────────────────────────────────────────────────
exports.getSchedules = async (req, res, next) => {
  try {
    const { date, modality, room, page = 1, limit = 50 } = req.query;
    const filter = { status: { $nin: ['Cancelled', 'Rejected', 'Pending'] } };

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      filter.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    if (modality) filter.modality = modality;
    if (room) filter.scheduledRoom = room;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [schedules, total] = await Promise.all([
      RadiologyReport.find(filter)
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .populate('assignedStaff', 'firstName lastName')
        .populate('equipment', 'name modality room')
        .sort({ scheduledDate: 1, scheduledTime: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RadiologyReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: schedules,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const { reportId, scheduledDate, scheduledTime, scheduledRoom, assignedStaff, equipment } = req.body;

    const report = await RadiologyReport.findById(reportId);
    if (!report) return next(new ApiError(404, 'Imaging request not found'));

    if (!isValidTransition(report.status, 'Scheduled')) {
      return next(new ApiError(400, `Cannot schedule a request with status "${report.status}"`));
    }

    // Check for scheduling conflicts
    if (scheduledDate && scheduledTime && scheduledRoom) {
      const d = new Date(scheduledDate);
      d.setHours(0, 0, 0, 0);
      const conflict = await RadiologyReport.findOne({
        _id: { $ne: report._id },
        scheduledDate: { $gte: d, $lt: new Date(d.getTime() + 86400000) },
        scheduledTime,
        scheduledRoom,
        status: { $nin: ['Cancelled', 'Rejected'] },
      });
      if (conflict) {
        return next(new ApiError(409, `Room ${scheduledRoom} is already booked at ${scheduledTime} on this date`));
      }
    }

    // Check equipment availability
    if (equipment) {
      const eq = await RadiologyEquipment.findById(equipment);
      if (eq && (eq.status === 'Maintenance' || eq.status === 'Out of Service')) {
        return next(new ApiError(400, `Equipment "${eq.name}" is currently ${eq.status}`));
      }
    }

    report.scheduledDate = scheduledDate;
    report.scheduledTime = scheduledTime || '';
    report.scheduledRoom = scheduledRoom || '';
    report.assignedStaff = assignedStaff || null;
    report.equipment = equipment || null;
    report.room = scheduledRoom || '';
    report.status = 'Scheduled';

    await report.save();
    await recordAudit(req, 'CREATE_SCHEDULE', report._id, { scheduledDate, scheduledTime, scheduledRoom });

    try {
      await Notification.create({
        recipient: report.patient,
        title: 'Imaging Study Scheduled',
        message: `Your ${report.examinationName} has been scheduled for ${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime || 'TBD'}.`,
        type: 'radiology',
        relatedId: report._id,
      });
    } catch (notifErr) {
      logger.warn('Failed to create schedule notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Study scheduled successfully', data: report });
  } catch (err) {
    next(err);
  }
};

exports.updateSchedule = async (req, res, next) => {
  try {
    const { scheduledDate, scheduledTime, scheduledRoom, assignedStaff, equipment, cancel } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Imaging request not found'));

    if (cancel) {
      if (!isValidTransition(report.status, 'Cancelled')) {
        return next(new ApiError(400, `Cannot cancel a request with status "${report.status}"`));
      }
      report.status = 'Cancelled';
      await report.save();
      await recordAudit(req, 'CANCEL_SCHEDULE', report._id, { reason: req.body.reason });
      return res.status(200).json({ success: true, message: 'Schedule cancelled', data: report });
    }

    // Check conflicts for reschedule
    if (scheduledDate && scheduledTime && scheduledRoom) {
      const d = new Date(scheduledDate);
      d.setHours(0, 0, 0, 0);
      const conflict = await RadiologyReport.findOne({
        _id: { $ne: report._id },
        scheduledDate: { $gte: d, $lt: new Date(d.getTime() + 86400000) },
        scheduledTime,
        scheduledRoom,
        status: { $nin: ['Cancelled', 'Rejected'] },
      });
      if (conflict) {
        return next(new ApiError(409, `Room ${scheduledRoom} is already booked at ${scheduledTime} on this date`));
      }
    }

    if (scheduledDate) report.scheduledDate = scheduledDate;
    if (scheduledTime) report.scheduledTime = scheduledTime;
    if (scheduledRoom) {
      report.scheduledRoom = scheduledRoom;
      report.room = scheduledRoom;
    }
    if (assignedStaff) report.assignedStaff = assignedStaff;
    if (equipment) report.equipment = equipment;

    await report.save();
    await recordAudit(req, 'RESCHEDULE', report._id, { scheduledDate, scheduledTime, scheduledRoom });

    res.status(200).json({ success: true, message: 'Schedule updated successfully', data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 4. Patient Preparation
// ─────────────────────────────────────────────────────────────────
exports.getPreparations = async (req, res, next) => {
  try {
    const preparations = await RadiologyReport.find({
      status: { $in: ['Scheduled', 'Patient Ready'] },
    })
      .populate('patient', 'firstName lastName patientId gender dateOfBirth')
      .populate('doctor', 'firstName lastName')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: preparations });
  } catch (err) {
    next(err);
  }
};

exports.updatePreparation = async (req, res, next) => {
  try {
    const { preparationStatus, preparationNotes, consentObtained, patientVerified } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Imaging request not found'));

    if (preparationStatus !== undefined) report.preparationStatus = preparationStatus;
    if (preparationNotes !== undefined) report.preparationNotes = preparationNotes;
    if (consentObtained !== undefined) report.consentObtained = consentObtained;
    if (patientVerified !== undefined) report.patientVerified = patientVerified;

    // If preparation is 'Ready', transition status to 'Patient Ready'
    if (preparationStatus === 'Ready' && isValidTransition(report.status, 'Patient Ready')) {
      report.status = 'Patient Ready';
    }

    await report.save();
    await recordAudit(req, 'UPDATE_PREPARATION', report._id, { preparationStatus, consentObtained, patientVerified });

    res.status(200).json({ success: true, message: 'Preparation updated', data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 5. Imaging Queue
// ─────────────────────────────────────────────────────────────────
exports.getQueue = async (req, res, next) => {
  try {
    const queue = await RadiologyReport.find({
      status: { $in: ['Patient Ready', 'In Queue', 'In Progress'] },
    })
      .populate('patient', 'firstName lastName patientId')
      .populate('assignedStaff', 'firstName lastName')
      .sort({ priority: -1, queueEnteredAt: 1 })
      .lean();

    // Add waiting time calculation
    const now = new Date();
    const enriched = queue.map((item, idx) => ({
      ...item,
      queuePosition: idx + 1,
      waitingMinutes: item.queueEnteredAt ? Math.floor((now - new Date(item.queueEnteredAt)) / 60000) : 0,
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

exports.updateQueueStatus = async (req, res, next) => {
  try {
    const { action } = req.body; // 'start', 'hold', 'complete'
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Queue item not found'));

    switch (action) {
      case 'enter':
        if (!isValidTransition(report.status, 'In Queue')) {
          return next(new ApiError(400, `Cannot enter queue from status "${report.status}"`));
        }
        report.status = 'In Queue';
        report.queueEnteredAt = new Date();
        break;
      case 'start':
        if (!isValidTransition(report.status, 'In Progress')) {
          return next(new ApiError(400, `Cannot start from status "${report.status}"`));
        }
        report.status = 'In Progress';
        report.queueStartedAt = new Date();
        report.studyStartedAt = new Date();
        report.performedBy = req.user._id;
        break;
      case 'hold':
        // Hold puts back to In Queue
        if (report.status !== 'In Progress') {
          return next(new ApiError(400, 'Can only hold a study that is In Progress'));
        }
        report.status = 'In Queue';
        break;
      case 'complete':
        if (report.status !== 'In Progress') {
          return next(new ApiError(400, 'Can only complete a study that is In Progress'));
        }
        report.status = 'Completed';
        report.queueCompletedAt = new Date();
        report.studyCompletedAt = new Date();
        break;
      default:
        return next(new ApiError(400, 'Invalid queue action. Use: enter, start, hold, complete'));
    }

    await report.save();
    await recordAudit(req, `QUEUE_${action.toUpperCase()}`, report._id, { action });

    res.status(200).json({ success: true, message: `Queue action "${action}" completed`, data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 6. Study Processing
// ─────────────────────────────────────────────────────────────────
exports.getStudies = async (req, res, next) => {
  try {
    const { status, modality } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['In Queue', 'In Progress', 'Completed'] };
    }
    if (modality) filter.modality = modality;

    const studies = await RadiologyReport.find(filter)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .populate('assignedStaff', 'firstName lastName')
      .populate('performedBy', 'firstName lastName')
      .populate('equipment', 'name modality room')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: studies });
  } catch (err) {
    next(err);
  }
};

exports.startStudy = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Study not found'));

    if (!isValidTransition(report.status, 'In Progress')) {
      return next(new ApiError(400, `Cannot start study from status "${report.status}"`));
    }

    report.status = 'In Progress';
    report.studyStartedAt = new Date();
    report.performedBy = req.user._id;
    if (notes) report.studyNotes = notes;

    await report.save();
    await recordAudit(req, 'START_STUDY', report._id, {});

    res.status(200).json({ success: true, message: 'Study started', data: report });
  } catch (err) {
    next(err);
  }
};

exports.completeStudy = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Study not found'));

    if (report.status !== 'In Progress') {
      return next(new ApiError(400, 'Study must be In Progress before it can be completed'));
    }

    report.status = 'Completed';
    report.studyCompletedAt = new Date();
    report.queueCompletedAt = new Date();
    if (notes) report.studyNotes = (report.studyNotes ? report.studyNotes + '\n' : '') + notes;

    await report.save();
    await recordAudit(req, 'COMPLETE_STUDY', report._id, {});

    // Notify that study is ready for report
    try {
      await Notification.create({
        recipient: report.assignedStaff || req.user._id,
        title: 'Study Completed – Report Needed',
        message: `Study ${report.requestId} (${report.examinationName}) is complete and awaiting report entry.`,
        type: 'radiology',
        relatedId: report._id,
      });
    } catch (notifErr) {
      logger.warn('Failed to create study-complete notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Study completed', data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 7. Report Entry
// ─────────────────────────────────────────────────────────────────
exports.getReportsPending = async (req, res, next) => {
  try {
    const reports = await RadiologyReport.find({
      status: { $in: ['Completed', 'Report Draft'] },
    })
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .populate('performedBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

exports.submitReportEntry = async (req, res, next) => {
  try {
    const { findings, impression, reportDraft, comments, isDraft } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Report not found'));

    if (!['Completed', 'Report Draft'].includes(report.status)) {
      return next(new ApiError(400, `Cannot enter report for study with status "${report.status}"`));
    }

    // Validate required fields for submission (not draft)
    if (!isDraft) {
      if (!findings || !findings.trim()) {
        return next(new ApiError(400, 'Findings are required for report submission'));
      }
      if (!impression || !impression.trim()) {
        return next(new ApiError(400, 'Impression is required for report submission'));
      }
    }

    report.findings = findings || report.findings;
    report.impression = impression || report.impression;
    report.reportDraft = reportDraft || comments || '';
    report.reportSubmittedBy = req.user._id;

    if (isDraft) {
      report.status = 'Report Draft';
    } else {
      report.status = 'Report Pending Verification';
      report.reportSubmittedAt = new Date();
    }

    await report.save();
    await recordAudit(req, isDraft ? 'SAVE_REPORT_DRAFT' : 'SUBMIT_REPORT', report._id, { isDraft });

    // Notify for report submission
    if (!isDraft) {
      try {
        await Notification.create({
          recipient: report.assignedStaff || req.user._id,
          title: 'Report Pending Verification',
          message: `Report for ${report.requestId} (${report.examinationName}) has been submitted and requires verification.`,
          type: 'radiology',
          relatedId: report._id,
        });
      } catch (notifErr) {
        logger.warn('Failed to create report-submitted notification:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: isDraft ? 'Draft saved' : 'Report submitted for verification',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 8. Report Verification
// ─────────────────────────────────────────────────────────────────
exports.getVerificationQueue = async (req, res, next) => {
  try {
    const reports = await RadiologyReport.find({ status: 'Report Pending Verification' })
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .populate('reportSubmittedBy', 'firstName lastName')
      .sort({ reportSubmittedAt: 1 })
      .lean();

    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

exports.verifyReport = async (req, res, next) => {
  try {
    const { verificationNotes } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Report not found'));

    if (report.status !== 'Report Pending Verification') {
      return next(new ApiError(400, 'Report must be pending verification'));
    }

    report.status = 'Verified';
    report.verifiedAt = new Date();
    report.verifiedBy = req.user._id;
    report.verificationNotes = verificationNotes || '';

    await report.save();
    await recordAudit(req, 'VERIFY_REPORT', report._id, { verifiedBy: req.user.email });

    // Notify referring doctor
    try {
      await Notification.create({
        recipient: report.doctor,
        title: 'Radiology Report Verified',
        message: `Report for ${report.examinationName} (${report.requestId}) has been verified and is now available.`,
        type: 'radiology',
        relatedId: report._id,
      });
    } catch (notifErr) {
      logger.warn('Failed to create verify-report notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Report verified successfully', data: report });
  } catch (err) {
    next(err);
  }
};

exports.returnReport = async (req, res, next) => {
  try {
    const { returnReason } = req.body;

    if (!returnReason || !returnReason.trim()) {
      return next(new ApiError(400, 'Return reason is required'));
    }

    const report = await RadiologyReport.findById(req.params.id);
    if (!report) return next(new ApiError(404, 'Report not found'));

    if (report.status !== 'Report Pending Verification') {
      return next(new ApiError(400, 'Report must be pending verification to return'));
    }

    report.status = 'Report Draft';
    report.returnedAt = new Date();
    report.returnedBy = req.user._id;
    report.returnReason = returnReason;

    await report.save();
    await recordAudit(req, 'RETURN_REPORT', report._id, { returnReason });

    // Notify report author
    try {
      if (report.reportSubmittedBy) {
        await Notification.create({
          recipient: report.reportSubmittedBy,
          title: 'Report Returned for Correction',
          message: `Report for ${report.requestId} has been returned: ${returnReason}`,
          type: 'radiology',
          relatedId: report._id,
        });
      }
    } catch (notifErr) {
      logger.warn('Failed to create return-report notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Report returned for correction', data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 9. Critical / Abnormal Findings
// ─────────────────────────────────────────────────────────────────
exports.getCriticalFindings = async (req, res, next) => {
  try {
    const findings = await RadiologyReport.find({ isCritical: true })
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .populate('criticalAcknowledgedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: findings });
  } catch (err) {
    next(err);
  }
};

exports.acknowledgeCritical = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await RadiologyReport.findById(req.params.id);

    if (!report) return next(new ApiError(404, 'Finding not found'));
    if (!report.isCritical) return next(new ApiError(400, 'This is not a critical finding'));

    report.criticalAcknowledged = true;
    report.criticalAcknowledgedAt = new Date();
    report.criticalAcknowledgedBy = req.user._id;
    if (notes) report.criticalNotes = notes;

    await report.save();
    await recordAudit(req, 'ACKNOWLEDGE_CRITICAL', report._id, { notes });

    res.status(200).json({ success: true, message: 'Critical finding acknowledged', data: report });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 10. Imaging Reports Archive
// ─────────────────────────────────────────────────────────────────
exports.getImagingReports = async (req, res, next) => {
  try {
    const {
      search, status, modality, startDate, endDate,
      page = 1, limit = 25, sort = '-updatedAt',
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      // Show only reports that have been submitted or verified
      filter.status = { $in: ['Report Draft', 'Report Pending Verification', 'Verified'] };
    }
    if (modality) filter.modality = modality;
    if (startDate || endDate) {
      filter.updatedAt = {};
      if (startDate) filter.updatedAt.$gte = new Date(startDate);
      if (endDate) filter.updatedAt.$lte = new Date(endDate);
    }
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { requestId: searchRegex },
        { examinationName: searchRegex },
        { findings: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      RadiologyReport.find(filter)
        .populate('patient', 'firstName lastName patientId')
        .populate('doctor', 'firstName lastName')
        .populate('reportSubmittedBy', 'firstName lastName')
        .populate('verifiedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RadiologyReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 11. Patients
// ─────────────────────────────────────────────────────────────────
exports.getPatients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 25 } = req.query;

    // Find patients who have radiology records
    const patientIds = await RadiologyReport.distinct('patient');

    const filter = {
      _id: { $in: patientIds },
    };

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { patientId: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [patients, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName patientId email phone gender dateOfBirth bloodGroup')
        .sort({ firstName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    // Get study counts per patient
    const enriched = await Promise.all(
      patients.map(async (p) => {
        const studyCount = await RadiologyReport.countDocuments({ patient: p._id });
        return { ...p, studyCount };
      })
    );

    res.status(200).json({
      success: true,
      data: enriched,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getPatientImagingHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;

    const patient = await User.findById(patientId)
      .select('firstName lastName patientId email phone gender dateOfBirth bloodGroup')
      .lean();

    if (!patient) return next(new ApiError(404, 'Patient not found'));

    const reports = await RadiologyReport.find({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: { patient, reports } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 12. Equipment
// ─────────────────────────────────────────────────────────────────
exports.getEquipment = async (req, res, next) => {
  try {
    const { modality, status } = req.query;
    const filter = {};
    if (modality) filter.modality = modality;
    if (status) filter.status = status;

    const equipment = await RadiologyEquipment.find(filter)
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: equipment });
  } catch (err) {
    next(err);
  }
};

exports.updateEquipment = async (req, res, next) => {
  try {
    const { status, notes, lastMaintenanceDate, nextMaintenanceDate } = req.body;
    const equipment = await RadiologyEquipment.findById(req.params.id);

    if (!equipment) return next(new ApiError(404, 'Equipment not found'));

    const prevStatus = equipment.status;
    if (status) equipment.status = status;
    if (notes !== undefined) equipment.notes = notes;
    if (lastMaintenanceDate) equipment.lastMaintenanceDate = lastMaintenanceDate;
    if (nextMaintenanceDate) equipment.nextMaintenanceDate = nextMaintenanceDate;

    await equipment.save();
    await recordAudit(req, 'UPDATE_EQUIPMENT', equipment._id, { from: prevStatus, to: status });

    res.status(200).json({ success: true, message: 'Equipment updated', data: equipment });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 13. Notifications
// ─────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      data: notifications,
      meta: { unreadCount },
    });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return next(new ApiError(404, 'Notification not found'));

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// 14. Profile & Security
// ─────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, department, specialization } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return next(new ApiError(404, 'User not found'));

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (specialization) user.specialization = specialization;

    await user.save();
    await recordAudit(req, 'UPDATE_PROFILE', user._id, { fields: Object.keys(req.body) });

    const updatedUser = await User.findById(req.user._id).populate('role').lean();

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ApiError(400, 'Current password and new password are required'));
    }

    if (newPassword.length < 8) {
      return next(new ApiError(400, 'New password must be at least 8 characters'));
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new ApiError(404, 'User not found'));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new ApiError(401, 'Current password is incorrect'));
    }

    user.password = newPassword;
    await user.save();
    await recordAudit(req, 'CHANGE_PASSWORD', user._id, {});

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
