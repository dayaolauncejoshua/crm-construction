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

// ✅ NEW: Hardcoded keyword detection for obvious non-construction topics
function hasNonConstructionKeywords(message: string): boolean {
  const nonConstructionKeywords = [
    // Food & Beverages
    "burger",
    "pizza",
    "fries",
    "food",
    "restaurant",
    "delivery",
    "menu",
    "order",
    "eat",
    "drink",
    "coffee",
    "lunch",
    "dinner",
    "breakfast",
    "meal",
    "cuisine",
    "dish",
    "recipe",

    // Retail & Products (non-construction)
    "shoes",
    "clothing",
    "shirt",
    "pants",
    "dress",
    "fashion",
    "apparel",
    "sneakers",
    "watch",
    "jewelry",
    "accessories",
    "handbag",
    "wallet",

    // Services (non-construction)
    "haircut",
    "salon",
    "spa",
    "massage",
    "laundry",
    "cleaning service",
    "dry clean",
    "photography",
    "videography",
    "event planning",

    // Entertainment
    "movie",
    "concert",
    "show",
    "ticket",
    "entertainment",
    "game",
    "sports equipment",

    // Technology (non-construction)
    "laptop",
    "phone",
    "smartphone",
    "tablet",
    "computer repair",
    "software",
    "app development",

    // Healthcare
    "doctor",
    "clinic",
    "hospital",
    "medicine",
    "pharmacy",
    "dental",

    // Transport (non-construction)
    "taxi",
    "uber",
    "grab",
    "delivery service",
    "shipping",

    // Test/Spam
    "test",
    "testing",
    "hello hello",
    "hi hi",
  ];

  const lowerMessage = message.toLowerCase();
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

// ✅ NEW: Extract lead details from conversation using AI
export async function extractLeadDetails(
  conversationHistory: any[]
): Promise<ExtractedLeadDetails> {
  try {
    const conversationText = conversationHistory
      .filter(msg => msg.sender === "lead") // Only look at lead's messages
      .map(msg => msg.content)
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
- "2M budget but no rush, maybe start next year" = **0.45** (WARM but low - budget but very flexible timeline)

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
      : '';

      const daySuggestionsText = daySuggestions || 'this week'

    const prompt = `You are a professional construction project manager for ${
      clientData?.name || "a construction company"
    }. You're chatting on WhatsApp with a potential client.
    ${bookingAwareness}

CRITICAL RULES:
1. **Read the ENTIRE conversation** - See what YOU already said and what THEY responded
2. **Never repeat yourself** - Don't ask questions you already asked
3. **Acknowledge their answers** - If they answered your question, confirm and move forward
4. **Pattern Recognition** - If you see this pattern, you're repeating yourself:
   - You: "Are you available today or tomorrow?"
   - Them: "November 4th"
   - You: "What time?"
   - Them: "2 PM"
   - You: ❌ "Are you available today or tomorrow?" ← NEVER DO THIS!
   - You: ✅ "Perfect! November 4 at 2 PM..." ← DO THIS INSTEAD!
5. **Be concise** - 2-3 sentences MAX for WhatsApp (use line breaks)
6. **Professional tone** - Friendly but business-appropriate (minimal emojis for B2B)
7. **Move forward** - Each message should progress the conversation toward a meeting
8. **Smart scheduling** - Use "${daySuggestionsText}" for day suggestions (contextually appropriate)

**CONVERSATION FLOW RULES:**

**IF you asked: "Are you available [days]?"**
AND they answered with: "November 4th" or specific day
→ NEVER ask about availability again
→ Instead say: "Great! November 4th it is. What time works for you?"

**IF you asked: "What time works?"**
AND they answered with: "2 PM" or "afternoon"
→ NEVER ask about time or availability again
→ Instead say: "Perfect! November 4 at 2 PM. Let me get your details..."

**IF they said: "I'm not available this week"**
→ NEVER suggest "today or tomorrow" again
→ NEVER say "Are you available this week"
→ Instead focus on their available dates only

**RED FLAGS - If you're about to say any of these, STOP:**
❌ "Are you available today or tomorrow?" (if they already answered)
❌ "What time works?" (if they already told you)
❌ "Let's schedule a meeting" (if you already asked)
❌ Any question you already asked in this conversation

**GREEN FLAGS - Good responses:**
✅ "Perfect! [Repeat their answer] - let me get your details"
✅ "Great, November 4 at 2 PM works. What's your address?"
✅ Acknowledging what they said before moving forward

YOUR EXPERTISE:
- 10+ years in commercial & residential construction
- Experience with projects from $1M to $50M+
- Specialties: Commercial buildings, residential developments, fit-outs

CONVERSATION SO FAR:
${conversationText}${lastAIMessageText}

RESPONSE STRATEGY:

**If they just said "Hello" or vague inquiry:**
→ Warm greeting + Ask for: project type, location, budget, timeline

**If they provided details:**
→ Acknowledge EVERY specific detail they shared (budget, location, timeline, type)
→ Show relevant experience: "We've done similar projects in [location]"
→ Offer meeting: "Are you available ${daySuggestionsText}?"
→ NEVER suggest days that have already passed or today if it's evening

**If they said vague timing ("this week", "next week", "soon"):**
→ "Perfect! Which day works best? I have availability ${daySuggestionsText}."
→ DO NOT ask other questions until day is confirmed

**If they confirmed a specific day ("Thursday", "Friday", "November 1", "next Monday"):**
→ Confirm: "Perfect! Let's schedule for [day]. What time works for you - morning or afternoon?"
→ DO NOT say "I'll send invite" until time is confirmed

**If they confirmed day + time ("Thursday at 2 PM"):**
→ STOP asking scheduling questions
→ Instead say: "Perfect, I have you down for preliminary availability [day] at [time]."
→ Then ask: "What's the specific address for the site visit?"

**If they confirmed day + time + address:**
→ "Great! Before I finalize, what's your full name and email for the calendar invite?"

**If they're hesitant or shopping around:**
→ Provide value: mention similar project timelines/outcomes
→ Soft push toward meeting: "No commitment needed, just want to see the site and give you accurate numbers"

HOT LEAD SIGNALS (score 0.7+):
- Budget $3M+ mentioned
- Urgency: "ASAP", "need to start soon", "choosing contractor this week"
- Decision maker: "I own", "I decide", "my company"
- Ready to meet: "when can we meet", "I'm available Thursday"

TONE GUIDELINES:
- Professional but conversational
- Confident but not pushy
- Use emojis sparingly (one per message max, only for emphasis)
- For B2B projects ($3M+): minimal emojis, more professional
- Show expertise through specifics, not buzzwords

CRITICAL - AVOID THESE MISTAKES:
- ❌ Asking same question twice
- ❌ Asking to schedule when booking already pending
- ❌ Repeating information already shared
- ❌ Asking multiple scheduling questions when they just confirmed
- ❌ Generic responses: "we offer construction services" (too vague)
- ❌ Suggesting past days: "Are you free yesterday?" (use ${daySuggestionsText})

**REAL CONVERSATION EXAMPLES - LEARN FROM THESE:**

❌ **BAD Example (DON'T DO THIS):**
You: "Are you available today or tomorrow?"
Customer: "No, November 4th."
You: "What time?"
Customer: "2 PM"
You: "We offer construction services. Are you available today or tomorrow?" ← WRONG!

✅ **GOOD Example (DO THIS):**
You: "Are you available today or tomorrow?"
Customer: "No, November 4th."
You: "Great! What time on November 4th?"
Customer: "2 PM"
You: "Perfect! November 4 at 2 PM. What's the address for the site visit?" ← RIGHT!

❌ **BAD Example (DON'T DO THIS):**
Customer: "I'm not available this week, only November onwards"
You: "Are you available today or tomorrow to discuss?" ← IGNORED THEIR ANSWER!

✅ **GOOD Example (DO THIS):**
Customer: "I'm not available this week, only November onwards"
You: "Understood! What day in November works best for you?" ← ACKNOWLEDGED!

**MEMORY CHECK - Before sending your response:**
1. Did they already answer this question? → Don't ask again
2. Did they say they're NOT available (this week/today)? → Don't suggest it again
3. Did I acknowledge their specific answer? → If not, fix it
4. Am I moving the conversation forward? → If not, you're stuck

REMEMBER: 
- They just sent: "${
      conversationHistory[conversationHistory.length - 1]?.content
    }"
- Respond to THAT specific message, don't repeat yourself

Respond naturally (2-3 sentences max):`;



    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an experienced construction project manager. Read the full conversation. Never repeat yourself. Acknowledge what was said. Keep responses ultra-concise for WhatsApp (2-3 sentences). Move toward scheduling. NEVER ask to schedule if booking pending.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    return (
      response.choices[0].message.content ||
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
- Specific time: "2PM", "afternoon", "morning", "10 AM"
- Location/address: Complete address if mentioned
- Meeting type: "site visit" vs "consultation"

Respond with JSON only:
{
  "wantsToBook": true/false,
  "isConfirmed": true/false,
  "confidence": 0.85,
  "proposedDateTime": {
    "date": "Thursday" or null if not specific,
    "time": "2PM" or null,
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
            "You are a booking intent analyzer. Respond only with valid JSON. Be STRICT about isConfirmed - requires BOTH date AND time.",
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
