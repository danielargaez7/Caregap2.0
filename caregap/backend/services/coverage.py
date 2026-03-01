"""Coverage-aware recommendation service.

Pulls insurance coverage data (Medicare, Medicaid, commercial) and maps
recommended actions to estimated patient cost — helping staff and patients
understand what screenings and visits typically cost under their coverage.

Note: All cost figures are estimates based on typical coverage. Actual cost
depends on how the visit is coded (preventive vs. diagnostic), whether the
provider accepts assignment, and plan-specific details. Localized for
Intermountain Medical Center (Murray, UT) — Utah Medicaid and SelectHealth.
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Per-payer cost tables
# ---------------------------------------------------------------------------

# Service definitions with per-payer cost details
SERVICE_CATALOG: dict[str, dict] = {
    "annual_wellness_visit": {
        "description": "Annual Wellness Visit",
        "frequency": "Once every 12 months",
        "notes": "Includes personalized prevention plan, health risk assessment.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B when coded as preventive and provider accepts assignment. No deductible applies for preventive services.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid. No copay for preventive services.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth when coded as preventive care.",
        },
    },
    "mammogram_screening": {
        "description": "Screening Mammogram",
        "frequency": "Once every 12 months (women 40+)",
        "notes": "No prior authorization required under ACA.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B for women age 40+ when coded as screening.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid as preventive screening.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth (USPSTF Grade B).",
        },
    },
    "colonoscopy_screening": {
        "description": "Screening Colonoscopy",
        "frequency": "Once every 10 years (or every 2 years if high risk)",
        "notes": "If polyps are found and removed, cost-sharing may apply under Medicare.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B when coded as screening (if polyps are found and removed, cost-sharing may apply).",
            "medicaid":    "Typically covered at $0 under Utah Medicaid as preventive screening.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth (USPSTF Grade A).",
        },
    },
    "stool_dna_test": {
        "description": "Stool DNA Test (Cologuard)",
        "frequency": "Once every 3 years",
        "notes": "Multi-target stool DNA test for colorectal cancer screening.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B when coded as screening.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth.",
        },
    },
    "lung_ct_screening": {
        "description": "Low-dose CT Lung Cancer Screening",
        "frequency": "Annually for ages 50-77 with 20+ pack-year smoking history",
        "notes": "Must have written order from physician.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B for eligible beneficiaries when coded as screening.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid for eligible beneficiaries.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth (USPSTF Grade B).",
        },
    },
    "diabetes_screening": {
        "description": "Diabetes Screening Tests",
        "frequency": "Up to 2 screening tests per year",
        "notes": "Includes fasting blood glucose and HbA1c.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B for at-risk patients when coded as screening.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid for at-risk patients.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth for at-risk patients.",
        },
    },
    "depression_screening": {
        "description": "Depression Screening",
        "frequency": "Annually",
        "notes": "PHQ-9 or equivalent. Must be done in primary care setting with follow-up plan.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B when coded as preventive.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth (USPSTF Grade B).",
        },
    },
    "bp_screening": {
        "description": "Blood Pressure Screening",
        "frequency": "At every visit",
        "notes": "No separate charge when done during covered visit.",
        "cost": {
            "medicare":    "Typically covered at $0 as part of the Annual Wellness Visit when provider accepts assignment.",
            "medicaid":    "Typically covered at $0 during any covered visit under Utah Medicaid.",
            "commercial":  "Typically covered at $0 as preventive under ACA-compliant plans such as SelectHealth.",
        },
    },
    "hba1c_lab": {
        "description": "HbA1c Lab Test",
        "frequency": "Typically every 3-6 months for diabetics",
        "notes": "When ordered as screening for at-risk patients, typically covered at $0.",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B. Standard lab copay may apply unless coded as diabetes screening.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid. No copay for lab services.",
            "commercial":  "Copay may apply ($0-25). Typically covered at $0 when ordered as preventive screening under SelectHealth.",
        },
    },
    "flu_vaccine": {
        "description": "Flu Vaccine",
        "frequency": "Once per flu season",
        "notes": "No deductible or copay under any ACA-compliant plan.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth.",
        },
    },
    "pneumonia_vaccine": {
        "description": "Pneumococcal Vaccine",
        "frequency": "PCV20 once (or PCV15 + PPSV23 series)",
        "notes": "Recommended for all adults 65+.",
        "cost": {
            "medicare":    "Typically covered at $0 under Medicare Part B.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid.",
            "commercial":  "Typically covered at $0 under ACA-compliant plans such as SelectHealth for recommended populations.",
        },
    },
    "cardiac_rehab": {
        "description": "Cardiac Rehabilitation",
        "frequency": "Up to 36 sessions over 36 weeks",
        "notes": "Must have qualifying condition (MI, CABG, heart failure, etc.).",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B. 20% coinsurance after deductible.",
            "medicaid":    "Typically covered under Utah Medicaid. Copay typically $0-3.",
            "commercial":  "Covered under most plans. Specialist copay ($20-50) may apply.",
        },
    },
    "nephrology_referral": {
        "description": "Nephrology Specialist Visit",
        "frequency": "As needed",
        "notes": "Referral may be required under some plans.",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B. 20% coinsurance after deductible.",
            "medicaid":    "Typically covered under Utah Medicaid. Copay typically $0-3.",
            "commercial":  "Specialist copay applies ($20-50 typical). Referral may be required.",
        },
    },
    "mental_health_visit": {
        "description": "Mental Health Outpatient Visit",
        "frequency": "As needed",
        "notes": "Includes therapy and medication management.",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B. 20% coinsurance after deductible.",
            "medicaid":    "Typically covered under Utah Medicaid. Copay typically $0-3.",
            "commercial":  "Covered under ACA plans. Copay ($20-40) may apply.",
        },
    },
    "egfr_lab": {
        "description": "eGFR/Kidney Function Lab",
        "frequency": "As ordered by physician",
        "notes": "Part of comprehensive metabolic panel.",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B as part of routine labs.",
            "medicaid":    "Typically covered at $0 under Utah Medicaid.",
            "commercial":  "Covered under most plans. Lab copay ($0-25) may apply.",
        },
    },
    "office_visit_followup": {
        "description": "Follow-up Office Visit",
        "frequency": "As needed",
        "notes": "For managing chronic conditions like BP or diabetes.",
        "cost": {
            "medicare":    "Typically covered under Medicare Part B. Copay typically $0-20.",
            "medicaid":    "Typically covered under Utah Medicaid. Copay typically $0-3.",
            "commercial":  "Primary care copay ($0-30 typical).",
        },
    },
}


@dataclass
class CoverageInfo:
    """Patient insurance coverage summary."""
    insurance_type: str = ""        # "medicare", "medicaid", "commercial"
    has_medicare_a: bool = False
    has_medicare_b: bool = False
    has_medicare_d: bool = False
    has_medicaid: bool = False
    has_commercial: bool = False
    plan_name: str = ""
    member_id: str = ""
    coverage_start: str = ""
    coverage_end: str = ""


@dataclass
class CostEstimate:
    service_key: str
    service_name: str
    estimated_cost: str  # "$0", "20% coinsurance", etc.
    coverage_detail: str
    frequency: str
    notes: str


def coverage_from_insurance_type(insurance_type: str, plan_name: str = "", member_id: str = "") -> CoverageInfo:
    """Build CoverageInfo from a simple insurance type string."""
    info = CoverageInfo(insurance_type=insurance_type, plan_name=plan_name, member_id=member_id)
    if insurance_type == "medicare":
        info.has_medicare_a = True
        info.has_medicare_b = True
        info.has_medicare_d = True
    elif insurance_type == "medicaid":
        info.has_medicaid = True
    elif insurance_type == "commercial":
        info.has_commercial = True
    return info


def get_coverage_info(coverage_data: dict | None) -> CoverageInfo:
    """Parse Blue Button Coverage resource into usable coverage info."""
    if not coverage_data:
        return CoverageInfo()

    info = CoverageInfo()

    if "part-a" in str(coverage_data).lower():
        info.has_medicare_a = True
    if "part-b" in str(coverage_data).lower():
        info.has_medicare_b = True
    if "part-d" in str(coverage_data).lower():
        info.has_medicare_d = True

    if info.has_medicare_a or info.has_medicare_b:
        info.insurance_type = "medicare"

    period = coverage_data.get("period", {})
    info.coverage_start = period.get("start", "")
    info.coverage_end = period.get("end", "")

    return info


def _resolve_payer(coverage: CoverageInfo | None) -> str:
    """Determine which payer key to use for cost lookup."""
    if not coverage:
        return "medicare"  # default assumption
    if coverage.insurance_type:
        return coverage.insurance_type
    if coverage.has_medicare_b or coverage.has_medicare_a:
        return "medicare"
    if coverage.has_medicaid:
        return "medicaid"
    if coverage.has_commercial:
        return "commercial"
    return "medicare"


def estimate_cost(service_key: str, coverage: CoverageInfo | None = None) -> CostEstimate:
    """Estimate patient cost for a specific service based on coverage."""
    service = SERVICE_CATALOG.get(service_key)
    if not service:
        return CostEstimate(
            service_key=service_key,
            service_name=service_key.replace("_", " ").title(),
            estimated_cost="Unknown",
            coverage_detail="Service not in coverage database.",
            frequency="",
            notes="",
        )

    payer = _resolve_payer(coverage)
    cost_detail = service["cost"].get(payer, service["cost"].get("commercial", "Check with plan."))

    return CostEstimate(
        service_key=service_key,
        service_name=service["description"],
        estimated_cost="Typically $0" if "$0" in cost_detail else "Copay may apply — check with your plan",
        coverage_detail=cost_detail,
        frequency=service["frequency"],
        notes=service["notes"],
    )


def enrich_recommendation(recommendation: str, service_keys: list[str], coverage: CoverageInfo | None = None) -> str:
    """Enrich a care gap recommendation with cost/coverage information."""
    if not service_keys:
        return recommendation

    cost_details = []
    for key in service_keys:
        est = estimate_cost(key, coverage)
        cost_details.append(f"{est.service_name}: {est.estimated_cost} ({est.coverage_detail})")

    if cost_details:
        return f"{recommendation}\n\nCost for patient:\n" + "\n".join(f"  - {d}" for d in cost_details)

    return recommendation


def get_preventive_care_summary(age: int, sex: str, problems: list, coverage: CoverageInfo | None = None) -> list[CostEstimate]:
    """Get a summary of recommended preventive services with costs for a patient."""
    services = []

    # Everyone gets annual wellness visit
    services.append(estimate_cost("annual_wellness_visit", coverage))

    # Flu and pneumonia vaccines for 65+
    if age >= 65:
        services.append(estimate_cost("flu_vaccine", coverage))
        services.append(estimate_cost("pneumonia_vaccine", coverage))

    # Depression screening for all
    services.append(estimate_cost("depression_screening", coverage))

    # BP screening for all
    services.append(estimate_cost("bp_screening", coverage))

    # Mammogram for females 40+
    if sex.lower() in ("female", "f") and age >= 40:
        services.append(estimate_cost("mammogram_screening", coverage))

    # Colorectal screening for 45-75
    if 45 <= age <= 75:
        services.append(estimate_cost("colonoscopy_screening", coverage))

    # Diabetes screening for at-risk
    has_diabetes_risk = any(
        any(p.get("code", "").startswith(c) for c in ("E11", "E13", "I10", "E78"))
        for p in problems
    )
    if has_diabetes_risk:
        services.append(estimate_cost("diabetes_screening", coverage))

    return services
