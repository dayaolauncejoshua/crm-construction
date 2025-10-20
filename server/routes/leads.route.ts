import { Router, Request, Response } from "express";
import { pool } from "../index";

const router = Router();

router.get("/sorted", async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string;
  if (!clientId) return res.status(400).json({ error: "Missing clientId" });

  try {
    const { rows } = await pool.query(
      `
      SELECT id, first_name, last_name, email, phone, company, temperature,
             qualification_score, call_id, created_at
      FROM leads
      WHERE client_id = $1
      ORDER BY
        CASE temperature WHEN 'hot' THEN 1 WHEN 'mid' THEN 2 WHEN 'cold' THEN 3 ELSE 4 END,
        qualification_score DESC;
      `,
      [clientId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
