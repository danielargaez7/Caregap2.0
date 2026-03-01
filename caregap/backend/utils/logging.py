import logging
import uuid
from contextvars import ContextVar

run_uuid_var: ContextVar[str] = ContextVar("run_uuid", default="")


def new_run_uuid() -> str:
    """Generate and set a new run UUID for the current context."""
    rid = str(uuid.uuid4())
    run_uuid_var.set(rid)
    return rid


def get_run_uuid() -> str:
    return run_uuid_var.get()


class RunUUIDFilter(logging.Filter):
    def filter(self, record):
        record.run_uuid = run_uuid_var.get() or "-"
        return True


def setup_logging(level: str = "INFO"):
    fmt = "%(asctime)s [%(levelname)s] [run:%(run_uuid)s] %(name)s - %(message)s"
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt))
    handler.addFilter(RunUUIDFilter())

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.addHandler(handler)
