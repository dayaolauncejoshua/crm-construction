// server/middleware/session-activity.ts

import { Request, Response, NextFunction } from "express";
import { sessionManager } from "../services/session-manager";

export const trackSessionActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Don't block the request - track activity asynchronously
  setImmediate(async () => {
    try {
      const sessionId = req.sessionID;
      const userId = (req.session as any)?.userId;

      if (!sessionId || !userId) {
        return; // No session to track
      }

      // ✅ FIXED: Properly extract and structure metadata
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress = (req.ip || req.headers["x-forwarded-for"] || "").toString();
      
      // Parse device info
      const deviceInfo = sessionManager.parseUserAgent(userAgent);

      // ✅ Track activity with properly structured metadata
      await sessionManager.trackActivity(sessionId, userId, {
        userAgent,
        ipAddress,
        deviceInfo,
      });

      // ✅ Touch the session to extend expiry (rolling sessions)
      req.session.touch();
    } catch (error) {
      // Log error but don't break the request
      console.error("❌ Failed to track session activity:", error);
    }
  });

  next(); // Continue with the request immediately
};