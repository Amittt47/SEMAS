/**
 * Reports Page — seim/app/reports/page.tsx
 * Live reports list, generate new reports with polling for status.
 */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { reportApi, Report } from "../../lib/api";

export default function Reports() {
  const [reports,    setReports]    = useState<Report[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "weekly_threat",
    periodStart: "",
    periodEnd:   "",
  });

  // FIX: Added 'undefined' as the initial value to satisfy TypeScript
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchReports = useCallback(async () => {
    try {
      const res = await reportApi.list();
      setReports(res.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    // Poll every 5 s to pick up status changes (generating → ready)
    pollRef.current = setInterval(fetchReports, 5000);

    return () => {
      // FIX: Safely clear the interval using the ref value
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!form.name || !form.periodStart || !form.periodEnd) return;
    setGenerating(true);
    try {
      await reportApi.generate(form);
      setShowForm(false);
      setForm({ name: "", type: "weekly_threat", periodStart: "", periodEnd: "" });
      fetchReports();
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await reportApi.delete(id);
      setReports(prev => prev.filter(r => r.reportId !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const readyCount = reports.filter(r => r.status === "ready").length;

  const totalStorage = reports.reduce((acc, r) => {
    if (!r.size || r.size === "—") return acc;
    const parts = r.size.split(" ");
    const num = parseFloat(parts[0]);
    const unit = parts[1];
    
    const mb = unit?.includes("MB") ? num : num / 1024;
    return acc + (isNaN(mb) ? 0 : mb);
  }, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26, animation: "fadeUp .4s ease" }}>
        <div>
          <div className="label" style={{ color: "var(--cyan)", marginBottom: 6 }}>REPORTS / EXPORT CENTER</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em" }}>Reports</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)} style={{ marginTop: 22 }}>
          {showForm ? "✕ Cancel" : "+ Generate Report"}
        </button>
      </div>

      {/* Generate form */}
      {showForm && (
        <div className="card" style={{ padding: "20px 22px", marginBottom: 18, animation: "fadeIn .2s ease", border: "1px solid var(--border-hi)" }}>
          <div className="label" style={{ color: "var(--cyan)", marginBottom: 16 }}>NEW REPORT</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
            <div>
              <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>REPORT NAME</div>
              <input className="input" placeholder="Weekly Threat Summary" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>TYPE</div>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "9px 11px", outline: "none" }}>
                <option value="weekly_threat">Weekly Threat</option>
                <option value="incident_response">Incident Response</option>
                <option value="compliance">Compliance Audit</option>
                <option value="network_baseline">Network Baseline</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>PERIOD START</div>
              <input className="input" type="date" value={form.periodStart}
                onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>PERIOD END</div>
              <input className="input" type="date" value={form.periodEnd}
                onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #000", borderTopColor: "transparent", animation: "spin .7s linear infinite", display: "inline-block", marginRight: 8 }} /> Generating…</>
              ) : "→ Generate"}
            </button>
          </div>
        </div>
      )}

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Reports", value: reports.length,               color: "var(--cyan)"  },
          { label: "Ready",         value: readyCount,                   color: "var(--green)" },
          { label: "Storage Used",  value: `${totalStorage.toFixed(1)} MB`, color: "var(--amber)" },
        ].map((s, i) => (
          <div key={s.label} className="card" style={{ padding: "16px 18px", animation: `fadeUp .4s ${i * 55}ms ease both` }}>
            <div className="label" style={{ marginBottom: 8, fontSize: 8 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-ui)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Report list */}
      <div className="card" style={{ padding: 0, animation: "fadeUp .5s .1s ease both" }}>
        <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
          <span className="label">Report Archive</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No reports found.</div>
        ) : reports.map((r, i) => (
          <div key={r._id || i}
            className="tbl-row"
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 20px", borderBottom: "1px solid var(--border)", animationDelay: `${i * 40}ms` }}>

            {/* Doc icon */}
            <div style={{
              width: 36, height: 36, borderRadius: 7, flexShrink: 0,
              background: r.status === "ready" ? "var(--cyan-dim)" : "var(--faint)",
              border: `1px solid ${r.status === "ready" ? "var(--border-hi)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="1" width="10" height="12" rx="1.5" stroke={r.status === "ready" ? "var(--cyan)" : "var(--muted)"} strokeWidth="1.2"/>
                <line x1="4.5" y1="4.5" x2="9.5" y2="4.5" stroke={r.status === "ready" ? "var(--cyan)" : "var(--muted)"} strokeWidth="1" strokeLinecap="round"/>
                <line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke={r.status === "ready" ? "var(--cyan)" : "var(--muted)"} strokeWidth="1" strokeLinecap="round"/>
                <line x1="4.5" y1="8.5" x2="7" y2="8.5"   stroke={r.status === "ready" ? "var(--cyan)" : "var(--muted)"} strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                {r.status === "pending" && (
                  <span className="badge" style={{ background: "rgba(255,181,71,.1)", color: "var(--amber)", border: "1px solid rgba(255,181,71,.25)" }}>PENDING</span>
                )}
                {r.status === "generating" && (
                  <span className="badge" style={{ background: "rgba(0,229,255,.1)", color: "var(--cyan)", border: "1px solid rgba(0,229,255,.25)" }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", border: "1px solid var(--cyan)", borderTopColor: "transparent", animation: "spin .7s linear infinite", marginRight: 4 }} />
                    GENERATING
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
                {r.period} · {r.reportId} · by {r.generatedBy}
              </div>
              {r.summary && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginTop: 3 }}>
                  {r.summary.totalAlerts} alerts · {r.summary.criticalAlerts} critical · {r.summary.totalLogs} events
                </div>
              )}
            </div>

            <div style={{ textAlign: "right", marginRight: 10 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>{r.size || "—"}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleDateString()}</div>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {r.status === "ready" && (
                <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 10 }}>↓ PDF</button>
              )}
              <button className="btn btn-danger" style={{ padding: "5px 8px", fontSize: 10 }}
                onClick={() => handleDelete(r.reportId)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}