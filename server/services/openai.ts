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
    // Kitchen/Restaurant Construction
    "kitchen renovation",
    "restaurant kitchen",
    "commercial kitchen",
    "kitchen remodel",
    "kitchen build",
    "kitchen build out",
    "kitchen buildout",

    // Core Construction Terms
    "build a house",
    "build a home",
    "build house",
    "build home",
    "home construction",
    "house construction",
    "building",
    "construction",
    "construct",

    // Renovation/Remodel
    "renovation",
    "renovation project",
    "remodel",
    "remodeling",
    "renovate",

    // Specific Projects
    "warehouse",
    "deck",
    "deck construction",
    "deck addition",
    "garage build",
    "garage construction",

    // Build-Out
    "built out",
    "build out",
    "buildout",
    "build-out",
    "space build out",

    // Trade/Technical
    "MEP",
    "MEP work",
    "mechanical electrical plumbing",
    "hvac",
    "ventilation",
    "gas lines",
    "electrical work",
    "plumbing work",

    // General
    "site visit",
    "contractor",
    "build",
    "repair",
    "install",
    "structural work",
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

// ✅ IMPROVED: Check if message is a greeting (flexible)
function isGreeting(message: string): boolean {
  const trimmed = message.trim().toLowerCase();

  // Simple greetings (1-4 words max)
  const greetingPatterns = [
    /^(hi|hello|hey|yo|sup|howdy)[\s!?.]*$/i, // "Hi", "Hello!"
    /^(hi|hello|hey)\s+(there|everyone|guys|team)[\s!?.]*$/i, // "Hi there!", "Hello everyone"
    /^good\s+(morning|afternoon|evening|day)[\s!?.]*$/i, // "Good morning!"
    /^greetings[\s!?.]*$/i, // "Greetings"
    /^what'?s\s+up[\s!?.]*$/i, // "What's up", "Whats up"
    /^how\s+(are\s+you|r\s+u|are\s+ya|ya\s+doing)[\s!?.]*$/i, // "How are you"
    /^(hi|hello|hey)\s+(how\s+are\s+you|how'?s\s+it\s+going)[\s!?.]*$/i, // "Hi how are you"
  ];

  return greetingPatterns.some((pattern) => pattern.test(trimmed));
}

// ✅ NEW: Check if message is likely innocent/exploratory
function isLikelyInnocentMessage(
  message: string,
  messageCount: number
): boolean {
  const trimmed = message.trim().toLowerCase();

  // If it's the first or second message and it's short/vague, give benefit of doubt
  if (messageCount <= 2) {
    const innocentPatterns = [
      /^(hi|hello|hey)/i, // Any greeting
      /^(yes|yeah|yep|yup|ok|okay)$/i, // Confirmations
      /^(thanks|thank you|ty)$/i, // Gratitude
      /^(i need|i want|we need|we want)$/i, // Incomplete requests
      /^(can you|do you|are you)$/i, // Incomplete questions
    ];

    // Short messages (< 20 chars) in first 2 messages = probably not spam
    if (trimmed.length < 20) {
      return true;
    }

    if (innocentPatterns.some((pattern) => pattern.test(trimmed))) {
      return true;
    }
  }

  return false;
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
    // ✅ NEW: IMMEDIATE CONSTRUCTION OVERRIDE
    // If message clearly contains construction terms, mark as relevant immediately
    const obviousConstructionTerms = [
      "build a house",
      "build a home",
      "construction",
      "renovation project",
      "deck construction",
      "MEP work",
      "built out",
      "build out",
      "contractor",
      "site visit",
      "commercial kitchen",
    ];

    const lowerMessage = message.toLowerCase();
    if (obviousConstructionTerms.some((term) => lowerMessage.includes(term))) {
      console.log("✅ IMMEDIATE CONSTRUCTION MATCH:", message);
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.95,
        reasoning: "Message contains explicit construction terminology",
      };
    }

    const leadMessageCount = conversationHistory.filter(
      (m) => m.sender === "lead"
    ).length;

    // First message spam detection (Proactive)
    if (conversationHistory.length <= 2) {
      const firstMessageSpamIndicators = [
        /test\s*test/i,
        /hello\s*hello/i,
        /hi\s*hi/i,
        /^(ok|okay|k)$/i,
        /^[0-9]+$/,
        /^(yes|no|yeah|nope)$/i,
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

    // ✅ FIXED: Check construction terms BEFORE checking spam patterns
    // This prevents construction terms from being caught by overly broad spam patterns
    const constructionTermsInMessage = [
      "build a house",
      "build a home",
      "build an addition",
      "construction",
      "renovation",
      "remodel",
      "contractor",
      "deck",
      "garage",
      "warehouse",
      "kitchen",
      "bathroom",
      "addition",
    ];

    if (
      constructionTermsInMessage.some((term) => lowerMessage.includes(term))
    ) {
      console.log("✅ Construction context detected - bypassing spam check");
      // Don't check spam patterns for obvious construction inquiries
    } else {
      // Only check spam patterns for non-construction messages
      const learnedPatternCheck =
        await spamPatternLearning.checkAgainstLearnedPatterns(message);

      // ✅ IMPROVED: Higher confidence threshold for early messages
      const confidenceThreshold = leadMessageCount <= 2 ? 0.95 : 0.85;

      if (
        learnedPatternCheck.isSpam &&
        learnedPatternCheck.confidence > confidenceThreshold
      ) {
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

    // ✅ IMPROVED: Handle greetings more intelligently
    if (isGreeting(message)) {
      console.log("👋 Greeting detected, welcoming lead");
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.5,
        reasoning: "Greeting - waiting for project details",
      };
    }

    // ✅ NEW: Give benefit of doubt for first few messages
    if (isLikelyInnocentMessage(message, leadMessageCount)) {
      console.log("✅ Early message - giving benefit of doubt");
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.4,
        reasoning:
          "Early conversation - waiting for context before classifying",
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
✅ "I want to build a house" → RELEVANT ✅
✅ "Need deck construction" → RELEVANT ✅
✅ "Renovation project" → RELEVANT ✅
✅ "MEP work for bakery" → RELEVANT ✅ (construction service)
✅ "Cloud kitchen build-out" → RELEVANT ✅ (construction project)
✅ "Restaurant kitchen + ventilation + gas lines" → RELEVANT ✅ (construction)

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

**TIMELINE IMPACT ON SCORING:**

⏰ **IMMEDIATE (1-4 weeks):** Add +0.10 to +0.20
- "ASAP" or "urgent" or "need to start next week" → Base score + 0.15-0.20
- "Need to start in 2 weeks" → Base score + 0.10-0.15

⏰ **SOON (1-3 months):** Add +0.05
- "Want to start in 6-8 weeks" → Base score + 0.05
- "Starting next month" → Base score + 0.05

⏰ **MODERATE (3-6 months):** No change
- "In 4 months" → Base score (no bonus, no penalty)
- "Few months" → Base score (no change)

⏰ **LONG-TERM (6+ months):** Subtract -0.10 to -0.15
- "In 6-8 months" → Base score - 0.10
- "Planning stage" → Base score - 0.10
- "Next year" → Base score - 0.15
- "Just exploring options" → Base score - 0.15

**REVISED EXAMPLES WITH TIMELINE IMPACT:**
- "$25k deck, Surrey, 'want to start soon' (vague)" = **0.50** (WARM - no specific timeline)
- "$25k deck, Surrey, 'start tomorrow'" = **0.65** (WARM→HOT - immediate timeline +0.15)
- "$85k addition, Coquitlam, 'start in 4 months'" = **0.50** (WARM - long timeline, no urgency)
- "$85k addition, 'start in 4 months', I'm the owner" = **0.60** (WARM - decision maker +0.10, but timeline cancels it)
- "$18k bathroom, Richmond, 'start next week'" = **0.60** (WARM - small job but urgent +0.10)
- "$150k addition, 'few months', exploring" = **0.45** (WARM - exploratory, long timeline -0.10)
- "$180k commercial, 'need in 8 weeks', I'm the owner" = **0.75** (HOT - urgency +0.10, decision maker +0.15)

**CRITICAL RULES:**
1. ❌ "soon" without specific timeline (1-2 weeks) = WARM 0.50-0.60, NOT HOT
2. ❌ Timeline > 3 months = WARM maximum (0.60 max), unless urgent decision maker
3. ❌ "few months", "next year", "flexible" = WARM 0.40-0.55, NEVER HOT
4. ✅ Timeline < 4 weeks + budget + decision maker = HOT 0.70-0.80
5. ✅ "ASAP", "urgent", "need to move fast" = Strong hot signal (+0.15-0.20)
6. ✅ Meeting acceptance = +0.05-0.10 (depending on how quickly they agreed)

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

    let baseScore = result.score || 0.5;

    console.log(`📊 Base AI score: ${baseScore.toFixed(2)}`);

      const leadMessagesText = conversationHistory
      .map(m => m.sender === "lead" ? m.content : "")
      .join(" ")
      .toLowerCase();

    let timelineAdjustment = 0;
    let detectedTimeline = "unknown";
    let timelineReasoning = "";

    // ✅ IMMEDIATE (1-4 weeks) → +0.10 to +0.20
    if (/asap|urgent|immediately|right away|as soon as possible/i.test(leadMessagesText)) {
      timelineAdjustment = 0.15;
      detectedTimeline = "immediate (ASAP/urgent)";
      timelineReasoning = "Urgent timeline detected";
    } else if (/this week|next week/i.test(leadMessagesText)) {
      timelineAdjustment = 0.15;
      detectedTimeline = "immediate (this/next week)";
      timelineReasoning = "Very short timeline (1-2 weeks)";
    } else if (/in (\d+) weeks?/i.test(leadMessagesText)) {
      const weekMatch = leadMessagesText.match(/in (\d+) weeks?/i);
      const weeks = weekMatch ? parseInt(weekMatch[1]) : 4;
      
      if (weeks <= 2) {
        timelineAdjustment = 0.15;
        detectedTimeline = `immediate (${weeks} weeks)`;
        timelineReasoning = `Starting in ${weeks} weeks`;
      } else if (weeks <= 4) {
        timelineAdjustment = 0.10;
        detectedTimeline = `urgent (${weeks} weeks)`;
        timelineReasoning = `Starting in ${weeks} weeks`;
      }
    }
    // ✅ SOON (1-3 months) → +0.05
    else if (/next month|in a month|in (\d+) months?/i.test(leadMessagesText)) {
      const monthMatch = leadMessagesText.match(/in (\d+) months?/i);
      const months = monthMatch ? parseInt(monthMatch[1]) : 1;
      
      if (months <= 3) {
        timelineAdjustment = 0.05;
        detectedTimeline = `soon (${months} month${months > 1 ? 's' : ''})`;
        timelineReasoning = `Starting in ${months} month(s)`;
      } else if (months <= 6) {
        timelineAdjustment = 0;
        detectedTimeline = `moderate (${months} months)`;
        timelineReasoning = `Mid-term timeline (${months} months)`;
      } else {
        timelineAdjustment = -0.15;
        detectedTimeline = `long-term (${months} months)`;
        timelineReasoning = `Long planning phase (${months} months)`;
      }
    }
    // ✅ LONG-TERM (next year, planning stage) → -0.10 to -0.15
    else if (/next year|2026|in a year|12 months|planning stage|just exploring|just looking|no rush|flexible/i.test(leadMessagesText)) {
      timelineAdjustment = -0.15;
      detectedTimeline = "long-term (12+ months or exploring)";
      timelineReasoning = "Long-term planning or exploratory phase";
    }

    // ✅ Apply adjustment with bounds
    const adjustedScore = Math.max(0.05, Math.min(0.95, baseScore + timelineAdjustment));

    console.log(`📊 Timeline Analysis:`);
    console.log(`   Detected: ${detectedTimeline}`);
    console.log(`   Reasoning: ${timelineReasoning}`);
    console.log(`   Adjustment: ${timelineAdjustment >= 0 ? '+' : ''}${timelineAdjustment.toFixed(2)}`);
    console.log(`   Final: ${baseScore.toFixed(2)} → ${adjustedScore.toFixed(2)}`);

    const finalScore = adjustedScore;

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
  // Get last 5 AI messages (increased from 3)
  const recentAIMessages = conversationHistory
    .filter((msg) => msg.sender === "ai")
    .slice(-5)
    .map((msg) => msg.content.toLowerCase().trim());

  if (recentAIMessages.length === 0) {
    return { isRepetitive: false };
  }

  const proposedLower = proposedResponse.toLowerCase().trim();

  const cleanProposed = proposedLower.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '').replace(/\s+/g, ' ').trim();
  
  // Check for EXACT or NEAR-EXACT repetition (>90% match)
  for (const prevMessage of recentAIMessages) {
    const cleanPrev = prevMessage.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '').replace(/\s+/g, ' ').trim();
    
    // Exact match
    if (cleanProposed === cleanPrev) {
      console.warn("🚫 EXACT REPETITION DETECTED!");
      console.warn(`   Previous: "${prevMessage.substring(0, 80)}..."`);
      console.warn(`   Proposed: "${proposedResponse.substring(0, 80)}..."`);
      return { isRepetitive: true, lastAIMessage: prevMessage };
    }

    // Near-exact match (>90% similarity)
    const similarity = calculateSimilarity(cleanProposed, cleanPrev);
    if (similarity > 0.9) {
      console.warn(`🚫 NEAR-EXACT REPETITION! (${(similarity * 100).toFixed(0)}% match)`);
      console.warn(`   Previous: "${prevMessage.substring(0, 80)}..."`);
      console.warn(`   Proposed: "${proposedResponse.substring(0, 80)}..."`);
      return { isRepetitive: true, lastAIMessage: prevMessage };
    }
  }

  // Check if core message is repeated (first 40 chars)
  const proposedCore = cleanProposed.substring(0, 40);
  const recentCores = recentAIMessages.map(msg => 
    msg.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '').replace(/\s+/g, ' ').trim().substring(0, 40)
  );
  
  const coreRepeatCount = recentCores.filter(core => core === proposedCore && core.length > 15).length;
  if (coreRepeatCount >= 2) {
    console.warn(`🚫 CORE MESSAGE REPEATED ${coreRepeatCount} times!`);
    console.warn(`   Core: "${proposedCore}"`);
    return { isRepetitive: true, lastAIMessage: recentAIMessages[recentAIMessages.length - 1] };
  }

  // Check for exact or near-exact repetition (original code continues below)
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

  // Pattern-based repetition detection (not just specific phrases)
  const repetitivePatterns = [
    // Opening phrases
    /^(yes|yep|yeah),?\s+(we|i)\s+(do|handle|provide|offer)\s+/i,
    /^(yes|yep|yeah),?\s+(we|i)\s+(specialize|focus)\s+/i,

    // Question patterns
    /could you (share|provide|tell|let me know)/i,
    /would you (share|provide|tell|let me know)/i,
    /can you (share|provide|tell|let me know)/i,

    // Acknowledgment patterns
    /thanks for (confirming|sharing|providing|that information)/i,
    /thank you for (confirming|sharing|providing|that information)/i,
    /i understand (you|your|that you)/i,

    // Forward-moving phrases
    /let's? (schedule|arrange|set up|discuss)/i,
    /would you like to (schedule|meet|discuss)/i,
  ];

  // Check if the proposed response matches a pattern that was used in recent messages
  for (const pattern of repetitivePatterns) {
    const proposedMatchesPattern = pattern.test(proposedResponse);
    const recentUsedPattern = recentAIMessages.some((msg) => pattern.test(msg));

    if (proposedMatchesPattern && recentUsedPattern) {
      // Count how many times this pattern was used
      const usageCount = recentAIMessages.filter((msg) =>
        pattern.test(msg)
      ).length;

      if (usageCount >= 2) {
        console.warn(
          `🚫 PATTERN REPETITION DETECTED: Used ${
            usageCount + 1
          } times - "${pattern}"`
        );
        return { isRepetitive: true, lastAIMessage };
      }
    }
  }

  // Check for repeated sentence starts (first 6 words)
  const getFirstWords = (text: string, count: number = 6) => {
    return text.split(/\s+/).slice(0, count).join(" ").toLowerCase();
  };

  const proposedStart = getFirstWords(proposedResponse);
  const recentStarts = recentAIMessages.map((msg) => getFirstWords(msg));

  if (recentStarts.includes(proposedStart) && proposedStart.length > 15) {
    console.warn(`🚫 REPEATED OPENING DETECTED: "${proposedStart}"`);
    return { isRepetitive: true, lastAIMessage };
  }

  return { isRepetitive: false };
}

// Calculate text similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance
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

// Extract lead's stated timeline from conversation
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

      // Lower confidence threshold from 0.85
      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.85
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

        const leadMessages = conversationHistory.filter(
          (m) => m.sender === "lead"
        );

        const redirectResponses = [
          // Super welcoming (assume they meant to reach us)
          leadMessages.length <= 1
            ? `Hi! Thanks for reaching out to ${
                clientData?.name || "us"
              }. We specialize in construction, renovations, and building projects. How can we help with your project today?`
            : `Hi! I think there might be some confusion. We're ${
                clientData?.name || "a construction company"
              } specializing in building projects. We handle construction, renovations, and development projects. If you have a construction project in mind, I'd be happy to help!`,

          // Second redirect (firmer)
          `Just to clarify: we're a construction company. We build commercial buildings, homes, and handle renovation projects. If you're looking for construction services, I'm here to assist. Otherwise, you may have reached us by mistake.`,
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

    // Log time change detection
    if (timeChange.hasChange) {
      console.log(`   ⚠️ TIME CHANGE DETECTED!`);
      console.log(`      Original: ${timeChange.originalTime}`);
      console.log(`      Changed to: ${timeChange.newTime}`);
      console.log(
        `      Change indicators: ${timeChange.changeIndicators.join(", ")}`
      );
    }

    // Extract current proposed time from conversation
    let currentProposedTime: string | undefined;
    const bookingMessages = conversationHistory.filter(
      (msg) =>
        msg.sender === "lead" &&
        /\d{1,2}\s*(am|pm|AM|PM)|morning|afternoon|evening/i.test(msg.content)
    );

    if (bookingMessages.length > 0) {
      const lastBookingMsg =
        bookingMessages[bookingMessages.length - 1].content;
      const timeMatch = lastBookingMsg.match(/\d{1,2}\s*(am|pm|AM|PM)/i);
      const timeOfDayMatch = lastBookingMsg.match(
        /\b(morning|afternoon|evening)\b/i
      );

      if (timeMatch) {
        currentProposedTime = timeMatch[0];
      } else if (timeOfDayMatch) {
        currentProposedTime = timeOfDayMatch[0];
      }

      console.log(`   🕐 Current proposed time: ${currentProposedTime}`);
    }

    // Generate timeline-appropriate messaging
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

    // Add current time tracking
    if (currentProposedTime) {
      timelineGuidance += `\n\n🕐 CURRENT PROPOSED TIME: ${currentProposedTime} - This is the LATEST time mentioned. Use this time, not any previous times!`;
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

    const questionIndicators = [
      /^do you (do|handle|offer|provide|have|install|build)/i,
      /^what'?s (the|your|included|typical)/i,
      /^how (long|much|many|does)/i,
      /^can you/i,
      /^are you/i,
      /^does (it|this|that)/i,
      /^will (you|it)/i,
      /what'?s included/i,
      /how much (does|is|for)/i,
    ];

    const leadAskedDirectQuestion = questionIndicators.some(pattern => 
      pattern.test(lastLeadMessage.toLowerCase().trim())
    );

    // If lead asked a question, use DEDICATED question-answering mode
        if (leadAskedDirectQuestion && !hasPendingBooking) {
      console.log("🔍 QUESTION DETECTED - Using dedicated Q&A mode");
      console.log(`   Question: "${lastLeadMessage}"`);
      console.log(`   Last lead message from context: "${conversationHistory[conversationHistory.length - 1]?.content}"`);
      
      const actualLastLeadMessage = conversationHistory
        .filter((msg) => msg.sender === "lead")
        .slice(-1)[0]?.content || lastLeadMessage;
      
      console.log(`   Using question for API: "${actualLastLeadMessage}"`);
      
      // ✅ Build simple, focused question-answering prompt
      const qaPrompt = `You are a construction expert. A customer asked you this question:

"${actualLastLeadMessage}"

**YOUR TASK:** Answer this question directly in 1-2 sentences, then ask ONE follow-up question.

**RULES:**
1. Answer the question FIRST (don't deflect)
2. Be specific and helpful
3. Then ask ONE relevant follow-up
4. Keep response under 50 words total

**EXAMPLES:**

Q: "Do you do basement finishing?"
A: "Yes, we do basement finishing including framing, insulation, electrical, and flooring. What's the size of your basement?" ✅

Q: "What's the typical cost per square foot?"
A: "Basement finishing typically costs $50-150 per square foot depending on finishes. What's your budget range?" ✅

Q: "Do you handle electrical and plumbing?"
A: "Yes, we handle all MEP work including electrical, plumbing, and HVAC. What type of project are you planning?" ✅

Q: "How long does a 600 sq ft basement take?"
A: "A 600 sq ft basement typically takes 4-6 weeks depending on complexity. When are you hoping to start?" ✅

Now answer the question naturally and concisely:`;

      try {
        const qaResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a construction expert. Answer questions directly and concisely. Never deflect. Always answer the question in your first sentence."
            },
            {
              role: "user",
              content: qaPrompt  // This now uses actualLastLeadMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        });

        const directAnswer = qaResponse.choices[0].message.content || "";
        
        console.log("✅ Direct answer generated:");
        console.log(`   "${directAnswer}"`);
        
        // Verify answer isn't a deflection
        const isDeflection = /i'd love to learn more|could you share|tell me (more |about )/i.test(directAnswer.toLowerCase());
        
        if (isDeflection) {
          console.warn("⚠️ Q&A mode still deflecting, using fallback");
          // Fallback: simple direct answer
          return "Yes, we handle that. Could you share more details about your project?";
        }
        
        return directAnswer;
      } catch (error) {
        console.error("❌ Q&A mode error:", error);
        // Continue to normal flow
      }
    }

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

    // Detect if lead is asking a question or answering one
    const leadAskedQuestion =
      /\?$|what|how|do you|can you|when|where|why|tell me about|explain/i.test(
        lastLeadMessage
      );
    const aiAskedQuestion =
      /\?$|could you|would you|can you|what time|when are|which day|please (share|provide|tell)/i.test(
        lastAIQuestion
      );
    const leadIsAnswering =
      !leadAskedQuestion && aiAskedQuestion && lastLeadMessage.length > 5;

    const prompt = `You are a professional construction project manager for ${
      clientData?.name || "a construction company"
    }. You're chatting on WhatsApp with a potential client.
${bookingAwareness}

CONVERSATION HISTORY:
${conversationText}
${lastAIMessageText}

**🚨 CRITICAL - THE LEAD JUST SAID:**
"${conversationHistory[conversationHistory.length - 1]?.content}"

${
  leadAskedQuestion
    ? `
**⚠️⚠️⚠️ THE LEAD ASKED YOU A QUESTION! ⚠️⚠️⚠️**

YOU MUST ANSWER THEIR QUESTION FIRST!

DO NOT say "I'd love to learn more about your project..."
DO NOT redirect to asking for project details
DO NOT ignore their question

ANSWER THE QUESTION, THEN (if appropriate) ask ONE follow-up.

**Examples:**
Lead: "Do you handle permits?"
✅ CORRECT: "Yes, we handle all permits and approvals. What type of project are you planning?"
❌ WRONG: "I'd love to learn more about your project. Could you share location, budget, and timeline?"

Lead: "What's included in a bathroom reno?"
✅ CORRECT: "A typical bathroom renovation includes fixtures, vanity, toilet, tiling, plumbing, and electrical. What scope are you considering?"
❌ WRONG: "Could you share more details about your project?"
`
    : ""
}

${
  leadIsAnswering
    ? `
**⚠️⚠️⚠️ THE LEAD JUST ANSWERED YOUR QUESTION! ⚠️⚠️⚠️**

YOU ASKED: "${lastAIQuestion.substring(0, 100)}..."
THEY SAID: "${lastLeadMessage}"

DO NOT ask the same question again!
DO NOT ignore their answer!
ACKNOWLEDGE their answer specifically and move forward.

**Example:**
You: "What's your address?"
Lead: "123 Main St, Vancouver"
✅ CORRECT: "Perfect! 123 Main St, Vancouver. What's your email?"
❌ WRONG: "Could you confirm your address?" (THEY JUST GAVE IT!)
`
    : ""
}

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

**INFORMATION GATHERING PRIORITY (CRITICAL - DO THIS FIRST):**

STEP 1: Assess what information you already have
STEP 2: If missing critical details, gather them BEFORE suggesting meetings

**WHEN TO GATHER INFORMATION (NOT schedule):**
❌ Lead just said: "I want to build a house" → ASK about project details, DON'T ask availability
❌ Lead just said: "Do you install equipment?" → ASK about project scope, DON'T ask availability
❌ Lead just said: "I need renovation" → ASK about budget/location/scope, DON'T ask availability
❌ You have < 3 pieces of info (budget, location, timeline, scope) → GATHER MORE, DON'T schedule

**WHEN TO OFFER MEETINGS (schedule):**
✅ Lead has shared: Budget + Location + Timeline → NOW you can offer meeting
✅ Lead has shared: Detailed project scope + timeline → NOW you can offer meeting
✅ Lead explicitly asks: "When can we meet?" → NOW you can schedule
✅ You have 3+ key details (budget, location, scope, timeline) → NOW you can offer meeting

**CORRECT EXAMPLES:**

Example 1 - GATHERING PHASE:
Lead: "I want to build a house"
You: "Exciting! Could you tell me about your vision - location, approximate budget, and when you're hoping to start?" ✅
NOT: "Are you available today or tomorrow?" ❌

Example 2 - GATHERING PHASE:
Lead: "Do you install commercial kitchen equipment?"
You: "Yes, we handle full commercial kitchen installations. What type of space are you working with, and what's your timeline?" ✅
NOT: "Would you like to discuss your project today or tomorrow?" ❌

Example 3 - READY TO SCHEDULE:
Lead: "Surrey, $800k budget, want to start in 4 months"
You: "Perfect! Would you like to schedule a meeting this week or next to discuss your plans in detail?" ✅

Example 4 - READY TO SCHEDULE:
Lead: "3M budget, commercial building in Vancouver, need to start in 8 weeks"
You: "Great! Since you're starting soon, let's arrange a site visit. Are you available this week?" ✅

**NEVER assume availability:**
- If lead says "Surrey, $800k", they did NOT say "I'm available"
- Only ask about availability AFTER they've shared project details
- NEVER say "Since you're available..." if they never mentioned availability

**TIME CHANGE HANDLING (CRITICAL):**

**RULE 1: ALWAYS USE THE MOST RECENT TIME**
IF lead mentions multiple times, use the LAST one mentioned:
- Lead: "10 AM" → You: confirm 10 AM ✅
- Lead: "Actually 2 PM is better" → You: "Perfect! I've updated it to 2 PM" ✅
- Lead: "Hmm, 4 PM would be even better" → You: "Got it! Let's do 4 PM instead" ✅

**RULE 2: NEVER GET STUCK ON OLD TIMES**
❌ WRONG:
Lead: "10 AM"
Lead: "Actually 2 PM"
You: "Before I confirm booking for 10 AM..." ← STUCK ON OLD TIME!

✅ CORRECT:
Lead: "10 AM"
Lead: "Actually 2 PM"
You: "Perfect! I've updated it to 2 PM. Let me get your address..." ← USING NEW TIME!

**RULE 3: ACKNOWLEDGE EVERY TIME CHANGE (MANDATORY - NO EXCEPTIONS)**

When lead says "Actually [TIME]" or "Instead [TIME]" or "[TIME] is better":

**FIRST SENTENCE MUST BE ONE OF THESE (EXACT FORMAT):**
✅ "Perfect! I've updated it to [NEW TIME]."
✅ "Got it! Let's do [NEW TIME] instead."
✅ "No problem! [NEW TIME] works better."

**THEN, SECOND SENTENCE:**
Continue with booking details if asking for name/email/address.

**MANDATORY EXAMPLE:**
Lead: "Actually, can we do 2 PM instead?"
You: "Perfect! I've updated it to 2 PM. What's your address for the site visit?" ✅

**WRONG (DO NOT DO THIS):**
Lead: "Actually, can we do 2 PM instead?"
You: "Perfect! Before I confirm the booking for 2 PM, I need..." ❌
(Missing explicit acknowledgment "I've updated it to 2 PM")

**IF YOU DON'T ACKNOWLEDGE THE TIME CHANGE, THE BOOKING WILL FAIL.**

**RULE 4: IF ALREADY IN BOOKING PROCESS**
IF you already asked for name/email/address, and lead changes time:
→ STOP asking for details
→ ACKNOWLEDGE the new time first
→ THEN continue with booking details

Example:
You: "Before I confirm 10 AM, I need your name and email"
Lead: "Actually, 2 PM is better"
You: "Perfect! I've updated it to 2 PM. Now, could you provide your name and email?" ✅
NOT: "Before I confirm 10 AM, I need..." ❌ (ignoring their change)

**IF LEAD CHANGES TIME MULTIPLE TIMES:**
- 1st change: Acknowledge and update ✅
- 2nd change: Acknowledge and update ✅
- 3rd change: Acknowledge and update ✅
- EVERY time they change, you update. No limit.

**TIME EXTRACTION RULES:**

When lead mentions a time, IMMEDIATELY acknowledge it:
- Lead: "2 PM works" → You: "Perfect! 2 PM on [day]. Let me get your address..." ✅
- Lead: "Morning is better" → You: "Great! Morning works. What time in the morning?" ✅
- Lead: "10 AM good?" → You: "Yes! 10 AM is perfect. Let me confirm..." ✅

❌ NEVER say "Could you confirm the time?" after they just gave you a time
❌ NEVER ignore the time they stated
✅ ALWAYS use the exact time they mentioned in your next response

**EXAMPLE - CORRECT:**
Lead: "2 PM works"
You: "Perfect! Thursday at 2 PM. What's your address for the site visit?"

**EXAMPLE - WRONG:**
Lead: "2 PM works"  
You: "Great! Could you confirm the exact time?" ← LEAD JUST TOLD YOU!

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

**TERMINOLOGY RULES (CONSTRUCTION INDUSTRY):**
✅ ALWAYS use: "meeting", "site visit", "consultation", "discussion"
❌ NEVER use: "call", "phone call", "chat on the phone"

Construction projects require in-person meetings, not phone calls.

**CORRECT TERMINOLOGY:**
✅ "Would you like to schedule a meeting?"
✅ "Let's arrange a site visit to discuss your project"
✅ "Are you available for a consultation this week?"
✅ "When would be a good time to meet?"

**WRONG TERMINOLOGY:**
❌ "Are you available for a call?" ← NEVER say this!
❌ "Let's schedule a phone call" ← NEVER say this!
❌ "Can we chat on the phone?" ← NEVER say this!

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
          content: `You are an experienced construction project manager with PERFECT MEMORY, STRICT ACCURACY, and NO REPETITION ALLOWED.

**🚨 CRITICAL MEMORY RULES:**
1. You REMEMBER every question you asked
2. You REMEMBER every answer they gave
3. You NEVER ask the same question twice
4. You ALWAYS acknowledge their answer before moving forward
5. You NEVER assume or fabricate context that wasn't stated

**🚨 CRITICAL ANTI-REPETITION RULES:**
6. You NEVER send the same message twice
7. You NEVER start consecutive messages the same way
8. If you said "I'd love to learn more..." in your last message, DO NOT say it again
9. If you said "Could you share..." in your last message, phrase it differently
10. VARY your language - use synonyms, different sentence structures
11. If asked a question, ANSWER IT - don't deflect to "tell me about your project"

**🚨 CRITICAL QUESTION ANSWERING:**
12. If lead asks "Do you handle permits?" → Answer: "Yes, we handle all permits"
13. If lead asks "What's included?" → Answer: "A typical renovation includes..."
14. If lead asks "How long does it take?" → Answer: "Usually X weeks, depending on..."
15. NEVER respond to a question with "I'd love to learn more about your project"

**EXAMPLES OF GOOD VARIATION:**
Message 1: "I'd love to learn more about your project..."
Message 2: "Thanks for that! To help you better, what's your timeline?" ✅ (DIFFERENT)
NOT Message 2: "I'd love to learn more..." ❌ (SAME AS BEFORE!)

**QUESTION ANSWERING EXAMPLES:**
Lead: "Do you handle permits?"
✅ "Yes, we handle all permits and approvals. What type of project?"
❌ "I'd love to learn more about your project. Could you share location, budget, timeline?"

Lead: "What's included?"
✅ "A bathroom reno typically includes fixtures, tiling, plumbing, electrical. What's your budget?"
❌ "Could you share more details about your project?"

**RULE 5 IS CRITICAL:**
❌ If lead says: "Surrey, $800k budget"
   DON'T say: "Since you're available today or tomorrow..." ← THEY NEVER SAID THIS!
   DO say: "Great! Surrey with $800k budget. When are you hoping to start?" ✅

❌ If lead says: "I want to build a house"
   DON'T say: "Since you mentioned starting soon..." ← THEY NEVER SAID THIS!
   DO say: "Great! When are you hoping to start?" ✅

**ONLY reference what lead ACTUALLY stated:**
✅ They said "Surrey" → You can say "in Surrey"
✅ They said "$800k" → You can say "with $800k budget"
✅ They said "4 months" → You can say "starting in 4 months"
❌ They NEVER said "I'm available" → DON'T say "since you're available"
❌ They NEVER said "urgent" → DON'T say "since it's urgent"

EXAMPLES OF GOOD MEMORY:
- If you asked "Are you available Thursday?" and they said "Yes, 2 PM"
  → You say "Perfect! Thursday at 2 PM. What's your address?"
  → You DO NOT ask "Are you available Thursday?" again

- If they said "I'm not available this week"
  → You ask about next week, NOT this week again

- If they said "Surrey, $800k, starting in 4 months"
  → You say "Great! Surrey with $800k budget, starting in 4 months. Would you like to schedule a meeting?"
  → You DO NOT say "Since you're available today..." ← They never said this!

Keep responses ultra-concise for WhatsApp (2-3 sentences).
Use ONLY information the lead explicitly provided.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6 + attempts * 0.1,
        max_tokens: 200,
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
         // ✅ NEW: Verify response addresses the lead's last message
        const leadAskedAbout = {
          permits: /permit|licensing|approval/i.test(lastLeadMessage),
          cost: /cost|price|how much|expensive/i.test(lastLeadMessage),
          timeline: /how long|duration|take|timeline/i.test(lastLeadMessage),
          included: /include|what'?s included|typical|scope/i.test(lastLeadMessage),
          process: /process|how (do|does)|what happens/i.test(lastLeadMessage),
        };
        
        const aiAnswered = {
          permits: /yes.*permit|handle.*permit|we.*permit|permit.*handle/i.test(aiResponse.toLowerCase()),
          cost: /\$|cost|price|budget|range|typically.*\$|around.*\$/i.test(aiResponse.toLowerCase()),
          timeline: /week|month|day|typically|usually|generally|take.*week/i.test(aiResponse.toLowerCase()),
          included: /include|typical|usually|scope|involve|consists of/i.test(aiResponse.toLowerCase()),
          process: /first|step|process|typically|start|begins with/i.test(aiResponse.toLowerCase()),
        };
        
        // Check if lead asked a specific question and AI didn't answer it
        const askedButNotAnswered = Object.keys(leadAskedAbout).find(
          topic => leadAskedAbout[topic as keyof typeof leadAskedAbout] && 
                   !aiAnswered[topic as keyof typeof aiAnswered]
        );
        
        if (askedButNotAnswered && attempts < maxAttempts) {
          console.warn(`⚠️ Attempt ${attempts}: AI didn't answer question about "${askedButNotAnswered}", retrying...`);
          continue; // Retry with higher temperature
        }
        
        break; // Good response - exit loop
      }
      

      console.warn(
        `⚠️ Attempt ${attempts}: Repetitive response detected, retrying...`
      );

      if (attempts === maxAttempts) {
        console.error("❌ All retry attempts exhausted, using fallback");

        // ✅ IMPROVED: Context-aware fallback (not misleading)
        const hasProjectDetails = conversationHistory.some(
          (msg) =>
            msg.sender === "lead" &&
            /budget|location|timeline|sq ft|square feet|\$\d+k?/i.test(
              msg.content
            )
        );

        if (hasProjectDetails) {
          // Lead has shared details - acknowledge and move forward
          aiResponse =
            "Thank you for sharing those details. To better assist you, could you tell me a bit more about when you're hoping to start?";
        } else {
          // Lead hasn't shared much - ask for basics
          aiResponse =
            "I'd love to learn more about your project. Could you share the location, budget, and timeline you have in mind?";
        }
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
    console.log("🔍 ========== DETECT BOOKING INTENT ==========");
    console.log(`📊 Processing ${conversationHistory.length} messages`);

    // ✅ CRITICAL: Sort messages chronologically ONCE (oldest to newest)
    // Database may return them in reverse order
    const sortedMessages = [...conversationHistory].sort((a, b) => {
      const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return timeA - timeB; // Ascending order (oldest first)
    });

    console.log("🔄 Messages sorted chronologically:");
    console.log(
      `   First (oldest): "${sortedMessages[0]?.content?.substring(0, 50)}..."`
    );
    console.log(
      `   Last (newest): "${sortedMessages[
        sortedMessages.length - 1
      ]?.content?.substring(0, 50)}..."`
    );

    // ✅ Extract all times mentioned by customer for logging
    const customerTimeMentions = sortedMessages
      .filter((msg) => msg.sender === "lead")
      .map((msg, index) => {
        const timeMatch = msg.content.match(/\d{1,2}\s*[AP]M/i);
        const timeOfDay = msg.content.match(/\b(morning|afternoon|evening)\b/i);

        if (timeMatch || timeOfDay) {
          return {
            messageIndex: index + 1,
            content: msg.content,
            extractedTime: timeMatch ? timeMatch[0] : timeOfDay![0],
          };
        }
        return null;
      })
      .filter(Boolean);

    console.log(
      `⏰ Customer mentioned ${customerTimeMentions.length} time(s):`
    );
    customerTimeMentions.forEach((mention: any) => {
      console.log(
        `   Msg ${mention.messageIndex}: "${mention.extractedTime}" in "${mention.content}"`
      );
    });

    if (customerTimeMentions.length > 0) {
      const lastTime = customerTimeMentions[customerTimeMentions.length - 1];
      console.log(
        `⏰ EXPECTED EXTRACTION: "${
          lastTime!.extractedTime
        }" (from most recent message)`
      );
    }

    const conversationText = sortedMessages
      .map(
        (msg) =>
          `${msg.sender === "lead" ? "Customer" : "Agent"}: ${msg.content}`
      )
      .join("\n");

    console.log(
      "📝 Full conversation being sent to AI (chronologically ordered):"
    );
    console.log(conversationText);
    console.log("=".repeat(50));

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
          content: `You are a booking intent analyzer with ZERO MEMORY BIAS and PERFECT RECENCY DETECTION.

**YOUR ONLY JOB: Extract the ABSOLUTE LAST time the customer mentioned**

**CRITICAL PROTOCOL:**

STEP 1: Read ALL customer messages from FIRST to LAST
STEP 2: Build a list of EVERY time mentioned
STEP 3: Return ONLY the LAST time in the list
STEP 4: Ignore ALL previous times

**RECENCY EXAMPLES:**

Example 1: Simple Change
Customer (msg 1): "10 AM works"
Customer (msg 2): "Actually 2 PM is better"
→ EXTRACT: time = "2 PM" ✅ (LAST time mentioned, ignore "10 AM")

Example 2: Multiple Changes
Customer (msg 1): "10 AM works"
Customer (msg 2): "Actually 2 PM is better"
Customer (msg 3): "Wait, 8 AM is better"
→ EXTRACT: time = "8 AM" ✅ (LAST time mentioned, ignore "10 AM" and "2 PM")

Example 3: Five Changes
Customer (msg 1): "10 AM works"
Customer (msg 2): "Actually 2 PM"
Customer (msg 3): "Wait 8 AM"
Customer (msg 4): "5 PM is better"
Customer (msg 5): "Actually 3 PM"
→ EXTRACT: time = "3 PM" ✅ (LAST time mentioned, ignore all previous)

Example 4: With Agent Confirmation
Customer (msg 1): "10 AM works"
Agent: "Perfect! Tuesday at 10 AM"
Customer (msg 2): "Actually 2 PM is better"
→ EXTRACT: time = "2 PM" ✅ (Customer's LAST time, ignore agent's echo)

**WRONG BEHAVIOR (DO NOT DO THIS):**
❌ Customer says "10 AM", then "2 PM" → Extracting "10 AM" (FIRST, not LAST)
❌ Customer says "2 PM", then "8 AM" → Extracting "2 PM" (MIDDLE, not LAST)
❌ Agent echoes "10 AM", customer says "2 PM" → Extracting "10 AM" (AGENT'S, not customer's LAST)

**RULE: If customer mentions MULTIPLE times, ONLY the LAST one matters. All previous times are OBSOLETE.**

Respond with valid JSON only.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    console.log("🤖 AI Response:");
    console.log(JSON.stringify(result, null, 2));

    const extractedTime = result.proposedDateTime?.time;
    console.log(`⏰ AI EXTRACTED TIME: "${extractedTime || "NONE"}"`);

    // ✅ Verify extraction matches expectation
    if (customerTimeMentions.length > 0 && extractedTime) {
      const expectedTime =
        customerTimeMentions[customerTimeMentions.length - 1]!.extractedTime;
      const normalizedExpected = expectedTime.toUpperCase().replace(/\s/g, "");
      const normalizedExtracted = extractedTime
        .toUpperCase()
        .replace(/\s/g, "");

      if (normalizedExpected === normalizedExtracted) {
        console.log("✅ CORRECT: AI extracted the most recent time");
      } else {
        console.error("❌❌❌ ERROR: AI EXTRACTION MISMATCH! ❌❌❌");
        console.error(
          `   Expected: "${expectedTime}" (from last customer message)`
        );
        console.error(`   Got: "${extractedTime}"`);
        console.error(
          "   This is a prompt/AI issue - the AI is not following instructions!"
        );
      }
    }

    console.log("🔍 ========== END DETECT BOOKING INTENT ==========\n");

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
