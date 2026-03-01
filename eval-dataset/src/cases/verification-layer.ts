import { EvalCase } from "../types";

export const verificationLayerCases: EvalCase[] = [
  {
    id: "verify-001",
    category: "verification_layer",
    name: "Fact check identifies matched and unmatched items",
    description: "Should identify which items match the known database and which don't, computing coverage ratio.",
    input: { function: "factCheck", args: { items: ["Aspirin", "Lisinopril", "MadeUpDrug"], knownDatabase: ["Aspirin", "Lisinopril", "Metformin"], domain: "Pharmacology", sourceName: "FDA DB" } },
    expected: {
      assertions: [
        { field: "result.matched", operator: "includes_item", value: "Aspirin", description: "Aspirin matched" },
        { field: "result.matched", operator: "includes_item", value: "Lisinopril", description: "Lisinopril matched" },
        { field: "result.unmatched", operator: "includes_item", value: "MadeUpDrug", description: "MadeUpDrug unmatched" },
        { field: "result.coverage", operator: "equals", value: 0.67, description: "Coverage is ~2/3" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Verification", tags: ["fact-check", "coverage", "database-matching"] },
  },
  {
    id: "verify-002",
    category: "verification_layer",
    name: "Hallucination detection flags unsupported claims",
    description: "Should flag claims not supported by patient data while passing supported claims.",
    input: { function: "detectHallucination", args: { claims: [{ claim: "Patient has HTN", supportedByData: true }, { claim: "Patient has cancer", supportedByData: false }] } },
    expected: {
      assertions: [
        { field: "result.allSupported", operator: "is_false", description: "Not all claims supported" },
        { field: "result.unsupportedClaims", operator: "includes_item", value: "Patient has cancer", description: "Cancer claim flagged" },
        { field: "result.supportedCount", operator: "equals", value: 1, description: "One claim supported" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Verification", tags: ["hallucination", "unsupported-claims", "safety"] },
  },
  {
    id: "verify-003",
    category: "verification_layer",
    name: "Hallucination detection passes when all claims supported",
    description: "Should pass when all claims are supported by patient data.",
    input: { function: "detectHallucination", args: { claims: [{ claim: "Patient has HTN", supportedByData: true }, { claim: "K+ is elevated", supportedByData: true }] } },
    expected: {
      assertions: [
        { field: "result.allSupported", operator: "is_true", description: "All claims supported" },
        { field: "result.unsupportedClaims.length", operator: "equals", value: 0, description: "No unsupported claims" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Verification", tags: ["hallucination", "all-supported"] },
  },
  {
    id: "verify-004",
    category: "verification_layer",
    name: "Confidence scoring returns weighted score 0-1",
    description: "Should compute weighted confidence from dataCompleteness (25%), sourceReliability (40%), and matchQuality (35%).",
    input: { function: "computeConfidence", args: [{ dataCompleteness: 1.0, sourceReliability: 1.0, matchQuality: 1.0 }, { dataCompleteness: 0.0, sourceReliability: 0.0, matchQuality: 0.0 }, { dataCompleteness: 0.5, sourceReliability: 0.8, matchQuality: 0.6 }] },
    expected: {
      assertions: [
        { field: "result_high", operator: "equals", value: 1.0, description: "Perfect inputs = 1.0" },
        { field: "result_low", operator: "equals", value: 0.0, description: "Zero inputs = 0.0" },
        { field: "result_mid", operator: "greater_than", value: 0, description: "Mid inputs > 0" },
        { field: "result_mid", operator: "less_than", value: 1, description: "Mid inputs < 1" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Verification", tags: ["confidence", "scoring", "weighted"] },
  },
  {
    id: "verify-005",
    category: "verification_layer",
    name: "Domain constraints fail for severe interactions",
    description: "Should fail domain constraint check when severe drug interactions are present.",
    input: { function: "checkDomainConstraints", args: { hasSevereInteractions: true } },
    expected: {
      assertions: [
        { field: "result.passed", operator: "is_false", description: "Check fails" },
        { field: "result.violations.length", operator: "greater_than", value: 0, description: "Violations reported" },
        { field: "result.violations[0]", operator: "contains", value: "Severe drug-drug interaction", description: "Violation message correct" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Verification", tags: ["domain-constraints", "severe-interaction", "safety"] },
  },
  {
    id: "verify-006",
    category: "verification_layer",
    name: "Domain constraints fail for allergy conflicts",
    description: "Should fail domain constraint check when allergen conflicts are detected.",
    input: { function: "checkDomainConstraints", args: { hasAllergyConflicts: true } },
    expected: {
      assertions: [
        { field: "result.passed", operator: "is_false", description: "Check fails" },
        { field: "result.violations[0]", operator: "contains", value: "allergen conflict", description: "Allergen conflict reported" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Verification", tags: ["domain-constraints", "allergy", "safety"] },
  },
  {
    id: "verify-007",
    category: "verification_layer",
    name: "Domain constraints pass with no violations",
    description: "Should pass domain constraint check when no violations are present.",
    input: { function: "checkDomainConstraints", args: {} },
    expected: {
      assertions: [
        { field: "result.passed", operator: "is_true", description: "Check passes" },
        { field: "result.violations.length", operator: "equals", value: 0, description: "No violations" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Verification", tags: ["domain-constraints", "clean"] },
  },
  {
    id: "verify-008",
    category: "verification_layer",
    name: "Human review escalates critical severity",
    description: "Should require human review for critical severity regardless of confidence level.",
    input: { function: "requiresHumanReview", args: { confidence: 0.95, severity: "critical", stakes: "low" } },
    expected: {
      assertions: [
        { field: "result.required", operator: "is_true", description: "Review required" },
        { field: "result.reason", operator: "contains", value: "Critical severity", description: "Reason cites critical severity" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Verification", tags: ["human-review", "critical-severity", "escalation"] },
  },
  {
    id: "verify-009",
    category: "verification_layer",
    name: "Human review escalates low confidence + high stakes",
    description: "Should require human review when confidence is low and stakes are high.",
    input: { function: "requiresHumanReview", args: { confidence: 0.4, severity: "low", stakes: "high" } },
    expected: {
      assertions: [
        { field: "result.required", operator: "is_true", description: "Review required" },
        { field: "result.reason", operator: "contains", value: "Low confidence", description: "Reason cites low confidence" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Verification", tags: ["human-review", "low-confidence", "high-stakes"] },
  },
  {
    id: "verify-010",
    category: "verification_layer",
    name: "Human review not required for low-risk decisions",
    description: "Should NOT require human review for low severity, low stakes, high confidence decisions.",
    input: { function: "requiresHumanReview", args: { confidence: 0.9, severity: "low", stakes: "low" } },
    expected: {
      assertions: [
        { field: "result.required", operator: "is_false", description: "Review not required" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Verification", tags: ["human-review", "low-risk", "no-escalation"] },
  },
  {
    id: "verify-011",
    category: "verification_layer",
    name: "Composite verify with all 5 verification types",
    description: "Should compose all 5 verification types (fact_check, hallucination, confidence, domain_constraints, human_review) into a single VerifiedToolResult.",
    input: { function: "verify", args: { data: { test: true }, options: "all_5_types_clean" } },
    expected: {
      assertions: [
        { field: "result.status", operator: "equals", value: "verified", description: "Status is verified" },
        { field: "result.verification.passed", operator: "is_true", description: "Verification passed" },
        { field: "result.verification.verification_types", operator: "includes_item", value: "fact_check", description: "Includes fact_check" },
        { field: "result.verification.verification_types", operator: "includes_item", value: "hallucination_detection", description: "Includes hallucination_detection" },
        { field: "result.verification.verification_types", operator: "includes_item", value: "confidence_scoring", description: "Includes confidence_scoring" },
        { field: "result.verification.verification_types", operator: "includes_item", value: "domain_constraints", description: "Includes domain_constraints" },
        { field: "result.verification.verification_types", operator: "includes_item", value: "human_in_the_loop", description: "Includes human_in_the_loop" },
        { field: "result.verification.sources.length", operator: "greater_than", value: 0, description: "Sources populated" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Verification", tags: ["composite", "all-types", "integration"] },
  },
  {
    id: "verify-012",
    category: "verification_layer",
    name: "Composite verify fails on domain constraint violation",
    description: "Should fail composite verification when domain constraints are violated, with human review required.",
    input: { function: "verify", args: { data: { test: true }, options: "domain_violation" } },
    expected: {
      assertions: [
        { field: "result.status", operator: "equals", value: "failed", description: "Status is failed" },
        { field: "result.verification.passed", operator: "is_false", description: "Verification failed" },
        { field: "result.verification.requires_human_review", operator: "is_true", description: "Human review required" },
        { field: "result.verification.errors.length", operator: "greater_than", value: 0, description: "Errors populated" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Verification", tags: ["composite", "failure", "domain-violation"] },
  },
];
