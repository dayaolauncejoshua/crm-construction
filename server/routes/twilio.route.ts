// server/routes/twilio.route.ts
import { Router } from "express";
import { pool } from "../db";

const router = Router();

// Webhook: When dial completes
router.post("/dial-status", async (req, res) => {
  const { CallSid, DialCallStatus, DialCallDuration } = req.body;

  console.log(`📞 Dial status for ${CallSid}: ${DialCallStatus}`);

  // Log to database
  await pool.query(
    `INSERT INTO call_events (call_id, event_type, event_data)
     VALUES ($1, 'dial_status', $2)`,
    [
      CallSid,
      JSON.stringify({ status: DialCallStatus, duration: DialCallDuration }),
    ]
  );

  res.type("text/xml");
  res.send("<Response></Response>");
});

// Webhook: When recording is ready
router.post("/recording-status", async (req, res) => {
  const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;

  console.log(`🎙️  Recording ready for ${CallSid}`);

  // Save recording URL to database
  await pool.query(
    `UPDATE call_recordings 
     SET recording_url = $1, duration = $2
     WHERE twilio_call_sid = $3`,
    [RecordingUrl, RecordingDuration, CallSid]
  );

  res.type("text/xml");
  res.send("<Response></Response>");
});

export default router;
