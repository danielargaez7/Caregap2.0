"use client";
import { useState } from "react";
import { Settings, ChevronDown, Clock } from "lucide-react";

export interface ToolCallInfo {
  tool: string;
  input: Record<string, unknown>;
  duration_ms: number;
}

function formatInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ");
}

export default function CareGapToolCallBadge({ toolCalls }: { toolCalls: ToolCallInfo[] }) {
  const [open, setOpen] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
        style={{
          background: open ? "rgba(148,163,184,0.25)" : "rgba(148,163,184,0.15)",
          color: "#64748b",
        }}
      >
        <Settings className="w-3 h-3" />
        {toolCalls.length} tool call{toolCalls.length !== 1 ? "s" : ""}
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="flex items-start gap-2 py-1.5"
              style={{
                borderBottom: i < toolCalls.length - 1 ? "1px solid #e5e7eb" : "none",
              }}
            >
              <span className="text-gray-400 select-none font-mono text-[11px]" style={{ minWidth: 16 }}>
                {i === toolCalls.length - 1 ? "\u2514\u2500" : "\u251C\u2500"}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold" style={{ color: "#0d9488" }}>
                  {tc.tool}
                </span>
                {formatInput(tc.input) && (
                  <span className="text-gray-400 ml-1">({formatInput(tc.input)})</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-gray-400">
                <Clock className="w-3 h-3" />
                {tc.duration_ms}ms
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
