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

// Virtual for checking if role has a specific permission with wildcard and alias support
roleSchema.methods.hasPermission = function (permissionCode) {
  if (!this.permissions || this.permissions.length === 0) return false;
  if (this.permissions.includes('*')) return true;

  const perm = String(permissionCode || '').toLowerCase().trim();
  if (this.permissions.includes(perm)) return true;

  const [domain, action] = perm.split(':');
  if (domain) {
    if (this.permissions.includes(`${domain}:*`)) return true;
    if (this.permissions.includes(`${domain}:manage`)) return true;
  }

  // Alias support
  if (action === 'create' || action === 'update') {
    if (this.permissions.includes(`${domain}:write`)) return true;
  }
  if (action === 'cancel') {
    if (this.permissions.includes(`${domain}:delete`)) return true;
  }
  if (domain === 'admin') {
    if (action === 'users' && this.permissions.includes('users:manage')) return true;
    if (action === 'roles' && this.permissions.includes('roles:manage')) return true;
    if (action === 'settings' && this.permissions.includes('settings:manage')) return true;
  }

  return false;
};

module.exports = mongoose.model('Role', roleSchema);
