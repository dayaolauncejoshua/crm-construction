@ -4,15 +4,14 @@ import authRouter from "./auth";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from 'dotenv';

import { config } from "dotenv";
import webhookRouter from "./routes/webhook.route";
config();


const app = express();
app.use(express.json());
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.urlencoded({ extended: true }));

app.use("/webhook", webhookRouter);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
@ -82,8 +81,8 @@ app.use((req, res, next) => {
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, '0.0.0.0', () => {
  const PORT = parseInt(process.env.PORT || "5000", 10);
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();