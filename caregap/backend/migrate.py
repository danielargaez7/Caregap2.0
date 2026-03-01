"""Create ccrd_* tables in the OpenEMR MySQL database on startup."""

import logging
from sqlalchemy import inspect
from database import engine, Base
from models import (
    RiskAssessment, RiskFactor, Alert, Followup,
    ExternalLink, ClaimsCache, AgentRun, AuditLog,
)

logger = logging.getLogger(__name__)

CCRD_TABLES = [
    RiskAssessment.__tablename__,
    RiskFactor.__tablename__,
    Alert.__tablename__,
    Followup.__tablename__,
    ExternalLink.__tablename__,
    ClaimsCache.__tablename__,
    AgentRun.__tablename__,
    AuditLog.__tablename__,
]


def run_migration():
    """Create ccrd_* tables if they don't exist. Never touches OpenEMR's native tables."""
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())

    missing = [t for t in CCRD_TABLES if t not in existing]

    if not missing:
        logger.info("All ccrd_* tables already exist.")
        return

    logger.info(f"Creating missing tables: {missing}")

    # Only create tables that belong to our models (ccrd_* prefix)
    ccrd_tables = [
        table for table in Base.metadata.sorted_tables
        if table.name.startswith("ccrd_")
    ]
    Base.metadata.create_all(engine, tables=ccrd_tables)

    logger.info("Migration complete — ccrd_* tables created.")
