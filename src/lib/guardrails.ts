/**
 * Input guardrails for MedAssist AI — blocks off-topic and adversarial prompts
 * BEFORE they reach the LLM, saving API costs and ensuring consistent refusals.
 */

const REFUSAL_MESSAGE =
  "I'm MedAssist AI, a clinical decision support tool. I can only assist with healthcare-related questions about this patient's care. How can I help with your patient's medical needs?";

// Patterns that should be blocked (case-insensitive)
const BLOCK_PATTERNS: RegExp[] = [
  // Off-topic requests
  /\b(what('s| is)\s+the\s+weather)\b/i,
  /\b(recipe|recipes|cook|cooking|bake|baking)\b/i,
  /\b(stock|crypto|bitcoin|invest(ment|ing)?|trading)\b/i,
  /\b(sport|football|basketball|baseball|soccer|nfl|nba|mlb)\b/i,
  /\bwrite\s+(me\s+)?(a\s+)?(poem|story|song|essay|joke|code|script|program)\b/i,
  /\btell\s+me\s+(a\s+joke|about\s+(yourself|your))\b/i,
  /\b(trivia|riddle|puzzle|game|quiz)\b/i,

  // Roleplay / persona manipulation
  /\b(talk|speak|respond|write)\s+(like|as)\s+(a|an)\b/i,
  /\bpretend\s+(you\s+are|to\s+be|you're)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bact\s+as\s+(if|a|an)\b/i,
  /\b(roleplay|role[\s-]?play)\b/i,
  /\blike\s+a\s+pirate\b/i,

  // Prompt injection attempts
  /\bignore\s+(your\s+)?(previous|all|prior|above)\s+(instructions|rules|prompt)\b/i,
  /\bforget\s+(your|all|everything|prior)\b/i,
  /\bnew\s+(instructions|rules|persona|role)\b/i,
  /\boverride\s+(your|the|all)\b/i,
  /\bsystem\s*prompt/i,
  /\bjailbreak/i,
  /\bDAN\s+mode/i,

  // General-purpose assistant requests
  /\b(translate|convert)\s+.*\b(language|french|spanish|german|chinese|japanese)\b/i,
  /\b(what('s| is)\s+the\s+capital\s+of)\b/i,
  /\b(who\s+(is|was)\s+(the\s+)?(president|king|queen|prime\s+minister))\b/i,
  /\b(explain|tell me about)\s+(quantum|relativity|blockchain|machine learning|artificial intelligence)\b/i,
];

// Healthcare-related terms that indicate a legitimate clinical query
const CLINICAL_SIGNALS: RegExp[] = [
  /\b(patient|medication|drug|prescription|dose|dosage)\b/i,
  /\b(symptom|diagnosis|condition|disease|illness|disorder)\b/i,
  /\b(lab|labs|test|result|blood|a1c|hba1c|glucose|cholesterol)\b/i,
  /\b(vital|bp|blood\s+pressure|heart\s+rate|temperature|oxygen)\b/i,
  /\b(allergy|allergies|allergic|reaction|side\s+effect)\b/i,
  /\b(interaction|contraindic|warning|alert)\b/i,
  /\b(appointment|schedule|visit|referral|provider|doctor|nurse)\b/i,
  /\b(insurance|coverage|copay|deductible|prior\s+auth)\b/i,
  /\b(history|medical|clinical|health|care|treatment|therapy)\b/i,
  /\b(risk|assessment|screening|prevention|immunization|vaccine)\b/i,
  /\b(surgery|procedure|operation|hospitalization)\b/i,
  /\b(mental\s+health|depression|anxiety|phq|gad)\b/i,
  /\b(pain|ache|fever|cough|nausea|fatigue|dizz)/i,
];

/**
 * Check if a user message should be allowed through to the LLM.
 * Returns { allowed: true } for clinical queries, or { allowed: false, reason: string } for blocked ones.
 */
export function checkInput(message: string): { allowed: boolean; reason?: string } {
  const trimmed = message.trim();

  // Very short messages are fine (greetings, "yes", "no", etc.)
  if (trimmed.length < 5) {
    return { allowed: true };
  }

  // Check if message has strong clinical signals — if so, allow even if a block pattern matches
  const clinicalScore = CLINICAL_SIGNALS.filter((p) => p.test(trimmed)).length;
  if (clinicalScore >= 2) {
    return { allowed: true };
  }

  // Check block patterns
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(trimmed)) {
      // If there's at least one clinical signal, let it through (borderline case)
      if (clinicalScore >= 1) {
        return { allowed: true };
      }
      return { allowed: false, reason: REFUSAL_MESSAGE };
    }
  }

  return { allowed: true };
}

export { REFUSAL_MESSAGE };
