"""Seed OpenEMR with synthetic patient data for CareGap testing.

Usage:
    python seed/seed_patients.py

Requires OpenEMR Docker stack to be running. Seeds data directly via MySQL
for reliability (OpenEMR OAuth2 setup is complex for automated scripts).
"""
from __future__ import annotations

import json
import os
import sys
import uuid

# Try pymysql first (available in backend container), fall back to mysql.connector
try:
    import pymysql
    pymysql.install_as_MySQLdb()
    import MySQLdb
    USE_PYMYSQL = True
except ImportError:
    try:
        import mysql.connector as MySQLdb
        USE_PYMYSQL = False
    except ImportError:
        print("Need either pymysql or mysql-connector-python.")
        print("Install: pip3 install pymysql  OR  pip3 install mysql-connector-python")
        sys.exit(1)

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "openemr")
MYSQL_PASS = os.getenv("MYSQL_PASSWORD", "openemr")
MYSQL_DB = os.getenv("MYSQL_DATABASE", "openemr")

SEED_FILE = os.path.join(os.path.dirname(__file__), "patients.json")


def make_uuid() -> bytes:
    """Generate a 16-byte binary UUID for OpenEMR."""
    return uuid.uuid4().bytes


def uuid_to_hex(b: bytes) -> str:
    """Convert binary UUID to display format."""
    return uuid.UUID(bytes=b).hex


