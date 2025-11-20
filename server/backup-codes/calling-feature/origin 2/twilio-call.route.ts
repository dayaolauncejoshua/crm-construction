import { Router, Request, Response } from "express";

import { twilioCallController } from "../controllers/twilio-call.controller";

const router = Router();

router.post("/", twilioCallController);

export default router;
