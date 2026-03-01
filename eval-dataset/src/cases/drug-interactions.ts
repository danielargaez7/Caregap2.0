import { EvalCase } from "../types";

export const drugInteractionCases: EvalCase[] = [
  {
    id: "drug-interaction-001",
    category: "drug_interaction",
    name: "Penicillin allergy detection with Amoxicillin",
    description: "Should detect allergy alert when Amoxicillin is prescribed to a patient with documented Penicillin allergy (cross-reactivity).",
    input: { medications: ["Amoxicillin", "Lisinopril"] },
    expected: {
      assertions: [
        { field: "data.allergy_alerts.length", operator: "greater_than", value: 0, description: "At least one allergy alert triggered" },
        { field: "data.allergy_alerts[0]", operator: "contains", value: "penicillin", description: "Alert mentions penicillin cross-reactivity" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["allergy", "cross-reactivity", "penicillin", "safety"] },
  },
  {
    id: "drug-interaction-002",
    category: "drug_interaction",
    name: "Aspirin + Ibuprofen NSAID interaction",
    description: "Should detect moderate interaction between Aspirin and Ibuprofen (NSAIDs reduce cardioprotective effect).",
    input: { medications: ["Aspirin", "Ibuprofen"] },
    expected: {
      assertions: [
        { field: "data.interactions_found", operator: "greater_than", value: 0, description: "Interaction detected" },
        { field: "data.interactions[0].pair", operator: "contains", value: "Aspirin", description: "Pair includes Aspirin" },
        { field: "data.interactions[0].severity", operator: "equals", value: "moderate", description: "Severity is moderate" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "Pharmacology", tags: ["nsaid", "cardioprotective", "gi-bleeding"] },
  },
  {
    id: "drug-interaction-003",
    category: "drug_interaction",
    name: "Safe single medication (no interactions)",
    description: "Should return no interactions for a single safe medication with no allergy conflict.",
    input: { medications: ["Doxycycline"] },
    expected: {
      assertions: [
        { field: "data.interactions_found", operator: "equals", value: 0, description: "No interactions found" },
        { field: "data.allergy_alerts.length", operator: "equals", value: 0, description: "No allergy alerts" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Pharmacology", tags: ["safe-combination", "negative-test"] },
  },
  {
    id: "drug-interaction-004",
    category: "drug_interaction",
    name: "VerifiedToolResult structure for dual RAAS blockade",
    description: "Should return proper VerifiedToolResult structure with fact_check and domain_constraints for Lisinopril + Losartan (dual RAAS blockade).",
    input: { medications: ["Lisinopril", "Losartan"] },
    expected: {
      assertions: [
        { field: "status", operator: "is_defined", description: "Has status field" },
        { field: "data", operator: "is_defined", description: "Has data field" },
        { field: "verification", operator: "is_defined", description: "Has verification field" },
        { field: "data.medications_checked", operator: "equals", value: ["Lisinopril", "Losartan"], description: "Checked medications match input" },
        { field: "verification.verification_types", operator: "includes_item", value: "fact_check", description: "Includes fact_check verification" },
        { field: "verification.verification_types", operator: "includes_item", value: "domain_constraints", description: "Includes domain_constraints verification" },
        { field: "verification.confidence", operator: "greater_than", value: 0, description: "Confidence > 0" },
        { field: "verification.confidence", operator: "less_than_or_equal", value: 1, description: "Confidence <= 1" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Pharmacology", tags: ["verification", "raas-blockade", "structure"] },
  },
  {
    id: "drug-interaction-005",
    category: "drug_interaction",
    name: "Verification failure for severe interactions",
    description: "Should fail verification and require human review for severe drug interactions (Lisinopril + Losartan dual RAAS blockade).",
    input: { medications: ["Lisinopril", "Losartan"] },
    expected: {
      assertions: [
        { field: "status", operator: "equals", value: "failed", description: "Status is failed" },
        { field: "verification.passed", operator: "is_false", description: "Verification did not pass" },
        { field: "verification.requires_human_review", operator: "is_true", description: "Requires human review" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["verification-failure", "human-review", "safety"] },
  },
];
