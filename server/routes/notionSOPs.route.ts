// server/routes/notionSops.route.ts
import express from "express";
import { db } from "../db";
import { notionSOPs } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Get Notion SOPs for client
router.get("/:clientId", async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const rows = await db
      .select()
      .from(notionSOPs)
      .where(eq(notionSOPs.clientId, clientId))
      .orderBy(notionSOPs.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Link a Notion SOP (create)
router.post("/", async (req, res, next) => {
  try {
    const payload = req.body;
    if (
      !payload.clientId ||
      !payload.title ||
      !payload.notionPageId ||
      !payload.pageUrl
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const inserted = await db
      .insert(notionSOPs)
      .values({
        clientId: payload.clientId,
        title: payload.title,
        category: payload.category ?? "processes",
        notionPageId: payload.notionPageId,
        pageUrl: payload.pageUrl,
        lastSynced: new Date(),
        syncStatus: "active",
      })
      .returning();

    res.status(201).json(inserted[0] ?? inserted);
  } catch (err) {
    next(err);
  }
});

// Sync stub (trigger a sync, for now placeholder)
router.post("/:clientId/sync", async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    // TODO: implement Notion API fetch & upsert logic here
    res.json({ message: `Notion sync triggered for client ${clientId}` });
  } catch (err) {
    next(err);
  }
});

export default router;
