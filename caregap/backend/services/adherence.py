"""Medication adherence calculation from Part D claims (PDC method).

PDC = Proportion of Days Covered
- Standard threshold: 80% per PQA (Pharmacy Quality Alliance)
- Computed from Part D fill events: days_supply + service_start dates
- Groups by drug class for separate adherence metrics
"""

from datetime import date, timedelta
from collections import defaultdict


def compute_adherence(claims: list, lookback_days: int = 365) -> dict:
    """Compute PDC-based adherence metrics from cached Part D claims.

    Args:
        claims: List of ClaimsCache records with claim_type='pde'
        lookback_days: Period to analyze (default 365 days)

    Returns:
        Dict with per-drug and overall adherence metrics.
    """
    if not claims:
        return {"status": "no_data", "drugs": {}, "overall_pdc": None}

    today = date.today()
    period_start = today - timedelta(days=lookback_days)

    # Group fills by NDC
    fills_by_ndc: dict[str, list] = defaultdict(list)

    for claim in claims:
        ndc = claim.ndc if hasattr(claim, "ndc") else claim.get("ndc")
        days = claim.days_supply if hasattr(claim, "days_supply") else claim.get("days_supply")
        start = claim.service_start if hasattr(claim, "service_start") else claim.get("service_start")

        if not ndc or not days or not start:
            continue

        if isinstance(start, str):
            try:
                start = date.fromisoformat(start)
            except ValueError:
                continue

        if start < period_start:
            continue

        fills_by_ndc[ndc].append({
            "start": start,
            "days_supply": int(days),
        })

    if not fills_by_ndc:
        return {"status": "no_fills", "drugs": {}, "overall_pdc": None}

    # Compute PDC per drug
    drug_metrics = {}
    total_covered = 0
    total_period = 0

    for ndc, fills in fills_by_ndc.items():
        fills.sort(key=lambda f: f["start"])

        # Build coverage array
        covered_days = set()
        for fill in fills:
            for i in range(fill["days_supply"]):
                d = fill["start"] + timedelta(days=i)
                if period_start <= d <= today:
                    covered_days.add(d)

        period_days = (today - max(period_start, fills[0]["start"])).days + 1
        if period_days <= 0:
            continue

        pdc = len(covered_days) / period_days
        adherent = pdc >= 0.80

        drug_metrics[ndc] = {
            "pdc": round(pdc, 3),
            "adherent": adherent,
            "covered_days": len(covered_days),
            "period_days": period_days,
            "fill_count": len(fills),
            "threshold": 0.80,
        }

        total_covered += len(covered_days)
        total_period += period_days

    overall_pdc = round(total_covered / total_period, 3) if total_period > 0 else None

    return {
        "status": "ok",
        "drugs": drug_metrics,
        "overall_pdc": overall_pdc,
        "overall_adherent": overall_pdc >= 0.80 if overall_pdc is not None else None,
        "lookback_days": lookback_days,
    }
