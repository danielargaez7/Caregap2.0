import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from migrate import run_migration
from utils.logging import setup_logging

from routers import risk_assessments, alerts, followups, agent_runs, patients, agent, claims, audit_log

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_level)
    logger = logging.getLogger(__name__)
    logger.info("Starting CareGap backend...")

    # Create ccrd_* tables (safe — never touches OpenEMR native tables)
    run_migration()
    logger.info("Database migration complete.")

    yield

    logger.info("Shutting down CareGap backend.")


app = FastAPI(
    title="CareGap - Chronic Care Risk Detector",
    description="AI-powered chronic care risk detection integrated with OpenEMR",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(risk_assessments.router, prefix="/api/risk-assessments", tags=["Risk Assessments"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(followups.router, prefix="/api/followups", tags=["Followups"])
app.include_router(agent_runs.router, prefix="/api/agent-runs", tags=["Agent Runs"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(claims.router, prefix="/api/claims", tags=["Claims"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(audit_log.router, prefix="/api/audit-log", tags=["Audit Log"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ccrd-backend"}
