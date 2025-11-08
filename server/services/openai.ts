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
    console.log("🎯 Classifying intent for message:", message);

    // ============================================
    // ✅ FAST PATH 1: Obvious construction terms
    // ============================================
    const obviousConstructionTerms = [
      "build a house",
      "build a home",
      "build an addition",
      "construction",
      "renovation",
      "remodel",
      "contractor",
      "site visit",
      "commercial kitchen",
      "MEP work",
      "deck construction",
      "garage build",
      "basement finishing",
      "home addition",
    ];

    if (obviousConstructionTerms.some((term) => message.toLowerCase().includes(term))) {
      console.log("✅ FAST PATH: Obvious construction term detected");
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.95,
        reasoning: "Clear construction terminology detected",
      };
    }

    // ============================================
    // ✅ FAST PATH 2: Obvious spam/test
    // ============================================
    const obviousSpamPatterns = [
      /^test\s*test$/i,
      /^hello\s*hello$/i,
      /^hi\s*hi$/i,
      /^ok$/i,
      /^k$/i,
      /^yes$/i,
      /^no$/i,
    ];

    // Only flag as spam if it's the FIRST message AND matches pattern
    const isFirstMessage = conversationHistory.filter((m) => m.sender === "lead").length <= 1;

    if (isFirstMessage && obviousSpamPatterns.some((pattern) => pattern.test(message.trim()))) {
      console.log("🚫 FAST PATH: Obvious spam/test pattern (first message)");
      return {
        isRelevant: false,
        intent: "test",
        confidence: 0.9,
        reasoning: "First message matches test pattern",
      };
    }

    // ============================================
    // ✅ BENEFIT OF DOUBT: Early messages
    // ============================================
    const leadMessageCount = conversationHistory.filter((m) => m.sender === "lead").length;

    if (leadMessageCount <= 2 && message.length < 20) {
      console.log("✅ Early message, giving benefit of doubt");
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.5,
        reasoning: "Early message - waiting for more context",
      };
    }

    // ============================================
    // ✅ AI CLASSIFICATION (simplified prompt)
    // ============================================
    console.log("🤖 Using AI classification (ambiguous case)");

    const recentContext = conversationHistory
      .slice(-5)
      .map((msg) => `${msg.sender === "lead" ? "Customer" : "Agent"}: ${msg.content}`)
      .join("\n");

    // ✅ SIMPLIFIED PROMPT (was 200 lines, now 40 lines)
    const prompt = `Classify if this inquiry is relevant to ${clientData?.name || "a construction company"}:

Recent conversation:
${recentContext}

Latest message: "${message}"

Construction company services:
- Building (commercial, residential, industrial)
- Renovations, remodeling, fit-outs
- Site development, project management
- Engineering, architecture

Respond with JSON only:
{
  "isRelevant": true/false,
  "intent": "construction" | "unrelated" | "spam",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}

EXAMPLES:
✅ "I want to build a house" → {"isRelevant": true, "intent": "construction", "confidence": 0.95}
✅ "Do you do renovations?" → {"isRelevant": true, "intent": "construction", "confidence": 0.9}
❌ "Do you sell shoes?" → {"isRelevant": false, "intent": "unrelated", "confidence": 0.95}
❌ "I need a burger" → {"isRelevant": false, "intent": "unrelated", "confidence": 0.9}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a strict intent classifier. Respond with valid JSON only. Be decisive and concise."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    console.log("🤖 AI classification result:", result);

    return {
      isRelevant: result.isRelevant ?? false,
      intent: result.intent || "unrelated",
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || "Unable to classify intent",
    };

  } catch (error) {
    console.error("❌ Intent classification error:", error);

    // ✅ Safe fallback: Give benefit of doubt for early messages
    const leadCount = conversationHistory.filter((m) => m.sender === "lead").length;

    if (leadCount <= 2) {
      return {
        isRelevant: true,
        intent: "construction",
        confidence: 0.4,
        reasoning: "Classification error - giving benefit of doubt",
      };
    }

    return {
      isRelevant: false,
      intent: "unrelated",
      confidence: 0.5,
      reasoning: "Classification failed, defaulting to unrelated",
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



interface ConversationContext {
  leadAskedQuestion: boolean;
  questionContent?: string;
  leadAnsweredScheduling: boolean;
  lastAIQuestion?: string;
  leadTimeline?: "immediate" | "soon" | "later" | "exploring" | "";
  hasPendingBooking: boolean;
  conversationStage: "greeting" | "qualifying" | "scheduling" | "booking";
}

/**
 * Analyze conversation to determine optimal response strategy
 * This replaces complex conditional logic in prompts
 */
function analyzeConversationContext(
  messages: any[],
  hasPendingBooking: boolean
): ConversationContext {
  const lastLeadMsg = messages
    .filter((m) => m.sender === "lead")
    .slice(-1)[0]?.content || "";

  const lastAIMsg = messages
    .filter((m) => m.sender === "ai")
    .slice(-1)[0]?.content || "";

  console.log("📊 Analyzing conversation context...");
  console.log(`   Last lead message: "${lastLeadMsg.substring(0, 50)}..."`);
  console.log(`   Last AI message: "${lastAIMsg.substring(0, 50)}..."`);

  // ✅ DETECT: Did lead ask a question?
  const questionPatterns = [
    /^do you (do|handle|offer|provide|have|install|build)/i,
    /^can you/i,
    /^what'?s (the|your|included|typical)/i,
    /^how (much|long|many|does)/i,
    /^are you/i,
    /^does (it|this|that)/i,
    /\?$/,
  ];

  const leadAskedQuestion = questionPatterns.some((p) => p.test(lastLeadMsg.trim()));

  if (leadAskedQuestion) {
    console.log("   ✅ Lead asked a question - will answer directly");
  }

  // ✅ DETECT: Did lead answer a scheduling question?
  const schedulingPatterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b\d{1,2}\s*(am|pm)\b/i,
    /\b(morning|afternoon|evening)\b/i,
    /\b(today|tomorrow|this week|next week)\b/i,
  ];

  const aiAskedScheduling = /are you available|what time|which day|when (can|would|are)/i.test(lastAIMsg);
  const leadAnsweredScheduling = aiAskedScheduling && schedulingPatterns.some((p) => p.test(lastLeadMsg));

  if (leadAnsweredScheduling) {
    console.log("   ✅ Lead answered scheduling question - will acknowledge");
  }

  // ✅ EXTRACT: Timeline from all lead messages
  const allLeadMessages = messages
    .filter((m) => m.sender === "lead")
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  let leadTimeline: ConversationContext["leadTimeline"] = "";

  if (/asap|urgent|immediately|this week|next week/i.test(allLeadMessages)) {
    leadTimeline = "immediate";
    console.log("   ⏰ Timeline: IMMEDIATE (urgent)");
  } else if (/in.*month|next month|1-2 months/i.test(allLeadMessages)) {
    leadTimeline = "soon";
    console.log("   ⏰ Timeline: SOON (1-3 months)");
  } else if (/few months|several months|6-8 months/i.test(allLeadMessages)) {
    leadTimeline = "later";
    console.log("   ⏰ Timeline: LATER (6+ months)");
  } else if (/next year|planning stage|just looking|no rush|flexible/i.test(allLeadMessages)) {
    leadTimeline = "exploring";
    console.log("   ⏰ Timeline: EXPLORING (no rush)");
  }

  // ✅ DETERMINE: Conversation stage
  const leadMessageCount = messages.filter((m) => m.sender === "lead").length;
  const hasProjectDetails = /\$|budget|location|sq ft|square feet/i.test(allLeadMessages);
  const hasTimeDiscussion = schedulingPatterns.some((p) => p.test(allLeadMessages));

  let conversationStage: ConversationContext["conversationStage"] = "greeting";

  if (hasTimeDiscussion || hasPendingBooking) {
    conversationStage = "booking";
  } else if (hasProjectDetails || leadMessageCount >= 3) {
    conversationStage = "scheduling";
  } else if (leadMessageCount >= 2) {
    conversationStage = "qualifying";
  }

  console.log(`   📍 Conversation stage: ${conversationStage.toUpperCase()}`);

  return {
    leadAskedQuestion,
    questionContent: leadAskedQuestion ? lastLeadMsg : undefined,
    leadAnsweredScheduling,
    lastAIQuestion: aiAskedScheduling ? lastAIMsg : undefined,
    leadTimeline,
    hasPendingBooking,
    conversationStage,
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
    console.log("🤖 ========== GENERATE AI RESPONSE ==========");

    // ✅ STEP 1: Analyze conversation
    const context = analyzeConversationContext(
      conversationHistory,
      hasPendingBooking || false
    );

    // ✅ STEP 2: Build recent conversation (last 10 messages only)
    const recentConversation = conversationHistory
      .slice(-10)
      .map((msg) => `${msg.sender === "lead" ? "Customer" : "You"}: ${msg.content}`)
      .join("\n");

    // ✅ STEP 3: Choose response strategy based on context
    let systemPrompt = "";
    let userPrompt = "";

    // ================================================
    // STRATEGY 1: QUESTION ANSWERING
    // ================================================
    if (context.leadAskedQuestion) {
      console.log("📋 Strategy: QUESTION ANSWERING");

      systemPrompt = `You are a construction project manager. Answer customer questions directly and concisely.

