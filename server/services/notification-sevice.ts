//server/services/notification-service.ts

import { emailService } from "./email";
import { whatsappService } from "./whatsapp";
import { storage } from "../storage";

interface HotLeadNotification {
  userId: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    qualificationScore: string;
    temperature: string;
  };
  conversation: {
    id: number | string;
    qualificationScore: string;
  };
  qualification: {
    score: number;
    reasoning: string;
  };
}

interface BookingNotification {
  userId: string;
  booking: {
    id: number | string;
    title: string;
    scheduledFor: Date;
    location: string;
    attendeeName: string;
    attendeePhone: string;
    attendeeEmail: string;
    meetingType: string;
    aiConfidence: string;
  };
  lead: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
  };
}


class NotificationService {
  /**
   * Send hot lead alert notifications
   */
  async sendHotLeadAlert(data: HotLeadNotification): Promise<void> {
    try {
      console.log(`\n🔥 ========== HOT LEAD ALERT ==========`);
      console.log(`   User ID: ${data.userId}`);
      console.log(`   Lead: ${data.lead.firstName} ${data.lead.lastName}`);
      console.log(`   Score: ${data.qualification.score}`);
      console.log(`   Temperature: ${data.lead.temperature}`);

      // Get user and preferences
      const user = await storage.getUserById(data.userId);
      
      if (!user) {
        console.error(`❌ User ${data.userId} not found - CANNOT SEND NOTIFICATIONS`);
        return;
      }

      console.log(`✅ User found: ${user.email}`);
      console.log(`   Email notifications: ${user.emailNotifications}`);
      console.log(`   WhatsApp notifications: ${user.whatsappNotifications}`);
      console.log(`   Lead notifications: ${user.leadNotifications}`);

      // Check if lead notifications are enabled
      if (user.leadNotifications === false) {
        console.log(`⏭️ Lead notifications disabled for user ${data.userId}`);
        return;
      }

      console.log(`✅ Lead notifications enabled for user ${data.userId}`);

      const { lead, qualification } = data;

      // ============================================
      // EMAIL NOTIFICATION
      // ============================================
      if (user.emailNotifications && user.email) {
        try {
          console.log(`📧 Attempting to send email to: ${user.email}`);
          
          const emailSubject = `🔥 Hot Lead Alert: ${lead.firstName} ${lead.lastName}`;
          const emailBody = this.generateHotLeadEmailHTML(user, lead, qualification);
          const textBody = this.generateHotLeadEmailText(user, lead, qualification);

          await emailService.sendEmail({
            to: user.email,
            toName: `${user.firstName} ${user.lastName}`,
            subject: emailSubject,
            htmlBody: emailBody,
            textBody: textBody,
          });

          console.log(`✅ Hot lead email SENT to: ${user.email}`);
        } catch (emailError: any) {
          console.error(`❌ Failed to send hot lead email:`, emailError.message);
          console.error(`   Full error:`, emailError);
        }
      } else {
        console.log(`⏭️ Email notifications disabled or no email (emailNotifications: ${user.emailNotifications}, email: ${user.email})`);
      }

      // ============================================
      // WHATSAPP NOTIFICATION
      // ============================================
      if ((user.whatsappNotifications ?? true) && user.phone) {
        try {
          console.log(`📱 Attempting to send WhatsApp to: ${user.phone}`);
          
          const whatsappMessage = this.generateHotLeadWhatsAppMessage(user, lead, qualification);

          const result = await whatsappService.sendTextMessage(user.phone, whatsappMessage);

          if (result.success) {
            console.log(`✅ Hot lead WhatsApp SENT to: ${user.phone}`);
          } else {
            console.error(`❌ Hot lead WhatsApp FAILED for: ${user.phone}`);
            console.error(`   Reason:`, result.error);
          }
        } catch (whatsappError: any) {
          console.error(`❌ Failed to send hot lead WhatsApp:`, whatsappError.message);
          console.error(`   Full error:`, whatsappError);
        }
      } else {
        console.log(`⏭️ WhatsApp notifications disabled or no phone (whatsappNotifications: ${user.whatsappNotifications}, phone: ${user.phone})`);
      }

      console.log(`✅ Hot lead notifications complete for user ${data.userId}`);
      console.log(`==========================================\n`);
    } catch (error: any) {
      console.error(`❌ CRITICAL ERROR in sendHotLeadAlert:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
  }

  /**
   * Send booking alert notifications
   */
  async sendBookingAlert(data: BookingNotification): Promise<void> {
    try {
      console.log(`\n📅 ========== BOOKING ALERT ==========`);
      console.log(`   User ID: ${data.userId}`);
      console.log(`   Lead: ${data.lead.firstName} ${data.lead.lastName}`);
      console.log(`   Meeting Type: ${data.booking.meetingType}`);

      // Get user and preferences
      const user = await storage.getUserById(data.userId);
      
      if (!user) {
        console.error(`❌ User ${data.userId} not found - CANNOT SEND NOTIFICATIONS`);
        return;
      }

      console.log(`✅ User found: ${user.email}`);
      console.log(`   Booking notifications: ${user.bookingNotifications}`);

      // Check if booking notifications are enabled
      if (user.bookingNotifications === false) {
        console.log(`⏭️ Booking notifications DISABLED for user ${data.userId}`);
        return;
      }

      const { booking, lead } = data;

      // ============================================
      // EMAIL NOTIFICATION
      // ============================================
      if (user.emailNotifications && user.email) {
        try {
          console.log(`📧 Attempting to send email to: ${user.email}`);
          
          const emailSubject = `📅 New Booking Proposed: ${lead.firstName} ${lead.lastName}`;
          const emailBody = this.generateBookingEmailHTML(user, booking, lead);
          const textBody = this.generateBookingEmailText(user, booking, lead);

          await emailService.sendEmail({
            to: user.email,
            toName: `${user.firstName} ${user.lastName}`,
            subject: emailSubject,
            htmlBody: emailBody,
            textBody: textBody,
          });

          console.log(`✅ Booking email SENT to: ${user.email}`);
        } catch (emailError: any) {
          console.error(`❌ Failed to send booking email:`, emailError.message);
          console.error(`   Full error:`, emailError);
        }
      } else {
        console.log(`⏭️ Email notifications disabled or no email`);
      }

      // ============================================
      // WHATSAPP NOTIFICATION
      // ============================================
      if ((user.whatsappNotifications ?? true) && user.phone) {
        try {
          console.log(`📱 Attempting to send WhatsApp to: ${user.phone}`);
          
          const whatsappMessage = this.generateBookingWhatsAppMessage(user, booking, lead);

          const result = await whatsappService.sendTextMessage(user.phone, whatsappMessage);

          if (result.success) {
            console.log(`✅ Booking WhatsApp SENT to: ${user.phone}`);
          } else {
            console.error(`❌ Booking WhatsApp FAILED for: ${user.phone}`);
          }
        } catch (whatsappError: any) {
          console.error(`❌ Failed to send booking WhatsApp:`, whatsappError.message);
        }
      } else {
        console.log(`⏭️ WhatsApp notifications disabled or no phone`);
      }

      console.log(`✅ Booking notifications complete for user ${data.userId}`);
      console.log(`==========================================\n`);
    } catch (error: any) {
      console.error(`❌ CRITICAL ERROR in sendBookingAlert:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
  }

  // ============================================
  // EMAIL TEMPLATE GENERATORS
  // ============================================

  private generateHotLeadEmailHTML(
    user: any,
    lead: any,
    qualification: any
  ): string {
    const appUrl = process.env.FRONTEND_URL || "http://localhost:5000";

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔥 Hot Lead Alert!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${user.firstName},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            You've received a <strong style="color: #dc2626;">high-priority lead</strong> that needs your immediate attention!
          </p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #7f1d1d; margin-top: 0; font-size: 18px;">Lead Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">👤 Name:</td>
                <td style="padding: 8px 0; color: #450a0a;">${lead.firstName} ${
      lead.lastName
    }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">📧 Email:</td>
                <td style="padding: 8px 0; color: #450a0a;">${lead.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">📱 Phone:</td>
                <td style="padding: 8px 0; color: #450a0a;">${lead.phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">🏢 Company:</td>
                <td style="padding: 8px 0; color: #450a0a;">${lead.company}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">🔥 Priority:</td>
                <td style="padding: 8px 0; color: #450a0a;"><strong style="color: #dc2626;">${lead.temperature.toUpperCase()}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">📊 Score:</td>
                <td style="padding: 8px 0; color: #450a0a;">${(
                  parseFloat(lead.qualificationScore) * 100
                ).toFixed(0)}%</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
              <strong style="color: #374151;">AI Analysis:</strong><br>
              ${qualification.reasoning}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/conversations" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Lead in CRM →
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            ⏱️ <strong>Respond within 5 minutes</strong> to maximize conversion rate
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>This is an automated alert. You can manage your notification preferences in Settings.</p>
        </div>
      </div>
    `;
  }

  private generateHotLeadEmailText(
    user: any,
    lead: any,
    qualification: any
  ): string {
    return `
Hi ${user.firstName},

🔥 HOT LEAD ALERT! 🔥

You've received a high-priority lead that needs your immediate attention!

Lead Details:
━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${lead.firstName} ${lead.lastName}
📧 Email: ${lead.email}
📱 Phone: ${lead.phone}
🏢 Company: ${lead.company}
🔥 Priority: ${lead.temperature.toUpperCase()}
📊 Score: ${(parseFloat(lead.qualificationScore) * 100).toFixed(0)}%

AI Analysis:
${qualification.reasoning}

━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ Respond within 5 minutes to maximize conversion rate

View in CRM: ${
      process.env.FRONTEND_URL || "http://localhost:5000"
    }/conversations

Best regards,
LeadFlow CRM
    `;
  }

  private generateBookingEmailHTML(user: any, booking: any, lead: any): string {
    const appUrl = process.env.FRONTEND_URL || "http://localhost:5000";
    const scheduledDate = new Date(booking.scheduledFor).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Vancouver",
      }
    );
    const scheduledTime = new Date(booking.scheduledFor).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Vancouver",
      }
    );

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📅 New Booking Proposed</h1>
        </div>
        
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${user.firstName},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            AI has proposed a <strong>${
              booking.meetingType === "site-visit"
                ? "site visit"
                : "consultation"
            }</strong> with your client.
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #1e3a8a; margin-top: 0; font-size: 18px;">Booking Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">👤 Client:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${lead.firstName} ${
      lead.lastName
    }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">🏢 Company:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${lead.company}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">📅 Date:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${scheduledDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">⏰ Time:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${scheduledTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">📍 Location:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${
                  booking.location
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">📧 Email:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${
                  booking.attendeeEmail
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">📱 Phone:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${
                  booking.attendeePhone
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">🤖 AI Confidence:</td>
                <td style="padding: 8px 0; color: #1e3a8a;">${(
                  parseFloat(booking.aiConfidence) * 100
                ).toFixed(0)}%</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/calendar" style="display: inline-block; background: #22c55e; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">
              ✓ Approve Booking
            </a>
            <a href="${appUrl}/calendar" style="display: inline-block; background: #6b7280; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Calendar
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            💡 <strong>Review and approve</strong> this booking to send a calendar invite to the client
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>This is an automated alert. You can manage your notification preferences in Settings.</p>
        </div>
      </div>
    `;
  }

  private generateBookingEmailText(user: any, booking: any, lead: any): string {
    const scheduledDate = new Date(booking.scheduledFor).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "America/Vancouver",
      }
    );
    const scheduledTime = new Date(booking.scheduledFor).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Vancouver",
      }
    );

    return `
Hi ${user.firstName},

📅 NEW BOOKING PROPOSED

AI has proposed a ${
      booking.meetingType === "site-visit" ? "site visit" : "consultation"
    } with your client.

Booking Details:
━━━━━━━━━━━━━━━━━━━━━━━━
👤 Client: ${lead.firstName} ${lead.lastName}
🏢 Company: ${lead.company}
📅 Date: ${scheduledDate}
⏰ Time: ${scheduledTime}
📍 Location: ${booking.location}
📧 Email: ${booking.attendeeEmail}
📱 Phone: ${booking.attendeePhone}
🤖 AI Confidence: ${(parseFloat(booking.aiConfidence) * 100).toFixed(0)}%

━━━━━━━━━━━━━━━━━━━━━━━━

💡 Review and approve this booking to send a calendar invite to the client

View Calendar: ${process.env.FRONTEND_URL || "http://localhost:5000"}/calendar

Best regards,
LeadFlow CRM
    `;
  }

