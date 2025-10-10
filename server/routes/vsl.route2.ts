import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import { vsls, clients } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import OpenAI from "openai";
import axios from "axios";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2 || "",
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

    if (!clientId || !title || !niche) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate script using OpenAI (GPT)
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

// Helper: Generate VSL script using OpenAI GPT
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

Create a 2–3 minute VSL script that follows this structure:
1. **Hook (5–10 seconds)**: Grab attention with a bold claim or question
2. **Problem Agitation (30–45 seconds)**: Emphasize pain points
3. **Solution Introduction (30 seconds)**: Present the solution
4. **How It Works (45 seconds)**: Explain the process simply
5. **Proof & Results (30 seconds)**: Share results and social proof
6. **Call to Action (15–20 seconds)**: Clear next step

Requirements:
- Write in a conversational, engaging tone
- Use "you" language to speak directly to the viewer
- Include emotional triggers and urgency
- Make it scannable with clear sections
- Keep sentences short and punchy
- End with a strong CTA

Format the script with clear scene markers like [SCENE 1: Hook] and include visual suggestions in brackets like [Show: graph going up].`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // fast + affordable, change to "gpt-4o" for higher quality
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || "";
}

// Helper: Generate video in background (placeholder)
async function generateVideoInBackground(vslId: string, script: string) {
  console.log(`Starting video generation for VSL ${vslId}...`);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const placeholderVideoUrl = `https://example.com/videos/${vslId}.mp4`;
  const placeholderThumbnail = `https://example.com/thumbnails/${vslId}.jpg`;

  await db
    .update(vsls)
    .set({
      videoUrl: placeholderVideoUrl,
      thumbnailUrl: placeholderThumbnail,
      duration: 180,
      updatedAt: new Date(),
    })
    .where(eq(vsls.id, vslId));

  console.log(`Video generation completed for VSL ${vslId}`);
}

// async function generateVideoInBackground(vslId: string, script: string) {
//   console.log(`🎬 Starting real video generation for VSL ${vslId}...`);

//   try {
//     // Step 1. Send request to HeyGen API to create a video
//     const response = await axios.post(
//       "https://api.heygen.com/v1/video/generate",
//       {
//         // Choose your video parameters here
//         video_title: "VSL Video",
//         caption: false,
//         video_inputs: [
//           {
//             character: {
//               type: "avatar",
//               avatar_id: "Alex", // change to your preferred HeyGen avatar
//               voice_id: "en_us_male1", // you can change voice later
//               script: {
//                 type: "text",
//                 input_text: script,
//               },
//             },
//           },
//         ],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.HEYGEN_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const videoId = response.data.data.video_id;
//     console.log(`🎥 HeyGen video job started: ${videoId}`);

//     // Step 2. Poll until the video is ready
//     let videoUrl = "";
//     for (let i = 0; i < 30; i++) {
//       // checks up to 30 times (~3-5 min)
//       await new Promise((r) => setTimeout(r, 10000)); // wait 10s
//       const statusRes = await axios.get(
//         `https://api.heygen.com/v1/video/status?video_id=${videoId}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.HEYGEN_API_KEY}`,
//           },
//         }
//       );
//       const status = statusRes.data.data.status;
//       console.log(`📊 Video status: ${status}`);
//       if (status === "completed") {
//         videoUrl = statusRes.data.data.video_url;
//         break;
//       }
//     }

//     // Step 3. Update DB with final URLs
//     if (videoUrl) {
//       await db
//         .update(vsls)
//         .set({
//           videoUrl,
//           thumbnailUrl: "https://example.com/thumbnail.jpg", // optional
//           duration: 180,
//           updatedAt: new Date(),
//         })
//         .where(eq(vsls.id, vslId));

//       console.log(`✅ Video generation complete for VSL ${vslId}`);
//     } else {
//       console.warn(`⚠️ Video not finished after waiting`);
//     }
//   } catch (error) {
//     console.error("❌ Error generating HeyGen video:", error);
//   }
// }

// async function generateVideoInBackground(vslId: string, script: string) {
//   try {
//     const response = await axios.post(
//       "https://api.heygen.com/v2/video/generate",
//       {
//         video_inputs: [
//           {
//             character: {
//               type: "avatar",
//               avatar_id: "Daisy-inskirt-20220818",
//               avatar_style: "normal",
//             },
//             voice: {
//               type: "text",
//               input_text: script,
//               voice_id: "your_valid_voice_id",
//             },
//             background: {
//               type: "color",
//               value: "#FFFFFF",
//             },
//           },
//         ],
//         dimension: {
//           width: 1280,
//           height: 720,
//         },
//       },
//       {
//         headers: {
//           "X-Api-Key": process.env.HEYGEN_API_KEY || "",
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const videoId = response.data.data.video_id;
//     console.log("Video job started:", videoId);

//     // Poll for status (use the status endpoint)
//     for (let i = 0; i < 30; i++) {
//       await new Promise((r) => setTimeout(r, 10000));
//       const statusRes = await axios.get(
//         `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
//         {
//           headers: {
//             "X-Api-Key": process.env.HEYGEN_API_KEY || "",
//           },
//         }
//       );
//       const status = statusRes.data.data.status;
//       console.log("Video status:", status);
//       if (status === "completed") {
//         const videoUrl = statusRes.data.data.video_url;
//         await db
//           .update(vsls)
//           .set({
//             videoUrl,
//             thumbnailUrl: statusRes.data.data.thumbnail_url,
//             duration: statusRes.data.data.duration,
//             updatedAt: new Date(),
//           })
//           .where(eq(vsls.id, vslId));
//         console.log("Video generation done for", vslId);
//         break;
//       }
//     }
//   } catch (err: any) {
//     console.error("Error generating HeyGen video:", err);
//   }
// }

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
