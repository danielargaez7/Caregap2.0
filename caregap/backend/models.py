from __future__ import annotations

from datetime import datetime, date
from sqlalchemy import (
    BigInteger, String, Text, Date, DateTime, Integer, Numeric,
    ForeignKey, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class RiskAssessment(Base):
    __tablename__ = "ccrd_risk_assessment"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pid: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    measurement_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    measurement_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    score: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    risk_band: Mapped[str] = mapped_column(String(16), nullable=False)
    flags_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    spec_versions_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    factors: Mapped[list["RiskFactor"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_pid_time", "pid", "computed_at"),
    )


class RiskFactor(Base):
    __tablename__ = "ccrd_risk_factor"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    assessment_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("ccrd_risk_assessment.id"), nullable=False)
    factor_code: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(32), nullable=False)
    evidence_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    evidence_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    assessment: Mapped["RiskAssessment"] = relationship(back_populates="factors")


class Alert(Base):
    __tablename__ = "ccrd_alert"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pid: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    assessment_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("ccrd_risk_assessment.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    followups: Mapped[list["Followup"]] = relationship(back_populates="alert", cascade="all, delete-orphan")


class Followup(Base):
    __tablename__ = "ccrd_followup"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pid: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    alert_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("ccrd_alert.id"), nullable=True)
    task_type: Mapped[str] = mapped_column(String(32), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    alert: Mapped["Alert | None"] = relationship(back_populates="followups")


class ExternalLink(Base):
    __tablename__ = "ccrd_external_link"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pid: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_system: Mapped[str] = mapped_column(String(32), nullable=False)
    external_patient_id: Mapped[str] = mapped_column(String(64), nullable=False)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")

    __table_args__ = (
        UniqueConstraint("pid", "source_system", name="uq_pid_source"),
    )


class ClaimsCache(Base):
    __tablename__ = "ccrd_claims_cache"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pid: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_system: Mapped[str] = mapped_column(String(32), nullable=False)
    eob_id: Mapped[str] = mapped_column(String(64), nullable=False)
    claim_type: Mapped[str] = mapped_column(String(32), nullable=False)
    service_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    service_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    ndc: Mapped[str | None] = mapped_column(String(32), nullable=True)
    days_supply: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_eob_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("source_system", "eob_id", name="uq_source_eob"),
        Index("idx_pid_type_date", "pid", "claim_type", "service_start"),
    )


class AgentRun(Base):
    __tablename__ = "ccrd_agent_run"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_uuid: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actor_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cohort_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    spec_versions_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    logs_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class AuditLog(Base):
    __tablename__ = "ccrd_audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    user: Mapped[str] = mapped_column(String(64), nullable=False, default="admin")
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False)
    resource_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    pid: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    detail_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="api")

    __table_args__ = (
        Index("idx_audit_ts", "timestamp"),
        Index("idx_audit_action", "action"),
    )
