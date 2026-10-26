/**
 * Email Service
 * 
 * Manages transactional email delivery for HMS using Nodemailer.
 * Reads SMTP credentials from environment variables.
 * Falls back safely to structured development console logging when SMTP is unconfigured.
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Initialize Nodemailer SMTP Transporter
   */
  initTransporter() {
    if (env.smtpHost && env.smtpUser && env.smtpPassword) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          auth: {
            user: env.smtpUser,
            pass: env.smtpPassword,
          },
        });

        this.transporter.verify((err) => {
          if (err) {
            logger.warn(`⚠️ SMTP connection warning: ${err.message}. Email delivery will fall back to simulated console logging.`);
            this.transporter = null;
          } else {
            logger.info(`📧 Nodemailer SMTP transporter ready [host: ${env.smtpHost}:${env.smtpPort}, sender: ${env.smtpFrom}]`);
          }
        });
      } catch (err) {
        logger.warn(`Failed to initialize SMTP transporter: ${err.message}`);
        this.transporter = null;
      }
    } else {
      logger.info('📧 SMTP credentials not configured. Development mode: emails will be simulated and logged to console.');
    }
  }

  /**
   * Send Staff Login Credentials with Temporary Password
   */
  async sendStaffCredentialsEmail({
    to,
    firstName = 'Staff Member',
    lastName = '',
    role = 'Staff',
    hospitalName = 'Hospital Medical Center',
    tempPassword,
    loginUrl,
  }) {
    const fullName = `${firstName} ${lastName}`.trim() || 'Staff Member';
    const roleTitle = String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = 'Your Hospital Staff Account Login Credentials';
    const fromSender = env.smtpFrom || 'Hospital Management System <no-reply@hms.org>';
    const actualLoginUrl = loginUrl || `${env.clientUrl}/login`;

    const text = `Hello ${fullName},

Your hospital staff account has been created successfully.

Your login details are:

* Name: ${fullName}
* Role: ${roleTitle}
* Hospital: ${hospitalName}
* Login Email: ${to}
* Temporary Password: ${tempPassword}

Please log in through the official Hospital Management System login page using these credentials:
${actualLoginUrl}

For security, you will be required to change your temporary password after your first successful login before accessing your dashboard.

Please do not share your password with anyone.

Regards,
Hospital Management System`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Hospital Staff Account Login Credentials</title>
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #0891b2;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background-color: rgba(8, 145, 178, 0.2); color: #22d3ee; font-size: 22px; font-weight: bold; margin-bottom: 8px;">
              +
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Hospital Management System</h1>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">${hospitalName}</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 28px;">
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">
              Hello ${fullName},
            </p>
            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #334155;">
              Your hospital staff account has been created successfully.
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Details</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 140px;">Name:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Role:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${roleTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Hospital:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${hospitalName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Login Email:</td>
                  <td style="padding: 6px 0; color: #0891b2; font-weight: 700;">${to}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Temporary Password:</td>
                  <td style="padding: 6px 0;">
                    <code style="font-family: monospace; font-size: 14px; font-weight: 700; background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; color: #0f172a;">${tempPassword}</code>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${actualLoginUrl}" style="display: inline-block; background-color: #0891b2; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(8, 145, 178, 0.3);">
                Sign In to Portal &rarr;
              </a>
            </div>

            <!-- Security Warning -->
            <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12.5px; color: #854d0e; line-height: 1.5;">
                🔒 <strong>Important Security Notice:</strong> For security, you will be required to change your temporary password after your first successful login before accessing your clinical / operational dashboard.
              </p>
            </div>

            <p style="margin: 0 0 24px; font-size: 13px; color: #64748b; line-height: 1.5;">
              Please do not share your temporary password with anyone. If you did not expect this account, please contact hospital administration.
            </p>

            <!-- Footer -->
            <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b; line-height: 1.5;">
              Regards,<br>
              <strong>${hospitalName} Administration</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Hospital Management System</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: fromSender,
          to,
          subject,
          text,
          html,
        });
        logger.info(`✅ Staff credentials email sent to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        logger.error(`❌ Failed to send staff credentials email to ${to}: ${err.message}`);
        this.logSimulatedCredentialsEmail(to, subject, hospitalName, roleTitle);
        return { success: false, error: err.message };
      }
    } else {
      this.logSimulatedCredentialsEmail(to, subject, hospitalName, roleTitle);
      return { success: true, simulated: true };
    }
  }

  /**
   * Helper to format simulated email logs in terminal (without exposing temporary password)
   */
  logSimulatedCredentialsEmail(to, subject, hospitalName, roleTitle) {
    console.log('\n' + '═'.repeat(68));
    console.log('📧 [EmailService] SIMULATED CREDENTIALS EMAIL (SMTP Not Configured)');
    console.log(`   To:                  ${to}`);
    console.log(`   Hospital:            ${hospitalName}`);
    console.log(`   Assigned Role:       ${roleTitle}`);
    console.log(`   Subject:             ${subject}`);
    console.log('   Temporary Password:  [DISPATCHED SECURELY - MASKED IN LOGS]');
    console.log('═'.repeat(68) + '\n');
  }
}

module.exports = new EmailService();
