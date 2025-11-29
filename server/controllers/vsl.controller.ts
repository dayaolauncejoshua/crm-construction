// server/controllers/vsl.controller.ts
import { Request, Response } from "express";
import { storage } from "../storage";
import { vslGenerator } from "../services/vsl-generator";
import { generateVSLScript } from "../services/claude";
import { cloudinaryService } from "../services/cloudinary.service";

// Get all VSLs for a client
export const getClientId = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    console.log("📋 Fetching VSLs for client:", clientId);

    // ✅ FIX: Use the correct method name
    const vsls = await storage.getVSLsByClient(clientId);

    res.json(vsls);
  } catch (error: any) {
    console.error("❌ Error fetching VSLs:", error);
    res.status(500).json({
      message: "Failed to fetch VSLs",
      error: error.message,
    });
  }
};

// Create new VSL
export const createVSL = async (req: Request, res: Response) => {
  try {
    const {
      title,
      niche,
      clientId,
      targetDuration,
      subtitleType,
      targetAudience,
      painPoints,
      solution,
      proofElements,
    } = req.body;

    // Validate and normalize duration
    const validDurations = ["30s", "1min", "2min", "3min", "5min"] as const;
    const normalizedDuration = validDurations.includes(targetDuration)
      ? targetDuration
      : "2min";

    const validSubtitleTypes = ["none", "traditional", "karaoke"] as const;
    const normalizedSubtitleType = validSubtitleTypes.includes(subtitleType)
      ? subtitleType
      : "none";

    console.log("🎬 Creating new VSL:", {
      title,
      niche,
      clientId,
      targetDuration: normalizedDuration,
    });

    // Validate required fields
    if (!title || !niche || !clientId) {
      return res.status(400).json({
        message: "Missing required fields: title, niche, clientId",
      });
    }

    // Step 1: Generate script using Claude Sonnet 4.5
    console.log(`📝 Generating ${normalizedDuration} VSL script...`);

    const script = await generateVSLScript(niche, {
      targetAudience: targetAudience || `${niche} business owners`,
      painPoints: painPoints || `Common challenges in ${niche}`,
      solution: solution || "AI-powered lead generation system",
      proofElements: proofElements || "Proven results and case studies",
      duration: normalizedDuration, // ✅ NEW: Pass duration to script generator
    });

    const wordCount = script.split(/\s+/).filter(w => w.length > 0).length;
console.log("✅ Script generated:", script.substring(0, 100) + "...");
console.log(`📊 Script length: ${wordCount} words for ${normalizedDuration}`);

// ✅ Validate word count is within acceptable range
const maxWordCounts = {
  "30s": 150,
  "1min": 180,
  "2min": 350,
  "3min": 550,
  "5min": 900
};

const maxWords = maxWordCounts[normalizedDuration as keyof typeof maxWordCounts] || 350;
if (wordCount > maxWords * 1.2) { // Allow 20% buffer
  console.warn(`⚠️ Script too long! ${wordCount} words exceeds ${maxWords} max for ${normalizedDuration}`);
  console.warn(`⚠️ Expected duration may be longer than requested`);
}

    // Step 2: Create VSL record in database
    const vsl = await storage.createVSL({
      clientId,
      title,
      script,
      targetDuration: normalizedDuration,
      subtitleType: normalizedSubtitleType,
      isActive: true,
    });

    console.log("✅ VSL record created:", vsl.id);

    // Step 3: Start video generation in background (non-blocking)
    generateVideoAsync(
      vsl.id,
      script,
      title,
      clientId,
      niche,
      normalizedDuration,
      normalizedSubtitleType
    );

    // Return immediately with VSL ID
    res.json({
      success: true,
      vsl,
      message: `VSL creation started. ${normalizedDuration} video will be ready in 5-10 minutes.`,
    });
  } catch (error: any) {
    console.error("❌ Error creating VSL:", error);
    res.status(500).json({
      message: "Failed to create VSL",
      error: error.message,
    });
  }
};

// Get single VSL
export const getSingleVSL = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;

    const vsl = await storage.getVSL(vslId);

    if (!vsl) {
      return res.status(404).json({ message: "VSL not found" });
    }

    res.json(vsl);
  } catch (error: any) {
    console.error("❌ Error fetching VSL:", error);
    res.status(500).json({
      message: "Failed to fetch VSL",
      error: error.message,
    });
  }
};

