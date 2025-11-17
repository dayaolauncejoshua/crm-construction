// server/services/claude.ts
// ✅ PRODUCTION-READY: Anthropic Claude Sonnet 4 with ALL QA FIXES INTEGRATED
// Fixed Issues: AI Repetition, Question Answering, Meeting Timing, Anti-Repetition

import Anthropic from "@anthropic-ai/sdk";




const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ✅ Use Claude Sonnet 4 (correct model name)
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// ============================================
// ✅ HELPER FUNCTIONS
// ============================================

// ============================================
// ✅ RETRY LOGIC FOR ANTHROPIC API OVERLOAD
// ============================================
async function callClaudeWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error (529 overloaded or 529 rate limit)
      const isRetryable = 
        error.status === 529 || 
        error.status === 429 ||
        (error.error?.type === "overloaded_error") ||
        (error.error?.type === "rate_limit_error");
      
      if (!isRetryable || attempt === maxRetries) {
        // Not retryable or max retries reached
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
      const totalDelay = delay + jitter;
      
      console.warn(
        `⚠️ Claude API ${error.status} error (attempt ${attempt}/${maxRetries}). ` +
        `Retrying in ${(totalDelay / 1000).toFixed(1)}s...`
      );
      
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Strip markdown code blocks from Claude JSON responses
 */
function parseClaudeJSON(text: string): any {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Calculate text similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
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

// ============================================
// ✅ SPAM DETECTION SYSTEM
// ============================================

/**
 * Check if message contains obvious construction context
 */
function hasConstructionContext(message: string): boolean {
  const lowerMessage = message.toLowerCase();

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
    "home addition",
    "addition",

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
    "permits",
    "permit",
    "basement finishing",
    "bathroom reno",
  ];

  return constructionIndicators.some((indicator) =>
    lowerMessage.includes(indicator)
  );
}

/**
 * Check for non-construction keywords (retail, food, etc.)
 */
function hasNonConstructionKeywords(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // ✅ CRITICAL: Check for CONSTRUCTION CONTEXT first
  if (hasConstructionContext(message)) {
    console.log("✅ Construction context detected, not spam");
    return false;
  }

  const nonConstructionKeywords = [
    // Food & Beverages (SPECIFIC items only)
    "burger",
    "pizza",
    "fries",
    "food delivery",
    "menu",
    "order food",
    "meal delivery",
    "catering",
    "coffee shop order",

    // Retail Products
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

/**
 * Check if message is a greeting
 */
function isGreeting(message: string): boolean {
  const trimmed = message.trim().toLowerCase();

  const greetingPatterns = [
    /^(hi|hello|hey|yo|sup|howdy)[\s!?.]*$/i,
    /^(hi|hello|hey)\s+(there|everyone|guys|team)[\s!?.]*$/i,
    /^good\s+(morning|afternoon|evening|day)[\s!?.]*$/i,
    /^greetings[\s!?.]*$/i,
    /^what'?s\s+up[\s!?.]*$/i,
    /^how\s+(are\s+you|r\s+u|are\s+ya|ya\s+doing)[\s!?.]*$/i,
    /^(hi|hello|hey)\s+(how\s+are\s+you|how'?s\s+it\s+going)[\s!?.]*$/i,
  ];

  return greetingPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Check if message is likely innocent (first message)
 */
function isLikelyInnocentMessage(
  message: string,
  messageCount: number
): boolean {
  const trimmed = message.trim().toLowerCase();

  if (messageCount <= 2) {
    const innocentPatterns = [
      /^(hi|hello|hey)/i,
      /^(yes|yeah|yep|yup|ok|okay)$/i,
      /^(thanks|thank you|ty)$/i,
      /^(i need|i want|we need|we want)$/i,
      /^(can you|do you|are you)$/i,
    ];

    if (trimmed.length < 20) {
      return true;
    }

    if (innocentPatterns.some((pattern) => pattern.test(trimmed))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if message needs more context before classifying as spam
 */
function needsMoreContext(
  message: string,
  conversationHistory: any[]
): boolean {
  const lowerMessage = message.toLowerCase().trim();

  const vaguePatterns = [
    /^(hi|hello|hey)$/i,
    /^(yeah|yes|yep|ok|okay)$/i,
    /^(maybe|perhaps)$/i,
    /^construction$/i,
    /^(i want to meet|can we meet|let's meet|i want to book)$/i,
  ];

  const leadMessages = conversationHistory.filter((m) => m.sender === "lead");

  if (
    leadMessages.length < 3 &&
    vaguePatterns.some((pattern) => pattern.test(lowerMessage))
  ) {
    console.log("⏸️ Vague message detected, waiting for more context");
    return true;
  }

  return false;
}

/**
 * Check for obvious spam patterns (first message only)
 */
function isObviousSpam(message: string, isFirstMessage: boolean): boolean {
  if (!isFirstMessage) return false;

  const spamPatterns = [
    /^test\s*test$/i,
    /^hello\s*hello$/i,
    /^hi\s*hi\s*hi$/i,
    /^(ok|okay|k)$/i,
    /^[0-9]+$/,
    /^(yes|no|yeah|nope)$/i,
  ];

  return spamPatterns.some((pattern) => pattern.test(message.trim()));
}

// ============================================
// ✅ CONVERSATION ANALYSIS (For Anti-Repetition)
// ============================================

interface ConversationContext {
  lastAIQuestions: string[];
  lastLeadAnswers: string[];
  askedTopics: Set<string>;
  lastAIMessage?: string;
  questionsAsked: Map<string, number>; // Track which questions were asked
}

/**
 * Extract conversation context to prevent repetition
 */
function extractConversationContext(messages: any[]): ConversationContext {
  const aiMessages = messages.filter((m) => m.sender === "ai").slice(-5);
  const leadMessages = messages.filter((m) => m.sender === "lead").slice(-5);

  const lastAIQuestions = aiMessages
    .filter((m) => m.content.includes("?"))
    .map((m) => m.content.substring(0, 80));

  const askedTopics = new Set<string>();
  const questionsAsked = new Map<string, number>();

  const topicPatterns: Record<string, RegExp> = {
    budget: /budget|cost|price|how much/i,
    timeline: /timeline|when|start date|how soon|available/i,
    location: /location|address|where|site/i,
    name: /name|what.*call you/i,
    email: /email/i,
    phone: /phone|number|contact/i,
    project: /project|what.*building|what.*constructing|type of/i,
    scope: /scope|size|square feet|sq ft|how big/i,
  };

  for (const msg of aiMessages) {
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(msg.content)) {
        askedTopics.add(topic);
        questionsAsked.set(topic, (questionsAsked.get(topic) || 0) + 1);
      }
    }
  }

  return {
    lastAIQuestions,
    lastLeadAnswers: leadMessages.map((m) => m.content.substring(0, 80)),
    askedTopics,
    lastAIMessage:
      aiMessages.length > 0
        ? aiMessages[aiMessages.length - 1].content
        : undefined,
    questionsAsked,
  };
}

/**
 * Check if AI is about to repeat itself
 */
function isRepetitiveResponse(
  proposedResponse: string,
  conversationHistory: any[]
): {
  isRepetitive: boolean;
  lastAIMessage?: string;
} {
  const recentAIMessages = conversationHistory
    .filter((msg) => msg.sender === "ai")
    .slice(-5)
    .map((msg) => msg.content.toLowerCase().trim());

  if (recentAIMessages.length === 0) {
    return { isRepetitive: false };
  }

  const proposedLower = proposedResponse.toLowerCase().trim();

  // Remove emojis for comparison
  const cleanProposed = proposedLower
    .replace(
      /[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  // Check for EXACT or NEAR-EXACT repetition (>90% match)
  for (const prevMessage of recentAIMessages) {
    const cleanPrev = prevMessage
      .replace(
        /[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();

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
      console.warn(
        `🚫 NEAR-EXACT REPETITION! (${(similarity * 100).toFixed(0)}% match)`
      );
      console.warn(`   Previous: "${prevMessage.substring(0, 80)}..."`);
      console.warn(`   Proposed: "${proposedResponse.substring(0, 80)}..."`);
      return { isRepetitive: true, lastAIMessage: prevMessage };
    }
  }

  // Check if core message is repeated (first 40 chars)
  const proposedCore = cleanProposed.substring(0, 40);
  const recentCores = recentAIMessages.map((msg) =>
    msg
      .replace(
        /[\u2600-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 40)
  );

  const coreRepeatCount = recentCores.filter(
    (core) => core === proposedCore && core.length > 15
  ).length;

  if (coreRepeatCount >= 2) {
    console.warn(`🚫 CORE MESSAGE REPEATED ${coreRepeatCount} times!`);
    console.warn(`   Core: "${proposedCore}"`);
    return {
      isRepetitive: true,
      lastAIMessage: recentAIMessages[recentAIMessages.length - 1],
    };
  }

  return { isRepetitive: false };
}

// ============================================
// ✅ TIMELINE ANALYSIS (For Lead Scoring)
// ============================================

interface TimelineAnalysis {
  type: "immediate" | "soon" | "moderate" | "long-term" | "unknown";
  rawText: string;
  scoreModifier: number;
  reasoning: string;
}

/**
 * Analyze timeline from conversation and calculate score modifier
 */
function analyzeTimeline(messages: any[]): TimelineAnalysis {
  const leadText = messages
    .filter((m) => m.sender === "lead")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  // Immediate (1-4 weeks) → +0.10 to +0.20
  if (
    /asap|urgent|immediately|right away|as soon as possible/i.test(leadText)
  ) {
    return {
      type: "immediate",
      rawText: "ASAP/urgent",
      scoreModifier: 0.15,
      reasoning: "Urgent timeline detected",
    };
  }

  if (/this week|next week/i.test(leadText)) {
    return {
      type: "immediate",
      rawText: "this/next week",
      scoreModifier: 0.15,
      reasoning: "Very short timeline (1-2 weeks)",
    };
  }

  const weekMatch = leadText.match(/in (\d+) weeks?/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1]);
    if (weeks <= 2) {
      return {
        type: "immediate",
        rawText: `${weeks} weeks`,
        scoreModifier: 0.15,
        reasoning: `Starting in ${weeks} weeks`,
      };
    } else if (weeks <= 4) {
      return {
        type: "immediate",
        rawText: `${weeks} weeks`,
        scoreModifier: 0.1,
        reasoning: `Starting in ${weeks} weeks`,
      };
    }
  }

  // Soon (1-3 months) → +0.05
  if (/next month|in a month/i.test(leadText)) {
    return {
      type: "soon",
      rawText: "next month",
      scoreModifier: 0.05,
      reasoning: "Starting in 1 month",
    };
  }

  const monthMatch = leadText.match(/in (\d+) months?/i);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    if (months <= 3) {
      return {
        type: "soon",
        rawText: `${months} month${months > 1 ? "s" : ""}`,
        scoreModifier: 0.05,
        reasoning: `Starting in ${months} month(s)`,
      };
    } else if (months <= 6) {
      return {
        type: "moderate",
        rawText: `${months} months`,
        scoreModifier: 0,
        reasoning: `Mid-term timeline (${months} months)`,
      };
    } else {
      return {
        type: "long-term",
        rawText: `${months} months`,
        scoreModifier: -0.15,
        reasoning: `Long planning phase (${months} months)`,
      };
    }
  }

  // Long-term (next year, planning stage) → -0.10 to -0.15
  if (
    /next year|2026|in a year|12 months|planning stage|just exploring|just looking|no rush|flexible/i.test(
      leadText
    )
  ) {
    return {
      type: "long-term",
      rawText: "next year/planning stage",
      scoreModifier: -0.15,
      reasoning: "Long-term planning or exploratory phase",
    };
  }

  return {
    type: "unknown",
    rawText: "",
    scoreModifier: 0,
    reasoning: "No timeline mentioned",
  };
}

// ============================================
// ✅ BOOKING TIME HANDLING (With Validation)
// ============================================

/**
 * Normalize time string to standard format (e.g., "2 PM", "10:30 AM")
 */
function normalizeTimeString(timeStr: string | undefined): string {
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

/**
 * Verify that AI extracted the most recent time mentioned by lead
 */
function verifyTimeExtraction(
  extractedTime: string | undefined,
  leadMessages: any[]
): { isCorrect: boolean; expectedTime?: string } {
  // Find most recent time mention in lead messages
  const timePattern = /\b(\d{1,2})\s*([AP]M|a\.m\.|p\.m\.)\b/gi;

  let lastTimeMention: string | undefined;
  for (let i = leadMessages.length - 1; i >= 0; i--) {
    const matches = leadMessages[i].content.match(timePattern);
    if (matches && matches.length > 0) {
      lastTimeMention = matches[matches.length - 1]; // Get last match in message
      break;
    }
  }

  if (!lastTimeMention) {
    return { isCorrect: true }; // No time mentioned, can't verify
  }

  const normalizedExtracted = normalizeTimeString(extractedTime)
    .toUpperCase()
    .replace(/\s/g, "");
  const normalizedExpected = normalizeTimeString(lastTimeMention)
    .toUpperCase()
    .replace(/\s/g, "");

  const isCorrect = normalizedExtracted === normalizedExpected;

  if (!isCorrect) {
    console.error("❌ TIME EXTRACTION MISMATCH!");
    console.error(`   Lead said: "${lastTimeMention}"`);
    console.error(`   AI extracted: "${extractedTime}"`);
    console.error(
      `   Expected (normalized): "${normalizeTimeString(lastTimeMention)}"`
    );
  } else {
    console.log("✅ Time extraction verified - matches last message");
  }

  return {
    isCorrect,
    expectedTime: lastTimeMention,
  };
}

/**
 * Detect if lead changed their preferred time
 */
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
// ✅ TYPES (UNCHANGED)
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
// ✅ INTENT CLASSIFICATION (With Full Spam Detection)
// ============================================

export async function classifyIntent(
  message: string,
  conversationHistory: any[],
  clientData: any
): Promise<IntentClassification> {
  // ✅ STEP 1: Quick spam check for FIRST message only
  if (conversationHistory.length <= 1) {
    if (isObviousSpam(message, true)) {
      console.log("🚫 Obvious spam detected (first message)");
      return {
        isRelevant: false,
        intent: "test",
        confidence: 0.95,
        reasoning: "First message is obvious spam/test",
      };
    }
  }

  // ✅ STEP 2: IMMEDIATE CONSTRUCTION OVERRIDE
  if (hasConstructionContext(message)) {
    console.log("✅ Immediate construction match");
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.95,
      reasoning: "Contains explicit construction terminology",
    };
  }

  // ✅ STEP 3: Check non-construction keywords (after construction check)
  if (hasNonConstructionKeywords(message)) {
    console.log("🚫 Non-construction keywords detected:", message);
    return {
      isRelevant: false,
      intent: "unrelated",
      confidence: 0.95,
      reasoning:
        "Message contains non-construction keywords (retail, food, etc.)",
    };
  }

  // ✅ STEP 4: Handle greetings intelligently
  if (isGreeting(message)) {
    console.log("👋 Greeting detected, welcoming lead");
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.5,
      reasoning: "Greeting - waiting for project details",
    };
  }

  // ✅ STEP 5: Give benefit of doubt for early messages
  const leadMessageCount = conversationHistory.filter(
    (m) => m.sender === "lead"
  ).length;
  if (isLikelyInnocentMessage(message, leadMessageCount)) {
    console.log("✅ Early message - giving benefit of doubt");
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.4,
      reasoning: "Early conversation - waiting for context",
    };
  }

  // ✅ STEP 6: Check if we need more context
  if (needsMoreContext(message, conversationHistory)) {
    console.log("⏸️ Waiting for more context before classification");
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.5,
      reasoning: "Waiting for more context - giving lead benefit of doubt",
    };
  }

  // ✅ STEP 7: Let Claude 4 handle classification
  const prompt = `Classify this inquiry for ${
    clientData?.name || "a construction company"
  }:

MESSAGE: "${message}"

CONTEXT: This is message #${conversationHistory.length} in the conversation.

Is this about CONSTRUCTION/BUILDING services?

✅ RELEVANT (construction-related ONLY):
- Building, construction, renovation, remodeling
- Permits, licensing, approvals
- Commercial/residential construction
- Deck, garage, warehouse, kitchen projects
- MEP (mechanical, electrical, plumbing)
- Site visits, consultations
- "I want to build a house" ✅
- "Need deck construction" ✅
- "MEP work for bakery" ✅ (construction service)

❌ NOT RELEVANT:
- Food/beverage orders (pizza, burger, fries)
- Retail products (shoes, clothing, watches)
- Personal services (salon, spa, massage)
- Tech repairs (phone, laptop)
- Transportation (taxi, delivery)

IMPORTANT: When in doubt, mark as RELEVANT (construction companies get varied inquiries).

Respond with JSON only:
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
    max_tokens: 300,
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

    console.log("🎯 Intent Classification:", {
      message: message.substring(0, 50),
      isRelevant: result.isRelevant,
      confidence: result.confidence,
    });

    return {
      isRelevant: result.isRelevant ?? true, // Default to relevant
      intent: result.intent || "construction",
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || "",
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    // ✅ Fail safe: assume relevant for construction companies
    return {
      isRelevant: true,
      intent: "construction",
      confidence: 0.5,
      reasoning: "Classification failed, defaulting to relevant for safety",
    };
  }
}

// ============================================
// ✅ BOOKING INTENT DETECTION (With Time Validation)
// ============================================

export async function detectBookingIntent(
  conversationHistory: any[],
  leadData: any
): Promise<BookingIntent> {
  console.log("🔍 ========== DETECT BOOKING INTENT ==========");

  // ✅ Sort chronologically (oldest to newest)
  const sortedMessages = [...conversationHistory].sort((a, b) => {
    const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return timeA - timeB;
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

  // ✅ Get only lead messages for logging
  const leadMessages = sortedMessages.filter((m) => m.sender === "lead");
  console.log(`📨 Analyzing ${leadMessages.length} lead messages`);

  // ✅ Extract all times mentioned for debugging
  const customerTimeMentions = leadMessages
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

  console.log(`⏰ Customer mentioned ${customerTimeMentions.length} time(s):`);
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

  // ✅ Check for time changes
  const timeChange = detectTimeChange(sortedMessages);
  if (timeChange.hasChange) {
    console.log(`   ⚠️ TIME CHANGE DETECTED!`);
    console.log(`      Original: ${timeChange.originalTime}`);
    console.log(`      Changed to: ${timeChange.newTime}`);
    console.log(
      `      Change indicators: ${timeChange.changeIndicators.join(", ")}`
    );
  }

  // ✅ Build prompt with chronological context
  const leadMessagesText = leadMessages
    .map((m, idx) => `[Message ${idx + 1}] ${m.content}`)
    .join("\n");

  const prompt = `Extract booking information from these customer messages (in chronological order):

${leadMessagesText}

CRITICAL TASK: Find the MOST RECENT time, date, and location mentioned.

RULES FOR TIME EXTRACTION:
1. If customer mentions multiple times, use the LAST one mentioned
2. "Actually 2 PM" means use "2 PM", forget any earlier times
3. "Instead of 10 AM, 3 PM works" means use "3 PM"
4. "How about 4 PM" means use "4 PM"
5. ALWAYS scan from first to last message and use the final time

RULES FOR DATE:
- Can be: "Monday", "Tuesday", "tomorrow", "next week", "November 15", "Thursday"
- Must be specific enough to schedule

RULES FOR LOCATION:
- Must include street address AND city
- "Vancouver" alone is NOT enough
- "123 Main St, Vancouver" IS enough

EXAMPLES:

Example 1 (Time Change):
[Message 1] "10 AM works"
[Message 2] "Actually, 2 PM is better"
→ Extract: time = "2 PM" (NOT 10 AM!)

Example 2 (Multiple Changes):
[Message 1] "Morning is good"
[Message 2] "2 PM actually"
[Message 3] "Wait, 4 PM is better"
→ Extract: time = "4 PM" (the LAST one)

Example 3 (Vague):
[Message 1] "I'm available Thursday"
→ Extract: date = "Thursday", time = null (no time specified)

Respond with JSON only:
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
    max_tokens: 500,
    temperature: 0.1,
    system:
      "You extract booking details from customer messages. ALWAYS use the most recent time if customer changes their mind. Respond with valid JSON only.",
    messages: [{ role: "user", content: prompt }],
  })
);

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = parseClaudeJSON(content.text);

    // ✅ VALIDATE extracted time
    const extractedTime = result.time;
    console.log(`⏰ AI EXTRACTED TIME: "${extractedTime || "NONE"}"`);

    const verification = verifyTimeExtraction(extractedTime, leadMessages);

    let finalTime = extractedTime;
    if (!verification.isCorrect && verification.expectedTime) {
      console.warn("⚠️ Using expected time instead of AI extraction");
      finalTime = verification.expectedTime;
    }

    // ✅ NORMALIZE the time
    const normalizedTime = result.time
      ? normalizeTimeString(finalTime)
      : undefined;

    console.log(`⏰ Time Validation: ${verification.isCorrect ? "✅" : "❌"}`);
    if (normalizedTime) {
      console.log(`⏰ Final Time: "${normalizedTime}"`);
    }

    console.log("📅 Booking Detection Result:", {
      wantsToBook: result.wantsToBook,
      date: result.date,
      time: normalizedTime,
      location: result.location,
      confidence: result.confidence,
    });

    console.log("🔍 ========== END BOOKING INTENT ==========\n");

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
      reasoning: verification.isCorrect
        ? "Extracted by Claude Sonnet 4"
        : `Extracted by Claude, verified against lead's last time mention`,
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
// ✅ LEAD QUALIFICATION (With Timeline Scoring)
// ============================================

export async function qualifyLead(
  leadData: any,
  conversationHistory: any[]
): Promise<LeadQualificationResult> {
  try {
    // ✅ STEP 1: Check if non-construction inquiry
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

    // ✅ STEP 2: Extract timeline BEFORE calling Claude
    const timeline = analyzeTimeline(conversationHistory);

    console.log("📅 Timeline Analysis:", {
      type: timeline.type,
      modifier: timeline.scoreModifier,
      rawText: timeline.rawText,
      reasoning: timeline.reasoning,
    });

    // ✅ STEP 3: Build conversation context
    const conversationText = conversationHistory
      .map((m) => `${m.sender === "lead" ? "Customer" : "Agent"}: ${m.content}`)
      .join("\n");

    const messageCount = conversationHistory.length;
    const customerMessageCount = conversationHistory.filter(
      (m) => m.sender === "lead"
    ).length;

    const prompt = `You are a lead qualification expert for a construction company.

Analyze this conversation and score from 0.0 to 1.0:

CONVERSATION:
${conversationText}

LEAD DATA:
- Name: ${leadData.firstName} ${leadData.lastName}
- Messages sent: ${customerMessageCount}

**SIMPLIFIED SCORING RULES:**

**0.8-1.0 (VERY HOT) - All 4 required:**
1. Budget mentioned AND >= 2M PHP
2. Timeline mentioned AND urgent (< 4 weeks)
3. Decision maker confirmed ("I'm the owner/CEO")
4. Meeting requested/confirmed

**0.6-0.79 (HOT) - Need 3 of these:**
1. Budget mentioned (any amount)
2. Timeline mentioned (any timeline)
3. Decision maker OR meeting confirmed
4. Detailed project scope shared

**0.4-0.59 (WARM) - Need 2 of these:**
1. Project type mentioned
2. Location mentioned
3. Budget OR timeline mentioned
4. Engaged conversation (detailed responses)

**0.0-0.39 (COLD):**
- Vague questions only
- Price shopping without details
- One-word responses

**CRITICAL RULES:**
1. DO NOT mark as HOT unless lead has engaged in 4+ messages
2. Keywords alone don't make a hot lead - look for BEHAVIOR
3. "ASAP" without budget/decision maker = WARM (0.50), not HOT
4. Meeting confirmed + budget + urgency = HOT (0.70-0.79)
5. If lead is clearly ready to book RIGHT NOW = VERY HOT (0.80+)

**EXAMPLES:**

Conversation 1 (2 messages):
Lead: "I need commercial building ASAP"
Lead: "5000 sq ft warehouse in Surrey"
→ Score: 0.50 (WARM - urgency + project type, but NO budget, NO decision maker, NO meeting) ✅

Conversation 2 (5 messages):
Lead: "I need warehouse ASAP"
Lead: "Surrey, 5000 sq ft"
Lead: "Budget 3M, I'm the CEO"
Lead: "Can we meet this week?"
Lead: "Thursday 2 PM works"
→ Score: 0.85 (VERY HOT - has everything + meeting confirmed) ✅

Conversation 3 (3 messages):
Lead: "I want to build a deck"
Lead: "Richmond, $25k"
Lead: "In 2 weeks"
→ Score: 0.55 (WARM - has budget + location + timeline, but NO meeting, NO decision maker) ✅

Respond with JSON only:
{
  "score": 0.55,
  "intent": "moderate",
  "urgency": "moderate",
  "budget": "qualified",
  "timeline": "2 weeks",
  "needsHumanAttention": false,
  "reasoning": "Has budget, location, and timeline. Engaged conversation. Needs meeting confirmation to become hot.",
  "nextAction": "Suggest meeting to move forward"
}`;

    const response = await callClaudeWithRetry(() =>
  anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    temperature: 0.4,
    system:
      "You are a lead qualification expert. Score construction leads accurately based on buying signals. Set needsHumanAttention=true only if score >= 0.7. Respond with valid JSON only.",
    messages: [{ role: "user", content: prompt }],
  })
);

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const result = parseClaudeJSON(content.text);

    const finalScore = result.score || 0.5;

    console.log("📊 Lead Qualification:");
    console.log(`   AI score: ${finalScore.toFixed(2)}`);
    console.log(`   Timeline type: ${timeline.type}`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Needs human attention: ${finalScore >= 0.7}`);

    return {
      score: finalScore, // ✅ Use Claude's score directly
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || timeline.type || "unknown",
      needsHumanAttention: finalScore >= 0.7,
      reasoning: result.reasoning || "Lead qualified",
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
// ✅ RESPONSE GENERATION (With Anti-Repetition & Meeting Readiness)
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
    /tell me about/i,
    /\?$/,
  ];

  const isQuestion = questionIndicators.some((pattern) =>
    pattern.test(lastLeadMessage.trim())
  );

  console.log("💬 Generating response:", {
    isQuestion,
    hasPendingBooking,
    messageLength: lastLeadMessage.length,
  });

  // ✅ Route to appropriate handler
  if (isQuestion && !hasPendingBooking) {
    return await generateQuestionResponse(
      lastLeadMessage,
      clientData,
      conversationHistory
    );
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

// ✅ Question Response Handler (FIX #1: Stop Repetition Loop)
async function generateQuestionResponse(
  question: string,
  clientData: any,
  conversationHistory: any[]
): Promise<string> {
  console.log("🔍 QUESTION DETECTED - Using dedicated Q&A mode");
  console.log(`   Question: "${question}"`);

  // ✅ FIX: Extract context to avoid answering the same question twice
  const recentAIMessages = conversationHistory
    .filter((m) => m.sender === "ai")
    .slice(-3);

  // ✅ BETTER: Check for EXACT question repetition only
  const previousQuestions = conversationHistory
    .filter((m) => m.sender === "lead" && m.content.includes("?"))
    .slice(-5)
    .map((m) => m.content.toLowerCase().trim());

  // Check if THIS EXACT question was already asked
  const questionLower = question.toLowerCase().trim();
  const askedBefore = previousQuestions.filter(
    (q) => calculateSimilarity(q, questionLower) > 0.85
  ).length;

  if (askedBefore >= 2) {
    console.warn(
      `⚠️ Lead asked similar question ${askedBefore} times, acknowledging`
    );
    return `I believe I answered that already. Is there a different aspect of your project you'd like to know about - such as budget, timeline, or specific requirements?`;
  }
  
  const prompt = `You're a construction project manager for ${
    clientData?.name || "a construction company"
  }.

A customer asked: "${question}"

**CRITICAL**: Check if this question is DIFFERENT from previous questions.

PREVIOUS AI RESPONSES (last 3):
${recentAIMessages
  .map((m, i) => `${i + 1}. "${m.content.substring(0, 100)}..."`)
  .join("\n")}

YOUR TASK: 
1. If this is a NEW question → Answer it directly in 1-2 sentences, then ask ONE follow-up
2. If this is SIMILAR to a previous question → Say "As I mentioned, [brief summary]. Is there something else you'd like to know?"

CRITICAL RULES:
- Answer the question FIRST (don't deflect)
- Be specific and helpful
- Then ask ONE follow-up question
- Keep response under 50 words total
- NEVER repeat a previous answer - each answer must be UNIQUE

EXAMPLES:

Q: "Do you handle permits?"
Previous: (none)
A: "Yes, we handle all permits and approvals for construction projects. What type of project are you planning?" ✅

Q: "What's included in a typical renovation?"
Previous: "Yes, we handle permits..."
A: "A typical renovation includes design, permits, materials, labor, and project management. What's the scope of your renovation?" ✅

Q: "How long does a bathroom reno take?"
Previous: "Yes, we handle permits..." + "A typical renovation includes..."
A: "A bathroom renovation typically takes 2-4 weeks depending on complexity. What's your timeline?" ✅

Q: "Do you do basement finishing?"
Previous: "Yes, we handle permits..." + "A typical renovation..." + "A bathroom reno takes..."
A: "Yes, we do basement finishing including framing, insulation, electrical, and flooring. What's the size of your basement?" ✅

Answer naturally (under 50 words):`;

  try {
    const response = await callClaudeWithRetry(() =>
  anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 120,
    temperature: 0.7,
    system:
      "You're a construction expert. Answer questions directly and concisely. ALWAYS answer the question first, then ask one follow-up. Never deflect. NEVER repeat a previous answer - generate a NEW answer for each NEW question.",
    messages: [{ role: "user", content: prompt }],
  })
);

    const content = response.content[0];
    if (content.type !== "text") {
      return "Yes, we can help with that. Could you share more details about your project?";
    }

    const answer = content.text.trim();

    // ✅ Verify answer isn't a deflection
    const isDeflection =
      /tell me (more |about )|could you share|i'd love to learn/i.test(
        answer.toLowerCase()
      );

    if (isDeflection) {
      console.warn("⚠️ Answer deflected, using fallback");
      return "Yes, we handle that. What specific details would you like to know about your project?";
    }

    // ✅ NEW: Verify answer isn't repeating previous answer
    const isTooSimilar = recentAIMessages.some((prevMsg) => {
      const prevLower = prevMsg.content.toLowerCase().substring(0, 100);
      const answerLower = answer.toLowerCase().substring(0, 100);
      return calculateSimilarity(prevLower, answerLower) > 0.8;
    });

    if (isTooSimilar) {
      console.warn(
        "⚠️ Answer is too similar to previous, generating alternative"
      );
      return `I believe I already covered that topic. Could you ask about a different aspect of your project - such as budget, timeline, or specific requirements?`;
    }

    console.log("✅ Direct answer generated:");
    console.log(`   "${answer}"`);

    return answer;
  } catch (error) {
    console.error("Error generating question response:", error);
    return "Yes, we can help with that. Could you share more details about your project?";
  }
}

