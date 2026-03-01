"""Run CareGap evaluations and log results to Braintrust.

Usage:
    BRAINTRUST_API_KEY=... python evals/eval_braintrust.py [--live]

Logs all eval results to the Braintrust project for tracking over time.
"""

from __future__ import annotations

import json
import os
import sys
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# --- Braintrust setup ---
_bt_logger = None


def get_bt_logger():
    global _bt_logger
    if _bt_logger is not None:
        return _bt_logger

    api_key = os.getenv("BRAINTRUST_API_KEY", "")
    project = os.getenv("BRAINTRUST_PROJECT", "CareGap")
    if not api_key:
        print("  [warn] BRAINTRUST_API_KEY not set — results will NOT be logged to Braintrust")
        _bt_logger = False
        return None

    try:
        import braintrust
        _bt_logger = braintrust.init_logger(project=project, api_key=api_key)
        print(f"  Braintrust logger initialized for project: {project}")
        return _bt_logger
    except Exception as e:
        print(f"  [warn] Braintrust init failed: {e}")
        _bt_logger = False
        return None


def log_eval_result(eval_name: str, case_id: str, input_text: str,
                    output: str, expected: str, passed: bool,
                    metadata: dict | None = None):
    """Log a single eval result to Braintrust."""
    bt = get_bt_logger()
    if not bt:
        return

    try:
        bt.log(
            input=input_text,
            output=output,
            expected=expected,
            scores={"correctness": 1.0 if passed else 0.0},
            metadata={
                "eval_name": eval_name,
                "case_id": case_id,
                "passed": passed,
                **(metadata or {}),
            },
        )
    except Exception as e:
        print(f"  [warn] Braintrust log failed: {e}")


# --- Care Gap Eval ---
def run_care_gap_eval():
    """Run deterministic CMS165/CMS122 measure logic tests."""
    from services.measures.cms165 import evaluate_cms165
    from services.measures.cms122 import evaluate_cms122
    from services.measures.risk_scorer import compute_risk_score
    from eval_care_gaps import build_mock_data, PERIOD_START, PERIOD_END

    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        cases = json.load(f)["care_gap_cases"]

    passed = 0
    failed = 0

    for case in cases:
        data = build_mock_data(case)
        expected = case["expected"]

        cms165 = evaluate_cms165(
            patient=data["patient"], vitals=data["vitals"],
            problems=data["problems"], encounters=data["encounters"],
            measurement_period_start=PERIOD_START, measurement_period_end=PERIOD_END,
        )
        cms122 = evaluate_cms122(
            patient=data["patient"], labs=data["labs"],
            problems=data["problems"], encounters=data["encounters"],
            measurement_period_start=PERIOD_START, measurement_period_end=PERIOD_END,
        )
        risk = compute_risk_score(
            cms165=cms165, cms122=cms122,
            encounters=data["encounters"],
            measurement_period_end=PERIOD_END, adherence_pdc=None,
        )

        errors = []
        if cms165.controlled != expected["cms165_controlled"]:
            errors.append(f"CMS165: expected controlled={expected['cms165_controlled']}, got {cms165.controlled}")
        if cms122.poor_control != expected["cms122_poor_control"]:
            errors.append(f"CMS122: expected poor_control={expected['cms122_poor_control']}, got {cms122.poor_control}")
        if risk.risk_band != expected["risk_band"]:
            errors.append(f"Risk band: expected {expected['risk_band']}, got {risk.risk_band}")

        ok = len(errors) == 0
        if ok:
            passed += 1
        else:
            failed += 1

        icon = "+" if ok else "x"
        print(f"  [{icon}] {case['id']}: {case['description']}")
        for err in errors:
            print(f"      ERROR: {err}")

        log_eval_result(
            eval_name="care_gaps",
            case_id=case["id"],
            input_text=json.dumps({"vitals": case["vitals"], "hba1c": case["hba1c"]}),
            output=json.dumps({"cms165": cms165.controlled, "cms122": cms122.poor_control, "band": risk.risk_band}),
            expected=json.dumps(expected),
            passed=ok,
            metadata={"description": case["description"], "risk_score": round(risk.score, 3)},
        )

    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"\n  Results: {passed}/{passed + failed} passed ({accuracy:.1f}%)")
    return {"eval": "care_gaps", "passed": passed, "failed": failed, "accuracy": accuracy}


