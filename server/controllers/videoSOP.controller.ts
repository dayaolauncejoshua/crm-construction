import { videoSOPAnalyzer } from "../services/videoSOP-analyzer.js";
import { storage } from "../storage.js";

export async function createVideoSOP(req, res) {
  try {
    const { clientId, title, description, category, videoUrl, duration } =
      req.body;
    console.log("🎬 Creating new Video SOP for:", title, videoUrl);

    const newSOP = await storage.createVideoSOP({
      clientId,
      title,
      description,
      category,
      videoUrl,
      duration,
      transcriptStatus: "pending",
    });

    console.log("✅ Video SOP created in DB with id:", newSOP.id);

    // Run analyzer — log progress in every step
    try {
      console.log("🚀 Starting analyzer...");
      const analysis = await videoSOPAnalyzer.analyzeVideo(videoUrl);
      console.log("✅ Analyzer complete:", analysis ? "yes" : "no");

      const updated = await storage.updateVideoSOP(newSOP.id, {
        transcript: analysis.transcript,
        aiSummary: analysis.aiSummary,
        aiBreakdown: analysis.aiBreakdown,
        transcriptStatus: "done",
      });
      console.log("💾 DB updated for SOP:", updated);
      console.log("💾 Saved AI results for SOP id:", newSOP.id);
    } catch (err) {
      console.error("❌ Analyzer failed:", err);
      await storage.updateVideoSOP(newSOP.id, { transcriptStatus: "failed" });
    }

    res.json({ message: "SOP created", id: newSOP.id });
  } catch (err) {
    console.error("💥 Error creating Video SOP:", err);
    res.status(500).json({ error: err.message });
  }
}
