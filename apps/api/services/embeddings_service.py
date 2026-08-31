import json
import logging
import sqlite3
import uuid
from typing import Any

import numpy as np

from config import DB_PATH
from services.db import connect, get_paper, search_papers_keyword
from services.ollama_service import embed, ollama_available
from services.pdf_service import extract_sections

logger = logging.getLogger("ResearchOS.Embeddings")


def _ensure_table() -> None:
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS content_embeddings (
              id TEXT PRIMARY KEY,
              source_type TEXT NOT NULL,
              source_id TEXT NOT NULL,
              chunk_text TEXT NOT NULL,
              embedding_json TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS embeddings_source_idx ON content_embeddings(source_type, source_id)"
        )
        conn.commit()


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def index_all_papers() -> dict[str, int]:
    _ensure_table()
    if not ollama_available():
        raise RuntimeError("Ollama is not running. Start Ollama and pull nomic-embed-text.")

    with connect() as conn:
        rows = conn.execute("SELECT id, title, abstract FROM papers").fetchall()

    indexed = 0
    with connect() as conn:
        conn.execute("DELETE FROM content_embeddings WHERE source_type = 'paper'")
        conn.commit()

    for row in rows:
        paper_id = row["id"]
        chunks: list[tuple[str, str]] = [(f"{row['title']}\n{row['abstract']}", "abstract")]
        try:
            for sec in extract_sections(paper_id):
                chunks.append((f"{sec['title']}\n{sec['content'][:2000]}", sec["id"]))
        except Exception as exc:
            logger.warning("Section extract skipped for %s: %s", paper_id, exc)

        for text, chunk_id in chunks:
            if len(text.strip()) < 20:
                continue
            vector = embed(text[:4000])
            if not vector:
                continue
            with connect() as conn:
                conn.execute(
                    """
                    INSERT INTO content_embeddings (id, source_type, source_id, chunk_text, embedding_json)
                    VALUES (?, 'paper', ?, ?, ?)
                    """,
                    (f"emb-{uuid.uuid4().hex[:12]}", paper_id, text[:4000], json.dumps(vector)),
                )
                conn.commit()
            indexed += 1

    return {"chunks": indexed, "papers": len(rows)}


def semantic_search(query: str, limit: int = 10) -> list[dict[str, Any]]:
    _ensure_table()
    if not ollama_available():
        return [
            {
                **p,
                "score": 0.5,
                "chunk_text": p.get("abstract", "")[:300],
                "match_type": "keyword_fallback",
            }
            for p in search_papers_keyword(query, limit)
        ]

    q_vec = np.array(embed(query), dtype=np.float32)
    results: list[dict[str, Any]] = []

    with connect() as conn:
        rows = conn.execute(
            "SELECT id, source_id, chunk_text, embedding_json FROM content_embeddings WHERE source_type = 'paper'"
        ).fetchall()

    for row in rows:
        try:
            vec = np.array(json.loads(row["embedding_json"]), dtype=np.float32)
        except (json.JSONDecodeError, TypeError):
            continue
        score = _cosine(q_vec, vec)
        paper = get_paper(row["source_id"])
        if not paper:
            continue
        results.append(
            {
                "paper_id": row["source_id"],
                "title": paper.get("title"),
                "abstract": paper.get("abstract", "")[:400],
                "chunk_text": row["chunk_text"][:400],
                "score": round(score, 4),
                "match_type": "semantic",
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]
