/**
 * Radiology & Imaging Report Model
 * 
 * Diagnostic radiology studies (X-Ray, MRI, CT, Ultrasound) and interpretations.
 * Full end-to-end workflow:
 * Request → Accept → Schedule → Preparation → Queue → Study → Report → Verification → Final
 */

const mongoose = require('mongoose');

const radiologyReportSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    requestId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ordering physician is required'],
    },
    department: {
      type: String,
      default: 'Radiology',
      trim: true,
    },

    // ── Study Information ─────────────────────────────────────
    examinationName: {
      type: String,
      required: [true, 'Examination name is required'],
      trim: true,
    },
    modality: {
      type: String,
      enum: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'PET Scan'],
      default: 'X-Ray',
      index: true,
    },
    bodyPart: {
      type: String,
      default: '',
      trim: true,
    },
    studyType: {
      type: String,
      default: '',
      trim: true,
    },
    clinicalIndication: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Priority ──────────────────────────────────────────────
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'STAT'],
      default: 'Routine',
      index: true,
    },

    // ── Dates ─────────────────────────────────────────────────
    examinationDate: {
      type: Date,
      default: Date.now,
    },

    // ── Workflow Status ───────────────────────────────────────
    status: {
      type: String,
      enum: [
        'Pending',
        'Accepted',
        'Scheduled',
        'Patient Ready',
        'In Queue',
        'In Progress',
        'Completed',
        'Report Draft',
        'Report Pending Verification',
        'Verified',
        'Cancelled',
        'Rejected',
        // Legacy compatibility
        'Scheduled',
        'In Progress',
        'Completed',
      ],
      default: 'Pending',
      index: true,
    },

    // ── Scheduling ────────────────────────────────────────────
    scheduledDate: {
      type: Date,
      default: null,
    },
    scheduledTime: {
      type: String,
      default: '',
      trim: true,
    },
    scheduledRoom: {
      type: String,
      default: '',
      trim: true,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RadiologyEquipment',
      default: null,
    },
    room: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Patient Preparation ───────────────────────────────────
    preparationStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Ready', 'Hold', 'Cancelled'],
      default: 'Not Started',
    },
    preparationNotes: {
      type: String,
      default: '',
      trim: true,
    },
    consentObtained: {
      type: Boolean,
      default: false,
    },
    patientVerified: {
      type: Boolean,
      default: false,
    },

    // ── Queue Management ──────────────────────────────────────
    queuePosition: {
      type: Number,
      default: null,
    },
    queueEnteredAt: {
      type: Date,
      default: null,
    },
    queueStartedAt: {
      type: Date,
      default: null,
    },
    queueCompletedAt: {
      type: Date,
      default: null,
    },

    // ── Study Processing ──────────────────────────────────────
    studyNotes: {
      type: String,
      default: '',
      trim: true,
    },
    studyStartedAt: {
      type: Date,
      default: null,
    },
    studyCompletedAt: {
      type: Date,
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Report Entry ──────────────────────────────────────────
    findings: {
      type: String,
      trim: true,
      default: '',
    },
    impression: {
      type: String,
      trim: true,
      default: '',
    },
    reportDraft: {
      type: String,
      trim: true,
      default: '',
    },
    reportSubmittedAt: {
      type: Date,
      default: null,
    },
    reportSubmittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Original radiologist field (kept for backward compatibility) ──
    radiologist: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Report Verification ───────────────────────────────────
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verificationNotes: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Correction / Return ───────────────────────────────────
    returnedAt: {
      type: Date,
      default: null,
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    returnReason: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Critical / Abnormal Findings ──────────────────────────
    isCritical: {
      type: Boolean,
      default: false,
      index: true,
    },
    criticalSeverity: {
      type: String,
      enum: ['Abnormal', 'Critical'],
      default: 'Abnormal',
    },
    criticalNotified: {
      type: Boolean,
      default: false,
    },
    criticalNotifiedAt: {
      type: Date,
      default: null,
    },
    criticalAcknowledged: {
      type: Boolean,
      default: false,
    },
    criticalAcknowledgedAt: {
      type: Date,
      default: null,
    },
    criticalAcknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    criticalNotes: {
      type: String,
      default: '',
      trim: true,
    },

    // ── Document / Attachment ─────────────────────────────────
    documentUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-assign human-readable requestId if not provided
radiologyReportSchema.pre('save', function () {
  if (!this.requestId) {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    this.requestId = `RAD-${new Date().getFullYear()}-${randomHex}`;
  }
});

// Indexes for common queries
radiologyReportSchema.index({ status: 1, scheduledDate: 1 });
radiologyReportSchema.index({ modality: 1, status: 1 });
radiologyReportSchema.index({ isCritical: 1, criticalAcknowledged: 1 });
radiologyReportSchema.index({ assignedStaff: 1, status: 1 });

module.exports = mongoose.model('RadiologyReport', radiologyReportSchema);
