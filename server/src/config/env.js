/**
 * Environment Configuration
 * 
 * Validates and exports all environment variables.
 * Fails fast on startup if required variables are missing.
 */

require('dotenv').config();

const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// Validate required environment variables on startup
const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Please check your .env file. See .env.example for reference.');
  process.exit(1);
}

const env = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Super Admin Credentials from Environment
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
  superAdminPasswordHash: (process.env.SUPER_ADMIN_PASSWORD_HASH || '').trim(),

  // SMTP Configuration
  smtpHost: (process.env.SMTP_HOST || '').trim(),
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT, 10) === 465,
  smtpUser: (process.env.SMTP_USER || '').trim(),
  smtpPassword: (process.env.SMTP_PASSWORD || '').trim(),
  smtpFrom: process.env.SMTP_FROM || '"HMS Healthcare Systems" <noreply@hms.local>',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = env;
