"""Composite risk scorer — combines CMS165 and CMS122 gap results
with optional adherence data into a single risk score and band.

Scoring weights:
- BP uncontrolled/missing (CMS165 gap):   0.25
- HbA1c poor control/missing (CMS122 gap): 0.25
- High-severity condition diagnosis:       0.15
- Medication non-adherence (claims):       0.15
- Recency of last visit:                   0.10
- Dual-gap multiplier:                     0.10
"""
from __future__ import annotations

from datetime import date
from dataclasses import dataclass

from services.measures.cms165 import CMS165Result
from services.measures.cms122 import CMS122Result


@dataclass
class RiskScore:
    score: float  # 0.0 - 1.0
    risk_band: str  # low, medium, high, critical
    components: dict  # Breakdown of what contributed


def _visit_recency_score(encounters: list, period_end: date) -> float:
    """Score based on how recently the patient was seen. 0 = very recent, 1 = long ago."""
    if not encounters:
        return 1.0

    dates = []
    for enc in encounters:
        d = enc.get("date")
        if isinstance(d, str):
            try:
                from datetime import datetime
                dates.append(datetime.fromisoformat(d.replace("Z", "+00:00")).date())
            except (ValueError, TypeError):
                continue
        elif isinstance(d, date):
            dates.append(d)

    if not dates:
        return 1.0

    most_recent = max(dates)
    days_since = (period_end - most_recent).days

    if days_since <= 30:
        return 0.0
    elif days_since <= 90:
        return 0.25
    elif days_since <= 180:
        return 0.5
    elif days_since <= 365:
        return 0.75
    else:
        return 1.0


# Condition severity map — highest severity per ICD-10 prefix
# Values represent additional risk contribution (0.0 - 1.0)
CONDITION_SEVERITY = {
    "C":     1.0,    # Active cancer (any)
    "Z85":   0.7,    # Personal history of cancer
    "I50":   0.9,    # Heart failure
    "N18.5": 0.9,    # CKD Stage 5
    "N18.4": 0.8,    # CKD Stage 4
    "N18.3": 0.7,    # CKD Stage 3
    "J44":   0.6,    # COPD
    "J43":   0.6,    # Emphysema
    "F32":   0.4,    # Major depressive episode
    "F33":   0.5,    # Recurrent depression
    "F17":   0.3,    # Nicotine dependence
}


def _condition_severity_score(problems: list | None) -> tuple[float, list[str]]:
    """Compute max severity from problem list. Returns (score, matched_codes)."""
    if not problems:
        return 0.0, []

    max_severity = 0.0
    matched = []

    for p in problems:
        code = (p.get("diagnosis", "") or p.get("code", "") or "").strip()
        if not code:
            continue

        for prefix, severity in CONDITION_SEVERITY.items():
            if code.startswith(prefix):
                if severity > max_severity:
                    max_severity = severity
                matched.append(code)
                break

    return max_severity, matched


def compute_risk_score(
    cms165: CMS165Result,
    cms122: CMS122Result,
    encounters: list,
    measurement_period_end: date,
    adherence_pdc: float | None = None,
    problems: list | None = None,
) -> RiskScore:
    """Compute composite risk score from measure results."""

    # Component scores (0 = no risk, 1 = max risk)
    bp_score = 0.0
    if cms165.eligible and not cms165.exclusion_reason:
        bp_score = 1.0 if cms165.gap_detected else 0.0

    a1c_score = 0.0
    if cms122.eligible and not cms122.exclusion_reason:
        a1c_score = 1.0 if cms122.gap_detected else 0.0

    adherence_score = 0.0
    if adherence_pdc is not None:
        # PDC < 0.8 = non-adherent
        if adherence_pdc < 0.5:
            adherence_score = 1.0
        elif adherence_pdc < 0.8:
            adherence_score = 0.6
        else:
            adherence_score = 0.0

    recency = _visit_recency_score(encounters, measurement_period_end)

    # Dual-gap multiplier: having both BP and A1c issues is worse than either alone
    dual_gap = 1.0 if (bp_score > 0 and a1c_score > 0) else 0.0

    # Condition severity from problem list
    cond_severity, matched_codes = _condition_severity_score(problems)

    # Weighted composite
    raw_score = (
        0.25 * bp_score
        + 0.25 * a1c_score
        + 0.15 * cond_severity
        + 0.15 * adherence_score
        + 0.10 * recency
        + 0.10 * dual_gap
    )

    # Clamp to 0-1
    score = max(0.0, min(1.0, raw_score))

    # Risk band
    if score < 0.25:
        band = "low"
    elif score < 0.50:
        band = "medium"
    elif score < 0.75:
        band = "high"
    else:
        band = "critical"

    return RiskScore(
        score=round(score, 3),
        risk_band=band,
        components={
            "bp_gap": bp_score,
            "a1c_gap": a1c_score,
            "condition_severity": cond_severity,
            "condition_codes": matched_codes,
            "adherence": adherence_score,
            "visit_recency": recency,
            "dual_gap": dual_gap,
            "adherence_pdc": adherence_pdc,
        },
    )
