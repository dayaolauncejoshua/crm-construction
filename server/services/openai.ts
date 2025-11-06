// server/services/openai.ts

import OpenAI from "openai";
import { spamPatternLearning } from "./spamPatternLearning";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

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

export interface AuditResult {
  wins: string[];
  risks: string[];
  timeline: string;
  estimatedROI: string;
  score: number;
}

export interface IntentClassification {
  isRelevant: boolean;
  intent: "construction" | "unrelated" | "spam" | "test";
  confidence: number;
  reasoning: string;
}

// ✅ NEW: Extract lead details from conversation
export interface ExtractedLeadDetails {
  name?: string;
  email?: string;
  address?: string;
  confidence: number;
}

// ✅ IMPROVED: Context-aware keyword detection
function hasNonConstructionKeywords(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // ✅ CRITICAL: Check for CONSTRUCTION CONTEXT first
  const constructionIndicators = [
    "kitchen renovation",
    "restaurant kitchen",
    "commercial kitchen",
    "kitchen remodel",
    "warehouse",
    "building",
    "construction",
    "renovation",
    "remodel",
    "site visit",
    "contractor",
    "build",
    "repair",
    "install",
  ];

  // If message contains construction context, DON'T mark as spam
  if (
    constructionIndicators.some((indicator) => lowerMessage.includes(indicator))
  ) {
    console.log("✅ Construction context detected, not spam");
    return false;
  }

  // ✅ NOW check for non-construction keywords (more specific)
  const nonConstructionKeywords = [
    // Food & Beverages (SPECIFIC items only, NOT "restaurant")
    "burger",
    "pizza",
    "fries",
    "food delivery",
    "menu",
    "order food",
    "meal delivery",
    "catering",
    "bakery",
    "coffee shop order",

    // Retail Products (specific items)
    "shoes",
    "clothing",
    "shirt",
    "pants",
    "dress",
    "fashion",
    "sneakers",
    "watch",
    "jewelry",
    "handbag",

    // Services (non-construction)
    "haircut",
    "salon",
    "spa",
    "massage",
    "laundry",
    "dry clean",

    // Entertainment
    "movie tickets",
    "concert tickets",

    // Technology (non-construction)
    "phone repair",
    "laptop",
    "software",

    // Test/Spam
    "test test",
    "hello hello",
    "hi hi",
  ];

  return nonConstructionKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );
}

// ✅ NEW: Check if message is just a greeting
function isOnlyGreeting(message: string): boolean {
  const greetingPatterns =
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\s!?.]*$/i;
  return greetingPatterns.test(message.trim());
}

// ✅ NEW: Check if message needs more context before classifying as spam
function needsMoreContext(
  message: string,
  conversationHistory: any[]
): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // Vague messages that need context
  const vaguePatterns = [
    /^(hi|hello|hey)$/i,
    /^(yeah|yes|yep|ok|okay)$/i,
    /^(maybe|perhaps)$/i,
    /^construction$/i,
    /^(i want to meet|can we meet|let's meet|i want to book)$/i,
  ];

  // If message is vague AND we have less than 3 lead messages, wait for more context
  const leadMessages = conversationHistory.filter((m) => m.sender === "lead");

  if (
    leadMessages.length < 3 &&
    vaguePatterns.some((pattern) => pattern.test(lowerMessage))
  ) {
    console.log(
      "⏸️ Vague message detected, waiting for more context before classifying"
    );
    return true;
  }

  return false;
}

