// server/services/claude.ts
// ✅ COMPLETE MIGRATION: OpenAI → Anthropic Claude 4.5
// ✅ All critical features restored, simplified where possible

import Anthropic from "@anthropic-ai/sdk";
import { spamPatternLearning } from "./spamPatternLearning";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================

// ✅ Strip markdown from Claude's JSON responses
function parseClaudeJSON(text: string): any {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ✅ Simple text similarity (0.0 to 1.0)
function getSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Count matching words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matches = words1.filter((w) => words2.includes(w)).length;

  return (matches * 2) / (words1.length + words2.length);
}

// ✅ Check if AI is repeating itself
function isRepetitive(
  proposedResponse: string,
  conversationHistory: any[]
): boolean {
  const recentAI = conversationHistory
    .filter((m) => m.sender === "ai")
    .slice(-5)
    .map((m) => m.content);

  if (recentAI.length === 0) return false;

  const proposed = proposedResponse.toLowerCase().trim();

  // Check exact match
  if (recentAI.some((msg) => msg.toLowerCase().trim() === proposed)) {
    console.warn("🚫 Exact repetition detected");
    return true;
  }

  // Check high similarity (>85%)
  for (const prev of recentAI) {
    const similarity = getSimilarity(proposedResponse, prev);
    if (similarity > 0.85) {
      console.warn(`🚫 High similarity (${(similarity * 100).toFixed(0)}%)`);
      return true;
    }
  }

  // Check if same opening (first 30 chars)
  const proposedStart = proposed.substring(0, 30);
  const lastStart = recentAI[recentAI.length - 1]
    ?.toLowerCase()
    .substring(0, 30);

  if (proposedStart === lastStart && proposedStart.length > 15) {
    console.warn("🚫 Same opening phrase");
    return true;
  }

  return false;
}

// ✅ Extract timeline type from conversation
function getTimeline(conversationHistory: any[]): {
  type: "immediate" | "soon" | "months" | "long-term" | "flexible" | "unknown";
  text: string;
} {
  const leadText = conversationHistory
    .filter((m) => m.sender === "lead")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  // ✅ IMMEDIATE (1-2 weeks) - MUCH MORE SPECIFIC
  // Only match explicit urgency or "start this/next week"
  if (
    /asap|urgent|immediately|right away|as soon as possible/i.test(leadText)
  ) {
    const match = leadText.match(/(asap|urgent|immediately|right away)/i);
    return { type: "immediate", text: match?.[0] || "urgent" };
  }

  // ✅ Check for "start this week" or "start next week" (explicit start timeline)
  if (
    /start.*(this week|next week)|begin.*(this week|next week)/i.test(leadText)
  ) {
    const match = leadText.match(
      /start.*(this week|next week)|begin.*(this week|next week)/i
    );
    return { type: "immediate", text: match?.[0] || "starting soon" };
  }

  // ✅ SOON (1-3 months) - Include "in a month"
  if (
    /next month|in a month|in \d+-?\d* months?|1-2 months|couple.*months/i.test(
      leadText
    )
  ) {
    const match = leadText.match(
      /(next month|in a month|in \d+-?\d* months?)/i
    );
    return { type: "soon", text: match?.[0] || "next month" };
  }

  // ✅ MONTHS (3-6 months)
  if (/few months|several months|3-6 months/i.test(leadText)) {
    const match = leadText.match(/(few months|several months|3-6 months)/i);
    return { type: "months", text: match?.[0] || "few months" };
  }

  // ✅ LONG-TERM (6+ months)
  if (
    /next year|2026|2027|planning stage|just looking|just exploring/i.test(
      leadText
    )
  ) {
    const match = leadText.match(/(next year|2026|2027|planning stage)/i);
    return { type: "long-term", text: match?.[0] || "next year" };
  }

  // ✅ FLEXIBLE
  if (/no rush|flexible|whenever|not urgent|take.*time/i.test(leadText)) {
    const match = leadText.match(/(no rush|flexible|whenever)/i);
    return { type: "flexible", text: match?.[0] || "flexible" };
  }

  return { type: "unknown", text: "" };
}

