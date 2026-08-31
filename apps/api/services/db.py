import json
import sqlite3
from pathlib import Path
from typing import Any

from config import DB_PATH


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_paper(paper_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        try:
            data["authors"] = json.loads(data.pop("authors_json", "[]") or "[]")
        except json.JSONDecodeError:
            data["authors"] = []
        return data


def update_paper_local_path(paper_id: str, local_path: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE papers SET local_pdf_path = ?, updated_at = datetime('now') WHERE id = ?",
            (local_path, paper_id),
        )
        conn.commit()


def upsert_sections(paper_id: str, sections: list[dict[str, Any]]) -> int:
    with connect() as conn:
        conn.execute("DELETE FROM paper_sections WHERE paper_id = ?", (paper_id,))
        for idx, sec in enumerate(sections):
            conn.execute(
                """
                INSERT INTO paper_sections (id, paper_id, title, content, page_number, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    sec["id"],
                    paper_id,
                    sec["title"],
                    sec["content"],
                    sec["page_number"],
                    idx,
                ),
            )
        conn.commit()
    return len(sections)


def list_papers(limit: int = 50) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, title, abstract, arxiv_id, pdf_url, local_pdf_path, status FROM papers ORDER BY updated_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def search_papers_keyword(query: str, limit: int = 10) -> list[dict[str, Any]]:
    q = f"%{query.lower()}%"
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, title, abstract, arxiv_id, status
            FROM papers
            WHERE lower(title) LIKE ? OR lower(abstract) LIKE ?
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (q, q, limit),
        ).fetchall()
        return [dict(r) for r in rows]
