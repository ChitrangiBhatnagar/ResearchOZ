from fastapi import APIRouter
from pydantic import BaseModel, Field

from agents.research_agent import answer_from_sources, run_agent
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


class GroundingSource(BaseModel):
    ref: int
    title: str
    kind: str = "paper"
    text: str


class AnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    sources: list[GroundingSource] = Field(default_factory=list)
    context_label: str | None = None


@router.post("/answer")
def agent_answer(body: AnswerRequest):
    if not ollama_available():
        return {"success": True, "data": {"available": False, "answer": None}}
    result = answer_from_sources(
        body.question,
        [s.model_dump() for s in body.sources],
        body.context_label,
    )
    return {"success": True, "data": {"available": True, **result}}


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
