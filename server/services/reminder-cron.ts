// 

import { storage } from "../storage";
import { sendMeetingReminder } from "./reminder-service";

// Add this type definition at the top
type BookingWithReminders = {
  id: string;
  leadId: string;
  clientId: string;
  title: string;
  scheduledFor: Date;
  status: string;
  duration: number | null;
  reminder24hSent?: boolean;
  reminder1hSent?: boolean;
  reminder24hSentAt?: Date | null;
  reminder1hSentAt?: Date | null;
  attendeeEmail?: string | null;
  attendeeName?: string | null;
  attendeePhone?: string | null;
  location?: string | null;
  notes?: string | null;
  meetingType?: string | null;
};

let broadcastUpdateFn: ((data: any) => void) | null = null;

export function setBroadcastFunction(fn: (data: any) => void) {
  broadcastUpdateFn = fn;
}

export async function checkAndSendReminders() {
  try {
    console.log("🔔 Checking for meetings needing reminders...");

    const now = new Date();

    // ✅ ADD: Test database connection first
    try {
      const clients = await storage.getAllClients();
      
      // If clients is empty or undefined, skip
      if (!clients || clients.length === 0) {
        console.log("ℹ️ No clients found, skipping reminder check");
        return;
      }

      let reminders24hCount = 0;
      let reminders1hCount = 0;

      for (const client of clients) {
        try {
          const bookings = await storage.getBookings(client.id);

          for (const booking of bookings) {
            // Skip if not scheduled
            if (booking.status !== "scheduled") continue;

            const meetingTime = new Date(booking.scheduledFor);
            const hoursUntilMeeting =
              (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

            // Send 24-hour reminder
            if (
              hoursUntilMeeting >= 23.75 &&
              hoursUntilMeeting <= 24.25 &&
              !booking.reminder24hSent
            ) {
              console.log(`📧 Sending 24h reminder for booking ${booking.id}`);
              const result = await sendMeetingReminder(booking, "24h");

              if (result.success) {
                await storage.updateBooking(booking.id, {
                  reminder24hSent: true,
                  reminder24hSentAt: new Date(),
                });
                reminders24hCount++;
              }
            }

            // Send 1-hour reminder
            if (
              hoursUntilMeeting >= 0.75 &&
              hoursUntilMeeting <= 1.25 &&
              !booking.reminder1hSent
            ) {
              console.log(`📧 Sending 1h reminder for booking ${booking.id}`);
              const result = await sendMeetingReminder(booking, "1h");

              if (result.success) {
                await storage.updateBooking(booking.id, {
                  reminder1hSent: true,
                  reminder1hSentAt: new Date(),
                });
                reminders1hCount++;
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error processing client ${client.id}:`, error);
        }
      }

      if (reminders24hCount > 0 || reminders1hCount > 0) {
        console.log(
          `✅ Sent ${reminders24hCount} x 24h reminders, ${reminders1hCount} x 1h reminders`
        );
      } else {
        console.log("✅ No reminders needed at this time");
      }
    } catch (dbError: any) {
      // ✅ NEW: Handle database connection errors
      if (dbError.code === 'ENOTFOUND' || dbError.message?.includes('ENOTFOUND')) {
        console.error("⚠️ Database connection failed - database may be suspended or network issue");
        console.error("💡 If using Neon free tier, database suspends after 5 minutes of inactivity");
        console.error("💡 Visit https://console.neon.tech to wake it up");
        return; // Don't crash, just skip this check
      }
      throw dbError; // Re-throw other errors
    }
  } catch (error) {
    console.error("❌ Error in reminder cron:", error);
    // Don't crash the entire app
  }
}

// Run every 15 minutes
export function startReminderCron() {
  console.log("🚀 Starting reminder cron job (every 15 minutes)");

  // Run immediately on startup (with error handling)
  checkAndSendReminders().catch(err => {
    console.error("❌ Initial reminder check failed:", err.message);
  });

  // Then run every 15 minutes
  setInterval(() => {
    checkAndSendReminders().catch(err => {
      console.error("❌ Reminder check failed:", err.message);
    });
  }, 15 * 60 * 1000);
}