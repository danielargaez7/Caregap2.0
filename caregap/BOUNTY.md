# BOUNTY.md — CareGap: Chronic Care Risk Detector for OpenEMR

## Customer

**Medicare-heavy primary care clinics** (3-15 clinicians) with dedicated quality/ops staff managing CMS quality reporting (MIPS). These clinics face up to **-9% payment adjustments** on Medicare claims when they fail quality measures like CMS165 (BP control) and CMS122 (HbA1c control). Today, they discover measure failures quarterly or at year-end — too late to intervene.

**User persona**: Quality coordinator or practice manager who needs to identify at-risk patients daily, not quarterly. They need: (1) which patients have care gaps, (2) what specifically is wrong, (3) what to do about it, and (4) proof of due diligence for auditors.

## Features

### 1. CMS Measure Gap Detection
- **CMS165v13** (Controlling High Blood Pressure): Evaluates BP control with spec-compliant logic — SBP < 140 and DBP < 90, same-day lowest reading rule, proper exclusions (ESRD, kidney transplant, hospice, pregnancy)
- **CMS122v12** (Diabetes HbA1c Poor Control): Detects missing or uncontrolled HbA1c (> 9.0%), with same-day lowest result rule and proper exclusions
- Composite risk scoring with weighted factors: BP control (0.30), A1c control (0.30), medication adherence (0.20), recency (0.10), dual-gap multiplier (0.10)
- Risk bands: low / medium / high / critical

### 2. Chronic Condition Screening
- **Chronic Kidney Disease (CKD)** — monitors eGFR labs, flags declining kidney function (eGFR < 60)
- **COPD** — tracks patients with COPD who haven't been seen in 6+ months
- **Heart Disease** — flags cardiac patients overdue for follow-up
- **Depression** — checks for missing PHQ-9 screenings and high depression scores (PHQ-9 >= 10)
- **Cancer screenings** — mammography (women 50-74), colonoscopy (adults 45-75), lung CT (smokers 50-80)
- **Vaccine reminders** — flu and pneumococcal vaccines for patients 65+

### 3. Coverage-Aware Recommendations
Every recommendation includes what it costs the patient under their insurance plan:
- Maps 15 Medicare preventive services to patient out-of-pocket cost ($0 or copay amount)
- Tells staff in plain language: "This mammogram is covered at $0 under Medicare Part B"
- Removes the financial hesitation that keeps patients from scheduling care
- Covers: Annual Wellness Visit, mammography, colonoscopy, lung CT, flu/pneumonia vaccines, diabetes screening, depression screening, and more

### 4. AI Agent with Tool Use
- Claude-powered agent with **20 tools** across 7 categories: patient lookup, clinical data, risk assessment, alerts, followups, claims/adherence, screening/coverage
- **3-layer guardrails**: input keyword filter, system prompt lockdown, output screening — agent is strictly scoped to chronic care risk detection and cannot be used for general-purpose queries
- **Plain-language output**: Agent writes like a human, not a database — "Maria Santos has high blood pressure (156/92). She needs a follow-up visit. Good news: it's covered at $0."
- **Tool call transparency**: every agent response includes metadata about which tools were called, what parameters were passed, and execution time — displayed in the UI as a collapsible inspector
- Conversation history with session management
- Run UUID tracking for observability and audit

### 5. Actionable Work Queues
- **Alerts**: Care gap alerts with severity (info/warn/high), type classification, recommended actions
- **Followups**: Closure-loop tasks (schedule_visit, order_lab, call_patient) with due dates and completion tracking
- Agent automatically creates appropriate followups when gaps are detected (e.g., missing HbA1c triggers "order_lab" followup)

### 6. Risk Dashboard
- Panel-level risk distribution chart (critical/high/medium/low)
- Patient risk cards with scores, flags, and last assessment date
- Patient detail view with evidence factors, flag breakdown, assessment history
- Alert queue with filtering, inline acknowledge/close actions
- Followup tracker with overdue highlighting and completion

