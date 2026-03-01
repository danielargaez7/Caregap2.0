from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import RiskAssessment, RiskFactor, ExternalLink
from schemas import (
    RiskAssessmentCreate, RiskAssessmentResponse, PaginatedResponse,
)

router = APIRouter()


@router.post("/", response_model=RiskAssessmentResponse, status_code=201)
def create_risk_assessment(payload: RiskAssessmentCreate, db: Session = Depends(get_db)):
    assessment = RiskAssessment(
        pid=payload.pid,
        measurement_period_start=payload.measurement_period_start,
        measurement_period_end=payload.measurement_period_end,
        model_name=payload.model_name,
        model_version=payload.model_version,
        score=payload.score,
        risk_band=payload.risk_band,
        flags_json=payload.flags_json,
        spec_versions_json=payload.spec_versions_json,
        computed_at=datetime.utcnow(),
    )
    db.add(assessment)
    db.flush()

    for f in payload.factors:
        factor = RiskFactor(
            assessment_id=assessment.id,
            factor_code=f.factor_code,
            evidence_type=f.evidence_type,
            evidence_ref=f.evidence_ref,
            evidence_json=f.evidence_json,
            created_at=datetime.utcnow(),
        )
        db.add(factor)

    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}", response_model=RiskAssessmentResponse)
def get_risk_assessment(assessment_id: int, db: Session = Depends(get_db)):
    assessment = db.get(RiskAssessment, assessment_id)
    if not assessment:
        raise HTTPException(404, "Risk assessment not found")
    return assessment


@router.get("/patient/{pid}", response_model=PaginatedResponse)
def list_patient_assessments(
    pid: int,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.pid == pid)
        .order_by(RiskAssessment.computed_at.desc())
    )
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[RiskAssessmentResponse.model_validate(r) for r in results],
        meta={"total": total, "limit": limit, "offset": offset},
    )


def _enrich_assessments(results: list, db: Session) -> list:
    """Add patient names and insurance type to assessment dicts."""
    pids = list(set(r.pid for r in results))
    if not pids:
        return []

    # Get patient names from OpenEMR patient_data
    placeholders = ",".join([":p" + str(i) for i in range(len(pids))])
    binds = {f"p{i}": pid for i, pid in enumerate(pids)}
    rows = db.execute(
        text(f"SELECT pid, fname, lname FROM patient_data WHERE pid IN ({placeholders})"),
        binds,
    ).mappings().all()
    info: dict[int, dict] = {r["pid"]: {"fname": r["fname"] or "", "lname": r["lname"] or ""} for r in rows}

    # Get insurance types
    links = db.query(ExternalLink).filter(
        ExternalLink.pid.in_(pids), ExternalLink.status == "active"
    ).all()
    for link in links:
        info.setdefault(link.pid, {})["insurance_type"] = link.source_system

    enriched = []
    for r in results:
        d = RiskAssessmentResponse.model_validate(r).model_dump()
        pi = info.get(r.pid, {})
        d["fname"] = pi.get("fname", "")
        d["lname"] = pi.get("lname", "")
        d["insurance_type"] = pi.get("insurance_type", "")
        enriched.append(d)
    return enriched


@router.get("/", response_model=PaginatedResponse)
def query_assessments(
    risk_band: str | None = None,
    pid: int | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(RiskAssessment)
    if risk_band:
        query = query.filter(RiskAssessment.risk_band == risk_band)
    if pid:
        query = query.filter(RiskAssessment.pid == pid)
    query = query.order_by(RiskAssessment.computed_at.desc())

    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=_enrich_assessments(results, db),
        meta={"total": total, "limit": limit, "offset": offset},
    )
