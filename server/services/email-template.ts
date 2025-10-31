// server/services/email-template.ts

export function getMeetingReminderEmail(booking: any, timeframe: "24h" | "1h") {
  const scheduledDate = new Date(booking.scheduledFor);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const timeframeText = timeframe === "24h" ? "tomorrow" : "in 1 hour";
  const urgencyColor = timeframe === "24h" ? "#3B82F6" : "#F59E0B";

  const subject =
    timeframe === "24h"
      ? `Reminder: Meeting Tomorrow at ${formattedTime}`
      : `⚠️ Meeting Starting Soon - ${formattedTime}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${urgencyColor} 0%, #667eea 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor}; }
        .detail-row { display: flex; margin: 12px 0; align-items: flex-start; }
        .detail-icon { margin-right: 12px; font-size: 20px; min-width: 24px; }
        .detail-text { font-size: 16px; flex: 1; }
        .detail-label { font-weight: bold; color: #1f2937; }
        .button { display: inline-block; padding: 14px 28px; background: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-radius: 0 0 8px 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
        .urgent-banner { background: #FEF3C7; border: 2px solid #F59E0B; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">📅 Meeting Reminder</h1>
          <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold;">Your meeting is ${timeframeText}!</p>
        </div>
        
        <div class="content">
          ${
            timeframe === "1h"
              ? `
          <div class="urgent-banner">
            <strong style="color: #92400e; font-size: 16px;">⏰ STARTING IN 1 HOUR</strong>
          </div>
          `
              : ""
          }
          
          <p style="font-size: 18px; margin-top: 0;">Hi ${
            booking.attendeeName
          },</p>
          
          <p style="font-size: 16px;">This is a ${
            timeframe === "24h" ? "friendly" : "final"
          } reminder about your upcoming meeting:</p>
          
          <div class="meeting-details">
            <div class="detail-row">
              <span class="detail-icon">📆</span>
              <span class="detail-text">
                <span class="detail-label">Date:</span> ${formattedDate}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏰</span>
              <span class="detail-text">
                <span class="detail-label">Time:</span> ${formattedTime}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <span class="detail-text">
                <span class="detail-label">Location:</span> ${
                  booking.location || "TBD"
                }
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">⏱️</span>
              <span class="detail-text">
                <span class="detail-label">Duration:</span> ${
                  booking.duration
                } minutes
              </span>
            </div>
            ${
              booking.meetingType
                ? `
            <div class="detail-row">
              <span class="detail-icon">📋</span>
              <span class="detail-text">
                <span class="detail-label">Type:</span> ${
                  booking.meetingType.charAt(0).toUpperCase() +
                  booking.meetingType.slice(1)
                }
              </span>
            </div>
            `
                : ""
            }
          </div>
          
          ${
            booking.notes
              ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <div class="detail-row" style="margin: 0;">
              <span class="detail-icon">📝</span>
              <div class="detail-text">
                <span class="detail-label">Notes:</span>
                <p style="margin: 5px 0 0 0;">${booking.notes}</p>
              </div>
            </div>
          </div>
          `
              : ""
          }
          
          <p style="font-size: 16px; margin-top: 24px; ${
            timeframe === "1h" ? "font-weight: bold;" : ""
          }">
            ${
              timeframe === "24h"
                ? "We're looking forward to meeting with you tomorrow!"
                : "See you in about an hour! Please make sure you're ready."
            }
          </p>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <strong>Need to reschedule or have questions?</strong><br>
            Simply reply to this email or contact us via WhatsApp.
          </p>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 10px 0;">This is an automated reminder from your booking system.</p>
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">© ${new Date().getFullYear()} Construction CRM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
📅 MEETING REMINDER

Hi ${booking.attendeeName},

Your meeting is ${timeframeText}!

📆 Date: ${formattedDate}
⏰ Time: ${formattedTime}
📍 Location: ${booking.location || "TBD"}
⏱️ Duration: ${booking.duration} minutes
${booking.meetingType ? `📋 Type: ${booking.meetingType}\n` : ""}
${booking.notes ? `\n📝 Notes: ${booking.notes}\n` : ""}

${
  timeframe === "24h"
    ? "We're looking forward to meeting with you tomorrow!"
    : "⚠️ STARTING IN 1 HOUR - Please make sure you're ready!"
}

Need to reschedule? Reply to this email or contact us via WhatsApp.
  `;

  return { subject, html, text };
}

export function getMeetingReminderWhatsApp(
  booking: any,
  timeframe: "24h" | "1h"
) {
  const scheduledDate = new Date(booking.scheduledFor);
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const timeframeText = timeframe === "24h" ? "tomorrow" : "in 1 hour";

  // Ultra-simple message
  return `Reminder: Your meeting is ${timeframeText} at ${formattedTime}. Location: ${booking.location || "TBD"}. Duration: ${booking.duration} min.`;
}