# --- Guardrail Eval ---
def run_guardrail_eval():
    """Run input guardrail classification tests."""
    from agent.guardrails import check_input

    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        cases = json.load(f)["guardrail_cases"]

    passed = 0
    failed = 0

    for case in cases:
        allowed, reason = check_input(case["prompt"])
        expected_allowed = not case["should_block"]
        ok = allowed == expected_allowed

        if ok:
            passed += 1
        else:
            failed += 1

        icon = "+" if ok else "x"
        print(f"  [{icon}] {case['id']}: \"{case['prompt'][:50]}\"")
        if not ok:
            print(f"      ERROR: Expected {'blocked' if case['should_block'] else 'allowed'}, got {'allowed' if allowed else 'blocked'}")

        log_eval_result(
            eval_name="guardrails",
            case_id=case["id"],
            input_text=case["prompt"],
            output="blocked" if not allowed else "allowed",
            expected="blocked" if case["should_block"] else "allowed",
            passed=ok,
        )

    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"\n  Results: {passed}/{passed + failed} passed ({accuracy:.1f}%)")
    return {"eval": "guardrails", "passed": passed, "failed": failed, "accuracy": accuracy}


# --- Tool Selection Eval (live) ---
async def run_tool_selection_eval():
    """Test that the agent calls the correct tools for given prompts."""
    import httpx

    base = os.getenv("BACKEND_URL", "http://localhost:8000")
    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        cases = json.load(f)["tool_selection_cases"]

    passed = 0
    failed = 0

    async with httpx.AsyncClient(timeout=60.0) as client:
        for case in cases:
            print(f"\n  {case['id']}: {case['prompt'][:60]}...")
            try:
                resp = await client.post(f"{base}/api/agent/chat", json={"message": case["prompt"]})
                data = resp.json()
            except Exception as e:
                print(f"    ERROR: {e}")
                failed += 1
                log_eval_result("tool_selection", case["id"], case["prompt"], f"ERROR: {e}", str(case["expected_tools"]), False)
                continue

            tools_called = [tc["tool"] for tc in data.get("tool_calls", [])]
            errors = []
            for expected_tool in case["expected_tools"]:
                if expected_tool not in tools_called:
                    errors.append(f"Missing: {expected_tool}")
            for forbidden in case.get("must_not_call", []):
                if forbidden in tools_called:
                    errors.append(f"Called forbidden: {forbidden}")

            ok = len(errors) == 0
            if ok:
                passed += 1
            else:
                failed += 1

            icon = "+" if ok else "x"
            print(f"    [{icon}] Tools: {tools_called}")
            for err in errors:
                print(f"    ERROR: {err}")

            usage = data.get("usage", {})
            log_eval_result(
                eval_name="tool_selection",
                case_id=case["id"],
                input_text=case["prompt"],
                output=json.dumps(tools_called),
                expected=json.dumps(case["expected_tools"]),
                passed=ok,
                metadata={
                    "tools_called": tools_called,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "cost_usd": usage.get("estimated_cost_usd", 0),
                },
            )

    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"\n  Results: {passed}/{passed + failed} passed ({accuracy:.1f}%)")
    return {"eval": "tool_selection", "passed": passed, "failed": failed, "accuracy": accuracy}


