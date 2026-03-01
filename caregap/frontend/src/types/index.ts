export interface Patient {
  uuid: string;
  pid: number;
  fname: string;
  lname: string;
  dob: string;
  sex: string;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone_home?: string;
}

export interface RiskAssessment {
  id: number;
  pid: number;
  patient_uuid: string;
  measurement_period: string;
  model_name: string;
  model_version: string;
  score: number;
  risk_band: "low" | "medium" | "high" | "critical";
  flags_json: Record<string, unknown>;
  spec_versions_json: Record<string, string>;
  computed_at: string;
  factors?: RiskFactor[];
}

export interface RiskFactor {
  id: number;
  assessment_id: number;
  factor_code: string;
  evidence_type: string;
  evidence_ref: string;
  evidence_json: Record<string, unknown>;
}

export interface Alert {
  id: number;
  pid: number;
  assessment_id: number | null;
  severity: "info" | "warn" | "high";
  alert_type: "care-gap" | "adherence" | "utilization";
  title: string;
  detail: string;
  recommended_action: string;
  status: "open" | "ack" | "closed";
  created_at: string;
  closed_at: string | null;
}

export interface Followup {
  id: number;
  pid: number;
  alert_id: number | null;
  task_type: "schedule_visit" | "order_lab" | "call_patient";
  due_date: string | null;
  assigned_to: string | null;
  payload_json: Record<string, unknown>;
  status: "open" | "completed" | "cancelled";
  created_at: string;
  completed_at: string | null;
}

export interface AgentRun {
  id: number;
  run_uuid: string;
  started_at: string;
  finished_at: string | null;
  cohort_size: number;
  success_count: number;
  error_count: number;
  logs_json: Record<string, unknown>;
}

export interface ToolCallInfo {
  tool: string;
  input: Record<string, unknown>;
  duration_ms: number;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCallInfo[];
  guardrail_blocked?: boolean;
}

export interface AgentChatResponse {
  message: string;
  tool_calls: ToolCallInfo[];
  session_id: string;
  guardrail_blocked: boolean;
}

export interface CohortSummary {
  distribution: Record<string, number>;
  total_assessed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number };
}

export interface Vital {
  id: number;
  date: string;
  bps: string | null;
  bpd: string | null;
  weight: string | null;
  height: string | null;
  temperature: string | null;
  pulse: string | null;
  encounter: number;
}

export interface LabResult {
  id: number;
  result_code: string;
  result_text: string;
  result: string;
  name: string;
  units: string;
  range: string;
  abnormal: string;
  date: string;
}

export interface InsuranceInfo {
  status: string;
  insurance_type?: string;
  member_id?: string;
  last_sync?: string;
  message?: string;
}

export interface Problem {
  title: string;
  diagnosis: string;
  begdate: string;
  enddate: string;
  activity: number;
}

export interface Medication {
  drug: string;
  title: string;
  start_date: string;
  begdate: string;
  end_date: string;
  enddate: string;
  diagnosis: string;
  activity: number;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  pid: number | null;
  detail_json: Record<string, unknown>;
  source: string;
}

export interface AdherenceSummary {
  status: string;
  drugs: Record<
    string,
    {
      pdc: number;
      adherent: boolean;
      covered_days: number;
      period_days: number;
      fill_count: number;
      threshold: number;
    }
  >;
  overall_pdc: number | null;
  overall_adherent: boolean | null;
  lookback_days: number;
}
