import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { phoneService } from "../phone/phone.phone";
import vslRouter from "./vsl.route";
const router = Router();
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});
const WEBHOOK_SECRET = process.env.OPENAI_WEBHOOK_SIGNING_SECRET;

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

router.post("/", async (req: RawBodyRequest, res: Response) => {
  try {
    if (!WEBHOOK_SECRET) {
      console.error("OPENAI_WEBHOOK_SIGNING_SECRET is not defined");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get the raw body (this is why we used express.raw middleware)
    const rawBody = req.body;
    const signature =
      req.headers["openai-signature"] || req.headers["x-openai-signature"];

    // Verify and unwrap the webhook event
    const event = await client.webhooks.unwrap(
      rawBody.toString(),
      req.headers as Record<string, string>,
      WEBHOOK_SECRET
    );

    console.log("Received webhook event:", event.type);

    // Handle incoming call event
    if (event.type === "realtime.call.incoming" && event?.data?.call_id) {
      const callId = event.data.call_id;
      console.log(`Processing incoming call: ${callId}`);

      await phoneService.handleIncomingCall(callId);

      return res.status(200).json({
        success: true,
        message: "Call handled successfully",
        callId,
      });
    }

    // Handle other event types if needed
    return res.status(200).json({
      success: true,
      message: "Event received but not processed",
      eventType: event.type,
    });
  } catch (e) {
    const error = e as Error;
    console.error("Webhook error:", error.message);
    console.error("Stack:", error.stack);

    return res.status(500).json({
      error: "Webhook processing failed",
      message: error.message,
    });
  }
});

export default router;
