/**
 * Radiology Equipment Model
 * 
 * Tracks imaging equipment availability, maintenance schedules, and status.
 */

const mongoose = require('mongoose');

const radiologyEquipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Equipment name is required'],
      trim: true,
    },
    modality: {
      type: String,
      enum: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'PET Scan'],
      required: [true, 'Modality is required'],
      index: true,
    },
    room: {
      type: String,
      default: '',
      trim: true,
    },
    manufacturer: {
      type: String,
      default: '',
      trim: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'In Use', 'Maintenance', 'Out of Service'],
      default: 'Available',
      index: true,
    },
    maintenanceSchedule: {
      type: String,
      default: '',
      trim: true,
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    },
    nextMaintenanceDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model('RadiologyEquipment', radiologyEquipmentSchema);
