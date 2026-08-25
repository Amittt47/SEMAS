/**
 * Sentinel Correlation Engine
 * ───────────────────────────
 * A lightweight, rule-based event correlation engine.
 * Rules are evaluated against every ingested log entry.
 * When a rule fires, an Alert is automatically created.
 */

import { ILog } from "../models/Log.model";
import { Alert } from "../models/Alert.model";
import { broadcast } from "../websocket/wsServer";
import { logger } from "../utils/logger";

// ── In-memory sliding window counters ────────────────────────────────────────
// key → { count, firstSeen }
const ipEventCounts  = new Map<string, { count: number; firstSeen: number }>();
const loginFailures  = new Map<string, { count: number; firstSeen: number }>();

const WINDOW_MS = 60_000; // 1-minute sliding window

function increment(map: Map<string, { count: number; firstSeen: number }>, key: string): number {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now - entry.firstSeen > WINDOW_MS) {
    map.set(key, { count: 1, firstSeen: now });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

// ── Rule definitions ──────────────────────────────────────────────────────────
interface Rule {
  id: string;
  name: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  match: (log: ILog, context: RuleContext) => boolean;
  message: (log: ILog) => string;
}

interface RuleContext {
  ipCount: number;
  loginFailCount: number;
}

const RULES: Rule[] = [
  {
    id: "DOS-001",
    name: "SYN Flood Detection",
    category: "DOS",
    severity: "critical",
    match: (log, ctx) =>
      log.level === "ERROR" &&
      (log.message.toLowerCase().includes("syn flood") ||
       (log.protocol === "TCP" && ctx.ipCount > 200)),
    message: (log) => `SYN Flood detected from ${log.sourceIp}`,
  },
  {
    id: "AUTH-007",
    name: "SSH Brute Force",
    category: "AUTH",
    severity: "critical",
    match: (log, ctx) =>
      log.protocol === "SSH" &&
      log.level !== "INFO" &&
      ctx.loginFailCount >= 5,
    message: (log) => `Brute force attempt — SSH port 22 from ${log.sourceIp}`,
  },
  {
    id: "AUTH-002",
    name: "Multiple Login Failures",
    category: "AUTH",
    severity: "medium",
    match: (log, ctx) =>
      log.level === "WARN" &&
      log.message.toLowerCase().includes("authentication failure") &&
      ctx.loginFailCount >= 3,
    message: (log) => `Multiple login failures from ${log.sourceIp}`,
  },
  {
    id: "SCAN-003",
    name: "Port Scan Detection",
    category: "SCAN",
    severity: "high",
    match: (log) =>
      log.level === "WARN" &&
      (log.message.toLowerCase().includes("port") && log.message.toLowerCase().includes("scan")) ||
      log.message.toLowerCase().includes("sequential probe"),
    message: (log) => `Sequential port sweep detected from ${log.sourceIp}`,
  },
  {
    id: "DOS-004",
    name: "HTTP Flood",
    category: "DOS",
    severity: "high",
    match: (log) =>
      log.protocol === "HTTP" &&
      log.level === "ERROR" &&
      log.message.toLowerCase().includes("flood"),
    message: (log) => `HTTP keep-alive flood from ${log.sourceIp}`,
  },
  {
    id: "DOS-002",
    name: "ICMP Flood",
    category: "DOS",
    severity: "high",
    match: (log) =>
      log.protocol === "ICMP" &&
      log.level === "ERROR" &&
      log.message.toLowerCase().includes("flood"),
    message: (log) => `ICMP flood detected from ${log.sourceIp}`,
  },
  {
    id: "DNS-006",
    name: "DNS Amplification",
    category: "DNS",
    severity: "medium",
    match: (log) =>
      log.protocol === "DNS" &&
      (log.message.toLowerCase().includes("amplification") ||
       log.message.toLowerCase().includes("unknown domain")),
    message: (log) => `DNS amplification attempt from ${log.sourceIp}`,
  },
  {
    id: "EXF-001",
    name: "Unusual Outbound Data Volume",
    category: "EXFILTRATION",
    severity: "medium",
    match: (log) =>
      log.level === "WARN" &&
      log.message.toLowerCase().includes("outbound") &&
      log.message.toLowerCase().includes("exceeds"),
    message: (log) => `Unusual outbound data volume detected from ${log.sourceIp}`,
  },
  {
    id: "TLS-002",
    name: "Self-Signed Certificate",
    category: "TLS",
    severity: "low",
    match: (log) =>
      log.protocol === "TLS" &&
      log.message.toLowerCase().includes("self-signed"),
    message: (log) => `Self-signed certificate detected at ${log.sourceIp}`,
  },
];

// ── Core evaluation ────────────────────────────────────────────────────────────
export async function runCorrelation(log: ILog): Promise<void> {
  // Update sliding windows
  const ipCount        = increment(ipEventCounts, log.sourceIp);
  const loginFailCount =
    log.message.toLowerCase().includes("authentication failure") ||
    log.message.toLowerCase().includes("login fail")
      ? increment(loginFailures, log.sourceIp)
      : loginFailures.get(log.sourceIp)?.count ?? 0;

  const ctx: RuleContext = { ipCount, loginFailCount };

  for (const rule of RULES) {
    if (!rule.match(log, ctx)) continue;

    // Deduplicate: don't re-fire the same rule for the same IP within 5 min
    const recentAlert = await Alert.findOne({
      rule: rule.id,
      sourceIp: log.sourceIp,
      createdAt: { $gte: new Date(Date.now() - 300_000) },
    });
    if (recentAlert) continue;

    const alertId = `ALT-${Date.now().toString().slice(-5)}`;
    try {
      const alert = await Alert.create({
        alertId,
        message: rule.message(log),
        severity: rule.severity,
        status: "open",
        sourceIp: log.sourceIp,
        rule: rule.id,
        ruleCategory: rule.category,
        protocol: log.protocol,
        agentId: log.agentId,
        rawLog: log.rawData,
        tags: [rule.category],
      });

      broadcast({ type: "NEW_ALERT", payload: alert });
      logger.warn(`🚨 Rule fired: [${rule.id}] ${rule.name} — ${log.sourceIp}`);
    } catch (err) {
      logger.error(`Failed to create alert for rule ${rule.id}:`, err);
    }
  }
}

// ── Periodic engine start (simulates live traffic for demo) ───────────────────
export function startCorrelationEngine(): void {
  logger.info("⚙️  Correlation engine started");

  // Clean sliding window maps every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of ipEventCounts) {
      if (now - val.firstSeen > WINDOW_MS * 2) ipEventCounts.delete(key);
    }
    for (const [key, val] of loginFailures) {
      if (now - val.firstSeen > WINDOW_MS * 2) loginFailures.delete(key);
    }
  }, 120_000);
}
