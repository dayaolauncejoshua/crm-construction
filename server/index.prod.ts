// server/index.prod.ts
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import authRouter from "./auth";
import express, { type Request, Response, NextFunction } from "express";
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
import { pool } from "./db";
import fs from 'fs';

config();

const app = express();

console.log(`🚀 Starting server in PRODUCTION mode`);

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
  } else {
    console.log("✅ Database connected successfully");
  }
});

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || false,
    credentials: true,
  })
);

app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

app.use("/api/twilioCall_webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.urlencoded({ extended: true }));

const PgSession = connectPgSimple(session);

app.use("/api/twilioCall_webhook", voice_AI_CallRouter);

app.use(
  session({
    store: new PgSession({
      pool: pool as any,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "sessionId",
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(loadUser);

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
      console.log(logLine);
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

  try {
    const { aiHealthMonitor } = await import("./services/ai-health-monitor");
    aiHealthMonitor.start();
    console.log("✅ AI health monitor initialized");
  } catch (error) {
    console.error("❌ Failed to initialize AI health monitor:", error);
  }

  try {
    const { aiRetryWorker } = await import("./services/ai-retry-worker");
    aiRetryWorker.start();
    console.log("✅ AI retry worker initialized");
  } catch (error) {
    console.error("❌ Failed to initialize AI retry worker:", error);
  }

  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // Serve static files (backend-only mode, no frontend)
  const publicPath = path.join(process.cwd(), "dist", "public");
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
    console.log("✅ Serving static files from:", publicPath);
  } else {
    console.log("⚠️ No frontend build found - backend only mode");
  }

  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔐 Session store: PostgreSQL`);
    console.log(`🧠 AI Pattern Learning: Active`);
    console.log(`🔌 WebSocket server: Initialized`);
    console.log(`🌍 PRODUCTION MODE - CORS: ${process.env.FRONTEND_URL}`);
  });

  process.on("SIGTERM", () => {
    console.log("⚠️ SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });
  });
})();