"""Client for OpenEMR patient data.

Primary: reads through OpenEMR's Standard REST API (OAuth2).
Fallback: reads directly from OpenEMR's MySQL tables when the REST API
is unavailable (e.g. OAuth2 client not registered in dev).
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache

import httpx
from sqlalchemy import text

from config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Direct MySQL helpers — read OpenEMR native tables when REST API is down
# ---------------------------------------------------------------------------

def _get_engine():
    from database import engine
    return engine


def _db_search_patients(params: dict | None = None) -> list:
    """Search patient_data table directly."""
    engine = _get_engine()
    clauses, binds = [], {}
    if params:
        if params.get("lname"):
            clauses.append("lname LIKE :lname")
            binds["lname"] = f"%{params['lname']}%"
        if params.get("fname"):
            clauses.append("fname LIKE :fname")
            binds["fname"] = f"%{params['fname']}%"
        if params.get("DOB"):
            clauses.append("DOB = :dob")
            binds["dob"] = params["DOB"]
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = text(f"""
        SELECT pid, fname, lname, DOB, sex, uuid, street, city, state, postal_code,
               phone_home, phone_cell, email, race, ethnicity
        FROM patient_data
        {where}
        ORDER BY lname, fname
        LIMIT 100
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, binds).mappings().all()
    results = []
    for r in rows:
        uuid_val = r["uuid"]
        if isinstance(uuid_val, (bytes, bytearray)):
            uuid_val = uuid_val.hex()
            # Format as UUID: 8-4-4-4-12
            uuid_val = f"{uuid_val[:8]}-{uuid_val[8:12]}-{uuid_val[12:16]}-{uuid_val[16:20]}-{uuid_val[20:]}"
        results.append({
            "pid": r["pid"],
            "fname": r["fname"] or "",
            "lname": r["lname"] or "",
            "DOB": str(r["DOB"]) if r["DOB"] else "",
            "sex": r["sex"] or "",
            "uuid": uuid_val or "",
            "street": r["street"] or "",
            "city": r["city"] or "",
            "state": r["state"] or "",
            "postal_code": r["postal_code"] or "",
            "phone_home": r["phone_home"] or "",
            "phone_cell": r["phone_cell"] or "",
            "email": r["email"] or "",
            "race": r["race"] or "",
            "ethnicity": r["ethnicity"] or "",
        })
    return results


def _db_get_patient(identifier: str) -> dict | None:
    """Get a single patient by UUID or pid."""
    engine = _get_engine()
    # Try as pid first (numeric), then as uuid
    if identifier.isdigit():
        sql = text("SELECT pid, fname, lname, DOB, sex, uuid, street, city, state, postal_code, phone_home, phone_cell, email, race, ethnicity FROM patient_data WHERE pid = :pid")
        binds = {"pid": int(identifier)}
    else:
        # UUID might be hex or dashed format
        clean = identifier.replace("-", "")
        sql = text("SELECT pid, fname, lname, DOB, sex, uuid, street, city, state, postal_code, phone_home, phone_cell, email, race, ethnicity FROM patient_data WHERE HEX(uuid) = :uuid")
        binds = {"uuid": clean.upper()}
    with engine.connect() as conn:
        row = conn.execute(sql, binds).mappings().first()
    if not row:
        return None
    uuid_val = row["uuid"]
    if isinstance(uuid_val, (bytes, bytearray)):
        uuid_val = uuid_val.hex()
        uuid_val = f"{uuid_val[:8]}-{uuid_val[8:12]}-{uuid_val[12:16]}-{uuid_val[16:20]}-{uuid_val[20:]}"
    return {
        "pid": row["pid"],
        "fname": row["fname"] or "",
        "lname": row["lname"] or "",
        "DOB": str(row["DOB"]) if row["DOB"] else "",
        "sex": row["sex"] or "",
        "uuid": uuid_val or "",
        "street": row["street"] or "",
        "city": row["city"] or "",
        "state": row["state"] or "",
        "postal_code": row["postal_code"] or "",
        "phone_home": row["phone_home"] or "",
        "phone_cell": row["phone_cell"] or "",
        "email": row["email"] or "",
        "race": row["race"] or "",
        "ethnicity": row["ethnicity"] or "",
    }


