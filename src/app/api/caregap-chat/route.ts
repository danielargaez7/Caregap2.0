import { streamText, tool, stepCountIs } from "@/lib/ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildCareGapSystemPrompt } from "@/lib/caregap-system-prompt";
import { checkInput, REFUSAL_MESSAGE } from "@/lib/guardrails";
import {
  getHighRiskPatients,
  getOpenAlerts,
  getCohortSummary,
  getWorkQueue,
  runScreenings,
  getCoverageSummary,
  sendOutreach,
  createFollowup,
} from "@/lib/caregap-tools";

const toolCallStore = new Map<string, Array<{ toolName: string; args: unknown; result: unknown }>>();

export async function POST(req: Request) {
  const { messages, fetchToolCalls } = await req.json();

  // Second call: client fetching tool calls after stream completes
  if (fetchToolCalls && toolCallStore.has(fetchToolCalls)) {
    const calls = toolCallStore.get(fetchToolCalls)!;
    toolCallStore.delete(fetchToolCalls);
    return Response.json(calls);
  }
  if (fetchToolCalls) {
    return Response.json([]);
  }

  // Input guardrail
  const lastMessage = messages?.[messages.length - 1];
  if (lastMessage?.role === "user" && lastMessage?.content) {
    const { allowed, reason } = checkInput(lastMessage.content);
    if (!allowed) {
      const refusal = reason || REFUSAL_MESSAGE;
      return new Response(refusal, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  const systemPrompt = buildCareGapSystemPrompt();
  const reqId = crypto.randomUUID();
  const collectedToolCalls: Array<{ toolName: string; args: unknown; result: unknown }> = [];

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
    temperature: 0.3,
    stopWhen: stepCountIs(3),
    onStepFinish: ({ toolCalls, toolResults }) => {
      if (toolCalls && toolCalls.length > 0) {
        for (let i = 0; i < toolCalls.length; i++) {
          collectedToolCalls.push({
            toolName: toolCalls[i].toolName,
            args: toolCalls[i].input,
            result: toolResults?.[i]?.output ?? null,
          });
        }
        toolCallStore.set(reqId, collectedToolCalls);
        setTimeout(() => toolCallStore.delete(reqId), 30000);
      }
    },
    tools: {
      get_high_risk_patients: tool({
        description:
          "Get patients sorted by risk score. Use when asked about highest risk patients, critical patients, or who needs attention.",
        inputSchema: z.object({
          limit: z.number().optional().describe("Max patients to return (default 20)"),
          risk_band: z
            .string()
            .optional()
            .describe("Filter by risk band: critical, high, medium, or low"),
        }),
        execute: async ({ limit, risk_band }) => getHighRiskPatients(limit, risk_band),
      }),

      get_open_alerts: tool({
        description:
          "Get open care gap alerts. Use when asked about alerts, warnings, or unresolved issues.",
        inputSchema: z.object({
          severity: z
            .string()
            .optional()
            .describe("Filter by severity: high, warn, or info"),
          pid: z.number().optional().describe("Filter by patient ID"),
        }),
        execute: async ({ severity, pid }) => getOpenAlerts(severity, pid),
      }),

      get_cohort_summary: tool({
        description:
          "Get panel-wide statistics: risk distribution, CMS measure rates, adherence stats. Use when asked to summarize care gaps, panel health, or quality measures.",
        inputSchema: z.object({}),
        execute: async () => getCohortSummary(),
      }),

      get_work_queue: tool({
        description:
          "Get open follow-up tasks in the work queue. Use when asked about pending tasks, scheduled visits, or what needs to be done.",
        inputSchema: z.object({
          task_type: z
            .string()
            .optional()
            .describe("Filter: schedule_visit, order_lab, or call_patient"),
          pid: z.number().optional().describe("Filter by patient ID"),
        }),
        execute: async ({ task_type, pid }) => getWorkQueue(task_type, pid),
      }),

      run_screenings: tool({
        description:
          "Run comprehensive screenings for a specific patient: BP, A1c, adherence, cancer screenings, CKD. Use when asked to screen or assess a specific patient.",
        inputSchema: z.object({
          pid: z.number().describe("Patient ID to screen"),
        }),
        execute: async ({ pid }) => runScreenings(pid),
      }),

      get_coverage_summary: tool({
        description:
          "Get insurance coverage and cost estimates for preventive services. Use when asked about insurance, costs, or what's covered.",
        inputSchema: z.object({
          pid: z
            .number()
            .optional()
            .describe("Patient ID for individual coverage, omit for panel summary"),
        }),
        execute: async ({ pid }) => getCoverageSummary(pid),
      }),

      send_outreach: tool({
        description:
          "Send automated calls and emails to patients at specified risk levels. Use when asked to send outreach, contact patients, or schedule communications.",
        inputSchema: z.object({
          risk_levels: z
            .array(z.string())
            .describe("Risk levels to target: critical, high, medium, low"),
        }),
        execute: async ({ risk_levels }) => sendOutreach(risk_levels),
      }),

      create_followup: tool({
        description:
          "Create a follow-up task in the work queue. Use when asked to create tasks, schedule visits, order labs, or set up patient calls.",
        inputSchema: z.object({
          pid: z.number().describe("Patient ID"),
          task_type: z
            .string()
            .describe("Task type: schedule_visit, order_lab, or call_patient"),
          detail: z.string().describe("Description of what needs to be done"),
        }),
        execute: async ({ pid, task_type, detail }) => createFollowup(pid, task_type, detail),
      }),
    },
  });

  const response = result.toTextStreamResponse();
  response.headers.set("X-Request-Id", reqId);
  return response;
}
