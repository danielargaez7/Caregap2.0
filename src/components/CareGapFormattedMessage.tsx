"use client";
import React from "react";
import { Mail, ListChecks, Activity } from "lucide-react";

/* ── Risk level styling ── */
const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", dot: "bg-green-500" },
};

/* ── Inline formatting (**bold** and _underline_) ── */
function FormatLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
          return <span key={i} style={{ textDecoration: "underline" }}>{part.slice(1, -1)}</span>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/* ── Quick action buttons ── */
const OFFER_ACTIONS = [
  { label: "Send Calls & Emails", Icon: Mail, message: "Send automated calls and emails to all critical and high-risk patients", exclude: /outreach completed|calls.*emails have been sent/i },
  { label: "Create Followups", Icon: ListChecks, message: "Create follow-up tasks for the critical and high-risk patients", exclude: /follow-up tasks created|tasks? created for/i },
  { label: "Run Full Assessment", Icon: Activity, message: "Run a full risk assessment on all patients in the panel", exclude: /full risk assessment completed/i },
];

/* ── Block types ── */
interface TextBlock { type: "text"; content: string }
interface RiskHeaderBlock { type: "risk_header"; level: string; label: string }
interface PatientCardBlock { type: "patient_card"; lines: string[] }

type Block = TextBlock | RiskHeaderBlock | PatientCardBlock;

/* ── Detect risk level from line ── */
function getRiskLevel(line: string): string | null {
  const upper = line.toUpperCase().trim();
  if (upper.startsWith("CRITICAL")) return "critical";
  if (upper.startsWith("HIGH")) return "high";
  if (upper.startsWith("MEDIUM")) return "medium";
  if (upper.startsWith("LOW")) return "low";
  return null;
}

/* ── Detect numbered patient line ── */
function isPatientLine(line: string): boolean {
  return /^\d+\.\s+\*?\*/.test(line.trim());
}

/* ── Detect insurance/cost line ── */
function isInsuranceLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return (
    lower.startsWith("medicare") ||
    lower.startsWith("medicaid") ||
    lower.startsWith("commercial") ||
    lower.startsWith("insurance:")
  );
}

/* ── Section header detection ── */
function isSectionHeader(line: string): boolean {
  const headers = [
    "summary", "key patterns", "next steps", "what this means",
    "recommendations", "action items", "panel overview", "outreach summary",
    "follow-up summary", "task summary",
  ];
  const lower = line.trim().toLowerCase().replace(/:$/, "");
  return headers.includes(lower);
}

/* ── Parse content into blocks ── */
function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Risk level header
    const risk = getRiskLevel(trimmed);
    if (risk && trimmed.includes("—")) {
      blocks.push({ type: "risk_header", level: risk, label: trimmed });
      continue;
    }

    // Patient line (with possible continuation lines)
    if (isPatientLine(trimmed)) {
      const cardLines = [trimmed];
      // Collect continuation lines (indented, insurance, or non-blank non-header non-numbered)
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const nextTrimmed = next.trim();
        if (!nextTrimmed) break;
        if (getRiskLevel(nextTrimmed) && nextTrimmed.includes("—")) break;
        if (isPatientLine(nextTrimmed)) break;
        if (isSectionHeader(nextTrimmed)) break;
        cardLines.push(nextTrimmed);
        i++;
      }
      blocks.push({ type: "patient_card", lines: cardLines });
      continue;
    }

    blocks.push({ type: "text", content: trimmed });
  }

  return blocks;
}

/* ── Group blocks into render groups ── */
interface RiskGroup { type: "risk_group"; level: string; label: string; cards: PatientCardBlock[] }
interface TextGroup { type: "text_group"; block: TextBlock }
interface CardGroup { type: "card_group"; block: PatientCardBlock }

type RenderGroup = RiskGroup | TextGroup | CardGroup;

function groupBlocks(blocks: Block[]): RenderGroup[] {
  const groups: RenderGroup[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.type === "risk_header") {
      const cards: PatientCardBlock[] = [];
      while (i + 1 < blocks.length && blocks[i + 1].type === "patient_card") {
        cards.push(blocks[i + 1] as PatientCardBlock);
        i++;
      }
      groups.push({ type: "risk_group", level: block.level, label: block.label, cards });
    } else if (block.type === "patient_card") {
      groups.push({ type: "card_group", block });
    } else {
      groups.push({ type: "text_group", block });
    }
  }

  return groups;
}

/* ── Main component ── */
export default function CareGapFormattedMessage({
  content,
  onAction,
  completedActions,
}: {
  content: string;
  onAction?: (message: string) => void;
  completedActions?: string[];
}) {
  const blocks = parseBlocks(content);
  const groups = groupBlocks(blocks);

  return (
    <div className="space-y-3 text-sm text-gray-900">
      {groups.map((group, gi) => {
        // Risk group with patient cards
        if (group.type === "risk_group") {
          const style = RISK_STYLES[group.level] || RISK_STYLES.medium;
          return (
            <div key={gi} className={`rounded-lg border ${style.border} ${style.bg}`}>
              <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${style.border}`}>
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`font-semibold text-xs uppercase tracking-wide ${style.text}`}>
                  {group.label}
                </span>
              </div>
              <div className="p-1.5 space-y-1.5">
                {group.cards.map((card, ci) => (
                  <div key={ci} className="border border-gray-200 rounded-md px-3 py-2 bg-white">
                    {card.lines.map((line, li) => {
                      if (li === 0) {
                        return (
                          <p key={li} className="text-sm">
                            <FormatLine text={line} />
                          </p>
                        );
                      }
                      if (isInsuranceLine(line)) {
                        return (
                          <p key={li} className="text-xs text-gray-500 pl-4 mt-0.5">
                            <FormatLine text={line} />
                          </p>
                        );
                      }
                      return (
                        <p key={li} className="text-sm pl-4 mt-0.5">
                          <FormatLine text={line} />
                        </p>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Standalone patient card
        if (group.type === "card_group") {
          return (
            <div key={gi} className="border border-gray-200 rounded-md px-3 py-2 bg-white">
              {group.block.lines.map((line, li) => (
                <p key={li} className={li === 0 ? "text-sm" : "text-sm pl-4 mt-0.5"}>
                  <FormatLine text={line} />
                </p>
              ))}
            </div>
          );
        }

        // Text block
        const text = group.block.content;

        // Section header
        if (isSectionHeader(text)) {
          return (
            <p key={gi} className="font-semibold text-gray-800 text-sm border-b border-gray-200 pb-1 mt-2">
              <FormatLine text={text} />
            </p>
          );
        }

        // Quick action offer
        if (text.toLowerCase().startsWith("would you like me to")) {
          const available = OFFER_ACTIONS.filter((a) => !a.exclude.test(content) && !(completedActions || []).includes(a.label));
          if (available.length === 0) return null;
          return (
            <div key={gi} className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 mb-2">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                {available.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => onAction?.(action.message)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                  >
                    <action.Icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        // Bullet point
        if (text.startsWith("- ") || text.startsWith("* ") || text.startsWith("\u2022 ")) {
          return (
            <div key={gi} className="flex gap-2 text-sm pl-1">
              <span className="text-gray-400 mt-1">&#8226;</span>
              <span><FormatLine text={text.slice(2)} /></span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={gi} className="text-sm">
            <FormatLine text={text} />
          </p>
        );
      })}
    </div>
  );
}