### 7. Blue Button Medicare Claims Integration (New Data Source)
- OAuth2 integration with CMS Blue Button API (FHIR R4)
- Syncs ExplanationOfBenefit resources from Medicare claims
- Extracts Part D prescription drug events (NDC, days_supply, fill dates)
- **PDC (Proportion of Days Covered)** calculation per drug and overall
- 80% adherence threshold per PQA (Pharmacy Quality Alliance) standards
- Adherence data feeds into composite risk score

### 8. Full Audit Trail
- All risk assessments append-only with evidence factors
- Agent run logging with cohort size, success/error counts
- Alert lifecycle tracking (open -> ack -> closed with timestamps)
- Spec version pinning on every assessment (CMS165v13, CMS122v12)

## New Data Source: CMS Blue Button API

**What it is**: The CMS Blue Button 2.0 API provides Medicare beneficiary claims data in FHIR R4 format. It includes:
- **ExplanationOfBenefit** (EOB) resources — all Medicare Part A, B, and D claims
- **Part D Prescription Drug Events (PDE)** — medication fills with NDC codes, days supply, and service dates
- **Coverage** — Medicare enrollment and plan information

**How CareGap uses it**:
1. Links OpenEMR patients to their Medicare beneficiary ID via `ccrd_external_link`
2. Syncs EOB data into `ccrd_claims_cache` for fast querying
3. Extracts Part D fills to compute **medication adherence** using the PDC method
4. Feeds adherence metrics into the composite risk score — non-adherent patients (PDC < 80%) get higher risk scores
5. Agent can query adherence data via the `get_adherence_summary` tool

**Why it matters**: EHR vitals and labs show clinical outcomes, but claims data reveals *behavioral* risk — patients who aren't filling prescriptions will inevitably have uncontrolled conditions. Combining clinical + claims data catches patients earlier.

**Integration details**:
- Sandbox: `https://sandbox.bluebutton.cms.gov/v2/fhir/`
- Auth: OAuth2 authorization code flow
- Endpoints: `/Patient`, `/Coverage`, `/ExplanationOfBenefit`
- Stored in: `ccrd_claims_cache` table (same MySQL instance as OpenEMR)

## Architecture

```
React Dashboard (port 3000)
    |
    v
FastAPI Backend (port 8000)
    |--- OpenEMR REST API (port 9300) — patient clinical data
    |--- CMS Blue Button API — Medicare claims/adherence
    |--- MySQL (shared with OpenEMR) — ccrd_* tables
    |--- Claude Agent — tool-use loop with guardrails
```

All components run in Docker Compose. The backend reads clinical data through OpenEMR's Standard REST API, syncs claims from Blue Button, and stores all CareGap state in `ccrd_*` prefixed tables in the same MySQL instance (never modifies OpenEMR's native tables).

## Database Tables (Stateful Data)

| Table | Purpose |
|-------|---------|
| `ccrd_risk_assessment` | Append-only risk scores with model/spec versioning |
| `ccrd_risk_factor` | Evidence pointers per assessment (BP reading, lab result, etc.) |
| `ccrd_alert` | Care gap alerts with severity, type, recommended actions |
| `ccrd_followup` | Closure-loop tasks (order lab, schedule visit, call patient) |
| `ccrd_external_link` | Patient-to-Medicare beneficiary linkage |
| `ccrd_claims_cache` | Cached EOB/PDE data from Blue Button |
| `ccrd_agent_run` | Agent execution audit log |

## CRUD Operations

The agent uses tools that perform full CRUD on these tables:
- **Create**: `run_risk_assessment` (creates assessment + factors + alerts + followups), `create_alert`, `create_followup`
- **Read**: `get_risk_assessment`, `get_cohort_summary`, `get_open_alerts`, `get_work_queue`, `get_adherence_summary`, `get_high_risk_patients`, `run_screenings`, `get_coverage_summary`
- **Update**: `acknowledge_alert` (ack/close), `complete_followup`
- **Delete**: Not exposed (append-only design for audit compliance)

## Impact

