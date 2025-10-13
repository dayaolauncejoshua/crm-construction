// server/services/vsl-generator.ts

import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

interface VSLGenerationOptions {
  script: string;
  title: string;
  clientId: string;
  niche: string;
}

export class VSLGenerator {
  private outputDir = path.join(process.cwd(), "uploads", "vsls");
  private tempDir = path.join(process.cwd(), "temp");

  constructor() {
    // Ensure directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * STEP 1: Generate voiceover from script using OpenAI TTS
   */
  private async generateVoiceover(
    script: string,
    outputPath: string
  ): Promise<void> {
    console.log("🎤 Generating voiceover...");

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1-hd", // High quality voice
      voice: "nova", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: script,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);

    console.log("✅ Voiceover generated");
  }

  /**
   * STEP 2: Get audio duration (for video length)
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * STEP 3: Create video with background and voiceover
   */
  private async createVideo(
    audioPath: string,
    outputPath: string,
    duration: number,
    niche: string
  ): Promise<void> {
    console.log("🎬 Creating video...");

    return new Promise((resolve, reject) => {
      // Create a simple colored background with text overlay
      // In production, you'd use actual stock footage or images
      ffmpeg()
        // Generate color background
        .input(`color=c=#1e3a8a:s=1920x1080:d=${duration}`)
        .inputFormat("lavfi")

        // Add the voiceover audio
        .input(audioPath)

        // Add text overlay (title/branding)
        .videoFilters([])

        // Output settings
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-c:a aac",
          "-b:a 192k",
          "-pix_fmt yuv420p",
          "-movflags +faststart", // Enable streaming
        ])
        .output(outputPath)
        .on("end", () => {
          console.log("✅ Video created successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ Video creation error:", err);
          reject(err);
        })
        .on("progress", (progress) => {
          console.log(`Processing: ${Math.round(progress.percent || 0)}%`);
        })
        .run();
    });
  }

  /**
   * STEP 4: Generate thumbnail
   */
  private async generateThumbnail(
    videoPath: string,
    thumbnailPath: string
  ): Promise<void> {
    console.log("📸 Generating thumbnail...");

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ["00:00:01"],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: "1280x720",
        })
        .on("end", () => {
          console.log("✅ Thumbnail generated");
          resolve();
        })
        .on("error", reject);
    });
  }

  /**
   * MAIN METHOD: Generate complete VSL
   */
  async generateVSL(options: VSLGenerationOptions): Promise<{
    videoPath: string;
    thumbnailPath: string;
    duration: number;
    videoUrl: string;
    thumbnailUrl: string;
  }> {
    const videoId = uuidv4();
    const audioPath = path.join(this.tempDir, `${videoId}-audio.mp3`);
    const videoPath = path.join(this.outputDir, `${videoId}.mp4`);
    const thumbnailPath = path.join(this.outputDir, `${videoId}-thumb.jpg`);

    try {
      // Step 1: Generate voiceover
      await this.generateVoiceover(options.script, audioPath);

      // Step 2: Get duration
      const duration = await this.getAudioDuration(audioPath);
      console.log(`⏱️ Duration: ${Math.round(duration)}s`);

      // Step 3: Create video
      await this.createVideo(audioPath, videoPath, duration, options.niche);

      // Step 4: Generate thumbnail
      await this.generateThumbnail(videoPath, thumbnailPath);

      // Step 5: Cleanup temp files
      await fs.unlink(audioPath);

      // Return URLs (adjust based on your static file serving)
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      return {
        videoPath,
        thumbnailPath,
        duration: Math.round(duration),
        videoUrl: `${baseUrl}/uploads/vsls/${videoId}.mp4`,
        thumbnailUrl: `${baseUrl}/uploads/vsls/${videoId}-thumb.jpg`,
      };
    } catch (error) {
      // Cleanup on error
      try {
        await fs.unlink(audioPath).catch(() => {});
        await fs.unlink(videoPath).catch(() => {});
        await fs.unlink(thumbnailPath).catch(() => {});
      } catch {}

      throw error;
    }
  }

  /**
   * Alternative: Use stock footage instead of solid color
   */
  private async createVideoWithStockFootage(
    audioPath: string,
    stockVideoPath: string,
    outputPath: string,
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        // Input: stock video (loop if needed)
        .input(stockVideoPath)
        .inputOptions(["-stream_loop", "-1"]) // Loop video

        // Input: audio
        .input(audioPath)

        // Trim to audio duration
        .outputOptions([
          `-t ${duration}`,
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-c:a aac",
          "-b:a 192k",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }
}

export const vslGenerator = new VSLGenerator();
