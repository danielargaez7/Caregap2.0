/* ─── FHIR R4 Resource Interfaces ─── */

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name: Array<{ use?: string; family: string; given: string[]; text?: string }>;
  birthDate: string;
  gender: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
  maritalStatus?: { coding: Array<{ display: string }> };
  communication?: Array<{
    language: { coding: Array<{ display: string }> };
  }>;
  contact?: Array<{
    relationship?: Array<{ text?: string }>;
    name?: { text?: string };
    telecom?: Array<{ value: string }>;
  }>;
}

export interface FhirAllergyIntolerance {
  resourceType: "AllergyIntolerance";
  id: string;
  code: { coding: Array<{ display: string }> };
  category?: string[];
  criticality?: "low" | "high" | "unable-to-assess";
  reaction?: Array<{
    manifestation: Array<{ coding: Array<{ display: string }> }>;
    severity?: "mild" | "moderate" | "severe";
  }>;
}

export interface FhirMedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  status: string;
  intent: string;
  medicationCodeableConcept?: { coding: Array<{ display: string }>; text?: string };
  medicationReference?: { display?: string; reference?: string };
  dosageInstruction?: Array<{
    text?: string;
    timing?: { code?: { text?: string } };
    doseAndRate?: Array<{
      doseQuantity?: { value: number; unit: string };
    }>;
  }>;
  reasonCode?: Array<{ text?: string }>;
  category?: Array<{ coding: Array<{ code: string }> }>;
}

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  status: string;
  category?: Array<{ coding: Array<{ code: string; display?: string }> }>;
  code: { coding: Array<{ code: string; display: string }> };
  valueQuantity?: { value: number; unit: string };
  effectiveDateTime?: string;
  interpretation?: Array<{ coding: Array<{ code: string; display?: string }> }>;
}

export interface FhirCondition {
  resourceType: "Condition";
  id: string;
  clinicalStatus?: { coding: Array<{ code: string }> };
  code: { coding: Array<{ display: string }>; text?: string };
  onsetDateTime?: string;
  abatementDateTime?: string;
  category?: Array<{ coding: Array<{ code: string; display?: string }> }>;
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  status: string;
  class: { code: string; display?: string };
  type?: Array<{ text?: string }>;
  period?: { start: string; end?: string };
  participant?: Array<{
    individual?: { display?: string; reference?: string };
  }>;
  reasonCode?: Array<{ text?: string }>;
}

export interface FhirDocumentReference {
  resourceType: "DocumentReference";
  id: string;
  status: string;
  type?: { coding: Array<{ display: string }> };
  date?: string;
  content?: Array<{
    attachment?: { contentType?: string; data?: string; url?: string };
  }>;
  description?: string;
  context?: { encounter?: Array<{ reference?: string }> };
}

export interface FhirProcedure {
  resourceType: "Procedure";
  id: string;
  status: string;
  code: { coding: Array<{ display: string }>; text?: string };
  performedDateTime?: string;
  performedPeriod?: { start: string; end?: string };
  note?: Array<{ text: string }>;
}

export interface FhirBundle<T> {
  resourceType: "Bundle";
  type: string;
  total?: number;
  entry?: Array<{ resource: T }>;
}

/* ─── Unified MedAssist Data Shape ─── */

export interface MedAssistPatientData {
  personal: Record<string, string>;
  insurance: Record<string, string>;
  medicalHistory: {
    pastDiagnoses: Array<{ condition: string; status: string; year: string }>;
    surgeries: Array<{ procedure: string; year: string; notes: string }>;
    hospitalizations: Array<{ reason: string; date: string; facility: string }>;
    chronic: string[];
    familyHistory: Array<{ relation: string; conditions: string }>;
  };
  medications: Array<{
    name: string;
    dose: string;
    freq: string;
    purpose: string;
    type: string;
  }>;
  allergies: Array<{
    allergen: string;
    type: string;
    reaction: string;
    severity: string;
  }>;
  social: Record<string, string>;
  mentalHealth: {
    phq9: { score: number; label: string; date: string };
    gad7: { score: number; label: string; date: string };
    sleep: string;
    stress: string;
  };
  reasonForVisit: Record<string, string>;
  consent: Array<{ form: string; status: string; date: string }>;
  payment: Record<string, string>;
}

export interface MedAssistVisitNote {
  id: string;
  date: string;
  type: string;
  provider: string;
  chief: string;
  summary: string;
  tags: string[];
  actions: string[];
}

export interface PatientPayload {
  patientInfo: MedAssistPatientData;
  visitNotes: MedAssistVisitNote[];
  source: "fhir" | "demo";
}
