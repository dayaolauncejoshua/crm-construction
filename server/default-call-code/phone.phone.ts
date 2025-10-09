// src/phone/phone.phone.ts
import WebSocket from "ws";
import axios from "axios";
import type { RealtimeAudioFormats } from "openai/resources/realtime/realtime.js";
import { pool } from "../db"; // adjust path if needed
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
}

interface AcceptCallOptions {
  instructions?: string;
  model?: string;
}

type LeadPayload = {
  client_id?: string; // REQUIRED or DEFAULT_CLIENT_ID must be set
  call_id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  qualification_score?: number; // 0.0 - 1.0
  internal_notes?: string;
  timeline?: string;
  budget?: string;
  decision_maker?: boolean | string;
  tags?: string[]; // optional list of tag names to add to leads.tags JSONB
};

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

  // ---------- existing accept/connect logic ----------
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
        `You are a professional lead qualification assistant for a construction company...`,
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

      const responseCreate = {
        type: "response.create",
        response: {
          instructions: `Greet the user and ask them what they need assistance with...`,
        },
      };

      ws.send(JSON.stringify(responseCreate));
    });

    ws.on("message", async (data) => {
      try {
        const text = data.toString();
        this.log(`WebSocket message (${callId}): ${text}`, "debug");

        // Try parse JSON message
        let obj: any = null;
        try {
          obj = JSON.parse(text);
        } catch (_) {
          obj = null;
        }

        // 1) Try to detect a function_call style payload
        try {
          const func =
            obj?.response?.function_call ||
            obj?.response?.content?.find?.(
              (c: any) => c.type === "function_call"
            ) ||
            obj?.function_call;

          const argsRaw = func?.arguments || func?.payload || func?.text;
          if (argsRaw) {
            let payloadAny: any = argsRaw;
            if (typeof argsRaw === "string") {
              try {
                payloadAny = JSON.parse(argsRaw);
              } catch {}
            }
            // Normalize recognized fields and call saveLead
            if (
              payloadAny &&
              (payloadAny.email || payloadAny.phone || payloadAny.name)
            ) {
              const normalized: LeadPayload = {
                call_id: callId,
                client_id: payloadAny.client_id, // optional — otherwise use DEFAULT_CLIENT_ID
                first_name:
                  payloadAny.first_name || payloadAny.name?.split?.(" ")?.[0],
                last_name:
                  payloadAny.last_name ||
                  (payloadAny.name
                    ? payloadAny.name.split(" ").slice(1).join(" ")
                    : undefined),
                email: payloadAny.email,
                phone: payloadAny.phone,
                company: payloadAny.company || payloadAny.company_name,
                source: payloadAny.source || "call",
                qualification_score:
                  payloadAny.qualification_score !== undefined
                    ? Number(payloadAny.qualification_score)
                    : undefined,
                internal_notes:
                  payloadAny.notes || payloadAny.transcript || undefined,
                timeline: payloadAny.timeline,
                budget: payloadAny.budget,
                decision_maker:
                  payloadAny.decision_maker ?? payloadAny.decisionMaker,
                tags: payloadAny.tags || undefined,
              };
              await this.saveLead(normalized);
              return;
            }
          }
        } catch (err) {
          this.log(
            `Error processing function_call payload: ${(err as Error).message}`,
            "error"
          );
        }

        // 2) Fallback: parse any JSON block inside text
        const jsonMatch = text.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            const payloadAny = JSON.parse(jsonMatch[1]);
            if (
              payloadAny &&
              (payloadAny.email || payloadAny.phone || payloadAny.name)
            ) {
              const normalized: LeadPayload = {
                call_id: callId,
                client_id: payloadAny.client_id,
                first_name:
                  payloadAny.first_name || payloadAny.name?.split?.(" ")?.[0],
                last_name:
                  payloadAny.last_name ||
                  (payloadAny.name
                    ? payloadAny.name.split(" ").slice(1).join(" ")
                    : undefined),
                email: payloadAny.email,
                phone: payloadAny.phone,
                company: payloadAny.company,
                source: payloadAny.source || "call",
                qualification_score: payloadAny.qualification_score
                  ? Number(payloadAny.qualification_score)
                  : undefined,
                internal_notes: payloadAny.notes,
                timeline: payloadAny.timeline,
                budget: payloadAny.budget,
                decision_maker: payloadAny.decision_maker,
                tags: payloadAny.tags,
              };
              await this.saveLead(normalized);
              return;
            }
          } catch (err) {
            // ignore parse errors
          }
        }
      } catch (e) {
        const error = e as Error;
        this.log(
          `Failed to parse/process WebSocket message for ${callId}: ${error.message}`,
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

  // ---------- classification + persistence ----------
  private computeClassification(payload: LeadPayload) {
    // Returns { temperature, qualification_score (0..1), confidence (0..1) }
    const tl = (payload.timeline || payload.internal_notes || "")
      .toString()
      .toLowerCase();
    const bd = (payload.budget || "").toString().toLowerCase();
    const namePresent = Boolean(
      payload.first_name || payload.last_name || payload.name
    );
    const emailPresent = Boolean(payload.email);
    const phonePresent = Boolean(payload.phone);
    const dm =
      payload.decision_maker === true ||
      String(payload.decision_maker).toLowerCase() === "yes";

    let score = 0;

    if (dm) score += 0.4;
    if (
      tl.includes("immediate") ||
      tl.includes("within a month") ||
      tl.includes("urgent")
    )
      score += 0.35;
    if (
      bd.includes("over") ||
      bd.includes("50k") ||
      bd.includes("1m") ||
      bd.includes("million")
    )
      score += 0.3;
    if (namePresent) score += 0.05;
    if (emailPresent || phonePresent) score += 0.1;

    // clamp to 0..1
    if (score > 1) score = 1;
    const qualification_score = Math.round(score * 100) / 100; // numeric(3,2) style

    let temperature: "hot" | "mid" | "cold" = "cold";
    if (qualification_score >= 0.8) temperature = "hot";
    else if (qualification_score >= 0.25) temperature = "mid";
    else temperature = "cold";

    const confidence = Math.min(
      0.99,
      Math.max(0.05, 0.5 + (qualification_score - 0.5) * 0.8)
    ); // heuristic

    return { temperature, qualification_score, confidence };
  }

  /**
   * Upsert lead (match by email -> phone), log changes in lead_activity_log,
   * insert a lead_scoring entry, update tags JSONB (if provided).
   *
   * payload.client_id is required or DEFAULT_CLIENT_ID must be set in env.
   */
  public async saveLead(payload: LeadPayload, userId?: string) {
    const clientId = payload.client_id ?? process.env.DEFAULT_CLIENT_ID;
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
    const incomingSource = payload.source ?? "call";
    const incomingNotes = payload.internal_notes ?? null;

    // Classification
    const cls = this.computeClassification(payload);
    const temperature = cls.temperature;
    const qualification_score = cls.qualification_score;

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Find existing lead by email, then phone
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
      // If call_id exists, try match by call_id first (if column exists)
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
        // Build change log entries array
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

        // tags: merge JSON arrays (leads.tags is JSONB default '[]')
        let mergedTags = existingLead.tags ?? [];
        if (!Array.isArray(mergedTags)) mergedTags = [];
        if (Array.isArray(payload.tags)) {
          for (const t of payload.tags) {
            if (!mergedTags.includes(t)) mergedTags.push(t);
          }
        }
        // Also add temperature tag if not present
        const tempTag = `${temperature}-lead`;
        if (!mergedTags.includes(tempTag)) mergedTags.push(tempTag);

        // update query
        const updQ = `
          UPDATE leads SET
            client_id = $1,
            first_name = COALESCE($2, first_name),
            last_name  = COALESCE($3, last_name),
            email      = COALESCE($4, email),
            phone      = COALESCE($5, phone),
            company    = COALESCE($6, company),
            source     = COALESCE($7, source),
            qualification_score = $8,
            internal_notes = COALESCE($9, internal_notes),
            temperature = $10,
            tags = $11::jsonb,
            call_id = COALESCE($12, call_id),
            updated_at = now()
          WHERE id = $13
          RETURNING id, email, phone, tags;
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

        // Insert activity logs for each change detected
        for (const ch of changes) {
          await client.query(
            `INSERT INTO lead_activity_log (lead_id, user_id, action, field_changed, old_value, new_value, notes, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7, now())`,
            [
              leadId,
              userId ?? null,
              "update",
              ch.field,
              ch.old ?? null,
              ch.neu ?? null,
              incomingNotes ?? null,
            ]
          );
        }

        // If tags changed (we added temperature tag or incoming tags), add a log
        await client.query(
          `INSERT INTO lead_activity_log (lead_id, user_id, action, field_changed, old_value, new_value, notes, created_at)
           VALUES ($1,$2,'tags_update','tags', $3, $4, $5, now())`,
          [
            leadId,
            userId ?? null,
            JSON.stringify(existingLead.tags ?? []),
            JSON.stringify(mergedTags),
            "tags merged/temperature tag added",
          ]
        );

        this.log(
          `Updated existing lead id=${leadId} => temperature=${temperature}`
        );
      } else {
        // Insert new lead
        const insQ = `
          INSERT INTO leads
            (client_id, call_id, first_name, last_name, email, phone, company, source, qualification_score, internal_notes, temperature, tags, created_at, updated_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
          RETURNING id;
        `;
        const initialTags =
          payload.tags && Array.isArray(payload.tags)
            ? payload.tags.slice()
            : [];
        const tempTag = `${temperature}-lead`;
        if (!initialTags.includes(tempTag)) initialTags.push(tempTag);

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
        ];

        const ires = await client.query(insQ, insVals);
        leadId = ires.rows[0].id;

        // log creation
        await client.query(
          `INSERT INTO lead_activity_log (lead_id, user_id, action, field_changed, old_value, new_value, notes, created_at)
           VALUES ($1,$2,'create',NULL,NULL,NULL,$3, now())`,
          [
            leadId,
            userId ?? null,
            `Lead created from call. temp=${temperature}`,
          ]
        );

        this.log(
          `Inserted new lead id=${leadId} => temperature=${temperature}`
        );
      }

      // 3) Insert a scoring record in lead_scoring
      // lead_scoring columns: id PK default gen_random_uuid(), lead_id, score (integer not null), features JSONB not null, model_version varchar default 'v1.0', confidence numeric(3,2), predictions JSONB, created_at
      const scoreInt = Math.round(qualification_score * 100); // 0..100 integer
      const features = {
        timeline: payload.timeline ?? null,
        budget: payload.budget ?? null,
        decision_maker: payload.decision_maker ?? null,
        source: payload.source ?? incomingSource,
        method: "heuristic-v1",
        derived_at: now,
      };
      const predictions = { temperature, qualification_score };

      await client.query(
        `INSERT INTO lead_scoring (lead_id, score, features, model_version, confidence, predictions, created_at)
         VALUES ($1,$2,$3,$4,$5,$6, now())`,
        [
          leadId,
          scoreInt,
          JSON.stringify(features),
          "heuristic-v1",
          cls.confidence,
          JSON.stringify(predictions),
        ]
      );

      await client.query("COMMIT");
      return { lead_id: leadId, temperature, qualification_score };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      this.log(
        `Failed to save/upsert lead: ${(err as Error).message}`,
        "error"
      );
      throw err;
    } finally {
      client.release();
    }
  }

  // optional close helpers
  closeConnection(callId: string): void {
    const ws = this.sockets.get(callId);
    if (ws) {
      ws.close();
      this.sockets.delete(callId);
      this.log(`Manually closed connection for call ${callId}`);
    }
  }

  closeAllConnections(): void {
    this.sockets.forEach((ws, callId) => {
      ws.close();
      this.log(`Closed connection for call ${callId}`);
    });
    this.sockets.clear();
  }
}

export const phoneService = new PhoneService();
export default PhoneService;
