"""Proxy routes to OpenEMR patient data — gives the frontend a single API to call."""
from __future__ import annotations

from fastapi import APIRouter, Query

from services.openemr_client import get_openemr_client
from utils.audit import log_audit

router = APIRouter()


@router.get("/")
async def search_patients(
    lname: str | None = None,
    fname: str | None = None,
    dob: str | None = None,
):
    client = get_openemr_client()
    params = {}
    if lname:
        params["lname"] = lname
    if fname:
        params["fname"] = fname
    if dob:
        params["DOB"] = dob
    return await client.search_patients(params)


@router.get("/{patient_uuid}")
async def get_patient(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_patient(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "demographics"})
    return result


@router.get("/{patient_uuid}/vitals")
async def get_patient_vitals(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_all_vitals(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "vitals"})
    return result


@router.get("/{patient_uuid}/labs")
async def get_patient_labs(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_lab_results(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "labs"})
    return result


@router.get("/{patient_uuid}/encounters")
async def get_patient_encounters(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_encounters(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "encounters"})
    return result


@router.get("/{patient_uuid}/medications")
async def get_patient_medications(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_medications(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "medications"})
    return result


@router.get("/{patient_uuid}/problems")
async def get_patient_problems(patient_uuid: str):
    client = get_openemr_client()
    result = await client.get_problems(patient_uuid)
    log_audit("patient_data_accessed", "patient",
              detail={"patient_uuid": patient_uuid, "data_type": "problems"})
    return result
