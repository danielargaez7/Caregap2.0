const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

/** True when serving demo fallback data (no backend connected). */
export let isDemoMode = false;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      ...options,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }
    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      throw new Error("Backend unavailable");
    }
    return JSON.parse(text);
  } catch {
    isDemoMode = true;

    // Handle PATCH mutations (ack alerts, complete followups)
    const mutation = handleDemoMutation(path, options);
    if (mutation) return mutation as T;

    // Handle GET with query-param filtering
    const basePath = path.split("?")[0];
    const demo = DEMO_DATA[basePath];
    if (demo) return applyDemoFilters(path, demo as { data: unknown[] }) as T;

    throw new Error("Backend unavailable — demo data not available for this endpoint.");
  }
}

// --- Demo fallback data (shown when backend is not connected) ---

const DEMO_ASSESSMENTS = [
  { id: 1, pid: 1, patient_uuid: "u1", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.18, risk_band: "low", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Maria", lname: "Santos", insurance_type: "medicare" },
  { id: 2, pid: 2, patient_uuid: "u2", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.91, risk_band: "critical", flags_json: { bp_uncontrolled: true, a1c_failing: true, low_adherence: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Eugene", lname: "Jackson", insurance_type: "medicare" },
  { id: 3, pid: 3, patient_uuid: "u3", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.87, risk_band: "critical", flags_json: { a1c_failing: true, copd_exacerbation: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Patricia", lname: "Williams", insurance_type: "medicaid" },
  { id: 4, pid: 4, patient_uuid: "u4", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.82, risk_band: "critical", flags_json: { bp_uncontrolled: true, low_adherence: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Linda", lname: "Martinez", insurance_type: "medicaid" },
  { id: 5, pid: 5, patient_uuid: "u5", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.78, risk_band: "critical", flags_json: { no_vitals: true, no_labs: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Margaret", lname: "Anderson", insurance_type: "medicaid" },
  { id: 6, pid: 6, patient_uuid: "u6", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.72, risk_band: "high", flags_json: { bp_uncontrolled: true, ckd_declining: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Dorothy", lname: "Henderson", insurance_type: "medicare" },
  { id: 7, pid: 7, patient_uuid: "u7", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.68, risk_band: "high", flags_json: { missing_a1c: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Robert", lname: "Chen", insurance_type: "commercial" },
  { id: 8, pid: 8, patient_uuid: "u8", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.65, risk_band: "high", flags_json: { a1c_failing: true, smoker: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Barbara", lname: "Clark", insurance_type: "commercial" },
  { id: 9, pid: 9, patient_uuid: "u9", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.58, risk_band: "high", flags_json: { bp_uncontrolled: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Charles", lname: "Lee", insurance_type: "medicare" },
  { id: 10, pid: 10, patient_uuid: "u10", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.55, risk_band: "high", flags_json: { low_adherence: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Susan", lname: "Taylor", insurance_type: "medicare" },
  { id: 11, pid: 11, patient_uuid: "u11", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.52, risk_band: "high", flags_json: { bp_borderline: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Thomas", lname: "Young", insurance_type: "medicare" },
  { id: 12, pid: 12, patient_uuid: "u12", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.42, risk_band: "medium", flags_json: { bp_borderline: true }, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "James", lname: "Whitfield", insurance_type: "medicare" },
  { id: 13, pid: 13, patient_uuid: "u13", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.38, risk_band: "medium", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Nancy", lname: "Rivera", insurance_type: "medicaid" },
  { id: 14, pid: 14, patient_uuid: "u14", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.35, risk_band: "medium", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Richard", lname: "Moore", insurance_type: "commercial" },
  { id: 15, pid: 15, patient_uuid: "u15", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.22, risk_band: "low", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Helen", lname: "Garcia", insurance_type: "medicare" },
  { id: 16, pid: 16, patient_uuid: "u16", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.15, risk_band: "low", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "William", lname: "Davis", insurance_type: "medicare" },
  { id: 17, pid: 17, patient_uuid: "u17", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.12, risk_band: "low", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Betty", lname: "Thompson", insurance_type: "commercial" },
  { id: 18, pid: 18, patient_uuid: "u18", measurement_period: "2026-01", model_name: "caregap-v1", model_version: "1.0", score: 0.08, risk_band: "low", flags_json: {}, spec_versions_json: {}, computed_at: "2026-02-28T12:00:00Z", fname: "Joseph", lname: "Wilson", insurance_type: "medicare" },
];

const DEMO_ALERTS = [
  { id: 1, pid: 2, assessment_id: 2, severity: "high", alert_type: "care-gap", title: "Dual care gap: BP + A1c failing", detail: "Eugene Jackson — BP 162/98, A1c 9.4%. Heart failure patient with medication adherence below threshold (PDC 62%).", recommended_action: "Schedule urgent follow-up to adjust BP medication and review diabetes management.", status: "open", created_at: "2026-02-27T10:00:00Z", closed_at: null },
  { id: 2, pid: 3, assessment_id: 3, severity: "high", alert_type: "care-gap", title: "HbA1c critically elevated", detail: "Patricia Williams — A1c 10.2%. COPD patient not seen in 4+ months.", recommended_action: "Order HbA1c lab and schedule follow-up.", status: "open", created_at: "2026-02-27T10:05:00Z", closed_at: null },
  { id: 3, pid: 4, assessment_id: 4, severity: "high", alert_type: "adherence", title: "Medication non-adherence", detail: "Linda Martinez — Amlodipine PDC 45%, Metformin PDC 38%. BP uncontrolled at 158/96.", recommended_action: "Call patient to discuss medication barriers. Schedule follow-up.", status: "open", created_at: "2026-02-27T10:10:00Z", closed_at: null },
  { id: 4, pid: 5, assessment_id: 5, severity: "high", alert_type: "care-gap", title: "No vitals or labs on file", detail: "Margaret Anderson — Hypertension and diabetes diagnoses with no monitoring data.", recommended_action: "Schedule Annual Wellness Visit.", status: "open", created_at: "2026-02-27T10:15:00Z", closed_at: null },
  { id: 5, pid: 6, assessment_id: 6, severity: "warn", alert_type: "care-gap", title: "BP uncontrolled, CKD declining", detail: "Dorothy Henderson — BP 156/94. CKD Stage 3 with eGFR 48.", recommended_action: "Schedule follow-up for BP management. Monitor eGFR trend.", status: "open", created_at: "2026-02-27T11:00:00Z", closed_at: null },
  { id: 6, pid: 7, assessment_id: 7, severity: "warn", alert_type: "care-gap", title: "Missing HbA1c lab", detail: "Robert Chen — No HbA1c on file despite diabetes diagnosis. Depression screening may be overdue.", recommended_action: "Order HbA1c lab. Check PHQ-9 status.", status: "open", created_at: "2026-02-27T11:05:00Z", closed_at: null },
  { id: 7, pid: 8, assessment_id: 8, severity: "warn", alert_type: "care-gap", title: "A1c above threshold, smoker", detail: "Barbara Clark — A1c 9.1%. Current smoker eligible for lung cancer screening.", recommended_action: "Schedule follow-up and lung CT.", status: "open", created_at: "2026-02-27T11:10:00Z", closed_at: null },
  { id: 8, pid: 11, assessment_id: 11, severity: "warn", alert_type: "adherence", title: "Partial medication adherence", detail: "Thomas Young — PDC 72%. BP and A1c currently controlled but at risk.", recommended_action: "Call patient to discuss fill gaps.", status: "open", created_at: "2026-02-27T11:15:00Z", closed_at: null },
  { id: 9, pid: 12, assessment_id: 12, severity: "info", alert_type: "care-gap", title: "BP borderline", detail: "James Whitfield — BP 138/88. Trending toward uncontrolled.", recommended_action: "Recheck BP at next visit. No urgent action needed.", status: "open", created_at: "2026-02-27T12:00:00Z", closed_at: null },
];

const DEMO_FOLLOWUPS = [
  { id: 1, pid: 2, alert_id: 1, task_type: "schedule_visit", due_date: "2026-03-03", assigned_to: null, payload_json: { reason: "Urgent BP + diabetes follow-up", patient: "Eugene Jackson" }, status: "open", created_at: "2026-02-27T10:00:00Z", completed_at: null, fname: "Eugene", lname: "Jackson", insurance_type: "medicare" },
  { id: 2, pid: 3, alert_id: 2, task_type: "order_lab", due_date: "2026-03-01", assigned_to: null, payload_json: { test: "HbA1c", patient: "Patricia Williams" }, status: "open", created_at: "2026-02-27T10:05:00Z", completed_at: null, fname: "Patricia", lname: "Williams", insurance_type: "medicaid" },
  { id: 3, pid: 4, alert_id: 3, task_type: "call_patient", due_date: "2026-02-28", assigned_to: null, payload_json: { reason: "Discuss medication adherence barriers", patient: "Linda Martinez" }, status: "open", created_at: "2026-02-27T10:10:00Z", completed_at: null, fname: "Linda", lname: "Martinez", insurance_type: "medicaid" },
  { id: 4, pid: 5, alert_id: 4, task_type: "schedule_visit", due_date: "2026-03-05", assigned_to: null, payload_json: { reason: "Annual Wellness Visit — no data on file", patient: "Margaret Anderson" }, status: "open", created_at: "2026-02-27T10:15:00Z", completed_at: null, fname: "Margaret", lname: "Anderson", insurance_type: "medicaid" },
  { id: 5, pid: 1, alert_id: null, task_type: "schedule_visit", due_date: "2026-03-10", assigned_to: null, payload_json: { reason: "Mammography screening", patient: "Maria Santos" }, status: "open", created_at: "2026-02-27T12:00:00Z", completed_at: null, fname: "Maria", lname: "Santos", insurance_type: "medicare" },
  { id: 6, pid: 7, alert_id: 6, task_type: "order_lab", due_date: "2026-03-01", assigned_to: null, payload_json: { test: "HbA1c", patient: "Robert Chen" }, status: "open", created_at: "2026-02-27T11:05:00Z", completed_at: null, fname: "Robert", lname: "Chen", insurance_type: "commercial" },
  { id: 7, pid: 8, alert_id: 7, task_type: "schedule_visit", due_date: "2026-03-07", assigned_to: null, payload_json: { reason: "Diabetes follow-up + lung CT screening", patient: "Barbara Clark" }, status: "open", created_at: "2026-02-27T11:10:00Z", completed_at: null, fname: "Barbara", lname: "Clark", insurance_type: "commercial" },
  { id: 8, pid: 11, alert_id: 8, task_type: "call_patient", due_date: "2026-03-02", assigned_to: null, payload_json: { reason: "Discuss medication fill gaps", patient: "Thomas Young" }, status: "open", created_at: "2026-02-27T11:15:00Z", completed_at: null, fname: "Thomas", lname: "Young", insurance_type: "medicare" },
];

const DEMO_AUDIT_LOGS = [
  { id: 1, timestamp: "2026-02-28T14:30:00Z", user: "admin", action: "chat_message_sent", resource_type: "chat", resource_id: null, pid: null, detail_json: { message: "What are the open alerts for Eugene Jackson?", session_id: "s1" }, source: "agent" },
  { id: 2, timestamp: "2026-02-28T14:30:02Z", user: "admin", action: "tool_call_executed", resource_type: "chat", resource_id: null, pid: 2, detail_json: { tool: "get_open_alerts", input: { pid: 2 }, duration_ms: 45, session_id: "s1" }, source: "agent" },
  { id: 3, timestamp: "2026-02-28T14:30:03Z", user: "admin", action: "chat_message_received", resource_type: "chat", resource_id: null, pid: null, detail_json: { message: "Eugene Jackson has 1 open alert: Dual care gap for BP + A1c.", session_id: "s1" }, source: "agent" },
  { id: 4, timestamp: "2026-02-28T14:25:00Z", user: "admin", action: "alert_acknowledged", resource_type: "alert", resource_id: 9, pid: 12, detail_json: { new_status: "ack" }, source: "api" },
  { id: 5, timestamp: "2026-02-28T14:20:00Z", user: "admin", action: "followup_completed", resource_type: "followup", resource_id: 3, pid: 4, detail_json: { task_type: "call_patient" }, source: "api" },
  { id: 6, timestamp: "2026-02-28T14:15:00Z", user: "admin", action: "risk_assessment_run", resource_type: "risk_assessment", resource_id: 2, pid: 2, detail_json: { score: 0.91, risk_band: "critical", alerts_created: 1 }, source: "risk_engine" },
  { id: 7, timestamp: "2026-02-28T14:10:00Z", user: "admin", action: "alert_created", resource_type: "alert", resource_id: 1, pid: 2, detail_json: { severity: "high", title: "Dual care gap: BP + A1c failing", alert_type: "care-gap" }, source: "risk_engine" },
  { id: 8, timestamp: "2026-02-28T14:05:00Z", user: "admin", action: "patient_data_accessed", resource_type: "patient", resource_id: null, pid: 2, detail_json: { patient_uuid: "u2", data_type: "vitals" }, source: "api" },
  { id: 9, timestamp: "2026-02-28T14:00:00Z", user: "admin", action: "followup_created", resource_type: "followup", resource_id: 1, pid: 2, detail_json: { task_type: "schedule_visit", due_date: "2026-03-03" }, source: "risk_engine" },
  { id: 10, timestamp: "2026-02-28T13:55:00Z", user: "admin", action: "alert_closed", resource_type: "alert", resource_id: 5, pid: 6, detail_json: { new_status: "closed" }, source: "api" },
  { id: 11, timestamp: "2026-02-28T13:50:00Z", user: "admin", action: "claims_synced", resource_type: "claims", resource_id: null, pid: 4, detail_json: { result: "Synced 12 EOBs" }, source: "api" },
  { id: 12, timestamp: "2026-02-28T13:45:00Z", user: "admin", action: "cohort_assessed", resource_type: "agent_run", resource_id: null, pid: null, detail_json: { total: 18, assessed: 18, errors: 0 }, source: "agent" },
];

const DEMO_DATA: Record<string, unknown> = {
  "/risk-assessments/": { data: DEMO_ASSESSMENTS, meta: { total: DEMO_ASSESSMENTS.length } },
  "/alerts/": { data: DEMO_ALERTS, meta: { total: DEMO_ALERTS.length } },
  "/followups/": { data: DEMO_FOLLOWUPS, meta: { total: DEMO_FOLLOWUPS.length } },
  "/audit-log/": { data: DEMO_AUDIT_LOGS, meta: { total: DEMO_AUDIT_LOGS.length } },
};

/** Filter demo data arrays by query-string params (status, severity, task_type, etc.). */
function applyDemoFilters(
  path: string,
  demo: { data: unknown[]; meta?: { total: number } },
): { data: unknown[]; meta: { total: number } } {
  const qIdx = path.indexOf("?");
  if (qIdx === -1) return { data: demo.data, meta: { total: demo.data.length } };

  const params = new URLSearchParams(path.slice(qIdx + 1));
  let filtered = demo.data as Record<string, unknown>[];

  for (const [key, value] of params.entries()) {
    if (key === "limit" || key === "offset") continue;
    filtered = filtered.filter((item) => {
      if (!(key in item)) return true; // skip fields that don't exist on the item
      return String(item[key]) === value;
    });
  }

  const limit = params.get("limit");
  if (limit) filtered = filtered.slice(0, Number(limit));

  return { data: filtered, meta: { total: filtered.length } };
}

/** Handle PATCH mutations in demo mode (ack alerts, complete followups). */
function handleDemoMutation(path: string, options?: RequestInit): unknown | null {
  if (options?.method !== "PATCH") return null;

  const alertMatch = path.match(/^\/alerts\/(\d+)$/);
  if (alertMatch) {
    const id = Number(alertMatch[1]);
    const body = options.body ? JSON.parse(options.body as string) : {};
    const alert = DEMO_ALERTS.find((a) => a.id === id);
    if (alert) {
      alert.status = body.status || "ack";
      if (body.status === "closed") (alert as Record<string, unknown>).closed_at = new Date().toISOString();
    }
    return { data: alert || {} };
  }

  const followupMatch = path.match(/^\/followups\/(\d+)$/);
  if (followupMatch) {
    const id = Number(followupMatch[1]);
    const body = options.body ? JSON.parse(options.body as string) : {};
    const followup = DEMO_FOLLOWUPS.find((f) => f.id === id);
    if (followup) {
      followup.status = body.status || "completed";
      if (body.status === "completed") (followup as Record<string, unknown>).completed_at = new Date().toISOString();
    }
    return { data: followup || {} };
  }

  return null;
}

// --- Patients ---

export function searchPatients(params?: { lname?: string; fname?: string }) {
  const qs = new URLSearchParams();
  if (params?.lname) qs.set("lname", params.lname);
  if (params?.fname) qs.set("fname", params.fname);
  const q = qs.toString();
  return request<{ data: unknown[] }>(`/patients/${q ? `?${q}` : ""}`);
}

export function getPatient(uuid: string) {
  return request<{ data: unknown }>(`/patients/${uuid}`);
}

export function getPatientVitals(uuid: string) {
  return request<{ data: unknown[] }>(`/patients/${uuid}/vitals`);
}

export function getPatientLabs(uuid: string) {
  return request<{ data: unknown[] }>(`/patients/${uuid}/labs`);
}

// --- Risk Assessments ---

export function getRiskAssessments(params?: {
  risk_band?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.risk_band) qs.set("risk_band", params.risk_band);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/risk-assessments/${q ? `?${q}` : ""}`
  );
}

export function getPatientRiskAssessments(pid: number) {
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/risk-assessments/patient/${pid}`
  );
}

export function getRiskAssessment(id: number) {
  return request<{ data: unknown }>(`/risk-assessments/${id}`);
}

// --- Alerts ---

export function getAlerts(params?: {
  status?: string;
  severity?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/alerts/${q ? `?${q}` : ""}`
  );
}

export function acknowledgeAlert(id: number, status: "ack" | "closed") {
  return request<unknown>(`/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// --- Followups ---

export function getFollowups(params?: {
  status?: string;
  task_type?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.task_type) qs.set("task_type", params.task_type);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/followups/${q ? `?${q}` : ""}`
  );
}

export function completeFollowup(id: number) {
  return request<unknown>(`/followups/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" }),
  });
}

// --- Agent ---

export function agentChat(message: string, session_id?: string) {
  return request<{
    message: string;
    tool_calls: { tool: string; input: Record<string, unknown>; duration_ms: number }[];
    session_id: string;
    guardrail_blocked: boolean;
  }>("/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id }),
  });
}

export function assessCohort() {
  return request<unknown>("/agent/assess-cohort", { method: "POST" });
}

// --- Agent Runs ---

export function getAgentRuns(limit = 20) {
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/agent-runs/?limit=${limit}`
  );
}

// --- Claims ---

export function syncClaims(pid: number) {
  return request<unknown>(`/claims/sync/${pid}`, { method: "POST" });
}

export function getAdherence(pid: number) {
  return request<unknown>(`/claims/${pid}/adherence`);
}

export function getPatientInsurance(pid: number) {
  return request<{
    status: string;
    insurance_type?: string;
    member_id?: string;
    last_sync?: string;
    message?: string;
  }>(`/claims/${pid}/insurance`);
}

export function getPatientMedications(uuid: string) {
  return request<unknown[]>(`/patients/${uuid}/medications`);
}

export function getPatientProblems(uuid: string) {
  return request<unknown[]>(`/patients/${uuid}/problems`);
}

// --- Audit Log ---

export function getAuditLogs(params?: {
  action?: string;
  resource_type?: string;
  pid?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.resource_type) qs.set("resource_type", params.resource_type);
  if (params?.pid) qs.set("pid", String(params.pid));
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return request<{ data: unknown[]; meta: { total: number } }>(
    `/audit-log/${q ? `?${q}` : ""}`
  );
}

// --- Streaming Agent ---

export async function agentChatStream(
  message: string,
  session_id: string | undefined,
  onEvent: (event: { type: string; content?: string; tool?: string; input?: Record<string, unknown>; duration_ms?: number; session_id?: string; tool_calls?: { tool: string; input: Record<string, unknown>; duration_ms: number }[]; guardrail_blocked?: boolean }) => void,
) {
  const res = await fetch(`${BASE}/agent/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}
