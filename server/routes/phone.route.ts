import { Router, Request, Response } from "express";
import { phoneService } from "../phone/phone.phone";

const router = Router();

// Test call endpoint
router.post("/test-call", async (req: Request, res: Response) => {
  try {
    const { callId, isTestMode } = req.body;

    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    console.log(`🧪 Starting test call: ${callId}`);

    // Handle the incoming call
    await phoneService.handleIncomingCall(callId);

    return res.status(200).json({
      success: true,
      message: "Test call started",
      callId,
      isTestMode: isTestMode || false,
    });
  } catch (e) {
    const error = e as Error;
    console.error("Test call error:", error.message);

    return res.status(500).json({
      error: "Failed to start test call",
      message: error.message,
    });
  }
});

// End call endpoint
router.post("/end-call", async (req: Request, res: Response) => {
  try {
    const { callId } = req.body;

    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    console.log(`🧪 Ending test call: ${callId}`);

    phoneService.closeConnection(callId);

    return res.status(200).json({
      success: true,
      message: "Call ended successfully",
      callId,
    });
  } catch (e) {
    const error = e as Error;
    console.error("End call error:", error.message);

    return res.status(500).json({
      error: "Failed to end call",
      message: error.message,
    });
  }
});

export default router;
