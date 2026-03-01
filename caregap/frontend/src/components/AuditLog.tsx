import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getAuditLogs } from "../api/client";
import type { AuditLogEntry } from "../types";
import { SkeletonTable } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";
import {
  ScrollText,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Bell,
  ClipboardList,
  Activity,
  User,
  Wrench,
  Database,
} from "lucide-react";
import { formatRelativeDate } from "../utils/dates";

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Activity }
> = {
  chat_message_sent: {
    label: "Chat Sent",
    color: "bg-blue-100 text-blue-800",
    icon: MessageSquare,
  },
  chat_message_received: {
    label: "Chat Received",
    color: "bg-blue-50 text-blue-700",
    icon: MessageSquare,
  },
  tool_call_executed: {
    label: "Tool Call",
    color: "bg-purple-100 text-purple-800",
    icon: Wrench,
  },
  alert_created: {
    label: "Alert Created",
    color: "bg-red-100 text-red-800",
    icon: Bell,
  },
  alert_acknowledged: {
    label: "Alert Ack'd",
    color: "bg-amber-100 text-amber-800",
    icon: Bell,
  },
  alert_closed: {
    label: "Alert Closed",
    color: "bg-green-100 text-green-800",
    icon: Bell,
  },
  followup_created: {
    label: "Followup Created",
    color: "bg-indigo-100 text-indigo-800",
    icon: ClipboardList,
  },
  followup_completed: {
    label: "Followup Done",
    color: "bg-green-100 text-green-800",
    icon: ClipboardList,
  },
  risk_assessment_run: {
    label: "Risk Assessment",
    color: "bg-orange-100 text-orange-800",
    icon: Activity,
  },
  patient_data_accessed: {
    label: "Patient Accessed",
    color: "bg-gray-100 text-gray-700",
    icon: User,
  },
  cohort_assessed: {
    label: "Cohort Run",
    color: "bg-cyan-100 text-cyan-800",
    icon: Activity,
  },
  claims_synced: {
    label: "Claims Synced",
    color: "bg-teal-100 text-teal-800",
    icon: Database,
  },
};

function summarizeDetail(
  action: string,
  detail: Record<string, unknown>
): string {
  switch (action) {
    case "chat_message_sent":
    case "chat_message_received":
      return ((detail.message as string) || "").slice(0, 120) || "—";
    case "tool_call_executed":
      return `${detail.tool}() — ${detail.duration_ms}ms`;
    case "alert_created":
      return `${detail.severity} | ${detail.title}`;
    case "alert_acknowledged":
    case "alert_closed":
      return `Status → ${detail.new_status}`;
    case "followup_created":
      return `${detail.task_type} — due ${detail.due_date}`;
    case "followup_completed":
      return `${detail.task_type} completed`;
    case "risk_assessment_run":
      return `Score ${detail.score} (${detail.risk_band}) — ${detail.alerts_created} alerts`;
    case "patient_data_accessed":
      return `${detail.data_type} data`;
    case "cohort_assessed":
      return `${detail.assessed}/${detail.total} patients assessed`;
    case "claims_synced":
      return (detail.result as string) || "—";
    default:
      return JSON.stringify(detail).slice(0, 100);
  }
}

export default function AuditLog() {
  const [filter, setFilter] = useState<{
    action: string;
    pid: string;
    dateFrom: string;
    dateTo: string;
  }>({ action: "", pid: "", dateFrom: "", dateTo: "" });

  const { data, loading, error, refetch } = useApi(
    () =>
      getAuditLogs({
        action: filter.action || undefined,
        pid: filter.pid ? Number(filter.pid) : undefined,
        date_from: filter.dateFrom || undefined,
        date_to: filter.dateTo || undefined,
        limit: 100,
      }),
    [filter.action, filter.pid, filter.dateFrom, filter.dateTo]
  );

  const logs = (data?.data || []) as AuditLogEntry[];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ScrollText className="w-5 h-5 text-clinical-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
            <p className="text-xs text-gray-500">
              HIPAA compliance trail — every clinical action, chat message, tool
              call, and data access is recorded here.
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="btn-secondary text-xs !px-3 !py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Action
          </label>
          <select
            value={filter.action}
            onChange={(e) =>
              setFilter((f) => ({ ...f, action: e.target.value }))
            }
            className="select-clinical"
          >
            <option value="">All Actions</option>
            <option value="chat_message_sent">Chat Sent</option>
            <option value="chat_message_received">Chat Received</option>
            <option value="tool_call_executed">Tool Call</option>
            <option value="alert_created">Alert Created</option>
            <option value="alert_acknowledged">Alert Acknowledged</option>
            <option value="alert_closed">Alert Closed</option>
            <option value="followup_created">Followup Created</option>
            <option value="followup_completed">Followup Completed</option>
            <option value="risk_assessment_run">Risk Assessment</option>
            <option value="patient_data_accessed">Patient Accessed</option>
            <option value="cohort_assessed">Cohort Run</option>
            <option value="claims_synced">Claims Synced</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Patient ID
          </label>
          <input
            type="text"
            value={filter.pid}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                pid: e.target.value.replace(/\D/g, ""),
              }))
            }
            placeholder="Any"
            className="select-clinical w-24"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            From
          </label>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) =>
              setFilter((f) => ({ ...f, dateFrom: e.target.value }))
            }
            className="select-clinical"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            To
          </label>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) =>
              setFilter((f) => ({ ...f, dateTo: e.target.value }))
            }
            className="select-clinical"
          />
        </div>
      </div>

      {loading && <SkeletonTable rows={8} cols={6} />}

      {error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <EmptyState preset="audit" />
      )}

      {!loading && logs.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  color: "bg-gray-100 text-gray-700",
                  icon: Activity,
                };
                const Icon = config.icon;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatRelativeDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.user}
                    </td>
                    <td className="px-4 py-3">
                      {log.pid ? (
                        <Link
                          to={`/patients/${log.pid}`}
                          className="font-mono text-xs text-clinical-600 hover:text-clinical-800 hover:underline transition-colors"
                        >
                          PID {log.pid}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">
                      {summarizeDetail(log.action, log.detail_json)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                        {log.source}
                      </span>
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
