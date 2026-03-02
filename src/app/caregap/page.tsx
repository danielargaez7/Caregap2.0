"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  HeartPulse, LayoutDashboard, Bell, ClipboardList, MessageSquare,
  ScrollText, LogOut, Activity, BarChart2, Users, Flag, RefreshCw,
  AlertCircle, CheckCircle2, Eye, Calendar, TestTube2, Phone,
  AlertTriangle, Clock, Wrench, Database, User, Send, RotateCcw,
  Sparkles, Loader2, Mail, ListChecks, ArrowLeft,
} from "lucide-react";

const CareGapDashboard = dynamic(() => import("@/components/CareGapDashboard"), { ssr: false });

/* ══════════════════════════════════════════════════════
   DEMO DATA
   ══════════════════════════════════════════════════════ */

interface Alert {
  id: number; pid: number; severity: string; alert_type: string;
  title: string; detail: string; recommended_action: string;
  status: string; created_at: string; closed_at: string | null;
}

interface Followup {
  id: number; pid: number; task_type: string; due_date: string;
  payload_json: Record<string, unknown>; status: string;
  created_at: string; fname?: string; lname?: string; insurance_type?: string;
}

interface AuditLogEntry {
  id: number; timestamp: string; user: string; action: string;
  resource_type: string; pid: number | null; detail_json: Record<string, unknown>;
  source: string;
}

const DEMO_ALERTS: Alert[] = [
  { id: 1, pid: 2, severity: "high", alert_type: "care-gap", title: "Dual care gap: BP + A1c failing", detail: "Eugene Jackson — BP 162/98, A1c 9.4%. Heart failure patient with medication adherence below threshold (PDC 62%).", recommended_action: "Schedule urgent follow-up to adjust BP medication and review diabetes management.", status: "open", created_at: "2026-02-27T10:00:00Z", closed_at: null },
  { id: 2, pid: 3, severity: "high", alert_type: "care-gap", title: "HbA1c critically elevated", detail: "Patricia Williams — A1c 10.2%. COPD patient not seen in 4+ months.", recommended_action: "Order HbA1c lab and schedule follow-up.", status: "open", created_at: "2026-02-27T10:05:00Z", closed_at: null },
  { id: 3, pid: 4, severity: "high", alert_type: "adherence", title: "Medication non-adherence", detail: "Linda Martinez — Amlodipine PDC 45%, Metformin PDC 38%. BP uncontrolled at 158/96.", recommended_action: "Call patient to discuss medication barriers.", status: "open", created_at: "2026-02-27T10:10:00Z", closed_at: null },
  { id: 4, pid: 5, severity: "high", alert_type: "care-gap", title: "No vitals or labs on file", detail: "Margaret Anderson — Hypertension and diabetes diagnoses with no monitoring data.", recommended_action: "Schedule Annual Wellness Visit.", status: "open", created_at: "2026-02-27T10:15:00Z", closed_at: null },
  { id: 5, pid: 6, severity: "warn", alert_type: "care-gap", title: "BP uncontrolled, CKD declining", detail: "Dorothy Henderson — BP 156/94. CKD Stage 3 with eGFR 48.", recommended_action: "Schedule follow-up for BP management.", status: "open", created_at: "2026-02-27T11:00:00Z", closed_at: null },
  { id: 6, pid: 7, severity: "warn", alert_type: "care-gap", title: "Missing HbA1c lab", detail: "Robert Chen — No HbA1c on file despite diabetes diagnosis.", recommended_action: "Order HbA1c lab. Check PHQ-9 status.", status: "open", created_at: "2026-02-27T11:05:00Z", closed_at: null },
  { id: 7, pid: 8, severity: "warn", alert_type: "care-gap", title: "A1c above threshold, smoker", detail: "Barbara Clark — A1c 9.1%. Current smoker eligible for lung cancer screening.", recommended_action: "Schedule follow-up and lung CT.", status: "open", created_at: "2026-02-27T11:10:00Z", closed_at: null },
  { id: 8, pid: 11, severity: "warn", alert_type: "adherence", title: "Partial medication adherence", detail: "Thomas Young — PDC 72%. BP and A1c currently controlled but at risk.", recommended_action: "Call patient to discuss fill gaps.", status: "open", created_at: "2026-02-27T11:15:00Z", closed_at: null },
  { id: 9, pid: 12, severity: "info", alert_type: "care-gap", title: "BP borderline", detail: "James Whitfield — BP 138/88. Trending toward uncontrolled.", recommended_action: "Recheck BP at next visit.", status: "open", created_at: "2026-02-27T12:00:00Z", closed_at: null },
];

