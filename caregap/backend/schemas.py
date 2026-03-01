from __future__ import annotations

from datetime import datetime, date
from pydantic import BaseModel, Field


# --- Risk Assessment ---

class RiskFactorCreate(BaseModel):
    factor_code: str = Field(..., description="e.g. BP_UNCONTROLLED, A1C_MISSING")
    evidence_type: str = Field(..., description="vital, lab, claim, problem")
    evidence_ref: str = Field(..., description="e.g. form_vitals:123, procedure_result:456")
    evidence_json: dict = Field(..., description="Snapshot of evidence values")


class RiskAssessmentCreate(BaseModel):
    pid: int
    measurement_period_start: date
    measurement_period_end: date
    model_name: str = "cms-gap-rules"
    model_version: str = "2026.02"
    score: float = Field(..., ge=0, le=1)
    risk_band: str = Field(..., pattern="^(low|medium|high|critical)$")
    flags_json: dict = Field(default_factory=dict)
    spec_versions_json: dict = Field(default_factory=lambda: {"CMS165": "13.0.000", "CMS122": "12.0.000"})
    factors: list[RiskFactorCreate] = Field(default_factory=list)


class RiskFactorResponse(BaseModel):
    id: int
    factor_code: str
    evidence_type: str
    evidence_ref: str
    evidence_json: dict
    created_at: datetime

    class Config:
        from_attributes = True


class RiskAssessmentResponse(BaseModel):
    id: int
    pid: int
    measurement_period_start: date
    measurement_period_end: date
    model_name: str
    model_version: str
    score: float
    risk_band: str
    flags_json: dict
    spec_versions_json: dict
    computed_at: datetime
    factors: list[RiskFactorResponse] = []

    class Config:
        from_attributes = True


# --- Alert ---

class AlertCreate(BaseModel):
    pid: int
    assessment_id: int | None = None
    severity: str = Field(..., pattern="^(info|warn|high)$")
    alert_type: str = Field(..., description="care-gap, adherence, utilization")
    title: str
    detail: str
    recommended_action: str


class AlertUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|ack|closed)$")


class AlertResponse(BaseModel):
    id: int
    pid: int
    assessment_id: int | None
    severity: str
    alert_type: str
    title: str
    detail: str
    recommended_action: str
    status: str
    created_at: datetime
    closed_at: datetime | None

    class Config:
        from_attributes = True


# --- Followup ---

class FollowupCreate(BaseModel):
    pid: int
    alert_id: int | None = None
    task_type: str = Field(..., description="schedule_visit, order_lab, call_patient")
    due_date: date | None = None
    assigned_to_user_id: int | None = None
    payload_json: dict = Field(default_factory=dict)


class FollowupUpdate(BaseModel):
    status: str | None = Field(None, pattern="^(open|completed|cancelled)$")
    due_date: date | None = None
    assigned_to_user_id: int | None = None


class FollowupResponse(BaseModel):
    id: int
    pid: int
    alert_id: int | None
    task_type: str
    due_date: date | None
    assigned_to_user_id: int | None
    payload_json: dict
    status: str
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


# --- Agent Run ---

class AgentRunCreate(BaseModel):
    run_uuid: str
    cohort_size: int = 0
    model_version: str = "2026.02"
    spec_versions_json: dict = Field(default_factory=lambda: {"CMS165": "13.0.000", "CMS122": "12.0.000"})


class AgentRunUpdate(BaseModel):
    finished_at: datetime | None = None
    success_count: int | None = None
    error_count: int | None = None
    logs_json: dict | None = None


class AgentRunResponse(BaseModel):
    id: int
    run_uuid: str
    started_at: datetime
    finished_at: datetime | None
    cohort_size: int
    success_count: int
    error_count: int
    model_version: str
    spec_versions_json: dict
    logs_json: dict

    class Config:
        from_attributes = True


# --- Agent Chat ---

class ToolCallInfo(BaseModel):
    tool: str
    input: dict
    duration_ms: int


class AgentChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class UsageInfo(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class AgentChatResponse(BaseModel):
    message: str
    tool_calls: list[ToolCallInfo] = []
    session_id: str
    guardrail_blocked: bool = False
    usage: UsageInfo | dict = Field(default_factory=dict)


# --- Audit Log ---

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user: str
    action: str
    resource_type: str
    resource_id: int | None
    pid: int | None
    detail_json: dict
    source: str

    class Config:
        from_attributes = True


# --- Generic ---

class PaginatedResponse(BaseModel):
    data: list
    meta: dict = Field(default_factory=lambda: {"total": 0})
