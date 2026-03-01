"""One-time script to remove duplicate open followups and alerts.

Keeps the most recent record per (pid, task_type/alert_type) and deletes older dupes.

Usage:
    cd backend && python scripts/dedup_followups.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from database import SessionLocal

db = SessionLocal()

# --- Deduplicate followups ---
# Keep the newest open followup per (pid, task_type), delete older dupes
dupes_q = text("""
    DELETE f FROM ccrd_followup f
    INNER JOIN (
        SELECT pid, task_type, MAX(id) AS keep_id
        FROM ccrd_followup
        WHERE status = 'open'
        GROUP BY pid, task_type
        HAVING COUNT(*) > 1
    ) dup ON f.pid = dup.pid AND f.task_type = dup.task_type
    WHERE f.status = 'open' AND f.id != dup.keep_id
""")
result = db.execute(dupes_q)
print(f"Deleted {result.rowcount} duplicate followups")

# --- Deduplicate alerts ---
# Keep the newest open alert per (pid, alert_type), delete older dupes
alert_dupes_q = text("""
    DELETE a FROM ccrd_alert a
    INNER JOIN (
        SELECT pid, alert_type, title, MAX(id) AS keep_id
        FROM ccrd_alert
        WHERE status = 'open'
        GROUP BY pid, alert_type, title
        HAVING COUNT(*) > 1
    ) dup ON a.pid = dup.pid AND a.alert_type = dup.alert_type AND a.title = dup.title
    WHERE a.status = 'open' AND a.id != dup.keep_id
""")
result = db.execute(alert_dupes_q)
print(f"Deleted {result.rowcount} duplicate alerts")

db.commit()
db.close()
print("Done.")
