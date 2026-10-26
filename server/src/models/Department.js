/**
 * Department Model
 * 
 * Represents hospital departments and clinical wings.
 */

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      uppercase: true,
      trim: true, // e.g. CARD, PEDI, NEUR
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    headName: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: 'Main Building',
    },
    capacity: {
      type: Number,
      default: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
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
  }
);

// Unique code and name per hospital (compound index)
departmentSchema.index({ hospital: 1, code: 1 }, { unique: true });
departmentSchema.index({ hospital: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
