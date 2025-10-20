import { Router } from "express";
import { pool } from "../index";

const router = Router();

router.get("/:callId", async (req, res) => {
  const callId = req.params.callId;
  try {
    const { rows } = await pool.query(
      "SELECT transcript FROM conversations WHERE call_id=$1 LIMIT 1",
      [callId]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Transcript not found" });
    res.json({ callId, transcript: rows[0].transcript || "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
