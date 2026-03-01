"""Deterministic evaluation: CMS165/CMS122 care gap detection accuracy.

Tests the measure logic directly (no LLM involved) against known test cases.
Target: 100% accuracy.
"""

from __future__ import annotations

import json
import sys
import os
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from services.measures.cms165 import evaluate_cms165
from services.measures.cms122 import evaluate_cms122
from services.measures.risk_scorer import compute_risk_score


PERIOD_START = date(2025, 1, 1)
PERIOD_END = date(2026, 2, 27)


def load_cases():
    with open(os.path.join(os.path.dirname(__file__), "test_cases.json")) as f:
        return json.load(f)["care_gap_cases"]


def build_mock_data(case: dict) -> dict:
    """Build mock clinical data from test case definition."""
    problems = []
    if case["has_htn"]:
        problems.append({"code": "I10", "title": "Essential hypertension", "begdate": "2024-01-01"})
    if case["has_diabetes"]:
        problems.append({"code": "E11.9", "title": "Type 2 diabetes", "begdate": "2024-01-01"})

    vitals = []
    if case["vitals"]:
        if isinstance(case["vitals"], list):
            for v in case["vitals"]:
                vitals.append({
                    "bps": v["bps"],
                    "bpd": v["bpd"],
                    "date": "2026-02-01",
                    "uuid": f"vital-{len(vitals)}",
                })
        else:
            vitals.append({
                "bps": case["vitals"]["bps"],
                "bpd": case["vitals"]["bpd"],
                "date": "2026-02-01",
                "uuid": "vital-0",
            })

    labs = []
    if case["hba1c"] is not None:
        labs.append({
            "loinc": "4548-4",
            "result": case["hba1c"],
            "date": "2026-01-15",
            "uuid": "lab-0",
            "description": "Hemoglobin A1c",
        })

    encounters = [{"date": "2026-01-01", "uuid": "enc-0"}]

    # Patient dict with DOB (65 years old)
    patient = {"DOB": "1961-01-01", "sex": "Male"}

    return {
        "patient": patient,
        "problems": problems,
        "vitals": vitals,
        "labs": labs,
        "encounters": encounters,
    }


def run_eval():
    cases = load_cases()
    passed = 0
    failed = 0
    results = []

    for case in cases:
        data = build_mock_data(case)
        expected = case["expected"]

        # Run CMS165
        cms165 = evaluate_cms165(
            patient=data["patient"],
            vitals=data["vitals"],
            problems=data["problems"],
            encounters=data["encounters"],
            measurement_period_start=PERIOD_START,
            measurement_period_end=PERIOD_END,
        )

        # Run CMS122
        cms122 = evaluate_cms122(
            patient=data["patient"],
            labs=data["labs"],
            problems=data["problems"],
            encounters=data["encounters"],
            measurement_period_start=PERIOD_START,
            measurement_period_end=PERIOD_END,
        )

        # Compute risk score
        risk = compute_risk_score(
            cms165=cms165,
            cms122=cms122,
            encounters=data["encounters"],
            measurement_period_end=PERIOD_END,
            adherence_pdc=None,
        )

        # Check results
        errors = []

        if cms165.controlled != expected["cms165_controlled"]:
            errors.append(
                f"CMS165: expected controlled={expected['cms165_controlled']}, "
                f"got {cms165.controlled}"
            )

        if cms122.poor_control != expected["cms122_poor_control"]:
            errors.append(
                f"CMS122: expected poor_control={expected['cms122_poor_control']}, "
                f"got {cms122.poor_control}"
            )

        if risk.risk_band != expected["risk_band"]:
            errors.append(
                f"Risk band: expected {expected['risk_band']}, "
                f"got {risk.risk_band} (score={risk.score:.3f})"
            )

        if errors:
            failed += 1
            status = "FAIL"
        else:
            passed += 1
            status = "PASS"

        result = {
            "id": case["id"],
            "description": case["description"],
            "status": status,
            "errors": errors,
            "cms165_controlled": cms165.controlled,
            "cms122_poor_control": cms122.poor_control,
            "risk_band": risk.risk_band,
            "risk_score": round(risk.score, 3),
        }
        results.append(result)

        icon = "+" if status == "PASS" else "x"
        print(f"  [{icon}] {case['id']}: {case['description']}")
        for err in errors:
            print(f"      ERROR: {err}")

    print(f"\n  Results: {passed}/{passed + failed} passed")
    accuracy = passed / (passed + failed) * 100 if (passed + failed) > 0 else 0
    print(f"  Accuracy: {accuracy:.1f}%")

    return {
        "eval": "care_gaps",
        "passed": passed,
        "failed": failed,
        "accuracy": accuracy,
        "results": results,
    }


if __name__ == "__main__":
    print("Care Gap Detection Eval")
    print("=" * 50)
    run_eval()
