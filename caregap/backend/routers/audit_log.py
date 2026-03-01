"""Read-only audit log API — append-only, no create/update/delete endpoints."""
from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog
from schemas import AuditLogResponse, PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
def query_audit_logs(
    action: str | None = None,
    resource_type: str | None = None,
    pid: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if pid:
        query = query.filter(AuditLog.pid == pid)
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            query = query.filter(AuditLog.timestamp >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(AuditLog.timestamp <= dt)
        except ValueError:
            pass

    query = query.order_by(desc(AuditLog.timestamp))
    total = query.count()
    results = query.offset(offset).limit(limit).all()

    return PaginatedResponse(
        data=[AuditLogResponse.model_validate(r) for r in results],
        meta={"total": total},
    )


@router.get("/actions")
def list_action_types():
    """Return the list of valid action types for filter dropdowns."""
    return {
        "actions": [
            "chat_message_sent",
            "chat_message_received",
            "tool_call_executed",
            "alert_created",
            "alert_acknowledged",
            "alert_closed",
            "followup_created",
            "followup_completed",
            "risk_assessment_run",
            "patient_data_accessed",
            "cohort_assessed",
            "claims_synced",
        ]
    }
