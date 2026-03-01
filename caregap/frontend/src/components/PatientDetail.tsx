import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  getPatient,
  getPatientRiskAssessments,
  getPatientVitals,
  getPatientLabs,
  getPatientInsurance,
  getAlerts,
  getFollowups,
  getAdherence,
} from "../api/client";
import type {
  RiskAssessment,
  Alert,
  Followup,
  Vital,
  LabResult,
  InsuranceInfo,
  AdherenceSummary,
  Patient,
} from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import Breadcrumbs from "./ui/Breadcrumbs";
import { Skeleton } from "./ui/Skeleton";
import { formatDate, formatRelativeDate } from "../utils/dates";
import {
  HeartPulse,
  TestTube2,
  Shield,
  Bell,
  ClipboardList,
  Activity,
  Pill,
  FileText,
  History,
  Stethoscope,
  Flag,
} from "lucide-react";

const BAND_STYLES: Record<string, string> = {
  critical: "bg-orange-900 text-white",
  high: "bg-red-500 text-white",
  medium: "bg-amber-400 text-gray-900",
  low: "bg-green-500 text-white",
};

const BAND_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const INSURANCE_STYLES: Record<string, string> = {
  medicare: "bg-blue-100 text-blue-800 border-blue-200",
  medicaid: "bg-purple-100 text-purple-800 border-purple-200",
  commercial: "bg-teal-100 text-teal-800 border-teal-200",
};

