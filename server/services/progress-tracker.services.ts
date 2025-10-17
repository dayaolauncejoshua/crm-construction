import { EventEmitter } from "events";

export interface ProgressUpdate {
  vslId: string;
  stage: string;
  progress: number;
  message: string;
  status: "processing" | "completed" | "error";
}

class ProgressTracker extends EventEmitter {
  private activeGenerations = new Map<string, ProgressUpdate>();

  updateProgress(update: ProgressUpdate) {
    this.activeGenerations.set(update.vslId, update);
    this.emit(`progress:${update.vslId}`, update);
  }

  getProgress(vslId: string): ProgressUpdate | undefined {
    return this.activeGenerations.get(vslId);
  }

  clearProgress(vslId: string) {
    this.activeGenerations.delete(vslId);
  }
}

export const progressTracker = new ProgressTracker();
