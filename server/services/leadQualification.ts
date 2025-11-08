// server/services/leadQualification.ts
import { messageQueue } from "./messageQueue";
import { storage } from "../storage";
import { qualifyLead, generateAIResponse } from "./openai";
import { whatsappService } from "./whatsapp";
import { WebSocketServer } from "ws";
import { spamPatternLearning } from "./spamPatternLearning";
import { detectBookingIntent, extractLeadDetails } from "./openai";
import type { InsertBooking } from "../../shared/schema";
import { notificationService } from "./notification-sevice";
import { time } from "console";
// ✅ Constants
const BOOKING_CONFIDENCE_THRESHOLD = 0.8;
const BOOKING_INTEREST_THRESHOLD = 0.5;

// ✅ Booking detail validation interface
interface BookingDetails {
  hasDate: boolean;
  hasTime: boolean;
  hasAddress: boolean;
  hasName: boolean;
  hasEmail: boolean;
  missingDetails: string[];
}

// ✅ IMPROVED: Better time normalization
function normalizeTimeString(timeStr: string): string {
  if (!timeStr) {
    console.log("⚠️ No time provided, defaulting to 10:00 AM");
    return "10:00 AM";
  }

  const upperTime = timeStr.toUpperCase().trim();
  console.log(`🕐 Normalizing time: "${timeStr}" → "${upperTime}"`);

  // Handle formats: "9AM", "9 AM", "2PM", "2:00PM", "2:00 PM", "14:00"
  const match = upperTime.match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)?/);

  if (!match) {
    console.warn(
      `⚠️ Could not parse time "${timeStr}", using default 10:00 AM`
    );
    return "10:00 AM";
  }

  let hours = parseInt(match[1]);
  const minutes = match[2] || "00";
  let period = match[3]; // Will be "AM" or "PM" or undefined

  console.log(
    `🕐 Parsed components: hours=${hours}, minutes=${minutes}, period=${period}`
  );

  // Handle 24-hour format (if no AM/PM specified)
  if (!period) {
    console.log(`🕐 No AM/PM found, treating as 24-hour format`);
    if (hours >= 12) {
      period = "PM";
      if (hours > 12) hours -= 12;
    } else {
      period = "AM";
      if (hours === 0) hours = 12;
    }
    console.log(`🕐 Converted to 12-hour: ${hours} ${period}`);
  }

  // Validate
  if (hours < 1 || hours > 12) {
    console.warn(
      `⚠️ Invalid hour "${hours}" after conversion, using default 10:00 AM`
    );
    return "10:00 AM";
  }

  const normalized = `${hours}:${minutes} ${period}`;
  console.log(`✅ Normalized time result: "${normalized}"`);
  return normalized;
}

