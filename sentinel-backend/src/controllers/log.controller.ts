import { Response, NextFunction } from "express";
import { Log } from "../models/Log.model";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth.middleware";

// ── GET /logs ──────────────────────────────────────────────────────────────────
export async function getLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      level, protocol, sourceIp, search,
      from, to,
      page = "1", limit = "50",
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (level)    filter.level    = level.toUpperCase();
    if (protocol) filter.protocol = protocol.toUpperCase();
    if (sourceIp) filter.sourceIp = { $regex: sourceIp, $options: "i" };

    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, unknown>).$gte = new Date(from);
      if (to)   (filter.timestamp as Record<string, unknown>).$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { message:  { $regex: search, $options: "i" } },
        { sourceIp: { $regex: search, $options: "i" } },
        { logId:    { $regex: search, $options: "i" } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Log.countDocuments(filter);
    const logs  = await Log.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: logs,
      meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /logs/:id ──────────────────────────────────────────────────────────────
export async function getLogById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const log = await Log.findOne({ logId: req.params.id });
    if (!log) throw new AppError(404, "Log entry not found");
    res.json({ data: log });
  } catch (err) {
    next(err);
  }
}

// ── GET /logs/stats ────────────────────────────────────────────────────────────
export async function getLogStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const byLevel = await Log.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
    ]);
    const byProtocol = await Log.aggregate([
      { $group: { _id: "$protocol", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Events per hour for the last 24 h
    const since = new Date(Date.now() - 86400000);
    const timeline = await Log.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    res.json({ data: { byLevel, byProtocol, timeline } });
  } catch (err) {
    next(err);
  }
}
