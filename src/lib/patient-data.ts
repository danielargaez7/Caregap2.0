/* ─── Shared data constants for MedAssist ─── */

export interface Appointment {
  id: string;
  date: string;
  time: string;
  patientName: string;
  patientId: string;
  type: string;
  provider: string;
}

export interface DemoResponse {
  type: string;
  severity?: string;
  title: string;
  content: unknown;
  recommendation: string;
  sources: string[];
}

export const DEMO_RESPONSES: Record<string, DemoResponse> = {
  interactions: {
    type: "alert",
    severity: "high",
    title: "Drug Interaction Alert",
    content: [
      { pair: "Aspirin + Warfarin (if added)", severity: "high", detail: "Both agents affect coagulation. Concurrent use increases bleeding risk significantly. Monitor INR closely.", source: "OpenFDA Drug Interaction API" },
      { pair: "Lisinopril + Potassium", severity: "low", detail: "ACE inhibitors can increase potassium levels. Patient labs show K+ 5.8 (HIGH). Recommend close monitoring.", source: "RxNorm / DailyMed" },
    ],
    recommendation: "Potassium is critically elevated at 5.8 mEq/L with concurrent ACE inhibitor use. Consider holding Lisinopril and rechecking K+ level.",
    sources: ["OpenFDA DrugInteraction API", "RxNorm REST API", "OpenEMR FHIR /MedicationRequest"],
  },
  labs: {
    type: "lab_summary",
    title: "Lab Results Summary",
    content: {
      flagged: [
        { test: "Potassium (K)", value: "5.8 mEq/L", interpretation: "Above normal range (3.5–5.0). Hyperkalemia risk — may be related to ACE inhibitor therapy. Requires follow-up.", trend: "up" },
        { test: "Copper (Cu)", value: "62 µg/dL", interpretation: "Below normal range (70–140). Mild copper deficiency. Consider dietary assessment or supplementation.", trend: "down" },
      ],
      normal: ["Calcium 9.4 (normal)", "Magnesium 2.1 (normal)", "Sodium 140 (normal)", "Chloride 101 (normal)"],
    },
    recommendation: "Potassium elevation is the primary concern given concurrent Lisinopril. Recommend repeat BMP and consider dose adjustment. Low copper is incidental — monitor.",
    sources: ["OpenEMR FHIR /Observation", "LOINC Reference Ranges", "Clinical Decision Support"],
  },
  meds: {
    type: "med_review",
    title: "Medication Review",
    content: {
      active: [
        { name: "Enteric Coated Aspirin", dose: "325mg", freq: "Daily", purpose: "Cardioprotective" },
        { name: "Tylenol Acetaminophen", dose: "500mg", freq: "PRN", purpose: "Pain management" },
        { name: "Lisinopril", dose: "10mg", freq: "Daily", purpose: "Hypertension" },
        { name: "Doxycycline", dose: "100mg", freq: "BID", purpose: "Ear abscess (infection)" },
      ],
      considerations: [
        "Aspirin 325mg: Higher dose — evaluate if 81mg low-dose would be more appropriate for maintenance cardioprotection.",
        "Lisinopril: BP 132/83 still above target. K+ elevated at 5.8 — reassess ACE inhibitor vs. ARB.",
        "Doxycycline: Appropriate for external ear abscess. Verify course duration (typically 7–14 days).",
        "Acetaminophen PRN: Safe at current dose. Ensure patient not exceeding 3g/day with OTC use.",
      ],
    },
    recommendation: "Key gap: No documented statin therapy. Given hypertension + age, ACC/AHA guidelines may recommend moderate-intensity statin. Discuss with patient.",
    sources: ["OpenEMR FHIR /MedicationRequest", "ACC/AHA 2024 Guidelines", "Clinical Pharmacology DB"],
  },
};

export const TIME_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30",
];

export const APPT_TYPES = ["Follow-up", "Lab Review", "General Checkup", "Consultation"];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: "a1", date: "2026-02-24", time: "09:00", patientName: "Jane Doe", patientId: "other", type: "General Checkup", provider: "Dr. Patel" },
  { id: "a2", date: "2026-02-24", time: "10:30", patientName: "Gord Sims", patientId: "gord-sims", type: "Follow-up", provider: "Dr. Patel" },
  { id: "a3", date: "2026-02-24", time: "14:00", patientName: "Bob Smith", patientId: "other", type: "Lab Review", provider: "Dr. Kim" },
  { id: "a4", date: "2026-02-25", time: "09:00", patientName: "Alice Johnson", patientId: "other", type: "Cardiology", provider: "Dr. Kim" },
  { id: "a5", date: "2026-02-25", time: "11:00", patientName: "Carlos Rivera", patientId: "other", type: "Follow-up", provider: "Dr. Patel" },
  { id: "a6", date: "2026-02-25", time: "14:30", patientName: "Maria Lopez", patientId: "other", type: "General Checkup", provider: "Dr. Patel" },
  { id: "a7", date: "2026-02-26", time: "09:30", patientName: "Gord Sims", patientId: "gord-sims", type: "Lab Review", provider: "Dr. Patel" },
  { id: "a8", date: "2026-02-26", time: "11:00", patientName: "Tom Baker", patientId: "other", type: "Consultation", provider: "Dr. Kim" },
  { id: "a9", date: "2026-02-26", time: "15:00", patientName: "Sarah Chen", patientId: "other", type: "Follow-up", provider: "Dr. Patel" },
  { id: "a10", date: "2026-02-27", time: "10:00", patientName: "David Kim", patientId: "other", type: "Lab Review", provider: "Dr. Kim" },
  { id: "a11", date: "2026-02-27", time: "13:30", patientName: "Nancy White", patientId: "other", type: "General Checkup", provider: "Dr. Patel" },
  { id: "a12", date: "2026-03-02", time: "09:00", patientName: "James Brown", patientId: "other", type: "Follow-up", provider: "Dr. Patel" },
  { id: "a13", date: "2026-03-02", time: "11:30", patientName: "Emily Davis", patientId: "other", type: "Consultation", provider: "Dr. Kim" },
  { id: "a14", date: "2026-03-03", time: "10:00", patientName: "Gord Sims", patientId: "gord-sims", type: "Cardiology", provider: "Dr. Kim" },
  { id: "a15", date: "2026-03-04", time: "14:00", patientName: "Lisa Park", patientId: "other", type: "Follow-up", provider: "Dr. Patel" },
  { id: "a16", date: "2026-03-05", time: "09:30", patientName: "Mike Taylor", patientId: "other", type: "General Checkup", provider: "Dr. Kim" },
];

