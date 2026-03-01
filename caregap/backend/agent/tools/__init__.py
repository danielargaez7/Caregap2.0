"""Agent tool definitions and registry.

Each tool has:
- name: Unique identifier
- description: What it does (shown to Claude)
- input_schema: JSON Schema for parameters
- handler: Async function that executes the tool
"""

from agent.tools.patient_tools import PATIENT_TOOLS
from agent.tools.clinical_tools import CLINICAL_TOOLS
from agent.tools.risk_tools import RISK_TOOLS
from agent.tools.alert_tools import ALERT_TOOLS
from agent.tools.followup_tools import FOLLOWUP_TOOLS
from agent.tools.claims_tools import CLAIMS_TOOLS
from agent.tools.screening_tools import SCREENING_TOOLS
from agent.tools.outreach_tools import OUTREACH_TOOLS

ALL_TOOLS = PATIENT_TOOLS + CLINICAL_TOOLS + RISK_TOOLS + ALERT_TOOLS + FOLLOWUP_TOOLS + CLAIMS_TOOLS + SCREENING_TOOLS + OUTREACH_TOOLS

# Build lookup for handler dispatch
TOOL_HANDLERS = {}
for tool_def in ALL_TOOLS:
    TOOL_HANDLERS[tool_def["name"]] = tool_def["handler"]

# Tool definitions for Anthropic API (without handler)
TOOL_SCHEMAS = [
    {k: v for k, v in tool.items() if k != "handler"}
    for tool in ALL_TOOLS
]
