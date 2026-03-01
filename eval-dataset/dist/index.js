"use strict";
/* ═══════════════════════════════════════════════
   MedAssist Eval Dataset
   85 clinical AI evaluation cases for healthcare
   agent benchmarking and testing
   ═══════════════════════════════════════════════ */
Object.defineProperty(exports, "__esModule", { value: true });
exports.allCases = exports.utilityFunctionCases = exports.clinicalCalculationCases = exports.patientDataIntegrityCases = exports.verificationLayerCases = exports.appointmentAvailabilityCases = exports.providerSearchCases = exports.insuranceCoverageCases = exports.symptomLookupCases = exports.medicationReconciliationCases = exports.labInterpretationCases = exports.dosingValidationCases = exports.drugInteractionCases = void 0;
exports.getCasesByCategory = getCasesByCategory;
exports.getCasesByTag = getCasesByTag;
exports.getCasesBySeverity = getCasesBySeverity;
exports.getCasesByDomain = getCasesByDomain;
exports.getDatasetSummary = getDatasetSummary;
// Import all case categories
const drug_interactions_1 = require("./cases/drug-interactions");
Object.defineProperty(exports, "drugInteractionCases", { enumerable: true, get: function () { return drug_interactions_1.drugInteractionCases; } });
const dosing_validation_1 = require("./cases/dosing-validation");
Object.defineProperty(exports, "dosingValidationCases", { enumerable: true, get: function () { return dosing_validation_1.dosingValidationCases; } });
const lab_interpretation_1 = require("./cases/lab-interpretation");
Object.defineProperty(exports, "labInterpretationCases", { enumerable: true, get: function () { return lab_interpretation_1.labInterpretationCases; } });
const medication_reconciliation_1 = require("./cases/medication-reconciliation");
Object.defineProperty(exports, "medicationReconciliationCases", { enumerable: true, get: function () { return medication_reconciliation_1.medicationReconciliationCases; } });
const symptom_lookup_1 = require("./cases/symptom-lookup");
Object.defineProperty(exports, "symptomLookupCases", { enumerable: true, get: function () { return symptom_lookup_1.symptomLookupCases; } });
const insurance_coverage_1 = require("./cases/insurance-coverage");
Object.defineProperty(exports, "insuranceCoverageCases", { enumerable: true, get: function () { return insurance_coverage_1.insuranceCoverageCases; } });
const provider_search_1 = require("./cases/provider-search");
Object.defineProperty(exports, "providerSearchCases", { enumerable: true, get: function () { return provider_search_1.providerSearchCases; } });
const appointment_availability_1 = require("./cases/appointment-availability");
Object.defineProperty(exports, "appointmentAvailabilityCases", { enumerable: true, get: function () { return appointment_availability_1.appointmentAvailabilityCases; } });
const verification_layer_1 = require("./cases/verification-layer");
Object.defineProperty(exports, "verificationLayerCases", { enumerable: true, get: function () { return verification_layer_1.verificationLayerCases; } });
const patient_data_integrity_1 = require("./cases/patient-data-integrity");
Object.defineProperty(exports, "patientDataIntegrityCases", { enumerable: true, get: function () { return patient_data_integrity_1.patientDataIntegrityCases; } });
const clinical_calculations_1 = require("./cases/clinical-calculations");
Object.defineProperty(exports, "clinicalCalculationCases", { enumerable: true, get: function () { return clinical_calculations_1.clinicalCalculationCases; } });
const utility_functions_1 = require("./cases/utility-functions");
Object.defineProperty(exports, "utilityFunctionCases", { enumerable: true, get: function () { return utility_functions_1.utilityFunctionCases; } });
// All 85 cases merged into a single array
exports.allCases = [
    ...drug_interactions_1.drugInteractionCases,
    ...dosing_validation_1.dosingValidationCases,
    ...lab_interpretation_1.labInterpretationCases,
    ...medication_reconciliation_1.medicationReconciliationCases,
    ...symptom_lookup_1.symptomLookupCases,
    ...insurance_coverage_1.insuranceCoverageCases,
    ...provider_search_1.providerSearchCases,
    ...appointment_availability_1.appointmentAvailabilityCases,
    ...verification_layer_1.verificationLayerCases,
    ...patient_data_integrity_1.patientDataIntegrityCases,
    ...clinical_calculations_1.clinicalCalculationCases,
    ...utility_functions_1.utilityFunctionCases,
];
// Category-to-cases mapping
const categoryMap = {
    drug_interaction: drug_interactions_1.drugInteractionCases,
    dosing_validation: dosing_validation_1.dosingValidationCases,
    lab_interpretation: lab_interpretation_1.labInterpretationCases,
    medication_reconciliation: medication_reconciliation_1.medicationReconciliationCases,
    symptom_lookup: symptom_lookup_1.symptomLookupCases,
    insurance_coverage: insurance_coverage_1.insuranceCoverageCases,
    provider_search: provider_search_1.providerSearchCases,
    appointment_availability: appointment_availability_1.appointmentAvailabilityCases,
    verification_layer: verification_layer_1.verificationLayerCases,
    patient_data_integrity: patient_data_integrity_1.patientDataIntegrityCases,
    clinical_calculation: clinical_calculations_1.clinicalCalculationCases,
    utility_function: utility_functions_1.utilityFunctionCases,
};
/** Get all eval cases for a specific category */
function getCasesByCategory(category) {
    return categoryMap[category] || [];
}
/** Get all eval cases that include a specific tag */
function getCasesByTag(tag) {
    return exports.allCases.filter((c) => c.metadata.tags.includes(tag));
}
/** Get all eval cases matching a severity level */
function getCasesBySeverity(severity) {
    return exports.allCases.filter((c) => c.metadata.severity === severity);
}
/** Get all eval cases for a specific clinical domain */
function getCasesByDomain(domain) {
    return exports.allCases.filter((c) => c.metadata.clinical_domain.toLowerCase().includes(domain.toLowerCase()));
}
/** Get a summary of the dataset */
function getDatasetSummary() {
    const categories = {};
    const severities = {};
    const domains = {};
    for (const c of exports.allCases) {
        categories[c.category] = (categories[c.category] || 0) + 1;
        severities[c.metadata.severity] = (severities[c.metadata.severity] || 0) + 1;
        domains[c.metadata.clinical_domain] = (domains[c.metadata.clinical_domain] || 0) + 1;
    }
    return { totalCases: exports.allCases.length, categories, severities, domains };
}
