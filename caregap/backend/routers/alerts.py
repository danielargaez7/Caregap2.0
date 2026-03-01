from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert
from schemas import AlertCreate, AlertUpdate, AlertResponse, PaginatedResponse
from utils.audit import log_audit

router = APIRouter()


@router.post("/", response_model=AlertResponse, status_code=201)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    alert = Alert(
        pid=payload.pid,
        assessment_id=payload.assessment_id,
        severity=payload.severity,
        alert_type=payload.alert_type,
        title=payload.title,
        detail=payload.detail,
        recommended_action=payload.recommended_action,
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    log_audit("alert_created", "alert", resource_id=alert.id, pid=alert.pid,
              detail={"severity": alert.severity, "title": alert.title, "alert_type": alert.alert_type})
    return alert


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(alert_id: int, payload: AlertUpdate, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.status = payload.status
    if payload.status == "closed":
        alert.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    action_name = "alert_closed" if payload.status == "closed" else "alert_acknowledged"
    log_audit(action_name, "alert", resource_id=alert.id, pid=alert.pid,
              detail={"new_status": payload.status})
    return alert


@router.get("/patient/{pid}", response_model=PaginatedResponse)
def list_patient_alerts(
    pid: int,
    status: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Alert).filter(Alert.pid == pid)
    if status:
        query = query.filter(Alert.status == status)
    query = query.order_by(Alert.created_at.desc())
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[AlertResponse.model_validate(r) for r in results],
        meta={"total": total},
    )


@router.get("/", response_model=PaginatedResponse)
def query_alerts(
    status: str | None = None,
    severity: str | None = None,
    alert_type: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    query = query.order_by(Alert.created_at.desc())

    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[AlertResponse.model_validate(r) for r in results],
        meta={"total": total},
    )