// ✅ Detect if lead changed their preferred time
function detectTimeChange(conversationHistory: any[]): {
  changed: boolean;
  newTime?: string;
} {
  const leadMessages = conversationHistory
    .filter((m) => m.sender === "lead")
    .slice(-5); // Last 5 messages only

  const changeWords = /actually|instead|change|rather|better|how about/i;
  const timePattern = /\d{1,2}\s*[ap]m/i;

  let lastTime: string | undefined;
  let hasChange = false;

  for (const msg of leadMessages) {
    const timeMatch = msg.content.match(timePattern);

    if (timeMatch) {
      if (lastTime && changeWords.test(msg.content)) {
        hasChange = true;
      }
      lastTime = timeMatch[0];
    }
  }

  return {
    changed: hasChange,
    newTime: lastTime,
  };
}

// ============================================
// 📊 TYPES
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
// 🎯 INTENT CLASSIFICATION
// ============================================

export async function classifyIntent(
  message: string,
  conversationHistory: any[],
  clientData: any
): Promise<IntentClassification> {
  const messageCount = conversationHistory.filter(
    (m) => m.sender === "lead"
  ).length;

  // ✅ STEP 1: Obvious spam (first message only)
  if (messageCount <= 1) {
    const obviousSpam = [
      /^test\s*test$/i,
      /^hi\s*hi\s*hi$/i,
      /^hello\s*hello$/i,
      /^(ok|okay|k)$/i,
      /^\d+$/,
    ];

    for (const pattern of obviousSpam) {
      if (pattern.test(message.trim())) {
        console.log("🚫 Obvious spam (first message)");
        return {
          isRelevant: false,
          intent: "test",
          confidence: 0.95,
          reasoning: "First message is obvious spam/test",
        };
      }
    }
  }

  // ✅ STEP 2: Construction keywords (immediate override)
  const constructionKeywords = [
    "build a house",
    "build a home",
    "build house",
    "build home",
    "construction",
    "renovation",
    "remodel",
    "contractor",
    "deck",
    "garage",
    "warehouse",
    "addition",
    "MEP work",
    "build out",
    "buildout",
    "site visit",
    "commercial kitchen",
    "permits",
    "structural",
  ];

  const lowerMsg = message.toLowerCase();

  if (constructionKeywords.some((kw) => lowerMsg.includes(kw))) {
    console.log("✅ Construction keyword match");
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.95,
      reasoning: "Contains construction terminology",
    };
  }

  // ✅ STEP 3: Check learned spam patterns
  try {
    const spamCheck = await spamPatternLearning.checkAgainstLearnedPatterns(
      message
    );
    const threshold = messageCount <= 2 ? 0.95 : 0.85;

    if (spamCheck.isSpam && spamCheck.confidence > threshold) {
      console.log("🎯 Learned spam pattern:", spamCheck.matchedPattern);
      return {
        isRelevant: false,
        intent: "spam",
        confidence: spamCheck.confidence,
        reasoning: `Matches spam pattern: "${spamCheck.matchedPattern}"`,
      };
    }
  } catch (error) {
    console.error("Spam check error:", error);
  }

  // ✅ STEP 4: Non-construction keywords
  const nonConstructionKeywords = [
    "burger",
    "pizza",
    "fries",
    "food delivery",
    "shoes",
    "clothing",
    "shirt",
    "fashion",
    "haircut",
    "salon",
    "spa",
    "massage",
    "phone repair",
    "laptop",
    "software",
  ];

  if (nonConstructionKeywords.some((kw) => lowerMsg.includes(kw))) {
    console.log("🚫 Non-construction keyword");
    return {
      isRelevant: false,
      intent: "unrelated",
      confidence: 0.95,
      reasoning: "Contains non-construction keywords",
    };
  }

  // ✅ STEP 5: Use Claude for unclear cases
  const prompt = `Classify this inquiry for ${
    clientData?.name || "a construction company"
  }:

MESSAGE: "${message}"

Is this about CONSTRUCTION/BUILDING services?

✅ RELEVANT: Building, renovation, remodeling, permits, MEP, site visits, deck/garage/warehouse projects
❌ NOT RELEVANT: Food orders, retail products, personal services, tech repairs

When in doubt, mark as RELEVANT (construction gets varied inquiries).

Respond with JSON:
{
  "isRelevant": true/false,
  "intent": "construction" or "unrelated",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      temperature: 0.2,
      system:
        "You classify construction vs non-construction. Be generous with construction topics. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response");
    }

    const result = parseClaudeJSON(content.text);

    return {
      isRelevant: result.isRelevant ?? true, // Default to relevant
      intent: result.intent || "construction",
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || "",
    };
  } catch (error) {
    console.error("Intent classification error:", error);

    // Fail safe: assume relevant for construction companies
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.5,
      reasoning: "Classification failed, defaulting to relevant",
    };
  }
}

// ============================================
// 📅 BOOKING INTENT DETECTION
// ============================================

export async function detectBookingIntent(
  conversationHistory: any[],
  leadData: any
): Promise<BookingIntent> {
  console.log("🔍 Detecting booking intent...");

  // ✅ Sort chronologically (oldest to newest)
  const sorted = [...conversationHistory].sort((a, b) => {
    const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return timeA - timeB;
  });

  // ✅ Get only lead messages
  const leadMessages = sorted
    .filter((m) => m.sender === "lead")
    .map((m, idx) => `[${idx + 1}] ${m.content}`)
    .join("\n");

  console.log(
    `📨 Analyzing ${
      sorted.filter((m) => m.sender === "lead").length
    } lead messages`
  );

  const prompt = `Extract booking info from customer messages (chronological order):