def seed():
    """Main seed function — inserts data directly into OpenEMR MySQL tables."""
    with open(SEED_FILE) as f:
        patients = json.load(f)

    print(f"Seeding {len(patients)} patients into OpenEMR via MySQL ({MYSQL_HOST}:{MYSQL_PORT})")

    if USE_PYMYSQL:
        conn = MySQLdb.connect(
            host=MYSQL_HOST, port=MYSQL_PORT,
            user=MYSQL_USER, passwd=MYSQL_PASS, db=MYSQL_DB,
        )
    else:
        conn = MySQLdb.connect(
            host=MYSQL_HOST, port=MYSQL_PORT,
            user=MYSQL_USER, password=MYSQL_PASS, database=MYSQL_DB,
        )

    cursor = conn.cursor()

    # Auto-create OpenEMR tables if they don't exist (standalone deployment)
    schema_file = os.path.join(os.path.dirname(__file__), "openemr_schema.sql")
    if os.path.exists(schema_file):
        try:
            cursor.execute("SELECT 1 FROM patient_data LIMIT 1")
            cursor.fetchone()
        except Exception:
            print("OpenEMR tables not found — creating minimal schema...")
            with open(schema_file) as sf:
                for stmt in sf.read().split(";"):
                    if stmt.strip():
                        cursor.execute(stmt)
            conn.commit()
            print("Schema created successfully.\n")

    # Check if we already have seeded patients (avoid duplicates)
    cursor.execute("SELECT COUNT(*) FROM patient_data WHERE city = 'Murray' AND state = 'UT'")
    existing = cursor.fetchone()[0]
    skip_patients = False
    if existing > 0:
        print(f"\nAlready found {existing} seeded patients. Skipping patient creation.")
        print("To re-seed patients, first run: docker compose exec mysql mysql -uopenemr -popenemr openemr -e \"DELETE FROM patient_data WHERE city='Murray'\"")
        skip_patients = True

    # Get next pid and encounter number
    cursor.execute("SELECT COALESCE(MAX(pid), 0) FROM patient_data")
    next_pid = cursor.fetchone()[0] + 1

    cursor.execute("SELECT COALESCE(MAX(encounter), 0) FROM form_encounter")
    next_encounter = cursor.fetchone()[0] + 1

    created = 0
    if not skip_patients:
        for p in patients:
            print(f"--- {p['id']}: {p['fname']} {p['lname']} ({p['scenario']}) ---")

            puuid = make_uuid()

            # Insert patient (pid is NOT auto-increment in OpenEMR)
            pid = next_pid
            cursor.execute(
                """INSERT INTO patient_data
                   (uuid, pid, pubpid, fname, lname, DOB, sex, street, city, state, postal_code, date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                (puuid, pid, str(pid), p["fname"], p["lname"], p["dob"], p["sex"],
                 "5121 Cottonwood St", "Murray", "UT", "84107"),
            )
            next_pid += 1
            print(f"  Patient: pid={pid}")

            # Create encounter
            euuid = make_uuid()
            cursor.execute(
                """INSERT INTO form_encounter
                   (uuid, date, reason, facility_id, pid, encounter, onset_date)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (euuid, "2026-01-01 10:00:00", "Annual wellness visit", 1, pid, next_encounter, "2026-01-01"),
            )
            eid = cursor.lastrowid
            print(f"  Encounter: id={eid}, encounter={next_encounter}")

            # Register encounter in forms table
            cursor.execute(
                """INSERT INTO forms
                   (date, encounter, form_name, form_id, pid, user, groupname, authorized, formdir)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                ("2026-01-01 10:00:00", next_encounter, "New Patient Encounter",
                 eid, pid, "admin", "Default", 1, "newpatient"),
            )

            # Add vitals
            for v in p.get("vitals", []):
                vuuid = make_uuid()
                cursor.execute(
                    """INSERT INTO form_vitals
                       (uuid, date, pid, user, authorized, activity, bps, bpd, weight, height)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (vuuid, v["date"] + " 10:00:00", pid, "admin", 1, 1,
                     str(v["bps"]), str(v["bpd"]),
                     v.get("weight", 0), v.get("height", 0)),
                )
                vid = cursor.lastrowid
                # Register in forms
                cursor.execute(
                    """INSERT INTO forms
                       (date, encounter, form_name, form_id, pid, user, groupname, authorized, formdir)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (v["date"] + " 10:00:00", next_encounter, "Vitals",
                     vid, pid, "admin", "Default", 1, "vitals"),
                )
                print(f"  Vitals: BP {v['bps']}/{v['bpd']}")

            # Add problems (lists table with type='medical_problem')
            for prob in p.get("problems", []):
                luuid = make_uuid()
                cursor.execute(
                    """INSERT INTO lists
                       (uuid, date, type, title, diagnosis, begdate, activity, pid, user, groupname)
                       VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (luuid, "medical_problem", prob["title"], prob["code"],
                     "2024-01-01", 1, pid, "admin", "Default"),
                )
                print(f"  Problem: {prob['code']} {prob['title']}")

            # Add medications (lists table with type='medication')
            for med in p.get("medications", []):
                muuid = make_uuid()
                cursor.execute(
                    """INSERT INTO lists
                       (uuid, date, type, title, begdate, activity, pid, user, groupname)
                       VALUES (%s, NOW(), %s, %s, %s, %s, %s, %s, %s)""",
                    (muuid, "medication", med["drug"],
                     "2025-01-01", 1 if med["status"] == "active" else 0,
                     pid, "admin", "Default"),
                )
                print(f"  Medication: {med['drug']}")

            # Labs are seeded separately below (runs on every invocation)

            next_encounter += 1
            created += 1
            print()

        conn.commit()

    # --- Seed labs into OpenEMR procedure tables ---
    print("\n=== Seeding lab results into procedure tables ===\n")

    # Clear old seeded labs (identified by provider_id = 99)
    cursor.execute(
        "DELETE FROM procedure_result WHERE procedure_report_id IN "
        "(SELECT procedure_report_id FROM procedure_report WHERE procedure_order_id IN "
        "(SELECT procedure_order_id FROM procedure_order WHERE provider_id = 99))"
    )
    cursor.execute(
        "DELETE FROM procedure_report WHERE procedure_order_id IN "
        "(SELECT procedure_order_id FROM procedure_order WHERE provider_id = 99)"
    )
    cursor.execute(
        "DELETE FROM procedure_order_code WHERE procedure_order_id IN "
        "(SELECT procedure_order_id FROM procedure_order WHERE provider_id = 99)"
    )
    cursor.execute("DELETE FROM procedure_order WHERE provider_id = 99")
    conn.commit()

    labs_created = 0
    for p in patients:
        pid = p["id"]
        for lab in p.get("labs", []):
            louuid = make_uuid()
            cursor.execute(
                """INSERT INTO procedure_order
                   (uuid, provider_id, patient_id, date_collected, date_ordered,
                    order_status, procedure_order_type)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (louuid, 99, pid, lab["date"], lab["date"], "complete", "order"),
            )
            order_id = cursor.lastrowid

            cursor.execute(
                """INSERT INTO procedure_order_code
                   (procedure_order_id, procedure_order_seq, procedure_code, procedure_name, procedure_type)
                   VALUES (%s, %s, %s, %s, %s)""",
                (order_id, 1, lab["loinc"], lab["description"], "ord"),
            )

            repuuid = make_uuid()
            cursor.execute(
                """INSERT INTO procedure_report
                   (uuid, procedure_order_id, procedure_order_seq, date_collected, date_report, report_status)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (repuuid, order_id, 1, lab["date"], lab["date"], "final"),
            )
            report_id = cursor.lastrowid

            resuuid = make_uuid()
            lab_units = lab.get("units", "%")
            lab_range = lab.get("range", "< 5.7 %")
            if lab["loinc"] == "4548-4":  # HbA1c
                abnormal = "A" if lab["value"] > 5.7 else ""
            elif lab["loinc"] in ("48642-3", "33914-3", "62238-1", "77147-7"):  # eGFR
                abnormal = "A" if lab["value"] < 60 else ""
            else:
                abnormal = ""
            cursor.execute(
                """INSERT INTO procedure_result
                   (uuid, procedure_report_id, result_code, result_text, `result`,
                    units, `range`, abnormal, date, result_status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (resuuid, report_id, lab["loinc"], lab["description"],
                 str(lab["value"]), lab_units, lab_range, abnormal, lab["date"], "final"),
            )
            labs_created += 1

        if p.get("labs"):
            print(f"  PID {pid} ({p['fname']} {p['lname']}): {len(p['labs'])} lab result(s)")

    conn.commit()
    print(f"\nLab results seeded: {labs_created}")

    # --- Seed ccrd_external_link and ccrd_claims_cache for multi-payer support ---
    print("\n=== Seeding insurance links and claims data ===\n")

    # Ensure ccrd tables exist (they may not if backend hasn't started yet)
    try:
        cursor.execute("SELECT 1 FROM ccrd_external_link LIMIT 1")
        cursor.fetchone()
    except Exception:
        print("  ccrd_* tables not yet created — skipping insurance/claims seeding.")
        print("  Start the backend first, then re-run this script.")
        conn.close()
        return

    # Clear old insurance/claims seed data to allow re-seeding
    cursor.execute("DELETE FROM ccrd_claims_cache WHERE source_system IN ('medicare', 'medicaid', 'commercial')")
    cursor.execute("DELETE FROM ccrd_external_link WHERE source_system IN ('medicare', 'medicaid', 'commercial')")
    conn.commit()

    links_created = 0
    claims_created = 0

    for p in patients:
        insurance = p.get("insurance")
        if not insurance:
            continue

        pid = p["id"]
        ins_type = insurance["type"]       # medicare, medicaid, commercial
        plan_name = insurance.get("plan_name", "")
        member_id = insurance.get("member_id", "")

        # Create external link (insurance enrollment)
        cursor.execute(
            """INSERT INTO ccrd_external_link
               (pid, source_system, external_patient_id, status, last_sync_at)
               VALUES (%s, %s, %s, %s, NOW())""",
            (pid, ins_type, member_id, "active"),
        )
        links_created += 1
        print(f"  PID {pid} ({p['fname']} {p['lname']}): {ins_type} — {plan_name} ({member_id})")

        # Create claims cache entries from prescription fills
        claims = p.get("claims")
        if claims and claims.get("fills"):
            for i, fill in enumerate(claims["fills"]):
                eob_id = f"{ins_type}-{pid}-pde-{i+1}"
                cursor.execute(
                    """INSERT INTO ccrd_claims_cache
                       (pid, source_system, eob_id, claim_type, service_start, service_end,
                        ndc, days_supply, raw_eob_json, fetched_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
                    (pid, ins_type, eob_id, "pde",
                     fill["fill_date"], fill["fill_date"],
                     fill["ndc"], fill["days_supply"],
                     json.dumps({"drug_name": fill["drug_name"], "ndc": fill["ndc"],
                                 "fill_date": fill["fill_date"], "days_supply": fill["days_supply"],
                                 "source": ins_type, "plan": plan_name})),
                )
                claims_created += 1
            print(f"    -> {len(claims['fills'])} prescription fill records")

    conn.commit()
    conn.close()

    print(f"\nSeeding complete! Created {created}/{len(patients)} patients.")
    print(f"Insurance links: {links_created}")
    print(f"Claims records: {claims_created}")
    print(f"\nAccess OpenEMR at: https://localhost:9300 (admin/pass)")
    print(f"Access Dashboard at: http://localhost:3000")
    print(f"Access API docs at: http://localhost:8000/docs")


if __name__ == "__main__":
    seed()
