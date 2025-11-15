// server/routes/browser-test.route.ts
import { Router, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";

const router = Router();

// Configure OpenAI client (it will use OPENAI_API_KEY2 from your env)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Define the POST endpoint for handling the call
router.post(
  "/",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    try {
      console.log("Browser test: Received audio file...");

      // 1. CONVERT SPEECH TO TEXT (Whisper)
      // We must save the buffer to a temporary file for Whisper
      const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
      await fs.promises.writeFile(tempFilePath, req.file.buffer);

      const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
      });

      // Clean up the temp file
      await fs.promises.unlink(tempFilePath);

      console.log("Browser test: User said:", transcription.text);

      // 2. GET AI RESPONSE (Chat Completions)
      // ⭐ We copy the *exact same* instructions from your phone.phone.ts
      const instructions = `You are a professional lead qualification assistant for a construction company.

Your goal is to gather important information while being conversational and helpful:
1. Greet the caller warmly.
2. Ask what type of project they're interested in.
3. Gather key qualification information naturally:
   - Their name and company (if applicable)
   - Contact information (phone/email)
   - Project timeline (when do they need it done?)
   - Budget range (what are they looking to invest?)
   - Decision-making authority (are they the decision maker?)
   - Specific pain points or requirements

Be conversational and empathetic. Don't make it feel like an interrogation.

When you've gathered sufficient information, summarize the details for the user and ask if they'd like a project manager to call them back.`;

      const chatResponse = await client.chat.completions.create({
        model: "gpt-4o", // Use your preferred chat model
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: transcription.text },
        ],
      });

      const aiResponseText = chatResponse.choices[0].message.content;
      if (!aiResponseText) {
        throw new Error("AI returned no text response.");
      }

      console.log("Browser test: AI says:", aiResponseText);

      // 3. CONVERT TEXT TO SPEECH (TTS)
      // We use the same 'coral' voice from your phone.phone.ts
      const speechResponse = await client.audio.speech.create({
        model: "tts-1",
        voice: "coral",
        input: aiResponseText,
        response_format: "mp3", // mp3 is easy for browsers
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

export default router;
