"""Claims and adherence tools — prescription claims data access."""

import json


async def get_adherence_summary_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import ClaimsCache, ExternalLink
    from services.adherence import compute_adherence

    pid = params["pid"]

    # Look up insurance type for context
    link = (
        db.query(ExternalLink)
        .filter(ExternalLink.pid == pid, ExternalLink.status == "active")
        .first()
    )
    insurance_type = link.source_system if link else "unknown"

    claims = (
        db.query(ClaimsCache)
        .filter(ClaimsCache.pid == pid, ClaimsCache.claim_type == "pde")
        .order_by(ClaimsCache.service_start)
        .all()
    )

    if not claims:
        return json.dumps({
            "status": "no_data",
            "message": f"No prescription claims cached. Patient insurance: {insurance_type}.",
            "pid": pid,
            "insurance_type": insurance_type,
        })

    metrics = compute_adherence(claims)
    metrics["insurance_type"] = insurance_type
    metrics["data_sources"] = list(set(c.source_system for c in claims))
    return json.dumps(metrics, default=str)


CLAIMS_TOOLS = [
    {
        "name": "get_adherence_summary",
        "description": "Get medication adherence metrics (PDC) from cached prescription claims for a patient. Works with Medicare, Medicaid, and commercial insurance claims. Returns per-drug and overall adherence percentages.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "Patient ID"},
            },
            "required": ["pid"],
        },
        "handler": get_adherence_summary_handler,
    },
]
