"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  HeartPulse, LayoutDashboard, Bell, ClipboardList, MessageSquare,
  ScrollText, LogOut, Activity,
  CheckCircle2, Eye, Calendar, TestTube2, Phone,
  AlertTriangle, Clock, Wrench, Database, User,
  ArrowLeft,
} from "lucide-react";
import {
  CAREGAP_ALERTS,
  CAREGAP_FOLLOWUPS,
  CAREGAP_AUDIT_LOGS,
} from "@/lib/caregap-data";

const CareGapDashboard = dynamic(() => import("@/components/CareGapDashboard"), { ssr: false });
const CareGapAgentChat = dynamic(() => import("@/components/CareGapAgentChat"), { ssr: false });

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
  const [alerts, setAlerts] = useState(CAREGAP_ALERTS);
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
  const [followups, setFollowups] = useState(CAREGAP_FOLLOWUPS);
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
            {CAREGAP_AUDIT_LOGS.map(log => {
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
        {activeTab === "agent" && <CareGapAgentChat />}
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