export const VISIT_NOTES = [
  {
    id: "vn-01", date: "2024-02-08", type: "Initial Consultation", provider: "Dr. Patel",
    chief: "New patient intake — elevated blood pressure readings at pharmacy screening",
    summary: "Patient presents for initial evaluation after pharmacy screening showed BP 152/94. Reports occasional headaches, especially in the afternoon. No prior diagnosis of hypertension. Family history: father had HTN and MI at 62. Lifestyle assessment: sedentary desk job, moderate alcohol intake (2-3 beers/week), former smoker (quit 2019). BMI 29.2. Started on lifestyle modifications — low sodium diet, 30 min walking daily. Ordered baseline labs including CMP, lipid panel, CBC.",
    tags: ["Lab Order", "Blood Work"],
    actions: ["Ordered CMP + lipid panel + CBC", "Dietary counseling — low sodium", "Exercise prescription: 30 min walking/day", "Follow-up in 4 weeks with BP log"],
  },
  {
    id: "vn-02", date: "2024-03-12", type: "Follow-up", provider: "Dr. Patel",
    chief: "BP log review — consistently 145–155/88–94 over 4 weeks",
    summary: "Patient returns with home BP log showing persistent elevation. Average reading 148/91. Labs from last visit: LDL 158 (high), HDL 42 (low), TG 172, fasting glucose 102 (borderline). CMP otherwise normal — K+ 4.6, creatinine 0.9. Started Lisinopril 10mg daily for hypertension. Discussed statin therapy for dyslipidemia — patient prefers to try diet first. Also started low-dose aspirin 325mg daily given cardiovascular risk factors. Allergies confirmed: Peanuts, Gluten, Penicillin.",
    tags: ["Prescription", "Lab Review"],
    actions: ["Rx: Lisinopril 10mg daily", "Rx: Aspirin 325mg daily", "Statin discussion deferred — patient prefers diet trial", "Recheck BP + labs in 8 weeks"],
  },
  {
    id: "vn-03", date: "2024-05-14", type: "Lab Follow-up", provider: "Dr. Patel",
    chief: "8-week recheck — BP response to Lisinopril",
    summary: "BP today 138/86, improved from 148/91 baseline. Patient tolerating Lisinopril well, no cough or dizziness. Labs: K+ 4.8, creatinine 0.9 (stable). LDL still 148 despite dietary changes. Patient now agreeable to discussing statin but wants to wait one more quarter. Weight stable at 195 lbs. Urged continued lifestyle modifications. Will recheck in 3 months.",
    tags: ["Lab Work", "Blood Work"],
    actions: ["BP improved — continue Lisinopril 10mg", "K+ 4.8 — monitor on ACE inhibitor", "LDL 148 — statin discussion next visit", "Continue aspirin 325mg"],
  },
  {
    id: "vn-04", date: "2024-08-06", type: "Urgent Visit", provider: "Dr. Patel",
    chief: "Chest pain — sharp, worse with deep breathing, 2 days",
    summary: "Patient presents with 2-day history of sharp anterior chest pain, worse with inspiration and when lying flat. No radiation to arm/jaw. Relieved by leaning forward. VS: BP 144/90, HR 92, Temp 100.1°F, SpO2 97%. ECG shows diffuse ST elevation with PR depression — classic pericarditis pattern. Troponin negative. CRP markedly elevated at 48 mg/L. Diagnosed with acute pericarditis, likely viral etiology. Cannot use NSAIDs as first-line due to existing aspirin use — will optimize aspirin dose. Added colchicine 0.5mg BID. Urgent cardiology referral to Dr. Kim for echocardiogram.",
    tags: ["Fever", "ECG", "Prescription", "Referral"],
    actions: ["ECG — diffuse ST elevation, PR depression", "Troponin negative", "CRP 48 mg/L (elevated)", "Rx: Colchicine 0.5mg BID", "Continue Aspirin 325mg (anti-inflammatory dose)", "Urgent cardiology referral to Dr. Kim"],
  },
  {
    id: "vn-05", date: "2024-08-20", type: "Cardiology Consult", provider: "Dr. Kim",
    chief: "Pericarditis evaluation — echocardiogram",
    summary: "Cardiology evaluation for acute pericarditis. Echocardiogram performed: EF 60%, no pericardial effusion, normal wall motion, no valvular abnormalities. Patient reports chest pain has improved significantly since starting colchicine. Still mild discomfort with deep breathing. CRP down to 18 from 48. Continue colchicine for 3 months minimum. Follow-up echo in 6 weeks if symptoms recur. Cleared for gradual return to exercise once pain-free for 1 week.",
    tags: ["Echo", "Lab Review"],
    actions: ["Echo: EF 60%, no effusion", "CRP 18 (improving from 48)", "Continue colchicine 0.5mg BID x 3 months", "Gradual return to exercise when pain-free", "Follow-up echo if symptoms recur"],
  },
  {
    id: "vn-06", date: "2024-11-05", type: "Follow-up", provider: "Dr. Patel",
    chief: "Pericarditis 3-month follow-up — completing colchicine course",
    summary: "Patient reports complete resolution of chest pain. No recurrence of symptoms. BP 136/84 on Lisinopril. Labs: CRP normalized at 3.2, K+ 5.0 (upper normal on ACE inhibitor), creatinine 1.0. Pericarditis considered resolved. Discontinuing colchicine after 3-month course. Will continue monitoring CRP at next visit. Flu vaccine administered. Weight stable at 196 lbs.",
    tags: ["Lab Review", "Vaccination"],
    actions: ["Pericarditis resolved — discontinue colchicine", "CRP normalized at 3.2", "K+ 5.0 — monitor (upper normal on ACE inhibitor)", "Flu vaccine given", "Continue Lisinopril 10mg + Aspirin 325mg"],
  },
  {
    id: "vn-07", date: "2025-01-15", type: "Routine Follow-up", provider: "Dr. Patel",
    chief: "Quarterly HTN management — BP still above target",
    summary: "BP today 140/88. Not at goal of <130/80. Patient admits inconsistent with low-sodium diet over holidays. K+ 5.1 — creeping up, need to watch closely on ACE inhibitor. Creatinine stable at 1.0. Discussed increasing Lisinopril dose vs. adding second agent. Patient prefers to try dietary compliance first. Set strict 3-month deadline — if BP not at goal, will escalate therapy. Ordered repeat labs for next visit. Still no statin — LDL likely still elevated.",
    tags: ["Blood Work", "Lab Order"],
    actions: ["BP 140/88 — above target", "K+ 5.1 — trending up, monitor", "Dietary compliance counseling — sodium restriction", "3-month deadline for BP control", "Labs ordered for next visit"],
  },
  {
    id: "vn-08", date: "2025-03-10", type: "Urgent Visit", provider: "Dr. Patel",
    chief: "Severe abdominal pain — cramping, lower abdomen, 3 days",
    summary: "Patient presents with 3-day history of cramping abdominal pain, predominantly left lower quadrant. Associated with intermittent nausea. No vomiting, no diarrhea, no fever. Abdomen mildly tender in LLQ, no guarding or rebound. Bowel sounds present. Labs: CBC normal, lipase normal. Gluten exposure 5 days ago (accidental — restaurant error) may be contributing given gluten sensitivity. Recommended clear liquid diet for 24 hours then gradual reintroduction. If worsening or fever develops, return for CT scan. Prescribed Tylenol 500mg PRN for pain (avoiding NSAIDs).",
    tags: ["Prescription", "Lab Work"],
    actions: ["Abdominal exam — LLQ tenderness, no peritoneal signs", "CBC + lipase — normal", "Rx: Tylenol 500mg PRN", "Clear liquid diet x 24 hrs", "Return if worsening — CT scan if needed", "Gluten avoidance counseling"],
  },
  {
    id: "vn-09", date: "2025-04-22", type: "GI Follow-up", provider: "Dr. Patel",
    chief: "Persistent intermittent abdominal pain — CT abdomen ordered",
    summary: "Patient reports abdominal pain improved but still has intermittent episodes, 2-3 times per week, mostly after meals. No weight loss, no bloody stool. Given persistent symptoms, ordered abdominal CT with contrast to rule out structural pathology. Also ordered celiac panel given known gluten sensitivity — may be undiagnosed celiac disease. BP today 142/86. K+ 5.2 — continuing to trend up. Discussed timeline for BP medication change if potassium continues rising.",
    tags: ["Imaging", "Lab Order", "Blood Work"],
    actions: ["Abdominal CT with contrast ordered", "Celiac panel ordered", "K+ 5.2 — trending up, reassess ACE inhibitor", "BP 142/86 — still not at goal", "Follow-up with CT results in 2 weeks"],
  },
  {
    id: "vn-10", date: "2025-05-08", type: "Results Review", provider: "Dr. Patel",
    chief: "CT abdomen results — small bowel unremarkable",
    summary: "Abdominal CT reviewed: small bowel pattern unremarkable, no masses, no obstruction, no lymphadenopathy. Mild colonic diverticulosis noted (age-appropriate). Celiac panel: tTG-IgA mildly elevated at 22 (normal <15), suggesting possible celiac disease. Recommended strict gluten-free diet trial and GI referral for possible endoscopy/biopsy. Patient acknowledges difficulty avoiding gluten. Provided resources for gluten-free eating. Abdominal pain likely related to gluten sensitivity/possible celiac.",
    tags: ["Imaging", "Lab Review", "Referral"],
    actions: ["CT: unremarkable, mild diverticulosis", "Celiac panel: tTG-IgA 22 (mildly elevated)", "GI referral for possible endoscopy", "Strict gluten-free diet recommended", "Dietary resources provided"],
  },
  {
    id: "vn-11", date: "2025-06-18", type: "Lab Follow-up", provider: "Dr. Patel",
    chief: "Quarterly labs — potassium trending higher on ACE inhibitor",
    summary: "Labs reviewed: K+ 5.4 (was 5.2 in April, 5.1 in Jan, 5.0 in Nov). Concerning upward trend on Lisinopril. Creatinine 1.0 (stable). Copper 62 µg/dL — incidentally found to be low (range 70-140). May be related to dietary restrictions from gluten avoidance. Recommended copper-rich foods (shellfish, nuts — avoiding peanuts, dark chocolate). BP 138/86. Abdominal pain has improved significantly on gluten-free diet. GI referral pending — patient on waitlist.",
    tags: ["Blood Work", "Lab Review"],
    actions: ["K+ 5.4 — ACE inhibitor contributing, reassess at next visit", "Copper 62 — low, dietary supplementation advised", "Creatinine 1.0 — stable", "BP 138/86 — still above target", "Abdominal pain improving on GF diet"],
  },
  {
    id: "vn-12", date: "2025-08-13", type: "Imaging Visit", provider: "Dr. Patel",
    chief: "Chest X-ray — routine screening given smoking history",
    summary: "Routine chest X-ray ordered given former smoker history (quit 2019, ~15 pack-year history). Results: bilateral findings consistent with early emphysematous changes, predominantly upper lobes. No masses, no infiltrates, no pleural effusion. Heart size normal. Discussed findings with patient — early emphysema likely related to prior smoking. Recommended pulmonary function testing (PFTs) to establish baseline. Encouraged continued smoking cessation. No active treatment needed at this time.",
    tags: ["X-Ray", "Imaging", "Screening"],
    actions: ["Chest X-ray: early emphysema, bilateral upper lobes", "No masses or infiltrates", "PFT referral ordered", "Smoking cessation reinforced", "Follow-up imaging in 12 months"],
  },
  {
    id: "vn-13", date: "2025-09-24", type: "Follow-up", provider: "Dr. Patel",
    chief: "PFT results review and comprehensive management check",
    summary: "PFT results: FEV1 78% predicted, FVC 85% predicted, FEV1/FVC 92%. Mild obstructive pattern consistent with early COPD/emphysema. No bronchodilator response. Patient asymptomatic — no dyspnea, no chronic cough. No treatment needed now but will monitor annually. BP today 134/84 — best in months, patient reports strict low-sodium compliance. K+ 5.5 — still trending up. Need to seriously consider switching from Lisinopril to ARB (losartan) to potentially reduce hyperkalemia risk. Discussed with patient — agreed to switch at next visit if K+ remains elevated.",
    tags: ["Lab Review", "Screening"],
    actions: ["PFTs: FEV1 78%, FVC 85%, FEV1/FVC 92% — mild obstruction", "Early COPD — no treatment needed, annual monitoring", "BP 134/84 — improving", "K+ 5.5 — plan to switch ACE to ARB next visit", "Continue aspirin + Tylenol PRN"],
  },
  {
    id: "vn-14", date: "2025-12-03", type: "Acute Visit", provider: "Dr. Patel",
    chief: "Right ear pain, swelling, drainage for 5 days",
    summary: "Patient presents with 5-day history of right ear pain with swelling of external ear canal. Purulent drainage noted. Temp 99.4°F. Otoscopic exam: external auditory canal erythematous and edematous with visible abscess formation. TM obscured by swelling. No hearing loss reported. Diagnosed with abscess of external auditory canal. Cannot use penicillin-class antibiotics (allergy). Started Doxycycline 100mg BID for 10 days. Warm compresses. If no improvement in 72 hours, may need I&D. Also noted: nausea reported intermittently over past 2 weeks — possibly related to stress/dietary triggers. Will address at follow-up.",
    tags: ["Fever", "Prescription"],
    actions: ["Otoscopic exam — abscess of external auditory canal", "Rx: Doxycycline 100mg BID x 10 days", "Warm compresses to affected ear", "Return in 72 hrs if no improvement for possible I&D", "Nausea noted — address at follow-up"],
  },
  {
    id: "vn-15", date: "2026-01-14", type: "Follow-up", provider: "Dr. Patel",
    chief: "Ear abscess follow-up — labs show K+ 5.8, nausea persisting",
    summary: "Ear abscess improving on Doxycycline — swelling reduced, drainage minimal, pain much better. Will complete 10-day course. Nausea has been intermittent for past month — 2-3 episodes per week, not related to meals. No vomiting until this week (1 episode). BP 132/83. Labs drawn today: K+ 5.8 — critically elevated, highest recorded. Creatinine 1.0 (stable so kidneys OK). This confirms need to switch off Lisinopril. Discussed with patient — will transition to Losartan 50mg daily at next visit once ear infection fully resolved. Copper still low at 62. Nausea workup: ordered H. pylori breath test and upper GI series if persists. Added problem list: nausea with vomiting.",
    tags: ["Prescription", "Lab Review", "Blood Work"],
    actions: ["Ear abscess improving — complete Doxycycline course", "K+ 5.8 — critically elevated, plan ACE→ARB switch", "Losartan 50mg to replace Lisinopril (at next visit)", "Nausea workup: H. pylori breath test ordered", "Copper 62 — continue monitoring", "Problem list updated: nausea with vomiting", "Follow-up in 3 weeks"],
  },
];

