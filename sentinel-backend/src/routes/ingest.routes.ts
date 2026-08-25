import { Router } from "express";
import { ingestEvent, ingestBulk, agentAuth } from "../controllers/ingest.controller";

const router = Router();

// Agent-key auth (not JWT — agents use a shared secret)
router.use(agentAuth);

router.post("/event", ingestEvent);
router.post("/bulk",  ingestBulk);

export default router;
