/**
 * Standardized API Response
 * 
 * Provides consistent response structure across all API endpoints.
 * Every response follows: { success, message, data, meta }
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Response message
   * @param {*} data - Response payload
   * @param {Object} meta - Pagination or additional metadata
   */
  constructor(statusCode, message, data = null, meta = null) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
  }

  // --- Factory methods ---

  static success(res, message = 'Success', data = null, meta = null) {
    if (res && typeof res.status === 'function') {
      return res.status(200).json({
        success: true,
        message,
        data,
        ...(meta && { meta }),
      });
    }
    return new ApiResponse(200, message, res, data);
  }

  static created(res, message = 'Created successfully', data = null) {
    if (res && typeof res.status === 'function') {
      return res.status(201).json({
        success: true,
        message,
        data,
      });
    }
    return new ApiResponse(201, message, res);
  }

  static noContent(res, message = 'Deleted successfully') {
    if (res && typeof res.status === 'function') {
      return res.status(204).json({
        success: true,
        message,
      });
    }
    return new ApiResponse(204, message);
  }

  /**
   * Send the response via Express res object
   * @param {import('express').Response} res
   * @param {number} statusCode
   */
  send(res, statusCode = 200) {
    return res.status(statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
      ...(this.meta && { meta: this.meta }),
    });
  }
}

module.exports = ApiResponse;
