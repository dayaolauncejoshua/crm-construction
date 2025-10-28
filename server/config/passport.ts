// server/config/passport.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL!;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.warn("⚠️ Google OAuth credentials missing in .env");
}

// ✅ Serialize user - use string ID
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// ✅ Deserialize user - return full user object
passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user || undefined);
  } catch (error) {
    done(error, undefined);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔍 Google OAuth callback received");
        console.log("Profile email:", profile.emails?.[0]?.value);

        const googleEmail = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;

        if (!googleEmail) {
          return done(new Error("No email from Google"), undefined);
        }

        // Check if user exists by Google ID
        let [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId));

        if (existingUser) {
          console.log("✅ Existing Google user found:", existingUser.email);

          await db
            .update(users)
            .set({
              lastLoginAt: new Date(),
              loginCount: (existingUser.loginCount || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));

          return done(null, existingUser);
        }

        // Check if user exists with same email
        [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleEmail));

        if (existingUser) {
          console.log("🔗 Linking Google to existing account:", googleEmail);

          const [updatedUser] = await db
            .update(users)
            .set({
              googleId: googleId,
              oauthProvider: "google",
              emailVerified: true,
              profileImageUrl: profile.photos?.[0]?.value,
              lastLoginAt: new Date(),
              loginCount: (existingUser.loginCount || 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning();

          return done(null, updatedUser);
        }

        // Create new user
        console.log("🆕 Creating new Google user:", googleEmail);

        const [newUser] = await db
          .insert(users)
          .values({
            email: googleEmail,
            googleId: googleId,
            oauthProvider: "google",
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value,
            emailVerified: true,
            role: "user",
            loginCount: 1,
            lastLoginAt: new Date(),
          })
          .returning();

        console.log("✅ New Google user created:", newUser.email);

        return done(null, newUser);
      } catch (error: any) {
        console.error("❌ Google OAuth error:", error);
        return done(error, undefined);
      }
    }
  )
);

export default passport;