import logging
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from services.db import get_paper, list_papers, search_papers_keyword
from services.embeddings_service import semantic_search
from services.ollama_service import chat, ollama_available
from services.pdf_service import extract_sections

logger = logging.getLogger("ResearchOS.Agent")

SYSTEM = """You are ResearchOS, a local AI study assistant for AI/Research Engineers.
You help with curriculum topics, research papers, CUDA, transformers, and study planning.
Use the tool results provided in context. Be concise and technical."""


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    tool_context: str


def _detect_tool(message: str) -> tuple[str, str]:
    lower = message.lower()
    if "search" in lower or "find paper" in lower or "papers about" in lower:
        q = message.split("about")[-1].strip() if "about" in lower else message
        hits = semantic_search(q, limit=5)
        if not hits:
            hits = search_papers_keyword(q, limit=5)
        ctx = "\n".join(f"- {h.get('title')}: {h.get('chunk_text') or h.get('abstract', '')[:200]}" for h in hits)
        return "search", ctx or "No papers found."
    if "summarize" in lower or "summary" in lower:
        papers = list_papers(3)
        ctx = "\n".join(f"- {p['title']}: {p.get('abstract', '')[:250]}" for p in papers)
        return "summarize", ctx or "No papers in library."
    if "extract" in lower or "sections" in lower:
        papers = list_papers(1)
        if papers:
            try:
                secs = extract_sections(papers[0]["id"])
                ctx = "\n".join(f"- {s['title']} (p{s['page_number']})" for s in secs[:8])
                return "extract", ctx
            except Exception as exc:
                return "extract", f"Extract failed: {exc}"
        return "extract", "No papers to extract."
    return "general", ""


def gather_context(state: AgentState) -> AgentState:
    last = state["messages"][-1]
    text = last.content if isinstance(last.content, str) else str(last.content)
    _tool, ctx = _detect_tool(text)
    return {"tool_context": ctx}


def respond(state: AgentState) -> AgentState:
    lc_messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM}]
    if state.get("tool_context"):
        lc_messages.append(
            {"role": "system", "content": f"Relevant library context:\n{state['tool_context']}"}
        )
    for msg in state["messages"]:
        if isinstance(msg, HumanMessage):
            lc_messages.append({"role": "user", "content": str(msg.content)})
        elif isinstance(msg, AIMessage):
            lc_messages.append({"role": "assistant", "content": str(msg.content)})

    if ollama_available():
        try:
            reply = chat(lc_messages)
        except Exception as exc:
            logger.warning("Ollama chat failed: %s", exc)
            reply = _offline_reply(state)
    else:
        reply = _offline_reply(state)

    return {"messages": [AIMessage(content=reply)]}


def _offline_reply(state: AgentState) -> str:
    ctx = state.get("tool_context") or "No tool context."
    return (
        "Ollama is offline — showing local DB results only.\n\n"
        f"{ctx}\n\n"
        "Start Ollama (`ollama serve`) and pull a model (`ollama pull llama3.2`) for full agent replies."
    )


def build_agent():
    graph = StateGraph(AgentState)
    graph.add_node("gather", gather_context)
    graph.add_node("respond", respond)
    graph.add_edge(START, "gather")
    graph.add_edge("gather", "respond")
    graph.add_edge("respond", END)
    return graph.compile()


agent_app = build_agent()


def run_agent(message: str, history: list[dict[str, str]] | None = None) -> str:
    messages: list[BaseMessage] = []
    for h in history or []:
        if h.get("role") == "user":
            messages.append(HumanMessage(content=h["content"]))
        elif h.get("role") == "assistant":
            messages.append(AIMessage(content=h["content"]))
    messages.append(HumanMessage(content=message))
    result = agent_app.invoke({"messages": messages, "tool_context": ""})
    last = result["messages"][-1]
    return str(last.content)
