import { Request, Response, NextFunction } from "express";
import { Log } from "../models/Log.model";
import { broadcast } from "../websocket/wsServer";
import { runCorrelation } from "../services/correlationEngine";
import { logger } from "../utils/logger";

// Shared ingest secret (agents must send X-Agent-Key header)
const AGENT_KEY = process.env.AGENT_KEY || "sentinel-agent-key-dev";

function agentAuth(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-agent-key"] !== AGENT_KEY) {
    res.status(401).json({ error: "Invalid agent key" });
    return;
  }
  next();
}

// POST /api/v1/ingest/event   — single event
export async function ingestEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { level, sourceIp, protocol, message, agentId, hostname, port, rawData, parsedFields } = req.body;
    const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    const entry = await Log.create({
      logId,
      timestamp: new Date(),
      level: (level || "INFO").toUpperCase(),
      sourceIp,
      protocol: (protocol || "UNKNOWN").toUpperCase(),
      message,
      agentId,
      hostname,
      port,
      rawData,
      parsedFields,
    });

    // Feed into correlation engine (non-blocking)
    runCorrelation(entry).catch(e => logger.error("Correlation error:", e));

    // Broadcast to connected dashboards
    broadcast({ type: "NEW_LOG", payload: entry });

    res.status(202).json({ logId, accepted: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/ingest/bulk   — array of events (batch from agents)
export async function ingestBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const events: unknown[] = req.body.events || [];
    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: "events array is required" });
      return;
    }

    const docs = events.map((e: any) => ({
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      level: (e.level || "INFO").toUpperCase(),
      sourceIp: e.sourceIp || "0.0.0.0",
      protocol: (e.protocol || "UNKNOWN").toUpperCase(),
      message: e.message || "",
      agentId: e.agentId,
      hostname: e.hostname,
      port: e.port,
      rawData: e.rawData,
      parsedFields: e.parsedFields,
    }));

    const inserted = await Log.insertMany(docs, { ordered: false });
    broadcast({ type: "BULK_LOGS", payload: { count: inserted.length } });

    res.status(202).json({ accepted: inserted.length });
  } catch (err) {
    next(err);
  }
}

export { agentAuth };