// ✅ Normal Conversation Response (FIX #4: Meeting Readiness Check)
async function generateNormalResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any,
  daySuggestions?: string
): Promise<string> {
  // ✅ STEP 1: Analyze context BEFORE calling Claude (anti-repetition)
  const context = extractConversationContext(conversationHistory);

  let antiRepetitionGuidance = "";

  if (context.askedTopics.size > 0) {
    antiRepetitionGuidance += `
**⚠️ YOU ALREADY ASKED ABOUT:**
${Array.from(context.askedTopics)
  .map((t) => `- ${t.toUpperCase()}`)
  .join("\n")}

**CRITICAL RULES:**
1. DO NOT ask about these topics again
2. DO NOT mention these words in your response
3. Move to a DIFFERENT topic (${Array.from([
      "budget",
      "timeline",
      "location",
      "project",
      "scope",
      "name",
      "email",
    ])
      .filter((t) => !context.askedTopics.has(t))
      .slice(0, 2)
      .join(" or ")})

**CORRECT EXAMPLES:**
AI: "What's your budget?"
Lead: "2M PHP"
AI: "Thank you. When are you hoping to start?" ✅ (No mention of "budget")

**WRONG EXAMPLES:**
AI: "What's your budget?"
Lead: "2M PHP"
AI: "That's a solid budget to work with..." ❌ (Mentioned "budget" again!)
`;
  }

  if (context.lastAIQuestions.length > 0) {
    antiRepetitionGuidance += `
**⚠️ YOUR LAST QUESTIONS WERE:**
${context.lastAIQuestions.map((q, i) => `${i + 1}. "${q}..."`).join("\n")}

DO NOT repeat these questions. Use completely different phrasing or move forward.
`;
  }

  // ✅ FIX #4: Check if we have enough info to suggest meeting
  const leadMessages = conversationHistory
    .filter((m) => m.sender === "lead")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const hasProject =
    /build|construction|renovation|remodel|addition|deck|basement|house|home|commercial|warehouse/i.test(
      leadMessages
    );
  const hasLocation =
    /\b(vancouver|surrey|richmond|burnaby|coquitlam|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i.test(
      leadMessages
    );
  const hasBudget = /\$[\d,]+|[\d,]+k|\d+\s*(million|thousand)/i.test(
    leadMessages
  );
  const hasTimeline = /asap|urgent|weeks?|months?|year|soon|start|begin/i.test(
    leadMessages
  );

  const detailsCount = [hasProject, hasLocation, hasBudget, hasTimeline].filter(
    Boolean
  ).length;

  const leadSaidNotReady =
    /(not sure|maybe|still planning|thinking|don't know|unsure|not ready)/i.test(
      leadMessages
    );

  console.log(`📊 Meeting Readiness Check: ${detailsCount}/4 details gathered`);
  console.log(
    `   Project: ${hasProject}, Location: ${hasLocation}, Budget: ${hasBudget}, Timeline: ${hasTimeline}`
  );
  console.log(`   Lead said not ready: ${leadSaidNotReady}`);

  let meetingGuidance = "";

  if (leadSaidNotReady) {
    meetingGuidance = `
**⚠️ LEAD IS NOT READY FOR MEETING YET**
They said: "not sure", "maybe", "still planning"

DO NOT suggest meetings or ask about availability.
Instead: Offer to help with planning, answer questions, or say "No problem! Take your time. What questions can I answer for you?"
`;
  } else if (detailsCount < 3) {
    meetingGuidance = `
**⚠️ NOT ENOUGH INFORMATION TO SUGGEST MEETING**
Only ${detailsCount}/4 key details gathered: ${[
      hasProject && "project",
      hasLocation && "location",
      hasBudget && "budget",
      hasTimeline && "timeline",
    ]
      .filter(Boolean)
      .join(", ")}

DO NOT suggest meetings yet.
Instead: Ask about MISSING details (${[
      !hasProject && "project type",
      !hasLocation && "location",
      !hasBudget && "budget range",
      !hasTimeline && "timeline",
    ]
      .filter(Boolean)
      .join(" or ")})

CORRECT: "What's your budget range for this project?"
WRONG: "Would you like to meet today or tomorrow?"
`;
  } else {
    meetingGuidance = `
**✅ READY TO SUGGEST MEETING**
${detailsCount}/4 key details gathered. You can now suggest: "Would you like to schedule a site visit to discuss your project in detail?"
`;
  }

  // ✅ STEP 2: Last 10 messages only (keep context manageable)
  const recentHistory = conversationHistory.slice(-10);
  const conversationText = recentHistory
    .map((m) => `${m.sender === "lead" ? "Customer" : "You"}: ${m.content}`)
    .join("\n");

  const lastMessage = conversationHistory[conversationHistory.length - 1];

  const prompt = `You're a professional construction project manager on WhatsApp for ${
    clientData?.name || "a construction company"
  }.

${antiRepetitionGuidance}

${meetingGuidance}

CONVERSATION HISTORY:
${conversationText}

CUSTOMER JUST SAID: "${lastMessage.content}"

YOUR JOB:
1. Respond naturally to what they said
2. Move conversation forward (gather project details OR suggest meeting IF READY)
3. Keep it brief (2-3 sentences max, under 50 words)
4. Use "meeting" or "site visit" (NEVER say "call" or "phone call")
5. VARY your language naturally (don't repeat previous phrases)
6. **RESPECT if lead said "not sure" or "maybe" - don't push!**

GUIDELINES:
- If they shared project info → acknowledge and ask next logical question
- If they confirmed availability → lock in the time and ask for address/email
- If they're vague → ask clarifying question
- Match their energy level
- If suggesting meeting days, use "${daySuggestions || "this week"}"

EXAMPLES:

Customer: "I want to build a house"
You: "Exciting project! To give you accurate information, could you share the location and approximate budget you have in mind?" ✅

Customer: "Thursday works"
You: "Perfect! What time on Thursday works best for you?" ✅

Customer: "Surrey, $800k budget"
You: "Great! Surrey with $800k budget. When are you hoping to start this project?" ✅

Customer: "2 PM"
You: "Excellent! Thursday at 2 PM. What's your address for the site visit?" ✅

Customer: "Not sure yet"
You: "No problem! Take your time. What questions can I answer about the process?" ✅

WRONG EXAMPLES (DO NOT DO):

Customer: "Surrey, $800k budget"
You: "I'd love to learn more about your project..." ❌ (They just told you! Don't repeat!)

Customer: "Not sure yet"
You: "Would you be available for a site visit this afternoon?" ❌ (They said not sure! Don't push!)

Respond naturally (2-3 sentences):`;

  try {
    // ✅ STEP 3: Retry loop with anti-repetition check
    let attempts = 0;
    const maxAttempts = 3;
    let aiResponse = "";

    while (attempts < maxAttempts) {
      attempts++;

      const response = await callClaudeWithRetry(() =>
  anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    temperature: 0.7 + attempts * 0.1,
    system:
      "You're a construction project manager with PERFECT MEMORY. You NEVER ask the same question twice. You NEVER repeat previous messages. Keep responses brief (under 50 words), professional, and focused on moving toward a site visit ONLY when lead is ready. Remember what's already been discussed and VARY your language.",
    messages: [{ role: "user", content: prompt }],
  })
);

      const content = response.content[0];
      if (content.type !== "text") {
        aiResponse =
          "Thank you for your message. A team member will respond shortly.";
        break;
      }

      aiResponse = content.text.trim();

      // ✅ Check for repetition
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

        // ✅ Context-aware fallback
        const hasProjectDetails = conversationHistory.some(
          (msg) =>
            msg.sender === "lead" &&
            /budget|location|timeline|sq ft|square feet|\$\d+k?/i.test(
              msg.content
            )
        );

        if (hasProjectDetails) {
          aiResponse =
            "Thank you for sharing those details. To better assist you, could you tell me a bit more about when you're hoping to start?";
        } else {
          aiResponse =
            "Thanks for reaching out! Could you share the location, budget, and timeline you have in mind for your project?";
        }
      }
    }

    return aiResponse;
  } catch (error) {
    console.error("Error generating response:", error);
    return "Thank you for your message. A team member will respond shortly.";
  }
}

