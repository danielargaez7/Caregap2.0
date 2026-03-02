"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import CareGapFormattedMessage from "./CareGapFormattedMessage";
import CareGapToolCallBadge, { type ToolCallInfo } from "./CareGapToolCallBadge";

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
  fid?: string;
}

/* ═══════════════════════════════════════════════
   Preloaded Demo Responses (7 scenarios)
   ═══════════════════════════════════════════════ */

interface PreloadedResponse {
  content: string;
  tool_calls: ToolCallInfo[];
}

const PRELOADED: Record<string, PreloadedResponse> = {
  "Who are my highest risk patients?": {
    content: `CRITICAL — Call today

1. **Eugene Jackson** (68M) — BP **162/98**, A1c **9.4%**, PDC **62%**. Heart failure with triple care gap: uncontrolled BP, failing A1c, and low medication adherence.
   Medicare — Office visit $0, HbA1c lab $0

2. **Patricia Williams** (65F) — A1c **10.2%**, COPD exacerbation. Not seen in 4+ months. Critically elevated diabetes with respiratory complications.
   Medicaid — All preventive services $0

3. **Linda Martinez** (63F) — BP **158/96**, Amlodipine PDC **45%**, Metformin PDC **38%**. Severely non-adherent to both BP and diabetes medications.
   Medicaid — All preventive services $0

4. **Margaret Anderson** (70F) — **No vitals or labs on file** despite hypertension and diabetes diagnoses. Complete data gap.
   Medicaid — Annual Wellness Visit $0

HIGH — Schedule this week

5. **Dorothy Henderson** (69F) — BP **156/94**, eGFR **48** (CKD Stage 3). BP uncontrolled with declining kidney function.
   Medicare — Office visit $0

6. **Robert Chen** (62M) — **Missing HbA1c** despite diabetes diagnosis. Also flagged for depression screening (PHQ-9 needed).
   Commercial — Office visit $25-50 copay

7. **Barbara Clark** (64F) — A1c **9.1%**, current smoker. Eligible for lung cancer screening (LDCT).
   Commercial — LDCT screening $0 under ACA

Summary

Your panel has **4 critical** and **6 high-risk** patients out of 18 total. The most urgent case is Eugene Jackson with triple care gaps. 3 patients have medication adherence below the 80% PDC threshold.

Would you like me to send automated calls to these patients?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 142 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 89 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 67 },
    ],
  },

  "Run screenings for Maria Santos": {
    content: `Screening results for **Maria Santos** (67F, PID 1) — Risk Score: **18** (Low)

**Blood Pressure Control (CMS165)**
- Status: Controlled
- BP **128/78** as of 2026-02-20
- Within target (< 140/90). Continue current management.

**HbA1c Control (CMS122)**
- Status: Controlled
- A1c **6.1%** as of 2026-01-15
- Well below the 9.0% poor control threshold.

**Medication Adherence (PDC)**
- Status: Adherent
- Overall PDC **92%**. Lisinopril: 94%, Metformin: 90%.
- Good adherence. Continue monitoring.

**Mammography Screening**
- Status: **Overdue**
- Maria is 67, female. Mammogram is due.
- Medicare — Mammogram covered at **$0** (no cost sharing for screening).

Summary

Maria Santos is well-controlled on BP and A1c with good medication adherence. The only gap is an **overdue mammogram**. This is a quick win — schedule it at $0 cost under Medicare.

Would you like me to create a follow-up task for the mammogram?`,
    tool_calls: [
      { tool: "run_screenings", input: { pid: 1 }, duration_ms: 156 },
      { tool: "get_coverage_summary", input: { pid: 1 }, duration_ms: 78 },
    ],
  },

  "Show me open alerts": {
    content: `You have **9 open alerts** across your panel:

HIGH — 4 alerts

1. **Dual care gap: BP + A1c failing** — Eugene Jackson (PID 2)
   BP 162/98, A1c 9.4%. Heart failure with PDC 62%.
   Action: Schedule urgent follow-up to adjust BP medication and review diabetes management.

2. **HbA1c critically elevated** — Patricia Williams (PID 3)
   A1c 10.2%. COPD patient not seen in 4+ months.
   Action: Order HbA1c lab and schedule follow-up.

3. **Medication non-adherence** — Linda Martinez (PID 4)
   Amlodipine PDC 45%, Metformin PDC 38%. BP uncontrolled at 158/96.
   Action: Call patient to discuss medication barriers.

4. **No vitals or labs on file** — Margaret Anderson (PID 5)
   Hypertension and diabetes diagnoses with no monitoring data.
   Action: Schedule Annual Wellness Visit.

WARN — 4 alerts

5. **BP uncontrolled, CKD declining** — Dorothy Henderson (PID 6)
   BP 156/94. CKD Stage 3 with eGFR 48.

6. **Missing HbA1c lab** — Robert Chen (PID 7)
   No HbA1c on file despite diabetes diagnosis.

7. **A1c above threshold, smoker** — Barbara Clark (PID 8)
   A1c 9.1%. Current smoker eligible for lung cancer screening.

8. **Partial medication adherence** — Thomas Young (PID 11)
   PDC 72%. BP and A1c currently controlled but at risk.

INFO — 1 alert

9. **BP borderline** — James Whitfield (PID 12)
   BP 138/88. Trending toward uncontrolled.

Would you like me to create follow-up tasks for these alerts?`,
    tool_calls: [
      { tool: "get_open_alerts", input: {}, duration_ms: 95 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 82 },
    ],
  },

  "Summarize care gaps": {
    content: `**Panel Summary (18 patients)**

Risk Distribution:
- Critical: **4 patients** (22%)
- High: **6 patients** (33%)
- Medium: **3 patients** (17%)
- Low: **5 patients** (28%)

Key Quality Measures:
- **CMS165 BP Control**: 58% controlled (target 70%) — 7 of 17 patients with BP data are under 140/90. 1 patient has no BP on file.
- **CMS122 A1c Poor Control**: 21% poor control rate (target <15%) — 3 of 14 patients with A1c data are above 9.0%. 2 patients have no A1c on file.
- **Medication Adherence**: 65% of patients meet the 80% PDC threshold. 3 patients are critically non-adherent (<60%).

Top Gaps:
- **3 patients** with A1c > 9.0% (Eugene Jackson 9.4%, Patricia Williams 10.2%, Barbara Clark 9.1%)
- **4 patients** with uncontrolled BP (Eugene Jackson, Linda Martinez, Dorothy Henderson, Charles Lee)
- **3 patients** with PDC < 80% (Eugene Jackson 62%, Linda Martinez 42%, Susan Taylor 65%)
- **1 patient** with no clinical data at all (Margaret Anderson)

Open Work:
- **9 open alerts** (4 high, 4 warn, 1 info)
- **8 open follow-up tasks** (3 schedule_visit, 2 order_lab, 2 call_patient, 1 schedule_visit)

Would you like me to send automated calls to these patients?`,
    tool_calls: [
      { tool: "get_cohort_summary", input: {}, duration_ms: 112 },
      { tool: "get_high_risk_patients", input: { limit: 18 }, duration_ms: 134 },
      { tool: "get_open_alerts", input: {}, duration_ms: 88 },
    ],
  },

  "Send automated calls and emails": {
    content: `Calls and emails have been sent to all **critical** and **high-risk** patients:

CRITICAL — Urgent Outreach Completed

1. **Eugene Jackson** (68M) — Notified he is at high risk due to BP **162/98**, A1c **9.4%**, and medication adherence at **62%**. He has **Medicare** — office visit would be **$0** and HbA1c lab would be **$0**. Asked to please call or visit our patient portal to schedule his visit.

2. **Patricia Williams** (65F) — Notified of critically elevated A1c at **10.2%** with COPD complications. Not seen in **4+ months**. She has **Medicaid** — all preventive services at **$0**. Asked to schedule an appointment as soon as possible.

3. **Linda Martinez** (63F) — Notified of medication adherence concerns: Amlodipine PDC **45%**, Metformin PDC **38%**. BP currently **158/96**. She has **Medicaid** — all visits and labs at **$0**. Asked to call the care coordination team to discuss medication barriers.

4. **Margaret Anderson** (70F) — Notified that she has no recent vitals or lab results on file despite hypertension and diabetes diagnoses. She has **Medicaid** — Annual Wellness Visit at **$0**. Asked to schedule her wellness visit at no cost.

HIGH — Routine Outreach Completed

5. **Dorothy Henderson** (69F) — Notified of uncontrolled BP at **156/94** and declining kidney function (eGFR **48**, CKD Stage 3). She has **Medicare** — office visit at **$0**. Asked to schedule a follow-up this week.

6. **Robert Chen** (62M) — Notified of missing HbA1c lab despite diabetes diagnosis and recommended PHQ-9 depression screening. He has **Commercial** insurance — office visit copay **$25–50**. Asked to schedule lab work and follow-up.

7. **Barbara Clark** (64F) — Notified of A1c at **9.1%** and eligibility for lung cancer screening (LDCT) as a current smoker. She has **Commercial** insurance — LDCT screening at **$0** under ACA preventive coverage. Asked to schedule both appointments.

8. **Charles Lee** (71M) — Notified of uncontrolled BP at **148/92**. He has **Medicare** — office visit at **$0**. Asked to schedule a BP management follow-up.

9. **Susan Taylor** (66F) — Notified of medication adherence at **65%** PDC, below the **80%** threshold. She has **Medicare** — office visit at **$0**. Asked to call the pharmacy or care team to discuss refill barriers.

10. **Thomas Young** (60M) — Notified of medication fill gap with PDC at **72%**. He has **Commercial** insurance — office visit copay **$25–50**. Asked to review his refill schedule with his pharmacy.

Summary

**4 urgent calls** and **6 routine calls** placed. **10 personalized emails** sent. Each patient was informed of their specific care gaps, insurance coverage, and out-of-pocket costs, and directed to schedule via phone or patient portal.

Compliance

All outreach activity has been logged to the audit trail in compliance with **HIPAA Privacy Rule (45 CFR §164.506)** — communications made under Treatment, Payment, and Health Care Operations (TPO). Patient contact records, timestamps, and message content are retained per **CMS Electronic Health Record Incentive Program** documentation requirements and the facility's 7-year retention policy.

Would you like me to create follow-up tasks for these patients?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 128 },
      { tool: "send_outreach", input: { risk_levels: ["critical", "high"] }, duration_ms: 245 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 72 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 91 },
    ],
  },

  "Create follow-up tasks": {
    content: `Follow-up tasks created for critical and high-risk patients:

**Schedule Visit (5 tasks):**

1. **Eugene Jackson** — Urgent BP + diabetes follow-up. Due **2026-03-22**.
   Medicare — Office visit $0
2. **Patricia Williams** — COPD + diabetes management. Due **2026-03-22**.
   Medicaid — Office visit $0
3. **Margaret Anderson** — Annual Wellness Visit (no data on file). Due **2026-03-22**.
   Medicaid — AWV $0
4. **Barbara Clark** — Diabetes follow-up + lung CT screening. Due **2026-03-22**.
   Commercial — Office visit $25-50 copay
5. **Dorothy Henderson** — BP management + CKD monitoring. Due **2026-03-22**.
   Medicare — Office visit $0

**Order Lab (2 tasks):**

6. **Robert Chen** — Order HbA1c (missing despite diabetes Dx). Due **2026-03-22**.
7. **Patricia Williams** — Order updated HbA1c (last was 10.2%). Due **2026-03-22**.

**Call Patient (3 tasks):**

8. **Linda Martinez** — Discuss medication adherence barriers (PDC 42%). Due **2026-03-22**.
9. **Thomas Young** — Discuss medication fill gaps (PDC 72%). Due **2026-03-22**.
10. **Susan Taylor** — Discuss medication adherence (PDC 65%). Due **2026-03-22**.

Summary

**10 follow-up tasks** created: 5 schedule_visit, 2 order_lab, 3 call_patient. All tasks assigned to care coordination team with due dates 3 weeks out (**2026-03-22**).

Would you like me to run a full risk assessment?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 10 }, duration_ms: 118 },
      { tool: "create_followup", input: { pid: 2, task_type: "schedule_visit", detail: "Urgent BP + diabetes follow-up" }, duration_ms: 45 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 68 },
    ],
  },

  "Run a full risk assessment": {
    content: `Full risk assessment completed for all 18 patients:

CRITICAL — 4 patients (22%)

1. **Eugene Jackson** — Score: **91/100**. BP 162/98, A1c 9.4%, PDC 62%. Heart failure with triple care gap.
   Medicare — All preventive services $0
2. **Patricia Williams** — Score: **87/100**. A1c 10.2%, COPD exacerbation. Not seen in 4+ months.
   Medicaid — All preventive services $0
3. **Linda Martinez** — Score: **82/100**. BP 158/96, PDC 42%. Severely non-adherent.
   Medicaid — All preventive services $0
4. **Margaret Anderson** — Score: **78/100**. No vitals or labs on file.
   Medicaid — AWV $0

HIGH — 6 patients (33%)

5. **Dorothy Henderson** — Score: **72/100**. BP 156/94, eGFR 48 (CKD Stage 3).
6. **Robert Chen** — Score: **68/100**. Missing HbA1c. Depression screening needed.
7. **Barbara Clark** — Score: **65/100**. A1c 9.1%, smoker. Lung CT eligible.
8. **Charles Lee** — Score: **58/100**. BP 148/92. Uncontrolled hypertension.
9. **Susan Taylor** — Score: **55/100**. PDC 65%. At-risk adherence.
10. **Thomas Young** — Score: **52/100**. PDC 72%. Borderline adherence.

MEDIUM — 3 patients (17%)

11. **James Whitfield** — Score: **42/100**. BP 138/88. Borderline.
12. **Nancy Rivera** — Score: **38/100**. Stable. A1c 7.0%.
13. **Richard Moore** — Score: **35/100**. Stable. Good adherence.

LOW — 5 patients (28%)

14. **Helen Garcia** — Score: **22/100**. Well-controlled.
15. **Maria Santos** — Score: **18/100**. Overdue mammogram only.
16. **William Davis** — Score: **15/100**. Well-controlled.
17. **Betty Thompson** — Score: **12/100**. Well-controlled.
18. **Joseph Wilson** — Score: **8/100**. Well-controlled.

Summary

Assessment complete for all 18 patients. **10 patients** need active intervention (4 critical + 6 high). CMS165 BP control rate is **58%** (target 70%). CMS122 A1c poor control rate is **21%** (target <15%). 9 new alerts generated, 8 follow-up tasks created.

Would you like me to send automated calls to these patients?`,
    tool_calls: [
      { tool: "get_high_risk_patients", input: { limit: 18 }, duration_ms: 156 },
      { tool: "get_cohort_summary", input: {}, duration_ms: 98 },
      { tool: "get_open_alerts", input: {}, duration_ms: 87 },
      { tool: "get_coverage_summary", input: {}, duration_ms: 72 },
    ],
  },
};

/* ── Fuzzy matching for preloaded responses ── */
const PRELOAD_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  // Action patterns first (more specific — prevent "send...high-risk patients" from matching the query pattern)
  { pattern: /send.*(call|email|outreach)|automat.*(call|email)|contact.*patient/i, key: "Send automated calls and emails" },
  { pattern: /create.*(follow|task)|follow.?up.*task|work\s+queue/i, key: "Create follow-up tasks" },
  { pattern: /full.*assess|risk.*assess.*all|assess.*panel|assess.*cohort|run.*full/i, key: "Run a full risk assessment" },
  // Query patterns
  { pattern: /screen.*maria|maria.*screen|run\s+screen.*santos/i, key: "Run screenings for Maria Santos" },
  { pattern: /highest\s+risk|high.?risk\s+patient|critical\s+patient|who\s+(needs?|are)/i, key: "Who are my highest risk patients?" },
  { pattern: /open\s+alert|show.*alert|unresolved|alert.*queue/i, key: "Show me open alerts" },
  { pattern: /summarize|summary|care\s+gap.*summ|panel\s+summ|quality\s+measure/i, key: "Summarize care gaps" },
];

function matchPreloaded(text: string): string | null {
  // Exact match first
  for (const key of Object.keys(PRELOADED)) {
    if (text.toLowerCase() === key.toLowerCase()) return key;
  }
  // Fuzzy match
  for (const { pattern, key } of PRELOAD_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return null;
}

/* ═══════════════════════════════════════════════
   Chat Suggestions
   ═══════════════════════════════════════════════ */

const SUGGESTIONS = [
  "Who are my highest risk patients?",
  "Show me open alerts",
  "Summarize care gaps",
  "Run screenings for Maria Santos",
];

/* ═══════════════════════════════════════════════
   Session Persistence
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = "caregap_agent_chat";

function loadSession(): { messages: AgentMessage[] } {
  if (typeof window === "undefined") return { messages: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { messages: [] };
}

function saveSession(messages: AgentMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages }));
  } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export default function CareGapAgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamToolCalls, setStreamToolCalls] = useState<ToolCallInfo[]>([]);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [correctionOpen, setCorrectionOpen] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Load session on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const session = loadSession();
    if (session.messages.length > 0) {
      setMessages(session.messages);
    }
  }, []);

  // Save session on change
  useEffect(() => {
    if (loadedRef.current && messages.length > 0) {
      saveSession(messages);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, streamText, activeTools]);

  /* ── Preloaded animated playback ── */
  const sendPreloadedAnimated = useCallback(async (userText: string, responseKey: string) => {
    const preloaded = PRELOADED[responseKey];
    if (!preloaded) return;

    setStreaming(true);
    setStreamText("");
    setStreamToolCalls([]);
    setActiveTools([]);

    // Show tool calls one-by-one
    for (const tc of preloaded.tool_calls) {
      setActiveTools((prev) => [...prev, tc.tool]);
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      setStreamToolCalls((prev) => [...prev, tc]);
      setActiveTools((prev) => prev.filter((t) => t !== tc.tool));
    }

    // Brief pause before text
    await new Promise((r) => setTimeout(r, 250));

    // Stream text in chunks
    const text = preloaded.content;
    for (let i = 0; i < text.length; i += 10) {
      setStreamText(text.slice(0, i + 10));
      await new Promise((r) => setTimeout(r, 8));
    }
    setStreamText(text);

    // Finalize
    const fid = `agent-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText, fid: `user-${Date.now()}` },
      { role: "assistant", content: text, toolCalls: preloaded.tool_calls, fid },
    ]);
    setStreaming(false);
    setStreamText("");
    setStreamToolCalls([]);
    setActiveTools([]);
  }, []);

  /* ── Real AI streaming ── */
  const sendStreaming = useCallback(async (userText: string) => {
    setStreaming(true);
    setStreamText("");
    setStreamToolCalls([]);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userText },
    ];

    try {
      const res = await fetch("/api/caregap-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const reqId = res.headers.get("X-Request-Id");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setStreamText(fullText);
        }
      }

      // Fetch tool calls
      let toolCalls: ToolCallInfo[] = [];
      if (reqId) {
        const toolRes = await fetch("/api/caregap-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fetchToolCalls: reqId }),
        });
        const rawCalls = await toolRes.json();
        toolCalls = rawCalls.map((tc: { toolName: string; args: unknown }) => ({
          tool: tc.toolName,
          input: (tc.args || {}) as Record<string, unknown>,
          duration_ms: Math.floor(50 + Math.random() * 200),
        }));
      }

      const fid = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userText, fid: `user-${Date.now()}` },
        { role: "assistant", content: fullText, toolCalls, fid },
      ]);
    } catch (err) {
      console.error("[CareGap Agent] Streaming error:", err);
      const fid = `agent-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userText },
        { role: "assistant", content: "Sorry, I encountered an error. Please try again.", fid },
      ]);
    }

    setStreaming(false);
    setStreamText("");
    setStreamToolCalls([]);
  }, [messages]);

  /* ── Send dispatcher ── */
  function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    setInput("");

    const preloadedKey = matchPreloaded(msg);
    if (preloadedKey) {
      // Track completed actions so buttons hide globally
      if (preloadedKey === "Send automated calls and emails") {
        setCompletedActions((prev) => prev.includes("Send Calls & Emails") ? prev : [...prev, "Send Calls & Emails"]);
      }
      sendPreloadedAnimated(msg, preloadedKey);
    } else {
      sendStreaming(msg);
    }
  }

  /* ── Feedback handlers ── */
  function handleFeedback(fid: string, score: "up" | "down") {
    setFeedback((prev) => ({ ...prev, [fid]: score }));
    if (score === "down") setCorrectionOpen(fid);
    else setCorrectionOpen(null);
  }

  function submitCorrection() {
    setCorrectionOpen(null);
    setCorrectionText("");
  }

  function resetChat() {
    setMessages([]);
    setFeedback({});
    setCompletedActions([]);
    setCorrectionOpen(null);
    setCorrectionText("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Agent Chat</h2>
            <p className="text-xs text-gray-500">Ask about patient risks, care gaps, and quality measures.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-t-xl border border-b-0 border-gray-200 p-4 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Clinical AI Assistant</p>
            <p className="text-xs text-gray-400 text-center max-w-sm">
              Ask about patient risks, care gaps, quality measures, or request outreach and follow-up actions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, i) => {
          const fid = msg.fid || `agent-msg-${i}`;
          return (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                {msg.role === "user" ? "You" : "CareGap"}
              </span>

              {/* Message content */}
              {msg.role === "user" ? (
                <div
                  className="max-w-[80%] rounded-xl px-4 py-3 text-sm text-white whitespace-pre-wrap"
                  style={{ backgroundColor: "#0078c7" }}
                >
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[85%]">
                  <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <CareGapFormattedMessage content={msg.content} onAction={(m) => send(m)} completedActions={completedActions} />
                  </div>

                  {/* Tool call badge */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <CareGapToolCallBadge toolCalls={msg.toolCalls} />
                  )}

                  {/* Feedback */}
                  <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                    <button
                      onClick={() => handleFeedback(fid, "up")}
                      title="Helpful"
                      className="p-0.5 rounded transition-colors"
                      style={{ color: feedback[fid] === "up" ? "#22c55e" : "#94a3b8" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback[fid] === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                    </button>
                    <button
                      onClick={() => handleFeedback(fid, "down")}
                      title="Not helpful"
                      className="p-0.5 rounded transition-colors"
                      style={{ color: feedback[fid] === "down" ? "#ef4444" : "#94a3b8" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={feedback[fid] === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
                    </button>
                    {feedback[fid] === "up" && <span className="text-[10px] text-gray-400 ml-0.5">Thanks!</span>}
                  </div>

                  {/* Correction input */}
                  {correctionOpen === fid && (
                    <div className="flex gap-1.5 items-end mt-1.5 ml-1 max-w-[80%]">
                      <input
                        value={correctionText}
                        onChange={(e) => setCorrectionText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitCorrection()}
                        placeholder="What would be better? (optional)"
                        className="flex-1 text-[11px] px-2 py-1 border border-gray-200 rounded-md outline-none text-gray-700 bg-white"
                      />
                      <button
                        onClick={() => submitCorrection()}
                        className="text-[10px] px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-200 whitespace-nowrap"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => { setCorrectionOpen(null); setCorrectionText(""); }}
                        className="text-[10px] px-1.5 py-1 text-gray-400 hover:text-gray-600"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Streaming state */}
        {streaming && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">CareGap</span>

            {/* Active tools */}
            {activeTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {tool}
                  </span>
                ))}
              </div>
            )}

            {/* Streamed text so far */}
            {streamText ? (
              <div className="max-w-[85%]">
                <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <CareGapFormattedMessage content={streamText} completedActions={completedActions} />
                </div>
                {streamToolCalls.length > 0 && (
                  <CareGapToolCallBadge toolCalls={streamToolCalls} />
                )}
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 bg-white border border-gray-200 rounded-b-xl">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about patient risks, care gaps, quality measures..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={streaming}
        />
        <button
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
