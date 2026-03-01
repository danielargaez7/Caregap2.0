"""Evaluation: Agent tool selection correctness.

Sends test prompts to the agent and verifies it calls the correct tools.
Requires the backend to be running (or uses mock).
Target: >= 90% accuracy.
"""

import json
import os
import sys
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def load_cases():
    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        return json.load(f)["tool_selection_cases"]


async def run_eval_live():
    """Run eval against live agent (requires backend running)."""
    import httpx

    base = os.getenv("BACKEND_URL", "http://localhost:8000")
    cases = load_cases()
    passed = 0
    failed = 0
    results = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for case in cases:
            print(f"\n  Testing: {case['id']} — {case['prompt'][:60]}...")

            try:
                resp = await client.post(
                    f"{base}/api/agent/chat",
                    json={"message": case["prompt"]},
                )
                data = resp.json()
            except Exception as e:
                print(f"    ERROR: {e}")
                failed += 1
                results.append({
                    "id": case["id"],
                    "status": "ERROR",
                    "error": str(e),
                })
                continue

            tools_called = [tc["tool"] for tc in data.get("tool_calls", [])]

            errors = []

            # Check expected tools were called
            for expected_tool in case["expected_tools"]:
                if expected_tool not in tools_called:
                    errors.append(f"Missing expected tool: {expected_tool}")

            # Check forbidden tools were NOT called
            for forbidden in case.get("must_not_call", []):
                if forbidden in tools_called:
                    errors.append(f"Called forbidden tool: {forbidden}")

            if errors:
                failed += 1
                status = "FAIL"
            else:
                passed += 1
                status = "PASS"

            result = {
                "id": case["id"],
                "status": status,
                "tools_called": tools_called,
                "expected": case["expected_tools"],
                "errors": errors,
            }
            results.append(result)

            icon = "+" if status == "PASS" else "x"
            print(f"    [{icon}] Tools called: {tools_called}")
            for err in errors:
                print(f"    ERROR: {err}")

    print(f"\n  Results: {passed}/{passed + failed} passed")
    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"  Accuracy: {accuracy:.1f}%")

    return {
        "eval": "tool_selection",
        "passed": passed,
        "failed": failed,
        "accuracy": accuracy,
        "results": results,
    }


def run_eval_guardrails():
    """Run guardrail eval (no LLM needed)."""
    from agent.guardrails import check_input

    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        cases = json.load(f)["guardrail_cases"]

    passed = 0
    failed = 0
    results = []

    for case in cases:
        allowed, reason = check_input(case["prompt"])

        # should_block=True means we expect allowed=False
        expected_allowed = not case["should_block"]

        if allowed == expected_allowed:
            passed += 1
            status = "PASS"
            errors = []
        else:
            failed += 1
            status = "FAIL"
            errors = [
                f"Expected {'blocked' if case['should_block'] else 'allowed'}, "
                f"got {'allowed' if allowed else 'blocked'}"
            ]

        result = {
            "id": case["id"],
            "prompt": case["prompt"][:60],
            "status": status,
            "expected_blocked": case["should_block"],
            "was_blocked": not allowed,
            "errors": errors,
        }
        results.append(result)

        icon = "+" if status == "PASS" else "x"
        print(f"  [{icon}] {case['id']}: \"{case['prompt'][:50]}...\"")
        for err in errors:
            print(f"      ERROR: {err}")

    print(f"\n  Results: {passed}/{passed + failed} passed")
    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"  Accuracy: {accuracy:.1f}%")

    return {
        "eval": "guardrails",
        "passed": passed,
        "failed": failed,
        "accuracy": accuracy,
        "results": results,
    }


if __name__ == "__main__":
    print("Guardrail Eval (deterministic)")
    print("=" * 50)
    run_eval_guardrails()

    print("\n\nTool Selection Eval (requires running backend)")
    print("=" * 50)
    print("  Run with: BACKEND_URL=http://localhost:8000 python evals/eval_agent_tools.py")
    print("  Skipping live eval in standalone mode.")
