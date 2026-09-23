/**
 * ============================================================================
 * Brevo (Sendinblue) Email Notification Service
 * ============================================================================
 * Description: Sends automated stock alert emails to all registered user accounts
 * using the official Brevo REST API v3.
 *
 * Requirements:
 * - BREVO_API_KEY set in .env
 * - BREVO_SENDER_EMAIL set in .env
 * ============================================================================
 */

import { ENV } from "../config/environment.js";
import { UserModel } from "../database/models/User.js";
import nodemailer from "nodemailer";

interface AlertPayload {
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: "LOW_STOCK" | "EXPIRING_SOON" | "EXPIRED" | "RECALL";
  medicineName?: string;
  currentStock?: number;
}

/**
 * Fetch registered Admin, Doctor, and Manager user email addresses dynamically.
 * Priority:
 * 1. Active Users with roles: ADMIN, DR, DOCTOR, MANAGER, INVENTORY_MANAGER
 * 2. Fallback to all active users if no specific role user exists
 * 3. Fallback to BREVO_SENDER_EMAIL configuration
 */
export async function getAdminRecipientEmails(): Promise<{ name: string; email: string }[]> {
  try {
    const targetUsers = await UserModel.find({
      role: { $in: ["ADMIN", "DR", "DOCTOR", "MANAGER", "INVENTORY_MANAGER"] },
      email: { $exists: true, $ne: "" },
    }).select("name email status role");

    const activeRecipients = targetUsers
      .filter((u) => u.status === "ACTIVE" || !u.status)
      .map((u) => ({
        name: u.name || `${u.role} Member`,
        email: u.email.trim(),
      }));

    if (activeRecipients.length > 0) {
      return activeRecipients;
    }

    // Fallback: Return all active users
    const allUsers = await UserModel.find({
      email: { $exists: true, $ne: "" },
    }).select("name email status");

    const activeUsers = allUsers
      .filter((u) => u.status === "ACTIVE" || !u.status)
      .map((u) => ({
        name: u.name || "Team Member",
        email: u.email.trim(),
      }));

    if (activeUsers.length > 0) {
      return activeUsers;
    }

    // Default fallback to BREVO_SENDER_EMAIL
    if (ENV.BREVO_SENDER_EMAIL) {
      return [{ name: "Admin", email: ENV.BREVO_SENDER_EMAIL }];
    }

    return [];
  } catch (error) {
    console.error("[EmailService] Failed to query alert recipient emails from database:", error);
    return [{ name: "Admin", email: ENV.BREVO_SENDER_EMAIL }];
  }
}

// Kept for backward compatibility
export const getAllRecipientEmails = getAdminRecipientEmails;

/**
 * Generate a professional HTML email template for stock alerts.
 */
function buildStockAlertHtml(alert: AlertPayload, recipientName: string): string {
  const isCritical = alert.severity === "CRITICAL";
  const badgeColor = isCritical ? "#dc2626" : alert.severity === "WARNING" ? "#d97706" : "#2563eb";
  const headerBg = isCritical ? "#7f1d1d" : "#1e293b";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: ${headerBg}; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .badge { display: inline-block; background-color: ${badgeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 8px; }
        .content { padding: 30px; }
        .greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }
        .alert-box { background-color: ${isCritical ? "#fef2f2" : "#fffbeb"}; border-left: 4px solid ${badgeColor}; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .alert-title { font-weight: bold; font-size: 16px; color: ${badgeColor}; margin-bottom: 6px; }
        .alert-msg { font-size: 14px; color: #475569; margin: 0; line-height: 1.5; }
        .footer { background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 Medical Inventory Alert</h1>
          <div class="badge">${alert.severity} ALERT</div>
        </div>
        <div class="content">
          <p class="greeting">Hello <strong>${recipientName}</strong>,</p>
          <p>An automated stock alert has been triggered in your Medical Inventory System:</p>
          <div class="alert-box">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-msg">${alert.message}</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Time triggered: <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong>
          </p>
        </div>
        <div class="footer">
          <p style="margin:0;">Medical Inventory & Pharmacy Management System | Automated System Notification</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send Stock Alert Email via SMTP or Brevo API v3
 */
export async function sendStockAlertToAllUsers(alert: AlertPayload): Promise<boolean> {
  try {
    const recipients = await getAdminRecipientEmails();

    if (recipients.length === 0) {
      console.warn("[EmailService] No recipient emails found in database to send alerts.");
      return false;
    }

    console.log(`[EmailService] Preparing stock alert email for ${recipients.length} admin recipient(s):`, recipients.map(r => r.email));
    const htmlContent = buildStockAlertHtml(alert, recipients[0]?.name || "Admin");

    // Option A: Use Nodemailer SMTP if SMTP_HOST is configured in .env
    if (ENV.SMTP_HOST && ENV.SMTP_USER) {
      try {
        console.log(`[EmailService] Attempting email dispatch via SMTP host ${ENV.SMTP_HOST}...`);
        const transporter = nodemailer.createTransport({
          service: ENV.SMTP_HOST.includes("gmail") ? "gmail" : undefined,
          host: ENV.SMTP_HOST,
          port: ENV.SMTP_PORT || 587,
          secure: ENV.SMTP_PORT === 465,
          auth: {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS.replace(/\s+/g, ""),
          },
        });

        const info = await transporter.sendMail({
          from: `"${ENV.BREVO_SENDER_NAME}" <${ENV.BREVO_SENDER_EMAIL}>`,
          to: recipients.map((r) => r.email).join(", "),
          subject: `[${alert.severity}] ${alert.title}`,
          html: htmlContent,
        });

        console.log("[EmailService] ✅ Alert email sent successfully via SMTP. Message ID:", info.messageId);
        return true;
      } catch (smtpErr: any) {
        console.warn("[EmailService] ⚠️ SMTP Dispatch failed:", smtpErr.message, "| Falling back to Brevo REST API...");
      }
    }

    // Option B: Brevo REST API v3
    if (!ENV.BREVO_API_KEY) {
      console.warn("[EmailService] BREVO_API_KEY is missing in .env. Skipping email dispatch.");
      return false;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": ENV.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: ENV.BREVO_SENDER_NAME,
          email: ENV.BREVO_SENDER_EMAIL,
        },
        to: recipients,
        subject: `[${alert.severity}] ${alert.title}`,
        htmlContent,
      }),
    });

    const responseData: any = await response.json();

    if (response.ok) {
      console.log("[EmailService] ✅ Alert email sent successfully via Brevo REST API. Message ID:", responseData.messageId);
      return true;
    } else {
      console.error("[EmailService] ❌ Brevo API Error:", responseData);
      if (responseData?.code === "unauthorized" || responseData?.message?.includes("IP")) {
        console.warn("[EmailService] ⚠️ Brevo Security Restriction: Your IP is not authorized in Brevo Dashboard. Please authorize IP at: https://app.brevo.com/security/authorised_ips");
      }
      return false;
    }
  } catch (error) {
    console.error("[EmailService] Failed to send stock alert email:", error);
    return false;
  }
}
