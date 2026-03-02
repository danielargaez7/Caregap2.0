# MedAssist — AI Clinical Decision Support System

A clinician workstation powered by GPT-4o with 5 domain-specific healthcare tools, a 5-layer verification system, FHIR R4 integration, and interactive clinical visualizations. Built with Next.js 14 and the Vercel AI SDK v6.

**Live Demo**: [healthbot-liard.vercel.app](https://healthbot-liard.vercel.app)

---

## Open Source Contribution

### medassist-eval — Clinical AI Evaluation Dataset

[![npm](https://img.shields.io/npm/v/medassist-eval)](https://www.npmjs.com/package/medassist-eval) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**85 clinical AI test cases** published as an open-source npm package for healthcare agent benchmarking and testing. Built from MedAssist's production test suite and released under the MIT license.

```bash
npm install medassist-eval
```

```typescript
import { allCases, getCasesByCategory, getCasesBySeverity } from "medassist-eval";

const drugCases = getCasesByCategory("drug_interaction"); // 5 cases
const critical = getCasesBySeverity("critical");           // 8 safety-critical cases
```

#### 12 Evaluation Categories

| Category | Cases | What It Tests |
|----------|-------|---------------|
| Drug Interactions | 5 | Allergy cross-reactivity, NSAID conflicts, RAAS blockade |
| Dosing Validation | 5 | Dose range checks, indication-specific dosing, max dose limits |
| Lab Interpretation | 5 | Reference range analysis, trend detection, medication-lab correlations |
| Medication Reconciliation | 6 | Chart vs EHR discrepancies, therapy gaps, duration alerts |
| Symptom Lookup | 5 | Symptom-to-condition mapping, urgency triage, escalation rules |
| Insurance Coverage | 5 | Prior auth, formulary tiers, step therapy, cost estimation |
| Provider Search | 4 | Specialty matching, availability filtering |
| Appointment Availability | 4 | Slot finding, conflict detection, scheduling constraints |
| Verification Layer | 12 | 5-layer verification (fact check, hallucination, confidence, domain, human-in-the-loop) |
| Patient Data Integrity | 20 | Reference ranges, body system scores, lab trends, BP readings |
| Clinical Calculation | 9 | ASCVD risk, penicillin cross-reactivity, input validation |
| Utility Functions | 3 | Time formatting, display helpers |

#### Severity Distribution

- **Critical** (8) — Patient safety risks requiring immediate action
- **High** (12) — Significant clinical impact
- **Medium** (25) — Moderate clinical relevance
- **Low** (40) — Validation and structural checks

#### Clinical Domains Covered

Pharmacology, Emergency Medicine, Cardiology, Nephrology, Laboratory Medicine, Hepatology, ENT, Medication Safety, Insurance, Clinical Assessment, and more.

**npm**: [npmjs.com/package/medassist-eval](https://www.npmjs.com/package/medassist-eval)
**GitHub**: [github.com/gord-sims/medassist-eval](https://github.com/gord-sims/medassist-eval)

### CareGap — Chronic Care Risk Detector for OpenEMR

Full-stack chronic care gap detection system built on OpenEMR with a Claude-powered AI agent, CMS quality measure logic, Blue Button Medicare claims integration, and coverage-aware patient outreach. Published as an open-source reference implementation.

- **20 agent tools** across 7 categories (patient, clinical, risk, alerts, followups, claims, screening)
- **CMS measure gap detection** — CMS165 (BP control) and CMS122 (HbA1c control) with spec-compliant exclusion logic
- **Blue Button Medicare integration** — PDC medication adherence from Part D claims data
- **Coverage-aware recommendations** — every alert includes patient out-of-pocket cost under their insurance
- **3-layer guardrails** — input filter, system prompt lockdown, output screening
- **Dockerized** — full stack runs via `docker-compose up -d` (FastAPI + React + OpenEMR + MySQL)

**GitHub**: [github.com/danielargaez7/CareGap](https://github.com/danielargaez7/CareGap)

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # add your OPENAI_API_KEY
npm run dev                         # http://localhost:3000
```

Demo login: `doctor` / `doctor123`

---

## Architecture

```
User Chat → /api/chat (POST)
              ↓
           Vercel AI SDK streamText() → GPT-4o (temp 0.3)
              ↓
           5 Tools (Zod-validated) → clinical-tools.ts
              ↓
           Each tool → verify() → VerifiedToolResult<T>
              ↓
           Streamed response → clinician
```

### Core Agent Components

| Component | File | Description |
|-----------|------|-------------|
| Reasoning Engine | `api/chat/route.ts` | GPT-4o via `streamText()` decides tool calls and interprets results |
| Tool Registry | `api/chat/route.ts` | 5 tools with Zod input schemas registered via `tool()` |
| Memory System | `lib/system-prompt.ts` | Full patient chart (15 visits, meds, labs, allergies) injected as context |
| Orchestrator | `api/chat/route.ts` | Multi-step execution controlled by `stepCountIs(3)` |
| Verification Layer | `lib/verification.ts` | 5-type safety checks on every tool result |
| Output Formatter | `lib/system-prompt.ts` | LLM rules enforce surfacing warnings, confidence, and escalations |

---

## 5 Clinical Tools

| Tool | Purpose | Verification Types |
|------|---------|-------------------|
| `drug_interaction_check` | Pairwise drug interactions + penicillin allergy cross-reactivity | fact_check, confidence, domain_constraints, human_in_the_loop |
| `symptom_lookup` | Maps symptoms → conditions ranked by urgency (emergent/urgent/routine) | All 5 types |
| `provider_search` | Searches clinic staff directory by specialty | fact_check, confidence |
| `appointment_availability` | Available time slots, skips weekends, checks booked appointments | fact_check, confidence, domain_constraints |
| `insurance_coverage_check` | CPT/HCPCS code coverage, copay, prior auth requirements | fact_check, confidence, domain_constraints, human_in_the_loop |

---

## 5-Layer Verification System

Every tool result is wrapped in `VerifiedToolResult<T>`:

```typescript
{
  status: "verified" | "warning" | "failed",
  data: T,
  verification: {
    passed: boolean,
    confidence: number,       // 0–1
    warnings: string[],
    errors: string[],
    sources: string[],
    verification_types: string[],
    requires_human_review: boolean,
    human_review_reason?: string
  }
}
```

| Layer | What It Does |
|-------|-------------|
| **Fact Checking** | Cross-references inputs against known databases. <50% coverage = fail |
| **Hallucination Detection** | Flags claims not supported by patient data |
| **Confidence Scoring** | Weighted: source reliability (40%) + match quality (35%) + data completeness (25%) |
| **Domain Constraints** | Business rules: allergen conflicts, severe interactions, emergent conditions |
| **Human-in-the-Loop** | Escalates critical severity, low confidence + high stakes, moderate severity + high stakes |

---

## Evaluations (Tests)

### Running Evals

```bash
# Standard run (69 tests)
npm test

# Verbose output (recommended for demo)
npm run eval

# Watch mode for development
npm run test:watch
```

### Eval File

**[`src/__tests__/medassist.test.ts`](src/__tests__/medassist.test.ts)** — 69 tests across 15 test suites

### What the Evals Cover

| Suite | Tests | What It Validates |
|-------|-------|-------------------|
| ASCVD Risk Calculation | 2 | Pooled Cohort Equations produce valid percentages; smoker risk > non-smoker |
| Penicillin Cross-Reactivity | 5 | Amoxicillin/Augmentin flagged; Doxycycline/Azithromycin safe; patient allergy detected |
| Reference Range Validation | 6 | K+ 5.8 out of range, Copper 62 out of range, Creatinine 1.0 normal, all 6 ranges defined |
| Body System Scores | 5 | 8 systems returned, Cardiovascular lowest (45), Hepatic highest (90), average ~73 |
| Lab Trend Data Integrity | 3 | 9 chronological points, K+ trending 4.6→5.8, CRP normalizing 48→3.2 |
| BP Reading Data Integrity | 3 | 9 chronological readings, systolic improving 152→132, systolic > diastolic |
| Medication Timeline | 3 | 5 events, Colchicine only discontinued, ongoing meds have null endDate |
| formatTime12 Utility | 3 | 09:00→9:00 AM, 14:30→2:30 PM, 12:00→12:00 PM |
| ASCVD Input Validation | 4 | Rejects age <40 / >79, rejects HDL > total cholesterol, accepts valid inputs |
| drug_interaction_check | 5 | Allergy alert for Amoxicillin, Aspirin+Ibuprofen interaction, safe combos, verification structure, severe interaction fails verification |
| symptom_lookup | 5 | Chest pain → ACS (emergent), ear pain → Otitis, patient context included, sorted by urgency, emergent escalated for human review |
| provider_search | 4 | Finds cardiologist, finds nurses, empty for non-existent specialty, verification includes fact_check |
| appointment_availability | 4 | Returns slots for Dr. Patel, excludes booked times, skips weekends, unknown provider fails domain constraints |
| insurance_coverage_check | 5 | Office visit covered ($25 copay), CT abdomen needs prior auth, unknown code fails, correct patient info, preventive labs free |
| Verification Layer | 12 | fact_check matched/unmatched, hallucination detection, confidence scoring, domain constraints (severe/allergy/clean), human review escalation, composite verify with all 5 types, verify failure on constraint violation |

---

## Visual Clinical Tools

| Tool | Description |
|------|-------------|
| Lab Trends Explorer | Interactive SVG line chart — 6 toggleable labs with reference range bands and hover tooltips |
| Vital Signs Timeline | BP curves with target zones + medication markers, mini sparkline vitals, medication Gantt chart |
| Patient Health Radar | SVG radar chart scoring 8 body systems, overall score ~73/100 |

---

## FHIR R4 Integration

Connects to OpenEMR (or any FHIR-compliant EHR) via OAuth2 client_credentials:

- **Resources**: Patient, AllergyIntolerance, MedicationRequest, Condition, Encounter, Procedure, DocumentReference
- **Fallback**: Gracefully falls back to demo patient data (Gord Sims, 59M) if FHIR not configured
- **Files**: `src/lib/fhir/client.ts`, `adapters.ts`, `fetch-patient.ts`, `types.ts`

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2 | Framework (App Router) |
| Vercel AI SDK | v6 | `streamText`, `tool()`, `stepCountIs()` |
| OpenAI SDK | v3 | GPT-4o model provider |
| Zod | v4 | Tool input schema validation |
| LangSmith | v0.5 | Observability, tracing & user feedback |
| Vitest | v4 | Test framework (69 evals) |
| TypeScript | v5 | Type safety |
| Tailwind CSS | v3.4 | Styling |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # LLM streaming + tool calling
│   │   └── patient/[id]/route.ts  # Patient data endpoint
│   ├── login/page.tsx             # Auth page
│   ├── page.tsx                   # Main dashboard + 6 clinical tools
│   ├── globals.css                # Styles + chart CSS
│   └── layout.tsx                 # Root layout
├── lib/
│   ├── clinical-tools.ts          # 5 healthcare tools with verification
│   ├── verification.ts            # 5-layer verification system
│   ├── patient-data.ts            # Demo patient + time-series data
│   ├── system-prompt.ts           # LLM context builder
│   └── fhir/                      # FHIR R4 integration
│       ├── client.ts              # OAuth2 + REST client
│       ├── adapters.ts            # FHIR → internal format
│       ├── fetch-patient.ts       # Data orchestration
│       └── types.ts               # Type definitions
└── __tests__/
    └── medassist.test.ts          # 69 evals
```
