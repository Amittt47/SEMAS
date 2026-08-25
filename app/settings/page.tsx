/**
 * Settings Page — seim/app/settings/page.tsx
 * Loads/saves settings from MongoDB via REST API.
 */
"use client";
import { useState, useEffect } from "react";
import { settingsApi, Settings } from "../../lib/api";

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="toggle-track"
      style={{ background: on ? "var(--cyan)" : "var(--faint)", borderColor: on ? "var(--cyan)" : "var(--border)" }}
      onClick={() => set(!on)}>
      <div className="toggle-thumb" style={{ left: on ? 20 : 3, background: on ? "#000" : "var(--muted)" }} />
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "18px 22px", marginBottom: 14 }}>
      <div className="label" style={{ color: "var(--cyan)", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

const DEFAULT: Settings = {
  detection:     { alertThreshold: 500, mlAnomalyDetection: true,  autoBlock: false },
  retention:     { logRetentionDays: 90, realtimeStream: true },
  notifications: { alertEmail: "soc@example.com", emailAlertsEnabled: true },
  integrations:  { splunk: false, pagerduty: false, slack: false, jira: false },
};

export default function SettingsPage() {
  const [cfg,     setCfg]     = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    settingsApi.get()
      .then(res => setCfg(res.data))
      .catch(() => setError("Could not load settings — showing defaults"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await settingsApi.update(cfg);
      setCfg(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const set = (section: keyof Settings, key: string, val: unknown) => {
    setCfg(prev => ({ ...prev, [section]: { ...prev[section] as object, [key]: val } }));
  };

  if (loading) return (
    <div style={{ maxWidth: 700 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 160, background: "var(--faint)", borderRadius: 10, marginBottom: 14, animation: "pulse 1.4s ease infinite" }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 26, animation: "fadeUp .4s ease" }}>
        <div className="label" style={{ color: "var(--cyan)", marginBottom: 6 }}>SETTINGS / SYSTEM CONFIG</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em" }}>Configuration</h1>
      </div>

      {error && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", background: "rgba(255,61,90,.08)", border: "1px solid rgba(255,61,90,.2)", borderRadius: 5, padding: "8px 12px", marginBottom: 14 }}>
          ✕ {error}
        </div>
      )}

      {/* Detection */}
      <Section title="DETECTION ENGINE">
        <Row label="Alert Threshold" desc="Events per second before alerting">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="input"
              value={cfg.detection.alertThreshold}
              onChange={e => set("detection", "alertThreshold", parseInt(e.target.value) || 0)}
              style={{ width: 72, textAlign: "right" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>eps</span>
          </div>
        </Row>
        <Row label="ML Anomaly Detection" desc="Use AI model for behavioral analysis">
          <Toggle on={cfg.detection.mlAnomalyDetection} set={v => set("detection", "mlAnomalyDetection", v)} />
        </Row>
        <Row label="Auto-Block Threats" desc="Automatically block IPs at critical threshold">
          <Toggle on={cfg.detection.autoBlock} set={v => set("detection", "autoBlock", v)} />
        </Row>
      </Section>

      {/* Retention */}
      <Section title="DATA RETENTION">
        <Row label="Log Retention Period" desc="Days to retain raw event logs">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="input"
              value={cfg.retention.logRetentionDays}
              onChange={e => set("retention", "logRetentionDays", parseInt(e.target.value) || 0)}
              style={{ width: 72, textAlign: "right" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>days</span>
          </div>
        </Row>
        <Row label="Real-Time Stream" desc="Ingest live events from network sensors">
          <Toggle on={cfg.retention.realtimeStream} set={v => set("retention", "realtimeStream", v)} />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="NOTIFICATIONS">
        <Row label="Alert Email" desc="Recipient for critical alert notifications">
          <input className="input"
            value={cfg.notifications.alertEmail}
            onChange={e => set("notifications", "alertEmail", e.target.value)}
            style={{ width: 220 }} />
        </Row>
        <Row label="Email Alerts" desc="Send email for severity ≥ HIGH">
          <Toggle on={cfg.notifications.emailAlertsEnabled} set={v => set("notifications", "emailAlertsEnabled", v)} />
        </Row>
      </Section>

      {/* Integrations */}
      <Section title="INTEGRATIONS">
        {(["splunk","pagerduty","slack","jira"] as const).map(key => {
          const on = cfg.integrations[key];
          return (
            <Row key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 8px", borderRadius: 3,
                  background: on ? "rgba(0,214,143,.1)" : "var(--faint)",
                  color: on ? "var(--green)" : "var(--muted)",
                  border: `1px solid ${on ? "rgba(0,214,143,.25)" : "var(--border)"}`,
                }}>{on ? "CONNECTED" : "DISCONNECTED"}</span>
                <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 10 }}
                  onClick={() => set("integrations", key, !on)}>
                  {on ? "Disconnect" : "Connect →"}
                </button>
              </div>
            </Row>
          );
        })}
      </Section>

      {/* Save bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
        <button className="btn btn-ghost" onClick={() => window.location.reload()}>Discard</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
