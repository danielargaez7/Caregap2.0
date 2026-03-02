/* eslint-disable @typescript-eslint/no-unused-vars */
// hello
"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_RESPONSES, TIME_SLOTS, APPT_TYPES, INITIAL_APPOINTMENTS,
  VISIT_NOTES as DEMO_VISIT_NOTES, getTagStyle, STAFF,
  PATIENT_INFO as DEMO_PATIENT_INFO, formatTime12, DEMO_PATIENTS,
  COMMON_MEDICATIONS, RX_FREQUENCIES, RX_ROUTES, COMMON_DOSES,
  PENICILLIN_CLASS_DRUGS,
  LAB_TRENDS, BP_READINGS, VITAL_TRENDS, MEDICATION_TIMELINE,
  REFERENCE_RANGES, computeBodySystemScores,
} from "@/lib/patient-data";
import type { Appointment, PrescriptionItem, LabTrendPoint } from "@/lib/patient-data";


/* ─── AI text rendering helper ─── */
const renderAIText = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    // Alert banners — orange for alerts, red for warnings/critical
    const alertMatch = line.match(/^(#{2,3}\s+)?(\*\*)?(?:⚠️?\s*)?(Allergy Alert|Alert|ALLERGY ALERT|ALERT|Caution|CAUTION|Notice)(\*\*)?(\s*[:!—-]?\s*)(.*)/i);
    const warningMatch = !alertMatch && line.match(/^(#{2,3}\s+)?(\*\*)?(?:⚠️?\s*)?(Warning|WARNING|DOMAIN RULE VIOLATION|CRITICAL|CONTRAINDICATED|Do NOT)(\*\*)?(\s*[:!—-]?\s*)(.*)/i);
    if (alertMatch) {
      const label = alertMatch[3];
      const rest = alertMatch[6] || "";
      return <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, margin: "8px 0 4px", padding: "6px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
        <span style={{ fontSize: 14, marginTop: 1 }}>⚠</span>
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>
          <strong style={{ color: "#d97706", fontWeight: 700 }}>{label}</strong>
          {rest && <span style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: ": " + inlineMd(rest) }} />}
        </span>
      </div>;
    }
    if (warningMatch) {
      const label = warningMatch[3];
      const rest = warningMatch[6] || "";
      return <p key={i} style={{ fontSize: 13, margin: "2px 0", lineHeight: 1.5 }}>
        <strong style={{ color: "#dc2626", fontWeight: 700 }}>{label}</strong>
        {rest && <span style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: ": " + inlineMd(rest) }} />}
      </p>;
    }
    // Headers
    if (line.startsWith("### ")) return <h4 key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "8px 0 4px" }}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "8px 0 4px" }}>{line.slice(3)}</h3>;
    // Bullet points
    if (line.match(/^[-*•]\s/)) {
      const content = line.replace(/^[-*•]\s/, "");
      return <div key={i} style={{ display: "flex", gap: 6, margin: "2px 0", fontSize: 13, color: "#374151" }}><span style={{ color: "#6b7280" }}>&#8226;</span><span dangerouslySetInnerHTML={{ __html: inlineMd(content) }} /></div>;
    }
    return <p key={i} style={{ fontSize: 13, color: "#374151", margin: "2px 0", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />;
  });
};

const inlineMd = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\b(Warning|WARNING|CRITICAL|CONTRAINDICATED|DOMAIN RULE VIOLATION)\b/g, '<strong style="color:#dc2626;font-weight:700">$1</strong>')
    .replace(/\b(Allergy Alert|ALLERGY ALERT|Alert|ALERT|Caution|CAUTION)\b/g, '<strong style="color:#d97706;font-weight:700">$1</strong>');

/* Data constants imported from @/lib/patient-data */

const SeverityBadge = ({ level }: { level: string }) => {
  const styles: Record<string, React.CSSProperties> = {
    high: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
    moderate: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
    low: { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" },
  };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, ...(styles[level] || styles.low) }}>
      {level.toUpperCase()}
    </span>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <span style={{ color: "#dc2626" }}>↗</span>;
  if (trend === "down") return <span style={{ color: "#059669" }}>↘</span>;
  return <span style={{ color: "#9ca3af" }}>→</span>;
};

