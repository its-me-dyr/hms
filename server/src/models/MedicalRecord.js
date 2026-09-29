/**
 * Medical Record Model
 * 
 * Clinical consultations, diagnostic findings, vitals, and treatment history.
 */

const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
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
    consultationDate: {
      type: Date,
      default: Date.now,
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    treatment: {
      type: String,
      trim: true,
      default: '',
    },
    vitals: {
      bp: { type: String, default: '120/80 mmHg' },
      heartRate: { type: String, default: '72 bpm' },
      temperature: { type: String, default: '98.6 °F' },
      respiratoryRate: { type: String, default: '16 breaths/min' },
      weight: { type: String, default: '70 kg' },
      spo2: { type: String, default: '99%' },
    },
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
