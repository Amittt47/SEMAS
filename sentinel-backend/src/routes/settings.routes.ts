import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get("/",  getSettings);
router.put("/",  requireRole("admin"), updateSettings);

export default router;
