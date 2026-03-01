"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clinicalCalculationCases = void 0;
exports.clinicalCalculationCases = [
    // ASCVD Risk (2 cases)
    {
        id: "calc-ascvd-001",
        category: "clinical_calculation",
        name: "ASCVD risk score for Gord Sims (59M, HTN, on BP meds)",
        description: "Pooled Cohort Equations should produce a valid 10-year ASCVD risk between 0–100% for the demo patient profile.",
        input: { age: 59, totalChol: 210, hdl: 42, sbp: 132, isMale: true, isDiabetic: false, isSmoker: false, onBPMeds: true },
        expected: {
            assertions: [
                { field: "risk", operator: "greater_than_or_equal", value: 0, description: "Risk >= 0%" },
                { field: "risk", operator: "less_than_or_equal", value: 100, description: "Risk <= 100%" },
                { field: "risk_is_finite", operator: "is_true", description: "Risk is a finite number" },
            ],
        },
        metadata: { severity: "high", clinical_domain: "Cardiology", tags: ["ascvd", "pooled-cohort", "risk-calculation"] },
    },
    {
        id: "calc-ascvd-002",
        category: "clinical_calculation",
        name: "Smoker has higher ASCVD risk than non-smoker",
        description: "All else being equal, a smoker should have a higher 10-year ASCVD risk than a non-smoker.",
        input: { base: { age: 45, totalChol: 180, hdl: 60, sbp: 120, isMale: true, isDiabetic: false, onBPMeds: false } },
        expected: {
            assertions: [
                { field: "smoker_risk_greater", operator: "is_true", description: "Smoker risk > non-smoker risk" },
            ],
        },
        metadata: { severity: "medium", clinical_domain: "Cardiology", tags: ["ascvd", "smoking", "risk-factor"] },
    },
    // Penicillin Cross-Reactivity (5 cases)
    {
        id: "calc-pcn-001",
        category: "clinical_calculation",
        name: "Amoxicillin is penicillin-class",
        description: "Amoxicillin should be identified as a penicillin-class drug for allergy cross-reactivity checking.",
        input: { drug: "Amoxicillin" },
        expected: { assertions: [{ field: "isPenicillinClass", operator: "is_true", description: "Amoxicillin is penicillin-class" }] },
        metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["penicillin", "cross-reactivity", "amoxicillin"] },
    },
    {
        id: "calc-pcn-002",
        category: "clinical_calculation",
        name: "Augmentin is penicillin-class",
        description: "Augmentin (amoxicillin/clavulanate) should be identified as penicillin-class.",
        input: { drug: "Augmentin" },
        expected: { assertions: [{ field: "isPenicillinClass", operator: "is_true", description: "Augmentin is penicillin-class" }] },
        metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["penicillin", "cross-reactivity", "augmentin"] },
    },
    {
        id: "calc-pcn-003",
        category: "clinical_calculation",
        name: "Doxycycline is NOT penicillin-class",
        description: "Doxycycline (tetracycline) should NOT be flagged as penicillin-class.",
        input: { drug: "Doxycycline" },
        expected: { assertions: [{ field: "isPenicillinClass", operator: "is_false", description: "Doxycycline is not penicillin-class" }] },
        metadata: { severity: "medium", clinical_domain: "Pharmacology", tags: ["penicillin", "negative-test", "tetracycline"] },
    },
    {
        id: "calc-pcn-004",
        category: "clinical_calculation",
        name: "Azithromycin is NOT penicillin-class",
        description: "Azithromycin (macrolide) should NOT be flagged as penicillin-class.",
        input: { drug: "Azithromycin" },
        expected: { assertions: [{ field: "isPenicillinClass", operator: "is_false", description: "Azithromycin is not penicillin-class" }] },
        metadata: { severity: "medium", clinical_domain: "Pharmacology", tags: ["penicillin", "negative-test", "macrolide"] },
    },
    {
        id: "calc-pcn-005",
        category: "clinical_calculation",
        name: "Patient has documented Penicillin allergy",
        description: "Patient allergy list should include Penicillin as a drug allergy.",
        input: {},
        expected: { assertions: [{ field: "hasPenicillinAllergy", operator: "is_true", description: "Penicillin allergy documented" }] },
        metadata: { severity: "critical", clinical_domain: "Pharmacology", tags: ["allergy", "penicillin", "patient-data"] },
    },
    // ASCVD Input Validation (4 cases)
    {
        id: "calc-validate-001",
        category: "clinical_calculation",
        name: "Reject age below 40 for ASCVD",
        description: "ASCVD calculator should reject ages below 40 (outside Pooled Cohort Equations range).",
        input: { age: 30, totalChol: 200, hdl: 50, sbp: 120 },
        expected: { assertions: [{ field: "error", operator: "equals", value: "Age must be between 40 and 79.", description: "Age validation error" }] },
        metadata: { severity: "medium", clinical_domain: "Cardiology", tags: ["ascvd", "input-validation", "age-range"] },
    },
    {
        id: "calc-validate-002",
        category: "clinical_calculation",
        name: "Reject age above 79 for ASCVD",
        description: "ASCVD calculator should reject ages above 79.",
        input: { age: 85, totalChol: 200, hdl: 50, sbp: 120 },
        expected: { assertions: [{ field: "error", operator: "equals", value: "Age must be between 40 and 79.", description: "Age validation error" }] },
        metadata: { severity: "medium", clinical_domain: "Cardiology", tags: ["ascvd", "input-validation", "age-range"] },
    },
    {
        id: "calc-validate-003",
        category: "clinical_calculation",
        name: "Reject HDL >= total cholesterol",
        description: "ASCVD calculator should reject cases where HDL exceeds total cholesterol (clinically impossible).",
        input: { age: 55, totalChol: 150, hdl: 160, sbp: 120 },
        expected: { assertions: [{ field: "error", operator: "equals", value: "HDL cannot be greater than total cholesterol.", description: "HDL validation error" }] },
        metadata: { severity: "medium", clinical_domain: "Cardiology", tags: ["ascvd", "input-validation", "lipid-panel"] },
    },
    {
        id: "calc-validate-004",
        category: "clinical_calculation",
        name: "Accept valid ASCVD inputs",
        description: "ASCVD calculator should accept valid inputs matching the demo patient profile.",
        input: { age: 59, totalChol: 210, hdl: 42, sbp: 132 },
        expected: { assertions: [{ field: "error", operator: "is_undefined", description: "No validation error" }] },
        metadata: { severity: "low", clinical_domain: "Cardiology", tags: ["ascvd", "input-validation", "valid"] },
    },
];