export default function PatientDetail() {
  const { pid } = useParams<{ pid: string }>();
  const numPid = Number(pid);

  const patientResp = useApi(() => getPatient(String(numPid)), [numPid]);
  const assessments = useApi(
    () => getPatientRiskAssessments(numPid),
    [numPid]
  );
  const vitalsResp = useApi(
    () => getPatientVitals(String(numPid)),
    [numPid]
  );
  const labsResp = useApi(() => getPatientLabs(String(numPid)), [numPid]);
  const insuranceResp = useApi(() => getPatientInsurance(numPid), [numPid]);
  const adherenceResp = useApi(() => getAdherence(numPid), [numPid]);
  const alerts = useApi(() => getAlerts({ status: "open" }), [numPid]);
  const followups = useApi(() => getFollowups({ status: "open" }), [numPid]);

  const rawPatient = patientResp.data as unknown as
    | (Patient & { DOB?: string })
    | null;
  const patient = rawPatient
    ? { ...rawPatient, dob: rawPatient.dob || rawPatient.DOB || "" }
    : null;
  const assessmentList = (assessments.data?.data || []) as RiskAssessment[];
  const vitals = ((vitalsResp.data as unknown as Vital[]) || []).sort(
    (a, b) => a.date.localeCompare(b.date)
  );
  const labs = (labsResp.data as unknown as LabResult[]) || [];
  const insurance = insuranceResp.data as InsuranceInfo | null;
  const adherence =
    (adherenceResp.data as unknown as {
      status: string;
      metrics?: AdherenceSummary;
    }) || null;
  const alertList = ((alerts.data?.data || []) as Alert[]).filter(
    (a) => a.pid === numPid
  );
  const followupList = ((followups.data?.data || []) as Followup[]).filter(
    (f) => f.pid === numPid
  );

  const latest = assessmentList[0];
  const fname = patient?.fname || "";
  const lname = patient?.lname || "";
  const patientName =
    fname || lname ? `${fname} ${lname}` : `Patient ${pid}`;
  const initials =
    ((fname[0] || "") + (lname[0] || "")).toUpperCase() || "?";

  // BP chart data
  const bpData = vitals
    .filter((v) => v.bps && v.bpd)
    .map((v) => ({
      date: new Date(v.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      systolic: Number(v.bps),
      diastolic: Number(v.bpd),
    }));

  if (patientResp.loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: patientName },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{
              backgroundColor: latest
                ? BAND_COLORS[latest.risk_band] || "#6b7280"
                : "#6b7280",
            }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{patientName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">
                PID {pid}
              </span>
              {patient?.dob && (
                <span className="text-xs text-gray-500">
                  DOB: {formatDate(patient.dob)}
                </span>
              )}
              {patient?.sex && (
                <span className="text-xs text-gray-500">{patient.sex}</span>
              )}
            </div>
          </div>
        </div>
        {latest && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              BAND_STYLES[latest.risk_band] || "bg-gray-200"
            }`}
          >
            {latest.risk_band}
          </span>
        )}
      </div>

      {/* Insurance Card */}
      {insurance && insurance.insurance_type && (
        <div
          className={`border rounded-xl p-4 ${
            INSURANCE_STYLES[insurance.insurance_type] ||
            "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 opacity-60" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  Insurance
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {insurance.insurance_type.charAt(0).toUpperCase() +
                    insurance.insurance_type.slice(1)}
                </p>
              </div>
            </div>
            {insurance.member_id && (
              <div className="text-right">
                <p className="text-[10px] opacity-70">Member ID</p>
                <p className="text-sm font-mono">{insurance.member_id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top row: Risk + Adherence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latest Risk Assessment */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Risk Assessment
            </h3>
          </div>
          {latest ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Risk Score"
                  value={`${(latest.score * 100).toFixed(0)}%`}
                />
                <Stat
                  label="Risk Band"
                  value={latest.risk_band.toUpperCase()}
                />
                <Stat label="Model" value={latest.model_name} />
                <Stat
                  label="Assessed"
                  value={formatRelativeDate(latest.computed_at)}
                />
              </div>
              {latest.flags_json &&
                Object.keys(latest.flags_json).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(latest.flags_json).map(([key, val]) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                          val
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        <Flag className="w-2.5 h-2.5" />
                        {key.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              {assessments.loading ? "Loading..." : "No assessments yet."}
            </p>
          )}
        </div>

        {/* Adherence */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Medication Adherence
            </h3>
          </div>
          {adherence?.metrics ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-2xl font-bold text-gray-900">
                  {adherence.metrics.overall_pdc != null
                    ? `${(adherence.metrics.overall_pdc * 100).toFixed(0)}%`
                    : "N/A"}
                </p>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    adherence.metrics.overall_adherent
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {adherence.metrics.overall_adherent
                    ? "Adherent"
                    : "Non-Adherent"}
                </span>
              </div>
              {adherence.metrics.drugs && (
                <div className="space-y-1.5">
                  {Object.entries(adherence.metrics.drugs).map(
                    ([drug, info]) => (
                      <div
                        key={drug}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-600 truncate">{drug}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                info.adherent ? "bg-green-500" : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(info.pdc * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`font-mono w-8 text-right ${
                              info.adherent
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {(info.pdc * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              {adherenceResp.loading
                ? "Loading..."
                : "No claims data available."}
            </p>
          )}
        </div>
      </div>

      {/* BP Trend Chart */}
      {bpData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Blood Pressure Trend
            </h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bpData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[60, 200]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={140}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{
                    value: "SBP 140",
                    fontSize: 10,
                    fill: "#ef4444",
                  }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{
                    value: "DBP 90",
                    fontSize: 10,
                    fill: "#f59e0b",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444" }}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  name="Diastolic"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lab Results */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <TestTube2 className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Lab Results</h3>
        </div>
        {labs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-gray-500 border-b uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Test</th>
                  <th className="pb-2 font-semibold">Result</th>
                  <th className="pb-2 font-semibold">Units</th>
                  <th className="pb-2 font-semibold">Range</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((lab, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 text-gray-900">{lab.name}</td>
                    <td
                      className={`py-2.5 font-mono font-semibold ${
                        lab.abnormal ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {lab.result}
                    </td>
                    <td className="py-2.5 text-gray-500">{lab.units}</td>
                    <td className="py-2.5 text-gray-500">{lab.range}</td>
                    <td className="py-2.5 text-gray-500">
                      {lab.date ? formatDate(lab.date) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            {labsResp.loading ? "Loading..." : "No lab results on file."}
          </p>
        )}
      </div>

      {/* Vitals Table */}
      {vitals.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Vitals History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-gray-500 border-b uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">BP</th>
                  <th className="pb-2 font-semibold">Weight</th>
                  <th className="pb-2 font-semibold">Height</th>
                  <th className="pb-2 font-semibold">Pulse</th>
                </tr>
              </thead>
              <tbody>
                {[...vitals].reverse().map((v, i) => {
                  const bpStr =
                    v.bps && v.bpd ? `${v.bps}/${v.bpd}` : "";
                  const bpHigh =
                    Number(v.bps) >= 140 || Number(v.bpd) >= 90;
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2.5 text-gray-500">
                        {formatDate(v.date)}
                      </td>
                      <td
                        className={`py-2.5 font-mono ${
                          bpHigh
                            ? "text-red-600 font-semibold"
                            : "text-gray-900"
                        }`}
                      >
                        {bpStr}
                      </td>
                      <td className="py-2.5 text-gray-900">
                        {v.weight ? `${v.weight} lbs` : ""}
                      </td>
                      <td className="py-2.5 text-gray-900">
                        {v.height ? `${v.height} in` : ""}
                      </td>
                      <td className="py-2.5 text-gray-900">
                        {v.pulse || ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Open Alerts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Open Alerts</h3>
          <span className="text-xs text-gray-400">({alertList.length})</span>
        </div>
        {alertList.length > 0 ? (
          <div className="space-y-2">
            {alertList.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                    a.severity === "high"
                      ? "bg-red-100 text-red-800"
                      : a.severity === "warn"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      a.severity === "high"
                        ? "bg-red-500"
                        : a.severity === "warn"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  {a.severity.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.detail}</p>
                  <p className="text-xs text-clinical-600 mt-1">
                    {a.recommended_action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No open alerts.</p>
        )}
      </div>

      {/* Open Followups */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">
            Open Followups
          </h3>
          <span className="text-xs text-gray-400">
            ({followupList.length})
          </span>
        </div>
        {followupList.length > 0 ? (
          <div className="space-y-2">
            {followupList.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {f.task_type.replace(/_/g, " ")}
                </span>
                {f.due_date && (
                  <span className="text-xs text-gray-500">
                    Due {formatDate(f.due_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No open followups.</p>
        )}
      </div>

      {/* Evidence Factors */}
      {latest?.factors && latest.factors.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Evidence Factors
            </h3>
          </div>
          <div className="space-y-2">
            {latest.factors.map((f) => (
              <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs text-clinical-600 font-semibold">
                    {f.factor_code}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {f.evidence_type}
                  </span>
                </div>
                {f.evidence_json && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(f.evidence_json).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-500">
                          {key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        <span className="text-gray-700 font-medium font-mono">
                          {typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment History */}
      {assessmentList.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Assessment History
            </h3>
          </div>
          <div className="space-y-2">
            {assessmentList.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      BAND_STYLES[a.risk_band] || "bg-gray-200"
                    }`}
                  >
                    {a.risk_band}
                  </span>
                  <span className="text-sm text-gray-700">
                    Score: {(a.score * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatRelativeDate(a.computed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
