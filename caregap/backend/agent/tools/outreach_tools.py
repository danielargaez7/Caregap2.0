"""Automated outreach tools — schedule calls and send emails to patients.

These are simulated for demo purposes but create real Followup records
so the outreach shows up in the work queue.
"""

import json
from datetime import datetime, date

from sqlalchemy import text


def _get_patient_name(db, pid: int) -> str:
    """Look up patient name from OpenEMR patient_data table."""
    row = db.execute(
        text("SELECT fname, lname FROM patient_data WHERE pid = :pid"),
        {"pid": pid},
    ).fetchone()
    if row:
        return f"{row[0]} {row[1]}"
    return f"Patient {pid}"


async def send_automated_call_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Followup

    pid = params["pid"]
    message = params["message"]
    urgency = params.get("urgency", "routine")

    patient_name = _get_patient_name(db, pid)

    followup = Followup(
        pid=pid,
        alert_id=params.get("alert_id"),
        task_type="automated_call",
        due_date=date.today(),
        payload_json={
            "message": message,
            "urgency": urgency,
            "patient_name": patient_name,
            "scheduled_at": datetime.utcnow().isoformat(),
        },
        status="completed",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)

    delivery = "within 1 hour" if urgency == "urgent" else "within 4 hours"

    return json.dumps({
        "status": "scheduled",
        "followup_id": followup.id,
        "patient_name": patient_name,
        "pid": pid,
        "urgency": urgency,
        "message": message,
        "expected_delivery": delivery,
        "summary": f"Automated call scheduled for {patient_name} (PID {pid}). Urgency: {urgency}. Expected delivery: {delivery}.",
    })


async def send_email_outreach_handler(params: dict, context: dict) -> str:
    db = context["db"]
    from models import Followup

    pid = params["pid"]
    subject = params["subject"]
    message = params["message"]

    patient_name = _get_patient_name(db, pid)

    followup = Followup(
        pid=pid,
        alert_id=params.get("alert_id"),
        task_type="email_outreach",
        due_date=date.today(),
        payload_json={
            "subject": subject,
            "message": message,
            "patient_name": patient_name,
            "sent_at": datetime.utcnow().isoformat(),
        },
        status="completed",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)

    return json.dumps({
        "status": "sent",
        "followup_id": followup.id,
        "patient_name": patient_name,
        "pid": pid,
        "subject": subject,
        "summary": f"Email sent to {patient_name} (PID {pid}). Subject: {subject}.",
    })


OUTREACH_TOOLS = [
    {
        "name": "send_automated_call",
        "description": "Schedule an automated phone call to a patient about their care gaps, overdue appointments, or medication reminders. Creates a followup record for tracking.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "Patient ID to call"},
                "message": {"type": "string", "description": "The message to deliver in the call (e.g., 'Your blood pressure follow-up is overdue. Please call the clinic at 555-0100 to schedule.')"},
                "urgency": {"type": "string", "enum": ["routine", "urgent"], "description": "Call priority — urgent calls are delivered within 1 hour, routine within 4 hours"},
                "alert_id": {"type": "integer", "description": "Optional linked alert ID"},
            },
            "required": ["pid", "message"],
        },
        "handler": send_automated_call_handler,
    },
    {
        "name": "send_email_outreach",
        "description": "Send an outreach email to a patient about upcoming screenings, care gap notifications, or medication refill reminders. Creates a followup record for tracking.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pid": {"type": "integer", "description": "Patient ID to email"},
                "subject": {"type": "string", "description": "Email subject line"},
                "message": {"type": "string", "description": "Email body content"},
                "alert_id": {"type": "integer", "description": "Optional linked alert ID"},
            },
            "required": ["pid", "subject", "message"],
        },
        "handler": send_email_outreach_handler,
    },
]
