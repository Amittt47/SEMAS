/**
 * Sidebar — seim/components/Sidebar.tsx
 * Adds WS live indicator, user info, and logout button.
 */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";

const menu = [
  {
    name: "Dashboard", path: "/",
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
  },
  {
    name: "Alerts", path: "/alerts",
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><line x1="7" y1="5.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="10" r=".6" fill="currentColor"/></svg>
  },
  {
    name: "Logs", path: "/logs",
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4" y1="9" x2="7.5" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
  },
  {
    name: "Reports", path: "/reports",
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1="4.5" y1="4.5" x2="9.5" y2="4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="4.5" y1="8.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
  },
  {
    name: "Settings", path: "/settings",
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5V3M7 11V12.5M1.5 7H3M11 7H12.5M3 3L4.1 4.1M9.9 9.9L11 11M3 11L4.1 9.9M9.9 4.1L11 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();

  return (
    <aside style={{
      width: 216, minHeight: "100vh",
      background: "var(--surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "sticky", top: 0, height: "100vh",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "var(--cyan)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5V10.5L7.5 14L1 10.5V4.5L7.5 1Z" fill="#000"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: ".03em", lineHeight: 1 }}>SEMAS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted)", letterSpacing: ".14em", marginTop: 2 }}>SIEM v2.4</div>
          </div>
        </div>
      </div>

      {/* System / WS pulse */}
      <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ position: "relative", width: 8, height: 8, display: "inline-flex" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: connected ? "var(--green)" : "var(--red)", animation: connected ? "ping 1.6s ease infinite" : "none" }} />
            <span style={{ position: "absolute", inset: 1.5, borderRadius: "50%", background: connected ? "var(--green)" : "var(--red)" }} />
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: connected ? "var(--green)" : "var(--red)", letterSpacing: ".12em" }}>
            {connected ? "SYSTEM NOMINAL" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ padding: "14px 18px 6px" }}>
        <span className="label" style={{ fontSize: 8 }}>Navigation</span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "0 8px" }}>
        {menu.map((item, i) => {
          const active = pathname === item.path;
          return (
            <Link key={item.name} href={item.path} style={{ textDecoration: "none" }}>
              <div className={`nav-item${active ? " active" : ""}`} style={{ animationDelay: `${i * 45}ms` }}>
                {item.icon}
                <span style={{ flex: 1 }}>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      {user && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginBottom: 2, letterSpacing: ".05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 7px", borderRadius: 3,
              background: "rgba(0,229,255,.08)", color: "var(--cyan)", border: "1px solid rgba(0,229,255,.2)",
              textTransform: "uppercase", letterSpacing: ".1em",
            }}>{user.role}</span>
            <button onClick={logout} style={{
              fontFamily: "var(--font-mono)", fontSize: 9, background: "transparent",
              border: "none", color: "var(--muted)", cursor: "pointer", padding: "2px 4px",
            }}>Sign out</button>
          </div>
        </div>
      )}
    </aside>
  );
}
