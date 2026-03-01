import { EvalCase } from "../types";

export const providerSearchCases: EvalCase[] = [
  {
    id: "provider-001",
    category: "provider_search",
    name: "Find cardiologist by specialty",
    description: "Should find Dr. Kim when searching for Cardiology specialty.",
    input: { specialty: "Cardiology" },
    expected: {
      assertions: [
        { field: "data.providers_found", operator: "greater_than", value: 0, description: "At least one provider found" },
        { field: "data.providers", operator: "includes_item", value: "Kim", description: "Dr. Kim found" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Provider Directory", tags: ["cardiology", "specialist-search"] },
  },
  {
    id: "provider-002",
    category: "provider_search",
    name: "Find nurses by role",
    description: "Should return only nurse-role providers when searching for 'nurse'.",
    input: { specialty: "nurse" },
    expected: {
      assertions: [
        { field: "data.providers_found", operator: "greater_than", value: 0, description: "Nurses found" },
        { field: "data.providers", operator: "every_item_satisfies", value: "role_is_nurse", description: "All results are nurses" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Provider Directory", tags: ["nurse", "role-filter"] },
  },
  {
    id: "provider-003",
    category: "provider_search",
    name: "Empty result for non-existent specialty",
    description: "Should return zero providers for a specialty not available in the clinic (Neurosurgery).",
    input: { specialty: "Neurosurgery" },
    expected: {
      assertions: [
        { field: "data.providers_found", operator: "equals", value: 0, description: "No providers found" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Provider Directory", tags: ["empty-result", "negative-test"] },
  },
  {
    id: "provider-004",
    category: "provider_search",
    name: "Verification includes fact_check and sources",
    description: "Should include fact_check and confidence_scoring verification types with source attribution.",
    input: { specialty: "Internal Medicine" },
    expected: {
      assertions: [
        { field: "verification.verification_types", operator: "includes_item", value: "fact_check", description: "Fact check applied" },
        { field: "verification.verification_types", operator: "includes_item", value: "confidence_scoring", description: "Confidence scoring applied" },
        { field: "verification.sources.length", operator: "greater_than", value: 0, description: "Sources provided" },
      ],
    },
    metadata: { severity: "low", clinical_domain: "Provider Directory", tags: ["verification", "sources"] },
  },
];
