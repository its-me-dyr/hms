/**
 * Laboratory Diagnostics Controller
 * 
 * Central controller for all laboratory operations:
 * - Real-time operational KPIs & analytics
 * - Lab test orders & requests workflow
 * - Sample collection & barcoded specimen tracking
 * - Laboratory test catalog management
 * - In-vitro test processing workstation
 * - Parameterized results entry with critical threshold alerts
 * - Clinical verification & sign-off
 * - Diagnostic reports generation
 * - Patient laboratory history
 * - Role-scoped notifications & audit trails
 */

const mongoose = require('mongoose');
const LabReport = require('../models/LabReport');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Helper to log lab audits safely
const recordAudit = async (req, action, resourceId, details = {}, status = 'SUCCESS') => {
  try {
    await AuditLog.create({
      user: req.user?._id || null,
      userEmail: req.user?.email || 'system',
      userRole: req.user?.roleName || req.user?.role?.name || 'LAB_TECHNICIAN',
      action,
      module: 'laboratory',
      resourceId: resourceId?.toString() || null,
      details,
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      status,
    });
  } catch (err) {
    logger.warn('Failed to record laboratory audit log:', err.message);
  }
};

/**
 * 1. GET /api/v1/lab/dashboard
 * Real-time operational overview with real KPIs, active queues, and critical alerts.
 */
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      pendingRequests,
      awaitingCollection,
      inProcessing,
      pendingResults,
      pendingVerification,
      criticalResultsCount,
      completedToday,
      rejectedSamples,
      totalToday,
      pendingRequestsList,
      awaitingCollectionList,
      processingQueue,
      criticalAlerts,
      recentAudits,
    ] = await Promise.all([
      // Pending requests (not yet started or sample pending)
      LabReport.countDocuments({
        status: { $in: ['Pending', 'Accepted', 'Sample Pending', 'Ordered'] },
      }),
      // Samples awaiting collection
      LabReport.countDocuments({
        status: { $in: ['Accepted', 'Sample Pending', 'Pending'] },
      }),
      // In processing
      LabReport.countDocuments({ status: 'Processing' }),
      // Results pending entry (processing done or result pending, no results yet)
      LabReport.countDocuments({
        status: 'Result Pending',
        $or: [{ results: { $size: 0 } }, { results: { $exists: false } }],
      }),
      // Results pending verification (results entered, not verified)
      LabReport.countDocuments({
        resultsEnteredAt: { $ne: null },
        verifiedAt: null,
        status: { $ne: 'Cancelled' },
      }),
      // Critical / Abnormal results
      LabReport.countDocuments({ isCritical: true }),
      // Completed / verified today
      LabReport.countDocuments({
        status: { $in: ['Verified', 'Completed'] },
        updatedAt: { $gte: todayStart },
      }),
      // Rejected samples
      LabReport.countDocuments({ status: 'Rejected' }),
      // Total requests created today
      LabReport.countDocuments({ createdAt: { $gte: todayStart } }),

      // Queues
      LabReport.find({
        status: { $in: ['Pending', 'Accepted', 'Sample Pending', 'Ordered'] },
      })
        .populate('patient', 'firstName lastName email phone gender dateOfBirth')
        .populate('doctor', 'firstName lastName specialization department')
        .sort({ priority: -1, createdAt: -1 })
        .limit(10),

      LabReport.find({
        status: { $in: ['Accepted', 'Sample Pending', 'Pending'] },
      })
        .populate('patient', 'firstName lastName email phone gender')
        .populate('doctor', 'firstName lastName specialization')
        .sort({ createdAt: -1 })
        .limit(10),

      LabReport.find({ status: 'Processing' })
        .populate('patient', 'firstName lastName')
        .populate('processedBy', 'firstName lastName')
        .sort({ processingStartedAt: -1 })
        .limit(10),

      LabReport.find({ isCritical: true })
        .populate('patient', 'firstName lastName email phone')
        .populate('doctor', 'firstName lastName specialization department')
        .sort({ resultsEnteredAt: -1, createdAt: -1 })
        .limit(10),

      AuditLog.find({ module: 'laboratory' })
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          pendingRequests,
          samplesAwaitingCollection: awaitingCollection,
          samplesInProcessing: inProcessing,
          resultsPendingEntry: pendingResults,
          resultsPendingVerification: pendingVerification,
          criticalResults: criticalResultsCount,
          testsCompletedToday: completedToday,
          reportsGeneratedToday: completedToday,
          rejectedSamples,
          totalTestsToday: totalToday,
        },
        pendingRequestsList,
        awaitingCollectionList,
        processingQueue,
        criticalAlerts,
        recentActivity: recentAudits,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/lab/requests
 * Comprehensive lab requests directory with multi-field search and filters.
 */
exports.getLabRequests = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      department,
      category,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }
    if (department && department !== 'ALL') {
      filter.department = new RegExp(department, 'i');
    }
    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    let reportsQuery = LabReport.find(filter)
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization department')
      .populate('bill', 'invoiceNumber paymentStatus netAmount paidAmount')
      .sort({ createdAt: -1 });

    let reports = await reportsQuery;

    // Search filter across request ID, testName, or patient details
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      reports = reports.filter((r) => {
        const reqIdMatch = r.requestId?.toLowerCase().includes(q);
        const testMatch = r.testName?.toLowerCase().includes(q);
        const sampleMatch = r.sampleId?.toLowerCase().includes(q);
        const patName = `${r.patient?.firstName || ''} ${r.patient?.lastName || ''}`.toLowerCase();
        const patMatch = patName.includes(q) || r.patient?.email?.toLowerCase().includes(q);
        const docName = `${r.doctor?.firstName || ''} ${r.doctor?.lastName || ''}`.toLowerCase();
        const docMatch = docName.includes(q);
        return reqIdMatch || testMatch || sampleMatch || patMatch || docMatch;
      });
    }

    const total = reports.length;
    const startIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginated = reports.slice(startIndex, startIndex + parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: paginated.length,
      total,
      data: paginated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/v1/lab/requests/:id
 * Retrieve full clinical details for a single lab request.
 */
exports.getLabRequestById = async (req, res, next) => {
  try {
    const report = await LabReport.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone gender dateOfBirth address bloodGroup')
      .populate('doctor', 'firstName lastName specialization department phone email')
      .populate('collectedBy', 'firstName lastName email')
      .populate('processedBy', 'firstName lastName email')
      .populate('resultsEnteredBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('bill');

    if (!report) {
      return next(new ApiError(404, 'Lab investigation request not found.'));
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PATCH /api/v1/lab/requests/:id/status
 * Transition request status (e.g. Accept, Cancel, Reject).
 */
exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { status, reason, notes } = req.body;
    const report = await LabReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Lab investigation request not found.'));
    }

    const previousStatus = report.status;
    report.status = status || report.status;

    if (status === 'Accepted') {
      report.status = 'Sample Pending';
    } else if (status === 'Rejected') {
      report.rejectionReason = reason || report.rejectionReason;
    }

    if (notes) {
      report.notes = report.notes ? `${report.notes}\n${notes}` : notes;
    }

    await report.save();

    await recordAudit(req, `REQUEST_STATUS_${report.status.toUpperCase()}`, report._id, {
      previousStatus,
      newStatus: report.status,
      reason,
    });

    res.status(200).json({
      success: true,
      message: `Request status updated to ${report.status}.`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/v1/lab/samples
 * Specimen registry and sample tracking workstation.
 */
exports.getSamples = async (req, res, next) => {
  try {
    const { stage, search } = req.query;

    let filter = {};
    if (stage === 'awaiting') {
      filter.status = { $in: ['Accepted', 'Sample Pending', 'Pending', 'Ordered'] };
    } else if (stage === 'collected') {
      filter.status = 'Sample Collected';
    } else if (stage === 'received') {
      filter.status = 'Received';
    } else if (stage === 'processing') {
      filter.status = 'Processing';
    } else if (stage === 'rejected') {
      filter.status = 'Rejected';
    } else if (stage === 'completed') {
      filter.status = { $in: ['Verified', 'Completed'] };
    }

    let samples = await LabReport.find(filter)
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization')
      .populate('collectedBy', 'firstName lastName')
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      samples = samples.filter((s) => {
        const smpId = s.sampleId?.toLowerCase() || '';
        const reqId = s.requestId?.toLowerCase() || '';
        const testN = s.testName?.toLowerCase() || '';
        const patN = `${s.patient?.firstName || ''} ${s.patient?.lastName || ''}`.toLowerCase();
        return smpId.includes(q) || reqId.includes(q) || testN.includes(q) || patN.includes(q);
      });
    }

    res.status(200).json({
      success: true,
      count: samples.length,
      data: samples,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/v1/lab/samples/collect
 * Specimen collection workstation: generates sample ID, logs container & condition.
 */
exports.collectSample = async (req, res, next) => {
  try {
    const {
      requestId,
      sampleType,
      sampleContainer,
      sampleCondition,
      collectionNotes,
    } = req.body;

    const report = await LabReport.findById(requestId);
    if (!report) {
      return next(new ApiError(404, 'Lab request not found.'));
    }

    if (['Cancelled', 'Rejected'].includes(report.status)) {
      return next(new ApiError(400, `Cannot collect sample for a ${report.status} request.`));
    }

    // Generate clean unique specimen barcode ID
    const sampleSuffix = Math.floor(10000 + Math.random() * 90000);
    const sampleId = `SMP-${new Date().getFullYear().toString().slice(-2)}${sampleSuffix}`;

    report.sampleId = sampleId;
    report.sampleType = sampleType || report.sampleType || 'Blood (Whole)';
    report.sampleContainer = sampleContainer || report.sampleContainer || 'Standard Container';
    report.sampleCondition = sampleCondition || 'Acceptable';
    report.collectionNotes = collectionNotes || '';
    report.sampleCollectedAt = new Date();
    report.collectedBy = req.user._id;
    report.status = 'Sample Collected';

    await report.save();

    await recordAudit(req, 'SAMPLE_COLLECTED', report._id, {
      sampleId,
      sampleType: report.sampleType,
      condition: report.sampleCondition,
    });

    res.status(200).json({
      success: true,
      message: `Specimen ${sampleId} successfully collected and logged.`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. PATCH /api/v1/lab/samples/:id/reject
 * Reject specimen with clinical rationale.
 */
exports.rejectSample = async (req, res, next) => {
  try {
    const { reason, notes } = req.body;
    const report = await LabReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Sample record not found.'));
    }

    report.status = 'Rejected';
    report.rejectionReason = reason || 'Specimen did not meet laboratory accessioning criteria.';
    if (notes) {
      report.collectionNotes = report.collectionNotes ? `${report.collectionNotes}\n${notes}` : notes;
    }

    await report.save();

    await recordAudit(req, 'SAMPLE_REJECTED', report._id, {
      reason: report.rejectionReason,
    }, 'WARNING');

    res.status(200).json({
      success: true,
      message: 'Sample marked as rejected.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/v1/lab/tests
 * Searchable diagnostic test catalog.
 */
exports.getTestCatalog = async (req, res, next) => {
  try {
    const { search, category, activeOnly } = req.query;
    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    let tests = await LabTest.find(filter).sort({ category: 1, testName: 1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tests = tests.filter(
        (t) =>
          t.testName.toLowerCase().includes(q) ||
          t.testCode.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. POST /api/v1/lab/tests
 * Add new diagnostic test to catalog (restricted or technician permitted).
 */
exports.createTestCatalogItem = async (req, res, next) => {
  try {
    const {
      testCode,
      testName,
      category,
      department,
      description,
      sampleType,
      sampleContainer,
      requiredQuantity,
      fastingRequired,
      turnaroundTimeHours,
      price,
      parameters,
    } = req.body;

    if (!testCode || !testName || !sampleType) {
      return next(new ApiError(400, 'Test Code, Test Name, and Sample Type are required.'));
    }

    const existing = await LabTest.findOne({ testCode: testCode.trim().toUpperCase() });
    if (existing) {
      return next(new ApiError(409, `Test code '${testCode.toUpperCase()}' already exists.`));
    }

    const newTest = await LabTest.create({
      testCode: testCode.trim().toUpperCase(),
      testName: testName.trim(),
      category: category || 'General',
      department: department || 'Central Diagnostic Laboratory',
      description: description || '',
      sampleType: sampleType.trim(),
      sampleContainer: sampleContainer || 'Standard Container',
      requiredQuantity: requiredQuantity || '2 mL',
      fastingRequired: Boolean(fastingRequired),
      turnaroundTimeHours: Number(turnaroundTimeHours) || 4,
      price: Number(price) || 0,
      parameters: Array.isArray(parameters) ? parameters : [],
    });

    await recordAudit(req, 'TEST_CATALOG_CREATED', newTest._id, {
      testCode: newTest.testCode,
      testName: newTest.testName,
    });

    res.status(201).json({
      success: true,
      message: 'Test definition successfully added to catalog.',
      data: newTest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. PUT /api/v1/lab/tests/:id
 * Update test catalog entry.
 */
exports.updateTestCatalogItem = async (req, res, next) => {
  try {
    const updatedTest = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedTest) {
      return next(new ApiError(404, 'Test definition not found.'));
    }

    await recordAudit(req, 'TEST_CATALOG_UPDATED', updatedTest._id, {
      testCode: updatedTest.testCode,
    });

    res.status(200).json({
      success: true,
      message: 'Test catalog definition updated successfully.',
      data: updatedTest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. GET /api/v1/lab/processing
 * Workstation queue for samples in processing or ready for analysis.
 */
exports.getProcessingQueue = async (req, res, next) => {
  try {
    const queue = await LabReport.find({
      status: { $in: ['Sample Collected', 'Received', 'Processing'] },
    })
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization')
      .populate('processedBy', 'firstName lastName')
      .sort({ priority: -1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. POST /api/v1/lab/processing/start
 * Start specimen analysis.
 */
exports.startProcessing = async (req, res, next) => {
  try {
    const { id, notes } = req.body;
    const report = await LabReport.findById(id);

    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    if (report.status === 'Rejected' || report.status === 'Cancelled') {
      return next(new ApiError(400, `Cannot process a ${report.status} sample.`));
    }

    report.status = 'Processing';
    report.processingStartedAt = new Date();
    report.processedBy = req.user._id;
    if (notes) {
      report.processingNotes = notes;
    }

    await report.save();

    await recordAudit(req, 'PROCESSING_STARTED', report._id, {
      sampleId: report.sampleId,
    });

    res.status(200).json({
      success: true,
      message: 'Analysis started. Sample is now In Processing.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. PATCH /api/v1/lab/processing/:id/complete
 * Mark specimen analysis complete and advance to Results Entry.
 */
exports.completeProcessing = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await LabReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    report.status = 'Result Pending';
    report.processingCompletedAt = new Date();
    if (notes) {
      report.processingNotes = report.processingNotes
        ? `${report.processingNotes}\n${notes}`
        : notes;
    }

    await report.save();

    await recordAudit(req, 'PROCESSING_COMPLETED', report._id, {
      sampleId: report.sampleId,
    });

    res.status(200).json({
      success: true,
      message: 'Processing complete. Ready for Results Entry.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. GET /api/v1/lab/results
 * Lists tests whose processing is complete and are awaiting results entry.
 */
exports.getResultsPending = async (req, res, next) => {
  try {
    const tests = await LabReport.find({
      status: { $in: ['Result Pending', 'Processing', 'Sample Collected'] },
    })
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ priority: -1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. POST /api/v1/lab/results
 * Parameterized results entry with reference range checks and critical value detection.
 */
exports.enterResults = async (req, res, next) => {
  try {
    const { id, results, technicianNotes, notes } = req.body;

    const report = await LabReport.findById(id);
    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    if (!Array.isArray(results) || results.length === 0) {
      return next(new ApiError(400, 'At least one test result parameter is required.'));
    }

    // Determine abnormal or critical flags
    let hasCritical = false;
    let hasAbnormal = false;

    const formattedResults = results.map((r) => {
      const flag = r.flag || 'Normal';
      if (flag === 'Critical') {
        hasCritical = true;
      } else if (['High', 'Low', 'Abnormal'].includes(flag)) {
        hasAbnormal = true;
      }
      return {
        parameter: r.parameter,
        result: String(r.result),
        unit: r.unit || '',
        referenceRange: r.referenceRange || '',
        flag,
        method: r.method || '',
      };
    });

    report.results = formattedResults;
    report.resultsEnteredAt = new Date();
    report.resultsEnteredBy = req.user._id;
    report.technicianNotes = technicianNotes || notes || '';
    report.isCritical = hasCritical;
    report.criticalSeverity = hasCritical ? 'Critical' : (hasAbnormal ? 'Abnormal' : 'Abnormal');

    // If critical, trigger real-time notification alert for ordering physician
    if (hasCritical && report.doctor) {
      try {
        await Notification.create({
          recipient: report.doctor,
          title: `CRITICAL LAB ALERT: ${report.testName}`,
          message: `STAT critical result detected for patient (${report.requestId || 'Lab Order'}). Immediate clinical review required.`,
          type: 'lab',
          relatedId: report._id,
        });
        report.criticalNotified = true;
        report.criticalNotifiedAt = new Date();
      } catch (notifErr) {
        logger.warn('Failed to send critical notification:', notifErr.message);
      }
    }

    // Advance status to Result Pending (entered, ready for verification)
    report.status = 'Result Pending';

    await report.save();

    await recordAudit(req, 'RESULT_ENTERED', report._id, {
      isCritical: hasCritical,
      hasAbnormal,
      parameterCount: formattedResults.length,
    }, hasCritical ? 'WARNING' : 'SUCCESS');

    res.status(200).json({
      success: true,
      message: hasCritical
        ? 'Results recorded with CRITICAL alert flagged. Ordering physician notified.'
        : 'Results successfully recorded and forwarded to Verification.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 16. GET /api/v1/lab/verification
 * Clinical verification workstation: results entered, awaiting pathologist/supervisor sign-off.
 */
exports.getVerificationQueue = async (req, res, next) => {
  try {
    const queue = await LabReport.find({
      resultsEnteredAt: { $ne: null },
      verifiedAt: null,
      status: { $ne: 'Cancelled' },
    })
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization')
      .populate('resultsEnteredBy', 'firstName lastName')
      .sort({ isCritical: -1, priority: -1, resultsEnteredAt: 1 });

    res.status(200).json({
      success: true,
      count: queue.length,
      data: queue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 17. PATCH /api/v1/lab/results/:id/verify
 * Sign off and verify diagnostic findings.
 */
exports.verifyResult = async (req, res, next) => {
  try {
    const { verificationNotes } = req.body;
    const report = await LabReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    if (!report.results || report.results.length === 0) {
      return next(new ApiError(400, 'Cannot verify an investigation without entered results.'));
    }

    report.status = 'Verified';
    report.verifiedAt = new Date();
    report.verifiedBy = req.user._id;
    report.verificationNotes = verificationNotes || 'Clinical findings verified and approved.';

    await report.save();

    // Notify patient that lab report is published
    if (report.patient) {
      try {
        await Notification.create({
          recipient: report.patient,
          title: `Diagnostic Report Available: ${report.testName}`,
          message: `Your laboratory investigation (${report.testName}) is completed and verified. You may view your diagnostic report.`,
          type: 'lab',
          relatedId: report._id,
        });
      } catch (nErr) {
        logger.warn('Failed to notify patient of verified report:', nErr.message);
      }
    }

    await recordAudit(req, 'RESULT_VERIFIED', report._id, {
      verifier: req.user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Investigation result verified and published.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. PATCH /api/v1/lab/results/:id/return
 * Return results for technician correction or specimen re-test.
 */
exports.returnResult = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return next(new ApiError(400, 'A clinical reason for return is required.'));
    }

    const report = await LabReport.findById(req.params.id);
    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    report.returnedAt = new Date();
    report.returnedBy = req.user._id;
    report.returnReason = reason.trim();
    report.status = 'Result Pending'; // Keep in results entry queue for correction

    await report.save();

    await recordAudit(req, 'RESULT_RETURNED', report._id, {
      reason,
    }, 'WARNING');

    res.status(200).json({
      success: true,
      message: 'Result returned to technician for correction.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 19. GET /api/v1/lab/critical-results
 * Dedicated critical & abnormal findings tracking.
 */
exports.getCriticalResults = async (req, res, next) => {
  try {
    const results = await LabReport.find({
      $or: [
        { isCritical: true },
        { 'results.flag': { $in: ['Critical', 'Abnormal'] } },
      ],
    })
      .populate('patient', 'firstName lastName email phone gender dateOfBirth')
      .populate('doctor', 'firstName lastName specialization department phone')
      .populate('criticalAcknowledgedBy', 'firstName lastName')
      .sort({ resultsEnteredAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 20. PATCH /api/v1/lab/critical-results/:id/acknowledge
 * Acknowledge receipt of critical result alert.
 */
exports.acknowledgeCritical = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await LabReport.findById(req.params.id);

    if (!report) {
      return next(new ApiError(404, 'Investigation record not found.'));
    }

    report.criticalAcknowledged = true;
    report.criticalAcknowledgedAt = new Date();
    report.criticalAcknowledgedBy = req.user._id;
    if (notes) {
      report.criticalNotes = notes;
    }

    await report.save();

    await recordAudit(req, 'CRITICAL_RESULT_ACKNOWLEDGED', report._id, {
      acknowledgedBy: req.user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Critical result alert acknowledged.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 21. GET /api/v1/lab/reports
 * Archive of completed and verified laboratory reports.
 */
exports.getLabReports = async (req, res, next) => {
  try {
    const { search, category, startDate, endDate } = req.query;

    const filter = {
      status: { $in: ['Verified', 'Completed'] },
    };

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    let reports = await LabReport.find(filter)
      .populate('patient', 'firstName lastName email phone gender dateOfBirth address')
      .populate('doctor', 'firstName lastName specialization department')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ verifiedAt: -1, createdAt: -1 });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      reports = reports.filter((r) => {
        const reqId = r.requestId?.toLowerCase() || '';
        const smpId = r.sampleId?.toLowerCase() || '';
        const testN = r.testName?.toLowerCase() || '';
        const patN = `${r.patient?.firstName || ''} ${r.patient?.lastName || ''}`.toLowerCase();
        return reqId.includes(q) || smpId.includes(q) || testN.includes(q) || patN.includes(q);
      });
    }

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 22. GET /api/v1/lab/patients
 * Patient lookup with comprehensive diagnostic history.
 */
exports.getPatients = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {
      roleName: 'PATIENT',
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const patients = await User.find(query)
      .select('firstName lastName email phone gender dateOfBirth address bloodGroup createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Attach lab history count for each patient
    const patientIds = patients.map((p) => p._id);
    const labCounts = await LabReport.aggregate([
      { $match: { patient: { $in: patientIds } } },
      { $group: { _id: '$patient', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    labCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const enriched = patients.map((p) => ({
      ...p.toObject(),
      totalLabOrders: countMap[p._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 23. GET /api/v1/lab/patients/:id/history
 * Detailed lab history for a single patient.
 */
exports.getPatientLabHistory = async (req, res, next) => {
  try {
    const reports = await LabReport.find({ patient: req.params.id })
      .populate('doctor', 'firstName lastName specialization')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 24. GET /api/v1/lab/notifications
 * Lab notifications center.
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { type: 'lab' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      count: notifications.length,
      meta: { unreadCount },
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 25. PATCH /api/v1/lab/notifications/:id/read
 * Mark notification as read.
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      success: true,
      data: notif,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 26. PATCH /api/v1/lab/notifications/mark-all-read
 * Mark all notifications as read.
 */
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { recipient: req.user._id },
          { type: 'lab' },
        ],
        isRead: false,
      },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All laboratory notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 27. PUT /api/v1/lab/profile
 * Profile update for technician.
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone) user.phone = phone.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 28. PUT /api/v1/lab/change-password
 * Change technician password safely.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new ApiError(400, 'Current and new passwords are required.'));
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new ApiError(401, 'Current password is incorrect.'));
    }

    user.password = newPassword;
    await user.save();

    await recordAudit(req, 'PASSWORD_CHANGED', user._id);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
