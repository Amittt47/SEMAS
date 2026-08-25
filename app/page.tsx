"use client";
import { useEffect, useState, useCallback } from "react";
import { dashboardApi, DashboardData, Alert } from "../lib/api";
import { useWebSocket, WsMessage } from "../hooks/useWebSocket";
import Card from "../components/Card";

const SEV_COLOR: Record<string, string> = {
  critical: "var(--red)",
  high:     "var(--amber)",
  medium:   "var(--green)",
  low:      "var(--muted)",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liveFeed, setLiveFeed] = useState<Alert[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await dashboardApi.get();
      setData(res.data);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "NEW_ALERT" && msg.payload) {
      const alert = msg.payload as Alert;
      setLiveFeed(prev => [alert, ...prev].slice(0, 5));
      fetchDashboard();
    }
  }, [fetchDashboard]);

  const { connected } = useWebSocket(handleWsMessage);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data)   return null;

  const { counters, charts, tables } = data;
  const recentAlerts = liveFeed.length > 0 ? liveFeed : tables.recentAlerts;

  return (
    /* Main wrapper to prevent body scroll and fit viewport */
    <div style={{ 
      height: "calc(100vh - 40px)", // Adjust based on your header/nav height
      display: "flex", 
      flexDirection: "column", 
      overflow: "hidden",
      paddingBottom: 20 
    }}>
      
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div className="label" style={{ color: "var(--cyan)", marginBottom: 4 }}>OVERVIEW / THREAT LANDSCAPE</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em" }}>Analytics Engine</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
          <span style={{ position: "relative", width: 8, height: 8, display: "inline-flex" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: connected ? "var(--green)" : "var(--red)", animation: connected ? "ping 1.6s ease infinite" : "none" }} />
            <span style={{ position: "absolute", inset: 1.5, borderRadius: "50%", background: connected ? "var(--green)" : "var(--red)" }} />
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: connected ? "var(--green)" : "var(--red)", letterSpacing: ".1em" }}>
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
          <Card title="OPEN ALERTS" value={counters.openAlerts} accent="var(--red)" animateValue delay={0} sub={`${counters.criticalAlerts} critical`} />
          <Card title="ALERTS (24H)" value={counters.alertsLast24h} accent="var(--amber)" animateValue delay={80} />
          <Card title="EVENTS / HOUR" value={counters.logsLastHour} accent="var(--cyan)" animateValue delay={160} sub="live event stream" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          {/* Severity breakdown */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="label" style={{ marginBottom: 16 }}>ALERTS BY SEVERITY</div>
            {charts.alertsBySeverity.map(({ _id, count }) => {
              const total = charts.alertsBySeverity.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    {/* FIXED: Using className instead of style for the badge type */}
                    <span className={`badge badge-${_id}`}>{_id}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SEV_COLOR[_id] || "var(--muted)" }}>{count}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--faint)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: SEV_COLOR[_id] || "var(--muted)", borderRadius: 2, transition: "width .6s ease", boxShadow: `0 0 8px ${SEV_COLOR[_id] || "transparent"}55` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top attacking IPs */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="label" style={{ marginBottom: 14 }}>TOP THREAT SOURCES</div>
            {tables.topSources.slice(0, 6).map(({ _id, count, severity }, i) => (
              <div key={_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", width: 14, textAlign: "right" }}>{i + 1}</span>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: SEV_COLOR[severity] || "var(--muted)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, flex: 1 }}>{_id}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>{count} alerts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="label">RECENT ALERTS {liveFeed.length > 0 && <span style={{ color: "var(--green)" }}>· {liveFeed.length} new</span>}</span>
            <a href="/alerts" style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", textDecoration: "none" }}>View all →</a>
          </div>
          {recentAlerts.map((alert, i) => (
            <div key={alert._id || i}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid var(--border)", animation: "fadeUp .3s ease both", animationDelay: `${i * 40}ms` }}>
              <div style={{ width: 3, height: 32, borderRadius: 2, background: SEV_COLOR[alert.severity], flexShrink: 0, boxShadow: `0 0 7px ${SEV_COLOR[alert.severity]}55` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{alert.alertId}</span>
                  <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.message}</div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", textAlign: "right", flexShrink: 0 }}>
                <div>{alert.sourceIp}</div>
                <div style={{ marginTop: 2 }}>{new Date(alert.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Rules */}
        <div className="card" style={{ padding: "18px 20px", marginTop: 14 }}>
          <div className="label" style={{ marginBottom: 14 }}>TOP TRIGGERED RULES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
            {tables.topRules.slice(0, 6).map(({ _id, count, category }) => (
              <div key={_id} style={{ padding: "12px 14px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", marginBottom: 4 }}>{_id}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted)", marginBottom: 8 }}>{category}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", fontFamily: "var(--font-ui)" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading and Error states remain essentially the same
function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100vh", overflow: "hidden" }}>
      <div style={{ height: 22, width: 200, background: "var(--faint)", borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 90, background: "var(--faint)", borderRadius: 10, animation: "pulse 1.4s ease infinite" }} />)}
      </div>
      <div style={{ height: "100%", background: "var(--faint)", borderRadius: 10, animation: "pulse 1.4s ease infinite" }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>✕ {message}</div>
      <button className="btn btn-primary" onClick={onRetry}>Retry</button>
    </div>
  );
}