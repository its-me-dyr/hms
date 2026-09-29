/**
 * Patient Controller
 * 
 * Handles all patient portal operations: dashboard summary, profile updates,
 * appointment scheduling & cancellation, medical records, prescriptions,
 * laboratory reports, radiology studies, invoices & payment, and notifications.
 * 
 * Strictly isolates data to the authenticated user (req.user._id).
 */

const User = require('../models/User');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const LabReport = require('../models/LabReport');
const RadiologyReport = require('../models/RadiologyReport');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');

/**
 * 1. GET /api/v1/patient/dashboard-summary
 * Aggregated metrics for the patient portal dashboard overview
 */
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const patientId = req.user._id;

    // Upcoming appointment (starting from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingAppointment = await Appointment.findOne({
      patient: patientId,
      status: { $in: ['Pending', 'Confirmed'] },
      appointmentDate: { $gte: today },
    })
      .populate('doctor', 'firstName lastName specialization department qualification profileImage')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    // Active prescriptions
    const activePrescriptions = await Prescription.find({
      patient: patientId,
      status: 'Active',
    })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ prescriptionDate: -1 })
      .limit(3);

    const activePrescriptionsCount = await Prescription.countDocuments({
      patient: patientId,
      status: 'Active',
    });

    // Recent lab report
    const recentLabReport = await LabReport.findOne({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .sort({ testDate: -1 });

    const pendingLabCount = await LabReport.countDocuments({
      patient: patientId,
      status: { $in: ['Ordered', 'Sample Collected', 'Processing'] },
    });

    // Recent radiology report
    const recentRadiologyReport = await RadiologyReport.findOne({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .sort({ examinationDate: -1 });

    // Outstanding bills & balance
    const unpaidBills = await Bill.find({
      patient: patientId,
      paymentStatus: { $in: ['Pending', 'Partially Paid'] },
    });

    let pendingBalance = 0;
    unpaidBills.forEach((b) => {
      pendingBalance += Math.max(0, b.netAmount - (b.paidAmount || 0));
    });

    // Unread notifications
    const unreadNotificationsCount = await Notification.countDocuments({
      recipient: patientId,
      isRead: false,
    });

    const recentNotifications = await Notification.find({ recipient: patientId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent bill (latest bill record)
    const recentBill = await Bill.findOne({ patient: patientId })
      .sort({ createdAt: -1 });

    // Build real activity timeline from patient's actual records
    const recentAppointments = await Appointment.find({ patient: patientId })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .limit(3);

    const recentRecords = await MedicalRecord.find({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .sort({ consultationDate: -1 })
      .limit(3);

    const activityList = [];

    recentAppointments.forEach((apt) => {
      activityList.push({
        id: `apt-${apt._id}`,
        type: 'Appointment',
        title: `Appointment ${apt.status.toLowerCase()}`,
        description: `With Dr. ${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''} (${apt.department})`,
        date: apt.createdAt,
        status: apt.status,
      });
    });

    recentRecords.forEach((rec) => {
      activityList.push({
        id: `rec-${rec._id}`,
        type: 'Medical Record',
        title: 'Consultation recorded',
        description: `Diagnosis: ${rec.diagnosis || 'Clinical evaluation'}`,
        date: rec.consultationDate || rec.createdAt,
        status: 'Completed',
      });
    });

    if (recentLabReport) {
      activityList.push({
        id: `lab-${recentLabReport._id}`,
        type: 'Lab Report',
        title: `${recentLabReport.testName} report available`,
        description: `Investigation status: ${recentLabReport.status}`,
        date: recentLabReport.updatedAt || recentLabReport.createdAt,
        status: recentLabReport.status,
      });
    }

    if (recentRadiologyReport) {
      activityList.push({
        id: `rad-${recentRadiologyReport._id}`,
        type: 'Radiology Report',
        title: `${recentRadiologyReport.examinationName || recentRadiologyReport.modality || 'Radiology Study'} available`,
        description: `Impression: ${recentRadiologyReport.impression ? recentRadiologyReport.impression.substring(0, 60) + '...' : 'Diagnostic imaging completed'}`,
        date: recentRadiologyReport.updatedAt || recentRadiologyReport.createdAt,
        status: recentRadiologyReport.status,
      });
    }

    if (recentBill) {
      activityList.push({
        id: `bill-${recentBill._id}`,
        type: 'Billing',
        title: `Invoice #${recentBill.invoiceNumber}`,
        description: `Net Amount: ₹${recentBill.netAmount} (${recentBill.paymentStatus})`,
        date: recentBill.updatedAt || recentBill.createdAt,
        status: recentBill.paymentStatus,
      });
    }

    activityList.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = activityList.slice(0, 6);

    res.status(200).json({
      success: true,
      data: {
        patient: {
          id: req.user._id,
          fullName: req.user.fullName,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          patientId: req.user.patientId || `HMS-P-${req.user._id.toString().substring(18).toUpperCase()}`,
          bloodGroup: req.user.bloodGroup || 'O+',
        },
        upcomingAppointment,
        activePrescriptions,
        activePrescriptionsCount,
        recentLabReport,
        pendingLabCount,
        recentRadiologyReport,
        pendingBalance,
        unpaidBillsCount: unpaidBills.length,
        recentBill,
        unreadNotificationsCount,
        recentNotifications,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/v1/patient/profile
 * Returns authenticated patient's profile details
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return next(new ApiError(404, 'Patient account not found.'));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/v1/patient/profile
 * Allows patient to update safe editable personal fields
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { phone, address, bloodGroup, emergencyContact, allergies, gender, dateOfBirth } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError(404, 'Patient account not found.'));
    }

    if (phone !== undefined) user.phone = phone.trim();
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (Array.isArray(allergies)) user.allergies = allergies;

    if (address && typeof address === 'object') {
      user.address = {
        street: address.street || user.address?.street || '',
        city: address.city || user.address?.city || '',
        state: address.state || user.address?.state || '',
        postalCode: address.postalCode || user.address?.postalCode || '',
        country: address.country || user.address?.country || '',
      };
    }

    if (emergencyContact && typeof emergencyContact === 'object') {
      user.emergencyContact = {
        name: emergencyContact.name || user.emergencyContact?.name || '',
        relation: emergencyContact.relation || user.emergencyContact?.relation || '',
        phone: emergencyContact.phone || user.emergencyContact?.phone || '',
      };
    }

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
 * 4. GET /api/v1/patient/doctors
 * List of available hospital physicians & specialists for booking
 */
exports.getDoctors = async (req, res, next) => {
  try {
    const { department, search } = req.query;
    const filter = {
      roleName: 'DOCTOR',
      isActive: true,
      status: 'active',
    };

    if (department && department !== 'All') {
      filter.department = new RegExp(`^${department}$`, 'i');
    }

    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') },
        { department: new RegExp(search, 'i') },
      ];
    }

    const doctors = await User.find(filter).select(
      'firstName lastName email phone specialization department qualification consultationFee availableDays availableTimeSlots profileImage'
    );

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/v1/patient/appointments
 * List appointments belonging to authenticated patient
 */
exports.getAppointments = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const { status } = req.query;

    const filter = { patient: patientId };
    if (status && status !== 'All') {
      if (status === 'Upcoming') {
        filter.status = { $in: ['Pending', 'Confirmed'] };
      } else {
        filter.status = status;
      }
    }

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'firstName lastName specialization department qualification consultationFee profileImage email phone')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/v1/patient/appointments
 * Schedule an appointment with double-booking prevention
 */
exports.bookAppointment = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const { doctorId, appointmentDate, appointmentTime, department, reason, notes } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime || !reason) {
      return next(new ApiError(400, 'Doctor, appointment date, appointment time, and reason are required.'));
    }

    // Verify doctor exists
    const doctor = await User.findOne({ _id: doctorId, roleName: 'DOCTOR', isActive: true });
    if (!doctor) {
      return next(new ApiError(404, 'Selected doctor was not found or is currently unavailable.'));
    }

    // Normalize date to UTC midnight for consistent collision checking
    const targetDate = new Date(appointmentDate);
    targetDate.setUTCHours(0, 0, 0, 0);

    // Check if slot is already occupied
    const existingSlot = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: targetDate,
      appointmentTime: appointmentTime.trim(),
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (existingSlot) {
      return next(
        new ApiError(400, 'The selected appointment time slot is no longer available. Please select another slot or date.')
      );
    }

    // Create the appointment
    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      department: department || doctor.department || doctor.specialization || 'General Medicine',
      appointmentDate: targetDate,
      appointmentTime: appointmentTime.trim(),
      reason: reason.trim(),
      notes: notes ? notes.trim() : '',
      consultationFee: doctor.consultationFee || 50,
      status: 'Confirmed',
    });

    await appointment.save();

    // Create confirmation notification
    await Notification.create({
      recipient: patientId,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} on ${targetDate.toLocaleDateString()} at ${appointmentTime.trim()} is confirmed.`,
      type: 'appointment',
      relatedId: appointment._id,
    });

    const populated = await Appointment.findById(appointment._id).populate(
      'doctor',
      'firstName lastName specialization department qualification consultationFee profileImage'
    );

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully!',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(400, 'This slot was just booked by another patient. Please select a different time slot.'));
    }
    next(error);
  }
};

/**
 * 7. GET /api/v1/patient/appointments/:id
 * Retrieve details for a single appointment (strict ownership check)
 */
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
    }).populate('doctor', 'firstName lastName specialization department qualification consultationFee profileImage email phone');

    if (!appointment) {
      return next(new ApiError(404, 'Appointment not found or you do not have permission to access it.'));
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. PUT /api/v1/patient/appointments/:id/cancel
 * Cancel an upcoming appointment
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!appointment) {
      return next(new ApiError(404, 'Appointment not found or you do not have permission to access it.'));
    }

    if (appointment.status === 'Cancelled') {
      return next(new ApiError(400, 'This appointment is already cancelled.'));
    }

    if (appointment.status === 'Completed') {
      return next(new ApiError(400, 'Completed appointments cannot be cancelled.'));
    }

    appointment.status = 'Cancelled';
    appointment.cancellationReason = req.body.cancellationReason || 'Cancelled by patient';
    await appointment.save();

    // Create cancellation notification
    await Notification.create({
      recipient: req.user._id,
      title: 'Appointment Cancelled',
      message: `Your appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime} has been cancelled.`,
      type: 'appointment',
      relatedId: appointment._id,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/v1/patient/medical-records
 * Retrieve medical records & consultations belonging to authenticated patient
 */
exports.getMedicalRecords = async (req, res, next) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization department')
      .populate('appointment')
      .sort({ consultationDate: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. GET /api/v1/patient/medical-records/:id
 * Retrieve a single medical record
 */
exports.getMedicalRecordById = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findOne({
      _id: req.params.id,
      patient: req.user._id,
    })
      .populate('doctor', 'firstName lastName specialization department')
      .populate('appointment');

    if (!record) {
      return next(new ApiError(404, 'Medical record not found or you do not have permission to view it.'));
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. GET /api/v1/patient/prescriptions
 * Retrieve prescriptions belonging to authenticated patient
 */
exports.getPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization department')
      .sort({ prescriptionDate: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. GET /api/v1/patient/prescriptions/:id
 * Retrieve a single prescription
 */
exports.getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      patient: req.user._id,
    }).populate('doctor', 'firstName lastName specialization department');

    if (!prescription) {
      return next(new ApiError(404, 'Prescription not found or you do not have permission to view it.'));
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. GET /api/v1/patient/lab-reports
 * Retrieve diagnostic laboratory test orders & reports
 */
exports.getLabReports = async (req, res, next) => {
  try {
    const labReports = await LabReport.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ testDate: -1 });

    res.status(200).json({
      success: true,
      count: labReports.length,
      data: labReports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. GET /api/v1/patient/lab-reports/:id
 * Retrieve a single lab report
 */
exports.getLabReportById = async (req, res, next) => {
  try {
    const labReport = await LabReport.findOne({
      _id: req.params.id,
      patient: req.user._id,
    }).populate('doctor', 'firstName lastName specialization');

    if (!labReport) {
      return next(new ApiError(404, 'Lab report not found or you do not have permission to view it.'));
    }

    res.status(200).json({
      success: true,
      data: labReport,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. GET /api/v1/patient/radiology-reports
 * Retrieve imaging & radiology reports
 */
exports.getRadiologyReports = async (req, res, next) => {
  try {
    const reports = await RadiologyReport.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ examinationDate: -1 });

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
 * 16. GET /api/v1/patient/radiology-reports/:id
 * Retrieve a single radiology report
 */
exports.getRadiologyReportById = async (req, res, next) => {
  try {
    const report = await RadiologyReport.findOne({
      _id: req.params.id,
      patient: req.user._id,
    }).populate('doctor', 'firstName lastName specialization');

    if (!report) {
      return next(new ApiError(404, 'Radiology report not found or you do not have permission to view it.'));
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
 * 17. GET /api/v1/patient/bills
 * Retrieve hospital bills & invoices
 */
exports.getBills = async (req, res, next) => {
  try {
    const bills = await Bill.find({ patient: req.user._id }).sort({ billDate: -1 });

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. GET /api/v1/patient/bills/:id
 * Retrieve details for a single bill
 */
exports.getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!bill) {
      return next(new ApiError(404, 'Invoice not found or you do not have permission to view it.'));
    }

    res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 19. POST /api/v1/patient/bills/:id/pay
 * Process payment settlement for an outstanding invoice
 */
exports.payBill = async (req, res, next) => {
  try {
    const { amount, paymentMethod } = req.body;

    const bill = await Bill.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!bill) {
      return next(new ApiError(404, 'Invoice not found or you do not have permission to modify it.'));
    }

    if (bill.paymentStatus === 'Paid') {
      return next(new ApiError(400, 'This invoice is already fully settled.'));
    }

    const payAmount = Number(amount) || bill.netAmount - (bill.paidAmount || 0);
    if (payAmount <= 0) {
      return next(new ApiError(400, 'Payment amount must be greater than zero.'));
    }

    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    bill.paymentHistory.push({
      amount: payAmount,
      paymentMethod: paymentMethod || 'Credit/Debit Card',
      transactionId,
      paidAt: new Date(),
    });

    bill.paidAmount = (bill.paidAmount || 0) + payAmount;
    if (bill.paidAmount >= bill.netAmount) {
      bill.paymentStatus = 'Paid';
    } else {
      bill.paymentStatus = 'Partially Paid';
    }

    await bill.save();

    // Create payment notification
    await Notification.create({
      recipient: req.user._id,
      title: 'Payment Receipt Issued',
      message: `Payment of $${payAmount.toFixed(2)} received for Invoice #${bill.invoiceNumber}. Ref: ${transactionId}.`,
      type: 'billing',
      relatedId: bill._id,
    });

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully.',
      data: {
        bill,
        transactionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 20. GET /api/v1/patient/notifications
 * Retrieve notifications for the authenticated patient
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 21. PUT /api/v1/patient/notifications/:id/read
 * Mark a notification as read
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return next(new ApiError(404, 'Notification not found.'));
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 22. PUT /api/v1/patient/notifications/mark-all-read
 * Mark all notifications as read for authenticated patient
 */
exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