const SourceTag = ({ sources }: { sources: string[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
      <button onClick={() => setOpen(!open)} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        {open ? "Hide" : "View"} Sources ({sources.length})
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {sources.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: "#6b7280", paddingLeft: 12, borderLeft: "2px solid #d1d5db", marginBottom: 4 }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const ResponseCard = ({ data, onBookSlot }: { data: any; onBookSlot?: (date: string, time: string) => void }) => {
  if (data.type === "alert") {
    return (
      <div style={{ borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ fontWeight: 600, fontSize: 12, color: "#dc2626" }}>{data.title}</span>
          </div>
          <SeverityBadge level="high" />
        </div>
        {data.content.map((item: any, i: number) => (
          <div key={i} style={{ background: "#ffffff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #fee2e2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{item.pair}</span>
              <SeverityBadge level={item.severity} />
            </div>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.detail}</p>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>via {item.source}</p>
          </div>
        ))}
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, borderLeft: "3px solid #f59e0b" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#b45309", margin: "0 0 4px" }}>Recommendation</p>
          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{data.recommendation}</p>
        </div>
        <SourceTag sources={data.sources} />
      </div>
    );
  }

  if (data.type === "lab_summary") {
    return (
      <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#2563eb" }}>{data.title}</span>
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>⚠ Flagged Results</p>
        {data.content.flagged.map((item: any, i: number) => (
          <div key={i} style={{ background: "#ffffff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{item.test}: <span style={{ color: "#dc2626" }}>{item.value}</span></span>
              <TrendIcon trend={item.trend} />
            </div>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{item.interpretation}</p>
          </div>
        ))}
        <p style={{ fontSize: 10, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>✓ Within Range</p>
        {data.content.normal.map((n: string, i: number) => (
          <p key={i} style={{ fontSize: 11, color: "#6b7280", paddingLeft: 10, borderLeft: "2px solid #a7f3d0", marginBottom: 4 }}>{n}</p>
        ))}
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 8, borderLeft: "3px solid #3b82f6" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", margin: "0 0 4px" }}>Clinical Consideration</p>
          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{data.recommendation}</p>
        </div>
        <SourceTag sources={data.sources} />
      </div>
    );
  }

  if (data.type === "med_review") {
    return (
      <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#7c3aed" }}>{data.title}</span>
        </div>
        <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 10 }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 500 }}>Medication</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 500 }}>Dose</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 500 }}>Freq</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 500 }}>For</th>
              </tr>
            </thead>
            <tbody>
              {data.content.active.map((med: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9", background: "#ffffff" }}>
                  <td style={{ padding: "6px 8px", color: "#1e293b", fontWeight: 500 }}>{med.name}</td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>{med.dose}</td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>{med.freq}</td>
                  <td style={{ padding: "6px 8px", color: "#9ca3af" }}>{med.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Clinical Considerations</p>
        {data.content.considerations.map((c: string, i: number) => (
          <p key={i} style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, paddingLeft: 10, borderLeft: "2px solid #e2e8f0", marginBottom: 6 }}>{c}</p>
        ))}
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginTop: 8, borderLeft: "3px solid #f59e0b" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#b45309", margin: "0 0 4px" }}>⚠ Gaps Identified</p>
          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{data.recommendation}</p>
        </div>
        <SourceTag sources={data.sources} />
      </div>
    );
  }
  if (data.type === "notes_answer") {
    const lines = data.content.split("\n");
    return (
      <div style={{ borderRadius: 12, border: "1px solid #d1fae5", background: "#ecfdf5", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#059669" }}>{data.title}</span>
        </div>
        <div style={{ background: "#ffffff", borderRadius: 8, padding: 10, border: "1px solid #d1fae5" }}>
          {lines.map((line: string, i: number) => {
            if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b">$1</strong>');
            return <p key={i} style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: formatted }} />;
          })}
        </div>
        {data.details && (
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 8, borderLeft: "3px solid #10b981" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#059669", margin: "0 0 4px" }}>AI Analysis</p>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{data.details}</p>
          </div>
        )}
        {data.noteCount && (
          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 8 }}>Referenced {data.noteCount} visit note(s) from patient record</p>
        )}
      </div>
    );
  }

  if (data.type === "availability") {
    return (
      <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: "#3b82f6" }}>{data.title}</span>
        </div>
        {data.content.dates.map((dg: any) => (
          <div key={dg.date} style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{dg.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {dg.slots.map((slot: string) => (
                <button key={slot} onClick={() => onBookSlot?.(dg.date, slot)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #3b82f6", background: "#eff6ff", color: "#3b82f6", cursor: "pointer" }}>
                  {formatTime12(slot)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: 10, marginTop: 4, borderLeft: "3px solid #3b82f6" }}>
          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{data.recommendation}</p>
        </div>
      </div>
    );
  }

  if (data.type === "booking_confirmation") {
    return (
      <div style={{ borderRadius: 12, border: "1px solid #a7f3d0", background: "#ecfdf5", padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontWeight: 600, fontSize: 12, color: "#059669" }}>{data.title}</span>
        </div>
        <div style={{ background: "#ffffff", borderRadius: 8, padding: 10, border: "1px solid #d1fae5" }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#1e293b", margin: 0 }}>{data.content.date} at {data.content.time}</p>
          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>Type: {data.content.type} — Provider: {data.content.provider}</p>
        </div>
        <p style={{ fontSize: 11, color: "#059669", margin: "8px 0 0" }}>{data.recommendation}</p>
      </div>
    );
  }

  return null;
};

const TypingIndicator = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px" }}>
    {[0, 150, 300].map(delay => (
      <div key={delay} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", animation: "bounce 1s infinite", animationDelay: `${delay}ms` }} />
    ))}
    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>Analyzing patient records...</span>
  </div>
);

/* ─── Calendar View Component ─── */
const CalendarView = ({
  appointments,
  onBook,
  onCancel,
  selectedPatientId,
}: {
  appointments: Appointment[];
  onBook: (date: string, time: string, type: string) => void;
  onCancel: (id: string) => void;
  selectedPatientId: string;
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState("Follow-up");
  const [viewMonth, setViewMonth] = useState(1); // 0-indexed: 1 = Feb
  const [viewYear] = useState(2026);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const getDateStr = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    return `${viewYear}-${m}-${String(day).padStart(2, "0")}`;
  };

  const aptsForDay = (day: number) => appointments.filter(a => a.date === getDateStr(day));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedApts = selectedDate ? appointments.filter(a => a.date === selectedDate) : [];

  return (
    <div style={{ padding: "24px 32px", animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", margin: 0 }}>Appointments</h2>
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Book and manage appointments for {DEMO_PATIENTS.find(p => p.id === selectedPatientId)?.name ?? "patient"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setViewMonth(m => Math.max(1, m - 1))} disabled={viewMonth <= 1} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: viewMonth <= 1 ? "not-allowed" : "pointer", opacity: viewMonth <= 1 ? 0.3 : 1, fontSize: 14, color: "#64748b" }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", minWidth: 140, textAlign: "center" }}>{monthNames[viewMonth]} {viewYear}</span>
          <button onClick={() => setViewMonth(m => Math.min(2, m + 1))} disabled={viewMonth >= 2} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: viewMonth >= 2 ? "not-allowed" : "pointer", opacity: viewMonth >= 2 ? 0.3 : 1, fontSize: 14, color: "#64748b" }}>→</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#3b82f6" }} /><span style={{ fontSize: 11, color: "#64748b" }}>Your appointments</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#e2e8f0" }} /><span style={{ fontSize: 11, color: "#64748b" }}>Booked (other patients)</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#fff", border: "1px solid #d1d5db" }} /><span style={{ fontSize: 11, color: "#64748b" }}>Available</span></div>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Calendar Grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {/* Day headers */}
            {dayNames.map(d => (
              <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#9ca3af", background: "#f8fafc", textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
            ))}
            {/* Day cells */}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ padding: 8, background: "#fafbfc" }} />;
              const dateStr = getDateStr(day);
              const dow = new Date(viewYear, viewMonth, day).getDay();
              const isWeekend = dow === 0 || dow === 6;
              const isSelected = selectedDate === dateStr;
              const dayApts = aptsForDay(day);
              const myApts = dayApts.filter(a => a.patientId === selectedPatientId);
              const otherApts = dayApts.filter(a => a.patientId !== selectedPatientId);
              const isToday = dateStr === "2026-02-23";

              return (
                <div
                  key={day}
                  onClick={() => !isWeekend && setSelectedDate(dateStr)}
                  style={{
                    padding: "8px 6px",
                    minHeight: 72,
                    cursor: isWeekend ? "default" : "pointer",
                    background: isSelected ? "#eff6ff" : isWeekend ? "#f9fafb" : "#fff",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid transparent",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isWeekend ? "#d1d5db" : isToday ? "#3b82f6" : "#1e293b", marginBottom: 4 }}>
                    {day}
                    {isToday && <span style={{ fontSize: 9, color: "#3b82f6", marginLeft: 4 }}>Today</span>}
                  </div>
                  {isWeekend ? (
                    <span style={{ fontSize: 9, color: "#d1d5db" }}>Closed</span>
                  ) : (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {myApts.map((_, j) => <div key={`m${j}`} style={{ width: 6, height: 6, borderRadius: 2, background: "#3b82f6" }} />)}
                      {otherApts.map((_, j) => <div key={`o${j}`} style={{ width: 6, height: 6, borderRadius: 2, background: "#d1d5db" }} />)}
                      {dayApts.length === 0 && <span style={{ fontSize: 9, color: "#a3e635" }}>Open</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div style={{ width: 320, flexShrink: 0 }}>
          {selectedDate ? (() => {
            const selDow = new Date(selectedDate).getDay();
            const isWE = selDow === 0 || selDow === 6;
            const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
            if (isWE) return (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{dateLabel}</p>
                <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>No office hours on weekends</p>
              </div>
            );
            return (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>{dateLabel}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Office hours: 9:00 AM – 5:00 PM</p>
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto", padding: "8px 0" }} className="scrollbar-thin">
                  {TIME_SLOTS.map(slot => {
                    const apt = selectedApts.find(a => a.time === slot);
                    const isMine = apt?.patientId === selectedPatientId;
                    const isTaken = !!apt;
                    const isBooking = bookingSlot === slot;

                    return (
                      <div key={slot} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b", width: 64, flexShrink: 0 }}>{formatTime12(slot)}</span>
                        {isTaken ? (
                          <div style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: isMine ? "#eff6ff" : "#f1f5f9", border: isMine ? "1px solid #bfdbfe" : "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: isMine ? "#1d4ed8" : "#9ca3af" }}>{isMine ? apt.type : "Booked"}</span>
                              {isMine && <span style={{ fontSize: 10, color: "#64748b", marginLeft: 6 }}>{apt.provider}</span>}
                            </div>
                            {isMine && (
                              <button onClick={(e) => { e.stopPropagation(); onCancel(apt.id); }} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                            )}
                          </div>
                        ) : isBooking ? (
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                            <select value={bookingType} onChange={e => setBookingType(e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", color: "#1e293b", background: "#fff" }}>
                              {APPT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <button onClick={() => { onBook(selectedDate, slot, bookingType); setBookingSlot(null); }} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Confirm</button>
                            <button onClick={() => setBookingSlot(null)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setBookingSlot(slot)} style={{ flex: 1, padding: "6px 10px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#3b82f6", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                            Available — Book
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 32, textAlign: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ margin: "0 auto 12px" }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>Select a date</p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Click a weekday to view available time slots</p>
            </div>
          )}

          {/* My Upcoming Appointments */}
          {(() => {
            const myApts = appointments.filter(a => a.patientId === selectedPatientId).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            if (myApts.length === 0) return null;
            return (
              <div style={{ marginTop: 16, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", margin: 0 }}>Your Upcoming Appointments</p>
                </div>
                <div style={{ padding: 8 }}>
                  {myApts.map(apt => (
                    <div key={apt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", marginBottom: 4 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#1d4ed8", margin: 0 }}>{new Date(apt.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {formatTime12(apt.time)}</p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{apt.type} — {apt.provider}</p>
                      </div>
                      <button onClick={() => onCancel(apt.id)} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

/* ─── Visit Notes View Component ─── */
const VisitNotesView = ({ visitNotes }: { visitNotes: typeof DEMO_VISIT_NOTES }) => {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  return (
    <div style={{ padding: "24px 32px", animation: "fadeIn 0.3s ease", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", margin: 0 }}>Visit Notes</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Dr. submitted notes from previous appointments with Gord Sims</p>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "#ecfdf5", border: "1px solid #d1fae5", borderRadius: 10, padding: "8px 16px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Visits</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>{visitNotes.length}</div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 16px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Date Range</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 2 }}>Feb 2024 — Jan 2026</div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 16px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Providers</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginTop: 2 }}>Dr. Patel, Dr. Kim</div>
        </div>
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "8px 16px" }}>
          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Urgent Visits</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ea580c" }}>{visitNotes.filter(n => n.type.includes("Urgent") || n.type.includes("Acute")).length}</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        {/* Timeline line */}
        <div style={{ position: "absolute", left: 7, top: 10, bottom: 10, width: 2, background: "#e2e8f0", borderRadius: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...visitNotes].reverse().map((note) => {
            const isExpanded = expandedNote === note.id;
            const dateObj = new Date(note.date + "T12:00:00");
            const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" });
            const dayStr = dateObj.getDate();
            const yearStr = dateObj.getFullYear();
            const isUrgent = note.type.includes("Urgent") || note.type.includes("Acute");

            return (
              <div key={note.id} style={{ position: "relative", paddingLeft: 28 }}>
                {/* Timeline dot */}
                <div style={{
                  position: "absolute", left: 0, top: 14,
                  width: 16, height: 16, borderRadius: "50%",
                  border: `2px solid ${isUrgent ? "#f97316" : "#10b981"}`,
                  background: isUrgent ? "#fff7ed" : "#ecfdf5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: isUrgent ? "#f97316" : "#10b981" }} />
                </div>

                {/* Card */}
                <div
                  onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                  style={{
                    borderRadius: 12,
                    border: isExpanded ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                    background: isExpanded ? "#fafbff" : "#ffffff",
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: isExpanded ? "0 2px 12px rgba(59,130,246,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                        background: isUrgent ? "#fff7ed" : "#f1f5f9",
                        color: isUrgent ? "#ea580c" : "#1e293b",
                        border: `1px solid ${isUrgent ? "#fed7aa" : "#e2e8f0"}`,
                      }}>{note.type}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{note.provider}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{monthStr} {dayStr}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{yearStr}</div>
                    </div>
                  </div>

                  {/* Chief complaint */}
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 8px" }}>{note.chief}</p>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {note.tags.map((tag) => {
                      const ts = getTagStyle(tag);
                      return (
                        <span key={tag} style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 999,
                          background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                        }}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e5e7eb", animation: "fadeIn 0.2s ease" }}>
                      {/* Doctor's note */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Doctor&apos;s Note</div>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0 }}>{note.summary}</p>
                      </div>

                      {/* Actions taken */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Actions & Orders</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {note.actions.map((action, ai) => (
                            <div key={ai} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", marginTop: 6, flexShrink: 0 }} />
                              <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.5 }}>{action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


/* ─── Personal Info View Component ─── */
const PersonalInfoView = ({ patientInfo }: { patientInfo: typeof DEMO_PATIENT_INFO }) => {
  const sectionStyle = (accent: string): React.CSSProperties => ({
    background: "#ffffff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    marginBottom: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    borderLeft: `4px solid ${accent}`,
  });

  const headerStyle: React.CSSProperties = {
    padding: "14px 20px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const rowStyle = (isLast: boolean): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    padding: "10px 20px",
    borderBottom: isLast ? "none" : "1px solid #f8fafc",
    alignItems: "center",
  });

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#9ca3af", fontWeight: 500 };
  const valueStyle: React.CSSProperties = { fontSize: 13, color: "#1e293b", fontWeight: 500 };

  const entries = Object.entries;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, animation: "fadeIn 0.3s ease" }}>
      {/* ── Row: Personal & Demographics + Insurance ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ ...sectionStyle("#3b82f6"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Personal & Demographic Information</h3>
          </div>
          <div>
            {entries(patientInfo.personal).map(([k, v], i, arr) => (
              <div key={k} style={rowStyle(i === arr.length - 1)}>
                <span style={labelStyle}>{k}</span>
                <span style={valueStyle}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...sectionStyle("#8b5cf6"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Insurance & Billing Details</h3>
          </div>
          <div>
            {entries(patientInfo.insurance).map(([k, v], i, arr) => (
              <div key={k} style={rowStyle(i === arr.length - 1)}>
                <span style={labelStyle}>{k}</span>
                <span style={valueStyle}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: Medical History + Mental Health ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start", marginBottom: 20 }}>
        <div style={{ ...sectionStyle("#f59e0b"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Medical History</h3>
          </div>
          <div style={{ padding: "14px 20px" }}>
            {/* Past diagnoses */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Past Diagnoses</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {patientInfo.medicalHistory.pastDiagnoses.map(d => (
                  <div key={d.condition} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{d.condition}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: d.status === "Resolved" ? "#ecfdf5" : "#fffbeb", color: d.status === "Resolved" ? "#059669" : "#d97706", border: `1px solid ${d.status === "Resolved" ? "#a7f3d0" : "#fde68a"}` }}>{d.status}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{d.year}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Surgeries */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Surgeries</p>
              {patientInfo.medicalHistory.surgeries.map(s => (
                <p key={s.procedure} style={{ fontSize: 13, color: "#1e293b", margin: 0 }}>{s.procedure} <span style={{ color: "#9ca3af" }}>({s.year}) — {s.notes}</span></p>
              ))}
            </div>
            {/* Hospitalizations */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Hospitalizations</p>
              {patientInfo.medicalHistory.hospitalizations.map(h => (
                <p key={h.reason} style={{ fontSize: 13, color: "#1e293b", margin: 0 }}>{h.reason} <span style={{ color: "#9ca3af" }}>— {h.date}, {h.facility}</span></p>
              ))}
            </div>
            {/* Chronic conditions */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Chronic Conditions</p>
              {patientInfo.medicalHistory.chronic.map(c => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#1e293b" }}>{c}</span>
                </div>
              ))}
            </div>
            {/* Family history */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Family Medical History</p>
              {patientInfo.medicalHistory.familyHistory.map(f => (
                <div key={f.relation} style={{ display: "grid", gridTemplateColumns: "80px 1fr", padding: "4px 0" }}>
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{f.relation}</span>
                  <span style={{ fontSize: 13, color: "#1e293b" }}>{f.conditions}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...sectionStyle("#6366f1"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Mental Health Screening</h3>
          </div>
          <div style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
              {/* PHQ-9 */}
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>PHQ-9 (Depression)</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>{patientInfo.mentalHealth.phq9.score}</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#e2e8f0" }}>
                  <div style={{ width: `${(patientInfo.mentalHealth.phq9.score / 27) * 100}%`, height: "100%", borderRadius: 2, background: "#10b981" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>{patientInfo.mentalHealth.phq9.label}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{patientInfo.mentalHealth.phq9.date}</span>
                </div>
              </div>
              {/* GAD-7 */}
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>GAD-7 (Anxiety)</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>{patientInfo.mentalHealth.gad7.score}</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#e2e8f0" }}>
                  <div style={{ width: `${(patientInfo.mentalHealth.gad7.score / 21) * 100}%`, height: "100%", borderRadius: 2, background: "#10b981" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>{patientInfo.mentalHealth.gad7.label}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{patientInfo.mentalHealth.gad7.date}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "6px 0" }}>
              <span style={labelStyle}>Sleep</span><span style={valueStyle}>{patientInfo.mentalHealth.sleep}</span>
              <span style={labelStyle}>Stress Level</span><span style={valueStyle}>{patientInfo.mentalHealth.stress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Medications ── */}
      <div style={sectionStyle("#7c3aed")}>
        <div style={headerStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Medication List</h3>
        </div>
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 1fr 80px", padding: "8px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Medication</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Dose</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Freq</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Purpose</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Type</span>
          </div>
          {patientInfo.medications.map(med => (
            <div key={med.name} style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 1fr 80px", padding: "10px 20px", borderBottom: "1px solid #fafbfc", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{med.name}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{med.dose}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{med.freq}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{med.purpose}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, textAlign: "center", background: med.type === "Rx" ? "#eff6ff" : med.type === "OTC" ? "#f8fafc" : "#ecfdf5", color: med.type === "Rx" ? "#2563eb" : med.type === "OTC" ? "#64748b" : "#059669", border: `1px solid ${med.type === "Rx" ? "#bfdbfe" : med.type === "OTC" ? "#e2e8f0" : "#a7f3d0"}` }}>{med.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row: Allergies + Social History ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ ...sectionStyle("#ef4444"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Allergies</h3>
          </div>
          <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {patientInfo.allergies.map(a => (
              <div key={a.allergen} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: a.severity === "Severe" ? "#fef2f2" : "#fffbeb", border: `1px solid ${a.severity === "Severe" ? "#fecaca" : "#fde68a"}` }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{a.allergen}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>({a.type})</span>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{a.reaction}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: a.severity === "Severe" ? "#dc2626" : "#f59e0b", color: "#fff" }}>{a.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...sectionStyle("#10b981"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Social History</h3>
          </div>
          <div>
            {entries(patientInfo.social).map(([k, v], i, arr) => (
              <div key={k} style={rowStyle(i === arr.length - 1)}>
                <span style={labelStyle}>{k}</span>
                <span style={valueStyle}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: Reason for Visit + Payment ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start", marginBottom: 20 }}>
        <div style={{ ...sectionStyle("#0ea5e9"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Reason for Visit / Symptoms</h3>
          </div>
          <div>
            {entries(patientInfo.reasonForVisit).map(([k, v], i, arr) => (
              <div key={k} style={rowStyle(i === arr.length - 1)}>
                <span style={labelStyle}>{k}</span>
                <span style={valueStyle}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...sectionStyle("#f97316"), marginBottom: 0 }}>
          <div style={headerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Payment Information</h3>
          </div>
          <div>
            {entries(patientInfo.payment).map(([k, v], i, arr) => (
              <div key={k} style={rowStyle(i === arr.length - 1)}>
                <span style={labelStyle}>{k}</span>
                <span style={valueStyle}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 9. Consent & Legal ── */}
      <div style={sectionStyle("#059669")}>
        <div style={headerStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", margin: 0 }}>Consent & Legal Forms</h3>
        </div>
        <div style={{ padding: "10px 20px" }}>
          {patientInfo.consent.map((c, i) => (
            <div key={c.form} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i === patientInfo.consent.length - 1 ? "none" : "1px solid #f8fafc" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "#059669" }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, flex: 1 }}>{c.form}</span>
              <span style={{ fontSize: 11, color: "#059669", fontWeight: 500 }}>{c.status}</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{c.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Staff View Component ─── */
const StaffView = () => {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (name: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos(prev => ({ ...prev, [name]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleClick = (name: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPhotos(prev => ({ ...prev, [name]: reader.result as string }));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const sections = [
    { title: "Physicians", data: STAFF.doctors, accent: "#3b82f6", accentBg: "#eff6ff", accentBorder: "#bfdbfe" },
    { title: "Nursing Staff", data: STAFF.nurses, accent: "#10b981", accentBg: "#ecfdf5", accentBorder: "#a7f3d0" },
    { title: "Reception", data: STAFF.receptionists, accent: "#8b5cf6", accentBg: "#f5f3ff", accentBorder: "#ddd6fe" },
  ];

  return (
    <div style={{ padding: "24px 32px", animation: "fadeIn 0.3s ease", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1e293b", margin: 0 }}>Staff Directory</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Northwest Valley — 1716 2nd Street NW, Albuquerque, NM 87101</p>
      </div>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 32 }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: section.accent }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", margin: 0 }}>{section.title}</h3>
            <span style={{ fontSize: 12, color: "#9ca3af", background: "#f1f5f9", padding: "2px 10px", borderRadius: 999 }}>{section.data.length}</span>
          </div>

          {/* Cards grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}>
            {section.data.map((person) => {
              const hasPhoto = !!photos[person.name];
              const isDragTarget = dragOver === person.name;

              return (
                <div
                  key={person.name}
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Photo area — drag & drop or click */}
                  <div
                    onClick={() => handleClick(person.name)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(person.name); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDrop(person.name, e)}
                    style={{
                      width: "100%",
                      height: 180,
                      background: hasPhoto ? `url(${photos[person.name]}) center/cover no-repeat` : `linear-gradient(135deg, ${section.accentBg}, #f8fafc)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 6,
                      borderBottom: `1px solid ${section.accentBorder}`,
                      position: "relative",
                      cursor: "pointer",
                      outline: isDragTarget ? `2px dashed ${section.accent}` : "none",
                      outlineOffset: -2,
                      transition: "outline 0.15s",
                    }}
                  >
                    {!hasPhoto && (
                      <>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={section.accentBorder} strokeWidth="1.2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>Drop image or click</span>
                      </>
                    )}
                    {/* Specialty badge */}
                    <div style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: hasPhoto ? "rgba(0,0,0,0.55)" : section.accent,
                      color: "#ffffff",
                      backdropFilter: hasPhoto ? "blur(4px)" : "none",
                    }}>
                      {person.specialty}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: "14px 16px" }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>{person.name}</h4>
                    <p style={{ fontSize: 11, color: section.accent, fontWeight: 600, margin: "2px 0 8px", letterSpacing: 0.2 }}>{person.title}</p>
                    <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{person.bio}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── TOOL 1: Drug Interaction Checker ─── */
const DrugInteractionChecker = ({ medications, allergies, patientId, onToolResult }: {
  medications: typeof DEMO_PATIENT_INFO.medications;
  allergies: typeof DEMO_PATIENT_INFO.allergies;
  patientId: string;
  onToolResult: (entry: string) => void;
}) => {
  const [medChecklist, setMedChecklist] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    medications.forEach(m => { init[m.name] = true; });
    return init;
  });
  const [customMed, setCustomMed] = useState("");
  const [customMeds, setCustomMeds] = useState<string[]>([]);
  const [results, setResults] = useState("");
  const [checking, setChecking] = useState(false);

  const selectedCount = Object.values(medChecklist).filter(Boolean).length;

  const toggleMed = (name: string) => {
    setMedChecklist(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const addCustomMed = () => {
    const trimmed = customMed.trim();
    if (!trimmed || customMeds.includes(trimmed)) return;
    setCustomMeds(prev => [...prev, trimmed]);
    setMedChecklist(prev => ({ ...prev, [trimmed]: true }));
    setCustomMed("");
  };

  const removeCustomMed = (name: string) => {
    setCustomMeds(prev => prev.filter(n => n !== name));
    setMedChecklist(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const checkInteractions = async () => {
    const selected = Object.entries(medChecklist).filter(([, v]) => v).map(([k]) => k);
    if (selected.length < 2) return;
    setChecking(true);
    setResults("");
    try {
      const prompt = `Analyze potential drug interactions between these medications: ${selected.join(", ")}.\n\nPatient allergies: ${allergies.map(a => `${a.allergen} (${a.reaction})`).join(", ")}.\n\nFor each interaction pair found:\n1. List the two drugs\n2. Severity (High/Moderate/Low)\n3. Mechanism of interaction\n4. Clinical recommendation\n\nAlso flag any allergy cross-reactivity concerns. Be thorough but concise.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], patientId }),
      });
      if (!res.ok) throw new Error("API error");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setResults(fullText);
        }
      }
      // Log tool result for AI synthesis
      onToolResult(`[Drug Interaction Check] Analyzed: ${selected.join(", ")}. Summary: ${fullText.slice(0, 300)}...`);
    } catch {
      setResults("Unable to check interactions. Please verify your API key is configured.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, height: "calc(100vh - 72px)", overflow: "hidden" }}>
      {/* Left Panel — Medication Selection */}
      <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
        <div className="tool-panel" style={{ flex: 1 }}>
          <div className="tool-panel-header">
            <h3>Medication Selection</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Selected: {selectedCount}</span>
          </div>
          <div className="tool-panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="tool-label">Current Medications</label>
            {medications.map(med => (
              <div
                key={med.name}
                className={`tool-checkbox ${medChecklist[med.name] ? "checked" : ""}`}
                onClick={() => toggleMed(med.name)}
              >
                <div className="tool-checkbox-box">
                  {medChecklist[med.name] && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{med.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{med.dose} — {med.freq} — {med.purpose}</div>
                </div>
              </div>
            ))}

            {customMeds.length > 0 && (
              <>
                <label className="tool-label" style={{ marginTop: 8 }}>Custom Medications</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {customMeds.map(name => (
                    <div key={name} className="med-pill">
                      <div
                        className={`tool-checkbox-box`}
                        style={{ width: 16, height: 16, borderRadius: 4, cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); toggleMed(name); }}
                      >
                        {medChecklist[name] && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={medChecklist[name] ? "#fff" : "transparent"} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <span style={{ background: medChecklist[name] ? "var(--accent)" : "transparent" }} />
                      {name}
                      <button onClick={() => removeCustomMed(name)} title="Remove">&times;</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <label className="tool-label" style={{ marginTop: 8 }}>Add Medication</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="tool-input"
                placeholder="e.g. Warfarin, Metoprolol..."
                value={customMed}
                onChange={e => setCustomMed(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomMed()}
              />
              <button className="tool-btn-primary" onClick={addCustomMed} style={{ whiteSpace: "nowrap", padding: "10px 16px" }}>Add</button>
            </div>

            <button
              className="tool-btn-primary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={checkInteractions}
              disabled={checking || selectedCount < 2}
            >
              {checking ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Analyzing...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Check Interactions</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Results */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div className="tool-panel" style={{ minHeight: "100%" }}>
          <div className="tool-panel-header">
            <h3>Interaction Analysis</h3>
          </div>
          <div className="tool-panel-body">
            {!results && !checking ? (
              <div className="tool-empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 4.94a2.25 2.25 0 01-2.015 1.244H9.485a2.25 2.25 0 01-2.014-1.244L5 14.5m14 0H5"/></svg>
                <p>Select medications and click <strong>Check Interactions</strong> to analyze potential drug-drug interactions using AI.</p>
              </div>
            ) : checking && !results ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 48 }}>
                <TypingIndicator />
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Analyzing {selectedCount} medications for interactions...</p>
              </div>
            ) : (
              <div style={{ lineHeight: 1.6 }}>
                {renderAIText(results)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── TOOL 2: E-Prescribe Pad ─── */
const EPrescribePad = ({ allergies, currentProvider, patientName, onToolResult }: {
  allergies: typeof DEMO_PATIENT_INFO.allergies;
  currentProvider: { name: string; specialty: string };
  patientName: string;
  onToolResult: (entry: string) => void;
}) => {
  const [drugSearch, setDrugSearch] = useState("");
  const [selectedDrug, setSelectedDrug] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("QD");
  const [route, setRoute] = useState("PO");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [queue, setQueue] = useState<PrescriptionItem[]>([]);
  const [toast, setToast] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredMeds = COMMON_MEDICATIONS.filter(m =>
    m.name.toLowerCase().includes(drugSearch.toLowerCase()) && drugSearch.length > 0
  );

  const allergyWarning = useMemo(() => {
    if (!selectedDrug) return null;
    // Direct match
    const directMatch = allergies.find(a => a.type === "Drug" && selectedDrug.toLowerCase().includes(a.allergen.toLowerCase()));
    if (directMatch) return { ...directMatch, matchType: "direct" as const };
    // Penicillin class cross-reference
    const isPenicillinAllergy = allergies.some(a => a.allergen.toLowerCase() === "penicillin");
    if (isPenicillinAllergy && PENICILLIN_CLASS_DRUGS.some(d => d.toLowerCase() === selectedDrug.toLowerCase())) {
      return { allergen: "Penicillin", type: "Drug", reaction: "Rash, hives", severity: "Moderate", matchType: "cross-reactivity" as const };
    }
    return null;
  }, [selectedDrug, allergies]);

  const selectDrug = (name: string) => {
    setSelectedDrug(name);
    setDrugSearch(name);
    setShowSuggestions(false);
    const doses = COMMON_DOSES[name];
    if (doses && doses.length > 0) setDose(doses[0]);
    // Check for allergy and log
    const isPenAllergy = allergies.some(a => a.allergen.toLowerCase() === "penicillin");
    const isPenDrug = PENICILLIN_CLASS_DRUGS.some(d => d.toLowerCase() === name.toLowerCase());
    const directAllergy = allergies.find(a => a.type === "Drug" && name.toLowerCase().includes(a.allergen.toLowerCase()));
    if (directAllergy || (isPenAllergy && isPenDrug)) {
      onToolResult(`[E-Prescribe Allergy Alert] Drug "${name}" triggered allergy warning — patient has documented ${directAllergy?.allergen || "Penicillin"} allergy (${directAllergy?.reaction || "Rash, hives"}).`);
    }
  };

  const addToQueue = () => {
    if (!selectedDrug || !dose) return;
    const item: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      drug: selectedDrug,
      dose,
      frequency,
      route,
      duration: duration || "As directed",
      instructions: instructions || "Take as directed",
      addedAt: Date.now(),
    };
    setQueue(prev => [...prev, item]);
    setSelectedDrug("");
    setDrugSearch("");
    setDose("");
    setDuration("");
    setInstructions("");
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const signAndSend = () => {
    if (queue.length === 0) return;
    const rxSummary = queue.map(q => `${q.drug} ${q.dose} ${q.frequency} ${q.route}`).join("; ");
    onToolResult(`[E-Prescribe] Prescribed for ${patientName}: ${rxSummary}. Signed by Dr. ${currentProvider.name}.`);
    setQueue([]);
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, height: "calc(100vh - 72px)", overflow: "hidden" }}>
      {toast && (
        <div className="toast-success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Prescriptions signed and sent for {patientName}
        </div>
      )}

      {/* Left Panel — Prescription Form */}
      <div style={{ width: 400, flexShrink: 0, overflow: "auto" }}>
        <div className="tool-panel">
          <div className="tool-panel-header">
            <h3>New Prescription</h3>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Dr. {currentProvider.name}</span>
          </div>
          <div className="tool-panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Drug Search */}
            <div>
              <label className="tool-label">Medication</label>
              <div ref={searchRef} style={{ position: "relative" }}>
                <input
                  className="tool-input"
                  placeholder="Search medications..."
                  value={drugSearch}
                  onChange={e => { setDrugSearch(e.target.value); setShowSuggestions(true); setSelectedDrug(""); }}
                  onFocus={() => drugSearch.length > 0 && setShowSuggestions(true)}
                />
                {showSuggestions && filteredMeds.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {filteredMeds.map(med => (
                      <div key={med.name} className="autocomplete-item" onClick={() => selectDrug(med.name)}>
                        <span className="autocomplete-item-name">{med.name}</span>
                        <span className="autocomplete-item-category">{med.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Allergy Warning */}
            {allergyWarning && (
              <div className="allergy-warning">
                <div className="allergy-warning-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="allergy-warning-text">
                  <div className="allergy-warning-title">
                    Allergy Alert: {allergyWarning.allergen} {allergyWarning.matchType === "cross-reactivity" ? "(Cross-Reactivity)" : ""}
                    <SeverityBadge level={allergyWarning.severity.toLowerCase() === "severe" ? "high" : "moderate"} />
                  </div>
                  <div className="allergy-warning-detail">Reaction: {allergyWarning.reaction}. Patient has documented {allergyWarning.allergen} allergy.</div>
                </div>
              </div>
            )}

            {/* Dose */}
            <div>
              <label className="tool-label">Dose</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="tool-input"
                  placeholder="e.g. 500mg"
                  value={dose}
                  onChange={e => setDose(e.target.value)}
                  style={{ flex: 1 }}
                />
                {selectedDrug && COMMON_DOSES[selectedDrug] && (
                  <select className="tool-select" style={{ width: "auto", minWidth: 100 }} value={dose} onChange={e => setDose(e.target.value)}>
                    {COMMON_DOSES[selectedDrug].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Frequency + Route */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Frequency</label>
                <select className="tool-select" value={frequency} onChange={e => setFrequency(e.target.value)}>
                  {RX_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Route</label>
                <select className="tool-select" value={route} onChange={e => setRoute(e.target.value)}>
                  {RX_ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="tool-label">Duration</label>
              <input
                className="tool-input"
                placeholder="e.g. 7 days, 30 days, ongoing"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="tool-label">Instructions</label>
              <textarea
                className="tool-textarea"
                placeholder="e.g. Take with food, avoid alcohol..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>

            {/* Add to Queue */}
            <button
              className="tool-btn-primary"
              style={{ width: "100%" }}
              onClick={addToQueue}
              disabled={!selectedDrug || !dose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add to Queue
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Prescription Queue */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div className="tool-panel" style={{ minHeight: "100%" }}>
          <div className="tool-panel-header">
            <h3>Prescription Queue ({queue.length})</h3>
            {queue.length > 0 && (
              <button className="tool-btn-success" onClick={signAndSend}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Sign &amp; Send All
              </button>
            )}
          </div>
          <div className="tool-panel-body">
            {queue.length === 0 ? (
              <div className="tool-empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                <p>No prescriptions in queue. Use the form to add medications.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {queue.map(item => (
                  <div key={item.id} className="rx-queue-item">
                    <div className="rx-queue-item-header">
                      <span className="rx-queue-item-drug">{item.drug}</span>
                      <button className="tool-btn-danger" onClick={() => removeFromQueue(item.id)}>Remove</button>
                    </div>
                    <div className="rx-queue-item-details">
                      {item.dose} &bull; {RX_FREQUENCIES.find(f => f.value === item.frequency)?.label || item.frequency} &bull; {RX_ROUTES.find(r => r.value === item.route)?.label || item.route}<br/>
                      Duration: {item.duration} &bull; {item.instructions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── TOOL 3: ASCVD Risk Calculator ─── */
const ASCVDRiskCalculator = ({ patientInfo, setChatOpen, setChatInput, onToolResult }: {
  patientInfo: typeof DEMO_PATIENT_INFO;
  setChatOpen: (v: boolean) => void;
  setChatInput: (v: string) => void;
  onToolResult: (entry: string) => void;
}) => {
  // Auto-populate from patient data (BP from last known vitals: 132/83 for Gord Sims)
  const onBPMeds = patientInfo.medications?.some(m => m.name.toLowerCase().includes("lisinopril") || m.name.toLowerCase().includes("losartan") || m.purpose?.toLowerCase().includes("hypertension")) ?? false;
  const isSmoker = patientInfo.social?.["Smoking / Tobacco"]?.toLowerCase().includes("former") || patientInfo.social?.["Smoking / Tobacco"]?.toLowerCase().includes("current") || false;

  const [age, setAge] = useState(59);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [totalChol, setTotalChol] = useState(210);
  const [hdl, setHdl] = useState(45);
  const [sbp, setSbp] = useState(132);
  const [dbp, setDbp] = useState(83);
  const [bpTreatment, setBpTreatment] = useState(onBPMeds);
  const [smoker, setSmoker] = useState(isSmoker);
  const [diabetes, setDiabetes] = useState(false);
  const [riskResult, setRiskResult] = useState<{ risk: number; category: string; color: string } | null>(null);

  const [calcError, setCalcError] = useState("");

  const calculateRisk = () => {
    setCalcError("");
    // Input validation
    if (age < 40 || age > 79) { setCalcError("Age must be between 40 and 79."); return; }
    if (totalChol <= 0 || hdl <= 0 || sbp <= 0) { setCalcError("Cholesterol, HDL, and blood pressure must be positive values."); return; }
    if (hdl >= totalChol) { setCalcError("HDL cannot be greater than total cholesterol."); return; }

    // Pooled Cohort Equations (2013 ACC/AHA) — white race coefficients
    const lnAge = Math.log(age);
    const lnChol = Math.log(totalChol);
    const lnHDL = Math.log(hdl);
    const lnSBP = Math.log(sbp);
    const smokerVal = smoker ? 1 : 0;
    const diabetesVal = diabetes ? 1 : 0;

    let sumCoeff: number;
    let meanCoeff: number;
    let baselineSurvival: number;

    if (sex === "male") {
      const lnSBPCoeff = bpTreatment ? 1.99881 : 1.93303;
      sumCoeff = 12.344 * lnAge + 11.853 * lnChol + -2.664 * (lnAge * lnChol) +
        -7.990 * lnHDL + 1.769 * (lnAge * lnHDL) +
        lnSBPCoeff * lnSBP +
        7.837 * smokerVal + -1.795 * (lnAge * smokerVal) +
        0.658 * diabetesVal;
      meanCoeff = 61.18;
      baselineSurvival = 0.9144;
    } else {
      const lnSBPCoeff = bpTreatment ? 29.2907 : 27.8197;
      sumCoeff = -29.799 * lnAge + 13.540 * (lnAge * lnAge) + 13.540 * lnChol +
        -13.578 * (lnAge * lnChol) + -13.578 * lnHDL + 1.957 * (lnAge * lnHDL) +
        lnSBPCoeff * lnSBP + -6.4321 * (lnAge * lnSBP) +
        7.574 * smokerVal + -1.665 * (lnAge * smokerVal) +
        0.661 * diabetesVal;
      meanCoeff = -29.18;
      baselineSurvival = 0.9665;
    }

    const rawRisk = (1 - Math.pow(baselineSurvival, Math.exp(sumCoeff - meanCoeff))) * 100;
    if (!isFinite(rawRisk) || isNaN(rawRisk)) { setCalcError("Calculation error — please check input values."); return; }
    const risk = Math.round(rawRisk * 10) / 10;
    const clampedRisk = Math.max(0, Math.min(risk, 100));

    let category: string;
    let color: string;
    if (clampedRisk < 5) { category = "Low"; color = "#10b981"; }
    else if (clampedRisk < 7.5) { category = "Borderline"; color = "#f59e0b"; }
    else if (clampedRisk < 20) { category = "Intermediate"; color = "#f97316"; }
    else { category = "High"; color = "#ef4444"; }

    setRiskResult({ risk: clampedRisk, category, color });
    onToolResult(`[ASCVD Calculator] 10-Year Risk: ${clampedRisk}% (${category}). Age ${age}, ${sex}, TC ${totalChol}, HDL ${hdl}, SBP ${sbp}/${dbp}, ${bpTreatment ? "on BP meds" : "no BP meds"}, ${smoker ? "smoker" : "non-smoker"}, ${diabetes ? "diabetic" : "non-diabetic"}.`);
  };

  const discussWithAI = () => {
    if (!riskResult) return;
    const prompt = `Patient ASCVD 10-Year Risk: ${riskResult.risk}% (${riskResult.category} Risk)\n\nRisk factors: Age ${age}, ${sex}, TC ${totalChol}, HDL ${hdl}, SBP ${sbp}/${dbp}, ${bpTreatment ? "on BP meds" : "no BP meds"}, ${smoker ? "smoker" : "non-smoker"}, ${diabetes ? "diabetic" : "non-diabetic"}.\n\nPlease provide clinical recommendations for reducing cardiovascular risk.`;
    setChatInput(prompt);
    setChatOpen(true);
  };

  // SVG gauge parameters
  const gaugeRadius = 90;
  const gaugeStroke = 14;
  const gaugeCirc = Math.PI * gaugeRadius; // half-circle
  const gaugeDash = riskResult ? (riskResult.risk / 100) * gaugeCirc : 0;

  const modifiableFactors = riskResult ? [
    { name: "Total Cholesterol", current: `${totalChol} mg/dL`, target: "<200 mg/dL", rec: "Consider statin therapy (e.g., Atorvastatin 20mg)", icon: "bg-amber", color: "#f59e0b", show: totalChol >= 200 },
    { name: "Blood Pressure", current: `${sbp}/${dbp} mmHg`, target: "<130/80 mmHg", rec: bpTreatment ? "Consider Lisinopril dose increase or add second agent" : "Initiate antihypertensive therapy", icon: "bg-red", color: "#ef4444", show: sbp >= 130 || dbp >= 80 },
    { name: "Smoking Status", current: smoker ? "Active/Former smoker" : "Non-smoker", target: "Non-smoker", rec: "Smoking cessation counseling, consider NRT or Varenicline", icon: "bg-orange", color: "#f97316", show: smoker },
    { name: "HDL Cholesterol", current: `${hdl} mg/dL`, target: ">60 mg/dL", rec: "Increase physical activity, dietary modifications", icon: "bg-blue", color: "#3b82f6", show: hdl < 60 },
    { name: "Diabetes", current: diabetes ? "Yes" : "No", target: "HbA1c <7%", rec: "Tight glycemic control, lifestyle modifications", icon: "bg-purple", color: "#8b5cf6", show: diabetes },
  ].filter(f => f.show) : [];

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, height: "calc(100vh - 72px)", overflow: "hidden" }}>
      {/* Left Panel — Risk Factor Inputs */}
      <div style={{ width: 380, flexShrink: 0, overflow: "auto" }}>
        <div className="tool-panel">
          <div className="tool-panel-header">
            <h3>Risk Factors</h3>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ACC/AHA 2013</span>
          </div>
          <div className="tool-panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Age */}
            <div>
              <label className="tool-label">Age (40-79)</label>
              <input className="tool-input" type="number" min={40} max={79} value={age} onChange={e => setAge(Number(e.target.value))} />
            </div>

            {/* Sex */}
            <div>
              <label className="tool-label">Sex</label>
              <div className="sex-toggle">
                <button className={sex === "male" ? "active" : ""} onClick={() => setSex("male")}>Male</button>
                <button className={sex === "female" ? "active" : ""} onClick={() => setSex("female")}>Female</button>
              </div>
            </div>

            {/* Cholesterol row */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Total Cholesterol</label>
                <input className="tool-input" type="number" value={totalChol} onChange={e => setTotalChol(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="tool-label">HDL</label>
                <input className="tool-input" type="number" value={hdl} onChange={e => setHdl(Number(e.target.value))} />
              </div>
            </div>

            {/* BP row */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Systolic BP</label>
                <input className="tool-input" type="number" value={sbp} onChange={e => setSbp(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="tool-label">Diastolic BP</label>
                <input className="tool-input" type="number" value={dbp} onChange={e => setDbp(Number(e.target.value))} />
              </div>
            </div>

            {/* Checkboxes */}
            <div
              className={`tool-checkbox ${bpTreatment ? "checked" : ""}`}
              onClick={() => setBpTreatment(!bpTreatment)}
            >
              <div className="tool-checkbox-box">
                {bpTreatment && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>On Blood Pressure Treatment</span>
            </div>

            <div
              className={`tool-checkbox ${smoker ? "checked" : ""}`}
              onClick={() => setSmoker(!smoker)}
            >
              <div className="tool-checkbox-box">
                {smoker && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Current or Former Smoker</span>
            </div>

            <div
              className={`tool-checkbox ${diabetes ? "checked" : ""}`}
              onClick={() => setDiabetes(!diabetes)}
            >
              <div className="tool-checkbox-box">
                {diabetes && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Diabetes</span>
            </div>

            {/* Calculate */}
            {calcError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#dc2626", fontWeight: 500 }}>{calcError}</div>
            )}
            <button className="tool-btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={calculateRisk}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Calculate 10-Year Risk
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Results */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {!riskResult ? (
          <div className="tool-panel" style={{ minHeight: "100%" }}>
            <div className="tool-panel-header"><h3>Risk Assessment</h3></div>
            <div className="tool-panel-body">
              <div className="tool-empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <p>Enter risk factors and click <strong>Calculate 10-Year Risk</strong> to estimate ASCVD risk using the Pooled Cohort Equations.</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Gauge Card */}
            <div className="tool-panel">
              <div className="tool-panel-body">
                <div className="ascvd-gauge-container">
                  <svg width="220" height="130" viewBox="0 0 220 130">
                    {/* Background arc */}
                    <path
                      d={`M 20 120 A ${gaugeRadius} ${gaugeRadius} 0 0 1 200 120`}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth={gaugeStroke}
                      strokeLinecap="round"
                    />
                    {/* Colored arc */}
                    <path
                      d={`M 20 120 A ${gaugeRadius} ${gaugeRadius} 0 0 1 200 120`}
                      fill="none"
                      stroke={riskResult.color}
                      strokeWidth={gaugeStroke}
                      strokeLinecap="round"
                      strokeDasharray={`${gaugeDash} ${gaugeCirc}`}
                      style={{ transition: "stroke-dasharray 0.8s ease" }}
                    />
                  </svg>
                  <div className="ascvd-gauge-value" style={{ color: riskResult.color }}>{riskResult.risk}%</div>
                  <div className="ascvd-gauge-label" style={{ color: riskResult.color }}>{riskResult.category} Risk</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>10-Year ASCVD Risk (Pooled Cohort Equations)</p>
                </div>
              </div>
            </div>

            {/* Modifiable Risk Factors */}
            {modifiableFactors.length > 0 && (
              <div className="tool-panel">
                <div className="tool-panel-header">
                  <h3>Modifiable Risk Factors</h3>
                  <SeverityBadge level={riskResult.category === "High" ? "high" : riskResult.category === "Intermediate" ? "moderate" : "low"} />
                </div>
                <div className="tool-panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {modifiableFactors.map(factor => (
                    <div key={factor.name} className="risk-factor-card">
                      <div className="risk-factor-icon" style={{ background: `${factor.color}15` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={factor.color} strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                      </div>
                      <div className="risk-factor-content">
                        <div className="risk-factor-name">{factor.name}</div>
                        <div className="risk-factor-value">{factor.current} → Target: {factor.target}</div>
                        <div className="risk-factor-rec">{factor.rec}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discuss with AI */}
            <button className="tool-btn-outline" style={{ alignSelf: "flex-start" }} onClick={discussWithAI}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Discuss with AI Assistant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── TOOL 4: Lab Trends Explorer ─── */
const LAB_COLORS: Record<string, string> = {
  K: "#ef4444", LDL: "#f59e0b", HDL: "#3b82f6",
  CRP: "#8b5cf6", Creatinine: "#14b8a6", Copper: "#f97316",
};

const LabTrendsExplorer = () => {
  const [selectedLabs, setSelectedLabs] = useState<Record<string, boolean>>({
    K: true, LDL: false, HDL: false, CRP: false, Creatinine: false, Copper: false,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const PAD = { top: 20, right: 30, bottom: 50, left: 60 };
  const W = 700, H = 360;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const dates = LAB_TRENDS.map(p => new Date(p.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const xScale = (d: string) => PAD.left + ((new Date(d).getTime() - minDate) / (maxDate - minDate)) * chartW;

  const yScaleForLab = (key: string) => {
    const vals = LAB_TRENDS.map(p => p[key as keyof LabTrendPoint] as number | null).filter((v): v is number => v !== null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    if (vals.length === 0) return { scale: (_v: number) => 0, min: 0, max: 0 };
    const range = REFERENCE_RANGES[key];
    const allVals = [...vals, range.min, range.max];
    const vMin = Math.min(...allVals) * 0.85;
    const vMax = Math.max(...allVals) * 1.15;
    return {
      scale: (v: number) => PAD.top + chartH - ((v - vMin) / (vMax - vMin)) * chartH,
      min: vMin, max: vMax,
    };
  };

  const getTrend = (key: string): { label: string; cls: string } => {
    const vals = LAB_TRENDS.map(p => p[key as keyof LabTrendPoint]).filter((v): v is number => v !== null);
    if (vals.length < 2) return { label: "N/A", cls: "stable" };
    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    const range = REFERENCE_RANGES[key];
    const outOfRange = last < range.min || last > range.max;
    if (last > prev * 1.03) return { label: outOfRange ? "Trending Up" : "Rising", cls: "up" };
    if (last < prev * 0.97) return { label: "Improving", cls: "down" };
    return { label: "Stable", cls: "stable" };
  };

  const activeKeys = Object.entries(selectedLabs).filter(([, v]) => v).map(([k]) => k);

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, height: "calc(100vh - 72px)", overflow: "hidden" }}>
      {/* Left Panel — Lab Selection */}
      <div style={{ width: 260, flexShrink: 0, overflow: "auto" }}>
        <div className="tool-panel">
          <div className="tool-panel-header"><h3>Lab Values</h3></div>
          <div className="tool-panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.keys(REFERENCE_RANGES).map(key => (
              <div
                key={key}
                className={`tool-checkbox ${selectedLabs[key] ? "checked" : ""}`}
                onClick={() => setSelectedLabs(prev => ({ ...prev, [key]: !prev[key] }))}
                style={{ borderLeft: `3px solid ${LAB_COLORS[key]}` }}
              >
                <div className="tool-checkbox-box">
                  {selectedLabs[key] && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{REFERENCE_RANGES[key].label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Range: {REFERENCE_RANGES[key].min}–{REFERENCE_RANGES[key].max} {REFERENCE_RANGES[key].unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Chart + Summary */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="tool-panel">
          <div className="tool-panel-header">
            <h3>Lab Trends</h3>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Feb 2024 – Jan 2026</span>
          </div>
          <div className="tool-panel-body" style={{ position: "relative" }}>
            {activeKeys.length === 0 ? (
              <div className="tool-empty-state">
                <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ width: 48, height: 48 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p>Select lab values from the left panel to visualize trends over time.</p>
              </div>
            ) : (
              <>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = PAD.top + pct * chartH;
                    return <line key={pct} x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,4" />;
                  })}

                  {/* Reference range bands */}
                  {activeKeys.map(key => {
                    const range = REFERENCE_RANGES[key];
                    const { scale } = yScaleForLab(key);
                    const y1 = scale(range.max);
                    const y2 = scale(range.min);
                    return <rect key={`ref-${key}`} x={PAD.left} y={Math.min(y1, y2)} width={chartW} height={Math.abs(y2 - y1)} fill={LAB_COLORS[key]} opacity={0.06} rx={4} />;
                  })}

                  {/* X-axis labels */}
                  {LAB_TRENDS.map((p, i) => (
                    <text key={i} x={xScale(p.date)} y={PAD.top + chartH + 30} textAnchor="middle" fontSize={9} fill="#94a3b8">{p.label}</text>
                  ))}

                  {/* X-axis ticks */}
                  {LAB_TRENDS.map((p, i) => (
                    <line key={`tick-${i}`} x1={xScale(p.date)} x2={xScale(p.date)} y1={PAD.top + chartH} y2={PAD.top + chartH + 6} stroke="#d1d5db" strokeWidth={1} />
                  ))}

                  {/* Data lines + dots */}
                  {activeKeys.map(key => {
                    const { scale } = yScaleForLab(key);
                    const validPoints = LAB_TRENDS
                      .filter(p => p[key as keyof LabTrendPoint] !== null)
                      .map(p => ({ x: xScale(p.date), y: scale(p[key as keyof LabTrendPoint] as number), val: p[key as keyof LabTrendPoint] as number }));
                    const points = validPoints.map(p => `${p.x},${p.y}`).join(" ");
                    const range = REFERENCE_RANGES[key];
                    return (
                      <g key={`line-${key}`}>
                        <polyline fill="none" stroke={LAB_COLORS[key]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={points} style={{ filter: `drop-shadow(0 1px 3px ${LAB_COLORS[key]}40)` }} />
                        {validPoints.map((p, j) => {
                          const inRange = p.val >= range.min && p.val <= range.max;
                          return (
                            <circle key={j} cx={p.x} cy={p.y} r={4}
                              fill={inRange ? LAB_COLORS[key] : "#fff"}
                              stroke={inRange ? LAB_COLORS[key] : "#ef4444"}
                              strokeWidth={inRange ? 0 : 2.5} />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* Hover crosshair */}
                  {hoveredIndex !== null && (
                    <line x1={xScale(LAB_TRENDS[hoveredIndex].date)} x2={xScale(LAB_TRENDS[hoveredIndex].date)} y1={PAD.top} y2={PAD.top + chartH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
                  )}

                  {/* Invisible hover rects */}
                  {LAB_TRENDS.map((p, i) => (
                    <rect key={`hover-${i}`} x={xScale(p.date) - 25} y={PAD.top} width={50} height={chartH} fill="transparent" style={{ cursor: "crosshair" }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)} />
                  ))}
                </svg>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                  <div className="chart-tooltip" style={{ left: Math.min(xScale(LAB_TRENDS[hoveredIndex].date) + 12, W - 200), top: PAD.top + 10 }}>
                    <div className="chart-tooltip-date">{LAB_TRENDS[hoveredIndex].label}</div>
                    {activeKeys.map(key => {
                      const val = LAB_TRENDS[hoveredIndex][key as keyof LabTrendPoint];
                      if (val === null) return <div key={key} className="chart-tooltip-row"><span className="chart-tooltip-label" style={{ color: LAB_COLORS[key] }}>{REFERENCE_RANGES[key].label}</span><span className="chart-tooltip-value" style={{ color: "#94a3b8" }}>—</span></div>;
                      const range = REFERENCE_RANGES[key];
                      const inRange = (val as number) >= range.min && (val as number) <= range.max;
                      return (
                        <div key={key} className="chart-tooltip-row">
                          <span className="chart-tooltip-label" style={{ color: LAB_COLORS[key] }}>{REFERENCE_RANGES[key].label}</span>
                          <span className="chart-tooltip-value" style={{ color: inRange ? "var(--text-primary)" : "#ef4444", fontWeight: inRange ? 700 : 800 }}>{val} {range.unit}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {activeKeys.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(activeKeys.length, 3)}, 1fr)`, gap: 12 }}>
            {activeKeys.map(key => {
              const vals = LAB_TRENDS.map(p => p[key as keyof LabTrendPoint]).filter((v): v is number => v !== null);
              const latest = vals.length > 0 ? vals[vals.length - 1] : null;
              const range = REFERENCE_RANGES[key];
              const inRange = latest !== null && latest >= range.min && latest <= range.max;
              const trend = getTrend(key);
              return (
                <div key={key} className="tool-panel" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: LAB_COLORS[key] }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{range.label}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: inRange ? "#10b981" : "#ef4444", marginBottom: 4 }}>
                    {latest ?? "—"} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{range.unit}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`trend-badge ${trend.cls}`}>{trend.cls === "up" ? "↗" : trend.cls === "down" ? "↘" : "→"} {trend.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Ref: {range.min}–{range.max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── TOOL 5: Vital Signs Timeline ─── */
const VitalSignsTimeline = () => {
  const [animateLines, setAnimateLines] = useState(false);
  const systolicRef = useRef<SVGPathElement>(null);
  const diastolicRef = useRef<SVGPathElement>(null);
  const [pathLengths, setPathLengths] = useState({ sys: 1000, dia: 1000 });

  useEffect(() => {
    if (systolicRef.current) setPathLengths(prev => ({ ...prev, sys: systolicRef.current!.getTotalLength() }));
    if (diastolicRef.current) setPathLengths(prev => ({ ...prev, dia: diastolicRef.current!.getTotalLength() }));
    const t = setTimeout(() => setAnimateLines(true), 100);
    return () => clearTimeout(t);
  }, []);

  const PAD = { top: 30, right: 30, bottom: 50, left: 55 };
  const W = 700, H = 280;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const bpDates = BP_READINGS.map(p => new Date(p.date).getTime());
  const minDate = Math.min(...bpDates);
  const maxDate = Math.max(...bpDates);
  const xScale = (d: string) => PAD.left + ((new Date(d).getTime() - minDate) / (maxDate - minDate)) * chartW;

  const yMin = 60, yMax = 170;
  const yScale = (v: number) => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const toBezier = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cpx} ${pts[i - 1].y}, ${cpx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  const sysPts = BP_READINGS.map(r => ({ x: xScale(r.date), y: yScale(r.systolic) }));
  const diaPts = BP_READINGS.map(r => ({ x: xScale(r.date), y: yScale(r.diastolic) }));
  const sysPath = toBezier(sysPts);
  const diaPath = toBezier(diaPts);

  const MED_COLORS: Record<string, string> = {
    "Lisinopril 10mg": "#3b82f6", "Aspirin 325mg": "#10b981", "Colchicine 0.5mg": "#f59e0b",
    "Tylenol 500mg": "#94a3b8", "Doxycycline 100mg": "#8b5cf6",
  };

  const miniVitals = [
    { key: "hr" as const, label: "Heart Rate", unit: "bpm", color: "#ef4444", latest: 78 },
    { key: "weight" as const, label: "Weight", unit: "lbs", color: "#10b981", latest: 195 },
    { key: "temp" as const, label: "Temperature", unit: "\u00B0F", color: "#f59e0b", latest: 98.6 },
    { key: "spo2" as const, label: "SpO2", unit: "%", color: "#8b5cf6", latest: 97 },
  ];

  const vitalSparkline = (key: "hr" | "weight" | "temp" | "spo2") => {
    const vals = VITAL_TRENDS.map(v => v[key]).filter((v): v is number => v !== null);
    if (vals.length < 2) return "";
    const min = Math.min(...vals) * 0.98;
    const max = Math.max(...vals) * 1.02;
    const range = max - min || 1;
    const stepX = 120 / (vals.length - 1);
    return vals.map((v, i) => `${i * stepX},${50 - ((v - min) / range) * 44}`).join(" ");
  };

  // Gantt chart
  const ganttMinDate = new Date("2024-02-01").getTime();
  const ganttMaxDate = new Date("2026-03-01").getTime();
  const ganttW = chartW;
  const ganttXScale = (d: string) => PAD.left + ((new Date(d).getTime() - ganttMinDate) / (ganttMaxDate - ganttMinDate)) * ganttW;

  return (
    <div style={{ padding: 24, height: "calc(100vh - 72px)", overflow: "auto" }}>
      {/* BP Chart */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-panel-header">
          <h3>Blood Pressure Trend</h3>
          <div style={{ display: "flex", gap: 16, fontSize: 11, fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 16, height: 2, background: "#ef4444", borderRadius: 1 }} /> Systolic</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 16, height: 2, background: "#3b82f6", borderRadius: 1 }} /> Diastolic</span>
          </div>
        </div>
        <div className="tool-panel-body">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            {/* Target zone bands */}
            <rect x={PAD.left} y={yScale(170)} width={chartW} height={yScale(140) - yScale(170)} fill="#ef4444" opacity={0.04} />
            <rect x={PAD.left} y={yScale(140)} width={chartW} height={yScale(130) - yScale(140)} fill="#f59e0b" opacity={0.06} />
            <rect x={PAD.left} y={yScale(130)} width={chartW} height={yScale(60) - yScale(130)} fill="#10b981" opacity={0.04} />
            {/* Target line at 130 */}
            <line x1={PAD.left} x2={PAD.left + chartW} y1={yScale(130)} y2={yScale(130)} stroke="#10b981" strokeWidth={1} strokeDasharray="6,4" opacity={0.5} />
            <text x={PAD.left + chartW + 4} y={yScale(130) + 3} fontSize={9} fill="#10b981" fontWeight={600}>130</text>
            {/* Target line at 80 */}
            <line x1={PAD.left} x2={PAD.left + chartW} y1={yScale(80)} y2={yScale(80)} stroke="#3b82f6" strokeWidth={1} strokeDasharray="6,4" opacity={0.3} />
            <text x={PAD.left + chartW + 4} y={yScale(80) + 3} fontSize={9} fill="#3b82f6" fontWeight={600}>80</text>

            {/* Grid */}
            {[80, 100, 120, 140, 160].map(v => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + chartW} y1={yScale(v)} y2={yScale(v)} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,4" />
                <text x={PAD.left - 8} y={yScale(v) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
              </g>
            ))}

            {/* X-axis labels */}
            {BP_READINGS.map((r, i) => (
              <text key={i} x={xScale(r.date)} y={PAD.top + chartH + 30} textAnchor="middle" fontSize={9} fill="#94a3b8">{r.label}</text>
            ))}

            {/* Medication overlay markers */}
            {MEDICATION_TIMELINE.map(med => {
              const bpX = PAD.left + ((new Date(med.startDate).getTime() - minDate) / (maxDate - minDate)) * chartW;
              if (bpX < PAD.left || bpX > PAD.left + chartW) return null;
              return (
                <g key={med.drug + med.startDate}>
                  <line x1={bpX} x2={bpX} y1={PAD.top} y2={PAD.top + chartH} stroke="#8b5cf6" strokeWidth={1} strokeDasharray="2,4" opacity={0.3} />
                  <rect x={bpX - 36} y={PAD.top - 16} width={72} height={14} rx={7} fill="#f5f3ff" stroke="#ddd6fe" strokeWidth={0.5} />
                  <text x={bpX} y={PAD.top - 7} textAnchor="middle" fontSize={7} fill="#7c3aed" fontWeight={600}>{med.drug.split(" ")[0]}</text>
                </g>
              );
            })}

            {/* Systolic curve */}
            <path ref={systolicRef} d={sysPath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round"
              strokeDasharray={pathLengths.sys} strokeDashoffset={animateLines ? 0 : pathLengths.sys}
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)", filter: "drop-shadow(0 1px 3px rgba(239,68,68,0.3))" }} />
            {/* Diastolic curve */}
            <path ref={diastolicRef} d={diaPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round"
              strokeDasharray={pathLengths.dia} strokeDashoffset={animateLines ? 0 : pathLengths.dia}
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)", filter: "drop-shadow(0 1px 3px rgba(59,130,246,0.3))" }} />

            {/* Data dots */}
            {BP_READINGS.map((r, i) => (
              <g key={`dots-${i}`}>
                <circle cx={xScale(r.date)} cy={yScale(r.systolic)} r={3.5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                <circle cx={xScale(r.date)} cy={yScale(r.diastolic)} r={3.5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Mini Vital Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {miniVitals.map(v => (
          <div key={v.key} className="tool-panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{v.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: v.color, marginBottom: 2 }}>{v.latest} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{v.unit}</span></div>
            <svg width="100%" viewBox="0 0 120 50" style={{ display: "block", opacity: 0.6 }}>
              <polyline fill="none" stroke={v.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={vitalSparkline(v.key)} />
            </svg>
          </div>
        ))}
      </div>

      {/* Medication Gantt */}
      <div className="tool-panel">
        <div className="tool-panel-header"><h3>Medication Timeline</h3></div>
        <div className="tool-panel-body">
          <svg width="100%" viewBox={`0 0 ${W} 190`} style={{ display: "block" }}>
            {/* Year markers */}
            {["2024-01-01", "2025-01-01", "2026-01-01"].map(d => {
              const x = ganttXScale(d);
              return (
                <g key={d}>
                  <line x1={x} x2={x} y1={10} y2={180} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,4" />
                  <text x={x} y={8} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight={600}>{d.slice(0, 4)}</text>
                </g>
              );
            })}

            {MEDICATION_TIMELINE.map((med, i) => {
              const x1 = ganttXScale(med.startDate);
              const x2 = med.endDate ? ganttXScale(med.endDate) : ganttXScale("2026-02-23");
              const y = 28 + i * 32;
              const color = MED_COLORS[med.drug] || "#64748b";
              return (
                <g key={med.drug} className="gantt-bar">
                  <text x={PAD.left - 8} y={y + 14} textAnchor="end" fontSize={10} fill="#475569" fontWeight={500}>{med.drug}</text>
                  <rect x={x1} y={y} width={Math.max(x2 - x1, 6)} height={22} rx={6} fill={color} opacity={0.15} stroke={color} strokeWidth={1.5} />
                  <circle cx={x1} cy={y + 11} r={4} fill={color} />
                  {med.endDate && <circle cx={x2} cy={y + 11} r={4} fill="#fff" stroke={color} strokeWidth={2} />}
                  {!med.endDate && (
                    <text x={x2 - 4} y={y + 14} textAnchor="end" fontSize={8} fill={color} fontWeight={700}>ongoing</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ─── TOOL 6: Patient Health Radar ─── */
const getScoreColor = (score: number): string => {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

const getScoreClass = (score: number): string => {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  if (score >= 40) return "orange";
  return "red";
};

const PatientHealthRadar = ({ onToolResult }: { onToolResult: (entry: string) => void }) => {
  const [calculated, setCalculated] = useState(false);
  const [scores, setScores] = useState<ReturnType<typeof computeBodySystemScores>>([]);
  const [animateRadar, setAnimateRadar] = useState(false);

  const calculate = () => {
    const computed = computeBodySystemScores();
    setScores(computed);
    setCalculated(true);
    setTimeout(() => setAnimateRadar(true), 50);
    const avg = Math.round(computed.reduce((s, sc) => s + sc.score, 0) / computed.length);
    const weakest = computed.sort((a, b) => a.score - b.score).slice(0, 3).map(s => `${s.system}: ${s.score}/100`).join(", ");
    onToolResult(`[Health Radar] Overall Score: ${avg}/100. Weakest systems: ${weakest}. Key concerns: ${computed.filter(s => s.score < 60).map(s => s.rationale).join(" ")}`);
  };

  const cx = 200, cy = 200, maxR = 150;
  const axes = scores.map((_, i) => {
    const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
    return { angle, x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) };
  });

  const avg = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.score, 0) / scores.length) : 0;

  const centerPoints = scores.map(() => `${cx},${cy}`).join(" ");
  const dataPoints = scores.map((s, i) => {
    const r = (s.score / 100) * maxR;
    return `${cx + r * Math.cos(axes[i].angle)},${cy + r * Math.sin(axes[i].angle)}`;
  }).join(" ");

  return (
    <div style={{ padding: 24, height: "calc(100vh - 72px)", overflow: "auto" }}>
      {!calculated ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <div className="tool-panel" style={{ padding: 48, textAlign: "center", maxWidth: 480 }}>
            <div className="tool-empty-state">
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ width: 48, height: 48 }}><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
              <p>Compute a holistic health assessment across 8 body systems based on the patient&apos;s labs, vitals, and clinical history.</p>
            </div>
            <button className="tool-btn-primary" onClick={calculate} style={{ marginTop: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
              Calculate Health Score
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          {/* Radar Chart */}
          <div style={{ width: 440, flexShrink: 0 }}>
            <div className="tool-panel">
              <div className="tool-panel-header">
                <h3>Health Radar</h3>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>8 Body Systems</span>
              </div>
              <div className="tool-panel-body" style={{ display: "flex", justifyContent: "center" }}>
                <svg width="100%" viewBox="0 0 400 400" style={{ maxWidth: 400 }}>
                  {/* Concentric guide polygons */}
                  {[0.25, 0.5, 0.75, 1].map(pct => (
                    <polygon key={pct}
                      points={axes.map(a => `${cx + maxR * pct * Math.cos(a.angle)},${cy + maxR * pct * Math.sin(a.angle)}`).join(" ")}
                      fill="none" stroke="#e5e7eb" strokeWidth={pct === 1 ? 1.5 : 0.5} />
                  ))}

                  {/* Axis lines */}
                  {axes.map((a, i) => (
                    <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="#d1d5db" strokeWidth={0.5} />
                  ))}

                  {/* Percentage labels */}
                  {[25, 50, 75, 100].map((pct, i) => (
                    <text key={i} x={cx + 4} y={cy - maxR * (pct / 100) + 3} fontSize={8} fill="#cbd5e1">{pct}</text>
                  ))}

                  {/* Data polygon */}
                  <polygon
                    className="radar-polygon"
                    points={animateRadar ? dataPoints : centerPoints}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="rgba(59, 130, 246, 0.6)"
                    strokeWidth={2}
                  />

                  {/* Score dots */}
                  {scores.map((s, i) => {
                    const r = animateRadar ? (s.score / 100) * maxR : 0;
                    const dotX = cx + r * Math.cos(axes[i].angle);
                    const dotY = cy + r * Math.sin(axes[i].angle);
                    return (
                      <circle key={i} cx={animateRadar ? dotX : cx} cy={animateRadar ? dotY : cy} r={5}
                        fill={getScoreColor(s.score)} stroke="#fff" strokeWidth={2}
                        style={{ transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                    );
                  })}

                  {/* Axis labels */}
                  {scores.map((s, i) => {
                    const labelR = maxR + 28;
                    return (
                      <text key={i}
                        x={cx + labelR * Math.cos(axes[i].angle)}
                        y={cy + labelR * Math.sin(axes[i].angle)}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={10} fontWeight={700}
                        fill={getScoreColor(s.score)}>{s.system}</text>
                    );
                  })}
                </svg>
              </div>
              {/* Overall score */}
              <div style={{ textAlign: "center", paddingBottom: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: getScoreColor(avg) }}>{avg}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Overall Health Score / 100</div>
              </div>
            </div>
          </div>

          {/* System Cards */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
            {scores.map(s => (
              <div key={s.system} className="tool-panel system-card" style={{ padding: 14, borderLeft: `3px solid ${getScoreColor(s.score)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{s.system}</span>
                  <span className={`score-circle ${getScoreClass(s.score)}`}>{s.score}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {s.keyMetrics.map(m => (
                    <span key={m.label} style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: m.status === "critical" ? "#fef2f2" : m.status === "warning" ? "#fffbeb" : "#ecfdf5",
                      color: m.status === "critical" ? "#dc2626" : m.status === "warning" ? "#d97706" : "#059669",
                      border: `1px solid ${m.status === "critical" ? "#fecaca" : m.status === "warning" ? "#fde68a" : "#a7f3d0"}`,
                    }}>{m.label}: {m.value}</span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: 0 }}>{s.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Patient Portal Component ─── */
export default function PatientPortal() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("medassist-auth");
    if (!auth) { router.replace("/login"); return; }
    try {
      const p = JSON.parse(auth);
      if (!p.authenticated) { router.replace("/login"); return; }
    } catch { router.replace("/login"); return; }
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("medassist-auth");
    router.replace("/login");
  };

  const [activeTab, setActiveTab] = useState("Overview");
  const [chatHovered, setChatHovered] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [currentProvider, setCurrentProvider] = useState(STAFF.doctors[0]);
  const [selectedPatientId, setSelectedPatientId] = useState("gord-sims");
  const [patientSearch, setPatientSearch] = useState("");
  const [alertsExpanded, setAlertsExpanded] = useState(true);

  /* Appointments state */
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

  const handleBookAppointment = (date: string, time: string, type: string) => {
    const pt = DEMO_PATIENTS.find(p => p.id === selectedPatientId);
    const newApt: Appointment = { id: `apt-${Date.now()}`, date, time, patientName: pt?.name ?? "Patient", patientId: selectedPatientId, type, provider: currentProvider.name };
    setAppointments(prev => [...prev, newApt]);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => !(a.id === id && a.patientId === selectedPatientId)));
  };

  /* Chat state */
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content?: string; data?: any; time: string; runId?: string }>>([
    { role: "system", content: "Hello! I'm MedAssist AI with full access to Gord Sims' medical records — 15 visit notes, labs, medications, imaging, and more. Ask me anything about this patient.", time: "Now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [correctionOpen, setCorrectionOpen] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const TOOL_DISPLAY_NAMES: Record<string, { label: string; icon: string }> = {
    drug_interaction_check: { label: "Drug Interaction Check", icon: "" },
    symptom_lookup: { label: "Symptom Analysis", icon: "" },
    provider_search: { label: "Provider Search", icon: "" },
    appointment_availability: { label: "Appointment Availability", icon: "" },
    insurance_coverage_check: { label: "Insurance Coverage Check", icon: "" },
  };

  /* Tool context — tracks recent tool activity so AI can synthesize across tools */
  const [toolContext, setToolContext] = useState<string[]>([]);
  const addToolContext = (entry: string) => {
    setToolContext(prev => {
      const updated = [...prev, entry];
      return updated.slice(-6); // keep last 6 tool events
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  /* Dynamic patient data (FHIR or demo fallback) */
  const [patientInfo, setPatientInfo] = useState(DEMO_PATIENT_INFO);
  const [visitNotes, setVisitNotes] = useState(DEMO_VISIT_NOTES);
  const [, setDataSource] = useState<"demo" | "fhir">("demo");
  const patientId = selectedPatientId;

  useEffect(() => {
    if (selectedPatientId === "gord-sims") {
      fetch(`/api/patient/${selectedPatientId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.patientInfo) setPatientInfo(data.patientInfo);
          if (data.visitNotes) setVisitNotes(data.visitNotes);
          if (data.source) setDataSource(data.source);
        })
        .catch(() => { /* silently keep demo data */ });
    } else {
      const pt = DEMO_PATIENTS.find(p => p.id === selectedPatientId);
      if (pt) {
        setPatientInfo({
          ...DEMO_PATIENT_INFO,
          personal: { ...DEMO_PATIENT_INFO.personal, "Full Legal Name": pt.name, "Date of Birth": pt.dob, "Age": `${pt.age} years old`, "Sex": pt.sex === "M" ? "Male" : "Female" },
        });
        setVisitNotes([]);
      }
    }
  }, [selectedPatientId]);

  useEffect(() => {
    const pt = DEMO_PATIENTS.find(p => p.id === selectedPatientId);
    setChatMessages([{
      role: "system",
      content: `Hello! I'm MedAssist AI with full access to ${pt?.name ?? "the patient"}'s medical records — visit notes, labs, medications, imaging, and more. Ask me anything.`,
      time: "Now",
    }]);
  }, [selectedPatientId]);

  const clinicalAlerts = useMemo(() => {
    if (selectedPatientId !== "gord-sims") return [];
    return [
      { id: "k-high", severity: "critical" as const, title: "Potassium Elevated: 5.8 mEq/L", detail: "Above normal range (3.5-5.0). Hyperkalemia risk with concurrent ACE inhibitor (Lisinopril).", color: "#ef4444" },
      { id: "bp-high", severity: "warning" as const, title: "BP 132/83 — Stage 1 Hypertension", detail: "Above target <130/80. On Lisinopril 10mg. Consider dose increase or ARB switch.", color: "#f59e0b" },
      { id: "drug-interaction", severity: "warning" as const, title: "Interaction: Lisinopril + Elevated K+", detail: "ACE inhibitors increase potassium retention. K+ trending up. Urgent reassessment needed.", color: "#f59e0b" },
      { id: "cu-low", severity: "info" as const, title: "Copper Low: 62 ug/dL (range 70-140)", detail: "Mild copper deficiency. Monitor and consider supplementation.", color: "#3b82f6" },
    ];
  }, [selectedPatientId]);

  /* Availability helper */
  const getAvailabilityResponse = () => {
    const today = new Date(2026, 1, 23);
    const dates: { date: string; label: string; slots: string[] }[] = [];
    for (let i = 1; i <= 10 && dates.length < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dateStr = `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, "0")}`;
      const taken = appointments.filter(a => a.date === dateStr).map(a => a.time);
      const open = TIME_SLOTS.filter(t => !taken.includes(t));
      if (open.length > 0) dates.push({ date: dateStr, label: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }), slots: open.slice(0, 4) });
    }
    return {
      type: "availability",
      title: "Available Appointments This Week",
      content: { dates },
      recommendation: `I found ${dates.reduce((s, d) => s + d.slots.length, 0)} open slots across ${dates.length} days. Click a time to book.`,
    };
  };

  const handleChatQuery = (queryType: string, label: string) => {
    setChatMessages((m) => [...m, { role: "user" as const, content: label, time: "Now" }]);
    setChatLoading(true);
    if (queryType === "notes_overview") {
      // Send to AI for a comprehensive visit history review
      setChatLoading(true);
      (async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: "Give me a comprehensive overview of this patient's visit history, key milestones, and current concerns." }], patientId }),
          });
          if (!res.ok) throw new Error("API error");
          setChatLoading(false);
          setChatMessages((m) => [...m, { role: "assistant" as const, content: "", time: "Now" }]);
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
              const captured = fullText;
              setChatMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant" && !last.data) {
                  updated[updated.length - 1] = { ...last, content: captured };
                }
                return updated;
              });
            }
            if (!chatExpanded) setChatExpanded(true);
          }
        } catch {
          setChatLoading(false);
          setChatMessages((m) => [...m, { role: "assistant" as const, content: "Unable to retrieve visit history. Please try again.", time: "Now" }]);
        }
      })();
      return;
    }
    if (queryType === "availability") {
      setTimeout(() => {
        setChatLoading(false);
        const data = getAvailabilityResponse();
        setChatMessages((m) => [...m, { role: "assistant" as const, data, time: "Now" } as any]);
      }, 1800);
    } else {
      setTimeout(() => {
        setChatLoading(false);
        setChatMessages((m) => [...m, { role: "assistant" as const, data: DEMO_RESPONSES[queryType], time: "Now" } as any]);
      }, 1800);
    }
  };

  const handleChatBooking = (date: string, time: string) => {
    handleBookAppointment(date, time, "Follow-up");
    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    setChatMessages(prev => [...prev, {
      role: "assistant" as const,
      data: {
        type: "booking_confirmation",
        title: "Appointment Confirmed",
        content: { date: dateLabel, time: formatTime12(time), type: "Follow-up", provider: currentProvider.name },
        recommendation: "Your appointment has been booked. You can view it on the Calendar page.",
      },
      time: "Now",
    } as any]);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const q = chatInput.toLowerCase();
    const userMsg = chatInput;
    setChatMessages((m) => [...m, { role: "user" as const, content: userMsg, time: "Now" }]);
    setChatInput("");

    // Booking/availability queries stay structured
    if (q.includes("book") || q.includes("appointment") || q.includes("schedule") || q.includes("availab")) {
      setChatLoading(true);
      setTimeout(() => {
        setChatLoading(false);
        const data = getAvailabilityResponse();
        setChatMessages((m) => [...m, { role: "assistant" as const, data, time: "Now" } as any]);
      }, 1800);
      return;
    }

    // Everything else goes to GPT
    setChatLoading(true);
    try {
      const history: { role: "user" | "assistant" | "system"; content: string }[] = [];
      // Inject tool context so AI can synthesize across clinical tools
      if (toolContext.length > 0) {
        history.push({ role: "system", content: `[Clinical Tool Activity — reference these results when relevant to the user's question]\n${toolContext.join("\n")}` });
      }
      chatMessages
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
        .forEach((m) => history.push({ role: m.role as "user" | "assistant", content: m.content || "" }));
      history.push({ role: "user", content: userMsg });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, patientId }),
      });

      if (!res.ok) throw new Error("API error");

      const reqId = res.headers.get("X-Request-Id");
      setChatLoading(false);
      setChatMessages((m) => [...m, { role: "assistant" as const, content: "", time: "Now", runId: reqId || undefined }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          const captured = fullText;
          setChatMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && !last.data) {
              updated[updated.length - 1] = { ...last, content: captured };
            }
            return updated;
          });
        }
        // If stream completed with no text, show fallback refusal
        if (!fullText.trim()) {
          setChatMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: "I'm MedAssist AI, a clinical decision support tool. I can only assist with healthcare-related questions about this patient's care.",
              };
            }
            return updated;
          });
        }

        // Auto-expand chat panel after first AI response
        if (!chatExpanded) setChatExpanded(true);

        // Fetch tool calls that happened during this request
        if (reqId) {
          try {
            const toolRes = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fetchToolCalls: reqId }),
            });
            if (toolRes.ok) {
              const calls = await toolRes.json();
              if (Array.isArray(calls) && calls.length > 0) {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  // Find the last assistant message
                  let idx = updated.length - 1;
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === "assistant" && updated[i].content) { idx = i; break; }
                  }
                  // Insert tool cards AFTER the assistant response
                  const toolMsgs = calls.map((tc: { toolName: string; args: unknown; result: unknown }) => ({
                    role: "tool" as any, toolName: tc.toolName, args: tc.args, result: tc.result, time: "Now",
                  }));
                  updated.splice(idx + 1, 0, ...toolMsgs);
                  return updated;
                });
              }
            }
          } catch { /* non-critical */ }
        }
      }
    } catch {
      setChatLoading(false);
      setChatMessages((m) => [
        ...m,
        { role: "assistant" as const, content: "Sorry, I couldn't process that request. Please check that your OpenAI API key is configured in .env.local and try again.", time: "Now" },
      ]);
    }
  };

  const handleFeedback = async (runId: string, score: "up" | "down") => {
    setFeedback((prev) => ({ ...prev, [runId]: score }));
    if (score === "down") {
      setCorrectionOpen(runId);
    } else {
      setCorrectionOpen(null);
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId, score: 1 }),
        });
      } catch { /* non-critical */ }
    }
  };

  const submitCorrection = async (runId: string) => {
    setCorrectionOpen(null);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          score: 0,
          comment: "User indicated response was unhelpful",
          correction: correctionText || undefined,
        }),
      });
    } catch { /* non-critical */ }
    setCorrectionText("");
  };

  const quickActions = [
    { key: "notes_overview", label: "Review Visit History", icon: "📋" },
    { key: "interactions", label: "Check Drug Interactions", icon: "⚠" },
    { key: "labs", label: "Summarize Labs", icon: "📊" },
    { key: "meds", label: "Review Medications", icon: "💊" },
    { key: "availability", label: "Check Availability", icon: "📅" },
  ];

  const topTabs = ["Overview", "Notes & Graphs", "Personal Info", "History", "Documents"];
  const navItems = [
    { label: "Dashboard", icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { label: "Staff", icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { label: "Calendar", icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];
  const toolNavItems = [
    { label: "Care Gap", icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> },
  ];

  if (!authChecked) return <div style={{ minHeight: "100vh", background: "#f4f5f7" }} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg></div>
            Health Monitor <span>Portal</span>
          </div>
        </div>

        {/* Patient Search & List */}
        <div className="patient-search">
          <div style={{ position: "relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="patient-search-input"
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="patient-list">
          <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 10px", marginBottom: 4 }}>
            Recent Patients
          </div>
          {DEMO_PATIENTS
            .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
            .map(pt => (
              <button
                key={pt.id}
                className={`patient-list-item ${selectedPatientId === pt.id ? "selected" : ""}`}
                onClick={() => setSelectedPatientId(pt.id)}
              >
                <div className="patient-list-avatar" style={{ background: pt.color }}>{pt.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{pt.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{pt.sex === "M" ? "Male" : "Female"}, {pt.dob}</div>
                </div>
                {pt.concerns > 0 && (
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#dc2626", flexShrink: 0 }}>
                    {pt.concerns}
                  </div>
                )}
              </button>
            ))
          }
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activeNav === item.label ? "active" : ""}`}
              onClick={() => setActiveNav(item.label)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="nav-separator" />
          <div className="nav-group-label">Clinical Tools</div>
          {toolNavItems.map((item) => (
            <button
              key={item.label}
              className="nav-item"
              onClick={() => router.push("/caregap")}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="facility-name">Intermountain Medical Center</div>
          <div className="facility-address">5121 Cottonwood St<br />Murray, UT 84107</div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        {/* Provider Identity Bar */}
        <div className="provider-bar">
          <div className="provider-bar-left">
            <div className="provider-avatar">
              {currentProvider.name.split(" ")[0][0]}{currentProvider.name.split(" ").slice(-1)[0][0]}
            </div>
            <div>
              <select
                className="provider-selector"
                value={currentProvider.name}
                onChange={(e) => {
                  const doc = STAFF.doctors.find(d => d.name === e.target.value);
                  if (doc) setCurrentProvider(doc);
                }}
              >
                {STAFF.doctors.map(doc => (
                  <option key={doc.name} value={doc.name}>{doc.name}</option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                {currentProvider.specialty}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Online</span>
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button
              onClick={handleLogout}
              style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fecaca"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Log out
            </button>
          </div>
        </div>

        {activeNav === "Calendar" ? (
          <CalendarView appointments={appointments} onBook={handleBookAppointment} onCancel={handleCancelAppointment} selectedPatientId={selectedPatientId} />
        ) : activeNav === "Staff" ? (
          <StaffView />
        ) : (
        <>
        <div className="top-nav">
          <div className="top-nav-tabs">
            {topTabs.map((tab) => (
              <button
                key={tab}
                className={`top-nav-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "Personal Info" ? (
          <PersonalInfoView patientInfo={patientInfo} />
        ) : activeTab === "Notes & Graphs" ? (
          <VisitNotesView visitNotes={visitNotes} />
        ) : (
        <div className="content">
          {/* SUMMARY BAR */}
          <div className="overview-summary">
            <div className="summary-stat">
              <div className="summary-stat-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div className="summary-stat-label">Next Appointment</div>
                <div className="summary-stat-value">Feb 28, 2026</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-stat-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <div className="summary-stat-label">Active Concerns</div>
                <div className="summary-stat-value">4 Issues</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div>
                <div className="summary-stat-label">Last Visit</div>
                <div className="summary-stat-value">Jan 15, 2026</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-stat-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </div>
              <div>
                <div className="summary-stat-label">Active Medications</div>
                <div className="summary-stat-value">4 Prescriptions</div>
              </div>
            </div>
          </div>

          {/* CLINICAL ALERTS BANNER */}
          {clinicalAlerts.length > 0 && (
            <div className="alerts-banner">
              <div className="alerts-banner-header" onClick={() => setAlertsExpanded(!alertsExpanded)}>
                <div className="alerts-banner-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Clinical Alerts ({clinicalAlerts.length})
                </div>
                <button className="alerts-banner-toggle">
                  {alertsExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              {alertsExpanded && (
                <div style={{ marginTop: 4 }}>
                  {clinicalAlerts.map(alert => (
                    <div key={alert.id} className="alert-item">
                      <div className="alert-dot" style={{ background: alert.color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{alert.title}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2, lineHeight: 1.5 }}>{alert.detail}</div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
                        background: alert.severity === "critical" ? "#fef2f2" : alert.severity === "warning" ? "#fffbeb" : "#eff6ff",
                        color: alert.severity === "critical" ? "#dc2626" : alert.severity === "warning" ? "#d97706" : "#2563eb",
                        border: `1px solid ${alert.severity === "critical" ? "#fecaca" : alert.severity === "warning" ? "#fde68a" : "#bfdbfe"}`,
                        flexShrink: 0, alignSelf: "flex-start",
                      }}>
                        {alert.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VITALS */}
          <div className="card vitals-card card-accent-blue">
            <div className="card-title">Vitals</div>
            <div className="vitals-grid">
              <div className="vital-item">
                <div className="vital-label">Weight</div>
                <div className="vital-value">195 <span className="vital-unit">lbs</span></div>
                <div className="vital-status normal">Normal</div>
                <svg className="vital-sparkline" viewBox="0 0 80 36"><polyline fill="none" stroke="#10b981" strokeWidth="1.5" points="0,28 10,24 20,26 30,20 40,22 50,18 60,20 70,16 80,18"/></svg>
              </div>
              <div className="vital-item">
                <div className="vital-label">Temperature</div>
                <div className="vital-value">99.4 <span className="vital-unit">°F</span></div>
                <div className="vital-status elevated">Elevated</div>
                <svg className="vital-sparkline" viewBox="0 0 80 36"><polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points="0,20 10,22 20,18 30,24 40,20 50,26 60,22 70,28 80,24"/></svg>
              </div>
              <div className="vital-item">
                <div className="vital-label">Heart Rate</div>
                <div className="vital-value">85/145 <span className="vital-unit">bpm</span></div>
                <div className="vital-status normal">Normal</div>
                <svg className="vital-sparkline" viewBox="0 0 80 36"><polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points="0,18 8,20 12,10 16,28 20,14 28,18 36,16 44,22 48,12 52,26 56,18 64,20 72,16 80,18"/></svg>
              </div>
              <div className="vital-item">
                <div className="vital-label">Blood Pressure</div>
                <div className="vital-value">132/83 <span className="vital-unit">mmHg</span></div>
                <div className="vital-status high">High</div>
                <svg className="vital-sparkline" viewBox="0 0 80 36"><polyline fill="none" stroke="#ef4444" strokeWidth="1.5" points="0,22 10,18 20,24 30,16 40,20 50,14 60,18 70,12 80,16"/></svg>
              </div>
            </div>
          </div>

          {/* PROBLEMS */}
          <div className="card problems-card card-accent-red">
            <div className="card-title">Active Concerns</div>
            <div className="problem-list">
              <div className="problem-item active-problem"><span className="problem-dot red"></span>Abscess of external auditory canal</div>
              <div className="problem-item active-problem"><span className="problem-dot red"></span>Nausea with vomiting</div>
              <div className="problem-item active-problem"><span className="problem-dot orange"></span>Hypertension</div>
              <div className="problem-item active-problem"><span className="problem-dot yellow"></span>Abdominal Pain</div>
              <div className="problem-item resolved"><span className="problem-dot green"></span>Pericarditis (resolved)</div>
            </div>
          </div>

          {/* LABS */}
          <div className="card card-accent-teal">
            <div className="card-title">Latest Labs</div>
            <div className="labs-grid">
              <div className="lab-item"><div className="lab-label">Ca</div><div className="lab-value normal">9.4</div><div className="lab-range">8.5-10.5 mg/dL</div></div>
              <div className="lab-item"><div className="lab-label">Mg</div><div className="lab-value normal">2.1</div><div className="lab-range">1.7-2.2 mg/dL</div></div>
              <div className="lab-item"><div className="lab-label">K</div><div className="lab-value high">5.8</div><div className="lab-range">3.5-5.0 mEq/L</div></div>
              <div className="lab-item"><div className="lab-label">Na</div><div className="lab-value normal">140</div><div className="lab-range">136-145 mEq/L</div></div>
              <div className="lab-item"><div className="lab-label">Cu</div><div className="lab-value low">62</div><div className="lab-range">70-140 ug/dL</div></div>
              <div className="lab-item"><div className="lab-label">Cl</div><div className="lab-value normal">101</div><div className="lab-range">96-106 mEq/L</div></div>
            </div>
          </div>

          {/* MEDICATIONS */}
          <div className="card medications-card card-accent-purple">
            <div className="card-title">Medications</div>
            <div className="med-list">
              <div className="med-item">
                <div><span className="med-name">Enteric Coated Aspirin</span> <span className="med-dose">325mg</span></div>
                <span className="med-freq">Daily</span>
              </div>
              <div className="med-item">
                <div><span className="med-name">Tylenol Acetaminophen</span> <span className="med-dose">500mg</span></div>
                <span className="med-freq">PRN</span>
              </div>
              <div className="med-item">
                <div><span className="med-name">Lisinopril</span> <span className="med-dose">10mg</span></div>
                <span className="med-freq">Daily</span>
              </div>
              <div className="med-item">
                <div><span className="med-name">Doxycycline</span> <span className="med-dose">100mg</span></div>
                <span className="med-freq">BID</span>
              </div>
            </div>
          </div>

          {/* ALLERGIES & IMMUNIZATIONS */}
          <div className="card allergies-card card-accent-orange">
            <div className="allergies-immun-grid">
              <div>
                <div className="sub-title">Allergies</div>
                <div>
                  <span className="allergy-tag">Peanuts</span>
                  <span className="allergy-tag">Gluten</span>
                  <span className="allergy-tag">Penicillin</span>
                </div>
              </div>
              <div>
                <div className="sub-title">Immunizations</div>
                <div className="immun-item"><span className="immun-check">✓</span> Influenza (A/V, TIV)</div>
                <div className="immun-item"><span className="immun-check">✓</span> Pneumococcal (PCV, PPV)</div>
                <div className="immun-item"><span className="immun-check">✓</span> COVID-19 (Bivalent)</div>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Pulmonary + Imaging */}
          <div className="overview-bottom-row">
            <div className="card card-accent-green">
              <div className="card-title">Pulmonary Function</div>
              <div className="pulm-results">
                <div>
                  <div className="pulm-row"><span className="label">FEV1</span><span className="value">78%</span></div>
                  <div className="pulm-bar-bg"><div className="pulm-bar" style={{ width: "78%", background: "var(--accent-orange)" }}></div></div>
                </div>
                <div>
                  <div className="pulm-row"><span className="label">FVC</span><span className="value">85%</span></div>
                  <div className="pulm-bar-bg"><div className="pulm-bar" style={{ width: "85%", background: "var(--accent-blue)" }}></div></div>
                </div>
                <div>
                  <div className="pulm-row"><span className="label">FEV1/FVC</span><span className="value">92%</span></div>
                  <div className="pulm-bar-bg"><div className="pulm-bar" style={{ width: "92%", background: "var(--accent-green)" }}></div></div>
                </div>
              </div>
            </div>

            <div className="card imaging-card">
              <div className="card-title">Imaging</div>
              <div className="imaging-item">
                <div className="imaging-thumb"><div className="xray-placeholder"></div></div>
                <div className="imaging-info">
                  <div className="imaging-date">Sept 2025</div>
                  <div className="imaging-desc">Chest X-ray -- Bilateral findings consistent with early emphysema</div>
                </div>
              </div>
              <div className="imaging-item">
                <div className="imaging-thumb"><div className="xray-placeholder"></div></div>
                <div className="imaging-info">
                  <div className="imaging-date">Aug 2025</div>
                  <div className="imaging-desc">Abdominal CT -- Small bowel pattern unremarkable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
        </>
        )}
      </div>

      {/* ─── Chat Popup Panel ─── */}
      {chatOpen && (
        <div
          style={{
            position: "fixed",
            ...(chatExpanded ? {
              top: 0,
              right: 0,
              width: "40vw",
              minWidth: 380,
              height: "100vh",
              borderRadius: 0,
              borderLeft: "1px solid #e2e8f0",
            } : {
              bottom: 96,
              right: 28,
              width: 420,
              height: 560,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
            }),
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            boxShadow: chatExpanded
              ? "-4px 0 24px rgba(0,0,0,0.08)"
              : "0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
            transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Chat Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>MedAssist AI</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Clinical Decision Support</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: 10, color: "#6b7280" }}>FHIR Connected</span>
              </div>
              {chatExpanded && (
                <button
                  onClick={() => setChatExpanded(false)}
                  title="Minimize"
                  style={{
                    background: "none",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#64748b",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                  Minimize
                </button>
              )}
              {!chatExpanded && chatMessages.length > 2 && (
                <button
                  onClick={() => setChatExpanded(true)}
                  title="Expand"
                  style={{
                    background: "none",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "4px 6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#64748b",
                    fontFamily: "inherit",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "#fafbfc" }} className="scrollbar-thin">
            {chatMessages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", borderRadius: "16px 16px 4px 16px", padding: "8px 14px", maxWidth: "80%" }}>
                      <p style={{ fontSize: 13, color: "#ffffff", margin: 0 }}>{msg.content}</p>
                    </div>
                  </div>
                ) : msg.role === "system" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px 16px 16px 4px", padding: "8px 14px" }}>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{msg.content}</p>
                    </div>
                  </div>
                ) : (msg as any).role === "tool" ? (
                  <div style={{ display: "flex", gap: 8, padding: "2px 0" }}>
                    <div style={{ width: 24, minWidth: 24 }} />
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "6px 12px",
                        maxWidth: "85%",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedTools((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) { next.delete(i); } else { next.add(i); }
                        return next;
                      })}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                        <span style={{ fontWeight: 600, color: "#475569", fontSize: 12 }}>
                          Tool Call Activated
                        </span>
                        <svg
                          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                          style={{ marginLeft: "auto", transform: expandedTools.has(i) ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                      {expandedTools.has(i) && (
                        <div style={{ marginTop: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#64748b", lineHeight: 1.5 }}>
                          <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 600, color: "#334155" }}>
                              {(TOOL_DISPLAY_NAMES[(msg as any).toolName] || { label: (msg as any).toolName }).label}
                            </span>
                            {(msg as any).result ? (
                              <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>Complete</span>
                            ) : (
                              <span style={{ color: "#3b82f6", fontSize: 11 }}>Running...</span>
                            )}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <span style={{ color: "#94a3b8" }}>Input: </span>
                            {JSON.stringify((msg as any).args, null, 2)}
                          </div>
                          {(msg as any).result && (
                            <div style={{ maxHeight: 200, overflowY: "auto" }}>
                              <span style={{ color: "#94a3b8" }}>Output: </span>
                              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {JSON.stringify((msg as any).result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (msg as any).data ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div style={{ flex: 1, maxWidth: "85%" }}>
                      <ResponseCard data={(msg as any).data} onBookSlot={handleChatBooking} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div style={{ maxWidth: "85%" }}>
                      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px 16px 16px 4px", padding: "10px 14px" }}>
                        {renderAIText(msg.content || "")}
                      </div>
                      {msg.runId && msg.content && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 4, marginLeft: 4 }}>
                          <button
                            onClick={() => handleFeedback(msg.runId!, "up")}
                            title="Helpful"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "2px 4px",
                              borderRadius: 4,
                              color: feedback[msg.runId!] === "up" ? "#22c55e" : "#94a3b8",
                              transition: "color 0.15s",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback[msg.runId!] === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.runId!, "down")}
                            title="Not helpful"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "2px 4px",
                              borderRadius: 4,
                              color: feedback[msg.runId!] === "down" ? "#ef4444" : "#94a3b8",
                              transition: "color 0.15s",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={feedback[msg.runId!] === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
                          </button>
                          {feedback[msg.runId!] && (
                            <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 2 }}>
                              {feedback[msg.runId!] === "up" ? "Thanks!" : ""}
                            </span>
                          )}
                        </div>
                      )}
                      {correctionOpen === msg.runId && (
                        <div style={{ marginTop: 6, marginLeft: 4, display: "flex", gap: 6, alignItems: "flex-end" }}>
                          <input
                            value={correctionText}
                            onChange={(e) => setCorrectionText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && msg.runId && submitCorrection(msg.runId)}
                            placeholder="What would be a better response? (optional)"
                            style={{
                              flex: 1,
                              fontSize: 11,
                              padding: "5px 8px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              outline: "none",
                              color: "#374151",
                              background: "#fff",
                            }}
                          />
                          <button
                            onClick={() => msg.runId && submitCorrection(msg.runId)}
                            style={{
                              fontSize: 10,
                              padding: "5px 10px",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: 6,
                              cursor: "pointer",
                              color: "#475569",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setCorrectionOpen(null); setCorrectionText(""); }}
                            style={{
                              fontSize: 10,
                              padding: "5px 8px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#94a3b8",
                            }}
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div style={{ padding: "6px 14px", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", background: "#ffffff" }}>
            {quickActions.map((a) => (
              <button
                key={a.key}
                onClick={() => handleChatQuery(a.key, a.label)}
                disabled={chatLoading}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#64748b",
                  cursor: chatLoading ? "not-allowed" : "pointer",
                  opacity: chatLoading ? 0.3 : 1,
                  transition: "all 0.2s",
                }}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", background: "#ffffff" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                placeholder="Ask about this patient..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontSize: 13,
                  color: "#1e293b",
                  outline: "none",
                }}
              />
              <button
                onClick={handleChatSubmit}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                  opacity: chatLoading || !chatInput.trim() ? 0.3 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 10, color: "#9ca3af", margin: "6px 0 0" }}>AI-assisted • Always verify clinical decisions</p>
          </div>
        </div>
      )}

      {/* Floating Chat Toggle Button — hidden when expanded */}
      <div
        onClick={() => { if (chatOpen && chatExpanded) { setChatExpanded(false); setChatOpen(false); } else { setChatOpen(!chatOpen); } }}
        onMouseEnter={() => setChatHovered(true)}
        onMouseLeave={() => setChatHovered(false)}
        style={{
          position: "fixed",
          bottom: 28,
          right: chatExpanded && chatOpen ? "calc(25vw / 2 - 28px)" : 28,
          zIndex: 1001,
          display: chatExpanded && chatOpen ? "none" : "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
      >
        {/* Label that slides in on hover */}
        {!chatOpen && (
          <div
            style={{
              background: "#ffffff",
              color: "#1e293b",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              whiteSpace: "nowrap",
              opacity: chatHovered ? 1 : 0,
              transform: chatHovered ? "translateX(0)" : "translateX(8px)",
              transition: "all 0.25s ease",
              pointerEvents: "none",
            }}
          >
            AI Assistant
          </div>
        )}

        {/* FAB button */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: chatOpen
              ? "linear-gradient(135deg, #ef4444, #f97316)"
              : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            boxShadow: chatHovered
              ? "0 6px 24px rgba(59,130,246,0.45)"
              : "0 4px 16px rgba(59,130,246,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s ease",
            transform: chatHovered ? "scale(1.08)" : "scale(1)",
          }}
        >
          {chatOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
