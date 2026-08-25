"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, user } = useAuth(); // Assuming useAuth provides the user object
  const router = useRouter();

  // 1. Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent page reload
    
    if (!email || !password) { 
      setError("All fields are required."); 
      return; 
    }

    setLoading(true);
    setError("");

    try {
      await login(email, password);
      // Success logic: token is saved in AuthContext/LocalStorage
      router.push("/");
    } catch (err: unknown) {
      // Logic for common errors
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg.includes("fetch") ? "Server connection failed" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", position: "relative", overflow: "hidden",
    }}>
      {/* Background Decor... (Keep your existing grid/glow divs) */}

      <div style={{
        width: 370, position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "34px 34px 30px",
        animation: "fadeUp .5s ease",
      }}>
        {/* Header/Logo Section... (Keep existing) */}

        <form onSubmit={handleLogin}>
          <div className="label" style={{ color: "var(--cyan)", marginBottom: 20 }}>ANALYST LOGIN</div>

          <div style={{ marginBottom: 12 }}>
            <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>EMAIL ADDRESS</div>
            <input 
              className="input" 
              type="email" 
              placeholder="analyst@sentinel.io"
              value={email} 
              onChange={e => { setEmail(e.target.value); setError(""); }} 
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="label" style={{ fontSize: 8, marginBottom: 5 }}>PASSWORD</div>
            <input 
              className="input" 
              type="password" 
              placeholder="••••••••••••"
              value={password} 
              onChange={e => { setPassword(e.target.value); setError(""); }} 
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)",
              background: "rgba(255,61,90,.08)", border: "1px solid rgba(255,61,90,.2)",
              borderRadius: 5, padding: "8px 12px", marginBottom: 14,
            }}>✕ {error}</div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "11px 20px", fontSize: 13 }}
          >
            {loading ? "Authenticating…" : "→ Access Console"}
          </button>
        </form>

        {/* Demo hints and Footer... (Keep existing) */}
      </div>
    </div>
  );
}