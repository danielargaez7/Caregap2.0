"""Patient search and retrieval tools — read from OpenEMR API."""

import json


async def search_patients_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    search_params = {}
    if params.get("last_name"):
        search_params["lname"] = params["last_name"]
    if params.get("first_name"):
        search_params["fname"] = params["first_name"]
    if params.get("dob"):
        search_params["DOB"] = params["dob"]

    results = await client.search_patients(search_params)
    if not results:
        return json.dumps({"patients": [], "message": "No patients found matching criteria."})

    patients = []
    for p in results[:20]:
        patients.append({
            "uuid": p.get("uuid", ""),
            "pid": p.get("pid", ""),
            "name": f"{p.get('fname', '')} {p.get('lname', '')}".strip(),
            "dob": p.get("DOB", ""),
            "sex": p.get("sex", ""),
        })
    return json.dumps({"patients": patients, "total": len(results)})


async def get_patient_details_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    patient = await client.get_patient(params["patient_uuid"])
    if not patient:
        return json.dumps({"error": "Patient not found"})
    return json.dumps({
        "uuid": patient.get("uuid", ""),
        "pid": patient.get("pid", ""),
        "name": f"{patient.get('fname', '')} {patient.get('lname', '')}".strip(),
        "dob": patient.get("DOB", ""),
        "sex": patient.get("sex", ""),
        "race": patient.get("race", ""),
        "ethnicity": patient.get("ethnicity", ""),
        "phone": patient.get("phone_home", "") or patient.get("phone_cell", ""),
        "email": patient.get("email", ""),
    })


async def get_high_risk_patients_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import RiskAssessment, ExternalLink
    from sqlalchemy import desc
    from sqlalchemy.sql import text

    risk_band = params.get("risk_band", "high")
    limit = params.get("limit", 20)

    # Get most recent assessment per patient
    assessments = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.risk_band == risk_band)
        .order_by(desc(RiskAssessment.score))
        .limit(limit)
        .all()
    )

    if not assessments:
        return json.dumps({"patients": [], "total": 0, "risk_band": risk_band})

    # Enrich with patient names, UUIDs, and insurance from DB
    pids = list(set(a.pid for a in assessments))
    placeholders = ",".join([f":p{i}" for i in range(len(pids))])
    binds = {f"p{i}": pid for i, pid in enumerate(pids)}

    rows = db.execute(
        text(f"SELECT pid, uuid, fname, lname FROM patient_data WHERE pid IN ({placeholders})"),
        binds,
    ).mappings().all()
    patient_info = {}
    for r in rows:
        raw_uuid = r["uuid"]
        # OpenEMR stores uuid as binary — convert to hex string
        if isinstance(raw_uuid, (bytes, bytearray)):
            hex_str = raw_uuid.hex()
            formatted = f"{hex_str[:8]}-{hex_str[8:12]}-{hex_str[12:16]}-{hex_str[16:20]}-{hex_str[20:]}"
        else:
            formatted = str(raw_uuid) if raw_uuid else ""
        patient_info[r["pid"]] = {
            "name": f"{r['fname'] or ''} {r['lname'] or ''}".strip(),
            "uuid": formatted,
        }

    links = db.query(ExternalLink).filter(
        ExternalLink.pid.in_(pids), ExternalLink.status == "active"
    ).all()
    for link in links:
        patient_info.setdefault(link.pid, {})["insurance_type"] = link.source_system

    results = []
    for a in assessments:
        info = patient_info.get(a.pid, {})
        results.append({
            "pid": a.pid,
            "name": info.get("name", f"PID {a.pid}"),
            "uuid": info.get("uuid", ""),
            "insurance_type": info.get("insurance_type", "unknown"),
            "score": float(a.score),
            "risk_band": a.risk_band,
            "flags": a.flags_json,
            "computed_at": a.computed_at.isoformat(),
        })
    return json.dumps({"patients": results, "total": len(results), "risk_band": risk_band})


PATIENT_TOOLS = [
    {
        "name": "search_patients",
        "description": "Search for patients by name or date of birth in OpenEMR.",
        "input_schema": {
            "type": "object",
            "properties": {
                "last_name": {"type": "string", "description": "Patient last name"},
                "first_name": {"type": "string", "description": "Patient first name"},
                "dob": {"type": "string", "description": "Date of birth (YYYY-MM-DD)"},
            },
        },
        "handler": search_patients_handler,
    },
    {
        "name": "get_patient_details",
        "description": "Get full demographics for a specific patient from OpenEMR.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID from OpenEMR"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_patient_details_handler,
    },
    {
        "name": "get_high_risk_patients",
        "description": "Get patients with a specific risk band from CareGap risk assessments. Use this to find patients who need attention.",
        "input_schema": {
            "type": "object",
            "properties": {
                "risk_band": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Risk level to filter by",
                },
                "limit": {"type": "integer", "description": "Max results (default 20)"},
            },
        },
        "handler": get_high_risk_patients_handler,
    },
]
