// server/services/vsl-generator.ts
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch"; // ✅ needed for image download

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
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /** STEP 1: Generate voiceover */
  private async generateVoiceover(
    script: string,
    outputPath: string
  ): Promise<void> {
    console.log("🎤 Generating voiceover...");
    const mp3Response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "nova",
      input: script,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    console.log("✅ Voiceover generated");
  }

  /** STEP 2: Get audio duration */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  /** 🖼️ Generate background image using OpenAI */
  // private async generateBackgroundImage(niche: string): Promise<string> {
  //   console.log("🖼️ Generating background image for:", niche);
  //   const imgPath = path.join(
  //     this.tempDir,
  //     `${niche.replace(/\s+/g, "_")}.jpg`
  //   );

  //   try {
  //     const response = await openai.images.generate({
  //       model: "gpt-image-1",
  //       prompt: `High-quality background image for a ${niche} promotional video. Focus on realistic and clean visuals.`,
  //       size: "1536x1024", // ✅ valid widescreen format
  //     });
  //     const imageUrl = response.data[0].url;
  //     if (!imageUrl) throw new Error("No image URL received from OpenAI");

  //     const res = await fetch(imageUrl);
  //     const buffer = Buffer.from(await res.arrayBuffer());
  //     await fs.writeFile(imgPath, buffer);
  //     console.log("✅ Background image saved:", imgPath);
  //     return imgPath;
  //   } catch (error) {
  //     console.error(
  //       "⚠️ Image generation failed, falling back to color background:",
  //       error
  //     );
  //     return ""; // fallback will trigger color background
  //   }
  // }

  private async generateBackgroundImage(niche: string): Promise<string> {
    console.log("🖼️ Generating background image for:", niche);
    const imgPath = path.join(
      this.tempDir,
      `${niche.replace(/\s+/g, "_")}.jpg`
    );

    try {
      const response = await openai.images.generate({
        model: "dall-e-3", // ✅ FIXED: Changed from "gpt-image-1" to "dall-e-3"
        prompt: `High-quality background image for a ${niche} promotional video. Focus on realistic and clean visuals.`,
        size: "1792x1024", // ✅ FIXED: Valid size for dall-e-3 (1024x1024, 1792x1024, or 1024x1792)
        quality: "standard", // or "hd" for higher quality
      });
      const imageUrl = response.data[0].url;
      if (!imageUrl) throw new Error("No image URL received from OpenAI");

      const res = await fetch(imageUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(imgPath, buffer);
      console.log("✅ Background image saved:", imgPath);
      return imgPath;
    } catch (error) {
      console.error(
        "⚠️ Image generation failed, falling back to color background:",
        error
      );
      return ""; // fallback will trigger color background
    }
  }

  /**Create video with voiceover and background */
  private async createVideo(
    audioPath: string,
    outputPath: string,
    duration: number,
    niche: string,
    bgImagePath?: string
  ): Promise<void> {
    console.log("🎬 Creating video...");

    return new Promise((resolve, reject) => {
      const ff = ffmpeg();

      if (bgImagePath && bgImagePath !== "") {
        ff.input(bgImagePath).loop(duration);
      } else {
        ff.input(`color=c=#1e3a8a:s=1920x1080:d=${duration}`).inputFormat(
          "lavfi"
        );
      }

      ff.input(audioPath)
        .videoFilters([
          `drawtext=text='${niche} Solutions':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2`,
        ])
        .outputOptions([
          `-t ${duration}`,
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-c:a aac",
          "-b:a 192k",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("progress", (p) => {
          console.log(`Processing: ${Math.round(p.percent || 0)}%`);
        })
        .on("end", () => {
          console.log("✅ Video created successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ Video creation error:", err);
          reject(err);
        })
        .run();
    });
  }

  /** STEP 4: Generate thumbnail */
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

  /** MAIN: Generate complete VSL */
  async generateVSL(options: VSLGenerationOptions) {
    const videoId = uuidv4();
    const audioPath = path.join(this.tempDir, `${videoId}-audio.mp3`);
    const videoPath = path.join(this.outputDir, `${videoId}.mp4`);
    const thumbnailPath = path.join(this.outputDir, `${videoId}-thumb.jpg`);

    try {
      await this.generateVoiceover(options.script, audioPath);
      const duration = await this.getAudioDuration(audioPath);
      console.log(`⏱️ Duration: ${Math.round(duration)}s`);

      const bgImagePath = await this.generateBackgroundImage(options.niche);

      await this.createVideo(
        audioPath,
        videoPath,
        duration,
        options.niche,
        bgImagePath
      );
      await this.generateThumbnail(videoPath, thumbnailPath);
      await fs.unlink(audioPath);

      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      return {
        videoPath,
        thumbnailPath,
        duration: Math.round(duration),
        videoUrl: `${baseUrl}/uploads/vsls/${videoId}.mp4`,
        thumbnailUrl: `${baseUrl}/uploads/vsls/${videoId}-thumb.jpg`,
      };
    } catch (error) {
      await fs.unlink(audioPath).catch(() => {});
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});
      throw error;
    }
  }

  /** MAIN: Generate complete multi-scene VSL */
  // async generateVSL(options: VSLGenerationOptions) {
  //   const videoId = uuidv4();
  //   const audioPath = path.join(this.tempDir, `${videoId}-audio.mp3`);
  //   const videoPath = path.join(this.outputDir, `${videoId}.mp4`);
  //   const thumbnailPath = path.join(this.outputDir, `${videoId}-thumb.jpg`);

  //   try {
  //     // 🧠 1. Split script into sections
  //     const scenes = this.splitScriptIntoScenes(options.script);
  //     console.log(`🪄 Script split into ${scenes.length} scenes`);

  //     // 🎤 2. Generate voiceover for entire script
  //     await this.generateVoiceover(options.script, audioPath);
  //     const totalDuration = await this.getAudioDuration(audioPath);
  //     console.log(`⏱️ Total duration: ${Math.round(totalDuration)}s`);

  //     // 🖼️ 3. Generate background image for each scene
  //     const sceneImages = [];
  //     for (const [i, scene] of scenes.entries()) {
  //       console.log(`🖼️ Generating image for scene ${i + 1}: ${scene.title}`);
  //       const imgPath = await this.generateBackgroundImage(
  //         `${options.niche} ${scene.title}`
  //       );
  //       sceneImages.push(imgPath);
  //     }

  //     // 🎬 4. Create a video per scene
  //     const sceneVideos = [];
  //     const sceneDuration = totalDuration / scenes.length;

  //     for (let i = 0; i < scenes.length; i++) {
  //       const sceneVideoPath = path.join(
  //         this.tempDir,
  //         `${videoId}-scene${i}.mp4`
  //       );
  //       await this.createSceneVideo(
  //         sceneImages[i],
  //         sceneVideoPath,
  //         sceneDuration,
  //         scenes[i].title,
  //         options.niche
  //       );
  //       sceneVideos.push(sceneVideoPath);
  //     }

  //     // 🎞️ 5. Merge all scene videos with transitions
  //     await this.mergeScenesWithTransitions(sceneVideos, videoPath, audioPath);

  //     // 📸 6. Generate thumbnail
  //     await this.generateThumbnail(videoPath, thumbnailPath);

  //     // 🧹 Cleanup
  //     for (const s of sceneVideos) await fs.unlink(s).catch(() => {});
  //     for (const i of sceneImages) await fs.unlink(i).catch(() => {});
  //     await fs.unlink(audioPath).catch(() => {});

  //     const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  //     return {
  //       videoUrl: `${baseUrl}/uploads/vsls/${videoId}.mp4`,
  //       thumbnailUrl: `${baseUrl}/uploads/vsls/${videoId}-thumb.jpg`,
  //       duration: Math.round(totalDuration),
  //     };
  //   } catch (error) {
  //     console.error("❌ Multi-scene VSL generation failed:", error);
  //     throw error;
  //   }
  // }

  /** Split long script into logical scenes */
  private splitScriptIntoScenes(script: string) {
    const parts = script.split(/(?<=\.|\?|\!)(?=\s+[A-Z])/g);
    const chunkSize = Math.ceil(parts.length / 4);
    const chunks = [];
    for (let i = 0; i < parts.length; i += chunkSize) {
      const text = parts.slice(i, i + chunkSize).join(" ");
      chunks.push({
        title: `Scene ${chunks.length + 1}`,
        text,
      });
    }
    return chunks;
  }

  /** Create individual scene video */
  private async createSceneVideo(
    bgImagePath: string,
    outputPath: string,
    duration: number,
    title: string,
    niche: string
  ): Promise<void> {
    console.log(`🎬 Creating scene video: ${title}`);

    return new Promise((resolve, reject) => {
      const ff = ffmpeg();

      ff.input(bgImagePath).loop(duration);

      ff.videoFilters([
        `drawtext=text='${title}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,${duration})'`,
        `drawtext=text='${niche} Solutions':fontcolor=lightgray:fontsize=36:x=(w-text_w)/2:y=h-100:enable='between(t,0,${duration})'`,
      ])
        .outputOptions([
          `-t ${duration}`,
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-pix_fmt yuv420p",
        ])
        .output(outputPath)
        .on("end", () => {
          console.log(`✅ Scene created: ${outputPath}`);
          resolve();
        })
        .on("error", (err) => reject(err))
        .run();
    });
  }

  /** Merge all scene clips with crossfade transitions */
  private async mergeScenesWithTransitions(
    scenes: string[],
    outputPath: string,
    audioPath: string
  ): Promise<void> {
    console.log("🎞️ Merging scenes...");

    return new Promise((resolve, reject) => {
      const ff = ffmpeg();

      scenes.forEach((scene) => ff.input(scene));
      ff.input(audioPath);

      // Add transition filters (crossfade between scenes)
      const filterComplex =
        scenes.map((_, i) => `[${i}:v][${i}:a]`).join("") +
        `concat=n=${scenes.length}:v=1:a=0[v]`;

      ff.complexFilter(filterComplex)
        .outputOptions([
          "-map [v]",
          "-map " + scenes.length + ":a",
          "-preset medium",
          "-crf 23",
        ])
        .output(outputPath)
        .on("end", () => {
          console.log("✅ All scenes merged");
          resolve();
        })
        .on("error", (err) => reject(err))
        .run();
    });
  }
}

export const vslGenerator = new VSLGenerator();