# --- Multi-Step Conversation Eval (live) ---
async def run_multi_step_eval():
    """Test multi-turn conversations maintain context and produce correct results."""
    import httpx

    base = os.getenv("BACKEND_URL", "http://localhost:8000")
    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        cases = json.load(f)["multi_step_cases"]

    passed = 0
    failed = 0

    async with httpx.AsyncClient(timeout=60.0) as client:
        for conv in cases:
            print(f"\n  {conv['id']}: {conv['description']}")
            session_id = None

            for turn_idx, turn in enumerate(conv["turns"]):
                print(f"    Turn {turn_idx + 1}: \"{turn['message'][:50]}\"")
                try:
                    resp = await client.post(
                        f"{base}/api/agent/chat",
                        json={"message": turn["message"], "session_id": session_id},
                    )
                    data = resp.json()
                    session_id = data.get("session_id", session_id)
                except Exception as e:
                    print(f"      ERROR: {e}")
                    failed += 1
                    continue

                response_text = data.get("message", "").lower()
                tool_calls = data.get("tool_calls", [])
                was_blocked = data.get("guardrail_blocked", False)
                check = turn["check"]
                errors = []

                if "must_contain_any" in check:
                    found = any(kw.lower() in response_text for kw in check["must_contain_any"])
                    if not found:
                        errors.append(f"Missing keywords: {check['must_contain_any']}")

                if check.get("must_use_tools") and not tool_calls:
                    errors.append("Expected tool calls but none made")

                if check.get("must_be_blocked") and not was_blocked:
                    errors.append("Expected block but was not blocked")

                if check.get("must_not_be_blocked") and was_blocked:
                    errors.append("Was blocked but should not be")

                ok = len(errors) == 0
                if ok:
                    passed += 1
                else:
                    failed += 1

                icon = "+" if ok else "x"
                tools_str = ", ".join(tc["tool"] for tc in tool_calls) if tool_calls else "none"
                print(f"      [{icon}] Tools: [{tools_str}] Blocked: {was_blocked}")
                for err in errors:
                    print(f"      ERROR: {err}")

                usage = data.get("usage", {})
                log_eval_result(
                    eval_name="multi_step",
                    case_id=f"{conv['id']}_turn{turn_idx}",
                    input_text=turn["message"],
                    output=response_text[:200],
                    expected=json.dumps(check),
                    passed=ok,
                    metadata={
                        "conversation_id": conv["id"],
                        "turn": turn_idx,
                        "blocked": was_blocked,
                        "input_tokens": usage.get("input_tokens", 0),
                        "output_tokens": usage.get("output_tokens", 0),
                    },
                )

    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"\n  Results: {passed}/{passed + failed} passed ({accuracy:.1f}%)")
    return {"eval": "multi_step", "passed": passed, "failed": failed, "accuracy": accuracy}


# --- Main ---
def main():
    live = "--live" in sys.argv

    print("=" * 60)
    print("  CareGap Evaluation Suite (Braintrust-integrated)")
    print(f"  {datetime.now().isoformat()}")
    print("=" * 60)

    get_bt_logger()  # Initialize early
    all_results = []

    # 1. Care gap detection (deterministic)
    print("\n1. Care Gap Detection (CMS165 + CMS122)")
    print("-" * 50)
    all_results.append(run_care_gap_eval())

    # 2. Guardrails (deterministic)
    print("\n\n2. Input Guardrails")
    print("-" * 50)
    all_results.append(run_guardrail_eval())

    if live:
        # 3. Tool selection (live)
        print("\n\n3. Tool Selection (live)")
        print("-" * 50)
        all_results.append(asyncio.run(run_tool_selection_eval()))

        # 4. Multi-step conversations (live)
        print("\n\n4. Multi-Step Conversations (live)")
        print("-" * 50)
        all_results.append(asyncio.run(run_multi_step_eval()))
    else:
        print("\n\n3. Tool Selection — SKIPPED (use --live)")
        print("4. Multi-Step Conversations — SKIPPED (use --live)")

    # Summary
    print("\n\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)

    for r in all_results:
        total = r["passed"] + r["failed"]
        print(f"  {r['eval']:20s}  {r['passed']}/{total}  ({r['accuracy']:.1f}%)")

    total_passed = sum(r["passed"] for r in all_results)
    total_failed = sum(r["failed"] for r in all_results)
    total = total_passed + total_failed
    overall = total_passed / total * 100 if total > 0 else 0
    print(f"  {'OVERALL':20s}  {total_passed}/{total}  ({overall:.1f}%)")
    print()

    # Write results
    output = {
        "timestamp": datetime.now().isoformat(),
        "live_mode": live,
        "evals": all_results,
        "overall_passed": total_passed,
        "overall_failed": total_failed,
        "overall_accuracy": overall,
    }
    results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "eval_results.json")
    with open(results_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Results written to {results_path}")

    bt = get_bt_logger()
    if bt:
        print(f"  Results logged to Braintrust")

    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
