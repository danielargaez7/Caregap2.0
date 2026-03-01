export type EvalCategory = "drug_interaction" | "dosing_validation" | "lab_interpretation" | "medication_reconciliation" | "symptom_lookup" | "insurance_coverage" | "provider_search" | "appointment_availability" | "verification_layer" | "patient_data_integrity" | "clinical_calculation" | "utility_function";
export type AssertionOperator = "equals" | "contains" | "greater_than" | "less_than" | "greater_than_or_equal" | "less_than_or_equal" | "is_true" | "is_false" | "is_defined" | "is_undefined" | "has_length" | "includes_item" | "every_item_satisfies";
export interface Assertion {
    field: string;
    operator: AssertionOperator;
    value?: any;
    description: string;
}
export interface EvalCase {
    id: string;
    category: EvalCategory;
    name: string;
    description: string;
    input: Record<string, any>;
    expected: {
        assertions: Assertion[];
    };
    metadata: {
        severity: "critical" | "high" | "medium" | "low";
        clinical_domain: string;
        tags: string[];
    };
}
