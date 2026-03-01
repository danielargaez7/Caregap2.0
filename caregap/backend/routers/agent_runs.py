from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import AgentRun
from schemas import AgentRunCreate, AgentRunUpdate, AgentRunResponse, PaginatedResponse

router = APIRouter()


@router.post("/", response_model=AgentRunResponse, status_code=201)
def create_agent_run(payload: AgentRunCreate, db: Session = Depends(get_db)):
    run = AgentRun(
        run_uuid=payload.run_uuid,
        cohort_size=payload.cohort_size,
        model_version=payload.model_version,
        spec_versions_json=payload.spec_versions_json,
        logs_json={},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.patch("/{run_uuid}", response_model=AgentRunResponse)
def update_agent_run(run_uuid: str, payload: AgentRunUpdate, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.run_uuid == run_uuid).first()
    if not run:
        raise HTTPException(404, "Agent run not found")

    if payload.finished_at is not None:
        run.finished_at = payload.finished_at
    if payload.success_count is not None:
        run.success_count = payload.success_count
    if payload.error_count is not None:
        run.error_count = payload.error_count
    if payload.logs_json is not None:
        run.logs_json = payload.logs_json

    db.commit()
    db.refresh(run)
    return run


@router.get("/", response_model=PaginatedResponse)
def list_agent_runs(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(AgentRun).order_by(AgentRun.started_at.desc())
    total = query.count()
    results = query.offset(offset).limit(limit).all()
    return PaginatedResponse(
        data=[AgentRunResponse.model_validate(r) for r in results],
        meta={"total": total},
    )
