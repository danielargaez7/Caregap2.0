/* ═══════════════════════════════════════════════
   MedAssist Verification Layer
   5 verification types for high-stakes clinical domain
   Pattern: ToolResult(status, data, verification)
   ═══════════════════════════════════════════════ */

// ─── Core Interfaces ───────────────────────────

export interface VerificationResult {
  passed: boolean;
  confidence: number; // 0–1
  warnings: string[];
  errors: string[];
  sources: string[];
  verification_types: string[];
  requires_human_review: boolean;
  human_review_reason?: string;
}

export interface VerifiedToolResult<T> {
  status: "verified" | "warning" | "failed";
  data: T;
  verification: VerificationResult;
}

// ─── Type 1: Fact Checking ─────────────────────
// Cross-reference against authoritative sources (FDA, drug DBs, clinical guidelines)

interface FactCheckInput {
  items: string[];
  knownDatabase: string[];
  domain: string;
  sourceName: string;
}

interface FactCheckResult {
  matched: string[];
  unmatched: string[];
  coverage: number;
  sources: string[];
}

export function factCheck({ items, knownDatabase, domain, sourceName }: FactCheckInput): FactCheckResult {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const knownNormalized = knownDatabase.map(normalize);

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const item of items) {
    const norm = normalize(item);
    if (knownNormalized.some((k) => k.includes(norm) || norm.includes(k))) {
      matched.push(item);
    } else {
      unmatched.push(item);
    }
  }

  const coverage = items.length > 0 ? matched.length / items.length : 0;

  return {
    matched,
    unmatched,
    coverage,
    sources: [`${sourceName} (${domain})`, `MedAssist Clinical Database v2.1`],
  };
}

// ─── Type 2: Hallucination Detection ───────────
// Flag unsupported claims, require source attribution

interface HallucinationCheckInput {
  claims: { claim: string; supportedByData: boolean }[];
}

interface HallucinationCheckResult {
  allSupported: boolean;
  unsupportedClaims: string[];
  supportedCount: number;
  totalClaims: number;
}

export function detectHallucination({ claims }: HallucinationCheckInput): HallucinationCheckResult {
  const unsupported = claims.filter((c) => !c.supportedByData).map((c) => c.claim);

  return {
    allSupported: unsupported.length === 0,
    unsupportedClaims: unsupported,
    supportedCount: claims.length - unsupported.length,
    totalClaims: claims.length,
  };
}

// ─── Type 3: Confidence Scoring ────────────────
// Quantify certainty (0–1), surface low-confidence results

interface ConfidenceInput {
  dataCompleteness: number; // 0–1: how much relevant data was available
  sourceReliability: number; // 0–1: how trustworthy the source
  matchQuality: number; // 0–1: how well query matched database
}

export function computeConfidence({ dataCompleteness, sourceReliability, matchQuality }: ConfidenceInput): number {
  // Weighted average: source reliability matters most in healthcare
  const raw = sourceReliability * 0.4 + matchQuality * 0.35 + dataCompleteness * 0.25;
  return Math.round(raw * 100) / 100; // 2 decimal places
}

// ─── Type 4: Domain Constraints ────────────────
// Enforce healthcare business rules (max dosage, severe interactions, contraindications)

interface DomainConstraintInput {
  hasSevereInteractions?: boolean;
  hasAllergyConflicts?: boolean;
  hasEmergentCondition?: boolean;
  requiresPriorAuth?: boolean;
  outOfRangeValues?: string[];
}

interface DomainConstraintResult {
  passed: boolean;
  violations: string[];
}

export function checkDomainConstraints(input: DomainConstraintInput): DomainConstraintResult {
  const violations: string[] = [];

  if (input.hasSevereInteractions) {
    violations.push("DOMAIN RULE VIOLATION: Severe drug-drug interaction detected — requires clinical review before proceeding");
  }
  if (input.hasAllergyConflicts) {
    violations.push("DOMAIN RULE VIOLATION: Known allergen conflict — medication MUST NOT be prescribed");
  }
  if (input.hasEmergentCondition) {
    violations.push("DOMAIN RULE VIOLATION: Emergent condition identified — immediate clinical assessment required");
  }
  if (input.requiresPriorAuth) {
    violations.push("DOMAIN RULE: Prior authorization required — cannot proceed without insurer approval");
  }
  if (input.outOfRangeValues && input.outOfRangeValues.length > 0) {
    violations.push(`DOMAIN RULE: Out-of-range lab values detected: ${input.outOfRangeValues.join(", ")}`);
  }

  return { passed: violations.length === 0, violations };
}

