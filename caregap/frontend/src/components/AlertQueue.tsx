import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getAlerts, acknowledgeAlert } from "../api/client";
import type { Alert } from "../types";
import { SkeletonTable } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";
import { Bell, RefreshCw, AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { formatRelativeDate } from "../utils/dates";

const SEVERITY_STYLES: Record<string, { bg: string; dot: string }> = {
  high: { bg: "bg-red-100 text-red-800", dot: "bg-red-500" },
  warn: { bg: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  info: { bg: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
};

const TYPE_LABELS: Record<string, string> = {
  "care-gap": "Care Gap",
  adherence: "Adherence",
  utilization: "Utilization",
};

export default function AlertQueue() {
  const [filter, setFilter] = useState<{
    status: string;
    severity: string;
  }>({ status: "open", severity: "" });

  const { data, loading, error, refetch } = useApi(
    () =>
      getAlerts({
        status: filter.status || undefined,
        severity: filter.severity || undefined,
        limit: 50,
      }),
    [filter.status, filter.severity]
  );

  const alerts = (data?.data || []) as Alert[];

  async function handleAck(id: number, status: "ack" | "closed") {
    try {
      await acknowledgeAlert(id, status);
      refetch();
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-clinical-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Alert Queue</h2>
            <p className="text-xs text-gray-500">
              Clinical alerts flagged by the risk engine — care gaps, medication adherence issues, and utilization concerns. Acknowledge or close alerts as your team reviews them.
            </p>
          </div>
        </div>
        <button onClick={refetch} className="btn-secondary text-xs !px-3 !py-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="select-clinical"
          >
            <option value="open">Open</option>
            <option value="ack">Acknowledged</option>
            <option value="closed">Closed</option>
            <option value="">All</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
            Severity
          </label>
          <select
            value={filter.severity}
            onChange={(e) =>
              setFilter((f) => ({ ...f, severity: e.target.value }))
            }
            className="select-clinical"
          >
            <option value="">All Severities</option>
            <option value="high">High</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {loading && <SkeletonTable rows={5} cols={6} />}

      {error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <EmptyState preset="alerts" />
      )}

      {/* Alert Table */}
      {!loading && alerts.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.map((alert) => {
                const sev = SEVERITY_STYLES[alert.severity] || {
                  bg: "bg-gray-100 text-gray-600",
                  dot: "bg-gray-400",
                };
                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}
                        />
                        {alert.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/patients/${alert.pid}`}
                        className="font-mono text-xs text-clinical-600 hover:text-clinical-800 hover:underline transition-colors"
                      >
                        PID {alert.pid}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {alert.title}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">
                        {alert.detail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">
                      {alert.recommended_action}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatRelativeDate(alert.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {alert.status === "open" && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleAck(alert.id, "ack")}
                            className="btn-secondary text-xs !px-2 !py-1"
                          >
                            <Eye className="w-3 h-3" />
                            Ack
                          </button>
                          <button
                            onClick={() => handleAck(alert.id, "closed")}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Close
                          </button>
                        </div>
                      )}
                      {alert.status === "ack" && (
                        <button
                          onClick={() => handleAck(alert.id, "closed")}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Close
                        </button>
                      )}
                      {alert.status === "closed" && (
                        <span className="text-xs text-gray-400 italic">
                          Closed
                        </span>
                      )}
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
