"""Risk Engine — orchestrates CMS measure evaluation and creates CareGap records.

This is the core workflow:
1. Fetch all clinical data from OpenEMR for a patient
2. Run CMS165 (BP) and CMS122 (HbA1c) measure logic
3. Compute composite risk score
4. Create risk assessment + risk factors in ccrd_* tables
5. Create alerts for detected gaps
6. Create followup tasks for each actionable step
"""
from __future__ import annotations

import logging
from datetime import date, datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from models import RiskAssessment, RiskFactor, Alert, Followup, ClaimsCache
from utils.audit import log_audit
from services.openemr_client import OpenEMRClient
from services.measures.cms165 import evaluate_cms165, CMS165Result
from services.measures.cms122 import evaluate_cms122, CMS122Result
from services.measures.risk_scorer import compute_risk_score, RiskScore

logger = logging.getLogger(__name__)

SPEC_VERSIONS = {"CMS165": "13.0.000", "CMS122": "12.0.000"}
MODEL_VERSION = "2026.02"


def _compute_pdc(db: Session, pid: int) -> float | None:
    """Compute Proportion of Days Covered from claims prescription fills.

    Calculates PDC per medication (by NDC) and returns the minimum,
    following CMS methodology for multi-drug adherence.

    Returns None if no claims data, or PDC as 0.0-1.0.
    """
    fills = (
        db.query(ClaimsCache)
        .filter(ClaimsCache.pid == pid, ClaimsCache.claim_type == "pde")
        .all()
    )
    if not fills:
        return None

    # Group fills by NDC (each unique medication)
    by_ndc: dict[str, list] = {}
    for f in fills:
        if f.ndc and f.service_start and f.days_supply:
            by_ndc.setdefault(f.ndc, []).append(f)

    if not by_ndc:
        return None

    # Calculate PDC per medication, take minimum
    pdc_values = []
    for ndc, drug_fills in by_ndc.items():
        dates = [f.service_start for f in drug_fills]
        total_supply = sum(f.days_supply for f in drug_fills)
        earliest = min(dates)
        latest = max(dates)
        span_days = (latest - earliest).days + 30  # Include last fill's coverage
        if span_days > 0:
            pdc_values.append(min(1.0, total_supply / span_days))

    if not pdc_values:
        return None

    return round(min(pdc_values), 2)


