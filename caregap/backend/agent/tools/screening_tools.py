"""Screening and coverage tools — condition screening + cost-aware recommendations."""

from __future__ import annotations

import json


async def run_screenings_handler(params: dict, context: dict) -> str:
    """Run all condition screenings for a patient."""
    from services.openemr_client import get_openemr_client
    from services.measures.screening import run_all_screenings

    openemr = get_openemr_client()
    puuid = params["patient_uuid"]

    # Fetch clinical data
    snapshot = await openemr.get_clinical_snapshot(puuid)

    # Calculate age
    dob = snapshot.get("demographics", {}).get("DOB", "")
    age = 65  # default
    if dob:
        from datetime import date
        try:
            birth = date.fromisoformat(dob)
            age = (date.today() - birth).days // 365
        except ValueError:
            pass

    sex = snapshot.get("demographics", {}).get("sex", "")

    results = run_all_screenings(
        age=age,
        sex=sex,
        vitals=snapshot.get("vitals", []),
        labs=snapshot.get("labs", []),
        problems=snapshot.get("problems", []),
        encounters=snapshot.get("encounters", []),
    )

    output = []
    for r in results:
        entry = {
            "condition": r.condition,
            "status": r.status,
            "severity": r.severity,
            "detail": r.detail,
            "recommendation": r.recommendation,
        }
        if r.evidence:
            entry["evidence"] = r.evidence
        output.append(entry)

    return json.dumps({"screenings": output, "total": len(output)})


def _lookup_patient_coverage(pid: int, db) -> "CoverageInfo":
    """Look up a patient's actual insurance from the ccrd_external_link table."""
    from services.coverage import CoverageInfo, coverage_from_insurance_type
    from models import ExternalLink

    link = (
        db.query(ExternalLink)
        .filter(ExternalLink.pid == pid, ExternalLink.status == "active")
        .first()
    )

    if link:
        return coverage_from_insurance_type(
            insurance_type=link.source_system,
            member_id=link.external_patient_id,
        )

    # No insurance on file — return empty (agent will note coverage unknown)
    return CoverageInfo()


async def get_coverage_summary_handler(params: dict, context: dict) -> str:
    """Get coverage info and preventive care cost summary for a patient."""
    from services.coverage import get_preventive_care_summary
    from services.openemr_client import get_openemr_client

    openemr = get_openemr_client()
    puuid = params["patient_uuid"]
    db = context["db"]

    # Get demographics for age/sex
    patient = await openemr.get_patient(puuid)
    dob = patient.get("DOB", "")
    age = 65
    if dob:
        from datetime import date
        try:
            birth = date.fromisoformat(dob)
            age = (date.today() - birth).days // 365
        except ValueError:
            pass

    sex = patient.get("sex", "")
    problems = await openemr.get_problems(puuid)

    # Look up real insurance from DB instead of hardcoding Medicare
    pid = patient.get("pid") or patient.get("id")
    if pid:
        coverage = _lookup_patient_coverage(int(pid), db)
    else:
        from services.coverage import CoverageInfo
        coverage = CoverageInfo()

    services = get_preventive_care_summary(age, sex, problems, coverage)

    output = []
    zero_cost_count = 0
    for s in services:
        entry = {
            "service": s.service_name,
            "estimated_cost": s.estimated_cost,
            "coverage_detail": s.coverage_detail,
            "frequency": s.frequency,
            "notes": s.notes,
        }
        output.append(entry)
        if s.estimated_cost == "$0":
            zero_cost_count += 1

    # Build coverage summary with actual insurance info
    coverage_summary = {
        "insurance_type": coverage.insurance_type or "unknown",
        "plan_name": coverage.plan_name or "Not on file",
        "member_id": coverage.member_id or "N/A",
    }
    if coverage.has_medicare_a or coverage.has_medicare_b:
        coverage_summary["medicare_a"] = coverage.has_medicare_a
        coverage_summary["medicare_b"] = coverage.has_medicare_b
        coverage_summary["medicare_d"] = coverage.has_medicare_d
    if coverage.has_medicaid:
        coverage_summary["medicaid"] = True
    if coverage.has_commercial:
        coverage_summary["commercial"] = True

    return json.dumps({
        "services": output,
        "total_services": len(output),
        "zero_cost_services": zero_cost_count,
        "coverage": coverage_summary,
    })


SCREENING_TOOLS = [
    {
        "name": "run_screenings",
        "description": "Run comprehensive health screenings for a patient — checks for CKD (kidney disease), COPD, heart disease, depression, and overdue cancer screenings. Returns findings with plain-language explanations and cost information.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID from OpenEMR"},
            },
            "required": ["patient_uuid"],
        },
        "handler": run_screenings_handler,
    },
    {
        "name": "get_coverage_summary",
        "description": "Get insurance coverage summary and list of recommended preventive services with cost estimates. Looks up the patient's actual insurance (Medicare, Medicaid, or commercial) and shows which screenings and visits are free ($0) or low-cost under their specific plan.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID from OpenEMR"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_coverage_summary_handler,
    },
]
