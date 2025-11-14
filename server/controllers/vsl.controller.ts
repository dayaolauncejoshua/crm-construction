// server/controllers/vsl.controller.ts
import { generateVSLScript } from "server/services/claude";
import { vslGenerator } from "server/services/vsl-generator";
import { cloudinaryService } from "server/services/cloudinary.service"; //
import { storage } from "server/storage";

// fetch clientID
export const getClientId = async (req: any, res: any) => {
  try {
    const { clientId } = req.params;

    console.log(clientId, "My id");
    const vsls = await storage.getVSLs(clientId);
    res.json(vsls);
  } catch (error) {
    console.error("Error fetching VSLs:", error);
    res.status(500).json({ message: "Failed to fetch VSLs" });
  }
};

// Create new VSL
export const createVSL = async (req: any, res: any) => {
  try {
    const {
      title,
      niche,
      targetAudience,
      painPoints,
      solution,
      proofElements,
      clientId,
    } = req.body;

    console.log("🎬 Creating VSL:", title);

    // Step 1: Generate VSL script using AI
    console.log("📝 Generating script...");
    const scriptData = {
      niche,
      targetAudience: targetAudience || `${niche} business owners`,
      painPoints: painPoints || `Common challenges in ${niche}`,
      solution: solution || "AI-powered lead generation system",
      proofElements: proofElements || "Proven results and case studies",
    };

    const script = await generateVSLScript(niche, scriptData);

    // Step 2: Create VSL record in database (with script, but no video yet)
    const vsl = await storage.createVSL({
      clientId,
      title,
      script,
      duration: 180, // Estimated duration
      isActive: true,
      // videoUrl and thumbnailUrl will be null initially
    });

    console.log("✅ VSL record created:", vsl.id);

    // Step 3: Generate video asynchronously (don't block the response)
    generateVideoAsync(vsl.id, script, title, niche);

    // Return immediately with VSL record
    res.json({
      ...vsl,
      status: "generating", // Custom status to show in UI
    });
  } catch (error) {
    console.error("❌ Error creating VSL:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create VSL",
    });
  }
};

// Get single VSL
export const getSingleVSL = async (req: any, res: any) => {
  try {
    const { vslId } = req.params;
    const vsl = await storage.getVSL(vslId);

    if (!vsl) {
      return res.status(404).json({ message: "VSL not found" });
    }

    res.json(vsl);
  } catch (error) {
    console.error("Error fetching VSL:", error);
    res.status(500).json({ message: "Failed to fetch VSL" });
  }
};

// Update VSL
export const updateVSL = async (req: any, res: any) => {
  try {
    const { vslId } = req.params;
    const updates = req.body;

    const vsl = await storage.updateVSL(vslId, updates);
    res.json(vsl);
  } catch (error) {
    console.error("Error updating VSL:", error);
    res.status(500).json({ message: "Failed to update VSL" });
  }
};

// ⬇️ UPDATED: Delete VSL - Now also deletes from Cloudinary
// export const deleteVSL = async (req: any, res: any) => {
//   try {
//     const { vslId } = req.params;

//     // Get VSL to retrieve Cloudinary public IDs
//     const vsl = await storage.getVSL(vslId);

//     if (vsl) {
//       // Delete from Cloudinary if public IDs exist
//       if (vsl.cloudinaryVideoId) {
//         try {
//           await cloudinaryService.deleteResource(
//             vsl.cloudinaryVideoId,
//             "video"
//           );
//           console.log(
//             "✅ Video deleted from Cloudinary:",
//             vsl.cloudinaryVideoId
//           );
//         } catch (error) {
//           console.error("⚠️ Failed to delete video from Cloudinary:", error);
//           // Continue with database deletion even if Cloudinary deletion fails
//         }
//       }

//       if (vsl.cloudinaryThumbnailId) {
//         try {
//           await cloudinaryService.deleteResource(
//             vsl.cloudinaryThumbnailId,
//             "image"
//           );
//           console.log(
//             "✅ Thumbnail deleted from Cloudinary:",
//             vsl.cloudinaryThumbnailId
//           );
//         } catch (error) {
//           console.error(
//             "⚠️ Failed to delete thumbnail from Cloudinary:",
//             error
//           );
//           // Continue with database deletion even if Cloudinary deletion fails
//         }
//       }
//     }

//     // Delete from database
//     await storage.deleteVSL(vslId);
//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error deleting VSL:", error);
//     res.status(500).json({ message: "Failed to delete VSL" });
//   }
// };
export const deleteVSL = async (req: any, res: any) => {
  try {
    const { vslId } = req.params;

    // Get VSL to retrieve Cloudinary public IDs
    const vsl = await storage.getVSL(vslId);

    if (vsl) {
      // Delete from Cloudinary if public IDs exist
      if (vsl.cloudinaryVideoId) {
        try {
          await cloudinaryService.deleteResource(
            vsl.cloudinaryVideoId,
            "video"
          );
          console.log(
            "✅ Video deleted from Cloudinary:",
            vsl.cloudinaryVideoId
          );
        } catch (error) {
          console.error("⚠️ Failed to delete video from Cloudinary:", error);
        }
      }

      if (vsl.cloudinaryThumbnailId) {
        try {
          await cloudinaryService.deleteResource(
            vsl.cloudinaryThumbnailId,
            "image"
          );
          console.log(
            "✅ Thumbnail deleted from Cloudinary:",
            vsl.cloudinaryThumbnailId
          );
        } catch (error) {
          console.error(
            "⚠️ Failed to delete thumbnail from Cloudinary:",
            error
          );
        }
      }
    }

    await storage.deleteVSL(vslId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting VSL:", error);
    res.status(500).json({ message: "Failed to delete VSL" });
  }
};
//Track VSL view
export const trackVSLView = async (req: any, res: any) => {
  try {
    const { vslId } = req.params;
    await storage.incrementVSLViews(vslId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({ message: "Failed to track view" });
  }
};

// ⬇️ UPDATED: Async function to generate video in background
async function generateVideoAsync(
  vslId: string,
  script: string,
  title: string,
  niche: string
) {
  try {
    console.log("🎥 Starting video generation for VSL:", vslId);

    const result = await vslGenerator.generateVSL({
      script,
      title,
      niche,
      clientId: vslId,
      vslId: vslId,
    });

    await storage.updateVSL(vslId, {
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      cloudinaryVideoId: result.cloudinaryPublicIds?.video,
      cloudinaryThumbnailId: result.cloudinaryPublicIds?.thumbnail,
    });

    console.log("✅ Video generation complete for VSL:", vslId);
  } catch (error) {
    console.error("❌ Video generation failed for VSL:", vslId, error);

    await storage.updateVSL(vslId, {
      script: `${script}\n\n[VIDEO GENERATION FAILED - Please regenerate]`,
    });
  }
}
