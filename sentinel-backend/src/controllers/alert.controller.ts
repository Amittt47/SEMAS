import { Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { Alert, IAlert } from "../models/Alert.model";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";
import { broadcast } from "../websocket/wsServer";

// ── GET /alerts ───────────────────────────────────────────────────────────────
export async function getAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      severity, status, sourceIp, rule,
      page = "1", limit = "20",
      sortBy = "createdAt", order = "desc",
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (severity) filter.severity = severity;
    if (status)   filter.status   = status;
    if (sourceIp) filter.sourceIp = { $regex: sourceIp, $options: "i" };
    if (rule)     filter.rule     = { $regex: rule,     $options: "i" };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Alert.countDocuments(filter);
    const alerts = await Alert.find(filter)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: alerts,
      meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /alerts/:id ────────────────────────────────────────────────────────────
export async function getAlertById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await Alert.findOne({ alertId: req.params.id });
    if (!alert) throw new AppError(404, "Alert not found");
    res.json({ data: alert });
  } catch (err) {
    next(err);
  }
}

// ── POST /alerts ───────────────────────────────────────────────────────────────
export async function createAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alertId = `ALT-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    const alert = await Alert.create({ ...req.body, alertId });

    // Broadcast new alert over WebSocket
    broadcast({ type: "NEW_ALERT", payload: alert });

    res.status(201).json({ data: alert });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /alerts/:id/acknowledge ─────────────────────────────────────────────
export async function acknowledgeAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      { status: "acknowledged", acknowledgedBy: req.user!.email, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) throw new AppError(404, "Alert not found");

    broadcast({ type: "ALERT_UPDATED", payload: alert });
    res.json({ data: alert });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /alerts/bulk-acknowledge ────────────────────────────────────────────
export async function bulkAcknowledge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body as { ids?: string[] };

    const filter = ids?.length ? { alertId: { $in: ids } } : { status: "open" };
    const result = await Alert.updateMany(filter, {
      status: "acknowledged",
      acknowledgedBy: req.user!.email,
      acknowledgedAt: new Date(),
    });

    broadcast({ type: "BULK_ACKNOWLEDGED", payload: { count: result.modifiedCount } });
    res.json({ message: `${result.modifiedCount} alerts acknowledged` });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /alerts/:id/suppress ────────────────────────────────────────────────
export async function suppressAlert(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      { status: "suppressed" },
      { new: true }
    );
    if (!alert) throw new AppError(404, "Alert not found");
    broadcast({ type: "ALERT_UPDATED", payload: alert });
    res.json({ data: alert });
  } catch (err) {
    next(err);
  }
}

// ── GET /alerts/stats ─────────────────────────────────────────────────────────
export async function getAlertStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const bySeverity = await Alert.aggregate([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]);
    const byStatus = await Alert.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const recent24h = await Alert.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 86400000) },
    });

    res.json({ data: { bySeverity, byStatus, recent24h } });
  } catch (err) {
    next(err);
  }
}
