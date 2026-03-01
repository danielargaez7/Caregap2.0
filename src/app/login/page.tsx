"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DEMO_CREDENTIALS = [
  { username: "doctor", password: "doctor123", displayName: "Dr. Patel" },
  { username: "admin", password: "admin123", displayName: "Admin User" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("medassist-auth");
    if (auth) {
      try {
        const p = JSON.parse(auth);
        if (p.authenticated) router.replace("/");
      } catch { /* ignore */ }
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const match = DEMO_CREDENTIALS.find(
        (c) => c.username === username && c.password === password
      );
      if (match) {
        localStorage.setItem(
          "medassist-auth",
          JSON.stringify({ authenticated: true, user: match.username, displayName: match.displayName, loginTime: Date.now() })
        );
        router.replace("/");
      } else {
        setError("Invalid credentials. Try doctor / doctor123");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f5f7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          padding: "40px 36px",
          animation: "fadeIn 0.4s ease",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 22,
            }}
          >
            H
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", margin: 0 }}>Health Monitor Portal</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>Clinical Decision Support — MedAssist AI</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 6 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#f1f5f9",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 14,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "#f1f5f9",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Hint */}
        <div style={{ textAlign: "center", marginTop: 24, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Demo credentials</p>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", fontFamily: "monospace" }}>doctor / doctor123</p>
        </div>
      </div>
    </div>
  );
}
