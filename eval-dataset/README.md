# medassist-eval

Clinical AI evaluation dataset — **85 test cases** for healthcare agent benchmarking and testing.

Built from the [MedAssist](https://github.com/medassist) clinical AI assistant test suite. Use these cases to evaluate drug interaction checkers, lab interpreters, dosing validators, and other healthcare AI tools.

## Install

```bash
npm install medassist-eval
```

## Quick Start

```typescript
import { allCases, getCasesByCategory, getCasesByTag } from "medassist-eval";

// All 85 cases
console.log(allCases.length); // 85

// Filter by category
const drugCases = getCasesByCategory("drug_interaction"); // 5 cases

// Filter by tag
const criticalCases = getCasesByTag("safety"); // safety-tagged cases

// Filter by severity
import { getCasesBySeverity } from "medassist-eval";
const critical = getCasesBySeverity("critical"); // critical severity cases
```

## Categories

| Category | Cases | Description |
|----------|-------|-------------|
| `drug_interaction` | 5 | Allergy cross-reactivity, NSAID conflicts, RAAS blockade, verification failures |
| `dosing_validation` | 5 | Dose range checks, indication-specific dosing, max dose limits |
| `lab_interpretation` | 5 | Reference range analysis, trend detection, medication-lab correlations |
| `medication_reconciliation` | 6 | Chart vs EHR discrepancies, therapy gaps, duration alerts |
| `symptom_lookup` | 5 | Symptom-to-condition mapping, urgency triage, escalation rules |
| `insurance_coverage` | 5 | Prior auth, formulary tiers, step therapy, cost estimation |
| `provider_search` | 4 | Specialty matching, availability filtering, distance-based search |
| `appointment_availability` | 4 | Slot finding, conflict detection, scheduling constraints |
| `verification_layer` | 12 | 5-layer verification system (fact check, hallucination, confidence, domain, human-in-the-loop) |
| `patient_data_integrity` | 20 | Reference ranges, body system scores, lab trends, BP readings, medication timeline |
| `clinical_calculation` | 9 | ASCVD risk, penicillin cross-reactivity, input validation |
| `utility_function` | 3 | Time formatting, display helpers |

## Case Format

Each case follows this structure:

```typescript
interface EvalCase {
  id: string;                    // e.g. "drug-interaction-001"
  category: EvalCategory;        // one of 12 categories
  name: string;                  // human-readable test name
  description: string;           // what this case validates
  input: Record<string, any>;    // tool input parameters
  expected: {
    assertions: Assertion[];     // what to check in output
  };
  metadata: {
    severity: "critical" | "high" | "medium" | "low";
    clinical_domain: string;     // e.g. "Pharmacology", "Cardiology"
    tags: string[];              // searchable tags
  };
}
```

### Assertion Operators

| Operator | Description |
|----------|-------------|
| `equals` | Exact match (primitives or arrays) |
| `contains` | String/array contains value |
| `greater_than` | Numeric greater than |
| `less_than` | Numeric less than |
| `greater_than_or_equal` | Numeric >= |
| `less_than_or_equal` | Numeric <= |
| `is_true` | Boolean true |
| `is_false` | Boolean false |
| `is_defined` | Value is not undefined/null |
| `includes_item` | Array includes specific item |
| `every_item_satisfies` | All array items meet condition |

## Severity Distribution

- **Critical**: 8 cases — patient safety risks requiring immediate action
- **High**: 12 cases — significant clinical impact
- **Medium**: 25 cases — moderate clinical relevance
- **Low**: 40 cases — validation and structural checks

## Clinical Domains

Pharmacology, Emergency Medicine, Cardiology, Nephrology, Laboratory Medicine, Hepatology, ENT, Medication Safety, Insurance, Clinical Assessment, Inflammatory, and more.

## Example: Running Evals

```typescript
import { allCases } from "medassist-eval";

for (const testCase of allCases) {
  const result = await yourAgent.execute(testCase.input);

  for (const assertion of testCase.expected.assertions) {
    const actual = getNestedValue(result, assertion.field);

    switch (assertion.operator) {
      case "equals":
        assert.deepEqual(actual, assertion.value);
        break;
      case "contains":
        assert(actual.includes(assertion.value));
        break;
      case "is_true":
        assert(actual === true);
        break;
      // ... handle other operators
    }
  }
}
```

## API

### Exports

- `allCases` — all 85 cases as a flat array
- `getCasesByCategory(category)` — filter by category
- `getCasesByTag(tag)` — filter by tag
- `getCasesBySeverity(severity)` — filter by severity level
- `getCasesByDomain(domain)` — search by clinical domain
- `getDatasetSummary()` — stats: total cases, category counts, severity counts, domain counts

### Individual Category Exports

```typescript
import {
  drugInteractionCases,
  dosingValidationCases,
  labInterpretationCases,
  medicationReconciliationCases,
  symptomLookupCases,
  insuranceCoverageCases,
  providerSearchCases,
  appointmentAvailabilityCases,
  verificationLayerCases,
  patientDataIntegrityCases,
  clinicalCalculationCases,
  utilityFunctionCases,
} from "medassist-eval";
```

## License

MIT
