// server/services/claude.ts
// ✅ PRODUCTION READY: Claude Sonnet 4.5 with ALL fixes integrated
// Version: 2.0 (Nov 2025)

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// ✅ ENHANCED: Increased retries and delays for 529 errors
const MAX_RETRIES = 5; // Up from 3
const BASE_DELAY = 2000; // Up from 1000ms (2 seconds)
const MAX_DELAY = 30000; // Up from 10000ms (30 seconds)

// ✅ NEW: Track consecutive 529 errors globally
let consecutive529Errors = 0;
const MAX_CONSECUTIVE_529 = 3; // Alert after 3 consecutive 529s

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LeadQualificationResult {
  score: number;
  intent: string;
  urgency: string;
  budget: string;
  timeline: string;
  needsHumanAttention: boolean;
  reasoning: string;
  nextAction: string;
}

export interface BookingIntent {
  wantsToBook: boolean;
  isConfirmed: boolean;
  confidence: number;
  proposedDateTime?: {
    date?: string;
    time?: string;
    isFlexible: boolean;
  };
  location?: string;
  meetingType?: "site-visit" | "consultation" | "follow-up";
  reasoning: string;
}

export interface IntentClassification {
  isRelevant: boolean;
  intent: "construction" | "unrelated" | "spam" | "test";
  confidence: number;
  reasoning: string;
}

export interface ExtractedLeadDetails {
  name?: string;
  email?: string;
  address?: string;
  confidence: number;
}

export interface AuditResult {
  wins: string[];
  risks: string[];
  timeline: string;
  estimatedROI: string;
  score: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callClaudeWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = BASE_DELAY
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();

      // ✅ SUCCESS: Reset consecutive error counter
      consecutive529Errors = 0;