const DEMO_FOLLOWUPS: Followup[] = [
  { id: 1, pid: 2, task_type: "schedule_visit", due_date: "2026-03-03", payload_json: { reason: "Urgent BP + diabetes follow-up", patient: "Eugene Jackson" }, status: "open", created_at: "2026-02-27T10:00:00Z", fname: "Eugene", lname: "Jackson", insurance_type: "medicare" },
  { id: 2, pid: 3, task_type: "order_lab", due_date: "2026-03-01", payload_json: { test: "HbA1c", patient: "Patricia Williams" }, status: "open", created_at: "2026-02-27T10:05:00Z", fname: "Patricia", lname: "Williams", insurance_type: "medicaid" },
  { id: 3, pid: 4, task_type: "call_patient", due_date: "2026-02-28", payload_json: { reason: "Discuss medication adherence barriers", patient: "Linda Martinez" }, status: "open", created_at: "2026-02-27T10:10:00Z", fname: "Linda", lname: "Martinez", insurance_type: "medicaid" },
  { id: 4, pid: 5, task_type: "schedule_visit", due_date: "2026-03-05", payload_json: { reason: "Annual Wellness Visit — no data on file", patient: "Margaret Anderson" }, status: "open", created_at: "2026-02-27T10:15:00Z", fname: "Margaret", lname: "Anderson", insurance_type: "medicaid" },
  { id: 5, pid: 1, task_type: "schedule_visit", due_date: "2026-03-10", payload_json: { reason: "Mammography screening", patient: "Maria Santos" }, status: "open", created_at: "2026-02-27T12:00:00Z", fname: "Maria", lname: "Santos", insurance_type: "medicare" },
  { id: 6, pid: 7, task_type: "order_lab", due_date: "2026-03-01", payload_json: { test: "HbA1c", patient: "Robert Chen" }, status: "open", created_at: "2026-02-27T11:05:00Z", fname: "Robert", lname: "Chen", insurance_type: "commercial" },
  { id: 7, pid: 8, task_type: "schedule_visit", due_date: "2026-03-07", payload_json: { reason: "Diabetes follow-up + lung CT screening", patient: "Barbara Clark" }, status: "open", created_at: "2026-02-27T11:10:00Z", fname: "Barbara", lname: "Clark", insurance_type: "commercial" },
  { id: 8, pid: 11, task_type: "call_patient", due_date: "2026-03-02", payload_json: { reason: "Discuss medication fill gaps", patient: "Thomas Young" }, status: "open", created_at: "2026-02-27T11:15:00Z", fname: "Thomas", lname: "Young", insurance_type: "medicare" },
];

