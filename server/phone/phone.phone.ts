import WebSocket from "ws";
import axios from "axios";
import type { RealtimeAudioFormats } from "openai/resources/realtime/realtime.js";

interface RealtimeSessionCreateRequest {
  type: string;
  model: string;
  output_modalities: string[];
  audio: {
    input: {
      format: RealtimeAudioFormats;
      turn_detection: { type: string; create_response: boolean };
    };
    output: {
      format: RealtimeAudioFormats;
      voice: string;
      speed: number;
    };
  };
  instructions: string;
}

interface AcceptCallOptions {
  instructions?: string;
  model?: string;
}

class PhoneService {
  private readonly apiKey: string;
  private sockets: Map<string, WebSocket>;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY2!;
    this.sockets = new Map<string, WebSocket>();

    if (!this.apiKey) {
      throw new Error(
        "OPENAI_API_KEY2 is not defined in environment variables"
      );
    }
  }

  private get authHeader() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private log(message: string, level: "log" | "error" | "debug" = "log") {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [PhoneService] ${message}`);
  }

  async acceptIncomingCall(
    callId: string,
    opts?: AcceptCallOptions
  ): Promise<void> {
    const body: RealtimeSessionCreateRequest = {
      type: "realtime",
      model: opts?.model || "gpt-4o-realtime-preview",
      output_modalities: ["audio"],
      audio: {
        input: {
          format: "pcm16" as RealtimeAudioFormats,
          turn_detection: { type: "semantic_vad", create_response: true },
        },
        output: {
          format: "g711_ulaw" as RealtimeAudioFormats,
          voice: "coral",
          speed: 1.0,
        },
      },
      instructions:
        opts?.instructions ||
        `You are a helpful assistant for finding potential leads for construction company. 
        Speak clearly and briefly.
        Confirm understanding before taking actions.  
        Your language is English, unless a user uses a different language.`,
    };

    try {
      await axios.post(
        `https://api.openai.com/v1/realtime/calls/${callId}/accept`,
        body,
        {
          headers: {
            ...this.authHeader,
            "Content-Type": "application/json",
          },
        }
      );
      this.log(`Call ${callId} accepted successfully`);
    } catch (e) {
      const error = e as Error;
      this.log(`Error accepting call ${callId}: ${error.message}`, "error");
      throw error;
    }
  }

  async connect(callId: string): Promise<void> {
    const url = `wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(
      callId
    )}`;
    const ws = new WebSocket(url, { headers: this.authHeader });

    this.sockets.set(callId, ws);

    ws.on("open", () => {
      this.log(`WebSocket open for call ${callId}`);

      const responseCreate = {
        type: "response.create",
        response: {
          instructions: `Greet the user and ask them what they need assistance with.
            USE English as a default language.
            If a user is silent for more than 3 seconds, ask if they are still there or if they need help with anything.`,
        },
      };

      ws.send(JSON.stringify(responseCreate));
    });

    ws.on("message", (data) => {
      try {
        const text = data.toString();
        this.log(`WebSocket message (${callId}): ${text}`, "debug");
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        this.log(
          `Failed to parse WebSocket message for ${callId}: ${error.message}`,
          "error"
        );
      }
    });

    ws.on("error", (error) => {
      this.log(`WebSocket error for call ${callId}: ${error.message}`, "error");
    });

    ws.on("close", () => {
      this.log(`WebSocket closed for call ${callId}`);
      this.sockets.delete(callId);
    });
  }

  async handleIncomingCall(callId: string): Promise<void> {
    await this.acceptIncomingCall(callId);

    setImmediate(() => {
      this.connect(callId).catch((e) => {
        const error = e as Error;
        this.log(
          `Failed to connect WebSocket for ${callId}: ${error.message}`,
          "error"
        );
      });
    });
  }

  // Optional: Method to close a specific connection
  closeConnection(callId: string): void {
    const ws = this.sockets.get(callId);
    if (ws) {
      ws.close();
      this.sockets.delete(callId);
      this.log(`Manually closed connection for call ${callId}`);
    }
  }

  // Optional: Method to close all connections
  closeAllConnections(): void {
    this.sockets.forEach((ws, callId) => {
      ws.close();
      this.log(`Closed connection for call ${callId}`);
    });
    this.sockets.clear();
  }
}

// Export a singleton instance
export const phoneService = new PhoneService();
export default PhoneService;
