import { Router } from "express";
import { getReports, getReportById, generateReport, deleteReport } from "../controllers/report.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get("/",         getReports);
router.get("/:id",      getReportById);
router.post("/",        requireRole("admin", "analyst"), generateReport);
router.delete("/:id",   requireRole("admin"), deleteReport);

export default router;
