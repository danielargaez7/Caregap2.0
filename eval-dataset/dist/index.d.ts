export type { EvalCase, EvalCategory, Assertion, AssertionOperator } from "./types";
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
export { drugInteractionCases, dosingValidationCases, labInterpretationCases, medicationReconciliationCases, symptomLookupCases, insuranceCoverageCases, providerSearchCases, appointmentAvailabilityCases, verificationLayerCases, patientDataIntegrityCases, clinicalCalculationCases, utilityFunctionCases, };
export declare const allCases: EvalCase[];
/** Get all eval cases for a specific category */
export declare function getCasesByCategory(category: EvalCategory): EvalCase[];
/** Get all eval cases that include a specific tag */
export declare function getCasesByTag(tag: string): EvalCase[];
/** Get all eval cases matching a severity level */
export declare function getCasesBySeverity(severity: EvalCase["metadata"]["severity"]): EvalCase[];
/** Get all eval cases for a specific clinical domain */
export declare function getCasesByDomain(domain: string): EvalCase[];
/** Get a summary of the dataset */
export declare function getDatasetSummary(): {
    totalCases: number;
    categories: Record<string, number>;
    severities: Record<string, number>;
    domains: Record<string, number>;
};
