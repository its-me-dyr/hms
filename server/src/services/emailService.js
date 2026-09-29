/**
 * Email Service
 * 
 * Manages transactional email delivery for HMS using Nodemailer.
 * Reads SMTP credentials strictly from environment variables.
 * Sender is explicitly set as: From: HMS <configured-email>
 * 
 * SECURITY RULES:
 * 1. The OTP must NEVER be logged to console, terminal, or server logs.
 * 2. Transporter credentials and secrets are NEVER exposed in errors or output.
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
   * Initialize Nodemailer SMTP Transporter with connection pooling
   */
  initTransporter() {
    if (env.smtpHost && env.smtpUser && env.smtpPassword) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.smtpHost,
          port: env.smtpPort,
          secure: env.smtpSecure,
          pool: true,
          maxConnections: 3,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 5,
          auth: {
            user: env.smtpUser,
            pass: env.smtpPassword,
          },
        });

        // Safe startup verification (non-blocking, logs safe status without revealing secrets)
        this.transporter.verify((err) => {
          if (err) {
            logger.error(`❌ SMTP transporter connection warning: ${err.message}`);
          } else {
            logger.info(`📧 Nodemailer SMTP transporter ready [host: ${env.smtpHost}:${env.smtpPort}, sender: HMS <${env.smtpUser}>]`);
          }
        });
      } catch (err) {
        logger.error(`Failed to initialize SMTP transporter: ${err.message}`);
        this.transporter = null;
      }
    } else {
      logger.warn('⚠️ SMTP credentials not fully configured in environment.');
    }
  }

  /**
   * Send 6-digit registration OTP to user email
   * 
   * Sender: HMS <configured-email>
   * Subject: HMS Email Verification Code
   */
  async sendRegistrationOTP(email, otp, firstName = 'User') {
    if (!this.transporter) {
      this.initTransporter();
      if (!this.transporter) {
        throw new Error('Unable to send verification email. SMTP is not configured.');
      }
    }

    const subject = 'HMS Email Verification Code';

    // Sender explicitly configured as HMS using SMTP_FROM or { name: 'HMS', address: env.smtpUser }
    const fromSender = process.env.SMTP_FROM || {
      name: 'HMS',
      address: env.smtpUser,
    };

    const text = `Hello ${firstName},

Thank you for registering with HMS.

Your email verification code is:
${otp}

This code will expire in 5 minutes.

For your security, do not share this verification code with anyone.

If you did not request this registration, you can safely ignore this email.

Regards,
HMS Team
Hospital Management System`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 26px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Hospital Management System</h1>
            <p style="margin: 4px 0 0; color: #cffafe; font-size: 13px;">Secure Identity & Access Management</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px 24px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.5;">
              Hello <strong>${firstName}</strong>,
            </p>
            <p style="margin: 0 0 20px; font-size: 15px; color: #334155; line-height: 1.5;">
              Thank you for registering with HMS. Your email verification code is:
            </p>

            <!-- OTP Highlight Card -->
            <div style="background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace;">
                ${otp}
              </div>
              <div style="margin-top: 8px; font-size: 13px; color: #0f766e; font-weight: 500;">
                ⏱️ This code will expire in 5 minutes
              </div>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #f8fafc; border-left: 4px solid #0891b2; padding: 12px 14px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                <strong>Security Notice:</strong> For your security, do not share this verification code with anyone. HMS staff will never ask for your OTP.
              </p>
            </div>

            <p style="margin: 0 0 20px; font-size: 13px; line-height: 1.5; color: #64748b;">
              If you did not request this registration, you can safely ignore this email.
            </p>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569;">
              Regards,<br>
              <strong>HMS Team</strong><br>
              <span style="font-size: 12px; color: #94a3b8;">Hospital Management System</span>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
              This is an automated notification from HMS. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: fromSender,
        to: email,
        subject,
        text,
        html,
        priority: 'high',
        headers: {
          'X-Entity-Ref-ID': `${Date.now()}`,
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
        },
      });

      logger.info(`✅ Verification email delivered successfully to ${email} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error(`❌ SMTP delivery failed for ${email}: ${err.message}`);
      throw new Error('Unable to send verification email. Please try again.');
    }
  }

  /**
   * Send Staff Registration Pending Approval Email
   */
  async sendStaffPendingEmail(email, firstName = 'Staff Member', role = 'Staff') {
    if (!this.transporter) this.initTransporter();
    if (!this.transporter) {
      logger.warn(`Skipping staff pending email to ${email}: SMTP not configured`);
      return { success: false };
    }

    const formattedRole = String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = 'HMS Staff Application Submitted — Pending Administrator Approval';
    const fromSender = process.env.SMTP_FROM || { name: 'HMS', address: env.smtpUser };

    const text = `Hello ${firstName},

Your email has been verified. Your HMS staff application for the role of ${formattedRole} is now pending administrator review.

Our Super Administrator team will review your professional credentials and submitted documents. Once approved, you will receive an activation email and will be able to sign in to your staff portal.

Regards,
HMS Administration
Hospital Management System`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Hospital Management System</h1>
            <p style="margin: 4px 0 0; color: #cffafe; font-size: 13px;">Staff Credential Verification</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 14px; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.5;">
              Your email has been verified. Your application for <strong>${formattedRole}</strong> has been safely recorded and is now <strong>PENDING ADMINISTRATOR APPROVAL</strong>.
            </p>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                ⏳ <strong>Under Administrative Review:</strong> Hospital administration will review your submitted credentials and verification documents. You will receive an email once your account is approved.
              </p>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
              Regards,<br>
              <strong>HMS Team</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Hospital Management System</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({ from: fromSender, to: email, subject, text, html });
      logger.info(`✅ Staff pending approval email sent to ${email} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (err) {
      logger.error(`Failed to send staff pending email to ${email}: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * Send Staff Application Approved Email
   */
  async sendStaffApprovedEmail(email, firstName = 'Staff Member', role = 'Staff') {
    if (!this.transporter) this.initTransporter();
    if (!this.transporter) {
      logger.warn(`Skipping staff approved email to ${email}: SMTP not configured`);
      return { success: false };
    }

    const formattedRole = String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = 'HMS Staff Application Approved — Account Activated';
    const fromSender = process.env.SMTP_FROM || { name: 'HMS', address: env.smtpUser };

    const text = `Hello ${firstName},

Congratulations! Your HMS staff application for ${formattedRole} has been reviewed and APPROVED by the Super Administrator.

Your staff account is now active. You can sign in immediately using your registered email and password.

Regards,
HMS Administration
Hospital Management System`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Hospital Management System</h1>
            <p style="margin: 4px 0 0; color: #d1fae5; font-size: 13px;">Credential Verification Successful</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 14px; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.5;">
              Congratulations! Your HMS staff application for <strong>${formattedRole}</strong> has been <strong>APPROVED</strong>.
            </p>
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.5;">
                🎉 <strong>Account Active:</strong> Your staff portal privileges are now active. You can now sign in with your registered credentials.
              </p>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
              Regards,<br>
              <strong>HMS Team</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Hospital Management System</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({ from: fromSender, to: email, subject, text, html });
      logger.info(`✅ Staff approved email sent to ${email} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (err) {
      logger.error(`Failed to send staff approved email to ${email}: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * Send Staff Application Rejected Email
   */
  async sendStaffRejectedEmail(email, firstName = 'Staff Member', role = 'Staff', reason = '') {
    if (!this.transporter) this.initTransporter();
    if (!this.transporter) {
      logger.warn(`Skipping staff rejected email to ${email}: SMTP not configured`);
      return { success: false };
    }

    const formattedRole = String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = 'HMS Staff Application Status Update';
    const fromSender = process.env.SMTP_FROM || { name: 'HMS', address: env.smtpUser };

    const text = `Hello ${firstName},

Thank you for your interest in joining HMS as a ${formattedRole}.

After review by the Super Administrator, your application was not approved.

Reason for decision:
${reason || 'Credentials or submitted documents could not be verified.'}

You may log in to HMS and select "Resubmit Application" to update your information and re-upload required documents.

Regards,
HMS Administration
Hospital Management System`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Hospital Management System</h1>
            <p style="margin: 4px 0 0; color: #ffe4e6; font-size: 13px;">Staff Credential Verification</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 14px; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.5;">
              After careful review by the Super Administrator, your staff application for <strong>${formattedRole}</strong> requires revisions.
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #991b1b;">
                Reason for Rejection:
              </p>
              <p style="margin: 0; font-size: 13px; color: #b91c1c; line-height: 1.45;">
                ${reason || 'Credentials or submitted documents could not be verified.'}
              </p>
            </div>
            <p style="margin: 0 0 16px; font-size: 13px; color: #475569; line-height: 1.5;">
              You may sign in to your HMS account to view the feedback and click <strong>Resubmit Application</strong> to update your details and re-upload documents.
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
              Regards,<br>
              <strong>HMS Team</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Hospital Management System</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({ from: fromSender, to: email, subject, text, html });
      logger.info(`✅ Staff rejected email sent to ${email} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (err) {
      logger.error(`Failed to send staff rejected email to ${email}: ${err.message}`);
      return { success: false };
    }
  }
}

module.exports = new EmailService();