def _db_get_encounters(pid: int) -> list:
    engine = _get_engine()
    sql = text("""
        SELECT fe.encounter, fe.date, fe.reason, fe.pid
        FROM form_encounter fe
        WHERE fe.pid = :pid
        ORDER BY fe.date DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": pid}).mappings().all()
    return [
        {
            "encounter": r["encounter"],
            "date": str(r["date"]) if r["date"] else "",
            "reason": r["reason"] or "",
            "pid": r["pid"],
        }
        for r in rows
    ]


def _db_get_vitals(pid: int) -> list:
    engine = _get_engine()
    sql = text("""
        SELECT fv.id, fv.date, fv.bps, fv.bpd, fv.weight, fv.height,
               fv.temperature, fv.pulse, fv.respiration, fv.BMI,
               fe.encounter, fe.date as encounter_date
        FROM form_vitals fv
        JOIN forms f ON f.form_id = fv.id AND f.formdir = 'vitals' AND f.deleted = 0
        JOIN form_encounter fe ON fe.encounter = f.encounter AND fe.pid = f.pid
        WHERE f.pid = :pid
        ORDER BY fv.date DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": pid}).mappings().all()
    return [
        {
            "id": r["id"],
            "date": str(r["date"]) if r["date"] else "",
            "bps": str(r["bps"]) if r["bps"] else None,
            "bpd": str(r["bpd"]) if r["bpd"] else None,
            "weight": str(r["weight"]) if r["weight"] else None,
            "height": str(r["height"]) if r["height"] else None,
            "temperature": str(r["temperature"]) if r["temperature"] else None,
            "pulse": str(r["pulse"]) if r["pulse"] else None,
            "respiration": str(r["respiration"]) if r["respiration"] else None,
            "BMI": str(r["BMI"]) if r["BMI"] else None,
            "encounter": r["encounter"],
            "encounter_date": str(r["encounter_date"]) if r["encounter_date"] else "",
        }
        for r in rows
    ]


def _db_get_medications(pid: int) -> list:
    engine = _get_engine()
    sql = text("""
        SELECT id, title, begdate, enddate, diagnosis, activity
        FROM lists
        WHERE pid = :pid AND type = 'medication' AND activity = 1
        ORDER BY begdate DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": pid}).mappings().all()
    return [
        {
            "drug": r["title"] or "",
            "title": r["title"] or "",
            "start_date": str(r["begdate"]) if r["begdate"] else "",
            "begdate": str(r["begdate"]) if r["begdate"] else "",
            "end_date": str(r["enddate"]) if r["enddate"] else "",
            "enddate": str(r["enddate"]) if r["enddate"] else "",
            "diagnosis": r["diagnosis"] or "",
            "activity": r["activity"],
        }
        for r in rows
    ]


def _db_get_problems(pid: int) -> list:
    engine = _get_engine()
    sql = text("""
        SELECT id, title, begdate, enddate, diagnosis, activity
        FROM lists
        WHERE pid = :pid AND type = 'medical_problem' AND activity = 1
        ORDER BY begdate DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": pid}).mappings().all()
    return [
        {
            "title": r["title"] or "",
            "diagnosis": r["diagnosis"] or "",
            "begdate": str(r["begdate"]) if r["begdate"] else "",
            "enddate": str(r["enddate"]) if r["enddate"] else "",
            "activity": r["activity"],
        }
        for r in rows
    ]


def _db_get_lab_results(pid: int) -> list:
    """Get lab results from OpenEMR procedure_result tables."""
    engine = _get_engine()
    sql = text("""
        SELECT pr.procedure_result_id AS id, pr.result_code, pr.result_text,
               pr.result, pr.units, pr.`range`, pr.abnormal, pr.date,
               poc.procedure_code, poc.procedure_name,
               prep.date_report, prep.date_collected
        FROM procedure_result pr
        JOIN procedure_report prep ON prep.procedure_report_id = pr.procedure_report_id
        JOIN procedure_order_code poc ON poc.procedure_order_id = prep.procedure_order_id
            AND poc.procedure_order_seq = prep.procedure_order_seq
        JOIN procedure_order po ON po.procedure_order_id = prep.procedure_order_id
        WHERE po.patient_id = :pid
        ORDER BY COALESCE(pr.date, prep.date_report) DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": pid}).mappings().all()
    return [
        {
            "id": r["id"],
            "result_code": r["result_code"] or r["procedure_code"] or "",
            "result_text": r["result_text"] or "",
            "result": r["result"] or "",
            "name": r["procedure_name"] or r["result_text"] or "",
            "units": r["units"] or "",
            "range": r["range"] or "",
            "abnormal": r["abnormal"] or "",
            "date": str(r["date"]) if r["date"] else str(r["date_report"]) if r["date_report"] else "",
        }
        for r in rows
    ]


def _pid_from_identifier(identifier: str) -> int | None:
    """Resolve a UUID or pid string to a numeric pid."""
    if identifier.isdigit():
        return int(identifier)
    patient = _db_get_patient(identifier)
    return patient["pid"] if patient else None


# ---------------------------------------------------------------------------
# Main client class
# ---------------------------------------------------------------------------

class OpenEMRClient:
    """Async client for OpenEMR data. Tries REST API first, falls back to MySQL."""

    def __init__(self, base_url: str, client_id: str = "", client_secret: str = ""):
        self.base_url = base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: str | None = None
        self._token_expires: float = 0
        self._api_available: bool | None = None  # None = unknown
        self._http = httpx.AsyncClient(verify=False, timeout=30.0)

    async def _ensure_token(self):
        """Get or refresh OAuth2 bearer token."""
        if self._api_available is False:
            return  # Already know API is down, skip

        if self._token and time.time() < self._token_expires:
            return

        token_url = self.base_url.replace("/apis/default/api", "/oauth2/default/token")

        try:
            resp = await self._http.post(
                token_url,
                data={
                    "grant_type": "password",
                    "username": "admin",
                    "password": "pass",
                    "client_id": self.client_id,
                    "scope": "openid api:oemr api:fhir",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                self._token = data.get("access_token")
                self._token_expires = time.time() + data.get("expires_in", 3600) - 60
                self._api_available = True
                logger.info("OpenEMR REST API token acquired.")
            else:
                logger.info(f"OpenEMR REST API unavailable ({resp.status_code}), using direct MySQL.")
                self._api_available = False
        except Exception as e:
            logger.info(f"OpenEMR REST API unreachable ({e}), using direct MySQL.")
            self._api_available = False

    def _headers(self) -> dict:
        headers = {"Accept": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    async def _get(self, path: str, params: dict | None = None) -> dict | list | None:
        """Make authenticated GET request, unwrap OpenEMR response envelope."""
        if self._api_available is False:
            return None  # Will trigger fallback in callers

        await self._ensure_token()
        if self._api_available is False:
            return None

        url = f"{self.base_url}{path}"
        try:
            resp = await self._http.get(url, headers=self._headers(), params=params)
            if resp.status_code == 200:
                body = resp.json()
                if isinstance(body, dict) and "data" in body:
                    return body["data"]
                return body
            elif resp.status_code == 401:
                self._token = None
                await self._ensure_token()
                resp = await self._http.get(url, headers=self._headers(), params=params)
                if resp.status_code == 200:
                    body = resp.json()
                    if isinstance(body, dict) and "data" in body:
                        return body["data"]
                    return body
            logger.warning(f"OpenEMR GET {path} returned {resp.status_code}")
            return None
        except Exception as e:
            logger.error(f"OpenEMR GET {path} failed: {e}")
            return None

    # --- Patient endpoints (with MySQL fallback) ---

    async def search_patients(self, params: dict | None = None) -> list:
        result = await self._get("/patient", params)
        if result and isinstance(result, list):
            return result
        # Fallback to direct MySQL
        return _db_search_patients(params)

    async def get_patient(self, identifier: str) -> dict | None:
        result = await self._get(f"/patient/{identifier}")
        if result and isinstance(result, dict):
            return result
        return _db_get_patient(identifier)

    # --- Encounter endpoints ---

    async def get_encounters(self, patient_identifier: str) -> list:
        result = await self._get(f"/patient/{patient_identifier}/encounter")
        if result and isinstance(result, list):
            return result
        pid = _pid_from_identifier(patient_identifier)
        return _db_get_encounters(pid) if pid else []

    # --- Vitals endpoints ---

    async def get_vitals_for_encounter(self, patient_uuid: str, encounter_uuid: str) -> list:
        result = await self._get(f"/patient/{patient_uuid}/encounter/{encounter_uuid}/vital")
        return result if isinstance(result, list) else []

    async def get_all_vitals(self, patient_identifier: str) -> list:
        """Get all vitals for a patient. Tries REST API, falls back to MySQL."""
        if self._api_available is not False:
            encounters = await self.get_encounters(patient_identifier)
            if encounters and isinstance(encounters, list) and encounters[0].get("uuid"):
                # REST API is working, use encounter-by-encounter approach
                all_vitals = []
                for enc in encounters:
                    enc_uuid = enc.get("uuid") or enc.get("euuid")
                    if enc_uuid:
                        vitals = await self.get_vitals_for_encounter(patient_identifier, enc_uuid)
                        for v in vitals:
                            v["encounter_uuid"] = enc_uuid
                            v["encounter_date"] = enc.get("date")
                        all_vitals.extend(vitals)
                return all_vitals

        # Fallback: direct MySQL
        pid = _pid_from_identifier(patient_identifier)
        return _db_get_vitals(pid) if pid else []

    # --- Lab / Procedure endpoints ---

    async def get_lab_results(self, patient_identifier: str) -> list:
        result = await self._get(f"/patient/{patient_identifier}/procedure")
        if result and isinstance(result, list):
            return result
        pid = _pid_from_identifier(patient_identifier)
        return _db_get_lab_results(pid) if pid else []

    # --- Medication endpoints ---

    async def get_medications(self, patient_identifier: str) -> list:
        result = await self._get(f"/patient/{patient_identifier}/medication")
        if result and isinstance(result, list):
            return result
        pid = _pid_from_identifier(patient_identifier)
        return _db_get_medications(pid) if pid else []

    async def get_prescriptions(self, patient_identifier: str) -> list:
        result = await self._get(f"/patient/{patient_identifier}/prescription")
        return result if isinstance(result, list) else []

    # --- Problem list endpoints ---

    async def get_problems(self, patient_identifier: str) -> list:
        result = await self._get(f"/patient/{patient_identifier}/medical_problem")
        if result and isinstance(result, list):
            return result
        pid = _pid_from_identifier(patient_identifier)
        return _db_get_problems(pid) if pid else []

    # --- Convenience: get full clinical snapshot ---

    async def get_clinical_snapshot(self, patient_identifier: str) -> dict:
        """Fetch all clinical data for a patient in one call."""
        patient = await self.get_patient(patient_identifier)
        vitals = await self.get_all_vitals(patient_identifier)
        labs = await self.get_lab_results(patient_identifier)
        meds = await self.get_medications(patient_identifier)
        problems = await self.get_problems(patient_identifier)
        encounters = await self.get_encounters(patient_identifier)

        return {
            "patient": patient,
            "vitals": vitals,
            "labs": labs,
            "medications": meds,
            "problems": problems,
            "encounters": encounters,
        }


_client: OpenEMRClient | None = None


def get_openemr_client() -> OpenEMRClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = OpenEMRClient(
            base_url=settings.openemr_base_url,
            client_id=settings.openemr_client_id,
            client_secret=settings.openemr_client_secret,
        )
    return _client
