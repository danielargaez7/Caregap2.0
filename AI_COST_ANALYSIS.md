# AI Cost Analysis

## 1. Model Selection & Pricing

This system uses two OpenAI models, each selected for its specific workload:

| Component | Model | Input Cost | Output Cost | Cached Input | Rationale |
|-----------|-------|-----------|-------------|-------------|-----------|
| MedAssist (Clinical Chat) | GPT-4o | $2.50 / 1M tokens | $10.00 / 1M tokens | $1.25 / 1M tokens | Patient-safety-critical clinical reasoning requires highest capability |
| CareGap (Population Health) | GPT-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens | $0.075 / 1M tokens | Population-level summaries and structured tool outputs; 98% cheaper on input |

Both routes use the Vercel AI SDK v6 (`streamText`) with `stepCountIs(3)` limiting each query to a maximum of 3 tool-calling rounds before forcing a final response.

---

## 2. Per-Query Token Estimates

### MedAssist (GPT-4o) — Per Query

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | ~1,720 | Patient demographics, meds, allergies, history, vitals, visit notes (~6,891 chars) |
| Tool definitions | ~800 | 8 tools with Zod schemas and descriptions |
| User message | ~50 | Single clinician question |
| Conversation history | ~1,500 | Average across multi-turn session (3 prior exchanges) |
| **Step 1 input** | **~4,070** | System + tools + history + user message |
| Step 1 output | ~80 | Model selects tool and generates call |
| Tool result injected | ~300 | Structured JSON with verification object (~200 tokens of verification overhead) |
| **Step 2 input** | **~4,450** | Previous context + tool call + tool result |
| Step 2 output | ~400 | Final clinical response to clinician |
| **Total input** | **~8,520** | Sum of both steps |
| **Total output** | **~480** | Sum of both steps |

**Cost per MedAssist query: ~$0.026**
- Input: 8,520 / 1M × $2.50 = $0.0213
- Output: 480 / 1M × $10.00 = $0.0048

With prompt caching (system + tool defs cached after first call in session):
- Cached savings: ~2,520 tokens × 2 steps × 50% = ~$0.006
- **Effective cost per query: ~$0.020**

### CareGap (GPT-4o-mini) — Per Query

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt | ~530 | Population health role + formatting rules (~2,120 chars) |
| Tool definitions | ~600 | 8 tools with Zod schemas |
| User message | ~50 | Care coordinator question |
| Conversation history | ~1,000 | Shorter sessions than clinical chat |
| **Step 1 input** | **~2,180** | |
| Step 1 output | ~60 | Tool call |
| Tool result injected | ~250 | No verification layer (population health workflow) |
| **Step 2 input** | **~2,490** | |
| Step 2 output | ~350 | Population health summary |
| **Total input** | **~4,670** | |
| **Total output** | **~410** | |

**Cost per CareGap API query: ~$0.001**
- Input: 4,670 / 1M × $0.15 = $0.0007
- Output: 410 / 1M × $0.60 = $0.0002

**Preloaded response optimization:** CareGap includes 7 preloaded demo scenarios (highest-risk patients, open alerts, cohort summary, screenings, outreach, followups, full assessment) with animated playback. These match via fuzzy regex and require **zero API calls**. Estimated 70% of CareGap queries hit preloaded responses.

- **Effective cost per CareGap query: ~$0.0003** (blended with 70% preloaded at $0)

### Verification Overhead

The MedAssist 5-layer verification system (fact checking, hallucination detection, confidence scoring, domain constraints, human-in-the-loop escalation) runs entirely in local TypeScript — no additional LLM calls. Its cost impact is limited to the ~200 extra tokens per tool result (the `verification` JSON object) that get injected back into context:

- Additional input tokens per query: ~300 (200 tokens × 1.5 avg tool calls)
- Cost overhead: 300 / 1M × $2.50 = **$0.00075 per query (~3.7% overhead)**