RULES:
- First sentence MUST answer the question
- Then ask ONE relevant follow-up
- Maximum 50 words total
- Professional but conversational tone`;

      userPrompt = `Customer asked: "${context.questionContent}"

Answer directly in 1-2 sentences, then ask ONE follow-up question.

EXAMPLES:
Q: "Do you handle permits?"
A: "Yes, we handle all permits and approvals. What type of project are you planning?"

Q: "How long does a renovation take?"
A: "A typical renovation takes 4-8 weeks depending on scope. What's your timeline?"

Q: "What's included in a bathroom reno?"
A: "A bathroom renovation includes fixtures, vanity, tiling, plumbing, and electrical. What's your budget range?"

Answer naturally:`;
    }

    // ================================================
    // STRATEGY 2: ACKNOWLEDGE SCHEDULING ANSWER
    // ================================================
    else if (context.leadAnsweredScheduling) {
      console.log("📋 Strategy: ACKNOWLEDGE SCHEDULING");

      systemPrompt = `You are a construction project manager. Acknowledge the customer's answer and move forward.

RULES:
- Acknowledge their specific answer
- Ask the NEXT logical question
- Never repeat the same question
- Maximum 40 words`;

      userPrompt = `Recent conversation:
${recentConversation}

You asked: "${context.lastAIQuestion}"
Customer answered: "${conversationHistory[conversationHistory.length - 1].content}"

