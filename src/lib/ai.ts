/* ═══════════════════════════════════════════════
   Braintrust-wrapped Vercel AI SDK
   All AI functions are traced to Braintrust when
   BRAINTRUST_API_KEY is set in .env.local
   ═══════════════════════════════════════════════ */

import { wrapAISDK } from "braintrust";
import * as ai from "ai";

const wrapped = wrapAISDK(ai);

// Re-export wrapped versions — these auto-trace to Braintrust
export const streamText = wrapped.streamText as typeof ai.streamText;
export const generateText = wrapped.generateText as typeof ai.generateText;
export const tool = ai.tool; // tool() doesn't need wrapping
export const stepCountIs = ai.stepCountIs; // helper, no wrapping needed
