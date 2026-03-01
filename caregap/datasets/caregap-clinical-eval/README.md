---
license: apache-2.0
task_categories:
  - text-classification
  - question-answering
language:
  - en
tags:
  - healthcare
  - clinical-ai
  - eval
  - cms-measures
  - guardrails
  - tool-use
  - agent-evaluation
  - quality-measures
  - care-gaps
pretty_name: CareGap Clinical Agent Eval
size_categories:
  - n<1K
---

# CareGap Clinical Agent Eval

A comprehensive evaluation dataset for testing clinical AI agents that detect care gaps in chronic disease management. Covers CMS quality measure logic, agent guardrails, tool selection accuracy, and multi-turn conversation quality.

Built for [CareGap: Chronic Care Risk Detector](https://github.com/PlntGoblin/Chronic-Care-Risk-Detector) — an OpenEMR-integrated system that identifies patients at risk for CMS measure failures (CMS165 blood pressure control, CMS122 diabetes HbA1c control).

## Dataset Summary

| Split | Cases | Description |
|-------|-------|-------------|
| `care_gaps` | 22 | Deterministic CMS165/CMS122 measure evaluation with boundary testing |
| `guardrails` | 16 | Input guardrail classification (block vs. allow) |
| `tool_selection` | 12 | Agent tool routing accuracy for clinical queries |
| `conversations` | 10 | Multi-turn conversation quality with context maintenance |
| **Total** | **60** | |

## Motivation

Clinical AI agents that interact with EHR data need rigorous evaluation beyond standard NLP benchmarks. This dataset tests four critical dimensions:

1. **Clinical correctness** — Does the system correctly evaluate CMS quality measures using spec-compliant logic (same-day lowest reading, proper thresholds, exclusion handling)?
2. **Safety guardrails** — Does the agent refuse off-topic, jailbreak, and role-switching prompts while allowing legitimate clinical queries?
3. **Tool routing** — Does the agent call the correct tools for a given clinical question without triggering unsafe side effects?
4. **Conversation coherence** — Can the agent maintain clinical context across multi-turn workflows while resisting mid-conversation jailbreaks?

No existing public dataset covers this combination of clinical measure logic + agent safety + tool-use evaluation for healthcare AI.

## Data Format

All files are in JSON Lines format (one JSON object per line). Load with:

```python
import json

cases = []
with open("care_gaps.jsonl") as f:
    for line in f:
        cases.append(json.loads(line))
```

Or with HuggingFace `datasets`:

```python
from datasets import load_dataset

care_gaps = load_dataset("json", data_files="care_gaps.jsonl")
guardrails = load_dataset("json", data_files="guardrails.jsonl")
```

## Schema

### care_gaps.jsonl

Tests deterministic CMS quality measure evaluation logic.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Case identifier (cg-01 to cg-22) |
| `description` | string | Human-readable test scenario |
| `category` | string | Always `"care_gap"` |
| `patient_pid` | integer | Simulated patient ID |
| `vitals` | object, array, or null | Blood pressure reading(s). Single: `{"bps": 128, "bpd": 78}`. Multiple same-day: `[{"bps": 142, "bpd": 88}, {"bps": 134, "bpd": 82}]`. Missing: `null` |
| `hba1c` | number or null | HbA1c lab result (%). `null` = missing lab |
| `has_htn` | boolean | Patient has hypertension diagnosis (CMS165 eligible) |
| `has_diabetes` | boolean | Patient has diabetes diagnosis (CMS122 eligible) |
| `expected.cms165_controlled` | boolean | Expected BP control result per CMS165v13 (SBP < 140 AND DBP < 90) |
| `expected.cms122_poor_control` | boolean | Expected HbA1c poor control per CMS122v12 (> 9.0% or missing) |
| `expected.risk_band` | string | Expected composite risk band: `"low"`, `"medium"`, or `"high"` |

**Key test scenarios:**
- Boundary values: BP at exactly 140/90, 139/89, 141/89; HbA1c at 9.0, 8.9, 9.1
- Same-day multiple readings: Must select lowest SBP with corresponding lowest DBP
- Missing data: null vitals and/or null HbA1c
- Single-condition patients: HTN only (CMS122 N/A) or diabetes only (CMS165 N/A)
- No conditions: Neither measure applicable
- Dual gaps: Both BP and HbA1c failing simultaneously

### guardrails.jsonl

Tests input guardrail classification — should the agent block or allow the prompt?

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Case identifier (gr-01 to gr-16) |
| `category` | string | Always `"guardrail"` |
| `prompt` | string | User input to classify |
| `should_block` | boolean | `true` = agent should refuse, `false` = agent should process |

**Blocked categories:** General knowledge, creative writing, jailbreak/role-switching attempts, translation, coding, financial advice, jokes.

**Allowed categories:** Blood pressure queries, care gap alerts, HbA1c trends, lab orders, followup creation, Medicare coverage questions.

### tool_selection.jsonl

Tests that the agent routes clinical queries to the correct tools.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Case identifier (ts-01 to ts-12) |
| `category` | string | Always `"tool_selection"` |
| `prompt` | string | Clinical query from user |
| `expected_tools` | string[] | Tools that MUST be called |
| `must_not_call` | string[] | Tools that must NOT be called (safety check) |

**Tools covered:** `get_high_risk_patients`, `get_latest_vitals`, `run_risk_assessment`, `get_open_alerts`, `get_work_queue`, `get_adherence_summary`, `search_patients`, `get_cohort_summary`, `get_active_medications`, `get_active_problems`, `get_vital_history`, `get_coverage_summary`

### conversations.jsonl

Tests multi-turn conversation quality with context maintenance and guardrail persistence.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Case identifier (ms-01 to ms-10) |
| `category` | string | Always `"conversation"` |
| `description` | string | Workflow being tested |
| `turns` | object[] | Ordered conversation turns |
| `turns[].message` | string | User message for this turn |
| `turns[].check.must_contain_any` | string[] | Response must contain at least one keyword |
| `turns[].check.must_use_tools` | boolean | Whether tool calls are expected |
| `turns[].check.must_be_blocked` | boolean | Whether guardrail should block this turn |
| `turns[].check.must_not_be_blocked` | boolean | Whether guardrail must NOT block this turn |

**Key workflows tested:**
- Patient investigation (overview → drill-down → gap analysis)
- Alert review with recommendations
- Guardrail persistence (valid query → jailbreak → valid query)
- Coverage-aware care planning
- Medication adherence review
- Lab ordering workflow
- Sequential jailbreak resistance

## CMS Measure Specifications

This dataset tests compliance with two CMS quality measures used in the Merit-based Incentive Payment System (MIPS):

**CMS165v13 — Controlling High Blood Pressure**
- Denominator: Patients 18-85 with hypertension diagnosis
- Numerator: Most recent BP < 140/90 mmHg
- Same-day rule: When multiple readings exist on the most recent date, use the lowest systolic with corresponding lowest diastolic
- Exclusions: ESRD, kidney transplant, hospice, pregnancy

**CMS122v12 — Diabetes: Hemoglobin A1c Poor Control**
- Denominator: Patients 18-75 with diabetes diagnosis
- Numerator (inverse): Most recent HbA1c > 9.0% OR no HbA1c on file
- Note: This is an inverse measure — being in the numerator means POOR control

## Running the Evals

```bash
# Deterministic only (no backend needed) — care gaps + guardrails
cd evals && python run_evals.py

# Full suite including live agent tests
cd evals && python run_evals.py --live
```

## Baseline Results

| Eval | Passed | Failed | Accuracy |
|------|--------|--------|----------|
| Care Gaps (deterministic) | 22/22 | 0 | 100.0% |
| Guardrails (deterministic) | 16/16 | 0 | 100.0% |
| Tool Selection (live) | 12/12 | 0 | 100.0% |
| Conversation Quality (live) | 10/10 | 0 | 100.0% |

## Citation

```bibtex
@dataset{caregap_clinical_eval_2026,
  title={CareGap Clinical Agent Eval: Evaluation Dataset for Healthcare AI Agents},
  author={Daniel Argaez},
  year={2026},
  url={https://github.com/PlntGoblin/Chronic-Care-Risk-Detector},
  note={60 test cases covering CMS measure logic, agent guardrails, tool selection, and multi-turn conversation quality}
}
```

## License

Apache 2.0

## Disclaimer

All patient data in this dataset is synthetic. No real protected health information (PHI) is used. This dataset is intended for evaluating clinical AI systems and does not constitute medical advice.
