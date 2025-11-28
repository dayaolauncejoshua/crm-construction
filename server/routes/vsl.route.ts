import { Router } from "express";

import {
  createVSL,
  deleteVSL,
  getClientId,
  getSingleVSL,
  updateVSL,
  trackVSLView,
} from "server/controllers/vsl.controller";

const router = Router();

// fetch clientID
router.get("/api/vsls/:clientId", getClientId);

// Create new VSL
router.post("/api/vsls", createVSL);

// Get single VSL
router.get("/api/vsls/:clientId/:vslId", getSingleVSL);

// Update VSL
router.patch("/api/vsls/:vslId", updateVSL);

// Delete VSL
router.delete("/api/vsls/:vslId", deleteVSL);

// Track VSL view ✅ ADD THIS
router.post("/api/vsls/:vslId/view", trackVSLView);

export default router;
