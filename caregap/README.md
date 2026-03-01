# CareGap — Chronic Care Risk Detector for OpenEMR

Every primary care clinic is sitting on unrealized revenue and preventable risk inside the panel they already manage. Blood pressure rises quietly between visits. Medications lapse. Preventive screenings sit overdue. No human team can manually track 1,000 lives at once — and under CMS programs like MIPS (±9% payment adjustments) and the Hospital Readmissions Reduction Program (up to 3% of total inpatient reimbursement), those gaps carry direct financial consequences. For a clinic generating $4M in annual Medicare revenue, a –5% MIPS adjustment equals $200,000 lost. For a hospital with $50M in Medicare inpatient revenue, HRRP penalties put $1.5M at risk annually.

**CareGap changes that.** It embeds directly into OpenEMR and continuously analyzes labs, vitals, medications, claims data, and screening eligibility to identify patients trending toward uncontrolled chronic conditions — before it becomes an emergency or a penalty. It calculates insurance coverage for every recommendation, removes financial uncertainty for patients, and tells staff in plain language exactly who to call, what's wrong, what to do, and that it's covered.

The result: higher show rates, increased preventive visit volume, expanded Chronic Care Management enrollment, and measurable improvement in quality metrics — without expanding payroll. It's not a cost center — it's a revenue engine that also happens to improve care.

## What It Does

CareGap continuously monitors your patient panel for:

**Quality Measure Gaps**
- **Blood Pressure (CMS165)** — Flags patients with BP above 140/90 and creates follow-up tasks
- **Diabetes Control (CMS122)** — Catches missing or uncontrolled HbA1c (above 9.0% or no lab on file)
- **Medication Adherence** — Identifies patients not filling prescriptions (PDC below 80%) using Medicare Part D claims

**Chronic Condition Screening**
- **Chronic Kidney Disease** — Monitors eGFR labs, flags declining kidney function (eGFR below 60)
- **COPD** — Tracks patients with COPD who haven't been seen in 6+ months
- **Heart Disease** — Flags cardiac patients overdue for follow-up
- **Depression** — Checks for missing PHQ-9 screenings and high depression scores

**Cancer & Preventive Care Reminders**
- **Mammography** — Women 50-74 due for screening (USPSTF Grade B)
- **Colonoscopy** — Adults 45-75 due for colorectal screening (USPSTF Grade A)
- **Lung Cancer** — Smokers 50-80 due for annual low-dose CT
- **Vaccines** — Flu and pneumococcal vaccines for patients 65+

**Coverage-Aware Recommendations**

Every recommendation includes what it costs the patient under their insurance:

> *"Maria Santos has high blood pressure — her last reading was 156/92. She needs a follow-up visit to adjust her medication. Good news: this visit is covered at $0 under her Medicare plan."*

Instead of technical jargon, CareGap tells your staff in plain language: what's wrong, what to do, and that it's free — removing the financial hesitation that keeps patients from scheduling care.

## How It Works

When CareGap detects a gap, it automatically:
1. Creates a **prioritized alert** (critical/high/medium/low) with a plain-language explanation
2. Creates an **actionable followup task** (order lab, schedule visit, call patient) with a due date
3. Includes **cost information** so staff can tell patients their screening is covered at $0
4. Logs everything for **audit trails** and quality reporting documentation

## Architecture

```
React Dashboard (:3000)  -->  FastAPI Backend (:8000)  -->  OpenEMR (:9300)
                                     |                         |
                                     |--- Claude Agent         |
                                     |--- Blue Button API      |
                                     |--- MySQL (ccrd_* tables + OpenEMR tables)
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Anthropic API key

### Setup

```bash
# Clone the repo
git clone https://github.com/PlntGoblin/Chronic-Care-Risk-Detector.git
cd Chronic-Care-Risk-Detector

# Configure environment
cp .env.example .env
# Edit .env:
#   ANTHROPIC_API_KEY=sk-ant-...
#   (other defaults are fine for local dev)

# Start all services
docker-compose up -d

