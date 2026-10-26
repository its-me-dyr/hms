/**
 * Notification Model
 * 
 * Clinical, appointment, laboratory, and billing alerts delivered to patient accounts.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['appointment', 'prescription', 'lab', 'radiology', 'billing', 'system', 'security', 'hospital', 'admin'],
      default: 'system',
      index: true,
    },
    module: {
      type: String,
      default: null,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    link: {
      type: String,
      default: null,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalSetting',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
