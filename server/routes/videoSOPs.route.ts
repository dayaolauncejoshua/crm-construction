// server/routes/videoSops.route.ts
import express from "express";
import { db } from "../db";
import { videoSOPs } from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// List by client
router.get("/:clientId", async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const rows = await db
      .select()
      .from(videoSOPs)
      .where(eq(videoSOPs.clientId, clientId))
      .orderBy(videoSOPs.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get single
router.get("/item/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const row = await db
      .select()
      .from(videoSOPs)
      .where(eq(videoSOPs.id, id))
      .limit(1);
    if (!row || row.length === 0)
      return res.status(404).json({ message: "Not found" });
    res.json(row[0]);
  } catch (err) {
    next(err);
  }
});

// Create new
router.post("/", async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload.clientId || !payload.title || !payload.videoUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const inserted = await db
      .insert(videoSOPs)
      .values({
        clientId: payload.clientId,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category ?? "training",
        videoUrl: payload.videoUrl,
        thumbnailUrl: payload.thumbnailUrl ?? null,
        duration: payload.duration ?? 0,
        tags: payload.tags ?? [],
        isPublic: payload.isPublic ?? true,
      })
      .returning();

    res.status(201).json(inserted[0] ?? inserted);
  } catch (err) {
    next(err);
  }
});

// Update
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const payload = req.body;
    await db
      .update(videoSOPs)
      .set({
        title: payload.title,
        description: payload.description,
        category: payload.category,
        videoUrl: payload.videoUrl,
        thumbnailUrl: payload.thumbnailUrl,
        duration: payload.duration,
        viewCount: payload.viewCount,
        tags: payload.tags,
        isPublic: payload.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(videoSOPs.id, id));

    const updated = await db
      .select()
      .from(videoSOPs)
      .where(eq(videoSOPs.id, id))
      .limit(1);
    res.json(updated[0]);
  } catch (err) {
    next(err);
  }
});

// Delete
router.delete("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    await db.delete(videoSOPs).where(eq(videoSOPs.id, id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
