// server/routes/browser-test.route.ts
import { Router, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "../db";
import { leads, conversations, messages } from "../../shared/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
const router = Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: "No clientId provided" });
    }

    try {
      console.log("Browser test: Received audio file...");

      // 1. CONVERT SPEECH TO TEXT (Whisper)
      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
      await fs.promises.writeFile(tempFilePath, req.file.buffer);

      const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
      });

      await fs.promises.unlink(tempFilePath);
      console.log("Browser test: User said:", transcription.text);

      // 2. GET AI RESPONSE (Chat Completions)
      // ⭐ UPDATED INSTRUCTIONS
      const instructions = `You are a professional lead qualification assistant for a business.

Your goal is to gather specific personal information from the user's statement and provide a conversational response.

1.  Analyze their statement to extract the following specific fields:
    -   firstName: (e.g., "John")
    -   lastName: (e.g., "Doe")
    -   email: (e.g., "john@example.com")
    -   phone: (e.g., "555-123-4567")
    -   company: (e.g., "Acme Inc.")
    -   summary: (A brief summary of their request, e.g., "Needs 200 custom jerseys for a team.")
    -   temperature: Assess their buying intent ("hot", "warm", "cold", or "unqualified").

2.  Provide a conversational text response.
3.  If they provide only a partial name (e.g., "Alex"), put it in "firstName" and leave "lastName" as null.
4.  If any information is not provided, the JSON value *must* be null.

**CRITICAL OUTPUT FORMAT:**
You MUST provide your response in two parts separated by 'LEAD_DATA::'.
Part 1: Your conversational text response to the user.
Part 2: A single-line JSON object with the *exact* fields requested.

**Example 1:**
User says: "Hi, this is Jane Smith from Smith Construction. My email is jane@smith.com. We need a quote for a new website."
Your Response:
"Hi Jane, thanks for reaching out! Smith Construction sounds great. I can definitely help with that. To get the quote right, could you tell me a bit about the features you're looking for on the new website?
LEAD_DATA::{"firstName":"Jane","lastName":"Smith","email":"jane@smith.com","phone":null,"company":"Smith Construction","summary":"Needs a quote for a new website.","temperature":"warm"}"

**Example 2:**
User says: "Hey, I'm just looking around."
Your Response:
"No problem! We're here if you have any questions. We specialize in custom web design and marketing. Is there anything in particular you were curious about?
LEAD_DATA::{"firstName":null,"lastName":null,"email":null,"phone":null,"company":null,"summary":"User is just looking around.","temperature":"cold"}"
`;

      const chatResponse = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: transcription.text },
        ],
      });

      const aiFullResponse = chatResponse.choices[0].message.content;
      if (!aiFullResponse) {
        throw new Error("AI returned no text response.");
      }

      // 5. Parse the response into speech and data
      let aiResponseText: string;
      let leadData: any = {};
      const parts = aiFullResponse.split("LEAD_DATA::");

      aiResponseText = parts[0].trim();
      if (parts[1]) {
        try {
          leadData = JSON.parse(parts[1]);
        } catch (e) {
          console.error("Browser test: Failed to parse lead data JSON", e);
        }
      }

      console.log("Browser test: AI says:", aiResponseText);
      console.log("Browser test: Lead data:", leadData); // ⭐ Check this log!

      // 6. Save conversation to DB (async, don't wait for it)
      saveConversation(
        clientId,
        transcription.text,
        aiResponseText,
        leadData // ⭐ Pass the new structured data
      ).catch((e) => {
        console.error("Browser test: Failed to save conversation:", e);
      });

      // 3. CONVERT TEXT TO SPEECH (TTS)
      const speechResponse = await client.audio.speech.create({
        model: "tts-1",
        voice: "coral",
        input: aiResponseText,
        response_format: "mp3",
      });

      console.log("Browser test: Sending audio response...");

      // 4. SEND AUDIO BACK TO BROWSER
      const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (e) {
      const error = e as Error;
      console.error("Browser test error:", error.message);
      res
        .status(500)
        .json({ error: "Failed to process audio", message: error.message });
    }
  }
);

