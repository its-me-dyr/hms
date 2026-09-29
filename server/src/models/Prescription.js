/**
 * Prescription Model
 * 
 * Clinical medication orders prescribed by attending physicians.
 */

const mongoose = require('mongoose');

const medicationItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g. 500mg)'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required (e.g. Twice daily after meals)'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required (e.g. 5 days)'],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    prescriptionDate: {
      type: Date,
      default: Date.now,
    },
    diagnosis: {
      type: String,
      trim: true,
      default: '',
    },
    medications: [medicationItemSchema],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Discontinued'],
      default: 'Active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