// ✅ Robust date parser with TIMEZONE-AWARE handling
function parseDateFromNaturalLanguage(
  dateStr: string,
  timeStr: string
): Date | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Normalize time with validation
  const normalizedTime = timeStr ? normalizeTimeString(timeStr) : "10:00 AM";

  console.log(`📅 Parsing date: "${dateStr}" with time: "${normalizedTime}"`);

  // ✅ Parse time components FIRST
  const timeMatch = normalizedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) {
    console.error(`❌ Invalid time format: "${normalizedTime}"`);
    return null;
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  console.log(
    `⏰ Parsed time: ${hours}:${String(minutes).padStart(2, "0")} (24h format)`
  );

  const lowerDate = dateStr.toLowerCase().trim();

  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  // ✅ NEW: Handle relative dates (today, tomorrow, next week)
  if (lowerDate === "today") {
    const targetDate = new Date(now);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");

    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);

    console.log(`✅ "Today" parsed: ${pacificDate.toISOString()}`);
    console.log(
      `   Pacific Time: ${pacificDate.toLocaleString("en-US", {
        timeZone: "America/Vancouver",
      })}`
    );
    return pacificDate;
  }

  if (lowerDate === "tomorrow") {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");

    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);

    console.log(`✅ "Tomorrow" parsed: ${pacificDate.toISOString()}`);
    console.log(
      `   Pacific Time: ${pacificDate.toLocaleString("en-US", {
        timeZone: "America/Vancouver",
      })}`
    );
    return pacificDate;
  }

  // Handle "next week", "this week"
  if (lowerDate.includes("next week") || lowerDate.includes("this week")) {
    const daysToAdd = lowerDate.includes("next week") ? 7 : 0;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);

    // Default to next Monday if "next week" without specific day
    if (!lowerDate.includes("monday") && !lowerDate.includes("tuesday")) {
      const currentDay = targetDate.getDay();
      const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay;
      targetDate.setDate(targetDate.getDate() + daysUntilMonday);
    }

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");

    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);

    console.log(`✅ "${lowerDate}" parsed: ${pacificDate.toISOString()}`);
    return pacificDate;
  }

  // ✅ NEW: Handle "next [DayName]" and "this [DayName]"
  // Examples: "next Monday", "this Friday", "next Tuesday"
  const nextDayPattern =
    /^(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
  const nextDayMatch = lowerDate.match(nextDayPattern);

  if (nextDayMatch) {
    console.log(`🔍 Parsing "${lowerDate}" with pattern "next/this [Day]"`);
    const modifier = nextDayMatch[1].toLowerCase(); // "next" or "this"
    const dayName = nextDayMatch[2].toLowerCase(); // "monday", "friday", etc.
    console.log(`   Modifier: "${modifier}", Day: "${dayName}"`);

    const targetDayIndex = dayNames.indexOf(dayName);
    const currentDay = now.getDay();

    let daysUntil = targetDayIndex - currentDay;

    if (modifier === "next") {
      // "next Monday" means next week's Monday
      if (daysUntil <= 0) {
        daysUntil += 7; // Jump to next week
      } else {
        // If target day is later this week, still go to next week
        daysUntil += 7;
      }
    } else {
      // "this Monday" means this week's Monday
      if (daysUntil < 0) {
        daysUntil += 7; // If day already passed, go to next week
      }
      // If today is the target day (daysUntil === 0), use today
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntil);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");

    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);

    console.log(`✅ "${lowerDate}" parsed: ${pacificDate.toISOString()}`);
    console.log(
      `   Pacific Time: ${pacificDate.toLocaleString("en-US", {
        timeZone: "America/Vancouver",
      })}`
    );
    console.log(`✅ "${lowerDate}" parsed successfully`);
    console.log(`   Days until target: ${daysUntil}`);
    console.log(`   Target date: ${pacificDate.toISOString()}`);
    console.log(`   Current date: ${now.toISOString()}`);
    return pacificDate;
  }

  // Handle day names (Monday, Tuesday, etc)
  if (dayNames.includes(lowerDate)) {
    const targetDay = dayNames.indexOf(lowerDate);
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;

    if (daysUntil <= 0) {
      daysUntil += 7;
    }

    // ✅ FIX: Create date in Pacific timezone (UTC-8 in winter, UTC-7 in summer)
    // Calculate the date
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntil);

    // Create ISO string for Pacific timezone
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");

    // Use -08:00 offset for Pacific Standard Time (adjust for DST if needed)
    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);

    console.log(`✅ Day name parsed: ${pacificDate.toISOString()}`);
    console.log(
      `   Pacific Time: ${pacificDate.toLocaleString("en-US", {
        timeZone: "America/Vancouver",
      })}`
    );
    return pacificDate;
  }

  // Handle full date strings with explicit month parsing
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthAbbr = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  // Try to extract month and day
  let month = -1;
  let day = -1;

  // Pattern: "November 9" or "Nov 9" or "9 November"
  const datePattern = /(\w+)\s+(\d{1,2})|(\d{1,2})\s+(\w+)/i;
  const match = dateStr.match(datePattern);

  if (match) {
    const monthStr = (match[1] || match[4]).toLowerCase();
    day = parseInt(match[2] || match[3]);

    // Find month index
    month = monthNames.indexOf(monthStr);
    if (month === -1) {
      month = monthAbbr.indexOf(monthStr);
    }

    if (month !== -1 && day > 0 && day <= 31) {
      // ✅ CRITICAL FIX: Create date string for Pacific timezone, then parse
      // This ensures the time is interpreted as Pacific Time, not server's local time
      const dateString = `${currentYear}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}T${String(hours).padStart(
        2,
        "0"
      )}:${String(minutes).padStart(2, "0")}:00-08:00`;

      console.log(`📅 Creating date string: ${dateString}`);
      const targetDate = new Date(dateString);

      console.log(`✅ Explicit date created: ${targetDate.toISOString()}`);
      console.log(
        `   Year: ${currentYear}, Month: ${
          month + 1
        }, Day: ${day}, Hours: ${hours}, Minutes: ${minutes}`
      );
      console.log(
        `   Pacific Time: ${targetDate.toLocaleString("en-US", {
          timeZone: "America/Vancouver",
        })}`
      );

      // Validate it's not in the past
      if (targetDate < now) {
        console.warn(`⚠️ Date is in the past, trying next year...`);
        const nextYearDateString = `${currentYear + 1}-${String(
          month + 1
        ).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(
          hours
        ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00-08:00`;
        return new Date(nextYearDateString);
      }

      return targetDate;
    }
  }

  return null;
}
// ✅ Smart day suggestions
function getSmartDaySuggestions(): string {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHour = now.getHours();

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // If it's late in the day (after 3 PM), skip today
  const startDay = currentHour >= 15 ? currentDay + 1 : currentDay;

  const suggestions: string[] = [];

  // Get next 2-3 business days
  for (let i = startDay; i < startDay + 7 && suggestions.length < 3; i++) {
    const dayIndex = i % 7;

    // Skip weekends
    if (dayIndex === 0 || dayIndex === 6) continue;

    const daysAway = i - currentDay;

    if (daysAway === 0) {
      suggestions.push("today");
    } else if (daysAway === 1) {
      suggestions.push("tomorrow");
    } else if (daysAway <= 7) {
      suggestions.push(`this ${dayNames[dayIndex]}`);
    } else {
      suggestions.push(`next ${dayNames[dayIndex]}`);
    }
  }

  // Format: "today or tomorrow", "Thursday or Friday", etc.
  if (suggestions.length >= 2) {
    return `${suggestions[0]} or ${suggestions[1]}`;
  } else if (suggestions.length === 1) {
    return suggestions[0];
  } else {
    return "this week";
  }
}

// ✅ NEW: Validate booking details
function validateBookingDetails(bookingIntent: any, lead: any): BookingDetails {
  const missing: string[] = [];

  // Check date and time
  const hasDate = !!bookingIntent.proposedDateTime?.date;
  const hasTime = !!bookingIntent.proposedDateTime?.time;

  if (!hasDate)
    missing.push("specific date (e.g., November 15 or next Monday)");
  if (!hasTime) missing.push("time (e.g., 2 PM or 14:00)");

  // ✅ IMPROVED: Better address validation
  const location = bookingIntent.location || "";
  const addressKeywords = [
    "st",
    "ave",
    "rd",
    "blvd",
    "drive",
    "way",
    "lane",
    "court",
    "place",
    "street",
    "avenue",
    "road",
    "boulevard",
    "cres",
    "crescent",
    "pkwy",
    "parkway",
    "circle",
    "terrace",
    "plaza",
    "square",
  ];

  const hasAddress =
    location.length > 15 &&
    // Has street indicator
    (addressKeywords.some((keyword) =>
      location.toLowerCase().includes(keyword)
    ) ||
      // Has comma (city separator)
      location.includes(",") ||
      // Has postal code pattern (for Canada: A1A 1A1 or USA: 12345)
      /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(location) || // Canadian postal
      /\d{5}(-\d{4})?/.test(location) || // US ZIP
      // Has "RR" (Rural Route) pattern
      /RR\d+/i.test(location));

  if (!hasAddress) {
    missing.push("specific address (street, city) for the site visit");
  }

  // Check lead details
  const hasName =
    lead.firstName &&
    lead.firstName !== lead.phone &&
    !lead.firstName.startsWith("639") &&
    !lead.firstName.startsWith("+") &&
    !lead.firstName.toLowerCase().includes("unknown") &&
    lead.firstName.length > 2;

  if (!hasName) {
    missing.push("your full name");
  }

  const hasEmail =
    lead.email &&
    !lead.email.includes("whatsapp_") &&
    !lead.email.includes("@temp.com") &&
    lead.email.includes("@") &&
    lead.email.includes(".");

  if (!hasEmail) {
    missing.push("email address for the calendar invite");
  }

  return {
    hasDate,
    hasTime,
    hasAddress,
    hasName,
    hasEmail,
    missingDetails: missing,
  };
}