export const TAG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Prescription":  { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  "Lab Order":     { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "Lab Work":      { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "Lab Review":    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "Blood Work":    { bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
  "X-Ray":         { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" },
  "Imaging":       { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" },
  "Fever":         { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  "Referral":      { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "ECG":           { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  "Echo":          { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  "Vaccination":   { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  "Screening":     { bg: "#f0fdfa", color: "#0d9488", border: "#99f6e4" },
};

export const getTagStyle = (tag: string) => TAG_COLORS[tag] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

export const STAFF = {
  doctors: [
    { name: "Dr. Raj Patel", title: "Primary Care Physician", specialty: "Internal Medicine", bio: "Board-certified internist with 18 years of experience in primary care and chronic disease management. Special interest in diabetes, hypertension, and preventive medicine. Completed residency at Johns Hopkins." },
    { name: "Dr. Susan Kim", title: "Cardiologist", specialty: "Cardiology", bio: "Fellowship-trained cardiologist specializing in arrhythmia management and echocardiography. 12 years in practice. Passionate about patient education and heart disease prevention." },
    { name: "Dr. Michael Torres", title: "Pulmonologist", specialty: "Pulmonology", bio: "Specializes in COPD, asthma, and interstitial lung disease. 10 years of experience. Active in clinical research on early emphysema detection and smoking cessation programs." },
  ],
  nurses: [
    { name: "Jessica Hernandez", title: "Charge Nurse, RN", specialty: "Primary Care", bio: "Lead nurse with 14 years of experience in outpatient clinical settings. Coordinates patient triage, medication management, and care plan follow-ups." },
    { name: "David Okonkwo", title: "Registered Nurse, RN", specialty: "Cardiology", bio: "Cardiac-certified nurse specializing in anticoagulation monitoring and post-procedure care. 9 years of experience in cardiology clinics." },
    { name: "Emily Tran", title: "Registered Nurse, RN", specialty: "Chronic Care", bio: "Focused on diabetes education and chronic disease management. Certified Diabetes Educator (CDE). Helps patients with glucose monitoring and lifestyle coaching." },
    { name: "Marcus Johnson", title: "Registered Nurse, RN", specialty: "Urgent Care", bio: "Experienced in acute care triage and wound management. 11 years in emergency and urgent care settings. Calm under pressure." },
    { name: "Priya Sharma", title: "Licensed Practical Nurse", specialty: "Lab & Vitals", bio: "Skilled in phlebotomy, vital signs, and point-of-care testing. 6 years of experience. Patients appreciate her gentle technique and warm demeanor." },
    { name: "Rachel Nguyen", title: "Registered Nurse, RN", specialty: "Pulmonology", bio: "Specializes in pulmonary function testing and respiratory care. 7 years of experience. Certified in spirometry and patient breathing education." },
  ],
  receptionists: [
    { name: "Sarah Mitchell", title: "Front Desk Manager", specialty: "Operations", bio: "Manages patient scheduling, insurance verification, and front office operations. 10 years in healthcare administration. Keeps the clinic running smoothly." },
    { name: "Carlos Vega", title: "Patient Coordinator", specialty: "Scheduling", bio: "Handles appointment booking, referral coordination, and patient communications. Known for his friendly phone manner and attention to detail. 5 years with the clinic." },
    { name: "Amanda Foster", title: "Medical Receptionist", specialty: "Records & Intake", bio: "Manages patient check-in, medical records requests, and new patient intake paperwork. 4 years of experience. Always greets patients with a smile." },
  ],
};

export const PATIENT_INFO = {
  personal: {
    "Full Legal Name": "Gord Allen Sims",
    "Date of Birth": "January 25, 1967",
    "Age": "59 years old",
    "Sex": "Male",
    "Gender": "Male",
    "Marital Status": "Married",
    "Preferred Language": "English",
    "Phone": "(843) 831-5476",
    "Email": "gord.sims@email.com",
    "Address": "3517 Camden Place, New York, NY 10001",
    "Emergency Contact": "Linda Sims (Wife) — (843) 831-5480",
  },
  insurance: {
    "Insurance Provider": "Aetna",
    "Member ID": "32523523023",
    "Group Number": "GRP-88421",
    "Policyholder": "Self (Gord A. Sims)",
    "Policyholder DOB": "01/25/1967",
    "Secondary Insurance": "None",
    "Guarantor": "Self",
    "Consent for Billing": "Yes — signed 02/08/2024",
  },
  medicalHistory: {
    pastDiagnoses: [
      { condition: "Pericarditis", status: "Resolved", year: "2024" },
      { condition: "Urinary Tract Infection", status: "Resolved", year: "2025" },
      { condition: "Possible Celiac Disease", status: "Under investigation", year: "2025" },
    ],
    surgeries: [{ procedure: "Appendectomy", year: "2003", notes: "Uncomplicated" }],
    hospitalizations: [{ reason: "Acute Pericarditis — overnight observation", date: "Aug 2024", facility: "Northwest Valley Medical" }],
    chronic: ["Hypertension (diagnosed Feb 2024)", "Early COPD / Emphysema (identified Aug 2025)", "Abdominal pain — gluten-related (ongoing)"],
    familyHistory: [
      { relation: "Father", conditions: "Hypertension, Myocardial Infarction at age 62" },
      { relation: "Mother", conditions: "Type 2 Diabetes" },
      { relation: "Brother", conditions: "Healthy, no known conditions" },
    ],
  },
  medications: [
    { name: "Enteric Coated Aspirin", dose: "325mg", freq: "Daily", purpose: "Cardioprotective", type: "Rx" },
    { name: "Lisinopril", dose: "10mg", freq: "Daily", purpose: "Hypertension", type: "Rx" },
    { name: "Doxycycline", dose: "100mg", freq: "BID", purpose: "Ear abscess (infection)", type: "Rx" },
    { name: "Tylenol (Acetaminophen)", dose: "500mg", freq: "PRN", purpose: "Pain management", type: "OTC" },
    { name: "Vitamin D3", dose: "2,000 IU", freq: "Daily", purpose: "Supplement", type: "Supplement" },
    { name: "Fish Oil (Omega-3)", dose: "1,200mg", freq: "Daily", purpose: "Cardiovascular support", type: "Supplement" },
  ],
  allergies: [
    { allergen: "Peanuts", type: "Food", reaction: "Anaphylaxis", severity: "Severe" },
    { allergen: "Gluten", type: "Food", reaction: "GI distress, bloating", severity: "Moderate" },
    { allergen: "Penicillin", type: "Drug", reaction: "Rash, hives", severity: "Moderate" },
  ],
  social: {
    "Smoking / Tobacco": "Former smoker — quit 2019 (~15 pack-year history)",
    "Alcohol Use": "Moderate — 2-3 beers per week",
    "Recreational Drugs": "None",
    "Occupation": "Office Administrator",
    "Exercise": "Walking 20-30 minutes most days",
  },
  mentalHealth: {
    phq9: { score: 4, label: "Minimal depression", date: "01/14/2026" },
    gad7: { score: 3, label: "Minimal anxiety", date: "01/14/2026" },
    sleep: "6-7 hours per night, occasional insomnia",
    stress: "Moderate — primarily work-related",
  },
  reasonForVisit: {
    "Chief Complaint": "Follow-up HTN management, ear abscess treatment",
    "Duration": "Ongoing — hypertension since Feb 2024",
    "Pain Scale": "2/10 — mild right ear discomfort",
    "Associated Symptoms": "Intermittent nausea (2-3x/week), occasional headaches",
  },
  consent: [
    { form: "Consent to Treat", status: "Signed", date: "02/08/2024" },
    { form: "HIPAA Privacy Acknowledgment", status: "Signed", date: "02/08/2024" },
    { form: "Financial Responsibility Agreement", status: "Signed", date: "02/08/2024" },
    { form: "Telehealth Consent", status: "Signed", date: "03/12/2024" },
    { form: "Release of Information", status: "On file", date: "02/08/2024" },
  ],
  payment: {
    "Copay": "$25.00",
    "Card on File": "Visa ending in 4821",
    "Billing Preference": "Insurance primary, card on file for copay",
  },
};

export const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export const DEMO_PATIENTS = [
  { id: "gord-sims", name: "Gord Sims", dob: "01/25/1967", sex: "M", age: 59, initials: "GS", color: "#4f46e5", insurance: "Aetna", concerns: 4 },
  { id: "jane-doe", name: "Jane Doe", dob: "03/14/1985", sex: "F", age: 40, initials: "JD", color: "#0891b2", insurance: "BCBS", concerns: 1 },
  { id: "bob-smith", name: "Bob Smith", dob: "11/02/1952", sex: "M", age: 73, initials: "BS", color: "#16a34a", insurance: "Medicare", concerns: 2 },
  { id: "maria-lopez", name: "Maria Lopez", dob: "07/29/1990", sex: "F", age: 35, initials: "ML", color: "#dc2626", insurance: "UHC", concerns: 0 },
];

/* ─── Clinical Tools Data ─── */

export const COMMON_MEDICATIONS = [
  { name: "Amoxicillin", category: "Antibiotic", class: "Penicillin" },
  { name: "Azithromycin", category: "Antibiotic", class: "Macrolide" },
  { name: "Ciprofloxacin", category: "Antibiotic", class: "Fluoroquinolone" },
  { name: "Doxycycline", category: "Antibiotic", class: "Tetracycline" },
  { name: "Penicillin V", category: "Antibiotic", class: "Penicillin" },
  { name: "Cephalexin", category: "Antibiotic", class: "Cephalosporin" },
  { name: "Lisinopril", category: "Antihypertensive", class: "ACE Inhibitor" },
  { name: "Losartan", category: "Antihypertensive", class: "ARB" },
  { name: "Amlodipine", category: "Antihypertensive", class: "CCB" },
  { name: "Metoprolol", category: "Antihypertensive", class: "Beta Blocker" },
  { name: "Atorvastatin", category: "Statin", class: "HMG-CoA Reductase Inhibitor" },
  { name: "Rosuvastatin", category: "Statin", class: "HMG-CoA Reductase Inhibitor" },
  { name: "Metformin", category: "Antidiabetic", class: "Biguanide" },
  { name: "Omeprazole", category: "GI", class: "PPI" },
  { name: "Prednisone", category: "Corticosteroid", class: "Glucocorticoid" },
  { name: "Ibuprofen", category: "NSAID", class: "NSAID" },
  { name: "Acetaminophen", category: "Analgesic", class: "Non-Opioid" },
  { name: "Hydrocodone/APAP", category: "Analgesic", class: "Opioid" },
  { name: "Gabapentin", category: "Anticonvulsant", class: "GABA Analog" },
  { name: "Sertraline", category: "Antidepressant", class: "SSRI" },
];

export const RX_FREQUENCIES = [
  { value: "QD", label: "Once daily (QD)" },
  { value: "BID", label: "Twice daily (BID)" },
  { value: "TID", label: "Three times daily (TID)" },
  { value: "QID", label: "Four times daily (QID)" },
  { value: "PRN", label: "As needed (PRN)" },
  { value: "QHS", label: "At bedtime (QHS)" },
  { value: "Q4H", label: "Every 4 hours (Q4H)" },
  { value: "Q6H", label: "Every 6 hours (Q6H)" },
  { value: "Q8H", label: "Every 8 hours (Q8H)" },
  { value: "Q12H", label: "Every 12 hours (Q12H)" },
  { value: "QOD", label: "Every other day (QOD)" },
  { value: "Weekly", label: "Once weekly" },
];

export const RX_ROUTES = [
  { value: "PO", label: "By mouth (PO)" },
  { value: "IV", label: "Intravenous (IV)" },
  { value: "IM", label: "Intramuscular (IM)" },
  { value: "SC", label: "Subcutaneous (SC)" },
  { value: "SL", label: "Sublingual (SL)" },
  { value: "Topical", label: "Topical" },
  { value: "Rectal", label: "Rectal (PR)" },
  { value: "Inhaled", label: "Inhaled" },
  { value: "Ophthalmic", label: "Ophthalmic" },
  { value: "Otic", label: "Otic (ear)" },
];

export const COMMON_DOSES: Record<string, string[]> = {
  Amoxicillin: ["250mg", "500mg", "875mg"],
  Azithromycin: ["250mg", "500mg"],
  Ciprofloxacin: ["250mg", "500mg", "750mg"],
  Doxycycline: ["50mg", "100mg"],
  "Penicillin V": ["250mg", "500mg"],
  Cephalexin: ["250mg", "500mg"],
  Lisinopril: ["5mg", "10mg", "20mg", "40mg"],
  Losartan: ["25mg", "50mg", "100mg"],
  Amlodipine: ["2.5mg", "5mg", "10mg"],
  Metoprolol: ["25mg", "50mg", "100mg", "200mg"],
  Atorvastatin: ["10mg", "20mg", "40mg", "80mg"],
  Rosuvastatin: ["5mg", "10mg", "20mg", "40mg"],
  Metformin: ["500mg", "850mg", "1000mg"],
  Omeprazole: ["20mg", "40mg"],
  Prednisone: ["5mg", "10mg", "20mg", "40mg", "60mg"],
  Ibuprofen: ["200mg", "400mg", "600mg", "800mg"],
  Acetaminophen: ["325mg", "500mg", "650mg", "1000mg"],
  "Hydrocodone/APAP": ["5/325mg", "7.5/325mg", "10/325mg"],
  Gabapentin: ["100mg", "300mg", "400mg", "600mg", "800mg"],
  Sertraline: ["25mg", "50mg", "100mg", "150mg", "200mg"],
};

export const PENICILLIN_CLASS_DRUGS = [
  "Amoxicillin", "Penicillin V", "Ampicillin", "Augmentin",
  "Piperacillin", "Nafcillin", "Dicloxacillin",
];

export interface PrescriptionItem {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
  addedAt: number;
}

/* ═══════════════════════════════════════════════════
   TIME-SERIES DATA FOR CLINICAL VISUALIZATION TOOLS
   ═══════════════════════════════════════════════════ */

export interface LabTrendPoint {
  date: string;
  label: string;
  K: number | null;
  LDL: number | null;
  HDL: number | null;
  CRP: number | null;
  Creatinine: number | null;
  Copper: number | null;
}

export interface BPReading {
  date: string;
  label: string;
  systolic: number;
  diastolic: number;
}

export interface VitalTrendPoint {
  date: string;
  label: string;
  hr: number | null;
  weight: number | null;
  temp: number | null;
  spo2: number | null;
}

export interface MedicationEvent {
  drug: string;
  startDate: string;
  endDate: string | null;
  dose: string;
  event: "started" | "discontinued" | "ongoing";
}

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

export interface BodySystemScore {
  system: string;
  score: number;
  keyMetrics: { label: string; value: string; status: "normal" | "warning" | "critical" }[];
  rationale: string;
}

export const LAB_TRENDS: LabTrendPoint[] = [
  { date: "2024-02-08", label: "Feb 2024", K: null, LDL: null, HDL: null, CRP: null, Creatinine: null, Copper: null },
  { date: "2024-03-12", label: "Mar 2024", K: 4.6, LDL: 158, HDL: 42, CRP: null, Creatinine: 0.9, Copper: null },
  { date: "2024-05-14", label: "May 2024", K: 4.8, LDL: 148, HDL: null, CRP: null, Creatinine: 0.9, Copper: null },
  { date: "2024-08-06", label: "Aug 2024", K: null, LDL: null, HDL: null, CRP: 48, Creatinine: null, Copper: null },
  { date: "2024-08-20", label: "Aug '24b", K: null, LDL: null, HDL: null, CRP: 18, Creatinine: null, Copper: null },
  { date: "2024-11-05", label: "Nov 2024", K: 5.0, LDL: null, HDL: null, CRP: 3.2, Creatinine: 1.0, Copper: null },
  { date: "2025-01-15", label: "Jan 2025", K: 5.1, LDL: null, HDL: null, CRP: null, Creatinine: 1.0, Copper: null },
  { date: "2025-06-18", label: "Jun 2025", K: 5.4, LDL: null, HDL: null, CRP: null, Creatinine: 1.0, Copper: 62 },
  { date: "2026-01-14", label: "Jan 2026", K: 5.8, LDL: null, HDL: null, CRP: null, Creatinine: 1.0, Copper: 62 },
];

export const BP_READINGS: BPReading[] = [
  { date: "2024-02-08", label: "Feb 2024", systolic: 152, diastolic: 94 },
  { date: "2024-03-12", label: "Mar 2024", systolic: 148, diastolic: 90 },
  { date: "2024-05-14", label: "May 2024", systolic: 138, diastolic: 86 },
  { date: "2024-08-06", label: "Aug 2024", systolic: 144, diastolic: 90 },
  { date: "2024-11-05", label: "Nov 2024", systolic: 136, diastolic: 84 },
  { date: "2025-01-15", label: "Jan 2025", systolic: 140, diastolic: 88 },
  { date: "2025-06-18", label: "Jun 2025", systolic: 138, diastolic: 86 },
  { date: "2025-09-24", label: "Sep 2025", systolic: 134, diastolic: 84 },
  { date: "2026-01-14", label: "Jan 2026", systolic: 132, diastolic: 83 },
];

export const VITAL_TRENDS: VitalTrendPoint[] = [
  { date: "2024-02-08", label: "Feb 2024", hr: 78, weight: 194, temp: 98.6, spo2: 97 },
  { date: "2024-03-12", label: "Mar 2024", hr: 76, weight: 195, temp: 98.4, spo2: 98 },
  { date: "2024-08-06", label: "Aug 2024", hr: 92, weight: 193, temp: 100.1, spo2: 97 },
  { date: "2024-11-05", label: "Nov 2024", hr: 74, weight: 196, temp: 98.2, spo2: 98 },
  { date: "2025-01-15", label: "Jan 2025", hr: 80, weight: 195, temp: 98.4, spo2: 97 },
  { date: "2025-06-18", label: "Jun 2025", hr: 76, weight: 194, temp: 98.6, spo2: 98 },
  { date: "2025-12-03", label: "Dec 2025", hr: 82, weight: 195, temp: 99.4, spo2: 97 },
  { date: "2026-01-14", label: "Jan 2026", hr: 78, weight: 195, temp: 98.6, spo2: 97 },
];

export const MEDICATION_TIMELINE: MedicationEvent[] = [
  { drug: "Lisinopril 10mg", startDate: "2024-03-12", endDate: null, dose: "10mg Daily", event: "ongoing" },
  { drug: "Aspirin 325mg", startDate: "2024-03-12", endDate: null, dose: "325mg Daily", event: "ongoing" },
  { drug: "Colchicine 0.5mg", startDate: "2024-08-06", endDate: "2024-11-05", dose: "0.5mg BID", event: "discontinued" },
  { drug: "Tylenol 500mg", startDate: "2025-03-10", endDate: null, dose: "500mg PRN", event: "ongoing" },
  { drug: "Doxycycline 100mg", startDate: "2025-12-03", endDate: null, dose: "100mg BID", event: "ongoing" },
];

export const REFERENCE_RANGES: Record<string, ReferenceRange> = {
  K:          { min: 3.5, max: 5.0, unit: "mEq/L", label: "Potassium" },
  LDL:       { min: 0, max: 100, unit: "mg/dL", label: "LDL Cholesterol" },
  HDL:       { min: 40, max: 200, unit: "mg/dL", label: "HDL Cholesterol" },
  CRP:       { min: 0, max: 3.0, unit: "mg/L", label: "C-Reactive Protein" },
  Creatinine:{ min: 0.6, max: 1.2, unit: "mg/dL", label: "Creatinine" },
  Copper:    { min: 70, max: 140, unit: "ug/dL", label: "Copper" },
};

export const computeBodySystemScores = (): BodySystemScore[] => [
  {
    system: "Cardiovascular",
    score: 45,
    keyMetrics: [
      { label: "Blood Pressure", value: "132/83 mmHg", status: "warning" },
      { label: "Potassium", value: "5.8 mEq/L", status: "critical" },
      { label: "ASCVD Risk", value: "~14% (Intermediate)", status: "warning" },
    ],
    rationale: "Persistent hypertension above target, critically elevated K+ on ACE inhibitor, intermediate ASCVD risk with no statin.",
  },
  {
    system: "Renal",
    score: 75,
    keyMetrics: [
      { label: "Creatinine", value: "1.0 mg/dL", status: "normal" },
      { label: "eGFR", value: ">60 (estimated)", status: "normal" },
    ],
    rationale: "Renal function currently stable. Monitor closely given ACE inhibitor and elevated K+.",
  },
  {
    system: "Metabolic",
    score: 55,
    keyMetrics: [
      { label: "LDL", value: "148 mg/dL", status: "critical" },
      { label: "HDL", value: "42 mg/dL", status: "warning" },
      { label: "Glucose", value: "102 (borderline)", status: "warning" },
    ],
    rationale: "LDL significantly above target, HDL below optimal. No statin started. Borderline fasting glucose warrants monitoring.",
  },
  {
    system: "Hepatic",
    score: 90,
    keyMetrics: [
      { label: "ALT", value: "Baseline normal", status: "normal" },
      { label: "AST", value: "Baseline normal", status: "normal" },
    ],
    rationale: "No liver function abnormalities documented. Baseline liver enzymes within normal limits.",
  },
  {
    system: "Hematologic",
    score: 85,
    keyMetrics: [
      { label: "CBC", value: "Normal", status: "normal" },
      { label: "Copper", value: "62 ug/dL (low)", status: "warning" },
    ],
    rationale: "CBC normal. Copper deficiency could affect hematopoiesis long-term; monitor.",
  },
  {
    system: "Inflammatory",
    score: 82,
    keyMetrics: [
      { label: "CRP", value: "3.2 mg/L", status: "normal" },
      { label: "Pericarditis", value: "Resolved", status: "normal" },
    ],
    rationale: "CRP normalized from 48 during pericarditis. Inflammation currently well-controlled.",
  },
  {
    system: "Respiratory",
    score: 65,
    keyMetrics: [
      { label: "FEV1", value: "78% predicted", status: "warning" },
      { label: "SpO2", value: "97%", status: "normal" },
      { label: "Imaging", value: "Early emphysema", status: "warning" },
    ],
    rationale: "Mild obstructive pattern on PFTs. Early emphysema from prior smoking. Annual monitoring recommended.",
  },
  {
    system: "Mental Health",
    score: 88,
    keyMetrics: [
      { label: "PHQ-9", value: "4 (Minimal)", status: "normal" },
      { label: "GAD-7", value: "3 (Minimal)", status: "normal" },
    ],
    rationale: "Low depression and anxiety scores. Moderate work stress. Sleep 6-7 hours. No treatment needed.",
  },
];

/* ═══════════════════════════════════════════════════
   DOSING GUIDELINES DATABASE
   Standard dose ranges, max daily doses, and
   indication-specific recommendations
   ═══════════════════════════════════════════════════ */

export interface DosingGuideline {
  standardDoses: string[];
  maxDailyDose: string;
  indications: Record<string, { recommendedDose: string; notes: string }>;
  renalAdjustment: { required: boolean; note: string };
  ageConsiderations: string;
  warnings: string[];
}

export const DOSING_GUIDELINES: Record<string, DosingGuideline> = {
  Aspirin: {
    standardDoses: ["81mg", "325mg", "500mg", "650mg"],
    maxDailyDose: "4000mg",
    indications: {
      cardioprotective: { recommendedDose: "81mg", notes: "ACC/AHA recommends low-dose aspirin (81mg) for cardiovascular prevention. 325mg is anti-inflammatory dose, not standard for cardioprotection." },
      antiInflammatory: { recommendedDose: "325-650mg", notes: "Higher doses used for acute inflammation (e.g., pericarditis). Typically short-term." },
      analgesic: { recommendedDose: "325-650mg", notes: "Standard analgesic dosing. Use lowest effective dose." },
    },
    renalAdjustment: { required: false, note: "Avoid in severe renal impairment (GFR <10)." },
    ageConsiderations: ">70: Increased bleeding risk. Reassess benefit vs. risk of aspirin therapy.",
    warnings: ["GI bleeding risk increases with dose", "Avoid with anticoagulants if possible", "Monitor for tinnitus at high doses"],
  },
  Lisinopril: {
    standardDoses: ["5mg", "10mg", "20mg", "40mg"],
    maxDailyDose: "80mg",
    indications: {
      hypertension: { recommendedDose: "10-40mg", notes: "Start 10mg daily, titrate to BP goal (<130/80). Usual maintenance 20-40mg." },
      heartFailure: { recommendedDose: "5-40mg", notes: "Start low (2.5-5mg), titrate up every 2 weeks as tolerated." },
    },
    renalAdjustment: { required: true, note: "Reduce starting dose to 5mg if GFR <30. Monitor K+ and creatinine closely." },
    ageConsiderations: ">65: Start with lower dose (5mg). Greater risk of hyperkalemia and hypotension.",
    warnings: ["Monitor potassium — ACE inhibitors increase K+ retention", "Monitor creatinine at baseline and 1-2 weeks after initiation", "Contraindicated in pregnancy", "Discontinue if angioedema occurs"],
  },
  Doxycycline: {
    standardDoses: ["50mg", "100mg"],
    maxDailyDose: "200mg",
    indications: {
      infection: { recommendedDose: "100mg BID", notes: "Standard dose for most infections. Typical course 7-14 days." },
      acne: { recommendedDose: "50-100mg daily", notes: "Lower dose for chronic acne management." },
    },
    renalAdjustment: { required: false, note: "No dose adjustment needed — primarily hepatic elimination." },
    ageConsiderations: "Avoid in children <8 years (tooth discoloration). Safe in adults of all ages.",
    warnings: ["Take with full glass of water, remain upright 30 min", "Photosensitivity — use sunscreen", "Avoid dairy/antacids within 2 hours"],
  },
  Acetaminophen: {
    standardDoses: ["325mg", "500mg", "650mg", "1000mg"],
    maxDailyDose: "3000mg",
    indications: {
      analgesic: { recommendedDose: "500-1000mg", notes: "Every 4-6 hours as needed. Do not exceed 3g/day (reduced from 4g)." },
      antipyretic: { recommendedDose: "500-1000mg", notes: "Every 4-6 hours for fever reduction." },
    },
    renalAdjustment: { required: false, note: "Use with caution in severe renal impairment. Extend dosing interval." },
    ageConsiderations: ">65: Maximum 2g/day recommended. Higher hepatotoxicity risk.",
    warnings: ["Hepatotoxicity risk above 3g/day", "Check all medications for hidden acetaminophen (combination products)", "Avoid with alcohol use (>3 drinks/day)"],
  },
  Losartan: {
    standardDoses: ["25mg", "50mg", "100mg"],
    maxDailyDose: "100mg",
    indications: {
      hypertension: { recommendedDose: "50-100mg", notes: "Start 50mg daily. May titrate to 100mg. Alternative to ACE inhibitors when K+ elevated or ACE cough." },
    },
    renalAdjustment: { required: true, note: "Start 25mg if hepatic impairment or volume depletion. Monitor K+." },
    ageConsiderations: ">75: Start 25mg daily. Increased hypotension risk.",
    warnings: ["Monitor potassium (less K+ elevation than ACE inhibitors)", "Contraindicated in pregnancy", "Monitor renal function"],
  },
  Metformin: {
    standardDoses: ["500mg", "850mg", "1000mg"],
    maxDailyDose: "2550mg",
    indications: {
      diabetes: { recommendedDose: "500-1000mg BID", notes: "Start 500mg daily with meals, titrate weekly. Target 2000mg/day in divided doses." },
    },
    renalAdjustment: { required: true, note: "Contraindicated if GFR <30. Reduce dose if GFR 30-45." },
    ageConsiderations: ">80: Check GFR before initiating. Increased lactic acidosis risk.",
    warnings: ["Take with meals to reduce GI side effects", "Hold before contrast dye procedures", "Lactic acidosis risk with renal impairment"],
  },
  Atorvastatin: {
    standardDoses: ["10mg", "20mg", "40mg", "80mg"],
    maxDailyDose: "80mg",
    indications: {
      dyslipidemia: { recommendedDose: "10-80mg", notes: "Moderate-intensity: 10-20mg. High-intensity: 40-80mg. Choice depends on ASCVD risk." },
      cardiovascularPrevention: { recommendedDose: "40-80mg", notes: "High-intensity statin for patients with established ASCVD or high 10-year risk (>20%)." },
    },
    renalAdjustment: { required: false, note: "No dose adjustment needed for renal impairment." },
    ageConsiderations: ">75: Moderate-intensity (10-20mg) preferred. Discuss benefit vs. risk.",
    warnings: ["Monitor LFTs at baseline", "Report unexplained muscle pain (rhabdomyolysis risk)", "Avoid grapefruit juice in large quantities"],
  },
  Amlodipine: {
    standardDoses: ["2.5mg", "5mg", "10mg"],
    maxDailyDose: "10mg",
    indications: {
      hypertension: { recommendedDose: "5-10mg", notes: "Start 5mg daily. Effective as monotherapy or combination. Long half-life allows once-daily dosing." },
    },
    renalAdjustment: { required: false, note: "No dose adjustment needed." },
    ageConsiderations: ">65: Start 2.5mg. Increased sensitivity to vasodilatory effects.",
    warnings: ["Peripheral edema is common (dose-related)", "Avoid abrupt discontinuation"],
  },
  Omeprazole: {
    standardDoses: ["20mg", "40mg"],
    maxDailyDose: "40mg",
    indications: {
      gerd: { recommendedDose: "20mg", notes: "Once daily before breakfast. 4-8 week course for healing, then reassess." },
      ulcer: { recommendedDose: "20-40mg", notes: "40mg for active ulcer healing. Step down after 8 weeks." },
    },
    renalAdjustment: { required: false, note: "No dose adjustment needed." },
    ageConsiderations: ">65: Long-term use increases fracture risk and Mg deficiency. Reassess annually.",
    warnings: ["Long-term use: fracture risk, B12 deficiency, hypomagnesemia", "Increased C. difficile risk", "Taper when discontinuing after long-term use"],
  },
  Prednisone: {
    standardDoses: ["5mg", "10mg", "20mg", "40mg", "60mg"],
    maxDailyDose: "80mg",
    indications: {
      antiInflammatory: { recommendedDose: "5-60mg", notes: "Dose depends on condition severity. Taper gradually after >7 days of use." },
    },
    renalAdjustment: { required: false, note: "No dose adjustment needed." },
    ageConsiderations: ">65: Increased risk of osteoporosis, glucose elevation, and infection. Use lowest effective dose.",
    warnings: ["Taper gradually — do not stop abruptly", "Monitor blood glucose", "Increased infection risk", "GI protection if combined with NSAIDs"],
  },
};

/* ═══════════════════════════════════════════════════
   EHR MEDICATION LIST
   Simulates what the EHR system has on file — may
   differ from patient-reported medications to create
   realistic reconciliation discrepancies
   ═══════════════════════════════════════════════════ */

export interface EHRMedication {
  name: string;
  dose: string;
  freq: string;
  status: "active" | "discontinued" | "pending";
  source: string;
  prescriber: string;
  startDate: string;
  endDate: string | null;
}

export const EHR_MEDICATION_LIST: EHRMedication[] = [
  { name: "Enteric Coated Aspirin", dose: "325mg", freq: "Daily", status: "active", source: "EHR", prescriber: "Dr. Patel", startDate: "2024-03-12", endDate: null },
  { name: "Lisinopril", dose: "10mg", freq: "Daily", status: "active", source: "EHR", prescriber: "Dr. Patel", startDate: "2024-03-12", endDate: null },
  { name: "Doxycycline", dose: "100mg", freq: "BID", status: "active", source: "EHR", prescriber: "Dr. Patel", startDate: "2025-12-03", endDate: null },
  { name: "Tylenol (Acetaminophen)", dose: "500mg", freq: "PRN", status: "active", source: "EHR", prescriber: "Dr. Patel", startDate: "2025-03-10", endDate: null },
  { name: "Colchicine", dose: "0.5mg", freq: "BID", status: "discontinued", source: "EHR", prescriber: "Dr. Patel", startDate: "2024-08-06", endDate: "2024-11-05" },
  // Note: Vitamin D3 and Fish Oil are patient-reported supplements — NOT in EHR
  // Note: Losartan 50mg is planned (per visit note vn-15) but not yet prescribed
];
