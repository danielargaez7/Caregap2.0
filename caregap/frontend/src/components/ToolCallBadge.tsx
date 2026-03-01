import { useState } from "react";
import type { ToolCallInfo } from "../types";
import { Settings, ChevronDown, Clock } from "lucide-react";

interface Props {
  toolCalls: ToolCallInfo[];
}

export default function ToolCallBadge({ toolCalls }: Props) {
  const [open, setOpen] = useState(false);

  if (!toolCalls.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-200/60 hover:bg-gray-200 rounded-full transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        {toolCalls.length} tool call{toolCalls.length !== 1 ? "s" : ""}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-400 select-none">
                {i === toolCalls.length - 1 ? "\u2514\u2500" : "\u251C\u2500"}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-clinical-600 font-semibold">
                  {tc.tool}
                </span>
                <span className="text-gray-400 ml-1">
                  ({formatInput(tc.input)})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-gray-400 whitespace-nowrap">
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

function formatInput(input: Record<string, unknown>): string {
  const entries = Object.entries(input);
  if (!entries.length) return "";
  return entries
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ");
}
