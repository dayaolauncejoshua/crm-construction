// server/utils/console-logger.ts

export class ConsoleLogger {
  private startTime: number;
  private vslId: string;

  constructor(vslId?: string) {
    this.vslId = vslId || "unknown";
    this.startTime = Date.now();
  }

  private getTimestamp(): string {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    return `[${elapsed}s]`;
  }

  private formatLog(emoji: string, stage: string, message: string): string {
    const shortId =
      this.vslId && this.vslId.length >= 8
        ? this.vslId.slice(0, 8)
        : this.vslId;
    return `${this.getTimestamp()} ${emoji} [VSL: ${shortId}] [${stage}] ${message}`;
  }

  start(message: string) {
    console.log("\n" + "=".repeat(80));
    console.log(`🎬 VSL GENERATION STARTED - ${this.vslId}`);
    console.log(`📝 ${message}`);
    console.log("=".repeat(80) + "\n");
  }

  stage(emoji: string, stage: string, message: string) {
    console.log(this.formatLog(emoji, stage, message));
  }

  progress(
    emoji: string,
    stage: string,
    current: number,
    total: number,
    item: string
  ) {
    const percent = ((current / total) * 100).toFixed(0);
    console.log(
      this.formatLog(
        emoji,
        stage,
        `[${current}/${total}] (${percent}%) - ${item}`
      )
    );
  }

  success(stage: string, message: string) {
    console.log(this.formatLog("✅", stage, message));
  }

  warning(stage: string, message: string) {
    console.log(this.formatLog("⚠️", stage, message));
  }

  error(stage: string, message: string, error?: any) {
    console.error(this.formatLog("❌", stage, message));
    if (error) {
      console.error(`   └─ Error: ${error.message || error}`);
    }
  }

  complete(duration: number) {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(80));
    console.log(`✅ VSL GENERATION COMPLETED - ${this.vslId}`);
    console.log(`⏱️  Total Time: ${totalTime}s`);
    console.log(`🎥 Video Duration: ${duration}s`);
    console.log("=".repeat(80) + "\n");
  }

  failed(reason: string) {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(80));
    console.error(`❌ VSL GENERATION FAILED - ${this.vslId}`);
    console.error(`⏱️  Failed after: ${totalTime}s`);
    console.error(`💥 Reason: ${reason}`);
    console.log("=".repeat(80) + "\n");
  }
}
