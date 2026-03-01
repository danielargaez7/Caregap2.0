/* ═══════════════════════════════════════════════
   MedAssist Eval Dataset
   85 clinical AI evaluation cases for healthcare
   agent benchmarking and testing
   ═══════════════════════════════════════════════ */

// Re-export types
export type { EvalCase, EvalCategory, Assertion, AssertionOperator } from "./types";

// Import all case categories
import { drugInteractionCases } from "./cases/drug-interactions";
import { dosingValidationCases } from "./cases/dosing-validation";
import { labInterpretationCases } from "./cases/lab-interpretation";
import { medicationReconciliationCases } from "./cases/medication-reconciliation";
import { symptomLookupCases } from "./cases/symptom-lookup";
import { insuranceCoverageCases } from "./cases/insurance-coverage";
import { providerSearchCases } from "./cases/provider-search";
import { appointmentAvailabilityCases } from "./cases/appointment-availability";
import { verificationLayerCases } from "./cases/verification-layer";
import { patientDataIntegrityCases } from "./cases/patient-data-integrity";
import { clinicalCalculationCases } from "./cases/clinical-calculations";
import { utilityFunctionCases } from "./cases/utility-functions";

import type { EvalCase, EvalCategory } from "./types";

// Export individual category arrays
export {
  drugInteractionCases,
  dosingValidationCases,
  labInterpretationCases,
  medicationReconciliationCases,
  symptomLookupCases,
  insuranceCoverageCases,
  providerSearchCases,
  appointmentAvailabilityCases,
  verificationLayerCases,
  patientDataIntegrityCases,
  clinicalCalculationCases,
  utilityFunctionCases,
};

// All 85 cases merged into a single array
export const allCases: EvalCase[] = [
  ...drugInteractionCases,
  ...dosingValidationCases,
  ...labInterpretationCases,
  ...medicationReconciliationCases,
  ...symptomLookupCases,
  ...insuranceCoverageCases,
  ...providerSearchCases,
  ...appointmentAvailabilityCases,
  ...verificationLayerCases,
  ...patientDataIntegrityCases,
  ...clinicalCalculationCases,
  ...utilityFunctionCases,
];

// Category-to-cases mapping
const categoryMap: Record<EvalCategory, EvalCase[]> = {
  drug_interaction: drugInteractionCases,
  dosing_validation: dosingValidationCases,
  lab_interpretation: labInterpretationCases,
  medication_reconciliation: medicationReconciliationCases,
  symptom_lookup: symptomLookupCases,
  insurance_coverage: insuranceCoverageCases,
  provider_search: providerSearchCases,
  appointment_availability: appointmentAvailabilityCases,
  verification_layer: verificationLayerCases,
  patient_data_integrity: patientDataIntegrityCases,
  clinical_calculation: clinicalCalculationCases,
  utility_function: utilityFunctionCases,
};

/** Get all eval cases for a specific category */
export function getCasesByCategory(category: EvalCategory): EvalCase[] {
  return categoryMap[category] || [];
}

/** Get all eval cases that include a specific tag */
export function getCasesByTag(tag: string): EvalCase[] {
  return allCases.filter((c) => c.metadata.tags.includes(tag));
}

/** Get all eval cases matching a severity level */
export function getCasesBySeverity(severity: EvalCase["metadata"]["severity"]): EvalCase[] {
  return allCases.filter((c) => c.metadata.severity === severity);
}

/** Get all eval cases for a specific clinical domain */
export function getCasesByDomain(domain: string): EvalCase[] {
  return allCases.filter((c) =>
    c.metadata.clinical_domain.toLowerCase().includes(domain.toLowerCase())
  );
}

/** Get a summary of the dataset */
export function getDatasetSummary(): {
  totalCases: number;
  categories: Record<string, number>;
  severities: Record<string, number>;
  domains: Record<string, number>;
} {
  const categories: Record<string, number> = {};
  const severities: Record<string, number> = {};
  const domains: Record<string, number> = {};

  for (const c of allCases) {
    categories[c.category] = (categories[c.category] || 0) + 1;
    severities[c.metadata.severity] = (severities[c.metadata.severity] || 0) + 1;
    domains[c.metadata.clinical_domain] = (domains[c.metadata.clinical_domain] || 0) + 1;
  }

  return { totalCases: allCases.length, categories, severities, domains };
}
