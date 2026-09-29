/**
 * Laboratory Report & Investigation Order Model
 * 
 * Tracks end-to-end laboratory clinical workflow:
 * Order -> Sample Collection -> Processing -> Results Entry -> Clinical Verification -> Final Report.
 */

const mongoose = require('mongoose');

const labResultParameterSchema = new mongoose.Schema(
  {
    parameter: {
      type: String,
      required: true,
      trim: true,
    },
    result: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    referenceRange: {
      type: String,
      default: '',
      trim: true,
    },
    flag: {
      type: String,
      enum: ['Normal', 'High', 'Low', 'Critical', 'Abnormal'],
      default: 'Normal',
    },
    method: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const labReportSchema = new mongoose.Schema(
  {
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
      required: [true, 'Ordering doctor is required'],
      index: true,
    },
    department: {
      type: String,
      default: 'General OPD',
      trim: true,
    },
    testCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Pathology', 'Urinalysis', 'General'],
      default: 'General',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'STAT'],
      default: 'Routine',
      index: true,
    },
    clinicalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    testDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        'Pending',
        'Accepted',
        'Sample Pending',
        'Sample Collected',
        'Received',
        'Processing',
        'Result Pending',
        'Verified',
        'Completed',
        'Cancelled',
        'Rejected',
        'Ordered', // Legacy support
      ],
      default: 'Pending',
      index: true,
    },
    
    // Sample Specimen Information
    sampleId: {
      type: String,
      sparse: true,
      trim: true,
    },
    sampleType: {
      type: String,
      default: 'Blood (Whole)',
      trim: true,
    },
    sampleContainer: {
      type: String,
      default: 'EDTA Vacutainer (Lavender)',
      trim: true,
    },
    sampleCondition: {
      type: String,
      enum: ['Acceptable', 'Hemolyzed', 'Lipemic', 'Clotted', 'Insufficient Volume', 'Contaminated', 'Other'],
      default: 'Acceptable',
    },
    sampleCollectedAt: {
      type: Date,
      default: null,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sampleReceivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    collectionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },

    // Processing Tracking
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processingCompletedAt: {
      type: Date,
      default: null,
    },
    processingNotes: {
      type: String,
      default: '',
      trim: true,
    },

    // Results & Parameters
    results: [labResultParameterSchema],
    resultsEnteredAt: {
      type: Date,
      default: null,
    },
    resultsEnteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    technicianNotes: {
      type: String,
      default: '',
      trim: true,
    },

    // Critical Value Alerts
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

    // Clinical Verification & Sign-off
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

    // Billing Integration
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      default: null,
    },
    billingStatus: {
      type: String,
      enum: ['Unbilled', 'Pending', 'Paid', 'Waived'],
      default: 'Pending',
    },
    price: {
      type: Number,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },
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
labReportSchema.pre('save', function () {
  if (!this.requestId) {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    this.requestId = `LR-${new Date().getFullYear()}-${randomHex}`;
  }
});

module.exports = mongoose.model('LabReport', labReportSchema);

