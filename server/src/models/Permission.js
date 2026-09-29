/**
 * Permission Model
 * 
 * Granular permissions following the "resource:action" format.
 * Examples: 'patients:read', 'prescriptions:write', 'admin:manage'
 */

const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    module: {
      type: String,
      required: [true, 'Module classification is required'],
      trim: true,
      lowercase: true,
      enum: [
        'system',
        'auth',
        'users',
        'patients',
        'doctors',
        'departments',
        'appointments',
        'opd',
        'ipd',
        'beds',
        'nursing',
        'emergency',
        'pharmacy',
        'laboratory',
        'radiology',
        'billing',
        'insurance',
        'emr',
        'inventory',
        'hr',
        'reports',
        'admin',
      ],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isSystem: {
      type: Boolean,
      default: false, // System permissions cannot be deleted
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Permission', permissionSchema);
