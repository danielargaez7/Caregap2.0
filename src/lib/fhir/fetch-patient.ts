import { fhirFetch, fhirSearch, isFhirConfigured } from "./client";
import {
  adaptPatientDemographics,
  adaptAllergies,
  adaptMedications,
  adaptConditions,
  adaptProcedures,
  adaptEncountersToVisitNotes,
} from "./adapters";
import type {
  FhirPatient,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirCondition,
  FhirEncounter,
  FhirDocumentReference,
  FhirProcedure,
  PatientPayload,
  MedAssistPatientData,
  MedAssistVisitNote,
} from "./types";
import { PATIENT_INFO, VISIT_NOTES } from "../patient-data";

export async function fetchPatientData(patientId: string): Promise<PatientPayload> {
  if (!isFhirConfigured()) {
    return {
      patientInfo: PATIENT_INFO as unknown as MedAssistPatientData,
      visitNotes: VISIT_NOTES as unknown as MedAssistVisitNote[],
      source: "demo",
    };
  }

  try {
    const [patient, allergies, medications, conditions, encounters, procedures, documents] =
      await Promise.all([
        fhirFetch<FhirPatient>(`Patient/${patientId}`),
        fhirSearch<FhirAllergyIntolerance>("AllergyIntolerance", { patient: patientId }),
        fhirSearch<FhirMedicationRequest>("MedicationRequest", { patient: patientId }),
        fhirSearch<FhirCondition>("Condition", { patient: patientId }),
        fhirSearch<FhirEncounter>("Encounter", { patient: patientId }),
        fhirSearch<FhirProcedure>("Procedure", { patient: patientId }),
        fhirSearch<FhirDocumentReference>("DocumentReference", { patient: patientId }),
      ]);

    const personal = adaptPatientDemographics(patient);
    const allergyList = adaptAllergies(allergies);
    const medList = adaptMedications(medications);
    const { pastDiagnoses, chronic } = adaptConditions(conditions);
    const surgeries = adaptProcedures(procedures);

    const docTexts = documents.map((doc) => {
      const encRef = doc.context?.encounter?.[0]?.reference;
      const encId = encRef ? encRef.split("/").pop() : undefined;
      return {
        encounterId: encId,
        text: doc.content?.[0]?.attachment?.data
          ? Buffer.from(doc.content[0].attachment.data, "base64").toString("utf-8")
          : doc.description ?? "",
        date: doc.date,
      };
    });

    const visitNotes = adaptEncountersToVisitNotes(encounters, docTexts);

    // Fields not available in FHIR fall back to hardcoded values
    const patientInfo: MedAssistPatientData = {
      personal,
      insurance: PATIENT_INFO.insurance,
      medicalHistory: {
        pastDiagnoses,
        surgeries,
        hospitalizations: PATIENT_INFO.medicalHistory.hospitalizations,
        chronic,
        familyHistory: PATIENT_INFO.medicalHistory.familyHistory,
      },
      medications: medList,
      allergies: allergyList,
      social: PATIENT_INFO.social,
      mentalHealth: PATIENT_INFO.mentalHealth,
      reasonForVisit: PATIENT_INFO.reasonForVisit,
      consent: PATIENT_INFO.consent,
      payment: PATIENT_INFO.payment,
    };

    return { patientInfo, visitNotes, source: "fhir" };
  } catch (error) {
    console.error("[FHIR] Failed to fetch patient data, falling back to demo:", error);
    return {
      patientInfo: PATIENT_INFO as unknown as MedAssistPatientData,
      visitNotes: VISIT_NOTES as unknown as MedAssistVisitNote[],
      source: "demo",
    };
  }
}
