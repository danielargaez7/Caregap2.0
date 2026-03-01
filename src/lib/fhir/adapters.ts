import type {
  FhirPatient,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirCondition,
  FhirEncounter,
  FhirProcedure,
  MedAssistPatientData,
  MedAssistVisitNote,
} from "./types";

/* ─── Helpers ─── */

function formatDate(iso: string | undefined): string {
  if (!iso) return "Unknown";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDateShort(iso: string | undefined): string {
  if (!iso) return "Unknown";
  return iso.slice(0, 10);
}

function yearFromIso(iso: string | undefined): string {
  if (!iso) return "Unknown";
  return iso.slice(0, 4);
}

function calcAge(birthDate: string): string {
  const b = new Date(birthDate + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  ) {
    age--;
  }
  return `${age} years old`;
}

function severityFromFhir(criticality?: string, reactionSeverity?: string): string {
  if (criticality === "high" || reactionSeverity === "severe") return "Severe";
  if (reactionSeverity === "moderate") return "Moderate";
  return "Mild";
}

function categoryToAllergyType(categories?: string[]): string {
  if (!categories || categories.length === 0) return "Unknown";
  const c = categories[0];
  if (c === "food") return "Food";
  if (c === "medication") return "Drug";
  if (c === "environment") return "Environmental";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function medTypeFromCategory(categories?: Array<{ coding: Array<{ code: string }> }>): string {
  if (!categories || categories.length === 0) return "Rx";
  const code = categories[0]?.coding?.[0]?.code ?? "";
  if (code === "community" || code === "outpatient") return "Rx";
  if (code === "supplement") return "Supplement";
  if (code === "patientspecified") return "OTC";
  return "Rx";
}

function deriveTagsFromEncounter(enc: FhirEncounter): string[] {
  const tags: string[] = [];
  const typeText = enc.type?.[0]?.text?.toLowerCase() ?? "";
  if (typeText.includes("lab")) tags.push("Lab Work");
  if (typeText.includes("urgent") || typeText.includes("emergency")) tags.push("Fever");
  if (typeText.includes("consult")) tags.push("Referral");
  if (typeText.includes("imaging") || typeText.includes("x-ray")) tags.push("Imaging");
  if (typeText.includes("prescription") || typeText.includes("rx")) tags.push("Prescription");
  if (tags.length === 0) tags.push("Follow-up");
  return tags;
}

/* ─── Adapter Functions ─── */

export function adaptPatientDemographics(patient: FhirPatient): MedAssistPatientData["personal"] {
  const name = patient.name?.[0];
  const fullName = name?.text ?? `${(name?.given ?? []).join(" ")} ${name?.family ?? ""}`.trim();
  const phone = patient.telecom?.find((t) => t.system === "phone")?.value ?? "";
  const email = patient.telecom?.find((t) => t.system === "email")?.value ?? "";
  const addr = patient.address?.[0];
  const addressStr = addr
    ? [addr.line?.join(", "), addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")
    : "";
  const lang = patient.communication?.[0]?.language?.coding?.[0]?.display ?? "English";
  const marital = patient.maritalStatus?.coding?.[0]?.display ?? "Unknown";
  const ec = patient.contact?.[0];
  const ecStr = ec
    ? `${ec.name?.text ?? "N/A"} (${ec.relationship?.[0]?.text ?? ""}) -- ${ec.telecom?.[0]?.value ?? ""}`
    : "Not on file";
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "Unknown";

  return {
    "Full Legal Name": fullName,
    "Date of Birth": formatDate(patient.birthDate),
    "Age": calcAge(patient.birthDate),
    "Sex": gender,
    "Gender": gender,
    "Marital Status": marital,
    "Preferred Language": lang,
    "Phone": phone,
    "Email": email,
    "Address": addressStr,
    "Emergency Contact": ecStr,
  };
}

export function adaptAllergies(allergies: FhirAllergyIntolerance[]): MedAssistPatientData["allergies"] {
  return allergies.map((a) => ({
    allergen: a.code?.coding?.[0]?.display ?? "Unknown",
    type: categoryToAllergyType(a.category),
    reaction:
      a.reaction?.[0]?.manifestation?.map((m) => m.coding?.[0]?.display).filter(Boolean).join(", ") ?? "Unknown",
    severity: severityFromFhir(a.criticality, a.reaction?.[0]?.severity),
  }));
}

export function adaptMedications(meds: FhirMedicationRequest[]): MedAssistPatientData["medications"] {
  return meds
    .filter((m) => m.status === "active")
    .map((m) => {
      const name =
        m.medicationCodeableConcept?.text ??
        m.medicationCodeableConcept?.coding?.[0]?.display ??
        m.medicationReference?.display ??
        "Unknown";
      const dosage = m.dosageInstruction?.[0];
      const doseQty = dosage?.doseAndRate?.[0]?.doseQuantity;
      const dose = doseQty ? `${doseQty.value}${doseQty.unit}` : dosage?.text ?? "";
      const freq = dosage?.timing?.code?.text ?? "";
      const purpose = m.reasonCode?.[0]?.text ?? "";
      return { name, dose, freq, purpose, type: medTypeFromCategory(m.category) };
    });
}

export function adaptConditions(
  conditions: FhirCondition[],
): Pick<MedAssistPatientData["medicalHistory"], "pastDiagnoses" | "chronic"> {
  const pastDiagnoses: MedAssistPatientData["medicalHistory"]["pastDiagnoses"] = [];
  const chronic: string[] = [];

  for (const c of conditions) {
    const name = c.code?.text ?? c.code?.coding?.[0]?.display ?? "Unknown";
    const statusCode = c.clinicalStatus?.coding?.[0]?.code;
    const status = statusCode === "resolved" ? "Resolved" : statusCode === "active" ? "Active" : "Unknown";
    const year = yearFromIso(c.onsetDateTime);

    if (status === "Active" && c.category?.[0]?.coding?.[0]?.code === "problem-list-item") {
      chronic.push(`${name} (diagnosed ${year})`);
    } else {
      pastDiagnoses.push({ condition: name, status, year });
    }
  }

  return { pastDiagnoses, chronic };
}

export function adaptProcedures(procedures: FhirProcedure[]): MedAssistPatientData["medicalHistory"]["surgeries"] {
  return procedures
    .filter((p) => p.status === "completed")
    .map((p) => ({
      procedure: p.code?.text ?? p.code?.coding?.[0]?.display ?? "Unknown",
      year: yearFromIso(p.performedDateTime ?? p.performedPeriod?.start),
      notes: p.note?.[0]?.text ?? "No additional notes",
    }));
}

export function adaptEncountersToVisitNotes(
  encounters: FhirEncounter[],
  documents: Array<{ encounterId?: string; text: string; date?: string }>,
): MedAssistVisitNote[] {
  return encounters
    .sort((a, b) => new Date(a.period?.start ?? 0).getTime() - new Date(b.period?.start ?? 0).getTime())
    .map((enc) => {
      const provider = enc.participant?.[0]?.individual?.display ?? "Unknown Provider";
      const doc = documents.find((d) => d.encounterId === enc.id);
      return {
        id: `vn-fhir-${enc.id}`,
        date: formatDateShort(enc.period?.start),
        type: enc.type?.[0]?.text ?? enc.class?.display ?? "Visit",
        provider,
        chief: enc.reasonCode?.[0]?.text ?? "See notes",
        summary: doc?.text ?? "No clinical note on file for this encounter.",
        tags: deriveTagsFromEncounter(enc),
        actions: [],
      };
    });
}
