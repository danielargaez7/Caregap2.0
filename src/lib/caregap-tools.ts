/* ═══════════════════════════════════════════════
   CareGap Population Health Tools
   8 tools for the CareGap Agent Chat
   Operates on demo data from caregap-data.ts
   ═══════════════════════════════════════════════ */

import {
  CAREGAP_PATIENTS,
  CAREGAP_ALERTS,
  CAREGAP_FOLLOWUPS,
} from "./caregap-data";

// ─── Tool 1: get_high_risk_patients ──────────

export function getHighRiskPatients(limit?: number, riskBand?: string) {
  let patients = [...CAREGAP_PATIENTS].sort((a, b) => b.risk_score - a.risk_score);

  if (riskBand) {
    patients = patients.filter((p) => p.risk_band === riskBand.toLowerCase());
  }

  const sliced = patients.slice(0, limit || 20);

  return {
    patients: sliced.map((p) => ({
      pid: p.pid,
      name: `${p.fname} ${p.lname}`,
      age: p.age,
      sex: p.sex,
      insurance_type: p.insurance_type,
      risk_score: Math.round(p.risk_score * 100),
      risk_band: p.risk_band,
      flags: Object.keys(p.flags).filter((k) => p.flags[k]),
      bp: p.vitals.bp_systolic ? `${p.vitals.bp_systolic}/${p.vitals.bp_diastolic}` : "No data",
      a1c: p.labs.a1c ? `${p.labs.a1c}%` : "No data",
      pdc: p.adherence.overall_pdc ? `${p.adherence.overall_pdc}%` : "No data",
      conditions: p.conditions,
    })),
    total: sliced.length,
    panel_size: CAREGAP_PATIENTS.length,
  };
}

// ─── Tool 2: get_open_alerts ─────────────────

export function getOpenAlerts(severity?: string, pid?: number) {
  let alerts = CAREGAP_ALERTS.filter((a) => a.status === "open");

  if (severity) {
    alerts = alerts.filter((a) => a.severity === severity.toLowerCase());
  }
  if (pid) {
    alerts = alerts.filter((a) => a.pid === pid);
  }

  return {
    alerts: alerts.map((a) => {
      const patient = CAREGAP_PATIENTS.find((p) => p.pid === a.pid);
      return {
        id: a.id,
        pid: a.pid,
        patient_name: patient ? `${patient.fname} ${patient.lname}` : `PID ${a.pid}`,
        severity: a.severity,
        alert_type: a.alert_type,
        title: a.title,
        detail: a.detail,
        recommended_action: a.recommended_action,
        created_at: a.created_at,
      };
    }),
    total: alerts.length,
    by_severity: {
      high: alerts.filter((a) => a.severity === "high").length,
      warn: alerts.filter((a) => a.severity === "warn").length,
      info: alerts.filter((a) => a.severity === "info").length,
    },
  };
}

// ─── Tool 3: get_cohort_summary ──────────────

export function getCohortSummary() {
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  let bpControlled = 0;
  let bpTotal = 0;
  let a1cPoor = 0;
  let a1cTotal = 0;
  let adherentCount = 0;
  let adherenceTotal = 0;

  for (const p of CAREGAP_PATIENTS) {
    distribution[p.risk_band]++;

    if (p.vitals.bp_systolic !== null) {
      bpTotal++;
      if (p.vitals.bp_systolic < 140 && (p.vitals.bp_diastolic ?? 0) < 90) {
        bpControlled++;
      }
    }

    if (p.labs.a1c !== null) {
      a1cTotal++;
      if (p.labs.a1c > 9.0) a1cPoor++;
    }

    if (p.adherence.overall_pdc !== null) {
      adherenceTotal++;
      if (p.adherence.overall_pdc >= 80) adherentCount++;
    }
  }

  return {
    total_patients: CAREGAP_PATIENTS.length,
    distribution,
    cms165_bp_control: {
      controlled: bpControlled,
      total: bpTotal,
      rate: bpTotal > 0 ? Math.round((bpControlled / bpTotal) * 100) : 0,
      target: 70,
    },
    cms122_a1c_poor_control: {
      poor: a1cPoor,
      total: a1cTotal,
      rate: a1cTotal > 0 ? Math.round((a1cPoor / a1cTotal) * 100) : 0,
      target_below: 15,
    },
    medication_adherence: {
      adherent: adherentCount,
      total: adherenceTotal,
      rate: adherenceTotal > 0 ? Math.round((adherentCount / adherenceTotal) * 100) : 0,
      threshold: 80,
    },
    open_alerts: CAREGAP_ALERTS.filter((a) => a.status === "open").length,
    open_followups: CAREGAP_FOLLOWUPS.filter((f) => f.status === "open").length,
  };
}

