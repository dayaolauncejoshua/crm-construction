// server/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, User } from "@shared/schema";
import { eq } from "drizzle-orm";

// // Extend Express Request type to include user
// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         email: string;
//         role: string;
//         firstName?: string | null;
//         lastName?: string | null;
//         isTrialActive?: boolean | null;
//         trialEndsAt?: Date | null;
        
//       };
//     }
//   }
// }

// Middleware to load user from session
async function loadUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.session as any)?.userId;

    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (user) {
        // ✅ Set the full user object from schema
        req.user = user;
        
      } else {
        console.log("❌ User not found in DB for userId:", userId);
      }
    } else {
      // console.log("❌ No userId in session");
    }

    next();
  } catch (error) {
    console.error("Error loading user:", error);
    next();
  }
}

// Check if user is authenticated (blocks if not logged in)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;

  if (!userId || !req.user) {
    console.log("❌ Auth required but not authenticated:", req.path);
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Check if user is super admin
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req.session as any)?.userId;

  if (!userId || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "super_admin") {
    return res
      .status(403)
      .json({ message: "Super admin access required" });
  }

  next();
}

// Optional auth - doesn't block, just loads user if authenticated
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  next();
}

export { loadUser };