// ✅ NEW: Extract lead details from conversation using AI
export async function extractLeadDetails(
  conversationHistory: any[]
): Promise<ExtractedLeadDetails> {
  try {
    const conversationText = conversationHistory
      .filter((msg) => msg.sender === "lead") // Only look at lead's messages
      .map((msg) => msg.content)
      .join("\n");

    const prompt = `Extract the lead's personal information from these messages:

${conversationText}

**EXTRACT:**
- Full name (first and last name if mentioned)
- Email address (must be valid format with @ and .)
- Specific address (COMPLETE address with street number, street name, and city)

**ADDRESS RULES:**
- Must include street number AND street name (e.g., "123 Main St", "3757 Anchor Way")
- Must be specific enough for a site visit
- Can include rural routes (e.g., "RR2"), postal codes, province/state
- "British Columbia" alone is NOT specific enough
- "Vancouver" alone is NOT specific enough
- "123 Main St, Vancouver" IS specific enough ✅
- "3757 Anchor Way RR2 Pender Island BC V0N 2M2" IS specific enough ✅

**RULES:**
- Only extract information that is EXPLICITLY stated
- For address: Must include street name/number AND city (not just province/state)
- For name: Must be a real name (not phone numbers like "639542269454")
- For email: Must be valid format with @ symbol (not "whatsapp_639@temp.com")
- If not found, return null for that field

**EXAMPLES:**
"I'm John Smith from Vancouver" → name: "John Smith"
"Email me at john@construction.com" → email: "john@construction.com"
"Visit us at 123 Main St, Vancouver" → address: "123 Main St, Vancouver"
"My name is Jane" → name: "Jane" (partial name)
"I live in British Columbia" → address: null (not specific enough)

Respond with JSON only:
{
  "name": "Full Name" or null,
  "email": "email@example.com" or null,
  "address": "123 Street, City" or null,
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an information extraction expert. Extract ONLY explicitly stated information. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

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

export async function classifyIntent(
  message: string,
  conversationHistory: any[],
  clientData: any
): Promise<IntentClassification> {
  try {
    // First message spam detection (Proactive)
    if (conversationHistory.length <= 2) {
      const firstMessageSpamIndicators = [
        /test\s*test/i,
        /hello\s*hello/i,
        /hi\s*hi/i,
        /^(ok|okay|k)$/i, // Single word responses
        /^[0-9]+$/, // Just numbers
        /^.{1,3}$/, // Very short messages (1-3 chars)
        /^(yes|no|yeah|nope)$/i, // One-word yes/no
      ];

      for (const indicator of firstMessageSpamIndicators) {
        if (indicator.test(message.trim())) {
          console.log("🚫 Proactive: First message spam detected:", message);
          return {
            isRelevant: false,
            intent: "test",
            confidence: 0.9,
            reasoning:
              "First message matches spam pattern (test/short/low-effort)",
          };
        }
      }
    }

    // Check learned patterns FIRST (before hardcoded keywords)
    const learnedPatternCheck =
      await spamPatternLearning.checkAgainstLearnedPatterns(message);
    if (learnedPatternCheck.isSpam && learnedPatternCheck.confidence > 0.85) {
      console.log(
        "🎯 Learned spam pattern detected:",
        learnedPatternCheck.matchedPattern
      );
      return {
        isRelevant: false,
        intent: "unrelated",
        confidence: learnedPatternCheck.confidence,
        reasoning: `Matches learned spam pattern: "${learnedPatternCheck.matchedPattern}" (${learnedPatternCheck.category})`,
      };
    }

    // ✅ NEW: Check if we need more context BEFORE classifying as spam
    if (needsMoreContext(message, conversationHistory)) {
      console.log("⏸️ Waiting for more context before classification");
      return {
        isRelevant: true, // ✅ Assume relevant until proven otherwise
        intent: "construction",
        confidence: 0.5,
        reasoning: "Waiting for more context - giving lead benefit of doubt",
      };
    }

    // Hardcoded keyword check (fast path)
    if (hasNonConstructionKeywords(message)) {
      console.log("🚫 Hardcoded keyword detected:", message);
      return {
        isRelevant: false,
        intent: "unrelated",
        confidence: 0.95,
        reasoning:
          "Message contains non-construction keywords (shoes, food, etc.)",
      };
    }

    // Handle greetings
    if (isOnlyGreeting(message) && conversationHistory.length <= 1) {
      console.log("👋 Initial greeting detected, waiting for context");
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.5,
        reasoning: "Initial greeting - waiting for context",
      };
    }

    // ✅ Analyze conversation trend (not just latest message)
    const conversationText = conversationHistory
      .map((msg) => {
        const sender = msg.sender === "lead" ? "Customer" : "Agent";
        return `${sender}: ${msg.content}`;
      })
      .join("\n");

    const prompt = `You are a STRICT intent classifier for ${
      clientData?.name || "a construction company"
    }.

COMPANY SERVICES (ONLY THESE):
- Commercial building construction
- Residential construction
- Fit-outs and renovations
- Project management
- Construction consulting
- Site development
- Engineering services
- Architecture

CONVERSATION HISTORY:
${conversationText}

LATEST MESSAGE: "${message}"

**TASK:** Determine if this inquiry is relevant to construction services.

**RELEVANT (construction-related ONLY):**
✅ Building, construction, renovation, remodeling
✅ Project inquiries (residential, commercial, industrial)
✅ Site development, land development
✅ Engineering, architecture, design services
✅ Construction quotes, estimates, pricing
✅ Timeline, project scheduling
✅ Materials for construction (cement, steel, etc.)
✅ Construction equipment rental
✅ Permits, licensing, compliance

**NOT RELEVANT (mark as unrelated):**
❌ Food & beverages (burger, pizza, fries, restaurant, food delivery, meal orders)
❌ Retail products (shoes, clothing, fashion, accessories, watches, jewelry)
❌ Personal services (salon, spa, massage, cleaning, laundry)
❌ Entertainment (movies, concerts, tickets, events)
❌ Healthcare (doctor, clinic, medicine, pharmacy)
❌ Technology products (phones, laptops, software, apps)
❌ Transportation (taxi, delivery service, shipping)
❌ Test messages ("test test", "hello hello" without context)
❌ Spam or advertising other businesses
❌ Random questions unrelated to construction

**CRITICAL RULES:**
1. If mentions shoes, food, clothing, retail → ALWAYS NOT RELEVANT
2. If about services NOT related to construction → ALWAYS NOT RELEVANT
3. BE STRICT - When in doubt, mark as NOT RELEVANT
4. Greeting alone (first message) can be neutral

**EXAMPLES:**

✅ "I want to build a house" → RELEVANT (construction)
✅ "How much for commercial building?" → RELEVANT (construction quote)
✅ "Do you do renovations?" → RELEVANT (construction service)
✅ "Can you construct a warehouse?" → RELEVANT (construction project)

❌ "Do you sell shoes?" → NOT RELEVANT (retail product)
❌ "I need a burger" → NOT RELEVANT (food order)
❌ "Can you deliver pizza?" → NOT RELEVANT (food delivery)
❌ "Do you build customized shoes?" → NOT RELEVANT (shoes are NOT construction)
❌ "I want to eat" → NOT RELEVANT (food)
❌ "How about fries?" → NOT RELEVANT (food)
❌ "testing testing" → NOT RELEVANT (test message)
❌ "Do you fix phones?" → NOT RELEVANT (tech repair)

Respond with JSON only:
{
  "isRelevant": true/false,
  "intent": "construction" | "unrelated" | "spam" | "test",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a STRICT intent classification expert. Respond only with valid JSON. Be VERY strict - only mark as relevant if it's CLEARLY construction-related.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      isRelevant: result.isRelevant ?? false,
      intent: result.intent || "unrelated",
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || "Unable to classify intent",
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    return {
      isRelevant: false,
      intent: "unrelated",
      confidence: 0.5,
      reasoning: "Classification failed, defaulting to unrelated for safety",
    };
  }
}

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

      console.log("🎯 Intent Classification:", intentClassification);

      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.6
      ) {
        console.log("❌ Non-construction inquiry detected");
        return {
          score: 0.05,
          intent: intentClassification.intent,
          urgency: "none",
          budget: "unqualified",
          timeline: "none",
          needsHumanAttention: false,
          reasoning: `Non-construction inquiry: ${intentClassification.reasoning}`,
          nextAction: "mark_as_not_a_lead",
        };
      }
    }

    const conversationText = conversationHistory
      .map((msg) => {
        const sender = msg.sender === "lead" ? "Customer" : "Agent";
        return `${sender}: ${msg.content}`;
      })
      .join("\n");

    const messageCount = conversationHistory.length;
    const customerMessageCount = conversationHistory.filter(
      (m) => m.sender === "lead"
    ).length;

    const prompt = `You are a lead qualification expert for a construction company.

Analyze this conversation and score from 0.0 to 1.0 based on:

**CONVERSATION CONTEXT:**
- Total messages: ${messageCount}
- Customer messages: ${customerMessageCount}
- Engagement quality matters: Quick detailed responses = higher score

**HIGH SCORE (0.7-1.0) - Hot Lead:**
Must have **BUDGET (2M+ PHP)** PLUS at least **TWO** of these:

1. ⏰ **URGENCY:** "ASAP", "urgent", "need to start in 2-6 weeks", "time-sensitive", "choosing contractor this week"
2. 👔 **DECISION MAKER:** "I'm the owner", "CEO", "I decide", "my company", "I'm authorized to sign"
3. 📅 **MEETING CONFIRMED:** Either requested meeting OR accepted meeting invitation quickly
4. 🏆 **COMPETITIVE:** "comparing 3 contractors", "need proposal by Friday", "getting quotes"
5. 📋 **DETAILED SCOPE:** Full project plan, specific requirements, ready to move forward

**MEDIUM SCORE (0.4-0.69) - Warm Lead:**
- Budget mentioned (2M+) but no urgency
- Budget + project details (type, location, size, timeline)
- Engaged, provides detailed answers
- Timeline flexible ("in a few months", "6-12 months", "planning stage")
- Accepts meeting but not urgent about it
- Shopping around casually

**SCORING MODIFIERS:**
- **+0.05-0.10:** Accepts meeting invitation quickly (within 1-2 messages)
- **+0.05:** Provides all details in first/second response (shows readiness)
- **-0.05:** Takes many messages to provide basic info (low engagement)
- **-0.10:** Keeps asking "how much?" without providing project details

**LOW SCORE (0.0-0.39) - Cold Lead:**
- Only asks "price?", "how much?", "cost?" without context
- No budget mentioned
- No project details after multiple prompts
- Just browsing, tire-kicker behavior
- One-word responses repeatedly

**EXAMPLES:**
- "3M budget, commercial building, Pago La Union, 6-12 months timeline" = **0.55** (WARM - budget + details but no urgency)
- "3M budget, commercial building, I'm ready to meet Thursday" = **0.65** (HIGHER WARM - accepted meeting quickly)
- "5M budget, URGENT, need in 4 weeks, I'm the CEO, when can we meet?" = **0.85** (HOT - budget + urgency + decision maker + meeting)
- "3M budget, NEED to start next month, comparing 3 contractors, I decide" = **0.80** (HOT - budget + urgency + decision maker + competitive)
- "How much?" = **0.15** (COLD)
- "2M budget but no rush, maybe start next year" = **0.40** (WARM but low - budget but very flexible timeline, don't push)
- "3M budget, 6-8 months timeline, just getting quotes" = **0.50** (WARM - engaged but not ready, nurture relationship)

Lead Data:
- Name: ${leadData.firstName} ${leadData.lastName}
- Company: ${leadData.company}
- Email: ${leadData.email}
- Phone: ${leadData.phone}

CONVERSATION:
${conversationText}

**CRITICAL RULES:**
1. Budget + project details alone = 0.50-0.59 (Warm)
2. Budget + details + meeting acceptance = 0.60-0.69 (Higher Warm)
3. Budget + urgency + decision maker = 0.70-0.79 (Hot)
4. Budget + urgency + decision maker + meeting + competitive = 0.80-1.0 (Very Hot)
5. Set needsHumanAttention to true ONLY if score >= 0.7
6. Consider message count - quick detailed responses show higher intent

Respond with JSON only:
{
  "score": 0.65,
  "intent": "high",
  "urgency": "moderate",
  "budget": "qualified",
  "timeline": "months",
  "needsHumanAttention": false,
  "reasoning": "3M budget, full project details (commercial building, location, timeline), accepted meeting invitation quickly. No urgency signals or decision maker confirmation yet.",
  "nextAction": "Confirm meeting details and qualify decision-making authority during site visit"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a lead qualification expert. Always respond with valid JSON. Score based on multiple buying signals - budget alone is not enough for a hot lead. Meeting acceptance is a strong positive signal.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const finalScore = Math.max(0, Math.min(1, result.score || 0.5));

    return {
      score: finalScore,
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: finalScore >= 0.7,
      reasoning: result.reasoning || "Lead qualified based on conversation",
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

// ✅ NEW: Check if AI is about to repeat itself
function isRepetitiveResponse(
  proposedResponse: string,
  conversationHistory: any[]
): { isRepetitive: boolean; lastAIMessage?: string } {
  // Get last 3 AI messages
  const recentAIMessages = conversationHistory
    .filter((msg) => msg.sender === "ai")
    .slice(-3)
    .map((msg) => msg.content.toLowerCase().trim());

  if (recentAIMessages.length === 0) {
    return { isRepetitive: false };
  }

  const proposedLower = proposedResponse.toLowerCase().trim();

  // Check for exact or near-exact repetition
  for (const prevMessage of recentAIMessages) {
    // Exact match
    if (prevMessage === proposedLower) {
      console.warn("🚫 EXACT REPETITION DETECTED!");
      return { isRepetitive: true, lastAIMessage: prevMessage };
    }

    // Similar match (>80% overlap)
    const similarity = calculateSimilarity(proposedLower, prevMessage);
    if (similarity > 0.8) {
      console.warn(
        `🚫 SIMILAR REPETITION DETECTED! (${(similarity * 100).toFixed(
          0
        )}% match)`
      );
      return { isRepetitive: true, lastAIMessage: prevMessage };
    }
  }

  // Check if asking same question again
  const questionPatterns = [
    /are you available/i,
    /what time works/i,
    /which day/i,
    /when (are|can|would) you/i,
    /could you (share|tell|provide)/i,
  ];

  const lastAIMessage = recentAIMessages[recentAIMessages.length - 1];

  for (const pattern of questionPatterns) {
    const proposedHasQuestion = pattern.test(proposedResponse);
    const lastHadQuestion = pattern.test(lastAIMessage);

    if (proposedHasQuestion && lastHadQuestion) {
      console.warn(`🚫 REPEATED QUESTION DETECTED: ${pattern}`);
      return { isRepetitive: true, lastAIMessage };
    }
  }

  return { isRepetitive: false };
}

// ✅ Helper: Calculate text similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// ✅ Helper: Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// ✅ NEW: Extract lead's stated timeline from conversation
function extractLeadTimeline(conversationHistory: any[]): {
  hasTimeline: boolean;
  timelineType:
    | "immediate"
    | "soon"
    | "months"
    | "next-year"
    | "flexible"
    | "unknown";
  rawTimeline: string;
} {
  // Get all lead messages
  const leadMessages = conversationHistory
    .filter((msg) => msg.sender === "lead")
    .map((msg) => msg.content.toLowerCase())
    .join(" ");

  // Timeline patterns (from most to least urgent)
  const immediatePatterns = [
    /asap/i,
    /urgent/i,
    /immediately/i,
    /right away/i,
    /as soon as possible/i,
    /this week/i,
    /next week/i,
    /within.*\d+.*week/i,
  ];

  const soonPatterns = [
    /in.*month/i,
    /next month/i,
    /1-2 months/i,
    /2-3 months/i,
    /couple.*months/i,
  ];

  const monthsPatterns = [
    /\d+-\d+.*months/i, // "6-8 months"
    /in.*\d+.*months/i, // "in 6 months"
    /few months/i,
    /several months/i,
    /half.*year/i,
  ];

  const nextYearPatterns = [
    /next year/i,
    /2026/i,
    /in a year/i,
    /maybe.*year/i,
  ];

  const flexiblePatterns = [
    /no rush/i,
    /flexible/i,
    /just browsing/i,
    /just looking/i,
    /getting quotes/i,
    /planning stage/i,
  ];

  // Check patterns in order of urgency
  if (immediatePatterns.some((p) => p.test(leadMessages))) {
    const match = leadMessages.match(
      /(asap|urgent|this week|next week|within.*week)/i
    );
    return {
      hasTimeline: true,
      timelineType: "immediate",
      rawTimeline: match ? match[0] : "immediate",
    };
  }

  if (soonPatterns.some((p) => p.test(leadMessages))) {
    const match = leadMessages.match(/(in.*month|next month|\d+-\d+.*month)/i);
    return {
      hasTimeline: true,
      timelineType: "soon",
      rawTimeline: match ? match[0] : "in a month",
    };
  }

  if (monthsPatterns.some((p) => p.test(leadMessages))) {
    const match = leadMessages.match(
      /(\d+-\d+.*months|in.*\d+.*months|few months)/i
    );
    return {
      hasTimeline: true,
      timelineType: "months",
      rawTimeline: match ? match[0] : "several months",
    };
  }

  if (nextYearPatterns.some((p) => p.test(leadMessages))) {
    const match = leadMessages.match(/(next year|2026|in a year)/i);
    return {
      hasTimeline: true,
      timelineType: "next-year",
      rawTimeline: match ? match[0] : "next year",
    };
  }

  if (flexiblePatterns.some((p) => p.test(leadMessages))) {
    const match = leadMessages.match(/(no rush|flexible|planning stage)/i);
    return {
      hasTimeline: true,
      timelineType: "flexible",
      rawTimeline: match ? match[0] : "flexible timeline",
    };
  }

  return {
    hasTimeline: false,
    timelineType: "unknown",
    rawTimeline: "",
  };
}

export async function generateAIResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any,
  hasPendingBooking?: boolean,
  daySuggestions?: string
): Promise<string> {
  try {
    const latestMessage = conversationHistory[conversationHistory.length - 1];

    if (latestMessage && latestMessage.sender === "lead") {
      const intentClassification = await classifyIntent(
        latestMessage.content,
        conversationHistory,
        clientData
      );

      console.log("🎯 Response Intent Check:", intentClassification);

      // Lower confidence threshold from 0.7 to 0.6
      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.6
      ) {
        console.log("❌ Generating redirect response for off-topic inquiry");

        const redirectCount = conversationHistory.filter(
          (msg) =>
            msg.sender === "ai" &&
            (msg.content.includes("construction company") ||
              msg.content.includes("building projects") ||
              msg.content.includes("wrong business") ||
              msg.content.includes("might have been some confusion") ||
              msg.content.includes("specialize in construction"))
        ).length;

        console.log(`🔢 Redirect count: ${redirectCount}`);

        if (redirectCount >= 2) {
          console.log(
            "⛔ Maximum redirects reached, sending termination message"
          );
          return `Final notice: This is ${
            clientData?.name || "a construction company"
          }. We only handle construction and building projects. This conversation will not receive further responses. Please verify your contact information.`;
        }

        const redirectResponses = [
          // First redirect (friendly)
          `Hi! I think there might be some confusion. We're ${
            clientData?.name || "a construction company"
          } specializing in building projects. We handle construction, renovations, and development projects. If you have a construction project in mind, I'd be happy to help!`,

          // Second redirect (firmer)
          `Just to clarify: we're a construction company. We build commercial buildings, homes, and handle renovation projects. If you're looking for construction services, I'm here to assist. Otherwise, you may have reached us by mistake.`,
        ];

        return redirectResponses[
          Math.min(redirectCount, redirectResponses.length - 1)
        ];
      }
    }

    // ============================================
    // ✅ STEP 1: ANALYZE CONTEXT FIRST (BEFORE PROMPT)
    // ============================================

    const lastLeadMessage =
      conversationHistory.filter((msg) => msg.sender === "lead").slice(-1)[0]
        ?.content || "";

    const lastAIQuestion =
      conversationHistory.filter((msg) => msg.sender === "ai").slice(-1)[0]
        ?.content || "";

    // ✅ Extract timeline from conversation
    const timeline = extractLeadTimeline(conversationHistory);

    // Detect if lead changed their preferred time
    const timeChange = detectTimeChange(conversationHistory);

    console.log("📊 Context Analysis:");
    console.log(`   Last AI asked: "${lastAIQuestion.substring(0, 80)}..."`);
    console.log(`   Lead responded: "${lastLeadMessage}"`);
    console.log(
      `   Lead timeline: ${timeline.timelineType} (${timeline.rawTimeline})`
    );

    // ✅ NEW: Log time change detection
    if (timeChange.hasChange) {
      console.log(`   ⚠️ TIME CHANGE DETECTED!`);
      console.log(`      Original: ${timeChange.originalTime}`);
      console.log(`      Changed to: ${timeChange.newTime}`);
      console.log(
        `      Change indicators: ${timeChange.changeIndicators.join(", ")}`
      );
    }

    // ✅ Generate timeline-appropriate messaging
    let timelineGuidance = "";
    if (timeline.hasTimeline) {
      switch (timeline.timelineType) {
        case "immediate":
          timelineGuidance = `\n\n⏰ TIMELINE: Lead said "${timeline.rawTimeline}" - URGENT. Offer meeting today/tomorrow.`;
          break;
        case "soon":
          timelineGuidance = `\n\n⏰ TIMELINE: Lead said "${timeline.rawTimeline}" - offer meeting this/next week.`;
          break;
        case "months":
          timelineGuidance = `\n\n⏰ TIMELINE: Lead said "${timeline.rawTimeline}" - DON'T push for immediate meeting. Offer to discuss plans now, meet closer to start date.`;
          break;
        case "next-year":
          timelineGuidance = `\n\n⏰ TIMELINE: Lead said "${timeline.rawTimeline}" - DON'T suggest "today or tomorrow". Keep conversation light, offer to connect in a few months.`;
          break;
        case "flexible":
          timelineGuidance = `\n\n⏰ TIMELINE: Lead said "${timeline.rawTimeline}" - No rush. Provide value, offer meeting when ready.`;
          break;
      }
    }

    // Add time change awareness
