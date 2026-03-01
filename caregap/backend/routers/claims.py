from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case
from sqlalchemy.orm import Session

from database import get_db
from models import ClaimsCache, ExternalLink
from schemas import PaginatedResponse
from utils.audit import log_audit

router = APIRouter()


@router.post("/sync/{pid}")
async def sync_patient_claims(pid: int, db: Session = Depends(get_db)):
    """Trigger Blue Button sync for a patient. Fetches EOBs and caches them."""
    from services.bluebutton_client import get_bluebutton_client

    link = (
        db.query(ExternalLink)
        .filter(ExternalLink.pid == pid, ExternalLink.source_system == "bluebutton")
        .first()
    )

    if not link:
        return {"status": "no_link", "message": "Patient not linked to Blue Button. Authorization required."}

    client = get_bluebutton_client()
    result = await client.sync_eobs(pid, link, db)
    log_audit("claims_synced", "claims", pid=pid,
              detail={"result": str(result)[:500]})
    return result


@router.get("/{pid}/insurance")
def get_patient_insurance(pid: int, db: Session = Depends(get_db)):
    """Get the patient's insurance type and plan details."""
    link = (
        db.query(ExternalLink)
        .filter(ExternalLink.pid == pid, ExternalLink.status == "active")
        .first()
    )

    if not link:
        return {"status": "no_insurance", "message": "No insurance on file for this patient."}

    return {
        "status": "ok",
        "insurance_type": link.source_system,
        "member_id": link.external_patient_id,
        "last_sync": link.last_sync_at.isoformat() if link.last_sync_at else None,
    }


@router.get("/{pid}", response_model=PaginatedResponse)
def get_cached_claims(
    pid: int,
    claim_type: str | None = None,
    source_system: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(ClaimsCache).filter(ClaimsCache.pid == pid)
    if claim_type:
        query = query.filter(ClaimsCache.claim_type == claim_type)
    if source_system:
        query = query.filter(ClaimsCache.source_system == source_system)
    # MariaDB doesn't support NULLS LAST — use CASE workaround
    query = query.order_by(
        case((ClaimsCache.service_start.is_(None), 1), else_=0),
        ClaimsCache.service_start.desc(),
    )

    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[
            {
                "id": r.id,
                "eob_id": r.eob_id,
                "source_system": r.source_system,
                "claim_type": r.claim_type,
                "service_start": str(r.service_start) if r.service_start else None,
                "service_end": str(r.service_end) if r.service_end else None,
                "ndc": r.ndc,
                "days_supply": r.days_supply,
                "fetched_at": r.fetched_at.isoformat(),
            }
            for r in results
        ],
        meta={"total": total},
    )


@router.get("/{pid}/adherence")
def get_adherence_metrics(pid: int, db: Session = Depends(get_db)):
    """Compute PDC-based medication adherence from cached prescription claims."""
    from services.adherence import compute_adherence

    claims = (
        db.query(ClaimsCache)
        .filter(ClaimsCache.pid == pid, ClaimsCache.claim_type == "pde")
        .order_by(ClaimsCache.service_start)
        .all()
    )

    if not claims:
        return {"status": "no_data", "message": "No prescription claims cached for this patient.", "metrics": {}}

    metrics = compute_adherence(claims)

    # Add source info
    sources = set(c.source_system for c in claims)
    metrics["data_sources"] = list(sources)

    return {"status": "ok", "metrics": metrics}
