"""Followup task management tools — create and track work queue items."""

import json
from datetime import datetime


async def create_followup_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Followup
    from datetime import date

    due_date = None
    if params.get("due_date"):
        due_date = date.fromisoformat(params["due_date"])

    followup = Followup(
        pid=params["pid"],
        alert_id=params.get("alert_id"),
        task_type=params["task_type"],
        due_date=due_date,
        payload_json=params.get("payload", {}),
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)

    return json.dumps({
        "id": followup.id,
        "pid": followup.pid,
        "task_type": followup.task_type,
        "due_date": str(followup.due_date) if followup.due_date else None,
        "status": "open",
    })


async def get_work_queue_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Followup

    query = db.query(Followup).filter(Followup.status == "open")

    if params.get("task_type"):
        query = query.filter(Followup.task_type == params["task_type"])
    if params.get("pid"):
        query = query.filter(Followup.pid == params["pid"])

    query = query.order_by(Followup.due_date.asc().nullslast())
    tasks = query.limit(params.get("limit", 30)).all()

    results = [
        {
            "id": t.id,
            "pid": t.pid,
            "task_type": t.task_type,
            "due_date": str(t.due_date) if t.due_date else None,
            "payload": t.payload_json,
            "created_at": t.created_at.isoformat(),
        }
        for t in tasks
    ]
    return json.dumps({"tasks": results, "total": len(results)})


async def complete_followup_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Followup

    followup = db.get(Followup, params["followup_id"])
    if not followup:
        return json.dumps({"error": "Followup not found"})

    followup.status = "completed"
    followup.completed_at = datetime.utcnow()
    db.commit()

    return json.dumps({"id": followup.id, "status": "completed"})


FOLLOWUP_TOOLS = [
    {
        "name": "create_followup",
        "description": "Create a followup task (order lab, schedule visit, call patient).",
        "input_schema": {
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "Patient ID"},
                "alert_id": {"type": "integer", "description": "Linked alert ID"},
                "task_type": {"type": "string", "enum": ["schedule_visit", "order_lab", "call_patient"]},
                "due_date": {"type": "string", "description": "Due date (YYYY-MM-DD)"},
                "payload": {"type": "object", "description": "Additional task details"},
            },
            "required": ["pid", "task_type"],
        },
        "handler": create_followup_handler,
    },
    {
        "name": "get_work_queue",
        "description": "Get open followup tasks (work queue). Filter by task type or patient.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_type": {"type": "string", "enum": ["schedule_visit", "order_lab", "call_patient"]},
                "pid": {"type": "integer", "description": "Filter by patient ID"},
                "limit": {"type": "integer", "description": "Max results (default 30)"},
            },
        },
        "handler": get_work_queue_handler,
    },
    {
        "name": "complete_followup",
        "description": "Mark a followup task as completed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "followup_id": {"type": "integer", "description": "Followup task ID"},
            },
            "required": ["followup_id"],
        },
        "handler": complete_followup_handler,
    },
]
