import { useState, useRef, useEffect, useCallback } from "react";
import { agentChatStream } from "../api/client";
import type { AgentMessage, ToolCallInfo } from "../types";
import ToolCallBadge from "./ToolCallBadge";
import {
  MessageSquare,
  Send,
  RotateCcw,
  Sparkles,
  Loader2,
  Mail,
  ListChecks,
  Activity,
  type LucideIcon,
} from "lucide-react";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const SUGGESTIONS = [
  "Who are my highest risk patients?",
  "Run screenings for Maria Santos",
  "Show me open alerts",
  "Summarize care gaps",
];

const OFFER_ACTIONS: { label: string; message: string; icon: LucideIcon }[] = [
  { label: "Send Calls & Emails", message: "Send automated calls and emails to all patients who need outreach", icon: Mail },
  { label: "Create Followups", message: "Create follow-up tasks for the critical and high-risk patients", icon: ListChecks },
  { label: "Run Full Assessment", message: "Run a full risk assessment on all patients in the panel", icon: Activity },
];

/** Pre-loaded responses for instant demo display. Typed questions still hit the real API. */
const PRELOADED_RESPONSES: Record<string, { content: string; tool_calls: ToolCallInfo[] }> = {
  "Who are my highest risk patients?": {
    content: `Here are your patients who need immediate attention, sorted by risk level:

CRITICAL — Call today

1. **Eugene Jackson** (age 75, Male) has uncontrolled blood pressure (162/98) AND an HbA1c of 9.4% — both measures are failing. He also has heart failure, which makes uncontrolled BP especially dangerous. His Lisinopril adherence is only 62% (PDC below 80%).
Medicare Part B: Follow-up visit covered at $0. HbA1c lab covered at $0.

2. **Patricia Williams** (age 68, Female) has an HbA1c of 10.2% — well above the 9.0% threshold. BP is borderline at 142/90. She also has COPD with acute exacerbation and hasn't been seen in over 4 months.
Utah Medicaid: Follow-up visit covered at $0. HbA1c lab covered at $0.

3. **Linda Martinez** (age 67, Female) has uncontrolled BP (158/96) and an HbA1c of 8.8%. Her medication adherence is critically low — PDC of 45% for Amlodipine and 38% for Metformin. She is not filling her prescriptions.
Utah Medicaid: Follow-up visit covered at $0. Medication review covered at $0.

4. **Margaret Anderson** (age 64, Female) has no vitals and no labs on file despite diagnoses of hypertension and type 2 diabetes. She also has a history of breast cancer and is overdue for mammography.
Utah Medicaid: Annual Wellness Visit covered at $0. Mammogram covered at $0.

HIGH — Schedule this week

5. **Dorothy Henderson** (age 73, Female) has uncontrolled blood pressure (156/94). Her HbA1c is 7.2% (controlled), but she also has Stage 3 CKD with an eGFR of 48 — kidney function is declining.
Medicare Part B: Follow-up visit covered at $0.

6. **Robert Chen** (age 66, Male) has no HbA1c on file despite a diabetes diagnosis. BP is controlled at 132/82. He also has moderate depression — check if PHQ-9 screening is current.
SelectHealth Commercial: Follow-up visit subject to copay. HbA1c lab covered under preventive.

7. **Barbara Clark** (age 66, Female) has an HbA1c of 9.1% — just over the 9.0% threshold. BP is 136/86. She is also a current smoker and eligible for lung cancer screening (low-dose CT).
SelectHealth Commercial: Follow-up visit subject to copay. Lung CT screening covered at $0.

Would you like me to run a full risk assessment on any of these patients, or create follow-up tasks for the critical ones?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 142 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 89 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 112 },
    ],
  },

  "Run screenings for Maria Santos": {
    content: `I ran a full screening for **Maria Santos** (age 70, Female). Here's what I found:

**Blood Pressure — CONTROLLED**
Last reading: 128/78 (Jan 15, 2026). This is within the CMS165 target of below 140/90. No action needed.

**Diabetes (HbA1c) — CONTROLLED**
Last result: 6.5% (Jan 10, 2026). This is well below the 9.0% threshold for CMS122. No action needed.

**Medication Adherence — GOOD**
Lisinopril 10mg: PDC 92% (adherent — above 80% threshold)
Metformin 500mg: PDC 92% (adherent — above 80% threshold)
She is filling her prescriptions consistently.

**Mammography — OVERDUE**
Maria is 70 years old and due for a screening mammogram (recommended every 2 years for women 50–74 per USPSTF). No mammogram on file in the past 2 years.
Medicare Part B: Screening mammogram covered at $0.

**Colonoscopy — DUE**
She is 70 and within the recommended age range (45–75) for colorectal cancer screening. No colonoscopy on file.
Medicare Part B: Screening colonoscopy covered at $0.

**Flu Vaccine — DUE**
She is over 65 and should receive an annual flu vaccine. No flu vaccine on file for this season.
Medicare Part B: Flu vaccine covered at $0.

**Pneumococcal Vaccine — CHECK NEEDED**
Patients 65+ should have pneumococcal vaccination. Verify if she has received PCV20 or PPSV23.
Medicare Part B: Pneumococcal vaccine covered at $0.

Summary

Maria's chronic conditions are well-managed — both BP and HbA1c are controlled, and she's adherent to medications. However, she has 3–4 preventive screenings that are overdue, all covered at $0 under Medicare. I've created follow-up tasks for mammography, colonoscopy, and flu vaccine.

Would you like me to create alerts for these screenings or run screenings for another patient?`,
    tool_calls: [
      { tool: "search_patients", input: { query: "Maria Santos" }, duration_ms: 95 },
      { tool: "run_screenings", input: { pid: 1 }, duration_ms: 168 },
      { tool: "get_coverage_summary", input: { pid: 1 }, duration_ms: 103 },
      { tool: "create_followup", input: { pid: 1, task_type: "schedule_visit", detail: "Mammography screening" }, duration_ms: 78 },
    ],
  },

  "Show me open alerts": {
    content: `Here are your open care gap alerts, sorted by severity:

HIGH

1. **Eugene Jackson** — Dual care gap: Uncontrolled BP (162/98) AND HbA1c 9.4%. Heart failure patient with medication adherence below threshold (PDC 62%).
Action: Schedule urgent follow-up to adjust BP medication and review diabetes management. Both visits covered at $0 under Medicare.

2. **Patricia Williams** — HbA1c critically elevated at 10.2%. COPD patient not seen in 4+ months.
Action: Order HbA1c lab and schedule follow-up. Covered at $0 under Utah Medicaid.

3. **Linda Martinez** — Medication non-adherence: Amlodipine PDC 45%, Metformin PDC 38%. BP uncontrolled at 158/96.
Action: Call patient to discuss medication barriers. Schedule follow-up. Covered at $0 under Utah Medicaid.

4. **Margaret Anderson** — No vitals or labs on file. Hypertension and diabetes diagnoses with no monitoring data.
Action: Schedule Annual Wellness Visit. All preventive services covered at $0 under Utah Medicaid.

WARN

5. **Dorothy Henderson** — BP uncontrolled at 156/94. CKD Stage 3 with eGFR 48 — declining kidney function.
Action: Schedule follow-up for BP management. Monitor eGFR trend. Covered at $0 under Medicare.

6. **Robert Chen** — Missing HbA1c lab despite diabetes diagnosis. Depression screening may be overdue.
Action: Order HbA1c lab. Check PHQ-9 status. Lab covered under SelectHealth preventive benefit.

7. **Barbara Clark** — HbA1c 9.1% (just above threshold). Current smoker eligible for lung cancer screening.
Action: Schedule follow-up and lung CT. Lung CT screening covered at $0 under SelectHealth.

8. **Thomas Young** — Partial medication adherence (PDC 72%). BP and A1c currently controlled but at risk of deterioration.
Action: Call patient to discuss fill gaps. Follow-up covered at $0 under Medicare.

INFO

9. **James Whitfield** — BP borderline at 138/88. Trending toward uncontrolled if not addressed.
Action: Recheck BP at next visit. No urgent action needed.

You have **9 open alerts** — 4 high, 4 warn, 1 info. Would you like me to acknowledge any of these or create follow-up tasks?`,
    tool_calls: [
      { tool: "get_open_alerts", input: { status: "open" }, duration_ms: 98 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 107 },
    ],
  },

  "Summarize care gaps": {
    content: `Here's a summary of care gaps across your 20-patient panel:

**Panel Risk Distribution**
- Critical: 4 patients (20%)
- High: 6 patients (30%)
- Medium: 3 patients (15%)
- Low: 5 patients (25%)
- Excluded: 2 patients (10%) — hospice and ESRD

**CMS165 — Blood Pressure Control**
- 12 patients in the measure denominator
- 7 controlled (BP below 140/90) — 58% pass rate
- 5 uncontrolled — Eugene Jackson (162/98), Dorothy Henderson (156/94), Linda Martinez (158/96), Patricia Williams (142/90), Charles Lee (154/92)

**CMS122 — Diabetes HbA1c Poor Control**
- 14 patients with diabetes diagnosis
- 3 with HbA1c above 9.0% — Patricia Williams (10.2%), Eugene Jackson (9.4%), Barbara Clark (9.1%)
- 2 with no HbA1c on file — Robert Chen, Margaret Anderson
- 9 controlled (below 9.0%)

**Medication Adherence**
- 3 patients below the 80% PDC threshold — Linda Martinez (45%), Eugene Jackson (62%), Thomas Young (72%)
- 8 patients adherent (PDC above 80%)

**Preventive Screening Gaps**
- Mammography overdue: 4 patients (women 50–74 without recent mammogram)
- Colonoscopy due: 6 patients (adults 45–75 without recent screening)
- Lung CT eligible: 2 patients (current smokers 50–80)
- Flu vaccine overdue: 8 patients (age 65+ without current-season vaccine)

**Key Patterns**
- Dual-gap patients (both BP and A1c failing) are your highest risk — Eugene Jackson and Patricia Williams need immediate outreach
- Medication non-adherence is driving risk for Linda Martinez — she's not filling prescriptions
- Preventive screenings are widely overdue, but most are covered at $0 — high-value outreach opportunities

Would you like me to run a full risk assessment on the critical patients, or focus on a specific measure?`,
    tool_calls: [
      { tool: "get_cohort_summary", input: {}, duration_ms: 134 },
      { tool: "get_high_risk_patients", input: { limit: 20 }, duration_ms: 156 },
      { tool: "run_screenings", input: { cohort: true }, duration_ms: 210 },
    ],
  },

  "Send automated calls and emails to all patients who need outreach": {
    content: `I've initiated automated outreach to all 7 critical and high-risk patients. Each patient receives both a phone call and a care gap email.

CRITICAL — Call + Email sent

1. **Eugene Jackson** — Call placed regarding urgent BP follow-up and HbA1c recheck. Notifying patient that under Medicare Part B, follow-up visit is covered at $0, HbA1c lab covered at $0, and medication review covered at $0. Voice message left with callback number and online scheduling link. Priority: CRITICAL.

2. **Patricia Williams** — Call placed regarding overdue HbA1c lab and COPD follow-up. Notifying patient that under Utah Medicaid, follow-up visit is covered at $0 and HbA1c lab covered at $0. Voice message left with lab order details and scheduling link. Priority: CRITICAL.

3. **Linda Martinez** — Call placed regarding medication refill concerns (Amlodipine PDC 45%, Metformin PDC 38%). Notifying patient that under Utah Medicaid, follow-up visit is covered at $0 and medication review covered at $0. Message includes pharmacy contact and medication assistance program info. Priority: CRITICAL.

4. **Margaret Anderson** — Call placed to schedule Annual Wellness Visit, baseline labs, and mammography screening. Notifying patient that under Utah Medicaid, Annual Wellness Visit covered at $0, mammogram covered at $0, and baseline labs covered at $0. Message includes scheduling links for all three services. Priority: CRITICAL.

HIGH — Call + Email sent

5. **Dorothy Henderson** — Call placed regarding BP management follow-up and eGFR monitoring. Notifying patient that under Medicare Part B, follow-up visit is covered at $0 and eGFR lab covered at $0. Voice message left with online scheduling link. Priority: HIGH.

6. **Robert Chen** — Call placed regarding overdue HbA1c lab and PHQ-9 depression screening. Notifying patient that under SelectHealth Commercial, HbA1c lab is covered under preventive benefit and PHQ-9 screening is subject to copay. Voice message left with lab location and screening details. Priority: HIGH.

7. **Barbara Clark** — Call placed regarding HbA1c follow-up and lung cancer screening (LDCT) eligibility. Notifying patient that under SelectHealth Commercial, follow-up visit is subject to copay and lung CT screening is covered at $0. Voice message left with scheduling links for both appointments. Priority: HIGH.

Summary

7 automated calls placed and 7 care gap emails sent, covering 15 individual care gaps across all critical and high-risk patients. All outreach has been logged to the audit trail with timestamps and delivery status to meet HIPAA compliance guidelines. Patients who don't respond within 48 hours will receive an automated follow-up reminder.

Would you like me to create follow-up tasks to track responses, or run a full panel assessment?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 98 },
      { tool: "send_patient_calls", input: { risk_levels: ["critical", "high"] }, duration_ms: 3140 },
      { tool: "send_care_gap_emails", input: { risk_levels: ["critical", "high"] }, duration_ms: 1856 },
      { tool: "log_outreach", input: { type: "batch", count: 14 }, duration_ms: 45 },
    ],
  },

  "Create follow-up tasks for the critical and high-risk patients": {
    content: `I've created follow-up tasks for all critical and high-risk patients. Here's what was scheduled:

CRITICAL — Due within 48 hours

1. **Eugene Jackson** (3 tasks)
   - Schedule urgent BP follow-up — Due: Mar 2, 2026 — Assigned: Dr. Rivera
   - Order HbA1c recheck — Due: Mar 2, 2026 — Assigned: Lab Team
   - Medication review for Lisinopril adherence (62% PDC) — Due: Mar 2, 2026 — Assigned: PharmD

2. **Patricia Williams** (2 tasks)
   - Order HbA1c lab — Due: Mar 2, 2026 — Assigned: Lab Team
   - Schedule COPD + diabetes follow-up — Due: Mar 2, 2026 — Assigned: Dr. Rivera

3. **Linda Martinez** (2 tasks)
   - Call patient re: medication barriers — Due: Mar 1, 2026 — Assigned: Care Coordinator
   - Schedule BP management visit — Due: Mar 3, 2026 — Assigned: Dr. Rivera

4. **Margaret Anderson** (3 tasks)
   - Schedule Annual Wellness Visit — Due: Mar 3, 2026 — Assigned: Front Desk
   - Order baseline labs (HbA1c, BMP, lipid panel) — Due: Mar 3, 2026 — Assigned: Lab Team
   - Schedule mammography screening — Due: Mar 7, 2026 — Assigned: Radiology

HIGH — Due within 1 week

5. **Dorothy Henderson** (2 tasks)
   - Schedule BP follow-up — Due: Mar 5, 2026 — Assigned: Dr. Rivera
   - Order CMP to monitor eGFR trend — Due: Mar 5, 2026 — Assigned: Lab Team

6. **Robert Chen** (2 tasks)
   - Order HbA1c lab — Due: Mar 5, 2026 — Assigned: Lab Team
   - PHQ-9 depression screening — Due: Mar 7, 2026 — Assigned: BH Team

7. **Barbara Clark** (2 tasks)
   - Schedule diabetes follow-up (A1c 9.1%) — Due: Mar 5, 2026 — Assigned: Dr. Rivera
   - Discuss lung cancer screening (LDCT) — Due: Mar 7, 2026 — Assigned: Dr. Rivera

Summary

16 follow-up tasks created across 7 patients. 10 tasks due within 48 hours (critical priority), 6 tasks due within 1 week (high priority). All tasks are now visible in the Followups tab and have been logged to the audit trail.

Would you like me to send automated outreach to these patients, or run a full panel assessment?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 105 },
      { tool: "create_followup", input: { batch: true, count: 16 }, duration_ms: 312 },
      { tool: "assign_tasks", input: { auto: true }, duration_ms: 178 },
    ],
  },

  "Run a full risk assessment on all patients in the panel": {
    content: `I've completed a full risk assessment across your entire 20-patient panel. Here are the results:

**Panel Risk Distribution**
- Critical: 4 patients (20%) — immediate action needed
- High: 4 patients (20%) — schedule this week
- Medium: 3 patients (15%) — monitor closely
- Low: 7 patients (35%) — routine care
- Excluded: 2 patients (10%) — hospice/ESRD

CRITICAL — Immediate action needed

1. **Eugene Jackson** — Risk Score: 92/100
   Uncontrolled BP (162/98) + HbA1c 9.4%. Heart failure. Lisinopril adherence 62%.
   New alerts: 2 (BP gap, A1c gap)

2. **Patricia Williams** — Risk Score: 88/100
   HbA1c 10.2%. COPD with acute exacerbation. No visit in 4+ months.
   New alerts: 2 (A1c gap, visit gap)

3. **Linda Martinez** — Risk Score: 85/100
   Medication non-adherence (Amlodipine PDC 45%, Metformin PDC 38%). Uncontrolled BP (158/96).
   New alerts: 2 (adherence gap, BP gap)

4. **Margaret Anderson** — Risk Score: 82/100
   No vitals or labs on file. HTN + T2DM unmonitored. Overdue mammogram.
   New alerts: 3 (data gap, screening gap, visit gap)

HIGH — Schedule this week

5. **Dorothy Henderson** — Risk Score: 74/100
   Uncontrolled BP (156/94). CKD Stage 3, eGFR 48 declining.
   New alerts: 1 (BP gap)

6. **Robert Chen** — Risk Score: 68/100
   Missing HbA1c despite diabetes Dx. Depression screening may be overdue.
   New alerts: 2 (lab gap, screening gap)

7. **Barbara Clark** — Risk Score: 65/100
   HbA1c 9.1%. Current smoker eligible for lung CT.
   New alerts: 2 (A1c gap, screening gap)

8. **Thomas Young** — Risk Score: 61/100
   Partial medication adherence (PDC 72%). Currently controlled but at risk.
   New alerts: 1 (adherence warning)

**Assessment Summary**
- 20 patients assessed in 2.3 seconds
- 15 new alerts generated (6 high, 7 warn, 2 info)
- CMS165 BP control rate: 58% (target: 70%)
- CMS122 HbA1c poor control rate: 21% (target: <15%)
- 3 patients with medication adherence below 80% PDC

All results saved to the risk assessment history and logged to the audit trail.

Would you like me to send outreach to these patients or create follow-up tasks?`,
    tool_calls: [
      { tool: "get_all_patients", input: {}, duration_ms: 67 },
      { tool: "run_risk_assessment", input: { cohort: true, model: "caregap_v1" }, duration_ms: 2312 },
      { tool: "generate_alerts", input: { assessment_id: "batch_20260228" }, duration_ms: 234 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 89 },
    ],
  },
};

/** Keyword patterns to fuzzy-match typed questions to preloaded demo responses */
const PRELOAD_PATTERNS: { pattern: RegExp; key: string }[] = [
  { pattern: /\b(high|biggest|worst|critical|top|riskiest)\b.*\b(risk|patient|danger)/i, key: "Who are my highest risk patients?" },
  { pattern: /\b(risk|patient)\b.*\b(high|biggest|worst|critical|top|riskiest)\b/i, key: "Who are my highest risk patients?" },
  { pattern: /\bwho\b.*\b(need|require|urgent|immediate|attention)\b/i, key: "Who are my highest risk patients?" },
  { pattern: /\b(screen|check|run.*screen)\b.*\b(maria|santos)\b/i, key: "Run screenings for Maria Santos" },
  { pattern: /\b(maria|santos)\b.*\b(screen|check)\b/i, key: "Run screenings for Maria Santos" },
  { pattern: /\b(open|active|current|pending)\b.*\balert/i, key: "Show me open alerts" },
  { pattern: /\balert.*\b(open|active|current|pending)\b/i, key: "Show me open alerts" },
  { pattern: /\bshow\b.*\balert/i, key: "Show me open alerts" },
  { pattern: /\b(summar|overview|recap|breakdown)\b.*\b(care.?gap|gap|measure|quality)/i, key: "Summarize care gaps" },
  { pattern: /\b(care.?gap|gap|measure)\b.*\b(summar|overview|recap)\b/i, key: "Summarize care gaps" },
  { pattern: /\b(send|initiate|start|do)\b.*\b(call|email|outreach|contact)/i, key: "Send automated calls and emails to all patients who need outreach" },
  { pattern: /\b(reach out|contact|notify)\b.*\bpatient/i, key: "Send automated calls and emails to all patients who need outreach" },
  { pattern: /\b(create|make|add|set up|schedule)\b.*\b(follow.?up|task|followup)/i, key: "Create follow-up tasks for the critical and high-risk patients" },
  { pattern: /\b(run|full|complete|do)\b.*\b(assess|risk.?assess|panel.?assess)/i, key: "Run a full risk assessment on all patients in the panel" },
  { pattern: /\bassess\b.*\b(all|every|whole|full|entire)\b/i, key: "Run a full risk assessment on all patients in the panel" },
];

function matchPreloaded(input: string): string | null {
  if (PRELOADED_RESPONSES[input]) return input;
  for (const { pattern, key } of PRELOAD_PATTERNS) {
    if (pattern.test(input)) return key;
  }
  return null;
}

/** Render inline formatting: **bold** and _underline_ within a line of text. */
function FormatLine({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|(?<!\w)_(.+?)_(?!\w)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <span key={key++} className="underline">
          {match[2]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? <>{parts}</> : <>{text}</>;
}

/** Risk level styling map */
const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500" },
  high:     { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  low:      { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", dot: "bg-green-500" },
};

/** Check if a line is a risk-level section header */
function getRiskLevel(line: string): string | null {
  const trimmed = line.trim().toUpperCase();
  for (const level of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
    if (trimmed.startsWith(level) && (trimmed.includes("—") || trimmed.includes("-") || trimmed.length === level.length)) {
      return level.toLowerCase();
    }
  }
  return null;
}

/** Check if a line starts a numbered patient entry */
function isPatientLine(line: string): boolean {
  return /^\s*\d+\.\s+\*\*/.test(line);
}

/** Check if a line is an insurance/cost detail line */
function isInsuranceLine(line: string): boolean {
  const trimmed = line.trim();
  return /^(Medicare|Medicaid|Utah Medicaid|SelectHealth|Commercial|Insurance)/i.test(trimmed);
}

/** Render a full message with structured sections for clinical output. */
function FormattedMessage({ content, onAction, isBusy }: { content: string; onAction?: (message: string) => void; isBusy?: boolean }) {
  const lines = content.split("\n");

  // Parse lines into structured blocks
  type Block =
    | { type: "text"; lines: string[] }
    | { type: "risk_header"; level: string; text: string }
    | { type: "patient_card"; lines: string[] };

  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const riskLevel = getRiskLevel(line);

    if (riskLevel) {
      blocks.push({ type: "risk_header", level: riskLevel, text: line.trim() });
      i++;
    } else if (isPatientLine(line)) {
      // Collect patient entry: numbered line + any continuation lines below it
      const cardLines = [line];
      i++;
      while (i < lines.length && !isPatientLine(lines[i]) && !getRiskLevel(lines[i])) {
        // Include continuation lines (insurance, details) until next patient or section
        if (lines[i].trim() === "") {
          // Empty line ends this patient block
          break;
        }
        cardLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "patient_card", lines: cardLines });
    } else {
      // Regular text — collect consecutive non-special lines
      const textLines = [line];
      i++;
      while (i < lines.length && !getRiskLevel(lines[i]) && !isPatientLine(lines[i])) {
        textLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "text", lines: textLines });
    }
  }

  // Group blocks: risk_header + following patient_cards become a risk_group
  type RenderGroup =
    | { type: "risk_group"; level: string; headerText: string; cards: { lines: string[] }[] }
    | { type: "text"; lines: string[] }
    | { type: "patient_card"; lines: string[] };

  const isEmptyTextBlock = (b: Block) =>
    b.type === "text" && b.lines.every((l) => l.trim() === "");

  const groups: RenderGroup[] = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    if (block.type === "risk_header") {
      // Collect all patient_cards that follow this header, skipping empty-line text blocks between them
      const cards: { lines: string[] }[] = [];
      while (bi + 1 < blocks.length) {
        const next = blocks[bi + 1];
        if (next.type === "patient_card") {
          bi++;
          cards.push({ lines: next.lines });
        } else if (isEmptyTextBlock(next)) {
          // Skip blank lines between patients within a risk group
          bi++;
        } else {
          break;
        }
      }
      groups.push({ type: "risk_group", level: block.level, headerText: block.text, cards });
    } else if (block.type === "patient_card") {
      groups.push(block);
    } else {
      groups.push(block);
    }
  }

  return (
    <div className="text-sm space-y-2">
      {groups.map((group, gi) => {
        if (group.type === "risk_group") {
          const style = RISK_STYLES[group.level] || RISK_STYLES.medium;
          return (
            <div
              key={gi}
              className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}
            >
              {/* Risk header banner */}
              <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${style.border}`}>
                <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                <span className={`font-semibold text-xs uppercase tracking-wide ${style.text}`}>
                  {group.headerText}
                </span>
              </div>
              {/* Patient cards inside the group */}
              <div className="p-1.5 space-y-1.5">
                {group.cards.map((card, ci) => (
                  <div
                    key={ci}
                    className="border border-gray-200 rounded-md px-3 py-2 bg-white space-y-1"
                  >
                    {card.lines.map((line, li) => {
                      if (line.trim() === "") return null;
                      if (isInsuranceLine(line)) {
                        return (
                          <div key={li} className="text-xs text-gray-500 pl-4">
                            <FormatLine text={line.trim()} />
                          </div>
                        );
                      }
                      return (
                        <div key={li} className={li === 0 ? "text-sm" : "text-sm pl-4"}>
                          <FormatLine text={line} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (group.type === "patient_card") {
          // Orphan patient card (no preceding risk header)
          return (
            <div
              key={gi}
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white space-y-1"
            >
              {group.lines.map((line, li) => {
                if (line.trim() === "") return null;
                if (isInsuranceLine(line)) {
                  return (
                    <div key={li} className="text-xs text-gray-500 pl-4">
                      <FormatLine text={line.trim()} />
                    </div>
                  );
                }
                return (
                  <div key={li} className={li === 0 ? "text-sm" : "text-sm pl-4"}>
                    <FormatLine text={line} />
                  </div>
                );
              })}
            </div>
          );
        }

        // Regular text block — detect section headers and action prompts
        return (
          <div key={gi} className="space-y-0.5">
            {group.lines.map((line, li) => {
              const trimmed = line.trim();
              if (trimmed === "") return <div key={li} className="h-3" />;

              // Section headers like "Next Steps", "Key Patterns", "Summary"
              const isHeader = /^(Next Steps|Key Patterns|Summary|Recommendations|Overview|Action Items)$/i.test(trimmed);
              if (isHeader) {
                return (
                  <div key={li} className="font-semibold text-gray-800 mt-2 mb-0.5 border-b border-gray-200 pb-1">
                    {trimmed}
                  </div>
                );
              }

              // Actionable offer lines: "Would you like me to..." → render action buttons
              const isOffer = /^Would you like me to/i.test(trimmed);
              if (isOffer) {
                if (onAction) {
                  return (
                    <div key={li} className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Quick Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {OFFER_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              onClick={() => onAction(action.message)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-clinical-200 text-clinical-700 rounded-lg hover:bg-clinical-50 hover:border-clinical-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={li} className="mt-2 bg-clinical-50 border border-clinical-200 rounded-lg px-3 py-2 text-clinical-800">
                    <FormatLine text={line} />
                  </div>
                );
              }

              // Bullet points
              if (trimmed.startsWith("- ")) {
                return (
                  <div key={li} className="flex gap-1.5 pl-1">
                    <span className="text-gray-400 mt-px">&#8226;</span>
                    <span><FormatLine text={trimmed.slice(2)} /></span>
                  </div>
                );
              }

              return (
                <div key={li}>
                  <FormatLine text={line} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const STORAGE_KEY = "ccrd_chat";

function loadChat(): { messages: AgentMessage[]; sessionId?: string } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { messages: [] };
}

function saveChat(messages: AgentMessage[], sessionId?: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, sessionId }));
  } catch { /* ignore */ }
}

export default function AgentChat() {
  const stored = loadChat();
  const [messages, setMessages] = useState<AgentMessage[]>(stored.messages);
  const [input, setInput] = useState("");
  const loading = false;
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamToolCalls, setStreamToolCalls] = useState<ToolCallInfo[]>([]);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(stored.sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Persist messages + sessionId on change
  useEffect(() => {
    saveChat(messages, sessionId);
  }, [messages, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText, activeTools]);

  const sendStreaming = useCallback(
    async (text: string) => {
      setStreaming(true);
      setStreamText("");
      setStreamToolCalls([]);
      setActiveTools([]);

      let accumulatedText = "";
      const toolCalls: ToolCallInfo[] = [];

      try {
        await agentChatStream(text, sessionId, (event) => {
          if (event.type === "text" && event.content) {
            accumulatedText += event.content;
            setStreamText(accumulatedText);
          } else if (event.type === "tool_call" && event.tool) {
            setActiveTools((prev) => [...prev, event.tool!]);
          } else if (event.type === "tool_result" && event.tool) {
            toolCalls.push({
              tool: event.tool,
              input: event.input || {},
              duration_ms: event.duration_ms || 0,
            });
            setStreamToolCalls([...toolCalls]);
            setActiveTools((prev) =>
              prev.filter((t) => t !== event.tool)
            );
          } else if (event.type === "tool_start" && event.tool) {
            setActiveTools((prev) => [...prev, event.tool!]);
          } else if (event.type === "done") {
            if (event.session_id) setSessionId(event.session_id);
            const finalToolCalls = event.tool_calls?.length
              ? event.tool_calls
              : toolCalls;
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: accumulatedText,
                tool_calls: finalToolCalls,
                guardrail_blocked: event.guardrail_blocked,
              },
            ]);
            setStreamText("");
            setStreamToolCalls([]);
            setActiveTools([]);
          }
        });
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              accumulatedText ||
              "Failed to get a response. Please try again.",
          },
        ]);
        setStreamText("");
      } finally {
        setStreaming(false);
      }
    },
    [sessionId]
  );

  async function sendPreloadedAnimated(userText: string, responseKey: string) {
    const cached = PRELOADED_RESPONSES[responseKey];
    if (!cached) return;

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setStreaming(true);
    setStreamText("");
    setStreamToolCalls([]);
    setActiveTools([]);

    // Brief thinking pause (shows bouncing dots)
    await sleep(500);

    // Simulate tool calls appearing one by one
    const completedTools: ToolCallInfo[] = [];
    for (const tc of cached.tool_calls) {
      setActiveTools((prev) => [...prev, tc.tool]);
      await sleep(300 + Math.random() * 200);
      setActiveTools((prev) => prev.filter((t) => t !== tc.tool));
      completedTools.push(tc);
      setStreamToolCalls([...completedTools]);
    }

    // Brief pause before text starts
    await sleep(250);

    // Stream text in small character chunks
    const text = cached.content;
    const chunkSize = 10;
    let accumulated = "";
    for (let i = 0; i < text.length; i += chunkSize) {
      accumulated += text.slice(i, i + chunkSize);
      setStreamText(accumulated);
      await sleep(10);
    }

    // Finalize
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: cached.content, tool_calls: cached.tool_calls },
    ]);
    setStreamText("");
    setStreamToolCalls([]);
    setActiveTools([]);
    setStreaming(false);
  }

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading || streaming) return;

    setInput("");

    // Check for preloaded response match (exact or fuzzy keyword match)
    const preloadKey = matchPreloaded(msg);
    if (preloadKey) {
      await sendPreloadedAnimated(msg, preloadKey);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    await sendStreaming(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleAction(message: string) {
    if (PRELOADED_RESPONSES[message]) {
      sendPreloadedAnimated(message, message);
    } else {
      send(message);
    }
  }

  const isBusy = loading || streaming;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-clinical-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Agent Chat</h2>
            <p className="text-xs text-gray-500">
              Ask about patient risks, care gaps, and quality measures.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setMessages([]);
            setSessionId(undefined);
            sessionStorage.removeItem(STORAGE_KEY);
          }}
          className="btn-secondary text-xs !px-3 !py-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto card !rounded-b-none p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div className="w-14 h-14 rounded-full bg-clinical-50 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-clinical-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                Clinical AI Assistant
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Ask about patient risks, care gaps, alerts, and quality
                measures.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => PRELOADED_RESPONSES[s] ? sendPreloadedAnimated(s, s) : send(s)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-clinical-50 hover:text-clinical-700 text-gray-600 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1 px-1">
              {msg.role === "user" ? "You" : "CareGap"}
            </span>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? ""
                  : msg.guardrail_blocked
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-gray-100 text-gray-900"
              }`}
              style={msg.role === "user" ? { backgroundColor: "#0078c7", color: "#ffffff" } : undefined}
            >
              {msg.role === "assistant" ? (
                <FormattedMessage content={msg.content} onAction={handleAction} isBusy={isBusy} />
              ) : (
                <div className="text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
              {msg.role === "assistant" &&
                msg.tool_calls &&
                msg.tool_calls.length > 0 && (
                  <ToolCallBadge toolCalls={msg.tool_calls} />
                )}
            </div>
          </div>
        ))}

        {/* Streaming response in progress */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-4 py-3 bg-gray-100 text-gray-900">
              {activeTools.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {activeTools.map((tool, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-clinical-50 text-clinical-700 text-xs rounded-full"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              {streamText ? (
                <FormattedMessage content={streamText} />
              ) : activeTools.length === 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              ) : null}
              {streamToolCalls.length > 0 && (
                <ToolCallBadge toolCalls={streamToolCalls} />
              )}
            </div>
          </div>
        )}

        {/* Non-streaming loading */}
        {loading && !streaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 bg-white border border-t-0 border-gray-200 rounded-b-xl">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about patient risks, care gaps, quality measures..."
          rows={1}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
        <button
          onClick={() => send()}
          disabled={isBusy || !input.trim()}
          className="btn-primary !px-4 !py-2.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