${leadMessages}

CRITICAL: Use the MOST RECENT time/date if customer mentions multiple.

RULES:
1. If customer says "10 AM" then "Actually 2 PM", use "2 PM"
2. If "Instead of Monday, Thursday works", use "Thursday"
3. Date must be specific: "Monday", "tomorrow", "November 15" (NOT "this week")
4. Time must be specific: "2 PM", "14:00" (NOT "afternoon")
5. Address needs street + city: "123 Main St, Vancouver" (NOT just "Vancouver")

EXAMPLES:
✅ [1] "10 AM works" → time: "10 AM"
✅ [2] "Actually, 2 PM better" → time: "2 PM" (use latest!)
✅ [1] "Thursday" → date: "Thursday", time: null
❌ [1] "I'm available" → date: null, time: null (too vague)

Respond with JSON:
{
  "wantsToBook": true/false,
  "date": "Thursday" or null,
  "time": "2 PM" or null,
  "location": "123 Main St, Vancouver" or null,
  "confidence": 0.85
}`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.1,
      system:
        "Extract booking details. ALWAYS use most recent time if customer changes their mind. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response");
    }

    const result = parseClaudeJSON(content.text);

    console.log("📅 Booking result:", {
      wantsToBook: result.wantsToBook,
      date: result.date,
      time: result.time,
      confidence: result.confidence,
    });

    return {
      wantsToBook: result.wantsToBook || false,
      isConfirmed: !!(result.date && result.time),
      confidence: result.confidence || 0,
      proposedDateTime: {
        date: result.date,
        time: result.time,
        isFlexible: false,
      },
      location: result.location,
      meetingType: "site-visit",
      reasoning: "Extracted by Claude",
    };
  } catch (error) {
    console.error("Booking detection error:", error);
    return {
      wantsToBook: false,
      isConfirmed: false,
      confidence: 0,
      reasoning: "Error analyzing intent",
    };
  }
}

// ============================================
// 📊 LEAD QUALIFICATION
// ============================================

export async function qualifyLead(
  leadData: any,
  conversationHistory: any[]
): Promise<LeadQualificationResult> {
  try {
    // ✅ Check if non-construction
    const latestMessage = conversationHistory[conversationHistory.length - 1];

    if (latestMessage?.sender === "lead") {
      const intentCheck = await classifyIntent(
        latestMessage.content,
        conversationHistory,
        { name: "Construction Company" }
      );

      if (!intentCheck.isRelevant && intentCheck.confidence > 0.7) {
        console.log("❌ Non-construction inquiry");
        return {
          score: 0.05,
          intent: intentCheck.intent,
          urgency: "none",
          budget: "unqualified",
          timeline: "none",
          needsHumanAttention: false,
          reasoning: `Non-construction: ${intentCheck.reasoning}`,
          nextAction: "mark_as_not_a_lead",
        };
      }
    }

    // ✅ Build conversation text
    const conversationText = conversationHistory
      .map((m) => `${m.sender === "lead" ? "Customer" : "Agent"}: ${m.content}`)
      .join("\n");

    // ✅ Get timeline for context
    const timeline = getTimeline(conversationHistory);

    let timelineContext = "";
    if (timeline.type !== "unknown") {
      timelineContext = `\n\n⏰ TIMELINE: Customer said "${timeline.text}"`;

      switch (timeline.type) {
        case "immediate":
          timelineContext += " → URGENT (add +0.15 to score)";
          break;
        case "soon":
          timelineContext += " → SOON (add +0.05 to score)";
          break;
        case "months":
          timelineContext += " → MID-TERM (no change)";
          break;
        case "long-term":
          timelineContext += " → LONG-TERM (subtract -0.15 from score)";
          break;
        case "flexible":
          timelineContext += " → NO RUSH (subtract -0.10 from score)";
          break;
      }
    }

    const prompt = `Qualify this construction lead (score 0.0 to 1.0):

