from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Followup
from schemas import FollowupCreate, FollowupUpdate, FollowupResponse, PaginatedResponse
from utils.audit import log_audit

router = APIRouter()


@router.post("/", response_model=FollowupResponse, status_code=201)
def create_followup(payload: FollowupCreate, db: Session = Depends(get_db)):
    followup = Followup(
        pid=payload.pid,
        alert_id=payload.alert_id,
        task_type=payload.task_type,
        due_date=payload.due_date,
        assigned_to_user_id=payload.assigned_to_user_id,
        payload_json=payload.payload_json,
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)
    log_audit("followup_created", "followup", resource_id=followup.id, pid=followup.pid,
              detail={"task_type": followup.task_type, "due_date": str(followup.due_date)})
    return followup


@router.get("/{followup_id}", response_model=FollowupResponse)
def get_followup(followup_id: int, db: Session = Depends(get_db)):
    followup = db.get(Followup, followup_id)
    if not followup:
        raise HTTPException(404, "Followup not found")
    return followup


@router.patch("/{followup_id}", response_model=FollowupResponse)
def update_followup(followup_id: int, payload: FollowupUpdate, db: Session = Depends(get_db)):
    followup = db.get(Followup, followup_id)
    if not followup:
        raise HTTPException(404, "Followup not found")

    if payload.status is not None:
        followup.status = payload.status
        if payload.status == "completed":
            followup.completed_at = datetime.utcnow()
    if payload.due_date is not None:
        followup.due_date = payload.due_date
    if payload.assigned_to_user_id is not None:
        followup.assigned_to_user_id = payload.assigned_to_user_id

    db.commit()
    db.refresh(followup)
    if payload.status == "completed":
        log_audit("followup_completed", "followup", resource_id=followup.id, pid=followup.pid,
                  detail={"task_type": followup.task_type})
    return followup


@router.get("/patient/{pid}", response_model=PaginatedResponse)
def list_patient_followups(
    pid: int,
    status: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Followup).filter(Followup.pid == pid)
    if status:
        query = query.filter(Followup.status == status)
    query = query.order_by(Followup.created_at.desc())
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[FollowupResponse.model_validate(r) for r in results],
        meta={"total": total},
    )


@router.get("/", response_model=PaginatedResponse)
def query_followups(
    status: str | None = None,
    task_type: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Followup)
    if status:
        query = query.filter(Followup.status == status)
    if task_type:
        query = query.filter(Followup.task_type == task_type)
    # MariaDB doesn't support NULLS LAST — use COALESCE to push nulls to end
    from sqlalchemy import case
    query = query.order_by(
        case((Followup.due_date.is_(None), 1), else_=0),
        Followup.due_date.asc(),
        Followup.created_at.desc(),
    )

    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[FollowupResponse.model_validate(r) for r in results],
        meta={"total": total},
    )
