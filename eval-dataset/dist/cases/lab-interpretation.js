"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labInterpretationCases = void 0;
exports.labInterpretationCases = [
    {
        id: "lab-interp-001",
        category: "lab_interpretation",
        name: "Analyze all labs — returns comprehensive panel",
        description: "Should analyze all available labs and return at least 4 lab analyses including Potassium and Creatinine.",
        input: {},
        expected: {
            assertions: [
                { field: "data.labs_analyzed.length", operator: "greater_than_or_equal", value: 4, description: "At least 4 labs analyzed" },
                { field: "data.labs_analyzed", operator: "includes_item", value: "Potassium", description: "Includes Potassium analysis" },
                { field: "data.labs_analyzed", operator: "includes_item", value: "Creatinine", description: "Includes Creatinine analysis" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Laboratory Medicine", tags: ["comprehensive-panel", "all-labs"] },
    },
    {
        id: "lab-interp-002",
        category: "lab_interpretation",
        name: "K+ critical with worsening trend",
        description: "Should flag Potassium at 5.8 mEq/L as critical status with a worsening trend (4.6 → 5.8 over time).",
        input: { labs: ["K"] },
        expected: {
            assertions: [
                { field: "data.labs_analyzed[0].status", operator: "equals", value: "critical", description: "K+ status is critical" },
                { field: "data.labs_analyzed[0].trend", operator: "equals", value: "worsening", description: "K+ trend is worsening" },
                { field: "data.labs_analyzed[0].latest_value", operator: "equals", value: 5.8, description: "Latest K+ is 5.8" },
            ],
        },
        metadata: { severity: "critical", clinical_domain: "Nephrology", tags: ["hyperkalemia", "critical-value", "trend-analysis"] },
    },
    {
        id: "lab-interp-003",
        category: "lab_interpretation",
        name: "CRP improving trend (pericarditis resolution)",
        description: "Should show CRP with improving trend as it normalized from 48 to 3.2 mg/L following pericarditis treatment.",
        input: { labs: ["CRP"] },
        expected: {
            assertions: [
                { field: "data.labs_analyzed[0].trend", operator: "equals", value: "improving", description: "CRP trend is improving" },
                { field: "data.labs_analyzed[0].latest_value", operator: "equals", value: 3.2, description: "Latest CRP is 3.2" },
            ],
        },
        metadata: { severity: "low", clinical_domain: "Inflammatory", tags: ["crp", "pericarditis", "resolution", "trend-analysis"] },
    },
    {
        id: "lab-interp-004",
        category: "lab_interpretation",
        name: "K+ correlated with Lisinopril (ACE inhibitor)",
        description: "Should identify medication correlation between elevated K+ and Lisinopril (ACE inhibitor increases potassium retention).",
        input: { labs: ["K"] },
        expected: {
            assertions: [
                { field: "data.medication_correlations", operator: "includes_item", value: "Lisinopril", description: "Correlations mention Lisinopril" },
                { field: "data.medication_correlations", operator: "includes_item", value: "ACE inhibitor", description: "Correlations mention ACE inhibitor mechanism" },
            ],
        },
        metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["drug-lab-interaction", "ace-inhibitor", "hyperkalemia"] },
    },
    {
        id: "lab-interp-005",
        category: "lab_interpretation",
        name: "Critical alerts trigger human review escalation",
        description: "Should generate critical alerts and escalate for human review when critically abnormal values are found.",
        input: {},
        expected: {
            assertions: [
                { field: "data.critical_alerts.length", operator: "greater_than", value: 0, description: "At least one critical alert" },
                { field: "verification.requires_human_review", operator: "is_true", description: "Requires human review" },
                { field: "verification.verification_types", operator: "includes_item", value: "human_in_the_loop", description: "Human-in-the-loop verification applied" },
                { field: "verification.verification_types", operator: "includes_item", value: "domain_constraints", description: "Domain constraints verification applied" },
            ],
        },
        metadata: { severity: "critical", clinical_domain: "Laboratory Medicine", tags: ["escalation", "human-review", "critical-value"] },
    },
];
