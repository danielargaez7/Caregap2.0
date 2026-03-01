import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getRiskAssessments, assessCohort, isDemoMode } from "../api/client";
import PatientRiskCard from "./PatientRiskCard";
import type { RiskAssessment } from "../types";
import { Skeleton, SkeletonCard } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";
import { Activity, BarChart2, AlertCircle, RefreshCw, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

const BAND_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const BAND_GRADIENTS: Record<string, [string, string]> = {
  critical: ["#ef4444", "#991b1b"],
  high: ["#fb923c", "#c2410c"],
  medium: ["#facc15", "#a16207"],
  low: ["#4ade80", "#15803d"],
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { band, count, key } = payload[0].payload;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm border border-gray-700">
      <p className="font-semibold">{band}</p>
      <p style={{ color: BAND_COLORS[key] }}>
        {count} patient{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default function RiskDashboard() {
  const { data, loading, error, refetch } = useApi(
    () => getRiskAssessments({ limit: 100 }),
    []
  );
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  async function handleAssessAll() {
    setBatchRunning(true);
    setBatchResult(null);
    try {
      const result = (await assessCohort()) as {
        assessed?: number;
        errors?: number;
      };
      setBatchResult(
        `Assessed ${result.assessed || 0} patients (${result.errors || 0} errors)`
      );
      refetch();
    } catch (err) {
      setBatchResult("Batch assessment failed. Check backend logs.");
    } finally {
      setBatchRunning(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const assessments = (data?.data || []) as (RiskAssessment & {
    fname?: string;
    lname?: string;
    insurance_type?: string;
  })[];

  const dist: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of assessments) {
    dist[a.risk_band] = (dist[a.risk_band] || 0) + 1;
  }
  const chartData = ["critical", "high", "medium", "low"].map((band) => ({
    band: band.charAt(0).toUpperCase() + band.slice(1),
    count: dist[band] || 0,
    key: band,
  }));

  const sorted = [...assessments].sort((a, b) => b.score - a.score);

  const needsAction = (dist.critical || 0) + (dist.high || 0);
  const avgScore = assessments.length
    ? (assessments.reduce((s, a) => s + a.score, 0) / assessments.length * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top row: Summary left, Chart right */}
      <div className="flex gap-4">
        {/* Left — Summary panel */}
        <div className="w-1/2 card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-clinical-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Risk Dashboard</h2>
                  <p className="text-xs text-gray-500">{assessments.length} patients assessed</p>
                </div>
              </div>
              {!isDemoMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAssessAll}
                    disabled={batchRunning}
                    className="btn-primary text-xs !px-3 !py-1.5"
                  >
                    {batchRunning ? "Assessing..." : "Assess All"}
                  </button>
                  <button
                    onClick={refetch}
                    className="btn-secondary text-xs !px-3 !py-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {batchResult && (
              <div className="bg-clinical-50 border border-clinical-200 rounded-lg px-3 py-1.5 text-xs text-clinical-800 mb-3">
                {batchResult}
              </div>
            )}

            {/* Risk counts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(["critical", "high", "medium", "low"] as const).map((band) => (
                <div
                  key={band}
                  className="rounded-lg p-2.5 text-center border-l-4"
                  style={{
                    backgroundColor: BAND_COLORS[band] + "10",
                    borderLeftColor: BAND_COLORS[band],
                  }}
                >
                  <p className="text-2xl font-bold leading-tight" style={{ color: BAND_COLORS[band] }}>
                    {dist[band] || 0}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                    {band}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Patients needing action</span>
              <span className="font-semibold text-red-600">{needsAction}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Average risk score</span>
              <span className="font-semibold text-gray-700">{avgScore}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Panel health</span>
              <span className={`font-semibold ${
                Number(avgScore) < 30 ? "text-green-600" : Number(avgScore) < 50 ? "text-yellow-600" : "text-red-600"
              }`}>
                {Number(avgScore) < 30 ? "Good" : Number(avgScore) < 50 ? "Needs Attention" : "At Risk"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Measures tracked</span>
              <span className="font-semibold text-gray-700">CMS165, CMS122</span>
            </div>
          </div>
        </div>

        {/* Right — Chart */}
        <div className="w-1/2 card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Risk Distribution</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <defs>
                  {Object.entries(BAND_GRADIENTS).map(([key, [light, dark]]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={light} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={dark} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="band"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={`url(#grad-${entry.key})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">
            All Patients by Risk
          </h3>
          <span className="text-xs text-gray-400 font-normal">({sorted.length})</span>
        </div>
        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((a) => (
              <PatientRiskCard key={a.id} assessment={a} />
            ))}
          </div>
        ) : (
          <EmptyState
            preset="assessments"
            action={{ label: "Assess All Patients", onClick: handleAssessAll }}
          />
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex gap-4">
        <div className="w-1/2 card p-5 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-10 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <Skeleton className="h-px w-full" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
        <div className="w-1/2 card p-5">
          <Skeleton className="h-5 w-32 mb-3" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-5 w-36" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      <button onClick={onRetry} className="btn-secondary text-xs">
        Retry
      </button>
    </div>
  );
}
