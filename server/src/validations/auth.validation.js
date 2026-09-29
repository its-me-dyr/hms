/**
 * Auth Request Validations
 * 
 * Express-validator middleware chains for authentication endpoints.
 */

const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Middleware helper to handle validation error output
const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return next(new ApiError(400, 'Validation failed', formattedErrors));
  };
};

// Login validation rules
const loginValidation = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
]);

// Registration validation rules (Admin provisioning users)
const registerValidation = validate([
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required'),
  body('phone')
    .optional()
    .trim(),
]);

// Patient public registration validation rules
const patientRegisterValidation = validate([
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/)
    .withMessage('Please enter a valid phone number format'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please enter a valid date of birth (YYYY-MM-DD)'),
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be male, female, other, or prefer_not_to_say'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
]);

const ALLOWED_REGISTRATION_ROLES = [
  'patient',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_technician',
  'radiology_staff',
  'ot_staff',
  'billing_staff',
  'insurance_staff',
  'hr_staff',
  'inventory_staff',
  'blood_bank_staff',
  'emergency_staff',
];

// OTP Request Validation (Step 1 of registration)
const requestOtpValidation = validate([
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/)
    .withMessage('Please enter a valid phone number format'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please enter a valid date of birth (YYYY-MM-DD)'),
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Gender must be male, female, other, or prefer_not_to_say'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Account role is required')
    .custom((value) => {
      const normalized = String(value).toLowerCase().trim();
      if (['super_admin', 'hospital_admin'].includes(normalized)) {
        throw new Error('Self-registration for privileged administrative roles is strictly prohibited.');
      }
      if (!ALLOWED_REGISTRATION_ROLES.includes(normalized)) {
        throw new Error(`Invalid role selection. Must be one of: ${ALLOWED_REGISTRATION_ROLES.join(', ')}`);
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
]);

// OTP Verification Validation (Step 2 of registration)
const verifyOtpValidation = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('Verification code is required')
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be a 6-digit number'),
]);

// Resend OTP Validation
const resendOtpValidation = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
]);

// Refresh Token validation
const refreshTokenValidation = validate([
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
]);

module.exports = {
  loginValidation,
  registerValidation,
  patientRegisterValidation,
  requestOtpValidation,
  verifyOtpValidation,
  resendOtpValidation,
  refreshTokenValidation,
  ALLOWED_REGISTRATION_ROLES,
};
