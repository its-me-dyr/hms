/**
 * File Upload Middleware
 * 
 * Configures Multer for secure document and credential file uploads.
 * 
 * SECURITY ENFORCEMENTS:
 * 1. Storage restricted to non-public server/uploads/documents/ directory.
 * 2. Whitelisted MIME types: PDF, PNG, JPG, JPEG.
 * 3. Whitelisted file extensions: .pdf, .png, .jpg, .jpeg.
 * 4. Maximum file size limit: 5MB.
 * 5. Sanitized random UUID / cryptographic prefix filenames to eliminate collisions & path traversal.
 * 6. User-provided filenames are safely recorded as originalName only.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeRandom = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const safeFilename = `doc_${timestamp}_${safeRandom}${ext}`;
    cb(null, safeFilename);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new ApiError(
        400,
        `Invalid file type "${file.originalname}". Allowed formats: PDF, PNG, JPG, JPEG.`
      ),
      false
    );
  }

  cb(null, true);
};

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

module.exports = {
  uploadDocument,
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};