CareGap tools have no verification layer, so zero verification overhead.

---

## 3. Development & Testing Costs

### LLM API Costs During Development

| Activity | API Calls | Model | Cost per Call | Total |
|----------|-----------|-------|--------------|-------|
| MedAssist iterative development & manual testing | ~800 | GPT-4o | $0.020 | $16.00 |
| CareGap iterative development & manual testing | ~150 | GPT-4o-mini | $0.001 | $0.15 |
| Prompt engineering & tuning (system prompts) | ~200 | GPT-4o | $0.020 | $4.00 |
| Tool calling integration testing | ~100 | GPT-4o | $0.020 | $2.00 |
| **Total development API cost** | **~1,250** | | | **$22.15** |

### Automated Test Suite — Zero API Cost

| Test Suite | Test Cases | API Calls | Cost |
|-----------|-----------|-----------|------|
| MedAssist Vitest evaluations | 69 tests across 15 suites | 0 | $0.00 |
| CareGap deterministic evals | Guardrails + tool selection + measure detection | 0 | $0.00 |

All 69 MedAssist tests (drug interactions, dosing validation, lab interpretation, verification layer, etc.) run against local deterministic functions — no LLM calls. CareGap evals (`run_evals.py`) are also deterministic by default.

### Total Tokens Consumed During Development

| Model | Input Tokens | Output Tokens | Total |
|-------|-------------|---------------|-------|
| GPT-4o | ~9.4M | ~528K | ~9.9M |
| GPT-4o-mini | ~700K | ~62K | ~762K |
| **Combined** | **~10.1M** | **~590K** | **~10.7M** |

### Observability Tool Costs

| Tool | Purpose | Development Cost |
|------|---------|-----------------|
| LangSmith | Run tracing, user feedback logging, conversation replay | $0 (free tier: 5K traces/month) |
| Braintrust | AI SDK auto-tracing wrapper | $0 (free tier) |
| **Total observability** | | **$0** |

### Total Development & Testing Cost: **~$22**

---

## 4. Production Cost Projections

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Queries per user per day | 5 | Clinicians average 3-7 AI-assisted lookups per shift |
| Operating days per month | 22 | Weekday clinical operations |
| Query split | 60% MedAssist / 40% CareGap | MedAssist used per-patient; CareGap used for panel reviews |
| MedAssist cost per query | $0.020 | GPT-4o with prompt caching |
| CareGap cost per query | $0.0003 | GPT-4o-mini, 70% preloaded |
| Average input tokens per query | ~8,520 (MedAssist) / ~4,670 (CareGap) | Includes system prompt, tools, history, tool results |
| Average output tokens per query | ~480 (MedAssist) / ~410 (CareGap) | Clinical response + tool calls |
| Tool call frequency | ~80% of queries invoke at least 1 tool | System prompt mandates tool use for clinical queries |
| Average tool calls per query | 1.5 | Most queries: 1 tool call; complex queries: 2-3 |
| Verification overhead | +3.7% on MedAssist input cost | ~300 additional tokens per query from verification JSON |

### Monthly Cost Projections

| | **100 Users** | **1,000 Users** | **10,000 Users** | **100,000 Users** |
|---|---|---|---|---|
| **Queries/month** | 11,000 | 110,000 | 1,100,000 | 11,000,000 |
| MedAssist queries | 6,600 | 66,000 | 660,000 | 6,600,000 |
| CareGap queries | 4,400 | 44,000 | 440,000 | 4,400,000 |
| | | | | |
| **MedAssist LLM cost** | $132 | $1,320 | $13,200 | $132,000 |
| **CareGap LLM cost** | $1.32 | $13.20 | $132 | $1,320 |
| **LLM subtotal** | **$133** | **$1,333** | **$13,332** | **$133,320** |
| | | | | |
| LangSmith (observability) | $0 (free tier) | $39 | $500 | $2,000 |
| Braintrust (tracing) | $0 | $0 | $100 | $500 |
| **Observability subtotal** | **$0** | **$39** | **$600** | **$2,500** |
| | | | | |
| **Total monthly cost** | **$133** | **$1,372** | **$13,932** | **$135,820** |
| **Cost per user/month** | **$1.33** | **$1.37** | **$1.39** | **$1.36** |
| **Cost per query** | **$0.012** | **$0.012** | **$0.013** | **$0.012** |