  // ============================================
  // WHATSAPP MESSAGE GENERATORS
  // ============================================

  private generateHotLeadWhatsAppMessage(
    user: any,
    lead: any,
    qualification: any
  ): string {
    return `🔥 *Hot Lead Alert!*

👤 *${lead.firstName} ${lead.lastName}*
🏢 ${lead.company}
📱 ${lead.phone}
📊 Score: ${(parseFloat(lead.qualificationScore) * 100).toFixed(0)}%

_${qualification.reasoning}_

⏱️ Respond within 5 minutes!

View in CRM: ${
      process.env.FRONTEND_URL || "http://localhost:5000"
    }/conversations`;
  }

  private generateBookingWhatsAppMessage(
    user: any,
    booking: any,
    lead: any
  ): string {
    const scheduledDate = new Date(booking.scheduledFor).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Vancouver",
      }
    );
    const scheduledTime = new Date(booking.scheduledFor).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Vancouver",
      }
    );

    return `📅 *New Booking Proposed*

👤 *${lead.firstName} ${lead.lastName}*
🏢 ${lead.company}
📅 ${scheduledDate} at ${scheduledTime}
📍 ${booking.location}
🤖 AI Confidence: ${(parseFloat(booking.aiConfidence) * 100).toFixed(0)}%

_Review and approve in calendar_

View: ${process.env.FRONTEND_URL || "http://localhost:5000"}/calendar`;
  }
}

export const notificationService = new NotificationService();
