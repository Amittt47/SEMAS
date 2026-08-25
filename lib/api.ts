/**
 * Sentinel SIEM — API Client
 * Drop this file into: seim/lib/api.ts
 *
 * Every request automatically attaches the stored JWT token.
 * All responses are typed via the shared types in types/api.ts
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sentinel_token");
}

interface RequestOptions extends RequestInit {
  noAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { noAuth, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (!noAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.removeItem("sentinel_token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      noAuth: true,
    }),

  register: (name: string, email: string, password: string, role?: string) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
      noAuth: true,
    }),

  me: () => request<{ user: User }>("/auth/me"),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => request<{ data: DashboardData }>("/dashboard"),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertApi = {
  list: (params?: AlertQuery) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<PaginatedResponse<Alert>>(`/alerts${qs}`);
  },

  stats: () => request<{ data: AlertStats }>("/alerts/stats"),

  get: (id: string) => request<{ data: Alert }>(`/alerts/${id}`),

  acknowledge: (id: string) =>
    request<{ data: Alert }>(`/alerts/${id}/acknowledge`, { method: "PATCH" }),

  bulkAcknowledge: (ids?: string[]) =>
    request<{ message: string }>("/alerts/bulk-acknowledge", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    }),

  suppress: (id: string) =>
    request<{ data: Alert }>(`/alerts/${id}/suppress`, { method: "PATCH" }),
};

// ── Logs ──────────────────────────────────────────────────────────────────────
export const logApi = {
  list: (params?: LogQuery) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return request<PaginatedResponse<LogEntry>>(`/logs${qs}`);
  },

  stats: () => request<{ data: LogStats }>("/logs/stats"),

  get: (id: string) => request<{ data: LogEntry }>(`/logs/${id}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  list: () => request<{ data: Report[] }>("/reports"),

  get: (id: string) => request<{ data: Report }>(`/reports/${id}`),

  generate: (body: GenerateReportBody) =>
    request<{ data: Report; message: string }>("/reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/reports/${id}`, { method: "DELETE" }),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => request<{ data: Settings }>("/settings"),

  update: (body: Partial<Settings>) =>
    request<{ data: Settings; message: string }>("/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

// ── Type definitions (shared) ─────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  lastLogin?: string;
  createdAt: string;
}

export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "acknowledged" | "suppressed" | "resolved";

export interface Alert {
  _id: string;
  alertId: string;
  message: string;
  severity: Severity;
  status: AlertStatus;
  sourceIp: string;
  destinationIp?: string;
  rule: string;
  ruleCategory: string;
  protocol?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface LogEntry {
  _id: string;
  logId: string;
  timestamp: string;
  level: LogLevel;
  sourceIp: string;
  destinationIp?: string;
  protocol: string;
  port?: number;
  message: string;
  agentId?: string;
  hostname?: string;
  createdAt: string;
}

export interface Report {
  _id: string;
  reportId: string;
  name: string;
  type: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: "pending" | "generating" | "ready" | "failed";
  size?: string;
  generatedBy: string;
  summary?: {
    totalAlerts: number;
    criticalAlerts: number;
    totalLogs: number;
    topSources: string[];
    topRules: string[];
  };
  createdAt: string;
}

export interface Settings {
  detection: {
    alertThreshold: number;
    mlAnomalyDetection: boolean;
    autoBlock: boolean;
  };
  retention: {
    logRetentionDays: number;
    realtimeStream: boolean;
  };
  notifications: {
    alertEmail: string;
    emailAlertsEnabled: boolean;
  };
  integrations: {
    splunk: boolean;
    pagerduty: boolean;
    slack: boolean;
    jira: boolean;
  };
}

export interface DashboardData {
  counters: {
    totalAlerts: number;
    criticalAlerts: number;
    openAlerts: number;
    alertsLast24h: number;
    totalLogs: number;
    logsLastHour: number;
  };
  charts: {
    alertsBySeverity: { _id: string; count: number }[];
    alertsOverTime: { _id: string; count: number }[];
  };
  tables: {
    topSources: { _id: string; count: number; severity: string }[];
    topRules: { _id: string; count: number; category: string }[];
    recentAlerts: Alert[];
  };
}

export interface AlertStats {
  bySeverity: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  recent24h: number;
}

export interface LogStats {
  byLevel: { _id: string; count: number }[];
  byProtocol: { _id: string; count: number }[];
  timeline: { _id: number; count: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface AlertQuery {
  severity?: string;
  status?: string;
  sourceIp?: string;
  rule?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: string;
}

export interface LogQuery {
  level?: string;
  protocol?: string;
  sourceIp?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}

export interface GenerateReportBody {
  name: string;
  type: string;
  periodStart: string;
  periodEnd: string;
}
