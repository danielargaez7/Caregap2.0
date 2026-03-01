"""Guardrails — keeps the agent tightly scoped to chronic care risk detection.

Three layers:
1. Input filter: Pre-screen user messages before they reach Claude
2. System prompt: Hard scope boundary in the prompt itself
3. Output filter: Post-screen responses for off-topic content

Without these, users have full LLM access, which WILL get abused.
"""

import re
import logging

logger = logging.getLogger(__name__)

# Topics the agent IS allowed to discuss
ALLOWED_TOPICS = [
    # Clinical
    "patient", "blood pressure", "bp", "systolic", "diastolic", "hypertension", "htn",
    "diabetes", "hba1c", "a1c", "hemoglobin", "glucose", "lab", "vital", "medication",
    "prescription", "drug", "dose", "refill", "adherence", "compliance",
    # Measures and quality
    "cms165", "cms122", "ecqm", "mips", "quality", "measure", "performance",
    "gap", "care gap", "risk", "assessment", "score", "band",
    # Operational
    "alert", "followup", "follow-up", "task", "work queue", "outreach", "schedule",
    "visit", "encounter", "order", "lab order", "call",
    # Conditions and screenings
    "ckd", "kidney", "egfr", "copd", "lung", "heart", "cardiac", "depression",
    "phq", "cancer", "mammogram", "mammography", "colonoscopy", "screening",
    "vaccine", "pneumonia", "flu", "preventive", "wellness",
    # Coverage and cost
    "claims", "blue button", "medicare", "medicaid", "eob", "coverage",
    "part d", "pdc", "adherence", "cost", "copay", "coinsurance", "free",
    "covered", "insurance", "deductible",
    # System
    "help", "how", "what", "who", "which", "show", "list", "find", "search",
    "summary", "report", "dashboard", "status", "detail",
]

# Patterns that indicate prompt injection or off-topic abuse
BLOCKED_PATTERNS = [
    r"ignore\s+(your|previous|all)\s+(instructions|prompt|rules)",
    r"pretend\s+(you\s+are|to\s+be)",
    r"act\s+as\s+(if|a|an)",
    r"you\s+are\s+now",
    r"system\s*prompt",
    r"(talk|speak|respond)\s+(like|as)\s+a",
    r"write\s+(me\s+)?(a\s+)?(poem|story|song|essay|joke)",
    r"(what('s| is)\s+the\s+weather)",
    r"tell\s+me\s+(a\s+joke|about\s+(yourself|your))",
    r"(translate|convert)\s+.*(language|french|spanish|german)",
    r"(play|sing|dance|draw)",
    r"(recipe|cook|food|restaurant)",
    r"(stock|crypto|bitcoin|invest)",
    r"(movie|tv\s+show|music|game)",
    r"(code|program|script)\s+(me|a|an)\s+(?!.*patient)(?!.*health)(?!.*clinical)",
]

REFUSAL_MESSAGE = (
    "I can only help with chronic care risk detection and quality measure management. "
    "Please ask about patient risks, care gaps, alerts, followups, or clinical data."
)


def check_input(message: str) -> tuple[bool, str]:
    """Pre-screen user input. Returns (allowed, reason).

    If not allowed, returns the refusal message.
    """
    msg_lower = message.lower().strip()

    # Empty messages
    if len(msg_lower) < 2:
        return False, "Message too short."

    # Check for blocked patterns (prompt injection, off-topic)
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, msg_lower):
            logger.warning(f"Guardrail blocked (pattern match): {pattern}")
            return False, REFUSAL_MESSAGE

    # Check if message contains at least one allowed topic keyword
    has_relevant_keyword = any(topic in msg_lower for topic in ALLOWED_TOPICS)

    # Short messages that don't match any topic are suspicious
    if len(msg_lower) < 20 and not has_relevant_keyword:
        # Allow greetings and simple queries
        if msg_lower in ("hi", "hello", "hey", "help", "?"):
            return True, ""
        logger.warning(f"Guardrail blocked (no relevant keywords): {msg_lower[:50]}")
        return False, REFUSAL_MESSAGE

    # Longer messages get more leeway — the LLM system prompt handles the rest
    if len(msg_lower) >= 20 and not has_relevant_keyword:
        # Still allow through but log it — system prompt will handle refusal
        logger.info(f"Guardrail passed (long message, no keywords): {msg_lower[:50]}")
        return True, ""

    return True, ""


def check_output(response: str) -> tuple[bool, str]:
    """Post-screen agent output. Returns (allowed, cleaned_response).

    Catches cases where the agent was somehow manipulated into off-topic responses.
    """
    resp_lower = response.lower()

    # Check for common signs of jailbreak success
    jailbreak_indicators = [
        "as an ai language model",
        "i'm happy to help with anything",
        "sure, here's a poem",
        "once upon a time",
        "here's a joke",
        "the weather today",
    ]

    for indicator in jailbreak_indicators:
        if indicator in resp_lower:
            logger.warning(f"Output guardrail triggered: {indicator}")
            return False, REFUSAL_MESSAGE

    return True, response
