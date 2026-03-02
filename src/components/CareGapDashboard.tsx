"use client";
import { useState } from "react";
import { Activity, BarChart2, Users, Flag } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { CAREGAP_PATIENTS } from "@/lib/caregap-data";

/* ── Demo data ── */
interface Assessment {
  id: number;
  pid: number;
  score: number;
  risk_band: string;
  flags_json: Record<string, boolean>;
  computed_at: string;
  fname: string;
  lname: string;
  insurance_type: string;
}

const DEMO_ASSESSMENTS: Assessment[] = CAREGAP_PATIENTS.map((p, i) => ({
  id: i + 1,
  pid: p.pid,
  score: p.risk_score,
  risk_band: p.risk_band,
  flags_json: p.flags,
  computed_at: "2026-02-28T12:00:00Z",
  fname: p.fname,
  lname: p.lname,
  insurance_type: p.insurance_type,
}));

/* ── Constants ── */
const BAND_COLORS: Record<string, string> = {
  critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
const BAND_GRADIENTS: Record<string, [string, string]> = {
  critical: ["#ef4444", "#991b1b"], high: ["#fb923c", "#c2410c"],
  medium: ["#facc15", "#a16207"], low: ["#4ade80", "#15803d"],
};
const BAND_STYLES: Record<string, React.CSSProperties> = {
  critical: { background: "#dc2626", color: "#fff" },
  high: { background: "#f97316", color: "#fff" },
  medium: { background: "#eab308", color: "#1a1a1a" },
  low: { background: "#22c55e", color: "#fff" },
};
const INSURANCE_STYLES: Record<string, React.CSSProperties> = {
  medicare: { background: "#dbeafe", color: "#1e40af" },
  medicaid: { background: "#ede9fe", color: "#6d28d9" },
  commercial: { background: "#ccfbf1", color: "#0f766e" },
};

function formatFlag(flag: string): string {
  return flag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { band, count, key } = payload[0].payload;
  return (
    <div style={{ background: "#111827", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid #374151", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
      <p style={{ fontWeight: 600, margin: 0 }}>{band}</p>
      <p style={{ color: BAND_COLORS[key], margin: "2px 0 0" }}>{count} patient{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

/* ── Patient Risk Card ── */
function PatientRiskCard({ assessment }: { assessment: Assessment }) {
  const band = assessment.risk_band;
  const name = `${assessment.lname}, ${assessment.fname}`;
  const initials = ((assessment.fname[0] || "") + (assessment.lname[0] || "")).toUpperCase();
  const flagList = Object.entries(assessment.flags_json).filter(([, v]) => v).map(([k]) => k);

  return (
    <div
      style={{
        background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e5e7eb",
        cursor: "pointer", transition: "all 0.2s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: BAND_COLORS[band] || "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "#0f172a", margin: 0, fontSize: 14 }}>{name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>PID {assessment.pid}</span>
              {assessment.insurance_type && (
                <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", ...INSURANCE_STYLES[assessment.insurance_type] }}>
                  {assessment.insurance_type}
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0, ...BAND_STYLES[band] }}>
          {band}
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>{(assessment.score * 100).toFixed(0)}</p>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Risk Score</p>
        </div>
        {flagList.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {flagList.map((flag) => (
              <span key={flag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#fef2f2", color: "#b91c1c", fontSize: 11, borderRadius: 4 }}>
                <Flag style={{ width: 10, height: 10 }} />
                {formatFlag(flag)}
              </span>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, marginBottom: 0 }}>
        Assessed {formatRelativeDate(assessment.computed_at)}
      </p>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function CareGapDashboard() {
  const [selectedBand, setSelectedBand] = useState<string | null>(null);

  const dist: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of DEMO_ASSESSMENTS) {
    dist[a.risk_band] = (dist[a.risk_band] || 0) + 1;
  }

  const chartData = ["critical", "high", "medium", "low"].map((band) => ({
    band: band.charAt(0).toUpperCase() + band.slice(1),
    count: dist[band] || 0,
    key: band,
  }));

  const filtered = selectedBand
    ? DEMO_ASSESSMENTS.filter((a) => a.risk_band === selectedBand)
    : DEMO_ASSESSMENTS;
  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const needsAction = (dist.critical || 0) + (dist.high || 0);
  const avgScore = (DEMO_ASSESSMENTS.reduce((s, a) => s + a.score, 0) / DEMO_ASSESSMENTS.length * 100).toFixed(0);

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Top row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {/* Left — Summary */}
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Activity style={{ width: 20, height: 20, color: "#0078c7" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Risk Dashboard</h2>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{DEMO_ASSESSMENTS.length} patients assessed</p>
              </div>
            </div>
          </div>

          {/* Risk band counts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {(["critical", "high", "medium", "low"] as const).map((band) => (
              <div
                key={band}
                onClick={() => setSelectedBand(selectedBand === band ? null : band)}
                style={{
                  borderRadius: 8, padding: 10, textAlign: "center",
                  borderLeft: `4px solid ${BAND_COLORS[band]}`,
                  background: BAND_COLORS[band] + "10",
                  cursor: "pointer",
                  outline: selectedBand === band ? `2px solid ${BAND_COLORS[band]}` : "none",
                  outlineOffset: -1,
                  transition: "all 0.15s",
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: BAND_COLORS[band], margin: 0 }}>{dist[band] || 0}</p>
                <p style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, margin: "4px 0 0" }}>{band}</p>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
            {[
              { label: "Patients needing action", value: String(needsAction), color: "#dc2626" },
              { label: "Average risk score", value: `${avgScore}%`, color: "#374151" },
              { label: "Panel health", value: Number(avgScore) < 30 ? "Good" : Number(avgScore) < 50 ? "Needs Attention" : "At Risk", color: Number(avgScore) < 30 ? "#16a34a" : Number(avgScore) < 50 ? "#ca8a04" : "#dc2626" },
              { label: "Measures tracked", value: "CMS165, CMS122", color: "#374151" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: "#6b7280" }}>{s.label}</span>
                <span style={{ fontWeight: 600, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Chart */}
        <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <BarChart2 style={{ width: 16, height: 16, color: "#94a3b8" }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>Risk Distribution</h3>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <defs>
                  {Object.entries(BAND_GRADIENTS).map(([key, [light, dark]]) => (
                    <linearGradient key={key} id={`cg-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={light} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={dark} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 11, fontWeight: 600, fill: "#374151" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={`url(#cg-grad-${entry.key})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patient list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Users style={{ width: 16, height: 16, color: "#94a3b8" }} />
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>
            {selectedBand ? `${selectedBand.charAt(0).toUpperCase() + selectedBand.slice(1)} Risk Patients` : "All Patients by Risk"}
          </h3>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>({sorted.length})</span>
          {selectedBand && (
            <button
              onClick={() => setSelectedBand(null)}
              style={{ fontSize: 11, color: "#0078c7", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Show all
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sorted.map((a) => (
            <PatientRiskCard key={a.id} assessment={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