LEAD: ${leadData.firstName} ${leadData.lastName}
COMPANY: ${leadData.company}
EMAIL: ${leadData.email}
PHONE: ${leadData.phone}

CONVERSATION:
${conversationText}
${timelineContext}

SCORING:
🔥 HOT (0.8-1.0): Budget mentioned (ANY amount) + THREE of:
  - TRUE urgency ("ASAP", "urgent", "today", "tomorrow", "this week" for START date)
  - Decision maker ("I'm owner", "CEO", "I decide")
  - Meeting confirmed (specific date/time agreed)
  - Competitive ("comparing contractors", "getting 3 quotes")
  - Detailed scope (specific measurements, timeline, requirements)

🟡 WARM (0.5-0.79): Budget mentioned OR (project details + timeline)

❄️ COLD (0.0-0.49): Just browsing, no budget, vague inquiry

CRITICAL SCORING RULES:
1. "In a month" = WARM (0.55-0.65), NOT HOT
2. "Next month" = WARM (0.60-0.70), NOT HOT
3. "Not available this week" = Scheduling constraint, NOT urgency signal
4. NO budget mentioned = MAX 0.70 score
5. Only score >= 0.80 if MULTIPLE hot signals present

TIMELINE ADJUSTMENTS:
- "ASAP"/"urgent"/"today"/"tomorrow" → +0.15
- "This week"/"next week" (for START) → +0.10
- "Next month"/"in a month" → +0.05
- "Few months" → no change
- "Next year" → -0.15

EXAMPLES:
"Full kitchen reno, starting in a month, not available this week"
→ Base: 0.55 (project type + timeline), +0.05 (soon) = 0.60 WARM ✅

"$50k budget, start ASAP, I'm the owner"
→ Base: 0.65, +0.15 (ASAP) = 0.80 HOT ✅

"Kitchen reno, no budget mentioned, start next month"
→ Base: 0.50, +0.05 (soon) = 0.55 WARM ✅ (no budget = cap at 0.70)

