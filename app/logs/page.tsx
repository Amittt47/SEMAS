/**
 * Logs Page — seim/app/logs/page.tsx
 * Live log explorer with search, level/protocol filters, and real-time WS new entries.
 */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { logApi, LogEntry } from "../../lib/api";
import { useWebSocket, WsMessage } from "../../hooks/useWebSocket";

const LVL: Record<string, { bg: string; color: string; border: string }> = {
  ERROR: { bg: "rgba(255,61,90,.13)",  color: "var(--red)",   border: "rgba(255,61,90,.3)"   },
  WARN:  { bg: "rgba(255,181,71,.10)", color: "var(--amber)", border: "rgba(255,181,71,.28)" },
  INFO:  { bg: "rgba(0,229,255,.09)",  color: "var(--cyan)",  border: "rgba(0,229,255,.25)"  },
  DEBUG: { bg: "transparent",          color: "var(--muted)", border: "var(--border)"        },
};

export default function Logs() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState("");
  const [level,   setLevel]   = useState("ALL");
  const [proto,   setProto]   = useState("ALL");
  const [protos,  setProtos]  = useState<string[]>(["ALL"]);
  
  // FIX: Added 'undefined' as the initial value to satisfy TypeScript
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchLogs = useCallback(async (opts?: { q?: string; lvl?: string; prt?: string }) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      const q   = opts?.q   ?? query;
      const lvl = opts?.lvl ?? level;
      const prt = opts?.prt ?? proto;
      
      if (q && q.trim())     params.search   = q.trim();
      if (lvl !== "ALL")     params.level    = lvl;
      if (prt !== "ALL")     params.protocol = prt;

      const res = await logApi.list(params);
      setLogs(res.data);
      setTotal(res.meta.total);

      // Derive protocol list from results
      const ps = Array.from(new Set(res.data.map(l => l.protocol)));
      setProtos(["ALL", ...ps]);
    } catch (error) {
      console.error("Log fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [query, level, proto]);

  // Debounced search
  const handleSearch = (val: string) => {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLogs({ q: val }), 300);
  };

  // Real-time prepend (with filter check)
  const handleWs = useCallback((msg: WsMessage) => {
    if (msg.type === "NEW_LOG") {
      const newLog = msg.payload as LogEntry;
      
      // Only show real-time log if it matches current UI filters
      const matchesLevel = level === "ALL" || newLog.level === level;
      const matchesProto = proto === "ALL" || newLog.protocol === proto;

      if (matchesLevel && matchesProto) {
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
        setTotal(t => t + 1);
      }
    }
  }, [level, proto]);

  useWebSocket(handleWs);

  useEffect(() => { 
    fetchLogs(); 
    // Cleanup timer on unmount
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [fetchLogs]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 26, animation: "fadeUp .4s ease" }}>
        <div className="label" style={{ color: "var(--cyan)", marginBottom: 6 }}>LOGS / RAW EVENT STREAM</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em" }}>Log Explorer</h1>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", animation: "fadeUp .4s .06s ease both" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="8.3" y1="8.3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input placeholder="Search logs, IPs, event IDs…" value={query}
            onChange={e => handleSearch(e.target.value)}
            className="input" style={{ paddingLeft: 32 }} />
        </div>

        {/* Level pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {["ALL","ERROR","WARN","INFO","DEBUG"].map(l => {
            const s = LVL[l] ?? {};
            const active = level === l;
            return (
              <button key={l} onClick={() => { setLevel(l); fetchLogs({ lvl: l }); }}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
                  letterSpacing: ".09em", padding: "6px 11px", borderRadius: 5, cursor: "pointer",
                  border: `1px solid ${active ? (s.border || "var(--border-hi)") : "var(--border)"}`,
                  background: active ? (s.bg || "var(--cyan-dim)") : "transparent",
                  color: active ? (s.color || "var(--cyan)") : "var(--muted)",
                  transition: "all .14s",
                }}>{l}</button>
            );
          })}
        </div>

        {/* Protocol */}
        <select value={proto} onChange={e => { setProto(e.target.value); fetchLogs({ prt: e.target.value }); }} style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          background: "var(--surface-2)", border: "1px solid var(--border)",
          color: "var(--text)", borderRadius: 6, padding: "7px 11px", outline: "none", cursor: "pointer",
        }}>
          {protos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, animation: "fadeUp .5s .1s ease both" }}>
        <div style={{ padding: "11px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="label">{loading ? "Loading…" : `${total} entries`}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 9 }}>↓ Download .log</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: 90 }} /><col style={{ width: 190 }} /><col style={{ width: 60 }} />
              <col style={{ width: 118 }} /><col style={{ width: 52 }} /><col />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--faint)", borderBottom: "1px solid var(--border)" }}>
                {["ID","Timestamp","Level","Source","Proto","Message"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: ".1em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>— no results —</td></tr>
              ) : logs.map((log, i) => {
                const s = LVL[log.level] || LVL.DEBUG;
                return (
                  <tr key={log._id || i} className="tbl-row" style={{ animationDelay: `${i * 20}ms` }}>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)" }}>{log.logId}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, letterSpacing: ".08em", padding: "2px 6px", borderRadius: 3, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{log.level}</span>
                    </td>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 10 }}>{log.sourceIp}</td>
                    <td style={{ padding: "9px 14px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{log.protocol}</td>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: "rgba(255,255,255,.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>{log.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}