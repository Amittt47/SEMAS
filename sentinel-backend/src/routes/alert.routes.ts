import { Router } from "express";
import {
  getAlerts, getAlertById, createAlert,
  acknowledgeAlert, bulkAcknowledge, suppressAlert, getAlertStats,
} from "../controllers/alert.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/",                   getAlerts);
router.get("/stats",              getAlertStats);
router.get("/:id",                getAlertById);
router.post("/",                  requireRole("admin", "analyst"), createAlert);
router.patch("/bulk-acknowledge", requireRole("admin", "analyst"), bulkAcknowledge);
router.patch("/:id/acknowledge",  requireRole("admin", "analyst"), acknowledgeAlert);
router.patch("/:id/suppress",     requireRole("admin", "analyst"), suppressAlert);

export default router;
