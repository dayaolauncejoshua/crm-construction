// src/phone/phone.phone.ts
import WebSocket from "ws";
import axios from "axios";
import type { RealtimeAudioFormats } from "openai/resources/realtime/realtime.js";
import { pool } from "../db";
import dotenv from "dotenv";
dotenv.config();

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
  tools?: Array<{
    type: string;
    name: string;
    description: string;
    parameters: any;
  }>;
}

interface AcceptCallOptions {
  instructions?: string;
  model?: string;
}

type LeadPayload = {
  client_id?: string;
  call_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  qualification_score?: number;
  internal_notes?: string;
  timeline?: string;
  budget?: string;
  decision_maker?: boolean | string;
  tags?: string[];
  conversation_summary?: string;
  pain_points?: string[];
  project_type?: string;
};

class PhoneService {
  private readonly apiKey: string;
  private sockets: Map<string, WebSocket>;
  private callData: Map<
    string,
    {
      transcript: string[];
      detectedInfo: Partial<LeadPayload>;
      startTime: Date;
    }
  >;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY2!;
    this.sockets = new Map<string, WebSocket>();
    this.callData = new Map();

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
    // Initialize call data tracking
    this.callData.set(callId, {
      transcript: [],
      detectedInfo: {},
      startTime: new Date(),
    });

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
        `You are a professional lead qualification assistant for a construction company.

Your goal is to gather important information while being conversational and helpful:
1. Greet the caller warmly
2. Ask what type of project they're interested in
3. Gather key qualification information naturally:
   - Their name and company (if applicable)
   - Contact information (phone/email)
   - Project timeline (when do they need it done?)
   - Budget range (what are they looking to invest?)
   - Decision-making authority (are they the decision maker?)
   - Specific pain points or requirements

Be conversational and empathetic. Don't make it feel like an interrogation.

When you've gathered sufficient information, use the save_lead_info function to record the details.`,
      tools: [
        {
          type: "function",
          name: "save_lead_info",
          description: "Save the lead information collected during the call",
          parameters: {
            type: "object",
            properties: {
              first_name: {
                type: "string",
                description: "Caller's first name",
              },
              last_name: { type: "string", description: "Caller's last name" },
              email: { type: "string", description: "Email address" },
              phone: { type: "string", description: "Phone number" },
              company: { type: "string", description: "Company name" },
              timeline: {
                type: "string",
                description:
                  "Project timeline (e.g., 'immediate', 'within 1 month', '2-3 months', '6+ months')",
              },
              budget: {
                type: "string",
                description:
                  "Budget range (e.g., 'under 10k', '10k-50k', '50k-100k', 'over 100k')",
              },
              decision_maker: {
                type: "boolean",
                description: "Is the caller the decision maker?",
              },
              project_type: {
                type: "string",
                description: "Type of construction project",
              },
              pain_points: {
                type: "array",
                items: { type: "string" },
                description: "Main concerns or pain points mentioned",
              },
              notes: {
                type: "string",
                description: "Additional notes or conversation summary",
              },
            },
            required: ["first_name"],
          },
        },
      ],
    };

    try {
      await axios.post(
        `https://api.openai.com/v1/realtime/calls/${callId}/accept`,
        body,
        { headers: { ...this.authHeader, "Content-Type": "application/json" } }
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
    });

    ws.on("message", async (data) => {
      try {
        const text = data.toString();
        const callInfo = this.callData.get(callId);

        if (callInfo) {
          // Store transcript snippets
          callInfo.transcript.push(text);
        }

        this.log(
          `WebSocket message (${callId}): ${text.substring(0, 200)}`,
          "debug"
        );

        let obj: any = null;
        try {
          obj = JSON.parse(text);
        } catch (_) {
          return;
        }

        // Handle function calls from the AI
        if (obj?.type === "response.function_call_arguments.done") {
          const functionName = obj?.name;
          const args = obj?.arguments;

          if (functionName === "save_lead_info" && args) {
            this.log(`Function call received: save_lead_info`);
            await this.processLeadFromFunctionCall(callId, args);
          }
        }

        // Also check for function_call in response content
        if (obj?.response?.output) {
          for (const item of obj.response.output) {
            if (
              item?.type === "function_call" &&
              item?.name === "save_lead_info"
            ) {
              const args =
                typeof item.arguments === "string"
                  ? JSON.parse(item.arguments)
                  : item.arguments;
              this.log(`Function call in output: save_lead_info`);
              await this.processLeadFromFunctionCall(callId, args);
            }
          }
        }

        // Fallback: Try to detect JSON payload in message text
        const jsonMatch = text.match(/\{[\s\S]*"email"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const payload = JSON.parse(jsonMatch[0]);
            if (payload.email || payload.phone || payload.name) {
              await this.processLeadFromFunctionCall(callId, payload);
            }
          } catch (err) {
            // Ignore parse errors
          }
        }
      } catch (e) {
        const error = e as Error;
        this.log(
          `Error processing message for ${callId}: ${error.message}`,
          "error"
        );
      }
    });

    ws.on("error", (error) => {
      this.log(`WebSocket error for call ${callId}: ${error.message}`, "error");
    });

    ws.on("close", async () => {
      this.log(`WebSocket closed for call ${callId}`);

      // Save lead data when call ends if not already saved
      const callInfo = this.callData.get(callId);
      if (callInfo && Object.keys(callInfo.detectedInfo).length > 0) {
        this.log(`Saving lead data for call ${callId} on call end`);
        await this.saveLead({
          ...callInfo.detectedInfo,
          call_id: callId,
          internal_notes:
            callInfo.detectedInfo.internal_notes ||
            `Call duration: ${Math.round(
              (Date.now() - callInfo.startTime.getTime()) / 1000
            )}s`,
        });
      }

      this.sockets.delete(callId);
      this.callData.delete(callId);
    });
  }

  private async processLeadFromFunctionCall(callId: string, args: any) {
    const callInfo = this.callData.get(callId);

    const leadPayload: LeadPayload = {
      call_id: callId,
      first_name: args.first_name || args.name?.split(" ")?.[0],
      last_name:
        args.last_name ||
        (args.name ? args.name.split(" ").slice(1).join(" ") : undefined),
      email: args.email,
      phone: args.phone,
      company: args.company || args.company_name,
      source: "phone_call",
      timeline: args.timeline,
      budget: args.budget,
      decision_maker: args.decision_maker,
      project_type: args.project_type,
      pain_points: args.pain_points,
      internal_notes: args.notes || args.conversation_summary,
      tags: args.tags || [],
    };

    // Store in call data
    if (callInfo) {
      callInfo.detectedInfo = { ...callInfo.detectedInfo, ...leadPayload };
    }

    // Save to database immediately
    try {
      const result = await this.saveLead(leadPayload);
      this.log(`Lead saved successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      this.log(`Failed to save lead: ${(error as Error).message}`, "error");
    }
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

  private computeClassification(payload: LeadPayload) {
    const tl = (payload.timeline || "").toString().toLowerCase();
    const bd = (payload.budget || "").toString().toLowerCase();
    const notes = (payload.internal_notes || "").toString().toLowerCase();
    const painPoints = (payload.pain_points || []).join(" ").toLowerCase();

    const namePresent = Boolean(
      payload.first_name || payload.last_name || payload.name
    );
    const emailPresent = Boolean(payload.email);
    const phonePresent = Boolean(payload.phone);
    const dm =
      payload.decision_maker === true ||
      String(payload.decision_maker).toLowerCase() === "yes";

    let score = 0;

    // Decision maker weight (40%)
    if (dm) score += 0.4;

    // Timeline weight (35%)
    if (
      tl.includes("immediate") ||
      tl.includes("urgent") ||
      tl.includes("asap")
    ) {
      score += 0.35;
    } else if (
      tl.includes("within") &&
      (tl.includes("month") || tl.includes("week"))
    ) {
      score += 0.25;
    } else if (tl.includes("2-3 months") || tl.includes("2 months")) {
      score += 0.15;
    } else if (tl.includes("6 months") || tl.includes("year")) {
      score += 0.05;
    }

    // Budget weight (30%)
    if (
      bd.includes("over") ||
      bd.includes("100k") ||
      bd.includes("million") ||
      bd.includes("200k") ||
      bd.includes("500k")
    ) {
      score += 0.3;
    } else if (bd.includes("50k") || bd.includes("50-100")) {
      score += 0.2;
    } else if (bd.includes("10k") || bd.includes("10-50")) {
      score += 0.1;
    }

    // Contact info completeness (10%)
    if (namePresent) score += 0.03;
    if (emailPresent) score += 0.04;
    if (phonePresent) score += 0.03;

    // Pain points indicate seriousness (5% bonus)
    if (payload.pain_points && payload.pain_points.length > 0) {
      score += 0.05;
    }

    // Engagement indicators in notes (5% bonus)
    if (
      notes.includes("ready to start") ||
      notes.includes("need help") ||
      notes.includes("problem") ||
      painPoints.length > 50
    ) {
      score += 0.05;
    }

    // Clamp to 0..1
    score = Math.min(1, Math.max(0, score));
    const qualification_score = Math.round(score * 100) / 100;

    let temperature: "hot" | "mid" | "cold" = "cold";
    if (qualification_score >= 0.7) {
      temperature = "hot";
    } else if (qualification_score >= 0.4) {
      temperature = "mid";
    } else {
      temperature = "cold";
    }

    const confidence = Math.min(
      0.99,
      Math.max(0.1, 0.5 + (qualification_score - 0.5) * 0.8)
    );

    return { temperature, qualification_score, confidence };
  }

  public async saveLead(payload: LeadPayload, userId?: string) {
    const clientId =
      payload.client_id ?? "7bda9e95-0465-47b6-b94c-59bae1dc4079";
    if (!clientId) {
      throw new Error(
        "client_id missing in payload and DEFAULT_CLIENT_ID not set in env."
      );
    }

    const callId = payload.call_id ?? null;
    const incomingFirst = payload.first_name ?? null;
    const incomingLast = payload.last_name ?? null;
    const incomingEmail = payload.email ?? null;
    const incomingPhone = payload.phone ?? null;
    const incomingCompany = payload.company ?? null;
    const incomingSource = payload.source ?? "phone_call";
    const incomingNotes = payload.internal_notes ?? null;

    // Classification
    const cls = this.computeClassification(payload);
    const temperature = cls.temperature;
    const qualification_score = cls.qualification_score;

    this.log(
      `Classifying lead: temperature=${temperature}, score=${qualification_score}`
    );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Find existing lead by email, phone, or call_id
      let existingLead: any = null;
      if (incomingEmail) {
        const r = await client.query(
          "SELECT * FROM leads WHERE email = $1 LIMIT 1",
          [incomingEmail]
        );
        if (r.rowCount) existingLead = r.rows[0];
      }
      if (!existingLead && incomingPhone) {
        const r2 = await client.query(
          "SELECT * FROM leads WHERE phone = $1 LIMIT 1",
          [incomingPhone]
        );
        if (r2.rowCount) existingLead = r2.rows[0];
      }
      if (!existingLead && callId) {
        const r3 = await client.query(
          "SELECT * FROM leads WHERE call_id = $1 LIMIT 1",
          [callId]
        );
        if (r3.rowCount) existingLead = r3.rows[0];
      }

      let leadId: string;
      const now = new Date().toISOString();

      if (existingLead) {
        // Update existing lead
        const changes: Array<{ field: string; old: any; neu: any }> = [];

        const fieldsToCheck = [
          ["first_name", incomingFirst],
          ["last_name", incomingLast],
          ["email", incomingEmail],
          ["phone", incomingPhone],
          ["company", incomingCompany],
          ["source", incomingSource],
          ["internal_notes", incomingNotes],
        ] as Array<[string, any]>;

        for (const [field, newVal] of fieldsToCheck) {
          const oldVal = existingLead[field];
          if (
            newVal !== null &&
            newVal !== undefined &&
            String(newVal) !== String(oldVal) &&
            String(newVal) !== ""
          ) {
            changes.push({ field, old: oldVal, neu: newVal });
          }
        }

        // Merge tags
        let mergedTags = existingLead.tags ?? [];
        if (!Array.isArray(mergedTags)) mergedTags = [];
        if (Array.isArray(payload.tags)) {
          for (const t of payload.tags) {
            if (!mergedTags.includes(t)) mergedTags.push(t);
          }
        }
        const tempTag = `${temperature}-lead`;
        if (!mergedTags.includes(tempTag)) mergedTags.push(tempTag);

        const updQ = `
          UPDATE leads SET
            client_id = $1,
            first_name = COALESCE($2, first_name),
            last_name = COALESCE($3, last_name),
            email = COALESCE($4, email),
            phone = COALESCE($5, phone),
            company = COALESCE($6, company),
            source = COALESCE($7, source),
            qualification_score = $8,
            internal_notes = COALESCE($9, internal_notes),
            temperature = $10,
            tags = $11::jsonb,
            call_id = COALESCE($12, call_id),
            last_contacted_at = now(),
            updated_at = now()
          WHERE id = $13
          RETURNING id;
        `;
        const updVals = [
          clientId,
          incomingFirst,
          incomingLast,
          incomingEmail,
          incomingPhone,
          incomingCompany,
          incomingSource,
          qualification_score,
          incomingNotes,
          temperature,
          JSON.stringify(mergedTags),
          callId,
          existingLead.id,
        ];

        const ures = await client.query(updQ, updVals);
        leadId = ures.rows[0].id;

        // Log changes
        for (const ch of changes) {
          await client.query(
            `INSERT INTO lead_activity_log (lead_id, user_id, action, field_changed, old_value, new_value, notes, created_at)
             VALUES ($1, $2, 'update', $3, $4, $5, $6, now())`,
            [
              leadId,
              userId ?? null,
              ch.field,
              ch.old ?? null,
              ch.neu ?? null,
              incomingNotes ?? null,
            ]
          );
        }

        this.log(
          `Updated lead id=${leadId} => ${temperature} (score: ${qualification_score})`
        );
      } else {
        // Insert new lead
        const initialTags =
          payload.tags && Array.isArray(payload.tags)
            ? payload.tags.slice()
            : [];
        const tempTag = `${temperature}-lead`;
        if (!initialTags.includes(tempTag)) initialTags.push(tempTag);

        const insQ = `
          INSERT INTO leads
            (client_id, call_id, first_name, last_name, email, phone, company, source, 
             qualification_score, internal_notes, temperature, tags, status, 
             last_contacted_at, created_at, updated_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now(), now())
          RETURNING id;
        `;
        const insVals = [
          clientId,
          callId,
          incomingFirst,
          incomingLast,
          incomingEmail,
          incomingPhone,
          incomingCompany,
          incomingSource,
          qualification_score,
          incomingNotes,
          temperature,
          JSON.stringify(initialTags),
          "new",
        ];

        const ires = await client.query(insQ, insVals);
        leadId = ires.rows[0].id;

        // Log creation
        await client.query(
          `INSERT INTO lead_activity_log (lead_id, user_id, action, field_changed, old_value, new_value, notes, created_at)
           VALUES ($1, $2, 'create', NULL, NULL, NULL, $3, now())`,
          [
            leadId,
            userId ?? null,
            `Lead created from phone call. temp=${temperature}`,
          ]
        );

        this.log(
          `Created new lead id=${leadId} => ${temperature} (score: ${qualification_score})`
        );
      }

      // Insert scoring record
      const scoreInt = Math.round(qualification_score * 100);
      const features = {
        timeline: payload.timeline ?? null,
        budget: payload.budget ?? null,
        decision_maker: payload.decision_maker ?? null,
        project_type: payload.project_type ?? null,
        pain_points: payload.pain_points ?? null,
        source: incomingSource,
        method: "phone-call-classification-v1",
        derived_at: now,
      };
      const predictions = { temperature, qualification_score };

      await client.query(
        `INSERT INTO lead_scoring (lead_id, score, features, model_version, confidence, predictions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [
          leadId,
          scoreInt,
          JSON.stringify(features),
          "phone-v1.0",
          cls.confidence,
          JSON.stringify(predictions),
        ]
      );

      await client.query("COMMIT");

      return {
        lead_id: leadId,
        temperature,
        qualification_score,
        confidence: cls.confidence,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      this.log(`Failed to save lead: ${(err as Error).message}`, "error");
      throw err;
    } finally {
      client.release();
    }
  }

  closeConnection(callId: string): void {
    const ws = this.sockets.get(callId);
    if (ws) {
      ws.close();
      this.sockets.delete(callId);
      this.log(`Manually closed connection for call ${callId}`);
    }
    this.callData.delete(callId);
  }

  closeAllConnections(): void {
    this.sockets.forEach((ws, callId) => {
      ws.close();
      this.log(`Closed connection for call ${callId}`);
    });
    this.sockets.clear();
    this.callData.clear();
  }
}

export const phoneService = new PhoneService();
export default PhoneService;