const DEMO_AUDIT_LOGS: AuditLogEntry[] = [
  { id: 1, timestamp: "2026-02-28T14:30:00Z", user: "admin", action: "chat_message_sent", resource_type: "chat", pid: null, detail_json: { message: "What are the open alerts for Eugene Jackson?" }, source: "agent" },
  { id: 2, timestamp: "2026-02-28T14:30:02Z", user: "admin", action: "tool_call_executed", resource_type: "chat", pid: 2, detail_json: { tool: "get_open_alerts", duration_ms: 45 }, source: "agent" },
  { id: 3, timestamp: "2026-02-28T14:30:03Z", user: "admin", action: "chat_message_received", resource_type: "chat", pid: null, detail_json: { message: "Eugene Jackson has 1 open alert." }, source: "agent" },
  { id: 4, timestamp: "2026-02-28T14:25:00Z", user: "admin", action: "alert_acknowledged", resource_type: "alert", pid: 12, detail_json: { new_status: "ack" }, source: "api" },
  { id: 5, timestamp: "2026-02-28T14:20:00Z", user: "admin", action: "followup_completed", resource_type: "followup", pid: 4, detail_json: { task_type: "call_patient" }, source: "api" },
  { id: 6, timestamp: "2026-02-28T14:15:00Z", user: "admin", action: "risk_assessment_run", resource_type: "risk_assessment", pid: 2, detail_json: { score: 0.91, risk_band: "critical", alerts_created: 1 }, source: "risk_engine" },
  { id: 7, timestamp: "2026-02-28T14:10:00Z", user: "admin", action: "alert_created", resource_type: "alert", pid: 2, detail_json: { severity: "high", title: "Dual care gap: BP + A1c failing" }, source: "risk_engine" },
  { id: 8, timestamp: "2026-02-28T14:05:00Z", user: "admin", action: "patient_data_accessed", resource_type: "patient", pid: 2, detail_json: { data_type: "vitals" }, source: "api" },
  { id: 9, timestamp: "2026-02-28T14:00:00Z", user: "admin", action: "followup_created", resource_type: "followup", pid: 2, detail_json: { task_type: "schedule_visit", due_date: "2026-03-03" }, source: "risk_engine" },
  { id: 10, timestamp: "2026-02-28T13:55:00Z", user: "admin", action: "alert_closed", resource_type: "alert", pid: 6, detail_json: { new_status: "closed" }, source: "api" },
  { id: 11, timestamp: "2026-02-28T13:50:00Z", user: "admin", action: "claims_synced", resource_type: "claims", pid: 4, detail_json: { result: "Synced 12 EOBs" }, source: "api" },
  { id: 12, timestamp: "2026-02-28T13:45:00Z", user: "admin", action: "cohort_assessed", resource_type: "agent_run", pid: null, detail_json: { total: 18, assessed: 18, errors: 0 }, source: "agent" },
];

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return "1 week ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ══════════════════════════════════════════════════════
   ALERT QUEUE VIEW
   ══════════════════════════════════════════════════════ */

