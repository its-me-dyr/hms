/**
 * Audit Log Model
 * 
 * Tracks all security events, sensitive resource modifications, logins, and RBAC actions.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userEmail: {
      type: String,
      default: 'system',
    },
    userRole: {
      type: String,
      default: 'ANONYMOUS',
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
      uppercase: true, // e.g. LOGIN, LOGOUT, CREATE_PATIENT, UPDATE_ROLE, FAILED_LOGIN
    },
    module: {
      type: String,
      required: [true, 'Audit module is required'],
      trim: true,
      lowercase: true, // e.g. auth, patients, billing
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Logs are append-only
  }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