// ============================================
// ✅ EXTRACT LEAD DETAILS (Unchanged)
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

EXTRACT:
- Full name (first and last if mentioned)
- Email address (must be valid format with @ and .)
- Specific address (street number + street name + city)

ADDRESS RULES:
- Must include street number AND street name (e.g., "123 Main St")
- Must include city (e.g., "Vancouver")
- "British Columbia" alone is NOT specific enough
- "123 Main St, Vancouver" IS specific enough ✅
- "3757 Anchor Way RR2 Pender Island BC V0N 2M2" IS specific enough ✅

RULES:
- Only extract information EXPLICITLY stated
- For name: Must be a real name (not phone numbers like "639542269454")
- For email: Must be valid format (not "whatsapp_639@temp.com")
- For address: Must be complete enough for a site visit

EXAMPLES:
"I'm John Smith from Vancouver" → name: "John Smith"
"Email me at john@construction.com" → email: "john@construction.com"
"Visit us at 123 Main St, Vancouver" → address: "123 Main St, Vancouver"
"My name is Jane" → name: "Jane" (partial name)
"I live in British Columbia" → address: null (not specific enough)

Respond with JSON only:
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
      "You extract information from customer messages. Only extract explicitly stated information. Respond with valid JSON only.",
    messages: [{ role: "user", content: prompt }],
  })
);

    const content = response.content[0];
    if (content.type !== "text") {
      return { confidence: 0 };
    }

    const result = parseClaudeJSON(content.text);

    console.log("📋 Extracted Lead Details:", {
      name: result.name || "not found",
      email: result.email || "not found",
      address: result.address || "not found",
      confidence: result.confidence,
    });

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
// ✅ AUDIT GENERATION (Unchanged)
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
// ✅ VSL SCRIPT GENERATION (Unchanged)
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
  try {
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

    const response = await callClaudeWithRetry(() =>
  anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    temperature: 0.8,
    system:
      "You are an expert copywriter specializing in video sales letters that convert. Write persuasive, benefit-driven scripts.",
    messages: [{ role: "user", content: prompt }],
  })
);

    const content = response.content[0];
    const script = content.type === "text" ? content.text : "";

    console.log("✅ VSL script generated:", script.substring(0, 100) + "...");

    return script;
  } catch (error) {
    console.error("Error generating VSL script:", error);
    throw new Error("Failed to generate VSL script");
  }
}
