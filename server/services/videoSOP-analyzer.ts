// // videoSOP-analyzer.ts
// import fs from "fs";
// import fsp from "fs/promises";
// import path from "path";
// import fetch from "node-fetch";
// import ffmpeg from "fluent-ffmpeg";
// import OpenAI from "openai";
// import { v4 as uuidv4 } from "uuid";
// import ytdl from "@distube/ytdl-core";
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY2 });

// export class VideoSOPAnalyzer {
//   private tempDir = path.join(process.cwd(), "temp", "video-sop");

//   constructor() {
//     fsp.mkdir(this.tempDir, { recursive: true }).catch(() => {});
//   }

//   async analyzeVideo(videoUrl: string) {
//     console.log("🔍 analyzeVideo() start:", videoUrl);
//     try {
//       const videoPath = await this.downloadVideo(videoUrl);
//       console.log("✅ video downloaded:", videoPath);

//       const audioPath = await this.extractAudio(videoPath);
//       console.log("✅ audio extracted:", audioPath);

//       const transcript = await this.transcribeAudio(audioPath);
//       console.log("✅ transcript done, length:", transcript.length);

//       const summaryData = await this.summarizeTranscript(transcript);
//       console.log("✅ summary done");

//       await fsp.unlink(audioPath).catch(() => {});
//       await fsp.unlink(videoPath).catch(() => {});

//       return {
//         transcript,
//         transcriptStatus: "done",
//         aiSummary: summaryData.summary,
//         aiBreakdown: summaryData,
//       };
//     } catch (err) {
//       console.error("❌ analyzeVideo() failed:", err);
//       throw err;
//     }
//   }

//   private async downloadVideo(videoUrl: string): Promise<string> {
//     console.log("⬇️  downloadVideo:", videoUrl);
//     const id = uuidv4();
//     const inputPath = path.join(this.tempDir, `${id}.mp4`);

//     if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
//       return new Promise((resolve, reject) => {
//         ytdl(videoUrl, { quality: "highest" })
//           .pipe(fs.createWriteStream(inputPath))
//           .on("finish", () => resolve(inputPath))
//           .on("error", reject);
//       });
//     }

//     const res = await fetch(videoUrl);
//     if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
//     const buffer = Buffer.from(await res.arrayBuffer());
//     await fsp.writeFile(inputPath, buffer);
//     return inputPath;
//   }

//   private extractAudio(videoPath: string): Promise<string> {
//     console.log("🎧 extractAudio:", videoPath);
//     const audioPath = videoPath.replace(/\.\w+$/, ".mp3");
//     return new Promise((resolve, reject) => {
//       ffmpeg(videoPath)
//         .noVideo()
//         .audioCodec("libmp3lame")
//         .save(audioPath)
//         .on("end", () => resolve(audioPath))
//         .on("error", reject);
//     });
//   }

//   private async transcribeAudio(audioPath: string): Promise<string> {
//     console.log("🗣️ transcribeAudio:", audioPath);
//     const fileData = await fsp.readFile(audioPath);
//     const response = await openai.audio.transcriptions.create({
//       model: "whisper-1",
//       file: new File([fileData], "audio.mp3"),
//     });
//     return response.text || "";
//   }

//   private async summarizeTranscript(transcript: string) {
//     console.log("🧠 summarizeTranscript start");
//     const prompt = `
//       Here is a video transcript:
//       ${transcript}

//       Please return a JSON object like:
//       {
//         "summary": "Short summary",
//         "steps": ["Step 1", "Step 2"],
//         "keyTopics": ["Topic 1", "Topic 2"]
//       }
//     `;

//     const res = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//     });

//     const content = res.choices[0]?.message?.content ?? "{}";
//     try {
//       return JSON.parse(content);
//     } catch {
//       return { summary: "", steps: [], keyTopics: [] };
//     }
//   }
// }

// export const videoSOPAnalyzer = new VideoSOPAnalyzer();