if (timeChange.hasChange) {
  timelineGuidance += `\n\n🔄 TIME CHANGE: Lead originally said "${timeChange.originalTime}" but changed to "${timeChange.newTime}". Use the NEW time (${timeChange.newTime}), NOT the old one!`;
}

    // Detect if lead just answered a scheduling question
    const schedulingAnswerPatterns = [
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(today|tomorrow|next week|this week)\b/i,
      /\b\d{1,2}\s*(am|pm|AM|PM)\b/,
      /\b(morning|afternoon|evening)\b/i,
    ];

    const leadJustAnsweredScheduling = schedulingAnswerPatterns.some(
      (pattern) => pattern.test(lastLeadMessage)
    );

    const aiJustAskedScheduling =
      /are you available|what time|which day|when (can|would|are)/i.test(
        lastAIQuestion
      );

    if (leadJustAnsweredScheduling && aiJustAskedScheduling) {
      console.log(
        "✅ Lead just answered scheduling question - must acknowledge and move forward"
      );
    }

    // ============================================
    // ✅ STEP 2: NOW CREATE PROMPT (AFTER CONTEXT)
    // ============================================

    const conversationText = conversationHistory
      .map((msg) => {
        const sender =
          msg.sender === "lead"
            ? "Customer"
            : msg.sender === "ai"
            ? "You (AI)"
            : "You (Human Agent)";
        return `${sender}: ${msg.content}`;
      })
      .join("\n");

    const lastAIMessage = conversationHistory
      .filter((msg) => msg.sender === "ai")
      .slice(-1)[0];

    const lastAIMessageText = lastAIMessage
      ? `\n\nYOUR LAST MESSAGE WAS: "${lastAIMessage.content}"\n⚠️ DO NOT repeat this information or ask the same questions!`
      : "";

    const bookingAwareness = hasPendingBooking
      ? `\n\n🚨 CRITICAL: This lead already has a PENDING BOOKING scheduled. 
DO NOT ask to schedule again or offer meeting times!
Instead, acknowledge the booking: "Great! Our team will send you the meeting details shortly." or move the conversation forward.`
      : "";

    const daySuggestionsText = daySuggestions || "this week";

    const prompt = `You are a professional construction project manager for ${
      clientData?.name || "a construction company"
    }. You're chatting on WhatsApp with a potential client.
${bookingAwareness}

CONVERSATION HISTORY:
${conversationText}
${lastAIMessageText}

LEAD JUST SENT: "${
      conversationHistory[conversationHistory.length - 1]?.content
    }"
${timelineGuidance}

**YOUR TASK:**
Read the FULL conversation above. See what YOU already asked and what THEY already answered.

**CRITICAL RULES:**
1. ❌ NEVER repeat a question you already asked
2. ❌ NEVER ignore their answer (if they said "Thursday", don't ask "When are you available?")
3. ❌ NEVER suggest times they said they're NOT available
4. ✅ ALWAYS acknowledge their specific answer first
5. ✅ ALWAYS move the conversation forward

**RESPONSE STRATEGY:**

**TIME CHANGE HANDLING:**
IF lead said "9 AM" then later "afternoon is better" → Use afternoon (2 PM), NOT 9 AM
IF lead said "morning" then later "3 PM" → Use 3 PM, NOT morning time
IF they changed their mind → ALWAYS acknowledge: "Perfect! Let's do [NEW TIME] instead."
❌ NEVER confirm the OLD time they changed from

**TIMELINE-BASED APPROACH:**
IF lead said "ASAP" or "urgent" or "this week" → Offer meeting today/tomorrow
IF lead said "in a month" or "next month" → Offer meeting this/next week
IF lead said "6-8 months" or "several months" → Say "Great! Let's discuss your plans now. We can schedule a detailed site visit closer to your start date."
IF lead said "next year" → Say "Perfect! I'll make a note. Feel free to reach out when you're closer to starting. Happy to answer questions in the meantime."
IF lead said "no rush" or "flexible" → Say "No problem! Take your time. Let me know when you'd like to discuss further."

**CRITICAL TIMELINE RULE:**
- ❌ NEVER suggest "today or tomorrow" if they said "next year"
- ❌ NEVER push for immediate meeting if they said "6-8 months"
- ✅ ALWAYS match your urgency to THEIR timeline

IF they just answered your question → Acknowledge it and ask next question
IF they said "Thursday 2 PM" → Say "Perfect! Thursday at 2 PM. What's your address?"
IF they said "I'm not available this week" → Ask about NEXT week, NOT this week
IF they're vague ("maybe", "ok") → Ask clarifying question about their project
IF you asked "Are you available X?" and they answered → DON'T ask about availability again

**TONE:**
- Professional but conversational
- 2-3 sentences max
- Use "${daySuggestionsText}" when suggesting meeting days
- Minimal emojis (1 per message max)

**EXAMPLES:**

✅ GOOD:
You: "Are you available this week?"
Them: "Thursday works"
You: "Great! What time on Thursday?" ← ACKNOWLEDGE + NEXT STEP

❌ BAD:
You: "Are you available this week?"
Them: "Thursday works"
You: "Are you available this week?" ← REPEATED QUESTION

Respond naturally (2-3 sentences):`;

    // ============================================
    // ✅ STEP 3: RETRY LOOP (AFTER PROMPT)
    // ============================================

    let attempts = 0;
    let aiResponse = "";
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an experienced construction project manager with PERFECT MEMORY.

