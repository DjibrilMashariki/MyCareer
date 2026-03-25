/**
 * Email service using Nodemailer.
 * Sends transactional emails on key events.
 * Gracefully no-ops when SMTP is not configured (demo mode).
 */

import nodemailer from "nodemailer";

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "MyCareer <noreply@mycareer.app>";

let transporter: nodemailer.Transporter | null = null;

/**
 * Check if SMTP is configured.
 */
export function isEmailConfigured(): boolean {
    return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

/**
 * Initialize the email transporter.
 */
function getTransporter(): nodemailer.Transporter | null {
    if (!isEmailConfigured()) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }

    return transporter;
}

/**
 * Send an email. No-ops if SMTP is not configured.
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<boolean> {
    const transport = getTransporter();
    if (!transport) {
        console.log(`📧 [Email skipped - SMTP not configured] To: ${to}, Subject: ${subject}`);
        return false;
    }

    try {
        await transport.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent to ${to}: ${subject}`);
        return true;
    } catch (error) {
        console.error(`📧 Failed to send email to ${to}:`, error);
        return false;
    }
}

/**
 * Send a status change notification email.
 */
export async function sendStatusChangeEmail(
    to: string,
    studentName: string,
    status: string,
    resumeId: string
): Promise<boolean> {
    const statusLabel = status === "approved" ? "Approved ✅" :
        status === "changes_required" ? "Changes Requested ✏️" :
            status.charAt(0).toUpperCase() + status.slice(1);

    const html = emailTemplate(
        `Resume ${statusLabel}`,
        `<p>Hi ${studentName},</p>
    <p>Your resume has been <strong>${statusLabel}</strong>.</p>
    ${status === "approved"
            ? "<p>Congratulations! Your resume has been reviewed and approved. You're all set!</p>"
            : status === "changes_required"
                ? "<p>Your reviewer has requested some changes. Please log in to view the feedback and update your resume.</p>"
                : ""}
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:8080"}/student"
         style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Resume
      </a>
    </p>`,
        resumeId
    );

    return sendEmail(to, `Resume ${statusLabel}`, html);
}

/**
 * Send a new assignment notification email.
 */
export async function sendAssignmentEmail(
    to: string,
    staffName: string,
    resumeId: string
): Promise<boolean> {
    const html = emailTemplate(
        "New Resume Assigned",
        `<p>Hi ${staffName},</p>
    <p>A new resume has been assigned to you for review.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:8080"}/staff"
         style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Review Resume
      </a>
    </p>`,
        resumeId
    );

    return sendEmail(to, "New Resume Assigned to You", html);
}

/**
 * Send a feedback notification email.
 */
export async function sendFeedbackEmail(
    to: string,
    studentName: string,
    staffName: string,
    resumeId: string
): Promise<boolean> {
    const html = emailTemplate(
        "New Feedback on Your Resume",
        `<p>Hi ${studentName},</p>
    <p><strong>${staffName}</strong> left feedback on your resume.</p>
    <p>Log in to view the feedback and make any necessary updates.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:8080"}/student"
         style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Feedback
      </a>
    </p>`,
        resumeId
    );

    return sendEmail(to, "New Feedback on Your Resume", html);
}

/**
 * Base email template wrapper.
 */
function emailTemplate(title: string, body: string, resumeId?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">
        🎓 MyCareer
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 18px;">
        ${title}
      </h2>
      <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
        ${body}
      </div>
      ${resumeId ? `<p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Resume ID: ${resumeId}</p>` : ""}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        This is an automated notification from MyCareer Resume Review Platform.
      </p>
    </div>
  </div>
</body>
</html>`;
}
