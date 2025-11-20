// server/index.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import authRouter from "./auth";
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";
import { config } from "dotenv";
import stripeWebhookRouter from "./routes/stripe-webhook";
import voice_AI_CallRouter from "./routes/twilio-call.route";
import { loadUser } from "./middleware/auth";
import path from "path";
import { spamPatternLearning } from "./services/spamPatternLearning";
import twoFactorRoutes from "./routes/2fa";
import passport from "./config/passport";
import browserTestRouter from "./routes/browser-test.route";
import cors from "cors";

// Import pool from db.ts
import { pool } from "./db";

config();

// ✅ SMART ENVIRONMENT DETECTION
const isNgrok = process.env.NGROK_MODE === "true";
const isProduction = process.env.NODE_ENV === "production";
const mode = isNgrok ? "NGROK" : isProduction ? "PRODUCTION" : "DEVELOPMENT";

console.log(`🚀 Starting server in ${mode} mode`);

// Database connection monitoring
pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  if (err.message?.includes("ENOTFOUND")) {
    console.error("💡 Database hostname cannot be resolved");
    console.error("💡 If using Neon free tier, check if database is suspended");
  }
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    if (err.message?.includes("ENOTFOUND")) {
      console.error("💡 Cannot resolve database hostname");
      console.error("💡 Check your DATABASE_URL in .env");
    }
  } else {
    console.log("✅ Database connected successfully");
  }
});

const app = express();

// ✅ SMART PROXY CONFIGURATION
// Always trust proxy for ngrok and production (Render)
app.set("trust proxy", 1);

// ✅ SMART CORS CONFIGURATION
app.use(
  cors({
    origin: isNgrok
      ? true // Allow all origins for ngrok testing
      : isProduction
      ? process.env.FRONTEND_URL || false // Specific origin in production
      : "http://localhost:5000", // Local dev
    credentials: true,
  })
);

// Stripe webhook (raw body)
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

// Twilio webhook (raw body)
app.use("/api/twilioCall_webhook", express.raw({ type: "application/json" }));

// Standard middleware
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.urlencoded({ extended: true }));

// ✅ SMART SESSION CONFIGURATION
const PgSession = connectPgSimple(session);

app.use("/api/twilioCall_webhook", voice_AI_CallRouter);

app.use(
  session({
    store: new PgSession({
  pool: pool as any, // Cast to any to satisfy type checker
  tableName: "sessions",
  createTableIfMissing: true,
}),
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "sessionId",
    proxy: true, // Always true for both ngrok and production
    cookie: {
      secure: isProduction || isNgrok, // ✅ HTTPS for production and ngrok
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: isProduction || isNgrok ? "none" : "lax", // ✅ Cross-origin for production/ngrok
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(loadUser);

// Routes
app.use("/api/browser-test", browserTestRouter);
app.use(authRouter);
app.use(twoFactorRoutes);

// Request logging
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
  console.log("🚀 Initializing services...");

  try {
    await spamPatternLearning.initialize();
    console.log("✅ Spam pattern learning initialized");
  } catch (error) {
    console.error("❌ Failed to initialize spam pattern learning:", error);
  }

  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development, serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(process.cwd(), "dist", "public", "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Server running on port ${PORT}`);
    log(`📱 Environment: ${mode}`);
    log(`🔐 Session store: PostgreSQL`);
    log(`🧠 AI Pattern Learning: Active`);
    log(`🔌 WebSocket server: Initialized`);
    
    // ✅ Mode-specific logs
    if (isNgrok) {
      log(`🌐 NGROK MODE - Ready for WhatsApp webhook testing`);
      log(`🔗 Set webhook to: https://YOUR-NGROK-URL.ngrok-free.app/api/whatsapp/webhook`);
    } else if (isProduction) {
      log(`🌍 PRODUCTION MODE - CORS: ${process.env.FRONTEND_URL}`);
    } else {
      log(`🛠️ DEVELOPMENT MODE - Local testing only`);
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("⚠️ SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });
  });
})();