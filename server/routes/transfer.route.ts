import { Router } from "express";
const router = Router();

router.post("/", async (req, res) => {
  const human = process.env.HUMAN_AGENT_NUMBER || "";
  const twiml = `
    <Response>
      <Say voice="alice">Connecting you to a human agent. Please hold.</Say>
      <Dial>${human}</Dial>
      <Say voice="alice">Sorry, no one is available. Goodbye.</Say>
    </Response>
  `;
  res.type("text/xml").send(twiml);
});

export default router;