// ⭐ UPDATED SAVE FUNCTION
async function saveConversation(
  clientId: string,
  userText: string,
  aiText: string,
  leadData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    temperature?: string;
    summary?: string;
  }
) {
  try {
    console.log("--- 💾 [DB Save Start] ---");
    let lead: typeof leads.$inferSelect | undefined;
    const { firstName, lastName, email, phone, company, temperature, summary } =
      leadData;
    console.log(
      `[DB] Checking for lead with ClientID: ${clientId}, Email: ${email}, Phone: ${phone}`
    );

    // 1. Find existing lead by email or phone for this client
    if (email) {
      lead = await db.query.leads.findFirst({
        where: and(eq(leads.email, email), eq(leads.clientId, clientId)),
      });
    } else if (phone) {
      lead = await db.query.leads.findFirst({
        where: and(eq(leads.phone, phone), eq(leads.clientId, clientId)),
      });
    }

    let leadId: string;

    // Logic for setting lead 'status' based on 'temperature'
    let leadStatus = "new"; // Default
    if (temperature === "hot" || temperature === "warm") {
      leadStatus = "qualified";
    }
    if (temperature === "unqualified") {
      leadStatus = "lost";
    }

    if (lead) {
      // 2a. Update existing lead
      leadId = lead.id;
      console.log(`[DB] Found existing lead. Updating Lead ID: ${leadId}`);
      await db
        .update(leads)
        .set({
          firstName: firstName || lead.firstName, // Only update if new data exists
          lastName: lastName || lead.lastName,
          phone: phone || lead.phone,
          company: company || lead.company,
          status: leadStatus, // Always update status
          temperature: temperature || lead.temperature, // Always update temp
          internalNotes: summary
            ? `${lead.internalNotes || ""}\n[Test Call]: ${summary}`
            : lead.internalNotes,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
      console.log(`[DB] ✅ Lead ${leadId} updated.`);
    } else {
      // 2b. Create new lead
      console.log("[DB] No existing lead found. Creating new lead...");

      // If email is null, create a unique placeholder to satisfy the NOT NULL constraint
      const leadEmail = email || `no-email-${randomUUID()}@placeholder.com`;

      const newLead = await db
        .insert(leads)
        .values({
          clientId,
          email: leadEmail, // <--- Use the new variable
          phone: phone || null,
          firstName: firstName || "Test Lead",
          lastName: lastName || null,
          company: company || null,
          status: leadStatus,
          temperature: temperature || "cold",
          source: "browser-test",
          internalNotes: summary ? `[Test Call]: ${summary}` : "New test lead",
        })
        .returning({ id: leads.id });
      leadId = newLead[0].id;
      console.log(`[DB] ✅ New lead created. Lead ID: ${leadId}`);
    }

    // 3. Find or create a conversation for this lead
    console.log(
      `[DB] Checking for 'browser-test' conversation for Lead ID: ${leadId}`
    );
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.leadId, leadId),
        eq(conversations.channel, "browser-test")
      ),
    });

    let conversationId: string;

    if (conversation) {
      conversationId = conversation.id;
      console.log(
        `[DB] Found existing conversation. Conversation ID: ${conversationId}`
      );
    } else {
      console.log(
        "[DB] No existing conversation. Creating new conversation..."
      );
      const newConversation = await db
        .insert(conversations)
        .values({
          leadId,
          clientId,
          channel: "browser-test",
          status: "active",
        })
        .returning({ id: conversations.id });
      conversationId = newConversation[0].id;
      console.log(
        `[DB] ✅ New conversation created. Conversation ID: ${conversationId}`
      );
    }

    // 4. Insert the two new messages
    console.log(
      `[DB] Inserting 2 messages into Conversation ID: ${conversationId}`
    );
    await db.insert(messages).values([
      {
        conversationId,
        content: userText,
        sender: "lead",
        channel: "browser-test",
        sentAt: new Date(),
      },
      {
        conversationId,
        content: aiText,
        sender: "ai",
        channel: "browser-test",
        sentAt: new Date(),
      },
    ]);
    console.log("[DB] ✅ Messages inserted.");
    console.log(`[DB] Successfully saved conversation for lead ${leadId}`);
    console.log("--- 💾 [DB Save Complete] ---");
  } catch (error) {
    console.error("Database save error in saveConversation:", error);
    console.log("--- ❌ [DB Save Failed] ---");
  }
}

export default router;
