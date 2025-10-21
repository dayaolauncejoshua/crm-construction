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

// ✅ NEW: Hardcoded keyword detection for obvious non-construction topics
function hasNonConstructionKeywords(message: string): boolean {
  const nonConstructionKeywords = [
    // Food & Beverages
    'burger', 'pizza', 'fries', 'food', 'restaurant', 'delivery', 'menu', 'order', 'eat', 'drink',
    'coffee', 'lunch', 'dinner', 'breakfast', 'meal', 'cuisine', 'dish', 'recipe',
    
    // Retail & Products (non-construction)
    'shoes', 'clothing', 'shirt', 'pants', 'dress', 'fashion', 'apparel', 'sneakers',
    'watch', 'jewelry', 'accessories', 'handbag', 'wallet',
    
    // Services (non-construction)
    'haircut', 'salon', 'spa', 'massage', 'laundry', 'cleaning service', 'dry clean',
    'photography', 'videography', 'event planning',
    
    // Entertainment
    'movie', 'concert', 'show', 'ticket', 'entertainment', 'game', 'sports equipment',
    
    // Technology (non-construction)
    'laptop', 'phone', 'smartphone', 'tablet', 'computer repair', 'software', 'app development',
    
    // Healthcare
    'doctor', 'clinic', 'hospital', 'medicine', 'pharmacy', 'dental',
    
    // Transport (non-construction)
    'taxi', 'uber', 'grab', 'delivery service', 'shipping',
    
    // Test/Spam
    'test', 'testing', 'hello hello', 'hi hi'
  ];

  const lowerMessage = message.toLowerCase();
  return nonConstructionKeywords.some(keyword => lowerMessage.includes(keyword));
}

// ✅ NEW: Check if message is just a greeting
function isOnlyGreeting(message: string): boolean {
  const greetingPatterns = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\s!?.]*$/i;
  return greetingPatterns.test(message.trim());
}

