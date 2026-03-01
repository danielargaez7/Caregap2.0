// Next.js instrumentation hook — runs on server startup.
// Braintrust tracing is handled via the wrapped AI SDK in src/lib/ai.ts.
// This file is kept for future observability extensions.
export function register() {
  // Braintrust wrapAISDK is applied in src/lib/ai.ts at import time
}
