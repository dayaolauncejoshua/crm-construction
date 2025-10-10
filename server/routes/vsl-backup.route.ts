import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import { vsls, clients } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// GET all VSLs for a client
router.get("/api/vsls/:clientId", async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const vslList = await db
      .select()
      .from(vsls)
      .where(eq(vsls.clientId, clientId))
      .orderBy(desc(vsls.createdAt));

    res.json(vslList);
  } catch (error) {
    console.error("Error fetching VSLs:", error);
    res.status(500).json({ message: "Failed to fetch VSLs" });
  }
});

// GET single VSL
router.get(
  "/api/vsls/:clientId/:vslId",
  async (req: Request, res: Response) => {
    try {
      const { clientId, vslId } = req.params;

      const [vsl] = await db
        .select()
        .from(vsls)
        .where(and(eq(vsls.id, vslId), eq(vsls.clientId, clientId)));

      if (!vsl) {
        return res.status(404).json({ message: "VSL not found" });
      }

      res.json(vsl);
    } catch (error) {
      console.error("Error fetching VSL:", error);
      res.status(500).json({ message: "Failed to fetch VSL" });
    }
  }
);

// POST - Generate new VSL
router.post("/api/vsls", async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      title,
      niche,
      targetAudience,
      painPoints,
      solution,
      proofElements,
    } = req.body;

    // Validate required fields
    if (!clientId || !title || !niche) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate script using Claude
    const script = await generateVSLScript({
      niche,
      targetAudience,
      painPoints,
      solution,
      proofElements,
    });

    // Create VSL record
    const [newVSL] = await db
      .insert(vsls)
      .values({
        clientId,
        title,
        script,
        isActive: true,
      })
      .returning();

    // Start video generation in background (don't await)
    generateVideoInBackground(newVSL.id, script).catch(console.error);

    res.status(201).json(newVSL);
  } catch (error) {
    console.error("Error creating VSL:", error);
    res.status(500).json({ message: "Failed to create VSL" });
  }
});

// Helper: Generate VSL script using Claude
async function generateVSLScript(params: {
  niche: string;
  targetAudience?: string;
  painPoints?: string;
  solution?: string;
  proofElements?: string;
}) {
  const prompt = `You are an expert VSL (Video Sales Letter) scriptwriter. Create a compelling, conversion-focused video script for the following:

**Target Niche:** ${params.niche}
**Target Audience:** ${params.targetAudience || "Business owners in this niche"}
**Pain Points:** ${params.painPoints || "Common industry challenges"}
**Solution:** ${params.solution || "AI-powered automation and lead generation"}
**Proof Elements:** ${params.proofElements || "Proven results and testimonials"}

Create a 2-3 minute VSL script that follows this structure:
1. **Hook (5-10 seconds)**: Grab attention with a bold claim or question
2. **Problem Agitation (30-45 seconds)**: Emphasize pain points
3. **Solution Introduction (30 seconds)**: Present the solution
4. **How It Works (45 seconds)**: Explain the process simply
5. **Proof & Results (30 seconds)**: Share results and social proof
6. **Call to Action (15-20 seconds)**: Clear next step

Requirements:
- Write in a conversational, engaging tone
- Use "you" language to speak directly to the viewer
- Include emotional triggers and urgency
- Make it scannable with clear sections
- Keep sentences short and punchy
- End with a strong CTA

Format the script with clear scene markers like [SCENE 1: Hook] and include visual suggestions in brackets like [Show: graph going up].`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const scriptContent = message.content[0];
  return scriptContent.type === "text" ? scriptContent.text : "";
}

// Helper: Generate video in background (placeholder for now)
async function generateVideoInBackground(vslId: string, script: string) {
  // This is where you'd integrate with a video generation service
  // For now, we'll simulate video generation

  console.log(`Starting video generation for VSL ${vslId}...`);

  // Simulate video generation delay
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // For MVP, we'll just add a placeholder video URL
  // In production, integrate with services like:
  // - Synthesia (AI avatar videos)
  // - D-ID (talking head videos)
  // - Pictory (text-to-video)
  // - Custom TTS + stock footage

  const placeholderVideoUrl = `https://example.com/videos/${vslId}.mp4`;
  const placeholderThumbnail = `https://example.com/thumbnails/${vslId}.jpg`;

  await db
    .update(vsls)
    .set({
      videoUrl: placeholderVideoUrl,
      thumbnailUrl: placeholderThumbnail,
      duration: 180, // 3 minutes
      updatedAt: new Date(),
    })
    .where(eq(vsls.id, vslId));

  console.log(`Video generation completed for VSL ${vslId}`);
}

// DELETE VSL
router.delete(
  "/api/vsls/:clientId/:vslId",
  async (req: Request, res: Response) => {
    try {
      const { clientId, vslId } = req.params;

      await db
        .delete(vsls)
        .where(and(eq(vsls.id, vslId), eq(vsls.clientId, clientId)));

      res.json({ message: "VSL deleted successfully" });
    } catch (error) {
      console.error("Error deleting VSL:", error);
      res.status(500).json({ message: "Failed to delete VSL" });
    }
  }
);

export default router;
