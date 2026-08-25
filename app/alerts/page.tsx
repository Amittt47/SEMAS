/**
 * Alerts Page — seim/app/alerts/page.tsx
 * Full live CRUD: filter, acknowledge, suppress, bulk-ack, real-time new alerts via WS.
 */
"use client";
import { useState, useEffect, useCallback } from "react";
import { alertApi, Alert, Severity } from "../../lib/api";
import { useWebSocket, WsMessage } from "../../hooks/useWebSocket";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--red)", high: "var(--amber)", medium: "var(--green)", low: "var(--muted)",
};

export default function Alerts() {
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [total,   setTotal]   = useState(0);
  const [counts,  setCounts]  = useState<Record<string, number>>({});
  const [filter,  setFilter]  = useState("all");
  const [open,    setOpen]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (sev?: string) => {
    setLoading(true);
    try {
      const params = sev && sev !== "all" ? { severity: sev, limit: "50" } : { limit: "50" };
      const res = await alertApi.list(params);
      setAlerts(res.data);
      setTotal(res.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await alertApi.stats();
    const map: Record<string, number> = {};
    res.data.bySeverity.forEach(({ _id, count }) => { map[_id] = count; });
    setCounts(map);
  }, []);

  // Real-time: prepend new alerts
  const handleWs = useCallback((msg: WsMessage) => {
    if (msg.type === "NEW_ALERT") {
      setAlerts(prev => [msg.payload as Alert, ...prev]);
      setTotal(t => t + 1);
      fetchStats();
    }
    if (msg.type === "ALERT_UPDATED") {
      const updated = msg.payload as Alert;
      setAlerts(prev => prev.map(a => a.alertId === updated.alertId ? updated : a));
    }
    if (msg.type === "BULK_ACKNOWLEDGED") {
      fetchAlerts(filter);
      fetchStats();
    }
  }, [fetchAlerts, fetchStats, filter]);

  useWebSocket(handleWs);

  useEffect(() => {
    fetchAlerts(filter);
    fetchStats();
  }, [filter, fetchAlerts, fetchStats]);

  const acknowledge = async (id: string) => {
    setActionId(id);
    try {
      const res = await alertApi.acknowledge(id);
      setAlerts(prev => prev.map(a => a.alertId === id ? res.data : a));
      setOpen(null);
    } finally { setActionId(null); }
  };

  const suppress = async (id: string) => {
    setActionId(id);
    try {
      const res = await alertApi.suppress(id);
      setAlerts(prev => prev.map(a => a.alertId === id ? res.data : a));
      setOpen(null);
    } finally { setActionId(null); }
  };

  const bulkAck = async () => {
    setActionId("bulk");
    try {
      await alertApi.bulkAcknowledge();
      fetchAlerts(filter);
      fetchStats();
    } finally { setActionId(null); }
  };

  const ackedCount = alerts.filter(a => a.status === "acknowledged").length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 26, animation: "fadeUp .4s ease" }}>
        <div className="label" style={{ color: "var(--red)", marginBottom: 6 }}>ALERTS / ACTIVE INCIDENTS</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em" }}>Alert Console</h1>
      </div>

      {/* Severity summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        {(["critical","high","medium","low"] as Severity[]).map((s, i) => (
          <div key={s} className="card"
            onClick={() => setFilter(f => f === s ? "all" : s)}
            style={{
              padding: "14px 16px", cursor: "pointer",
              borderColor: filter === s ? SEV_COLOR[s] : "var(--border)",
              boxShadow: filter === s ? `0 0 18px ${SEV_COLOR[s]}22` : "none",
              transition: "all .18s",
              animation: `fadeUp .4s ${i * 55}ms ease both`,
            }}>
            <div className="label" style={{ color: SEV_COLOR[s], marginBottom: 8, fontSize: 8 }}>{s}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: SEV_COLOR[s], fontFamily: "var(--font-ui)" }}>
              {loading ? "—" : (counts[s] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="card" style={{ padding: 0, animation: "fadeUp .5s .1s ease both" }}>
        <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">
            {total} alerts
            {ackedCount > 0 && <span style={{ color: "var(--green)" }}> · {ackedCount} acknowledged</span>}
          </span>
          <button className="btn btn-primary" style={{ padding: "5px 12px" }}
            disabled={actionId === "bulk"}
            onClick={bulkAck}>
            {actionId === "bulk" ? "…" : "✓ Acknowledge All"}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>Loading alerts…</div>
        ) : alerts.map((alert, i) => {
          const isOpen = open === alert.alertId;
          const isDone = alert.status !== "open";
          return (
            <div key={alert._id}
              style={{
                borderBottom: "1px solid var(--border)",
                background: isOpen ? "var(--faint)" : "transparent",
                opacity: isDone ? .45 : 1,
                transition: "background .12s, opacity .2s",
              }}>
              {/* Row */}
              <div className="tbl-row"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "none" }}
                onClick={() => setOpen(isOpen ? null : alert.alertId)}>
                <div style={{ width: 3, height: 34, borderRadius: 2, background: SEV_COLOR[alert.severity], flexShrink: 0, boxShadow: `0 0 7px ${SEV_COLOR[alert.severity]}55` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{alert.alertId}</span>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    {isDone && (
                      <span className="badge" style={{ background: "rgba(0,214,143,.1)", color: "var(--green)", border: "1px solid rgba(0,214,143,.25)" }}>
                        {alert.status.toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginLeft: "auto" }}>RULE: {alert.rule}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{alert.message}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>{new Date(alert.createdAt).toLocaleTimeString()}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{alert.sourceIp}</div>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding: "12px 20px 16px 37px", borderTop: "1px solid var(--border)", animation: "fadeIn .2s ease" }}>
                  <div style={{ display: "flex", gap: 32, marginBottom: 14, flexWrap: "wrap" }}>
                    {[
                      ["Source IP",     alert.sourceIp],
                      ["Rule",          alert.rule],
                      ["Category",      alert.ruleCategory],
                      ["Protocol",      alert.protocol || "—"],
                      ["Status",        alert.status.toUpperCase()],
                      ["Timestamp",     new Date(alert.createdAt).toLocaleString()],
                      ...(alert.acknowledgedBy ? [["Acknowledged By", alert.acknowledgedBy]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="label" style={{ fontSize: 8, marginBottom: 3 }}>{k}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {alert.status === "open" && (
                      <>
                        <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 10 }}
                          disabled={actionId === alert.alertId}
                          onClick={e => { e.stopPropagation(); acknowledge(alert.alertId); }}>
                          {actionId === alert.alertId ? "…" : "✓ Acknowledge"}
                        </button>
                        <button className="btn btn-danger" style={{ padding: "6px 14px", fontSize: 10 }}
                          disabled={actionId === alert.alertId}
                          onClick={e => { e.stopPropagation(); suppress(alert.alertId); }}>
                          Suppress
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 10 }}>Investigate →</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