// ─── Type 5: Human-in-the-Loop ─────────────────
// Escalation for high-risk decisions

type Severity = "low" | "moderate" | "high" | "critical";
type Stakes = "low" | "medium" | "high";

interface HumanReviewInput {
  confidence: number;
  severity: Severity;
  stakes: Stakes;
}

interface HumanReviewResult {
  required: boolean;
  reason: string;
}

export function requiresHumanReview({ confidence, severity, stakes }: HumanReviewInput): HumanReviewResult {
  // Always escalate critical severity
  if (severity === "critical") {
    return { required: true, reason: "Critical severity — requires immediate clinician review" };
  }

  // Low confidence + high stakes
  if (confidence < 0.6 && stakes === "high") {
    return { required: true, reason: `Low confidence (${confidence}) on high-stakes decision — clinician review required` };
  }

  // High severity + any uncertainty
  if (severity === "high" && confidence < 0.8) {
    return { required: true, reason: `High severity with moderate confidence (${confidence}) — recommend clinician verification` };
  }

  // Moderate severity + high stakes
  if (severity === "moderate" && stakes === "high") {
    return { required: true, reason: "Moderate severity on high-stakes decision — clinician review recommended" };
  }

  return { required: false, reason: "Within automated handling parameters" };
}

// ─── Composite Verifier ────────────────────────
// Combines all applicable verification types into a single VerifiedToolResult

interface VerifyOptions {
  factCheck?: FactCheckInput;
  hallucinationCheck?: HallucinationCheckInput;
  confidenceInput?: ConfidenceInput;
  domainConstraints?: DomainConstraintInput;
  humanReviewInput?: HumanReviewInput;
}

export function verify<T>(data: T, options: VerifyOptions): VerifiedToolResult<T> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sources: string[] = [];
  const verificationTypes: string[] = [];
  let confidence = 1.0;
  let passed = true;
  let needsHumanReview = false;
  let humanReviewReason: string | undefined;

  // 1. Fact Checking
  if (options.factCheck) {
    verificationTypes.push("fact_check");
    const result = factCheck(options.factCheck);
    sources.push(...result.sources);

    if (result.unmatched.length > 0) {
      warnings.push(`Fact check: ${result.unmatched.length} item(s) not found in ${options.factCheck.sourceName}: ${result.unmatched.join(", ")}`);
    }
    if (result.coverage < 0.5) {
      errors.push(`Fact check: Low database coverage (${Math.round(result.coverage * 100)}%) — results may be incomplete`);
      passed = false;
    }
  }

  // 2. Hallucination Detection
  if (options.hallucinationCheck) {
    verificationTypes.push("hallucination_detection");
    const result = detectHallucination(options.hallucinationCheck);

    if (!result.allSupported) {
      errors.push(`Hallucination detection: ${result.unsupportedClaims.length} unsupported claim(s) flagged: ${result.unsupportedClaims.join("; ")}`);
      passed = false;
    }
    sources.push("Patient EHR records", "Clinical knowledge base");
  }

  // 3. Confidence Scoring
  if (options.confidenceInput) {
    verificationTypes.push("confidence_scoring");
    confidence = computeConfidence(options.confidenceInput);

    if (confidence < 0.4) {
      errors.push(`Confidence score critically low (${confidence}) — results should not be used without clinician review`);
      passed = false;
    } else if (confidence < 0.7) {
      warnings.push(`Confidence score moderate (${confidence}) — recommend clinician verification`);
    }
  }

  // 4. Domain Constraints
  if (options.domainConstraints) {
    verificationTypes.push("domain_constraints");
    const result = checkDomainConstraints(options.domainConstraints);

    if (!result.passed) {
      errors.push(...result.violations);
      passed = false;
    }
  }

  // 5. Human-in-the-Loop
  if (options.humanReviewInput) {
    verificationTypes.push("human_in_the_loop");
    // Use the already-computed confidence if available
    const reviewInput = { ...options.humanReviewInput, confidence };
    const result = requiresHumanReview(reviewInput);

    if (result.required) {
      needsHumanReview = true;
      humanReviewReason = result.reason;
      warnings.push(`Escalation: ${result.reason}`);
    }
  }

  // Determine overall status
  const status: "verified" | "warning" | "failed" =
    !passed ? "failed" :
    warnings.length > 0 || needsHumanReview ? "warning" :
    "verified";

  return {
    status,
    data,
    verification: {
      passed,
      confidence,
      warnings,
      errors,
      sources,
      verification_types: verificationTypes,
      requires_human_review: needsHumanReview,
      human_review_reason: humanReviewReason,
    },
  };
}
