"""Alert management tools — create, query, and acknowledge alerts."""

import json
from datetime import datetime


async def create_alert_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Alert

    alert = Alert(
        pid=params["pid"],
        assessment_id=params.get("assessment_id"),
        severity=params["severity"],
        alert_type=params["alert_type"],
        title=params["title"],
        detail=params["detail"],
        recommended_action=params["recommended_action"],
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return json.dumps({
        "id": alert.id,
        "pid": alert.pid,
        "title": alert.title,
        "severity": alert.severity,
        "status": "open",
    })


async def get_open_alerts_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Alert

    query = db.query(Alert).filter(Alert.status == "open")

    if params.get("severity"):
        query = query.filter(Alert.severity == params["severity"])
    if params.get("pid"):
        query = query.filter(Alert.pid == params["pid"])

    query = query.order_by(Alert.created_at.desc())
    alerts = query.limit(params.get("limit", 20)).all()

    results = [
        {
            "id": a.id,
            "pid": a.pid,
            "severity": a.severity,
            "alert_type": a.alert_type,
            "title": a.title,
            "detail": a.detail,
            "recommended_action": a.recommended_action,
            "created_at": a.created_at.isoformat(),
        }
        for a in alerts
    ]
    return json.dumps({"alerts": results, "total": len(results)})


async def acknowledge_alert_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Alert

    alert = db.get(Alert, params["alert_id"])
    if not alert:
        return json.dumps({"error": "Alert not found"})

    alert.status = params.get("status", "ack")
    if alert.status == "closed":
        alert.closed_at = datetime.utcnow()
    db.commit()

    return json.dumps({"id": alert.id, "status": alert.status})


ALERT_TOOLS = [
    {
        "name": "create_alert",
        "description": "Create a new care gap alert for a patient.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "Patient ID"},
                "assessment_id": {"type": "integer", "description": "Linked risk assessment ID"},
                "severity": {"type": "string", "enum": ["info", "warn", "high"]},
                "alert_type": {"type": "string", "enum": ["care-gap", "adherence", "utilization"]},
                "title": {"type": "string", "description": "Short alert title"},
                "detail": {"type": "string", "description": "Detailed description"},
                "recommended_action": {"type": "string", "description": "What to do about it"},
            },
            "required": ["pid", "severity", "alert_type", "title", "detail", "recommended_action"],
        },
        "handler": create_alert_handler,
    },
    {
        "name": "get_open_alerts",
        "description": "List open (unresolved) alerts. Filter by severity or patient.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["info", "warn", "high"]},
                "pid": {"type": "integer", "description": "Filter by patient ID"},
                "limit": {"type": "integer", "description": "Max results (default 20)"},
            },
        },
        "handler": get_open_alerts_handler,
    },
    {
        "name": "acknowledge_alert",
        "description": "Acknowledge or close an alert.",
        "input_schema": {
            "type": "object",
            "properties": {
                "alert_id": {"type": "integer", "description": "Alert ID to update"},
                "status": {"type": "string", "enum": ["ack", "closed"]},
            },
            "required": ["alert_id"],
        },
        "handler": acknowledge_alert_handler,
    },
]
