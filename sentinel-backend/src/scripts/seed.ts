/**
 * Sentinel SIEM — Seed Script
 * Run: npx ts-node src/scripts/seed.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User.model";
import { Alert } from "../models/Alert.model";
import { Log } from "../models/Log.model";
import { Report } from "../models/Report.model";
import { Settings } from "../models/Settings.model";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sentinel_siem";

// ── Sample data ────────────────────────────────────────────────────────────────
const IPS = ["192.168.1.44","10.0.0.88","10.0.0.202","172.16.2.5","10.0.0.14","8.8.8.8","192.168.1.9","172.16.0.21","10.0.1.55","192.168.1.3"];

const ALERT_TEMPLATES = [
  { message: "SYN Flood detected", severity: "critical" as const, rule: "DOS-001", ruleCategory: "DOS", protocol: "TCP" },
  { message: "Brute force attempt — SSH port 22", severity: "critical" as const, rule: "AUTH-007", ruleCategory: "AUTH", protocol: "SSH" },
  { message: "Sequential port sweep detected", severity: "high" as const, rule: "SCAN-003", ruleCategory: "SCAN", protocol: "TCP" },
  { message: "Slowloris keep-alive flood", severity: "high" as const, rule: "DOS-004", ruleCategory: "DOS", protocol: "HTTP" },
  { message: "Multiple login failures — user admin", severity: "medium" as const, rule: "AUTH-002", ruleCategory: "AUTH", protocol: "SSH" },
  { message: "DNS amplification attempt", severity: "medium" as const, rule: "DNS-006", ruleCategory: "DNS", protocol: "DNS" },
  { message: "Unusual outbound data — 430 MB", severity: "medium" as const, rule: "EXF-001", ruleCategory: "EXFILTRATION", protocol: "TCP" },
  { message: "Self-signed certificate detected", severity: "low" as const, rule: "TLS-002", ruleCategory: "TLS", protocol: "TLS" },
  { message: "ICMP flood — 4200 pps", severity: "high" as const, rule: "DOS-002", ruleCategory: "DOS", protocol: "ICMP" },
  { message: "Expired certificate on endpoint", severity: "low" as const, rule: "TLS-001", ruleCategory: "TLS", protocol: "TLS" },
];

const LOG_TEMPLATES = [
  { level: "ERROR" as const, protocol: "TCP",  message: "Inbound SYN flood exceeds threshold 8000 pps" },
  { level: "WARN"  as const, protocol: "TCP",  message: "Sequential probe detected — ports 1–1024" },
  { level: "WARN"  as const, protocol: "SSH",  message: "Authentication failure — user: root (attempt 7)" },
  { level: "INFO"  as const, protocol: "DNS",  message: "DNS query — A record lookup for unknown domain" },
  { level: "ERROR" as const, protocol: "HTTP", message: "HTTP keep-alive flood — connection pool saturated" },
  { level: "INFO"  as const, protocol: "MGMT", message: "Firewall rule updated — added deny rule #482" },
  { level: "DEBUG" as const, protocol: "ICMP", message: "Health check passed — all nodes responding" },
  { level: "WARN"  as const, protocol: "TCP",  message: "Outbound data volume 430 MB — exceeds baseline" },
  { level: "INFO"  as const, protocol: "TLS",  message: "TLS handshake with self-signed certificate" },
  { level: "ERROR" as const, protocol: "ICMP", message: "ICMP flood — 4200 pps from external IP" },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3600000);
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Alert.deleteMany({}),
    Log.deleteMany({}),
    Report.deleteMany({}),
    Settings.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data");

  // ── Users ──
  await User.create([
    { name: "Admin User",     email: "admin@sentinel.io",   password: "Sentinel@123", role: "admin"   },
    { name: "SOC Analyst",    email: "analyst@sentinel.io", password: "Sentinel@123", role: "analyst" },
    { name: "Viewer Account", email: "viewer@sentinel.io",  password: "Sentinel@123", role: "viewer"  },
  ]);
  console.log("👤  Users created");

  // ── Alerts ──
  const alerts = [];
  for (let i = 0; i < 50; i++) {
    const tpl = rand(ALERT_TEMPLATES);
    alerts.push({
      alertId:  `ALT-${2300 - i}`,
      ...tpl,
      sourceIp: rand(IPS),
      status:   i < 15 ? "open" : i < 30 ? "acknowledged" : "resolved",
      createdAt: hoursAgo(Math.random() * 48),
    });
  }
  await Alert.insertMany(alerts);
  console.log("🚨  50 alerts seeded");

  // ── Logs ──
  const logs = [];
  for (let i = 0; i < 200; i++) {
    const tpl = rand(LOG_TEMPLATES);
    logs.push({
      logId:     `LOG-${10000 - i}`,
      timestamp: hoursAgo(Math.random() * 72),
      ...tpl,
      sourceIp:  rand(IPS),
      hostname:  `host-${Math.floor(Math.random() * 20) + 1}.internal`,
    });
  }
  await Log.insertMany(logs);
  console.log("📋  200 log entries seeded");

  // ── Reports ──
  await Report.insertMany([
    {
      reportId: "RPT-0041", name: "Weekly Threat Summary",
      type: "weekly_threat", period: "Jul 7–14, 2025",
      periodStart: new Date("2025-07-07"), periodEnd: new Date("2025-07-14"),
      status: "ready", size: "1.2 MB", generatedBy: "admin@sentinel.io",
      summary: { totalAlerts: 120, criticalAlerts: 8, totalLogs: 3400, topSources: IPS.slice(0,5), topRules: ["DOS-001","AUTH-007","SCAN-003"] },
    },
    {
      reportId: "RPT-0040", name: "Incident Response Report",
      type: "incident_response", period: "Jun 30–Jul 6",
      periodStart: new Date("2025-06-30"), periodEnd: new Date("2025-07-06"),
      status: "ready", size: "820 KB", generatedBy: "analyst@sentinel.io",
    },
    {
      reportId: "RPT-0039", name: "Compliance Audit — ISO 27001",
      type: "compliance", period: "Q2 2025",
      periodStart: new Date("2025-04-01"), periodEnd: new Date("2025-06-30"),
      status: "ready", size: "3.4 MB", generatedBy: "admin@sentinel.io",
    },
    {
      reportId: "RPT-0037", name: "Monthly Threat Summary",
      type: "weekly_threat", period: "Jun 2025",
      periodStart: new Date("2025-06-01"), periodEnd: new Date("2025-06-30"),
      status: "pending", generatedBy: "analyst@sentinel.io",
    },
  ]);
  console.log("📊  Reports seeded");

  // ── Default settings ──
  await Settings.create({ key: "global" });
  console.log("⚙️  Default settings created");

  console.log("\n🎉  Seed complete!\n");
  console.log("  Accounts:");
  console.log("    admin@sentinel.io   / Sentinel@123  (admin)");
  console.log("    analyst@sentinel.io / Sentinel@123  (analyst)");
  console.log("    viewer@sentinel.io  / Sentinel@123  (viewer)");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
