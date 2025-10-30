// server/services/email.ts
import nodemailer from "nodemailer";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {

    // ✅ FIX: Add explicit host configuration
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || "587");
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

    console.log("📧 [EMAIL SERVICE] Initializing with:", {
      host: emailHost,
      port: emailPort,
      user: emailUser,
      secure: false,
    });

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
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

  // Send calendar invite
  async sendCalendarInvite(params: {
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    icsContent: string;
    icsFilename: string;
  }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: `${params.toName} <${params.to}>`,
        subject: params.subject,
        html: params.htmlBody,
        icalEvent: {
          filename: params.icsFilename,
          method: "request",
          content: params.icsContent,
        },
      });

      console.log("✅ Calendar invite sent to:", params.to);
      return true;
    } catch (error) {
      console.error("❌ Failed to send calendar invite:", error);
      return false;
    }
  }

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
    const mailOptions = {
      from: this.transporter.options.from || process.env.EMAIL_FROM,
      to: `${toName} <${to}>`,
      subject,
      html: htmlBody,
      text: textBody,
    };

    return await this.transporter.sendMail(mailOptions);
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
