// server/services/openai.ts

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

// export async function generateVSLScript(
//   niche: string,
//   data: {
//     targetAudience: string;
//     painPoints: string;
//     solution: string;
//     proofElements: string;
//   }
// ): Promise<string> {
//   const prompt = `Create a compelling Video Sales Letter (VSL) script for a ${niche} business.

// TARGET AUDIENCE: ${data.targetAudience}
// PAIN POINTS: ${data.painPoints}
// SOLUTION: ${data.solution}
// PROOF: ${data.proofElements}

// Create a 2-3 minute VSL script that follows this structure:

// 1. HOOK (15 seconds): Start with a powerful question or statement that grabs attention
// 2. PROBLEM AGITATION (30 seconds): Amplify the pain points and consequences
// 3. SOLUTION INTRODUCTION (45 seconds): Present the solution and its unique benefits
// 4. PROOF & CREDIBILITY (30 seconds): Share results, testimonials, or case studies
// 5. CALL TO ACTION (20 seconds): Clear next step with urgency

// Requirements:
// - Conversational, engaging tone
// - Use "you" and "your" to connect with audience
// - Include specific numbers and results
// - Create urgency without being pushy
// - End with a clear, compelling call to action

// Write the complete script now:`;

//   try {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are an expert copywriter specializing in video sales letters that convert. Write persuasive, benefit-driven scripts.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0.8,
//       max_tokens: 2000,
//     });

//     const script = completion.choices[0]?.message?.content || "";

//     console.log("✅ VSL script generated:", script.substring(0, 100) + "...");

//     return script;
//   } catch (error) {
//     console.error("❌ Error generating VSL script:", error);
//     throw new Error("Failed to generate VSL script");
//   }
// }
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

export async function qualifyLead(
  leadData: any,
  conversationHistory: any[]
): Promise<LeadQualificationResult> {
  try {
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
    // ✅ FIX: Better conversation mapping
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

    // ✅ Get the last AI message to avoid repetition
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
- Serving Central Luzon, Northern Luzon (La Union, Ilocos, Pangasinan)

CONVERSATION SO FAR:
${conversationText}${lastAIMessageText}

RESPONSE STRATEGY:

**If they just said "Hello" or vague inquiry:**
→ Warm greeting + Ask for: project type, location, budget, timeline

**If they provided details:**
→ Acknowledge EVERY specific detail they shared (budget, location, timeline, type)
→ Show relevant experience: "We've done similar projects in [location]"
→ Offer site visit with specific days/times

**If they confirmed meeting:**
→ Confirm the day/time they chose
→ Ask for address or offer to send calendar invite
→ ONE sentence about what you'll discuss

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
      temperature: 0.5, // ✅ REDUCED from 0.7
      max_tokens: 150, // ✅ REDUCED from 300
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

// export async function generateVSLScript(
//   niche: string,
//   clientData: any
// ): Promise<string> {
//   try {
//     const prompt = `
//     Create a 180-second Video Sales Letter script for ${clientData.name}, a ${niche} business.

//     Structure:
//     - Hook (0-15s): Attention-grabbing opener about their pain point
//     - Problem (15-45s): Agitate the problem with statistics
//     - Solution (45-90s): Introduce AI lead system with <2 minute response time
//     - Proof (90-150s): Case study with specific numbers
//     - CTA (150-180s): Clear call to action for free audit

//     Make it compelling and specific to ${niche} industry challenges.
//     `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a VSL script expert. Create compelling, benefit-focused scripts that convert.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//     });

//     return response.choices[0].message.content || "Script generation failed";
//   } catch (error) {
//     console.error("Error generating VSL script:", error);
//     throw new Error(
//       "Failed to generate VSL script: " +
//         (error instanceof Error ? error.message : "Unknown error")
//     );
//   }
// }