Respond with JSON:
{
  "score": 0.60,
  "intent": "moderate",
  "urgency": "moderate",
  "budget": "unknown",
  "timeline": "soon",
  "needsHumanAttention": false,
  "reasoning": "Full renovation planned, timeline is next month (warm signal). No budget discussed, not available for immediate meeting.",
  "nextAction": "Follow up next week to discuss budget and schedule site visit"
}`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0.4,
      system:
        "You're a lead qualification expert. Score accurately. needsHumanAttention=true only if score >= 0.7. Valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response");
    }

    const result = parseClaudeJSON(content.text);

    // ✅ Apply timeline adjustment
    let finalScore = result.score || 0.5;

    if (timeline.type === "immediate") {
      finalScore = Math.min(0.95, finalScore + 0.15);
    } else if (timeline.type === "soon") {
      finalScore = Math.min(0.95, finalScore + 0.05);
    } else if (timeline.type === "long-term") {
      finalScore = Math.max(0.05, finalScore - 0.15);
    } else if (timeline.type === "flexible") {
      finalScore = Math.max(0.05, finalScore - 0.1);
    }

    console.log(
      `📊 Qualification: ${result.score.toFixed(2)} → ${finalScore.toFixed(
        2
      )} (timeline: ${timeline.type})`
    );

    return {
      score: finalScore,
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: finalScore >= 0.85,
      reasoning: result.reasoning || "Lead qualified",
      nextAction: result.nextAction || "continue conversation",
    };
  } catch (error) {
    console.error("Lead qualification error:", error);
    throw new Error(
      "Failed to qualify lead: " +
        (error instanceof Error ? error.message : "Unknown")
    );
  }
}

// ============================================
// 💬 RESPONSE GENERATION
// ============================================

export async function generateAIResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any,
  hasPendingBooking?: boolean,
  daySuggestions?: string
): Promise<string> {
  const lastLeadMessage =
    conversationHistory.filter((m) => m.sender === "lead").slice(-1)[0]
      ?.content || "";

  // ✅ Check if it's a question
  const isQuestion =
    /\?$|^(do you|can you|what|how|when|where|are you|does it|will you)/i.test(
      lastLeadMessage.trim()
    );

  console.log("💬 Generating response:", { isQuestion, hasPendingBooking });

  // ✅ Route to appropriate handler
  if (isQuestion && !hasPendingBooking) {
    return await generateQuestionResponse(lastLeadMessage, clientData);
  }

  if (hasPendingBooking) {
    return "Great! Our team will send you the meeting details shortly. Is there anything else you'd like to discuss about your project?";
  }

  return await generateNormalResponse(
    conversationHistory,
    leadData,
    clientData,
    daySuggestions
  );
}

// ✅ Answer direct questions
async function generateQuestionResponse(
  question: string,
  clientData: any
): Promise<string> {
  const prompt = `You're a construction project manager for ${
    clientData?.name || "a construction company"
  }.

Customer asked: "${question}"

YOUR JOB: Answer in 1-2 sentences, then ask ONE follow-up.

EXAMPLES:
Q: "Do you handle permits?"
A: "Yes, we handle all permits and approvals. What type of project are you planning?"

Q: "How long does it take?"
A: "Typically 6-12 weeks depending on scope. What's the size of your project?"

Q: "What's included?"
A: "We provide materials, labor, permits, and project management. What's your budget range?"

