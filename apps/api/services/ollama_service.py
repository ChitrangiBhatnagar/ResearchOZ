import logging
from typing import Any

import httpx

from config import OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL, OLLAMA_URL

logger = logging.getLogger("ResearchOS.Ollama")


def ollama_available() -> bool:
    try:
        with httpx.Client(timeout=2.0) as client:
            res = client.get(f"{OLLAMA_URL}/api/tags")
            return res.status_code == 200
    except Exception:
        return False


def chat(messages: list[dict[str, str]], model: str | None = None) -> str:
    payload = {"model": model or OLLAMA_CHAT_MODEL, "messages": messages, "stream": False}
    with httpx.Client(timeout=120.0) as client:
        res = client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        res.raise_for_status()
        data = res.json()
        return data.get("message", {}).get("content", "")


def embed(text: str, model: str | None = None) -> list[float]:
    payload = {"model": model or OLLAMA_EMBED_MODEL, "prompt": text}
    with httpx.Client(timeout=60.0) as client:
        res = client.post(f"{OLLAMA_URL}/api/embeddings", json=payload)
        res.raise_for_status()
        data = res.json()
        return data.get("embedding", [])


def embed_batch(texts: list[str]) -> list[list[float]]:
    return [embed(t) for t in texts]
