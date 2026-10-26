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

// Refresh Token validation
const refreshTokenValidation = validate([
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
]);

module.exports = {
  loginValidation,
  registerValidation,
  refreshTokenValidation,
};