Answer naturally:`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 120,
      temperature: 0.7,
      system:
        "Construction expert. ANSWER the question first (YES/NO or direct answer), THEN ask one follow-up. Never deflect.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return "Yes, we can help with that. What details would you like to know about your project?";
    }

    const answer = content.text.trim();

    // ✅ Verify not a deflection
    if (
      /tell me more|could you share|i'd love to learn/i.test(
        answer.toLowerCase()
      )
    ) {
      console.warn("⚠️ Deflection detected, using fallback");
      return "Yes, we handle that. What specific details would you like to know?";
    }

    return answer;
  } catch (error) {
    console.error("Question response error:", error);
    return "Yes, we can help with that. Could you share more about your project?";
  }
}

// ✅ Normal conversation flow
async function generateNormalResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any,
  daySuggestions?: string
): Promise<string> {
  const recentHistory = conversationHistory.slice(-10);
  const conversationText = recentHistory
    .map((m) => `${m.sender === "lead" ? "Customer" : "You"}: ${m.content}`)
    .join("\n");

  const lastMessage = conversationHistory[conversationHistory.length - 1];

  // ✅ Get timeline context
  const timeline = getTimeline(conversationHistory);
  let timelineGuidance = "";

  if (timeline.type !== "unknown") {
    switch (timeline.type) {
      case "immediate":
        timelineGuidance = `\n\n⏰ URGENT: Customer said "${timeline.text}". Suggest meeting TODAY or TOMORROW.`;
        break;
      case "soon":
        timelineGuidance = `\n\n⏰ Customer said "${timeline.text}". Suggest THIS WEEK or NEXT WEEK.`;
        break;
      case "months":
        timelineGuidance = `\n\n⏰ Customer said "${timeline.text}". DON'T push immediate meeting. Discuss plans, meet closer to start.`;
        break;
      case "long-term":
        timelineGuidance = `\n\n⏰ Customer said "${timeline.text}". DON'T suggest "today/tomorrow". Keep light, offer to connect later.`;
        break;
      case "flexible":
        timelineGuidance = `\n\n⏰ Customer said "${timeline.text}". No pressure. Provide value, offer meeting when ready.`;
        break;
    }
  }

  // ✅ NEW: Check what customer explicitly ruled out
  const lastFewMessages = conversationHistory
    .filter((m) => m.sender === "lead")
    .slice(-3)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  let avoidanceNote = "";

  if (
    /not available this week|can't this week|busy this week/i.test(
      lastFewMessages
    )
  ) {
    avoidanceNote = `\n\n🚫 CRITICAL: Customer said they're NOT available THIS WEEK. DO NOT suggest today/tomorrow/this week. Suggest NEXT WEEK or later.`;
  }

  if (
    /not available next week|can't next week|busy next week/i.test(
      lastFewMessages
    )
  ) {
    avoidanceNote = `\n\n🚫 CRITICAL: Customer said they're NOT available NEXT WEEK. DO NOT suggest next week. Ask when they ARE available.`;
  }

  if (/not available today|can't today|busy today/i.test(lastFewMessages)) {
    avoidanceNote = `\n\n🚫 CRITICAL: Customer said they're NOT available TODAY. Suggest tomorrow or later.`;
  }

  // ✅ Check for time change
  const timeChange = detectTimeChange(conversationHistory);
  let timeChangeNote = "";

  if (timeChange.changed && timeChange.newTime) {
    timeChangeNote = `\n\n🔄 TIME CHANGE: Customer changed time to "${timeChange.newTime}". ACKNOWLEDGE: "I've updated it to ${timeChange.newTime}."`;
  }

  // ✅ NEW: Check if we already asked about availability
  const aiMessages = conversationHistory
    .filter((m) => m.sender === "ai")
    .slice(-3)
    .map((m) => m.content.toLowerCase());

  const alreadyAskedAvailability = aiMessages.some((msg) =>
    /when (are you|works)|what (time|day)|available/i.test(msg)
  );

  let repetitionWarning = "";
  if (alreadyAskedAvailability) {
    repetitionWarning = `\n\n⚠️ WARNING: You ALREADY asked about availability. Customer just answered. ACKNOWLEDGE their answer and move to next step (ask for specific day/time, or get address).`;
  }

  // ✅ NEW: Check conversation stage
  const leadMessageCount = conversationHistory.filter(
    (m) => m.sender === "lead"
  ).length;
  const hasProjectType =
    /kitchen|bathroom|deck|garage|addition|renovation|remodel|construction/i.test(
      conversationHistory
        .filter((m) => m.sender === "lead")
        .map((m) => m.content)
        .join(" ")
    );

  let meetingPushGuidance = "";

  if (leadMessageCount <= 2 && hasProjectType) {
    // First 2 messages: DON'T push for meeting yet
    meetingPushGuidance = `\n\n🚫 EARLY STAGE: Customer just mentioned project type. DON'T ask about meeting yet. First gather: budget, timeline, project scope. Only suggest meeting after you know these 3 things.`;
  } else if (leadMessageCount <= 4) {
    // Messages 3-4: Gather details before suggesting meeting
    meetingPushGuidance = `\n\n⚠️ MID STAGE: Gather budget, timeline, scope FIRST. Only suggest meeting if you have at least 2 of these 3 details.`;
  } else {
    // After 5+ messages: OK to suggest meeting
    meetingPushGuidance = `\n\n✅ READY: You have enough context. Can suggest meeting if appropriate.`;
  }

  const prompt = `You're a construction project manager on WhatsApp for ${
    clientData?.name || "a construction company"
  }.

CONVERSATION:
${conversationText}

CUSTOMER JUST SAID: "${lastMessage.content}"
${timelineGuidance}
${avoidanceNote}
${timeChangeNote}
${repetitionWarning}
${meetingPushGuidance}

YOUR JOB:
1. LISTEN to what customer said (especially their constraints)
2. Respond naturally to their ACTUAL answer
3. Move forward appropriately
4. Brief (2-3 sentences, under 50 words)
5. Say "meeting" or "site visit" (NEVER "call")

CRITICAL RULES:
- If customer said "not this week", DON'T suggest this week
- If customer said "next week works", ask WHAT DAY next week
- If customer gave a constraint, RESPECT IT
- NEVER contradict what customer just said
- DON'T repeat questions you just asked

ANTI-REPETITION:
- NEVER use same opening as last message
- VARY language: "Great!", "Perfect!", "Sounds good!", "No problem!"
- DON'T ask same question twice

EXAMPLES:
Customer: "I'm not available this week"
✅ CORRECT: "No problem! How about next week? What day works best?"
❌ WRONG: "How about today or tomorrow?" (those ARE this week!)

Customer: "Next week works"
✅ CORRECT: "Perfect! What day next week is best for you?"
❌ WRONG: "When are you available?" (they just told you!)

Customer: "Can we meet next Tuesday?"
✅ CORRECT: "Great! Next Tuesday works. What time?"
❌ WRONG: "Are you available this week?" (they just proposed a time!)

Respond (2-3 sentences):`;

  // ✅ RETRY LOOP (max 3 attempts)
  let attempts = 0;
  const maxAttempts = 3;
  let aiResponse = "";

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 150,
        temperature: 0.7 + attempts * 0.1, // Increase temp on retries
        system: `Construction project manager. Brief responses (under 50 words). Move toward site visit. NEVER repeat yourself. Remember what you've asked.`,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        aiResponse = "Thank you! A team member will respond shortly.";
        break;
      }

      aiResponse = content.text.trim();

      // ✅ Check repetition
      if (!isRepetitive(aiResponse, conversationHistory)) {
        console.log(`✅ Good response (attempt ${attempts})`);
        break;
      }

      console.warn(`⚠️ Attempt ${attempts}: Repetitive, retrying...`);

      // ✅ Fallback on last attempt
      if (attempts === maxAttempts) {
        console.error("❌ Max attempts, using fallback");

        const hasDetails = conversationHistory.some(
          (m) =>
            m.sender === "lead" &&
            /budget|location|timeline|\$\d+/i.test(m.content)
        );

        aiResponse = hasDetails
          ? "Thanks for those details. When are you hoping to start this project?"
          : "To help you better, could you share the location and budget you have in mind?";
      }
    } catch (error) {
      console.error(`Error on attempt ${attempts}:`, error);
      if (attempts === maxAttempts) {
        aiResponse =
          "Thank you for your message. A team member will respond shortly.";
      }
    }
  }

  return aiResponse;
}