export class LeadQualificationService {
  private wss: WebSocketServer | null = null;

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  private async trackResponseTime(
    conversationId: string,
    leadId: string,
    sender: "ai" | "human"
  ): Promise<void> {
    try {
      // Get all messages in conversation
      const messages = await storage.getMessages(conversationId);

      // Find first lead message (filter out nulls)
      const firstLeadMessage = messages
        .filter((m) => m.sender === "lead" && m.sentAt !== null)
        .sort((a, b) => {
          // ✅ Safe: we already filtered out nulls above
          const timeA = new Date(a.sentAt!).getTime();
          const timeB = new Date(b.sentAt!).getTime();
          return timeA - timeB;
        })[0];

      // Find first real response (exclude system messages)
      const firstResponse = messages
        .filter(
          (m) =>
            (m.sender === "ai" || m.sender === "human") &&
            m.sentAt !== null &&
            !m.isStatusMessage
        )
        .sort((a, b) => {
          const timeA = new Date(a.sentAt!).getTime();
          const timeB = new Date(b.sentAt!).getTime();
          return timeA - timeB;
        })[0];

      // If this is the FIRST real response to the lead
      if (firstLeadMessage && !firstResponse) {
        const sentAt = firstLeadMessage.sentAt;
        if (!sentAt) {
          console.log("⚠️ First lead message has no sentAt timestamp");
          return;
        }

        const leadMessageTime = new Date(sentAt);
        const responseTime = new Date();
        const responseTimeSeconds = Math.round(
          (responseTime.getTime() - leadMessageTime.getTime()) / 1000
        );

        // ✅ Validate response time (should be positive and reasonable)
        if (responseTimeSeconds < 0) {
          console.warn(
            `⚠️ Negative response time detected: ${responseTimeSeconds}s - skipping`
          );
          return;
        }

        if (responseTimeSeconds > 86400) {
          // More than 24 hours
          console.warn(
            `⚠️ Unusually long response time: ${responseTimeSeconds}s (${(
              responseTimeSeconds / 3600
            ).toFixed(1)} hours)`
          );
        }

        console.log(
          `⏱️ ${sender.toUpperCase()} Response time: ${responseTimeSeconds}s (${(
            responseTimeSeconds / 60
          ).toFixed(1)} min)`
        );

        // Save to lead
        await storage.updateLead(leadId, {
          responseTimeSeconds,
        });

        console.log(`✅ Response time saved to lead ${leadId}`);
      }
    } catch (error) {
      console.error("❌ Error tracking response time:", error);
    }
  }

  async processNewLead(leadId: string): Promise<void> {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) throw new Error("Lead not found");

      const client = await storage.getClient(lead.clientId);
      if (!client) throw new Error("Client not found");

      // Create initial conversation
      const conversation = await storage.createConversation({
        leadId: lead.id,
        clientId: lead.clientId,
        channel: "whatsapp",
        status: "active",
        isAiHandled: true,
        qualificationScore: "0.0",
      });

