/**
 * Staff Verification Model
 * 
 * Tracks staff credential applications, role-specific professional details,
 * uploaded credentials/documents, approval/rejection lifecycle, and audit history.
 */

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  documentName: { type: String, default: 'Document', trim: true },
  documentType: {
    type: String,
    default: 'other',
    trim: true,
  },
  fileUrl: { type: String, default: '' },
  fileKey: { type: String, default: '' },
  originalName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
  uploadDate: { type: Date, default: Date.now },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
});

documentSchema.pre('validate', function () {
  if (!this.documentName && this.name) {
    this.documentName = this.name;
  }
});

const verificationHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  previousStatus: { type: String, default: '' },
  newStatus: { type: String, required: true },
  performedBy: { type: String, default: 'System' },
  reason: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

const staffVerificationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // e.g. 'doctor', 'nurse', 'receptionist'
    },
    department: {
      type: String,
      trim: true,
      default: 'General',
    },
    personalInfo: {
      phone: { type: String, default: '' },
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, default: 'prefer_not_to_say' },
      address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: '' },
      },
      emergencyContact: {
        name: { type: String, default: '' },
        relation: { type: String, default: '' },
        phone: { type: String, default: '' },
      },
    },
    professionalInfo: {
      qualification: { type: String, default: '' },
      institution: { type: String, default: '' },
      yearsOfExperience: { type: Number, default: 0 },
      previousOrganization: { type: String, default: '' },
      employeeId: { type: String, default: '' },
      licenseNumber: { type: String, default: '' },
      specialization: { type: String, default: '' },
      professionalDescription: { type: String, default: '' },
    },
    documents: [documentSchema],
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMITTED'],
      default: 'PENDING_VERIFICATION',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null, // Email or Name of the reviewing Super Admin
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },
    verificationHistory: [verificationHistorySchema],
  },
  {
    timestamps: true,
  }
);

staffVerificationSchema.index({ applicant: 1 });
staffVerificationSchema.index({ status: 1, role: 1 });

module.exports = mongoose.model('StaffVerification', staffVerificationSchema);