// ─── Tool 4: get_work_queue ──────────────────

export function getWorkQueue(taskType?: string, pid?: number) {
  let tasks = CAREGAP_FOLLOWUPS.filter((f) => f.status === "open");

  if (taskType) {
    tasks = tasks.filter((f) => f.task_type === taskType);
  }
  if (pid) {
    tasks = tasks.filter((f) => f.pid === pid);
  }

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      pid: t.pid,
      patient_name: t.fname && t.lname ? `${t.fname} ${t.lname}` : `PID ${t.pid}`,
      task_type: t.task_type,
      due_date: t.due_date,
      detail: t.payload_json,
      insurance_type: t.insurance_type || "unknown",
      created_at: t.created_at,
    })),
    total: tasks.length,
    by_type: {
      schedule_visit: tasks.filter((t) => t.task_type === "schedule_visit").length,
      order_lab: tasks.filter((t) => t.task_type === "order_lab").length,
      call_patient: tasks.filter((t) => t.task_type === "call_patient").length,
    },
  };
}

// ─── Tool 5: run_screenings ──────────────────

export function runScreenings(pid: number) {
  const patient = CAREGAP_PATIENTS.find((p) => p.pid === pid);
  if (!patient) {
    return { error: `Patient PID ${pid} not found`, screenings: [] };
  }

  const screenings: Array<{
    condition: string;
    status: string;
    severity: string;
    detail: string;
    recommendation: string;
  }> = [];

  // BP Screening (CMS165)
  if (patient.vitals.bp_systolic !== null) {
    const controlled = patient.vitals.bp_systolic < 140 && (patient.vitals.bp_diastolic ?? 0) < 90;
    screenings.push({
      condition: "Blood Pressure Control (CMS165)",
      status: controlled ? "controlled" : "uncontrolled",
      severity: controlled ? "low" : "high",
      detail: `BP ${patient.vitals.bp_systolic}/${patient.vitals.bp_diastolic} as of ${patient.vitals.date}`,
      recommendation: controlled ? "Continue current management." : "Adjust BP medication. Recheck in 2 weeks.",
    });
  } else {
    screenings.push({
      condition: "Blood Pressure Control (CMS165)",
      status: "missing",
      severity: "high",
      detail: "No BP reading on file.",
      recommendation: "Schedule vitals check immediately.",
    });
  }

  // A1c Screening (CMS122)
  if (patient.labs.a1c !== null) {
    const poor = patient.labs.a1c > 9.0;
    screenings.push({
      condition: "HbA1c Control (CMS122)",
      status: poor ? "poor_control" : "controlled",
      severity: poor ? "high" : "low",
      detail: `A1c ${patient.labs.a1c}% as of ${patient.labs.a1c_date}`,
      recommendation: poor ? "Review diabetes management. Consider medication adjustment." : "Continue current regimen.",
    });
  } else if (patient.conditions.some((c) => c.toLowerCase().includes("diabetes"))) {
    screenings.push({
      condition: "HbA1c Control (CMS122)",
      status: "missing",
      severity: "high",
      detail: "Diabetes diagnosis present but no A1c on file.",
      recommendation: "Order HbA1c lab immediately.",
    });
  }

  // Medication Adherence
  if (patient.adherence.overall_pdc !== null) {
    const adherent = patient.adherence.overall_pdc >= 80;
    const drugDetails = Object.entries(patient.adherence.drugs)
      .map(([drug, pdc]) => `${drug}: ${pdc}%`)
      .join(", ");
    screenings.push({
      condition: "Medication Adherence (PDC)",
      status: adherent ? "adherent" : "non_adherent",
      severity: adherent ? "low" : patient.adherence.overall_pdc < 60 ? "high" : "medium",
      detail: `Overall PDC ${patient.adherence.overall_pdc}%. ${drugDetails}`,
      recommendation: adherent ? "Good adherence. Continue monitoring." : "Call patient to discuss barriers to medication adherence.",
    });
  }

  // Cancer Screenings
  if (patient.screenings.mammogram_due) {
    screenings.push({
      condition: "Mammography Screening",
      status: "overdue",
      severity: "medium",
      detail: `${patient.fname} ${patient.lname}, age ${patient.age}, female. Mammogram overdue.`,
      recommendation: `Schedule mammogram. ${patient.insurance_type === "medicare" ? "Covered at $0 under Medicare." : "Typically covered as preventive."}`,
    });
  }

  if (patient.screenings.colonoscopy_due) {
    screenings.push({
      condition: "Colorectal Cancer Screening",
      status: "overdue",
      severity: "medium",
      detail: `${patient.fname} ${patient.lname}, age ${patient.age}. Colonoscopy overdue.`,
      recommendation: `Schedule colonoscopy. ${patient.insurance_type === "medicare" ? "Covered at $0 under Medicare." : "Typically covered as preventive."}`,
    });
  }

  if (patient.screenings.lung_ct_eligible) {
    screenings.push({
      condition: "Lung Cancer Screening (LDCT)",
      status: "eligible",
      severity: "medium",
      detail: `Smoker eligible for low-dose CT lung screening.`,
      recommendation: "Order LDCT. Discuss smoking cessation.",
    });
  }

  // CKD check
  if (patient.labs.egfr !== null && patient.labs.egfr < 60) {
    const stage = patient.labs.egfr < 30 ? "Stage 4" : patient.labs.egfr < 45 ? "Stage 3b" : "Stage 3a";
    screenings.push({
      condition: "CKD Monitoring",
      status: "positive",
      severity: patient.labs.egfr < 30 ? "high" : "medium",
      detail: `eGFR ${patient.labs.egfr} mL/min (${stage} CKD).`,
      recommendation: patient.labs.egfr < 30
        ? "Urgent nephrology referral recommended."
        : "Monitor kidney function quarterly. Consider nephrology referral.",
    });
  }

  return {
    patient_name: `${patient.fname} ${patient.lname}`,
    pid: patient.pid,
    age: patient.age,
    sex: patient.sex,
    insurance_type: patient.insurance_type,
    risk_band: patient.risk_band,
    risk_score: Math.round(patient.risk_score * 100),
    screenings,
    total: screenings.length,
  };
}

