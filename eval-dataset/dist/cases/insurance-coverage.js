"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insuranceCoverageCases = void 0;
exports.insuranceCoverageCases = [
    {
        id: "insurance-001",
        category: "insurance_coverage",
        name: "Standard office visit coverage (99213)",
        description: "Should return full coverage for standard office visit with $25 copay and no prior authorization required.",
        input: { procedure_code: "99213" },
        expected: {
            assertions: [
                { field: "data.coverage.covered", operator: "is_true", description: "Procedure is covered" },
                { field: "data.coverage.copay", operator: "equals", value: "$25.00", description: "Copay is $25" },
                { field: "data.coverage.prior_auth_required", operator: "is_false", description: "No prior auth needed" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Insurance / Billing", tags: ["office-visit", "copay", "covered"] },
    },
    {
        id: "insurance-002",
        category: "insurance_coverage",
        name: "CT abdomen requires prior auth (74178)",
        description: "Should flag CT abdomen as requiring prior authorization and trigger domain constraint verification.",
        input: { procedure_code: "74178" },
        expected: {
            assertions: [
                { field: "data.coverage.covered", operator: "is_true", description: "Procedure is covered" },
                { field: "data.coverage.prior_auth_required", operator: "is_true", description: "Prior auth required" },
                { field: "verification.verification_types", operator: "includes_item", value: "domain_constraints", description: "Domain constraints applied" },
                { field: "verification.errors", operator: "includes_item", value: "Prior authorization", description: "Error mentions prior auth" },
            ],
        },
        metadata: { severity: "high", clinical_domain: "Insurance / Billing", tags: ["prior-auth", "imaging", "domain-constraint"] },
    },
    {
        id: "insurance-003",
        category: "insurance_coverage",
        name: "Unknown procedure code fails verification",
        description: "Should fail verification for an unknown CPT code, mark as not covered, and require human review.",
        input: { procedure_code: "XXXXX" },
        expected: {
            assertions: [
                { field: "data.coverage.covered", operator: "is_false", description: "Not covered" },
                { field: "status", operator: "equals", value: "failed", description: "Status is failed" },
                { field: "verification.passed", operator: "is_false", description: "Verification failed" },
                { field: "verification.requires_human_review", operator: "is_true", description: "Requires human review" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Insurance / Billing", tags: ["unknown-code", "verification-failure", "negative-test"] },
    },
    {
        id: "insurance-004",
        category: "insurance_coverage",
        name: "Correct patient insurance info returned",
        description: "Should return the correct patient name, insurance provider (Aetna), and member ID in the coverage result.",
        input: { procedure_code: "99213" },
        expected: {
            assertions: [
                { field: "data.patient", operator: "equals", value: "Gord Allen Sims", description: "Correct patient name" },
                { field: "data.insurance_provider", operator: "equals", value: "Aetna", description: "Correct insurance provider" },
                { field: "data.member_id", operator: "equals", value: "32523523023", description: "Correct member ID" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Insurance / Billing", tags: ["patient-info", "insurance-details"] },
    },
    {
        id: "insurance-005",
        category: "insurance_coverage",
        name: "Preventive labs covered at no charge (80053)",
        description: "Should cover CMP lab panel at 100% with $0 copay and no deductible as preventive benefit.",
        input: { procedure_code: "80053" },
        expected: {
            assertions: [
                { field: "data.coverage.covered", operator: "is_true", description: "Covered" },
                { field: "data.coverage.copay", operator: "equals", value: "$0", description: "No copay" },
                { field: "data.coverage.deductible_applies", operator: "is_false", description: "No deductible" },
                { field: "status", operator: "equals", value: "verified", description: "Status is verified (clean)" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Insurance / Billing", tags: ["preventive", "no-charge", "lab-work"] },
    },
];
