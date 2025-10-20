// server/services/whatsapp.ts

import { stat } from "fs";

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

  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string }> {
    try {
      console.log("📤 Sending WhatsApp message:", {
        to: message.to,
        type: message.type,
        messageLength: message.text?.body?.length || 0,
      });
      
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

      const responseData = await response.json();

      if (!response.ok) {
        console.error("❌ WhatsApp API error response:", {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        });
        return { success: false };
      }

      console.log("✅ WhatsApp API success:", responseData);
      
      // ✅ Return message ID
      return { 
        success: true, 
        messageId: responseData.messages?.[0]?.id 
      };
    } catch (error) {
      console.error("❌ Error sending WhatsApp message:", error);
      return { success: false };
    }
  }

  async sendTextMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    const whatsappMessage: WhatsAppMessage = {
      to: to.replace(/\D/g, ""),
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
  ): Promise<{ success: boolean; messageId?: string }> {
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

  async sendReaction(
    toPhone: string,
    whatsappMessageId: string,
    emoji: string
  ): Promise<boolean> {
    try {
      console.log("😊 Sending WhatsApp reaction:", {
        toPhone,
        whatsappMessageId,
        emoji,
      });

      const cleanPhone = toPhone.replace(/\D/g, "");

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
            recipient_type: "individual",
            to: cleanPhone,
            type: "reaction",
            reaction: {
              message_id: whatsappMessageId,
              emoji: emoji,
            },
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("❌ WhatsApp reaction API error:", {
          status: response.status,
          data: responseData,
        });
        return false;
      }

      console.log("✅ WhatsApp reaction API success:", responseData);
      return true;
    } catch (error) {
      console.error("❌ Error sending WhatsApp reaction:", error);
      return false;
    }
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    console.log("📬 Marking WhatsApp message as read:", messageId);

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
          status: "read",
          message_id: messageId,
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp mark as read error:", {
        status: response.status,
        data: responseData,
      });
      return false;
    }

    console.log("✅ WhatsApp message marked as read:", messageId);
    return true;
  } catch (error) {
    console.error("❌ Error marking WhatsApp message as read:", error);
    return false;
  }
}

  async sendAuditResult(
    to: string,
    firstName: string,
    auditType: string,
    topFinding: string,
    shortlink: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const message = `Hi ${firstName}, your ${auditType} is ready. Top finding: ${topFinding}. See details: ${shortlink}. Reply 1 to book, 2 to ask a question, or STOP to opt out.`;

    return await this.sendTextMessage(to, message);
  }

 parseWebhook(payload: any): {
  from: string;
  message: string;
  timestamp: number;
  phoneNumberId: string;
  messageId?: string;
  reaction?: {
    messageId: string;
    emoji: string;
  };
  readReceipt?: {
    messageId: string;
    timestamp: number;
  };
  typing?: {
    isTyping: boolean;
  }
} | null {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if(value?.statuses && value.statuses.length > 0){
      const status = value.statuses[0];

      if (status.status === "read"){
        return {
          from: status.recipient_id || "",
          message: "",
          timestamp: parseInt(status.timestamp),
          phoneNumberId: value.metadata.phone_number_id,
          messageId: status.id,
          readReceipt: {
            messageId: status.id,
            timestamp: parseInt(status.timestamp),
          },
        };
      }

      return null;
    }

    const messages = value?.messages?.[0];
    if (!messages) return null;

    console.log("🔍 Parsing webhook, message ID:", messages.id);

    // Check if it's a reaction
    if (messages.type === "reaction") {
      return {
        from: messages.from,
        message: "",
        timestamp: parseInt(messages.timestamp),
        phoneNumberId: value.metadata.phone_number_id,
        messageId: messages.id,
        reaction: {
          messageId: messages.reaction.message_id,
          emoji: messages.reaction.emoji,
        },
      };
    }

    // Regular text message
    return {
      from: messages.from,
      message: messages.text?.body || "",
      timestamp: parseInt(messages.timestamp),
      phoneNumberId: value.metadata.phone_number_id,
      messageId: messages.id,
    };
  } catch (error) {
    console.error("Error parsing WhatsApp webhook:", error);
    return null;
  }
}
}

export const whatsappService = new WhatsAppService();