// ─── Tool 6: get_coverage_summary ────────────

const COVERAGE_SERVICES: Record<string, Array<{
  service: string;
  estimated_cost: string;
  frequency: string;
  notes: string;
}>> = {
  medicare: [
    { service: "Annual Wellness Visit", estimated_cost: "$0", frequency: "Yearly", notes: "No copay for in-network providers" },
    { service: "HbA1c Lab", estimated_cost: "$0", frequency: "1-2x yearly", notes: "Covered under Medicare Part B as preventive" },
    { service: "Lipid Panel", estimated_cost: "$0", frequency: "Yearly", notes: "Covered as preventive screening" },
    { service: "Mammogram", estimated_cost: "$0", frequency: "Yearly (age 40+)", notes: "No cost sharing for screening" },
    { service: "Colonoscopy", estimated_cost: "$0", frequency: "Every 10 years", notes: "Covered as preventive, but $100-200 copay if polyps removed" },
    { service: "Flu Vaccine", estimated_cost: "$0", frequency: "Yearly", notes: "No cost sharing for Part B covered vaccines" },
    { service: "Office Visit (follow-up)", estimated_cost: "$20-40 copay", frequency: "As needed", notes: "Part B deductible may apply" },
    { service: "LDCT Lung Screening", estimated_cost: "$0", frequency: "Yearly (if eligible)", notes: "Covered for high-risk smokers age 50-80" },
  ],
  medicaid: [
    { service: "Annual Wellness Visit", estimated_cost: "$0", frequency: "Yearly", notes: "No cost sharing under Medicaid" },
    { service: "HbA1c Lab", estimated_cost: "$0", frequency: "1-2x yearly", notes: "Covered as preventive" },
    { service: "Lipid Panel", estimated_cost: "$0", frequency: "Yearly", notes: "No cost sharing" },
    { service: "Mammogram", estimated_cost: "$0", frequency: "Yearly (age 40+)", notes: "No cost sharing" },
    { service: "Colonoscopy", estimated_cost: "$0", frequency: "Every 10 years", notes: "No cost sharing for preventive" },
    { service: "Flu Vaccine", estimated_cost: "$0", frequency: "Yearly", notes: "No cost sharing" },
    { service: "Office Visit (follow-up)", estimated_cost: "$0-3 copay", frequency: "As needed", notes: "Minimal or no cost sharing" },
    { service: "LDCT Lung Screening", estimated_cost: "$0", frequency: "Yearly (if eligible)", notes: "Covered under Medicaid expansion" },
  ],
  commercial: [
    { service: "Annual Wellness Visit", estimated_cost: "$0", frequency: "Yearly", notes: "Covered as preventive under ACA" },
    { service: "HbA1c Lab", estimated_cost: "$0-25", frequency: "1-2x yearly", notes: "Preventive lab, may vary by plan" },
    { service: "Lipid Panel", estimated_cost: "$0-25", frequency: "Yearly", notes: "Covered as preventive screening" },
    { service: "Mammogram", estimated_cost: "$0", frequency: "Yearly (age 40+)", notes: "Mandated $0 cost under ACA" },
    { service: "Colonoscopy", estimated_cost: "$0-250", frequency: "Every 10 years", notes: "$0 for screening, copay if diagnostic" },
    { service: "Flu Vaccine", estimated_cost: "$0", frequency: "Yearly", notes: "Covered as preventive under ACA" },
    { service: "Office Visit (follow-up)", estimated_cost: "$25-50 copay", frequency: "As needed", notes: "Subject to deductible and copay" },
    { service: "LDCT Lung Screening", estimated_cost: "$0", frequency: "Yearly (if eligible)", notes: "Covered as preventive under ACA" },
  ],
};

