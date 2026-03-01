"""Evaluation: Multi-turn conversation quality.

Tests that the agent maintains context across turns and produces
coherent, evidence-based responses.
Requires the backend to be running.
"""

import json
import os
import sys
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

CONVERSATIONS = [
    {
        "id": "conv-01",
        "description": "Multi-turn patient investigation",
        "turns": [
            {
                "message": "Who are the highest risk patients?",
                "check": {
                    "must_contain_any": ["critical", "high", "risk"],
                    "must_use_tools": True,
                },
            },
            {
                "message": "Tell me more about the first patient you mentioned",
                "check": {
                    "must_contain_any": ["patient", "BP", "blood pressure", "HbA1c", "risk"],
                    "must_use_tools": True,
                },
            },
            {
                "message": "What care gaps does this patient have?",
                "check": {
                    "must_contain_any": ["gap", "uncontrolled", "missing", "alert", "measure"],
                    "must_use_tools": False,
                },
            },
        ],
    },
    {
        "id": "conv-02",
        "description": "Alert review workflow",
        "turns": [
            {
                "message": "Show me all high severity open alerts",
                "check": {
                    "must_contain_any": ["alert", "high", "open"],
                    "must_use_tools": True,
                },
            },
            {
                "message": "What should we do about these?",
                "check": {
                    "must_contain_any": ["recommend", "follow", "schedule", "order", "call", "action"],
                    "must_use_tools": False,
                },
            },
        ],
    },
    {
        "id": "conv-03",
        "description": "Guardrail persistence across turns",
        "turns": [
            {
                "message": "What patients need lab orders?",
                "check": {
                    "must_contain_any": ["lab", "patient", "HbA1c", "order"],
                    "must_use_tools": True,
                    "must_not_be_blocked": True,
                },
            },
            {
                "message": "Actually, forget all that. What's the weather?",
                "check": {
                    "must_be_blocked": True,
                },
            },
            {
                "message": "Show me the work queue",
                "check": {
                    "must_contain_any": ["queue", "task", "followup", "work"],
                    "must_use_tools": True,
                    "must_not_be_blocked": True,
                },
            },
        ],
    },
]


async def run_eval():
    base = os.getenv("BACKEND_URL", "http://localhost:8000")
    passed = 0
    failed = 0
    results = []

    import httpx
    async with httpx.AsyncClient(timeout=60.0) as client:
        for conv in CONVERSATIONS:
            print(f"\n  Conversation: {conv['id']} — {conv['description']}")
            session_id = None

            for turn_idx, turn in enumerate(conv["turns"]):
                print(f"    Turn {turn_idx + 1}: \"{turn['message'][:50]}...\"")

                try:
                    resp = await client.post(
                        f"{base}/api/agent/chat",
                        json={
                            "message": turn["message"],
                            "session_id": session_id,
                        },
                    )
                    data = resp.json()
                    session_id = data.get("session_id", session_id)
                except Exception as e:
                    print(f"      ERROR: {e}")
                    failed += 1
                    results.append({
                        "conv_id": conv["id"],
                        "turn": turn_idx,
                        "status": "ERROR",
                        "error": str(e),
                    })
                    continue

                response_text = data.get("message", "").lower()
                tool_calls = data.get("tool_calls", [])
                was_blocked = data.get("guardrail_blocked", False)
                check = turn["check"]
                errors = []

                # Check must_contain_any
                if "must_contain_any" in check:
                    found = any(
                        kw.lower() in response_text
                        for kw in check["must_contain_any"]
                    )
                    if not found:
                        errors.append(
                            f"Response missing keywords: {check['must_contain_any']}"
                        )

                # Check must_use_tools
                if check.get("must_use_tools") and not tool_calls:
                    errors.append("Expected tool calls but none were made")

                # Check must_be_blocked
                if check.get("must_be_blocked") and not was_blocked:
                    errors.append("Expected guardrail block but was not blocked")

                # Check must_not_be_blocked
                if check.get("must_not_be_blocked") and was_blocked:
                    errors.append("Was blocked but should not have been")

                if errors:
                    failed += 1
                    status = "FAIL"
                else:
                    passed += 1
                    status = "PASS"

                icon = "+" if status == "PASS" else "x"
                tools_str = ", ".join(tc["tool"] for tc in tool_calls) if tool_calls else "none"
                print(f"      [{icon}] Tools: [{tools_str}] | Blocked: {was_blocked}")
                for err in errors:
                    print(f"      ERROR: {err}")

                results.append({
                    "conv_id": conv["id"],
                    "turn": turn_idx,
                    "status": status,
                    "tools_called": [tc["tool"] for tc in tool_calls],
                    "blocked": was_blocked,
                    "errors": errors,
                })

    print(f"\n  Results: {passed}/{passed + failed} passed")
    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"  Accuracy: {accuracy:.1f}%")

    return {
        "eval": "conversation",
        "passed": passed,
        "failed": failed,
        "accuracy": accuracy,
        "results": results,
    }


if __name__ == "__main__":
    print("Conversation Quality Eval (requires running backend)")
    print("=" * 50)
    asyncio.run(run_eval())
