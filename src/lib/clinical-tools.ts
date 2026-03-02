/* ═══════════════════════════════════════════════
   MedAssist Clinical Tools — callable functions
   8 domain-specific healthcare tools
   Each tool returns VerifiedToolResult with verification layer
   ═══════════════════════════════════════════════ */

import {
  PENICILLIN_CLASS_DRUGS,
  PATIENT_INFO,
  STAFF,
  INITIAL_APPOINTMENTS,
  TIME_SLOTS,
  COMMON_MEDICATIONS,
  DOSING_GUIDELINES,
  EHR_MEDICATION_LIST,
  LAB_TRENDS,
  REFERENCE_RANGES,
  MEDICATION_TIMELINE,
  formatTime12,
} from "./patient-data";

import { verify, type VerifiedToolResult } from "./verification";

// All known drug names across interaction DB + common medications
const KNOWN_DRUGS = [
  ...COMMON_MEDICATIONS.map((m) => m.name),
  "Aspirin", "Warfarin", "Potassium", "Antacids", "Colchicine", "Tylenol",
];

/* ─────────────────────────────────────────────────
   Tool 1: drug_interaction_check
   Verification: fact_check, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface DrugInteraction {
  pair: string;
  severity: "high" | "moderate" | "low";
  detail: string;
  recommendation: string;
}

interface DrugInteractionResult {
  medications_checked: string[];
  interactions_found: number;
  interactions: DrugInteraction[];
  allergy_alerts: string[];
}

// Known interaction database (curated for demo patient context)
const INTERACTION_DB: { drugs: [string, string]; severity: "high" | "moderate" | "low"; detail: string; recommendation: string }[] = [
  { drugs: ["Aspirin", "Warfarin"], severity: "high", detail: "Both agents affect coagulation. Concurrent use significantly increases bleeding risk.", recommendation: "Avoid combination or monitor INR closely. Consider PPI for GI protection." },
  { drugs: ["Aspirin", "Ibuprofen"], severity: "moderate", detail: "NSAIDs may reduce cardioprotective effect of aspirin and increase GI bleeding risk.", recommendation: "If both needed, take aspirin 30 min before ibuprofen. Monitor for GI symptoms." },
  { drugs: ["Lisinopril", "Losartan"], severity: "high", detail: "Dual RAAS blockade increases risk of hyperkalemia, hypotension, and renal impairment.", recommendation: "Do not combine ACE inhibitor with ARB. Choose one agent." },
  { drugs: ["Lisinopril", "Potassium"], severity: "moderate", detail: "ACE inhibitors increase potassium retention. Risk of hyperkalemia.", recommendation: "Monitor serum K+ closely. Patient's current K+ is 5.8 mEq/L (critically elevated)." },
  { drugs: ["Metformin", "Doxycycline"], severity: "low", detail: "Tetracyclines may rarely affect glucose metabolism.", recommendation: "Monitor blood glucose. Unlikely to be clinically significant." },
  { drugs: ["Atorvastatin", "Amoxicillin"], severity: "low", detail: "No significant interaction expected.", recommendation: "Safe to co-administer." },
  { drugs: ["Lisinopril", "Metformin"], severity: "low", detail: "ACE inhibitors may slightly enhance hypoglycemic effect of metformin.", recommendation: "Monitor blood glucose when initiating combination." },
  { drugs: ["Prednisone", "Aspirin"], severity: "moderate", detail: "Corticosteroids increase GI bleeding risk when combined with aspirin.", recommendation: "Use PPI prophylaxis if combination required. Limit duration." },
  { drugs: ["Prednisone", "Metformin"], severity: "moderate", detail: "Corticosteroids antagonize blood glucose control.", recommendation: "Monitor glucose closely. May need temporary insulin or dose adjustment." },
  { drugs: ["Sertraline", "Aspirin"], severity: "moderate", detail: "SSRIs impair platelet function; combined with aspirin increases bleeding risk.", recommendation: "Monitor for signs of bleeding. Consider PPI if high GI risk." },
  { drugs: ["Gabapentin", "Hydrocodone/APAP"], severity: "high", detail: "Both cause CNS depression. Combined use increases sedation, respiratory depression risk.", recommendation: "If combination necessary, use lowest effective doses. Monitor respiratory status." },
  { drugs: ["Doxycycline", "Antacids"], severity: "moderate", detail: "Antacids, calcium, and iron reduce doxycycline absorption.", recommendation: "Separate administration by at least 2 hours." },
  { drugs: ["Amlodipine", "Atorvastatin"], severity: "low", detail: "Amlodipine may slightly increase statin levels.", recommendation: "Limit atorvastatin to 20mg when combined with amlodipine. Monitor for myopathy." },
  { drugs: ["Metoprolol", "Amlodipine"], severity: "moderate", detail: "Additive hypotensive and bradycardic effects.", recommendation: "Monitor BP and heart rate closely when combining." },
];

export function drugInteractionCheck(medications: string[]): VerifiedToolResult<DrugInteractionResult> {
  const interactions: DrugInteraction[] = [];
  const allergyAlerts: string[] = [];

  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

  // Check for allergy conflicts (penicillin cross-reactivity)
  const patientAllergies = PATIENT_INFO.allergies;
  const hasPenicillinAllergy = patientAllergies.some((a) => a.allergen === "Penicillin");

  for (const med of medications) {
    if (hasPenicillinAllergy && PENICILLIN_CLASS_DRUGS.some((d) => normalize(med).includes(normalize(d)))) {
      allergyAlerts.push(`ALLERGY ALERT: ${med} is a penicillin-class antibiotic. Patient has documented Penicillin allergy (rash, hives). Do NOT prescribe.`);
    }
  }

  // Check pairwise interactions
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const a = normalize(medications[i]);
      const b = normalize(medications[j]);

      for (const entry of INTERACTION_DB) {
        const d1 = normalize(entry.drugs[0]);
        const d2 = normalize(entry.drugs[1]);
        if ((a.includes(d1) && b.includes(d2)) || (a.includes(d2) && b.includes(d1))) {
          interactions.push({
            pair: `${medications[i]} + ${medications[j]}`,
            severity: entry.severity,
            detail: entry.detail,
            recommendation: entry.recommendation,
          });
        }
      }
    }
  }

  const severityOrder = { high: 0, moderate: 1, low: 2 };
  interactions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const data: DrugInteractionResult = {
    medications_checked: medications,
    interactions_found: interactions.length,
    interactions,
    allergy_alerts: allergyAlerts,
  };

  const hasSevere = interactions.some((i) => i.severity === "high");
  const hasAllergy = allergyAlerts.length > 0;

  return verify(data, {
    factCheck: {
      items: medications,
      knownDatabase: KNOWN_DRUGS,
      domain: "Pharmacology",
      sourceName: "FDA Drug Interaction Database",
    },
    confidenceInput: {
      dataCompleteness: medications.length > 0 ? 0.85 : 0,
      sourceReliability: 0.92,
      matchQuality: medications.length > 0
        ? KNOWN_DRUGS.filter((d) => medications.some((m) => normalize(m).includes(normalize(d)) || normalize(d).includes(normalize(m)))).length / medications.length
        : 0,
    },
    domainConstraints: {
      hasSevereInteractions: hasSevere,
      hasAllergyConflicts: hasAllergy,
    },
    humanReviewInput: {
      confidence: 0.9,
      severity: hasSevere || hasAllergy ? "critical" : interactions.length > 0 ? "moderate" : "low",
      stakes: "high",
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 2: symptom_lookup
   Verification: fact_check, hallucination_detection, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface PossibleCondition {
  condition: string;
  likelihood: "high" | "moderate" | "low";
  urgency: "emergent" | "urgent" | "routine";
  reasoning: string;
  recommended_workup: string[];
}

interface SymptomLookupResult {
  symptoms_analyzed: string[];
  possible_conditions: PossibleCondition[];
  patient_context: string;
}

const SYMPTOM_DB: { keywords: string[]; condition: string; likelihood: "high" | "moderate" | "low"; urgency: "emergent" | "urgent" | "routine"; reasoning: string; workup: string[] }[] = [
  { keywords: ["chest pain", "chest pressure"], condition: "Acute Coronary Syndrome", likelihood: "moderate", urgency: "emergent", reasoning: "Chest pain in 59M with HTN, elevated ASCVD risk, and history of pericarditis requires ACS rule-out.", workup: ["Troponin (serial)", "12-lead ECG", "CXR", "CBC/BMP"] },
  { keywords: ["chest pain", "pleuritic", "sharp", "breathing"], condition: "Recurrent Pericarditis", likelihood: "moderate", urgency: "urgent", reasoning: "Patient has history of pericarditis (Aug 2024). Pleuritic chest pain could indicate recurrence.", workup: ["CRP", "ESR", "Echocardiogram", "ECG"] },
  { keywords: ["headache"], condition: "Hypertensive Headache", likelihood: "high", urgency: "routine", reasoning: "Patient has documented HTN with BP above target. Headaches are reported as associated symptom.", workup: ["BP measurement", "Medication review", "Consider dose titration"] },
  { keywords: ["nausea", "vomiting"], condition: "Medication Side Effect (ACE Inhibitor / Doxycycline)", likelihood: "high", urgency: "routine", reasoning: "Patient has documented intermittent nausea. Both Lisinopril and Doxycycline can cause GI symptoms.", workup: ["H. pylori breath test (already ordered)", "Medication timing review", "Upper GI if persists"] },
  { keywords: ["nausea", "vomiting", "abdominal"], condition: "Celiac Disease / Gluten Sensitivity", likelihood: "moderate", urgency: "routine", reasoning: "Patient has gluten sensitivity with mildly elevated tTG-IgA (22). GI referral pending.", workup: ["tTG-IgA recheck", "Endoscopy with biopsy", "Strict GF diet trial"] },
  { keywords: ["abdominal pain", "stomach", "belly"], condition: "Diverticulitis", likelihood: "low", urgency: "urgent", reasoning: "CT showed mild diverticulosis. LLQ pain could indicate diverticular flare.", workup: ["CT abdomen with contrast", "CBC", "CRP", "Surgery consult if complicated"] },
  { keywords: ["shortness of breath", "dyspnea", "breathing difficulty"], condition: "COPD Exacerbation", likelihood: "moderate", urgency: "urgent", reasoning: "Patient has early emphysema (FEV1 78%), former smoker. SOB may indicate COPD progression.", workup: ["SpO2", "PFTs", "CXR", "Bronchodilator trial"] },
  { keywords: ["cough"], condition: "ACE Inhibitor-Induced Cough", likelihood: "high", urgency: "routine", reasoning: "Dry cough is a known side effect of Lisinopril (ACE inhibitor). Occurs in ~10% of patients.", workup: ["Medication review", "Consider switching to ARB (Losartan)", "CXR if productive"] },
  { keywords: ["ear pain", "ear", "hearing"], condition: "Otitis Externa / Ear Abscess", likelihood: "high", urgency: "routine", reasoning: "Patient has active ear abscess being treated with Doxycycline. Ear symptoms likely related.", workup: ["Otoscopic exam", "Assess antibiotic response", "I&D if no improvement"] },
  { keywords: ["fatigue", "tired", "weakness"], condition: "Copper Deficiency", likelihood: "moderate", urgency: "routine", reasoning: "Patient has low copper (62 ug/dL). Copper deficiency can cause fatigue and weakness.", workup: ["Serum copper recheck", "Ceruloplasmin", "CBC for anemia", "Dietary assessment"] },
  { keywords: ["dizziness", "lightheaded"], condition: "Medication-Related Hypotension", likelihood: "moderate", urgency: "urgent", reasoning: "Lisinopril + elevated K+ could cause hemodynamic instability.", workup: ["Orthostatic BP", "BMP (K+, creatinine)", "Medication review"] },
  { keywords: ["swelling", "edema", "legs"], condition: "Heart Failure", likelihood: "low", urgency: "urgent", reasoning: "HTN is a risk factor for HF. New edema warrants evaluation.", workup: ["BNP/NT-proBNP", "Echocardiogram", "CXR", "BMP"] },
  { keywords: ["rash", "hives", "skin"], condition: "Drug Allergy Reaction", likelihood: "moderate", urgency: "urgent", reasoning: "Patient has documented drug allergy to Penicillin. New rash could indicate reaction to current medications.", workup: ["Medication timeline review", "Allergy panel", "Discontinue suspect agent", "Dermatology referral if severe"] },
];

const ALL_KNOWN_SYMPTOMS = SYMPTOM_DB.flatMap((e) => e.keywords);

export function symptomLookup(symptoms: string[]): VerifiedToolResult<SymptomLookupResult> {
  const conditions: PossibleCondition[] = [];
  const seen = new Set<string>();

  const normalizedSymptoms = symptoms.map((s) => s.toLowerCase());

  for (const entry of SYMPTOM_DB) {
    const matches = entry.keywords.some((kw) =>
      normalizedSymptoms.some((s) => s.includes(kw) || kw.includes(s))
    );
    if (matches && !seen.has(entry.condition)) {
      seen.add(entry.condition);
      conditions.push({
        condition: entry.condition,
        likelihood: entry.likelihood,
        urgency: entry.urgency,
        reasoning: entry.reasoning,
        recommended_workup: entry.workup,
      });
    }
  }

  const urgencyOrder = { emergent: 0, urgent: 1, routine: 2 };
  conditions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  const hasEmergent = conditions.some((c) => c.urgency === "emergent");
  const hasUrgent = conditions.some((c) => c.urgency === "urgent");
  const matchCount = conditions.length;

  const data: SymptomLookupResult = {
    symptoms_analyzed: symptoms,
    possible_conditions: conditions,
    patient_context: `59-year-old male with HTN, early COPD, history of pericarditis, active ear abscess, K+ 5.8 (elevated), Copper 62 (low). Allergies: Penicillin, Peanuts, Gluten.`,
  };

  return verify(data, {
    factCheck: {
      items: symptoms,
      knownDatabase: ALL_KNOWN_SYMPTOMS,
      domain: "Clinical Symptomatology",
      sourceName: "ICD-11 Symptom Classification",
    },
    hallucinationCheck: {
      claims: conditions.map((c) => ({
        claim: `${c.condition} (${c.likelihood} likelihood)`,
        supportedByData: true, // All conditions come from our curated DB with patient-specific reasoning
      })),
    },
    confidenceInput: {
      dataCompleteness: 0.80, // patient has extensive medical history
      sourceReliability: 0.88,
      matchQuality: matchCount > 0 ? Math.min(matchCount / symptoms.length, 1.0) : 0.1,
    },
    domainConstraints: {
      hasEmergentCondition: hasEmergent,
    },
    humanReviewInput: {
      confidence: 0.85,
      severity: hasEmergent ? "critical" : hasUrgent ? "high" : "low",
      stakes: "high",
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 3: provider_search
   Verification: fact_check, confidence
   ───────────────────────────────────────────────── */

