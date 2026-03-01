import { EvalCase } from "../types";

export const dosingValidationCases: EvalCase[] = [
  {
    id: "dosing-001",
    category: "dosing_validation",
    name: "Aspirin 325mg exceeds cardioprotective dose",
    description: "Should flag Aspirin 325mg as above recommended 81mg dose for cardioprotective indication per ACC/AHA guidelines.",
    input: { medication: "Aspirin", dose: "325mg", indication: "cardioprotective" },
    expected: {
      assertions: [
        { field: "data.medication", operator: "equals", value: "Aspirin", description: "Medication matches input" },
        { field: "data.is_within_range", operator: "is_false", description: "Dose is NOT within recommended range" },
        { field: "data.recommendation", operator: "contains", value: "exceeds", description: "Recommendation notes dose exceeds guideline" },
        { field: "data.recommendation", operator: "contains", value: "81mg", description: "Recommendation references correct 81mg dose" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["aspirin", "cardioprotective", "dose-too-high", "acc-aha"] },
  },
  {
    id: "dosing-002",
    category: "dosing_validation",
    name: "Lisinopril 10mg within range but K+ warning",
    description: "Should accept Lisinopril 10mg as within hypertension range but warn about critically elevated K+ (5.8 mEq/L) on ACE inhibitor.",
    input: { medication: "Lisinopril", dose: "10mg", indication: "hypertension" },
    expected: {
      assertions: [
        { field: "data.is_within_range", operator: "is_true", description: "Dose is within standard range" },
        { field: "data.warnings", operator: "every_item_satisfies", value: "is_string", description: "Warnings array exists" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Cardiology", tags: ["ace-inhibitor", "hyperkalemia", "potassium", "monitoring"] },
  },
  {
    id: "dosing-003",
    category: "dosing_validation",
    name: "Acetaminophen 500mg within range with max daily dose",
    description: "Should accept Acetaminophen 500mg for analgesic use and include max daily dose limit of 3000mg.",
    input: { medication: "Acetaminophen", dose: "500mg", indication: "analgesic" },
    expected: {
      assertions: [
        { field: "data.is_within_range", operator: "is_true", description: "Dose is within recommended range" },
        { field: "data.max_daily_dose", operator: "equals", value: "3000mg", description: "Max daily dose is 3000mg" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Pain Management", tags: ["acetaminophen", "hepatotoxicity", "max-dose"] },
  },
  {
    id: "dosing-004",
    category: "dosing_validation",
    name: "Unknown medication fails fact check",
    description: "Should fail verification when medication is not found in dosing guidelines database.",
    input: { medication: "FakeDrugXYZ", dose: "100mg" },
    expected: {
      assertions: [
        { field: "verification.passed", operator: "is_false", description: "Verification fails for unknown drug" },
        { field: "data.recommendation", operator: "contains", value: "not found", description: "Recommendation states drug not found" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Pharmacology", tags: ["unknown-drug", "fact-check-failure", "negative-test"] },
  },
  {
    id: "dosing-005",
    category: "dosing_validation",
    name: "Valid VerifiedToolResult structure",
    description: "Should return properly structured VerifiedToolResult with fact_check and confidence_scoring verification types.",
    input: { medication: "Aspirin", dose: "81mg", indication: "cardioprotective" },
    expected: {
      assertions: [
        { field: "status", operator: "is_defined", description: "Has status" },
        { field: "data", operator: "is_defined", description: "Has data" },
        { field: "verification", operator: "is_defined", description: "Has verification" },
        { field: "verification.verification_types", operator: "includes_item", value: "fact_check", description: "Includes fact_check" },
        { field: "verification.verification_types", operator: "includes_item", value: "confidence_scoring", description: "Includes confidence_scoring" },
        { field: "verification.confidence", operator: "greater_than", value: 0, description: "Confidence > 0" },
        { field: "verification.confidence", operator: "less_than_or_equal", value: 1, description: "Confidence <= 1" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Pharmacology", tags: ["verification", "structure"] },
  },
];
