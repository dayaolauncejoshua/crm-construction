// server/services/openai.ts

import OpenAI from "openai";

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

export async function qualifyLead(
  leadData: any,
  conversationHistory: any[]
): Promise<LeadQualificationResult> {
  try {
    const conversationText = conversationHistory
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join("\n");

    const prompt = `You are a lead qualification expert for a construction company.

Analyze this conversation and score from 0.0 to 1.0 based on:

**HIGH SCORE (0.7-1.0) - Hot Lead (REQUIRES MULTIPLE SIGNALS):**
Must have BUDGET (2M+) **PLUS at least TWO of these:**
- ⏰ URGENCY: "ASAP", "urgent", "need to start in 2-6 weeks", "time-sensitive"
- 👔 DECISION MAKER: "owner", "CEO", "CFO", "I'm authorized", "my company", "I decide"
- 📅 MEETING REQUEST: "meet today/this week", "can we schedule", "site visit", "when can you come"
- 🏆 COMPETITIVE: "comparing 3 contractors", "need proposal by Friday", "choosing next week"
- 📋 DETAILED SCOPE: Full project plan, specific requirements, ready to start

**MEDIUM SCORE (0.4-0.69) - Warm Lead:**
- Budget mentioned (even large) but NO urgency
- Budget + project details (type, location, size)
- Engaged, asks relevant questions
- Timeline mentioned but flexible ("in a few months", "planning stage")
- Interested but shopping around casually

**LOW SCORE (0.0-0.39) - Cold Lead:**
- Only asks "price?", "how much?", "cost?"
- No budget mentioned
- No project details
- Just browsing
- One-word responses

SCORING EXAMPLES:
- "5M budget, office renovation, 300 sqm, La Union" = 0.55 (WARM - has budget & details but no urgency)
- "5M budget, URGENT, need in 4 weeks, I'm the CEO, meet this week?" = 0.85 (HOT - has budget + urgency + decision maker + meeting)
- "How much?" = 0.15 (COLD)

Lead Data:
- Name: ${leadData.firstName} ${leadData.lastName}
- Company: ${leadData.company}
- Email: ${leadData.email}
- Phone: ${leadData.phone}

CONVERSATION:
${conversationText}

CRITICAL: Set needsHumanAttention to true ONLY if score >= 0.7

Respond with JSON only:
{
  "score": 0.55,
  "intent": "medium",
  "urgency": "later",
  "budget": "qualified",
  "timeline": "weeks",
  "needsHumanAttention": false,  // false because score < 0.7
  "reasoning": "Has 3-5M budget and project details but no urgency or decision maker identified",
  "nextAction": "Qualify urgency and decision-making authority"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a lead qualification expert. Always respond with valid JSON. Be aggressive in scoring - urgency and budget are most important.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    const finalScore = Math.max(0, Math.min(1, result.score || 0.5));

    return {
      score: finalScore,
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: finalScore >= 0.7, // Force based on score only
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
    // Build full conversation context
    const conversationText = conversationHistory
      .map(
        (msg) => `${msg.sender === "lead" ? "Customer" : "You"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `You are a professional construction project manager for ${
      clientData?.name || "a construction company"
    }. You're chatting on WhatsApp with a potential client.

CRITICAL RULES:
1. **Read conversation carefully** - Don't ask for info they already gave
2. **Acknowledge specifics** - Reference their budget, project type, location, timeline
3. **Sound human** - Be natural, enthusiastic, helpful
4. **Show expertise** - Mention relevant construction experience
5. **Move to action** - Guide toward meeting/site visit
6. **Be brief** - Max 3-4 sentences for WhatsApp
7. **Add value** - Share insights, not generic statements

YOUR EXPERTISE:
- Commercial & residential construction
- Restaurant renovations (15+ in Metro Manila)
- Office fit-outs & remodeling
- Budget: 500K - 50M peso projects
- Timeline: 2 weeks to 6 months

CONVERSATION SO FAR:
${conversationText}

RESPONSE STRATEGY:
- **First message (vague inquiry)**: Ask about project type, scope, and budget
- **Second message (they give details)**: Acknowledge specifics, show relevant experience, ask 1-2 clarifying questions
- **Third message (urgency/full details)**: Recognize priority, offer immediate meeting with specific times

DO NOT:
- Ask for budget if they already gave it
- Repeat "Let me check that for you"
- Give vague answers
- Ask same question twice
- Sound robotic

Current situation: Customer just sent "${
      conversationHistory[conversationHistory.length - 1]?.content
    }"

Respond as a helpful construction expert who wants to close this deal:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert construction project manager. Be professional, contextual, and action-oriented. Keep responses concise for WhatsApp (3-4 sentences max).",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    return (
      response.choices[0].message.content ||
      "Thanks for reaching out! A team member will respond shortly."
    );
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Thanks for your message. A team member will respond shortly.";
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
  clientData: any
): Promise<string> {
  try {
    const prompt = `
    Create a 180-second Video Sales Letter script for ${clientData.name}, a ${niche} business.
    
    Structure:
    - Hook (0-15s): Attention-grabbing opener about their pain point
    - Problem (15-45s): Agitate the problem with statistics
    - Solution (45-90s): Introduce AI lead system with <2 minute response time
    - Proof (90-150s): Case study with specific numbers
    - CTA (150-180s): Clear call to action for free audit
    
    Make it compelling and specific to ${niche} industry challenges.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "You are a VSL script expert. Create compelling, benefit-focused scripts that convert.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content || "Script generation failed";
  } catch (error) {
    console.error("Error generating VSL script:", error);
    throw new Error(
      "Failed to generate VSL script: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}
