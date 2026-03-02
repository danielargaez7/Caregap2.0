import { streamText, tool, stepCountIs } from "@/lib/ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { fetchPatientData } from "@/lib/fhir/fetch-patient";
import { checkInput, REFUSAL_MESSAGE } from "@/lib/guardrails";
import { createRun, updateRun } from "@/lib/langsmith";
import {
  drugInteractionCheck,
  symptomLookup,
  providerSearch,
  appointmentAvailability,
  insuranceCoverageCheck,
  dosingValidation,
  labInterpretation,
  medicationReconciliation,
} from "@/lib/clinical-tools";

// In-memory store for tool calls (keyed by request ID, auto-expires after 30s)
const toolCallStore = new Map<string, Array<{ toolName: string; args: unknown; result: unknown }>>();

export async function POST(req: Request) {
  const { messages, patientId, fetchToolCalls } = await req.json();

  // Second call: client fetching tool calls after stream completes
  if (fetchToolCalls && toolCallStore.has(fetchToolCalls)) {
    const calls = toolCallStore.get(fetchToolCalls)!;
    toolCallStore.delete(fetchToolCalls);
    return Response.json(calls);
  }
  if (fetchToolCalls) {
    return Response.json([]);
  }

  // --- Input guardrail: block off-topic/adversarial messages before hitting the LLM ---
  const lastMessage = messages?.[messages.length - 1];
  if (lastMessage?.role === "user" && lastMessage?.content) {
    const { allowed, reason } = checkInput(lastMessage.content);
    if (!allowed) {
      // Return refusal as a plain text stream (no LLM call needed)
      const refusal = reason || REFUSAL_MESSAGE;
      return new Response(refusal, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  let patientInfo, visitNotes;
  try {
    const data = await fetchPatientData(patientId ?? "demo");
    patientInfo = data.patientInfo;
    visitNotes = data.visitNotes;
  } catch (err) {
    console.error("[chat] Failed to fetch patient data:", err);
    return new Response("Failed to load patient data. Please try again.", { status: 500 });
  }
  const systemPrompt = buildSystemPrompt(patientInfo, visitNotes);

  const reqId = crypto.randomUUID();
  const collectedToolCalls: Array<{ toolName: string; args: unknown; result: unknown }> = [];

  // Trace to LangSmith (non-blocking)
  const userContent = lastMessage?.content || "";
  createRun({
    runId: reqId,
    userMessage: userContent,
    systemPrompt,
    patientId: patientId ?? "demo",
  }).catch(() => {});

  let fullOutput = "";

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
    onFinish: ({ text }) => {
      fullOutput = text;
      // Update LangSmith run with final output (non-blocking)
      updateRun({
        runId: reqId,
        output: fullOutput,
        toolCalls: collectedToolCalls,
      }).catch(() => {});
    },
    tools: {
      drug_interaction_check: tool({
        description:
          "Check for drug-drug interactions and allergy conflicts for a list of medications. Use this when the user asks about drug interactions, medication safety, or whether medications can be taken together.",
        inputSchema: z.object({
          medications: z
            .array(z.string())
            .describe("List of medication names to check for interactions"),
        }),
        execute: async ({ medications }) => drugInteractionCheck(medications),
      }),

      symptom_lookup: tool({
        description:
          "Look up possible conditions based on patient symptoms, considering the current patient's medical history. Use this when the user describes symptoms or asks what could be causing certain symptoms.",
        inputSchema: z.object({
          symptoms: z
            .array(z.string())
            .describe("List of symptoms to analyze"),
        }),
        execute: async ({ symptoms }) => symptomLookup(symptoms),
      }),

      provider_search: tool({
        description:
          "Search for healthcare providers by specialty or role. Use this when the user asks about available doctors, nurses, or staff, or needs a referral to a specialist.",
        inputSchema: z.object({
          specialty: z
            .string()
            .describe("The specialty or role to search for (e.g. Cardiology, Pulmonology, nurse)"),
          location: z
            .string()
            .optional()
            .describe("Optional location filter"),
        }),
        execute: async ({ specialty, location }) => providerSearch(specialty, location),
      }),

      appointment_availability: tool({
        description:
          "Check available appointment slots for a specific provider within a date range. Use this when the user asks about scheduling, availability, or booking an appointment.",
        inputSchema: z.object({
          provider_name: z
            .string()
            .describe("Name of the provider (e.g. Dr. Patel, Kim)"),
          start_date: z
            .string()
            .describe("Start date in YYYY-MM-DD format"),
          end_date: z
            .string()
            .describe("End date in YYYY-MM-DD format"),
        }),
        execute: async ({ provider_name, start_date, end_date }) =>
          appointmentAvailability(provider_name, start_date, end_date),
      }),

      insurance_coverage_check: tool({
        description:
          "Check insurance coverage for a specific medical procedure using CPT/HCPCS codes. Use this when the user asks about insurance coverage, copays, prior authorization, or whether a procedure is covered. Common codes: 99213 (office visit), 80053 (CMP lab), 93306 (echo), 74178 (CT abdomen), 43239 (endoscopy), 94010 (PFT).",
        inputSchema: z.object({
          procedure_code: z
            .string()
            .describe("CPT or HCPCS procedure code (e.g. 99213, 93306, 74178)"),
          plan_id: z
            .string()
            .optional()
            .describe("Optional insurance plan ID"),
        }),
        execute: async ({ procedure_code, plan_id }) =>
          insuranceCoverageCheck(procedure_code, plan_id),
      }),

      dosing_validation: tool({
        description:
          "Validate medication dosing against clinical guidelines. Use this when the user asks about whether a dose is appropriate, asks about dosing recommendations, or mentions a specific medication dose. Checks against standard dose ranges, max daily doses, and indication-specific recommendations.",
        inputSchema: z.object({
          medication: z
            .string()
            .describe("Medication name (e.g. Aspirin, Lisinopril, Acetaminophen)"),
          dose: z
            .string()
            .describe("Current dose (e.g. '325mg', '10mg', '500mg')"),
          indication: z
            .string()
            .optional()
            .describe("Clinical indication (e.g. 'cardioprotective', 'hypertension', 'analgesic')"),
        }),
        execute: async ({ medication, dose, indication }) =>
          dosingValidation(medication, dose, indication),
      }),

      lab_interpretation: tool({
        description:
          "Interpret patient lab results, flag abnormalities, analyze trends over time, and correlate with current medications. Use this when the user asks about lab results, abnormal values, lab trends, or what their labs mean. Can analyze all labs or specific ones.",
        inputSchema: z.object({
          labs: z
            .array(z.string())
            .optional()
            .describe("Specific lab names to analyze (e.g. ['Potassium', 'LDL']). Omit to analyze all available labs."),
        }),
        execute: async ({ labs }) => labInterpretation(labs),
      }),

      medication_reconciliation: tool({
        description:
          "Compare patient chart medications against EHR records to identify discrepancies, therapy gaps, and duration concerns. Use this when the user asks about medication reconciliation, medication list review, therapy gaps, missing medications, or whether all medications are up to date.",
        inputSchema: z.object({}),
        execute: async () => medicationReconciliation(),
      }),
    },
  });

  const response = result.toTextStreamResponse();
  response.headers.set("X-Request-Id", reqId);
  return response;
}
