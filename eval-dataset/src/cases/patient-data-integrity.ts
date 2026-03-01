import { EvalCase } from "../types";

export const patientDataIntegrityCases: EvalCase[] = [
  // Reference Range Validation (6 cases)
  {
    id: "data-ref-001",
    category: "patient_data_integrity",
    name: "K+ 4.0 within normal range (3.5–5.0)",
    description: "Potassium 4.0 mEq/L should be within the normal reference range.",
    input: { lab: "K", value: 4.0, range: { min: 3.5, max: 5.0 } },
    expected: { assertions: [{ field: "isInRange", operator: "is_true", description: "K+ 4.0 is in range" }] },
    metadata: { severity: "low", clinical_domain: "Laboratory Medicine", tags: ["reference-range", "potassium", "normal"] },
  },
  {
    id: "data-ref-002",
    category: "patient_data_integrity",
    name: "K+ 5.8 out of range (hyperkalemia)",
    description: "Potassium 5.8 mEq/L should be flagged as above normal range.",
    input: { lab: "K", value: 5.8, range: { min: 3.5, max: 5.0 } },
    expected: { assertions: [{ field: "isInRange", operator: "is_false", description: "K+ 5.8 is out of range" }] },
    metadata: { severity: "critical", clinical_domain: "Laboratory Medicine", tags: ["reference-range", "potassium", "hyperkalemia"] },
  },
  {
    id: "data-ref-003",
    category: "patient_data_integrity",
    name: "Creatinine 1.0 within normal range (0.6–1.2)",
    description: "Creatinine 1.0 mg/dL should be within normal range indicating stable renal function.",
    input: { lab: "Creatinine", value: 1.0, range: { min: 0.6, max: 1.2 } },
    expected: { assertions: [{ field: "isInRange", operator: "is_true", description: "Creatinine 1.0 is in range" }] },
    metadata: { severity: "low", clinical_domain: "Nephrology", tags: ["reference-range", "creatinine", "renal-function"] },
  },
  {
    id: "data-ref-004",
    category: "patient_data_integrity",
    name: "Copper 62 out of range (below 70)",
    description: "Copper 62 ug/dL should be flagged as below normal range (70–140).",
    input: { lab: "Copper", value: 62, range: { min: 70, max: 140 } },
    expected: { assertions: [{ field: "isInRange", operator: "is_false", description: "Copper 62 is below range" }] },
    metadata: { severity: "medium", clinical_domain: "Laboratory Medicine", tags: ["reference-range", "copper", "deficiency"] },
  },
  {
    id: "data-ref-005",
    category: "patient_data_integrity",
    name: "LDL 148 out of range (above 100 target)",
    description: "LDL 148 mg/dL should be flagged as above normal target range (0–100).",
    input: { lab: "LDL", value: 148, range: { min: 0, max: 100 } },
    expected: { assertions: [{ field: "isInRange", operator: "is_false", description: "LDL 148 is above target" }] },
    metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["reference-range", "ldl", "dyslipidemia"] },
  },
  {
    id: "data-ref-006",
    category: "patient_data_integrity",
    name: "All 6 lab reference ranges defined",
    description: "Reference ranges should exist for K, LDL, HDL, CRP, Creatinine, and Copper with valid min < max.",
    input: { expected_labs: ["K", "LDL", "HDL", "CRP", "Creatinine", "Copper"] },
    expected: {
      assertions: [
        { field: "all_defined", operator: "is_true", description: "All 6 labs have reference ranges" },
        { field: "all_valid", operator: "is_true", description: "All ranges have min < max" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Laboratory Medicine", tags: ["reference-range", "completeness"] },
  },
  // Body System Scores (5 cases)
  {
    id: "data-body-001",
    category: "patient_data_integrity",
    name: "8 body systems returned",
    description: "Body system scores should include exactly 8 systems.",
    input: {},
    expected: { assertions: [{ field: "scores.length", operator: "equals", value: 8, description: "Exactly 8 systems" }] },
    metadata: { severity: "low", clinical_domain: "Clinical Assessment", tags: ["body-systems", "completeness"] },
  },
  {
    id: "data-body-002",
    category: "patient_data_integrity",
    name: "Cardiovascular is lowest score (45)",
    description: "Cardiovascular system should have the lowest score (45) reflecting HTN, elevated K+, and ASCVD risk.",
    input: {},
    expected: {
      assertions: [
        { field: "cardiovascular_score", operator: "equals", value: 45, description: "Cardiovascular score is 45" },
        { field: "cardiovascular_is_lowest", operator: "is_true", description: "Cardiovascular is the lowest" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["body-systems", "cardiovascular", "risk"] },
  },
  {
    id: "data-body-003",
    category: "patient_data_integrity",
    name: "Hepatic is highest score (90)",
    description: "Hepatic system should have the highest score (90) as liver function is normal.",
    input: {},
    expected: { assertions: [{ field: "hepatic_score", operator: "equals", value: 90, description: "Hepatic score is 90" }] },
    metadata: { severity: "low", clinical_domain: "Hepatology", tags: ["body-systems", "hepatic", "normal"] },
  },
  {
    id: "data-body-004",
    category: "patient_data_integrity",
    name: "All scores between 0 and 100",
    description: "All body system scores should be valid percentages between 0 and 100.",
    input: {},
    expected: { assertions: [{ field: "all_in_range", operator: "is_true", description: "All scores 0–100" }] },
    metadata: { severity: "low", clinical_domain: "Clinical Assessment", tags: ["body-systems", "validation"] },
  },
  {
    id: "data-body-005",
    category: "patient_data_integrity",
    name: "Overall average ~73",
    description: "Overall body system average should be approximately 73 (±3).",
    input: {},
    expected: {
      assertions: [
        { field: "average", operator: "greater_than_or_equal", value: 70, description: "Average >= 70" },
        { field: "average", operator: "less_than_or_equal", value: 76, description: "Average <= 76" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Clinical Assessment", tags: ["body-systems", "average"] },
  },
  // Lab Trend Data (3 cases)
  {
    id: "data-lab-001",
    category: "patient_data_integrity",
    name: "9 chronological lab data points",
    description: "Lab trends should have 9 data points in chronological order (Feb 2024 – Jan 2026).",
    input: {},
    expected: {
      assertions: [
        { field: "lab_trends_count", operator: "equals", value: 9, description: "9 data points" },
        { field: "chronological", operator: "is_true", description: "Dates are chronological" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Laboratory Medicine", tags: ["data-integrity", "chronological", "lab-trends"] },
  },
  {
    id: "data-lab-002",
    category: "patient_data_integrity",
    name: "K+ trending up from 4.6 to 5.8",
    description: "Potassium should show upward trend from 4.6 (Mar 2024) to 5.8 (Jan 2026).",
    input: {},
    expected: {
      assertions: [
        { field: "k_first", operator: "equals", value: 4.6, description: "First K+ is 4.6" },
        { field: "k_last", operator: "equals", value: 5.8, description: "Last K+ is 5.8" },
        { field: "k_trending_up", operator: "is_true", description: "K+ is trending up" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Nephrology", tags: ["potassium", "trend", "hyperkalemia"] },
  },
  {
    id: "data-lab-003",
    category: "patient_data_integrity",
    name: "CRP normalizing from 48 to 3.2",
    description: "CRP should show normalization from 48 mg/L (pericarditis) to 3.2 mg/L (resolved).",
    input: {},
    expected: {
      assertions: [
        { field: "crp_first", operator: "equals", value: 48, description: "First CRP is 48" },
        { field: "crp_last", operator: "equals", value: 3.2, description: "Last CRP is 3.2" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Inflammatory", tags: ["crp", "pericarditis", "normalization"] },
  },
  // BP Reading Data (3 cases)
  {
    id: "data-bp-001",
    category: "patient_data_integrity",
    name: "9 BP readings in chronological order",
    description: "Blood pressure readings should have 9 data points in chronological order (Feb 2024 – Jan 2026).",
    input: {},
    expected: {
      assertions: [
        { field: "bp_count", operator: "equals", value: 9, description: "9 BP readings" },
        { field: "chronological", operator: "is_true", description: "Dates are chronological" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Cardiology", tags: ["data-integrity", "blood-pressure", "chronological"] },
  },
  {
    id: "data-bp-002",
    category: "patient_data_integrity",
    name: "Systolic BP improving from 152 to 132",
    description: "Systolic BP should show improvement from 152 mmHg (initial) to 132 mmHg (latest) on Lisinopril therapy.",
    input: {},
    expected: {
      assertions: [
        { field: "first_systolic", operator: "equals", value: 152, description: "Initial systolic is 152" },
        { field: "last_systolic", operator: "equals", value: 132, description: "Latest systolic is 132" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["blood-pressure", "systolic", "improvement", "treatment-response"] },
  },
  {
    id: "data-bp-003",
    category: "patient_data_integrity",
    name: "Systolic always greater than diastolic",
    description: "Every BP reading should have systolic > diastolic (physiological invariant).",
    input: {},
    expected: { assertions: [{ field: "systolic_gt_diastolic", operator: "is_true", description: "Systolic > diastolic for all readings" }] },
    metadata: { severity: "low", clinical_domain: "Cardiology", tags: ["blood-pressure", "physiological-invariant", "validation"] },
  },
  // Medication Timeline (3 cases)
  {
    id: "data-med-001",
    category: "patient_data_integrity",
    name: "5 medication events in timeline",
    description: "Medication timeline should have exactly 5 events (Lisinopril, Aspirin, Colchicine, Tylenol, Doxycycline).",
    input: {},
    expected: { assertions: [{ field: "event_count", operator: "equals", value: 5, description: "5 medication events" }] },
    metadata: { severity: "low", clinical_domain: "Medication Safety", tags: ["medication-timeline", "completeness"] },
  },
  {
    id: "data-med-002",
    category: "patient_data_integrity",
    name: "Colchicine is only discontinued medication",
    description: "Colchicine should be the only medication with 'discontinued' status and a non-null end date.",
    input: {},
    expected: {
      assertions: [
        { field: "discontinued_count", operator: "equals", value: 1, description: "Only 1 discontinued med" },
        { field: "discontinued_drug", operator: "contains", value: "Colchicine", description: "Colchicine is discontinued" },
        { field: "discontinued_has_end_date", operator: "is_true", description: "Has non-null end date" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Medication Safety", tags: ["medication-timeline", "discontinued", "colchicine"] },
  },
  {
    id: "data-med-003",
    category: "patient_data_integrity",
    name: "Ongoing medications have null endDate",
    description: "All medications with 'ongoing' status should have null endDate indicating they are still active.",
    input: {},
    expected: { assertions: [{ field: "all_ongoing_null_end", operator: "is_true", description: "All ongoing meds have null endDate" }] },
    metadata: { severity: "low", clinical_domain: "Medication Safety", tags: ["medication-timeline", "ongoing", "validation"] },
  },
];