CRITICAL MEMORY RULES:
1. You REMEMBER every question you asked
2. You REMEMBER every answer they gave
3. You NEVER ask the same question twice
4. You ALWAYS acknowledge their answer before moving forward

EXAMPLES OF GOOD MEMORY:
- If you asked "Are you available Thursday?" and they said "Yes, 2 PM"
  → You say "Perfect! Thursday at 2 PM. What's your address?"
  → You DO NOT ask "Are you available Thursday?" again

- If they said "I'm not available this week"
  → You ask about next week, NOT this week again

Keep responses ultra-concise for WhatsApp (2-3 sentences).`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5 + attempts * 0.1,
        max_tokens: 150,
      });

      aiResponse = response.choices[0].message.content || "";

      const repetitionCheck = isRepetitiveResponse(
        aiResponse,
        conversationHistory
      );

      if (!repetitionCheck.isRepetitive) {
        console.log(
          `✅ Non-repetitive response generated (attempt ${attempts})`
        );
        break;
      }

      console.warn(
        `⚠️ Attempt ${attempts}: Repetitive response detected, retrying...`
      );

      if (attempts === maxAttempts) {
        console.error("❌ All retry attempts exhausted, using fallback");
        aiResponse =
          "Thanks for that information! Let me connect you with our team to discuss your project in detail. They'll be in touch shortly.";
      }
    }

    return (
      aiResponse ||
      "Thank you for your message! A team member will respond shortly."
    );
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Thank you for your message. A team member will respond shortly.";
  }
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

// ✅ NEW: Detect if lead changed their preferred time
function detectTimeChange(conversationHistory: any[]): {
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
  ];

  const changes: string[] = [];
  let hasChange = false;
  let originalTime: string | undefined;
  let newTime: string | undefined;

  // Look for time mentions
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

      // Check if this message contains change indicators
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

export async function detectBookingIntent(
  conversationHistory: any[],
  leadData: any
): Promise<BookingIntent> {
  try {
    const conversationText = conversationHistory
      .map(
        (msg) =>
          `${msg.sender === "lead" ? "Customer" : "Agent"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `You are a booking intent detector for a construction company.

CONVERSATION:
${conversationText}

**TASK:** Detect if customer wants to schedule a meeting AND if date/time are CONFIRMED.

**HIGH CONFIDENCE BOOKING (wantsToBook: true, isConfirmed: true, confidence > 0.8):**
✅ Lead says: "November 4 at 2PM" → CONFIRMED
✅ Lead says: "Yes, Thursday at 2PM works" → CONFIRMED
✅ Lead says: "Let's meet Friday afternoon at 3" → CONFIRMED
✅ Agent: "Thursday at 2?" Lead: "Yes" → CONFIRMED

**MEDIUM CONFIDENCE (wantsToBook: true, isConfirmed: false, confidence 0.5-0.7):**
⚠️ Lead says: "I'm available Thursday" (NO time specified) → NOT CONFIRMED
⚠️ Lead says: "this week works" (NO specific day) → NOT CONFIRMED
⚠️ Lead says: "I'd like to meet" (NO date at all) → NOT CONFIRMED
⚠️ Agent just asked: "morning or afternoon?" and lead hasn't responded → NOT CONFIRMED

**LOW CONFIDENCE (wantsToBook: false):**
❌ Just asking questions about services
❌ Vague interest: "maybe later", "I'll think about it"
❌ Still gathering information

**TASK:** Detect if the customer wants to schedule a meeting AND if a FINAL, SPECIFIC date and time have been agreed upon.

...
**CRITICAL RULES:**
1. isConfirmed = true ONLY when BOTH date AND time are specified by lead
2. If agent just asked a follow-up question about booking details → isConfirmed = false
3. "Thursday" without time → NOT confirmed
4. "2 PM" without date → NOT confirmed  
5. "this week" or "next week" → NOT confirmed (too vague)

**EXTRACT IF MENTIONED:**
- Specific date/day: "Thursday", "Friday", "November 15", "next Monday"
- Specific time: MUST PRESERVE AM/PM exactly as stated
  * CRITICAL: Use the MOST RECENT time mentioned by customer
  * If customer says "9 AM" then later "actually 3 PM", use "3 PM"
  * If customer says "morning works" then later "afternoon is better", use "2 PM"
  * ALWAYS extract the LAST time mentioned, not the first
- Location/address: Complete address if mentioned
- Meeting type: "site visit" vs "consultation"

**TIME CHANGE DETECTION - CRITICAL:**

Scan the ENTIRE conversation from START to END. If customer mentions multiple times, use the LAST one mentioned.

**STEP-BY-STEP TIME EXTRACTION:**
1. Read ALL customer messages from first to last
2. Note EVERY time mentioned
3. If customer uses words like "actually", "instead", "change", "better" → they're changing their mind
4. ALWAYS use the MOST RECENT time mentioned

**REAL EXAMPLES:**

Example 1: Time Change
Customer (message 1): "9AM should work"
Customer (message 2): "Actually, can we do afternoon instead?"
Customer (message 3): "3 PM is better"
→ EXTRACT: time = "3 PM" ✅ (LATEST mention, not "9 AM")

Example 2: Time Change with "instead"
Customer (message 1): "Morning works, 10 AM"
Customer (message 2): "Wait, afternoon is better instead"
→ EXTRACT: time = "2 PM" ✅ (changed to afternoon)

Example 3: Time Refinement
Customer (message 1): "afternoon"
Customer (message 2): "3 PM specifically"
→ EXTRACT: time = "3 PM" ✅ (more specific time)

Example 4: NO Change (just confirmation)
Customer (message 1): "2 PM works"
Agent: "Great, 2 PM on Thursday?"
Customer (message 2): "Yes"
→ EXTRACT: time = "2 PM" ✅ (confirmed, not changed)

**WRONG EXAMPLES:**
❌ Customer says "9 AM" then "3 PM is better" → Extracting "9 AM" (WRONG! Use "3 PM")
❌ Customer says "morning" then "afternoon instead" → Extracting "10 AM" (WRONG! Use "2 PM")

**TIME EXTRACTION EXAMPLES:**
✅ Customer: "9AM should work" → time: "9 AM"
✅ Customer: "2 PM works for me" → time: "2 PM"
✅ Customer: "Let's meet at 3" → time: "3 PM" (assume PM for single digit 3+)
✅ Customer: "morning works" → time: "10 AM"
❌ Customer: "9AM should work" → time: "5 PM" ← WRONG! Use what they said!

Respond with JSON only:
{
  "wantsToBook": true/false,
  "isConfirmed": true/false,
  "confidence": 0.85,
  "proposedDateTime": {
    "date": "Thursday" or null if not specific,
    "time": "9 AM" or "2 PM" (EXACT time customer stated with AM/PM),
    "isFlexible": true/false
  },
  "meetingType": "site-visit" or "consultation" or null,
  "location": "site address" or null,
  "reasoning": "Why this confidence level? What's confirmed/missing?"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a booking intent analyzer with PERFECT CHRONOLOGICAL AWARENESS. Respond only with valid JSON. Be STRICT about isConfirmed - requires BOTH date AND time. CRITICAL TIME EXTRACTION RULES: 1) Read the ENTIRE conversation chronologically, 2) If customer mentions multiple times, ALWAYS use the LAST/MOST RECENT time mentioned, 3) Look for change indicators like 'actually', 'instead', 'better', 'change', 4) If customer says '9AM' then later says '3 PM is better', extract '3 PM' NOT '9 AM'. Your job is to extract the FINAL, MOST RECENT time preference.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      wantsToBook: result.wantsToBook ?? false,
      isConfirmed: result.isConfirmed ?? false,
      confidence: result.confidence ?? 0,
      proposedDateTime: result.proposedDateTime,
      location: result.location,
      meetingType: result.meetingType || "consultation",
      reasoning: result.reasoning || "Unable to determine booking intent",
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

export async function generateAudit(
  auditType: string,
  inputs: any
): Promise<AuditResult> {
  try {
    let prompt = "";

    switch (auditType) {
      case "seo":
        prompt = `
        Perform a quick SEO audit for website: ${inputs.website}
        Industry: ${inputs.industry}
        
        Provide 3 quick wins, 1 main risk, timeline for results, and estimated ROI increase.
        `;
        break;
      case "construction":
        prompt = `
        Perform a construction project audit for:
        Project type: ${inputs.projectType}
        Location: ${inputs.location}
        Timeline: ${inputs.timeline}
        
        Provide cost-saving opportunities, risk factors, timeline optimization, and ROI estimate.
        `;
        break;
      default:
        prompt = `
        Perform a business audit for ${inputs.industry} company.
        Provide improvement opportunities, risks, timeline, and ROI estimate.
        `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a business audit expert. Respond with JSON in this format: {
            "wins": ["win1", "win2", "win3"],
            "risks": ["risk1"],
            "timeline": "90 days",
            "estimatedROI": "+25-40% improvement",
            "score": 85
          }`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      wins: result.wins || ["Improvement opportunity identified"],
      risks: result.risks || ["No major risks detected"],
      timeline: result.timeline || "90 days",
      estimatedROI: result.estimatedROI || "10-20% improvement",
      score: result.score || 75,
    };
  } catch (error) {
    console.error("Error generating audit:", error);
    throw new Error(
      "Failed to generate audit: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}

export async function generateVSLScript(
  niche: string,
  data: {
    targetAudience: string;
    painPoints: string;
    solution: string;
    proofElements: string;
  }
): Promise<string> {
  const prompt = `Create a compelling Video Sales Letter (VSL) script for a ${niche} business.

TARGET AUDIENCE: ${data.targetAudience}
PAIN POINTS: ${data.painPoints}
SOLUTION: ${data.solution}
PROOF: ${data.proofElements}

Create a 2-3 minute VSL script that follows this structure:

1. HOOK (15 seconds): Start with a powerful question or statement that grabs attention
2. PROBLEM AGITATION (30 seconds): Amplify the pain points and consequences
3. SOLUTION INTRODUCTION (45 seconds): Present the solution and its unique benefits
4. PROOF & CREDIBILITY (30 seconds): Share results, testimonials, or case studies
5. CALL TO ACTION (20 seconds): Clear next step with urgency

Requirements:
- Conversational, engaging tone
- Use "you" and "your" to connect with audience
- Include specific numbers and results
- Create urgency without being pushy
- End with a clear, compelling call to action

Write the complete script now:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert copywriter specializing in video sales letters that convert. Write persuasive, benefit-driven scripts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const script = completion.choices[0]?.message?.content || "";

    console.log("✅ VSL script generated:", script.substring(0, 100) + "...");

    return script;
  } catch (error) {
    console.error("❌ Error generating VSL script:", error);
    throw new Error("Failed to generate VSL script");
  }
}
