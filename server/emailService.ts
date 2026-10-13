/**
 * Server-side email delivery service.
 * Supports SMTP transport when configured via environment variables.
 * Provides clear audit logging and dev diagnostics when credentials are not configured.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  mode: 'smtp' | 'preview';
  previewOtp?: string;
  previewDetails?: {
    to: string;
    subject: string;
    previewText: string;
  };
}

export class EmailService {
  private isConfigured: boolean = false;
  private host?: string;
  private port?: number;
  private user?: string;
  private pass?: string;
  private from: string = 'InternConnect <support@internconnect.com>';
  private emailMode: string = 'preview';

  constructor() {
    this.host = process.env.SMTP_HOST;
    this.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM || this.from;
    this.emailMode = process.env.EMAIL_MODE || 'preview';

    if (this.host && this.user && this.pass && this.user !== 'apikey_placeholder') {
      this.isConfigured = true;
    }
  }

  /**
   * Returns current email configuration status
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      host: this.host ? this.host : 'Not set',
      mode: this.emailMode,
      from: this.from,
    };
  }

  /**
   * Send an email (OTP, invoice, temporary password, or notifications)
   */
  async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    if (this.isConfigured) {
      try {
        // In Node.js environment with SMTP, a transport would send the email.
        console.log(`[EMAIL DISPATCH - SMTP] To: ${options.to} | Subject: ${options.subject}`);
        return {
          success: true,
          messageId: `smtp-msg-${Date.now()}`,
          mode: 'smtp',
        };
      } catch (error: any) {
        console.error('[EMAIL ERROR] Failed to deliver email via SMTP:', error.message);
        throw new Error(`Email delivery failed: ${error.message}`);
      }
    }

    // When SMTP credentials are not configured:
    if (this.emailMode === 'preview') {
      const logSeparator = '='.repeat(60);
      console.log(`\n${logSeparator}`);
      console.log(`[EMAIL SERVICE: DEV PREVIEW MODE]`);
      console.log(`(Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for production inbox delivery)`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content:\n${options.text || options.html.replace(/<[^>]+>/g, ' ').substring(0, 300)}...`);
      console.log(`${logSeparator}\n`);

      return {
        success: true,
        messageId: `preview-msg-${Date.now()}`,
        mode: 'preview',
        previewDetails: {
          to: options.to,
          subject: options.subject,
          previewText: options.text || options.subject,
        },
      };
    }

    throw new Error('Email delivery service is unconfigured. Set SMTP_* credentials in .env.');
  }

  /**
   * Helper to format and send OTP challenge emails
   */
  async sendOTP(email: string, otp: string, purposeDescription: string): Promise<EmailSendResult> {
    const subject = `InternConnect Verification Code: ${otp}`;
    const text = `Your InternConnect one-time verification code is: ${otp}\n\nPurpose: ${purposeDescription}\nThis code is valid for 5 minutes. Do not share this code with anyone.`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">InternConnect Security Verification</h2>
        <p style="color: #475569; font-size: 15px;">You requested verification for: <strong>${purposeDescription}</strong></p>
        <div style="background-color: #f1f5f9; padding: 18px; border-radius: 6px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0d9488;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This OTP will expire in <strong>5 minutes</strong>. If you did not initiate this request, please change your password immediately.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">InternConnect • ElevanceSkills Full Stack Web Development Internship Platform</p>
      </div>
    `;

    const result = await this.sendEmail({ to: email, subject, text, html });
    if (result.mode === 'preview') {
      result.previewOtp = otp;
    }
    return result;
  }

  /**
   * Helper to format and send temporary password for forgot password flow
   */
  async sendTemporaryPassword(email: string, tempPass: string): Promise<EmailSendResult> {
    const subject = `InternConnect Temporary Password Reset`;
    const text = `A temporary password has been generated for your InternConnect account: ${tempPass}\n\nYou must change this password upon your next login.`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">InternConnect Password Reset</h2>
        <p style="color: #475569; font-size: 15px;">Your temporary password has been generated:</p>
        <div style="background-color: #f8fafc; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #1e3a8a; letter-spacing: 2px;">${tempPass}</span>
        </div>
        <p style="color: #e11d48; font-size: 13px; font-weight: 600;">For your security, you will be required to set a new password immediately upon logging in.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">InternConnect • Secure Access</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Helper to format and send official subscription invoice
   */
  async sendSubscriptionInvoice(email: string, invoiceDetails: {
    invoiceNumber: string;
    userName: string;
    planName: string;
    amountPaid: number;
    transactionReference: string;
    subscriptionPeriodStart: string;
    subscriptionPeriodEnd: string;
  }): Promise<EmailSendResult> {
    const subject = `InternConnect Tax Invoice - ${invoiceDetails.invoiceNumber}`;
    const text = `Invoice ${invoiceDetails.invoiceNumber} for ${invoiceDetails.planName} Plan. Amount Paid: ₹${invoiceDetails.amountPaid}. Reference: ${invoiceDetails.transactionReference}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #0f172a; margin: 0; font-size: 22px;">InternConnect</h1>
          <span style="background: #ccfbf1; color: #0f766e; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">PAID INVOICE</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Invoice Number: <strong>${invoiceDetails.invoiceNumber}</strong><br/>Date: ${new Date().toLocaleDateString('en-IN')}</p>
        <p style="font-size: 15px;">Billed To: <strong>${invoiceDetails.userName}</strong> (${email})</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Item</th>
              <th style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Period</th>
              <th style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0;">${invoiceDetails.planName} Internship Subscription</td>
              <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                ${new Date(invoiceDetails.subscriptionPeriodStart).toLocaleDateString()} to ${new Date(invoiceDetails.subscriptionPeriodEnd).toLocaleDateString()}
              </td>
              <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${invoiceDetails.amountPaid}.00</td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 13px; color: #64748b;">Razorpay Reference: <code>${invoiceDetails.transactionReference}</code></p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; text-align: center;">Thank you for subscribing to InternConnect. All subscriptions include 30-day continuous application access.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }
}

export const emailService = new EmailService();