export function getCoverageSummary(pid?: number) {
  if (pid) {
    const patient = CAREGAP_PATIENTS.find((p) => p.pid === pid);
    if (!patient) return { error: `Patient PID ${pid} not found` };

    const services = COVERAGE_SERVICES[patient.insurance_type] || COVERAGE_SERVICES.commercial;
    return {
      patient_name: `${patient.fname} ${patient.lname}`,
      insurance_type: patient.insurance_type,
      services,
      total_services: services.length,
      zero_cost_services: services.filter((s) => s.estimated_cost === "$0").length,
    };
  }

  // Panel-wide summary
  const byType = { medicare: 0, medicaid: 0, commercial: 0 };
  for (const p of CAREGAP_PATIENTS) {
    byType[p.insurance_type]++;
  }

  return {
    panel_size: CAREGAP_PATIENTS.length,
    insurance_distribution: byType,
    note: "Medicare and Medicaid patients have $0 cost for most preventive services. Commercial plans cover preventive care under ACA mandates.",
  };
}

// ─── Tool 7: send_outreach ───────────────────

export function sendOutreach(riskLevels: string[]) {
  const levels = riskLevels.map((r) => r.toLowerCase());
  const targets = CAREGAP_PATIENTS.filter((p) => levels.includes(p.risk_band));

  const callTargets = targets.filter((p) => p.risk_band === "critical" || p.risk_band === "high");
  const emailTargets = targets.filter((p) => p.risk_band === "high" || p.risk_band === "medium");

  return {
    calls_scheduled: callTargets.map((p) => ({
      pid: p.pid,
      name: `${p.fname} ${p.lname}`,
      urgency: p.risk_band === "critical" ? "urgent" : "routine",
      reason: Object.keys(p.flags).filter((k) => p.flags[k]).join(", ") || "Routine follow-up",
      expected_delivery: p.risk_band === "critical" ? "within 1 hour" : "within 4 hours",
    })),
    emails_sent: emailTargets.map((p) => ({
      pid: p.pid,
      name: `${p.fname} ${p.lname}`,
      subject: `Care Gap Follow-up: ${p.fname} ${p.lname}`,
    })),
    summary: {
      total_calls: callTargets.length,
      total_emails: emailTargets.length,
      urgent_calls: callTargets.filter((p) => p.risk_band === "critical").length,
    },
  };
}

// ─── Tool 8: create_followup ─────────────────

export function createFollowup(pid: number, taskType: string, detail: string) {
  const patient = CAREGAP_PATIENTS.find((p) => p.pid === pid);
  if (!patient) return { error: `Patient PID ${pid} not found` };

  const dueDate = new Date();
  if (taskType === "call_patient") dueDate.setDate(dueDate.getDate() + 1);
  else if (taskType === "order_lab") dueDate.setDate(dueDate.getDate() + 3);
  else dueDate.setDate(dueDate.getDate() + 7);

  return {
    status: "created",
    followup: {
      id: 100 + Math.floor(Math.random() * 900),
      pid,
      patient_name: `${patient.fname} ${patient.lname}`,
      task_type: taskType,
      due_date: dueDate.toISOString().split("T")[0],
      detail,
      insurance_type: patient.insurance_type,
    },
    summary: `Follow-up task created for ${patient.fname} ${patient.lname}: ${taskType.replace(/_/g, " ")}. Due ${dueDate.toISOString().split("T")[0]}.`,
  };
}