const SEVERITY_STYLES: Record<string, { bg: string; dot: string }> = {
  high: { bg: "bg-red-100 text-red-800", dot: "bg-red-500" },
  warn: { bg: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  info: { bg: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
};
const TYPE_LABELS: Record<string, string> = { "care-gap": "Care Gap", adherence: "Adherence", utilization: "Utilization" };

function AlertQueueView() {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [filterStatus, setFilterStatus] = useState("open");
  const [filterSeverity, setFilterSeverity] = useState("");

  const filtered = alerts.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterSeverity && a.severity !== filterSeverity) return false;
    return true;
  });

  function handleAck(id: number, status: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status, closed_at: status === "closed" ? new Date().toISOString() : a.closed_at } : a));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Bell className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Alert Queue</h2>
          <p className="text-xs text-gray-500">Clinical alerts flagged by the risk engine.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="open">Open</option><option value="ack">Acknowledged</option><option value="closed">Closed</option><option value="">All</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Severity</label>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="">All</option><option value="high">High</option><option value="warn">Warning</option><option value="info">Info</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No alerts match the current filters.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Severity","Type","Patient","Title","Action","Created",""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(alert => {
                const sev = SEVERITY_STYLES[alert.severity] || { bg: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
                return (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}><span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />{alert.severity.toUpperCase()}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{TYPE_LABELS[alert.alert_type] || alert.alert_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">PID {alert.pid}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900 text-sm">{alert.title}</p><p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{alert.detail}</p></td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{alert.recommended_action}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatRelativeDate(alert.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {alert.status === "open" && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleAck(alert.id, "ack")} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"><Eye className="w-3 h-3" />Ack</button>
                          <button onClick={() => handleAck(alert.id, "closed")} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"><CheckCircle2 className="w-3 h-3" />Close</button>
                        </div>
                      )}
                      {alert.status === "ack" && <button onClick={() => handleAck(alert.id, "closed")} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"><CheckCircle2 className="w-3 h-3" />Close</button>}
                      {alert.status === "closed" && <span className="text-xs text-gray-400 italic">Closed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FOLLOWUP TRACKER VIEW
   ══════════════════════════════════════════════════════ */

const TASK_CONFIG: Record<string, { bg: string; label: string; Icon: typeof Calendar }> = {
  schedule_visit: { bg: "bg-blue-100 text-blue-800", label: "Schedule Visit", Icon: Calendar },
  order_lab: { bg: "bg-purple-100 text-purple-800", label: "Order Lab", Icon: TestTube2 },
  call_patient: { bg: "bg-green-100 text-green-800", label: "Call Patient", Icon: Phone },
};
const INSURANCE_STYLES: Record<string, string> = { medicare: "bg-blue-100 text-blue-800", medicaid: "bg-purple-100 text-purple-800", commercial: "bg-teal-100 text-teal-800" };

function summarizePayload(p: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof p.reason === "string") parts.push(p.reason);
  if (typeof p.test === "string") parts.push(`Lab: ${p.test}`);
  return parts.join(" — ") || "—";
}

function FollowupTrackerView() {
  const [followups, setFollowups] = useState(DEMO_FOLLOWUPS);
  const [filterStatus, setFilterStatus] = useState("open");

  const filtered = followups.filter(f => !filterStatus || f.status === filterStatus);

  function handleComplete(id: number) {
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, status: "completed" } : f));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <ClipboardList className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Followup Tracker</h2>
          <p className="text-xs text-gray-500">Track pending care tasks — visits, lab orders, and patient calls.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <option value="open">Open</option><option value="completed">Completed</option><option value="">All</option>
          </select>
        </div>
      </div>

      {(["schedule_visit", "order_lab", "call_patient"] as const).map(type => {
        const group = filtered.filter(f => f.task_type === type);
        if (group.length === 0) return null;
        const config = TASK_CONFIG[type];
        const GroupIcon = config.Icon;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg}`}><GroupIcon className="w-3.5 h-3.5" /></div>
              <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
              <span className="text-xs text-gray-400">({group.length})</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Patient","Insurance","Details","Due","Created","Status"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.map(f => {
                    const name = f.fname ? `${f.lname}, ${f.fname}` : `PID ${f.pid}`;
                    const overdue = f.due_date && f.status === "open" && new Date(f.due_date) < new Date();
                    return (
                      <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${overdue ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-2.5"><span className="text-sm font-medium text-gray-900">{name}</span><br /><span className="font-mono text-[10px] text-gray-400">PID {f.pid}</span></td>
                        <td className="px-4 py-2.5">{f.insurance_type ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${INSURANCE_STYLES[f.insurance_type] || "bg-gray-100 text-gray-600"}`}>{f.insurance_type}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">{summarizePayload(f.payload_json)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>{overdue ? <><AlertTriangle className="w-3 h-3" />OVERDUE </> : <Clock className="w-3 h-3" />}{formatDate(f.due_date)}</span></td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{formatRelativeDate(f.created_at)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {f.status === "open" ? <button onClick={() => handleComplete(f.id)} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"><CheckCircle2 className="w-3 h-3" />Complete</button>
                          : <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" />Done</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   AUDIT LOG VIEW
   ══════════════════════════════════════════════════════ */

const ACTION_CONFIG: Record<string, { label: string; color: string; Icon: typeof Activity }> = {
  chat_message_sent: { label: "Chat Sent", color: "bg-blue-100 text-blue-800", Icon: MessageSquare },
  chat_message_received: { label: "Chat Received", color: "bg-blue-50 text-blue-700", Icon: MessageSquare },
  tool_call_executed: { label: "Tool Call", color: "bg-purple-100 text-purple-800", Icon: Wrench },
  alert_created: { label: "Alert Created", color: "bg-red-100 text-red-800", Icon: Bell },
  alert_acknowledged: { label: "Alert Ack'd", color: "bg-amber-100 text-amber-800", Icon: Bell },
  alert_closed: { label: "Alert Closed", color: "bg-green-100 text-green-800", Icon: Bell },
  followup_created: { label: "Followup Created", color: "bg-indigo-100 text-indigo-800", Icon: ClipboardList },
  followup_completed: { label: "Followup Done", color: "bg-green-100 text-green-800", Icon: ClipboardList },
  risk_assessment_run: { label: "Risk Assessment", color: "bg-orange-100 text-orange-800", Icon: Activity },
  patient_data_accessed: { label: "Patient Accessed", color: "bg-gray-100 text-gray-700", Icon: User },
  cohort_assessed: { label: "Cohort Run", color: "bg-cyan-100 text-cyan-800", Icon: Activity },
  claims_synced: { label: "Claims Synced", color: "bg-teal-100 text-teal-800", Icon: Database },
};

function summarizeAuditDetail(action: string, d: Record<string, unknown>): string {
  switch (action) {
    case "chat_message_sent": case "chat_message_received": return ((d.message as string) || "").slice(0, 120) || "—";
    case "tool_call_executed": return `${d.tool}() — ${d.duration_ms}ms`;
    case "alert_created": return `${d.severity} | ${d.title}`;
    case "alert_acknowledged": case "alert_closed": return `Status -> ${d.new_status}`;
    case "followup_created": return `${d.task_type} — due ${d.due_date}`;
    case "followup_completed": return `${d.task_type} completed`;
    case "risk_assessment_run": return `Score ${d.score} (${d.risk_band}) — ${d.alerts_created} alerts`;
    case "patient_data_accessed": return `${d.data_type} data`;
    case "cohort_assessed": return `${d.assessed}/${d.total} patients assessed`;
    case "claims_synced": return (d.result as string) || "—";
    default: return JSON.stringify(d).slice(0, 100);
  }
}

function AuditLogView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <ScrollText className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
          <p className="text-xs text-gray-500">HIPAA compliance trail — every clinical action is recorded.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Time","Action","User","Patient","Details","Source"].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DEMO_AUDIT_LOGS.map(log => {
              const config = ACTION_CONFIG[log.action] || { label: log.action, color: "bg-gray-100 text-gray-700", Icon: Activity };
              const Icon = config.Icon;
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatRelativeDate(log.timestamp)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}><Icon className="w-3 h-3" />{config.label}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{log.user}</td>
                  <td className="px-4 py-3">{log.pid ? <span className="font-mono text-xs text-blue-600">PID {log.pid}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">{summarizeAuditDetail(log.action, log.detail_json)}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{log.source}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   AGENT CHAT VIEW (simplified demo)
   ══════════════════════════════════════════════════════ */

const CHAT_SUGGESTIONS = [
  "Who are my highest risk patients?",
  "Show me open alerts",
  "Summarize care gaps",
];

const CHAT_RESPONSES: Record<string, string> = {
  "Who are my highest risk patients?": "Your highest risk patients are:\n\n1. **Eugene Jackson** (Score: 91) — Critical. BP 162/98, A1c 9.4%. Heart failure with low adherence (PDC 62%).\n2. **Patricia Williams** (Score: 87) — Critical. A1c 10.2%, COPD exacerbation. Not seen in 4+ months.\n3. **Linda Martinez** (Score: 82) — Critical. BP 158/96, Amlodipine PDC 45%, Metformin PDC 38%.\n4. **Margaret Anderson** (Score: 78) — Critical. No vitals or labs on file despite HTN + T2DM diagnoses.",
  "Show me open alerts": "You have **9 open alerts**:\n\n- 4 HIGH severity (Eugene Jackson, Patricia Williams, Linda Martinez, Margaret Anderson)\n- 4 WARN severity (Dorothy Henderson, Robert Chen, Barbara Clark, Thomas Young)\n- 1 INFO (James Whitfield — BP borderline)\n\nThe most urgent: Eugene Jackson has dual care gaps (BP + A1c) with heart failure.",
  "Summarize care gaps": "**Panel Summary (18 patients):**\n\n- Critical: 4 patients (22%)\n- High: 6 patients (33%)\n- Medium: 3 patients (17%)\n- Low: 5 patients (28%)\n\n**Key gaps:** CMS165 BP control rate is 58% (target 70%). CMS122 A1c poor control rate is 21% (target <15%). 3 patients have medication adherence below 80% PDC threshold.",
};

interface ChatMsg { role: "user" | "assistant"; content: string }

function AgentChatView() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || typing) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setTyping(true);

    const responseKey = Object.keys(CHAT_RESPONSES).find(k => msg.toLowerCase().includes(k.toLowerCase().split(" ").slice(0, 3).join(" ")));
    const response = responseKey ? CHAT_RESPONSES[responseKey] : `I can help with patient risk analysis, care gap summaries, and alert management. Try asking "Who are my highest risk patients?" or "Show me open alerts".`;

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setTyping(false);
    }, 800);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-2.5 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">Agent Chat</h2>
          <p className="text-xs text-gray-500">Ask about patient risks, care gaps, and quality measures.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-t-xl border border-b-0 border-gray-200 p-4 space-y-4">
        {messages.length === 0 && !typing && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Clinical AI Assistant</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {CHAT_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition-colors">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{msg.role === "user" ? "You" : "CareGap"}</span>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === "user" ? "text-white" : "bg-gray-100 text-gray-900"}`} style={msg.role === "user" ? { backgroundColor: "#0078c7" } : undefined}>
              {msg.content.split(/(\*\*.*?\*\*)/).map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start"><div className="bg-gray-100 rounded-xl px-4 py-3"><div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} /></div></div></div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-b-xl">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about patient risks..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => send()} disabled={typing || !input.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN CAREGAP PAGE
   ══════════════════════════════════════════════════════ */

const NAV_TABS = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "alerts", label: "Alerts", Icon: Bell },
  { key: "followups", label: "Followups", Icon: ClipboardList },
  { key: "agent", label: "Agent Chat", Icon: MessageSquare },
  { key: "audit", label: "Audit Log", Icon: ScrollText },
];

export default function CareGapPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const auth = localStorage.getItem("medassist-auth");
    if (!auth) { router.replace("/login"); return; }
    try {
      const p = JSON.parse(auth);
      if (!p.authenticated) { router.replace("/login"); return; }
    } catch { router.replace("/login"); return; }
    setAuthChecked(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("medassist-auth");
    router.replace("/login");
  }

  if (!authChecked) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Back + Logo */}
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
              <ArrowLeft className="w-3.5 h-3.5" />
              Portal
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">CareGap</h1>
                <p className="text-[10px] text-gray-400 leading-tight">Chronic Care Risk Detector</p>
              </div>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <div className="text-[11px] text-gray-500 leading-tight">
              <span className="font-medium text-gray-700">Intermountain Medical Center</span><br />
              <span className="text-[10px] text-gray-400">Murray, Utah</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex gap-1">
            {NAV_TABS.map(n => (
              <button
                key={n.key}
                onClick={() => setActiveTab(n.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === n.key
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <n.Icon className="w-4 h-4" />
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Demo</span>
          <span className="text-xs font-medium text-gray-600">admin</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" />Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6">
        {activeTab === "dashboard" && <CareGapDashboard />}
        {activeTab === "alerts" && <AlertQueueView />}
        {activeTab === "followups" && <FollowupTrackerView />}
        {activeTab === "agent" && <AgentChatView />}
        {activeTab === "audit" && <AuditLogView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-2 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>CareGap v1.0 &middot; HIPAA Compliant</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />System Online</span>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-1">All patient data shown is simulated for demonstration purposes.</p>
      </footer>
    </div>
  );
}
