/**
 * OTP Verification Model
 * 
 * Stores temporary hashed OTP records and registration payloads.
 * OTPs are stored strictly as bcrypt hashes.
 * The raw OTP is NEVER persisted in database.
 * 
 * TTL:
 * - expiresAt: 5 minutes (code validity period)
 * - purgeAt: 1 hour (auto-purge abandoned registration sessions)
 */

const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required for OTP verification'],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
    registrationData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    purgeAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Auto-purged by MongoDB after 1 hour
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.OtpVerification || mongoose.model('OtpVerification', otpVerificationSchema);
