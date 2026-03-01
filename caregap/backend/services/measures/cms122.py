"""CMS122v12 — Diabetes: Hemoglobin A1c (HbA1c) Poor Control (> 9%)

Spec: https://ecqi.healthit.gov/sites/default/files/ecqm/measures/CMS122v12.html

Numerator (POOR CONTROL = gap): Most recent HbA1c > 9% OR missing/not performed
in the measurement period. Missing labs count AGAINST you.

- Multiple results same day: use the lowest result.
- Eligibility: Age 18-75, diabetes diagnosis (ICD-10 E10-E13), qualifying encounter.
- Exclusions: Hospice, advanced illness/frailty in 65+.

LOINC for HbA1c: 4548-4
"""
from __future__ import annotations

from datetime import date, datetime
from dataclasses import dataclass, field

SPEC_VERSION = "12.0.000"
HBAC1_LOINC = "4548-4"
POOR_CONTROL_THRESHOLD = 9.0

# ICD-10 codes for diabetes
DIABETES_ICD10_PREFIXES = ("E10", "E11", "E12", "E13")


@dataclass
class CMS122Result:
    eligible: bool = False
    poor_control: bool = False
    hba1c_missing: bool = False
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


def _has_diabetes_diagnosis(problems: list) -> bool:
    for p in problems:
        diag = p.get("diagnosis", "") or p.get("code", "") or ""
        title = (p.get("title", "") or "").upper()

        for prefix in DIABETES_ICD10_PREFIXES:
            if prefix in diag:
                return True

        if "DIABETES" in title or "DM " in title or "TYPE 2" in title or "TYPE 1" in title:
            return True

    return False


def _check_exclusions(problems: list, age: int) -> str | None:
    for p in problems:
        diag = p.get("diagnosis", "") or p.get("code", "") or ""
        title = (p.get("title", "") or "").upper()

        if "Z51.5" in diag or "HOSPICE" in title:
            return "hospice"
        if "PALLIATIVE" in title:
            return "palliative_care"

    return None


def _find_most_recent_hba1c(
    labs: list,
    period_start: date,
    period_end: date,
) -> dict | None:
    """Find most recent HbA1c in measurement period.

    Multiple same-day results: use the lowest per CMS122 guidance.
    """
    hba1c_results = []

    for lab in labs:
        # Check if this is an HbA1c result
        result_code = lab.get("result_code", "") or lab.get("loinc", "") or ""
        result_text = (lab.get("result_text", "") or lab.get("description", "") or "").upper()
        test_name = (lab.get("name", "") or lab.get("procedure_name", "") or "").upper()

        is_hba1c = (
            HBAC1_LOINC in result_code
            or "A1C" in result_text
            or "A1C" in test_name
            or "HEMOGLOBIN A1C" in test_name
            or "HBA1C" in test_name
        )
        if not is_hba1c:
            continue

        lab_date = _parse_date(lab.get("date") or lab.get("date_report"))
        if not lab_date or lab_date < period_start or lab_date > period_end:
            continue

        # Parse the numeric result
        result_value = lab.get("result")
        if result_value is None:
            continue

        try:
            value = float(str(result_value).replace("%", "").strip())
        except (ValueError, TypeError):
            continue

        hba1c_results.append({
            "value": value,
            "date": lab_date,
            "result_id": lab.get("id") or lab.get("uuid", ""),
            "loinc": result_code,
            "units": lab.get("units", "%"),
        })

    if not hba1c_results:
        return None

    # Sort by date descending
    hba1c_results.sort(key=lambda r: r["date"], reverse=True)
    most_recent_date = hba1c_results[0]["date"]

    # Same day: use lowest result per CMS122
    same_day = [r for r in hba1c_results if r["date"] == most_recent_date]
    lowest = min(same_day, key=lambda r: r["value"])

    return {
        "value": lowest["value"],
        "date": lowest["date"].isoformat(),
        "result_id": lowest["result_id"],
        "loinc": lowest["loinc"],
        "units": lowest["units"],
        "results_on_date": len(same_day),
    }


def evaluate_cms122(
    patient: dict,
    labs: list,
    problems: list,
    encounters: list,
    measurement_period_start: date,
    measurement_period_end: date,
) -> CMS122Result:
    """Run CMS122v12 logic against a patient's clinical data."""
    result = CMS122Result()

    # Age check: 18-75
    dob = _parse_date(patient.get("DOB") or patient.get("birth_date"))
    if not dob:
        result.evidence = {"reason": "Missing date of birth"}
        return result

    age_at_end = (measurement_period_end - dob).days // 365
    if age_at_end < 18 or age_at_end > 75:
        result.evidence = {"reason": f"Age {age_at_end} outside 18-75 range"}
        return result

    # Qualifying encounter
    has_encounter = False
    for enc in encounters:
        enc_date = _parse_date(enc.get("date"))
        if enc_date and measurement_period_start <= enc_date <= measurement_period_end:
            has_encounter = True
            break

    if not has_encounter:
        result.evidence = {"reason": "No qualifying encounter in measurement period"}
        return result

    # Diabetes diagnosis
    if not _has_diabetes_diagnosis(problems):
        result.evidence = {"reason": "No diabetes diagnosis found"}
        return result

    result.eligible = True

    # Exclusions
    exclusion = _check_exclusions(problems, age_at_end)
    if exclusion:
        result.exclusion_reason = exclusion
        result.evidence = {"exclusion": exclusion}
        return result

    # Find most recent HbA1c
    hba1c = _find_most_recent_hba1c(labs, measurement_period_start, measurement_period_end)

    if hba1c is None:
        # Missing HbA1c = POOR CONTROL per CMS122
        result.poor_control = True
        result.hba1c_missing = True
        result.gap_detected = True
        result.evidence = {
            "status": "missing",
            "message": "No HbA1c result in measurement period — treated as poor control per CMS122 spec",
            "loinc": HBAC1_LOINC,
            "lookback_days": (measurement_period_end - measurement_period_start).days,
        }
        return result

    # Evaluate: > 9% = poor control
    is_poor = hba1c["value"] > POOR_CONTROL_THRESHOLD
    result.poor_control = is_poor
    result.gap_detected = is_poor
    result.evidence = {
        "status": "poor_control" if is_poor else "controlled",
        "value": hba1c["value"],
        "date": hba1c["date"],
        "result_id": hba1c["result_id"],
        "loinc": hba1c["loinc"],
        "units": hba1c["units"],
        "threshold": f"> {POOR_CONTROL_THRESHOLD}%",
        "results_on_date": hba1c["results_on_date"],
    }
    return result
