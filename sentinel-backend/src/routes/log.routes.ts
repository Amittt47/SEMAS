import { Router } from "express";
import { getLogs, getLogById, getLogStats } from "../controllers/log.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/",       getLogs);
router.get("/stats",  getLogStats);
router.get("/:id",    getLogById);

export default router;
