// server/services/openai.ts

import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY2
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
    const prompt = `
    You are an expert lead qualification AI. Analyze this lead and conversation to determine qualification score.
    
    Lead Data:
    - Name: ${leadData.firstName} ${leadData.lastName}
    - Company: ${leadData.company}
    - Email: ${leadData.email}
    - Phone: ${leadData.phone}
    - Source: ${leadData.source}
    
    Conversation History:
    ${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}
    
    Score this lead from 0.0 to 1.0 based on:
    - Buying intent (40%)
    - Urgency (30%) 
    - Budget qualification (20%)
    - Decision making authority (10%)
    
    Score >0.7 needs human attention immediately.
    
    Respond with JSON in this exact format: {
      "score": number,
      "intent": "high|medium|low",
      "urgency": "immediate|soon|later",
      "budget": "qualified|unqualified|unknown",
      "timeline": "days|weeks|months",
      "needsHumanAttention": boolean,
      "reasoning": "brief explanation",
      "nextAction": "specific next step"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a lead qualification expert. Always respond with valid JSON.",
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
      score: Math.max(0, Math.min(1, result.score)),
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: result.needsHumanAttention || false,
      reasoning: result.reasoning || "",
      nextAction: result.nextAction || "continue conversation",
    };
  } catch (error) {
    console.error("Error qualifying lead:", error);
    throw new Error("Failed to qualify lead: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateAIResponse(
  conversationHistory: any[],
  leadData: any,
  clientData: any
): Promise<string> {
  try {
    const prompt = `
    You are an AI sales assistant for ${clientData.name}, a ${clientData.industry} company.
    
    Your goal is to:
    1. Qualify the lead by understanding their needs, timeline, and budget
    2. Build rapport and trust
    3. Guide them toward booking a consultation
    4. Keep responses under 160 characters for SMS/WhatsApp
    
    Lead: ${leadData.firstName} from ${leadData.company || 'their business'}
    
    Recent conversation:
    ${conversationHistory.slice(-5).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}
    
    Respond naturally and helpfully. If they seem qualified (expressing urgency, budget, timeline), 
    suggest booking a consultation.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a helpful sales assistant. Be conversational, professional, and concise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || "Thanks for your message. How can I help you today?";
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
    throw new Error("Failed to generate audit: " + (error instanceof Error ? error.message : "Unknown error"));
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
          content: "You are a VSL script expert. Create compelling, benefit-focused scripts that convert.",
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
    throw new Error("Failed to generate VSL script: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