CareGap is a revenue engine that improves quality scores, reduces CMS exposure, increases preventive visit volume, and strengthens patient outcomes — simultaneously.

Every primary care clinic is sitting on unrealized revenue and preventable risk inside the panel they already manage. A preventable stroke. An avoidable heart failure admission. A cancer screening that never gets scheduled. Blood pressure rises quietly between visits. Medications lapse. Preventive screenings sit overdue. These are not failures of medicine — they are failures of monitoring at scale. No human team can manually track 1,000 lives at once.

Under programs from the Centers for Medicare & Medicaid Services, those gaps carry direct financial consequences. Under MIPS, payment adjustments can swing reimbursement up to ±9% on Medicare Part B revenue. For a primary care clinic generating $4 million in annual Medicare revenue, a –5% adjustment equals $200,000 lost. At –9%, that's $360,000 in downside risk. For larger groups generating $10 million in Medicare revenue, the swing approaches $900,000. And that's only Part B. Under the Hospital Readmissions Reduction Program, hospitals can lose up to 3% of total Medicare inpatient reimbursement. For a hospital with $50 million in Medicare inpatient revenue, that's $1.5 million at risk annually.

These are not theoretical penalties. They are performance-based revenue adjustments tied directly to chronic disease control, preventive screening rates, and avoidable admissions. For most organizations, that translates to hundreds of thousands — and often millions — in controllable revenue impact each year.

CareGap embeds directly into the EMR and continuously analyzes labs, vitals, medications, claims data, and screening eligibility. It identifies who is trending toward uncontrolled diabetes, unmanaged hypertension, missed cancer screenings, or chronic deterioration before it becomes an emergency or a penalty.

CareGap doesn't just flag risk. It acts on it.

Because the system has access to the patient's insurance information and eligibility data, it doesn't stop at identifying the gap — it calculates coverage. It determines whether the recommended visit, screening, or follow-up is fully covered, partially covered, or subject to a specific copay.

Then it acts.

CareGap can automatically initiate outreach through secure voice calls, SMS, or email — explaining what was flagged, why it matters, and what the patient will pay. For preventive services covered at $0, the message is simple and explicit:

> "Your Annual Wellness Visit is fully covered. There is no out-of-pocket cost."

And this applies to a large portion of a typical primary care panel — not a small subset.

Across Medicare, Medicaid, and ACA-compliant commercial plans, most recommended preventive services are fully covered when delivered in-network and properly coded. That includes Annual Wellness Visits, diabetes screenings, cardiovascular screenings, and cancer screenings. In practical terms, a meaningful percentage of flagged outreach can be communicated with cost certainty — often zero cost. When financial ambiguity is removed, scheduling rates increase. Cost clarity becomes a conversion engine.

That matters. National surveys consistently show that roughly one-third of adults delay or avoid care because of cost uncertainty — not necessarily actual cost, but fear of the bill. When you remove uncertainty, appointment conversion rates rise.

This turns risk detection into automated revenue activation.

Staff are no longer manually combing through charts or spending hours dialing reminder calls. Outreach becomes scalable and consistent. Human staff focus only on complex follow-ups or patients who require personal coordination.

The result: higher show rates, increased preventive visit volume, expanded Chronic Care Management enrollment, and measurable improvement in quality metrics — without expanding payroll.

## Evaluation Results

| Eval | Metric | Target |
|------|--------|--------|
| Care gap detection (CMS165/CMS122) | Deterministic accuracy | 100% |
| Input guardrails | Block rate on off-topic prompts | 100% |
| Tool selection | Correct tool for given prompt | >= 90% |
| Conversation quality | Multi-turn coherence | >= 85% |

Run evals: `cd evals && python run_evals.py` (deterministic) or `python run_evals.py --live` (with backend running)

## Setup

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your Anthropic API key

# 2. Start all services
docker-compose up -d

# 3. Seed test patients
python seed/seed_patients.py

# 4. Access
# Dashboard: http://localhost:3000
# API docs:  http://localhost:8000/docs
# OpenEMR:   https://localhost:9300
```
