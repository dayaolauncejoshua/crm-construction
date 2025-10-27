// server/services/vsl-generator.ts
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { progressTracker } from "./progress-tracker.services";
import { ConsoleLogger } from "../utils/console-logger.utils";

import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

interface VSLGenerationOptions {
  vslId: string;
  script: string;
  title: string;
  clientId: string;
  niche: string;
}

interface Scene {
  title: string;
  text: string;
  prompt: string;
}

interface WordTiming {
  word: string;
  start: number;
  end: number;
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
    outputPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("🎤", "VOICEOVER", "Starting text-to-speech generation...");
    logger.stage(
      "📊",
      "VOICEOVER",
      `Script length: ${script.length} characters`
    );

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "nova",
      input: script,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);

    logger.success(
      "VOICEOVER",
      `Audio file saved: ${path.basename(outputPath)}`
    );
    logger.stage(
      "📦",
      "VOICEOVER",
      `File size: ${(buffer.length / 1024).toFixed(2)} KB`
    );
  }

  /** STEP 1.5: Get word-level timestamps using Whisper */
  private async getWordTimings(
    audioPath: string,
    logger: ConsoleLogger
  ): Promise<WordTiming[]> {
    logger.stage(
      "🎯",
      "TRANSCRIPTION",
      "Getting word-level timestamps from Whisper..."
    );

    try {
      const audioFile = await fs.readFile(audioPath);
      const file = new File([audioFile], path.basename(audioPath), {
        type: "audio/mpeg",
      });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
      });

      const words: WordTiming[] = [];

      // @ts-ignore - OpenAI types may not include word-level timestamps yet
      if (transcription.words && Array.isArray(transcription.words)) {
        // @ts-ignore
        for (const word of transcription.words) {
          words.push({
            word: word.word,
            start: word.start,
            end: word.end,
          });
        }
      }

      logger.success(
        "TRANSCRIPTION",
        `Got ${words.length} word timings (${(
          transcription.duration || 0
        ).toFixed(2)}s)`
      );

      return words;
    } catch (error) {
      logger.warning(
        "TRANSCRIPTION",
        "Failed to get word timings, will use fallback method"
      );
      logger.error("TRANSCRIPTION", "Error details", error);
      return [];
    }
  }

  /** STEP 2: Get audio duration */
  private async getAudioDuration(
    audioPath: string,
    logger: ConsoleLogger
  ): Promise<number> {
    logger.stage("⏱️", "ANALYSIS", "Analyzing audio duration...");

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          logger.error("ANALYSIS", "Failed to get audio duration", err);
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          logger.success(
            "ANALYSIS",
            `Audio duration: ${duration.toFixed(2)}s (${Math.floor(
              duration / 60
            )}m ${Math.floor(duration % 60)}s)`
          );
          resolve(duration);
        }
      });
    });
  }
  // ...

  // ...
  /** 🧠 Sp lit script into intelligent scenes with image prompts */
  private async splitScriptIntoScenes(
    script: string,
    niche: string,
    logger: ConsoleLogger
  ): Promise<Scene[]> {
    logger.stage(
      "🧠",
      "AI ANALYSIS",
      "Splitting script into scenes using GPT-4..."
    );

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a video production assistant. Split the VSL script into **10-15 compelling, short scenes** (or roughly one scene per 2-3 sentences). For each scene, provide:
1. A short title (2-4 words)
2. The script text for that scene
3. A detailed image prompt for DALL-E to generate a relevant background

Return ONLY valid JSON in this format:
{
  "scenes": [
    {
      "title": "Scene Title",
      "prompt": "Detailed DALL-E prompt for background image..."
      "text": "Script text for this scene...",
    }
    ]
}`,
          },
          {
            // ...
            role: "user",
            content: `Niche: ${niche}\n\nScript:\n${script}\n\nCreate **10-15 short scenes** with engaging visuals that match the script narrative.`,
          },
        ],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);

      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error("Invalid scene format from AI");
      }

      logger.success("AI ANALYSIS", `Created ${parsed.scenes.length} scenes`);
      parsed.scenes.forEach((scene, i) => {
        logger.stage("📝", "AI ANALYSIS", `Scene ${i + 1}: "${scene.title}"`);
      });

      return parsed.scenes;
    } catch (error) {
      logger.warning(
        "AI ANALYSIS",
        "AI scene splitting failed, using fallback method"
      );
      logger.error("AI ANALYSIS", "Error details", error);
      return this.fallbackSceneSplit(script, niche, logger);
    }
  }

  /** Fallback: Basic scene splitting */
  private fallbackSceneSplit(
    script: string,
    niche: string,
    logger: ConsoleLogger
  ): Scene[] {
    logger.stage("🔄", "FALLBACK", "Using basic scene splitting algorithm...");

    const sentences = script.split(/(?<=[.!?])\s+/);
    const scenesCount = Math.min(
      5,
      Math.max(3, Math.floor(sentences.length / 3))
    );
    const chunkSize = Math.ceil(sentences.length / scenesCount);

    logger.stage(
      "📊",
      "FALLBACK",
      `Splitting ${sentences.length} sentences into ${scenesCount} scenes`
    );

    const scenes: Scene[] = [];
    for (let i = 0; i < scenesCount; i++) {
      const sceneText = sentences
        .slice(i * chunkSize, (i + 1) * chunkSize)
        .join(" ");
      scenes.push({
        title: `Scene ${i + 1}`,
        text: sceneText,
        prompt: `Professional ${niche} business scene ${
          i + 1
        }, modern and clean visuals, high quality`,
      });
      logger.stage(
        "✓",
        "FALLBACK",
        `Scene ${i + 1}: ${sceneText.slice(0, 50)}...`
      );
    }

    logger.success(
      "FALLBACK",
      `Created ${scenes.length} scenes using fallback method`
    );
    return scenes;
  }

  /** 🖼️ Generate background image using OpenAI */
  private async generateBackgroundImage(
    prompt: string,
    index: number,
    logger: ConsoleLogger
  ): Promise<string> {
    const imgPath = path.join(this.tempDir, `scene_${index}_${Date.now()}.jpg`);

    logger.stage("🖼️", "IMAGE GEN", `[${index + 1}] Generating image...`);
    logger.stage(
      "📝",
      "IMAGE GEN",
      `[${index + 1}] Prompt: ${prompt.slice(0, 80)}...`
    );

    try {
      const startTime = Date.now();

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `${prompt}. Professional, high-quality, cinematic style, suitable for business presentation.`,
        size: "1792x1024",
        quality: "standard",
      });

      const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

      const imageUrl = response.data[0].url;
      if (!imageUrl) throw new Error("No image URL received from OpenAI");

      logger.stage(
        "⬇️",
        "IMAGE GEN",
        `[${index + 1}] Downloading image... (generated in ${generationTime}s)`
      );

      const res = await fetch(imageUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(imgPath, buffer);

      logger.success(
        "IMAGE GEN",
        `[${index + 1}] Image saved: ${path.basename(imgPath)} (${(
          buffer.length / 1024
        ).toFixed(2)} KB)`
      );
      return imgPath;
    } catch (error) {
      logger.error(
        "IMAGE GEN",
        `[${index + 1}] Image generation failed`,
        error
      );
      logger.warning(
        "IMAGE GEN",
        `[${index + 1}] Falling back to color background`
      );
      return "";
    }
  }

  /** Create individual scene video */
  // private async createSceneVideo(
  //   bgImagePath: string,
  //   outputPath: string,
  //   duration: number,
  //   title: string,
  //   niche: string,
  //   index: number,
  //   logger: ConsoleLogger
  // ): Promise<void> {
  //   logger.stage(
  //     "🎬",
  //     "SCENE VIDEO",
  //     `[${index + 1}] Creating scene: "${title}" (${Math.round(duration)}s)`
  //   );

  //   return new Promise((resolve, reject) => {
  //     const ff = ffmpeg();
  //     const startTime = Date.now();

  //     if (bgImagePath && bgImagePath !== "") {
  //       logger.stage(
  //         "🖼️",
  //         "SCENE VIDEO",
  //         `[${index + 1}] Using generated image with zoom effect`
  //       );
  //       ff.input(bgImagePath)
  //         .loop(duration)
  //         .videoFilters([
  //           `zoompan=z='min(zoom+0.0015,1.2)':d=${Math.ceil(
  //             duration * 30
  //           )}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`,
  //           `drawtext=text='${title.replace(
  //             /'/g,
  //             "\\'"
  //           )}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t,1),t,if(gt(t,${
  //             duration - 1
  //           }),${duration}-t,1))'`,
  //           `vignette=angle=PI/4`,
  //         ]);
  //     } else {
  //       logger.stage(
  //         "🎨",
  //         "SCENE VIDEO",
  //         `[${index + 1}] Using gradient background (fallback)`
  //       );
  //       ff.input(`color=c=#1e3a8a:s=1920x1080:d=${duration}`)
  //         .inputFormat("lavfi")
  //         .videoFilters([
  //           `drawtext=text='${title.replace(
  //             /'/g,
  //             "\\'"
  //           )}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2`,
  //         ]);
  //     }

  //     ff.outputOptions([
  //       `-t ${duration}`,
  //       "-c:v libx264",
  //       "-preset medium",
  //       "-crf 23",
  //       "-pix_fmt yuv420p",
  //       "-r 30",
  //     ])
  //       .output(outputPath)
  //       .on("progress", (p) => {
  //         if (p.percent && p.percent > 0 && p.percent % 25 === 0) {
  //           logger.stage(
  //             "⚙️",
  //             "SCENE VIDEO",
  //             `[${index + 1}] Encoding: ${Math.round(p.percent)}%`
  //           );
  //         }
  //       })
  //       .on("end", () => {
  //         const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  //         logger.success(
  //           "SCENE VIDEO",
  //           `[${index + 1}] Scene created in ${processingTime}s`
  //         );
  //         resolve();
  //       })
  //       .on("error", (err) => {
  //         logger.error(
  //           "SCENE VIDEO",
  //           `[${index + 1}] Scene creation failed`,
  //           err
  //         );
  //         reject(err);
  //       })
  //       .run();
  //   });
  // }

  /** Create individual scene video */
  private async createSceneVideo(
    bgImagePath: string,
    outputPath: string,
    duration: number,
    title: string,
    niche: string,
    index: number,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage(
      "🎬",
      "SCENE VIDEO",
      `[${index + 1}] Creating scene: "${title}" (${Math.round(duration)}s)`
    );

    return new Promise((resolve, reject) => {
      const ff = ffmpeg();
      const startTime = Date.now();

      // Properly escape text for FFmpeg drawtext filter
      // Replace problematic characters: single quotes, colons, backslashes
      const escapedTitle = title
        .replace(/\\/g, "\\\\\\\\") // Escape backslashes
        .replace(/'/g, "'\\\\\\''") // Escape single quotes
        .replace(/:/g, "\\:") // Escape colons
        .replace(/%/g, "\\%"); // Escape percent signs

      if (bgImagePath && bgImagePath !== "") {
        logger.stage(
          "🖼️",
          "SCENE VIDEO",
          `[${index + 1}] Using generated image with zoom effect`
        );

        // Calculate zoom duration in frames
        const zoomDuration = Math.ceil(duration * 30);

        ff.input(bgImagePath)
          .loop(duration)
          .videoFilters([
            `zoompan=z='min(zoom+0.0015,1.2)':d=${zoomDuration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`,
            `drawtext=text='${escapedTitle}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t\\,1)\\,t\\,if(gt(t\\,${
              duration - 1
            })\\,${duration}-t\\,1))'`,
            `vignette=angle=PI/4`,
          ]);
      } else {
        logger.stage(
          "🎨",
          "SCENE VIDEO",
          `[${index + 1}] Using gradient background (fallback)`
        );
        ff.input(`color=c=#1e3a8a:s=1920x1080:d=${duration}`)
          .inputFormat("lavfi")
          .videoFilters([
            `drawtext=text='${escapedTitle}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2`,
          ]);
      }

      ff.outputOptions([
        `-t ${duration}`,
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        "-pix_fmt yuv420p",
        "-r 30",
      ])
        .output(outputPath)
        .on("progress", (p) => {
          if (p.percent && p.percent > 0 && p.percent % 25 === 0) {
            logger.stage(
              "⚙️",
              "SCENE VIDEO",
              `[${index + 1}] Encoding: ${Math.round(p.percent)}%`
            );
          }
        })
        .on("end", () => {
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.success(
            "SCENE VIDEO",
            `[${index + 1}] Scene created in ${processingTime}s`
          );
          resolve();
        })
        .on("error", (err) => {
          logger.error(
            "SCENE VIDEO",
            `[${index + 1}] Scene creation failed`,
            err
          );
          reject(err);
        })
        .run();
    });
  }

  /** Generate thumbnail */
  private async generateThumbnail(
    videoPath: string,
    thumbnailPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("📸", "THUMBNAIL", "Generating thumbnail from video...");

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      ffmpeg(videoPath)
        .screenshots({
          timestamps: ["00:00:02"],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: "1280x720",
        })
        .on("end", () => {
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.success(
            "THUMBNAIL",
            `Thumbnail generated in ${processingTime}s`
          );
          resolve();
        })
        .on("error", (err) => {
          logger.error("THUMBNAIL", "Thumbnail generation failed", err);
          reject(err);
        });
    });
  }

  /** Generate ASS subtitle file with karaoke effect */
  private async generateKaraokeSubtitles(
    wordTimings: WordTiming[],
    outputPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("🎤", "SUBTITLES", "Generating karaoke-style subtitles...");

    // ASS file header with styling
    let assContent = `[Script Info]
Title: VSL Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H00FFFF00,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,50,50,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    if (wordTimings.length === 0) {
      logger.warning(
        "SUBTITLES",
        "No word timings available, using basic subtitles"
      );
      assContent += `Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,No subtitles available\n`;
    } else {
      // Group words into lines (max 6-8 words per line)
      const wordsPerLine = 7;

      for (let i = 0; i < wordTimings.length; i += wordsPerLine) {
        const lineWords = wordTimings.slice(i, i + wordsPerLine);
        const startTime = lineWords[0].start;
        const endTime = lineWords[lineWords.length - 1].end;

        // Build karaoke tags for each word
        let karaokeText = "";
        for (const word of lineWords) {
          const duration = Math.round((word.end - word.start) * 100); // centiseconds
          karaokeText += `{\\k${duration}}${word.word} `;
        }

        const startFormatted = this.formatASSTime(startTime);
        const endFormatted = this.formatASSTime(endTime);

        assContent += `Dialogue: 0,${startFormatted},${endFormatted},Default,,0,0,0,,${karaokeText.trim()}\n`;
      }

      logger.success(
        "SUBTITLES",
        `Generated ${Math.ceil(
          wordTimings.length / wordsPerLine
        )} subtitle lines with word-level timing`
      );
    }

    await fs.writeFile(outputPath, assContent, "utf-8");
    logger.success(
      "SUBTITLES",
      `ASS subtitle file created: ${path.basename(outputPath)}`
    );
  }

  /** Format time for ASS format (H:MM:SS.cc) */
  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);

    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  }

  // private async mergeScenesWithSubtitles(
  //   sceneVideos: string[],
  //   outputPath: string,
  //   audioPath: string,
  //   subtitlePath: string,
  //   logger: ConsoleLogger
  // ): Promise<void> {
  //   logger.stage(
  //     "🎞️",
  //     "MERGING",
  //     `Concatenating ${sceneVideos.length} scenes with karaoke subtitles...`
  //   );

  //   return new Promise((resolve, reject) => {
  //     const ff = ffmpeg();
  //     const startTime = Date.now();

  //     sceneVideos.forEach((video, i) => {
  //       logger.stage(
  //         "📥",
  //         "MERGING",
  //         `Input ${i + 1}: ${path.basename(video)}`
  //       );
  //       ff.input(video);
  //     });
  //     ff.input(audioPath);
  //     logger.stage("🎵", "MERGING", `Audio: ${path.basename(audioPath)}`);
  //     logger.stage(
  //       "🎤",
  //       "MERGING",
  //       `Karaoke Subtitles: ${path.basename(subtitlePath)}`
  //     );

  //     const filterComplex =
  //       sceneVideos.map((_, i) => `[${i}:v]`).join("") +
  //       `concat=n=${sceneVideos.length}:v=1:a=0[v];` +
  //       `[v]ass='${subtitlePath
  //         .replace(/\\/g, "\\\\")
  //         .replace(/:/g, "\\:")}'[vout]`;

  //     logger.stage(
  //       "🔧",
  //       "MERGING",
  //       "Applying concat and karaoke subtitle filters..."
  //     );

  //     ff.complexFilter(filterComplex)
  //       .outputOptions([
  //         "-map [vout]",
  //         `-map ${sceneVideos.length}:a`,
  //         "-c:v libx264",
  //         "-preset medium",
  //         "-crf 23",
  //         "-c:a aac",
  //         "-b:a 192k",
  //         "-pix_fmt yuv420p",
  //         "-movflags +faststart",
  //       ])
  //       .output(outputPath)
  //       .on("progress", (p) => {
  //         if (p.percent && p.percent > 0) {
  //           logger.stage(
  //             "⚙️",
  //             "MERGING",
  //             `Processing: ${Math.round(p.percent)}%`
  //           );
  //         }
  //       })
  //       .on("end", () => {
  //         const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  //         logger.success(
  //           "MERGING",
  //           `All scenes merged with karaoke subtitles in ${processingTime}s`
  //         );
  //         resolve();
  //       })
  //       .on("error", (err) => {
  //         logger.error("MERGING", "Merge failed", err);
  //         reject(err);
  //       })
  //       .run();
  //   });
  // }

  /** Merge scenes with just the audio track */
  // private async mergeScenesAndAudio(
  //   sceneVideos: string[],
  //   outputPath: string,
  //   audioPath: string,
  //   logger: ConsoleLogger
  // ): Promise<void> {
  //   logger.stage(
  //     "🎞️",
  //     "MERGING",
  //     `Concatenating ${sceneVideos.length} scenes with audio...`
  //   );

  //   return new Promise((resolve, reject) => {
  //     const ff = ffmpeg();
  //     const startTime = Date.now();

  //     // Add all scene videos as inputs
  //     sceneVideos.forEach((video, i) => {
  //       logger.stage(
  //         "📥",
  //         "MERGING",
  //         `Input ${i + 1}: ${path.basename(video)}`
  //       );
  //       ff.input(video);
  //     });

  //     // Add the audio track as the last input
  //     ff.input(audioPath);
  //     logger.stage("🎵", "MERGING", `Audio: ${path.basename(audioPath)}`);

  //     // Filter to concatenate all video streams (v) and select the audio stream (a)
  //     const filterComplex =
  //       sceneVideos.map((_, i) => `[${i}:v]`).join("") +
  //       `concat=n=${sceneVideos.length}:v=1:a=0[v];`;

  //     logger.stage("🔧", "MERGING", "Applying video concatenation filter...");

  //     ff.complexFilter(filterComplex)
  //       .outputOptions([
  //         "-map [v]", // Map the concatenated video output
  //         `-map ${sceneVideos.length}:a`, // Map the audio input (it's the last one)
  //         "-c:v libx264",
  //         "-preset medium",
  //         "-crf 23",
  //         "-c:a aac",
  //         "-b:a 192k",
  //         "-pix_fmt yuv420p",
  //         "-movflags +faststart",
  //       ])
  //       .output(outputPath)
  //       .on("progress", (p) => {
  //         if (p.percent && p.percent > 0) {
  //           logger.stage(
  //             "⚙️",
  //             "MERGING",
  //             `Processing: ${Math.round(p.percent)}%`
  //           );
  //         }
  //       })
  //       .on("end", () => {
  //         const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  //         logger.success(
  //           "MERGING",
  //           `All scenes merged with audio in ${processingTime}s`
  //         );
  //         resolve();
  //       })
  //       .on("error", (err) => {
  //         logger.error("MERGING", "Merge failed", err);
  //         reject(err);
  //       })
  //       .run();
  //   });
  // }

  /** Merge scenes with just the audio track */
  private async mergeScenesAndAudio(
    sceneVideos: string[],
    outputPath: string,
    audioPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage(
      "🎞️",
      "MERGING",
      `Concatenating ${sceneVideos.length} scenes with audio...`
    );

    return new Promise((resolve, reject) => {
      const ff = ffmpeg();
      const startTime = Date.now();

      // Add all scene videos as inputs
      sceneVideos.forEach((video, i) => {
        logger.stage(
          "📥",
          "MERGING",
          `Input ${i + 1}: ${path.basename(video)}`
        );
        ff.input(video);
      });

      // Add the audio track as the last input
      ff.input(audioPath);
      logger.stage("🎵", "MERGING", `Audio: ${path.basename(audioPath)}`);

      // Filter to concatenate all video streams (remove trailing semicolon!)
      const filterComplex =
        sceneVideos.map((_, i) => `[${i}:v]`).join("") +
        `concat=n=${sceneVideos.length}:v=1:a=0[v]`; // ← Removed the semicolon here

      logger.stage("🔧", "MERGING", "Applying video concatenation filter...");

      ff.complexFilter(filterComplex)
        .outputOptions([
          "-map [v]",
          `-map ${sceneVideos.length}:a`,
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
          if (p.percent && p.percent > 0) {
            logger.stage(
              "⚙️",
              "MERGING",
              `Processing: ${Math.round(p.percent)}%`
            );
          }
        })
        .on("end", () => {
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
          logger.success(
            "MERGING",
            `All scenes merged with audio in ${processingTime}s`
          );
          resolve();
        })
        .on("error", (err) => {
          logger.error("MERGING", "Merge failed", err);
          reject(err);
        })
        .run();
    });
  }

  /** 🎬 MAIN: Generate complete multi-scene VSL */
  async generateVSL(options: VSLGenerationOptions) {
    console.log("📋 VSL Generator received options:", {
      vslId: options.vslId,
      title: options.title,
      niche: options.niche,
      hasScript: !!options.script,
    });

    const videoId = uuidv4();
    const audioPath = path.join(this.tempDir, `${videoId}-audio.mp3`);
    const videoPath = path.join(this.outputDir, `${videoId}.mp4`);
    const thumbnailPath = path.join(this.outputDir, `${videoId}-thumb.jpg`);

    const logger = new ConsoleLogger(options.vslId);
    logger.start(`Title: ${options.title} | Niche: ${options.niche}`);

    try {
      // 1. Generate voiceover
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "voiceover",
        progress: 10,
        message: "Generating voiceover...",
        status: "processing",
      });

      await this.generateVoiceover(options.script, audioPath, logger);
      const totalDuration = await this.getAudioDuration(audioPath, logger);

      // 1.5 Get word-level timings from Whisper
      // progressTracker.updateProgress({
      //   vslId: options.vslId,
      //   stage: "transcription",
      //   progress: 15,
      //   message: "Analyzing word timings for karaoke effect...",
      //   status: "processing",
      // });

      const wordTimings = await this.getWordTimings(audioPath, logger);

      // 2. Split script into scenes
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "scenes",
        progress: 20,
        message: "Analyzing script and creating scenes...",
        status: "processing",
      });

      const scenes = await this.splitScriptIntoScenes(
        options.script,
        options.niche,
        logger
      );
      const sceneDuration = totalDuration / scenes.length;
      logger.stage(
        "📊",
        "PLANNING",
        `Each scene will be ~${sceneDuration.toFixed(1)}s long`
      );

      // 3. Generate images for each scene
      logger.stage(
        "🎨",
        "IMAGE GEN",
        `Starting generation of ${scenes.length} images...`
      );
      const sceneImages: string[] = [];
      for (const [i, scene] of scenes.entries()) {
        const imageProgress = 20 + ((i + 1) / scenes.length) * 30;
        progressTracker.updateProgress({
          vslId: options.vslId,
          stage: "images",
          progress: Math.round(imageProgress),
          message: `Generating image ${i + 1} of ${scenes.length}: ${
            scene.title
          }`,
          status: "processing",
        });

        const imgPath = await this.generateBackgroundImage(
          scene.prompt,
          i,
          logger
        );
        sceneImages.push(imgPath);
      }
      logger.success("IMAGE GEN", `All ${scenes.length} images generated`);

      // 4. Create individual scene videos
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "scenes-video",
        progress: 55,
        message: "Creating scene videos...",
        status: "processing",
      });

      logger.stage(
        "🎥",
        "SCENE VIDEO",
        `Creating ${scenes.length} scene videos...`
      );
      const sceneVideos: string[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const sceneProgress = 55 + ((i + 1) / scenes.length) * 25;
        progressTracker.updateProgress({
          vslId: options.vslId,
          stage: "scenes-video",
          progress: Math.round(sceneProgress),
          message: `Processing scene ${i + 1} of ${scenes.length}`,
          status: "processing",
        });

        const sceneVideoPath = path.join(
          this.tempDir,
          `${videoId}-scene${i}.mp4`
        );
        await this.createSceneVideo(
          sceneImages[i],
          sceneVideoPath,
          sceneDuration,
          scenes[i].title,
          options.niche,
          i,
          logger
        );
        sceneVideos.push(sceneVideoPath);
      }
      logger.success(
        "SCENE VIDEO",
        `All ${scenes.length} scene videos created`
      );

      // 5. Generate karaoke subtitles
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "subtitles",
        progress: 82,
        message: "Generating karaoke subtitles...",
        status: "processing",
      });

      const subtitlePath = path.join(this.tempDir, `${videoId}.ass`);
      await this.generateKaraokeSubtitles(wordTimings, subtitlePath, logger);

      // 6. Merge scenes with audio and karaoke subtitles
      // progressTracker.updateProgress({
      //   vslId: options.vslId,
      //   stage: "merging",
      //   progress: 85,
      //   message: "Merging scenes with karaoke subtitles...",
      //   status: "processing",
      // });

      await this.mergeScenesAndAudio(sceneVideos, videoPath, audioPath, logger);

      // 7. Generate thumbnail
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "thumbnail",
        progress: 95,
        message: "Generating thumbnail...",
        status: "processing",
      });

      await this.generateThumbnail(videoPath, thumbnailPath, logger);

      // 8. Cleanup temp files
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "cleanup",
        progress: 98,
        message: "Cleaning up...",
        status: "processing",
      });

      logger.stage("🧹", "CLEANUP", "Removing temporary files...");
      let cleanupCount = 0;

      for (const video of sceneVideos) {
        await fs.unlink(video).catch(() => {});
        cleanupCount++;
      }
      for (const img of sceneImages) {
        if (img) {
          await fs.unlink(img).catch(() => {});
          cleanupCount++;
        }
      }
      await fs.unlink(audioPath).catch(() => {});
      await fs.unlink(subtitlePath).catch(() => {});
      cleanupCount += 2;

      logger.success("CLEANUP", `Removed ${cleanupCount} temporary files`);

      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "complete",
        progress: 100,
        message: "Video generation complete!",
        status: "completed",
      });

      logger.complete(Math.round(totalDuration));

      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      return {
        videoUrl: `${baseUrl}/uploads/vsls/${videoId}.mp4`,
        thumbnailUrl: `${baseUrl}/uploads/vsls/${videoId}-thumb.jpg`,
        duration: Math.round(totalDuration),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Video generation failed";
      logger.failed(errorMessage);

      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "error",
        progress: 0,
        message: errorMessage,
        status: "error",
      });

      logger.stage("🧹", "ERROR CLEANUP", "Removing partial files...");
      await fs.unlink(audioPath).catch(() => {});
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});

      throw error;
    }
  }
}

export const vslGenerator = new VSLGenerator();