// ============================================
// 🔍 EXTRACT LEAD DETAILS
// ============================================

export async function extractLeadDetails(
  conversationHistory: any[]
): Promise<ExtractedLeadDetails> {
  try {
    const conversationText = conversationHistory
      .filter((msg) => msg.sender === "lead")
      .map((msg) => msg.content)
      .join("\n");

    const prompt = `Extract lead info from these messages:

${conversationText}

EXTRACT:
- Full name (first and last if mentioned)
- Email (valid format with @ and .)
- Address (street number + street name + city)

ADDRESS RULES:
- Needs street number AND name: "123 Main St"
- Needs city: "Vancouver"
- "123 Main St, Vancouver" ✅
- "British Columbia" alone ❌

RULES:
- Only extract EXPLICITLY stated info
- Name must be real (not phone numbers)
- Email must be valid (not temp/whatsapp)

Respond with JSON:
{
  "name": "John Smith" or null,
  "email": "john@email.com" or null,
  "address": "123 Main St, Vancouver" or null,
  "confidence": 0.85
}`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      temperature: 0.2,
      system:
        "Extract info from messages. Only explicit info. Valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

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
    console.error("Extract details error:", error);
    return { confidence: 0 };
  }
}

// ============================================
// 📋 AUDIT GENERATION
// ============================================