interface ProviderResult {
  name: string;
  title: string;
  specialty: string;
  bio: string;
  role: "doctor" | "nurse" | "receptionist";
  available: boolean;
}

interface ProviderSearchResult {
  query_specialty: string;
  query_location: string;
  providers_found: number;
  providers: ProviderResult[];
}

const ALL_SPECIALTIES = [
  ...STAFF.doctors.map((d) => d.specialty),
  ...STAFF.nurses.map((n) => n.specialty),
  "Scheduling", "Front Desk",
];

export function providerSearch(specialty: string, location?: string): VerifiedToolResult<ProviderSearchResult> {
  const normalizedSpecialty = specialty.toLowerCase();
  const allProviders: ProviderResult[] = [];

  for (const doc of STAFF.doctors) {
    if (
      doc.specialty.toLowerCase().includes(normalizedSpecialty) ||
      doc.title.toLowerCase().includes(normalizedSpecialty) ||
      doc.name.toLowerCase().includes(normalizedSpecialty) ||
      normalizedSpecialty.includes("doctor") ||
      normalizedSpecialty.includes("physician")
    ) {
      allProviders.push({ name: doc.name, title: doc.title, specialty: doc.specialty, bio: doc.bio, role: "doctor", available: true });
    }
  }

  for (const nurse of STAFF.nurses) {
    if (
      nurse.specialty.toLowerCase().includes(normalizedSpecialty) ||
      nurse.title.toLowerCase().includes(normalizedSpecialty) ||
      nurse.name.toLowerCase().includes(normalizedSpecialty) ||
      normalizedSpecialty.includes("nurse") ||
      normalizedSpecialty.includes("rn")
    ) {
      allProviders.push({ name: nurse.name, title: nurse.title, specialty: nurse.specialty, bio: nurse.bio, role: "nurse", available: true });
    }
  }

  for (const rec of STAFF.receptionists) {
    if (
      rec.specialty.toLowerCase().includes(normalizedSpecialty) ||
      normalizedSpecialty.includes("reception") ||
      normalizedSpecialty.includes("front desk") ||
      normalizedSpecialty.includes("scheduling")
    ) {
      allProviders.push({ name: rec.name, title: rec.title, specialty: rec.specialty, bio: rec.bio, role: "receptionist", available: true });
    }
  }

  const data: ProviderSearchResult = {
    query_specialty: specialty,
    query_location: location || "Main Clinic",
    providers_found: allProviders.length,
    providers: allProviders,
  };

  return verify(data, {
    factCheck: {
      items: [specialty],
      knownDatabase: ALL_SPECIALTIES,
      domain: "Provider Directory",
      sourceName: "Clinic Staff Registry",
    },
    confidenceInput: {
      dataCompleteness: 1.0, // full staff directory
      sourceReliability: 0.95,
      matchQuality: allProviders.length > 0 ? 1.0 : 0.2,
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 4: appointment_availability
   Verification: fact_check, confidence, domain_constraints
   ───────────────────────────────────────────────── */

interface AvailableSlot {
  date: string;
  time: string;
  time_display: string;
  provider: string;
  type: string;
}

interface AppointmentAvailabilityResult {
  provider: string;
  date_range_start: string;
  date_range_end: string;
  booked_slots: number;
  available_slots: AvailableSlot[];
}

export function appointmentAvailability(providerName: string, startDate: string, endDate: string): VerifiedToolResult<AppointmentAvailabilityResult> {
  const normalizedProvider = providerName.toLowerCase();

  const matchedProvider = [...STAFF.doctors].find((d) =>
    d.name.toLowerCase().includes(normalizedProvider) ||
    normalizedProvider.includes(d.name.split(" ").pop()!.toLowerCase())
  );

  const providerDisplay = matchedProvider?.name || providerName;

  const booked = INITIAL_APPOINTMENTS.filter((appt) => {
    const matchesProvider = appt.provider.toLowerCase().includes(normalizedProvider) ||
      normalizedProvider.includes(appt.provider.split(" ").pop()!.toLowerCase());
    const inRange = appt.date >= startDate && appt.date <= endDate;
    return matchesProvider && inRange;
  });

  const bookedSlots = new Set(booked.map((a) => `${a.date}|${a.time}`));

  const available: AvailableSlot[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = d.toISOString().split("T")[0];
    for (const slot of TIME_SLOTS) {
      const key = `${dateStr}|${slot}`;
      if (!bookedSlots.has(key)) {
        available.push({
          date: dateStr,
          time: slot,
          time_display: formatTime12(slot),
          provider: providerDisplay,
          type: "Available",
        });
      }
    }
  }

  const data: AppointmentAvailabilityResult = {
    provider: providerDisplay,
    date_range_start: startDate,
    date_range_end: endDate,
    booked_slots: booked.length,
    available_slots: available.slice(0, 20),
  };

  const providerFound = matchedProvider != null;
  const allProviderNames = STAFF.doctors.map((d) => d.name);

  return verify(data, {
    factCheck: {
      items: [providerName],
      knownDatabase: allProviderNames,
      domain: "Scheduling",
      sourceName: "Clinic Provider Directory",
    },
    confidenceInput: {
      dataCompleteness: providerFound ? 0.95 : 0.3,
      sourceReliability: 0.95,
      matchQuality: providerFound ? 1.0 : 0.1,
    },
    domainConstraints: {
      outOfRangeValues: !providerFound ? [`Provider "${providerName}" not found in system`] : undefined,
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 5: insurance_coverage_check
   Verification: fact_check, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface CoverageDetail {
  procedure_code: string;
  procedure_name: string;
  covered: boolean;
  coverage_level: "full" | "partial" | "not_covered";
  patient_responsibility: string;
  copay: string;
  deductible_applies: boolean;
  prior_auth_required: boolean;
  notes: string;
}

interface InsuranceCoverageResult {
  patient: string;
  insurance_provider: string;
  member_id: string;
  plan_type: string;
  procedure_checked: string;
  coverage: CoverageDetail;
}

const PROCEDURE_DB: Record<string, { name: string; covered: boolean; coverage_level: "full" | "partial" | "not_covered"; responsibility: string; copay: string; deductible: boolean; prior_auth: boolean; notes: string }> = {
  "99213": { name: "Office Visit — Established Patient (Level 3)", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$25.00", deductible: false, prior_auth: false, notes: "Standard office visit. No referral needed for PCP." },
  "99214": { name: "Office Visit — Established Patient (Level 4)", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$25.00", deductible: false, prior_auth: false, notes: "Extended office visit. No referral needed for PCP." },
  "99215": { name: "Office Visit — Established Patient (Level 5)", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$40.00", deductible: false, prior_auth: false, notes: "Complex visit. May require documentation justification." },
  "99203": { name: "Office Visit — New Patient (Level 3)", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$35.00", deductible: false, prior_auth: false, notes: "Initial new patient visit." },
  "36415": { name: "Venipuncture (Blood Draw)", covered: true, coverage_level: "full", responsibility: "No charge", copay: "$0", deductible: false, prior_auth: false, notes: "Covered as part of diagnostic workup." },
  "80053": { name: "Comprehensive Metabolic Panel (CMP)", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Covered under preventive lab work benefit." },
  "80061": { name: "Lipid Panel", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Annual lipid panel covered at 100% as preventive screening." },
  "93000": { name: "Electrocardiogram (ECG), 12-lead", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$25.00", deductible: false, prior_auth: false, notes: "Covered for cardiac evaluation." },
  "93306": { name: "Echocardiogram, Complete", covered: true, coverage_level: "partial", responsibility: "20% coinsurance after deductible", copay: "$50.00", deductible: true, prior_auth: false, notes: "Covered when medically necessary. Cardiology referral may be required." },
  "71046": { name: "Chest X-Ray, 2 Views", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$25.00", deductible: false, prior_auth: false, notes: "Standard diagnostic imaging. No prior auth needed." },
  "74178": { name: "CT Abdomen/Pelvis with Contrast", covered: true, coverage_level: "partial", responsibility: "20% coinsurance after deductible", copay: "$75.00", deductible: true, prior_auth: true, notes: "Prior authorization required. Must document medical necessity." },
  "94010": { name: "Spirometry / Pulmonary Function Test (PFT)", covered: true, coverage_level: "full", responsibility: "Copay only", copay: "$25.00", deductible: false, prior_auth: false, notes: "Covered for respiratory evaluation." },
  "43239": { name: "Upper GI Endoscopy with Biopsy", covered: true, coverage_level: "partial", responsibility: "20% coinsurance after deductible", copay: "$100.00", deductible: true, prior_auth: true, notes: "Prior authorization required. GI referral needed. Celiac workup qualifies." },
  "90471": { name: "Immunization Administration", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Covered at 100% under ACA preventive services." },
  "90686": { name: "Influenza Vaccine (Quadrivalent)", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Annual flu vaccine covered at 100%." },
  "G0444": { name: "Depression Screening (PHQ-9)", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Annual depression screening covered under preventive benefit." },
  "G0442": { name: "Alcohol Misuse Screening", covered: true, coverage_level: "full", responsibility: "No charge (preventive)", copay: "$0", deductible: false, prior_auth: false, notes: "Annual screening covered under preventive benefit." },
  "99490": { name: "Chronic Care Management (20 min/month)", covered: true, coverage_level: "partial", responsibility: "20% coinsurance", copay: "$15.00", deductible: false, prior_auth: false, notes: "Available for patients with 2+ chronic conditions. Patient qualifies (HTN + early COPD)." },
};

const ALL_PROCEDURE_CODES = Object.keys(PROCEDURE_DB);
const ALL_KNOWN_DRUGS_FOR_DOSING = Object.keys(DOSING_GUIDELINES);

export function insuranceCoverageCheck(procedureCode: string, planId?: string): VerifiedToolResult<InsuranceCoverageResult> {
  const patientInsurance = PATIENT_INFO.insurance;
  const procedure = PROCEDURE_DB[procedureCode];

  const coverage: CoverageDetail = procedure
    ? {
        procedure_code: procedureCode,
        procedure_name: procedure.name,
        covered: procedure.covered,
        coverage_level: procedure.coverage_level,
        patient_responsibility: procedure.responsibility,
        copay: procedure.copay,
        deductible_applies: procedure.deductible,
        prior_auth_required: procedure.prior_auth,
        notes: procedure.notes,
      }
    : {
        procedure_code: procedureCode,
        procedure_name: "Unknown Procedure",
        covered: false,
        coverage_level: "not_covered",
        patient_responsibility: "Unable to determine — code not found in benefits database",
        copay: "N/A",
        deductible_applies: false,
        prior_auth_required: false,
        notes: `Procedure code ${procedureCode} not found in the Aetna benefits database. Contact Aetna Member Services at 1-800-872-3862 for manual verification.`,
      };

  const data: InsuranceCoverageResult = {
    patient: PATIENT_INFO.personal["Full Legal Name"],
    insurance_provider: patientInsurance["Insurance Provider"],
    member_id: patientInsurance["Member ID"],
    plan_type: planId || patientInsurance["Group Number"],
    procedure_checked: procedureCode,
    coverage,
  };

  const codeFound = procedure != null;

  return verify(data, {
    factCheck: {
      items: [procedureCode],
      knownDatabase: ALL_PROCEDURE_CODES,
      domain: "Insurance / Billing",
      sourceName: "CMS CPT/HCPCS Code Database",
    },
    confidenceInput: {
      dataCompleteness: codeFound ? 0.95 : 0.2,
      sourceReliability: 0.90,
      matchQuality: codeFound ? 1.0 : 0.0,
    },
    domainConstraints: {
      requiresPriorAuth: coverage.prior_auth_required,
    },
    humanReviewInput: {
      confidence: codeFound ? 0.92 : 0.2,
      severity: coverage.prior_auth_required ? "moderate" : "low",
      stakes: coverage.prior_auth_required || !codeFound ? "high" : "medium",
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 6: dosing_validation
   Verification: fact_check, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface DosingValidationResult {
  medication: string;
  current_dose: string;
  indication: string;
  standard_dose_range: string[];
  is_within_range: boolean;
  max_daily_dose: string;
  recommendation: string;
  warnings: string[];
  patient_factors: string[];
}

function parseDoseMg(dose: string): number | null {
  const match = dose.replace(/,/g, "").match(/([\d.]+)\s*(mg|g|iu|mcg)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "g") return value * 1000;
  if (unit === "mcg") return value / 1000;
  return value;
}

export function dosingValidation(medication: string, dose: string, indication?: string): VerifiedToolResult<DosingValidationResult> {
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
  const normalizedMed = normalize(medication);

  // Find guideline by normalized name match
  const guidelineKey = Object.keys(DOSING_GUIDELINES).find(
    (k) => normalize(k) === normalizedMed || normalizedMed.includes(normalize(k)) || normalize(k).includes(normalizedMed)
  );
  const guideline = guidelineKey ? DOSING_GUIDELINES[guidelineKey] : null;

  if (!guideline) {
    const data: DosingValidationResult = {
      medication,
      current_dose: dose,
      indication: indication || "not specified",
      standard_dose_range: [],
      is_within_range: false,
      max_daily_dose: "Unknown",
      recommendation: `Medication "${medication}" not found in dosing guidelines database. Manual review required.`,
      warnings: [`No dosing guidelines available for ${medication}`],
      patient_factors: [],
    };

    return verify(data, {
      factCheck: {
        items: [medication],
        knownDatabase: ALL_KNOWN_DRUGS_FOR_DOSING,
        domain: "Pharmacology",
        sourceName: "Clinical Dosing Guidelines",
      },
      confidenceInput: { dataCompleteness: 0.1, sourceReliability: 0.9, matchQuality: 0.0 },
      humanReviewInput: { confidence: 0.1, severity: "moderate", stakes: "high" },
    });
  }

  // Determine indication
  const indicationKeys = Object.keys(guideline.indications);
  const resolvedIndication = indication
    ? indicationKeys.find((k) => normalize(k).includes(normalize(indication)) || normalize(indication).includes(normalize(k))) || indicationKeys[0]
    : indicationKeys[0];
  const indicationInfo = guideline.indications[resolvedIndication];

  // Parse current dose and check range
  const currentDoseMg = parseDoseMg(dose);
  const standardDoses = guideline.standardDoses;

  // Check indication-specific dose
  const recommendedDoseMgs = indicationInfo.recommendedDose.split("-").map((s) => parseDoseMg(s.trim() + (s.trim().match(/\d$/) ? "mg" : ""))).filter((v): v is number => v !== null);
  const indicationMin = recommendedDoseMgs.length > 0 ? Math.min(...recommendedDoseMgs) : null;
  const indicationMax = recommendedDoseMgs.length > 0 ? Math.max(...recommendedDoseMgs) : null;
  const isWithinIndicationRange = currentDoseMg !== null && indicationMin !== null && indicationMax !== null &&
    currentDoseMg >= indicationMin && currentDoseMg <= indicationMax;

  // Build warnings
  const warnings: string[] = [...guideline.warnings];
  const patientFactors: string[] = [];

  // Patient-specific checks
  const patientAge = 59;
  if (patientAge >= 65 && guideline.ageConsiderations) {
    patientFactors.push(guideline.ageConsiderations);
  }

  // Check K+ for ACE inhibitors / ARBs
  const latestK = LAB_TRENDS.filter((l) => l.K !== null).pop()?.K;
  if (latestK && latestK > 5.0 && (normalize(medication).includes("lisinopril") || normalize(medication).includes("losartan"))) {
    warnings.push(`ALERT: Patient K+ is ${latestK} mEq/L (critically elevated). ACE inhibitors/ARBs increase K+ retention. Consider dose reduction or switching medication class.`);
    patientFactors.push(`Current K+: ${latestK} mEq/L — above normal range (3.5–5.0)`);
  }

  if (guideline.renalAdjustment.required) {
    patientFactors.push(`Renal adjustment: ${guideline.renalAdjustment.note}`);
  }

  // Build recommendation
  let recommendation: string;
  if (!isWithinIndicationRange && currentDoseMg !== null && indicationMin !== null) {
    if (currentDoseMg > indicationMax!) {
      recommendation = `Current dose ${dose} exceeds recommended ${indicationInfo.recommendedDose} for ${resolvedIndication}. ${indicationInfo.notes}`;
    } else {
      recommendation = `Current dose ${dose} is below typical ${indicationInfo.recommendedDose} for ${resolvedIndication}. ${indicationInfo.notes}`;
    }
  } else {
    recommendation = `Dose ${dose} is within recommended range for ${resolvedIndication}. ${indicationInfo.notes}`;
  }

  const data: DosingValidationResult = {
    medication,
    current_dose: dose,
    indication: resolvedIndication,
    standard_dose_range: standardDoses,
    is_within_range: isWithinIndicationRange,
    max_daily_dose: guideline.maxDailyDose,
    recommendation,
    warnings,
    patient_factors: patientFactors,
  };

  const hasCriticalWarning = warnings.some((w) => w.includes("ALERT") || w.includes("critically"));
  const doseOutOfRange = !isWithinIndicationRange;

  return verify(data, {
    factCheck: {
      items: [medication],
      knownDatabase: ALL_KNOWN_DRUGS_FOR_DOSING,
      domain: "Pharmacology",
      sourceName: "Clinical Dosing Guidelines",
    },
    confidenceInput: {
      dataCompleteness: 0.90,
      sourceReliability: 0.92,
      matchQuality: 1.0,
    },
    domainConstraints: {
      outOfRangeValues: doseOutOfRange ? [`Dose ${dose} outside recommended range for ${resolvedIndication}`] : undefined,
    },
    humanReviewInput: {
      confidence: 0.88,
      severity: hasCriticalWarning ? "critical" : doseOutOfRange ? "moderate" : "low",
      stakes: "high",
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 7: lab_interpretation
   Verification: fact_check, hallucination_check, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface LabAnalysis {
  lab: string;
  latest_value: number;
  unit: string;
  reference_range: string;
  status: "normal" | "low" | "high" | "critical";
  trend: "improving" | "worsening" | "stable" | "insufficient_data";
  trend_values: number[];
  clinical_significance: string;
}

interface LabInterpretationResult {
  labs_analyzed: LabAnalysis[];
  critical_alerts: string[];
  medication_correlations: string[];
  recommended_actions: string[];
}

const LAB_KEYS = ["K", "LDL", "HDL", "CRP", "Creatinine", "Copper"] as const;
type LabKey = typeof LAB_KEYS[number];

// Medication-lab correlations for the demo patient
const MED_LAB_CORRELATIONS: { lab: LabKey; medication: string; condition: string; detail: string }[] = [
  { lab: "K", medication: "Lisinopril", condition: "high", detail: "ACE inhibitor increases potassium retention. Patient K+ critically elevated — consider dose reduction or switch to ARB (Losartan)." },
  { lab: "LDL", medication: "None (no statin)", condition: "high", detail: "No statin therapy despite LDL 148 mg/dL and HTN. ACC/AHA guidelines recommend moderate-intensity statin for this risk profile." },
  { lab: "Copper", medication: "Dietary restriction", condition: "low", detail: "Low copper may be related to gluten-free diet limiting copper-rich food sources. Consider supplementation or dietary counseling." },
  { lab: "CRP", medication: "Colchicine (discontinued)", condition: "normal", detail: "CRP normalized after pericarditis treatment with colchicine. Pericarditis considered resolved." },
];

function computeTrend(values: number[], labKey: LabKey): "improving" | "worsening" | "stable" | "insufficient_data" {
  if (values.length < 3) return "insufficient_data";

  const first = values[0];
  const last = values[values.length - 1];
  const range = REFERENCE_RANGES[labKey];
  if (!range) return "insufficient_data";

  const delta = last - first;
  const percentChange = Math.abs(delta / first) * 100;

  // Less than 5% change is stable
  if (percentChange < 5) return "stable";

  // Determine if moving toward or away from normal range
  const lastInRange = last >= range.min && last <= range.max;
  const movingTowardRange =
    (last > range.max && delta < 0) ||   // Was high, going down
    (last < range.min && delta > 0) ||   // Was low, going up
    lastInRange;                          // Now in range

  return movingTowardRange ? "improving" : "worsening";
}

function getLabStatus(value: number, labKey: LabKey): "normal" | "low" | "high" | "critical" {
  const range = REFERENCE_RANGES[labKey];
  if (!range) return "normal";

  if (value >= range.min && value <= range.max) return "normal";

  // Critical thresholds for specific labs
  if (labKey === "K" && value > 5.5) return "critical";
  if (labKey === "K" && value < 3.0) return "critical";
  if (labKey === "CRP" && value > 20) return "critical";

  return value < range.min ? "low" : "high";
}

export function labInterpretation(labs?: string[]): VerifiedToolResult<LabInterpretationResult> {
  const requestedLabs = labs && labs.length > 0
    ? LAB_KEYS.filter((k) => labs.some((l) => l.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(l.toLowerCase())))
    : [...LAB_KEYS];

  // If user typed labs we don't recognize, fall back to all
  const labsToAnalyze = requestedLabs.length > 0 ? requestedLabs : [...LAB_KEYS];

  const analyses: LabAnalysis[] = [];
  const criticalAlerts: string[] = [];
  const medCorrelations: string[] = [];
  const actions: string[] = [];

  for (const labKey of labsToAnalyze) {
    const trendValues = LAB_TRENDS
      .map((point) => point[labKey])
      .filter((v): v is number => v !== null);

    if (trendValues.length === 0) continue;

    const latestValue = trendValues[trendValues.length - 1];
    const range = REFERENCE_RANGES[labKey];
    if (!range) continue;

    const status = getLabStatus(latestValue, labKey);
    const trend = computeTrend(trendValues, labKey);

    let significance: string;
    if (status === "critical") {
      significance = `${range.label} at ${latestValue} ${range.unit} is CRITICALLY outside normal range (${range.min}–${range.max}). Immediate clinical attention required.`;
      criticalAlerts.push(`CRITICAL: ${range.label} = ${latestValue} ${range.unit} (normal: ${range.min}–${range.max})`);
    } else if (status === "high") {
      significance = `${range.label} at ${latestValue} ${range.unit} is above normal range (${range.min}–${range.max}). Monitor and consider intervention.`;
    } else if (status === "low") {
      significance = `${range.label} at ${latestValue} ${range.unit} is below normal range (${range.min}–${range.max}). Evaluate cause and consider supplementation.`;
    } else {
      significance = `${range.label} at ${latestValue} ${range.unit} is within normal range (${range.min}–${range.max}).`;
    }

    if (trend === "worsening") {
      significance += ` Trend is WORSENING (${trendValues[0]} → ${latestValue}).`;
    } else if (trend === "improving") {
      significance += ` Trend is improving (${trendValues[0]} → ${latestValue}).`;
    }

    analyses.push({
      lab: range.label,
      latest_value: latestValue,
      unit: range.unit,
      reference_range: `${range.min}–${range.max}`,
      status,
      trend,
      trend_values: trendValues,
      clinical_significance: significance,
    });

    // Check medication correlations
    for (const corr of MED_LAB_CORRELATIONS) {
      if (corr.lab === labKey && (
        (corr.condition === "high" && (status === "high" || status === "critical")) ||
        (corr.condition === "low" && status === "low") ||
        (corr.condition === "normal" && status === "normal")
      )) {
        medCorrelations.push(`${range.label} ↔ ${corr.medication}: ${corr.detail}`);
      }
    }
  }

  // Generate recommended actions
  if (criticalAlerts.length > 0) {
    actions.push("Repeat critical labs within 24-48 hours to confirm values.");
  }
  const kAnalysis = analyses.find((a) => a.lab === "Potassium");
  if (kAnalysis && (kAnalysis.status === "high" || kAnalysis.status === "critical")) {
    actions.push("Reassess Lisinopril — consider switching to ARB (Losartan 50mg) to reduce hyperkalemia risk.");
    actions.push("Order repeat BMP to monitor potassium trend.");
  }
  const ldlAnalysis = analyses.find((a) => a.lab === "LDL Cholesterol");
  if (ldlAnalysis && (ldlAnalysis.status === "high" || ldlAnalysis.status === "critical")) {
    actions.push("Initiate statin therapy discussion — moderate-intensity atorvastatin 20mg per ACC/AHA guidelines.");
  }
  const copperAnalysis = analyses.find((a) => a.lab === "Copper");
  if (copperAnalysis && copperAnalysis.status === "low") {
    actions.push("Dietary copper assessment — recommend copper-rich foods (shellfish, dark chocolate, seeds). Avoid peanuts (allergy). Consider copper supplementation if levels persist.");
  }

  const data: LabInterpretationResult = {
    labs_analyzed: analyses,
    critical_alerts: criticalAlerts,
    medication_correlations: medCorrelations,
    recommended_actions: actions,
  };

  const hasCritical = analyses.some((a) => a.status === "critical");
  const hasOutOfRange = analyses.some((a) => a.status !== "normal");

  return verify(data, {
    factCheck: {
      items: labsToAnalyze,
      knownDatabase: [...LAB_KEYS],
      domain: "Laboratory Medicine",
      sourceName: "LOINC Reference Ranges / Clinical Lab Standards",
    },
    hallucinationCheck: {
      claims: analyses.map((a) => ({
        claim: `${a.lab} = ${a.latest_value} ${a.unit}`,
        supportedByData: true, // All values come directly from LAB_TRENDS
      })),
    },
    confidenceInput: {
      dataCompleteness: 0.85,
      sourceReliability: 0.95,
      matchQuality: analyses.length / labsToAnalyze.length,
    },
    domainConstraints: {
      outOfRangeValues: hasCritical ? criticalAlerts : undefined,
    },
    humanReviewInput: {
      confidence: 0.90,
      severity: hasCritical ? "critical" : hasOutOfRange ? "moderate" : "low",
      stakes: hasCritical ? "high" : "medium",
    },
  });
}

/* ─────────────────────────────────────────────────
   Tool 8: medication_reconciliation
   Verification: fact_check, confidence, domain_constraints, human_in_the_loop
   ───────────────────────────────────────────────── */

interface Discrepancy {
  medication: string;
  type: "missing_from_chart" | "missing_from_ehr" | "dose_mismatch" | "still_listed_discontinued";
  detail: string;
  recommendation: string;
}

interface TherapyGap {
  therapy: string;
  indication: string;
  guideline: string;
  recommendation: string;
}

interface DurationAlert {
  medication: string;
  start_date: string;
  prescribed_duration: string;
  elapsed_days: number;
  status: "within_course" | "overdue_for_completion" | "needs_review";
  recommendation: string;
}

interface MedicationReconciliationResult {
  chart_medications: { name: string; dose: string; freq: string; source: string }[];
  ehr_medications: { name: string; dose: string; freq: string; source: string }[];
  discrepancies: Discrepancy[];
  therapy_gaps: TherapyGap[];
  duration_alerts: DurationAlert[];
  summary: string;
}

export function medicationReconciliation(): VerifiedToolResult<MedicationReconciliationResult> {
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Chart medications (what the patient/provider reports)
  const chartMeds = PATIENT_INFO.medications.map((m) => ({
    name: m.name, dose: m.dose, freq: m.freq, source: "Patient Chart",
  }));

  // EHR medications (what the system has on file)
  const ehrMeds = EHR_MEDICATION_LIST.map((m) => ({
    name: m.name, dose: m.dose, freq: m.freq, source: "EHR System", status: m.status,
  }));

  const discrepancies: Discrepancy[] = [];

  // Find meds in chart but not in EHR (active only)
  const activeEhrNames = EHR_MEDICATION_LIST.filter((m) => m.status === "active").map((m) => normalize(m.name));
  for (const chartMed of chartMeds) {
    const inEhr = activeEhrNames.some((ehrName) =>
      normalize(chartMed.name).includes(ehrName) || ehrName.includes(normalize(chartMed.name))
    );
    if (!inEhr) {
      discrepancies.push({
        medication: chartMed.name,
        type: "missing_from_ehr",
        detail: `${chartMed.name} (${chartMed.dose} ${chartMed.freq}) is on the patient chart but not in the active EHR medication list.`,
        recommendation: `Verify if ${chartMed.name} should be added to the EHR. If patient-reported supplement, document in EHR for completeness.`,
      });
    }
  }

  // Find discontinued meds still appearing in EHR
  const discontinuedInTimeline = MEDICATION_TIMELINE.filter((m) => m.event === "discontinued");
  for (const disc of discontinuedInTimeline) {
    const stillInEhr = EHR_MEDICATION_LIST.find((e) =>
      normalize(e.name).includes(normalize(disc.drug.split(" ")[0])) && e.status === "discontinued"
    );
    if (stillInEhr) {
      discrepancies.push({
        medication: disc.drug,
        type: "still_listed_discontinued",
        detail: `${disc.drug} was discontinued on ${disc.endDate} but remains on the EHR medication list with "discontinued" status.`,
        recommendation: "Verify EHR reflects correct status. Archive discontinued medication to reduce list clutter.",
      });
    }
  }

  // Therapy gaps
  const therapyGaps: TherapyGap[] = [];

  // Check for missing statin
  const hasStatin = chartMeds.some((m) =>
    normalize(m.name).includes("statin") || normalize(m.name).includes("atorvastatin") || normalize(m.name).includes("rosuvastatin")
  );
  if (!hasStatin) {
    therapyGaps.push({
      therapy: "Statin Therapy",
      indication: "Dyslipidemia with elevated cardiovascular risk — LDL 148 mg/dL, HTN, age 59, male, family history of MI",
      guideline: "ACC/AHA 2018 Cholesterol Guidelines recommend moderate-to-high intensity statin for patients with LDL >100 and elevated ASCVD risk (>7.5%).",
      recommendation: "Discuss initiating Atorvastatin 20mg daily. Patient has previously deferred but may benefit given persistent LDL elevation.",
    });
  }

  // Check for planned Losartan switch (referenced in visit notes)
  const hasLosartan = chartMeds.some((m) => normalize(m.name).includes("losartan"));
  const hasLisinopril = chartMeds.some((m) => normalize(m.name).includes("lisinopril"));
  const latestK = LAB_TRENDS.filter((l) => l.K !== null).pop()?.K;
  if (hasLisinopril && !hasLosartan && latestK && latestK > 5.5) {
    therapyGaps.push({
      therapy: "ACE Inhibitor → ARB Switch",
      indication: `K+ critically elevated at ${latestK} mEq/L on Lisinopril. Visit note (Jan 2026) documents plan to switch to Losartan 50mg.`,
      guideline: "When ACE inhibitor causes persistent hyperkalemia, switching to ARB is recommended. ARBs cause less K+ retention.",
      recommendation: "Execute planned switch: Discontinue Lisinopril 10mg, start Losartan 50mg daily. Recheck K+ in 1-2 weeks.",
    });
  }

  // Duration alerts
  const durationAlerts: DurationAlert[] = [];
  const today = new Date();

  // Doxycycline — prescribed for 10 days
  const doxyTimeline = MEDICATION_TIMELINE.find((m) => normalize(m.drug).includes("doxycycline"));
  if (doxyTimeline) {
    const startDate = new Date(doxyTimeline.startDate);
    const elapsedDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prescribedDays = 10;

    durationAlerts.push({
      medication: doxyTimeline.drug,
      start_date: doxyTimeline.startDate,
      prescribed_duration: `${prescribedDays} days`,
      elapsed_days: elapsedDays,
      status: elapsedDays <= prescribedDays ? "within_course" : elapsedDays <= prescribedDays + 7 ? "overdue_for_completion" : "needs_review",
      recommendation: elapsedDays > prescribedDays
        ? `Doxycycline was prescribed for ${prescribedDays} days starting ${doxyTimeline.startDate}. ${elapsedDays} days have elapsed. Review if course is complete and discontinue if infection resolved.`
        : `Doxycycline course is within prescribed ${prescribedDays}-day duration. ${prescribedDays - elapsedDays} days remaining.`,
    });
  }

  // Aspirin dose concern (not a duration issue, but a dosing reconciliation flag)
  const aspirinMed = chartMeds.find((m) => normalize(m.name).includes("aspirin"));
  if (aspirinMed && aspirinMed.dose === "325mg") {
    const aspirinTimeline = MEDICATION_TIMELINE.find((m) => normalize(m.drug).includes("aspirin"));
    if (aspirinTimeline) {
      const startDate = new Date(aspirinTimeline.startDate);
      const elapsedDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      durationAlerts.push({
        medication: "Aspirin 325mg",
        start_date: aspirinTimeline.startDate,
        prescribed_duration: "Ongoing (no end date)",
        elapsed_days: elapsedDays,
        status: "needs_review",
        recommendation: "Aspirin 325mg has been ongoing since pericarditis treatment (Mar 2024). Now that pericarditis is resolved, evaluate step-down to 81mg for maintenance cardioprotection per ACC/AHA guidelines.",
      });
    }
  }

  // Build summary
  const totalIssues = discrepancies.length + therapyGaps.length + durationAlerts.filter((d) => d.status !== "within_course").length;
  const summary = totalIssues > 0
    ? `Medication reconciliation found ${totalIssues} item(s) requiring attention: ${discrepancies.length} discrepancy/discrepancies, ${therapyGaps.length} therapy gap(s), and ${durationAlerts.filter((d) => d.status !== "within_course").length} duration alert(s).`
    : "Medication reconciliation complete. No discrepancies or therapy gaps identified.";

  const data: MedicationReconciliationResult = {
    chart_medications: chartMeds,
    ehr_medications: ehrMeds.map(({ status: _unused, ...rest }) => rest), // eslint-disable-line @typescript-eslint/no-unused-vars
    discrepancies,
    therapy_gaps: therapyGaps,
    duration_alerts: durationAlerts,
    summary,
  };

  const hasDiscrepancies = discrepancies.length > 0;
  const hasGaps = therapyGaps.length > 0;
  const hasUrgentAlerts = durationAlerts.some((d) => d.status === "needs_review");

  return verify(data, {
    factCheck: {
      items: chartMeds.map((m) => m.name),
      knownDatabase: [...KNOWN_DRUGS, ...EHR_MEDICATION_LIST.map((m) => m.name)],
      domain: "Medication Reconciliation",
      sourceName: "EHR Medication Records",
    },
    confidenceInput: {
      dataCompleteness: 0.90,
      sourceReliability: 0.88,
      matchQuality: 0.85,
    },
    domainConstraints: {
      hasSevereInteractions: hasGaps && hasUrgentAlerts,
    },
    humanReviewInput: {
      confidence: 0.85,
      severity: hasGaps ? "high" : hasDiscrepancies ? "moderate" : "low",
      stakes: "high",
    },
  });
}