// Update VSL
export const updateVSL = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;
    const updateData = req.body;

    console.log(`📝 Updating VSL: ${vslId}`);

    const updatedVSL = await storage.updateVSL(vslId, updateData);

    res.json(updatedVSL);
  } catch (error: any) {
    console.error("❌ Error updating VSL:", error);
    res.status(500).json({
      message: "Failed to update VSL",
      error: error.message,
    });
  }
};

// Delete VSL
export const deleteVSL = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;

    console.log(`🗑️ Deleting VSL: ${vslId}`);

    // Get VSL to get Cloudinary IDs
    const vsl = await storage.getVSL(vslId);

    if (!vsl) {
      return res.status(404).json({ message: "VSL not found" });
    }

    // Delete from Cloudinary if exists
    if (vsl.cloudinaryVideoId) {
      try {
        // ✅ FIX: Use deleteResource with 'video' type
        await cloudinaryService.deleteResource(vsl.cloudinaryVideoId, "video");
        console.log("✅ Video deleted from Cloudinary");
      } catch (error) {
        console.error("⚠️ Failed to delete video from Cloudinary:", error);
      }
    }

    if (vsl.cloudinaryThumbnailId) {
      try {
        // ✅ FIX: Use deleteResource with 'image' type
        await cloudinaryService.deleteResource(
          vsl.cloudinaryThumbnailId,
          "image"
        );
        console.log("✅ Thumbnail deleted from Cloudinary");
      } catch (error) {
        console.error("⚠️ Failed to delete thumbnail from Cloudinary:", error);
      }
    }

    // Delete from database
    await storage.deleteVSL(vslId);

    res.json({ success: true, message: "VSL deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting VSL:", error);
    res.status(500).json({
      message: "Failed to delete VSL",
      error: error.message,
    });
  }
};

// Track VSL view
export const trackVSLView = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;
    await storage.incrementVSLViews(vslId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error tracking view:", error);
    res.status(500).json({
      message: "Failed to track view",
      error: error.message,
    });
  }
};

// ✅ Background video generation function
async function generateVideoAsync(
  vslId: string,
  script: string,
  title: string,
  clientId: string,
  niche: string,
  targetDuration: string = "2min",
  subtitleType: string = "none"
) {
  try {
    console.log(
      `🎥 Starting background video generation for VSL: ${vslId} (${targetDuration})`
    );

    const result = await vslGenerator.generateVSL({
      vslId,
      script,
      title,
      clientId,
      niche,
      targetDuration,
      subtitles: subtitleType as "none" | "traditional" | "karaoke",
    });

    // Update VSL with video URLs
    await storage.updateVSL(vslId, {
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      cloudinaryVideoId: result.cloudinaryPublicIds?.video,
      cloudinaryThumbnailId: result.cloudinaryPublicIds?.thumbnail,
    });

    console.log(
      `✅ Video generation complete for VSL: ${vslId} (actual duration: ${result.duration}s)`
    );
  } catch (error) {
    console.error(`❌ Video generation failed for VSL: ${vslId}`, error);

    // Mark VSL as failed
    await storage.updateVSL(vslId, {
      isActive: false,
    });
  }
}

// Track video play
export const trackVSLPlay = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string);
    const userAgent = req.headers["user-agent"];

    await storage.trackVSLPlay({
      vslId,
      sessionId,
      ipAddress,
      userAgent,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error tracking play:", error);
    res.status(500).json({
      message: "Failed to track play",
      error: error.message,
    });
  }
};

// Track video progress
export const trackVSLProgress = async (req: Request, res: Response) => {
  try {
    const { sessionId, watchTime, completionPercentage, completed } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    await storage.trackVSLProgress(
      sessionId,
      watchTime,
      completionPercentage,
      completed
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error tracking progress:", error);
    res.status(500).json({
      message: "Failed to track progress",
      error: error.message,
    });
  }
};

// Get VSL analytics
export const getVSLAnalytics = async (req: Request, res: Response) => {
  try {
    const { vslId } = req.params;

    const analytics = await storage.getVSLAnalytics(vslId);

    res.json(analytics);
  } catch (error: any) {
    console.error("❌ Error fetching analytics:", error);
    res.status(500).json({
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};
