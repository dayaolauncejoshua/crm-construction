import { Router } from "express";

import { webHookController } from "server/controllers/webhook.controller";
const router = Router();

router.post("/", webHookController);

export default router;