export async function classifyIntent(
  message: string,
  conversationHistory: any[],
  clientData: any
): Promise<IntentClassification> {
  try {

    // ✅ PHASE 2: First message spam detection (Proactive)
    if (conversationHistory.length <= 2) {
      const firstMessageSpamIndicators = [
        /test\s*test/i,
        /hello\s*hello/i,
        /hi\s*hi/i,
        /^(ok|okay|k)$/i, // Single word responses
        /^[0-9]+$/,  // Just numbers
        /^.{1,3}$/,  // Very short messages (1-3 chars)
        /^(yes|no|yeah|nope)$/i, // One-word yes/no
      ];

      for (const indicator of firstMessageSpamIndicators) {
        if (indicator.test(message.trim())) {
          console.log("🚫 Proactive: First message spam detected:", message);
          return {
            isRelevant: false,
            intent: "test",
            confidence: 0.9,
            reasoning: "First message matches spam pattern (test/short/low-effort)"
          };
        }
      }
    }

    // ✅ PHASE 1: Check learned patterns FIRST (before hardcoded keywords)
    const learnedPatternCheck = await spamPatternLearning.checkAgainstLearnedPatterns(message);
    if (learnedPatternCheck.isSpam && learnedPatternCheck.confidence > 0.85) {
      console.log("🎯 Learned spam pattern detected:", learnedPatternCheck.matchedPattern);
      return {
        isRelevant: false,
        intent: "unrelated",
        confidence: learnedPatternCheck.confidence,
        reasoning: `Matches learned spam pattern: "${learnedPatternCheck.matchedPattern}" (${learnedPatternCheck.category})`
      };
    }
    // ✅ IMPROVED: Hardcoded keyword check (fast path)
    if (hasNonConstructionKeywords(message)) {
      console.log("🚫 Hardcoded keyword detected:", message);
      return {
        isRelevant: false,
        intent: "unrelated",
        confidence: 0.95,
        reasoning: "Message contains non-construction keywords (shoes, food, etc.)"
      };
    }

    // ✅ IMPROVED: Handle greetings
    if (isOnlyGreeting(message) && conversationHistory.length <= 1) {
      console.log("👋 Initial greeting detected, waiting for context");
      return {
        isRelevant: true, // Neutral - wait for next message
        intent: "construction",
        confidence: 0.5,
        reasoning: "Initial greeting - waiting for context"
      };
    }

    // ✅ IMPROVED: Analyze conversation trend (not just latest message)
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
1. If the message mentions shoes, food, clothing, or other retail → ALWAYS mark as NOT RELEVANT
2. If the message is about services NOT related to construction → ALWAYS mark as NOT RELEVANT
3. BE STRICT - When in doubt about relevance, mark as NOT RELEVANT
4. A greeting alone (first message) can be neutral, but any follow-up should be construction-related

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
            "You are a STRICT intent classification expert. Respond only with valid JSON. Be VERY strict - only mark as relevant if it's CLEARLY construction-related. Food, shoes, retail, entertainment = NOT RELEVANT.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // ✅ REDUCED from 0.3 for more consistent classification
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
    // ✅ CHANGED: Default to UNRELATED instead of relevant (safer)
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

      // ✅ IMPROVED: Lower confidence threshold from 0.7 to 0.6
      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.6 // ← CHANGED from 0.7
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
  clientData: any
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

      // ✅ IMPROVED: Lower confidence threshold from 0.7 to 0.6
      if (
        !intentClassification.isRelevant &&
        intentClassification.confidence > 0.6 // ← CHANGED from 0.7
      ) {
        console.log("❌ Generating redirect response for off-topic inquiry");

        const redirectCount = conversationHistory.filter((msg) =>
          msg.sender === "ai" &&
          (msg.content.includes("construction company") ||
           msg.content.includes("building projects") ||
           msg.content.includes("wrong business") ||
           msg.content.includes("might have been some confusion") ||
           msg.content.includes("specialize in construction"))
        ).length;

        console.log(`🔢 Redirect count: ${redirectCount}`);

        if (redirectCount >= 2) {
          console.log("⛔ Maximum redirects reached, sending termination message");
          return `Final notice: This is ${clientData?.name || "a construction company"}. We only handle construction and building projects. This conversation will not receive further responses. Please verify your contact information.`;
        }

        const redirectResponses = [
          // First redirect (friendly)
          `Hi! I think there might be some confusion. We're ${
            clientData?.name || "a construction company"
          } specializing in building projects. We handle construction, renovations, and development projects. If you have a construction project in mind, I'd be happy to help!`,

          // Second redirect (firmer)
          `Just to clarify: we're a construction company. We build commercial buildings, homes, and handle renovation projects. If you're looking for construction services, I'm here to assist. Otherwise, you may have reached us by mistake.`,
        ];

        return redirectResponses[Math.min(redirectCount, redirectResponses.length - 1)];
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

    const prompt = `You are a professional construction project manager for ${
      clientData?.name || "a construction company"
    }. You're chatting on WhatsApp with a potential client.

CRITICAL RULES:
1. **Read the ENTIRE conversation** - See what YOU already said and what THEY responded
2. **Never repeat yourself** - Don't ask questions you already asked
3. **Acknowledge their answers** - If they answered your question, confirm and move forward
4. **Be concise** - 2-3 sentences MAX for WhatsApp (use line breaks)
5. **Professional tone** - Friendly but business-appropriate (minimal emojis for B2B)
6. **Move forward** - Each message should progress the conversation toward a meeting

YOUR EXPERTISE:
- 10+ years in commercial & residential construction
- Experience with projects from ₱2M to ₱50M+
- Specialties: Commercial buildings, residential developments, fit-outs

CONVERSATION SO FAR:
${conversationText}${lastAIMessageText}

RESPONSE STRATEGY:

**If they just said "Hello" or vague inquiry:**
→ Warm greeting + Ask for: project type, location, budget, timeline

**If they provided details:**
→ Acknowledge EVERY specific detail they shared (budget, location, timeline, type)
→ Show relevant experience: "We've done similar projects in [location]"
→ Offer site visit with specific days/times (e.g., "Are you available Thursday or Friday this week?")

**If they said "this week" or "next week" without specific day:**
→ "Great! Which day works best for you? I have availability on [specific days]."
→ DO NOT ask other questions until day is confirmed
→ DO NOT say "I'll send a calendar invite" until day is confirmed

**If they confirmed a specific day (e.g., "Thursday", "Friday", "November 1"):**
→ Confirm: "Perfect! Let's schedule for [day]. What time works for you - morning or afternoon?"
→ Then ask for address
→ Mention what you'll discuss

**If they confirmed meeting with all details (day + time + location):**
→ "Excellent! I'll send you a calendar invite for [day] at [time] at [location]."
→ ONE sentence about what you'll discuss
→ DO NOT ask any more questions

**If they're hesitant or shopping around:**
→ Provide value: mention similar project timelines/outcomes
→ Soft push toward meeting: "No commitment needed, just want to see the site and give you accurate numbers"

HOT LEAD SIGNALS (score 0.7+):
- Budget 3M+ mentioned
- Urgency words ("ASAP", "need to start soon", "choosing this week")
- Decision maker ("I own", "I decide", "my company")
- Ready to meet ("when can we meet", "I'm free Thursday")

TONE GUIDELINES:
- Professional but conversational
- Confident but not pushy  
- Use emojis sparingly (only for initial greetings in casual contexts)
- For B2B/commercial projects (3M+ budget): minimal emojis, more professional
- Show expertise through specific examples, not buzzwords

CRITICAL: 
- If they JUST answered your question, don't ask it again!
- If they CONFIRMED a day/time, don't ask them to choose again!
- Don't repeat information you already told them!

Current situation: Customer just sent "${
      conversationHistory[conversationHistory.length - 1]?.content
    }"

Respond naturally and move the conversation forward:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an experienced construction project manager. Read the full conversation carefully. Never repeat yourself. Acknowledge what the customer says. Keep responses ultra-concise for WhatsApp (2-3 sentences). Move toward scheduling meetings.",
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
      .map((msg) => `${msg.sender === "lead" ? "Customer" : "Agent"}: ${msg.content}`)
      .join("\n");

    const prompt = `You are a booking intent detector for a construction company.

CONVERSATION:
${conversationText}

**TASK:** Detect if the customer wants to schedule a meeting AND has provided a specific date/day.

**HIGH CONFIDENCE BOOKING (wantsToBook: true, confidence > 0.8):**
✅ Specific day mentioned: "Thursday", "Friday", "November 1", "next Monday"
✅ Accepts specific day from agent: Agent: "How about Thursday?" → Lead: "Yes, Thursday works"
✅ Provides exact date: "October 21", "21st", "the 25th"

**MEDIUM CONFIDENCE (wantsToBook: true, confidence 0.5-0.7):**
⚠️ Vague timing: "this week", "next week", "soon", "in a few days"
⚠️ Shows interest but no commitment: "I'd like to meet sometime"
⚠️ Asks when agent is available without committing to a day

**LOW CONFIDENCE (wantsToBook: false):**
❌ Just asking questions about services
❌ Vague interest: "maybe later", "I'll think about it"
❌ Still gathering information

**TASK:** Detect if the customer wants to schedule a meeting AND if a FINAL, SPECIFIC date and time have been agreed upon.

...
**CRITICAL RULES:**
1. If the agent has just asked for a time (e.g., "morning or afternoon?") and the lead hasn't responded, it is NOT confirmed. Set "isConfirmed": false.
2. If the lead suggests a date AND a specific time (e.g., "November 2 at 2PM"), set "isConfirmed": true.
3. If the agent suggests a full date/time and the lead agrees ("Yes, that works"), set "isConfirmed": true.
4. If the lead is vague ("this week", "soon"), set "isConfirmed": false.
5. Only set "isConfirmed" to true when there is NO ambiguity left about the exact date and time.

**EXTRACT IF MENTIONED:**
- Specific date/day ("Thursday", "Friday", "March 15", "21st", "next Monday")
- Specific time ("2PM", "afternoon", "morning", "10 AM")
- Location/address
- Meeting type (site visit vs office consultation)

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
  "reasoning": "Brief explanation - WHY this confidence level?"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a booking intent analyzer. Respond only with valid JSON.",
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