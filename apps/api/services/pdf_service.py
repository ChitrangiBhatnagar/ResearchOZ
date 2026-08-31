import hashlib
import logging
import re
import uuid
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF
import httpx

from config import PAPERS_DIR
from services.db import get_paper, update_paper_local_path, upsert_sections

logger = logging.getLogger("ResearchOS.PDF")


def _paper_pdf_path(paper_id: str) -> Path:
    return PAPERS_DIR / f"{paper_id}.pdf"


def ensure_pdf(paper_id: str) -> Path:
    paper = get_paper(paper_id)
    if not paper:
        raise FileNotFoundError(f"Paper not found: {paper_id}")

    local = paper.get("local_pdf_path")
    path = Path(local) if local and Path(local).exists() else _paper_pdf_path(paper_id)
    if path.exists():
        return path

    pdf_url = paper.get("pdf_url")
    if not pdf_url and paper.get("arxiv_id"):
        pdf_url = f"https://arxiv.org/pdf/{paper['arxiv_id']}.pdf"
    if not pdf_url:
        raise FileNotFoundError("No PDF URL available for this paper")

    logger.info("Downloading PDF for %s from %s", paper_id, pdf_url)
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        res = client.get(pdf_url, headers={"User-Agent": "ResearchOS/0.1"})
        res.raise_for_status()
        path.write_bytes(res.content)

    rel = str(path.relative_to(PAPERS_DIR.parent.parent)) if path.is_relative_to(PAPERS_DIR.parent.parent) else str(path)
    update_paper_local_path(paper_id, rel.replace("\\", "/"))
    return path


def get_page_count(paper_id: str) -> int:
    path = ensure_pdf(paper_id)
    with fitz.open(path) as doc:
        return doc.page_count


def render_page_png(paper_id: str, page_number: int, scale: float = 2.0) -> bytes:
    path = ensure_pdf(paper_id)
    with fitz.open(path) as doc:
        idx = max(0, min(page_number - 1, doc.page_count - 1))
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        return pix.tobytes("png")


def extract_sections(paper_id: str) -> list[dict[str, Any]]:
    path = ensure_pdf(paper_id)
    sections: list[dict[str, Any]] = []
    heading_re = re.compile(r"^(abstract|introduction|related work|method|methods|experiments|results|conclusion|discussion|references)\b", re.I)

    with fitz.open(path) as doc:
        current_title = "Abstract"
        current_lines: list[str] = []
        current_page = 1

        def flush(page_num: int) -> None:
            nonlocal current_title, current_lines
            text = "\n".join(current_lines).strip()
            if len(text) < 40:
                current_lines = []
                return
            sections.append(
                {
                    "id": f"sec-{hashlib.sha1((paper_id + current_title + str(page_num)).encode()).hexdigest()[:12]}",
                    "title": current_title,
                    "content": text[:8000],
                    "page_number": page_num,
                }
            )
            current_lines = []

        for page_idx in range(doc.page_count):
            page = doc.load_page(page_idx)
            blocks = page.get_text("blocks")
            for block in blocks:
                if len(block) < 5:
                    continue
                raw = str(block[4] or "").strip()
                if not raw:
                    continue
                first_line = raw.split("\n", 1)[0].strip()
                if heading_re.match(first_line) and len(first_line) < 80:
                    flush(page_idx + 1)
                    current_title = first_line.title()
                    current_page = page_idx + 1
                    rest = raw.split("\n", 1)
                    if len(rest) > 1:
                        current_lines.append(rest[1])
                else:
                    current_lines.append(raw)

        flush(current_page)

    if not sections:
        with fitz.open(path) as doc:
            full = "\n".join(doc.load_page(i).get_text() for i in range(min(3, doc.page_count)))
            sections.append(
                {
                    "id": f"sec-{uuid.uuid4().hex[:12]}",
                    "title": "Extract",
                    "content": full[:8000],
                    "page_number": 1,
                }
            )

    upsert_sections(paper_id, sections)
    return sections
