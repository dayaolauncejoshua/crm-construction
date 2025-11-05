// server/services/email.ts

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer'; // Keep for ICS generation

class EmailService {
  private isConfigured: boolean = false;
  private fromEmail: string = '';
  private fromName: string = '';

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.EMAIL_PASSWORD; // SendGrid API key
    const emailFrom = process.env.EMAIL_FROM;

    console.log("📧 [EMAIL SERVICE] Initializing SendGrid Web API");
    console.log("📧 API Key:", apiKey ? "✅ Set" : "❌ Missing");
    console.log("📧 From:", emailFrom);

    if (!apiKey) {
      console.error("❌ [EMAIL SERVICE] SendGrid API key not found in EMAIL_PASSWORD!");
      this.isConfigured = false;
      return;
    }

    if (!emailFrom) {
      console.error("❌ [EMAIL SERVICE] EMAIL_FROM not found!");
      this.isConfigured = false;
      return;
    }

    // Parse EMAIL_FROM to extract email and name
    const fromMatch = emailFrom.match(/"?([^"<]+)"?\s*<([^>]+)>/);
    if (fromMatch) {
      this.fromName = fromMatch[1].trim();
      this.fromEmail = fromMatch[2].trim();
    } else {
      this.fromEmail = emailFrom.trim();
      this.fromName = 'LeadFlow CRM';
    }

    console.log("📧 Parsed From:", { name: this.fromName, email: this.fromEmail });

    // Initialize SendGrid with API key
    sgMail.setApiKey(apiKey);
    this.isConfigured = true;

    console.log("✅ [EMAIL SERVICE] SendGrid Web API ready");
  }

  // Generate .ics calendar file
  generateICS(booking: {
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    organizerEmail: string;
    organizerName: string;
    attendeeEmail: string;
    attendeeName: string;
  }): string {
    const formatDate = (date: Date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Lead System//Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDate(booking.startTime)}
DTEND:${formatDate(booking.endTime)}
DTSTAMP:${formatDate(new Date())}
ORGANIZER;CN=${booking.organizerName}:MAILTO:${booking.organizerEmail}
UID:${Date.now()}@aileadsystem.com
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${
      booking.attendeeName
    }:MAILTO:${booking.attendeeEmail}
CREATED:${formatDate(new Date())}
DESCRIPTION:${booking.description}
LAST-MODIFIED:${formatDate(new Date())}
LOCATION:${booking.location}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${booking.title}
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
  }

  // Send calendar invite using SendGrid
  async sendCalendarInvite(params: {
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    icsContent: string;
    icsFilename: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      console.error("❌ [EMAIL SERVICE] Not configured, skipping calendar invite");
      return false;
    }

    try {
      console.log("📧 [EMAIL SERVICE] Sending calendar invite...");
      console.log("📧 To:", params.to);
      console.log("📧 Subject:", params.subject);

      // Convert ICS to base64 for SendGrid attachment
      const icsBase64 = Buffer.from(params.icsContent).toString('base64');

      const msg = {
        to: {
          email: params.to,
          name: params.toName,
        },
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: params.subject,
        html: params.htmlBody,
        attachments: [
          {
            content: icsBase64,
            filename: params.icsFilename,
            type: 'text/calendar',
            disposition: 'attachment',
          },
        ],
      };

      const response = await sgMail.send(msg);
      console.log("✅ Calendar invite sent to:", params.to);
      console.log("📧 Response status:", response[0].statusCode);
      
      return true;
    } catch (error: any) {
      console.error("❌ Failed to send calendar invite:", error);
      
      if (error.response) {
        console.error("❌ SendGrid API Error:", {
          statusCode: error.response.statusCode,
          body: error.response.body,
        });
      }
      
      return false;
    }
  }

  // Send regular email using SendGrid
  async sendEmail({
    to,
    toName,
    subject,
    htmlBody,
    textBody,
  }: {
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }) {
    if (!this.isConfigured) {
      console.error("❌ [EMAIL SERVICE] Not configured, skipping email");
      throw new Error("Email service not configured");
    }

    try {
      console.log("📧 [EMAIL SERVICE] Sending email...");
      console.log("📧 To:", to);
      console.log("📧 Subject:", subject);

      const msg = {
        to: {
          email: to,
          name: toName,
        },
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: subject,
        text: textBody || '',
        html: htmlBody,
      };

      console.log("📧 [EMAIL SERVICE] Calling SendGrid API...");
      
      const response = await sgMail.send(msg);

      console.log("✅ [EMAIL SERVICE] Email sent successfully!");
      console.log("📧 Response status:", response[0].statusCode);
      
      return response;
    } catch (error: any) {
      console.error("❌ [EMAIL SERVICE] Failed to send email:", error);
      
      if (error.response) {
        console.error("❌ SendGrid API Error:", {
          statusCode: error.response.statusCode,
          body: error.response.body,
          errors: error.response.body?.errors,
        });
      }
      
      throw error;
    }
  }

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletionEmail(params: {
    to: string;
    toName: string;
  }): Promise<boolean> {
    try {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Account Deleted</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hi ${params.toName},
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Your account has been permanently deleted from our system as per your request.
            </p>
            
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <h3 style="color: #7f1d1d; margin-top: 0; font-size: 18px;">⚠️ What's been deleted:</h3>
              <ul style="color: #991b1b; margin: 10px 0; padding-left: 20px;">
                <li>All personal information</li>
                <li>All clients and leads</li>
                <li>All conversations and messages</li>
                <li>All bookings and calendar data</li>
                <li>All analytics and reports</li>
                <li>Payment and subscription history</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              <strong>This action cannot be undone.</strong> If you deleted your account by mistake or wish to return, you'll need to create a new account from scratch.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">
                We're sorry to see you go. If you have any feedback about why you left, we'd love to hear from you at <a href="mailto:support@aileadsystem.com" style="color: #667eea;">support@aileadsystem.com</a>
              </p>
            </div>
            
            <p style="font-size: 16px; color: #374151; margin-top: 30px;">
              Thank you for using our service.
            </p>
            
            <p style="font-size: 16px; color: #374151;">
              Best regards,<br>
              <strong>The LeadFlow CRM Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `;

      const textBody = `
Hi ${params.toName},

Your account has been permanently deleted from our system as per your request.

What's been deleted:
- All personal information
- All clients and leads
- All conversations and messages
- All bookings and calendar data
- All analytics and reports
- Payment and subscription history

This action cannot be undone. If you deleted your account by mistake or wish to return, you'll need to create a new account from scratch.

We're sorry to see you go. If you have any feedback, please email us at support@aileadsystem.com

Best regards,
The LeadFlow CRM Team
      `;

      await this.sendEmail({
        to: params.to,
        toName: params.toName,
        subject: "Your Account Has Been Deleted",
        htmlBody,
        textBody,
      });

      console.log("✅ Account deletion email sent to:", params.to);
      return true;
    } catch (error) {
      console.error("❌ Failed to send account deletion email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();