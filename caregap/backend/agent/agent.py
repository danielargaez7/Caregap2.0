"""Core CareGap Agent — Claude-powered tool-use loop with guardrails.

Features:
- Input/output guardrails to keep agent scoped to chronic care
- Tool call metadata returned with every response for UI transparency
- Conversation history management across turns
- Run UUID tracking for observability
- Braintrust integration for tracing, token usage, and cost tracking
"""
from __future__ import annotations

import asyncio
import json
import time
import logging
import uuid
from collections import defaultdict

import anthropic

from config import get_settings
from agent.system_prompt import SYSTEM_PROMPT
from agent.guardrails import check_input, check_output, REFUSAL_MESSAGE
from agent.tools import TOOL_SCHEMAS, TOOL_HANDLERS
from services.openemr_client import get_openemr_client

logger = logging.getLogger(__name__)

# Session storage (in production, use Redis or DB)
_sessions: dict[str, list] = defaultdict(list)

# --- Braintrust initialization ---
_bt_logger = None


def _get_bt_logger():
    """Lazy-init Braintrust logger. Returns None if not configured."""
    global _bt_logger
    if _bt_logger is not None:
        return _bt_logger

    settings = get_settings()
    if not settings.braintrust_api_key:
        logger.info("Braintrust not configured (no API key) — skipping observability")
        _bt_logger = False  # Sentinel: tried but not available
        return None

    try:
        import braintrust
        _bt_logger = braintrust.init_logger(
            project=settings.braintrust_project or "CareGap",
            api_key=settings.braintrust_api_key,
        )
        logger.info(f"Braintrust logger initialized for project: {settings.braintrust_project}")
        return _bt_logger
    except Exception as e:
        logger.warning(f"Braintrust init failed: {e} — continuing without observability")
        _bt_logger = False
        return None


def _wrap_client(client: anthropic.Anthropic) -> anthropic.Anthropic:
    """Wrap the Anthropic client with Braintrust tracing if available."""
    settings = get_settings()
    if not settings.braintrust_api_key:
        return client

    try:
        from braintrust import wrap_anthropic
        wrapped = wrap_anthropic(client)
        logger.info("Anthropic client wrapped with Braintrust tracing")
        return wrapped
    except Exception as e:
        logger.warning(f"Failed to wrap Anthropic client with Braintrust: {e}")
        return client


# Cost per token for Claude Sonnet 4 (as of 2025)
# Input: $3/MTok, Output: $15/MTok
COST_PER_INPUT_TOKEN = 3.0 / 1_000_000
COST_PER_OUTPUT_TOKEN = 15.0 / 1_000_000


def _extract_usage(response) -> dict:
    """Extract token usage and cost from an Anthropic response."""
    usage = getattr(response, "usage", None)
    if not usage:
        return {}

    input_tokens = getattr(usage, "input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
    cache_creation = getattr(usage, "cache_creation_input_tokens", 0) or 0

    cost = (input_tokens * COST_PER_INPUT_TOKEN) + (output_tokens * COST_PER_OUTPUT_TOKEN)

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_read_input_tokens": cache_read,
        "cache_creation_input_tokens": cache_creation,
        "total_tokens": input_tokens + output_tokens,
        "estimated_cost_usd": round(cost, 6),
    }


