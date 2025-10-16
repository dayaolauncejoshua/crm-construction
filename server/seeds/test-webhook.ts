// src/routes/test-webhook.route.ts
import { Router, Request, Response } from "express";
import { phoneService } from "./phone/phone.phone";

const router = Router();

// Test endpoint - REMOVE IN PRODUCTION
router.post("/simulate-call", async (req: Request, res: Response) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({
        error: "callId is required",
        example: { callId: "test-call-123" },
      });
    }

    console.log(`[Test] Simulating incoming call: ${callId}`);

    // This will accept and connect to the call
    await phoneService.handleIncomingCall(callId);

    return res.status(200).json({
      success: true,
      message: "Test call initiated",
      callId,
      note: "Check console logs for WebSocket connection status",
    });
  } catch (error) {
    const err = error as Error;
    console.error("[Test] Error:", err.message);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});

// Test lead saving directly
router.post("/simulate-lead", async (req: Request, res: Response) => {
  try {
    const leadData = req.body;

    // Validate minimum required data
    if (!leadData.first_name && !leadData.email && !leadData.phone) {
      return res.status(400).json({
        error: "At least one of first_name, email, or phone is required",
        example: {
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          phone: "+1234567890",
          company: "ABC Construction",
          timeline: "immediate",
          budget: "over 100k",
          decision_maker: true,
          project_type: "Commercial Building",
          tags: ["urgent", "high-priority"],
        },
      });
    }

    console.log("[Test] Simulating lead save:", leadData);

    const result = await phoneService.saveLead({
      call_id: leadData.call_id || `test-${Date.now()}`,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      company: leadData.company,
      source: leadData.source || "test",
      timeline: leadData.timeline,
      budget: leadData.budget,
      decision_maker: leadData.decision_maker,
      project_type: leadData.project_type,
      pain_points: leadData.pain_points,
      internal_notes: leadData.internal_notes || "Test lead from API",
      tags: leadData.tags,
    });

    return res.status(200).json({
      success: true,
      message: "Lead saved successfully",
      result,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[Test] Error saving lead:", err.message);
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});

// Test classification logic
router.post("/test-classification", (req: Request, res: Response) => {
  const leadData = req.body;

  // Access the private method through a test wrapper
  const testService = phoneService as any;
  const classification = testService.computeClassification(leadData);

  return res.status(200).json({
    input: leadData,
    classification,
    explanation: {
      hot: "score >= 0.7 (Decision maker + immediate timeline + high budget)",
      mid: "score 0.4-0.69 (Some qualifications met)",
      cold: "score < 0.4 (Low qualification indicators)",
    },
  });
});

export default router;
