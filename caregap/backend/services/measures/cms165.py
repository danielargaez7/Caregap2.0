"""CMS165v13 — Controlling High Blood Pressure

Spec: https://ecqi.healthit.gov/sites/default/files/ecqm/measures/CMS165v13.html

Numerator: Most recent BP during measurement period has SBP < 140 AND DBP < 90.
- Multiple readings same day: use lowest systolic + lowest diastolic.
- No BP recorded in measurement period: patient is NOT controlled (counts against).

Eligibility: Age 18-85 at end of measurement period, essential hypertension diagnosis
(ICD-10 I10-I16) overlapping measurement period, qualifying encounter in period.

Exclusions: ESRD, kidney transplant, hospice, palliative care, pregnancy.
"""
from __future__ import annotations

from datetime import date, datetime
from dataclasses import dataclass, field

SPEC_VERSION = "13.0.000"

# ICD-10 codes for essential hypertension
HTN_ICD10_PREFIXES = ("I10", "I11", "I12", "I13", "I15", "I16")

# Exclusion diagnosis prefixes
EXCLUSION_PREFIXES = {
    "esrd": ("N18.6",),
    "kidney_transplant": ("Z94.0",),
    "hospice": ("Z51.5",),
    "pregnancy": ("O0", "O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "O9", "Z33", "Z34"),
}


@dataclass
class CMS165Result:
    eligible: bool = False
    controlled: bool = False
    exclusion_reason: str | None = None
    evidence: dict = field(default_factory=dict)
    gap_detected: bool = False
    spec_version: str = SPEC_VERSION


def _parse_date(d) -> date | None:
    if isinstance(d, date):
        return d
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, str):
        try:
            return datetime.fromisoformat(d.replace("Z", "+00:00")).date()
        except (ValueError, TypeError):
            return None
    return None


def _has_htn_diagnosis(problems: list) -> bool:
    """Check if patient has essential hypertension on their problem list."""
    for p in problems:
        diag = p.get("diagnosis", "") or p.get("code", "") or ""
        title = (p.get("title", "") or "").upper()

        # Check ICD-10 code in diagnosis or code field
        for prefix in HTN_ICD10_PREFIXES:
            if prefix in diag:
                return True

        # Fallback: check title text
        if "HYPERTENSION" in title or "HTN" in title:
            return True

    return False


def _check_exclusions(problems: list) -> str | None:
    """Check for exclusion diagnoses."""
    for p in problems:
        diag = (p.get("diagnosis", "") or p.get("code", "") or "").upper()
        title = (p.get("title", "") or "").upper()

        for reason, prefixes in EXCLUSION_PREFIXES.items():
            for prefix in prefixes:
                prefix_upper = prefix.upper()
                # Check ICD-10 code: must start with prefix
                if diag.startswith(prefix_upper):
                    return reason
                # Check title: only match full words for short prefixes
                if len(prefix) >= 3 and prefix_upper in title:
                    return reason
    return None


def _get_most_recent_bp(
    vitals: list,
    period_start: date,
    period_end: date,
) -> dict | None:
    """Apply CMS165 rules to find the most recent BP reading.

    Multiple readings same day: use lowest SBP + lowest DBP.
    Returns the effective BP with evidence references.
    """
    # Filter to measurement period and valid BP readings
    period_readings = []
    for v in vitals:
        v_date = _parse_date(v.get("date"))
        if not v_date or v_date < period_start or v_date > period_end:
            continue

        bps = v.get("bps")
        bpd = v.get("bpd")
        if bps is None or bpd is None:
            continue

        try:
            bps = int(float(str(bps)))
            bpd = int(float(str(bpd)))
        except (ValueError, TypeError):
            continue

        if bps <= 0 or bpd <= 0:
            continue

        period_readings.append({
            "bps": bps,
            "bpd": bpd,
            "date": v_date,
            "vitals_id": v.get("id") or v.get("uuid", ""),
        })

    if not period_readings:
        return None

    # Sort by date descending to find most recent
    period_readings.sort(key=lambda r: r["date"], reverse=True)
    most_recent_date = period_readings[0]["date"]

    # Get all readings from the most recent date
    same_day = [r for r in period_readings if r["date"] == most_recent_date]

    # CMS165 rule: multiple readings same day → lowest SBP + lowest DBP
    lowest_sbp = min(r["bps"] for r in same_day)
    lowest_dbp = min(r["bpd"] for r in same_day)

    # Find the record IDs that contributed
    sbp_record = next(r for r in same_day if r["bps"] == lowest_sbp)
    dbp_record = next(r for r in same_day if r["bpd"] == lowest_dbp)

    return {
        "bps": lowest_sbp,
        "bpd": lowest_dbp,
        "date": most_recent_date.isoformat(),
        "readings_on_date": len(same_day),
        "vitals_id_sbp": sbp_record["vitals_id"],
        "vitals_id_dbp": dbp_record["vitals_id"],
    }


def evaluate_cms165(
    patient: dict,
    vitals: list,
    problems: list,
    encounters: list,
    measurement_period_start: date,
    measurement_period_end: date,
) -> CMS165Result:
    """Run CMS165v13 logic against a patient's clinical data.

    Returns a CMS165Result with eligibility, control status, and evidence.
    """
    result = CMS165Result()

    # Age check: 18-85 at end of measurement period
    dob = _parse_date(patient.get("DOB") or patient.get("birth_date"))
    if not dob:
        result.evidence = {"reason": "Missing date of birth"}
        return result

    age_at_end = (measurement_period_end - dob).days // 365
    if age_at_end < 18 or age_at_end > 85:
        result.evidence = {"reason": f"Age {age_at_end} outside 18-85 range"}
        return result

    # Check for qualifying encounter in measurement period
    has_encounter = False
    for enc in encounters:
        enc_date = _parse_date(enc.get("date"))
        if enc_date and measurement_period_start <= enc_date <= measurement_period_end:
            has_encounter = True
            break

    if not has_encounter:
        result.evidence = {"reason": "No qualifying encounter in measurement period"}
        return result

    # Check for HTN diagnosis
    if not _has_htn_diagnosis(problems):
        result.evidence = {"reason": "No hypertension diagnosis found"}
        return result

    # Patient is eligible for the measure
    result.eligible = True

    # Check exclusions
    exclusion = _check_exclusions(problems)
    if exclusion:
        result.exclusion_reason = exclusion
        result.evidence = {"exclusion": exclusion}
        return result

    # Get most recent BP using CMS165 rules
    bp = _get_most_recent_bp(vitals, measurement_period_start, measurement_period_end)

    if bp is None:
        # No BP recorded — CMS165 treats as NOT controlled
        result.controlled = False
        result.gap_detected = True
        result.evidence = {
            "status": "no_bp_recorded",
            "message": "No blood pressure reading in measurement period — treated as uncontrolled per CMS165 spec",
            "measurement_period": f"{measurement_period_start} to {measurement_period_end}",
        }
        return result

    # Evaluate control: SBP < 140 AND DBP < 90
    controlled = bp["bps"] < 140 and bp["bpd"] < 90
    result.controlled = controlled
    result.gap_detected = not controlled
    result.evidence = {
        "status": "controlled" if controlled else "uncontrolled",
        "bps": bp["bps"],
        "bpd": bp["bpd"],
        "date": bp["date"],
        "readings_on_date": bp["readings_on_date"],
        "vitals_id_sbp": bp["vitals_id_sbp"],
        "vitals_id_dbp": bp["vitals_id_dbp"],
        "threshold": "SBP < 140 AND DBP < 90",
    }
    return result
