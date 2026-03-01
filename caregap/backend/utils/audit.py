"""Audit trail utility — fire-and-forget logging for HIPAA compliance.

Usage:
    from utils.audit import log_audit
    log_audit("alert_created", "alert", resource_id=alert.id, pid=alert.pid,
              detail={"severity": "high", "title": "..."})
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime

from database import SessionLocal

logger = logging.getLogger(__name__)


def log_audit(
    action: str,
    resource_type: str,
    *,
    resource_id: int | None = None,
    pid: int | None = None,
    user: str = "admin",
    detail: dict | None = None,
    source: str = "api",
) -> None:
    """Log an audit event. Fire-and-forget — errors are swallowed and logged."""

    def _write():
        try:
            from models import AuditLog

            session = SessionLocal()
            try:
                entry = AuditLog(
                    timestamp=datetime.utcnow(),
                    user=user,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    pid=pid,
                    detail_json=detail or {},
                    source=source,
                )
                session.add(entry)
                session.commit()
            finally:
                session.close()
        except Exception as e:
            logger.warning(f"Audit log failed (non-fatal): {e}")

    thread = threading.Thread(target=_write, daemon=True)
    thread.start()