# Wait for OpenEMR to initialize (~60s on first run)
# Then seed test patients
python seed/seed_patients.py
```

### Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3000 | — |
| API Docs | http://localhost:8000/docs | — |
| OpenEMR | https://localhost:9300 | admin / pass |

## Project Structure

```
CareGap/
├── backend/                 # FastAPI + Python
│   ├── agent/               # Claude agent with tools + guardrails
│   ├── routers/             # REST API endpoints
│   ├── services/            # Business logic (measures, risk engine, Blue Button)
│   │   ├── measures/        # CMS165, CMS122, screening, risk scorer
│   │   ├── coverage.py      # Insurance cost lookups
│   │   └── adherence.py     # PDC medication adherence
│   └── models.py            # Database models (ccrd_* tables)
├── frontend/                # React + TypeScript dashboard
│   └── src/components/      # Dashboard, alerts, followups, agent chat
├── seed/                    # Synthetic patient data (20 patients)
├── evals/                   # Evaluation harness
├── docker-compose.yml
└── BOUNTY.md
```

## Agent Tools (20 total)

| Category | Tools |
|----------|-------|
| Patient | search_patients, get_patient_details, get_high_risk_patients |
| Clinical | get_latest_vitals, get_vital_history, get_latest_labs, get_active_medications, get_active_problems |
| Risk | run_risk_assessment, get_risk_assessment, get_cohort_summary |
| Alert | create_alert, get_open_alerts, acknowledge_alert |
| Followup | create_followup, get_work_queue, complete_followup |
| Claims | get_adherence_summary |
| Screening | run_screenings, get_coverage_summary |

Every agent response includes tool call metadata (tool name, parameters, execution time) displayed in a collapsible inspector in the chat UI — so staff can verify exactly what the agent looked at.

## Demo Walkthrough

Once everything is running, here's what to try:

### 1. Dashboard (http://localhost:3000)
The risk dashboard shows your full patient panel at a glance — risk distribution chart, high-risk patients sorted by urgency, and quick links to each patient's detail view.

### 2. Agent Chat (http://localhost:3000/agent)
Ask the agent questions in plain English:

> **You:** "Who are my highest risk patients?"
>
> **Agent:** "Here are your patients who need immediate attention:
>
> **Critical — Call today:**
> - **James Wilson** has uncontrolled blood pressure (152/94) AND is missing HbA1c labs for over 12 months. He needs a follow-up visit to adjust BP medication and an HbA1c blood test. Both are covered at $0 under Medicare.
>
> **High — Schedule this week:**
> - **Maria Santos** has high blood pressure — last reading was 156/92. She needs a visit to adjust medication. Covered at $0.
> - **Robert Chen** has no HbA1c on file despite a diabetes diagnosis. Order a lab. Covered under Medicare Part B."
>
> *3 tool calls: get_high_risk_patients (120ms), get_cohort_summary (85ms), get_coverage_summary (95ms)*

---

> **You:** "Run screenings for Maria Santos"
>
> **Agent:** "I ran a full screening for Maria Santos (age 68, Female). Here's what I found:
>
> - **Blood Pressure** — UNCONTROLLED. Last reading 156/92 (should be below 140/90). Schedule a follow-up to adjust medication. Visit is $0 under Medicare.
> - **Mammography** — OVERDUE. No mammogram in the past 2 years. Schedule one — covered at $0 under Medicare Part B.
> - **Colonoscopy** — DUE. She's 68 and hasn't had colorectal screening. Covered at $0 as preventive.
> - **Flu Vaccine** — OVERDUE. She's over 65 and due for annual flu shot. Covered at $0.
>
> I've created follow-up tasks for each item in the work queue."
>
> *4 tool calls: search_patients (90ms), run_screenings (150ms), get_coverage_summary (95ms), create_followup (80ms)*

### 3. Alert Queue (http://localhost:3000/alerts)
Shows all open care gap alerts, filterable by severity. Staff can acknowledge and close alerts as they work through them.

### 4. Followup Tracker (http://localhost:3000/followups)
Work queue of actionable tasks — "order lab", "schedule visit", "call patient" — with due dates and overdue highlighting.

### 5. API Docs (http://localhost:8000/docs)
Full Swagger UI for all REST endpoints — try the CRUD operations directly.

## Guardrails

The agent is strictly scoped to chronic care risk detection:

1. **Input filter** — Blocks off-topic messages before they reach Claude (weather, poems, prompt injection attempts)
2. **System prompt** — Hard instructions limiting scope to patient risk, care gaps, alerts, followups, and quality measures
3. **Output filter** — Screens responses for jailbreak indicators

## Running Evals

```bash
# Deterministic evals (no backend needed)
cd evals
python run_evals.py

# Full eval suite (requires running backend)
python run_evals.py --live
```

Current results: **16/16 (100%)** on deterministic evals (care gap detection + guardrails).

## Tech Stack

- **Backend**: Python 3.11 / FastAPI / SQLAlchemy / httpx
- **Frontend**: React 18 / TypeScript / Vite / TailwindCSS / Recharts
- **Agent**: Anthropic SDK (Claude Sonnet)
- **Database**: MySQL (MariaDB 10.11, shared with OpenEMR)
- **External API**: CMS Blue Button 2.0 (FHIR R4)
- **Infrastructure**: Docker Compose

## License

See OpenEMR licensing terms for the base system. CareGap-specific code follows the same license.
