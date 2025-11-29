import { Router } from "express";

import {
  createVSL,
  deleteVSL,
  getClientId,
  getSingleVSL,
  updateVSL,
  trackVSLView,
  trackVSLPlay, 
  trackVSLProgress, 
  getVSLAnalytics,
} from "server/controllers/vsl.controller";

const router = Router();

// ✅ ANALYTICS ROUTES FIRST (most specific)
router.post("/api/vsls/:vslId/track-play", trackVSLPlay);
router.post("/api/vsls/:vslId/track-progress", trackVSLProgress);
router.get("/api/vsls/:vslId/analytics", getVSLAnalytics);
router.post("/api/vsls/:vslId/view", trackVSLView);

// ✅ CRUD ROUTES (less specific, come after)
router.get("/api/vsls/:clientId", getClientId);
router.post("/api/vsls", createVSL);
router.patch("/api/vsls/:vslId", updateVSL);
router.delete("/api/vsls/:vslId", deleteVSL);

// ✅ MOST SPECIFIC LAST (two parameters)
router.get("/api/vsls/:clientId/:vslId", getSingleVSL);

export default router;