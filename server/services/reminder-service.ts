import { emailService } from "./email";
import { whatsappService } from "./whatsapp";
import {
  getMeetingReminderEmail,
  getMeetingReminderWhatsApp,
} from "./email-template";
import { storage } from "../storage";

export async function sendMeetingReminder(
  booking: any,
  timeframe: "24h" | "1h",
  broadcastUpdate?: (data: any) => void
) {
  try {
    console.log(`📧 Sending ${timeframe} reminder for booking:`, booking.id);

    let emailSent = false;
    let whatsappSent = false;

    // Send Email
    if (booking.attendeeEmail) {
      try {
        const emailContent = getMeetingReminderEmail(booking, timeframe);

        await emailService.sendEmail({
          to: booking.attendeeEmail,
          toName: booking.attendeeName,
          subject: emailContent.subject,
          htmlBody: emailContent.html,
          textBody: emailContent.text,
        });

        emailSent = true;
        console.log(`✅ Email reminder sent to ${booking.attendeeEmail}`);
      } catch (error) {
        console.error(`❌ Failed to send email reminder:`, error);
      }
    }

    // Send WhatsApp
    if (booking.attendeePhone) {
      try {
        const whatsappMessage = getMeetingReminderWhatsApp(booking, timeframe);

        await whatsappService.sendTextMessage(
          booking.attendeePhone,
          whatsappMessage
        );

        whatsappSent = true;
        console.log(`✅ WhatsApp reminder sent to ${booking.attendeePhone}`);
      } catch (error) {
        console.error(`❌ Failed to send WhatsApp reminder:`, error);
      }
    }

    // Save reminder message to conversation
    if (emailSent || whatsappSent) {
      try {
        const conversations = await storage.getConversations(
          booking.clientId,
          100
        );
        const conversation = conversations.find(
          (c) => c.leadId === booking.leadId
        );

        if (conversation) {
          const scheduledDate = new Date(booking.scheduledFor);
          const formattedDate = scheduledDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const reminderEmoji = timeframe === "24h" ? "🔔" : "⚠️";
          const reminderText =
            timeframe === "24h" ? "24-Hour Reminder" : "1-Hour Reminder";

          const messageContent =
            `${reminderEmoji} ${reminderText} Sent\n\n` +
            `Meeting: ${booking.title}\n` +
            `Date: ${formattedDate}\n` +
            `Time: ${formattedTime}\n` +
            `Duration: ${booking.duration} minutes\n` +
            `Location: ${booking.location || "TBD"}\n\n` +
            `Reminder sent via ${emailSent ? "email" : ""}${emailSent && whatsappSent ? " and " : ""}${whatsappSent ? "WhatsApp" : ""}`;

          const message = await storage.createMessage({
            conversationId: conversation.id,
            sender: "human",
            content: messageContent,
            channel: "whatsapp",
            isStatusMessage: true,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });

          console.log(`✅ Reminder message saved to conversation`);

          // Broadcast update if function is provided
          if (broadcastUpdate) {
            broadcastUpdate({
              type: "new_message",
              conversationId: conversation.id,
              message: message,
            });
          }
        } else {
          console.log(`⚠️ No conversation found for leadId: ${booking.leadId}`);
        }
      } catch (error) {
        console.error("❌ Failed to save reminder message:", error);
      }
    }

    return {
      success: emailSent || whatsappSent,
      emailSent,
      whatsappSent,
    };
  } catch (error) {
    console.error(`❌ Error sending ${timeframe} reminder:`, error);
    return { success: false, error };
  }
}