async def assess_patient(
    patient_uuid: str,
    pid: int,
    openemr: OpenEMRClient,
    db: Session,
    measurement_period_start: date | None = None,
    measurement_period_end: date | None = None,
) -> dict:
    """Run full risk assessment for a single patient."""
    now = datetime.utcnow()

    if measurement_period_start is None:
        measurement_period_start = date(now.year, 1, 1)
    if measurement_period_end is None:
        measurement_period_end = date(now.year, 12, 31)

    # 1. Fetch clinical data from OpenEMR
    snapshot = await openemr.get_clinical_snapshot(patient_uuid)
    patient = snapshot["patient"] or {}
    vitals = snapshot["vitals"]
    labs = snapshot["labs"]
    meds = snapshot["medications"]
    problems = snapshot["problems"]
    encounters = snapshot["encounters"]

    # 2. Run CMS measures
    cms165 = evaluate_cms165(
        patient, vitals, problems, encounters,
        measurement_period_start, measurement_period_end,
    )
    cms122 = evaluate_cms122(
        patient, labs, problems, encounters,
        measurement_period_start, measurement_period_end,
    )

    # 2b. Compute medication adherence from claims
    adherence_pdc = _compute_pdc(db, pid)

    # 3. Compute risk score
    risk = compute_risk_score(
        cms165, cms122, encounters, measurement_period_end,
        adherence_pdc=adherence_pdc,
        problems=problems,
    )

    # 4. Build flags
    severity_prefixes = ("I50", "N18", "J44", "J43", "F32", "F33", "C", "Z85", "F17")
    flags = {
        "cms165_eligible": cms165.eligible,
        "cms165_controlled": cms165.controlled,
        "cms165_gap": cms165.gap_detected,
        "cms165_excluded": cms165.exclusion_reason,
        "cms122_eligible": cms122.eligible,
        "cms122_poor_control": cms122.poor_control,
        "cms122_missing": cms122.hba1c_missing,
        "cms122_gap": cms122.gap_detected,
        "cms122_excluded": cms122.exclusion_reason,
        "claims_linked": adherence_pdc is not None,
        "adherence_pdc": adherence_pdc,
        "high_severity_conditions": [
            {"code": (p.get("diagnosis", "") or p.get("code", "")),
             "title": p.get("title", "")}
            for p in problems
            if any(
                (p.get("diagnosis", "") or p.get("code", "") or "").startswith(pf)
                for pf in severity_prefixes
            )
        ],
    }

    # 5. Create risk assessment record
    assessment = RiskAssessment(
        pid=pid,
        measurement_period_start=measurement_period_start,
        measurement_period_end=measurement_period_end,
        model_name="cms-gap-rules",
        model_version=MODEL_VERSION,
        score=risk.score,
        risk_band=risk.risk_band,
        flags_json=flags,
        spec_versions_json=SPEC_VERSIONS,
        computed_at=now,
    )
    db.add(assessment)
    db.flush()

    # 6. Create risk factors (evidence pointers)
    factors = []

    if cms165.eligible and cms165.gap_detected:
        factor = RiskFactor(
            assessment_id=assessment.id,
            factor_code="BP_UNCONTROLLED" if not cms165.evidence.get("status") == "no_bp_recorded" else "BP_MISSING",
            evidence_type="vital",
            evidence_ref=f"form_vitals:{cms165.evidence.get('vitals_id_sbp', 'none')}",
            evidence_json=cms165.evidence,
            created_at=now,
        )
        db.add(factor)
        factors.append(factor)

    if cms122.eligible and cms122.gap_detected:
        factor = RiskFactor(
            assessment_id=assessment.id,
            factor_code="A1C_POOR_CONTROL" if not cms122.hba1c_missing else "A1C_MISSING",
            evidence_type="lab",
            evidence_ref=f"procedure_result:{cms122.evidence.get('result_id', 'none')}",
            evidence_json=cms122.evidence,
            created_at=now,
        )
        db.add(factor)
        factors.append(factor)

    # 6b. Create adherence risk factor if non-adherent
    if adherence_pdc is not None and adherence_pdc < 0.8:
        factor = RiskFactor(
            assessment_id=assessment.id,
            factor_code="MED_NON_ADHERENT",
            evidence_type="claims",
            evidence_ref=f"ccrd_claims_cache:pid={pid}",
            evidence_json={"pdc": adherence_pdc, "threshold": 0.8},
            created_at=now,
        )
        db.add(factor)
        factors.append(factor)

    # 6c. Create condition-based risk factors
    CONDITION_FACTOR_MAP = {
        "I50": ("CONDITION_CHF", "Heart failure diagnosis"),
        "N18": ("CONDITION_CKD", "Chronic kidney disease diagnosis"),
        "J44": ("CONDITION_COPD", "COPD diagnosis"),
        "J43": ("CONDITION_COPD", "Emphysema diagnosis"),
        "F32": ("CONDITION_DEPRESSION", "Major depression diagnosis"),
        "F33": ("CONDITION_DEPRESSION", "Recurrent depression diagnosis"),
        "C":   ("CONDITION_CANCER_ACTIVE", "Active cancer diagnosis"),
        "Z85": ("CONDITION_CANCER_HISTORY", "Personal history of cancer"),
        "F17": ("CONDITION_SMOKING", "Nicotine dependence"),
    }

    seen_factor_codes = set()
    for prob in problems:
        diag_code = (prob.get("diagnosis", "") or prob.get("code", "") or "").strip()
        if not diag_code:
            continue
        for prefix, (factor_code, description) in CONDITION_FACTOR_MAP.items():
            if diag_code.startswith(prefix) and factor_code not in seen_factor_codes:
                seen_factor_codes.add(factor_code)
                factor = RiskFactor(
                    assessment_id=assessment.id,
                    factor_code=factor_code,
                    evidence_type="diagnosis",
                    evidence_ref=f"lists:{diag_code}",
                    evidence_json={
                        "code": diag_code,
                        "title": prob.get("title", ""),
                        "description": description,
                    },
                    created_at=now,
                )
                db.add(factor)
                factors.append(factor)
                break

    # 7. Create alerts for detected gaps
    #    Skip if an open alert/followup already exists for this patient + gap type.
    alerts = []

    def _has_open_alert(pid: int, alert_type: str, title_prefix: str) -> bool:
        return db.query(Alert).filter(
            Alert.pid == pid,
            Alert.alert_type == alert_type,
            Alert.status == "open",
            Alert.title.like(f"{title_prefix}%"),
        ).first() is not None

    def _has_open_followup(pid: int, task_type: str) -> bool:
        return db.query(Followup).filter(
            Followup.pid == pid,
            Followup.task_type == task_type,
            Followup.status == "open",
        ).first() is not None

    if cms165.eligible and cms165.gap_detected:
        bp_evidence = cms165.evidence
        if bp_evidence.get("status") == "no_bp_recorded":
            title = "Missing BP reading in measurement period"
            detail = "No blood pressure recorded — treated as uncontrolled per CMS165v13."
            action = "Schedule patient for BP check. If telehealth, request home BP reading."
        else:
            title = f"Uncontrolled BP: {bp_evidence.get('bps')}/{bp_evidence.get('bpd')}"
            detail = f"Most recent BP on {bp_evidence.get('date')} is above 140/90 threshold."
            action = "Review current antihypertensive regimen. Consider medication adjustment or follow-up visit within 2-4 weeks."

        if not _has_open_alert(pid, "care-gap", "Missing BP") and not _has_open_alert(pid, "care-gap", "Uncontrolled BP"):
            alert = Alert(
                pid=pid, assessment_id=assessment.id,
                severity="high", alert_type="care-gap",
                title=title, detail=detail, recommended_action=action,
                status="open", created_at=now,
            )
            db.add(alert)
            db.flush()
            alerts.append(alert)

            # Create followup for BP gap (only if no open one exists)
            bp_task = "schedule_visit" if bp_evidence.get("status") == "no_bp_recorded" else "call_patient"
            if not _has_open_followup(pid, bp_task):
                followup = Followup(
                    pid=pid, alert_id=alert.id,
                    task_type=bp_task,
                    due_date=date(now.year, now.month, min(now.day + 14, 28)),
                    payload_json={"reason": "CMS165 BP gap", "evidence": bp_evidence},
                    status="open", created_at=now,
                )
                db.add(followup)

    if cms122.eligible and cms122.gap_detected:
        a1c_evidence = cms122.evidence
        if cms122.hba1c_missing:
            title = "Missing HbA1c lab in measurement period"
            detail = "No HbA1c result found — counts as poor control per CMS122v12."
            action = "Order HbA1c lab. Contact patient to schedule blood draw."
            task_type = "order_lab"
        else:
            title = f"HbA1c poor control: {a1c_evidence.get('value')}%"
            detail = f"Most recent HbA1c on {a1c_evidence.get('date')} exceeds 9% threshold."
            action = "Review diabetes management plan. Consider medication intensification, dietary counseling referral, or endocrinology consult."
            task_type = "call_patient"

        if not _has_open_alert(pid, "care-gap", "Missing HbA1c") and not _has_open_alert(pid, "care-gap", "HbA1c poor"):
            alert = Alert(
                pid=pid, assessment_id=assessment.id,
                severity="high", alert_type="care-gap",
                title=title, detail=detail, recommended_action=action,
                status="open", created_at=now,
            )
            db.add(alert)
            db.flush()
            alerts.append(alert)

            if not _has_open_followup(pid, task_type):
                followup = Followup(
                    pid=pid, alert_id=alert.id,
                    task_type=task_type,
                    due_date=date(now.year, now.month, min(now.day + 7, 28)),
                    payload_json={"reason": "CMS122 HbA1c gap", "evidence": a1c_evidence},
                    status="open", created_at=now,
                )
                db.add(followup)

    # 7b. Create condition-based alerts
    seen_alert_prefixes = set()
    for prob in problems:
        diag_code = (prob.get("diagnosis", "") or prob.get("code", "") or "").strip()
        prob_title = prob.get("title", "")

        alert_info = None
        prefix_key = None

        if diag_code.startswith("I50"):
            prefix_key = "I50"
            alert_info = {
                "title": f"Heart failure: {prob_title}",
                "detail": "Patient has heart failure. Requires close monitoring of weight, BP, and fluid status.",
                "action": "Ensure cardiology follow-up is scheduled. Review diuretic and beta-blocker dosing. Cardiac rehab is typically covered under Medicare Part B (20% coinsurance may apply after deductible).",
                "severity": "high",
            }
        elif diag_code.startswith("N18") and not diag_code.startswith("N18.6"):
            prefix_key = "N18"
            sev = "high" if diag_code in ("N18.4", "N18.5") else "warn"
            alert_info = {
                "title": f"Chronic kidney disease: {prob_title}",
                "detail": f"Patient has CKD ({diag_code}). Monitor eGFR and adjust nephrotoxic medications.",
                "action": "Order comprehensive metabolic panel with eGFR. Consider nephrology referral if eGFR < 30. Labs are typically covered under Medicare Part B when ordered as part of disease management.",
                "severity": sev,
            }
        elif diag_code.startswith("J44") or diag_code.startswith("J43"):
            prefix_key = "J4"
            alert_info = {
                "title": f"COPD management: {prob_title}",
                "detail": "Patient has COPD. Ensure inhaler technique review and pulmonary function monitoring.",
                "action": "Schedule pulmonary function test if not done in 12 months. Review inhaler regimen. Pulmonary rehab is typically covered under Medicare Part B.",
                "severity": "warn",
            }
        elif diag_code.startswith("F32") or diag_code.startswith("F33"):
            prefix_key = "F3"
            alert_info = {
                "title": f"Depression management: {prob_title}",
                "detail": "Patient has depression. Depression worsens chronic disease self-management and medication adherence.",
                "action": "Administer PHQ-9 at next visit. Review antidepressant effectiveness. Consider behavioral health referral. Typically covered under Medicare Part B.",
                "severity": "warn",
            }
        elif diag_code.startswith("Z85"):
            prefix_key = "Z85"
            alert_info = {
                "title": f"Cancer surveillance: {prob_title}",
                "detail": "Patient has history of cancer. Requires ongoing screening and surveillance.",
                "action": "Verify cancer surveillance schedule is up to date. Ensure appropriate imaging and labs are ordered per oncology guidelines.",
                "severity": "warn",
            }
        elif diag_code.startswith("C"):
            prefix_key = "C"
            alert_info = {
                "title": f"Active cancer: {prob_title}",
                "detail": "Patient has active cancer diagnosis. Coordinate care with oncology team.",
                "action": "Ensure oncology referral and treatment plan are in place. Schedule supportive care follow-up.",
                "severity": "high",
            }

        if alert_info and prefix_key not in seen_alert_prefixes:
            seen_alert_prefixes.add(prefix_key)
            # Skip if an open condition alert already exists for this patient + condition
            existing = db.query(Alert).filter(
                Alert.pid == pid,
                Alert.alert_type == "condition-risk",
                Alert.status == "open",
                Alert.title.startswith(alert_info["title"].split(":")[0]),
            ).first()
            if not existing:
                alert = Alert(
                    pid=pid, assessment_id=assessment.id,
                    severity=alert_info["severity"], alert_type="condition-risk",
                    title=alert_info["title"], detail=alert_info["detail"],
                    recommended_action=alert_info["action"],
                    status="open", created_at=now,
                )
                db.add(alert)
                db.flush()
                alerts.append(alert)

    # 7c. Create adherence alert if non-adherent
    if adherence_pdc is not None and adherence_pdc < 0.8:
        existing_adh = db.query(Alert).filter(
            Alert.pid == pid,
            Alert.alert_type == "adherence",
            Alert.status == "open",
        ).first()
        if not existing_adh:
            if adherence_pdc < 0.5:
                sev = "high"
                detail = f"Patient is severely non-adherent to medications. Proportion of Days Covered (PDC) is only {adherence_pdc:.0%} — well below the 80% target."
            else:
                sev = "warn"
                detail = f"Patient has suboptimal medication adherence. PDC is {adherence_pdc:.0%} — below the 80% target."
            alert = Alert(
                pid=pid, assessment_id=assessment.id,
                severity=sev, alert_type="adherence",
                title=f"Medication non-adherence: PDC {adherence_pdc:.0%}",
                detail=detail,
                recommended_action="Call patient to discuss medication barriers — cost, side effects, or forgetfulness. Consider 90-day fills or mail-order pharmacy. Medication therapy management is typically available under Medicare Part D for eligible beneficiaries.",
                status="open", created_at=now,
            )
            db.add(alert)
            db.flush()
            alerts.append(alert)

    db.commit()

    # Audit trail — log assessment and all created alerts
    log_audit("risk_assessment_run", "risk_assessment", resource_id=assessment.id, pid=pid,
              detail={"score": risk.score, "risk_band": risk.risk_band,
                      "alerts_created": len(alerts)}, source="risk_engine")
    for a in alerts:
        log_audit("alert_created", "alert", resource_id=a.id, pid=pid,
                  detail={"severity": a.severity, "title": a.title,
                          "alert_type": a.alert_type}, source="risk_engine")

    return {
        "assessment_id": assessment.id,
        "pid": pid,
        "patient_uuid": patient_uuid,
        "risk_score": risk.score,
        "risk_band": risk.risk_band,
        "cms165": {
            "eligible": cms165.eligible,
            "controlled": cms165.controlled,
            "gap": cms165.gap_detected,
            "exclusion": cms165.exclusion_reason,
            "evidence": cms165.evidence,
        },
        "cms122": {
            "eligible": cms122.eligible,
            "poor_control": cms122.poor_control,
            "missing": cms122.hba1c_missing,
            "gap": cms122.gap_detected,
            "exclusion": cms122.exclusion_reason,
            "evidence": cms122.evidence,
        },
        "alerts_created": len(alerts),
        "risk_components": risk.components,
    }
