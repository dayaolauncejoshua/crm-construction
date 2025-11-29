// server/services/vsl-generator.ts
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import { progressTracker } from "./progress-tracker.services";
import { ConsoleLogger } from "../utils/console-logger.utils";
import { cloudinaryService } from "./cloudinary.service";

// ✅ FIX: Correct FFmpeg imports
let ffmpeg: any = null;
let ffmpegPath: string;
let ffprobePath: string;

async function initFFmpeg() {
  if (!ffmpeg) {
    try {
      // Import the packages
      const fluentFfmpeg = await import("fluent-ffmpeg");
      const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
      const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");

      // ✅ FIX: Get the default export from fluent-ffmpeg
      ffmpeg = fluentFfmpeg.default;

      // Get paths from installers
      ffmpegPath = ffmpegInstaller.default.path;
      ffprobePath = ffprobeInstaller.default.path;

      // Set the paths on the imported ffmpeg function
      ffmpeg.setFfmpegPath(ffmpegPath);
      ffmpeg.setFfprobePath(ffprobePath);

      console.log("✅ FFmpeg initialized successfully");
      console.log("   FFmpeg path:", ffmpegPath);
      console.log("   FFprobe path:", ffprobePath);
    } catch (error) {
      console.error("❌ FFmpeg initialization failed:", error);
      throw new Error("FFmpeg not available - VSL generation disabled");
    }
  }
  return ffmpeg;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

interface VSLGenerationOptions {
  vslId: string;
  script: string;
  title: string;
  clientId: string;
  niche: string;
  targetDuration?: string;
  subtitles?: "none" | "traditional" | "karaoke";
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

  private async generateVoiceover(
    script: string,
    outputPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("🎤", "VOICEOVER", "Starting text-to-speech generation...");
    logger.stage(
      "📊",
      "VOICEOVER",
      `Raw script length: ${script.length} characters`
    );

    // ✅ Clean the script - remove production notes and formatting
    let cleanScript = script
      // Remove markdown headers
      .replace(/^#+ .+$/gm, "")
      // Remove B-ROLL tags
      .replace(/\{B-ROLL:[^}]+\}/g, "")
      // Remove TEXT ON SCREEN tags
      .replace(/\{TEXT ON SCREEN:[^}]+\}/g, "")
      // Remove timestamp markers
      .replace(/\*\*\[[\d:]+\]\*\*/g, "")
      // Remove PAUSE markers
      .replace(/\(PAUSE\)/g, "")
      // Remove markdown bold
      .replace(/\*\*(.+?)\*\*/g, "$1")
      // Remove production notes section
      .replace(/---\s*\*\*WORD COUNT:[\s\S]*$/, '')
      // Remove multiple newlines
      .replace(/\n{3,}/g, "\n\n")
      // Trim whitespace
      .trim();

    logger.stage(
      "✂️",
      "VOICEOVER",
      `Cleaned script length: ${cleanScript.length} characters`
    );

    // ✅ If still too long, split into chunks (OpenAI limit: 4096 chars)
    const MAX_CHUNK_SIZE = 4000; // Leave some buffer
    const chunks: string[] = [];

    if (cleanScript.length > MAX_CHUNK_SIZE) {
      logger.stage(
        "✂️",
        "VOICEOVER",
        "Script exceeds limit, splitting into chunks..."
      );

      // Split by paragraphs
      const paragraphs = cleanScript.split("\n\n");
      let currentChunk = "";

      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > MAX_CHUNK_SIZE) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
          } else {
            // Single paragraph too long, split by sentences
            const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
            for (const sentence of sentences) {
              if ((currentChunk + sentence).length > MAX_CHUNK_SIZE) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
              } else {
                currentChunk += " " + sentence;
              }
            }
          }
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      logger.success("VOICEOVER", `Split into ${chunks.length} chunks`);
    } else {
      chunks.push(cleanScript);
    }

    // ✅ Generate TTS for each chunk and concatenate
    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      logger.stage(
        "🎤",
        "VOICEOVER",
        `Generating chunk ${i + 1}/${chunks.length} (${
          chunks[i].length
        } chars)...`
      );

      const mp3Response = await openai.audio.speech.create({
  model: "tts-1-hd",
  voice: "nova",
  input: chunks[i],
  speed: 1.1, // ✅ 10% faster to match target duration better
});

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      audioBuffers.push(buffer);

      logger.success(
        "VOICEOVER",
        `Chunk ${i + 1}/${chunks.length} generated (${(
          buffer.length / 1024
        ).toFixed(2)} KB)`
      );
    }

    // ✅ Concatenate all audio chunks
    const finalBuffer = Buffer.concat(audioBuffers);
    await fs.writeFile(outputPath, finalBuffer);

    logger.success(
      "VOICEOVER",
      `Final audio saved: ${path.basename(outputPath)}`
    );
    logger.stage(
      "📦",
      "VOICEOVER",
      `Total size: ${(finalBuffer.length / 1024).toFixed(2)} KB`
    );
  }

  private async getAudioDuration(
    audioPath: string,
    logger: ConsoleLogger
  ): Promise<number> {
    logger.stage("⏱️", "ANALYSIS", "Analyzing audio duration...");

    const ffmpegInstance = await initFFmpeg();

    return new Promise((resolve, reject) => {
      (ffmpegInstance as any).ffprobe(
        audioPath,
        (err: Error | null, metadata: any) => {
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
        }
      );
    });
  }

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

      // ✅ FIX 2: Proper File creation for Node.js Buffer
      const file = new File(
        [new Uint8Array(audioFile)], // Convert Buffer to Uint8Array
        path.basename(audioPath),
        { type: "audio/mpeg" }
      );

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
      "prompt": "Detailed DALL-E prompt for background image...",
      "text": "Script text for this scene..."
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Niche: ${niche}\n\nScript:\n${script}\n\nCreate **10-15 short scenes** with engaging visuals that match the script narrative.`,
          },
        ],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error("Invalid scene format from AI");
      }

      logger.success("AI ANALYSIS", `Created ${parsed.scenes.length} scenes`);
      parsed.scenes.forEach((scene: Scene, i: number) => {
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

  // ✅ FIX: Add missing fallback method
  private fallbackSceneSplit(
    script: string,
    niche: string,
    logger: ConsoleLogger
  ): Scene[] {
    logger.stage("🔄", "FALLBACK", "Using fallback scene splitting...");

    // Split script into sentences
    const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
    const scenesPerGroup = Math.ceil(sentences.length / 12); // Aim for ~12 scenes

    const scenes: Scene[] = [];

    for (let i = 0; i < sentences.length; i += scenesPerGroup) {
      const sceneText = sentences
        .slice(i, i + scenesPerGroup)
        .join(" ")
        .trim();

      scenes.push({
        title: `Scene ${scenes.length + 1}`,
        text: sceneText,
        prompt: `Professional ${niche} business scene, modern office or work environment, clean corporate aesthetic, 16:9 aspect ratio`,
      });
    }

    logger.success("FALLBACK", `Created ${scenes.length} fallback scenes`);
    return scenes;
  }

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

      // ✅ FIX 3: Add proper null check
      if (!response.data || response.data.length === 0) {
        throw new Error("No image data received from OpenAI");
      }

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL received from OpenAI");
      }

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

    const ffmpegInstance = await initFFmpeg();

    return new Promise((resolve, reject) => {
      const ff = (ffmpegInstance as any)();
      const startTime = Date.now();

      // ✅ FIX: Validate text is English-only (remove non-ASCII characters)
      const cleanTitle = title
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
        .substring(0, 50) // Limit length for safety
        .trim();

      // ✅ FIX: Improved text escaping for FFmpeg
      const escapedTitle = cleanTitle
        .replace(/\\/g, "\\\\\\\\")
        .replace(/'/g, "'\\\\\\''")
        .replace(/:/g, "\\:")
        .replace(/%/g, "\\%");

      if (bgImagePath && bgImagePath !== "") {
        logger.stage(
          "🖼️",
          "SCENE VIDEO",
          `[${index + 1}] Using generated image with smooth zoom`
        );

        // ✅ FIX: Smoother zoom with lower rate to prevent vibration
        const zoomDuration = Math.ceil(duration * 30);

        ff.input(bgImagePath)
  .loop(duration)
  .videoFilters([
    // ✅ FIX: STATIC image with proper scaling (NO ZOOM - eliminates vibration)
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080`,
    
    // ✅ Professional text overlay (same as before)
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escapedTitle}':fontcolor=white:fontsize=56:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-200`,
    
    // ✅ Subtle vignette for depth
    `vignette=angle=PI/4:mode=backward`,
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
            // ✅ FIX: Consistent text styling for fallback mode
            `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${escapedTitle}':fontcolor=white:fontsize=56:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`,
          ]);
      }

      ff.outputOptions([
        `-t ${duration}`,
        "-c:v libx264",
        "-preset medium", // ✅ Can change to "slow" for better quality but longer processing
        "-crf 23", // ✅ Good quality (18-28 range, lower = better)
        "-pix_fmt yuv420p",
        "-r 30", // ✅ Consistent 30fps (prevents frame rate issues)
        "-movflags +faststart", // ✅ Enable streaming playback
      ])
        .output(outputPath)
        .on("progress", (p: any) => {
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
        .on("error", (err: Error) => {
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

  private async generateKaraokeSubtitles(
    wordTimings: WordTiming[],
    outputPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("🎤", "SUBTITLES", "Generating karaoke-style subtitles...");

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
      const wordsPerLine = 7;

      for (let i = 0; i < wordTimings.length; i += wordsPerLine) {
        const lineWords = wordTimings.slice(i, i + wordsPerLine);
        const startTime = lineWords[0].start;
        const endTime = lineWords[lineWords.length - 1].end;

        let karaokeText = "";
        for (const word of lineWords) {
          const duration = Math.round((word.end - word.start) * 100);
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

  /**
   * Generate traditional closed captions (phrase-by-phrase)
   * Professional B2B style - clean and unobtrusive
   */
  private async generateTraditionalSubtitles(
    wordTimings: WordTiming[],
    outputPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage(
      "📝",
      "SUBTITLES",
      "Generating traditional closed captions..."
    );

    try {
      // Group words into phrases (3-7 seconds each, ~10-15 words)
      const phrases: Array<{
        start: number;
        end: number;
        text: string;
      }> = [];

      let currentPhrase: string[] = [];
      let phraseStart = 0;
      let lastEnd = 0;

      for (let i = 0; i < wordTimings.length; i++) {
        const word = wordTimings[i];
        currentPhrase.push(word.word);
        lastEnd = word.end;

        // Create new phrase every ~10 words or ~5 seconds
        const shouldBreak =
          currentPhrase.length >= 10 ||
          word.end - phraseStart >= 5 ||
          i === wordTimings.length - 1;

        if (shouldBreak) {
          phrases.push({
            start: phraseStart,
            end: lastEnd,
            text: currentPhrase.join(" "),
          });

          currentPhrase = [];
          phraseStart = lastEnd;
        }
      }

      // Generate SRT format (standard subtitle format)
      let srtContent = "";
      phrases.forEach((phrase, index) => {
        const startTime = this.formatSRTTime(phrase.start);
        const endTime = this.formatSRTTime(phrase.end);

        srtContent += `${index + 1}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${phrase.text}\n\n`;
      });

      await fs.writeFile(outputPath, srtContent, "utf-8");

      logger.success(
        "SUBTITLES",
        `Traditional subtitles created (${phrases.length} phrases)`
      );
    } catch (error) {
      logger.error(
        "SUBTITLES",
        "Failed to create traditional subtitles",
        error
      );
      throw error;
    }
  }

  /**
   * Format time for SRT subtitles (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${millis
      .toString()
      .padStart(3, "0")}`;
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);

    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  }

  private async generateThumbnail(
    videoPath: string,
    thumbnailPath: string,
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage("📸", "THUMBNAIL", "Generating thumbnail from video...");

    const ffmpegInstance = await initFFmpeg();

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      (ffmpegInstance as any)(videoPath)
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
        .on("error", (err: Error) => {
          logger.error("THUMBNAIL", "Thumbnail generation failed", err);
          reject(err);
        });
    });
  }

  private async mergeScenesAndAudio(
    sceneVideos: string[],
    outputPath: string,
    audioPath: string,
    subtitlePath: string,
    subtitleType: "none" | "traditional" | "karaoke",
    logger: ConsoleLogger
  ): Promise<void> {
    logger.stage(
      "🎞️",
      "MERGING",
      `Concatenating ${sceneVideos.length} scenes with audio...`
    );

    const ffmpegInstance = await initFFmpeg();

    return new Promise((resolve, reject) => {
      const ff = (ffmpegInstance as any)();
      const startTime = Date.now();

      sceneVideos.forEach((video, i) => {
        logger.stage(
          "📥",
          "MERGING",
          `Input ${i + 1}: ${path.basename(video)}`
        );
        ff.input(video);
      });

      ff.input(audioPath);
      logger.stage("🎵", "MERGING", `Audio: ${path.basename(audioPath)}`);

      const filterComplex =
        sceneVideos.map((_, i) => `[${i}:v]`).join("") +
        `concat=n=${sceneVideos.length}:v=1:a=0[v]`;

      logger.stage("🔧", "MERGING", "Applying video concatenation filter...");

      // ✅ Add subtitle filter if subtitles are enabled
      let videoMap = "[v]";
      if (subtitlePath && subtitleType !== "none") {
        const subtitleFilter =
          subtitleType === "traditional"
            ? `subtitles=${subtitlePath.replace(
                /\\/g,
                "/"
              )}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H80000000,Bold=0,Alignment=2,MarginV=60'`
            : `ass=${subtitlePath.replace(/\\/g, "/")}`;

        ff.complexFilter([filterComplex, `[v]${subtitleFilter}[vout]`]);
        videoMap = "[vout]";
        logger.stage(
          "📝",
          "MERGING",
          `Adding ${subtitleType} subtitles to video...`
        );
      } else {
        ff.complexFilter(filterComplex);
        logger.stage(
          "🎬",
          "MERGING",
          "Merging without subtitles (clean look)..."
        );
      }

      ff.outputOptions([
        `-map ${videoMap}`,
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
        .on("progress", (p: any) => {
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
        .on("error", (err: Error) => {
          logger.error("MERGING", "Merge failed", err);
          reject(err);
        })
        .run();
    });
  }

  async generateVSL(options: VSLGenerationOptions) {
    await initFFmpeg();

    console.log("📋 VSL Generator received options:", {
      vslId: options.vslId,
      title: options.title,
      niche: options.niche,
      targetDuration: options.targetDuration || "2min",
      hasScript: !!options.script,
    });

    const videoId = uuidv4();
    const audioPath = path.join(this.tempDir, `${videoId}-audio.mp3`);
    const videoPath = path.join(this.tempDir, `${videoId}.mp4`);
    const thumbnailPath = path.join(this.tempDir, `${videoId}-thumb.jpg`);
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

      // 1.5 Get word-level timings
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

      // 3. Generate images
      logger.stage(
        "🎨",
        "IMAGE GEN",
        `Starting generation of ${scenes.length} images...`
      );
      const sceneImages: string[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
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

      // 4. Create scene videos
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

      // 5. Generate subtitles (optional based on settings)
      const subtitleOption = options.subtitles || "none"; // Default: no subtitles
      let subtitlePath = "";

      if (subtitleOption !== "none") {
        progressTracker.updateProgress({
          vslId: options.vslId,
          stage: "subtitles",
          progress: 82,
          message: `Generating ${subtitleOption} subtitles...`,
          status: "processing",
        });

        logger.stage(
          "📝",
          "SUBTITLES",
          `Creating ${subtitleOption} subtitles...`
        );

        if (subtitleOption === "traditional") {
          subtitlePath = path.join(this.tempDir, `${videoId}.srt`);
          await this.generateTraditionalSubtitles(
            wordTimings,
            subtitlePath,
            logger
          );
        } else if (subtitleOption === "karaoke") {
          subtitlePath = path.join(this.tempDir, `${videoId}.ass`);
          await this.generateKaraokeSubtitles(
            wordTimings,
            subtitlePath,
            logger
          );
        }
      } else {
        logger.stage(
          "📝",
          "SUBTITLES",
          "Skipping subtitles (clean professional look)"
        );
      }

      // 6. Merge scenes with audio (and optional subtitles)
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "assembly",
        progress: 85,
        message: "Assembling final video...",
        status: "processing",
      });

      await this.mergeScenesAndAudio(
        sceneVideos,
        videoPath,
        audioPath,
        subtitlePath,
        subtitleOption,
        logger
      );

      // 7. Generate thumbnail
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "thumbnail",
        progress: 90,
        message: "Generating thumbnail...",
        status: "processing",
      });

      await this.generateThumbnail(videoPath, thumbnailPath, logger);

      // 8. Upload to Cloudinary
      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "upload",
        progress: 93,
        message: "Uploading to Cloudinary...",
        status: "processing",
      });

      logger.stage("☁️", "CLOUDINARY", "Uploading video to cloud storage...");

      const videoUploadResult = await cloudinaryService.uploadVideo(
        videoPath,
        `vsl_${videoId}`
      );
      logger.success(
        "CLOUDINARY",
        `Video uploaded: ${videoUploadResult.secureUrl}`
      );

      logger.stage(
        "☁️",
        "CLOUDINARY",
        "Uploading thumbnail to cloud storage..."
      );

      const thumbnailUploadResult = await cloudinaryService.uploadImage(
        thumbnailPath,
        `vsl_thumb_${videoId}`
      );
      logger.success(
        "CLOUDINARY",
        `Thumbnail uploaded: ${thumbnailUploadResult.secureUrl}`
      );

      // 9. Cleanup
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
      if (subtitlePath) {
        await fs.unlink(subtitlePath).catch(() => {});
      }
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});

      cleanupCount += 4;
      logger.success("CLEANUP", `Removed ${cleanupCount} temporary files`);

      progressTracker.updateProgress({
        vslId: options.vslId,
        stage: "complete",
        progress: 100,
        message: "Video generation complete!",
        status: "completed",
      });

      logger.complete(Math.round(totalDuration));

      return {
        videoUrl: videoUploadResult.secureUrl,
        thumbnailUrl: thumbnailUploadResult.secureUrl,
        duration: Math.round(totalDuration),
        cloudinaryPublicIds: {
          video: videoUploadResult.publicId,
          thumbnail: thumbnailUploadResult.publicId,
        },
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
