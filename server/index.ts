// server/index.ts
import { videoSOPs } from "./../shared/advanced-schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import authRouter from "./auth";
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { config } from "dotenv";
import stripeWebhookRouter from "./routes/stripe-webhook";
import voice_AI_CallRouter from "./routes/twilio-call.route";
// import videoSOPsRouter from "./routes/videoSOPs.route";
// import notionSOPsRouter from "./routes/notionSOPs.route";
import { loadUser } from "./middleware/auth";
import path from "path";
import pg from "pg";
import { spamPatternLearning } from "./services/spamPatternLearning";
import twoFactorRoutes from "./routes/2fa";
import passport from "./config/passport";

// import transferRouter from "./routes/transfer.route";
// import leadsRouter from "./routes/leads.route";
// import transcriptsRouter from "./routes/transcripts.route";

// import queueRouter from "./routes/queue.route";
// import callsRouter from "./routes/calls.route";
// import twilioRouter from "./routes/twilio.route";

const { Pool } = pg;
config();
config({ override: false });

// Create PostgreSQL pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 second timeout
});

// ✅ Add connection error handling
pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  if (err.message?.includes("ENOTFOUND")) {
    console.error("💡 Database hostname cannot be resolved");
    console.error("💡 If using Neon free tier, check if database is suspended");
  }
});

// ✅ Test connection on startup
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    if (err.message?.includes("ENOTFOUND")) {
      console.error("💡 Cannot resolve database hostname");
      console.error("💡 Check your DATABASE_  URL in .env");
      console.error(
        "💡 If using Neon, visit https://console.neon.tech to wake up database"
      );
    }
  } else {
    console.log("✅ Database connected successfully");
  }
});

const app = express();

// for production
// app.set("trust proxy", 1);
app.set("trust proxy", 1);
// ✅ Trust proxy (production only)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);
// Basic middleware
app.use(express.json());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.urlencoded({ extended: true }));

// app.use("/api/video-sops", videoSOPsRouter);
// app.use("/api/notion-sops", notionSOPsRouter);
// ✅ CRITICAL: PostgreSQL Session Store (instead of memory)
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

app.use("/api/twilioCall-webhook", express.raw({ type: "application/json" }));
app.use("/api/twilioCall-webhook", voice_AI_CallRouter);
// app.use("/api/transfer-to-human", transferRouter);
// app.use("/api/leads", leadsRouter);
// app.use("/api/transcripts", transcriptsRouter);

app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: "sessions",
      createTableIfMissing: true, // Auto-create table if missing
    }),
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on each request
    name: "sessionId",

    proxy: isProduction,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days

      sameSite: isProduction ? "lax" : "lax",

      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ Load user from session (must be after session, before routes)
app.use(loadUser);

// Auth routes (login, signup, logout)
app.use(authRouter);
app.use(twoFactorRoutes);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ✅ INITIALIZE SERVICES BEFORE STARTING SERVER
  console.log("🚀 Initializing services...");

  try {
    await spamPatternLearning.initialize();
    console.log("✅ Spam pattern learning initialized");
  } catch (error) {
    console.error("❌ Failed to initialize spam pattern learning:", error);
    // Continue anyway - service will initialize on first use
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    // ✅ Serve React app for all non-API routes in production
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), "dist", "public", "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Server running on port ${PORT}`);
    log(`📱 Environment: ${app.get("env")}`);
    log(`🔐 Session store: PostgreSQL`);
    log(`🧠 AI Pattern Learning: Active`);
  });
})();
