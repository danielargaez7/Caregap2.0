/* ═══════════════════════════════════════════════
   CareGap Shared Demo Data
   Central source of truth for patients, alerts,
   followups, and audit logs used by tools, API,
   dashboard, and page views.
   ═══════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────

export interface CareGapPatient {
  pid: number;
  fname: string;
  lname: string;
  dob: string;
  sex: "M" | "F";
  age: number;
  insurance_type: "medicare" | "medicaid" | "commercial";
  risk_score: number;
  risk_band: "critical" | "high" | "medium" | "low";
  flags: Record<string, boolean>;
  vitals: { bp_systolic: number | null; bp_diastolic: number | null; date: string | null };
  labs: { a1c: number | null; a1c_date: string | null; egfr: number | null };
  adherence: { overall_pdc: number | null; drugs: Record<string, number> };
  conditions: string[];
  screenings: {
    mammogram_due: boolean;
    colonoscopy_due: boolean;
    lung_ct_eligible: boolean;
    flu_vaccine_due: boolean;
  };
}

export interface CareGapAlert {
  id: number;
  pid: number;
  severity: string;
  alert_type: string;
  title: string;
  detail: string;
  recommended_action: string;
  status: string;
  created_at: string;
  closed_at: string | null;
}

export interface CareGapFollowup {
  id: number;
  pid: number;
  task_type: string;
  due_date: string;
  payload_json: Record<string, unknown>;
  status: string;
  created_at: string;
  fname?: string;
  lname?: string;
  insurance_type?: string;
}

export interface CareGapAuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource_type: string;
  pid: number | null;
  detail_json: Record<string, unknown>;
  source: string;
}

// ─── Patients (18) ───────────────────────────

export const CAREGAP_PATIENTS: CareGapPatient[] = [
  {
    pid: 1, fname: "Maria", lname: "Santos", dob: "1959-03-12", sex: "F", age: 67,
    insurance_type: "medicare", risk_score: 0.18, risk_band: "low",
    flags: {},
    vitals: { bp_systolic: 128, bp_diastolic: 78, date: "2026-02-20" },
    labs: { a1c: 6.1, a1c_date: "2026-01-15", egfr: 82 },
    adherence: { overall_pdc: 92, drugs: { Lisinopril: 94, Metformin: 90 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: true, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 2, fname: "Eugene", lname: "Jackson", dob: "1958-07-04", sex: "M", age: 68,
    insurance_type: "medicare", risk_score: 0.91, risk_band: "critical",
    flags: { bp_uncontrolled: true, a1c_failing: true, low_adherence: true },
    vitals: { bp_systolic: 162, bp_diastolic: 98, date: "2026-02-25" },
    labs: { a1c: 9.4, a1c_date: "2026-02-10", egfr: 55 },
    adherence: { overall_pdc: 62, drugs: { Lisinopril: 58, Metformin: 65, Carvedilol: 63 } },
    conditions: ["Heart Failure", "Hypertension", "Type 2 Diabetes", "CKD Stage 3"],
    screenings: { mammogram_due: false, colonoscopy_due: true, lung_ct_eligible: false, flu_vaccine_due: true },
  },
  {
    pid: 3, fname: "Patricia", lname: "Williams", dob: "1960-11-22", sex: "F", age: 65,
    insurance_type: "medicaid", risk_score: 0.87, risk_band: "critical",
    flags: { a1c_failing: true, copd_exacerbation: true },
    vitals: { bp_systolic: 144, bp_diastolic: 88, date: "2026-01-05" },
    labs: { a1c: 10.2, a1c_date: "2026-01-05", egfr: 68 },
    adherence: { overall_pdc: 71, drugs: { Metformin: 68, "Albuterol Inhaler": 74 } },
    conditions: ["COPD", "Type 2 Diabetes", "Hypertension"],
    screenings: { mammogram_due: true, colonoscopy_due: false, lung_ct_eligible: true, flu_vaccine_due: true },
  },
  {
    pid: 4, fname: "Linda", lname: "Martinez", dob: "1962-05-18", sex: "F", age: 63,
    insurance_type: "medicaid", risk_score: 0.82, risk_band: "critical",
    flags: { bp_uncontrolled: true, low_adherence: true },
    vitals: { bp_systolic: 158, bp_diastolic: 96, date: "2026-02-22" },
    labs: { a1c: 8.8, a1c_date: "2026-02-01", egfr: 72 },
    adherence: { overall_pdc: 42, drugs: { Amlodipine: 45, Metformin: 38 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: true, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 5, fname: "Margaret", lname: "Anderson", dob: "1955-09-30", sex: "F", age: 70,
    insurance_type: "medicaid", risk_score: 0.78, risk_band: "critical",
    flags: { no_vitals: true, no_labs: true },
    vitals: { bp_systolic: null, bp_diastolic: null, date: null },
    labs: { a1c: null, a1c_date: null, egfr: null },
    adherence: { overall_pdc: null, drugs: {} },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: true, colonoscopy_due: true, lung_ct_eligible: false, flu_vaccine_due: true },
  },
  {
    pid: 6, fname: "Dorothy", lname: "Henderson", dob: "1957-01-14", sex: "F", age: 69,
    insurance_type: "medicare", risk_score: 0.72, risk_band: "high",
    flags: { bp_uncontrolled: true, ckd_declining: true },
    vitals: { bp_systolic: 156, bp_diastolic: 94, date: "2026-02-18" },
    labs: { a1c: 7.2, a1c_date: "2026-02-01", egfr: 48 },
    adherence: { overall_pdc: 78, drugs: { Losartan: 80, Metformin: 76 } },
    conditions: ["Hypertension", "Type 2 Diabetes", "CKD Stage 3"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 7, fname: "Robert", lname: "Chen", dob: "1963-08-25", sex: "M", age: 62,
    insurance_type: "commercial", risk_score: 0.68, risk_band: "high",
    flags: { missing_a1c: true },
    vitals: { bp_systolic: 134, bp_diastolic: 82, date: "2026-02-15" },
    labs: { a1c: null, a1c_date: null, egfr: 78 },
    adherence: { overall_pdc: 85, drugs: { Lisinopril: 88, Glipizide: 82 } },
    conditions: ["Type 2 Diabetes", "Hypertension", "Depression"],
    screenings: { mammogram_due: false, colonoscopy_due: true, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 8, fname: "Barbara", lname: "Clark", dob: "1961-04-07", sex: "F", age: 64,
    insurance_type: "commercial", risk_score: 0.65, risk_band: "high",
    flags: { a1c_failing: true, smoker: true },
    vitals: { bp_systolic: 136, bp_diastolic: 84, date: "2026-02-20" },
    labs: { a1c: 9.1, a1c_date: "2026-02-05", egfr: 74 },
    adherence: { overall_pdc: 80, drugs: { Metformin: 82, Atorvastatin: 78 } },
    conditions: ["Type 2 Diabetes", "Hyperlipidemia"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: true, flu_vaccine_due: false },
  },
  {
    pid: 9, fname: "Charles", lname: "Lee", dob: "1956-12-03", sex: "M", age: 69,
    insurance_type: "medicare", risk_score: 0.58, risk_band: "high",
    flags: { bp_uncontrolled: true },
    vitals: { bp_systolic: 148, bp_diastolic: 92, date: "2026-02-24" },
    labs: { a1c: 7.0, a1c_date: "2026-01-20", egfr: 65 },
    adherence: { overall_pdc: 82, drugs: { Amlodipine: 84, Lisinopril: 80 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: false, colonoscopy_due: true, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 10, fname: "Susan", lname: "Taylor", dob: "1964-06-19", sex: "F", age: 61,
    insurance_type: "medicare", risk_score: 0.55, risk_band: "high",
    flags: { low_adherence: true },
    vitals: { bp_systolic: 132, bp_diastolic: 80, date: "2026-02-22" },
    labs: { a1c: 7.8, a1c_date: "2026-02-10", egfr: 80 },
    adherence: { overall_pdc: 65, drugs: { Metformin: 60, Lisinopril: 70 } },
    conditions: ["Type 2 Diabetes", "Hypertension"],
    screenings: { mammogram_due: true, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 11, fname: "Thomas", lname: "Young", dob: "1960-02-28", sex: "M", age: 66,
    insurance_type: "medicare", risk_score: 0.52, risk_band: "high",
    flags: { bp_borderline: true },
    vitals: { bp_systolic: 138, bp_diastolic: 86, date: "2026-02-26" },
    labs: { a1c: 7.4, a1c_date: "2026-02-15", egfr: 70 },
    adherence: { overall_pdc: 72, drugs: { Metformin: 74, Amlodipine: 70 } },
    conditions: ["Type 2 Diabetes", "Hypertension"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: true },
  },
  {
    pid: 12, fname: "James", lname: "Whitfield", dob: "1958-10-15", sex: "M", age: 67,
    insurance_type: "medicare", risk_score: 0.42, risk_band: "medium",
    flags: { bp_borderline: true },
    vitals: { bp_systolic: 138, bp_diastolic: 88, date: "2026-02-24" },
    labs: { a1c: 6.8, a1c_date: "2026-02-01", egfr: 72 },
    adherence: { overall_pdc: 88, drugs: { Lisinopril: 90, Metformin: 86 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 13, fname: "Nancy", lname: "Rivera", dob: "1965-07-08", sex: "F", age: 60,
    insurance_type: "medicaid", risk_score: 0.38, risk_band: "medium",
    flags: {},
    vitals: { bp_systolic: 130, bp_diastolic: 82, date: "2026-02-20" },
    labs: { a1c: 7.0, a1c_date: "2026-02-05", egfr: 85 },
    adherence: { overall_pdc: 86, drugs: { Metformin: 88, Lisinopril: 84 } },
    conditions: ["Type 2 Diabetes", "Hypertension"],
    screenings: { mammogram_due: true, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 14, fname: "Richard", lname: "Moore", dob: "1962-03-21", sex: "M", age: 64,
    insurance_type: "commercial", risk_score: 0.35, risk_band: "medium",
    flags: {},
    vitals: { bp_systolic: 132, bp_diastolic: 80, date: "2026-02-18" },
    labs: { a1c: 6.9, a1c_date: "2026-01-25", egfr: 88 },
    adherence: { overall_pdc: 90, drugs: { Atorvastatin: 92, Lisinopril: 88 } },
    conditions: ["Hypertension", "Hyperlipidemia"],
    screenings: { mammogram_due: false, colonoscopy_due: true, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 15, fname: "Helen", lname: "Garcia", dob: "1959-11-02", sex: "F", age: 66,
    insurance_type: "medicare", risk_score: 0.22, risk_band: "low",
    flags: {},
    vitals: { bp_systolic: 122, bp_diastolic: 76, date: "2026-02-22" },
    labs: { a1c: 5.8, a1c_date: "2026-02-10", egfr: 90 },
    adherence: { overall_pdc: 95, drugs: { Lisinopril: 96, Metformin: 94 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 16, fname: "William", lname: "Davis", dob: "1957-05-16", sex: "M", age: 68,
    insurance_type: "medicare", risk_score: 0.15, risk_band: "low",
    flags: {},
    vitals: { bp_systolic: 126, bp_diastolic: 78, date: "2026-02-20" },
    labs: { a1c: 6.0, a1c_date: "2026-02-01", egfr: 82 },
    adherence: { overall_pdc: 94, drugs: { Amlodipine: 96, Metformin: 92 } },
    conditions: ["Hypertension", "Type 2 Diabetes"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 17, fname: "Betty", lname: "Thompson", dob: "1966-09-10", sex: "F", age: 59,
    insurance_type: "commercial", risk_score: 0.12, risk_band: "low",
    flags: {},
    vitals: { bp_systolic: 118, bp_diastolic: 74, date: "2026-02-25" },
    labs: { a1c: 5.6, a1c_date: "2026-02-15", egfr: 95 },
    adherence: { overall_pdc: 96, drugs: { Lisinopril: 98 } },
    conditions: ["Hypertension"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
  {
    pid: 18, fname: "Joseph", lname: "Wilson", dob: "1961-01-28", sex: "M", age: 65,
    insurance_type: "medicare", risk_score: 0.08, risk_band: "low",
    flags: {},
    vitals: { bp_systolic: 120, bp_diastolic: 76, date: "2026-02-26" },
    labs: { a1c: 5.9, a1c_date: "2026-02-10", egfr: 88 },
    adherence: { overall_pdc: 97, drugs: { Metformin: 98, Lisinopril: 96 } },
    conditions: ["Type 2 Diabetes", "Hypertension"],
    screenings: { mammogram_due: false, colonoscopy_due: false, lung_ct_eligible: false, flu_vaccine_due: false },
  },
];

// ─── Alerts (9) ──────────────────────────────

export const CAREGAP_ALERTS: CareGapAlert[] = [
  { id: 1, pid: 2, severity: "high", alert_type: "care-gap", title: "Dual care gap: BP + A1c failing", detail: "Eugene Jackson — BP 162/98, A1c 9.4%. Heart failure patient with medication adherence below threshold (PDC 62%).", recommended_action: "Schedule urgent follow-up to adjust BP medication and review diabetes management.", status: "open", created_at: "2026-02-27T10:00:00Z", closed_at: null },
  { id: 2, pid: 3, severity: "high", alert_type: "care-gap", title: "HbA1c critically elevated", detail: "Patricia Williams — A1c 10.2%. COPD patient not seen in 4+ months.", recommended_action: "Order HbA1c lab and schedule follow-up.", status: "open", created_at: "2026-02-27T10:05:00Z", closed_at: null },
  { id: 3, pid: 4, severity: "high", alert_type: "adherence", title: "Medication non-adherence", detail: "Linda Martinez — Amlodipine PDC 45%, Metformin PDC 38%. BP uncontrolled at 158/96.", recommended_action: "Call patient to discuss medication barriers.", status: "open", created_at: "2026-02-27T10:10:00Z", closed_at: null },
  { id: 4, pid: 5, severity: "high", alert_type: "care-gap", title: "No vitals or labs on file", detail: "Margaret Anderson — Hypertension and diabetes diagnoses with no monitoring data.", recommended_action: "Schedule Annual Wellness Visit.", status: "open", created_at: "2026-02-27T10:15:00Z", closed_at: null },
  { id: 5, pid: 6, severity: "warn", alert_type: "care-gap", title: "BP uncontrolled, CKD declining", detail: "Dorothy Henderson — BP 156/94. CKD Stage 3 with eGFR 48.", recommended_action: "Schedule follow-up for BP management.", status: "open", created_at: "2026-02-27T11:00:00Z", closed_at: null },
  { id: 6, pid: 7, severity: "warn", alert_type: "care-gap", title: "Missing HbA1c lab", detail: "Robert Chen — No HbA1c on file despite diabetes diagnosis.", recommended_action: "Order HbA1c lab. Check PHQ-9 status.", status: "open", created_at: "2026-02-27T11:05:00Z", closed_at: null },
  { id: 7, pid: 8, severity: "warn", alert_type: "care-gap", title: "A1c above threshold, smoker", detail: "Barbara Clark — A1c 9.1%. Current smoker eligible for lung cancer screening.", recommended_action: "Schedule follow-up and lung CT.", status: "open", created_at: "2026-02-27T11:10:00Z", closed_at: null },
  { id: 8, pid: 11, severity: "warn", alert_type: "adherence", title: "Partial medication adherence", detail: "Thomas Young — PDC 72%. BP and A1c currently controlled but at risk.", recommended_action: "Call patient to discuss fill gaps.", status: "open", created_at: "2026-02-27T11:15:00Z", closed_at: null },
  { id: 9, pid: 12, severity: "info", alert_type: "care-gap", title: "BP borderline", detail: "James Whitfield — BP 138/88. Trending toward uncontrolled.", recommended_action: "Recheck BP at next visit.", status: "open", created_at: "2026-02-27T12:00:00Z", closed_at: null },
];

// ─── Followups (8) ───────────────────────────

export const CAREGAP_FOLLOWUPS: CareGapFollowup[] = [
  { id: 1, pid: 2, task_type: "schedule_visit", due_date: "2026-03-03", payload_json: { reason: "Urgent BP + diabetes follow-up", patient: "Eugene Jackson" }, status: "open", created_at: "2026-02-27T10:00:00Z", fname: "Eugene", lname: "Jackson", insurance_type: "medicare" },
  { id: 2, pid: 3, task_type: "order_lab", due_date: "2026-03-01", payload_json: { test: "HbA1c", patient: "Patricia Williams" }, status: "open", created_at: "2026-02-27T10:05:00Z", fname: "Patricia", lname: "Williams", insurance_type: "medicaid" },
  { id: 3, pid: 4, task_type: "call_patient", due_date: "2026-02-28", payload_json: { reason: "Discuss medication adherence barriers", patient: "Linda Martinez" }, status: "open", created_at: "2026-02-27T10:10:00Z", fname: "Linda", lname: "Martinez", insurance_type: "medicaid" },
  { id: 4, pid: 5, task_type: "schedule_visit", due_date: "2026-03-05", payload_json: { reason: "Annual Wellness Visit — no data on file", patient: "Margaret Anderson" }, status: "open", created_at: "2026-02-27T10:15:00Z", fname: "Margaret", lname: "Anderson", insurance_type: "medicaid" },
  { id: 5, pid: 1, task_type: "schedule_visit", due_date: "2026-03-10", payload_json: { reason: "Mammography screening", patient: "Maria Santos" }, status: "open", created_at: "2026-02-27T12:00:00Z", fname: "Maria", lname: "Santos", insurance_type: "medicare" },
  { id: 6, pid: 7, task_type: "order_lab", due_date: "2026-03-01", payload_json: { test: "HbA1c", patient: "Robert Chen" }, status: "open", created_at: "2026-02-27T11:05:00Z", fname: "Robert", lname: "Chen", insurance_type: "commercial" },
  { id: 7, pid: 8, task_type: "schedule_visit", due_date: "2026-03-07", payload_json: { reason: "Diabetes follow-up + lung CT screening", patient: "Barbara Clark" }, status: "open", created_at: "2026-02-27T11:10:00Z", fname: "Barbara", lname: "Clark", insurance_type: "commercial" },
  { id: 8, pid: 11, task_type: "call_patient", due_date: "2026-03-02", payload_json: { reason: "Discuss medication fill gaps", patient: "Thomas Young" }, status: "open", created_at: "2026-02-27T11:15:00Z", fname: "Thomas", lname: "Young", insurance_type: "medicare" },
];

// ─── Audit Logs (12) ─────────────────────────

export const CAREGAP_AUDIT_LOGS: CareGapAuditLogEntry[] = [
  { id: 1, timestamp: "2026-02-28T14:30:00Z", user: "admin", action: "chat_message_sent", resource_type: "chat", pid: null, detail_json: { message: "What are the open alerts for Eugene Jackson?" }, source: "agent" },
  { id: 2, timestamp: "2026-02-28T14:30:02Z", user: "admin", action: "tool_call_executed", resource_type: "chat", pid: 2, detail_json: { tool: "get_open_alerts", duration_ms: 45 }, source: "agent" },
  { id: 3, timestamp: "2026-02-28T14:30:03Z", user: "admin", action: "chat_message_received", resource_type: "chat", pid: null, detail_json: { message: "Eugene Jackson has 1 open alert." }, source: "agent" },
  { id: 4, timestamp: "2026-02-28T14:25:00Z", user: "admin", action: "alert_acknowledged", resource_type: "alert", pid: 12, detail_json: { new_status: "ack" }, source: "api" },
  { id: 5, timestamp: "2026-02-28T14:20:00Z", user: "admin", action: "followup_completed", resource_type: "followup", pid: 4, detail_json: { task_type: "call_patient" }, source: "api" },
  { id: 6, timestamp: "2026-02-28T14:15:00Z", user: "admin", action: "risk_assessment_run", resource_type: "risk_assessment", pid: 2, detail_json: { score: 0.91, risk_band: "critical", alerts_created: 1 }, source: "risk_engine" },
  { id: 7, timestamp: "2026-02-28T14:10:00Z", user: "admin", action: "alert_created", resource_type: "alert", pid: 2, detail_json: { severity: "high", title: "Dual care gap: BP + A1c failing" }, source: "risk_engine" },
  { id: 8, timestamp: "2026-02-28T14:05:00Z", user: "admin", action: "patient_data_accessed", resource_type: "patient", pid: 2, detail_json: { data_type: "vitals" }, source: "api" },
  { id: 9, timestamp: "2026-02-28T14:00:00Z", user: "admin", action: "followup_created", resource_type: "followup", pid: 2, detail_json: { task_type: "schedule_visit", due_date: "2026-03-03" }, source: "risk_engine" },
  { id: 10, timestamp: "2026-02-28T13:55:00Z", user: "admin", action: "alert_closed", resource_type: "alert", pid: 6, detail_json: { new_status: "closed" }, source: "api" },
  { id: 11, timestamp: "2026-02-28T13:50:00Z", user: "admin", action: "claims_synced", resource_type: "claims", pid: 4, detail_json: { result: "Synced 12 EOBs" }, source: "api" },
  { id: 12, timestamp: "2026-02-28T13:45:00Z", user: "admin", action: "cohort_assessed", resource_type: "agent_run", pid: null, detail_json: { total: 18, assessed: 18, errors: 0 }, source: "agent" },
];
