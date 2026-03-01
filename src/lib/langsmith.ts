/**
 * LangSmith tracing + feedback client for MedAssist AI.
 *
 * When LANGCHAIN_API_KEY is set, every chat call is logged as a
 * LangSmith run and user feedback (thumbs up/down) is sent back
 * as scored feedback tied to the run.
 */

import { Client } from "langsmith";

let _client: Client | null = null;

function getClient(): Client | null {
  if (!process.env.LANGCHAIN_API_KEY) return null;
  if (!_client) {
    _client = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY,
    });
  }
  return _client;
}

/** Create a LangSmith run for a chat interaction. Returns the run ID. */
export async function createRun(input: {
  runId: string;
  userMessage: string;
  systemPrompt: string;
  patientId: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.createRun({
      id: input.runId,
      name: "medassist-chat",
      run_type: "chain",
      project_name: process.env.LANGCHAIN_PROJECT || "MedAssist-AI",
      inputs: {
        user_message: input.userMessage,
        patient_id: input.patientId,
        system_prompt_length: input.systemPrompt.length,
      },
      start_time: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[LangSmith] Failed to create run:", e);
  }
}

/** Update a run with the final output after streaming completes. */
export async function updateRun(input: {
  runId: string;
  output: string;
  toolCalls?: Array<{ toolName: string; args: unknown; result: unknown }>;
  guardrailBlocked?: boolean;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.updateRun(input.runId, {
      end_time: new Date().toISOString(),
      outputs: {
        response: input.output,
        tool_calls: input.toolCalls || [],
        guardrail_blocked: input.guardrailBlocked || false,
      },
    });
  } catch (e) {
    console.warn("[LangSmith] Failed to update run:", e);
  }
}

/** Log user feedback (thumbs up/down + optional correction) to LangSmith. */
export async function logFeedback(input: {
  runId: string;
  score: number; // 1 = thumbs up, 0 = thumbs down
  comment?: string;
  correction?: string;
}): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.createFeedback(input.runId, "user-rating", {
      score: input.score,
      comment: input.comment,
      value: input.correction
        ? { correction: input.correction }
        : undefined,
    });
  } catch (e) {
    console.warn("[LangSmith] Failed to log feedback:", e);
  }
}

export function isLangSmithEnabled(): boolean {
  return !!process.env.LANGCHAIN_API_KEY;
}
