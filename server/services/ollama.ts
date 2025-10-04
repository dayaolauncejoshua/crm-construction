interface OllamaResponse {
  response: string;
}

export async function qualifyLeadWithOllama(
  leadData: any,
  conversationHistory: any[]
): Promise<any> {
  try {
    const prompt = `You are a lead qualification expert. Analyze this lead and conversation.
    
Lead: ${leadData.firstName} ${leadData.lastName} from ${leadData.company}
Email: ${leadData.email}
Phone: ${leadData.phone}

Conversation:
${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

Score this lead from 0.0 to 1.0 based on buying intent, urgency, and budget.
Respond with ONLY valid JSON in this format:
{
  "score": 0.5,
  "intent": "medium",
  "urgency": "soon",
  "budget": "unknown",
  "timeline": "weeks",
  "needsHumanAttention": false,
  "reasoning": "brief explanation",
  "nextAction": "continue conversation"
}`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    const result = JSON.parse(data.response);

    return {
      score: Math.max(0, Math.min(1, result.score || 0.5)),
      intent: result.intent || "unknown",
      urgency: result.urgency || "unknown",
      budget: result.budget || "unknown",
      timeline: result.timeline || "unknown",
      needsHumanAttention: result.needsHumanAttention || false,
      reasoning: result.reasoning || "",
      nextAction: result.nextAction || "continue conversation",
    };
  } catch (error) {
    console.error("Error with Ollama:", error);
    // Return default values on error
    return {
      score: 0.5,
      intent: "unknown",
      urgency: "unknown",
      budget: "unknown",
      timeline: "unknown",
      needsHumanAttention: false,
      reasoning: "AI qualification unavailable",
      nextAction: "continue conversation",
    };
  }
}

export async function generateAIResponseWithOllama(
  conversationHistory: any[],
  leadData: any,
  clientData: any
): Promise<string> {
  try {
    const prompt = `You are a helpful sales assistant for ${clientData.name}. 
Keep responses under 160 characters for SMS/WhatsApp.

Lead: ${leadData.firstName} from ${leadData.company}

Recent conversation:
${conversationHistory.slice(-5).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

Respond naturally and helpfully. If they seem qualified (urgency, budget, timeline), suggest booking a consultation.`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return "Thanks for your message. A team member will respond shortly.";
    }

    const data: OllamaResponse = await response.json();
    // Truncate to 160 characters
    return data.response.slice(0, 160);
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Thanks for your message. How can I help you today?";
  }
}