/**
 * Role Model
 * 
 * Defines user roles and attaches an array of permission strings or Permission references.
 * Pre-defined roles: SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST, LAB_TECH, RADIOLOGY_STAFF, BILLING_STAFF, PATIENT.
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name code is required'],
      unique: true,
      trim: true,
      uppercase: true, // e.g. SUPER_ADMIN, DOCTOR
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true, // e.g. "Hospital Doctor"
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: [
      {
        type: String,
        trim: true,
        lowercase: true, // Stores permission code strings like "patients:read"
      },
    ],
    isSystemRole: {
      type: Boolean,
      default: false, // Built-in roles cannot be deleted
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for checking if role has a specific permission
roleSchema.methods.hasPermission = function (permissionCode) {
  if (this.permissions.includes('*')) return true;
  return this.permissions.includes(permissionCode.toLowerCase());
};

module.exports = mongoose.model('Role', roleSchema);
