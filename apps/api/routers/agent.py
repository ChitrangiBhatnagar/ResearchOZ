from fastapi import APIRouter
from pydantic import BaseModel, Field

from agents.research_agent import run_agent
from services.ollama_service import ollama_available

router = APIRouter(prefix="/agent", tags=["Agent"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


@router.get("/status")
def agent_status():
    return {
        "success": True,
        "data": {
            "ollama_available": ollama_available(),
            "agent": "langgraph-research-v1",
        },
    }


@router.post("/chat")
def agent_chat(body: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in body.history]
    reply = run_agent(body.message, history)
    return {
        "success": True,
        "data": {
            "reply": reply,
            "ollama_available": ollama_available(),
        },
    }
