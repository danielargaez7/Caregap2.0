import { EvalCase } from "../types";

export const symptomLookupCases: EvalCase[] = [
  {
    id: "symptom-001",
    category: "symptom_lookup",
    name: "Chest pain triggers emergent ACS workup",
    description: "Should return Acute Coronary Syndrome as an emergent condition for chest pain in a 59-year-old male with HTN.",
    input: { symptoms: ["chest pain"] },
    expected: {
      assertions: [
        { field: "data.possible_conditions.length", operator: "greater_than", value: 0, description: "At least one condition returned" },
        { field: "data.possible_conditions[0].urgency", operator: "equals", value: "emergent", description: "Top condition is emergent" },
        { field: "data.possible_conditions[0].condition", operator: "contains", value: "Coronary", description: "ACS identified" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Emergency Medicine", tags: ["chest-pain", "acs", "emergent", "triage"] },
  },
  {
    id: "symptom-002",
    category: "symptom_lookup",
    name: "Ear pain maps to otitis/ear abscess",
    description: "Should return ear-related condition for ear pain, considering patient's active ear abscess being treated with Doxycycline.",
    input: { symptoms: ["ear pain"] },
    expected: {
      assertions: [
        { field: "data.possible_conditions", operator: "includes_item", value: "Ear", description: "Ear condition identified" },
      ],
    },
    metadata: { severity: "medium", clinical_domain: "ENT", tags: ["ear-pain", "otitis", "abscess"] },
  },
  {
    id: "symptom-003",
    category: "symptom_lookup",
    name: "Patient context included in results",
    description: "Should include patient demographic context (59-year-old, allergies) in the symptom analysis result.",
    input: { symptoms: ["nausea"] },
    expected: {
      assertions: [
        { field: "data.patient_context", operator: "contains", value: "59-year-old", description: "Includes patient age" },
        { field: "data.patient_context", operator: "contains", value: "Penicillin", description: "Includes allergy info" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Clinical Assessment", tags: ["patient-context", "demographics"] },
  },
  {
    id: "symptom-004",
    category: "symptom_lookup",
    name: "Results sorted by urgency (emergent first)",
    description: "Should sort conditions by urgency: emergent → urgent → routine when multiple symptoms map to different urgency levels.",
    input: { symptoms: ["chest pain", "nausea", "ear pain"] },
    expected: {
      assertions: [
        { field: "data.possible_conditions", operator: "every_item_satisfies", value: "urgency_sorted", description: "Conditions sorted by urgency level" },
      ],
    },
    metadata: { severity: "high", clinical_domain: "Emergency Medicine", tags: ["triage", "urgency-sorting", "multi-symptom"] },
  },
  {
    id: "symptom-005",
    category: "symptom_lookup",
    name: "Emergent conditions escalated for human review",
    description: "Should escalate emergent conditions for human review with hallucination detection and human-in-the-loop verification.",
    input: { symptoms: ["chest pain"] },
    expected: {
      assertions: [
        { field: "verification.requires_human_review", operator: "is_true", description: "Requires human review" },
        { field: "verification.verification_types", operator: "includes_item", value: "human_in_the_loop", description: "Human-in-the-loop applied" },
        { field: "verification.verification_types", operator: "includes_item", value: "hallucination_detection", description: "Hallucination detection applied" },
      ],
    },
    metadata: { severity: "critical", clinical_domain: "Emergency Medicine", tags: ["escalation", "human-review", "hallucination-check"] },
  },
];