class CareGapAgent:
    def __init__(self, db):
        settings = get_settings()
        raw_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.client = _wrap_client(raw_client)
        self.db = db
        self.openemr = get_openemr_client()
        # Initialize Braintrust logger on first agent creation
        _get_bt_logger()

    async def chat(self, message: str, session_id: str | None = None) -> dict:
        """Process a user message through the agent with guardrails.

        Returns:
            {
                "message": "Agent response text",
                "tool_calls": [{"tool": "...", "input": {...}, "duration_ms": N}],
                "session_id": "...",
                "guardrail_blocked": false,
                "usage": {"input_tokens": N, "output_tokens": N, "estimated_cost_usd": N}
            }
        """
        request_start = time.time()

        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())

        # --- INPUT GUARDRAIL ---
        allowed, reason = check_input(message)
        if not allowed:
            logger.info(f"Guardrail blocked input: {message[:80]}")
            self._log_to_braintrust(
                input=message, output=reason or REFUSAL_MESSAGE,
                metadata={"guardrail_blocked": True, "session_id": session_id},
                scores={"guardrail_correct": 1},
            )
            return {
                "message": reason or REFUSAL_MESSAGE,
                "tool_calls": [],
                "session_id": session_id,
                "guardrail_blocked": True,
                "usage": {},
            }

        # Get/create conversation history for this session
        history = _sessions[session_id]
        history.append({"role": "user", "content": message})

        # Track tool calls and token usage across all rounds
        tool_calls_metadata = []
        total_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "estimated_cost_usd": 0}
        llm_rounds = 0

        # Agent loop — may involve multiple tool calls
        while True:
            llm_rounds += 1
            try:
                response = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOL_SCHEMAS,
                    messages=history,
                )
            except anthropic.APIError as e:
                logger.error(f"Anthropic API error: {e}")
                return {
                    "message": "I'm having trouble connecting right now. Please try again.",
                    "tool_calls": tool_calls_metadata,
                    "session_id": session_id,
                    "guardrail_blocked": False,
                    "usage": total_usage,
                }

            # Accumulate token usage from each round
            round_usage = _extract_usage(response)
            for key in ["input_tokens", "output_tokens", "total_tokens", "estimated_cost_usd"]:
                total_usage[key] = total_usage.get(key, 0) + round_usage.get(key, 0)

            # Append assistant response to history
            history.append({"role": "assistant", "content": response.content})

            # Check if we're done (no more tool calls)
            if response.stop_reason == "end_turn":
                # Extract text from response
                text_parts = [
                    block.text for block in response.content
                    if hasattr(block, "text")
                ]
                agent_response = "\n".join(text_parts)

                # --- OUTPUT GUARDRAIL ---
                output_ok, cleaned = check_output(agent_response)
                if not output_ok:
                    logger.warning(f"Output guardrail triggered on response")
                    agent_response = cleaned

                # Trim session history to prevent unbounded growth
                if len(history) > 40:
                    # Keep system context + last 30 messages
                    history[:] = history[-30:]

                total_duration_ms = int((time.time() - request_start) * 1000)

                # Round cost for readability
                total_usage["estimated_cost_usd"] = round(total_usage["estimated_cost_usd"], 6)

                # Log to Braintrust
                self._log_to_braintrust(
                    input=message,
                    output=agent_response,
                    metadata={
                        "session_id": session_id,
                        "guardrail_blocked": False,
                        "llm_rounds": llm_rounds,
                        "tool_count": len(tool_calls_metadata),
                        "tools_used": [tc["tool"] for tc in tool_calls_metadata],
                        "total_duration_ms": total_duration_ms,
                    },
                    metrics={
                        "input_tokens": total_usage["input_tokens"],
                        "output_tokens": total_usage["output_tokens"],
                        "total_tokens": total_usage["total_tokens"],
                        "cost_usd": total_usage["estimated_cost_usd"],
                        "duration_ms": total_duration_ms,
                        "llm_rounds": llm_rounds,
                        "tool_calls": len(tool_calls_metadata),
                    },
                )

                return {
                    "message": agent_response,
                    "tool_calls": tool_calls_metadata,
                    "session_id": session_id,
                    "guardrail_blocked": False,
                    "usage": total_usage,
                }

            # Execute tool calls in parallel
            tool_blocks = [b for b in response.content if b.type == "tool_use"]

            async def _run_tool(block):
                tool_name = block.name
                tool_input = block.input
                logger.info(f"Tool call: {tool_name}({json.dumps(tool_input)[:200]})")
                start_time = time.time()
                handler = TOOL_HANDLERS.get(tool_name)
                if handler:
                    try:
                        context = {"db": self.db, "openemr": self.openemr}
                        result = await handler(tool_input, context)
                    except Exception as e:
                        logger.error(f"Tool {tool_name} failed: {e}")
                        result = json.dumps({"error": f"Tool execution failed: {str(e)}"})
                else:
                    result = json.dumps({"error": f"Unknown tool: {tool_name}"})
                duration_ms = int((time.time() - start_time) * 1000)
                return block, tool_name, tool_input, result, duration_ms

            completed = await asyncio.gather(*[_run_tool(b) for b in tool_blocks])

            tool_results = []
            for block, tool_name, tool_input, result, duration_ms in completed:
                tool_calls_metadata.append({
                    "tool": tool_name,
                    "input": tool_input,
                    "duration_ms": duration_ms,
                })
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

            # Append tool results to conversation
            if tool_results:
                history.append({"role": "user", "content": tool_results})

    async def chat_stream(self, message: str, session_id: str | None = None):
        """Stream agent response as SSE events. Yields dicts with event types.

        Important: Only streams text from the FINAL response round. Intermediate
        text (Claude's reasoning between tool calls like "Let me look that up...")
        is suppressed so users only see the actual answer.
        """
        request_start = time.time()

        if not session_id:
            session_id = str(uuid.uuid4())

        # Input guardrail
        allowed, reason = check_input(message)
        if not allowed:
            self._log_to_braintrust(
                input=message, output=reason or REFUSAL_MESSAGE,
                metadata={"guardrail_blocked": True, "session_id": session_id},
                scores={"guardrail_correct": 1},
            )
            yield {"type": "text", "content": reason or REFUSAL_MESSAGE}
            yield {"type": "done", "session_id": session_id, "tool_calls": [], "guardrail_blocked": True}
            return

        history = _sessions[session_id]
        history.append({"role": "user", "content": message})
        tool_calls_metadata = []
        total_usage = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "estimated_cost_usd": 0}
        llm_rounds = 0

        while True:
            # Buffer text for this round — only yield if it's the final round
            round_text_chunks = []
            llm_rounds += 1

            try:
                with self.client.messages.stream(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOL_SCHEMAS,
                    messages=history,
                ) as stream:
                    for event in stream:
                        if hasattr(event, "type"):
                            if event.type == "content_block_start":
                                if hasattr(event.content_block, "type") and event.content_block.type == "tool_use":
                                    yield {"type": "tool_start", "tool": event.content_block.name}
                            elif event.type == "content_block_delta":
                                if hasattr(event.delta, "text"):
                                    # Buffer text — don't yield yet
                                    round_text_chunks.append(event.delta.text)

                    response = stream.get_final_message()

            except anthropic.RateLimitError as e:
                logger.error(f"Anthropic rate limit: {e}")
                yield {"type": "text", "content": "The AI service is temporarily rate-limited. Please wait a moment and try again."}
                yield {"type": "done", "session_id": session_id, "tool_calls": tool_calls_metadata, "guardrail_blocked": False}
                return
            except anthropic.APIError as e:
                logger.error(f"Anthropic API error: {e}")
                yield {"type": "text", "content": "I'm having trouble connecting right now. Please try again."}
                yield {"type": "done", "session_id": session_id, "tool_calls": tool_calls_metadata, "guardrail_blocked": False}
                return

            # Accumulate token usage
            round_usage = _extract_usage(response)
            for key in ["input_tokens", "output_tokens", "total_tokens", "estimated_cost_usd"]:
                total_usage[key] = total_usage.get(key, 0) + round_usage.get(key, 0)

            history.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                # Final round — NOW stream the buffered text to the user
                for chunk in round_text_chunks:
                    yield {"type": "text", "content": chunk}

                text_parts = [block.text for block in response.content if hasattr(block, "text")]
                agent_response = "\n".join(text_parts)
                check_output(agent_response)

                if len(history) > 40:
                    history[:] = history[-30:]

                total_duration_ms = int((time.time() - request_start) * 1000)
                total_usage["estimated_cost_usd"] = round(total_usage["estimated_cost_usd"], 6)

                # Log to Braintrust
                self._log_to_braintrust(
                    input=message,
                    output=agent_response,
                    metadata={
                        "session_id": session_id,
                        "streaming": True,
                        "guardrail_blocked": False,
                        "llm_rounds": llm_rounds,
                        "tool_count": len(tool_calls_metadata),
                        "tools_used": [tc["tool"] for tc in tool_calls_metadata],
                        "total_duration_ms": total_duration_ms,
                    },
                    metrics={
                        "input_tokens": total_usage["input_tokens"],
                        "output_tokens": total_usage["output_tokens"],
                        "total_tokens": total_usage["total_tokens"],
                        "cost_usd": total_usage["estimated_cost_usd"],
                        "duration_ms": total_duration_ms,
                        "llm_rounds": llm_rounds,
                        "tool_calls": len(tool_calls_metadata),
                    },
                )

                yield {
                    "type": "done",
                    "session_id": session_id,
                    "tool_calls": tool_calls_metadata,
                    "guardrail_blocked": False,
                    "usage": total_usage,
                }
                return

            # Intermediate round (tool_use) — execute tools in parallel
            tool_blocks = [b for b in response.content if b.type == "tool_use"]

            # Notify UI about all tools starting
            for block in tool_blocks:
                yield {"type": "tool_call", "tool": block.name, "input": block.input}

            async def _run_tool_stream(block):
                tool_name = block.name
                tool_input = block.input
                start_time = time.time()
                handler = TOOL_HANDLERS.get(tool_name)
                if handler:
                    try:
                        context = {"db": self.db, "openemr": self.openemr}
                        result = await handler(tool_input, context)
                    except Exception as e:
                        logger.error(f"Tool {tool_name} failed: {e}")
                        result = json.dumps({"error": f"Tool execution failed: {str(e)}"})
                else:
                    result = json.dumps({"error": f"Unknown tool: {tool_name}"})
                duration_ms = int((time.time() - start_time) * 1000)
                return block, tool_name, tool_input, result, duration_ms

            completed = await asyncio.gather(*[_run_tool_stream(b) for b in tool_blocks])

            tool_results = []
            for block, tool_name, tool_input, result, duration_ms in completed:
                tool_calls_metadata.append({
                    "tool": tool_name,
                    "input": tool_input,
                    "duration_ms": duration_ms,
                })
                yield {"type": "tool_result", "tool": tool_name, "duration_ms": duration_ms}
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

            if tool_results:
                history.append({"role": "user", "content": tool_results})

    def _log_to_braintrust(self, input: str, output: str,
                           metadata: dict | None = None,
                           metrics: dict | None = None,
                           scores: dict | None = None):
        """Log a request/response pair to Braintrust for observability."""
        bt = _get_bt_logger()
        if not bt:
            return

        try:
            log_entry = {
                "input": input,
                "output": output,
            }
            if metadata:
                log_entry["metadata"] = metadata
            if metrics:
                log_entry["metrics"] = metrics
            if scores:
                log_entry["scores"] = scores

            bt.log(**log_entry)
        except Exception as e:
            logger.debug(f"Braintrust log failed (non-fatal): {e}")

    async def assess_cohort(self) -> dict:
        """Run batch risk assessment for all patients."""
        from services.risk_engine import assess_patient
        from utils.logging import new_run_uuid

        run_id = new_run_uuid()
        logger.info(f"Starting cohort assessment run: {run_id}")

        # Get all patients from OpenEMR
        patients = await self.openemr.search_patients()

        results = {"run_uuid": run_id, "total": len(patients), "assessed": 0, "errors": 0, "results": []}

        for patient in patients:
            p_uuid = patient.get("uuid", "")
            pid = patient.get("pid")
            if not p_uuid or not pid:
                continue

            try:
                result = await assess_patient(
                    patient_uuid=p_uuid,
                    pid=int(pid),
                    openemr=self.openemr,
                    db=self.db,
                )
                results["assessed"] += 1
                results["results"].append({
                    "pid": pid,
                    "risk_band": result["risk_band"],
                    "score": result["risk_score"],
                })
            except Exception as e:
                logger.error(f"Assessment failed for pid={pid}: {e}")
                results["errors"] += 1

        logger.info(f"Cohort assessment complete: {results['assessed']} assessed, {results['errors']} errors")
        return results


def get_agent(db) -> CareGapAgent:
    return CareGapAgent(db)