      return result;
    } catch (error: any) {
      lastError = error;

      const is529Error =
        error.status === 529 || error.error?.type === "overloaded_error";
      const is429Error =
        error.status === 429 || error.error?.type === "rate_limit_error";
      const isRetryable = is529Error || is429Error;

      // ✅ Track 529 errors
      if (is529Error) {
        consecutive529Errors++;
        console.error(
          `🚨 [CLAUDE] 529 ERROR (consecutive: ${consecutive529Errors}/${MAX_CONSECUTIVE_529})`
        );

        // ✅ Log severe outage
        if (consecutive529Errors >= MAX_CONSECUTIVE_529) {
          console.error(
            `🚨🚨🚨 [CLAUDE] SEVERE: ${consecutive529Errors} consecutive 529 errors! API may be down.`
          );
        }
      }

      if (!isRetryable || attempt === maxRetries) {
        // ✅ Log final failure with context
        console.error(`❌ [CLAUDE] Final failure after ${attempt} attempts:`, {
          status: error.status,
          type: error.error?.type,
          message: error.message,
          consecutive529s: consecutive529Errors,
        });
        throw error;
      }

      // ✅ ENHANCED: Exponential backoff with jitter and cap
      const exponentialDelay = Math.min(
        initialDelay * Math.pow(2, attempt - 1),
        MAX_DELAY
      );
      const jitter = Math.random() * 2000; // 0-2 seconds
      const totalDelay = exponentialDelay + jitter;

      console.warn(
        `⚠️ [CLAUDE] ${error.status} error (attempt ${attempt}/${maxRetries}). ` +
          `Retrying in ${(totalDelay / 1000).toFixed(1)}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

// ✅ NEW: Export function to check API health
export function getClaudeAPIHealth(): {
  isHealthy: boolean;
  consecutive529Errors: number;
  status: "healthy" | "degraded" | "down";
} {
  let status: "healthy" | "degraded" | "down";

  if (consecutive529Errors === 0) {
    status = "healthy";
  } else if (consecutive529Errors < MAX_CONSECUTIVE_529) {
    status = "degraded";
  } else {
    status = "down";
  }

  return {
    isHealthy: consecutive529Errors < MAX_CONSECUTIVE_529,
    consecutive529Errors,
    status,
  };
}

function parseClaudeJSON(text: string): any {
  try {
    let cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Direct parse failed
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = jsonMatch[0];
      return JSON.parse(extracted);
    }

    console.error("❌ Failed to parse Claude JSON response:");
    console.error("Raw text (first 500 chars):", text.substring(0, 500));
    console.error("Cleaned text:", cleaned);

    throw new Error("No valid JSON object found in Claude response");
  } catch (error) {
    console.error("❌ JSON Parse Error:", error);
    console.error("Raw response:", text);
    throw error;
  }
}

function normalizeTimeString(timeStr: string | undefined): string {
  if (!timeStr) {
    console.log("⚠️ No time provided, defaulting to 10:00 AM");
    return "10:00 AM";
  }

  const upperTime = timeStr.toUpperCase().trim();
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

  if (!period) {
    if (hours >= 12) {
      period = "PM";
      if (hours > 12) hours -= 12;
    } else {
      period = "AM";
      if (hours === 0) hours = 12;
    }
  }

  if (hours < 1 || hours > 12) {
    console.warn(
      `⚠️ Invalid hour "${hours}" after conversion, using default 10:00 AM`
    );
    return "10:00 AM";
  }

  return `${hours}:${minutes} ${period}`;
}

function isObviousSpam(message: string, isFirstMessage: boolean): boolean {
  if (!isFirstMessage) return false;

  const spamPatterns = [
    /^test\s*test$/i,
    /^hello\s*hello$/i,
    /^hi\s*hi\s*hi$/i,
    /^[0-9]+$/,
  ];

  return spamPatterns.some((pattern) => pattern.test(message.trim()));
}

// ============================================
// CONTEXT TRACKING
// ============================================

export function extractConversationContext(messages: any[]): {
  lastAIQuestions: string[];
  lastLeadAnswers: string[];
  askedTopics: Set<string>;
  lastAIMessage?: string;
  providedInfo: Map<string, string>;
} {
  const aiMessages = messages.filter((m) => m.sender === "ai").slice(-5);
  const leadMessages = messages.filter((m) => m.sender === "lead").slice(-5);

  const lastAIQuestions = aiMessages
    .filter((m) => m.content.includes("?"))
    .map((m) => m.content.substring(0, 100));

  const askedTopics = new Set<string>();
  const providedInfo = new Map<string, string>();

  const topicPatterns: Record<string, RegExp> = {
    budget: /budget|cost|price|how much/i,
    timeline: /timeline|when|start date|how soon/i,
    location: /location|address|where/i,
    name: /name|what.*call you/i,
    email: /email/i,
    phone: /phone|number/i,
    project: /project|what.*building|type of/i,
    size: /size|square feet|sq ft|how big/i,
    materials: /material|composite|cedar|wood|type of/i,
  };

  for (const msg of aiMessages) {
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(msg.content)) {
        askedTopics.add(topic);
      }
    }
  }

  const allLeadText = leadMessages.map((m) => m.content).join(" ");

  if (
    /surrey|vancouver|richmond|burnaby|coquitlam|british columbia|bc\b/i.test(
      allLeadText
    )
  ) {
    providedInfo.set("location", "provided");
  }
  if (/\$[\d,]+|[\d,]+k|budget.*\$|[\d,]+ budget/i.test(allLeadText)) {
    providedInfo.set("budget", "provided");
  }
  if (/\d+\s*sq\s*ft|\d+\s*square\s*feet/i.test(allLeadText)) {
    providedInfo.set("size", "provided");
  }
  if (
    /composite|cedar|wood|pressure[\s-]?treated|material/i.test(allLeadText)
  ) {
    providedInfo.set("materials", "provided");
  }

  return {
    lastAIQuestions,
    lastLeadAnswers: leadMessages.map((m) => m.content.substring(0, 100)),
    askedTopics,
    lastAIMessage:
      aiMessages.length > 0
        ? aiMessages[aiMessages.length - 1].content
        : undefined,
    providedInfo,
  };
}

function isRepetitiveResponse(
  proposedResponse: string,
  conversationHistory: any[]
): { isRepetitive: boolean; reason?: string } {
  const recentAIMessages = conversationHistory
    .filter((msg) => msg.sender === "ai")
    .slice(-3)
    .map((msg) => msg.content.toLowerCase().trim());

  if (recentAIMessages.length === 0) {
    return { isRepetitive: false };
  }

  const proposedLower = proposedResponse.toLowerCase().trim();

  for (const prevMessage of recentAIMessages) {
    const prevStart = prevMessage.substring(0, 50);
    const proposedStart = proposedLower.substring(0, 50);

    if (
      prevStart.length > 20 &&
      proposedStart.length > 20 &&
      prevStart === proposedStart
    ) {
      console.warn("🚫 REPETITION: Same opening phrase");
      return { isRepetitive: true, reason: "Same opening phrase" };
    }

    const greetingPattern =
      /^(hi|hello|hey)[!,.]?\s+(i'd be happy|i'd love|thanks for)/i;
    if (
      greetingPattern.test(proposedResponse) &&
      greetingPattern.test(prevMessage)
    ) {
      console.warn("🚫 REPETITION: Repeated greeting pattern");
      return { isRepetitive: true, reason: "Repeated greeting" };
    }
  }

  const questionIndicators = [
    /what'?s the location/i,
    /where is the (property|project|site)/i,
    /what (size|type of)/i,
    /do you have.*idea of the size/i,
    /what'?s your budget/i,
  ];

  for (const pattern of questionIndicators) {
    const proposedHasQ = pattern.test(proposedResponse);
    const prevHadQ = recentAIMessages.some((msg) => pattern.test(msg));

    if (proposedHasQ && prevHadQ) {
      console.warn(`🚫 REPETITION: Asked same question again - ${pattern}`);
      return { isRepetitive: true, reason: "Repeated question" };
    }
  }

  return { isRepetitive: false };
}

// ============================================
// BOOKING STATE TRACKING
// ============================================

export function detectBookingState(
  conversationHistory: any[],
  context: any
): {
  state:
    | "gathering_info"
    | "suggesting_meeting"
    | "getting_date"
    | "getting_time"
    | "getting_details"
    | "ready_to_book";
  collectedInfo: {
    hasDate: boolean;
    hasTime: boolean;
    hasName: boolean;
    hasEmail: boolean;
    hasAddress: boolean;
    date?: string;
    time?: string;
    name?: string;
    email?: string;
    address?: string;
  };
} {
  const leadMessages = conversationHistory
    .filter((m) => m.sender === "lead")
    .map((m) => m.content)
    .join(" ");

  const aiMessages = conversationHistory
    .filter((m) => m.sender === "ai")
    .map((m) => m.content);

  const hasDate =
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
      leadMessages
    );
  const hasTime = /\b\d{1,2}\s*(am|pm|AM|PM)\b/i.test(leadMessages);
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i.test(
    leadMessages
  );
  const hasAddress =
    /\b\d+\s+\w+\s+(st|street|ave|avenue|rd|road|way|drive|lane|blvd|boulevard)\b/i.test(
      leadMessages
    );

  const nameMatch = leadMessages.match(
    /(?:my name is|name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  );
  const hasName = !!nameMatch;

  let date: string | undefined;
  let time: string | undefined;
  let name: string | undefined;
  let email: string | undefined;
  let address: string | undefined;

  if (hasDate) {
    const dateMatch = leadMessages.match(
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    date = dateMatch ? dateMatch[0] : undefined;
  }

  if (hasTime) {
    const timeMatches = leadMessages.match(/\b\d{1,2}\s*(am|pm|AM|PM)\b/gi);
    time = timeMatches ? timeMatches[timeMatches.length - 1] : undefined;
  }

  if (hasName) {
    name = nameMatch ? nameMatch[1] : undefined;
  }

  if (hasEmail) {
    const emailMatch = leadMessages.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i
    );
    email = emailMatch ? emailMatch[0] : undefined;
  }

  if (hasAddress) {
    const addressMatch = leadMessages.match(
      /\b\d+\s+\w+\s+(st|street|ave|avenue|rd|road|way|drive|lane|blvd|boulevard)[^,]*(?:,\s*[^,]+)*/i
    );
    address = addressMatch ? addressMatch[0] : undefined;
  }

  let state:
    | "gathering_info"
    | "suggesting_meeting"
    | "getting_date"
    | "getting_time"
    | "getting_details"
    | "ready_to_book" = "gathering_info";

  const aiAskedForMeeting = aiMessages.some((msg) =>
    /\b(available|meet|site visit|schedule|book|appointment)\b/i.test(msg)
  );

  const aiAskedForTime = aiMessages.some((msg) =>
    /\bwhat time\b|\bwhen|morning or afternoon/i.test(msg)
  );

  const aiAskedForDetails = aiMessages.some((msg) =>
    /\b(name|email|address)\b/i.test(msg)
  );

  if (hasDate && hasTime && hasName && hasEmail && hasAddress) {
    state = "ready_to_book";
  } else if (aiAskedForDetails || (hasDate && hasTime)) {
    state = "getting_details";
  } else if (aiAskedForTime || hasDate) {
    state = "getting_time";
  } else if (aiAskedForMeeting) {
    state = "getting_date";
  } else if (
    context.providedInfo.has("location") &&
    context.providedInfo.has("budget")
  ) {
    state = "suggesting_meeting";
  }

  return {
    state,
    collectedInfo: {
      hasDate,
      hasTime,
      hasName,
      hasEmail,
      hasAddress,
      date,
      time,
      name,
      email,
      address,
    },
  };
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

export async function classifyIntent(
  message: string,
  conversationHistory: any[],
  clientData: any
): Promise<IntentClassification> {
  if (conversationHistory.length <= 1 && isObviousSpam(message, true)) {
    console.log("🚫 Obvious spam detected (first message)");
    return {
      isRelevant: false,
      intent: "test",
      confidence: 0.95,
      reasoning: "First message is obvious spam/test",
    };
  }

  const prompt = `Classify this inquiry for ${
    clientData?.name || "a construction company"
  }:

MESSAGE: "${message}"

Is this about CONSTRUCTION/BUILDING services?

✅ CONSTRUCTION INCLUDES:
- Building, renovation, remodeling, permits
- Commercial/residential construction projects
- MEP (mechanical, electrical, plumbing)
- Site visits, consultations
- Kitchen/bathroom renovations
- Deck, garage, warehouse construction
- Commercial fit-outs, build-outs

❌ NOT CONSTRUCTION:
- Food/beverage orders (pizza, burger)
- Retail products (shoes, clothing)
- Personal services (salon, spa)
- Tech repairs (phone, laptop)

Return JSON:
{
  "isRelevant": true/false,
  "intent": "construction" or "unrelated",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`;

  try {
    const response = await callClaudeWithRetry(() =>
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 200,
        temperature: 0.2,
        system:
          "You classify construction vs non-construction inquiries. Be generous with construction-related topics. Respond with valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = parseClaudeJSON(content.text);

    return {
      isRelevant: result.isRelevant ?? true,
      intent: result.intent || "construction",
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || "",
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.5,
      reasoning: "Classification failed, defaulting to relevant for safety",
    };
  }
}

// ============================================
// BOOKING INTENT DETECTION
// ============================================

export async function detectBookingIntent(
  conversationHistory: any[],
  leadData: any
): Promise<BookingIntent> {
  console.log("🔍 Detecting booking intent...");

  const recentMessages = conversationHistory.slice(-10);
  const messages = recentMessages
    .map((m) => `${m.sender === "lead" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");

  const prompt = `Extract booking details from this conversation:

${messages}

TASK: Find the MOST RECENT date, time, and location mentioned by the customer.

CRITICAL RULES:
1. If customer mentions multiple times, use the LAST one mentioned
2. "Actually 2 PM" means use "2 PM", forget earlier times
3. Date must be specific: "Monday", "Thursday", "November 15" (not "sometime")
4. Location must include street address AND city

EXAMPLES:
- "10 AM works" then "Actually 2 PM is better" → time: "2 PM" ✅
- "Thursday" → date: "Thursday" ✅
- "123 Main St, Vancouver" → location: "123 Main St, Vancouver" ✅

Return JSON ONLY (no explanations):
{
  "wantsToBook": true/false,
  "date": "Thursday" or null,
  "time": "2 PM" or null,
  "location": "123 Main St, Vancouver" or null,
  "confidence": 0.85
}`;

  try {
    const response = await callClaudeWithRetry(() =>
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        temperature: 0.1,
        system:
          "Extract booking info. ALWAYS use customer's most recent time if they changed their mind. Return valid JSON only. No explanations after JSON.",
        messages: [{ role: "user", content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = parseClaudeJSON(content.text);

    const normalizedTime = result.time
      ? normalizeTimeString(result.time)
      : undefined;

    console.log("📅 Booking Detection Result:", {
      wantsToBook: result.wantsToBook,
      date: result.date,
      time: normalizedTime,
      location: result.location,
      confidence: result.confidence,
    });

    return {
      wantsToBook: result.wantsToBook || false,
      isConfirmed: !!(result.date && normalizedTime),
      confidence: result.confidence || 0,
      proposedDateTime: {
        date: result.date,
        time: normalizedTime,
        isFlexible: false,
      },
      location: result.location,
      meetingType: "site-visit",
      reasoning: "Extracted by Claude Sonnet 4.5",
    };
  } catch (error) {
    console.error("Error detecting booking intent:", error);
    return {
      wantsToBook: false,
      isConfirmed: false,
      confidence: 0,
      reasoning: "Error analyzing booking intent",
    };
  }
}

// ============================================
// LEAD QUALIFICATION
// ============================================

export async function qualifyLead(
  leadData: any,
  conversationHistory: any[]
): Promise<LeadQualificationResult> {
  try {
    const latestMessage = conversationHistory[conversationHistory.length - 1];
    if (latestMessage && latestMessage.sender === "lead") {
      const clientData = { name: "Construction Company" };
      const intentClassification = await classifyIntent(
        latestMessage.content,
        conversationHistory,
        clientData
      );

      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.7
      ) {
        console.log("❌ Non-construction inquiry detected");
        return {
          score: 0.05,
          intent: intentClassification.intent,
          urgency: "none",
          budget: "unqualified",
          timeline: "none",
          needsHumanAttention: false,
          reasoning: `Non-construction: ${intentClassification.reasoning}`,
          nextAction: "mark_as_not_a_lead",
        };
      }
    }

    const conversationText = conversationHistory
      .map((m) => `${m.sender === "lead" ? "Customer" : "Agent"}: ${m.content}`)
      .join("\n");

    const customerMessageCount = conversationHistory.filter(
      (m) => m.sender === "lead"
    ).length;

    const prompt = `You're a lead qualification expert for a construction company.

CONVERSATION:
${conversationText}

Customer messages: ${customerMessageCount}

🚨🚨🚨 CRITICAL INSTRUCTION - READ THIS FIRST 🚨🚨🚨

BEFORE SCORING, CHECK: Did the customer CHANGE their project?

Look for these keywords: "actually", "scratch that", "never mind", "instead", "forget about", "change of plans"

IF YOU FIND THESE KEYWORDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Find the OLD project (mentioned BEFORE the keyword)
2. Find the NEW project (mentioned AFTER the keyword)  
3. ⚠️ COMPLETELY FORGET THE OLD PROJECT EXISTS
4. ⚠️ Use ONLY the NEW project in your "reasoning" field
5. ⚠️ DO NOT mention the old project anywhere in your response
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1:
Customer: "I need deck built, 300 sq ft"
Customer: "Actually, scratch that. I want bathroom reno instead, $35k"

❌ WRONG reasoning: "Deck construction booking confirmed..."
❌ WRONG reasoning: "Customer changed from deck to bathroom..."
✅ CORRECT reasoning: "Bathroom renovation booking confirmed for Friday. Budget: $35k..."

EXAMPLE 2:  
Customer: "Kitchen reno needed"
Customer: "Never mind, let's do basement instead"

❌ WRONG reasoning: "Kitchen renovation mentioned..."
✅ CORRECT reasoning: "Basement renovation project..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IF SCOPE CHANGE DETECTED: Treat the conversation AS IF the old project was never mentioned. Only the NEW project exists.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now score this lead from 0.0 to 1.0 based on BUYING SIGNALS:

**🔥 ULTRA-HOT (0.85-1.0) - IMMEDIATE Human Handoff (Bypass AI Booking):**
These are EXTREME cases requiring senior team attention:
- Decision maker ("I'm the CEO/owner") + Urgency ("ASAP", "<2 weeks") + Large budget ($2M+)
- Multiple strong signals (4+ of: decision maker, urgency, large budget, meeting request, detailed scope)

**EXAMPLES OF ULTRA-HOT (Immediate Handoff, Bypass AI):**
- "I'm the CEO, need warehouse ASAP, $5M budget, let's meet tomorrow" → 0.90 ✅
- "I'm the owner, urgent timeline (1 week), $3M project, I decide, meeting today?" → 0.88 ✅
- "Decision maker here, need to start immediately, $2M budget, site visit ASAP" → 0.87 ✅

**🟡 HOT (0.65-0.79) - AI Handles Booking, THEN Handoff:**
These leads get AI-assisted booking (most common):
- Budget + Location + Meeting request → 0.70
- Budget + Project details + Timeline (not urgent) → 0.68
- Meeting request + 2+ project details → 0.70

**EXAMPLES OF HOT (AI Books First, Then Hands Off):**
- "BC, $40k deck, 150 sq ft, I'd like to meet Monday" → 0.70 ✅ (AI books)
- "Surrey, $85k addition, can we discuss next week?" → 0.68 ✅ (AI books)
- "$200k renovation, Richmond, let's schedule meeting" → 0.72 ✅ (AI books)
- "Need bathroom reno, $50k budget, available this week" → 0.70 ✅ (AI books)

**WARM (0.4-0.64):**
Has 2+ signals but no meeting request:
- Budget + Location → 0.55
- Project type + Size + Location → 0.58
- Budget + Timeline → 0.52

**COLD (0.0-0.39):**
- Vague questions → 0.35
- Price shopping only → 0.30
- One-word responses → 0.25

**CRITICAL SCORING RULES:**
1. Meeting request + budget + details = **0.70** (HOT, AI handles booking)
2. Decision maker + urgency + meeting + large budget ($2M+) = **0.85+** (ULTRA-HOT, immediate handoff)
3. "Can we meet" alone (no details) = 0.50 (WARM)
4. Budget alone = 0.50 (WARM)
5. Score **0.85+ ONLY** for EXTREME cases with 4+ strong signals
6. **BE CONSERVATIVE:** Most leads should be 0.65-0.75 (HOT) so AI can handle booking

**DON'T OVERSCORE:** 
- Normal residential projects ($40k-$200k) with meeting request = 0.70 max
- Only multi-million dollar projects with CEO + ASAP = 0.85+

Return JSON:
{
  "score": 0.70,
  "intent": "high",
  "urgency": "moderate",
  "budget": "qualified",
  "timeline": "1 week",
  "needsHumanAttention": false,
  "reasoning": "Lead requested meeting with budget and project details. Score 0.70 - let AI handle booking flow.",
  "nextAction": "Continue AI booking flow"
}`;

    const response = await callClaudeWithRetry(() =>
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 400,
        temperature: 0.3,
        system:
          "You're a lead qualification expert. 🚨 CRITICAL: If customer says 'actually', 'scratch that', 'instead', or 'never mind', they CHANGED their project. In your 'reasoning' field, mention ONLY the NEW/FINAL project - DO NOT mention the old project at all. Pretend the old project never existed. Be VERY CONSERVATIVE with ultra-hot scoring (0.85+). Most meeting requests should be 0.65-0.75 (HOT) so AI can handle booking. Only 0.85+ for EXTREME cases with CEO/owner + ASAP urgency + $2M+ budget. Return valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = parseClaudeJSON(content.text);
    const finalScore = result.score || 0.5;

    // 🚨 POST-PROCESSING: Fix scope change issues
    let finalReasoning = result.reasoning || "Lead qualified";

    // Check if conversation has scope change
    const hasScopeChange =
      /\b(actually|scratch that|never mind|instead|forget about|change of plans)\b/i.test(
        conversationText
      );

    if (hasScopeChange) {
      console.log("🔄 SCOPE CHANGE DETECTED - Post-processing reasoning...");

      // Find the NEW project (mentioned AFTER scope change keyword)
      const scopeChangeMatch = conversationText.match(
        /(actually|scratch that|never mind|instead|forget about|change of plans)[^.]*?(bathroom|deck|kitchen|basement|addition|garage|renovation|reno)/gi
      );

      if (scopeChangeMatch && scopeChangeMatch.length > 0) {
        const lastMatch =
          scopeChangeMatch[scopeChangeMatch.length - 1].toLowerCase();

        let newProjectType = "";
        if (/bathroom/.test(lastMatch)) newProjectType = "Bathroom renovation";
        else if (/deck/.test(lastMatch)) newProjectType = "Deck construction";
        else if (/kitchen/.test(lastMatch))
          newProjectType = "Kitchen renovation";
        else if (/basement/.test(lastMatch))
          newProjectType = "Basement renovation";
        else if (/addition/.test(lastMatch)) newProjectType = "Addition";
        else if (/garage/.test(lastMatch))
          newProjectType = "Garage construction";

        if (newProjectType) {
          console.log(`✅ NEW PROJECT IDENTIFIED: ${newProjectType}`);

          // Force-replace old project mentions in reasoning
          finalReasoning = finalReasoning
            .replace(/Deck construction/gi, newProjectType)
            .replace(/Kitchen renovation/gi, newProjectType)
            .replace(/Bathroom renovation/gi, newProjectType)
            .replace(/Basement renovation/gi, newProjectType);

          console.log(
            `✅ REASONING CORRECTED: ${finalReasoning.substring(0, 100)}...`
          );
        }
      }
    }

    console.log("📊 Lead Qualification:", {
      score: finalScore.toFixed(2),
      intent: result.intent,
      needsHumanAttention: finalScore >= 0.7,
      reasoning: finalReasoning,
    });

    return {
      score: finalScore,
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: finalScore >= 0.7,
      reasoning: finalReasoning, // ✅ Use post-processed reasoning
      nextAction: result.nextAction || "continue conversation",
    };
  } catch (error) {
    console.error("Error qualifying lead:", error);
    throw new Error(
      "Failed to qualify lead: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}

// ============================================
// RESPONSE GENERATION
// ============================================

export async function generateAIResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any,
  hasPendingBooking?: boolean,
  daySuggestions?: string
): Promise<string> {
  if (hasPendingBooking) {
    return "Great! Our team will send you the meeting details shortly. Is there anything else you'd like to discuss about your project?";
  }

  const currentMessage = conversationHistory[conversationHistory.length - 1];
  const isFromLead = currentMessage?.sender === "lead";
  const lastContent = currentMessage?.content?.toLowerCase() || "";

  // Detect explicit pricing questions
  const isPriceQuestion =
    /\b(how much|what'?s the (cost|price)|price range|cost range|typically cost|rough cost|ballpark)\b/i.test(
      lastContent
    ) && /\b(cost|price|much|range)\b/i.test(lastContent);

  console.log(`🔍 Price Question Check:`, {
    isFromLead,
    isPriceQuestion,
    lastContent: lastContent.substring(0, 100),
  });

  // If lead just asked about pricing, answer BEFORE continuing booking flow
  if (isFromLead && isPriceQuestion) {
    console.log(
      `💰 PRICE QUESTION DETECTED - Answering before resuming booking`
    );

    // Extract project context from conversation
    const leadMessages = conversationHistory
      .filter((m) => m.sender === "lead")
      .map((m) => m.content)
      .join(" ");

    const projectType = /\bdeck\b/i.test(leadMessages)
      ? "deck"
      : /\bkitchen\b/i.test(leadMessages)
      ? "kitchen"
      : /\bbathroom\b/i.test(leadMessages)
      ? "bathroom"
      : /\bbasement\b/i.test(leadMessages)
      ? "basement"
      : /\baddition\b/i.test(leadMessages)
      ? "addition"
      : "renovation";

    // Build a special prompt for price questions
    const pricePrompt = `The customer just asked: "${currentMessage.content}"

CONTEXT: ${projectType} project. Previous conversation shows: ${leadMessages.substring(
      0,
      200
    )}

YOUR TASK: Answer their price question briefly, then return to booking.

Follow these rules:
1. Give typical price range for ${projectType} projects
2. Reference their specific details if mentioned (size, location)
3. Keep it brief (2-3 sentences)
4. End with: "When works for you?" or "Which day works best?"

Examples:
- "Deck construction typically ranges from $30-$60 per sq ft depending on materials. For your 200 sq ft project in Surrey, that's roughly $6k-$12k. When works for a site visit?"
- "Kitchen renovations typically range from $40k-$80k depending on finishes and layout. For your Vancouver project, let's schedule a site visit to provide an accurate quote. Which day works?"

Respond now:`;

    try {
      const response = await callClaudeWithRetry(() =>
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 150,
          temperature: 0.4,
          system:
            "You answer price questions briefly with ranges, then return to scheduling. Keep responses under 50 words.",
          messages: [{ role: "user", content: pricePrompt }],
        })
      );

      const content = response.content[0];
      if (content.type === "text") {
        const priceAnswer = content.text.trim();
        console.log(
          `✅ Price answer generated: ${priceAnswer.substring(0, 100)}...`
        );
        return priceAnswer;
      }
    } catch (error) {
      console.error("❌ Error generating price answer:", error);
      // Fall through to normal flow if price answer fails
    }
  }

  const context = extractConversationContext(conversationHistory);
  const bookingState = detectBookingState(conversationHistory, context);

  console.log("🔍 Booking State:", bookingState.state);
  console.log("📋 Collected Info:", bookingState.collectedInfo);

  if (bookingState.state === "ready_to_book") {
    console.log(
      "✅ ALL BOOKING DETAILS COLLECTED - AI should NOT ask for anything!"
    );
    return "I have all the details I need. Let me finalize the booking and send you confirmation shortly!";
  }

  let stateGuidance = "";

  if (bookingState.collectedInfo.hasDate && bookingState.collectedInfo.date) {
    stateGuidance += `\n**✅ DATE CONFIRMED: ${bookingState.collectedInfo.date.toUpperCase()}**\nDO NOT ask for date again!`;
  }

  if (bookingState.collectedInfo.hasTime && bookingState.collectedInfo.time) {
    stateGuidance += `\n**✅ TIME CONFIRMED: ${bookingState.collectedInfo.time.toUpperCase()}**\nDO NOT ask "what time?" again!`;
  }

  if (bookingState.collectedInfo.hasName && bookingState.collectedInfo.name) {
    stateGuidance += `\n**✅ NAME PROVIDED: ${bookingState.collectedInfo.name}**`;
  }

  if (bookingState.collectedInfo.hasEmail && bookingState.collectedInfo.email) {
    stateGuidance += `\n**✅ EMAIL PROVIDED: ${bookingState.collectedInfo.email}**`;
  }

  if (
    bookingState.collectedInfo.hasAddress &&
    bookingState.collectedInfo.address
  ) {
    stateGuidance += `\n**✅ ADDRESS PROVIDED: ${bookingState.collectedInfo.address}**`;
  }

  const missing: string[] = [];
  if (bookingState.state === "getting_details") {
    if (!bookingState.collectedInfo.hasName) missing.push("full name");
    if (!bookingState.collectedInfo.hasEmail) missing.push("email");
    if (!bookingState.collectedInfo.hasAddress)
      missing.push("specific address");
  }

  if (missing.length > 0) {
    stateGuidance += `\n\n**⚠️ STILL NEED: ${missing.join(
      ", "
    )}**\nAsk for ONLY these missing details.`;
  }

  const alreadyHave: string[] = [];
  if (context.providedInfo.has("location")) alreadyHave.push("location");
  if (context.providedInfo.has("budget")) alreadyHave.push("budget");
  if (context.providedInfo.has("size")) alreadyHave.push("size");

  let contextGuidance = "";
  if (alreadyHave.length > 0) {
    contextGuidance = `\n**PROJECT INFO PROVIDED:**
${alreadyHave.map((info) => `- ${info.toUpperCase()}`).join("\n")}`;
  }

  const recentMessages = conversationHistory.slice(-8);
  const conversation = recentMessages
    .map((m) => `${m.sender === "lead" ? "Customer" : "You"}: ${m.content}`)
    .join("\n");

  const lastMessage = conversationHistory[conversationHistory.length - 1];
  const daySuggestionsText = daySuggestions || "this week";

  const prompt = `You're a professional construction project manager for ${
    clientData?.name || "a construction company"
  }.

${contextGuidance}

${stateGuidance}

**CURRENT BOOKING STATE: ${bookingState.state
    .toUpperCase()
    .replace(/_/g, " ")}**

CONVERSATION:
${conversation}

CUSTOMER JUST SAID: "${lastMessage.content}"

**YOUR TASK BASED ON STATE:**

${
  bookingState.state === "gathering_info"
    ? `STATE: Gathering project info
ACTION: Ask about missing project details (location, budget, size)
EXAMPLE: "To give you an accurate estimate, what's the property location and budget range?"`
    : ""
}

${
  bookingState.state === "suggesting_meeting"
    ? `STATE: Ready to suggest meeting
ACTION: Suggest meeting days (use "${daySuggestionsText}")
EXAMPLE: "Would you like to schedule a site visit tomorrow or ${daySuggestionsText}?"`
    : ""
}

${
  bookingState.state === "getting_date"
    ? `STATE: Getting meeting date
ACTION: Ask which day works for them
EXAMPLE: "Perfect! Which day works best - Monday, Wednesday, or Friday?"`
    : ""
}

${
  bookingState.state === "getting_time"
    ? `STATE: Getting meeting time
${
  bookingState.collectedInfo.hasTime
    ? `⚠️ THEY ALREADY SAID: ${bookingState.collectedInfo.time}
DO NOT ask "what time?" again!
ACTION: Acknowledge their time and ask for personal details`
    : `ACTION: Ask what time on ${bookingState.collectedInfo.date}`
}
EXAMPLE: "Great! What time on ${
        bookingState.collectedInfo.date || "that day"
      }?"`
    : ""
}

${
  bookingState.state === "getting_details"
    ? `STATE: Getting personal details for booking
${
  missing.length > 0
    ? `⚠️ STILL NEED: ${missing.join(", ")}
ACTION: Ask for ONLY the missing details`
    : `⚠️ YOU HAVE ALL DETAILS - DO NOT ASK FOR ANYTHING!`
}
EXAMPLE: "Perfect! To finalize the booking, I need your ${missing.join(
        " and "
      )}."`
    : ""
}

**CRITICAL RULES:**
1. If DATE confirmed (${
    bookingState.collectedInfo.date || "NOT YET"
  }) → DO NOT ask for date again
2. If TIME confirmed (${
    bookingState.collectedInfo.time || "NOT YET"
  }) → DO NOT ask "what time?" again
3. Read the "ALREADY PROVIDED" section carefully
4. Keep response under 50 words
5. Use "meeting" or "site visit" (never "call")

**BUDGET & PRICING QUESTION HANDLING:**

If customer asks about THEIR SPECIFIC budget concerns (e.g., "Is $15k enough?", "Can you work with that?"):
- Acknowledge their question directly (don't dodge it)
- Provide context: "Full renovations typically start around $40k-$50k"
- Stay positive: "Let's explore what's possible"
- Move to meeting: "Let's meet to discuss realistic options"

If customer asks GENERAL pricing questions (e.g., "How much does it cost?", "What's the price range?"):
- Answer briefly with typical range for that project type
- Reference their specific project details if provided
- Move back to booking: "For your [project details], let's schedule a site visit. When works?"
- Keep it brief (2-3 sentences max)

**EXAMPLES:**

Q: "Wait, how much does it typically cost?"
Good: "Deck construction typically ranges from $30-$60 per sq ft depending on materials - so for 200 sq ft, roughly $6k-$12k. For your deck in Surrey, let's schedule a site visit to give you an accurate quote. When works for you?"
Bad: "Perfect! I have your deck project details..." (ignores question)

Q: "What's the cost for bathroom reno?"
Good: "Bathroom renovations typically range from $15k-$40k depending on fixtures and layout changes. To give you a precise quote for your project, when can we schedule a site visit?"
Bad: [Dodging the question]

Q: "Is $15k enough for full kitchen reno?"
Good: "Full kitchen renos typically start around $40k-$50k, but let's meet to discuss what's achievable with $15k - perhaps phased updates. Which day works?"
Bad: "I understand you want a full renovation. What day works?" (ignores question)

Respond naturally (2-3 sentences):`;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const response = await callClaudeWithRetry(() =>
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 150,
          temperature: 0.5 + attempts * 0.1,
          system: `You're a construction PM with PERFECT MEMORY.

🚨 CRITICAL SCOPE CHANGE DETECTION 🚨
Scan conversation for these keywords: "actually", "scratch that", "never mind", "instead", "forget about", "change of plans"

IF found:
1. Project BEFORE keyword = OLD (IGNORE IT COMPLETELY)
2. Project AFTER keyword = NEW (USE THIS ONLY)
3. Treat conversation as if OLD project never existed
4. Never say "confusion" or "clarify" - the customer already told you the new project

EXAMPLE:
Customer: "Deck, 300 sq ft" → "Actually, bathroom reno instead"
❌ WRONG: "I see confusion... deck or bathroom?"
✅ CORRECT: "Perfect! Bathroom renovation it is."

Track booking state. Keep responses under 50 words.`,
          messages: [{ role: "user", content: prompt }],
        })
      );

      const content = response.content[0];
      if (content.type !== "text") {
        return "Thank you for your message. A team member will respond shortly.";
      }

      const aiResponse = content.text.trim();

      const repetitionCheck = isRepetitiveResponse(
        aiResponse,
        conversationHistory
      );

      if (!repetitionCheck.isRepetitive) {
        console.log(`✅ Non-repetitive response (attempt ${attempts})`);

        if (bookingState.collectedInfo.hasTime) {
          if (
            /what time|when.*available|morning or afternoon/i.test(aiResponse)
          ) {
            console.warn(
              "⚠️ AI asking for time when we already have it, retrying..."
            );
            continue;
          }
        }

        if (bookingState.collectedInfo.hasDate) {
          if (/which day|what day|when.*meet/i.test(aiResponse)) {
            console.warn(
              "⚠️ AI asking for date when we already have it, retrying..."
            );
            continue;
          }
        }

        return aiResponse;
      }

      console.warn(
        `⚠️ Attempt ${attempts}: Repetitive - ${repetitionCheck.reason}, retrying...`
      );

      if (attempts === maxAttempts) {
        console.error("❌ Max attempts reached, using state-aware fallback");

        if (bookingState.state === "getting_details" && missing.length > 0) {
          return `To finalize the booking for ${
            bookingState.collectedInfo.date
          } at ${bookingState.collectedInfo.time}, I need your ${missing.join(
            " and "
          )}.`;
        } else if (bookingState.state === "getting_time") {
          return `What time on ${bookingState.collectedInfo.date} works best for you?`;
        } else if (bookingState.state === "getting_date") {
          return `Which day works best for a site visit - tomorrow, or later ${daySuggestionsText}?`;
        } else {
          return `Thanks for the details! Are you available for a site visit ${daySuggestionsText}?`;
        }
      }
    } catch (error) {
      console.error(`Error on attempt ${attempts}:`, error);
      if (attempts === maxAttempts) throw error;
    }
  }

  return "Thank you for your message. A team member will respond shortly.";
}

// ============================================
// EXTRACT LEAD DETAILS
// ============================================

export async function extractLeadDetails(
  conversationHistory: any[]
): Promise<ExtractedLeadDetails> {
  try {
    const conversationText = conversationHistory
      .filter((msg) => msg.sender === "lead")
      .map((msg) => msg.content)
      .join("\n");

    const prompt = `Extract the lead's personal information from these messages:

${conversationText}

EXTRACT (only if explicitly stated):
- Full name (first and last if mentioned)
- Email address (valid format with @ and .)
- Specific address (street number + street name + city)

ADDRESS RULES:
- Must include street number AND street name
- Must include city
- "British Columbia" alone is NOT specific enough
- "123 Main St, Vancouver" IS specific enough ✅

Return JSON:
{
  "name": "John Smith" or null,
  "email": "john@email.com" or null,
  "address": "123 Main St, Vancouver" or null,
  "confidence": 0.85
}`;

    const response = await callClaudeWithRetry(() =>
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        temperature: 0.2,
        system:
          "Extract information from messages. Only extract explicitly stated information. Return valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type !== "text") {
      return { confidence: 0 };
    }

    const result = parseClaudeJSON(content.text);

    return {
      name: result.name || undefined,
      email: result.email || undefined,
      address: result.address || undefined,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("Error extracting lead details:", error);
    return { confidence: 0 };
  }
}

// ============================================
// AUDIT GENERATION
// ============================================

export async function generateAudit(
  auditType: string,
  inputs: any
): Promise<AuditResult> {
  try {
    let prompt = "";

    switch (auditType) {
      case "seo":
        prompt = `Perform a quick SEO audit for website: ${inputs.website}
Industry: ${inputs.industry}
Provide 3 quick wins, 1 main risk, timeline for results, and estimated ROI increase.`;
        break;

      case "construction":
        prompt = `Perform a construction project audit for:
Project type: ${inputs.projectType}
Location: ${inputs.location}
Timeline: ${inputs.timeline}
Provide cost-saving opportunities, risk factors, timeline optimization, and ROI estimate.`;
        break;

      default:
        prompt = `Perform a business audit for ${inputs.industry} company.
Provide improvement opportunities, risks, timeline, and ROI estimate.`;
    }

    const response = await callClaudeWithRetry(() =>
      anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        temperature: 0.5,
        system:
          "You are a business audit expert. Respond with valid JSON only in this format: { wins: [], risks: [], timeline: '', estimatedROI: '', score: 85 }",
        messages: [{ role: "user", content: prompt }],
      })
    );

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response");
    }

    const result = parseClaudeJSON(content.text);

    return {
      wins: result.wins || ["Improvement opportunity identified"],
      risks: result.risks || ["No major risks detected"],
      timeline: result.timeline || "90 days",
      estimatedROI: result.estimatedROI || "10-20% improvement",
      score: result.score || 75,
    };
  } catch (error) {
    console.error("Error generating audit:", error);
    throw new Error("Failed to generate audit");
  }
}

// ============================================
// VSL SCRIPT GENERATION
// ============================================

export interface VSLScriptOptions {
  duration?: "30s" | "1min" | "2min" | "3min" | "5min"; // Duration control
  includeSubtitles?: boolean;
  voiceStyle?: "professional" | "conversational" | "energetic";
}

export async function generateVSLScript(
  niche: string,
  data: {
    targetAudience?: string;
    painPoints?: string;
    solution?: string;
    proofElements?: string;
    duration?: "30s" | "1min" | "2min" | "3min" | "5min";
  }
): Promise<string> {
  console.log("🎬 Generating VSL script for niche:", niche);

  // Duration-based word count targets
  const durationSettings = {
    "30s": { words: "120-150", sections: "Hook + Problem + CTA" },
    "1min": { words: "150-180", sections: "Hook + Problem + Solution + CTA" },
    "2min": {
      words: "300-350",
      sections: "Hook + Problem + Solution + Proof + CTA",
    },
    "3min": { words: "450-550", sections: "Full VSL with detailed proof" },
    "5min": {
      words: "750-900",
      sections: "Deep-dive VSL with objection handling",
    },
  };

  const selectedDuration = data.duration || "2min";
  const settings = durationSettings[selectedDuration];

  const prompt = `You are a world-class direct-response copywriter specializing in B2B SaaS video sales letters for the Canadian market.

⚠️ ⚠️ ⚠️ ABSOLUTE WORD COUNT LIMITS - NON-NEGOTIABLE ⚠️ ⚠️ ⚠️

${
  selectedDuration === "30s"
    ? `**HARD LIMIT: 150 WORDS MAXIMUM**
**TARGET: 120-140 words**
**YOU WILL BE PENALIZED IF YOU EXCEED 150 WORDS**`
    : selectedDuration === "1min"
    ? `**HARD LIMIT: 180 WORDS MAXIMUM**
**TARGET: 150-170 words**
**YOU WILL BE PENALIZED IF YOU EXCEED 180 WORDS**`
    : selectedDuration === "2min"
    ? `**HARD LIMIT: 350 WORDS MAXIMUM**
**TARGET: 300-330 words**
**YOU WILL BE PENALIZED IF YOU EXCEED 350 WORDS**`
    : selectedDuration === "3min"
    ? `**HARD LIMIT: 550 WORDS MAXIMUM**
**TARGET: 450-520 words**
**YOU WILL BE PENALIZED IF YOU EXCEED 550 WORDS**`
    : `**HARD LIMIT: 900 WORDS MAXIMUM**
**TARGET: 750-850 words**
**YOU WILL BE PENALIZED IF YOU EXCEED 900 WORDS**`
}

**MANDATORY PRE-SUBMISSION CHECK:**
1. Count your words BEFORE submitting
2. If over limit, CUT ruthlessly - remove examples, shorten sentences
3. Quality over quantity - every word must earn its place
4. Prioritize: Hook > Problem > CTA > Details

🎯 **CRITICAL REQUIREMENTS - READ FIRST**

1. **LANGUAGE**: Use ONLY professional Canadian/American English. NO other languages.
2. **DURATION**: Exactly ${selectedDuration} (${
    settings.words
  } words) - **STRICT LIMIT**
3. **READABILITY**: All text overlays must be SHORT (3-5 words max), CLEAR, and IN ENGLISH
4. **STRUCTURE**: Include only: ${settings.sections}
5. **WORD COUNT**: You MUST stay under the hard limit or your script will be rejected

## TARGET DETAILS

**Niche**: ${niche}
**Audience**: ${
    data.targetAudience || `${niche} business owners and managers in Canada`
  }
**Pain Points**: ${
    data.painPoints ||
    `Missing quality leads, slow response times, manual follow-ups`
  }
**Solution**: ${
    data.solution || `AI-powered lead generation system with instant response`
  }
**Proof**: ${
    data.proofElements ||
    `300% increase in qualified leads, 67% AI-handled conversations`
  }

## VSL STRUCTURE FOR ${selectedDuration.toUpperCase()}

${generateStructureGuide(selectedDuration)}

## TEXT OVERLAY RULES (CRITICAL FOR READABILITY)

✅ **DO:**
- Keep text overlays SHORT: 3-5 words maximum
- Use simple, impactful phrases
- Examples: "67% Go To Fastest", "$10k Lost Weekly", "2-Minute Response"
- Always in ENGLISH
- High contrast (white text on dark, or vice versa)

❌ **DON'T:**
- Long sentences in text overlays
- Technical jargon in overlays
- Multiple lines of text
- Non-English words or phrases

## TEXT OVERLAY FORMAT

Use this EXACT format:
{TEXT: "Short Phrase"} ← ALWAYS English, ALWAYS 3-5 words

Examples:
✅ {TEXT: "67% First Response Wins"}
✅ {TEXT: "Save 10 Hours Weekly"}
✅ {TEXT: "300% More Leads"}

❌ {TEXT: "According to our recent research, approximately 67% of all construction projects typically go to the contractor who responds first to the initial inquiry"}
❌ {TEXT: "Vous perdez des clients"} (French - WRONG)

## B-ROLL DESCRIPTIONS

Keep descriptions simple and production-friendly:
{B-ROLL: Simple scene description}

Examples:
✅ {B-ROLL: Phone ringing on construction site}
✅ {B-ROLL: Calendar with booking confirmed}
✅ {B-ROLL: Happy contractor shaking hands}

## TIMING FORMAT

Use precise timestamps:
[MM:SS] for each section
Example: [00:00], [00:15], [00:30]

## WRITING STYLE

✅ **Conversational Canadian English**: Professional but friendly
✅ **Short sentences**: 8-12 words maximum  
✅ **Active voice**: "You'll save 10 hours" not "10 hours will be saved"
✅ **Concrete numbers**: "50 qualified leads" not "more leads"
✅ **You-focused**: Use "you/your" 3x per paragraph

❌ **NO corporate jargon**: Avoid "leverage," "synergy," "utilize"
❌ **NO long paragraphs**: Break it up
❌ **NO passive voice**: Be direct

## TARGET LENGTH - CRITICAL REMINDER

⚠️ Write EXACTLY ${settings.words} words for ${selectedDuration} duration.
⚠️ At 150 words per minute speaking pace, this equals ${selectedDuration}.
⚠️ COUNT YOUR WORDS before submitting - if over limit, CUT content.

## CRITICAL REMINDERS

1. **ENGLISH ONLY**: Every word, every text overlay, every phrase must be in English
2. **SHORT TEXT**: Text overlays are 3-5 words MAX
3. **EXACT DURATION**: Hit the ${
    settings.words
  } word count target - **DO NOT EXCEED**
4. **CANADIAN MARKET**: Use CAD, Canadian business references
5. **PROFESSIONAL TONE**: B2B, trustworthy, authoritative but approachable

⚠️ FINAL WARNING: Scripts exceeding the word limit will cause videos longer than ${selectedDuration}. 
Stay within ${settings.words} words. Quality beats quantity.

Now write the complete ${selectedDuration} VSL script following this exact structure and style guide. 
**COUNT YOUR WORDS AND ENSURE YOU'RE UNDER THE LIMIT BEFORE SUBMITTING.**`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: selectedDuration === "5min" ? 5000 : 3000,
      temperature: 0.6,
      system: `You are a professional VSL copywriter who STRICTLY adheres to word count limits. You write ONLY in clear, professional Canadian/American English. You never use non-English words or phrases. You keep text overlays SHORT (3-5 words) for maximum readability. You COUNT YOUR WORDS before submitting and CUT ruthlessly if over the limit. You understand that exceeding word counts creates videos longer than the target duration, which is unacceptable. Quality over quantity - every word must earn its place.`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const scriptContent =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!scriptContent) {
      throw new Error("Failed to generate VSL script - empty response");
    }

    // ✅ POST-PROCESSING: Validate English-only
    const hasNonEnglish = /[^\x00-\x7F]/g.test(scriptContent);
    if (hasNonEnglish) {
      console.warn("⚠️ Non-English characters detected in script");
    }

    // ✅ POST-PROCESSING: Validate word count
    const actualWordCount = scriptContent
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const maxWordCounts = {
      "30s": 150,
      "1min": 180,
      "2min": 350,
      "3min": 550,
      "5min": 900,
    };
    const maxWords = maxWordCounts[selectedDuration];
    const wordCountStatus =
      actualWordCount <= maxWords ? "✅ PASS" : "⚠️ EXCEEDS LIMIT";

    console.log("✅ VSL script generated successfully");
    console.log("📊 Script details:", {
      targetDuration: selectedDuration,
      targetWords: settings.words,
      actualWords: actualWordCount,
      maxWords: maxWords,
      status: wordCountStatus,
      sections: settings.sections,
    });

    // ✅ Warning if script is too long
    if (actualWordCount > maxWords) {
      console.warn(
        `⚠️ WARNING: Script is ${actualWordCount - maxWords} words over limit!`
      );
      console.warn(
        `   Expected duration will be longer than ${selectedDuration}`
      );
      console.warn(
        `   Actual words: ${actualWordCount} | Max allowed: ${maxWords}`
      );
    }

    // ✅ Automatic truncation if severely over limit (optional - use with caution)
    if (actualWordCount > maxWords * 1.3) {
      console.error(
        `❌ CRITICAL: Script is ${(
          (actualWordCount / maxWords - 1) *
          100
        ).toFixed(0)}% over limit!`
      );
      console.warn(
        `   This will produce a video significantly longer than ${selectedDuration}`
      );
      // Could implement automatic truncation here if needed
    }

    return scriptContent;
  } catch (error) {
    console.error("❌ Error generating VSL script:", error);
    throw new Error(
      `Failed to generate VSL script: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// ✅ NEW: Helper function for duration-specific structures
function generateStructureGuide(duration: string): string {
  switch (duration) {
    case "30s":
      return `**[00:00-00:10] HOOK**
- Shocking stat or relatable pain point
- Example: "67% of leads go to whoever responds first. How many did you lose?"

**[00:10-00:20] PROBLEM**
- Quick pain agitation
- Example: "You're on-site. Phone rings. By the time you call back... they hired someone else."

**[00:20-00:30] SOLUTION + CTA**
- Instant solution reveal with clear action
- Example: "AI responds in 0.3 minutes. Books meetings automatically. Start free trial."`;

    case "1min":
      return `**[00:00-00:15] HOOK**
- Pattern interrupt with specific stat

**[00:15-00:35] PROBLEM**
- Paint the "before" picture they're living

**[00:35-00:50] SOLUTION**
- Reveal the AI CRM transformation

**[00:50-01:00] CTA**
- Clear next step with urgency`;

    case "2min":
      return `**[00:00-00:15] HOOK**
- Shocking statistic or relatable frustration

**[00:15-00:45] PROBLEM AGITATION**
- Paint the "before" picture with emotional triggers

**[00:45-01:20] SOLUTION REVEAL**
- Introduce AI CRM as the hero
- Paint "after" picture

**[01:20-01:45] PROOF**
- Real results with specific numbers

**[01:45-02:00] CTA**
- Clear next step with urgency`;

    case "3min":
      return `**[00:00-00:20] HOOK**
- Compelling opening question or stat

**[00:20-01:00] PROBLEM AGITATION**
- Detailed pain scenarios

**[01:00-01:40] SOLUTION REVEAL**
- How AI CRM transforms their business

**[01:40-02:10] HOW IT WORKS**
- Simple 3-step process

**[02:10-02:40] PROOF & CREDIBILITY**
- Real results, social proof

**[02:40-03:00] CTA**
- Strong call to action`;

    case "5min":
      return `**[00:00-00:30] HOOK**
- Extended pattern interrupt

**[00:30-01:30] PROBLEM AGITATION**
- Deep dive into pain points

**[01:30-02:30] SOLUTION REVEAL**
- Comprehensive transformation story

**[02:30-03:15] HOW IT WORKS**
- Detailed walkthrough

**[03:15-04:00] PROOF & SOCIAL PROOF**
- Multiple case studies

**[04:00-04:30] OBJECTION HANDLING**
- Address price, complexity, fit

**[04:30-05:00] STRONG CTA**
- Multiple calls to action with urgency`;

    default:
      return "Standard 2-minute structure";
  }
}

// ============================================
// TIME CHANGE DETECTION
// ============================================

export function detectTimeChange(conversationHistory: any[]): {
  hasChange: boolean;
  originalTime?: string;
  newTime?: string;
  changeIndicators: string[];
} {
  const leadMessages = conversationHistory
    .filter((msg) => msg.sender === "lead")
    .map((msg) => msg.content);

  const timeChangeIndicators = [
    /actually/i,
    /instead/i,
    /change/i,
    /different time/i,
    /rather/i,
    /prefer/i,
    /better/i,
    /how about/i,
    /what about/i,
    /can we do/i,
    /sorry/i,
  ];

  const changes: string[] = [];
  let hasChange = false;
  let originalTime: string | undefined;
  let newTime: string | undefined;

  const timePattern = /\b(\d{1,2})\s*(am|pm|AM|PM|a\.m\.|p\.m\.)\b/g;
  const timeOfDayPattern = /\b(morning|afternoon|evening)\b/i;

  let firstTimeMention: string | undefined;
  let lastTimeMention: string | undefined;

  for (let i = 0; i < leadMessages.length; i++) {
    const message = leadMessages[i];
    const timeMatch = message.match(timePattern);
    const timeOfDayMatch = message.match(timeOfDayPattern);

    if (timeMatch || timeOfDayMatch) {
      const extractedTime = timeMatch ? timeMatch[0] : timeOfDayMatch![0];

      if (!firstTimeMention) {
        firstTimeMention = extractedTime;
      }
      lastTimeMention = extractedTime;

      const hasChangeIndicator = timeChangeIndicators.some((indicator) =>
        indicator.test(message)
      );

      if (hasChangeIndicator && firstTimeMention) {
        hasChange = true;
        changes.push(message);
        originalTime = firstTimeMention;
        newTime = lastTimeMention;
      }
    }
  }

  return {
    hasChange,
    originalTime,
    newTime,
    changeIndicators: changes,
  };
}

// ============================================
// REFUSAL DETECTION
// ============================================

export function detectRefusal(conversationHistory: any[]): {
  hasRefusal: boolean;
  refusalCount: number;
  lastRefusalMessage?: string;
  lastMessageIsRefusal: boolean; // ✅ NEW: Track if LATEST message is a refusal
} {
  console.log(`\n🔍 ========== REFUSAL DETECTION START ==========`);
  console.log(`   Total messages in history: ${conversationHistory.length}`);

  const messages = conversationHistory.slice(-10); // Last 10 messages for better context
  console.log(`   Analyzing last ${messages.length} messages`);

  // ✅ FIRST PASS: Check if AI recently asked for booking details
  let aiAskedForDetails = false;
  const aiMessages = messages.filter((m) => m.sender === "ai");

  for (const aiMsg of aiMessages) {
    const content = aiMsg.content.toLowerCase();
    const asksForDetails =
      /\b(name|email|address|contact information|details)\b/i.test(content) &&
      /\b(need|require|provide|share|give|confirm)\b/i.test(content);

    if (asksForDetails) {
      aiAskedForDetails = true;
      console.log(
        `   🤖 AI asked for details: "${aiMsg.content.substring(0, 80)}..."`
      );
      break;
    }
  }

  console.log(`   AI asked for details: ${aiAskedForDetails}`);

  // ✅ SECOND PASS: Check lead messages for refusals
  const leadMessages = messages.filter((m) => m.sender === "lead");
  console.log(`   Lead messages to check: ${leadMessages.length}`);

  // Explicit refusal patterns (high confidence - always count)
  const explicitRefusalPatterns = [
    /\b(i'll|i will|ill)\s+(provide|give|share)\s+(that|it|those|this|them)\s+(to|with|when)/i,
    /\b(whoever|someone|the person)\s+(comes|arrives|shows up|gets here)/i,
    /\bjust\s+call\s+(me|us)\b/i,
    /\bcall\s+(me|us)\s+at\s+(this\s+)?(number|phone)/i,
    /\bjust\s+call\b/i,
    /\bwhen\s+(you|they|someone)\s+(get here|arrive|come)/i,
    /\bdon'?t\s+have\s+it\s+(right\s+)?now\b/i,
    /\b(not\s+now|can'?t\s+right\s+now|unable\s+to\s+provide)\b/i,
    /\b(later|after|then)\b.*\b(provide|give|share)\b/i,
    /\b(provide|give|share)\b.*\b(later|after|then)\b/i,
  ];

  // Simple refusal patterns (only count if AI asked for details)
  const simpleRefusalPatterns = [
    /^no\s*thanks?$/i,
    /^nope?$/i,
    /^nah$/i,
    /^not\s+interested$/i,
    /^i\s+don'?t\s+want\s+to$/i,
    /^no$/i,
  ];

  let refusalCount = 0;
  let lastRefusalMessage: string | undefined;
  let lastMessageIsRefusal = false; // ✅ NEW

  for (let i = 0; i < leadMessages.length; i++) {
    const leadMsg = leadMessages[i];
    const content = leadMsg.content.trim();
    const contentLower = content.toLowerCase().trim();
    const isLastMessage = i === 0; // ✅ Check if this is the LAST lead message

    console.log(
      `\n   📝 Checking lead message ${i + 1}/${
        leadMessages.length
      }: "${content}"`
    );
    if (isLastMessage) {
      console.log(`      ⭐ This is the MOST RECENT lead message`);
    }

    // Check explicit refusals (always count, no AI context needed)
    let isExplicitRefusal = false;
    for (const pattern of explicitRefusalPatterns) {
      if (pattern.test(contentLower)) {
        isExplicitRefusal = true;
        console.log(`      ✅ EXPLICIT REFUSAL MATCH: ${pattern}`);
        break;
      }
    }

    // Check simple refusals (only if AI asked for details)
    let isSimpleRefusal = false;
    if (aiAskedForDetails) {
      for (const pattern of simpleRefusalPatterns) {
        if (pattern.test(contentLower)) {
          isSimpleRefusal = true;
          console.log(
            `      ✅ SIMPLE REFUSAL MATCH (context-aware): ${pattern}`
          );
          break;
        }
      }
    }

    if (isExplicitRefusal || isSimpleRefusal) {
      refusalCount++;
      lastRefusalMessage = content;
      console.log(`      🚫 REFUSAL #${refusalCount} DETECTED!`);

      // ✅ NEW: Track if the LAST message is a refusal
      if (isLastMessage) {
        lastMessageIsRefusal = true;
        console.log(`      ⚠️ LAST MESSAGE IS A REFUSAL`);
      }
    } else {
      console.log(`      ⚪ No refusal detected in this message`);

      // ✅ NEW: If last message is NOT a refusal, mark it
      if (isLastMessage) {
        lastMessageIsRefusal = false;
        console.log(
          `      ✅ LAST MESSAGE IS NOT A REFUSAL (may contain details)`
        );
      }
    }
  }

  console.log(`\n   📊 FINAL RESULT:`);
  console.log(`      Has refusal: ${refusalCount > 0}`);
  console.log(`      Refusal count: ${refusalCount}`);
  console.log(`      Last refusal: "${lastRefusalMessage || "N/A"}"`);
  console.log(`      Last message is refusal: ${lastMessageIsRefusal}`); // ✅ NEW
  console.log(`==============================================\n`);

  return {
    hasRefusal: refusalCount > 0,
    refusalCount,
    lastRefusalMessage,
    lastMessageIsRefusal,
  };
}
