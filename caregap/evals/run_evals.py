"""Run all CareGap evaluations.

Usage:
    python evals/run_evals.py [--live]

Flags:
    --live   Run evals that require a live backend (tool selection, conversation)
"""

import json
import os
import sys
import asyncio
from datetime import datetime

from eval_care_gaps import run_eval as eval_care_gaps
from eval_agent_tools import run_eval_guardrails, run_eval_live as eval_tools


def main():
    live = "--live" in sys.argv

    print("=" * 60)
    print("  CareGap Evaluation Suite")
    print(f"  {datetime.now().isoformat()}")
    print("=" * 60)

    all_results = []

    # 1. Care gap detection (deterministic, no backend needed)
    print("\n1. Care Gap Detection (CMS165 + CMS122)")
    print("-" * 50)
    result = eval_care_gaps()
    all_results.append(result)

    # 2. Guardrail eval (deterministic, no backend needed)
    print("\n\n2. Input Guardrails")
    print("-" * 50)
    result = run_eval_guardrails()
    all_results.append(result)

    # 3. Tool selection (requires live backend)
    if live:
        print("\n\n3. Tool Selection (live)")
        print("-" * 50)
        result = asyncio.run(eval_tools())
        all_results.append(result)

        # 4. Conversation quality (requires live backend)
        print("\n\n4. Conversation Quality (live)")
        print("-" * 50)
        from eval_conversation import run_eval as eval_conversation
        result = asyncio.run(eval_conversation())
        all_results.append(result)
    else:
        print("\n\n3. Tool Selection — SKIPPED (use --live flag)")
        print("4. Conversation Quality — SKIPPED (use --live flag)")

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

    # Write results to file
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

    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
