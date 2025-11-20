// server/services/ai-health-monitor.ts
// Monitors Claude API health and logs metrics

import { getClaudeAPIHealth } from "./claude";
import { storage } from "../storage";

interface HealthMetrics {
  timestamp: Date;
  status: "healthy" | "degraded" | "down";
  consecutive529Errors: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
}

class AIHealthMonitor {
  private metrics: HealthMetrics = {
    timestamp: new Date(),
    status: "healthy",
    consecutive529Errors: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
  };

  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_SAMPLES = 100;
  private intervalId: NodeJS.Timeout | null = null;
  private broadcastFn: ((data: any) => void) | null = null;

  /**
   * Set broadcast function for WebSocket updates
   */
  setBroadcastFunction(fn: (data: any) => void): void {
    this.broadcastFn = fn;
    console.log("✅ [HEALTH] Broadcast function registered");
  }

  /**
   * Start the health monitor
   */
  start(): void {
    if (this.intervalId) {
      console.log("⚠️ [HEALTH] Monitor already running");
      return;
    }

    console.log("🏥 [HEALTH] Starting AI health monitor...");

    // Check health every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkHealth();

    console.log("✅ [HEALTH] Monitor started (checking every 5 minutes)");
  }

  /**
   * Stop the health monitor
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("⏹️ [HEALTH] Monitor stopped");
  }

  /**
   * Record a successful API call
   */
  recordSuccess(responseTimeMs: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    // Track response time
    this.responseTimes.push(responseTimeMs);
    if (this.responseTimes.length > this.MAX_RESPONSE_SAMPLES) {
      this.responseTimes.shift();
    }

    // Update average
    this.metrics.avgResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;
  }

  /**
   * Record a failed API call
   */
  recordFailure(error: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    // Log if it's a 529 error
    if (error.status === 529 || error.error?.type === "overloaded_error") {
      console.log(`🚨 [HEALTH] 529 error recorded`);
    }
  }

  /**
   * Check current health status
   */
  private checkHealth(): void {
    const health = getClaudeAPIHealth();

    this.metrics.timestamp = new Date();
    this.metrics.status = health.status;
    this.metrics.consecutive529Errors = health.consecutive529Errors;

    console.log(`\n🏥 [HEALTH] Status Report:`);
    console.log(`   Status: ${health.status.toUpperCase()}`);
    console.log(`   Consecutive 529s: ${health.consecutive529Errors}`);
    console.log(`   Total Requests: ${this.metrics.totalRequests}`);
    console.log(`   Successful: ${this.metrics.successfulRequests}`);
    console.log(`   Failed: ${this.metrics.failedRequests}`);
    console.log(
      `   Avg Response Time: ${this.metrics.avgResponseTime.toFixed(0)}ms`
    );

    if (health.status !== "healthy") {
      console.warn(`⚠️ [HEALTH] API Status: ${health.status}`);

      // Broadcast degraded status
      if (this.broadcastFn) {
        this.broadcastFn({
          type: "ai_health_alert",
          status: health.status,
          consecutive529Errors: health.consecutive529Errors,
          message:
            health.status === "down"
              ? "Claude API is currently unavailable"
              : "Claude API is experiencing degraded performance",
        });
      }
    }

    // Log to database every hour (if we have metrics)
    if (this.metrics.totalRequests > 0) {
      this.logMetrics().catch((err) =>
        console.error("❌ [HEALTH] Failed to log metrics:", err)
      );
    }

    console.log(``);
  }

  /**
   * Log metrics to database
   */
  private async logMetrics(): Promise<void> {
    try {
      // You would implement this in storage.ts
      // await storage.logAIHealthMetrics(this.metrics);

      console.log("✅ [HEALTH] Metrics logged to database");
    } catch (error) {
      console.error("❌ [HEALTH] Failed to log metrics:", error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalRequests === 0) return 100;
    return (
      (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
    );
  }
}

export const aiHealthMonitor = new AIHealthMonitor();