export async function generateAudit(
  auditType: string,
  inputs: any
): Promise<AuditResult> {
  let prompt = "";

  switch (auditType) {
    case "seo":
      prompt = `Quick SEO audit for: ${inputs.website}
Industry: ${inputs.industry}
Provide 3 wins, 1 risk, timeline, ROI estimate.`;
      break;

    case "construction":
      prompt = `Construction project audit:
Type: ${inputs.projectType}
Location: ${inputs.location}
Timeline: ${inputs.timeline}
Provide opportunities, risks, timeline, ROI.`;
      break;

    default:
      prompt = `Business audit for ${inputs.industry}.
Provide improvements, risks, timeline, ROI.`;
  }

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: 0.5,
      system: "Business audit expert. Respond with valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response");
    }

    const result = parseClaudeJSON(content.text);

    return {
      wins: result.wins || ["Improvement opportunity identified"],
      risks: result.risks || ["No major risks"],
      timeline: result.timeline || "90 days",
      estimatedROI: result.estimatedROI || "10-20% improvement",
      score: result.score || 75,
    };
  } catch (error) {
    console.error("Audit generation error:", error);
    throw new Error("Failed to generate audit");
  }
}

// ============================================
// 📺 VSL SCRIPT GENERATION
// ============================================

export async function generateVSLScript(
  niche: string,
  data: {
    targetAudience: string;
    painPoints: string;
    solution: string;
    proofElements: string;
  }
): Promise<string> {
  const prompt = `Create a Video Sales Letter script for ${niche}:

TARGET: ${data.targetAudience}
PAIN POINTS: ${data.painPoints}
SOLUTION: ${data.solution}
PROOF: ${data.proofElements}

STRUCTURE (2-3 minutes):
1. HOOK (15s): Powerful question/statement
2. PROBLEM (30s): Amplify pain points
3. SOLUTION (45s): Present benefits
4. PROOF (30s): Results/testimonials
5. CTA (20s): Clear next step with urgency

REQUIREMENTS:
- Conversational, engaging
- Use "you" and "your"
- Include specific numbers/results
- Create urgency naturally
- Clear call to action

Write the complete script:`;

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      temperature: 0.8,
      system: "Expert copywriter. Persuasive, benefit-driven VSL scripts.",
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    return content.type === "text" ? content.text : "";
  } catch (error) {
    console.error("VSL generation error:", error);
    throw new Error("Failed to generate VSL script");
  }
}
