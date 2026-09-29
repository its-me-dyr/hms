/**
 * Auth Controller
 * 
 * HTTP request handlers for authentication, OTP verification, tokens, and staff approvals.
 */

const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const PUBLIC_REGISTRATION_DISABLED_MESSAGE =
  'Public registration is disabled. Staff accounts must be created by Hospital Administration, and patient accounts must be registered by Reception / Front Desk staff.';

class AuthController {
  /**
   * @route POST /api/v1/auth/register/request-otp
   * @desc Blocked: Public staff & patient self-registration disabled
   */
  async requestOtp(req, res, next) {
    return next(new ApiError(403, PUBLIC_REGISTRATION_DISABLED_MESSAGE));
  }

  /**
   * @route POST /api/v1/auth/register/verify-otp
   * @desc Blocked: Public staff & patient self-registration disabled
   */
  async verifyOtp(req, res, next) {
    return next(new ApiError(403, PUBLIC_REGISTRATION_DISABLED_MESSAGE));
  }

  /**
   * @route POST /api/v1/auth/register/resend-otp
   * @desc Blocked: Public staff & patient self-registration disabled
   */
  async resendOtp(req, res, next) {
    return next(new ApiError(403, PUBLIC_REGISTRATION_DISABLED_MESSAGE));
  }

  /**
   * @route POST /api/v1/auth/register
   * @desc Blocked: Public staff & patient self-registration disabled
   */
  async register(req, res, next) {
    return next(new ApiError(403, PUBLIC_REGISTRATION_DISABLED_MESSAGE));
  }

  /**
   * @route POST /api/v1/auth/login
   * @desc Login with email & password
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.login(email, password, ipAddress, userAgent);

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/auth/refresh-token
   * @desc Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      const result = await authService.refreshToken(refreshToken);

      return ApiResponse.success(res, 'Token refreshed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/auth/logout
   * @desc Logout user
   */
  async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      if (req.user) {
        await authService.logout(req.user._id, refreshToken, ipAddress, userAgent);
      }

      res.clearCookie('refreshToken');

      return ApiResponse.success(res, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/auth/me
   * @desc Get current authenticated user profile
   */
  async getMe(req, res, next) {
    try {
      const profile = await authService.getCurrentUser(req.user._id);
      return ApiResponse.success(res, 'Current user profile fetched', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/auth/pending-staff
   * @desc Hospital Admin / Super Admin: Get all staff accounts pending approval
   */
  async getPendingStaff(req, res, next) {
    try {
      const staff = await authService.getPendingStaff();
      return ApiResponse.success(res, 'Pending staff fetched successfully', { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PATCH /api/v1/auth/staff/:id/status
   * @desc Hospital Admin / Super Admin: Update staff account status directly
   */
  async updateStaffStatus(req, res, next) {
    try {
      const { status } = req.body;
      const staff = await authService.updateStaffStatus(req.params.id, status, req.user);
      return ApiResponse.success(res, 'Staff status updated successfully', { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/auth/upload-document
   * @desc Securely upload verification document before OTP registration
   */
  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file was uploaded or file format is invalid.', 400);
      }

      const fileKey = req.file.filename;
      const fileUrl = `/api/v1/auth/documents/${fileKey}`;

      return ApiResponse.success(res, 'Document uploaded successfully', {
        documentName: req.body.documentName || req.file.originalname,
        documentType: req.body.documentType || 'other',
        originalName: req.file.originalname,
        fileKey,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadDate: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/auth/documents/:filename
   * @desc Securely stream uploaded verification document to authorized users
   */
  async getDocumentFile(req, res, next) {
    try {
      const path = require('path');
      const fs = require('fs');
      const { UPLOAD_DIR } = require('../middleware/upload.middleware');

      const filename = path.basename(req.params.filename);
      const filePath = path.join(UPLOAD_DIR, filename);

      if (!fs.existsSync(filePath)) {
        return ApiResponse.error(res, 'Document file not found', 404);
      }

      // Check mime type and stream file
      const ext = path.extname(filename).toLowerCase();
      const mimeMap = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route POST /api/v1/auth/resubmit-application
   * @desc Rejected staff user resubmits updated information and documents
   */
  async resubmitApplication(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.resubmitStaffApplication(req.body, ipAddress, userAgent);

      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/auth/change-password
   * @desc Change password for authenticated user
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.changePassword(req.user._id, currentPassword, newPassword, ipAddress, userAgent);

      return ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route GET /api/v1/auth/preferences
   * @desc Get preferences for authenticated user
   */
  async getPreferences(req, res, next) {
    try {
      const preferences = await authService.getUserPreferences(req.user._id);
      return ApiResponse.success(res, 'User preferences fetched', { preferences });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route PUT /api/v1/auth/preferences
   * @desc Update preferences for authenticated user
   */
  async updatePreferences(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      const preferences = await authService.updateUserPreferences(req.user._id, req.body, ipAddress, userAgent);

      return ApiResponse.success(res, 'Preferences updated successfully', { preferences });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
