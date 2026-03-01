import { Link } from "react-router-dom";
import type { RiskAssessment } from "../types";
import { Flag } from "lucide-react";
import { formatRelativeDate } from "../utils/dates";

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
  medicare: "bg-blue-100 text-blue-800",
  medicaid: "bg-purple-100 text-purple-800",
  commercial: "bg-teal-100 text-teal-800",
};

interface Props {
  assessment: RiskAssessment & { fname?: string; lname?: string; insurance_type?: string };
}

export default function PatientRiskCard({ assessment }: Props) {
  const band = assessment.risk_band;
  const fname = assessment.fname || "";
  const lname = assessment.lname || "";
  const name = fname || lname ? `${lname}, ${fname}` : `PID ${assessment.pid}`;
  const initials = ((fname[0] || "") + (lname[0] || "")).toUpperCase() || "?";

  const flags = assessment.flags_json || {};
  const flagList = Object.entries(flags)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const insuranceType = assessment.insurance_type;

  return (
    <Link
      to={`/patients/${assessment.pid}`}
      className="group block card p-4 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: BAND_COLORS[band] || "#6b7280" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate group-hover:text-clinical-700 transition-colors">
              {name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 font-mono">PID {assessment.pid}</span>
              {insuranceType && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    INSURANCE_STYLES[insuranceType] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {insuranceType}
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide shrink-0 ${
            BAND_STYLES[band] || "bg-gray-200 text-gray-700"
          }`}
        >
          {band}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {(assessment.score * 100).toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">Risk Score</p>
        </div>
        {flagList.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flagList.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded"
              >
                <Flag className="w-2.5 h-2.5" />
                {formatFlag(flag)}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Assessed {formatRelativeDate(assessment.computed_at)}
      </p>
    </Link>
  );
}

function formatFlag(flag: string): string {
  return flag
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
