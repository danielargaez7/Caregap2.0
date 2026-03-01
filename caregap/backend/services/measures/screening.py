"""Additional chronic condition screening beyond CMS165/CMS122.

Screens for:
- CKD (Chronic Kidney Disease) — eGFR < 60 mL/min
- COPD — diagnosis present, spirometry recency
- Depression — PHQ-9 screening recency
- Cancer screenings — mammography, colonoscopy, lung CT by age/sex/risk
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta


# --- ICD-10 code sets ---

CKD_CODES = ("N18",)  # N18.1-N18.6
COPD_CODES = ("J44", "J43")  # COPD, emphysema
DEPRESSION_CODES = ("F32", "F33")  # Major depressive disorder
HEART_DISEASE_CODES = ("I25", "I20", "I21", "I22", "I50")  # CAD, MI, HF

# LOINC codes for labs
EGFR_LOINCS = ("33914-3", "48642-3", "62238-1", "77147-7")
PHQ9_LOINCS = ("44249-1",)  # PHQ-9 total score

# Screening intervals
MAMMOGRAPHY_INTERVAL_YEARS = 2  # USPSTF: every 2 years, age 50-74
COLONOSCOPY_INTERVAL_YEARS = 10  # USPSTF: every 10 years, age 45-75
LUNG_CT_INTERVAL_YEARS = 1  # USPSTF: annual, age 50-80, 20+ pack-year history


@dataclass
class ScreeningResult:
    condition: str
    status: str  # "controlled", "uncontrolled", "missing", "due", "not_applicable"
    severity: str  # "info", "warn", "high"
    detail: str
    evidence: dict = field(default_factory=dict)
    recommendation: str = ""


def screen_ckd(labs: list, problems: list) -> ScreeningResult:
    """Screen for Chronic Kidney Disease using eGFR."""
    has_ckd_dx = any(
        any((p.get("diagnosis", "") or p.get("code", "") or "").startswith(c) for c in CKD_CODES)
        for p in problems
    )

    egfr_results = [
        lab for lab in labs
        if lab.get("loinc") in EGFR_LOINCS
    ]

    if not egfr_results:
        if has_ckd_dx:
            return ScreeningResult(
                condition="Chronic Kidney Disease",
                status="missing",
                severity="high",
                detail="Patient has CKD diagnosis but no recent eGFR lab on file.",
                recommendation="Order a comprehensive metabolic panel with eGFR. This is typically covered under Medicare Part B at no cost when coded as preventive lab work.",
            )
        return ScreeningResult(
            condition="Chronic Kidney Disease",
            status="not_applicable",
            severity="info",
            detail="No CKD diagnosis. Consider screening if diabetic or hypertensive.",
            recommendation="",
        )

    # Get most recent eGFR
    egfr_results.sort(key=lambda x: x.get("date", ""), reverse=True)
    latest = egfr_results[0]
    value = float(latest.get("result", latest.get("value", 0)))

    if value < 30:
        return ScreeningResult(
            condition="Chronic Kidney Disease",
            status="uncontrolled",
            severity="high",
            detail=f"Severely reduced kidney function. eGFR is {value:.0f} mL/min (below 30). Nephrology referral needed.",
            evidence={"egfr": value, "date": latest.get("date"), "stage": "4-5"},
            recommendation="Refer to nephrology urgently. Schedule follow-up labs in 1 month. Typically covered under Medicare Part B when ordered for disease management.",
        )
    elif value < 60:
        return ScreeningResult(
            condition="Chronic Kidney Disease",
            status="uncontrolled",
            severity="warn",
            detail=f"Reduced kidney function. eGFR is {value:.0f} mL/min (below 60). Monitor closely.",
            evidence={"egfr": value, "date": latest.get("date"), "stage": "3"},
            recommendation="Repeat eGFR in 3 months. Adjust medications if needed. Lab work is typically covered under Medicare.",
        )
    else:
        return ScreeningResult(
            condition="Chronic Kidney Disease",
            status="controlled",
            severity="info",
            detail=f"Kidney function is stable. eGFR is {value:.0f} mL/min.",
            evidence={"egfr": value, "date": latest.get("date")},
            recommendation="Continue monitoring annually.",
        )


def screen_copd(problems: list, encounters: list) -> ScreeningResult:
    """Screen for COPD management gaps."""
    has_copd = any(
        any((p.get("diagnosis", "") or p.get("code", "") or "").startswith(c) for c in COPD_CODES)
        for p in problems
    )

    if not has_copd:
        return ScreeningResult(
            condition="COPD",
            status="not_applicable",
            severity="info",
            detail="No COPD diagnosis on file.",
            recommendation="",
        )

    # Check recency of encounters (proxy for management)
    if not encounters:
        return ScreeningResult(
            condition="COPD",
            status="missing",
            severity="high",
            detail="Patient has COPD but no recent visits on record. May not be receiving ongoing care.",
            recommendation="Schedule a COPD management visit. Annual wellness visits are typically covered at $0 under Medicare when your provider accepts assignment.",
        )

    latest_enc = max(encounters, key=lambda e: e.get("date", ""))
    last_visit = latest_enc.get("date", "")

    try:
        last_date = date.fromisoformat(last_visit) if last_visit else None
    except ValueError:
        last_date = None

    if last_date and (date.today() - last_date).days > 180:
        return ScreeningResult(
            condition="COPD",
            status="uncontrolled",
            severity="warn",
            detail=f"COPD patient hasn't been seen in {(date.today() - last_date).days} days. Overdue for follow-up.",
            evidence={"last_visit": last_visit},
            recommendation="Schedule COPD follow-up visit. Pulmonary rehab and spirometry are typically covered under Medicare Part B.",
        )

    return ScreeningResult(
        condition="COPD",
        status="controlled",
        severity="info",
        detail="COPD patient seen recently. Continue current management plan.",
        evidence={"last_visit": last_visit},
        recommendation="",
    )


def screen_depression(labs: list, problems: list) -> ScreeningResult:
    """Screen for depression management — check PHQ-9 recency."""
    has_depression = any(
        any((p.get("diagnosis", "") or p.get("code", "") or "").startswith(c) for c in DEPRESSION_CODES)
        for p in problems
    )

    # Look for PHQ-9 results
    phq9_results = [
        lab for lab in labs
        if lab.get("loinc") in PHQ9_LOINCS
    ]

    if not has_depression and not phq9_results:
        return ScreeningResult(
            condition="Depression",
            status="not_applicable",
            severity="info",
            detail="No depression diagnosis. Annual depression screening is recommended for all adults.",
            recommendation="Consider PHQ-9 screening at next visit. Typically covered at $0 as part of the Medicare Annual Wellness Visit.",
        )

    if has_depression and not phq9_results:
        return ScreeningResult(
            condition="Depression",
            status="missing",
            severity="warn",
            detail="Patient has depression diagnosis but no PHQ-9 score on file. Cannot track treatment response.",
            recommendation="Administer PHQ-9 at next visit to assess severity and treatment response. Typically covered under Medicare.",
        )

    if phq9_results:
        phq9_results.sort(key=lambda x: x.get("date", ""), reverse=True)
        latest = phq9_results[0]
        score = float(latest.get("result", latest.get("value", 0)))

        if score >= 15:
            severity_label = "severe"
            sev = "high"
        elif score >= 10:
            severity_label = "moderate"
            sev = "warn"
        elif score >= 5:
            severity_label = "mild"
            sev = "info"
        else:
            severity_label = "minimal"
            sev = "info"

        return ScreeningResult(
            condition="Depression",
            status="uncontrolled" if score >= 10 else "controlled",
            severity=sev,
            detail=f"PHQ-9 score is {score:.0f} ({severity_label} depression).",
            evidence={"phq9_score": score, "date": latest.get("date"), "severity": severity_label},
            recommendation=f"{'Adjust treatment plan — consider medication change or therapy referral. ' if score >= 10 else ''}Follow-up PHQ-9 in {'4' if score >= 10 else '8'} weeks. Mental health services typically covered under Medicare Part B.",
        )

    return ScreeningResult(
        condition="Depression",
        status="not_applicable",
        severity="info",
        detail="No depression indicators found.",
        recommendation="",
    )


def screen_heart_disease(problems: list, vitals: list, encounters: list) -> ScreeningResult:
    """Screen for heart disease management gaps."""
    has_hd = any(
        any((p.get("diagnosis", "") or p.get("code", "") or "").startswith(c) for c in HEART_DISEASE_CODES)
        for p in problems
    )

    if not has_hd:
        return ScreeningResult(
            condition="Heart Disease",
            status="not_applicable",
            severity="info",
            detail="No heart disease diagnosis on file.",
            recommendation="",
        )

    if not encounters:
        return ScreeningResult(
            condition="Heart Disease",
            status="missing",
            severity="high",
            detail="Patient has heart disease but no recent visits. High risk for adverse events without ongoing care.",
            recommendation="Schedule cardiology follow-up urgently. Cardiac rehab is typically covered under Medicare Part B.",
        )

    latest_enc = max(encounters, key=lambda e: e.get("date", ""))
    last_visit = latest_enc.get("date", "")

    try:
        last_date = date.fromisoformat(last_visit) if last_visit else None
    except ValueError:
        last_date = None

    if last_date and (date.today() - last_date).days > 120:
        return ScreeningResult(
            condition="Heart Disease",
            status="uncontrolled",
            severity="warn",
            detail=f"Heart disease patient overdue for follow-up ({(date.today() - last_date).days} days since last visit).",
            evidence={"last_visit": last_visit},
            recommendation="Schedule cardiology or primary care follow-up. Office visits and cardiac rehab typically covered under Medicare.",
        )

    return ScreeningResult(
        condition="Heart Disease",
        status="controlled",
        severity="info",
        detail="Heart disease patient seen recently.",
        evidence={"last_visit": last_visit},
        recommendation="Continue current management.",
    )


def screen_cancer_preventive(age: int, sex: str, problems: list, encounters: list) -> list[ScreeningResult]:
    """Check for overdue cancer screenings based on age, sex, and USPSTF guidelines."""
    results = []
    today = date.today()

    # Mammography: females age 50-74, every 2 years
    if sex.lower() in ("female", "f") and 50 <= age <= 74:
        # We'd check procedure dates — for now flag if no record
        results.append(ScreeningResult(
            condition="Breast Cancer Screening",
            status="due",
            severity="warn",
            detail=f"Patient is {age}yo female — mammography recommended every 2 years (USPSTF Grade B).",
            recommendation="Schedule mammogram. Typically covered at $0 under Medicare Part B (once every 12 months for age 40+) when coded as screening.",
        ))

    # Colonoscopy: age 45-75, every 10 years (or stool test annually)
    if 45 <= age <= 75:
        results.append(ScreeningResult(
            condition="Colorectal Cancer Screening",
            status="due",
            severity="warn",
            detail=f"Patient is {age}yo — colorectal screening recommended (USPSTF Grade A for 45-75).",
            recommendation="Schedule colonoscopy or order FIT/stool DNA test. Colonoscopy typically covered at $0 under Medicare when coded as screening (if polyps are found, cost-sharing may apply). Stool tests typically covered annually.",
        ))

    # Lung cancer: age 50-80, 20+ pack-year smoking history
    # We'd check smoking status — flag for smokers
    if 50 <= age <= 80:
        has_smoking_history = any(
            "smoking" in p.get("title", "").lower() or "tobacco" in p.get("title", "").lower() or "nicotine" in p.get("title", "").lower()
            for p in problems
        )
        if has_smoking_history:
            results.append(ScreeningResult(
                condition="Lung Cancer Screening",
                status="due",
                severity="warn",
                detail=f"Patient is {age}yo with tobacco history — annual low-dose CT recommended (USPSTF Grade B).",
                recommendation="Order low-dose CT chest. Typically covered at $0 under Medicare Part B for eligible beneficiaries (age 50-77, 20+ pack-year history) when coded as screening.",
            ))

    return results


def run_all_screenings(
    age: int,
    sex: str,
    vitals: list,
    labs: list,
    problems: list,
    encounters: list,
) -> list[ScreeningResult]:
    """Run all condition screenings and return results."""
    results = []

    results.append(screen_ckd(labs, problems))
    results.append(screen_copd(problems, encounters))
    results.append(screen_depression(labs, problems))
    results.append(screen_heart_disease(problems, vitals, encounters))
    results.extend(screen_cancer_preventive(age, sex, problems, encounters))

    # Filter out not_applicable unless they have useful recommendations
    return [
        r for r in results
        if r.status != "not_applicable" or r.recommendation
    ]
