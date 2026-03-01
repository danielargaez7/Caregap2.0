"""Clinical data tools — vitals, labs, medications, problems from OpenEMR."""

import json


async def get_latest_vitals_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    vitals = await client.get_all_vitals(params["patient_uuid"])

    if not vitals:
        return json.dumps({"vitals": [], "message": "No vitals found for this patient."})

    # Sort by date descending, return most recent
    vitals.sort(key=lambda v: v.get("date", ""), reverse=True)
    latest = vitals[0]
    return json.dumps({
        "bps": latest.get("bps"),
        "bpd": latest.get("bpd"),
        "weight": latest.get("weight"),
        "height": latest.get("height"),
        "temperature": latest.get("temperature"),
        "pulse": latest.get("pulse"),
        "date": latest.get("date"),
        "id": latest.get("id") or latest.get("uuid", ""),
    })


async def get_vital_history_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    vitals = await client.get_all_vitals(params["patient_uuid"])

    if not vitals:
        return json.dumps({"readings": [], "message": "No vitals found."})

    vitals.sort(key=lambda v: v.get("date", ""), reverse=True)
    limit = params.get("limit", 10)

    readings = []
    for v in vitals[:limit]:
        readings.append({
            "bps": v.get("bps"),
            "bpd": v.get("bpd"),
            "date": v.get("date"),
            "id": v.get("id") or v.get("uuid", ""),
        })
    return json.dumps({"readings": readings, "total_available": len(vitals)})


async def get_latest_labs_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    labs = await client.get_lab_results(params["patient_uuid"])

    if not labs:
        return json.dumps({"labs": [], "message": "No lab results found for this patient."})

    labs.sort(key=lambda l: l.get("date", "") or l.get("date_report", ""), reverse=True)
    limit = params.get("limit", 10)

    results = []
    for lab in labs[:limit]:
        results.append({
            "name": lab.get("name") or lab.get("procedure_name", ""),
            "result_code": lab.get("result_code", ""),
            "result": lab.get("result"),
            "units": lab.get("units", ""),
            "range": lab.get("range", ""),
            "abnormal": lab.get("abnormal", ""),
            "date": lab.get("date") or lab.get("date_report", ""),
            "id": lab.get("id") or lab.get("uuid", ""),
        })
    return json.dumps({"labs": results, "total_available": len(labs)})


async def get_active_medications_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    meds = await client.get_medications(params["patient_uuid"])

    if not meds:
        return json.dumps({"medications": [], "message": "No medications found."})

    results = []
    for m in meds:
        results.append({
            "drug": m.get("drug") or m.get("title", ""),
            "rxnorm": m.get("rxnorm_drugcode", ""),
            "dosage": m.get("dosage", ""),
            "route": m.get("route", ""),
            "start_date": m.get("start_date") or m.get("begdate", ""),
            "end_date": m.get("end_date") or m.get("enddate", ""),
        })
    return json.dumps({"medications": results, "total": len(results)})


async def get_active_problems_handler(params: dict, context: dict) -> str:
    client = context["openemr"]
    problems = await client.get_problems(params["patient_uuid"])

    if not problems:
        return json.dumps({"problems": [], "message": "No problems found."})

    results = []
    for p in problems:
        results.append({
            "title": p.get("title", ""),
            "diagnosis": p.get("diagnosis", ""),
            "begdate": p.get("begdate", ""),
            "enddate": p.get("enddate", ""),
            "activity": p.get("activity", ""),
        })
    return json.dumps({"problems": results, "total": len(results)})


CLINICAL_TOOLS = [
    {
        "name": "get_latest_vitals",
        "description": "Get the most recent vital signs (BP, weight, height, pulse) for a patient from OpenEMR.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_latest_vitals_handler,
    },
    {
        "name": "get_vital_history",
        "description": "Get blood pressure reading history over time for a patient. Useful for trending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID"},
                "limit": {"type": "integer", "description": "Number of readings (default 10)"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_vital_history_handler,
    },
    {
        "name": "get_latest_labs",
        "description": "Get recent lab results (HbA1c, etc.) for a patient from OpenEMR.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID"},
                "limit": {"type": "integer", "description": "Number of results (default 10)"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_latest_labs_handler,
    },
    {
        "name": "get_active_medications",
        "description": "Get the active medication list for a patient from OpenEMR.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_active_medications_handler,
    },
    {
        "name": "get_active_problems",
        "description": "Get the problem list (diagnoses) for a patient from OpenEMR. Includes ICD-10 codes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_uuid": {"type": "string", "description": "Patient UUID"},
            },
            "required": ["patient_uuid"],
        },
        "handler": get_active_problems_handler,
    },
]
