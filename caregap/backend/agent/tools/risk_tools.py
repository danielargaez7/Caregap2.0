"""Risk assessment tools — run CMS gap detection and query results."""

import json


async def run_risk_assessment_handler(params: dict, context: dict) -> str:
    from services.risk_engine import assess_patient
    from services.openemr_client import get_openemr_client

    openemr = get_openemr_client()
    db = context["db"]

    result = await assess_patient(
        patient_uuid=params["patient_uuid"],
        pid=params["pid"],
        openemr=openemr,
        db=db,
    )
    return json.dumps(result, default=str)


async def get_risk_assessment_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import RiskAssessment

    assessment = db.get(RiskAssessment, params["assessment_id"])
    if not assessment:
        return json.dumps({"error": "Assessment not found"})

    factors = [
        {
            "factor_code": f.factor_code,
            "evidence_type": f.evidence_type,
            "evidence_ref": f.evidence_ref,
            "evidence": f.evidence_json,
        }
        for f in assessment.factors
    ]

    return json.dumps({
        "id": assessment.id,
        "pid": assessment.pid,
        "score": float(assessment.score),
        "risk_band": assessment.risk_band,
        "flags": assessment.flags_json,
        "factors": factors,
        "computed_at": assessment.computed_at.isoformat(),
        "spec_versions": assessment.spec_versions_json,
    })


async def get_cohort_summary_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import RiskAssessment
    from sqlalchemy import func

    # Get count by risk band from most recent assessments
    counts = (
        db.query(RiskAssessment.risk_band, func.count(RiskAssessment.id))
        .group_by(RiskAssessment.risk_band)
        .all()
    )

    summary = {band: count for band, count in counts}
    total = sum(summary.values())

    return json.dumps({
        "distribution": summary,
        "total_assessed": total,
        "critical": summary.get("critical", 0),
        "high": summary.get("high", 0),
        "medium": summary.get("medium", 0),
        "low": summary.get("low", 0),
    })


RISK_TOOLS = [
    {
        "name": "run_risk_assessment",
        "description": "Execute CMS165 (BP control) and CMS122 (HbA1c control) gap detection for a specific patient. Creates risk assessment, alerts, and followup tasks.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID from OpenEMR"},
                "pid": {"type": "integer", "description": "Patient internal ID (pid)"},
            },
            "required": ["patient_uuid", "pid"],
        },
        "handler": run_risk_assessment_handler,
    },
    {
        "name": "get_risk_assessment",
        "description": "Retrieve a specific risk assessment with evidence factors.",
        "input_schema": {
            "type": "object",
            "properties": {
                "assessment_id": {"type": "integer", "description": "Risk assessment ID"},
            },
            "required": ["assessment_id"],
        },
        "handler": get_risk_assessment_handler,
    },
    {
        "name": "get_cohort_summary",
        "description": "Get panel-level risk distribution — how many patients in each risk band.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
        "handler": get_cohort_summary_handler,
    },
]
