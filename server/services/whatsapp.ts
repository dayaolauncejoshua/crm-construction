// server/services/whatsapp.ts

export interface WhatsAppMessage {
  to: string;
  type: string;
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: any[];
  };
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      "default_token";
    this.phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID || "default_phone_id";
  }

  async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            ...message,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("WhatsApp API error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  async sendTextMessage(to: string, message: string): Promise<boolean> {
    const whatsappMessage: WhatsAppMessage = {
      to: to.replace(/\D/g, ""), // Remove non-digits
      type: "text",
      text: {
        body: message,
      },
    };

    return await this.sendMessage(whatsappMessage);
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    variables: string[] = []
  ): Promise<boolean> {
    const whatsappMessage: WhatsAppMessage = {
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en_US",
        },
        components:
          variables.length > 0
            ? [
                {
                  type: "body",
                  parameters: variables.map((variable) => ({
                    type: "text",
                    text: variable,
                  })),
                },
              ]
            : [],
      },
    };

    return await this.sendMessage(whatsappMessage);
  }

  async sendAuditResult(
    to: string,
    firstName: string,
    auditType: string,
    topFinding: string,
    shortlink: string
  ): Promise<boolean> {
    const message = `Hi ${firstName}, your ${auditType} is ready. Top finding: ${topFinding}. See details: ${shortlink}. Reply 1 to book, 2 to ask a question, or STOP to opt out.`;

    return await this.sendTextMessage(to, message);
  }

  parseWebhook(payload: any): {
    from: string;
    message: string;
    timestamp: number;
  } | null {
    try {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages?.[0];

      if (!messages) return null;

      return {
        from: messages.from,
        message: messages.text?.body || "",
        timestamp: parseInt(messages.timestamp),
      };
    } catch (error) {
      console.error("Error parsing WhatsApp webhook:", error);
      return null;
    }
  }
}

export const whatsappService = new WhatsAppService();
