// server/services/health-monitor.ts
import { pool } from "../db";
import { getClaudeAPIHealth } from "./claude";
import { aiHealthMonitor } from "./ai-health-monitor";

const serverStartTime = Date.now();

export type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

export interface ServiceHealth {
  status: ServiceStatus;
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

export interface SystemHealth {
  whatsapp: ServiceHealth;
  ai: ServiceHealth;
  vsl: ServiceHealth;
  uptime: string;
  timestamp: string;
}

function getServerUptime(): string {
  const uptimeMs = Date.now() - serverStartTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  if (uptimeDays > 0) {
    return `${uptimeDays}d ${uptimeHours % 24}h`;
  } else if (uptimeHours > 0) {
    return `${uptimeHours}h ${uptimeMinutes % 60}m`;
  } else if (uptimeMinutes > 0) {
    return `${uptimeMinutes}m`;
  } else {
    return `${uptimeSeconds}s`;
  }
}

async function checkWhatsAppHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return {
        status: "down",
        message: "WhatsApp credentials not configured",
        lastChecked: new Date().toISOString(),
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: "operational",
        responseTime,
        message: "Connected",
        lastChecked: new Date().toISOString(),
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        status: "down",
        responseTime,
        message: "Authentication failed",
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: "degraded",
        responseTime,
        message: `API error ${response.status}`,
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      status: "down",
      responseTime,
      message: error.name === "AbortError" ? "Timeout" : "Unreachable",
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkAIHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    const claudeHealth = getClaudeAPIHealth();
    const metrics = aiHealthMonitor.getMetrics();
    const responseTime = Date.now() - startTime;

    let status: ServiceStatus;
    let message: string;

    switch (claudeHealth.status) {
      case "healthy":
        status = "operational";
        message = "Active";
        break;
      case "degraded":
        status = "degraded";
        message = `Degraded (${claudeHealth.consecutive529Errors} errors)`;
        break;
      case "down":
        status = "down";
        message = "Unavailable";
        break;
      default:
        status = "degraded";
        message = "Unknown";
    }

    return {
      status,
      responseTime: metrics.avgResponseTime || responseTime,
      message,
      lastChecked: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
      message: "Check failed",
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkVSLHealth(): Promise<ServiceHealth> {
  try {
    // VSL is powered by Claude, so check Claude API health
    const claudeHealth = getClaudeAPIHealth();
    
    if (claudeHealth.status === "healthy") {
      return {
        status: "operational",
        responseTime: undefined,
        message: "VSL generation available",
        lastChecked: new Date().toISOString(), // ✅ Convert to string
      };
    } else if (claudeHealth.status === "degraded") {
      return {
        status: "degraded",
        responseTime: undefined,
        message: "VSL service experiencing issues",
        lastChecked: new Date().toISOString(), // ✅ Convert to string
      };
    } else {
      return {
        status: "down",
        responseTime: undefined,
        message: "VSL service unavailable",
        lastChecked: new Date().toISOString(), // ✅ Convert to string
      };
    }
  } catch (error) {
    console.error("Error checking VSL health:", error);
    return {
      status: "down",
      responseTime: undefined,
      message: error instanceof Error ? error.message : "VSL service unavailable",
      lastChecked: new Date().toISOString(), // ✅ Convert to string
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const [whatsapp, ai, vsl] = await Promise.all([
      checkWhatsAppHealth(),
      checkAIHealth(),
      checkVSLHealth(),
    ]);

    return {
      whatsapp,
      ai,
      vsl,
      uptime: getServerUptime(),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("❌ Health check failed:", error);
    
    return {
      whatsapp: { status: "down", message: "Check failed", lastChecked: new Date().toISOString() },
      ai: { status: "down", message: "Check failed", lastChecked: new Date().toISOString() },
      vsl: { status: "maintenance", message: "Under maintenance", lastChecked: new Date().toISOString() },
      uptime: getServerUptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthMonitor = {
  getSystemHealth,
  checkWhatsAppHealth,
  checkAIHealth,
  checkVSLHealth,
  getServerUptime,
};