      // Send initial audit result message
      if (lead.phone && lead.auditResults) {
        const auditData = lead.auditResults as any;
        const success = await whatsappService.sendAuditResult(
          lead.phone,
          lead.firstName || "there",
          auditData.type || "audit",
          auditData.topFinding || "Key opportunities identified",
          `https://app.example.com/audit/${lead.id}`
        );

        // Record response time
        const createdAt = lead.createdAt
          ? new Date(lead.createdAt).getTime()
          : Date.now();
        const responseTime = Math.floor((Date.now() - createdAt) / 1000);

        await storage.updateLead(lead.id, {
          responseTimeSeconds: responseTime,
        });

        // Create message record
        await storage.createMessage({
          conversationId: conversation.id,
          content: `Audit result sent via WhatsApp`,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
        });

        // Broadcast to dashboard
        this.broadcastUpdate({
          type: "new_conversation",
          conversation: {
            ...conversation,
            lead,
          },
        });
      }
    } catch (error) {
      console.error("Error processing new lead:", error);
    }
  }

  async queueIncomingMessage(
    from: string,
    message: string,
    timestamp: number,
    phoneNumberId?: string,
    messageId?: string
  ): Promise<void> {
    console.log(`📨 Queueing message from ${from}, messageId: ${messageId}`);
    await messageQueue.enqueueMessage(
      from,
      message,
      timestamp,
      this.handleIncomingMessage.bind(this),
      phoneNumberId,
      messageId
    );
  }

  private async handleIncomingMessage(
    from: string,
    message: string,
    timestamp: number,
    phoneNumberId?: string,
    messageId?: string
  ): Promise<void> {
    try {
      // ✅ Prevent duplicate message processing
      if (messageId) {
        const existingMessage = await storage.getMessageByWhatsAppId(messageId);
        if (existingMessage) {
          console.log(`⚠️ Message ${messageId} already processed, skipping`);
          return;
        }
      }

      console.log("=== INCOMING MESSAGE ===");
      console.log("From:", from);
      console.log("Message:", message);
      console.log("Phone Number ID:", phoneNumberId);
      console.log("WhatsApp Message ID:", messageId);

      // Step 1: Find or create lead
      let lead = await storage.getLeadByPhone(from);
      if (!lead) {
        console.log("📝 Unknown number - creating new lead automatically");
        const allUsers = await storage.getAllUsersForAdmin();
        let targetClient = null;

        // Match by Phone Number ID
        if (phoneNumberId) {
          console.log(
            `🔍 Looking for client with Phone number ID: ${phoneNumberId}`
          );

          for (const user of allUsers) {
            if (user.role === "super_admin") continue;
            const userClients = await storage.getClients(user.id);

            const matchedClient = userClients.find(
              (c) => c.isActive && c.whatsappPhoneNumberId === phoneNumberId
            );

            if (matchedClient) {
              targetClient = matchedClient;
              console.log(
                `✅ Found client with WhatsApp number: ${matchedClient.name} (${matchedClient.whatsappNumber})`
              );
              break;
            }
          }
        }

        // Fallback: use first active client
        if (!targetClient) {
          console.log(
            "⚠️ No client matched WhatsApp number, using first active client"
          );
          for (const user of allUsers) {
            if (user.role === "super_admin") continue;
            const userClients = await storage.getClients(user.id);
            const firstWithWhatsApp = userClients.find(
              (c) => c.isActive && (c.whatsappPhoneNumberId || c.whatsappNumber)
            );

            if (firstWithWhatsApp) {
              targetClient = firstWithWhatsApp;
              console.log(
                `✅ Using fallback client: ${firstWithWhatsApp.name}`
              );
              break;
            }
          }
        }

        if (!targetClient) {
          console.error("❌ No active clients found");
          return;
        }

        console.log(`Assigning to client: ${targetClient.name}`);

        lead = await storage.createLead({
          clientId: targetClient.id,
          firstName: from,
          lastName: "",
          email: `whatsapp_${from.replace(/\+/g, "")}@temp.com`,
          phone: from,
          company: "Unknown",
          source: "whatsapp-inbound",
          status: "new",
          auditResults: {
            type: "inbound-message",
            wins: ["Reached out via WhatsApp"],
            risks: [],
            timeline: "Unknown",
            estimatedROI: "Unknown",
            score: 50,
            topFinding: "Inbound WhatsApp contact",
          },
          qualificationScore: "0.0",
        });

        console.log("✅ New lead created:", lead.id);
      } else {
        console.log("✅ Existing lead found:", lead.firstName, lead.lastName);
      }

      // Step 2: Find or create conversation
      const allConversations = await storage.getAllConversations(lead.clientId);
      let conversation = allConversations.find(
        (c: any) => c.leadId === lead!.id
      );

      if (!conversation) {
        const newConv = await storage.createConversation({
          leadId: lead.id,
          clientId: lead.clientId,
          channel: "whatsapp",
          status: "active",
          isAiHandled: true,
          qualificationScore: "0.0",
          lastMessageAt: new Date(),
        });
        conversation = { ...newConv, lead } as any;
        console.log("✅ New conversation created:", conversation?.id);
      } else if (conversation.status === "closed") {
        console.log(
          "🔄 Reopening previously closed conversation:",
          conversation.id
        );

        await storage.updateConversation(conversation.id, {
          status: "active",
          isAiHandled: false,
          lastMessageAt: new Date(),
          reopenedAt: new Date(),
        } as any);

        if (lead.status === "spam") {
          const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
          await storage.updateLead(lead.id, {
            status: "not-a-lead",
            tags: [
              ...existingTags.filter((t: string) => t !== "terminated"),
              "reopened",
            ],
          });
        }

        console.log("✅ Conversation reopened - flagged for human review");

        this.broadcastUpdate({
          type: "conversation_reopened",
          conversationId: conversation.id,
          lead: await storage.getLead(lead.id),
          message: "Previously terminated conversation has new activity",
        });
      } else {
        console.log("✅ Existing active conversation found:", conversation.id);
      }

      if (!conversation) {
        console.error("Failed to create conversation");
        return;
      }

      // Step 3: Record incoming message
      const savedMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: message,
        sender: "lead",
        channel: "whatsapp",
        sentAt: new Date(timestamp * 1000),
        deliveredAt: new Date(),
        metadata: messageId ? { whatsappMessageId: messageId } : undefined,
      });

      console.log(
        `✅ Incoming message saved with metadata:`,
        savedMessage.metadata
      );

      await storage.markPreviousMessagesAsRead(conversation.id);
      await storage.incrementUnreadCount(conversation.id);

      // Broadcast new message to dashboard
      this.broadcastUpdate({
        type: "new_message",
        conversationId: conversation.id,
        message: { content: message, sender: "lead" },
      });

      // Step 4: AI Processing
      if (conversation.isAiHandled) {
        console.log("🤖 AI is handling - processing message...");

        // ✅ REMOVED: No more status message ("Let me check that for you...")
        // Just show typing indicator to dashboard
        this.broadcastUpdate({
          type: "typing_indicator",
          conversationId: conversation.id,
          isTyping: true,
          sender: "ai",
        });

        // Get conversation history
        const messages = await storage.getMessages(conversation.id);

        // Qualify lead
        const qualification = await qualifyLead(lead, messages);
        console.log("AI Qualification:", qualification);

        // ============================================
        // CHECK: Non-construction inquiry?
        // ============================================
        if (
          qualification.nextAction === "mark_as_not_a_lead" ||
          qualification.score < 0.1
        ) {
          console.log("🚫 Non-construction inquiry detected");

          const redirectCount = messages.filter(
            (msg) =>
              msg.sender === "ai" &&
              (msg.content.includes("construction company") ||
                msg.content.includes("building projects") ||
                msg.content.includes("wrong business"))
          ).length;

          console.log(`🔢 Redirect count: ${redirectCount}`);

          await storage.updateLead(lead.id, {
            status: "not-a-lead",
            qualificationScore: qualification.score.toString(),
            temperature: "cold",
            tags: ["not-construction", "irrelevant"],
          });

          if (redirectCount >= 2) {
            console.log("⛔ Max redirects reached - terminating");

            const category =
              message.toLowerCase().includes("food") ||
              message.toLowerCase().includes("burger") ||
              message.toLowerCase().includes("fries")
                ? "food"
                : message.toLowerCase().includes("shoe") ||
                  message.toLowerCase().includes("clothing")
                ? "retail"
                : message.toLowerCase().includes("test")
                ? "test"
                : "other";

            await spamPatternLearning.learnFromSpam(message, category);

            await storage.updateConversation(conversation.id, {
              qualificationScore: qualification.score.toString(),
              lastMessageAt: new Date(),
              isAiHandled: false,
              status: "closed",
            });

            await storage.updateLead(lead.id, {
              status: "spam",
              tags: [
                "not-construction",
                "irrelevant",
                "terminated",
                "wrong-number",
              ],
            });
          } else {
            await storage.updateConversation(conversation.id, {
              qualificationScore: qualification.score.toString(),
              lastMessageAt: new Date(),
              isAiHandled: true,
            });
          }

          const updatedLead = await storage.getLead(lead.id);
          this.broadcastUpdate({
            type: "lead_updated",
            lead: updatedLead,
            conversationId: conversation.id,
          });

          // Generate redirect response
          const client = await storage.getClient(lead.clientId);
          const aiResponse = await generateAIResponse(messages, lead, client);

          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          const redirectResult = await whatsappService.sendTextMessage(
            from,
            aiResponse
          );

          await storage.createMessage({
            conversationId: conversation.id,
            content: aiResponse,
            sender: "ai",
            channel: "whatsapp",
            sentAt: new Date(),
            deliveredAt: new Date(),
            metadata: redirectResult.messageId
              ? { whatsappMessageId: redirectResult.messageId }
              : undefined,
          });

          this.broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: { content: aiResponse, sender: "ai" },
          });

          return; // Stop processing
        }

        // ============================================
        // NORMAL FLOW: Construction-related inquiry
        // ============================================

        // Update temperature
        let temperature: "hot" | "warm" | "cold";
        if (qualification.score >= 0.7) {
          temperature = "hot";
        } else if (qualification.score >= 0.25) {
          temperature = "warm";
        } else {
          temperature = "cold";
        }

        await storage.updateConversation(conversation.id, {
          qualificationScore: qualification.score.toString(),
          lastMessageAt: new Date(),
        });

        await storage.updateLead(lead.id, {
          qualificationScore: qualification.score.toString(),
          temperature: temperature,
          status: qualification.score >= 0.7 ? "qualified" : lead.status,
        });

        console.log(`🌡️ Temperature: ${temperature}`);

        const updatedLead = await storage.getLead(lead.id);
        this.broadcastUpdate({
          type: "lead_updated",
          lead: updatedLead,
          conversationId: conversation.id,
        });

        // ============================================
        // HOT LEAD: Immediate human handoff (score-based)
        // ============================================
        // ✅ Don't handoff immediately on first message with "ASAP"
        const leadMessageCount = messages.filter(
          (m: any) => m.sender === "lead"
        ).length;

        // ✅ Check for MULTIPLE hot signals (not just score)
        const hasUrgency = /asap|urgent|immediately|this week|next week/i.test(
          messages
            .filter((m: any) => m.sender === "lead")
            .map((m: any) => m.content)
            .join(" ")
        );
        const hasDecisionMaker =
          /i'm the|i am the|ceo|owner|i decide|my company/i.test(
            messages
              .filter((m: any) => m.sender === "lead")
              .map((m: any) => m.content)
              .join(" ")
          );
        const hasMeetingRequest = messages.some(
          (m: any) =>
            m.sender === "lead" &&
            /can we meet|let's meet|schedule|available/i.test(m.content)
        );

        // Count hot signals
        const hotSignals = [
          hasUrgency,
          hasDecisionMaker,
          hasMeetingRequest,
        ].filter(Boolean).length;

        // ✅ Require score >= 0.75 AND at least 2 hot signals for handoff
        const shouldHandoff =
          qualification.score >= 0.75 &&
          hotSignals >= 2 &&
          leadMessageCount >= 2;

        if (shouldHandoff || qualification.needsHumanAttention) {
          console.log(
            `🔥 HOT LEAD HANDOFF - Score: ${qualification.score}, Signals: ${hotSignals}`
          );

          await storage.updateConversation(conversation.id, {
            isAiHandled: false,
            humanTakeoverAt: new Date(),
          });

          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          this.broadcastUpdate({
            type: "lead_updated",
            lead: updatedLead,
            conversationId: conversation.id,
          });

          this.broadcastUpdate({
            type: "hot_lead_alert",
            conversation: {
              ...conversation,
              lead: updatedLead,
              qualificationScore: qualification.score.toString(),
            },
            qualification,
          });

          const client = await storage.getClient(lead.clientId);
          if (client && client.userId) {
            // ✅ Check userId exists
            await notificationService.sendHotLeadAlert({
              userId: client.userId,
              lead: {
                id: updatedLead?.id || "", // ✅ Fallback to original lead.id
                firstName: updatedLead?.firstName || "",
                lastName: updatedLead?.lastName || "",
                email: updatedLead?.email || "",
                phone: updatedLead?.phone || "",
                company: updatedLead?.company || "",
                qualificationScore: updatedLead?.qualificationScore || "0.7",
                temperature: updatedLead?.temperature || "hot",
              },
              conversation: {
                id: conversation.id, // ✅ Already a number
                qualificationScore: qualification.score.toString(),
              },
              qualification: {
                score: qualification.score,
                reasoning: qualification.reasoning,
              },
            });
          } else {
            console.log(
              "⚠️ Cannot send notification: client or userId missing"
            );
          }

          const handoffMessage =
            "Thanks for your message! You've been identified as a priority lead. A team member will respond within 5 minutes.";

          const handoffResult = await whatsappService.sendTextMessage(
            from,
            handoffMessage
          );

          await storage.createMessage({
            conversationId: conversation.id,
            content: handoffMessage,
            sender: "ai",
            channel: "whatsapp",
            sentAt: new Date(),
            deliveredAt: new Date(),
            metadata: handoffResult.messageId
              ? { whatsappMessageId: handoffResult.messageId }
              : undefined,
          });

          return; // Stop AI processing
        }

        // ============================================
        // STEP 1: CHECK BOOKING INTENT FIRST (CRITICAL FIX)
        // ============================================
        console.log("🔍 Step 1: Checking booking intent...");
        console.log("=".repeat(60));

        // ✅ ALWAYS get FRESH messages from database (no cache)
        const freshMessages = await storage.getMessages(conversation.id);
        console.log(
          `📨 Total messages in conversation: ${freshMessages.length}`
        );

        // ✅ Log recent lead messages for debugging
        const recentLeadMessages = freshMessages
          .filter((m) => m.sender === "lead")
          .slice(-5)
          .map((m) => ({
            content: m.content,
            timestamp: m.sentAt,
          }));

        console.log("📋 Last 5 lead messages:");
        recentLeadMessages.forEach((msg, i) => {
          console.log(`   ${i + 1}. "${msg.content}"`);
        });

        // ✅ CRITICAL: Detect booking intent with FRESH messages
        console.log("🔍 Calling detectBookingIntent()...");
        const bookingIntent = await detectBookingIntent(freshMessages, lead);

        console.log("=".repeat(60));
        console.log("📅 BOOKING INTENT DETECTION RESULT:");
        console.log("=".repeat(60));
        console.log("✓ Wants to book:", bookingIntent.wantsToBook);
        console.log("✓ Is confirmed:", bookingIntent.isConfirmed);
        console.log("✓ Confidence:", bookingIntent.confidence);
        console.log(
          "✓ Proposed date:",
          bookingIntent.proposedDateTime?.date || "NOT SET"
        );
        console.log(
          "✓ Proposed time:",
          bookingIntent.proposedDateTime?.time || "NOT SET"
        );
        console.log("✓ Location:", bookingIntent.location || "NOT SET");
        console.log("✓ Meeting type:", bookingIntent.meetingType || "NOT SET");
        console.log("✓ Reasoning:", bookingIntent.reasoning);
        console.log("=".repeat(60));

        // ✅ CRITICAL: Verify the time is what we expect
        if (bookingIntent.proposedDateTime?.time) {
          console.log(
            `⏰ TIME EXTRACTED: "${bookingIntent.proposedDateTime.time}"`
          );

          // Check if this time appears in the recent messages
          const lastLeadMsg =
            recentLeadMessages[recentLeadMessages.length - 1]?.content || "";
          const timeInLastMessage = lastLeadMsg.match(/\d{1,2}\s*[AP]M/i);

          if (timeInLastMessage) {
            console.log(`⏰ TIME IN LAST MESSAGE: "${timeInLastMessage[0]}"`);

            if (
              timeInLastMessage[0].toUpperCase() !==
              bookingIntent.proposedDateTime.time.toUpperCase()
            ) {
              console.warn("⚠️⚠️⚠️ WARNING: TIME MISMATCH! ⚠️⚠️⚠️");
              console.warn(`   Lead said: "${timeInLastMessage[0]}"`);
              console.warn(
                `   AI extracted: "${bookingIntent.proposedDateTime.time}"`
              );
              console.warn(
                "   This indicates the AI is not extracting the most recent time!"
              );
            } else {
              console.log("✅ Time extraction verified - matches last message");
            }
          }
        } else {
          console.log("⚠️ No time extracted from conversation");
        }

        if (
          bookingIntent.wantsToBook &&
          bookingIntent.isConfirmed &&
          bookingIntent.confidence > BOOKING_CONFIDENCE_THRESHOLD
        ) {
          console.log("✅ Confirmed booking intent detected!");

          // ============================================
          // ✅ NEW: STEP 1.5 - EXTRACT LEAD DETAILS FROM CONVERSATION
          // ============================================
          console.log(
            "🔍 Step 1.5: Extracting lead details from conversation..."
          );

          const extractedDetails = await extractLeadDetails(messages);
          console.log("📋 Extracted details:", extractedDetails);

          // Update lead with extracted information if confidence is high
          if (extractedDetails.confidence > 0.7) {
            const updates: any = {};

            // Extract name if found and current name is phone number
            if (
              extractedDetails.name &&
              (lead.firstName === lead.phone ||
                lead.firstName!.startsWith("639") ||
                lead.firstName!.startsWith("+") ||
                lead.firstName === "Unknown")
            ) {
              const nameParts = extractedDetails.name.split(" ");
              updates.firstName = nameParts[0];
              updates.lastName = nameParts.slice(1).join(" ") || "";
              console.log(`✅ Extracted name: ${extractedDetails.name}`);
            }

            // Extract email if found and current email is temporary
            if (
              extractedDetails.email &&
              (lead.email.includes("whatsapp_") ||
                lead.email.includes("@temp.com"))
            ) {
              updates.email = extractedDetails.email;
              console.log(`✅ Extracted email: ${extractedDetails.email}`);
            }

            // Update lead if we found anything
            if (Object.keys(updates).length > 0) {
              await storage.updateLead(lead.id, updates);
              // Refresh lead data with updated info
              lead = (await storage.getLead(lead.id))!;
              console.log(`✅ Updated lead with extracted details`);
            }
          }

          // ✅ Override location if extracted address is more specific
          if (
            extractedDetails.address &&
            extractedDetails.confidence > 0.7 &&
            (!bookingIntent.location ||
              bookingIntent.location === "TBD" ||
              bookingIntent.location.length < 20 ||
              bookingIntent.location === "British Columbia" ||
              bookingIntent.location === "BC")
          ) {
            bookingIntent.location = extractedDetails.address;
            console.log(
              `✅ Using extracted address: ${extractedDetails.address}`
            );
          }

          // ============================================
          // STEP 2: VALIDATE DETAILS
          // ============================================
          console.log("📋 Step 2: Validating booking details...");
          const detailsCheck = validateBookingDetails(bookingIntent, lead);

          if (detailsCheck.missingDetails.length > 0) {
            // ✅ NEW: Check if lead just provided details that failed validation
            const lastLeadMessage =
              messages
                .filter((m) => m.sender === "lead")
                .slice(-1)[0]
                ?.content.toLowerCase() || "";

            const justProvidedDetails =
              (detailsCheck.missingDetails.includes("specific address") &&
                (lastLeadMessage.includes("address") ||
                  lastLeadMessage.match(
                    /\d+\s+\w+\s+(st|ave|rd|way|drive|lane|blvd)/i
                  ))) ||
              (detailsCheck.missingDetails.includes("your full name") &&
                lastLeadMessage.includes("name")) ||
              (detailsCheck.missingDetails.includes("email") &&
                lastLeadMessage.includes("@"));

            if (justProvidedDetails) {
              console.log(
                "⚠️ Lead just provided details but validation failed"
              );
              console.log("Last message:", lastLeadMessage);
              console.log("Booking location:", bookingIntent.location);
              console.log("Lead data:", {
                name: `${lead.firstName} ${lead.lastName}`,
                email: lead.email,
              });

              // Don't ask again - escalate to human
              this.broadcastUpdate({
                type: "validation_error",
                conversationId: conversation.id,
                message:
                  "Lead provided details but validation failed - needs human review",
                missingDetails: detailsCheck.missingDetails,
                leadMessage: lastLeadMessage,
              });

              const acknowledgment = `Thank you for providing those details! Let me review this information and our team will reach out shortly to confirm your booking. 📋`;

              this.broadcastUpdate({
                type: "typing_indicator",
                conversationId: conversation.id,
                isTyping: false,
                sender: "ai",
              });

              await whatsappService.sendTextMessage(from, acknowledgment);

              await storage.createMessage({
                conversationId: conversation.id,
                content: acknowledgment,
                sender: "ai",
                channel: "whatsapp",
                sentAt: new Date(),
                deliveredAt: new Date(),
              });

              // Escalate to human
              await storage.updateConversation(conversation.id, {
                isAiHandled: false,
                humanTakeoverAt: new Date(),
              });

              console.log("✅ Escalated to human due to validation loop");
              return;
            }

            // ✅ IMPROVED: Use current time, acknowledge changes
            const currentTime =
              bookingIntent.proposedDateTime?.time || "the specified time";
            const currentDate =
              bookingIntent.proposedDateTime?.date || "the meeting";

            // ✅ NEW: Check if time was recently changed
            const previousAIMessages = messages
              .filter((m) => m.sender === "ai")
              .slice(-2);

            const previouslyMentionedTime = previousAIMessages
              .map((m) => m.content.match(/\d{1,2}\s*[AP]M/i))
              .filter((m) => m !== null)
              .map((m) => m![0])
              .slice(-1)[0];

            let timeAcknowledgment = "";
            if (
              previouslyMentionedTime &&
              previouslyMentionedTime !== currentTime &&
              currentTime !== "the specified time"
            ) {
              timeAcknowledgment = `I've updated the time to ${currentTime}. `;
            }

            this.broadcastUpdate({
              type: "typing_indicator",
              conversationId: conversation.id,
              isTyping: false,
              sender: "ai",
            });

            const missingList = detailsCheck.missingDetails
              .map(
                (d, i) => `${i + 1}. ${d.charAt(0).toUpperCase() + d.slice(1)}`
              )
              .join("\n");

            const detailsRequest = `${timeAcknowledgment}Perfect! Before I confirm the booking for ${currentDate} at ${currentTime}, I need a few more details:

${missingList}

Please provide all in one message (e.g., "My name is John Smith, email john@email.com, address is 123 Main St, Vancouver"). 📋`;

            await whatsappService.sendTextMessage(from, detailsRequest);

            await storage.createMessage({
              conversationId: conversation.id,
              content: detailsRequest,
              sender: "ai",
              channel: "whatsapp",
              sentAt: new Date(),
              deliveredAt: new Date(),
            });

            this.broadcastUpdate({
              type: "new_message",
              conversationId: conversation.id,
              message: { content: detailsRequest, sender: "ai" },
            });

            console.log(
              "✅ Requested missing details with CURRENT time:",
              currentTime
            );
            return; // Stop processing, wait for details
          }

          // ============================================
          // STEP 3B: ALL DETAILS PRESENT - CREATE BOOKING
          // ============================================
          console.log("✅ All details present, creating booking...");

          // Parse date
          let scheduledFor: Date | null = null;

          if (bookingIntent.proposedDateTime?.date) {
            // ✅ FIX: Provide defaults for undefined values
            const dateStr = bookingIntent.proposedDateTime.date;
            const timeStr = bookingIntent.proposedDateTime.time || "10:00 AM";

            console.log("📅 ============================================");
            console.log("📅 BOOKING DATE/TIME PARSING DEBUG:");
            console.log("📅 ============================================");
            console.log("📅 Extracted from AI:");
            console.log("  - Date:", dateStr);
            console.log("  - Time:", timeStr);
            console.log("  - Time type:", typeof timeStr);
            console.log(
              "📅 Full booking intent:",
              JSON.stringify(bookingIntent, null, 2)
            );
            console.log("📅 ============================================");

            scheduledFor = parseDateFromNaturalLanguage(dateStr, timeStr);

            if (!scheduledFor) {
              console.error("❌ Failed to parse date");
              console.error("   Input dateStr:", dateStr);
              console.error("   Input timeStr:", timeStr);
              return;
            }

            if (scheduledFor < new Date()) {
              console.error("❌ Date is in the past");
              console.error("   Parsed date:", scheduledFor.toISOString());
              console.error("   Current time:", new Date().toISOString());
              return;
            }

            console.log(`✅ Parsed date: ${scheduledFor.toISOString()}`);
            console.log(`✅ Final parsed date: ${scheduledFor.toISOString()}`);
            console.log(
              `✅ Local time: ${scheduledFor.toLocaleString("en-US", {
                timeZone: "America/Vancouver",
              })}`
            );
            console.log(
              `✅ Hour (24h): ${scheduledFor.getHours()}, Minute: ${scheduledFor.getMinutes()}`
            );
            console.log("📅 ============================================");
          } else {
            console.error("❌ Date missing after validation");
            return;
          }

          // Create booking
          try {
            const existingPendingBooking =
              await storage.findPendingBookingByLeadId(lead.id);

            const bookingDetails: InsertBooking = {
              leadId: lead.id,
              clientId: lead.clientId,
              title: `${
                bookingIntent.meetingType === "site-visit"
                  ? "Site Visit"
                  : "Consultation"
              } - ${lead.firstName} ${lead.lastName}`,
              scheduledFor,
              scheduledAt: scheduledFor,
              duration: 60,
              status: "pending_approval",
              attendeeEmail: lead.email,
              attendeeName: `${lead.firstName} ${lead.lastName}`,
              attendeePhone: lead.phone,
              meetingType: bookingIntent.meetingType || "consultation",
              location: bookingIntent.location || "TBD",
              notes: `AI-proposed booking. Confidence: ${(
                bookingIntent.confidence * 100
              ).toFixed(0)}%. Reasoning: ${bookingIntent.reasoning}.`,
              proposedBy: "ai",
              aiConfidence: bookingIntent.confidence.toString(),
            };

            let savedBooking;
            let eventType = "booking_approval_needed";

            if (existingPendingBooking) {
              console.log(
                `🔄 Updating existing booking: ${existingPendingBooking.id}`
              );
              const { status, ...updateDetails } = bookingDetails;
              savedBooking = await storage.updateBooking(
                existingPendingBooking.id,
                updateDetails
              );
              eventType = "booking_updated";
            } else {
              console.log("✅ Creating new booking...");
              savedBooking = await storage.createBooking(bookingDetails);
            }

            console.log("✅ Booking saved:", savedBooking.id);

            // ============================================
            // ✅ STEP 1: SEND BOOKING NOTIFICATION
            // ============================================
            console.log("📅 Sending booking notification...");

            // Broadcast to agents
            this.broadcastUpdate({
              type: eventType,
              booking: {
                ...savedBooking,
                lead: {
                  firstName: lead.firstName,
                  lastName: lead.lastName,
                  company: lead.company,
                  phone: lead.phone,
                },
              },
            });

            // Send booking notification
            const client = await storage.getClient(lead.clientId);
            if (client && client.userId) {
              await notificationService.sendBookingAlert({
                userId: client.userId,
                booking: {
                  id: savedBooking.id,
                  title: savedBooking.title || "",
                  scheduledFor: savedBooking.scheduledFor,
                  location: savedBooking.location || "TBD",
                  attendeeName: savedBooking.attendeeName || "",
                  attendeePhone: savedBooking.attendeePhone || "",
                  attendeeEmail: savedBooking.attendeeEmail || "",
                  meetingType: savedBooking.meetingType || "consultation",
                  aiConfidence: savedBooking.aiConfidence || "0.8",
                },
                lead: {
                  firstName: lead.firstName || "",
                  lastName: lead.lastName || "",
                  company: lead.company || "",
                  phone: lead.phone || "",
                },
              });
              console.log("✅ Booking notification sent");
            }

            // Send confirmation to lead
            const confirmationMessage = `Excellent! I've requested a ${
              bookingIntent.meetingType === "site-visit"
                ? "site visit"
                : "consultation"
            } for:

📅 ${bookingIntent.proposedDateTime.date} at ${
              bookingIntent.proposedDateTime.time || "2 PM"
            }
📍 ${bookingIntent.location || "your location"}
👤 ${lead.firstName} ${lead.lastName}
📧 ${lead.email}

Our team will send you a calendar invite shortly. Looking forward to discussing your ${
              lead.company !== "Unknown" ? lead.company + " " : ""
            }project! 🏗️`;

            this.broadcastUpdate({
              type: "typing_indicator",
              conversationId: conversation.id,
              isTyping: false,
              sender: "ai",
            });

            await whatsappService.sendTextMessage(from, confirmationMessage);

            await storage.createMessage({
              conversationId: conversation.id,
              content: confirmationMessage,
              sender: "ai",
              channel: "whatsapp",
              sentAt: new Date(),
              deliveredAt: new Date(),
              metadata: { bookingId: savedBooking.id },
            });

            console.log("✅ Confirmation sent to lead");

            // ============================================
            // ✅ STEP 2: UPDATE LEAD TO HOT & SEND HOT LEAD ALERT
            // ============================================
            console.log("🔥 Marking lead as HOT and sending hot lead alert...");

            // Update lead to hot status
            await storage.updateLead(lead.id, {
              qualificationScore: "0.85",
              temperature: "hot",
              status: "qualified",
            });

            // Update conversation
            await storage.updateConversation(conversation.id, {
              qualificationScore: "0.85",
              isAiHandled: false, // ✅ Stop AI
              humanTakeoverAt: new Date(),
            });

            // Refresh lead data with hot status
            const hotLead = await storage.getLead(lead.id);

            // ✅ SEND HOT LEAD ALERT (in addition to booking alert)
            if (client && client.userId && hotLead) {
              console.log("🔥 Sending hot lead alert...");

              await notificationService.sendHotLeadAlert({
                userId: client.userId,
                lead: {
                  id: hotLead.id || "",
                  firstName: hotLead.firstName || "",
                  lastName: hotLead.lastName || "",
                  email: hotLead.email || "",
                  phone: hotLead.phone || "",
                  company: hotLead.company || "",
                  qualificationScore: "0.85",
                  temperature: "hot",
                },
                conversation: {
                  id: conversation.id,
                  qualificationScore: "0.85",
                },
                qualification: {
                  score: 0.85,
                  reasoning:
                    "Booking confirmed - high-value lead requires immediate attention. AI proposed meeting successfully.",
                },
              });

              console.log("✅ Hot lead alert sent");
            }

            // Broadcast updates to dashboard
            this.broadcastUpdate({
              type: "hot_lead_alert",
              conversation: {
                ...conversation,
                lead: hotLead,
                qualificationScore: "0.85",
              },
              qualification: {
                score: 0.85,
                needsHumanAttention: true,
                reasoning:
                  "Booking confirmed - immediate human attention required",
                nextAction: "finalize_booking_details",
              },
            });

            this.broadcastUpdate({
              type: "lead_updated",
              lead: hotLead,
              conversationId: conversation.id,
            });

            this.broadcastUpdate({
              type: "new_message",
              conversationId: conversation.id,
              message: { content: confirmationMessage, sender: "ai" },
            });

            console.log(
              "✅ Booking complete, lead marked hot, BOTH notifications sent, AI stopped"
            );
            return; // ✅ Stop processing immediately
          } catch (error) {
            console.error("❌ Error creating booking:", error);
          }
        }

        // ============================================
        // STEP 5: NORMAL CONVERSATION (No booking intent)
        // ============================================
        console.log("💬 No booking intent - normal conversation flow");

        const existingPendingBooking = await storage.findPendingBookingByLeadId(
          lead.id
        );
        const daySuggestions = getSmartDaySuggestions();
        const client = await storage.getClient(lead.clientId);

        const aiResponse = await generateAIResponse(
          messages,
          lead,
          client,
          !!existingPendingBooking,
          daySuggestions
        );

        console.log("AI Response:", aiResponse);

        this.broadcastUpdate({
          type: "typing_indicator",
          conversationId: conversation.id,
          isTyping: false,
          sender: "ai",
        });

        const aiResult = await whatsappService.sendTextMessage(
          from,
          aiResponse
        );

        await this.trackResponseTime(conversation.id, lead.id, "ai");

        await storage.createMessage({
          conversationId: conversation.id,
          content: aiResponse,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
          deliveredAt: new Date(),
          metadata: aiResult.messageId
            ? { whatsappMessageId: aiResult.messageId }
            : undefined,
        });

        this.broadcastUpdate({
          type: "new_message",
          conversationId: conversation.id,
          message: { content: aiResponse, sender: "ai" },
        });

        console.log("✅ Normal response sent");

        // Schedule follow-ups if this is the first AI response
        try {
          const allMessages = await storage.getMessages(conversation.id);
          const aiMessages = allMessages.filter((m) => m.sender === "ai");

          // If this is the first AI message, schedule follow-ups
          if (aiMessages.length === 1) {
            console.log(
              "📅 First AI response - scheduling follow-ups for lead: ${lead.id}"
            );

            // Find default sequence for this client
            const sequences = await storage.getFollowUpSequences(lead.clientId);
            const defaultSequence = sequences.find(
              (s) => s.isDefault && s.status === "active"
            );

            if (defaultSequence) {
              await storage.scheduleFollowUpSequence(
                lead.id,
                defaultSequence.id,
                conversation.id
              );
              console.log(
                `✅ Scheduled ${defaultSequence.name} for lead: ${lead.id}`
              );
            } else {
              console.log(
                `⚠️ No default follow-up sequence found for client: ${lead.clientId}`
              );
            }
          }
        } catch (error) {
          console.error("❌ Error scheduling follow-ups:", error);
        }
      } else {
        console.log("👤 Human handling - just recording");
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(),
        });
      }

      console.log("✅ Message processing complete");
    } catch (error) {
      console.error("Error handling message:", error);
      try {
        await whatsappService.sendTextMessage(
          from,
          "We received your message and will respond shortly!"
        );
      } catch (fallbackError) {
        console.error("Fallback message failed:", fallbackError);
      }
    }
  }

  private broadcastUpdate(data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

export const leadQualificationService = new LeadQualificationService();
