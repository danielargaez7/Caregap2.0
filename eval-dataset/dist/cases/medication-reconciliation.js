"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationReconciliationCases = void 0;
exports.medicationReconciliationCases = [
    {
        id: "med-recon-001",
        category: "medication_reconciliation",
        name: "Detect Colchicine discontinued in EHR",
        description: "Should detect Colchicine as a discontinued medication still listed in the EHR system.",
        input: {},
        expected: {
            assertions: [
                { field: "data.discrepancies", operator: "includes_item", value: "Colchicine", description: "Colchicine appears in discrepancies" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Medication Safety", tags: ["discontinued", "ehr-discrepancy", "colchicine"] },
    },
    {
        id: "med-recon-002",
        category: "medication_reconciliation",
        name: "Identify statin therapy gap",
        description: "Should identify missing statin therapy as a therapy gap given LDL 148 mg/dL, HTN, age 59, and family history of MI.",
        input: {},
        expected: {
            assertions: [
                { field: "data.therapy_gaps", operator: "includes_item", value: "Statin", description: "Statin therapy gap identified" },
            ],
        },
        metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["statin", "therapy-gap", "acc-aha-guidelines", "ldl"] },
    },
    {
        id: "med-recon-003",
        category: "medication_reconciliation",
        name: "Flag Doxycycline duration alert",
        description: "Should flag Doxycycline with a duration alert — prescribed for 10 days, tracking elapsed time since start.",
        input: {},
        expected: {
            assertions: [
                { field: "data.duration_alerts", operator: "includes_item", value: "Doxycycline", description: "Doxycycline duration alert exists" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Infectious Disease", tags: ["antibiotic-stewardship", "duration", "doxycycline"] },
    },
    {
        id: "med-recon-004",
        category: "medication_reconciliation",
        name: "Detect patient-reported supplements missing from EHR",
        description: "Should detect Vitamin D3 and/or Fish Oil as patient-reported supplements not in the active EHR medication list.",
        input: {},
        expected: {
            assertions: [
                { field: "data.discrepancies", operator: "includes_item", value: "missing_from_ehr", description: "At least one med missing from EHR" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Medication Safety", tags: ["supplements", "ehr-gap", "reconciliation"] },
    },
    {
        id: "med-recon-005",
        category: "medication_reconciliation",
        name: "Recommend ACE→ARB switch due to elevated K+",
        description: "Should recommend switching from Lisinopril to Losartan due to critically elevated K+ (5.8 mEq/L), referencing visit note documentation.",
        input: {},
        expected: {
            assertions: [
                { field: "data.therapy_gaps", operator: "includes_item", value: "ARB", description: "ARB switch in therapy gaps" },
            ],
        },
        metadata: { severity: "critical", clinical_domain: "Cardiology", tags: ["ace-to-arb", "hyperkalemia", "losartan", "medication-switch"] },
    },
    {
        id: "med-recon-006",
        category: "medication_reconciliation",
        name: "Valid VerifiedToolResult with discrepancies summary",
        description: "Should return properly structured VerifiedToolResult with chart meds, EHR meds, and a summary indicating items requiring attention.",
        input: {},
        expected: {
            assertions: [
                { field: "status", operator: "is_defined", description: "Has status" },
                { field: "data", operator: "is_defined", description: "Has data" },
                { field: "verification", operator: "is_defined", description: "Has verification" },
                { field: "data.chart_medications.length", operator: "greater_than", value: 0, description: "Chart medications populated" },
                { field: "data.ehr_medications.length", operator: "greater_than", value: 0, description: "EHR medications populated" },
                { field: "data.summary", operator: "contains", value: "requiring attention", description: "Summary indicates items need attention" },
                { field: "verification.verification_types", operator: "includes_item", value: "fact_check", description: "Includes fact_check" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Medication Safety", tags: ["verification", "structure", "reconciliation"] },
    },
];