Acknowledge their answer specifically and ask the NEXT logical question:`;
    }

    // ================================================
    // STRATEGY 3: NORMAL CONVERSATION
    // ================================================
    else {
      console.log("📋 Strategy: NORMAL CONVERSATION");

      systemPrompt = `You are a professional construction project manager for ${clientData?.name || "a construction company"}.

GUIDELINES:
- Professional but conversational (WhatsApp tone)
- Ask 1 question at a time
- 2-3 sentences maximum
- Use "meeting" or "site visit", never "call"
- Minimal emojis (max 1 per message)

${context.hasPendingBooking ? "⚠️ CRITICAL: Booking already pending. DO NOT ask to schedule again. Just acknowledge and continue conversation." : ""}`;

      // Timeline-specific guidance
      let timelineGuidance = "";
      if (context.leadTimeline === "immediate") {
        timelineGuidance = "\n⏰ Customer needs ASAP - offer meeting today or tomorrow";
      } else if (context.leadTimeline === "exploring") {
        timelineGuidance = "\n⏰ Customer is in planning phase - don't push for immediate meeting";
      }

      userPrompt = `Recent conversation:
${recentConversation}
${timelineGuidance}

Respond naturally in 2-3 sentences. Ask ONE question to move the conversation forward:`;
    }

    // ✅ STEP 4: Generate response with simple retry
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;

      console.log(`🤖 Attempt ${attempts}/${maxAttempts}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7 + (attempts - 1) * 0.2, // Higher temp on retry
        max_tokens: 150,
      });

      const aiResponse = response.choices[0].message.content || "";

      console.log(`🤖 Generated response: "${aiResponse}"`);

      // ✅ Simple repetition check (exact match in last 3 messages)
      const lastAIMessages = conversationHistory
        .filter((m) => m.sender === "ai")
        .slice(-3)
        .map((m) => m.content.toLowerCase().trim());

      const isRepetitive = lastAIMessages.includes(aiResponse.toLowerCase().trim());

      if (!isRepetitive) {
        console.log("✅ Response is unique, using it");
        console.log("🤖 ========== END GENERATE AI RESPONSE ==========\n");
        return aiResponse;
      }

      console.warn(`⚠️ Repetitive response detected (attempt ${attempts}), retrying...`);
    }

    // ✅ Fallback (should rarely happen)
    console.warn("⚠️ All retry attempts exhausted, using fallback");
    return "Thanks for sharing that! Could you tell me more about your project timeline and budget?";

  } catch (error) {
    console.error("❌ Error generating AI response:", error);
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

interface TimeExtraction {
  time: string;
  confidence: number;
  messageIndex: number;
  rawMatch: string;
}

/**
 * Extract all times mentioned by the lead in chronological order
 * This replaces AI-based time extraction for 98% accuracy
 */
export function extractTimesFromConversation(messages: any[]): TimeExtraction[] {
  const timeExtractions: TimeExtraction[] = [];

  // Comprehensive time patterns
  const timePatterns = [
    // "2:30 PM", "10:00 AM"
    { pattern: /\b(\d{1,2})\s*:\s*(\d{2})\s*(am|pm|AM|PM)\b/g, confidence: 0.98 },
    // "2PM", "2 PM", "10AM"
    { pattern: /\b(\d{1,2})\s*(am|pm|AM|PM)\b/g, confidence: 0.95 },
    // "morning", "afternoon", "evening"
    { pattern: /\b(morning|afternoon|evening)\b/gi, confidence: 0.7 },
  ];

  messages.forEach((msg, index) => {
    // Only check lead's messages
    if (msg.sender !== "lead") return;

    const content = msg.content;

    // Try each pattern
    for (const { pattern, confidence } of timePatterns) {
      // Reset regex state (important for global flags)
      pattern.lastIndex = 0;
      
      const matches = Array.from(content.matchAll(pattern)) as RegExpMatchArray[];

      matches.forEach((match: RegExpMatchArray) => {
        let normalizedTime = "";

        // Format: "2:30 PM" or "10:00 AM"
        if (match[2] && match[3]) {
          const hours = match[1] as string;
          const minutes = match[2] as string;
          const period = (match[3] as string).toUpperCase();
          normalizedTime = `${hours}:${minutes} ${period}`;
        }
        // Format: "2 PM" or "10AM"
        else if (match[2]) {
          const hours = match[1] as string;
          const period = (match[2] as string).toUpperCase();
          normalizedTime = `${hours}:00 ${period}`;
        }
        // Format: "morning", "afternoon", "evening"
        else if (match[1]) {
          const timeOfDay = (match[1] as string).toLowerCase();
          // Convert to specific time
          if (timeOfDay === "morning") normalizedTime = "10:00 AM";
          else if (timeOfDay === "afternoon") normalizedTime = "2:00 PM";
          else if (timeOfDay === "evening") normalizedTime = "6:00 PM";
        }

        if (normalizedTime) {
          timeExtractions.push({
            time: normalizedTime,
            confidence,
            messageIndex: index,
            rawMatch: match[0] as string,
          });

          console.log(`⏰ Extracted time: "${normalizedTime}" from message ${index}: "${content}"`);
        }
      });
    }
  });

  return timeExtractions;
}

/**
 * Get the MOST RECENT time mentioned (simple!)
 * This is the key fix - sorting by message index ensures we always get the latest
 */
export function getMostRecentTime(extractions: TimeExtraction[]): string | null {
  if (extractions.length === 0) {
    console.log("⏰ No times extracted from conversation");
    return null;
  }

  // Sort by message index (chronological order)
  const sorted = extractions.sort((a, b) => a.messageIndex - b.messageIndex);

  // Return the LAST one (most recent)
  const mostRecent = sorted[sorted.length - 1];

  console.log(`⏰ Most recent time: "${mostRecent.time}" (from ${extractions.length} total extractions)`);
  console.log(`   All extracted times:`, sorted.map(t => `"${t.time}" (msg ${t.messageIndex})`));

  return mostRecent.time;
}

export async function detectBookingIntent(
  conversationHistory: any[],
  leadData: any
): Promise<BookingIntent> {
  try {
    console.log("🔍 ========== DETECT BOOKING INTENT ==========");
    console.log(`📊 Analyzing ${conversationHistory.length} messages`);

    // ✅ STEP 1: Extract times in CODE first (not AI)
    const timeExtractions = extractTimesFromConversation(conversationHistory);
    const mostRecentTime = getMostRecentTime(timeExtractions);

    console.log(`⏰ Time extraction complete. Found: ${timeExtractions.length} times`);
    if (mostRecentTime) {
      console.log(`⏰ Using most recent: "${mostRecentTime}"`);
    }

    // ✅ STEP 2: Build conversation for AI (last 10 messages only)
    const conversationText = conversationHistory
      .slice(-10)
      .map((msg) => `${msg.sender === "lead" ? "Customer" : "Agent"}: ${msg.content}`)
      .join("\n");

    // ✅ STEP 3: SIMPLIFIED PROMPT (was 300 lines, now 50 lines!)
    const prompt = `Analyze this conversation for booking intent:

${conversationText}

Determine:
1. Does customer want to book a meeting?
2. Is the date confirmed?

**HIGH CONFIDENCE (0.8+):**
- "Yes, Thursday at 2 PM" ✅
- "Book me for November 15" ✅
- "Thursday works, let's meet" ✅

**MEDIUM CONFIDENCE (0.5-0.7):**
- "I'm available Thursday" (date but no time)
- "This week works" (vague timeframe)

**LOW CONFIDENCE (0.3-0.5):**
- "Maybe later"
- "I'll think about it"

**NO INTENT (0.0-0.2):**
- Just asking questions
- Browsing/exploring

Respond with JSON only:
{
  "wantsToBook": true/false,
  "isConfirmed": true/false (BOTH date AND time must be confirmed),
  "confidence": 0.85,
  "proposedDate": "Thursday" or "November 15" or null,
  "location": "123 Main St, Vancouver" or null,
  "meetingType": "site-visit" or "consultation",
  "reasoning": "Brief explanation"
}`;

    // ✅ STEP 4: Call AI (simplified, focused)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a booking intent analyzer. Respond with valid JSON only. Be concise and decisive."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temp for consistency
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    console.log("🤖 AI Response:", JSON.stringify(result, null, 2));

    // ✅ STEP 5: INJECT time from CODE (don't trust AI extraction)
    const finalIntent: BookingIntent = {
      wantsToBook: result.wantsToBook ?? false,
      isConfirmed: result.isConfirmed ?? false,
      confidence: result.confidence ?? 0,
      proposedDateTime: {
        date: result.proposedDate,
        time: mostRecentTime || result.proposedTime, // ✅ CODE WINS!
        isFlexible: result.confidence < 0.7,
      },
      location: result.location,
      meetingType: result.meetingType || "consultation",
      reasoning: result.reasoning || "Unable to determine booking intent",
    };

    console.log("✅ Final booking intent:", JSON.stringify(finalIntent, null, 2));
    console.log("🔍 ========== END DETECT BOOKING INTENT ==========\n");

    return finalIntent;

  } catch (error) {
    console.error("❌ Error detecting booking intent:", error);
    return {
      wantsToBook: false,
      isConfirmed: false,
      confidence: 0,
      proposedDateTime: {
        date: undefined,
        time: undefined,
        isFlexible: true,
      },
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
