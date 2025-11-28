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
      error: error.message 
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
      targetAudience,
      painPoints,
      solution,
      proofElements,
    } = req.body;

    console.log("🎬 Creating new VSL:", { title, niche, clientId });

    // Validate required fields
    if (!title || !niche || !clientId) {
      return res.status(400).json({
        message: "Missing required fields: title, niche, clientId",
      });
    }

    // Step 1: Generate script using Claude Sonnet 4.5
    console.log("📝 Generating VSL script...");
    
    const script = await generateVSLScript(niche, {
      targetAudience: targetAudience || `${niche} business owners`,
      painPoints: painPoints || `Common challenges in ${niche}`,
      solution: solution || "AI-powered lead generation system",
      proofElements: proofElements || "Proven results and case studies",
    });

    console.log("✅ Script generated:", script.substring(0, 100) + "...");

    // Step 2: Create VSL record in database
    const vsl = await storage.createVSL({
      clientId,
      title,
      script,
      isActive: true,
    });

    console.log("✅ VSL record created:", vsl.id);

    // Step 3: Start video generation in background (non-blocking)
    generateVideoAsync(vsl.id, script, title, clientId, niche);

    // Return immediately with VSL ID
    res.json({
      success: true,
      vsl,
      message: "VSL creation started. Video will be ready in 5-10 minutes.",
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
      error: error.message 
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
      error: error.message 
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
        await cloudinaryService.deleteResource(vsl.cloudinaryVideoId, 'video');
        console.log("✅ Video deleted from Cloudinary");
      } catch (error) {
        console.error("⚠️ Failed to delete video from Cloudinary:", error);
      }
    }
    
    if (vsl.cloudinaryThumbnailId) {
      try {
        // ✅ FIX: Use deleteResource with 'image' type
        await cloudinaryService.deleteResource(vsl.cloudinaryThumbnailId, 'image');
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
      error: error.message 
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
      error: error.message 
    });
  }
};

// ✅ Background video generation function
async function generateVideoAsync(
  vslId: string,
  script: string,
  title: string,
  clientId: string,
  niche: string
) {
  try {
    console.log("🎥 Starting background video generation for VSL:", vslId);

    const result = await vslGenerator.generateVSL({
      vslId,
      script,
      title,
      clientId,
      niche,
      subtitles: "none",
    });

    // Update VSL with video URLs
    await storage.updateVSL(vslId, {
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      cloudinaryVideoId: result.cloudinaryPublicIds?.video,
      cloudinaryThumbnailId: result.cloudinaryPublicIds?.thumbnail,
    });

    console.log(`✅ Video generation complete for VSL: ${vslId}`);
  } catch (error) {
    console.error(`❌ Video generation failed for VSL: ${vslId}`, error);
    
    // Mark VSL as failed
    await storage.updateVSL(vslId, {
      isActive: false,
    });
  }
}