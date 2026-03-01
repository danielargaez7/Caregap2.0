"""CMS Blue Button API client for Medicare claims data.

Sandbox: https://sandbox.bluebutton.cms.gov/v2/fhir/
Endpoints: /Patient, /Coverage, /ExplanationOfBenefit

Fetches ExplanationOfBenefit resources and caches them in ccrd_claims_cache.
Extracts Part D prescription drug events for adherence computation.
"""
from __future__ import annotations

import logging
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from config import get_settings
from models import ClaimsCache, ExternalLink

logger = logging.getLogger(__name__)


class BlueButtonClient:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.bluebutton_base_url.rstrip("/")
        self.client_id = settings.bluebutton_client_id
        self.client_secret = settings.bluebutton_client_secret
        self._http = httpx.AsyncClient(timeout=30.0)

    async def sync_eobs(self, pid: int, link: ExternalLink, db: Session) -> dict:
        """Fetch ExplanationOfBenefit resources from Blue Button and cache them."""
        if not link.refresh_token_enc:
            return {"status": "error", "message": "No valid token for this patient's Blue Button link."}

        try:
            # Fetch EOBs
            headers = {"Authorization": f"Bearer {link.refresh_token_enc}"}
            url = f"{self.base_url}/ExplanationOfBenefit?patient={link.external_patient_id}"
            resp = await self._http.get(url, headers=headers)

            if resp.status_code != 200:
                logger.warning(f"Blue Button EOB fetch failed: {resp.status_code}")
                return {"status": "error", "message": f"Blue Button returned {resp.status_code}"}

            bundle = resp.json()
            entries = bundle.get("entry", [])
            new_count = 0
            updated_count = 0

            for entry in entries:
                eob = entry.get("resource", {})
                eob_id = eob.get("id", "")
                if not eob_id:
                    continue

                # Determine claim type
                claim_type = "unknown"
                eob_type = eob.get("type", {}).get("coding", [{}])[0].get("code", "")
                if eob_type:
                    claim_type = eob_type

                # Extract dates
                service_start = None
                service_end = None
                billable_period = eob.get("billablePeriod", {})
                if billable_period.get("start"):
                    service_start = datetime.fromisoformat(
                        billable_period["start"].replace("Z", "+00:00")
                    ).date()
                if billable_period.get("end"):
                    service_end = datetime.fromisoformat(
                        billable_period["end"].replace("Z", "+00:00")
                    ).date()

                # Extract Part D fields
                ndc = None
                days_supply = None
                for item in eob.get("item", []):
                    for ext in item.get("extension", []):
                        if "days_suply_num" in ext.get("url", "").lower():
                            days_supply = ext.get("valueQuantity", {}).get("value")
                    product = item.get("productOrService", {})
                    for coding in product.get("coding", []):
                        if coding.get("system", "").endswith("/ndc"):
                            ndc = coding.get("code")

                # Upsert into cache
                existing = (
                    db.query(ClaimsCache)
                    .filter(ClaimsCache.source_system == "bluebutton", ClaimsCache.eob_id == eob_id)
                    .first()
                )

                if existing:
                    existing.raw_eob_json = eob
                    existing.fetched_at = datetime.utcnow()
                    updated_count += 1
                else:
                    cache_entry = ClaimsCache(
                        pid=pid,
                        source_system="bluebutton",
                        eob_id=eob_id,
                        claim_type=claim_type,
                        service_start=service_start,
                        service_end=service_end,
                        ndc=ndc,
                        days_supply=int(days_supply) if days_supply else None,
                        raw_eob_json=eob,
                        fetched_at=datetime.utcnow(),
                    )
                    db.add(cache_entry)
                    new_count += 1

            # Update sync timestamp
            link.last_sync_at = datetime.utcnow()
            db.commit()

            return {
                "status": "ok",
                "new_claims": new_count,
                "updated_claims": updated_count,
                "total_entries": len(entries),
            }

        except Exception as e:
            logger.error(f"Blue Button sync failed for pid={pid}: {e}")
            return {"status": "error", "message": str(e)}


_client: BlueButtonClient | None = None


def get_bluebutton_client() -> BlueButtonClient:
    global _client
    if _client is None:
        _client = BlueButtonClient()
    return _client