### Token Volume at Scale

| Scale | Monthly Input Tokens | Monthly Output Tokens | Total Tokens |
|-------|---------------------|----------------------|-------------|
| 100 users | ~75M | ~5M | ~80M |
| 1,000 users | ~750M | ~52M | ~802M |
| 10,000 users | ~7.5B | ~520M | ~8.0B |
| 100,000 users | ~75B | ~5.2B | ~80.2B |

---

## 5. Cost Optimization Strategies

### Currently Implemented

| Strategy | Savings | Details |
|----------|---------|--------|
| Model tiering | ~98% on CareGap input | GPT-4o-mini for population health; GPT-4o reserved for patient-safety-critical clinical queries |
| Preloaded responses | ~70% of CareGap queries at $0 | 7 demo scenarios with animated playback bypass the LLM entirely |
| Step count limiting | Caps runaway chains | `stepCountIs(3)` prevents unbounded multi-step tool loops |
| Local verification | $0 per verification | 5-layer verification runs in TypeScript, not via LLM |
| Input guardrails | Blocks wasted calls | Off-topic and adversarial inputs rejected before reaching the LLM |
| Temperature 0.3 | Reduces retries | Low temperature produces consistent clinical responses |

### Available at Scale

| Strategy | Potential Savings | Implementation |
|----------|------------------|----------------|
| Prompt caching | ~15-20% on input costs | OpenAI automatic caching for repeated system prompts (already priced in estimates) |
| Conversation summarization | ~30% on input costs | Summarize history beyond 5 turns instead of sending full transcript |
| Semantic caching | ~20-40% query reduction | Cache frequent identical queries (e.g., same patient, same question within shift) |
| Batch API | 50% discount | For non-real-time workloads (nightly panel risk assessments, bulk screenings) |
| Fine-tuned model | ~60% cost reduction | Fine-tune GPT-4o-mini on clinical Q&A to replace GPT-4o for routine queries |
| Tiered routing | ~40% overall savings | Use GPT-4o-mini for triage; escalate to GPT-4o only for complex clinical reasoning |

### Projected Optimized Costs at 100,000 Users

| Optimization | Monthly Savings | Optimized Cost |
|-------------|----------------|----------------|
| Base cost | — | $135,820 |
| + Conversation summarization | -$20,000 | $115,820 |
| + Semantic caching (25% hit rate) | -$28,955 | $86,865 |
| + Tiered routing (60% to mini) | -$31,550 | $55,315 |
| **Fully optimized** | **-$80,505** | **~$55,000/month** |

---

## 6. Summary

| Metric | Value |
|--------|-------|
| Development API cost | ~$22 |
| Development tokens consumed | ~10.7M |
| Development API calls | ~1,250 |
| Observability cost (dev) | $0 |
| Production cost per query | ~$0.012 (blended) |
| Production cost per user/month | ~$1.33 - $1.39 |
| Primary cost driver | MedAssist GPT-4o input tokens (99% of LLM spend) |
| Key optimization lever | Model tiering — route routine queries to GPT-4o-mini |

The system's cost structure is dominated by MedAssist's GPT-4o usage for clinical decision support. CareGap contributes less than 1% of total LLM costs due to GPT-4o-mini pricing and preloaded response optimization. At all scales, the per-user cost remains stable at ~$1.35/month, making costs linearly predictable. With the optimization strategies outlined above, the system can scale to 100,000 users at approximately $55,000/month — roughly $0.55 per user per month.
