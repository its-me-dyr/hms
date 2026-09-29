/**
 * Centralized Error Handler Middleware
 * 
 * Catches all errors thrown in route handlers and middleware,
 * formats them consistently, and sends structured error responses.
 * 
 * Express 5 automatically forwards async errors to error middleware,
 * so we don't need express-async-errors or wrapper utilities.
 */

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If it's not already an ApiError, wrap it
  if (!(error instanceof ApiError)) {
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = ApiError.validationError(errors);
    }
    // Handle Mongoose duplicate key errors
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      error = ApiError.conflict(`Duplicate value for ${field}`);
    }
    // Handle Mongoose cast errors (invalid ObjectId, etc.)
    else if (err.name === 'CastError') {
      error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
    }
    // Handle JWT errors
    else if (err.name === 'JsonWebTokenError') {
      error = ApiError.unauthorized('Invalid token');
    }
    else if (err.name === 'TokenExpiredError') {
      error = ApiError.unauthorized('Token expired');
    }
    // Generic server error
    else {
      error = ApiError.internal(env.isDev ? err.message : 'Internal server error');
    }
  }

  // Log the error (with sensitive fields redacted)
  if (error.statusCode >= 500) {
    const sanitizedBody = req.body ? { ...req.body } : {};
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';
    if (sanitizedBody.otp) sanitizedBody.otp = '[REDACTED]';

    logger.error(`[${req.method}] ${req.originalUrl} — ${error.message}`, {
      stack: err.stack,
      body: sanitizedBody,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} — ${error.statusCode} ${error.message}`);
  }

  // Send response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
    ...(env.isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
