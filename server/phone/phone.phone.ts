// src/phone/phone.phone.ts
import WebSocket from "ws";
import axios from "axios";
import { pool } from "../index";

export interface LeadPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  project_type?: string;
  timeline?: string;
  budget?: string;
  decision_maker?: boolean;
  pain_points?: string[];
  notes?: string;
  call_id?: string;
}

class PhoneService {
  private wsConnections = new Map<string, WebSocket>();
  private callData = new Map<
    string,
    {
      transcript: string[];
      detectedInfo?: Partial<LeadPayload>;
      twilioCallSid?: string;
    }
  >();

  log(msg: string, level: "info" | "error" = "info") {
    const prefix = level === "error" ? "[❌]" : "[📞]";
    console.log(`${prefix} ${msg}`);
  }

  async handleIncomingCall(callId: string, opts?: { twilioCallSid?: string }) {
    await this.acceptIncomingCall(callId);
    this.callData.set(callId, {
      transcript: [],
      twilioCallSid: opts?.twilioCallSid,
    });

    setImmediate(() => {
      this.connect(callId).catch((e) =>
        this.log(`WS connect error: ${e.message}`, "error")
      );
    });

    return {};
  }

  private async acceptIncomingCall(callId: string) {
    const body: RealtimeSessionCreateRequest = {
      type: "realtime",
      model: "gpt-4o-realtime-preview",
      output_modalities: ["audio"],
      instructions: `You are an AI lead qualification assistant on a phone call.

Your job:
- Collect caller's personal and project info:
  1) Full name
  2) Company
  3) Email
  4) Phone number
  5) Project type / description
  6) Timeline
  7) Budget range
  8) Decision maker?
  9) Pain points

Confirm details and call save_lead_info whenever new confirmed data appears.
If caller says "press 1" or "talk to a human", say "Connecting you to a human" and stop talking.`,
      tools: [
        {
          type: "function",
          name: "save_lead_info",
          description: "Save the lead info",
          parameters: {
            type: "object",
            properties: {
              first_name: { type: "string" },
              last_name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              company: { type: "string" },
              project_type: { type: "string" },
              timeline: { type: "string" },
              budget: { type: "string" },
              decision_maker: { type: "boolean" },
              pain_points: { type: "array", items: { type: "string" } },
              notes: { type: "string" },
            },
          },
        },
      ],
    };

    this.log(`Accepted incoming call ${callId}`);
  }

  private async connect(callId: string) {
    // placeholder connection logic; you already have actual OpenAI Realtime connection code
  }

  private computeClassification(payload: LeadPayload) {
    const score = Math.random(); // placeholder — your existing logic already computes properly
    const temperature = score >= 0.7 ? "hot" : score >= 0.4 ? "mid" : "cold";
    return { qualification_score: score, temperature, confidence: 0.9 };
  }

  private async saveLead(payload: LeadPayload) {
    const cls = this.computeClassification(payload);
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO leads (first_name,last_name,email,phone,company,project_type,timeline,budget,decision_maker,pain_points,notes,temperature,qualification_score,call_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (call_id) DO UPDATE SET
           first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,email=EXCLUDED.email,phone=EXCLUDED.phone,
           company=EXCLUDED.company,project_type=EXCLUDED.project_type,timeline=EXCLUDED.timeline,
           budget=EXCLUDED.budget,decision_maker=EXCLUDED.decision_maker,pain_points=EXCLUDED.pain_points,
           notes=EXCLUDED.notes,temperature=EXCLUDED.temperature,qualification_score=EXCLUDED.qualification_score`,
        [
          payload.first_name,
          payload.last_name,
          payload.email,
          payload.phone,
          payload.company,
          payload.project_type,
          payload.timeline,
          payload.budget,
          payload.decision_maker,
          JSON.stringify(payload.pain_points || []),
          payload.notes,
          cls.temperature,
          cls.qualification_score,
          payload.call_id,
        ]
      );
      this.log(
        `Lead saved (${cls.temperature.toUpperCase()}) for call ${
          payload.call_id
        }`
      );
    } catch (e) {
      this.log(`DB saveLead error: ${(e as Error).message}`, "error");
    } finally {
      client.release();
    }
  }

  async handleHumanTakeover(callId: string) {
    const callInfo = this.callData.get(callId);
    const twilioSid = callInfo?.twilioCallSid;
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE conversations SET is_ai_handled=false,human_takeover_at=now() WHERE call_id=$1`,
        [callId]
      );
    } finally {
      client.release();
    }

    if (twilioSid) {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls/${twilioSid}/Redirect.json`,
        new URLSearchParams({
          Url: `${process.env.BASE_URL}/api/transfer-to-human`,
        }),
        {
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID!,
            password: process.env.TWILIO_AUTH_TOKEN!,
          },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );
    }

    this.closeConnection(callId);
  }

  async closeConnection(callId: string) {
    const callInfo = this.callData.get(callId);
    if (!callInfo) return;
    const transcript = callInfo.transcript?.join("\n") || "";
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE conversations SET transcript=$1,ended_at=now() WHERE call_id=$2`,
        [transcript, callId]
      );
      this.log(`Transcript saved for ${callId}`);
    } catch (e) {
      this.log(`Error saving transcript: ${(e as Error).message}`, "error");
    } finally {
      client.release();
    }
    this.wsConnections.get(callId)?.close();
    this.wsConnections.delete(callId);
    this.callData.delete(callId);
  }
}

export const phoneService = new PhoneService();
