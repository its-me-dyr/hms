/**
 * User Model
 * 
 * Central User schema for all system actors (Admins, Doctors, Nurses, Receptionists, Patients).
 * Includes authentication methods, role reference, password hashing, and token handling.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default in queries
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'User role is required'],
    },
    roleName: {
      type: String,
      uppercase: true,
      trim: true, // Denormalized role string (e.g., "SUPER_ADMIN", "DOCTOR", "PATIENT") for fast access
    },
    profileImage: {
      type: String,
      default: '',
    },
    patientId: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relation: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    allergies: {
      type: [String],
      default: [],
    },
    // Staff & Doctor-specific metadata
    specialization: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: '',
    },
    qualification: {
      type: String,
      default: '',
    },
    institution: {
      type: String,
      default: '',
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    previousOrganization: {
      type: String,
      default: '',
    },
    licenseNumber: {
      type: String,
      default: '',
    },
    consultationFee: {
      type: Number,
      default: 50,
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    availableTimeSlots: {
      type: [String],
      default: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'],
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalSetting',
      default: null,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalSetting',
      default: null,
    },
    hospitalBranch: {
      type: String,
      default: 'MAIN-01',
      trim: true,
    },
    branchCode: {
      type: String,
      default: 'MAIN-01',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_verification', 'active', 'suspended', 'rejected', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        dashboardPreference: 'default',
        notifications: {
          email: true,
          appointments: true,
          system: true,
          billing: true,
          reminders: true,
          operational: true,
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save hook: Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  // Prevent double-hashing if password is already a valid bcrypt hash
  if (this.password && /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method: Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method: Generate Access Token (Short-lived)
userSchema.methods.generateAccessToken = function (permissions = []) {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_dev_mode_only_change_in_prod';
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: (this.roleName || 'patient').toLowerCase(),
      permissions: permissions,
      mustChangePassword: Boolean(this.mustChangePassword),
    },
    secret,
    { expiresIn }
  );
};

// Method: Generate Refresh Token (Long-lived)
userSchema.methods.generateRefreshToken = function () {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_dev_mode_only';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: this._id,
    },
    secret,
    { expiresIn }
  );
};

module.exports = mongoose.model('User', userSchema);
