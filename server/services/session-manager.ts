// server/services/session-manager.ts

import { db } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

interface SessionData {
  userId: string;
  createdAt: string;
  lastActivity?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
  };
}

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
}

export class SessionManager {
  /**
   * Generate a unique fingerprint for session security
   */
  generateFingerprint(userAgent: string, ipAddress: string): string {
    return crypto
      .createHash("sha256")
      .update(`${userAgent}:${ipAddress}`)
      .digest("hex");
  }

  /**
   * Parse user agent string to extract device info
   */
  parseUserAgent(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser = "Unknown";
    if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("firefox")) browser = "Firefox";
    else if (ua.includes("safari") && !ua.includes("chrome"))
      browser = "Safari";
    else if (ua.includes("edg")) browser = "Edge";
    else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

    // Add version if available
    const versionMatch = ua.match(/(?:chrome|firefox|safari|edg|opr)\/(\d+)/);
    if (versionMatch) {
      browser += `/${versionMatch[1]}`;
    }

    // Detect OS
    let os = "Unknown";
    if (ua.includes("windows nt 10.0")) os = "Windows 10";
    else if (ua.includes("windows nt 6.3")) os = "Windows 8.1";
    else if (ua.includes("windows nt 6.2")) os = "Windows 8";
    else if (ua.includes("windows nt 6.1")) os = "Windows 7";
    else if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("mac os x")) os = "Mac OS X";
    else if (ua.includes("linux")) os = "Linux";
    else if (ua.includes("android")) os = "Android";
    else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

    // Detect device type
    let device = "Desktop";
    if (
      ua.includes("mobile") ||
      ua.includes("android") ||
      ua.includes("iphone")
    ) {
      device = "Mobile";
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      device = "Tablet";
    }

    return { browser, os, device };
  }

  /**
   * Track session activity and update metadata
   */
  async trackActivity(
    sessionId: string,
    userId: string,
    metadata: {
      userAgent?: string;
      ipAddress?: string;
      deviceInfo?: DeviceInfo;
    }
  ): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE sessions 
        SET sess = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                sess,
                '{lastActivity}',
                to_jsonb(${new Date().toISOString()}::text)
              ),
              '{userAgent}',
              to_jsonb(${metadata.userAgent || ""}::text)
            ),
            '{ipAddress}',
            to_jsonb(${metadata.ipAddress || ""}::text)
          ),
          '{deviceInfo}',
          ${JSON.stringify(metadata.deviceInfo || {})}::jsonb
        )
        WHERE sid = ${sessionId}
        AND sess->>'userId' = ${userId}
      `);

      // ✅ REMOVED: Verbose logging
      // Only log errors, not every successful update
    } catch (error) {
      console.error("❌ Failed to track session activity:", error);
      // Don't throw - activity tracking shouldn't break the request
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          sid as "sessionId",
          sess->>'userId' as "userId",
          sess->>'createdAt' as "createdAt",
          sess->>'lastActivity' as "lastActivity",
          sess->>'userAgent' as "userAgent",
          sess->>'ipAddress' as "ipAddress",
          sess->'deviceInfo' as "deviceInfo",
          expire as "expiresAt"
        FROM sessions
        WHERE sess->>'userId' = ${userId}
        AND expire > NOW()
        ORDER BY (sess->>'lastActivity')::timestamp DESC
      `);

      return result.rows.map((row: any) => ({
        sessionId: row.sessionId,
        userId: row.userId,
        createdAt: row.createdAt,
        lastActivity: row.lastActivity,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        deviceInfo: row.deviceInfo,
        expiresAt: row.expiresAt,
      }));
    } catch (error) {
      console.error("❌ Error fetching user sessions:", error);
      return [];
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        DELETE FROM sessions
        WHERE sid = ${sessionId}
        AND sess->>'userId' = ${userId}
      `);

      console.log(
        `✅ Session revoked: ${sessionId.substring(0, 8)}... (User: ${userId.substring(0, 8)}...)`
      );
      return true;
    } catch (error) {
      console.error("❌ Error revoking session:", error);
      return false;
    }
  }

  /**
   * Revoke all other sessions except current one
   */
  async revokeAllOtherSessions(
    currentSessionId: string,
    userId: string
  ): Promise<number> {
    try {
      const result = await db.execute(sql`
        DELETE FROM sessions
        WHERE sess->>'userId' = ${userId}
        AND sid != ${currentSessionId}
        AND expire > NOW()
      `);

      const count = result.rowCount || 0;
      console.log(
        `✅ Revoked ${count} other sessions for user: ${userId.substring(0, 8)}...`
      );
      return count;
    } catch (error) {
      console.error("❌ Error revoking other sessions:", error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db.execute(sql`
        DELETE FROM sessions
        WHERE expire < NOW()
      `);

      const count = result.rowCount || 0;
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired sessions`);
      }
      return count;
    } catch (error) {
      console.error("❌ Error cleaning up sessions:", error);
      return 0;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();