"""Agent chat endpoint — connects the React frontend to the Claude agent."""

import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from schemas import AgentChatRequest, AgentChatResponse
from utils.audit import log_audit

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest, db: Session = Depends(get_db)):
    """Send a message to the CareGap agent and get a response with tool call metadata."""
    from agent.agent import get_agent

    agent = get_agent(db)
    result = await agent.chat(request.message, session_id=request.session_id)
    sid = result.get("session_id", request.session_id)
    log_audit("chat_message_sent", "chat",
              detail={"message": request.message[:500], "session_id": sid}, source="agent")
    log_audit("chat_message_received", "chat",
              detail={"message": result.get("message", "")[:500], "session_id": sid}, source="agent")
    for tc in result.get("tool_calls", []):
        log_audit("tool_call_executed", "chat",
                  detail={"tool": tc["tool"], "input": tc["input"], "duration_ms": tc["duration_ms"],
                          "session_id": sid}, source="agent")
    return result


@router.post("/chat/stream")
async def agent_chat_stream(request: AgentChatRequest, db: Session = Depends(get_db)):
    """Stream agent response via Server-Sent Events."""
    from agent.agent import get_agent

    agent = get_agent(db)
    log_audit("chat_message_sent", "chat",
              detail={"message": request.message[:500], "session_id": request.session_id, "streaming": True},
              source="agent")

    async def event_stream():
        async for event in agent.chat_stream(request.message, session_id=request.session_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/assess-cohort")
async def assess_cohort(db: Session = Depends(get_db)):
    """Trigger batch risk assessment for all eligible patients."""
    from agent.agent import get_agent

    agent = get_agent(db)
    result = await agent.assess_cohort()
    log_audit("cohort_assessed", "agent_run",
              detail={"total": result.get("total", 0), "assessed": result.get("assessed", 0),
                      "errors": result.get("errors", 0)}, source="agent")
    return result
