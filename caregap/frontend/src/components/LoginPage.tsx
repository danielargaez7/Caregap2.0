import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HeartPulse, LogIn, AlertCircle, Shield, TrendingDown, DollarSign,
  Users, AlertTriangle,
} from "lucide-react";

/* ── keyframes & grid styles ── */
const GRID_CSS = `
@keyframes ccrd-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ccrd-grid-scroll {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}
@keyframes ccrd-pulse-ring {
  0%   { transform: scale(1); opacity: 0.35; }
  50%  { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes ccrd-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(8px, -12px) scale(1.03); }
}
@keyframes ccrd-scan {
  0%   { top: -2px; opacity: 0; }
  10%  { opacity: 0.4; }
  90%  { opacity: 0.4; }
  100% { top: 100%; opacity: 0; }
}
@keyframes ccrd-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
@keyframes ccrd-drift-1 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(18px, -10px); }
  50%  { transform: translate(8px, 14px); }
  75%  { transform: translate(-12px, 6px); }
  100% { transform: translate(0, 0); }
}
@keyframes ccrd-drift-2 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-14px, 12px); }
  50%  { transform: translate(10px, 8px); }
  75%  { transform: translate(16px, -14px); }
  100% { transform: translate(0, 0); }
}
@keyframes ccrd-drift-3 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(12px, 16px); }
  50%  { transform: translate(-10px, -8px); }
  75%  { transform: translate(-16px, 10px); }
  100% { transform: translate(0, 0); }
}
@keyframes ccrd-drift-4 {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-18px, -6px); }
  50%  { transform: translate(14px, -12px); }
  75%  { transform: translate(6px, 16px); }
  100% { transform: translate(0, 0); }
}
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById("ccrd-grid-css")) return;
    const s = document.createElement("style");
    s.id = "ccrd-grid-css";
    s.textContent = GRID_CSS;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);
  return null;
}

/* ── Rotating badge data ── */
const RISK_PATIENTS = [
  { name: "Eugene Jackson", score: "0.91", detail: "BP 162/98 · A1c 9.4%", scoreColor: "rgba(239,68,68,0.6)" },
  { name: "Patricia Williams", score: "0.87", detail: "A1c 10.2% · COPD", scoreColor: "rgba(239,68,68,0.6)" },
  { name: "Linda Martinez", score: "0.84", detail: "BP 158/96 · PDC 45%", scoreColor: "rgba(239,68,68,0.6)" },
  { name: "Dorothy Henderson", score: "0.72", detail: "CKD Stage 3 · eGFR 48", scoreColor: "rgba(249,115,22,0.6)" },
  { name: "Robert Chen", score: "0.68", detail: "Missing HbA1c · PHQ-9", scoreColor: "rgba(249,115,22,0.6)" },
  { name: "Barbara Clark", score: "0.65", detail: "A1c 9.1% · Lung CT due", scoreColor: "rgba(249,115,22,0.6)" },
  { name: "Maria Santos", score: "0.18", detail: "Controlled · PDC 92%", scoreColor: "rgba(34,197,94,0.6)" },
  { name: "Richard Moore", score: "0.12", detail: "Stable · All current", scoreColor: "rgba(34,197,94,0.6)" },
];

const COVERAGE_ITEMS = [
  { text: "AWV, Mammogram, Flu — $0 Medicare" },
  { text: "Colonoscopy screening — $0 Part B" },
  { text: "Diabetes screening — $0 preventive" },
  { text: "Lung CT (LDCT) — $0 Medicare" },
  { text: "Depression PHQ-9 — $0 covered" },
  { text: "Pneumonia vaccine — $0 Part B" },
];

const ADHERENCE_ITEMS = [
  { name: "Linda Martinez", pdc: "45%", status: "Non-adherent", statusColor: "rgba(239,68,68,0.6)" },
  { name: "Eugene Jackson", pdc: "62%", status: "Non-adherent", statusColor: "rgba(239,68,68,0.6)" },
  { name: "Patricia Williams", pdc: "38%", status: "Non-adherent", statusColor: "rgba(239,68,68,0.6)" },
  { name: "Maria Santos", pdc: "92%", status: "Adherent", statusColor: "rgba(34,197,94,0.6)" },
  { name: "Dorothy Henderson", pdc: "71%", status: "Borderline", statusColor: "rgba(234,179,8,0.6)" },
  { name: "Richard Moore", pdc: "88%", status: "Adherent", statusColor: "rgba(34,197,94,0.6)" },
];

const ALERT_ITEMS = [
  { name: "Eugene Jackson", text: "Dual gap: BP + A1c", severity: "CRITICAL" },
  { name: "Patricia Williams", text: "A1c 10.2% · COPD 4mo", severity: "HIGH" },
  { name: "Dorothy Henderson", text: "CKD declining eGFR 48", severity: "HIGH" },
  { name: "Robert Chen", text: "Missing HbA1c lab", severity: "WARN" },
  { name: "James Whitfield", text: "BP borderline 138/88", severity: "INFO" },
  { name: "Barbara Clark", text: "Lung CT overdue", severity: "WARN" },
];

/* ── Custom hook for cycling data ── */
function useCycleIndex(length: number, intervalMs: number, startDelay: number) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        setVisible(false);
        setTimeout(() => {
          setIndex((i) => (i + 1) % length);
          setVisible(true);
        }, 400);
      }, intervalMs);
      return () => clearInterval(timer);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [length, intervalMs, startDelay]);
  return { index, visible };
}

/* ── HUD readout component ── */
function HudReadout({ children, position }: { children: React.ReactNode; position: string }) {
  const posStyles: Record<string, React.CSSProperties> = {
    "top-left":     { top: 24, left: 28 },
    "top-right":    { top: 24, right: 28 },
    "bottom-left":  { bottom: 24, left: 28 },
    "bottom-right": { bottom: 24, right: 28 },
  };
  return (
    <div
      className="absolute hidden md:flex items-center gap-2 font-mono text-[11px] tracking-wide"
      style={{ ...posStyles[position], color: "rgba(125,211,252,0.35)" }}
    >
      {children}
    </div>
  );
}

/* ── animated background grid ── */
function BlueprintGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(14,45,82,0.9) 0%, #080f1a 70%)",
        }}
      />

      {/* Grid layer — scrolls diagonally */}
      <div className="absolute inset-0" style={{ opacity: 0.12 }}>
        <div
          className="absolute"
          style={{
            inset: "-120px",
            backgroundImage: `
              linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            animation: "ccrd-grid-scroll 8s linear infinite",
          }}
        />
      </div>

      {/* Fine grid overlay */}
      <div className="absolute inset-0" style={{ opacity: 0.04 }}>
        <div
          className="absolute"
          style={{
            inset: "-60px",
            backgroundImage: `
              linear-gradient(rgba(125,211,252,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(125,211,252,0.6) 1px, transparent 1px)
            `,
            backgroundSize: "15px 15px",
            animation: "ccrd-grid-scroll 12s linear infinite",
          }}
        />
      </div>

      {/* Center glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,120,199,0.15) 0%, transparent 65%)",
          animation: "ccrd-float 10s ease-in-out infinite",
        }}
      />

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.25), transparent)",
          animation: "ccrd-scan 6s linear infinite",
        }}
      />
    </div>
  );
}

/* ── Floating badge styles ── */
const badgeBase: React.CSSProperties = {
  color: "rgba(125,211,252,0.4)",
  backgroundColor: "rgba(14,45,82,0.4)",
  borderColor: "rgba(56,189,248,0.1)",
  backdropFilter: "blur(8px)",
};

/* ── main page ── */
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Cycle each badge at different intervals so they don't all swap at once
  const risk = useCycleIndex(RISK_PATIENTS.length, 4000, 2000);
  const coverage = useCycleIndex(COVERAGE_ITEMS.length, 5000, 3500);
  const adherence = useCycleIndex(ADHERENCE_ITEMS.length, 4500, 1500);
  const alert = useCycleIndex(ALERT_ITEMS.length, 3800, 2800);

  const rp = RISK_PATIENTS[risk.index];
  const cv = COVERAGE_ITEMS[coverage.index];
  const ad = ADHERENCE_ITEMS[adherence.index];
  const al = ALERT_ITEMS[alert.index];

  const sevColor: Record<string, string> = {
    CRITICAL: "rgba(239,68,68,0.6)",
    HIGH: "rgba(249,115,22,0.6)",
    WARN: "rgba(234,179,8,0.6)",
    INFO: "rgba(56,189,248,0.5)",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    const success = login(username.trim(), password);
    if (success) navigate("/dashboard", { replace: true });
    else setError("Invalid username or password.");
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{ backgroundColor: "#080f1a" }}>
      <InjectStyles />
      <BlueprintGrid />

      {/* ─── HUD corner readouts ─── */}
      <HudReadout position="top-left">
        <HeartPulse className="w-3.5 h-3.5" style={{ color: "rgba(56,189,248,0.45)" }} />
        <span>CAREGAP v1.0</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
        <span>CHRONIC CARE RISK DETECTOR</span>
      </HudReadout>

      <HudReadout position="top-right">
        <div className="relative flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: "ccrd-blink 2s ease-in-out infinite" }} />
          <span>SYS ONLINE</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
        <Users className="w-3 h-3" />
        <span>20 PATIENTS MONITORED</span>
      </HudReadout>

      <HudReadout position="bottom-left">
        <AlertTriangle className="w-3 h-3" style={{ color: "rgba(251,191,36,0.45)" }} />
        <span>9 OPEN ALERTS</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
        <span style={{ color: "rgba(239,68,68,0.5)" }}>4 HIGH</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
        <span style={{ color: "rgba(249,115,22,0.5)" }}>4 WARN</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
        <span style={{ color: "rgba(56,189,248,0.5)" }}>1 INFO</span>
      </HudReadout>

      <HudReadout position="bottom-right">
        <Shield className="w-3 h-3" />
        <span>HIPAA COMPLIANT</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
        <span>AES-256 ENCRYPTED</span>
      </HudReadout>

      {/* ─── Floating metric badges (drifting + cycling data) ─── */}

      {/* Top-left: Patient Risk */}
      <div
        className="absolute hidden lg:block"
        style={{ top: "18%", left: "10%", animation: "ccrd-drift-1 20s ease-in-out infinite, ccrd-fade-up 1s ease-out 0.8s both" }}
      >
        <div className="font-mono text-[10px] rounded-lg px-3 py-2 border" style={badgeBase}>
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse className="w-3 h-3" style={{ color: "rgba(239,68,68,0.5)" }} />
            <span className="uppercase tracking-wider" style={{ fontSize: "8px" }}>Patient Risk</span>
          </div>
          <div style={{ transition: "opacity 0.4s ease", opacity: risk.visible ? 1 : 0 }}>
            <span>{rp.name}</span>
            <span style={{ color: "rgba(255,255,255,0.12)" }}> · </span>
            <span style={{ color: rp.scoreColor }}>{rp.score}</span>
            <div className="mt-0.5" style={{ color: "rgba(255,255,255,0.2)", fontSize: "9px" }}>{rp.detail}</div>
          </div>
        </div>
      </div>

      {/* Top-right: Coverage Check */}
      <div
        className="absolute hidden lg:block"
        style={{ top: "20%", right: "8%", animation: "ccrd-drift-2 24s ease-in-out infinite, ccrd-fade-up 1s ease-out 1s both" }}
      >
        <div className="font-mono text-[10px] rounded-lg px-3 py-2 border" style={badgeBase}>
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3" style={{ color: "rgba(34,197,94,0.5)" }} />
            <span className="uppercase tracking-wider" style={{ fontSize: "8px" }}>Coverage Check</span>
          </div>
          <div style={{ transition: "opacity 0.4s ease", opacity: coverage.visible ? 1 : 0 }}>
            <span style={{ color: "rgba(34,197,94,0.45)" }}>{cv.text}</span>
          </div>
        </div>
      </div>

      {/* Bottom-left: Adherence Alert */}
      <div
        className="absolute hidden lg:block"
        style={{ bottom: "20%", left: "6%", animation: "ccrd-drift-3 22s ease-in-out infinite, ccrd-fade-up 1s ease-out 1.2s both" }}
      >
        <div className="font-mono text-[10px] rounded-lg px-3 py-2 border" style={badgeBase}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3" style={{ color: "rgba(251,191,36,0.5)" }} />
            <span className="uppercase tracking-wider" style={{ fontSize: "8px" }}>Adherence</span>
          </div>
          <div style={{ transition: "opacity 0.4s ease", opacity: adherence.visible ? 1 : 0 }}>
            <span>{ad.name}</span>
            <span style={{ color: "rgba(255,255,255,0.12)" }}> · </span>
            <span style={{ color: ad.statusColor }}>PDC {ad.pdc}</span>
            <span style={{ color: "rgba(255,255,255,0.12)" }}> · </span>
            <span style={{ color: ad.statusColor }}>{ad.status}</span>
          </div>
        </div>
      </div>

      {/* Bottom-right: Care Gap Alert */}
      <div
        className="absolute hidden lg:block"
        style={{ bottom: "16%", right: "10%", animation: "ccrd-drift-4 18s ease-in-out infinite, ccrd-fade-up 1s ease-out 1.4s both" }}
      >
        <div className="font-mono text-[10px] rounded-lg px-3 py-2 border" style={badgeBase}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3" style={{ color: sevColor[al.severity] }} />
            <span className="uppercase tracking-wider" style={{ fontSize: "8px" }}>Care Gap</span>
            <span className="uppercase tracking-wider px-1 py-0.5 rounded text-[7px]"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: sevColor[al.severity] }}>
              {al.severity}
            </span>
          </div>
          <div style={{ transition: "opacity 0.4s ease", opacity: alert.visible ? 1 : 0 }}>
            <span>{al.name}</span>
            <div className="mt-0.5" style={{ color: "rgba(255,255,255,0.2)", fontSize: "9px" }}>{al.text}</div>
          </div>
        </div>
      </div>

      {/* ─── Center card ─── */}
      <div className="relative w-full max-w-sm mx-6 z-10">
        {/* Pulse rings behind card */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="w-16 h-16 rounded-full border" style={{ borderColor: "rgba(56,189,248,0.12)", animation: "ccrd-pulse-ring 3s ease-out infinite" }} />
          <div className="absolute inset-0 w-16 h-16 rounded-full border" style={{ borderColor: "rgba(56,189,248,0.08)", animation: "ccrd-pulse-ring 3s ease-out 1s infinite" }} />
        </div>

        {/* Logo + glow */}
        <div className="flex flex-col items-center mb-6" style={{ animation: "ccrd-fade-up 0.6s ease-out both" }}>
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(0,120,199,0.2) 40%, transparent 70%)", transform: "scale(3)", animation: "ccrd-float 4s ease-in-out infinite" }} />
            <div className="absolute inset-0 rounded-2xl blur-md"
              style={{ background: "radial-gradient(circle, rgba(125,211,252,0.35) 0%, rgba(56,189,248,0.12) 50%, transparent 70%)", transform: "scale(2)" }} />
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center border border-white/15"
              style={{ backgroundColor: "rgba(0,120,199,0.3)", backdropFilter: "blur(8px)" }}>
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">CareGap</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(125,211,252,0.4)" }}>Chronic Care Risk Detector</p>
        </div>

        {/* Headline */}
        <div className="text-center mb-5" style={{ animation: "ccrd-fade-up 0.6s ease-out 0.08s both" }}>
          <h2 className="text-lg font-bold text-white leading-tight">
            Saving lives.{" "}
            <span style={{ color: "rgba(56,189,248,0.85)" }}>Saving hospitals money.</span>
          </h2>
        </div>

        {/* Login card */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "rgba(14,45,82,0.35)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(56,189,248,0.12)",
            boxShadow: "0 0 40px rgba(0,120,199,0.08), inset 0 1px 0 rgba(125,211,252,0.06)",
            animation: "ccrd-fade-up 0.6s ease-out 0.3s both",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(125,211,252,0.45)" }}>Username</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username" autoComplete="username"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  backgroundColor: "rgba(8,15,26,0.6)",
                  border: "1px solid rgba(56,189,248,0.12)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(56,189,248,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "rgba(125,211,252,0.45)" }}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password" autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  backgroundColor: "rgba(8,15,26,0.6)",
                  border: "1px solid rgba(56,189,248,0.12)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(56,189,248,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-400/15 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-all cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(0,120,199,0.7), rgba(56,189,248,0.5))",
                border: "1px solid rgba(56,189,248,0.25)",
                boxShadow: "0 0 20px rgba(0,120,199,0.15)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,120,199,0.9), rgba(56,189,248,0.7))";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0,120,199,0.25)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,120,199,0.7), rgba(56,189,248,0.5))";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0,120,199,0.15)";
              }}
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          </form>

          {/* Demo creds */}
          <div className="mt-4 rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(8,15,26,0.4)", border: "1px dashed rgba(56,189,248,0.1)" }}>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(125,211,252,0.25)" }}>Demo Credentials</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Username</span>
              <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: "rgba(125,211,252,0.6)", backgroundColor: "rgba(56,189,248,0.08)" }}>admin</code>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-white/30">Password</span>
              <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ color: "rgba(125,211,252,0.6)", backgroundColor: "rgba(56,189,248,0.08)" }}>ccrd2026</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center" style={{ animation: "ccrd-fade-up 0.6s ease-out 0.5s both" }}>
          <div className="flex items-center justify-center gap-1.5 text-[10px]" style={{ color: "rgba(125,211,252,0.2)" }}>
            <Shield className="w-3 h-3" />
            <span>HIPAA Compliant · Intermountain Medical Center · Murray, Utah</span>
          </div>
          <p className="text-[9px] mt-1.5" style={{ color: "rgba(125,211,252,0.15)" }}>
            All patient data shown is simulated for demonstration purposes. No real protected health information (PHI) is used.
          </p>
        </div>
      </div>
    </div>
  );
}
