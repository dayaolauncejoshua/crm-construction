import { Router } from "express";

import { webHookController } from "server/controllers/twilio-call.controller";
const router = Router();

router.post("/", webHookController);

export default router;
