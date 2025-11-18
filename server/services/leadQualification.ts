// server/services/leadQualification.ts
// ✅ ALL QA FIXES INTEGRATED: Spam Termination, Booking Flow, Meeting Timing

import { messageQueue } from "./messageQueue";
import { storage } from "../storage";
import { qualifyLead, generateAIResponse, detectTimeChange } from "./claude";
import { whatsappService } from "./whatsapp";
import { WebSocketServer } from "ws";
import { detectBookingIntent, extractLeadDetails } from "./claude";
import type { InsertBooking } from "../../shared/schema";
import { notificationService } from "./notification-sevice";

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

// ✅ IMPROVED: Better time normalization (from claude.ts)
function normalizeTimeString(timeStr: string): string {
  if (!timeStr) {
    console.log("⚠️ No time provided, defaulting to 10:00 AM");
    return "10:00 AM";
  }

  const upperTime = timeStr.toUpperCase().trim();
  console.log(`🕐 Normalizing time: "${timeStr}" → "${upperTime}"`);

  const match = upperTime.match(/(\d{1,2})(?::(\d{2}))?\s*([AP]M)?/);

  if (!match) {
    console.warn(
      `⚠️ Could not parse time "${timeStr}", using default 10:00 AM`
    );
    return "10:00 AM";
  }

  let hours = parseInt(match[1]);
  const minutes = match[2] || "00";
  let period = match[3];

  console.log(
    `🕐 Parsed components: hours=${hours}, minutes=${minutes}, period=${period}`
  );

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

  const normalizedTime = timeStr ? normalizeTimeString(timeStr) : "10:00 AM";

  console.log(`📅 Parsing date: "${dateStr}" with time: "${normalizedTime}"`);

  const timeMatch = normalizedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeMatch) {
    console.error(`❌ Invalid time format: "${normalizedTime}"`);
    return null;
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

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

  // Handle relative dates
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
    return pacificDate;
  }

  // Handle "next [DayName]" and "this [DayName]"
  const nextDayPattern =
    /^(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
  const nextDayMatch = lowerDate.match(nextDayPattern);

  if (nextDayMatch) {
    console.log(`🔍 Parsing "${lowerDate}" with pattern "next/this [Day]"`);
    const modifier = nextDayMatch[1].toLowerCase();
    const dayName = nextDayMatch[2].toLowerCase();
    console.log(`   Modifier: "${modifier}", Day: "${dayName}"`);

    const targetDayIndex = dayNames.indexOf(dayName);
    const currentDay = now.getDay();
    let daysUntil = targetDayIndex - currentDay;

    if (modifier === "next") {
      if (daysUntil <= 0) {
        daysUntil += 7;
      } else {
        daysUntil += 7;
      }
    } else {
      if (daysUntil < 0) {
        daysUntil += 7;
      }
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

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysUntil);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hourStr = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");
    const pacificDateString = `${year}-${month}-${day}T${hourStr}:${minStr}:00-08:00`;
    const pacificDate = new Date(pacificDateString);
    console.log(`✅ Day name parsed: ${pacificDate.toISOString()}`);
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

  let month = -1;
  let day = -1;

  const datePattern = /(\w+)\s+(\d{1,2})|(\d{1,2})\s+(\w+)/i;
  const match = dateStr.match(datePattern);

  if (match) {
    const monthStr = (match[1] || match[4]).toLowerCase();
    day = parseInt(match[2] || match[3]);

    month = monthNames.indexOf(monthStr);
    if (month === -1) {
      month = monthAbbr.indexOf(monthStr);
    }

    if (month !== -1 && day > 0 && day <= 31) {
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
  const currentDay = now.getDay();
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

  const startDay = currentHour >= 15 ? currentDay + 1 : currentDay;
  const suggestions: string[] = [];

  for (let i = startDay; i < startDay + 7 && suggestions.length < 3; i++) {
    const dayIndex = i % 7;
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

  const hasDate = !!bookingIntent.proposedDateTime?.date;
  const hasTime = !!bookingIntent.proposedDateTime?.time;

  if (!hasDate)
    missing.push("specific date (e.g., November 15 or next Monday)");
  if (!hasTime) missing.push("time (e.g., 2 PM or 14:00)");

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
    (addressKeywords.some((keyword) =>
      location.toLowerCase().includes(keyword)
    ) ||
      location.includes(",") ||
      /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(location) ||
      /\d{5}(-\d{4})?/.test(location) ||
      /RR\d+/i.test(location));

  if (!hasAddress) {
    missing.push("specific address (street, city) for the site visit");
  }

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
      const messages = await storage.getMessages(conversationId);

      const firstLeadMessage = messages
        .filter((m) => m.sender === "lead" && m.sentAt !== null)
        .sort((a, b) => {
          const timeA = new Date(a.sentAt!).getTime();
          const timeB = new Date(b.sentAt!).getTime();
          return timeA - timeB;
        })[0];

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

        if (responseTimeSeconds < 0) {
          console.warn(
            `⚠️ Negative response time detected: ${responseTimeSeconds}s - skipping`
          );
          return;
        }

        if (responseTimeSeconds > 86400) {
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

      const conversation = await storage.createConversation({
        leadId: lead.id,
        clientId: lead.clientId,
        channel: "whatsapp",
        status: "active",
        isAiHandled: true,
        qualificationScore: "0.0",
      });

      if (lead.phone && lead.auditResults) {
        const auditData = lead.auditResults as any;
        const success = await whatsappService.sendAuditResult(
          lead.phone,
          lead.firstName || "there",
          auditData.type || "audit",
          auditData.topFinding || "Key opportunities identified",
          `https://app.example.com/audit/${lead.id}`
        );

        const createdAt = lead.createdAt
          ? new Date(lead.createdAt).getTime()
          : Date.now();
        const responseTime = Math.floor((Date.now() - createdAt) / 1000);

        await storage.updateLead(lead.id, {
          responseTimeSeconds: responseTime,
        });

        await storage.createMessage({
          conversationId: conversation.id,
          content: `Audit result sent via WhatsApp`,
          sender: "ai",
          channel: "whatsapp",
          sentAt: new Date(),
        });

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

      // ✅ IMPORTANT: Broadcast lead message IMMEDIATELY before AI processing
      this.broadcastUpdate({
        type: "new_message",
        conversationId: conversation.id,
        message: {
          content: message,
          sender: "lead",
          sentAt: savedMessage.sentAt,
          id: savedMessage.id,
        },
      });

      // ✅ Small delay to ensure UI receives lead message first
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 4: AI Processing
      if (conversation.isAiHandled) {
        console.log("🤖 AI is handling - processing message...");

        this.broadcastUpdate({
          type: "typing_indicator",
          conversationId: conversation.id,
          isTyping: true,
          sender: "ai",
        });

        const messages = await storage.getMessages(conversation.id);

        // ============================================
        // ✅ STEP 1: QUALIFY LEAD & CHECK FOR SPAM
        // ============================================
        const qualification = await qualifyLead(lead, messages);
        console.log("AI Qualification:", qualification);

        // ============================================
        // ✅ FIX #2: SPAM TERMINATION
        // ============================================
        if (
          qualification.nextAction === "mark_as_not_a_lead" ||
          qualification.score < 0.1
        ) {
          console.log("🚫 Non-construction inquiry detected");

          const freshMessages = await storage.getMessages(conversation.id);

          const redirectCount = freshMessages.filter(
            (msg) =>
              msg.sender === "ai" &&
              (msg.content.toLowerCase().includes("construction company") ||
                msg.content.toLowerCase().includes("building projects") ||
                msg.content.toLowerCase().includes("wrong business") ||
                msg.content.toLowerCase().includes("construction services"))
          ).length;

          console.log(`🔢 Redirect count: ${redirectCount}`);

          await storage.updateLead(lead.id, {
            status: "not-a-lead",
            qualificationScore: qualification.score.toString(),
            temperature: "cold",
            tags: ["not-construction", "irrelevant"],
          });

          // ✅ TERMINATE IMMEDIATELY after 2nd redirect
          if (redirectCount >= 1) {
            console.log(
              "⛔ Max redirects reached (2 total) - terminating conversation"
            );

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

            const updatedLead = await storage.getLead(lead.id);
            this.broadcastUpdate({
              type: "lead_updated",
              lead: updatedLead,
              conversationId: conversation.id,
            });

            const client = await storage.getClient(lead.clientId);
            const finalMessage = `Final notice: This is ${
              client?.name || "a construction company"
            }. We only handle construction and building projects. This conversation will not receive further responses.`;

            this.broadcastUpdate({
              type: "typing_indicator",
              conversationId: conversation.id,
              isTyping: false,
              sender: "ai",
            });

            const terminateResult = await whatsappService.sendTextMessage(
              from,
              finalMessage
            );

            await storage.createMessage({
              conversationId: conversation.id,
              content: finalMessage,
              sender: "ai",
              channel: "whatsapp",
              sentAt: new Date(),
              deliveredAt: new Date(),
              metadata: terminateResult.messageId
                ? { whatsappMessageId: terminateResult.messageId }
                : undefined,
            });

            console.log("✅ Conversation terminated, no further AI responses");
            return; // ✅ STOP PROCESSING
          }

          // First redirect - send warning
          const updatedLead = await storage.getLead(lead.id);
          this.broadcastUpdate({
            type: "lead_updated",
            lead: updatedLead,
            conversationId: conversation.id,
          });

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
        // ✅ STEP 2: UPDATE TEMPERATURE & LEAD STATUS
        // ============================================
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
        // 🆕 STEP 3: CHECK FOR ULTRA-HOT LEAD FIRST (PRIORITY!)
        // ============================================
        console.log(
          "🔍 Step 3: Checking for ultra-hot lead (PRIORITY CHECK)..."
        );

        const leadMessages = messages.filter((m: any) => m.sender === "lead");
        const leadMessageCount = leadMessages.length;

        // Detect hot signals
        const hasUrgency =
          /\b(asap|urgent|immediately|right away|as soon as possible|emergency|critical|right now)\b/i.test(
            leadMessages.map((m: any) => m.content).join(" ")
          ) ||
          /\b(today|tomorrow|this week|next week)\b/i.test(
            leadMessages.map((m: any) => m.content).join(" ")
          );

        const hasDecisionMaker =
          /\b(i'm the|i am the|ceo|owner|president|director|founder|i decide|my company|my business|i run)\b/i.test(
            leadMessages.map((m: any) => m.content).join(" ")
          );

        // 🆕 EXPANDED: Include "Can we discuss" as meeting request
        const hasMeetingRequest = leadMessages.some((m: any) =>
          /\b(can we (meet|discuss|talk)|let's meet|need to meet|want to meet|should we meet|schedule|book|appointment|site visit)\b/i.test(
            m.content
          )
        );

        const hotSignals = [
          hasUrgency,
          hasDecisionMaker,
          hasMeetingRequest,
        ].filter(Boolean).length;

        console.log(`🔥 Ultra-Hot Lead Analysis:`);
        console.log(`   Score: ${qualification.score.toFixed(2)}`);
        console.log(`   Signals: ${hotSignals}/3`);
        console.log(`   - Urgency: ${hasUrgency}`);
        console.log(`   - Decision Maker: ${hasDecisionMaker}`);
        console.log(`   - Meeting Request: ${hasMeetingRequest}`);
        console.log(`   - Message Count: ${leadMessageCount}`);

        // ✅ ULTRA-HOT: Score 0.8+ AND 2+ signals AND 3+ messages → IMMEDIATE HANDOFF
        const isUltraHot =
          qualification.score >= 0.8 &&
          hotSignals >= 2 &&
          leadMessageCount >= 3;

        if (isUltraHot) {
          console.log(
            `🔥🔥 ULTRA-HOT LEAD CONFIRMED - Triggering immediate handoff`
          );
          console.log(`   Bypassing booking flow for human attention`);

          await storage.updateConversation(conversation.id, {
            isAiHandled: false,
            humanTakeoverAt: new Date(),
          });

          // 🆕 DEBUG: Verify update was saved
          const freshConversation = await storage.getConversation(
            conversation.id
          );
          console.log(`✅ DB Update Confirmed:`, {
            conversationId: conversation.id,
            isAiHandled: freshConversation?.isAiHandled,
            humanTakeoverAt: freshConversation?.humanTakeoverAt,
          });

          // Event 1: Hot lead alert
          this.broadcastUpdate({
            type: "hot_lead_alert",
            conversationId: conversation.id,
            conversation: {
              id: conversation.id,
              isAiHandled: false, // ✅ Explicit
              humanTakeoverAt: new Date(),
              leadId: lead.id,
              clientId: lead.clientId,
              lead: updatedLead,
              qualificationScore: qualification.score.toString(),
            },
            qualification,
          });

          console.log(
            `📡 Broadcasted hot_lead_alert for conversation ${conversation.id}`
          );

          // Event 2: Explicit conversation update
          this.broadcastUpdate({
            type: "conversation_updated",
            conversationId: conversation.id,
            updates: {
              isAiHandled: false,
              humanTakeoverAt: new Date(),
            },
          });

          console.log(
            `📡 Broadcasted conversation_updated for conversation ${conversation.id}`
          );

          // Event 3: Lead updated (for sidebar sync)
          this.broadcastUpdate({
            type: "lead_updated",
            conversationId: conversation.id,
            lead: updatedLead,
          });

          console.log(
            `📡 Broadcasted lead_updated for conversation ${conversation.id}`
          );

          const client = await storage.getClient(lead.clientId);
          if (client && client.userId) {
            await notificationService.sendHotLeadAlert({
              userId: client.userId,
              lead: {
                id: updatedLead?.id || "",
                firstName: updatedLead?.firstName || "",
                lastName: updatedLead?.lastName || "",
                email: updatedLead?.email || "",
                phone: updatedLead?.phone || "",
                company: updatedLead?.company || "",
                qualificationScore: updatedLead?.qualificationScore || "0.8",
                temperature: updatedLead?.temperature || "hot",
              },
              conversation: {
                id: conversation.id,
                qualificationScore: qualification.score.toString(),
              },
              qualification: {
                score: qualification.score,
                reasoning: qualification.reasoning,
              },
            });
          }

          const handoffMessage =
            "Thanks for sharing those details! You've been identified as a priority lead. One of our senior team members will reach out to you within 5 minutes to discuss your project in detail. 🏗️";

          this.broadcastUpdate({
            type: "typing_indicator",
            conversationId: conversation.id,
            isTyping: false,
            sender: "ai",
          });

          await new Promise((resolve) => setTimeout(resolve, 200));

          const handoffResult = await whatsappService.sendTextMessage(
            from,
            handoffMessage
          );

          const handoffMsg = await storage.createMessage({
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

          this.broadcastUpdate({
            type: "new_message",
            conversationId: conversation.id,
            message: {
              content: handoffMessage,
              sender: "ai",
              sentAt: handoffMsg.sentAt,
              id: handoffMsg.id,
            },
          });

          console.log(
            "✅ Ultra-hot lead handed off to human - STOPPING ALL AI PROCESSING"
          );
          return; // ✅ CRITICAL: Stop all further processing
        }

        // ============================================
        // ✅ STEP 4: CHECK BOOKING INTENT FIRST (Only if NOT ultra-hot)
        // ============================================
        console.log("🔍 Step 4: Checking booking intent (PRIORITY)...");
        console.log("=".repeat(60));
        const freshMessages = await storage.getMessages(conversation.id);
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
        console.log("=".repeat(60));

        // ✅ Check if lead is actively in booking workflow
        const isActivelyBooking =
          bookingIntent.wantsToBook &&
          (bookingIntent.proposedDateTime?.date ||
            bookingIntent.proposedDateTime?.time ||
            bookingIntent.confidence > 0.5);

        // ✅ Check if AI recently asked booking-related questions
        const recentMessages = messages.slice(-3);
        const inBookingFlow = recentMessages.some(
          (m: any) =>
            m.sender === "ai" &&
            /\b(schedule|site visit|meet|available|what time|which day|when would|book|appointment|calendar)\b/i.test(
              m.content
            )
        );

        console.log(`📋 Actively booking: ${isActivelyBooking}`);
        console.log(`📋 In booking flow: ${inBookingFlow}`);

        // ============================================
        // ✅ IF BOOKING CONFIRMED, CREATE IT IMMEDIATELY
        // ============================================
        if (
          bookingIntent.wantsToBook &&
          bookingIntent.isConfirmed &&
          bookingIntent.confidence > BOOKING_CONFIDENCE_THRESHOLD
        ) {
          console.log(
            "✅ Confirmed booking intent - prioritizing booking creation"
          );

          // Extract lead details from conversation
          const extractedDetails = await extractLeadDetails(messages);
          console.log("📋 Extracted details:", extractedDetails);

          if (extractedDetails.confidence > 0.7) {
            const updates: any = {};
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

            if (
              extractedDetails.email &&
              (lead.email!.includes("whatsapp_") ||
                lead.email!.includes("@temp.com"))
            ) {
              updates.email = extractedDetails.email;
              console.log(`✅ Extracted email: ${extractedDetails.email}`);
            }

            if (Object.keys(updates).length > 0) {
              await storage.updateLead(lead.id, updates);
              lead = (await storage.getLead(lead.id))!;
              console.log(`✅ Updated lead with extracted details`);
            }
          }

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

          // Validate booking details
          const detailsCheck = validateBookingDetails(bookingIntent, lead);
          if (detailsCheck.missingDetails.length > 0) {
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
              await storage.updateConversation(conversation.id, {
                isAiHandled: false,
                humanTakeoverAt: new Date(),
              });

              const acknowledgment = `Thank you for providing those details! Let me review this information and our team will reach out shortly to confirm your booking. 📋`;

              await whatsappService.sendTextMessage(from, acknowledgment);
              await storage.createMessage({
                conversationId: conversation.id,
                content: acknowledgment,
                sender: "ai",
                channel: "whatsapp",
                sentAt: new Date(),
                deliveredAt: new Date(),
              });

              return;
            }

            // Detect time change
            const timeChange = detectTimeChange(freshMessages);
            let timeAcknowledgment = "";
            if (timeChange.hasChange && timeChange.newTime) {
              timeAcknowledgment = `No problem! I've updated it to ${timeChange.newTime}. `;
              console.log(
                `✅ Acknowledging time change: ${timeChange.originalTime} → ${timeChange.newTime}`
              );
            }

            const currentTime =
              bookingIntent.proposedDateTime?.time || "the specified time";
            const currentDate =
              bookingIntent.proposedDateTime?.date || "the meeting";

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

            return; // Wait for details
          }

          // ============================================
          // ALL DETAILS PRESENT - CREATE BOOKING
          // ============================================
          console.log("✅ All details present, creating booking...");

          let scheduledFor: Date | null = null;
          if (bookingIntent.proposedDateTime?.date) {
            const dateStr = bookingIntent.proposedDateTime.date;
            const timeStr = bookingIntent.proposedDateTime.time || "10:00 AM";
            scheduledFor = parseDateFromNaturalLanguage(dateStr, timeStr);

            if (!scheduledFor || scheduledFor < new Date()) {
              console.error("❌ Failed to parse date or date is in the past");
              return;
            }
            console.log(`✅ Final parsed date: ${scheduledFor.toISOString()}`);
          } else {
            console.error("❌ Date missing after validation");
            return;
          }

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
              ).toFixed(0)}%. Lead score: ${qualification.score.toFixed(2)}.`,
              proposedBy: "ai",
              aiConfidence: bookingIntent.confidence.toString(),
            };

            let savedBooking;
            let eventType = "booking_approval_needed";

            if (existingPendingBooking) {
              const { status, ...updateDetails } = bookingDetails;
              savedBooking = await storage.updateBooking(
                existingPendingBooking.id,
                updateDetails
              );
              eventType = "booking_updated";
            } else {
              savedBooking = await storage.createBooking(bookingDetails);
            }

            console.log("✅ Booking saved:", savedBooking.id);

            // ✅ NEW: UPGRADE TO ULTRA-HOT (0.85) AND HAND OFF TO HUMAN
            const ultraHotScore = 0.85;

            console.log(
              `🔥 UPGRADING LEAD TO ULTRA-HOT (${ultraHotScore}) - BOOKING CONFIRMED`
            );

            await storage.updateLead(lead.id, {
              qualificationScore: ultraHotScore.toString(),
              temperature: "hot",
              status: "qualified",
            });

            await storage.updateConversation(conversation.id, {
              qualificationScore: ultraHotScore.toString(),
              isAiHandled: false, // ✅ CRITICAL: Hand off to human
              humanTakeoverAt: new Date(),
            });

            console.log(
              `✅ Conversation ${conversation.id} handed off to human`
            );

            // Get updated lead
            const updatedLead = await storage.getLead(lead.id);

            // Send booking notification
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

            // ✅ ALSO broadcast conversation handoff
            this.broadcastUpdate({
              type: "conversation_updated",
              conversationId: conversation.id,
              updates: {
                isAiHandled: false,
                humanTakeoverAt: new Date(),
                qualificationScore: ultraHotScore.toString(),
              },
            });

            const client = await storage.getClient(lead.clientId);
            if (client && client.userId) {
              console.log(
                `📧 Sending booking notification to user: ${client.userId}`
              );

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
                  aiConfidence: savedBooking.aiConfidence || "0.85",
                },
                lead: {
                  firstName: lead.firstName || "",
                  lastName: lead.lastName || "",
                  company: lead.company || "",
                  phone: lead.phone || "",
                },
              });
            } else {
              console.error(
                `❌ Cannot send booking notification - client or userId missing`
              );
            }

            // ✅ Send confirmation to lead
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

            this.broadcastUpdate({
              type: "new_message",
              conversationId: conversation.id,
              message: {
                content: confirmationMessage,
                sender: "ai",
                sentAt: new Date(),
              },
            });

            console.log(
              "✅ Booking created successfully - CONVERSATION HANDED OFF"
            );
            return; // ✅ STOP - Booking created
          } catch (error) {
            console.error("❌ Error creating booking:", error);
          }
        }

        // ============================================
        // STEP 5: NORMAL CONVERSATION (Continue AI handling)
        // ============================================
        console.log(
          "💬 No booking intent and not extreme hot lead - continuing normal conversation"
        );

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

          if (aiMessages.length === 1) {
            console.log(
              `📅 First AI response - scheduling follow-ups for lead: ${lead.id}`
            );

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
    if (!this.wss) {
      console.error(
        `❌ CRITICAL: WebSocket server (wss) is NULL! Cannot broadcast.`
      );
      return;
    }

    const message = JSON.stringify(data);
    const allClients = Array.from(this.wss.clients);
    const clientCount = allClients.length;

    console.log(`📡 ========== WEBSOCKET BROADCAST ==========`);
    console.log(`   Event Type: ${data.type}`);
    console.log(`   Conversation ID: ${data.conversationId}`);
    console.log(`   Total Clients: ${clientCount}`);
    console.log(`   Payload:`, JSON.stringify(data, null, 2));

    if (clientCount === 0) {
      console.warn(
        `⚠️ WARNING: No WebSocket clients connected! Message will not be received.`
      );
      return;
    }

    let sentCount = 0;
    let openCount = 0;
    let closedCount = 0;

    allClients.forEach((client, index) => {
      console.log(
        `   Client ${index + 1} readyState: ${
          client.readyState
        } (1=OPEN, 0=CONNECTING, 2=CLOSING, 3=CLOSED)`
      );

      if (client.readyState === 1) {
        // WebSocket.OPEN
        try {
          client.send(message);
          sentCount++;
          openCount++;
          console.log(`   ✅ Sent to client ${index + 1}`);
        } catch (error) {
          console.error(`   ❌ Failed to send to client ${index + 1}:`, error);
        }
      } else {
        closedCount++;
        console.warn(
          `   ⚠️ Client ${index + 1} not ready (state: ${client.readyState})`
        );
      }
    });

    console.log(`📊 Broadcast Summary:`);
    console.log(`   ✅ Sent: ${sentCount}`);
    console.log(`   🟢 Open: ${openCount}`);
    console.log(`   🔴 Closed/Not Ready: ${closedCount}`);
    console.log(`=========================================`);

    if (sentCount === 0) {
      console.error(`❌ CRITICAL: Message NOT DELIVERED to any clients!`);
    }
  }
}

export const leadQualificationService = new LeadQualificationService();
